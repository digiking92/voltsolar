import { ProjectAppliance, OperatingMode, LoadPriority } from '../../types';
import { applianceDailyEnergyWh, calculateLoadSchedule } from './loadCalculator';

export type { OperatingMode, LoadPriority };

export const OPERATING_MODE_LABELS: Record<OperatingMode, string> = {
  full_backup:
    'Full Home Backup — battery sized for average daily energy over the backup hours (closest to off-grid)',
  hybrid_essentials:
    'Hybrid Night Essentials — solar / grid run most daytime loads; battery covers Critical + Essential loads at night / during outages'
};

export const LOAD_PRIORITY_LABELS: Record<LoadPriority, string> = {
  critical: 'Critical — must stay powered from battery',
  essential: 'Essential — battery-backed, can shed if battery is low',
  managed: 'Managed — prefer solar / grid (e.g. air conditioner, pump)',
  heavy: 'Heavy / Optional — solar / grid preferred (cooker, kettle, heater, iron)'
};

export const LOAD_PRIORITY_OPTIONS: { id: LoadPriority; short: string; hint: string }[] = [
  { id: 'critical', short: 'Critical', hint: 'Freezer, lights, fans, security' },
  { id: 'essential', short: 'Essential', hint: 'TV, decoder, Wi‑Fi, laptop' },
  { id: 'managed', short: 'Managed', hint: 'Air conditioner, water pump, washer' },
  { id: 'heavy', short: 'Heavy', hint: 'Cooker, kettle, heater, iron, microwave' }
];

/** Sensible default priority from appliance name — novices rarely need to change this. */
export function defaultLoadPriority(applianceName: string): LoadPriority {
  const n = (applianceName || '').toLowerCase();

  if (
    /cooker|kettle|heater|iron|microwave|induction|toaster|oven|hair\s*dryer|blender|vacuum/.test(n)
  ) {
    return 'heavy';
  }
  if (
    /air\s*conditioner|\bac\b|washing|washer|pump|borehole|compressor|surface\s*pump/.test(n)
  ) {
    return 'managed';
  }
  if (
    /television|\btv\b|decoder|router|wifi|wi-?fi|laptop|computer|monitor|printer|sound|cctv|dvr/.test(
      n
    )
  ) {
    return 'essential';
  }
  // Freezers, fridges, lights, fans, unknown → critical (safer default for backup)
  return 'critical';
}

export function resolveLoadPriority(app: {
  applianceName?: string;
  loadPriority?: LoadPriority | null;
}): LoadPriority {
  if (app.loadPriority === 'critical' || app.loadPriority === 'essential' || app.loadPriority === 'managed' || app.loadPriority === 'heavy') {
    return app.loadPriority;
  }
  return defaultLoadPriority(app.applianceName || '');
}

export function withResolvedPriorities<T extends ProjectAppliance>(appliances: T[]): T[] {
  return appliances.map(app => ({
    ...app,
    loadPriority: resolveLoadPriority(app)
  }));
}

export interface HybridEnergyPlan {
  operatingMode: OperatingMode;
  operatingModeLabel: string;
  /** Full house daily energy (Wh) — always all appliances */
  totalDailyEnergyWh: number;
  /** Daily Wh for Critical + Essential only */
  batteryBackedDailyEnergyWh: number;
  /** Daily Wh for Managed + Heavy (prefer solar/grid in hybrid mode) */
  solarGridPreferredDailyEnergyWh: number;
  /**
   * Energy (Wh/day) used as the battery calculator's "daily energy" input.
   * full_backup → total; hybrid_essentials → Critical + Essential only.
   */
  batterySizingDailyEnergyWh: number;
  /**
   * Energy (Wh/day) the PV array must harvest before Peak Sun Hours / derating.
   * full_backup → total daily; hybrid → daytime remainder + battery recharge path.
   */
  pvHarvestTargetWh: number;
  /** Approximate night / outage energy the battery must supply (Wh) before losses */
  nightOrBackupEnergyWh: number;
  /** Approximate daytime energy served by solar / grid (Wh) */
  daytimeEnergyWh: number;
  /** Watts used for inverter continuous / peak sizing */
  inverterConnectedLoadW: number;
  inverterPeakLoadW: number;
  /** Short novice-facing explanation of this plan */
  strategySummary: string;
  priorityBreakdown: {
    criticalWh: number;
    essentialWh: number;
    managedWh: number;
    heavyWh: number;
  };
}

function sumDailyWh(
  apps: Array<{ customWattage?: number | null; quantity?: number | null; hoursUsed?: number | null }>
): number {
  return apps.reduce((s, a) => s + applianceDailyEnergyWh(a), 0);
}

/**
 * Build the energy strategy for battery + PV + inverter sizing.
 * Default mode is full_backup — identical to the historical VoltSolar formulas.
 */
