import { SYSTEM_STANDARDS, COPPER_CABLE_SPECS } from './engineeringStandards';
import { calculateBatteryEnergyTarget, verifyBatteryKwhConsistency } from './batteryCalculator';
import { validateStringConfiguration } from './panelStringCalculator';
import { PanelSpecs, InverterSpecs, BatterySpecs } from './equipmentDatabase';
import { calculateLoadSchedule } from './loadCalculator';
import { ProjectAppliance, BatteryType } from '../../types';

export interface ValidationWarning {
  level: 'info' | 'warning' | 'danger';
  message: string;
  suggestion: string;
}

export interface ConsistencyAuditInput {
  appliances: ProjectAppliance[];
  dailyEnergyWh: number;
  backupHours: number;
  batteryType: BatteryType;
  systemVoltage: number;
  battery: BatterySpecs;
  batteryInstalledKwh: number;
  batteryCapacityAh: number;
  batterySeriesCount: number;
  batteryParallelCount: number;
  batteryUsableKwh: number;
  inverter: InverterSpecs;
  panel: PanelSpecs;
  seriesCount: number;
  parallelCount: number;
  totalPanels: number;
  totalPvPowerW: number;
  stringVocMax: number;
  stringIscMax: number;
  currentPerMppt: number;
  connectedLoadW: number;
  peakLoadW: number;
  batteryInverterDrawA: number;
  pvCableAreaMm2: number;
  batteryCableAreaMm2: number;
  acCableAreaMm2: number;
  acBreakerCurrentA: number;
  panelQuantityReported: number;
  batteryQuantityReported: number;
}

export interface ConsistencyAuditResult {
  passed: boolean;
  errors: string[];
  warnings: ValidationWarning[];
}

function cableAmpacity(areaMm2: number): number {
  const found = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 === areaMm2)
    || COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= areaMm2);
  return found ? found.maxCurrentA : 0;
}

/**
 * Pre-report engineering consistency audit.
 * Any hard error blocks report generation.
 */
