import { PanelSpecs, InverterSpecs, getMpptChannels, formatMpptCurrentLimits } from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';

/** Allow tiny Imp overshoot vs datasheet continuous rating (module rounding / STC vs field). */
const MPPT_IMP_SOFT_TOLERANCE = 1.03;

export interface StringValidationResult {
  valid: boolean;
  failures: string[];
  warnings: string[];
  seriesCount: number;
  parallelCount: number;
  totalPanels: number;
  totalPvPowerW: number;
  vocColdPerPanel: number;
  vmpHotPerPanel: number;
  stringVocMax: number;
  stringVmpHot: number;
  stringVmpNominal: number;
  stringIscMax: number;
  stringImpMax: number;
  /** Highest Imp current on any loaded MPPT after optimal assignment */
  currentPerMppt: number;
  /** Tightest continuous current limit among loaded MPPTs for this assignment */
  limitingMpptCurrentA: number;
  powerPerMppt: number;
  /** Max strings assigned to any single MPPT */
  stringsPerMppt: number;
  /** e.g. "1+1" or "2+0" */
  mpptStringAssignment: string;
  /** e.g. "26+13" */
  mpptCurrentLimitsLabel: string;
  maxPanelsInSeries: number;
  minPanelsInSeries: number;
  maxParallelStrings: number;
}

export interface PanelConfigurationResult extends StringValidationResult {
  panelConfiguration: string;
  panelVoc: number;
  panelVmp: number;
  panelIsc: number;
  panelImp: number;
  panelModelUsed: string;
  inverterModelUsed: string;
  mpptVocLimit: number;
  mpptVmpMin: number;
  mpptVmpMax: number;
  maxPvCurrent: number;
  maxPvPower: number;
  panelSizingCompatibilityOk: boolean;
  panelSizingCompatibilityWarning: string;
  score: number;
}

function temperatureAdjustedVoc(panel: PanelSpecs): number {
  const { minDesignTempC, stcTempC } = SYSTEM_STANDARDS;
  return panel.voc * (1 + (panel.tempCoeffVoc * (minDesignTempC - stcTempC)) / 100);
}

function temperatureAdjustedVmpHot(panel: PanelSpecs): number {
  const { maxCellTempC, stcTempC } = SYSTEM_STANDARDS;
  // Vmp coeff is typically more negative than Voc — never use Voc coeff alone
  const betaVmp = panel.tempCoeffVmp ?? panel.tempCoeffVoc * 1.12;
  return panel.vmp * (1 + (betaVmp * (maxCellTempC - stcTempC)) / 100);
}

interface MpptAssignment {
  strings: number[];
  currents: number[];
  maxCurrent: number;
  limitingLimit: number;
  softOver: boolean;
  maxUtil: number;
}

/**
 * Enumerate feasible string→MPPT assignments and pick the one with lowest peak utilization.
 * Prefers spreading across trackers when utilization is equal.
 */
function findBestMpptAssignment(
  parallelCount: number,
  channels: { currentA: number; maxStrings: number }[],
  panelImp: number
): MpptAssignment | null {
  const n = channels.length;
  if (n < 1 || parallelCount < 1) return null;

  let best: MpptAssignment | null = null;

  const recurse = (idx: number, remaining: number, acc: number[]) => {
    if (idx === n - 1) {
      if (remaining > channels[idx].maxStrings) return;
      const strings = [...acc, remaining];
      evaluate(strings);
      return;
    }
    const maxHere = Math.min(channels[idx].maxStrings, remaining);
    for (let s = 0; s <= maxHere; s++) {
      recurse(idx + 1, remaining - s, [...acc, s]);
    }
  };

  const evaluate = (strings: number[]) => {
    const currents = strings.map(s => s * panelImp);
    let softOver = false;
    let hardFail = false;
    let maxUtil = 0;
    let maxCurrent = 0;
    let limitingLimit = Infinity;

    for (let i = 0; i < n; i++) {
      if (strings[i] <= 0) continue;
      const limit = channels[i].currentA;
      const cur = currents[i];
      maxCurrent = Math.max(maxCurrent, cur);
      limitingLimit = Math.min(limitingLimit, limit);
      const util = cur / Math.max(limit, 0.01);
      maxUtil = Math.max(maxUtil, util);
      if (cur > limit * MPPT_IMP_SOFT_TOLERANCE) hardFail = true;
      else if (cur > limit) softOver = true;
    }

    if (hardFail) return;
    if (!Number.isFinite(limitingLimit)) limitingLimit = channels[0].currentA;

    const loadedTrackers = strings.filter(s => s > 0).length;
    const candidate: MpptAssignment = {
      strings,
      currents,
      maxCurrent,
      limitingLimit,
      softOver,
      maxUtil
    };

    if (
      !best ||
      candidate.maxUtil < best.maxUtil - 1e-9 ||
      (Math.abs(candidate.maxUtil - best.maxUtil) < 1e-9 &&
        loadedTrackers > best.strings.filter(s => s > 0).length)
    ) {
      best = candidate;
    }
  };

  recurse(0, parallelCount, []);
  return best;
}

