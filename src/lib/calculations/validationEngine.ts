export interface ValidationWarning {
  level: 'info' | 'warning' | 'danger';
  message: string;
  suggestion: string;
}

export function validateSystemDesign(params: {
  connectedLoadW: number;
  peakLoadW: number;
  dailyEnergyWh: number;
  batteryCapacityKwh: number;
  batteryUsableKwh: number;
  batteryInstalledKwh: number;
  solarArrayKw: number;
  estimatedDailyProductionKwh: number;
  inverterSizeKva: number;
  panelSizingCompatibilityOk: boolean;
  panelSizingCompatibilityWarning: string;
  stringVocMax: number;
  mpptVocLimit: number;
  backupHours: number;
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 1. Inverter Overload Check
  const continuousLoadKw = params.connectedLoadW / 1000;
  if (continuousLoadKw > params.inverterSizeKva) {
    warnings.push({
      level: 'danger',
      message: `Inverter Overload: Sized inverter capacity (${params.inverterSizeKva} kVA) is less than the active continuous running load (${continuousLoadKw.toFixed(2)} kW).`,
      suggestion: 'Remove heavy loads or expand the inverter capacity to at least 1.25x the continuous load to avoid thermal shutdowns.'
    });
  } else if (continuousLoadKw * 1.2 > params.inverterSizeKva) {
    warnings.push({
      level: 'warning',
      message: `Narrow Inverter Margin: Sized inverter (${params.inverterSizeKva} kVA) operates at over 80% of continuous load capacity.`,
      suggestion: 'Add a 20% future-proofing buffer to the inverter size for long-term health.'
    });
  }

  // 2. Solar PV Array Undersizing Check
  const dailyEnergyKwh = params.dailyEnergyWh / 1000;
  if (params.estimatedDailyProductionKwh < dailyEnergyKwh) {
    warnings.push({
      level: 'warning',
      message: `Undersized Solar Array: Sized solar panels will produce ${params.estimatedDailyProductionKwh} kWh/day, which does not cover the daily consumption of ${dailyEnergyKwh.toFixed(1)} kWh/day.`,
      suggestion: 'Expand the solar array size or reduce appliance run hours to prevent the system from drawing down the battery bank completely.'
    });
  }

  // 3. Battery Recharge Capacity Check
  // We want the solar array to be able to supply the daily load AND recharge the battery bank.
  // Standard rule: PV Array should be at least (Daily Energy + Usable Battery Energy) / PSH
  const standardPsh = 4.5;
  const minimumRecommendedPvKw = (dailyEnergyKwh + params.batteryUsableKwh) / standardPsh;
  if (params.solarArrayKw < minimumRecommendedPvKw) {
    warnings.push({
      level: 'warning',
      message: `Deficit Recharge Rate: Sized PV Array (${params.solarArrayKw} kWp) is too small to support daily loads and simultaneously charge the battery bank to 100% on average solar days.`,
      suggestion: 'Increase solar array panel count or shorten backup reserve hours to ensure batteries can recover daily.'
    });
  }

  // 4. Panel Voltage Safety Check
  if (!params.panelSizingCompatibilityOk) {
    warnings.push({
      level: 'danger',
      message: params.panelSizingCompatibilityWarning || `Incompatible PV String: String Voc (${params.stringVocMax}V) exceeds safe limits.`,
      suggestion: 'Redistribute panels into more parallel strings and fewer series connections to lower string open-circuit voltage.'
    });
  }

  // 5. Battery Depth-of-Discharge Buffer Check
  if (params.batteryCapacityKwh < 1.0 && params.backupHours > 4) {
    warnings.push({
      level: 'warning',
      message: `Extremely Small Battery: Sized storage (${params.batteryCapacityKwh} kWh) is highly sensitive to small over-consumption spikes.`,
      suggestion: 'Increase backup capacity to at least 2.4 kWh for safety headroom against battery deep discharges.'
    });
  }

  // 6. Generic Electrical Protection Info
  warnings.push({
    level: 'info',
    message: 'Electrical Protection Check: Sized conductors require DC Fuses, AC Breakers, and Type II surge protection devices.',
    suggestion: 'Install grounding rods with soil resistivity verification, and wire the combined ACDB/DCDB as per IEC standards.'
  });

  return warnings;
}
