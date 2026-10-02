import { Calculations } from '../../types';

/**
 * Rough equipment + install cost bands for early customer quotes.
 * These are indicative market ranges (not a formal tender) — always label as estimate.
 */

/** Naira per US dollar used for dual-currency display (update periodically). */
export const NGN_PER_USD = 1550;

export interface CostBand {
  currency: 'NGN' | 'USD';
  low: number;
  high: number;
  formatted: string;
  breakdownNote: string;
}

export interface SystemCostEstimate {
  ngn: CostBand;
  usd: CostBand;
  disclaimer: string;
  components: {
    label: string;
    ngnLow: number;
    ngnHigh: number;
  }[];
}

function roundNice(n: number): number {
  if (n < 100_000) return Math.round(n / 1000) * 1000;
  if (n < 1_000_000) return Math.round(n / 10_000) * 10_000;
  if (n < 10_000_000) return Math.round(n / 50_000) * 50_000;
  return Math.round(n / 100_000) * 100_000;
}

function formatNg(n: number): string {
  return `₦${roundNice(n).toLocaleString('en-NG')}`;
}

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * Estimate installed system cost from recommended sizes.
 * Unit costs are approximate West Africa retail ranges for 2025–2026 planning.
 */
export function estimateSystemCostBand(calcs: Calculations): SystemCostEstimate {
  const pvKwp = Math.max(0, calcs.solarArrayKw || 0);
  const battKwh = Math.max(0, calcs.batteryInstalledKwh || calcs.batteryCapacityKwh || 0);
  const invKva = Math.max(0, calcs.inverterSizeKva || 0);

  // USD equipment ranges (ex-VAT retail-ish)
  const pvUsdLow = pvKwp * 280;
  const pvUsdHigh = pvKwp * 420;
  const battUsdLow = battKwh * 180;
  const battUsdHigh = battKwh * 320;
  const invUsdLow = invKva * 120;
  const invUsdHigh = invKva * 220;

  const equipUsdLow = pvUsdLow + battUsdLow + invUsdLow;
  const equipUsdHigh = pvUsdHigh + battUsdHigh + invUsdHigh;

  // Cables, protection, structure, labour / commissioning
  const installLowFactor = 1.2;
  const installHighFactor = 1.35;

  const usdLow = equipUsdLow * installLowFactor;
  const usdHigh = equipUsdHigh * installHighFactor;
  const ngnLow = usdLow * NGN_PER_USD;
  const ngnHigh = usdHigh * NGN_PER_USD;

  const components = [
    {
      label: 'Solar panels (array)',
      ngnLow: pvUsdLow * NGN_PER_USD,
      ngnHigh: pvUsdHigh * NGN_PER_USD
    },
    {
      label: 'Battery bank',
      ngnLow: battUsdLow * NGN_PER_USD,
      ngnHigh: battUsdHigh * NGN_PER_USD
    },
    {
      label: 'Inverter / all-in-one',
      ngnLow: invUsdLow * NGN_PER_USD,
      ngnHigh: invUsdHigh * NGN_PER_USD
    },
    {
      label: 'Cables, protection, mounting & install (approx.)',
      ngnLow: equipUsdLow * 0.2 * NGN_PER_USD,
      ngnHigh: equipUsdHigh * 0.35 * NGN_PER_USD
    }
  ];

  return {
    ngn: {
      currency: 'NGN',
      low: roundNice(ngnLow),
      high: roundNice(ngnHigh),
      formatted: `${formatNg(ngnLow)} – ${formatNg(ngnHigh)}`,
      breakdownNote: 'Indicative Nigeria retail + install band'
    },
    usd: {
      currency: 'USD',
      low: Math.round(usdLow),
      high: Math.round(usdHigh),
      formatted: `${formatUsd(usdLow)} – ${formatUsd(usdHigh)}`,
      breakdownNote: 'Indicative USD equivalent'
    },
    disclaimer:
      'Rough planning range only — not a formal quotation. Final price depends on brand, supplier, transport, and site work. Always confirm with a local installer.',
    components
  };
}

export function plainLanguageSystemSummary(calcs: Calculations): {
  headline: string;
  bullets: string[];
} {
  const pv = calcs.solarArrayKw || 0;
  const batt = calcs.batteryInstalledKwh || calcs.batteryCapacityKwh || 0;
  const inv = calcs.inverterSizeKva || 0;
  const mode =
    calcs.operatingMode === 'hybrid_essentials'
      ? 'Hybrid: solar/grid by day, battery for essentials at night / outages'
      : 'Full home backup style sizing';

  return {
    headline: `About ${inv.toFixed(1)} kVA inverter · ${batt.toFixed(1)} kWh battery · ${pv.toFixed(1)} kWp solar`,
    bullets: [
      mode,
      `Typical daily house use in this design: ${((calcs.dailyEnergy || 0) / 1000).toFixed(1)} kWh/day`,
      calcs.operatingMode === 'hybrid_essentials'
        ? 'Cookers, heaters, and similar heavy loads are assumed on solar/grid when available — not fully carried by the battery.'
        : 'Battery is sized from whole-house average energy for the backup window you chose.',
      `Estimated solar harvest: ~${calcs.estimatedDailyProductionKwh || 0} kWh/day (weather-dependent)`
    ]
  };
}