/**
 * Hard electrical validation for one S×P layout.
 * Invalid layouts are never returned as recommendations.
 */
export function validateStringConfiguration(
  panel: PanelSpecs,
  inverter: InverterSpecs,
  seriesCount: number,
  parallelCount: number
): StringValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const vocCold = temperatureAdjustedVoc(panel);
  const vmpHot = temperatureAdjustedVmpHot(panel);
  const channels = getMpptChannels(inverter);
  const mpptCurrentLimitsLabel = formatMpptCurrentLimits(inverter);

  const maxPanelsInSeries = Math.floor(inverter.mpptVocLimit / vocCold);
  const minPanelsInSeries = Math.ceil(inverter.mpptVmpMin / vmpHot);
  const maxParallelStrings = channels.reduce((sum, c) => sum + c.maxStrings, 0);

  const totalPanels = seriesCount * parallelCount;
  const totalPvPowerW = totalPanels * panel.sizeW;
  const stringVocMax = seriesCount * vocCold;
  const stringVmpHot = seriesCount * vmpHot;
  const stringVmpNominal = seriesCount * panel.vmp;
  const stringIscMax = parallelCount * panel.isc;
  const stringImpMax = parallelCount * panel.imp;

  const assignment = findBestMpptAssignment(parallelCount, channels, panel.imp);
  const stringsPerMppt = assignment
    ? Math.max(...assignment.strings, 0)
    : Math.ceil(parallelCount / Math.max(channels.length, 1));
  const currentPerMppt = assignment?.maxCurrent ?? stringsPerMppt * panel.imp;
  const limitingMpptCurrentA = assignment?.limitingLimit ?? inverter.maxPvCurrent;
  const powerPerMppt = seriesCount * stringsPerMppt * panel.sizeW;
  const mpptStringAssignment = assignment
    ? assignment.strings.join('+')
    : `${stringsPerMppt}`.padEnd(1);

  if (seriesCount < 1 || parallelCount < 1) {
    failures.push('Series and parallel counts must be at least 1.');
  }
  if (stringVocMax > inverter.mpptVocLimit) {
    failures.push(
      `Cold-weather string Voc ${stringVocMax.toFixed(1)}V exceeds inverter max PV voltage ${inverter.mpptVocLimit}V.`
    );
  }
  if (stringVocMax > panel.maxSystemVoltageV) {
    failures.push(
      `String Voc ${stringVocMax.toFixed(1)}V exceeds panel max system voltage ${panel.maxSystemVoltageV}V.`
    );
  }
  if (stringVmpHot < inverter.mpptVmpMin) {
    failures.push(
      `Hot-weather string Vmp ${stringVmpHot.toFixed(1)}V is below MPPT minimum ${inverter.mpptVmpMin}V.`
    );
  }
  if (stringVmpNominal > inverter.mpptVmpMax) {
    failures.push(
      `String Vmp ${stringVmpNominal.toFixed(1)}V exceeds MPPT maximum ${inverter.mpptVmpMax}V.`
    );
  }
  if (!assignment) {
    failures.push(
      `Cannot assign ${parallelCount} parallel string(s) within MPPT string limits (${channels
        .map(c => c.maxStrings)
        .join('+')}) at Imp ${panel.imp} A vs limits ${mpptCurrentLimitsLabel} A.`
    );
  } else {
    for (let i = 0; i < assignment.strings.length; i++) {
      const s = assignment.strings[i];
      if (s <= 0) continue;
      const cur = assignment.currents[i];
      const limit = channels[i].currentA;
      if (cur > limit * MPPT_IMP_SOFT_TOLERANCE) {
        failures.push(
          `MPPT ${i + 1}: ${s} string(s) at ${cur.toFixed(1)} A Imp exceeds continuous limit ${limit} A.`
        );
      } else if (cur > limit) {
        warnings.push(
          `MPPT ${i + 1}: ${cur.toFixed(1)} A Imp is slightly above the ${limit} A continuous rating (within ${Math.round(
            (MPPT_IMP_SOFT_TOLERANCE - 1) * 100
          )}% engineering tolerance). Prefer lower-Imp modules or confirm with the inverter manufacturer.`
        );
      }
    }
  }
  if (parallelCount > maxParallelStrings) {
    failures.push(
      `${parallelCount} parallel strings exceeds inverter capacity of ${maxParallelStrings} total strings.`
    );
  }
  if (totalPvPowerW > inverter.maxPvPower) {
    failures.push(
      `Array power ${totalPvPowerW}W exceeds inverter max PV input ${inverter.maxPvPower}W.`
    );
  }
  if (seriesCount > maxPanelsInSeries || seriesCount < minPanelsInSeries) {
    failures.push(
      `Series count ${seriesCount} outside valid window [${minPanelsInSeries}, ${maxPanelsInSeries}].`
    );
  }

  return {
    valid: failures.length === 0,
    failures,
    warnings,
    seriesCount,
    parallelCount,
    totalPanels,
    totalPvPowerW,
    vocColdPerPanel: vocCold,
    vmpHotPerPanel: vmpHot,
    stringVocMax: parseFloat(stringVocMax.toFixed(1)),
    stringVmpHot: parseFloat(stringVmpHot.toFixed(1)),
    stringVmpNominal: parseFloat(stringVmpNominal.toFixed(1)),
    stringIscMax: parseFloat(stringIscMax.toFixed(1)),
    stringImpMax: parseFloat(stringImpMax.toFixed(1)),
    currentPerMppt: parseFloat(currentPerMppt.toFixed(1)),
    limitingMpptCurrentA: parseFloat(limitingMpptCurrentA.toFixed(1)),
    powerPerMppt: parseFloat(powerPerMppt.toFixed(1)),
    stringsPerMppt,
    mpptStringAssignment,
    mpptCurrentLimitsLabel,
    maxPanelsInSeries,
    minPanelsInSeries,
    maxParallelStrings
  };
}

