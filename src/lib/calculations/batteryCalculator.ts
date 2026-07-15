import { BatteryType } from '../../types';
import { BatterySpecs, getBatteriesForSystem } from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';

export interface BatteryCalculationResult {
  batteryRequiredKwhRaw: number;
  batteryTargetInstalledKwh: number;
  batteryCapacityAh: number;
  batteryQuantity: number;
  batteryConfiguration: string;
  batteryProductModel: string;
  batteryUnitCapacityAh: number;
  batteryUnitVoltage: number;
  batteryUsableKwh: number;
  batteryInstalledKwh: number;
  batteryEfficiency: number;
  batteryDodUsed: number;
  batterySeriesCount: number;
  batteryParallelCount: number;
  batteryExpectedBackupHours: number;
  batteryUtilizationPercent: number;
  batteryMaxDischargeCurrentA: number;
  batteryMaxChargeCurrentA: number;
  batteryInverterDrawA: number;
  batteryCurrentOk: boolean;
  batteryChemistry: BatteryType;
  batteryUnit: BatterySpecs;
  score: number;
}

export interface BatteryEnergyTarget {
  requiredKwhRaw: number;
  correctedForInverterKwh: number;
  correctedForBatteryKwh: number;
  correctedForDodKwh: number;
  targetInstalledKwh: number;
  targetAh: number;
  batteryEfficiency: number;
  batteryDod: number;
}

/**
 * One-directional battery energy chain (single source of truth):
 * Daily Energy → Backup Energy → ÷ η_inv → ÷ η_batt → ÷ DoD → × reserve → Installed kWh → Ah
 */
export function calculateBatteryEnergyTarget(
  dailyEnergyWh: number,
  backupHours: number,
  systemVoltage: number,
  inverterEfficiency: number,
  batteryEfficiency: number,
  batteryDod: number
): BatteryEnergyTarget {
  const requiredKwhRaw = (dailyEnergyWh * (backupHours / 24)) / 1000;
  const correctedForInverterKwh = requiredKwhRaw / inverterEfficiency;
  const correctedForBatteryKwh = correctedForInverterKwh / batteryEfficiency;
  const correctedForDodKwh = correctedForBatteryKwh / batteryDod;
  const targetInstalledKwh = correctedForDodKwh * SYSTEM_STANDARDS.batteryEngineeringReserve;
  const targetAh = (targetInstalledKwh * 1000) / systemVoltage;

  return {
    requiredKwhRaw,
    correctedForInverterKwh,
    correctedForBatteryKwh,
    correctedForDodKwh,
    targetInstalledKwh,
    targetAh,
    batteryEfficiency,
    batteryDod
  };
}

export function verifyBatteryKwhConsistency(
  installedKwh: number,
  systemVoltage: number,
  installedAh: number
): boolean {
  const expected = (systemVoltage * installedAh) / 1000;
  return Math.abs(installedKwh - expected) <= SYSTEM_STANDARDS.verificationAbsoluteKwh;
}

/**
 * Search commercial battery SKUs and round UP to market capacities.
 * Never recommends fractional/non-commercial Ah values.
 */
