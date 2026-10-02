import type { CatalogMarketId } from './catalogMarkets';
import { inverterInMarket } from './catalogMarkets';
import { EXTRA_INVERTERS, EXTRA_PANELS } from './catalogExtras';

export interface PanelSpecs {
  brand: string;
  model: string;
  sizeW: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  tempCoeffVoc: number; // %/°C, negative e.g. -0.30
  /** Vmp temp coeff (%/°C); typically ~5–15% more negative than Voc coeff */
  tempCoeffVmp?: number;
  maxSeriesFuseA: number;
  maxSystemVoltageV: number;
}

export interface InverterSpecs {
  brand: string;
  model: string;
  sizeKva: number;
  voltageV: number;
  mpptVocLimit: number;
  mpptVmpMin: number;
  mpptVmpMax: number;
  /** Highest / primary MPPT continuous current (A). Prefer mpptInputCurrentsA when asymmetric. */
  maxPvCurrent: number;
  maxPvPower: number; // W total PV input
  numMppts: number;
  maxStringsPerMppt: number;
  /**
   * Per-MPPT continuous PV input current limits (A), e.g. Deye 12K 3φ = [26, 13].
   * When omitted, every tracker uses maxPvCurrent.
   */
  mpptInputCurrentsA?: number[];
  /**
   * Per-MPPT max parallel strings, e.g. Deye 12K 3φ = [2, 1].
   * When omitted, every tracker uses maxStringsPerMppt.
   */
  mpptMaxStrings?: number[];
  efficiency: number;
  maxBatteryChargeCurrentA: number;
  maxBatteryDischargeCurrentA: number;
  surgeFactor: number; // multiplier of continuous rating for brief surge
  topology: 'hybrid' | 'off_grid' | 'grid_tie';
  /** AC output phases — drives AC current / breaker / cable math */
  phases: 1 | 3;
  /** Market packs this SKU belongs to. Omit = available in all markets. */
  regions?: CatalogMarketId[];
}

/** User-entered datasheet fields (partial OK — gaps filled from engineering defaults). */
export type DatasheetInverterInput = {
  brand?: string;
  model?: string;
  sizeKva: number;
  voltageV: number;
  topology?: 'hybrid' | 'off_grid';
  mpptVocLimit?: number;
  mpptVmpMin?: number;
  mpptVmpMax?: number;
  maxPvCurrent?: number;
  maxPvPower?: number;
  numMppts?: number;
  maxStringsPerMppt?: number;
  efficiency?: number;
  maxBatteryChargeCurrentA?: number;
  maxBatteryDischargeCurrentA?: number;
  surgeFactor?: number;
  phases?: 1 | 3;
};

export type MpptChannel = { currentA: number; maxStrings: number };

/** Resolve per-tracker current and string limits (supports asymmetric MPPTs). */
export function getMpptChannels(inv: InverterSpecs): MpptChannel[] {
  const n = Math.max(1, inv.numMppts || 1);
  const currents = inv.mpptInputCurrentsA;
  const strings = inv.mpptMaxStrings;
  return Array.from({ length: n }, (_, i) => ({
    currentA: currents?.[i] ?? currents?.[currents.length - 1] ?? inv.maxPvCurrent,
    maxStrings: strings?.[i] ?? strings?.[strings.length - 1] ?? inv.maxStringsPerMppt
  }));
}

export function formatMpptCurrentLimits(inv: InverterSpecs): string {
  const channels = getMpptChannels(inv);
  if (channels.length <= 1) return `${channels[0]?.currentA ?? inv.maxPvCurrent}`;
  const allSame = channels.every(c => c.currentA === channels[0].currentA);
  if (allSame) return `${channels[0].currentA}`;
  return channels.map(c => c.currentA).join('+');
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
  maxContinuousDischargeC: number;
  maxContinuousChargeC: number;
}

