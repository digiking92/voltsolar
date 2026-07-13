import { BatteryType } from '../../types';
import { getPeakSunHours, SYSTEM_STANDARDS, BATTERY_CHEM_STANDARDS } from './engineeringStandards';

export interface SolarArrayCalculationResult {
  solarArrayKw: number;              // kWp required solar array size
  panelQuantity: number;             // number of panels
  estimatedDailyProductionKwh: number; // actual daily production estimate (kWh)
  peakSunHoursUsed: number;
  overallSystemEfficiency: number;
  temperatureLossPercent: number;
  dustLossPercent: number;
  cableLossPercent: number;
  dailyHarvestWhRaw: number;         // raw production from panel rating * hours * quantity
}

export function sizeSolarArray(
  dailyEnergyWh: number,
  panelWattage: number,
  location: string,
  batteryType: BatteryType
): SolarArrayCalculationResult {
  // 1. Get meteorological Peak Sun Hours (PSH)
  const psh = getPeakSunHours(location);

  // 2. Extract detailed component efficiencies
  const tempLoss = SYSTEM_STANDARDS.temperatureDeratingFactor; // e.g., 0.10 (10% loss)
  const dustLoss = SYSTEM_STANDARDS.dustLossFactor;            // e.g., 0.05 (5% loss)
  const cableLoss = SYSTEM_STANDARDS.cableLossFactor;          // e.g., 0.02 (2% loss)
  const inverterEff = SYSTEM_STANDARDS.inverterEfficiencyFallback;
  const batterySpecs = BATTERY_CHEM_STANDARDS[batteryType] || BATTERY_CHEM_STANDARDS.lithium;
  const batteryEff = batterySpecs.efficiency;                   // e.g., 0.95 for Lithium

  // 3. Compute overall combined system efficiency
  // Overall system efficiency captures thermal, soiling, transmission, and roundtrip storage loss.
  const overallEfficiency = (1 - tempLoss) * (1 - dustLoss) * (1 - cableLoss) * inverterEff * batteryEff;

  // 4. Determine required solar array size in Watts
  // Array Size = Daily energy / (Peak Sun Hours * Combined Efficiency)
  const targetPvWatts = dailyEnergyWh / (psh * overallEfficiency);
  
  // 5. Calculate Panel Quantity
  let quantity = Math.ceil(targetPvWatts / panelWattage);
  if (quantity <= 0) quantity = 1;

  // 6. Recalculate actual array kWp
  const actualKw = (quantity * panelWattage) / 1000;

  // 7. Calculate actual estimated daily production (Kwh)
  const rawHarvestWh = quantity * panelWattage * psh;
  const estimatedDailyProductionKwh = (rawHarvestWh * overallEfficiency) / 1000;

  return {
    solarArrayKw: parseFloat(actualKw.toFixed(2)),
    panelQuantity: quantity,
    estimatedDailyProductionKwh: parseFloat(estimatedDailyProductionKwh.toFixed(2)),
    peakSunHoursUsed: psh,
    overallSystemEfficiency: parseFloat((overallEfficiency * 100).toFixed(1)),
    temperatureLossPercent: Math.round(tempLoss * 100),
    dustLossPercent: Math.round(dustLoss * 100),
    cableLossPercent: Math.round(cableLoss * 100),
    dailyHarvestWhRaw: parseFloat((rawHarvestWh / 1000).toFixed(2))
  };
}
