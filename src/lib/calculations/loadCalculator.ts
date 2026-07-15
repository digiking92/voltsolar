import { ProjectAppliance } from '../../types';
import { getSurgeMultiplier } from './engineeringStandards';

export interface LoadCalculationResult {
  connectedLoad: number;      // Watts
  peakLoad: number;           // Watts (sum of wattage * surge multipliers)
  dailyEnergy: number;         // Wh
  monthlyEnergy: number;       // kWh
  continuousLoadW: number;     // Watts
  motorStartupLoadW: number;   // Watts
  diversityFactor: number;     // Ratio of expected simultaneous usage (typically 0.8)
  designLoadW: number;         // Design benchmark peak load including safety factor
  loadBreakdown: {
    applianceName: string;
    wattage: number;
    quantity: number;
    surgeMultiplier: number;
    peakLoadW: number;
    dailyEnergyWh: number;
  }[];
}

export function calculateLoadSchedule(appliances: ProjectAppliance[]): LoadCalculationResult {
  let connectedLoad = 0;
  let dailyEnergy = 0;
  let continuousLoadW = 0;
  let motorStartupLoadW = 0;

  const loadBreakdown: LoadCalculationResult['loadBreakdown'] = [];

  appliances.forEach((app) => {
    const wattage = app.customWattage;
    const qty = app.quantity;
    const hours = app.hoursUsed;
    const totalWatts = wattage * qty;
    
    connectedLoad += totalWatts;

    // Prefer explicit surge (custom appliances); else name-based engineering table
    const surgeMultiplier =
      typeof app.surgeMultiplier === 'number' && app.surgeMultiplier > 0
        ? app.surgeMultiplier
        : getSurgeMultiplier(app.applianceName);
    const itemPeakLoad = totalWatts * surgeMultiplier;
    
    dailyEnergy += totalWatts * hours;

    if (surgeMultiplier > 1.2) {
      motorStartupLoadW += (itemPeakLoad - totalWatts);
    } else {
      continuousLoadW += totalWatts;
    }

    loadBreakdown.push({
      applianceName: app.applianceName,
      wattage,
      quantity: qty,
      surgeMultiplier,
      peakLoadW: itemPeakLoad,
      dailyEnergyWh: totalWatts * hours,
    });
  });

  const monthlyEnergy = (dailyEnergy * 30) / 1000; // Wh to kWh

  // Apply a diversity factor for simultaneous usage (standard engineering practice: 0.8)
  const diversityFactor = 0.8;
  // Design peak = diversified continuous + motor startups.
  // Do NOT treat peak as the sum of every appliance at locked-rotor at once —
  // that overstates demand and falsely blocks valid residential designs.
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
    loadBreakdown,
  };
}