export const SOLAR_PANELS: PanelSpecs[] = [
  {
    brand: 'LONGi',
    model: 'Hi-MO 6 Explorer 430W',
    sizeW: 430,
    voc: 39.1,
    vmp: 32.7,
    isc: 14.0,
    imp: 13.15,
    tempCoeffVoc: -0.34,
    maxSeriesFuseA: 25,
    maxSystemVoltageV: 1500
  },
  {
    brand: 'Jinko Solar',
    model: 'Tiger Neo N-type 575W',
    sizeW: 575,
    voc: 50.9,
    vmp: 42.2,
    isc: 14.3,
    imp: 13.63,
    tempCoeffVoc: -0.30,
    maxSeriesFuseA: 25,
    maxSystemVoltageV: 1500
  },
  {
    brand: 'Canadian Solar',
    model: 'BiHiKu7 600W',
    sizeW: 600,
    voc: 41.3,
    vmp: 34.9,
    isc: 18.4,
    imp: 17.2,
    tempCoeffVoc: -0.34,
    maxSeriesFuseA: 30,
    maxSystemVoltageV: 1500
  },
  {
    brand: 'Canadian Solar',
    model: 'BiHiKu7 650W',
    sizeW: 650,
    voc: 45.5,
    vmp: 38.3,
    isc: 18.5,
    imp: 17.0,
    tempCoeffVoc: -0.34,
    maxSeriesFuseA: 30,
    maxSystemVoltageV: 1500
  }
];

/** Canonical mono module I-V for common wattages (avoids inflated Imp from scaling 575 W Neo cells). */
const GENERIC_PANEL_IV: Record<
  number,
  Pick<PanelSpecs, 'voc' | 'vmp' | 'isc' | 'imp' | 'tempCoeffVoc' | 'tempCoeffVmp' | 'maxSeriesFuseA'>
> = {
  300: { voc: 34.0, vmp: 28.5, isc: 11.2, imp: 10.53, tempCoeffVoc: -0.30, tempCoeffVmp: -0.34, maxSeriesFuseA: 20 },
  400: { voc: 37.2, vmp: 31.0, isc: 13.6, imp: 12.9, tempCoeffVoc: -0.30, tempCoeffVmp: -0.34, maxSeriesFuseA: 25 },
  450: { voc: 41.0, vmp: 34.2, isc: 13.8, imp: 13.15, tempCoeffVoc: -0.29, tempCoeffVmp: -0.33, maxSeriesFuseA: 25 },
  550: { voc: 49.8, vmp: 41.3, isc: 13.99, imp: 13.25, tempCoeffVoc: -0.28, tempCoeffVmp: -0.32, maxSeriesFuseA: 25 },
  600: { voc: 54.2, vmp: 45.3, isc: 14.1, imp: 13.25, tempCoeffVoc: -0.28, tempCoeffVmp: -0.32, maxSeriesFuseA: 25 }
};

export function getPanelFromDb(panelSizeW: number): PanelSpecs {
  const all = [...SOLAR_PANELS, ...EXTRA_PANELS];
  const found = all.find(p => p.sizeW === panelSizeW);
  if (found) return found;

  const generic = GENERIC_PANEL_IV[panelSizeW];
  if (generic) {
    return {
      brand: 'Generic Solar',
      model: `Standard Mono-Si ${panelSizeW}W`,
      sizeW: panelSizeW,
      ...generic,
      maxSystemVoltageV: 1500
    };
  }

  const closest = all.reduce((prev, curr) =>
    Math.abs(curr.sizeW - panelSizeW) < Math.abs(prev.sizeW - panelSizeW) ? curr : prev
  );

  const factor = panelSizeW / closest.sizeW;
  // Scale voltage ~√(P) and current ~√(P) approximately when keeping similar cell count family
  return {
    brand: 'Generic Solar',
    model: `Standard Mono-Si ${panelSizeW}W`,
    sizeW: panelSizeW,
    voc: parseFloat((closest.voc * Math.sqrt(factor)).toFixed(1)),
    vmp: parseFloat((closest.vmp * Math.sqrt(factor)).toFixed(1)),
    isc: parseFloat((closest.isc * Math.sqrt(factor)).toFixed(2)),
    imp: parseFloat((closest.imp * Math.sqrt(factor)).toFixed(2)),
    tempCoeffVoc: closest.tempCoeffVoc,
    tempCoeffVmp: closest.tempCoeffVmp ?? closest.tempCoeffVoc * 1.12,
    maxSeriesFuseA: closest.maxSeriesFuseA,
    maxSystemVoltageV: closest.maxSystemVoltageV
  };
}

