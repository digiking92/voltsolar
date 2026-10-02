import { InverterType } from '../../types';
import { InverterSpecs, getInvertersForVoltage } from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';
import type { CatalogMarketId } from './catalogMarkets';

export interface InverterValidationResult {
  valid: boolean;
  failures: string[];
  continuousLoadOk: boolean;
  peakLoadOk: boolean;
  batteryVoltageOk: boolean;
  batteryCurrentOk: boolean;
}

export interface RankedInverter {
  inverter: InverterSpecs;
  minimumSizeKva: number;
  preferredSizeKva: number;
  validation: InverterValidationResult;
  score: number;
  reason: string;
}

export function calculateInverterSizingTargets(
  connectedLoadW: number,
  peakLoadW: number
): { minimumSizeKva: number; preferredSizeKva: number } {
  const minimumSizeKva = (connectedLoadW * SYSTEM_STANDARDS.inverterSafetyFactor) / 1000;
  const surgeKva = peakLoadW / 1000;
  const preferredSizeKva = Math.max(minimumSizeKva, surgeKva / 2.0);
  return {
    minimumSizeKva: parseFloat(minimumSizeKva.toFixed(2)),
    preferredSizeKva: parseFloat(preferredSizeKva.toFixed(2))
  };
}

/**
 * Hard validation: an inverter that fails ANY check is rejected.
 */
export function validateInverterAgainstLoads(
  inverter: InverterSpecs,
  systemVoltage: number,
  connectedLoadW: number,
  peakLoadW: number,
  batteryInverterDrawA: number
): InverterValidationResult {
  const failures: string[] = [];

  const continuousLoadOk = inverter.sizeKva * 1000 >= connectedLoadW;
  if (!continuousLoadOk) {
    failures.push(
      `Continuous load ${(connectedLoadW / 1000).toFixed(2)} kW exceeds inverter rating ${inverter.sizeKva} kVA.`
    );
  }

  const surgeCapacityW = inverter.sizeKva * 1000 * inverter.surgeFactor;
  const peakLoadOk = surgeCapacityW >= peakLoadW;
  if (!peakLoadOk) {
    failures.push(
      `Peak/surge load ${(peakLoadW / 1000).toFixed(2)} kW exceeds inverter surge capacity ${(surgeCapacityW / 1000).toFixed(2)} kW.`
    );
  }

  const batteryVoltageOk = inverter.voltageV === systemVoltage;
  if (!batteryVoltageOk) {
    failures.push(
      `Inverter DC voltage ${inverter.voltageV}V does not match system voltage ${systemVoltage}V.`
    );
  }

  const batteryCurrentOk = batteryInverterDrawA <= inverter.maxBatteryDischargeCurrentA;
  if (!batteryCurrentOk) {
    failures.push(
      `Required battery discharge ${batteryInverterDrawA.toFixed(1)}A exceeds inverter battery current limit ${inverter.maxBatteryDischargeCurrentA}A.`
    );
  }

  // Preferred continuous margin (soft preference encoded as hard reject only if below continuous)
  const withSafety = connectedLoadW * SYSTEM_STANDARDS.inverterSafetyFactor;
  if (inverter.sizeKva * 1000 < withSafety && continuousLoadOk) {
    // Narrow margin — still valid electrically, but scored lower later
  }

  return {
    valid: failures.length === 0,
    failures,
    continuousLoadOk,
    peakLoadOk,
    batteryVoltageOk,
    batteryCurrentOk
  };
}

/**
 * Rank catalog inverters that PASS validation. Never returns a failing inverter.
 */
