export interface PanelSpecs {
  brand: string;
  model: string;
  sizeW: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  tempCoeffVoc: number; // %/°C, negative value e.g. -0.30
}

export interface InverterSpecs {
  brand: string;
  model: string;
  sizeKva: number;
  voltageV: number; // system DC voltage, e.g. 12, 24, 48
  mpptVocLimit: number;
  mpptVmpMin: number;
  mpptVmpMax: number;
  maxPvCurrent: number; // A
  maxPvPower: number; // W
  efficiency: number; // conversion efficiency, e.g. 0.96
}

export interface BatterySpecs {
  brand: string;
  model: string;
  chemistry: 'lithium' | 'tubular' | 'agm' | 'gel';
  voltage: number;
  capacityAh: number;
  capacityKwh: number;
  dod: number;
  efficiency: number;
}

// 1. Solar Panel Database
export const SOLAR_PANELS: PanelSpecs[] = [
  {
    brand: 'LONGi',
    model: 'Hi-MO 6 Explorer 430W',
    sizeW: 430,
    voc: 39.1,
    vmp: 32.7,
    isc: 14.0,
    imp: 13.15,
    tempCoeffVoc: -0.34
  },
  {
    brand: 'Jinko Solar',
    model: 'Tiger Neo N-type 575W',
    sizeW: 575,
    voc: 50.9,
    vmp: 42.2,
    isc: 14.3,
    imp: 13.63,
    tempCoeffVoc: -0.30
  },
  {
    brand: 'Canadian Solar',
    model: 'BiHiKu7 600W',
    sizeW: 600,
    voc: 41.3,
    vmp: 34.9,
    isc: 18.4,
    imp: 17.2,
    tempCoeffVoc: -0.34
  },
  {
    brand: 'Canadian Solar',
    model: 'BiHiKu7 650W',
    sizeW: 650,
    voc: 45.5,
    vmp: 38.3,
    isc: 18.5,
    imp: 17.0,
    tempCoeffVoc: -0.34
  }
];

// Helper to find or extrapolate panel specifications
export function getPanelFromDb(panelSizeW: number): PanelSpecs {
  const found = SOLAR_PANELS.find(p => p.sizeW === panelSizeW);
  if (found) return found;

  // Extrapolate safely for non-standard sizes
  const closest = SOLAR_PANELS.reduce((prev, curr) => 
    Math.abs(curr.sizeW - panelSizeW) < Math.abs(prev.sizeW - panelSizeW) ? curr : prev
  );

  const factor = panelSizeW / closest.sizeW;
  return {
    brand: 'Generic Solar',
    model: `Standard Mono-Si ${panelSizeW}W`,
    sizeW: panelSizeW,
    voc: parseFloat((closest.voc * factor).toFixed(1)),
    vmp: parseFloat((closest.vmp * factor).toFixed(1)),
    isc: closest.isc,
    imp: closest.imp,
    tempCoeffVoc: closest.tempCoeffVoc
  };
}

// 2. Inverter Database
export const INVERTERS: InverterSpecs[] = [
  // 12V / 24V small power units
  {
    brand: 'Victron Energy',
    model: 'MultiPlus-II 12V 1.2kVA',
    sizeKva: 1.2,
    voltageV: 12,
    mpptVocLimit: 75,
    mpptVmpMin: 15,
    mpptVmpMax: 65,
    maxPvCurrent: 15,
    maxPvPower: 1000,
    efficiency: 0.95
  },
  {
    brand: 'Victron Energy',
    model: 'MultiPlus-II 24V 3kVA',
    sizeKva: 3.0,
    voltageV: 24,
    mpptVocLimit: 150,
    mpptVmpMin: 30,
    mpptVmpMax: 120,
    maxPvCurrent: 35,
    maxPvPower: 3000,
    efficiency: 0.96
  },
  // 48V common residential hybrid units
  {
    brand: 'Deye',
    model: 'SUN-5K-SG01LP1 Hybrid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 430,
    maxPvCurrent: 13,
    maxPvPower: 6500,
    efficiency: 0.97
  },
  {
    brand: 'Growatt',
    model: 'SPH8000 residential Hybrid 8kVA',
    sizeKva: 8.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 500,
    maxPvCurrent: 14,
    maxPvPower: 10400,
    efficiency: 0.97
  },
  {
    brand: 'Growatt',
    model: 'SPH10000 residential Hybrid 10kVA',
    sizeKva: 10.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 500,
    maxPvCurrent: 14,
    maxPvPower: 13000,
    efficiency: 0.97
  },
  {
    brand: 'Deye',
    model: 'SUN-12K-SG04LP3 12kVA 3-Phase',
    sizeKva: 12.0,
    voltageV: 48,
    mpptVocLimit: 800,
    mpptVmpMin: 160,
    mpptVmpMax: 650,
    maxPvCurrent: 26,
    maxPvPower: 15600,
    efficiency: 0.975
  },
  {
    brand: 'Felicity Solar',
    model: 'LP-15KVA Commercial Off-Grid',
    sizeKva: 15.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 20,
    maxPvPower: 18000,
    efficiency: 0.96
  }
];