export function getAllPanels(): PanelSpecs[] {
  const byKey = new Map<string, PanelSpecs>();
  for (const p of [...SOLAR_PANELS, ...EXTRA_PANELS]) {
    byKey.set(`${p.brand}|${p.model}|${p.sizeW}`, p);
  }
  return Array.from(byKey.values());
}

export function getCandidatePanels(preferredSizeW: number): PanelSpecs[] {
  const preferred = getPanelFromDb(preferredSizeW);
  const others = getAllPanels().filter(
    p => !(p.sizeW === preferred.sizeW && p.brand === preferred.brand && p.model === preferred.model)
  );
  return [preferred, ...others];
}

/** Build a datasheet-backed inverter so Voc/MPPT/fuse math uses real limits. */
export function createInverterFromDatasheet(input: DatasheetInverterInput): InverterSpecs {
  const base = createGenericInverter(
    input.sizeKva,
    input.voltageV,
    input.topology || 'hybrid'
  );
  return {
    ...base,
    brand: (input.brand || 'Datasheet').trim() || 'Datasheet',
    model: (input.model || `${input.sizeKva} kVA / ${input.voltageV}V (user datasheet)`).trim(),
    sizeKva: input.sizeKva,
    voltageV: input.voltageV,
    topology: input.topology || base.topology,
    mpptVocLimit: input.mpptVocLimit ?? base.mpptVocLimit,
    mpptVmpMin: input.mpptVmpMin ?? base.mpptVmpMin,
    mpptVmpMax: input.mpptVmpMax ?? base.mpptVmpMax,
    maxPvCurrent: input.maxPvCurrent ?? base.maxPvCurrent,
    maxPvPower: input.maxPvPower ?? base.maxPvPower,
    numMppts: input.numMppts ?? base.numMppts,
    maxStringsPerMppt: input.maxStringsPerMppt ?? base.maxStringsPerMppt,
    efficiency: input.efficiency ?? base.efficiency,
    maxBatteryChargeCurrentA: input.maxBatteryChargeCurrentA ?? base.maxBatteryChargeCurrentA,
    maxBatteryDischargeCurrentA:
      input.maxBatteryDischargeCurrentA ?? base.maxBatteryDischargeCurrentA,
    surgeFactor: input.surgeFactor ?? base.surgeFactor,
    phases: input.phases ?? base.phases
  };
}

export function getAllInverters(market: CatalogMarketId = 'global'): InverterSpecs[] {
  const merged = [...INVERTERS, ...EXTRA_INVERTERS];
  return merged.filter(inv => inverterInMarket(inv.regions, market));
}

