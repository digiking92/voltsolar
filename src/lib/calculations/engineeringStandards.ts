export interface SolarRegion {
  name: string;
  peakSunHours: number;
}

export const SOLAR_REGIONS: SolarRegion[] = [
  { name: 'austin', peakSunHours: 4.8 },
  { name: 'london', peakSunHours: 3.2 },
  { name: 'lagos', peakSunHours: 5.2 },
  { name: 'sydney', peakSunHours: 5.0 },
  { name: 'miami', peakSunHours: 5.1 },
  { name: 'nairobi', peakSunHours: 5.6 },
  { name: 'berlin', peakSunHours: 3.4 },
  { name: 'paris', peakSunHours: 3.5 },
  { name: 'cairo', peakSunHours: 6.2 },
  { name: 'tokyo', peakSunHours: 3.8 },
  { name: 'new york', peakSunHours: 4.2 },
  { name: 'los angeles', peakSunHours: 5.4 },
  { name: 'johannesburg', peakSunHours: 5.5 },
  { name: 'mumbai', peakSunHours: 4.9 },
  { name: 'dubai', peakSunHours: 5.8 }
];

export function getPeakSunHours(location: string): number {
  const normalized = location.toLowerCase().trim();
  const found = SOLAR_REGIONS.find(r => normalized.includes(r.name));
  return found ? found.peakSunHours : 4.5; // Default fallback to 4.5 Peak Sun Hours
}

export const SURGE_MULTIPLIERS: Record<string, number> = {
  'led': 1.0,
  'light': 1.0,
  'television': 1.0,
  'tv': 1.0,
  'microwave': 1.2,
  'fan': 1.5,
  'fridge': 3.0,
  'refrigerator': 3.0,
  'freezer': 3.0,
  'water pump': 3.0,
  'pump': 3.0,
  'borehole': 3.0,
  'air conditioner': 2.5,
  'ac': 2.5,
  'washing machine': 2.0,
  'compressor': 4.0,
  'blender': 1.5,
  'iron': 1.5,
  'kettle': 1.2,
  'computer': 1.0,
  'laptop': 1.0,
  'server': 1.1,
  'vacuum': 1.8,
  'coffee': 1.1,
  'heater': 1.0,
  'cooker': 1.0,
  'induction': 1.0,
  'charger': 1.0
};

export function getSurgeMultiplier(applianceName: string): number {
  const normalized = applianceName.toLowerCase();
  for (const [key, val] of Object.entries(SURGE_MULTIPLIERS)) {
    if (normalized.includes(key)) {
      return val;
    }
  }
  return 1.2; // Safe general fallback multiplier for unknown/unmatched appliances
}

// System Efficiencies and Loss Factors
export const SYSTEM_STANDARDS = {
  inverterEfficiencyFallback: 0.96,
  chargeControllerEfficiency: 0.98,
  cableLossFactor: 0.02, // 2%
  dustLossFactor: 0.05,  // 5%
  temperatureDeratingFactor: 0.10, // 10% thermal losses
  batteryEngineeringReserve: 1.20, // 20% sizing reserve
  inverterSafetyFactor: 1.25,     // 25% safety margin on inverter continuous rating
  necBreakerMultiplier: 1.25,     // NEC 125% continuous rating multiplier for OCPD
  copperResistivity: 1.72e-8,     // Ω·m (at 20-30°C)
  maxCableVoltageDropPv: 0.02,    // Max 2% drop on DC PV String
  maxCableVoltageDropBattery: 0.01, // Max 1% drop on high-current DC Battery line
  maxCableVoltageDropAc: 0.03,     // Max 3% drop on AC load run
  minDesignTempC: -10,            // Cold-weather Voc design temperature
  maxCellTempC: 65,               // Hot-weather Vmp design temperature
  stcTempC: 25,
  acNominalVoltageV: 230,
  selfCheckTolerancePercent: 1.0, // Independent verification tolerance
  verificationAbsoluteKwh: 0.05,  // Battery kWh consistency absolute tolerance
};

// Panel characteristics
export interface PanelSpecs {
  sizeW: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
}

export const PANEL_STANDARDS: PanelSpecs[] = [
  { sizeW: 300, voc: 34.0, vmp: 28.5, isc: 11.2, imp: 10.53 },
  { sizeW: 400, voc: 37.2, vmp: 31.0, isc: 13.6, imp: 12.9 },
  { sizeW: 550, voc: 49.8, vmp: 41.5, isc: 14.0, imp: 13.25 },
  { sizeW: 600, voc: 54.2, vmp: 45.3, isc: 14.1, imp: 13.25 }
];

export function getPanelSpecs(panelSizeW: number): PanelSpecs {
  const found = PANEL_STANDARDS.find(p => p.sizeW === panelSizeW);
  if (found) return found;
  // Extrapolate safely for non-standard sizes
  const factor = panelSizeW / 550;
  return {
    sizeW: panelSizeW,
    voc: parseFloat((49.8 * factor).toFixed(1)),
    vmp: parseFloat((41.5 * factor).toFixed(1)),
    isc: 14.0,
    imp: 13.25
  };
}

// Battery chemistry characteristics
export interface BatteryChemSpecs {
  dod: number;
  efficiency: number;
  standardVoltage: number;
  standardCapacityAh: number;
  modelSuffix: string;
}

export const BATTERY_CHEM_STANDARDS: Record<string, BatteryChemSpecs> = {
  lithium: { dod: 0.90, efficiency: 0.95, standardVoltage: 48, standardCapacityAh: 100, modelSuffix: 'LiFePO4 Powerwall' },
  tubular: { dod: 0.60, efficiency: 0.82, standardVoltage: 12, standardCapacityAh: 200, modelSuffix: 'Deep-Cycle Tall Tubular' },
  agm: { dod: 0.50, efficiency: 0.80, standardVoltage: 12, standardCapacityAh: 200, modelSuffix: 'Heavy-Duty AGM Lead-Acid' },
  gel: { dod: 0.50, efficiency: 0.83, standardVoltage: 12, standardCapacityAh: 200, modelSuffix: 'Deep-Cycle GEL' }
};

// Cable cross-sections and maximum current carrying capacity (Amperes)
export interface CableSpec {
  crossSectionMm2: number;
  maxCurrentA: number; // continuous rating in conduit/free-air at 30°C
}

export const COPPER_CABLE_SPECS: CableSpec[] = [
  { crossSectionMm2: 2.5, maxCurrentA: 22 },
  { crossSectionMm2: 4, maxCurrentA: 32 },
  { crossSectionMm2: 6, maxCurrentA: 41 },
  { crossSectionMm2: 10, maxCurrentA: 57 },
  { crossSectionMm2: 16, maxCurrentA: 76 },
  { crossSectionMm2: 25, maxCurrentA: 101 },
  { crossSectionMm2: 35, maxCurrentA: 125 },
  { crossSectionMm2: 50, maxCurrentA: 151 },
  { crossSectionMm2: 70, maxCurrentA: 192 },
  { crossSectionMm2: 95, maxCurrentA: 232 },
  { crossSectionMm2: 120, maxCurrentA: 269 }
];

export function findRequiredCableSize(continuousCurrent: number): number {
  const found = COPPER_CABLE_SPECS.find(c => c.maxCurrentA >= continuousCurrent);
  if (!found) {
    // Fail closed — caller must handle / parallel conductors (do not silently under-size)
    return COPPER_CABLE_SPECS[COPPER_CABLE_SPECS.length - 1].crossSectionMm2 + 0.01;
  }
  return found.crossSectionMm2;
}
