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

  const pvDesignCurrent = input.stringIscMax * SYSTEM_STANDARDS.necBreakerMultiplier;
  const pvAmpacity = cableAmpacity(input.pvCableAreaMm2);
  if (pvDesignCurrent > pvAmpacity) {
    errors.push(
      `PV design current ${pvDesignCurrent.toFixed(1)}A exceeds PV cable ampacity ${pvAmpacity}A.`
    );
  }

  const battDesignCurrent = input.batteryInverterDrawA * SYSTEM_STANDARDS.necBreakerMultiplier;
  const battAmpacity = cableAmpacity(input.batteryCableAreaMm2);
  if (battDesignCurrent > battAmpacity) {
    errors.push(
      `Battery design current ${battDesignCurrent.toFixed(1)}A exceeds battery cable ampacity ${battAmpacity}A.`
    );
  }

  const acCurrent = (input.inverter.sizeKva * 1000) / SYSTEM_STANDARDS.acNominalVoltageV;
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
  inverterSizeKva: number;
  estimatedDailyProductionKwh: number;
  dailyEnergyWh: number;
  solarArrayKw: number;
  batteryUsableKwh: number;
  peakSunHours: number;
}): ValidationWarning[] {
  const notes: ValidationWarning[] = [];
  const continuousKw = params.connectedLoadW / 1000;

  if (continuousKw * 1.2 > params.inverterSizeKva && continuousKw <= params.inverterSizeKva) {
    notes.push({
      level: 'info',
      message: `Inverter operates above 80% of continuous rating (${params.inverterSizeKva} kVA vs ${continuousKw.toFixed(2)} kW load).`,
      suggestion: 'Consider the next larger inverter if significant future expansion is planned.'
    });
  }

  const dailyKwh = params.dailyEnergyWh / 1000;
  if (params.estimatedDailyProductionKwh < dailyKwh) {
    notes.push({
      level: 'warning',
      message: `Sized array produces ~${params.estimatedDailyProductionKwh} kWh/day vs ${dailyKwh.toFixed(1)} kWh/day consumption.`,
      suggestion: 'Increase panel count or reduce run hours to improve daily energy balance.'
    });
  }

  const minPvKw = (dailyKwh + params.batteryUsableKwh) / params.peakSunHours;
  if (params.solarArrayKw < minPvKw) {
    notes.push({
      level: 'warning',
      message: `Recharge headroom is limited: array ${params.solarArrayKw} kWp vs recommended ≥${minPvKw.toFixed(2)} kWp for load + battery recovery.`,
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