export const INVERTERS: InverterSpecs[] = [
  // --- 12 V / 24 V all-in-one (real integrated MPPT) — NOT Victron MultiPlus (no PV MPPT) ---
  {
    brand: 'MUST',
    model: 'PV1800 VPM 1.2kVA / 12V',
    sizeKva: 1.2,
    voltageV: 12,
    mpptVocLimit: 105,
    mpptVmpMin: 15,
    mpptVmpMax: 80,
    maxPvCurrent: 40,
    maxPvPower: 800,
    numMppts: 1,
    maxStringsPerMppt: 1,
    efficiency: 0.90,
    maxBatteryChargeCurrentA: 50,
    maxBatteryDischargeCurrentA: 100,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  {
    brand: 'MUST',
    model: 'PV1800 VPM 3kVA / 24V',
    sizeKva: 3.0,
    voltageV: 24,
    mpptVocLimit: 145,
    mpptVmpMin: 30,
    mpptVmpMax: 115,
    maxPvCurrent: 60,
    maxPvPower: 2400,
    numMppts: 1,
    maxStringsPerMppt: 2,
    efficiency: 0.93,
    maxBatteryChargeCurrentA: 60,
    maxBatteryDischargeCurrentA: 150,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  {
    brand: 'Growatt',
    model: 'SPF 3000TL HVM 3kVA / 24V Off-Grid',
    sizeKva: 3.0,
    voltageV: 24,
    mpptVocLimit: 145,
    mpptVmpMin: 30,
    mpptVmpMax: 115,
    maxPvCurrent: 50,
    maxPvPower: 4000,
    numMppts: 1,
    maxStringsPerMppt: 2,
    efficiency: 0.93,
    maxBatteryChargeCurrentA: 60,
    maxBatteryDischargeCurrentA: 140,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  {
    brand: 'Deye',
    model: 'SUN-5K-SG01LP1 Hybrid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 430,
    maxPvCurrent: 14, // datasheet continuous; 550W Imp ~13.3A is compatible
    maxPvPower: 6500,
    numMppts: 2,
    maxStringsPerMppt: 1,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 120,
    maxBatteryDischargeCurrentA: 120,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Luxpower',
    model: 'LXP 5K Hybrid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 430,
    maxPvCurrent: 14,
    maxPvPower: 6500,
    numMppts: 2,
    maxStringsPerMppt: 1,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 100,
    maxBatteryDischargeCurrentA: 110,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Solis',
    model: 'S6-EH1P6K-L Hybrid 6kVA',
    sizeKva: 6.0,
    voltageV: 48,
    mpptVocLimit: 600,
    mpptVmpMin: 90,
    mpptVmpMax: 520,
    maxPvCurrent: 16,
    maxPvPower: 9600,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.975,
    maxBatteryChargeCurrentA: 135,
    maxBatteryDischargeCurrentA: 135,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'GoodWe',
    model: 'GW5048-EM Hybrid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 580,
    mpptVmpMin: 125,
    mpptVmpMax: 550,
    maxPvCurrent: 14,
    maxPvPower: 6500,
    numMppts: 2,
    maxStringsPerMppt: 1,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 100,
    maxBatteryDischargeCurrentA: 100,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Growatt',
    model: 'SPH8000 Hybrid 8kVA',
    sizeKva: 8.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 500,
    maxPvCurrent: 16,
    maxPvPower: 10400,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 160,
    maxBatteryDischargeCurrentA: 160,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Growatt',
    model: 'SPH10000 Hybrid 10kVA',
    sizeKva: 10.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 500,
    maxPvCurrent: 16,
    maxPvPower: 13000,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 190,
    maxBatteryDischargeCurrentA: 190,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Deye',
    model: 'SUN-8K-SG01LP1 Hybrid 8kVA',
    sizeKva: 8.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 150,
    mpptVmpMax: 425,
    maxPvCurrent: 26,
    maxPvPower: 10400,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 190,
    maxBatteryDischargeCurrentA: 190,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Luxpower',
    model: 'LXP 12K Hybrid 12kVA',
    sizeKva: 12.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 430,
    maxPvCurrent: 25,
    maxPvPower: 15600,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 240,
    maxBatteryDischargeCurrentA: 250,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Deye',
    model: 'SUN-12K-SG04LP3 12kVA 3-Phase',
    sizeKva: 12.0,
    voltageV: 48,
    mpptVocLimit: 800,
    // Datasheet MPPT operating window is 200–650 V (start-up 160 V).
    mpptVmpMin: 200,
    mpptVmpMax: 650,
    maxPvCurrent: 26,
    // Datasheet: PV input current 26 A + 13 A; strings per MPPT 2+1; max PV input ~18 kW.
    maxPvPower: 18000,
    numMppts: 2,
    maxStringsPerMppt: 2,
    mpptInputCurrentsA: [26, 13],
    mpptMaxStrings: [2, 1],
    efficiency: 0.975,
    maxBatteryChargeCurrentA: 240,
    maxBatteryDischargeCurrentA: 240,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 3
  },
  {
    brand: 'Felicity Solar',
    model: 'IVEM5048 Off-Grid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 18,
    maxPvPower: 6000,
    numMppts: 1,
    maxStringsPerMppt: 2,
    efficiency: 0.96,
    maxBatteryChargeCurrentA: 100,
    maxBatteryDischargeCurrentA: 110,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  {
    brand: 'SRNE',
    model: 'HF4850S80-H Off-Grid 5kVA',
    sizeKva: 5.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 18,
    maxPvPower: 5000,
    numMppts: 1,
    maxStringsPerMppt: 2,
    efficiency: 0.94,
    maxBatteryChargeCurrentA: 80,
    maxBatteryDischargeCurrentA: 100,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  {
    brand: 'Felicity Solar',
    model: 'LP-15KVA Commercial Off-Grid',
    sizeKva: 15.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 22,
    maxPvPower: 18000,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.96,
    maxBatteryChargeCurrentA: 200,
    maxBatteryDischargeCurrentA: 280,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
    {
    brand: 'Deye',
    model: 'SUN-20K-SG05LP3 20kVA 3-Phase',
    sizeKva: 20.0,
    voltageV: 48,
    mpptVocLimit: 800,
    mpptVmpMin: 200,
    mpptVmpMax: 650,
    maxPvCurrent: 36,
    maxPvPower: 26000,
    numMppts: 2,
    maxStringsPerMppt: 2,
    mpptInputCurrentsA: [36, 36],
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 350,
    maxBatteryDischargeCurrentA: 350,
    surgeFactor: 1.5,
    topology: 'hybrid',
    phases: 3
  },
  {
    brand: 'Luxpower',
    model: 'LXP 20K Hybrid 20kVA',
    sizeKva: 20.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 480,
    maxPvCurrent: 32,
    maxPvPower: 26000,
    numMppts: 2,
    maxStringsPerMppt: 2,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 350,
    maxBatteryDischargeCurrentA: 370,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Felicity Solar',
    model: 'LP-25KVA Commercial Off-Grid',
    sizeKva: 25.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 40,
    maxPvPower: 32000,
    numMppts: 2,
    maxStringsPerMppt: 3,
    efficiency: 0.96,
    maxBatteryChargeCurrentA: 400,
    maxBatteryDischargeCurrentA: 450,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
  // Higher PV input current for large arrays that exceed 40 A per Maximum Power Point Tracker (MPPT)
  {
    brand: 'Deye',
    model: 'SUN-30K-SG01HP3 30kVA Hybrid',
    sizeKva: 30.0,
    voltageV: 48,
    mpptVocLimit: 550,
    mpptVmpMin: 120,
    mpptVmpMax: 500,
    maxPvCurrent: 50,
    maxPvPower: 39000,
    numMppts: 2,
    maxStringsPerMppt: 3,
    efficiency: 0.97,
    maxBatteryChargeCurrentA: 450,
    maxBatteryDischargeCurrentA: 500,
    surgeFactor: 2.0,
    topology: 'hybrid',
    phases: 1
  },
  {
    brand: 'Felicity Solar',
    model: 'LP-30KVA Commercial Off-Grid High-PV',
    sizeKva: 30.0,
    voltageV: 48,
    mpptVocLimit: 500,
    mpptVmpMin: 120,
    mpptVmpMax: 450,
    maxPvCurrent: 50,
    maxPvPower: 40000,
    numMppts: 2,
    maxStringsPerMppt: 3,
    efficiency: 0.96,
    maxBatteryChargeCurrentA: 450,
    maxBatteryDischargeCurrentA: 500,
    surgeFactor: 2.0,
    topology: 'off_grid',
    phases: 1
  },
];

/**
 * Brand-agnostic inverter placeholder when the local catalog has no SKU
 * that meets the physics size at the selected voltage.
 * Specs are generous so string/protection math can still run for planning.
 */
export function createGenericInverter(
  sizeKva: number,
  systemVoltage: number,
  topology: 'hybrid' | 'off_grid' = 'hybrid'
): InverterSpecs {
  const kva = Math.max(0.5, sizeKva);
  const v = systemVoltage;
  const isLowV = v <= 24;
  return {
    brand: 'Engineering Size',
    model: `${kva} kVA / ${v}V (select any brand meeting this rating)`,
    sizeKva: kva,
    voltageV: v,
    mpptVocLimit: v <= 12 ? 105 : v <= 24 ? 150 : 550,
    mpptVmpMin: v <= 12 ? 15 : v <= 24 ? 30 : 90,
    mpptVmpMax: v <= 12 ? 80 : v <= 24 ? 120 : 480,
    maxPvCurrent: isLowV ? Math.max(40, Math.ceil(kva * 15)) : Math.max(18, Math.ceil(kva * 4)),
    maxPvPower: Math.ceil(kva * 1400),
    numMppts: kva >= 5 ? 2 : 1,
    maxStringsPerMppt: 2,
    efficiency: 0.93,
    maxBatteryChargeCurrentA: Math.ceil((kva * 1000) / Math.max(v, 1) / 0.93),
    maxBatteryDischargeCurrentA: Math.ceil((kva * 1000 * 1.25) / Math.max(v, 1) / 0.93),
    surgeFactor: 2.0,
    topology,
    phases: 1
  };
}

export function getInvertersForVoltage(
  systemVoltage: number,
  inverterType: 'hybrid' | 'off_grid' | 'grid_tie' | 'auto' = 'auto',
  market: CatalogMarketId = 'global'
): InverterSpecs[] {
  return getAllInverters(market)
    .filter(inv => {
      if (inv.voltageV !== systemVoltage) return false;
      if (inverterType === 'auto') {
        return inv.topology === 'hybrid' || inv.topology === 'off_grid';
      }
      // This tool sizes battery-backed systems. "Grid-tie" maps to hybrid (grid + battery),
      // not export-only string inverters without a battery bus.
      if (inverterType === 'grid_tie') {
        return inv.topology === 'hybrid';
      }
      // Exact topology — never silently mix off-grid with hybrids
      return inv.topology === inverterType;
    })
    .sort((a, b) => a.sizeKva - b.sizeKva);
}

export function getInverterFromDb(
  targetKva: number,
  systemVoltage: number,
  market: CatalogMarketId = 'global'
): InverterSpecs {
  const matchingVoltage = getInvertersForVoltage(systemVoltage, 'auto', market);
  const exact = matchingVoltage.find(inv => inv.sizeKva === targetKva);
  if (exact) return exact;

  const adequate = matchingVoltage.find(inv => inv.sizeKva >= targetKva);
  if (adequate) return adequate;

  if (matchingVoltage.length > 0) {
    return matchingVoltage[matchingVoltage.length - 1];
  }

  throw new Error(
    `No compatible inverter found in catalog for ${systemVoltage}V / ${targetKva} kVA. Select a different system voltage or inverter type.`
  );
}

export const BATTERIES: BatterySpecs[] = [
  {
    brand: 'Victron Energy',
    model: 'LiFePO4 12.8V 50Ah',
    chemistry: 'lithium',
    voltage: 12,
    capacityAh: 50,
    capacityKwh: 0.64,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Victron Energy',
    model: 'Peak Power 12.8V 100Ah Lithium',
    chemistry: 'lithium',
    voltage: 12,
    capacityAh: 100,
    capacityKwh: 1.28,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Victron Energy',
    model: 'LiFePO4 12.8V 200Ah',
    chemistry: 'lithium',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.56,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Felicity Solar',
    model: 'Deep Cycle Tall Tubular 12V 100Ah',
    chemistry: 'tubular',
    voltage: 12,
    capacityAh: 100,
    capacityKwh: 1.20,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Felicity Solar',
    model: 'Deep Cycle Tall Tubular 12V 200Ah',
    chemistry: 'tubular',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Felicity Solar',
    model: 'Premium Gel Deep Cycle 12V 100Ah',
    chemistry: 'gel',
    voltage: 12,
    capacityAh: 100,
    capacityKwh: 1.20,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Felicity Solar',
    model: 'Premium Gel Deep Cycle 12V 200Ah',
    chemistry: 'gel',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Victron Energy',
    model: 'Super Cycle AGM 12V 100Ah',
    chemistry: 'agm',
    voltage: 12,
    capacityAh: 100,
    capacityKwh: 1.20,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Victron Energy',
    model: 'Super Cycle Heavy-Duty AGM 12V 200Ah',
    chemistry: 'agm',
    voltage: 12,
    capacityAh: 200,
    capacityKwh: 2.40,
    dod: 0.50,
    efficiency: 0.85,
    maxContinuousDischargeC: 0.2,
    maxContinuousChargeC: 0.1
  },
  {
    brand: 'Pylontech',
    model: 'US2000C LiFePO4 48V 50Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 50,
    capacityKwh: 2.40,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 0.5,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Pylontech',
    model: 'US3000C LiFePO4 48V 74Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 74,
    capacityKwh: 3.55,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 0.5,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Felicity Solar',
    model: 'LPBA48100 LiFePO4 48V 100Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 100,
    capacityKwh: 4.80,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Felicity Solar',
    model: 'LPBA48200 LiFePO4 48V 200Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 200,
    capacityKwh: 9.60,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  },
  {
    brand: 'Felicity Solar',
    model: 'LPBA48280 LiFePO4 48V 280Ah',
    chemistry: 'lithium',
    voltage: 48,
    capacityAh: 280,
    capacityKwh: 13.44,
    dod: 0.90,
    efficiency: 0.95,
    maxContinuousDischargeC: 1.0,
    maxContinuousChargeC: 0.5
  }
];

/** All commercial batteries that can build the requested bus voltage for a chemistry. */
export function getBatteriesForSystem(
  chemistry: 'lithium' | 'tubular' | 'agm' | 'gel',
  systemVoltage: number
): BatterySpecs[] {
  const exact = BATTERIES.filter(b => b.chemistry === chemistry && b.voltage === systemVoltage);
  if (exact.length > 0) return exact.sort((a, b) => a.capacityAh - b.capacityAh);

  // Lead-acid / small lithium: build 24V/48V from 12V modules in series
  const modules = BATTERIES.filter(
    b => b.chemistry === chemistry && systemVoltage % b.voltage === 0 && b.voltage <= systemVoltage
  );
  return modules.sort((a, b) => a.capacityAh - b.capacityAh);
}

export function getBatteryFromDb(
  chemistry: 'lithium' | 'tubular' | 'agm' | 'gel',
  systemVoltage: number
): BatterySpecs {
  const pool = getBatteriesForSystem(chemistry, systemVoltage);
  if (pool.length === 0) {
    throw new Error(`No commercial ${chemistry} battery available for ${systemVoltage}V systems.`);
  }
  // Prefer mid-market 100Ah-class module when available
  return pool.find(b => b.capacityAh === 100) || pool[Math.floor(pool.length / 2)] || pool[0];
}

export const COMMERCIAL_BATTERY_CAPACITIES_AH = [50, 74, 100, 150, 200, 280, 300, 400];
