import { ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations } from '../../types';
import { calculateLoadSchedule } from './loadCalculator';
import { getCandidatePanels, PanelSpecs, InverterSpecs } from './equipmentDatabase';
import { getPeakSunHours, SYSTEM_STANDARDS } from './engineeringStandards';
import { configureBatteryBank } from './batteryConfiguration';
import { sizeProtectionDevices } from './protectionSizing';
import { sizeSystemCables } from './cableSizing';
import {
  runConsistencyAudit,
  runSelfCheckEngine,
  buildDesignNotes
} from './validationEngine';
import { generateSingleLineDiagram } from './diagramGenerator';
import { searchBatteryConfigurations, BatteryCalculationResult } from './batteryCalculator';
import { searchValidStringConfigurations, PanelConfigurationResult } from './panelStringCalculator';
import { searchCompatibleInverters } from './inverterCalculator';

interface SolverCandidate {
  systemVoltage: number;
  inverter: InverterSpecs;
  panel: PanelSpecs;
  battery: BatteryCalculationResult;
  stringLayout: PanelConfigurationResult;
  overallEfficiency: number;
  targetPvWatts: number;
  score: number;
  inverterReason: string;
  minimumSizeKva: number;
  preferredSizeKva: number;
}

function overallPvEfficiency(
  inverterEff: number,
  batteryEff: number
): number {
  const { temperatureDeratingFactor, dustLossFactor, cableLossFactor } = SYSTEM_STANDARDS;
  // Hybrid / off-grid reality: not all daily Wh cycle the battery.
  // ~55% daytime direct AC use, ~45% through storage round-trip.
  const storagePathFactor = 0.55 + 0.45 * batteryEff;
  return (
    (1 - temperatureDeratingFactor) *
    (1 - dustLossFactor) *
    (1 - cableLossFactor) *
    inverterEff *
    storagePathFactor
  );
}

/**
 * Constraint solver: search → validate → recommend.
 * Never publishes a design that fails electrical or mathematical validation.
 */