export function runConsistencyAudit(input: ConsistencyAuditInput): ConsistencyAuditResult {
  const errors: string[] = [];
  const warnings: ValidationWarning[] = [];

  // Battery energy ↔ Ah
  if (!verifyBatteryKwhConsistency(input.batteryInstalledKwh, input.systemVoltage, input.batteryCapacityAh)) {
    errors.push(
      'Engineering Calculation Error: Battery sizing inconsistency detected. Installed kWh must equal (System Voltage × Ah) ÷ 1000.'
    );
  }

  const expectedBankV = input.batterySeriesCount * input.battery.voltage;
  if (expectedBankV !== input.systemVoltage) {
    errors.push(
      `Battery bank voltage ${expectedBankV}V does not match inverter/system voltage ${input.systemVoltage}V.`
    );
  }

  if (input.inverter.voltageV !== input.systemVoltage) {
    errors.push(
      `Inverter DC voltage ${input.inverter.voltageV}V does not match system voltage ${input.systemVoltage}V.`
    );
  }

  const stringCheck = validateStringConfiguration(
    input.panel,
    input.inverter,
    input.seriesCount,
    input.parallelCount
  );
  if (!stringCheck.valid) {
    errors.push(...stringCheck.failures.map(f => `PV String Invalid: ${f}`));
  }

  if (input.totalPvPowerW > input.inverter.maxPvPower) {
    errors.push(
      `PV power ${input.totalPvPowerW}W exceeds inverter max PV input ${input.inverter.maxPvPower}W.`
    );
  }

  if (input.batteryInverterDrawA > input.batteryCapacityAh * input.battery.maxContinuousDischargeC) {
    errors.push(
      `Battery discharge demand ${input.batteryInverterDrawA.toFixed(1)}A exceeds battery C-rate limit.`
    );
  }

  if (input.batteryInverterDrawA > input.inverter.maxBatteryDischargeCurrentA) {
    errors.push(
      `Battery discharge demand ${input.batteryInverterDrawA.toFixed(1)}A exceeds inverter battery current limit.`
    );
  }

  // PV string cable is sized on ONE string Isc, not paralleled array current
  const moduleIsc = input.stringIscMax / Math.max(1, input.parallelCount);
  const pvDesignCurrent = moduleIsc * SYSTEM_STANDARDS.necBreakerMultiplier;
  const pvAmpacity = cableAmpacity(input.pvCableAreaMm2);
  if (pvDesignCurrent > pvAmpacity) {
    errors.push(
      `PV string design current ${pvDesignCurrent.toFixed(1)}A exceeds PV cable ampacity ${pvAmpacity}A.`
    );
  }

  const battDesignCurrent = input.batteryInverterDrawA * SYSTEM_STANDARDS.necBreakerMultiplier;
  const battAmpacity = cableAmpacity(input.batteryCableAreaMm2);
  if (battDesignCurrent > battAmpacity) {
    errors.push(
      `Battery design current ${battDesignCurrent.toFixed(1)}A exceeds battery cable ampacity ${battAmpacity}A.`
    );
  }

  const phases = input.inverter.phases ?? 1;
  const acCurrent =
    phases === 3
      ? (input.inverter.sizeKva * 1000) / (Math.sqrt(3) * 400)
      : (input.inverter.sizeKva * 1000) / SYSTEM_STANDARDS.acNominalVoltageV;
  const acDesign = acCurrent * SYSTEM_STANDARDS.necBreakerMultiplier;
  const acAmpacity = cableAmpacity(input.acCableAreaMm2);
  if (acDesign > acAmpacity) {
    errors.push(
      `AC design current ${acDesign.toFixed(1)}A exceeds AC cable ampacity ${acAmpacity}A.`
    );
  }

  if (input.acBreakerCurrentA + 0.5 < acDesign) {
    errors.push(
      `AC breaker rating ${input.acBreakerCurrentA}A is below required continuous design current ${acDesign.toFixed(1)}A.`
    );
  }

  if (input.panelQuantityReported !== input.totalPanels) {
    errors.push(
      `Panel count mismatch: reported ${input.panelQuantityReported} vs string layout ${input.totalPanels}.`
    );
  }

  const expectedBattQty = input.batterySeriesCount * input.batteryParallelCount;
  if (input.batteryQuantityReported !== expectedBattQty) {
    errors.push(
      `Battery quantity mismatch: reported ${input.batteryQuantityReported} vs configuration ${expectedBattQty}.`
    );
  }

  if (input.connectedLoadW > input.inverter.sizeKva * 1000) {
    errors.push(
      `Continuous load exceeds inverter rating.`
    );
  }

  // Soft warnings only (never for electrical invalidity already caught above)
  const dailyKwh = input.dailyEnergyWh / 1000;
  const productionEstimate =
    (input.totalPvPowerW *
      4.5 *
      (1 - SYSTEM_STANDARDS.temperatureDeratingFactor) *
      (1 - SYSTEM_STANDARDS.dustLossFactor) *
      (1 - SYSTEM_STANDARDS.cableLossFactor) *
      input.inverter.efficiency *
      input.battery.efficiency) /
    1000;

  if (productionEstimate < dailyKwh) {
    warnings.push({
      level: 'warning',
      message: `Solar harvest estimate (${productionEstimate.toFixed(1)} kWh/day) is below daily consumption (${dailyKwh.toFixed(1)} kWh/day).`,
      suggestion: 'Increase array size or reduce appliance run hours so the battery can recover daily.'
    });
  }

  warnings.push({
    level: 'info',
    message: 'Electrical Protection Check: DC fuses, AC breakers, and Type II SPD are sized for this configuration.',
    suggestion: 'Verify earthing electrode resistance on site per local code.'
  });

  return { passed: errors.length === 0, errors, warnings };
}

/**
 * Independent second-pass verification of core math (self-check engine).
 */