export function buildHybridEnergyPlan(
  appliances: ProjectAppliance[],
  backupHours: number,
  operatingMode: OperatingMode = 'full_backup',
  batteryRoundTripEff = 0.95,
  inverterEff = 0.96
): HybridEnergyPlan {
  const resolved = withResolvedPriorities(appliances);
  const by = (p: LoadPriority) => resolved.filter(a => resolveLoadPriority(a) === p);

  const critical = by('critical');
  const essential = by('essential');
  const managed = by('managed');
  const heavy = by('heavy');

  const criticalWh = sumDailyWh(critical);
  const essentialWh = sumDailyWh(essential);
  const managedWh = sumDailyWh(managed);
  const heavyWh = sumDailyWh(heavy);

  const totalDailyEnergyWh = criticalWh + essentialWh + managedWh + heavyWh;
  const batteryBackedDailyEnergyWh = criticalWh + essentialWh;
  const solarGridPreferredDailyEnergyWh = managedWh + heavyWh;

  const hours = Math.max(0.5, Math.min(72, backupHours || 8));
  const backupFraction = hours / 24;

  const fullLoad = calculateLoadSchedule(resolved);
  const inverterApps =
    operatingMode === 'hybrid_essentials'
      ? [...critical, ...essential, ...managed]
      : resolved;
  const inverterLoad =
    inverterApps.length > 0 ? calculateLoadSchedule(inverterApps) : fullLoad;

  if (operatingMode === 'hybrid_essentials') {
    // Battery covers Critical + Essential over the backup window (night / outage).
    const batterySizingDailyEnergyWh = Math.max(batteryBackedDailyEnergyWh, 0);
    const nightOrBackupEnergyWh = batterySizingDailyEnergyWh * backupFraction;
    // Rest of the house energy is assumed daytime / grid+solar served.
    const daytimeEnergyWh = Math.max(0, totalDailyEnergyWh - nightOrBackupEnergyWh);
    // PV must serve daytime use + recharge the night energy (with storage path losses).
    const rechargeWh =
      nightOrBackupEnergyWh /
      Math.max(0.5, batteryRoundTripEff * inverterEff);
    const pvHarvestTargetWh = daytimeEnergyWh + rechargeWh;

    const strategySummary =
      `Hybrid Night Essentials: solar and/or grid power most daytime loads (including Managed and Heavy). ` +
      `The battery is sized from Critical + Essential loads only over your ${hours}-hour backup window ` +
      `(~${(nightOrBackupEnergyWh / 1000).toFixed(2)} kWh before losses). ` +
      `Photovoltaic (PV) harvest target includes daytime energy plus recharging that night/outage use.`;

    return {
      operatingMode,
      operatingModeLabel: OPERATING_MODE_LABELS[operatingMode],
      totalDailyEnergyWh,
      batteryBackedDailyEnergyWh,
      solarGridPreferredDailyEnergyWh,
      batterySizingDailyEnergyWh,
      pvHarvestTargetWh,
      nightOrBackupEnergyWh,
      daytimeEnergyWh,
      inverterConnectedLoadW: inverterLoad.connectedLoad,
      inverterPeakLoadW: inverterLoad.peakLoad,
      strategySummary,
      priorityBreakdown: { criticalWh, essentialWh, managedWh, heavyWh }
    };
  }

  // full_backup — preserve legacy VoltSolar sizing exactly
  const nightOrBackupEnergyWh = totalDailyEnergyWh * backupFraction;
  const strategySummary =
    `Full Home Backup: battery is sized from total average daily energy × (${hours}/24). ` +
    `Photovoltaic (PV) is sized to cover the full daily energy after system losses. ` +
    `Use this when the battery must support most of the house during an outage.`;

  return {
    operatingMode: 'full_backup',
    operatingModeLabel: OPERATING_MODE_LABELS.full_backup,
    totalDailyEnergyWh,
    batteryBackedDailyEnergyWh,
    solarGridPreferredDailyEnergyWh,
    batterySizingDailyEnergyWh: totalDailyEnergyWh,
    pvHarvestTargetWh: totalDailyEnergyWh,
    nightOrBackupEnergyWh,
    daytimeEnergyWh: Math.max(0, totalDailyEnergyWh - nightOrBackupEnergyWh),
    inverterConnectedLoadW: fullLoad.connectedLoad,
    inverterPeakLoadW: fullLoad.peakLoad,
    strategySummary,
    priorityBreakdown: { criticalWh, essentialWh, managedWh, heavyWh }
  };
}

/** Normalize unknown / legacy values to a safe mode (never throws). */
export function resolveOperatingMode(value: unknown): OperatingMode {
  return value === 'hybrid_essentials' ? 'hybrid_essentials' : 'full_backup';
}
