import { BatteryType } from '../../types';
import { getBatteryFromDb, COMMERCIAL_BATTERY_CAPACITIES_AH, BatterySpecs } from './equipmentDatabase';

export interface BatteryCalculationResult {
  batteryRequiredKwhRaw: number;      // raw required kWh before efficiency corrections
  batteryCapacityKwh: number;         // final required bank energy (kWh) after all corrections & reserve
  batteryCapacityAh: number;          // equivalent target Ah required
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
  batteryMaxDischargeCurrentA: number; // Max safe continuous discharge current
  batteryInverterDrawA: number;        // Maximum DC current the inverter will draw from the battery
  batteryCurrentOk: boolean;          // True if battery can support the inverter peak current
}

export function determineSystemVoltageByLoad(connectedLoadW: number): number {
  if (connectedLoadW < 1200) {
    return 12;
  } else if (connectedLoadW < 3200) {
    return 24;
  } else {
    return 48;
  }
}

export function sizeBatteryBank(
  dailyEnergyWh: number,
  backupHours: number,
  batteryType: BatteryType,
  systemVoltageNum: number,
  inverterPowerW: number = 3000
): BatteryCalculationResult {
  // --- STEP 1: Daily Energy Demand ---
  // Passed as dailyEnergyWh

  // --- STEP 2: Calculate Energy Required During Backup ---
  const batteryRequiredKwhRaw = (dailyEnergyWh * (backupHours / 24)) / 1000;

  // --- STEP 3: Correct for Inverter Efficiency (Default 96%) ---
  const correctedForInverterKwh = batteryRequiredKwhRaw / 0.96;

  // --- STEP 4: Correct for Battery Efficiency ---
  // Lithium: 95%, AGM: 85%, Gel: 85%, Tubular: 85%
  let batteryEfficiency = 0.85;
  if (batteryType === 'lithium') {
    batteryEfficiency = 0.95;
  }
  const correctedForBatteryKwh = correctedForInverterKwh / batteryEfficiency;

  // --- STEP 5: Correct for Allowable Depth of Discharge ---
  // Lithium: 90%, Tubular: 50%, AGM: 50%, Gel: 50%
  let batteryDodUsed = 0.50;
  if (batteryType === 'lithium') {
    batteryDodUsed = 0.90;
  }
  const correctedForDodKwh = correctedForBatteryKwh / batteryDodUsed;

  // --- STEP 6: Apply Engineering Reserve (Default 20%) ---
  const batteryCapacityKwh = correctedForDodKwh * 1.20;

  // --- STEP 7: Convert kWh to Ah ---
  const targetAh = (batteryCapacityKwh * 1000) / systemVoltageNum;

  // --- STEP 8: Recommend Real Battery Sizes ---
  // Match a suitable commercial battery from our database
  const commercialBattery = getBatteryFromDb(batteryType, systemVoltageNum === 48 ? 48 : 12);
  const unitVoltage = commercialBattery.voltage;
  const unitCapacityAh = commercialBattery.capacityAh;
  const productModel = `${commercialBattery.brand} ${commercialBattery.model}`;

  // --- STEP 9: Recommend Battery Configuration (Series & Parallel) ---
  // Series configuration to match target system voltage
  const seriesCount = Math.ceil(systemVoltageNum / unitVoltage);

  // Parallel configuration to meet the target Ah requirement
  // For commercial size rounding, let's round UP targetAh to a neat multiple of unitCapacityAh
  const parallelCount = Math.max(1, Math.ceil(targetAh / unitCapacityAh));

  // Physical characteristics of final installed bank
  const totalQuantity = seriesCount * parallelCount;
  const installedAh = parallelCount * unitCapacityAh;
  const installedVoltage = seriesCount * unitVoltage;
  const batteryInstalledKwh = (installedAh * installedVoltage) / 1000;
  const batteryUsableKwh = batteryInstalledKwh * batteryDodUsed;

  // Calculate Expected actual backup hours under average consumption
  const hourlyAverageConsumptionWh = dailyEnergyWh / 24;
  let expectedHours = 0;
  if (hourlyAverageConsumptionWh > 0) {
    // Usable energy in Wh corrected for inverter efficiency
    const usableWh = batteryUsableKwh * 1000 * 0.96;
    expectedHours = parseFloat((usableWh / hourlyAverageConsumptionWh).toFixed(1));
  } else {
    expectedHours = backupHours;
  }

  // Double check utilization rate
  const utilizationRate = batteryInstalledKwh > 0 ? (batteryRequiredKwhRaw / batteryUsableKwh) * 100 : 0;

  // --- STEP 10: Current discharge validation ---
  // Maximum DC current drawn by inverter = InverterPower / (SystemVoltage * InverterEfficiency)
  const batteryInverterDrawA = parseFloat((inverterPowerW / (systemVoltageNum * 0.96)).toFixed(1));

  // Max safe continuous discharge current of the battery bank:
  // For Lithium, standard is 1C (1.0 * total Ah capacity)
  // For Lead-Acid, standard is C/10 (0.1 * total Ah capacity) or C/5 (0.2 * total Ah capacity) for short periods. Let's use 0.2C as safe limit
  const cRateMultiplier = batteryType === 'lithium' ? 1.0 : 0.2;
  const batteryMaxDischargeCurrentA = parseFloat((installedAh * cRateMultiplier).toFixed(1));
  const batteryCurrentOk = batteryMaxDischargeCurrentA >= batteryInverterDrawA;

  const configString = `${seriesCount} Series × ${parallelCount} Parallel (${totalQuantity} Units of ${unitVoltage}V ${unitCapacityAh}Ah)`;

  return {
    batteryRequiredKwhRaw: parseFloat(batteryRequiredKwhRaw.toFixed(2)),
    batteryCapacityKwh: parseFloat(batteryCapacityKwh.toFixed(2)),
    batteryCapacityAh: Math.round(targetAh),
    batteryQuantity: totalQuantity,
    batteryConfiguration: configString,
    batteryProductModel: `${productModel} [${(unitVoltage * unitCapacityAh / 1000).toFixed(1)} kWh]`,
    batteryUnitCapacityAh: unitCapacityAh,
    batteryUnitVoltage: unitVoltage,
    batteryUsableKwh: parseFloat(batteryUsableKwh.toFixed(2)),
    batteryInstalledKwh: parseFloat(batteryInstalledKwh.toFixed(2)),
    batteryEfficiency,
    batteryDodUsed,
    batterySeriesCount: seriesCount,
    batteryParallelCount: parallelCount,
    batteryExpectedBackupHours: Math.min(expectedHours, 72), // Cap expected display to 72 hours (3 days)
    batteryUtilizationPercent: Math.min(Math.round(utilizationRate), 100),
    batteryMaxDischargeCurrentA,
    batteryInverterDrawA,
    batteryCurrentOk
  };
}
