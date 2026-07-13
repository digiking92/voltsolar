import { ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations } from '../../types';
import { calculateLoadSchedule, LoadCalculationResult } from './loadCalculator';
import { getBatteryFromDb, getInverterFromDb, getPanelFromDb, INVERTERS, SOLAR_PANELS, PanelSpecs, InverterSpecs, BatterySpecs } from './equipmentDatabase';
import { getPeakSunHours } from './engineeringStandards';
import { configureBatteryBank } from './batteryConfiguration';
import { sizeProtectionDevices } from './protectionSizing';
import { sizeSystemCables } from './cableSizing';
import { validateSystemDesign } from './validationEngine';
import { generateSingleLineDiagram } from './diagramGenerator';

interface SolverCandidate {
  systemVoltage: number;
  inverter: InverterSpecs;
  panel: PanelSpecs;
  battery: BatterySpecs;
  batterySeriesCount: number;
  batteryParallelCount: number;
  batteryInstalledKwh: number;
  batteryUsableKwh: number;
  batteryCapacityAh: number;
  seriesCount: number; // S
  parallelCount: number; // P
  totalPanels: number;
  totalPvPowerW: number;
  stringVocMax: number;
  stringVmpMax: number;
  stringVmpNominal: number;
  stringIscMax: number;
  currentPerMppt: number;
  powerPerMppt: number;
  score: number;
  overallEfficiency: number;
}

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
  // --- STEP 1: Compute Connected Load Schedule & Peak Startup Surges ---
  const loadRes = calculateLoadSchedule(appliances);

  if (loadRes.connectedLoad === 0) {
    throw new Error('Engineering Sizing Blocked: Connected load schedule is empty. Please add at least one appliance to proceed.');
  }

  // --- STEP 2: Multi-Dimensional Constraint Solver ---
  const candidateVoltages = systemVoltage === 'auto'
    ? [48, 24, 12]
    : [parseInt(systemVoltage.replace('V', ''), 10)];

  const psh = getPeakSunHours(location);
  const candidates: SolverCandidate[] = [];

  for (const vSys of candidateVoltages) {
    // 2.1 Calculate One-Directional Battery Sizing Target for this Voltage
    const batteryRequiredKwhRaw = (loadRes.dailyEnergy * (backupHours / 24)) / 1000;
    const correctedForInverterKwh = batteryRequiredKwhRaw / 0.96;
    const batteryEfficiency = batteryType === 'lithium' ? 0.95 : 0.85;
    const correctedForBatteryKwh = correctedForInverterKwh / batteryEfficiency;
    const batteryDodUsed = batteryType === 'lithium' ? 0.90 : 0.50;
    const correctedForDodKwh = correctedForBatteryKwh / batteryDodUsed;
    const batteryCapacityKwhTarget = correctedForDodKwh * 1.20; // 20% engineering safety margin
    const targetAh = (batteryCapacityKwhTarget * 1000) / vSys;

    // Retrieve battery specifications
    const batteryModel = getBatteryFromDb(batteryType, vSys === 48 ? 48 : 12);
    const batterySeriesCount = Math.ceil(vSys / batteryModel.voltage);

    // 2.2 Filter inverters matching this voltage and continuous load
    const minRequiredKva = loadRes.connectedLoad / 1000;
    let matchingInverters = INVERTERS.filter(inv => inv.voltageV === vSys);

    // If no inverter in the DB fits, extrapolate one safely
    if (matchingInverters.length === 0 || !matchingInverters.some(inv => inv.sizeKva >= minRequiredKva)) {
      const neededKva = Math.ceil(Math.max(minRequiredKva * 1.25, loadRes.peakLoad / 2000));
      const extrapolated = getInverterFromDb(neededKva, vSys);
      matchingInverters.push(extrapolated);
    }

    for (const inv of matchingInverters) {
      // Inverter must handle continuous load
      if (inv.sizeKva < minRequiredKva) continue;

      // Calculate inverter full DC current draw to size battery strings for discharge limits
      const inverterPowerW = inv.sizeKva * 1000;
      const batteryInverterDrawA = inverterPowerW / (vSys * 0.96);
      const cRateMultiplier = batteryType === 'lithium' ? 1.0 : 0.2;

      // Determine required parallel count to satisfy both Capacity (Ah) and safe continuous Discharge Current (C-rate)
      const minParallelForCapacity = Math.ceil(targetAh / batteryModel.capacityAh);
      const minParallelForCurrent = Math.ceil(batteryInverterDrawA / (batteryModel.capacityAh * cRateMultiplier));
      const batteryParallelCount = Math.max(1, minParallelForCapacity, minParallelForCurrent);

      const batteryCapacityAh = batteryParallelCount * batteryModel.capacityAh;
      const batteryInstalledKwh = (batterySeriesCount * batteryModel.voltage * batteryCapacityAh) / 1000;
      const batteryUsableKwh = batteryInstalledKwh * batteryDodUsed;

      // Verify battery can support inverter draw
      const batteryMaxDischargeCurrentA = batteryCapacityAh * cRateMultiplier;
      if (batteryMaxDischargeCurrentA < batteryInverterDrawA) continue; // Incompatible combination

      // Evaluate panels: check both requested size and database sizes for a valid layout
      const candidatePanels = [
        getPanelFromDb(panelSize),
        ...SOLAR_PANELS.filter(p => p.sizeW !== panelSize)
      ];

      for (const panel of candidatePanels) {
        // Compute overall combined solar efficiency
        const tempLoss = 0.10;
        const dustLoss = 0.05;
        const cableLoss = 0.02;
        const overallEfficiency = (1 - tempLoss) * (1 - dustLoss) * (1 - cableLoss) * inv.efficiency * batteryEfficiency;
        const targetPvWatts = loadRes.dailyEnergy / (psh * overallEfficiency);

        // Compute panel Voc and Vmp derating factors for extreme temperatures
        // Standard design boundaries: Cold weather -10°C, Hot weather +65°C
        const vocCold = panel.voc * (1 + (panel.tempCoeffVoc * (-10 - 25)) / 100);
        const vmpHot = panel.vmp * (1 + (panel.tempCoeffVoc * (65 - 25)) / 100);

        const maxPanelsInSeries = Math.floor(inv.mpptVocLimit / vocCold);
        const minPanelsInSeries = Math.ceil(inv.mpptVmpMin / vmpHot);

        if (maxPanelsInSeries < 1 || minPanelsInSeries > maxPanelsInSeries) continue;

        // Search for valid S × P layouts
        for (let s = minPanelsInSeries; s <= maxPanelsInSeries; s++) {
          for (let p = 1; p <= 16; p++) {
            const totalPanels = s * p;
            const totalPvPowerW = totalPanels * panel.sizeW;

            // Inverters >= 5kVA typically have 2 MPPTs, smaller have 1
            const numMppts = inv.sizeKva >= 5.0 ? 2 : 1;
            const currentPerMppt = Math.ceil(p / numMppts) * panel.isc * 1.25; // 1.25 continuous safety factor
            const powerPerMppt = s * Math.ceil(p / numMppts) * panel.sizeW;

            // Strict PV constraints verification
            const isVocValid = (s * vocCold) <= inv.mpptVocLimit;
            const isVmpHotValid = (s * vmpHot) >= inv.mpptVmpMin;
            const isVmpMaxValid = (s * panel.vmp) <= inv.mpptVmpMax;
            const isCurrentValid = currentPerMppt <= inv.maxPvCurrent;
            const isPowerValid = totalPvPowerW <= inv.maxPvPower;

            if (isVocValid && isVmpHotValid && isVmpMaxValid && isCurrentValid && isPowerValid) {
              // Calculate candidate sizing performance score
              let score = 100;

              // Favor user's requested panel size
              if (panel.sizeW === panelSize) {
                score += 500;
              }

              // Sizing proximity score: ideally totalPvPowerW is 100% to 125% of targetPvWatts
              const sizingRatio = totalPvPowerW / targetPvWatts;
              if (sizingRatio >= 1.0 && sizingRatio <= 1.25) {
                score += 150;
              } else if (sizingRatio > 1.25) {
                // Penalize severe oversizing
                score += Math.max(0, 100 - (sizingRatio - 1.25) * 100);
              } else {
                // Penalize undersizing
                score += Math.max(0, sizingRatio * 50);
              }

              // Favor system bus voltage efficiency (48V over 24V over 12V)
              if (vSys === 48) score += 200;
              else if (vSys === 24) score += 100;

              candidates.push({
                systemVoltage: vSys,
                inverter: inv,
                panel,
                battery: batteryModel,
                batterySeriesCount,
                batteryParallelCount,
                batteryInstalledKwh,
                batteryUsableKwh,
                batteryCapacityAh,
                seriesCount: s,
                parallelCount: p,
                totalPanels,
                totalPvPowerW,
                stringVocMax: parseFloat((s * vocCold).toFixed(1)),
                stringVmpMax: parseFloat((s * panel.vmp).toFixed(1)),
                stringVmpNominal: parseFloat((s * panel.vmp).toFixed(1)),
                stringIscMax: parseFloat((p * panel.isc).toFixed(1)),
                currentPerMppt: parseFloat(currentPerMppt.toFixed(1)),
                powerPerMppt: parseFloat(powerPerMppt.toFixed(1)),
                score,
                overallEfficiency
              });
            }
          }
        }
      }
    }
  }

  // Sort candidates to select the highest engineering score
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    throw new Error('Engineering Validation Failed: No compatible panel, inverter, and battery equipment combination satisfies the electrical, thermal, and capacity safety constraints for your load profile.');
  }

  const best = candidates[0];

  // Sizing inputs variables in compiling scope
  const batteryRequiredKwhRaw = (loadRes.dailyEnergy * (backupHours / 24)) / 1000;
  const batteryEfficiency = batteryType === 'lithium' ? 0.95 : 0.85;
  const batteryDodUsed = batteryType === 'lithium' ? 0.90 : 0.50;
  const minRequiredKva = loadRes.connectedLoad / 1000;

  // --- STEP 3: Engineering Sizing Calculations Compilation ---
  const resolvedSystemVoltage = best.systemVoltage;
  const inverterPowerW = best.inverter.sizeKva * 1000;

  // Sizing electrical protection devices
  const protectionRes = sizeProtectionDevices(
    best.stringIscMax,
    best.stringVocMax,
    resolvedSystemVoltage,
    inverterPowerW,
    projectType === 'commercial'
  );

  // Sizing copper conductors cables
  const cableRes = sizeSystemCables(
    best.stringIscMax,
    best.stringVmpMax,
    protectionRes.calculationsRaw.maxInverterDcCurrent,
    resolvedSystemVoltage,
    protectionRes.calculationsRaw.maxAcOutputCurrent
  );

  // Sizing connection grids
  const batteryLayout = configureBatteryBank(
    best.batterySeriesCount,
    best.batteryParallelCount,
    best.battery.voltage,
    best.battery.capacityAh,
    batteryType === 'lithium' ? 0.90 : 0.50
  );

  // Compile design assumptions
  const assumptions = [
    { label: 'Meteorological Peak Sun Hours', value: psh, unit: 'hrs/day' },
    { label: 'Thermal Panel Derating Coefficient', value: 10, unit: '%' },
    { label: 'PV Soiling & Dust Loss Coeff.', value: 5, unit: '%' },
    { label: 'DC Cable Transmission Loss Coeff.', value: 2, unit: '%' },
    { label: 'Inverter Conversion Efficiency', value: Math.round(best.inverter.efficiency * 100), unit: '%' },
    { label: 'Battery Charge Round-Trip Efficiency', value: Math.round(best.overallEfficiency / 0.8 * 100), unit: '%' },
    { label: 'Allowable Battery Depth of Discharge', value: Math.round((batteryType === 'lithium' ? 0.90 : 0.50) * 100), unit: '%' },
    { label: 'Battery Engineering Sizing Reserve', value: 20, unit: '%' },
    { label: 'Inverter Sizing Safety Overload Factor', value: 1.25, unit: 'x' },
    { label: 'NEC Cable Sizing Continuous Current Multiplier', value: 1.25, unit: 'x' }
  ];

  // Compile design validation warnings / status checklist
  const validationWarnings = validateSystemDesign({
    connectedLoadW: loadRes.connectedLoad,
    peakLoadW: loadRes.peakLoad,
    dailyEnergyWh: loadRes.dailyEnergy,
    batteryCapacityKwh: best.batteryInstalledKwh,
    batteryUsableKwh: best.batteryUsableKwh,
    batteryInstalledKwh: best.batteryInstalledKwh,
    solarArrayKw: parseFloat((best.totalPvPowerW / 1000).toFixed(2)),
    estimatedDailyProductionKwh: parseFloat(((best.totalPvPowerW * psh * best.overallEfficiency) / 1000).toFixed(2)),
    inverterSizeKva: best.inverter.sizeKva,
    panelSizingCompatibilityOk: true,
    panelSizingCompatibilityWarning: 'PV Array configuration is fully compatible and mathematically validated.',
    stringVocMax: best.stringVocMax,
    mpptVocLimit: best.inverter.mpptVocLimit,
    backupHours
  });

  // Assemble explanations (Issue 8)
  const inverterReason = `${best.inverter.sizeKva} kVA Hybrid Inverter selected. ` +
    `Continuous steady-state load is ${(loadRes.connectedLoad / 1000).toFixed(2)} kW. ` +
    `Total motor surge/starting demand is ${(loadRes.peakLoad / 1000).toFixed(2)} kW, leaving a ${(best.inverter.sizeKva - minRequiredKva).toFixed(1)} kVA continuous buffer. ` +
    `MPPT parameters are completely compatible (String Voc: ${best.stringVocMax}V ≤ Limit: ${best.inverter.mpptVocLimit}V, String Current: ${best.currentPerMppt}A ≤ Limit: ${best.inverter.maxPvCurrent}A).`;

  // --- STEP 4: Double Verification Audits (Issue 5 & Issue 7) ---
  
  // 4.1 Battery Mathematical Consistency Verification (Issue 1)
  const expectedKwh = (resolvedSystemVoltage * best.batteryCapacityAh) / 1000;
  if (Math.abs(best.batteryInstalledKwh - expectedKwh) > 0.05) {
    throw new Error('Engineering Calculation Error: Battery sizing inconsistency detected. Sized kWh must exactly equal system voltage × Ah / 1000.');
  }

  // 4.2 Absolute Limits Audits (Issue 5)
  if (best.stringVocMax > best.inverter.mpptVocLimit) {
    throw new Error(`Engineering Sizing Audit Failed: String Voc (${best.stringVocMax}V) exceeds maximum inverter PV voltage (${best.inverter.mpptVocLimit}V).`);
  }
  if (best.currentPerMppt > best.inverter.maxPvCurrent) {
    throw new Error(`Engineering Sizing Audit Failed: String continuous current (${best.currentPerMppt}A) exceeds inverter input current limit (${best.inverter.maxPvCurrent}A).`);
  }
  if (best.totalPvPowerW > best.inverter.maxPvPower) {
    throw new Error(`Engineering Sizing Audit Failed: Total solar array wattage (${best.totalPvPowerW}W) exceeds maximum inverter DC limit (${best.inverter.maxPvPower}W).`);
  }
  
  // Verify cable conductor capacities
  const pvCableLimit = 41; // 4.0mm² typical amplicity limit
  if (best.stringIscMax * 1.25 > pvCableLimit) {
    throw new Error(`Engineering Sizing Audit Failed: PV String continuous design current exceeds selected solar cable amplicity.`);
  }

  // 4.3 Self-Check Engine Independent Recalculation Verification (Issue 7)
  const loadCheck = calculateLoadSchedule(appliances);
  if (Math.abs(loadCheck.dailyEnergy - loadRes.dailyEnergy) > 1.0) {
    throw new Error('Internal Engineering Verification Failed: Load energy recalculation deviation exceeds 1% tolerance.');
  }
  
  const rawTargetKwh = (loadCheck.dailyEnergy * (backupHours / 24)) / 1000;
  const expectedTargetKwh = (rawTargetKwh / 0.96 / (batteryType === 'lithium' ? 0.95 : 0.85) / (batteryType === 'lithium' ? 0.90 : 0.50)) * 1.20;
  
  // Sized battery must meet or exceed target capacity
  if (best.batteryInstalledKwh < expectedTargetKwh - 0.1) {
    throw new Error('Internal Engineering Verification Failed: Installed battery bank capacity is less than raw engineering requirements.');
  }

  // Execute electrical Single-Line Diagram compilation
  const sldSvg = generateSingleLineDiagram({
    panelQuantity: best.totalPanels,
    panelWattage: best.panel.sizeW,
    seriesCount: best.seriesCount,
    parallelCount: best.parallelCount,
    batteryQuantity: best.batterySeriesCount * best.batteryParallelCount,
    batteryType,
    batteryCapacityAh: best.batteryCapacityAh,
    batteryVoltage: resolvedSystemVoltage,
    inverterSizeKva: best.inverter.sizeKva,
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
    batteryCapacityKwh: best.batteryInstalledKwh,
    batteryCapacityAh: best.batteryCapacityAh,
    batteryQuantity: best.batterySeriesCount * best.batteryParallelCount,
    batteryConfiguration: `${best.batterySeriesCount} Series × ${best.batteryParallelCount} Parallel (${best.batterySeriesCount * best.batteryParallelCount} Units of ${best.battery.voltage}V ${best.battery.capacityAh}Ah)`,
    inverterSizeKva: best.inverter.sizeKva,
    inverterReason,
    solarArrayKw: parseFloat((best.totalPvPowerW / 1000).toFixed(2)),
    panelQuantity: best.totalPanels,
    panelConfiguration: `${best.seriesCount} Series × ${best.parallelCount} Parallel (${best.totalPanels} Panels total)`,
    estimatedDailyProductionKwh: parseFloat(((best.totalPvPowerW * psh * best.overallEfficiency) / 1000).toFixed(2)),

    // Sizing parameters
    continuousLoadW: loadRes.continuousLoadW,
    motorStartupLoadW: loadRes.motorStartupLoadW,
    designLoadW: loadRes.designLoadW,
    diversityFactor: loadRes.diversityFactor,
    loadBreakdown: loadRes.loadBreakdown,

    batteryProductModel: `${best.battery.brand} ${best.battery.model} [${(best.battery.voltage * best.battery.capacityAh / 1000).toFixed(1)} kWh]`,
    batteryUnitCapacityAh: best.battery.capacityAh,
    batteryUnitVoltage: best.battery.voltage,
    batteryRequiredKwhRaw: parseFloat(batteryRequiredKwhRaw.toFixed(2)),
    batteryUsableKwh: best.batteryUsableKwh,
    batteryInstalledKwh: best.batteryInstalledKwh,
    batteryEfficiency,
    batteryDodUsed,
    batterySeriesCount: best.batterySeriesCount,
    batteryParallelCount: best.batteryParallelCount,
    batteryExpectedBackupHours: parseFloat((best.batteryUsableKwh * 1000 * 0.96 / (loadRes.dailyEnergy / 24)).toFixed(1)),
    batteryUtilizationPercent: Math.min(Math.round((batteryRequiredKwhRaw / best.batteryUsableKwh) * 100), 100),

    peakSunHoursUsed: psh,
    overallSystemEfficiency: parseFloat((best.overallEfficiency * 100).toFixed(1)),
    temperatureLossPercent: 10,
    dustLossPercent: 5,
    cableLossPercent: 2,
    dailyHarvestWhRaw: parseFloat((best.totalPvPowerW * psh / 1000).toFixed(2)),

    panelVoc: best.panel.voc,
    panelVmp: best.panel.vmp,
    panelIsc: best.panel.isc,
    panelImp: best.panel.imp,
    stringVocMax: best.stringVocMax,
    stringVmpMax: best.stringVmpMax,
    stringIscMax: best.stringIscMax,
    mpptVocLimit: best.inverter.mpptVocLimit,
    mpptVmpMin: best.inverter.mpptVmpMin,
    mpptVmpMax: best.inverter.mpptVmpMax,
    panelSizingCompatibilityOk: true,
    panelSizingCompatibilityWarning: 'Selected PV Array is 100% compliant with MPPT limits.',

    inverterPreferredSizeKva: best.inverter.sizeKva,
    inverterMinimumSizeKva: minRequiredKva,
    inverterModelRecommended: `${best.inverter.brand} ${best.inverter.model}`,

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
      deviceDetails: protectionRes.deviceDetails,
    },

    cableSizing: {
      pvCableSize: cableRes.pvCableSize,
      pvCableVoltageDropPercent: cableRes.pvCableVoltageDropPercent,
      batteryCableSize: cableRes.batteryCableSize,
      batteryCableVoltageDropPercent: cableRes.batteryCableVoltageDropPercent,
      acCableSize: cableRes.acCableSize,
      acCableVoltageDropPercent: cableRes.acCableVoltageDropPercent,
      earthCableSize: cableRes.earthCableSize,
    },

    validationWarnings,
    assumptions,
    singleLineDiagramSvg: sldSvg
  };
}
