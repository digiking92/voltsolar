/**
 * Brand-agnostic (physics-first) sizing targets.
 * These are the global source of truth — catalog matching comes after.
 */

import { SYSTEM_STANDARDS } from './engineeringStandards';
import { calculateInverterSizingTargets } from './inverterCalculator';

/** Common commercial inverter steps (kVA) used worldwide. */
export const COMMERCIAL_INVERTER_KVA_STEPS = [
  1, 1.2, 1.5, 2, 2.5, 3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100
];

export function roundUpToCommercialInverterKva(kva: number): number {
  const need = Math.max(0, kva);
  const hit = COMMERCIAL_INVERTER_KVA_STEPS.find(s => s + 1e-9 >= need);
  return hit ?? Math.ceil(need);
}

/**
 * Suggested DC bus from continuous load class (industry practice, not brand-specific).
 * 12V: small systems; 24V: typical 1–3 kW homes; 48V: larger / lower current.
 */
export function suggestSystemVoltageV(connectedLoadW: number, peakLoadW: number): 12 | 24 | 48 {
  const designW = Math.max(connectedLoadW * SYSTEM_STANDARDS.inverterSafetyFactor, peakLoadW * 0.5);
  if (designW < 1000) return 12;
  if (designW <= 3500) return 24;
  return 48;
}

export interface PhysicsSizingTargets {
  connectedLoadW: number;
  peakLoadW: number;
  minimumInverterKva: number;
  preferredInverterKva: number;
  /** Rounded commercial inverter size that covers continuous + surge with 2× surge factor assumption. */
  requiredInverterKva: number;
  suggestedSystemVoltageV: 12 | 24 | 48;
  /** Raw battery energy for backup window (kWh) before DoD/efficiency — from daily Wh. */
  batteryRequiredKwhRaw: number;
  /** Approximate installed battery kWh using lithium defaults (global planning figure). */
  batteryTargetInstalledKwh: number;
  /** Approximate PV array kWp from harvest target / (PSH × collection efficiency). */
  requiredArrayKwp: number;
  voltageGuidance: string;
}

export function computePhysicsSizingTargets(input: {
  connectedLoadW: number;
  peakLoadW: number;
  dailyEnergyWh: number;
  batterySizingDailyEnergyWh: number;
  backupHours: number;
  pvHarvestTargetWh: number;
  peakSunHours: number;
  forcedSystemVoltage?: number | null;
}): PhysicsSizingTargets {
  const { minimumSizeKva, preferredSizeKva } = calculateInverterSizingTargets(
    input.connectedLoadW,
    input.peakLoadW
  );

  // Size so continuous covers 1.25× load AND surge (2×) covers peak — then round to commercial.
  const forContinuous = minimumSizeKva;
  const forSurge = input.peakLoadW / 1000 / 2.0;
  const requiredInverterKva = roundUpToCommercialInverterKva(
    Math.max(forContinuous, forSurge, preferredSizeKva)
  );

  const suggestedSystemVoltageV = suggestSystemVoltageV(
    input.connectedLoadW,
    input.peakLoadW
  );

  const batteryRequiredKwhRaw =
    (input.batterySizingDailyEnergyWh * (input.backupHours / 24)) / 1000;
  // Lithium-class planning defaults (η_inv 0.93, η_batt 0.95, DoD 0.9, reserve)
  const batteryTargetInstalledKwh =
    (batteryRequiredKwhRaw / 0.93 / 0.95 / 0.9) * SYSTEM_STANDARDS.batteryEngineeringReserve;

  const collectionEff = 0.88; // typical planning derate before brand inverter known
  const requiredArrayKwp =
    input.peakSunHours > 0
      ? input.pvHarvestTargetWh / 1000 / (input.peakSunHours * collectionEff)
      : 0;

  const forced = input.forcedSystemVoltage;
  let voltageGuidance = `Suggested DC bus: ${suggestedSystemVoltageV} V for this load class.`;
  if (forced === 12 && suggestedSystemVoltageV !== 12) {
    voltageGuidance =
      `12 V is below the recommended ${suggestedSystemVoltageV} V bus for this load ` +
      `(~${(input.connectedLoadW / 1000).toFixed(2)} kW connected). Expect high battery current; prefer ${suggestedSystemVoltageV} V.`;
  } else if (forced && forced !== suggestedSystemVoltageV) {
    voltageGuidance =
      `You selected ${forced} V; typical recommendation for this load is ${suggestedSystemVoltageV} V. ` +
      `Engineering sizes below still follow your loads first.`;
  }

  return {
    connectedLoadW: input.connectedLoadW,
    peakLoadW: input.peakLoadW,
    minimumInverterKva: minimumSizeKva,
    preferredInverterKva: preferredSizeKva,
    requiredInverterKva,
    suggestedSystemVoltageV,
    batteryRequiredKwhRaw: parseFloat(batteryRequiredKwhRaw.toFixed(2)),
    batteryTargetInstalledKwh: parseFloat(batteryTargetInstalledKwh.toFixed(2)),
    requiredArrayKwp: parseFloat(Math.max(0, requiredArrayKwp).toFixed(2)),
    voltageGuidance
  };
}
