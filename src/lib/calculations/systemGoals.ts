import { OperatingMode } from '../../types';

/** Who the wizard / report is written for. */
export type DesignAudience = 'simple' | 'engineering';

/**
 * High-level home goal — maps to backup hours + operating mode
 * so novices don't have to think in kVA / DoD first.
 */
export type SystemGoal = 'overnight_essentials' | 'half_day_backup' | 'full_home';

export interface SystemGoalSpec {
  id: SystemGoal;
  title: string;
  plainSummary: string;
  backupHours: number;
  operatingMode: OperatingMode;
  whoItsFor: string;
}

export const SYSTEM_GOALS: SystemGoalSpec[] = [
  {
    id: 'overnight_essentials',
    title: 'Overnight essentials',
    plainSummary:
      'Keep lights, fans, freezer, and a few essentials running overnight. Solar / grid handle heavy daytime loads (cooker, heater, iron).',
    backupHours: 8,
    operatingMode: 'hybrid_essentials',
    whoItsFor: 'Most 2–3 bedroom homes with grid available'
  },
  {
    id: 'half_day_backup',
    title: 'Half-day backup',
    plainSummary:
      'Longer outage cover for Critical + Essential loads (about half a day). Still hybrid — not every kitchen heat load on battery.',
    backupHours: 12,
    operatingMode: 'hybrid_essentials',
    whoItsFor: 'Homes with frequent or longer blackouts'
  },
  {
    id: 'full_home',
    title: 'Full home backup',
    plainSummary:
      'Battery sized for average whole-house energy over the backup window. Closer to off-grid — larger and more expensive.',
    backupHours: 12,
    operatingMode: 'full_backup',
    whoItsFor: 'When almost everything must stay on during outages'
  }
];

export function getSystemGoal(id: SystemGoal | string | undefined | null): SystemGoalSpec {
  return SYSTEM_GOALS.find(g => g.id === id) || SYSTEM_GOALS[0];
}

export function resolveSystemGoal(value: unknown): SystemGoal {
  if (value === 'half_day_backup' || value === 'full_home' || value === 'overnight_essentials') {
    return value;
  }
  return 'overnight_essentials';
}

export function resolveDesignAudience(value: unknown): DesignAudience {
  return value === 'engineering' ? 'engineering' : 'simple';
}

export const DESIGN_AUDIENCE_OPTIONS: {
  id: DesignAudience;
  title: string;
  desc: string;
}[] = [
  {
    id: 'simple',
    title: 'Simple home quote',
    desc: 'Plain language, cost range, and recommended sizes. Best for homeowners and sales.'
  },
  {
    id: 'engineering',
    title: 'Full engineering design',
    desc: 'Detailed Voc / MPPT / protection / cable schedules for installers and engineers.'
  }
];
