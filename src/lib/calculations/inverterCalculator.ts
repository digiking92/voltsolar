import { InverterType } from '../../types';
import { InverterSpecs, getInvertersForVoltage } from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';

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
  inverterType: InverterType
): RankedInverter[] {
  const { minimumSizeKva, preferredSizeKva } = calculateInverterSizingTargets(
    connectedLoadW,
    peakLoadW
  );

  let pool = getInvertersForVoltage(systemVoltage, inverterType);
  // If a strict topology has no SKUs at this voltage, fall back to workable battery-backed units
  if (pool.length === 0 && inverterType !== 'auto') {
    pool = getInvertersForVoltage(systemVoltage, 'auto');
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
    // Prefer meeting 1.25× continuous with least oversizing
    const ratio = inverter.sizeKva / Math.max(preferredSizeKva, 0.1);
    if (ratio >= 1.0 && ratio <= 1.4) score += 80;
    else if (ratio > 1.4) score += Math.max(0, 50 - (ratio - 1.4) * 40);
    else score += ratio * 40;

    // Prefer exact topology match; do not blanket-boost every hybrid
    if (inverterType === 'off_grid' && inverter.topology === 'off_grid') score += 50;
    else if (inverterType === 'hybrid' && inverter.topology === 'hybrid') score += 40;
    else if (inverterType === 'grid_tie' && inverter.topology === 'hybrid') score += 35;
    else if (inverterType === 'auto' && inverter.topology === 'hybrid') score += 8;
    else if (inverterType !== 'auto' && inverter.topology !== inverterType && inverterType !== 'grid_tie')
      score -= 25; // fallback SKUs from empty-pool recovery

    score += Math.min(30, inverter.numMppts * 10);
    // Mild preference for adequate MPPT current — do not dominate brand choice
    score += Math.min(8, inverter.maxPvCurrent * 0.25);

    const reason =
      `${inverter.brand} ${inverter.model} (${inverter.sizeKva} kVA) selected. ` +
      `Continuous load ${(connectedLoadW / 1000).toFixed(2)} kW ≤ ${inverter.sizeKva} kVA. ` +
      `Peak load ${(peakLoadW / 1000).toFixed(2)} kW ≤ surge ${(inverter.sizeKva * inverter.surgeFactor).toFixed(1)} kW. ` +
      `Battery bus ${systemVoltage}V compatible. ` +
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

  return ranked.sort((a, b) => b.score - a.score);
}