export function searchCompatibleInverters(
  systemVoltage: number,
  connectedLoadW: number,
  peakLoadW: number,
  inverterType: InverterType,
  catalogMarket: CatalogMarketId = 'global'
): RankedInverter[] {
  const { minimumSizeKva, preferredSizeKva } = calculateInverterSizingTargets(
    connectedLoadW,
    peakLoadW
  );

  let pool = getInvertersForVoltage(systemVoltage, inverterType, catalogMarket);
  // If a strict topology has no SKUs at this voltage, fall back to workable battery-backed units
  if (pool.length === 0 && inverterType !== 'auto') {
    pool = getInvertersForVoltage(systemVoltage, 'auto', catalogMarket);
  }

  const ranked: RankedInverter[] = [];

  for (const inverter of pool) {
    // Size battery DC demand from actual continuous load (+ margin), not full nameplate —
    // otherwise 24V 3kVA units are falsely rejected (e.g. 134A > 125A limit).
    const drawA =
      (connectedLoadW * SYSTEM_STANDARDS.inverterSafetyFactor) /
      (systemVoltage * inverter.efficiency);
    const validation = validateInverterAgainstLoads(
      inverter,
      systemVoltage,
      connectedLoadW,
      peakLoadW,
      drawA
    );
    if (!validation.valid) continue;

    let score = 100;
    const needKva = Math.max(preferredSizeKva, 0.1);
    const ratio = inverter.sizeKva / needKva;

    // Physics-first: reward closest adequate size; heavily punish oversizing.
    // (Previously the penalty floored at 0, so 5 kVA and 20 kVA tied — then MPPT bonuses picked 20 kVA.)
    if (ratio >= 1.0 && ratio <= 1.35) score += 120 - (ratio - 1) * 40;
    else if (ratio > 1.35) score -= (ratio - 1.35) * 90;
    else score += ratio * 40;

    // Direct kVA gap penalty so catalog matching never jumps to huge SKUs
    const oversizeKva = inverter.sizeKva - needKva;
    if (oversizeKva > 0) score -= oversizeKva * 18;

    // Prefer continuous rating that covers peak demand (not only surge capacity)
    const peakKw = peakLoadW / 1000;
    if (inverter.sizeKva >= peakKw) score += 20;
    else if (inverter.sizeKva * inverter.surgeFactor >= peakKw) score += 8;

    // Prefer exact topology match; do not blanket-boost every hybrid
    if (inverterType === 'off_grid' && inverter.topology === 'off_grid') score += 50;
    else if (inverterType === 'hybrid' && inverter.topology === 'hybrid') score += 40;
    else if (inverterType === 'grid_tie' && inverter.topology === 'hybrid') score += 35;
    else if (inverterType === 'auto' && inverter.topology === 'hybrid') score += 8;
    else if (inverterType !== 'auto' && inverter.topology !== inverterType && inverterType !== 'grid_tie')
      score -= 25; // fallback SKUs from empty-pool recovery

    // Small MPPT convenience bonuses — must NEVER outweigh kVA fitness
    score += Math.min(12, inverter.numMppts * 4);
    score += Math.min(4, inverter.maxPvCurrent * 0.08);
    if (peakKw >= 8 && inverter.phases === 3) score += 15;

    const continuousKw = connectedLoadW / 1000;
    const surgeKw = inverter.sizeKva * inverter.surgeFactor;
    const expansionPct = Math.max(
      0,
      Math.round((1 - connectedLoadW / Math.max(inverter.sizeKva * 1000, 1)) * 100)
    );
    const reason =
      `${inverter.brand} ${inverter.model} (${inverter.sizeKva} kilovolt-ampere / kVA) selected. ` +
      `Engineering need ~${needKva.toFixed(2)} kVA (1.25× continuous / surge). ` +
      `Total Connected Load: ${continuousKw.toFixed(2)} kW within ${inverter.sizeKva} kVA rating. ` +
      `Peak Demand: ${peakKw.toFixed(2)} kW. ` +
      `Surge Requirement: ${peakKw.toFixed(2)} kW <= ${surgeKw.toFixed(1)} kW inverter surge capacity. ` +
      `Battery Voltage Compatibility: ${systemVoltage}V bus supported. ` +
      `Future Expansion Margin: ~${expansionPct}%. ` +
      `Engineering status: PASS.`;

    ranked.push({
      inverter,
      minimumSizeKva,
      preferredSizeKva,
      validation,
      score,
      reason
    });
  }

  // Primary sort: smallest adequate kVA; secondary: score (topology / mild MPPT fit)
  return ranked.sort((a, b) => {
    if (a.inverter.sizeKva !== b.inverter.sizeKva) {
      return a.inverter.sizeKva - b.inverter.sizeKva;
    }
    return b.score - a.score;
  });
}
