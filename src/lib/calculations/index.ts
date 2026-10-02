import { ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations, OperatingMode } from '../../types';
import { calculateLoadSchedule } from './loadCalculator';
import {
  getCandidatePanels,
  PanelSpecs,
  InverterSpecs,
  formatMpptCurrentLimits,
  createGenericInverter,
  createInverterFromDatasheet
} from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';
import { resolvePeakSunHours } from './peakSunHours';
import { resolveCatalogMarket } from './catalogMarkets';
import type { DesignCalculationOptions } from './designOptions';
import { configureBatteryBank } from './batteryConfiguration';
import { sizeProtectionDevices } from './protectionSizing';
import { sizeSystemCables, CableDistanceInputs } from './cableSizing';
import {
  runConsistencyAudit,
  runSelfCheckEngine,
  buildDesignNotes
} from './validationEngine';
import { generateSingleLineDiagram } from './diagramGenerator';
import { searchBatteryConfigurations, BatteryCalculationResult } from './batteryCalculator';
import { searchValidStringConfigurations, PanelConfigurationResult } from './panelStringCalculator';
import { searchCompatibleInverters, RankedInverter } from './inverterCalculator';
import {
  buildHybridEnergyPlan,
  resolveOperatingMode,
  withResolvedPriorities
} from './hybridEnergyModel';
import { estimateSystemCostBand } from './costEstimate';
import { getSystemGoal, resolveSystemGoal, type SystemGoal } from './systemGoals';
import { computePhysicsSizingTargets } from './physicsSizing';

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
  catalogMatchMode: 'catalog' | 'generic' | 'datasheet';
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

/** Thermal / soiling / cable / inverter derate only (battery path already in hybrid PV target). */
function pvCollectionEfficiency(inverterEff: number): number {
  const { temperatureDeratingFactor, dustLossFactor, cableLossFactor } = SYSTEM_STANDARDS;
  return (
    (1 - temperatureDeratingFactor) *
    (1 - dustLossFactor) *
    (1 - cableLossFactor) *
    inverterEff
  );
}

/**
 * Constraint solver: search → validate → recommend.
 * Never publishes a design that fails electrical or mathematical validation.
 *
 * @param operatingMode full_backup preserves legacy sizing; hybrid_essentials sizes
 *   battery from Critical+Essential only and PV for daytime + recharge.
 */