export function searchBatteryConfigurations(
  dailyEnergyWh: number,
  backupHours: number,
  batteryType: BatteryType,
  systemVoltage: number,
  inverterPowerW: number,
  inverterEfficiency: number,
  inverterMaxDischargeA: number,
  inverterMaxChargeA: number
): BatteryCalculationResult[] {
  const units = getBatteriesForSystem(batteryType, systemVoltage);
  if (units.length === 0) return [];

  const results: BatteryCalculationResult[] = [];

  for (const unit of units) {
    const seriesCount = Math.ceil(systemVoltage / unit.voltage);
    const bankVoltage = seriesCount * unit.voltage;
    if (bankVoltage !== systemVoltage) continue;

    const energy = calculateBatteryEnergyTarget(
      dailyEnergyWh,
      backupHours,
      systemVoltage,
      inverterEfficiency,
      unit.efficiency,
      unit.dod
    );

    const batteryInverterDrawA = inverterPowerW / (systemVoltage * inverterEfficiency);
    const minParallelForCapacity = Math.ceil(energy.targetAh / unit.capacityAh);
    const minParallelForDischarge = Math.ceil(
      batteryInverterDrawA / (unit.capacityAh * unit.maxContinuousDischargeC)
    );
    const parallelCount = Math.max(1, minParallelForCapacity, minParallelForDischarge);

    const installedAh = parallelCount * unit.capacityAh;
    const installedKwh = (systemVoltage * installedAh) / 1000;
    const usableKwh = installedKwh * unit.dod;

    if (!verifyBatteryKwhConsistency(installedKwh, systemVoltage, installedAh)) {
      continue;
    }

    const maxDischargeA = installedAh * unit.maxContinuousDischargeC;
    const maxChargeA = installedAh * unit.maxContinuousChargeC;

    // Bank must supply inverter draw; inverter must accept that draw
    if (batteryInverterDrawA > inverterMaxDischargeA) continue;
    if (batteryInverterDrawA > maxDischargeA) continue;

    const batteryCurrentOk = true;

    const hourlyWh = dailyEnergyWh / 24;
    const expectedHours =
      hourlyWh > 0
        ? Math.min(72, (usableKwh * 1000 * inverterEfficiency) / hourlyWh)
        : backupHours;

    const utilization =
      usableKwh > 0 ? Math.min(100, Math.round((energy.requiredKwhRaw / usableKwh) * 100)) : 100;

    // Prefer fewer modules, closer match to target, higher C-rate headroom
    const oversizeRatio = installedKwh / energy.targetInstalledKwh;
    let score = 100;
    if (oversizeRatio >= 1.0 && oversizeRatio <= 1.35) score += 80;
    else if (oversizeRatio > 1.35) score += Math.max(0, 60 - (oversizeRatio - 1.35) * 40);
    else score += oversizeRatio * 40;
    score += Math.max(0, 40 - parallelCount * 5);
    if (unit.capacityAh === 100 || unit.capacityAh === 200) score += 15;

    const quantity = seriesCount * parallelCount;
    results.push({
      batteryRequiredKwhRaw: parseFloat(energy.requiredKwhRaw.toFixed(2)),
      batteryTargetInstalledKwh: parseFloat(energy.targetInstalledKwh.toFixed(2)),
      batteryCapacityAh: installedAh,
      batteryQuantity: quantity,
      batteryConfiguration: `${seriesCount} Series × ${parallelCount} Parallel · ${quantity} total (${quantity} × ${unit.voltage}V ${unit.capacityAh}Ah)`,
      batteryProductModel: `${unit.brand} ${unit.model} [${unit.capacityKwh.toFixed(2)} kWh/unit]`,
      batteryUnitCapacityAh: unit.capacityAh,
      batteryUnitVoltage: unit.voltage,
      batteryUsableKwh: parseFloat(usableKwh.toFixed(2)),
      batteryInstalledKwh: parseFloat(installedKwh.toFixed(2)),
      batteryEfficiency: unit.efficiency,
      batteryDodUsed: unit.dod,
      batterySeriesCount: seriesCount,
      batteryParallelCount: parallelCount,
      batteryExpectedBackupHours: parseFloat(expectedHours.toFixed(1)),
      batteryUtilizationPercent: utilization,
      batteryMaxDischargeCurrentA: parseFloat(maxDischargeA.toFixed(1)),
      batteryMaxChargeCurrentA: parseFloat(Math.min(maxChargeA, inverterMaxChargeA).toFixed(1)),
      batteryInverterDrawA: parseFloat(batteryInverterDrawA.toFixed(1)),
      batteryCurrentOk,
      batteryChemistry: batteryType,
      batteryUnit: unit,
      score
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
