import { ProjectAppliance } from '../../types';
import { getSurgeMultiplier } from './engineeringStandards';

export interface LoadCalculationResult {
  connectedLoad: number; // Watts
  peakLoad: number; // Watts
  dailyEnergy: number; // Wh
  monthlyEnergy: number; // kWh
  continuousLoadW: number;
  motorStartupLoadW: number;
  diversityFactor: number;
  designLoadW: number;
  loadBreakdown: {
    applianceName: string;
    wattage: number;
    quantity: number;
    surgeMultiplier: number;
    peakLoadW: number;
    dailyEnergyWh: number;
  }[];
}

/** Single source of truth for one appliance's daily Wh (same math as scheduler cards). */
export function applianceDailyEnergyWh(app: {
  customWattage?: number | null;
  quantity?: number | null;
  hoursUsed?: number | null;
}): number {
  const wattage = Math.max(0, Number(app.customWattage) || 0);
  const quantity = Math.max(0, Number(app.quantity) || 0);
  const hours = Math.max(0, Number(app.hoursUsed) || 0);
  return wattage * quantity * hours;
}

/** Sum of all appliances' daily energy in Wh — never depends on design solvers. */
export function sumApplianceDailyEnergyWh(
  appliances: Array<{
    customWattage?: number | null;
    quantity?: number | null;
    hoursUsed?: number | null;
  }>
): number {
  return appliances.reduce((sum, app) => sum + applianceDailyEnergyWh(app), 0);
}

export function calculateLoadSchedule(appliances: ProjectAppliance[]): LoadCalculationResult {
  let connectedLoad = 0;
  let dailyEnergy = 0;
  let continuousLoadW = 0;
  let motorStartupLoadW = 0;

  const loadBreakdown: LoadCalculationResult['loadBreakdown'] = [];

  appliances.forEach(app => {
    const wattage = Math.max(0, Number(app.customWattage) || 0);
    const qty = Math.max(0, Number(app.quantity) || 0);
    const hours = Math.max(0, Number(app.hoursUsed) || 0);
    const totalWatts = wattage * qty;

    connectedLoad += totalWatts;

    const surgeMultiplier =
      typeof app.surgeMultiplier === 'number' && app.surgeMultiplier > 0
        ? app.surgeMultiplier
        : getSurgeMultiplier(app.applianceName);
    const itemPeakLoad = totalWatts * surgeMultiplier;

    dailyEnergy += totalWatts * hours;

    if (surgeMultiplier > 1.2) {
      motorStartupLoadW += itemPeakLoad - totalWatts;
    } else {
      continuousLoadW += totalWatts;
    }

    loadBreakdown.push({
      applianceName: app.applianceName,
      wattage,
      quantity: qty,
      surgeMultiplier,
      peakLoadW: itemPeakLoad,
      dailyEnergyWh: totalWatts * hours
    });
  });

  const monthlyEnergy = (dailyEnergy * 30) / 1000;
  const diversityFactor = 0.8;
  const designLoadW = Math.round(connectedLoad * diversityFactor + motorStartupLoadW);

  return {
    connectedLoad,
    peakLoad: designLoadW,
    dailyEnergy,
    monthlyEnergy,
    continuousLoadW,
    motorStartupLoadW,
    diversityFactor,
    designLoadW,
    loadBreakdown
  };
}
