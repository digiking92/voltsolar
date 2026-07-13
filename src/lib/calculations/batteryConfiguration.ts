export interface BatteryConfigResult {
  seriesCount: number;
  parallelCount: number;
  totalQuantity: number;
  batteryVoltage: number;
  batteryCapacityAh: number;
  batteryInstalledKwh: number;
  batteryUsableKwh: number;
  connectionSchematic: string;
}

export function configureBatteryBank(
  seriesCount: number,
  parallelCount: number,
  unitVoltage: number,
  unitCapacityAh: number,
  dod: number
): BatteryConfigResult {
  const totalQuantity = seriesCount * parallelCount;
  const batteryVoltage = seriesCount * unitVoltage;
  const batteryCapacityAh = parallelCount * unitCapacityAh;
  const batteryInstalledKwh = (batteryCapacityAh * batteryVoltage) / 1000;
  const batteryUsableKwh = batteryInstalledKwh * dod;

  let connectionSchematic = '';
  if (seriesCount === 1 && parallelCount === 1) {
    connectionSchematic = `Single battery block [${batteryVoltage}V / ${batteryCapacityAh}Ah] direct connected.`;
  } else {
    connectionSchematic = `Connect ${seriesCount} units in series to build a ${batteryVoltage}V string. ` +
      `Repeat this to build ${parallelCount} matching strings. Connect the ${parallelCount} strings in parallel to common busbars.`;
  }

  return {
    seriesCount,
    parallelCount,
    totalQuantity,
    batteryVoltage,
    batteryCapacityAh,
    batteryInstalledKwh,
    batteryUsableKwh,
    connectionSchematic
  };
}