export function runFullDesignCalculations(
  appliances: ProjectAppliance[],
  backupHours: number,
  batteryType: BatteryType,
  systemVoltage: SystemVoltage,
  panelSize: number,
  location: string = 'Austin, TX',
  inverterType: InverterType = 'auto',
  projectType: 'residential' | 'commercial' = 'residential',
  cableDistances?: CableDistanceInputs,
  operatingModeInput: OperatingMode | string = 'hybrid_essentials',
  systemGoalInput: SystemGoal | string = 'overnight_essentials',
  designOptions: DesignCalculationOptions = {}
): Calculations {
  const operatingMode = resolveOperatingMode(operatingModeInput);
  const systemGoal = resolveSystemGoal(systemGoalInput);
  const goalSpec = getSystemGoal(systemGoal);
  const catalogMarket = resolveCatalogMarket(designOptions.catalogMarket);
  const resolvedAppliances = withResolvedPriorities(appliances);
  const loadRes = calculateLoadSchedule(resolvedAppliances);
  if (loadRes.connectedLoad === 0) {
    throw new Error(
      'Engineering Sizing Blocked: Connected load schedule is empty. Please add at least one appliance to proceed.'
    );
  }

  // Preliminary plan (battery round-trip uses chemistry default until inverter known)
  const chemEff =
    batteryType === 'lithium' ? 0.95 : batteryType === 'tubular' ? 0.82 : batteryType === 'gel' ? 0.83 : 0.8;
  let energyPlan = buildHybridEnergyPlan(
    resolvedAppliances,
    backupHours,
    operatingMode,
    chemEff,
    SYSTEM_STANDARDS.inverterEfficiencyFallback
  );

  const candidateVoltages =
    systemVoltage === 'auto'
      ? [48, 24, 12]
      : [parseInt(systemVoltage.replace('V', ''), 10)];

  const pshResolved = resolvePeakSunHours(location, designOptions.peakSunHoursOverride);
  const psh = pshResolved.peakSunHours;
  const panels = getCandidatePanels(panelSize);
  const candidates: SolverCandidate[] = [];

  // Physics-first targets (global) — computed before any catalog brand matching
  const physics = computePhysicsSizingTargets({
    connectedLoadW: energyPlan.inverterConnectedLoadW,
    peakLoadW: energyPlan.inverterPeakLoadW,
    dailyEnergyWh: loadRes.dailyEnergy,
    batterySizingDailyEnergyWh: energyPlan.batterySizingDailyEnergyWh,
    backupHours,
    pvHarvestTargetWh: energyPlan.pvHarvestTargetWh,
    peakSunHours: psh,
    forcedSystemVoltage:
      systemVoltage === 'auto' ? null : parseInt(systemVoltage.replace('V', ''), 10)
  });

  const pushCandidatesForInverters = (
    vSys: number,
    rankedInverters: RankedInverter[],
    catalogMatchMode: 'catalog' | 'generic' | 'datasheet'
  ) => {
    for (const invRank of rankedInverters) {
      const inv = invRank.inverter;

      energyPlan = buildHybridEnergyPlan(
        resolvedAppliances,
        backupHours,
        operatingMode,
        chemEff,
        inv.efficiency
      );

      const batteryOptions = searchBatteryConfigurations(
        energyPlan.batterySizingDailyEnergyWh,
        backupHours,
        batteryType,
        vSys,
        energyPlan.inverterConnectedLoadW,
        inv.efficiency,
        inv.maxBatteryDischargeCurrentA,
        inv.maxBatteryChargeCurrentA
      )
        .filter(b => b.batteryCurrentOk)
        .slice(0, 3);

      for (const batt of batteryOptions) {
        const plan = buildHybridEnergyPlan(
          resolvedAppliances,
          backupHours,
          operatingMode,
          batt.batteryEfficiency,
          inv.efficiency
        );

        const eff =
          operatingMode === 'hybrid_essentials'
            ? pvCollectionEfficiency(inv.efficiency)
            : overallPvEfficiency(inv.efficiency, batt.batteryEfficiency);
        const targetPvWatts = plan.pvHarvestTargetWh / Math.max(psh * eff, 0.01);

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

            let score = invRank.score * 0.45 + batt.score * 0.25 + layout.score * 0.3;
            // Prefer suggested voltage class, but never let voltage bonus beat kVA fitness
            if (vSys === physics.suggestedSystemVoltageV) score += 25;
            else if (vSys === 48) score += 10;
            else if (vSys === 24) score += 8;
            if (panel.sizeW === panelSize) score += 30;
            const ratio = layout.totalPvPowerW / Math.max(targetPvWatts, 1);
            if (ratio < 0.999) score -= 400;
            else score += Math.max(0, 50 - (ratio - 1) * 80);

            // Hard guard: PV layout must not justify a hugely oversized inverter
            const oversizeKva = inv.sizeKva - Math.max(invRank.preferredSizeKva, physics.requiredInverterKva);
            if (oversizeKva > 0) score -= oversizeKva * 28;
            if (catalogMatchMode === 'generic') score -= 15; // prefer real SKUs when available
            if (catalogMatchMode === 'datasheet') score += 60; // user-supplied datasheet preferred

            const expansionPct = Math.max(
              0,
              Math.round(
                (1 - plan.inverterConnectedLoadW / (inv.sizeKva * 1000)) * 100
              )
            );
            const modeNote =
              operatingMode === 'hybrid_essentials'
                ? 'Operating mode: Hybrid Night Essentials (battery from Critical + Essential only). '
                : 'Operating mode: Full Home Backup. ';
            const matchNote =
              catalogMatchMode === 'generic'
                ? 'Catalog note: no exact brand SKU at this voltage/size — using engineering size (pick any local brand meeting the rating). '
                : catalogMatchMode === 'datasheet'
                  ? 'Datasheet note: Voc/MPPT/battery limits from user-entered inverter datasheet. '
                  : '';
            const mpptLimitLabel = formatMpptCurrentLimits(inv);
            const mpptOkNote =
              layout.warnings.length > 0
                ? `Maximum Power Point Tracker (MPPT) Current Compatibility: REVIEW (${layout.currentPerMppt}A on assignment ${layout.mpptStringAssignment}; limits ${mpptLimitLabel} A — soft tolerance applied). `
                : `Maximum Power Point Tracker (MPPT) Current Compatibility: YES (${layout.currentPerMppt}A on assignment ${layout.mpptStringAssignment}; limits ${mpptLimitLabel} A). `;
            const pvChecks =
              modeNote +
              matchNote +
              `Photovoltaic (PV) Voltage Compatibility: YES (cold open-circuit voltage / Voc ${layout.stringVocMax}V <= ${inv.mpptVocLimit}V). ` +
              mpptOkNote +
              `Photovoltaic (PV) Power Compatibility: YES (${layout.totalPvPowerW}W <= ${inv.maxPvPower}W). ` +
              `Battery Voltage Compatibility: YES (${vSys}V). ` +
              `Future Expansion Margin: ~${expansionPct}%.`;

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
              preferredSizeKva: invRank.preferredSizeKva,
              catalogMatchMode
            });
          }
        }
      }
    }
  };

  for (const vSys of candidateVoltages) {
    const rankedInverters = searchCompatibleInverters(
      vSys,
      energyPlan.inverterConnectedLoadW,
      energyPlan.inverterPeakLoadW,
      inverterType,
      catalogMarket
    ).slice(0, 8);
    pushCandidatesForInverters(vSys, rankedInverters, 'catalog');
  }

  // User datasheet inverter — real Voc/MPPT limits for protection math
  if (designOptions.customInverter && designOptions.customInverter.sizeKva > 0) {
    const custom = createInverterFromDatasheet(designOptions.customInverter);
    const vSys = custom.voltageV;
    if (candidateVoltages.includes(vSys) || systemVoltage === 'auto') {
      const voltagesForCustom =
        systemVoltage === 'auto' ? [vSys] : candidateVoltages.filter(v => v === vSys);
      for (const v of voltagesForCustom.length ? voltagesForCustom : [vSys]) {
        if (custom.voltageV !== v) continue;
        const ranked: RankedInverter[] = [
          {
            inverter: custom,
            minimumSizeKva: physics.minimumInverterKva,
            preferredSizeKva: physics.preferredInverterKva,
            validation: {
              valid: true,
              failures: [],
              continuousLoadOk: custom.sizeKva * 1000 >= energyPlan.inverterConnectedLoadW,
              peakLoadOk:
                custom.sizeKva * 1000 * custom.surgeFactor >= energyPlan.inverterPeakLoadW,
              batteryVoltageOk: true,
              batteryCurrentOk: true
            },
            score: 200,
            reason:
              `Datasheet inverter ${custom.brand} ${custom.model} (${custom.sizeKva} kVA @ ${custom.voltageV}V). ` +
              `MPPT Voc limit ${custom.mpptVocLimit}V · max PV current ${custom.maxPvCurrent}A · ` +
              `max PV power ${custom.maxPvPower}W. Verify against manufacturer datasheet before procurement.`
          }
        ];
        // Only push if electrically adequate for load
        if (
          ranked[0].validation.continuousLoadOk &&
          ranked[0].validation.peakLoadOk
        ) {
          pushCandidatesForInverters(v, ranked, 'datasheet');
        }
      }
    }
  }

  // Global fallback: if catalog has no adequate SKU (e.g. forced 12V on a 1.3 kW load),
  // still publish physics sizes with a generic inverter so the tool is not catalog-locked.
  if (candidates.length === 0) {
    const topology = inverterType === 'off_grid' ? 'off_grid' : 'hybrid';
    const fallbackVoltages =
      systemVoltage === 'auto'
        ? [physics.suggestedSystemVoltageV, 48, 24, 12].filter(
            (v, i, arr) => arr.indexOf(v) === i
          )
        : candidateVoltages;

    for (const vSys of fallbackVoltages) {
      const gen = createGenericInverter(physics.requiredInverterKva, vSys, topology);
      const ranked: RankedInverter[] = [
        {
          inverter: gen,
          minimumSizeKva: physics.minimumInverterKva,
          preferredSizeKva: physics.preferredInverterKva,
          validation: {
            valid: true,
            failures: [],
            continuousLoadOk: true,
            peakLoadOk: true,
            batteryVoltageOk: true,
            batteryCurrentOk: true
          },
          score: 50,
          reason:
            `Engineering size ${gen.sizeKva} kVA @ ${vSys}V (no catalog SKU matched). ` +
            `Required ~${physics.requiredInverterKva} kVA from load/surge. ` +
            `Select any local brand meeting this rating and MPPT/battery current limits.`
        }
      ];
      pushCandidatesForInverters(vSys, ranked, 'generic');
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    throw new Error(
      `Engineering sizing incomplete: could not form a valid panel + battery layout.\n` +
        `Physics need (independent of brand): ~${physics.requiredInverterKva} kVA inverter, ` +
        `~${physics.batteryTargetInstalledKwh} kWh battery, ~${physics.requiredArrayKwp} kWp PV.\n` +
        `${physics.voltageGuidance}\n` +
        `Tip: set System Voltage to Auto or ${physics.suggestedSystemVoltageV}V, Inverter to Auto, Panel to 550 Wp.`
    );
  }

  const best = candidates[0];
  const batt = best.battery;
  const layout = best.stringLayout;
  const inv = best.inverter;
  const resolvedSystemVoltage = best.systemVoltage;
  const inverterPowerW = inv.sizeKva * 1000;

  const finalPlan = buildHybridEnergyPlan(
    resolvedAppliances,
    backupHours,
    operatingMode,
    batt.batteryEfficiency,
    inv.efficiency
  );

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
    inv.phases ?? 1,
    cableDistances
  );

  const batteryLayout = configureBatteryBank(
    batt.batterySeriesCount,
    batt.batteryParallelCount,
    batt.batteryUnitVoltage,
    batt.batteryUnitCapacityAh,
    batt.batteryDodUsed
  );

  const audit = runConsistencyAudit({
    appliances: resolvedAppliances,
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
    connectedLoadW: finalPlan.inverterConnectedLoadW,
    peakLoadW: finalPlan.inverterPeakLoadW,
    batteryInverterDrawA: batt.batteryInverterDrawA,
    pvCableAreaMm2: cableRes.calculationsRaw.pvCableAreaMm2,
    batteryCableAreaMm2: cableRes.calculationsRaw.batteryCableAreaMm2,
    acCableAreaMm2: cableRes.calculationsRaw.acCableAreaMm2,
    pvCableDesignCurrentA: cableRes.pvDesignCurrentA,
    pvCableAmpacityA: cableRes.pvCableAmpacityA,
    batteryCableDesignCurrentA: cableRes.batteryDesignCurrentA,
    batteryCableAmpacityA: cableRes.batteryCableAmpacityA,
    acCableDesignCurrentA: cableRes.acDesignCurrentA,
    acCableAmpacityA: cableRes.acCableAmpacityA,
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
    appliances: resolvedAppliances,
    dailyEnergyWh: loadRes.dailyEnergy,
    batterySizingDailyEnergyWh: finalPlan.batterySizingDailyEnergyWh,
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
  const efficiencyFrac = best.overallEfficiency;
  const requiredArrayKwp =
    psh > 0 && efficiencyFrac > 0
      ? finalPlan.pvHarvestTargetWh / 1000 / (psh * efficiencyFrac)
      : solarArrayKw;
  const futureExpansionPercent = Math.max(
    0,
    Math.round((1 - finalPlan.inverterConnectedLoadW / Math.max(inv.sizeKva * 1000, 1)) * 100)
  );
  const voltageMarginV = (inv.mpptVocLimit || 0) - (layout.stringVocMax || 0);
  const currentMarginA = (layout.limitingMpptCurrentA || inv.maxPvCurrent || 0) - (layout.currentPerMppt || 0);

  const validationWarnings = [
    ...audit.warnings,
    ...(layout.warnings || []).map(message => ({
      level: 'warning' as const,
      message,
      suggestion:
        'Confirm string-to-MPPT mapping and module Imp against the inverter datasheet before procurement.'
    })),
    {
      level: 'info' as const,
      message: `Physics-first need: ~${physics.requiredInverterKva} kVA inverter · ~${physics.batteryTargetInstalledKwh} kWh battery · ~${physics.requiredArrayKwp} kWp PV (before brand matching).`,
      suggestion: physics.voltageGuidance
    },
    {
      level: 'info' as const,
      message: pshResolved.note,
      suggestion:
        'You can override peak sun hours on the client step, or use Lookup irradiance (NASA POWER) for a site estimate.'
    },
    ...(best.catalogMatchMode === 'generic'
      ? [
          {
            level: 'warning' as const,
            message:
              'No catalog brand SKU matched your voltage/size. Showing engineering sizes — pick any local inverter/battery meeting these ratings. Enter datasheet specs on the inverter step for Voc/MPPT/fuse math against real limits.',
            suggestion:
              'Switch System Voltage to Auto, change Equipment market, or enter a datasheet inverter.'
          }
        ]
      : []),
    ...(best.catalogMatchMode === 'datasheet'
      ? [
          {
            level: 'info' as const,
            message:
              'Inverter Voc / MPPT / battery current limits come from your entered datasheet. Confirm every value against the manufacturer PDF before procurement.',
            suggestion: 'Keep the datasheet attached to the project folder for installation QA.'
          }
        ]
      : []),
    {
      level: 'info' as const,
      message: finalPlan.strategySummary,
      suggestion:
        operatingMode === 'hybrid_essentials'
          ? 'Review each appliance’s load priority (Critical / Essential / Managed / Heavy) if the battery or PV size looks wrong.'
          : 'Switch to Hybrid Night Essentials if the battery should only cover overnight Critical and Essential loads.'
    },
    ...buildDesignNotes({
      connectedLoadW: finalPlan.inverterConnectedLoadW,
      peakLoadW: finalPlan.inverterPeakLoadW,
      inverterSizeKva: inv.sizeKva,
      estimatedDailyProductionKwh,
      dailyEnergyWh: loadRes.dailyEnergy,
      solarArrayKw,
      requiredArrayKwp,
      batteryUsableKwh: batt.batteryUsableKwh,
      batteryInstalledKwh: batt.batteryInstalledKwh,
      batteryRequiredKwhRaw: batt.batteryRequiredKwhRaw,
      peakSunHours: psh,
      futureExpansionPercent,
      voltageMarginV: parseFloat(voltageMarginV.toFixed(1)),
      currentMarginA: parseFloat(currentMarginA.toFixed(1)),
      stringVocMax: layout.stringVocMax,
      mpptVocLimit: inv.mpptVocLimit,
      stringVmp: layout.stringVmpHot ?? layout.stringVmpNominal,
      mpptVmpMin: inv.mpptVmpMin,
      mpptVmpMax: inv.mpptVmpMax,
      protectionDeviceCount: protectionRes.deviceDetails?.length ?? 0,
      cableLengthsAssumed: cableRes.cableLengthsAssumed
    })
  ];

  const assumptions = [
    {
      label: 'System Operating Mode',
      value: operatingMode === 'hybrid_essentials' ? 'Hybrid Night Essentials' : 'Full Home Backup'
    },
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
      unit: 'degC'
    },
    {
      label: 'Hot Cell Temperature (Vmp)',
      value: SYSTEM_STANDARDS.maxCellTempC,
      unit: 'degC'
    },
    {
      label: 'PV Cable Run Length',
      value: cableRes.pvLengthAssumed
        ? `${cableRes.pvCableLengthM} m (default assumed)`
        : `${cableRes.pvCableLengthM} m (site-entered)`
    },
    {
      label: 'Battery Cable Run Length',
      value: cableRes.batteryLengthAssumed
        ? `${cableRes.batteryCableLengthM} m (default assumed)`
        : `${cableRes.batteryCableLengthM} m (site-entered)`
    },
    {
      label: 'AC Cable Run Length',
      value: cableRes.acLengthAssumed
        ? `${cableRes.acCableLengthM} m (default assumed)`
        : `${cableRes.acCableLengthM} m (site-entered)`
    },
    {
      label: 'Battery-backed daily energy (Critical + Essential)',
      value: parseFloat((finalPlan.batteryBackedDailyEnergyWh / 1000).toFixed(2)),
      unit: 'kWh/day'
    },
    {
      label: 'Solar/grid-preferred daily energy (Managed + Heavy)',
      value: parseFloat((finalPlan.solarGridPreferredDailyEnergyWh / 1000).toFixed(2)),
      unit: 'kWh/day'
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

  const result: Calculations = {
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
    inverterPreferredSizeKva: best.preferredSizeKva,
    inverterMinimumSizeKva: best.minimumSizeKva,
    engineeringRequiredInverterKva: physics.requiredInverterKva,
    engineeringRequiredBatteryKwh: physics.batteryTargetInstalledKwh,
    engineeringRequiredArrayKwp: physics.requiredArrayKwp,
    suggestedSystemVoltageV: physics.suggestedSystemVoltageV,
    voltageGuidance: physics.voltageGuidance,
    catalogMatchMode: best.catalogMatchMode,
    catalogMarket,
    peakSunHoursSource: pshResolved.source,
    peakSunHoursNote: pshResolved.note,
    solarArrayKw,
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
    maxPvCurrentA: layout.limitingMpptCurrentA || inv.maxPvCurrent,
    mpptCurrentLimitsLabel: layout.mpptCurrentLimitsLabel || formatMpptCurrentLimits(inv),
    mpptStringAssignment: layout.mpptStringAssignment,
    maxPvPowerW: inv.maxPvPower,
    seriesCount: layout.seriesCount,
    parallelCount: layout.parallelCount,
    numMppts: inv.numMppts,
    stringsPerMppt: layout.stringsPerMppt,
    selectedPanelWattageWp: best.panel.sizeW,
    targetPvKw: parseFloat((best.targetPvWatts / 1000).toFixed(2)),
    requiredArrayKwp: parseFloat(requiredArrayKwp.toFixed(2)),
    panelSizingCompatibilityOk: layout.panelSizingCompatibilityOk !== false,
    panelSizingCompatibilityWarning: layout.panelSizingCompatibilityWarning,

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
      protectionAdequacyOk: protectionRes.protectionAdequacyOk,
      protectionAdequacyNotes: protectionRes.protectionAdequacyNotes,
      deviceDetails: protectionRes.deviceDetails
    },

    cableSizing: {
      pvCableSize: cableRes.pvCableSize,
      pvCableVoltageDropPercent: cableRes.pvCableVoltageDropPercent,
      pvCableAmpacityA: cableRes.pvCableAmpacityA,
      pvDesignCurrentA: cableRes.pvDesignCurrentA,
      pvCableLengthM: cableRes.pvCableLengthM,
      batteryCableSize: cableRes.batteryCableSize,
      batteryCableVoltageDropPercent: cableRes.batteryCableVoltageDropPercent,
      batteryCableAmpacityA: cableRes.batteryCableAmpacityA,
      batteryDesignCurrentA: cableRes.batteryDesignCurrentA,
      batteryCableLengthM: cableRes.batteryCableLengthM,
      acCableSize: cableRes.acCableSize,
      acCableVoltageDropPercent: cableRes.acCableVoltageDropPercent,
      acCableAmpacityA: cableRes.acCableAmpacityA,
      acDesignCurrentA: cableRes.acDesignCurrentA,
      acCableLengthM: cableRes.acCableLengthM,
      earthCableSize: cableRes.earthCableSize,
      cableLengthsAssumed: cableRes.cableLengthsAssumed,
      pvLengthAssumed: cableRes.pvLengthAssumed,
      batteryLengthAssumed: cableRes.batteryLengthAssumed,
      acLengthAssumed: cableRes.acLengthAssumed
    },

    validationWarnings,
    assumptions,
    singleLineDiagramSvg: sldSvg,

    operatingMode,
    operatingModeLabel: finalPlan.operatingModeLabel,
    energyStrategySummary: finalPlan.strategySummary,
    systemGoal,
    systemGoalLabel: goalSpec.title,
    batteryBackedDailyEnergyKwh: parseFloat(
      (finalPlan.batteryBackedDailyEnergyWh / 1000).toFixed(2)
    ),
    solarGridPreferredDailyEnergyKwh: parseFloat(
      (finalPlan.solarGridPreferredDailyEnergyWh / 1000).toFixed(2)
    ),
    nightOrBackupEnergyKwh: parseFloat((finalPlan.nightOrBackupEnergyWh / 1000).toFixed(2)),
    daytimeEnergyKwh: parseFloat((finalPlan.daytimeEnergyWh / 1000).toFixed(2)),
    pvHarvestTargetKwh: parseFloat((finalPlan.pvHarvestTargetWh / 1000).toFixed(2)),
    priorityEnergyBreakdown: {
      criticalKwh: parseFloat((finalPlan.priorityBreakdown.criticalWh / 1000).toFixed(2)),
      essentialKwh: parseFloat((finalPlan.priorityBreakdown.essentialWh / 1000).toFixed(2)),
      managedKwh: parseFloat((finalPlan.priorityBreakdown.managedWh / 1000).toFixed(2)),
      heavyKwh: parseFloat((finalPlan.priorityBreakdown.heavyWh / 1000).toFixed(2))
    },
    inverterDesignConnectedLoadW: finalPlan.inverterConnectedLoadW,
    inverterDesignPeakLoadW: finalPlan.inverterPeakLoadW
  };

  const cost = estimateSystemCostBand(result);
  result.costEstimateNgnLow = cost.ngn.low;
  result.costEstimateNgnHigh = cost.ngn.high;
  result.costEstimateUsdLow = cost.usd.low;
  result.costEstimateUsdHigh = cost.usd.high;
  result.costEstimateDisclaimer = cost.disclaimer;

  return result;
}
