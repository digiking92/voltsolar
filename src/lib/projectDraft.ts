import { Calculations, Project } from '../types';

export type ProjectStatus = 'draft' | 'complete';

export type WizardMeta = {
  status: ProjectStatus;
  step: number;
};

type CalculationsWithMeta = Calculations & {
  _wizardMeta?: WizardMeta;
};

const EMPTY_DRAFT_CALCS = (): Calculations => ({
  connectedLoad: 0,
  peakLoad: 0,
  dailyEnergy: 0,
  monthlyEnergy: 0,
  batteryCapacityKwh: 0,
  batteryCapacityAh: 0,
  batteryQuantity: 0,
  batteryConfiguration: '',
  inverterSizeKva: 0,
  inverterReason: '',
  solarArrayKw: 0,
  panelQuantity: 0,
  panelConfiguration: '',
  estimatedDailyProductionKwh: 0
});

export function getWizardMeta(project: Project | null | undefined): WizardMeta {
  const raw = project?.calculations as CalculationsWithMeta | undefined;
  const meta = raw?._wizardMeta;
  if (meta?.status && Number.isFinite(Number(meta.step))) {
    return {
      status: meta.status,
      step: Math.min(8, Math.max(1, Number(meta.step) || 1))
    };
  }
  if (hasCompletedSizing(project?.calculations)) {
    return { status: 'complete', step: 8 };
  }
  return { status: 'draft', step: 1 };
}

export function hasCompletedSizing(calcs?: Calculations | null): boolean {
  if (!calcs) return false;
  if ((calcs as Calculations & { isError?: boolean }).isError) return false;
  return (calcs.solarArrayKw || 0) > 0 || (calcs.inverterSizeKva || 0) > 0;
}

export function stripWizardMeta(calcs?: Calculations | null): Calculations | undefined {
  if (!calcs) return undefined;
  const { _wizardMeta: _ignored, ...rest } = calcs as CalculationsWithMeta;
  return rest;
}

export function attachWizardMeta(
  calcs: Calculations | undefined,
  meta: WizardMeta
): Calculations {
  const base = calcs && !(calcs as Calculations & { isError?: boolean }).isError
    ? stripWizardMeta(calcs)!
    : calcs?.dailyEnergy
      ? stripWizardMeta(calcs)!
      : EMPTY_DRAFT_CALCS();

  return {
    ...base,
    _wizardMeta: {
      status: meta.status,
      step: Math.min(8, Math.max(1, meta.step))
    }
  } as Calculations;
}

export function projectStatusLabel(project: Project): string {
  const meta = getWizardMeta(project);
  if (meta.status === 'draft') return `Draft · Step ${meta.step}/8`;
  return 'Complete';
}