function scoreLayout(
  checked: StringValidationResult,
  targetPvWatts: number,
  preferredWattageMatch: boolean,
  numMppts: number
): number {
  const target = Math.max(targetPvWatts, 1);
  const sizingRatio = checked.totalPvPowerW / target;
  let score = 50;
  if (preferredWattageMatch) score += 200;

  if (sizingRatio >= 0.999 && sizingRatio <= 1.25) {
    // Meet target with minimal oversize
    score += 220 - (sizingRatio - 1) * 120;
  } else if (sizingRatio > 1.25) {
    score += Math.max(0, 140 - (sizingRatio - 1.25) * 90);
  } else {
    // Undersized — heavily penalized so 4S×1P never beats a valid 5-panel layout
    score += sizingRatio * 40 - 250;
  }

  // Prefer fewer panels once energy is covered (or closest under target as last resort)
  score += Math.max(0, 60 - checked.totalPanels);
  if (checked.parallelCount % numMppts === 0) score += 25;
  if (checked.warnings.length > 0) score -= 8 * checked.warnings.length;
  return score;
}

/**
 * Search only electrically valid S×P layouts for a panel/inverter pair.
 * Prefer layouts that meet or slightly exceed the PV energy target.
 * Always publishes total panels = series × parallel.
 */
export function searchValidStringConfigurations(
  panel: PanelSpecs,
  inverter: InverterSpecs,
  targetPvWatts: number,
  preferredWattageMatch: boolean
): PanelConfigurationResult[] {
  const vocCold = temperatureAdjustedVoc(panel);
  const vmpHot = temperatureAdjustedVmpHot(panel);
  const maxS = Math.floor(inverter.mpptVocLimit / vocCold);
  const minS = Math.ceil(inverter.mpptVmpMin / vmpHot);
  if (maxS < 1 || minS > maxS) return [];

  const channels = getMpptChannels(inverter);
  const maxP = channels.reduce((sum, c) => sum + c.maxStrings, 0);
  const allValid: PanelConfigurationResult[] = [];

  for (let s = minS; s <= maxS; s++) {
    for (let p = 1; p <= maxP; p++) {
      const checked = validateStringConfiguration(panel, inverter, s, p);
      if (!checked.valid) continue;
      if (checked.totalPanels !== s * p) continue;

      const warnText =
        checked.warnings.length > 0
          ? ` ${checked.warnings.join(' ')}`
          : '';

      allValid.push({
        ...checked,
        panelConfiguration: `${s} Series × ${p} Parallel · ${checked.totalPanels} panels total`,
        panelVoc: panel.voc,
        panelVmp: panel.vmp,
        panelIsc: panel.isc,
        panelImp: panel.imp,
        panelModelUsed: `${panel.brand} ${panel.model}`,
        inverterModelUsed: `${inverter.brand} ${inverter.model}`,
        mpptVocLimit: inverter.mpptVocLimit,
        mpptVmpMin: inverter.mpptVmpMin,
        mpptVmpMax: inverter.mpptVmpMax,
        maxPvCurrent: checked.limitingMpptCurrentA,
        maxPvPower: inverter.maxPvPower,
        // Soft Imp tolerance still counts as electrically usable (warnings carry the caveat).
        panelSizingCompatibilityOk: true,
        panelSizingCompatibilityWarning:
          checked.warnings.length === 0
            ? 'Selected PV array configuration is fully compatible with inverter MPPT specifications.'
            : `Selected PV array configuration is electrically usable with notes:${warnText}`,
        score: scoreLayout(checked, targetPvWatts, preferredWattageMatch, inverter.numMppts)
      });
    }
  }

  const meetingTarget = allValid.filter(
    r => r.totalPvPowerW >= targetPvWatts * 0.999
  );
  // Prefer energy-adequate layouts; only fall back if none exist for this pair
  const pool = meetingTarget.length > 0 ? meetingTarget : allValid;
  return pool.sort((a, b) => b.score - a.score);
}