// Find standard or nearest custom inverter spec
export function getInverterFromDb(targetKva: number, systemVoltage: number): InverterSpecs {
  const matchingVoltage = INVERTERS.filter(inv => inv.voltageV === systemVoltage);
  const searchPool = matchingVoltage.length > 0 ? matchingVoltage : INVERTERS;

  const found = searchPool.find(inv => inv.sizeKva === targetKva);
  if (found) return found;

  // Find nearest
  const closest = searchPool.reduce((prev, curr) => 
    Math.abs(curr.sizeKva - targetKva) < Math.abs(prev.sizeKva - targetKva) ? curr : prev
  );

  return {
    brand: 'VoltSolar Smart',
    model: `VoltSolar Pro ${targetKva}kVA ${systemVoltage}V`,
    sizeKva: targetKva,
    voltageV: systemVoltage,
    mpptVocLimit: closest.mpptVocLimit,
    mpptVmpMin: closest.mpptVmpMin,
    mpptVmpMax: closest.mpptVmpMax,
    maxPvCurrent: closest.maxPvCurrent,
    maxPvPower: targetKva * 1300, // 130% DC loading ratio
    efficiency: closest.efficiency
  };
}

// 3. Battery Database (commercially available models)
export const BATTERIES: BatterySpecs[] = [
  // 12V Batteries (mostly Lead-Acid Gel/AGM/Tubular or Small Lithium)
  {
    brand: 'Victron Energy',
    model: 'Peak Power 12.8V 100Ah Lithium',
    chemistry: 'lithium',
    voltage: 12,
    capacityAh: 100,
    capacityKwh: 1.28,
    dod: 0.90,
    efficiency: 0.95
  },
  {
    brand: 'Felicity Solar',
    model: 'Deep Cycle Tall Tubular 12V 200Ah',
    chemistry: 'tubular',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85
  },
  {
    brand: 'Felicity Solar',
    model: 'Premium Gel Deep Cycle 12V 200Ah',
    chemistry: 'gel',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85
  },
  {
    brand: 'Victron Energy',
    model: 'Super Cycle Heavy-Duty AGM 12V 200Ah',
    chemistry: 'agm',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85
  },
  // 48V Batteries
  {
    brand: 'Pylontech',
    model: 'US3000C LiFePO4 48V 74Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 74,
    capacityKwh: 3.55,
    dod: 0.90,
    efficiency: 0.95
  },
  {
    brand: 'Felicity Solar',
    model: 'LPBA48100 LiFePO4 Powerwall 48V 100Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 100,
    capacityKwh: 4.80,
    dod: 0.90,
    efficiency: 0.95
  },
  {
    brand: 'Felicity Solar',
    model: 'LPBA48200 LiFePO4 Powerwall 48V 200Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 200,
    capacityKwh: 9.60,
    dod: 0.90,
    efficiency: 0.95
  }
];

export function getBatteryFromDb(chemistry: 'lithium' | 'tubular' | 'agm' | 'gel', systemVoltage: number): BatterySpecs {
  // Try to find matching chemistry and system voltage
  const match = BATTERIES.find(b => b.chemistry === chemistry && b.voltage === systemVoltage);
  if (match) return match;

  // Fallback to 12V for AGM/Gel/Tubular, or match by chemistry
  const chemPool = BATTERIES.filter(b => b.chemistry === chemistry);
  if (chemPool.length > 0) return chemPool[0];

  // Global fallback
  return BATTERIES[3]; // Felicity 12V Gel 200Ah
}

// Commercially available battery capacity sizes for rounding-up recommendations
export const COMMERCIAL_BATTERY_CAPACITIES_AH = [50, 74, 100, 150, 200, 280, 300, 400];
