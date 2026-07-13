import { getPanelSpecs } from './engineeringStandards';

export interface PanelConfigurationResult {
  seriesCount: number;
  parallelCount: number;
  panelConfiguration: string;
  panelVoc: number;
  panelVmp: number;
  panelIsc: number;
  panelImp: number;
  stringVocMax: number;
  stringVmpMax: number;
  stringIscMax: number;
  mpptVocLimit: number;
  mpptVmpMin: number;
  mpptVmpMax: number;
  panelSizingCompatibilityOk: boolean;
  panelSizingCompatibilityWarning: string;
}

export function configureSolarStrings(
  panelQuantity: number,
  panelWattage: number,
  inverterSizeKva: number
): PanelConfigurationResult {
  // 1. Get panel specifications
  const specs = getPanelSpecs(panelWattage);

  // 2. Determine inverter MPPT controller voltage limits
  let mpptVocLimit = 450;
  let mpptVmpMin = 120;
  let mpptVmpMax = 430;
  let maxInputCurrent = 18;

  if (inverterSizeKva <= 3.0) {
    mpptVocLimit = 150;
    mpptVmpMin = 30;
    mpptVmpMax = 120;
    maxInputCurrent = 15;
  } else if (inverterSizeKva <= 8.0) {
    mpptVocLimit = 450;
    mpptVmpMin = 120;
    mpptVmpMax = 430;
    maxInputCurrent = 18;
  } else {
    // Large commercial systems usually use dual MPPT high voltage controllers
    mpptVocLimit = 850;
    mpptVmpMin = 200;
    mpptVmpMax = 800;
    maxInputCurrent = 30;
  }

  // 3. Find optimal series (S) and parallel (P) combinations
  // We want S * P = panelQuantity
  // And S * Voc * 1.15 (temperature correction factor) < mpptVocLimit
  // And S * Vmp should be inside the Vmp Range [mpptVmpMin, mpptVmpMax]
  let seriesCount = 1;
  let parallelCount = panelQuantity;
  let bestScore = -1;

  // Let's test all possible integer factors of panelQuantity
  for (let s = 1; s <= panelQuantity; s++) {
    if (panelQuantity % s === 0) {
      const p = panelQuantity / s;
      
      const stringVocCold = s * specs.voc * 1.15; // 15% safety margin for cold weather Voc rise
      const stringVmp = s * specs.vmp;
      const stringIsc = p * specs.isc;

      let ok = true;
      let score = s; // Prefer longer series strings (higher voltage, lower cable current/losses)

      if (stringVocCold > mpptVocLimit) ok = false;
      if (stringVmp < mpptVmpMin || stringVmp > mpptVmpMax) ok = false;
      if (stringIsc > maxInputCurrent * 1.5) ok = false; // Allow up to 150% with dual input, else warn

      if (ok && score > bestScore) {
        bestScore = score;
        seriesCount = s;
        parallelCount = p;
      }
    }
  }

  // Fallback if no clean factors found, use heuristics
  if (bestScore === -1) {
    if (mpptVocLimit === 150) {
      seriesCount = Math.min(2, panelQuantity);
    } else if (mpptVocLimit === 450) {
      seriesCount = Math.min(8, Math.max(2, Math.floor(mpptVmpMax / specs.vmp)));
      // cap series count to fit Voc limit
      while (seriesCount * specs.voc * 1.15 > mpptVocLimit && seriesCount > 1) {
        seriesCount--;
      }
    } else {
      seriesCount = Math.min(12, panelQuantity);
    }
    parallelCount = Math.ceil(panelQuantity / seriesCount);
  }

  // 4. Electrical ratings of the configured PV string
  const stringVocMax = parseFloat((seriesCount * specs.voc * 1.15).toFixed(1)); // with temperature factor
  const stringVmpMax = parseFloat((seriesCount * specs.vmp).toFixed(1));
  const stringIscMax = parseFloat((parallelCount * specs.isc).toFixed(1));

  // 5. Run design compatibility checks
  let compatibilityOk = true;
  let warningMsg = '';

  if (stringVocMax > mpptVocLimit) {
    compatibilityOk = false;
    warningMsg = `DANGER: String Voc (${stringVocMax}V) exceeds maximum inverter MPPT limit (${mpptVocLimit}V). This will physically destroy the inverter under cold bright conditions. Reduce panels in series.`;
  } else if (stringVmpMax < mpptVmpMin) {
    compatibilityOk = false;
    warningMsg = `WARNING: String Vmp (${stringVmpMax}V) is below inverter minimum MPPT voltage start threshold (${mpptVmpMin}V). The system will fail to start charging or suffer heavy efficiency dropouts in warm weather. Increase panels in series.`;
  } else if (stringVmpMax > mpptVmpMax) {
    compatibilityOk = false;
    warningMsg = `WARNING: String Vmp (${stringVmpMax}V) exceeds inverter maximum MPPT window (${mpptVmpMax}V). Power clipping will occur.`;
  } else if (stringIscMax > maxInputCurrent) {
    if (inverterSizeKva > 8.0) {
      warningMsg = `INFO: Total array input current (${stringIscMax}A) exceeds single input rating. Requires dual MPPT input configuration (2x split string connection).`;
    } else {
      compatibilityOk = false;
      warningMsg = `WARNING: Parallel array current (${stringIscMax}A) exceeds inverter maximum MPPT input current (${maxInputCurrent}A). Cable overheating or controller clipping may occur.`;
    }
  }

  const configString = `${seriesCount} Series × ${parallelCount} Parallel String Layout (${panelQuantity} Panels total)`;

  return {
    seriesCount,
    parallelCount,
    panelConfiguration: configString,
    panelVoc: specs.voc,
    panelVmp: specs.vmp,
    panelIsc: specs.isc,
    panelImp: specs.imp,
    stringVocMax,
    stringVmpMax,
    stringIscMax,
    mpptVocLimit,
    mpptVmpMin,
    mpptVmpMax,
    panelSizingCompatibilityOk: compatibilityOk,
    panelSizingCompatibilityWarning: warningMsg
  };
}
