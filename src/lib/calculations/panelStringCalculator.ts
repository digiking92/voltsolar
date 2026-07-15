import { PanelSpecs, InverterSpecs } from './equipmentDatabase';
import { SYSTEM_STANDARDS } from './engineeringStandards';

export interface StringValidationResult {
  valid: boolean;
  failures: string[];
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
  currentPerMppt: number;
  powerPerMppt: number;
  stringsPerMppt: number;
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
  const vocCold = temperatureAdjustedVoc(panel);
  const vmpHot = temperatureAdjustedVmpHot(panel);

  const maxPanelsInSeries = Math.floor(inverter.mpptVocLimit / vocCold);
  const minPanelsInSeries = Math.ceil(inverter.mpptVmpMin / vmpHot);
  const maxParallelStrings = inverter.numMppts * inverter.maxStringsPerMppt;

  const totalPanels = seriesCount * parallelCount;
  const totalPvPowerW = totalPanels * panel.sizeW;
  const stringVocMax = seriesCount * vocCold;
  const stringVmpHot = seriesCount * vmpHot;
  const stringVmpNominal = seriesCount * panel.vmp;
  const stringIscMax = parallelCount * panel.isc;
  const stringImpMax = parallelCount * panel.imp;

  const stringsPerMppt = Math.ceil(parallelCount / inverter.numMppts);
  // Operating current vs MPPT rating uses Imp; Isc is used for protection/cable later
  const currentPerMppt = stringsPerMppt * panel.imp;
  const powerPerMppt = seriesCount * stringsPerMppt * panel.sizeW;

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
  if (currentPerMppt > inverter.maxPvCurrent * 1.05) {
    failures.push(
      `MPPT operating current ${currentPerMppt.toFixed(1)}A exceeds inverter MPPT limit ${inverter.maxPvCurrent}A.`
    );
  }
  if (stringsPerMppt > inverter.maxStringsPerMppt) {
    failures.push(
      `${stringsPerMppt} strings per MPPT exceeds inverter limit of ${inverter.maxStringsPerMppt}.`
    );
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
    powerPerMppt: parseFloat(powerPerMppt.toFixed(1)),
    stringsPerMppt,
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

  const maxP = inverter.numMppts * inverter.maxStringsPerMppt;
  const allValid: PanelConfigurationResult[] = [];

  for (let s = minS; s <= maxS; s++) {
    for (let p = 1; p <= maxP; p++) {
      const checked = validateStringConfiguration(panel, inverter, s, p);
      if (!checked.valid) continue;
      if (checked.totalPanels !== s * p) continue;

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
        maxPvCurrent: inverter.maxPvCurrent,
        maxPvPower: inverter.maxPvPower,
        panelSizingCompatibilityOk: true,
        panelSizingCompatibilityWarning:
          'Selected PV array configuration is fully compatible with inverter MPPT specifications.',
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