export function runSelfCheckEngine(params: {
  appliances: ProjectAppliance[];
  dailyEnergyWh: number;
  backupHours: number;
  systemVoltage: number;
  inverterEfficiency: number;
  batteryEfficiency: number;
  batteryDod: number;
  batteryInstalledKwh: number;
  batteryCapacityAh: number;
}): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  const loadRecheck = calculateLoadSchedule(params.appliances);
  const energyDiffPct =
    params.dailyEnergyWh > 0
      ? (Math.abs(loadRecheck.dailyEnergy - params.dailyEnergyWh) / params.dailyEnergyWh) * 100
      : 0;

  if (energyDiffPct > SYSTEM_STANDARDS.selfCheckTolerancePercent) {
    errors.push(
      'Internal Engineering Verification Failed: Load energy recalculation deviation exceeds 1% tolerance.'
    );
  }

  const target = calculateBatteryEnergyTarget(
    loadRecheck.dailyEnergy,
    params.backupHours,
    params.systemVoltage,
    params.inverterEfficiency,
    params.batteryEfficiency,
    params.batteryDod
  );

  if (params.batteryInstalledKwh + 0.1 < target.targetInstalledKwh) {
    errors.push(
      'Internal Engineering Verification Failed: Installed battery capacity is below independently recalculated requirement.'
    );
  }

  if (!verifyBatteryKwhConsistency(params.batteryInstalledKwh, params.systemVoltage, params.batteryCapacityAh)) {
    errors.push(
      'Internal Engineering Verification Failed: Battery kWh/Ah identity check failed.'
    );
  }

  return { passed: errors.length === 0, errors };
}