export function runFullDesignCalculations(
  appliances: ProjectAppliance[],
  backupHours: number,
  batteryType: BatteryType,
  systemVoltage: SystemVoltage,
  panelSize: number,
  location: string = 'Austin, TX',
  inverterType: InverterType = 'auto',
  projectType: 'residential' | 'commercial' = 'residential'
): Calculations {
  const loadRes = calculateLoadSchedule(appliances);
  if (loadRes.connectedLoad === 0) {
    throw new Error(
      'Engineering Sizing Blocked: Connected load schedule is empty. Please add at least one appliance to proceed.'
    );
  }

  const candidateVoltages =
    systemVoltage === 'auto'
      ? [48, 24, 12]
      : [parseInt(systemVoltage.replace('V', ''), 10)];

  const psh = getPeakSunHours(location);
  const panels = getCandidatePanels(panelSize);
  const candidates: SolverCandidate[] = [];

  for (const vSys of candidateVoltages) {
    const rankedInverters = searchCompatibleInverters(
      vSys,
      loadRes.connectedLoad,
      loadRes.peakLoad,
      inverterType
    ).slice(0, 5); // Top ranked only — full catalog is still searched/ranked first

    for (const invRank of rankedInverters) {
      const inv = invRank.inverter;

      const batteryOptions = searchBatteryConfigurations(
        loadRes.dailyEnergy,
        backupHours,
        batteryType,
        vSys,
        inv.sizeKva * 1000,
        inv.efficiency,
        inv.maxBatteryDischargeCurrentA,
        inv.maxBatteryChargeCurrentA
      )
        .filter(b => b.batteryCurrentOk)
        .slice(0, 3);

      for (const batt of batteryOptions) {
        const eff = overallPvEfficiency(inv.efficiency, batt.batteryEfficiency);
        const targetPvWatts = loadRes.dailyEnergy / (psh * eff);

        // Prefer requested wattage first; keep 1 alternate module family
        const panelPool = [
          panels[0],
          ...panels.slice(1).filter(p => Math.abs(p.sizeW - panelSize) <= 100).slice(0, 1)
        ].filter(Boolean);

        for (const panel of panelPool) {
          const layouts = searchValidStringConfigurations(
            panel,
            inv,
            targetPvWatts,
            panel.sizeW === panelSize
          ).slice(0, 4);

          for (const layout of layouts) {
            if (layout.totalPanels !== layout.seriesCount * layout.parallelCount) continue;

            let score = invRank.score * 0.35 + batt.score * 0.25 + layout.score * 0.4;
            if (vSys === 48) score += 40;
            else if (vSys === 24) score += 20;
            if (panel.sizeW === panelSize) score += 30;
            // Prefer energy-adequate, then the smallest overshoot
            const ratio = layout.totalPvPowerW / Math.max(targetPvWatts, 1);
            if (ratio < 0.999) score -= 400;
            else score += Math.max(0, 50 - (ratio - 1) * 80);

            const pvChecks =
              `MPPT Current Compatible: YES (${layout.currentPerMppt}A ≤ ${inv.maxPvCurrent}A). ` +
              `PV Voltage Compatible: YES (${layout.stringVocMax}V ≤ ${inv.mpptVocLimit}V). ` +
              `PV Power Compatible: YES (${layout.totalPvPowerW}W ≤ ${inv.maxPvPower}W). ` +
              `Battery Voltage Compatible: YES (${vSys}V). ` +
              `Future Expansion: ~${Math.max(0, Math.round((1 - loadRes.connectedLoad / (inv.sizeKva * 1000)) * 100))}%. ` +
              `Engineering Status: PASS.`;

            candidates.push({
              systemVoltage: vSys,
              inverter: inv,
              panel,
              battery: batt,
              stringLayout: layout,
              overallEfficiency: eff,
              targetPvWatts,
              score,
              inverterReason: `${invRank.reason} ${pvChecks}`,
              minimumSizeKva: invRank.minimumSizeKva,
              preferredSizeKva: invRank.preferredSizeKva
            });
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    throw new Error(
      'Engineering Validation Failed: No compatible panel, inverter, and battery combination satisfies the electrical constraints with your current selections. Tip: set Inverter to Auto Recommend, System Voltage to Auto, and Panel to 550 Wp, then try again — or reduce motor/AC run hours.'
    );
  }

  const best = candidates[0];
  const batt = best.battery;
  const layout = best.stringLayout;
  const inv = best.inverter;
  const resolvedSystemVoltage = best.systemVoltage;
  const inverterPowerW = inv.sizeKva * 1000;

  const protectionRes = sizeProtectionDevices(
    best.panel.isc,
    layout.parallelCount,
    best.panel.maxSeriesFuseA,
    layout.stringVocMax,
    resolvedSystemVoltage,
    inverterPowerW,
    inv.phases ?? 1,
    projectType === 'commercial'
  );

  const cableRes = sizeSystemCables(
    best.panel.isc,
    layout.stringVmpNominal,
    protectionRes.calculationsRaw.maxInverterDcCurrent,
    resolvedSystemVoltage,
    protectionRes.calculationsRaw.maxAcOutputCurrent,
    inv.phases ?? 1
  );

  const batteryLayout = configureBatteryBank(
    batt.batterySeriesCount,
    batt.batteryParallelCount,
    batt.batteryUnitVoltage,
    batt.batteryUnitCapacityAh,
    batt.batteryDodUsed
  );

  // Consistency audit — hard gate before report
  const audit = runConsistencyAudit({
    appliances,
    dailyEnergyWh: loadRes.dailyEnergy,
    backupHours,
    batteryType,
    systemVoltage: resolvedSystemVoltage,
    battery: batt.batteryUnit,
    batteryInstalledKwh: batt.batteryInstalledKwh,
    batteryCapacityAh: batt.batteryCapacityAh,
    batterySeriesCount: batt.batterySeriesCount,
    batteryParallelCount: batt.batteryParallelCount,
    batteryUsableKwh: batt.batteryUsableKwh,
    inverter: inv,
    panel: best.panel,
    seriesCount: layout.seriesCount,
    parallelCount: layout.parallelCount,
    totalPanels: layout.totalPanels,
    totalPvPowerW: layout.totalPvPowerW,
    stringVocMax: layout.stringVocMax,
    stringIscMax: layout.stringIscMax,
    currentPerMppt: layout.currentPerMppt,
    connectedLoadW: loadRes.connectedLoad,
    peakLoadW: loadRes.peakLoad,
    batteryInverterDrawA: batt.batteryInverterDrawA,
    pvCableAreaMm2: cableRes.calculationsRaw.pvCableAreaMm2,
    batteryCableAreaMm2: cableRes.calculationsRaw.batteryCableAreaMm2,
    acCableAreaMm2: cableRes.calculationsRaw.acCableAreaMm2,
    acBreakerCurrentA: protectionRes.calculationsRaw.selectedAcBreakerRating,
    panelQuantityReported: layout.totalPanels,
    batteryQuantityReported: batt.batteryQuantity
  });

  if (!audit.passed) {
    throw new Error(
      `Engineering Validation Failed:\n${audit.errors.join('\n')}`
    );
  }

  const selfCheck = runSelfCheckEngine({
    appliances,
    dailyEnergyWh: loadRes.dailyEnergy,
    backupHours,
    systemVoltage: resolvedSystemVoltage,
    inverterEfficiency: inv.efficiency,
    batteryEfficiency: batt.batteryEfficiency,
    batteryDod: batt.batteryDodUsed,
    batteryInstalledKwh: batt.batteryInstalledKwh,
    batteryCapacityAh: batt.batteryCapacityAh
  });

  if (!selfCheck.passed) {
    throw new Error(selfCheck.errors.join('\n'));
  }

  const estimatedDailyProductionKwh = parseFloat(
    ((layout.totalPvPowerW * psh * best.overallEfficiency) / 1000).toFixed(2)
  );
  const solarArrayKw = parseFloat((layout.totalPvPowerW / 1000).toFixed(2));

  const validationWarnings = [
    ...audit.warnings,
    ...buildDesignNotes({
      connectedLoadW: loadRes.connectedLoad,
      inverterSizeKva: inv.sizeKva,
      estimatedDailyProductionKwh,
      dailyEnergyWh: loadRes.dailyEnergy,
      solarArrayKw,
      batteryUsableKwh: batt.batteryUsableKwh,
      peakSunHours: psh
    })
  ];

  const assumptions = [
    { label: 'Meteorological Peak Sun Hours', value: psh, unit: 'hrs/day' },
    {
      label: 'Thermal Panel Derating Coefficient',
      value: SYSTEM_STANDARDS.temperatureDeratingFactor * 100,
      unit: '%'
    },
    {
      label: 'PV Soiling & Dust Loss Coeff.',
      value: SYSTEM_STANDARDS.dustLossFactor * 100,
      unit: '%'
    },
    {
      label: 'DC Cable Transmission Loss Coeff.',
      value: SYSTEM_STANDARDS.cableLossFactor * 100,
      unit: '%'
    },
    {
      label: 'Inverter Conversion Efficiency',
      value: Math.round(inv.efficiency * 100),
      unit: '%'
    },
    {
      label: 'Battery Round-Trip Efficiency',
      value: Math.round(batt.batteryEfficiency * 100),
      unit: '%'
    },
    {
      label: 'Allowable Battery Depth of Discharge',
      value: Math.round(batt.batteryDodUsed * 100),
      unit: '%'
    },
    {
      label: 'Battery Engineering Sizing Reserve',
      value: Math.round((SYSTEM_STANDARDS.batteryEngineeringReserve - 1) * 100),
      unit: '%'
    },
    {
      label: 'Inverter Sizing Safety Factor',
      value: SYSTEM_STANDARDS.inverterSafetyFactor,
      unit: 'x'
    },
    {
      label: 'NEC Continuous Current Multiplier',
      value: SYSTEM_STANDARDS.necBreakerMultiplier,
      unit: 'x'
    },
    {
      label: 'Cold Design Temperature (Voc)',
      value: SYSTEM_STANDARDS.minDesignTempC,
      unit: '°C'
    },
    {
      label: 'Hot Cell Temperature (Vmp)',
      value: SYSTEM_STANDARDS.maxCellTempC,
      unit: '°C'
    }
  ];

  const sldSvg = generateSingleLineDiagram({
    panelQuantity: layout.totalPanels,
    panelWattage: best.panel.sizeW,
    seriesCount: layout.seriesCount,
    parallelCount: layout.parallelCount,
    batteryQuantity: batt.batteryQuantity,
    batteryType,
    batteryCapacityAh: batt.batteryCapacityAh,
    batteryVoltage: resolvedSystemVoltage,
    inverterSizeKva: inv.sizeKva,
    inverterType,
    dcStringFuse: protectionRes.dcStringFuse,
    dcStringIsolator: protectionRes.dcStringIsolator,
    batteryBreaker: protectionRes.batteryBreaker,
    acOutputBreaker: protectionRes.acOutputBreaker,
    pvCableSize: cableRes.pvCableSize,
    batteryCableSize: cableRes.batteryCableSize,
    acCableSize: cableRes.acCableSize
  });

  return {
    connectedLoad: loadRes.connectedLoad,
    peakLoad: loadRes.peakLoad,
    dailyEnergy: loadRes.dailyEnergy,
    monthlyEnergy: loadRes.monthlyEnergy,
    batteryCapacityKwh: batt.batteryInstalledKwh,
    batteryCapacityAh: batt.batteryCapacityAh,
    batteryQuantity: batt.batteryQuantity,
    batteryConfiguration: batt.batteryConfiguration,
    inverterSizeKva: inv.sizeKva,
    inverterReason: best.inverterReason,
    solarArrayKw,
    // Always publish exact S×P product (guards against stale total fields)
    panelQuantity: layout.seriesCount * layout.parallelCount,
    panelConfiguration: `${layout.seriesCount} Series × ${layout.parallelCount} Parallel · ${layout.seriesCount * layout.parallelCount} panels total`,
    estimatedDailyProductionKwh,

    continuousLoadW: loadRes.continuousLoadW,
    motorStartupLoadW: loadRes.motorStartupLoadW,
    designLoadW: loadRes.designLoadW,
    diversityFactor: loadRes.diversityFactor,
    loadBreakdown: loadRes.loadBreakdown,

    batteryProductModel: batt.batteryProductModel,
    batteryUnitCapacityAh: batt.batteryUnitCapacityAh,
    batteryUnitVoltage: batt.batteryUnitVoltage,
    batteryRequiredKwhRaw: batt.batteryRequiredKwhRaw,
    batteryUsableKwh: batt.batteryUsableKwh,
    batteryInstalledKwh: batt.batteryInstalledKwh,
    batteryEfficiency: batt.batteryEfficiency,
    batteryDodUsed: batt.batteryDodUsed,
    batterySeriesCount: batt.batterySeriesCount,
    batteryParallelCount: batt.batteryParallelCount,
    batteryExpectedBackupHours: batt.batteryExpectedBackupHours,
    batteryUtilizationPercent: batt.batteryUtilizationPercent,
    batteryMaxDischargeCurrentA: batt.batteryMaxDischargeCurrentA,
    batteryMaxChargeCurrentA: batt.batteryMaxChargeCurrentA,
    batteryContinuousCurrentA: batt.batteryInverterDrawA,
    batteryChemistry: batt.batteryChemistry,
    batteryConnectionSchematic: batteryLayout.connectionSchematic,

    peakSunHoursUsed: psh,
    overallSystemEfficiency: parseFloat((best.overallEfficiency * 100).toFixed(1)),
    temperatureLossPercent: SYSTEM_STANDARDS.temperatureDeratingFactor * 100,
    dustLossPercent: SYSTEM_STANDARDS.dustLossFactor * 100,
    cableLossPercent: SYSTEM_STANDARDS.cableLossFactor * 100,
    dailyHarvestWhRaw: parseFloat(((layout.totalPvPowerW * psh) / 1000).toFixed(2)),

    panelVoc: best.panel.voc,
    panelVmp: best.panel.vmp,
    panelIsc: best.panel.isc,
    panelImp: best.panel.imp,
    stringVocMax: layout.stringVocMax,
    stringVmpMax: layout.stringVmpNominal,
    stringVmpHot: layout.stringVmpHot,
    stringIscMax: layout.stringIscMax,
    mpptVocLimit: inv.mpptVocLimit,
    mpptVmpMin: inv.mpptVmpMin,
    mpptVmpMax: inv.mpptVmpMax,
    currentPerMpptA: layout.currentPerMppt,
    maxPvCurrentA: inv.maxPvCurrent,
    maxPvPowerW: inv.maxPvPower,
    seriesCount: layout.seriesCount,
    parallelCount: layout.parallelCount,
    targetPvKw: parseFloat((best.targetPvWatts / 1000).toFixed(2)),
    panelSizingCompatibilityOk: true,
    panelSizingCompatibilityWarning: layout.panelSizingCompatibilityWarning,

    inverterPreferredSizeKva: best.preferredSizeKva,
    inverterMinimumSizeKva: best.minimumSizeKva,
    inverterModelRecommended: `${inv.brand} ${inv.model}`,

    protectionSchedule: {
      dcStringFuse: protectionRes.dcStringFuse,
      dcStringIsolator: protectionRes.dcStringIsolator,
      dcStringSpd: protectionRes.dcStringSpd,
      batteryFuse: protectionRes.batteryFuse,
      batteryBreaker: protectionRes.batteryBreaker,
      acOutputBreaker: protectionRes.acOutputBreaker,
      acRcdBreaker: protectionRes.acRcdBreaker,
      earthElectrode: protectionRes.earthElectrode,
      distributionBoard: protectionRes.distributionBoard,
      deviceDetails: protectionRes.deviceDetails
    },

    cableSizing: {
      pvCableSize: cableRes.pvCableSize,
      pvCableVoltageDropPercent: cableRes.pvCableVoltageDropPercent,
      pvCableAmpacityA: cableRes.pvCableAmpacityA,
      pvDesignCurrentA: cableRes.pvDesignCurrentA,
      batteryCableSize: cableRes.batteryCableSize,
      batteryCableVoltageDropPercent: cableRes.batteryCableVoltageDropPercent,
      batteryCableAmpacityA: cableRes.batteryCableAmpacityA,
      batteryDesignCurrentA: cableRes.batteryDesignCurrentA,
      acCableSize: cableRes.acCableSize,
      acCableVoltageDropPercent: cableRes.acCableVoltageDropPercent,
      acCableAmpacityA: cableRes.acCableAmpacityA,
      acDesignCurrentA: cableRes.acDesignCurrentA,
      earthCableSize: cableRes.earthCableSize
    },

    validationWarnings,
    assumptions,
    singleLineDiagramSvg: sldSvg
  };
}