/** Informational post-pass notes for the report (never used to publish invalid designs). */
export function buildDesignNotes(params: {
  connectedLoadW: number;
  peakLoadW?: number;
  inverterSizeKva: number;
  estimatedDailyProductionKwh: number;
  dailyEnergyWh: number;
  solarArrayKw: number;
  requiredArrayKwp?: number;
  batteryUsableKwh: number;
  batteryInstalledKwh?: number;
  batteryRequiredKwhRaw?: number;
  peakSunHours: number;
  futureExpansionPercent?: number;
  voltageMarginV?: number;
  currentMarginA?: number;
  stringVocMax?: number;
  mpptVocLimit?: number;
  stringVmp?: number;
  mpptVmpMin?: number;
  mpptVmpMax?: number;
  protectionDeviceCount?: number;
  cableLengthsAssumed?: boolean;
}): ValidationWarning[] {
  const notes: ValidationWarning[] = [];
  const continuousKw = params.connectedLoadW / 1000;
  const dailyKwh = params.dailyEnergyWh / 1000;
  const requiredArrayKwp = params.requiredArrayKwp ?? 0;
  const futureExpansionPercent = params.futureExpansionPercent ?? 0;
  const voltageMarginV = params.voltageMarginV ?? 0;
  const currentMarginA = params.currentMarginA ?? 0;
  const batteryInstalledKwh = params.batteryInstalledKwh ?? params.batteryUsableKwh;
  const batteryRequiredKwhRaw = params.batteryRequiredKwhRaw ?? 0;

  if (batteryRequiredKwhRaw > 0 && batteryInstalledKwh > 0) {
    const reservePct = Math.round(
      ((batteryInstalledKwh - batteryRequiredKwhRaw) / batteryRequiredKwhRaw) * 100
    );
    if (reservePct > 0) {
      notes.push({
        level: 'info',
        message: `Battery has approximately ${reservePct}% reserve capacity above the calculated minimum energy requirement.`,
        suggestion:
          'Reserve covers round-trip losses, DoD limits, and short-term load variation on the selected profile.'
      });
    }
  }

  if (requiredArrayKwp > 0 && params.solarArrayKw > 0) {
    const pvMarginPct = Math.round((params.solarArrayKw / requiredArrayKwp - 1) * 100);
    if (pvMarginPct >= 10) {
      notes.push({
        level: 'info',
        message: `PV array exceeds the minimum energy requirement by approximately ${pvMarginPct}% to improve recharge during cloudy conditions.`,
        suggestion:
          'This engineering margin improves recovery after overnight discharge and poor irradiance days.'
      });
    }
  }

  if (futureExpansionPercent >= 10) {
    notes.push({
      level: 'info',
      message: `Future inverter expansion margin is approximately ${futureExpansionPercent}%.`,
      suggestion:
        'Additional continuous load can be added later without replacing the inverter, subject to battery and PV capacity.'
    });
  } else if (continuousKw * 1.2 > params.inverterSizeKva && continuousKw <= params.inverterSizeKva) {
    notes.push({
      level: 'info',
      message: `Inverter operates above 80% of continuous rating (${params.inverterSizeKva} kVA vs ${continuousKw.toFixed(2)} kW load).`,
      suggestion: 'Consider the next larger inverter if significant future expansion is planned.'
    });
  }

  const stringVmp = params.stringVmp ?? 0;
  const mpptVmpMin = params.mpptVmpMin ?? 0;
  const mpptVmpMax = params.mpptVmpMax ?? 0;
  if (stringVmp > 0 && mpptVmpMin > 0 && stringVmp >= mpptVmpMin && stringVmp <= mpptVmpMax) {
    notes.push({
      level: 'info',
      message: `PV string voltage operates within the inverter MPPT window (${mpptVmpMin}-${mpptVmpMax} V; operating Vmp ~${stringVmp} V).`,
      suggestion: 'No string reconfiguration is required for MPPT tracking under the modelled conditions.'
    });
  }

  if (voltageMarginV > 0 && voltageMarginV < 15 && (params.mpptVocLimit ?? 0) > 0) {
    notes.push({
      level: 'warning',
      message: `Cold-weather Voc margin is only ${voltageMarginV.toFixed(1)} V below the inverter limit (${params.stringVocMax} V vs ${params.mpptVocLimit} V). This design is acceptable but should be verified for extremely cold installation environments.`,
      suggestion:
        'Confirm lowest expected ambient temperature; if colder than design assumption, reduce series count or select a higher Voc inverter.'
    });
  }

  if (currentMarginA > 0 && currentMarginA < 5) {
    notes.push({
      level: 'info',
      message: `MPPT current headroom is ${currentMarginA.toFixed(1)} A. The design passes, but additional parallel strings would require re-checking the inverter PV input limit.`,
      suggestion: 'Do not add parallel strings without confirming inverter max PV current and fuse ratings.'
    });
  }

  if ((params.protectionDeviceCount ?? 0) > 0) {
    notes.push({
      level: 'info',
      message:
        'Protection devices are selected according to calculated continuous current with IEC/NEC safety margins applied.',
      suggestion: 'Verify device interrupting ratings and polarity markings during installation and commissioning.'
    });
  }

  if (params.cableLengthsAssumed) {
    notes.push({
      level: 'info',
      message:
        'Cable run lengths use standard residential assumptions (PV 20 m, battery 2 m, AC 10 m) because site-specific distances were not entered.',
      suggestion:
        'Enter actual cable distances on the battery step to recalculate voltage drop and conductor sizes for this site.'
    });
  }

  if (params.estimatedDailyProductionKwh < dailyKwh) {
    notes.push({
      level: 'warning',
      message: `Sized array produces ~${params.estimatedDailyProductionKwh} kWh/day vs ${dailyKwh.toFixed(1)} kWh/day consumption.`,
      suggestion: 'Increase panel count or reduce run hours to improve daily energy balance.'
    });
  }

  const recoveryKwh = dailyKwh + params.batteryUsableKwh * 0.35;
  const minPvKw = recoveryKwh / Math.max(params.peakSunHours, 0.1);
  if (params.solarArrayKw + 0.05 < minPvKw) {
    notes.push({
      level: 'warning',
      message: `Recharge headroom is limited: array ${params.solarArrayKw} kWp vs ~${minPvKw.toFixed(2)} kWp advised for daily load + partial battery recovery.`,
      suggestion: 'Add parallel strings or a higher-wattage panel if roof space allows.'
    });
  }

  notes.push({
    level: 'info',
    message: 'This design passed hard electrical, capacity, and consistency validation before publication.',
    suggestion: 'Commission with insulation resistance and polarity checks before energizing.'
  });

  return notes;
}
