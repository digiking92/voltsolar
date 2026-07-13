import { getPanelFromDb, getInverterFromDb } from './equipmentDatabase';

export interface PanelConfigurationResult {
  seriesCount: number;
  parallelCount: number;
  totalPanels: number;
  panelConfiguration: string;
  panelVoc: number;
  panelVmp: number;
  panelIsc: number;
  panelImp: number;
  panelModelUsed: string;
  inverterModelUsed: string;
  stringVocMax: number; // Max Voc at -10C
  stringVmpMax: number; // Vmp at +65C (minimum)
  stringVmpNominal: number; // Standard Vmp at STC
  stringIscMax: number;
  mpptVocLimit: number;
  mpptVmpMin: number;
  mpptVmpMax: number;
  maxPvCurrent: number;
  maxPvPower: number;
  totalPvPowerW: number;
  maxPanelsInSeries: number;
  minPanelsInSeries: number;
  panelSizingCompatibilityOk: boolean;
  panelSizingCompatibilityWarning: string;
}

export function configureSolarStrings(
  requestedPanelQuantity: number,
  panelWattage: number,
  inverterSizeKva: number,
  systemVoltageNum: number
): PanelConfigurationResult {
  // 1. Retrieve specifications from equipment database
  const panel = getPanelFromDb(panelWattage);
  const inverter = getInverterFromDb(inverterSizeKva, systemVoltageNum);

  // Temperature Coefficients and Design Limits
  // standard panel Voc temp coefficient is typically -0.30% to -0.34% per deg C
  const tempCoeff = panel.tempCoeffVoc; // e.g. -0.34
  const minDesignTemp = -10; // C
  const maxCellTemp = 65; // C

  // Voc rise at minimum temperature (-10C)
  const vocTempFactor = 1 + (tempCoeff * (minDesignTemp - 25)) / 100; // Voc increases under cold temperature
  const vocCold = panel.voc * vocTempFactor;

  // Vmp drop at maximum cell temperature (65C)
  const vmpTempFactor = 1 + (tempCoeff * (maxCellTemp - 25)) / 100; // Vmp decreases under high temperature
  const vmpHot = panel.vmp * vmpTempFactor;

  // --- Calculate Max and Min Panels in Series ---
  // Max series = floor ( Maximum Inverter PV Voltage / Voc_cold )
  // Min series = ceil ( Minimum MPPT Voltage / Vmp_hot )
  const maxPanelsInSeries = Math.floor(inverter.mpptVocLimit / vocCold);
  const minPanelsInSeries = Math.ceil(inverter.mpptVmpMin / vmpHot);

  // --- Determine optimal string layout ---
  let seriesCount = 1;
  let parallelCount = 1;
  let finalPanelQuantity = requestedPanelQuantity;
  let compatibilityOk = true;
  let warningMsg = '';

  // Ensure minimum series count is valid
  const targetSeries = Math.max(1, Math.min(maxPanelsInSeries, Math.round((inverter.mpptVmpMin + inverter.mpptVmpMax) / 2 / panel.vmp)));
  seriesCount = targetSeries;

  // We want to find series (S) and parallel (P) counts such that S is in [minPanelsInSeries, maxPanelsInSeries]
  // and S * P is close to requestedPanelQuantity, and layout is electrically valid
  let bestS = -1;
  let bestP = -1;
  let bestDiff = Infinity;

  // Let's search over potential layouts
  for (let s = Math.max(1, minPanelsInSeries); s <= maxPanelsInSeries; s++) {
    // Parallel strings must respect max current
    // P * panel.isc <= inverter.maxPvCurrent
    const maxP = Math.floor(inverter.maxPvCurrent / panel.isc) || 1;
    for (let p = 1; p <= maxP; p++) {
      const currentQty = s * p;
      const power = currentQty * panel.sizeW;
      
      // Must respect max inverter input power
      if (power <= inverter.maxPvPower) {
        const diff = Math.abs(currentQty - requestedPanelQuantity);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestS = s;
          bestP = p;
        }
      }
    }
  }

  if (bestS !== -1 && bestP !== -1) {
    seriesCount = bestS;
    parallelCount = bestP;
    finalPanelQuantity = seriesCount * parallelCount;
  } else {
    // Heuristics fallback if no strict matching layout found
    seriesCount = Math.max(1, minPanelsInSeries);
    parallelCount = Math.max(1, Math.floor(requestedPanelQuantity / seriesCount));
    finalPanelQuantity = seriesCount * parallelCount;
  }

  // Electrical Characteristics of Final Array
  const totalPvPowerW = finalPanelQuantity * panel.sizeW;
  const stringVocMax = parseFloat((seriesCount * vocCold).toFixed(1)); // String Voc at -10C
  const stringVmpMax = parseFloat((seriesCount * panel.vmp).toFixed(1)); // STC
  const stringVmpHotMin = parseFloat((seriesCount * vmpHot).toFixed(1)); // Vmp at +65C
  const stringIscMax = parseFloat((parallelCount * panel.isc).toFixed(1));

  // --- Verification ---
  // 1. String Voc < Maximum Inverter PV Voltage (Voc Limit)
  if (stringVocMax > inverter.mpptVocLimit) {
    compatibilityOk = false;
    warningMsg += `DANGER: String Voc (${stringVocMax}V) exceeds maximum inverter PV voltage (${inverter.mpptVocLimit}V). This will physically destroy the inverter under cold bright conditions. `;
  }

  // 2. String Vmp Within MPPT Operating Range
  if (stringVmpHotMin < inverter.mpptVmpMin) {
    compatibilityOk = false;
    warningMsg += `WARNING: String Vmp at +65°C (${stringVmpHotMin}V) falls below inverter minimum MPPT threshold (${inverter.mpptVmpMin}V). MPPT tracking will fail in hot weather. `;
  }
  if (stringVmpMax > inverter.mpptVmpMax) {
    compatibilityOk = false;
    warningMsg += `WARNING: String Vmp (${stringVmpMax}V) exceeds inverter maximum MPPT voltage limit (${inverter.mpptVmpMax}V). Power clipping will occur. `;
  }

  // 3. Array Current < Maximum MPPT Current
  if (stringIscMax > inverter.maxPvCurrent) {
    compatibilityOk = false;
    warningMsg += `WARNING: Array current (${stringIscMax}A) exceeds maximum inverter MPPT input current (${inverter.maxPvCurrent}A). Overcurrent clipping or heat damage may occur. `;
  }

  // 4. PV Power < Maximum PV Input Power
  if (totalPvPowerW > inverter.maxPvPower) {
    compatibilityOk = false;
    warningMsg += `WARNING: Total PV Power (${totalPvPowerW}W) exceeds maximum inverter input power limit (${inverter.maxPvPower}W). Excessive solar clipping will occur. `;
  }

  const configString = `${seriesCount} Series × ${parallelCount} Parallel (${finalPanelQuantity} Panels total)`;

  return {
    seriesCount,
    parallelCount,
    totalPanels: finalPanelQuantity,
    panelConfiguration: configString,
    panelVoc: panel.voc,
    panelVmp: panel.vmp,
    panelIsc: panel.isc,
    panelImp: panel.imp,
    panelModelUsed: `${panel.brand} ${panel.model}`,
    inverterModelUsed: `${inverter.brand} ${inverter.model}`,
    stringVocMax,
    stringVmpMax,
    stringVmpNominal: parseFloat((seriesCount * panel.vmp).toFixed(1)),
    stringIscMax,
    mpptVocLimit: inverter.mpptVocLimit,
    mpptVmpMin: inverter.mpptVmpMin,
    mpptVmpMax: inverter.mpptVmpMax,
    maxPvCurrent: inverter.maxPvCurrent,
    maxPvPower: inverter.maxPvPower,
    totalPvPowerW,
    maxPanelsInSeries,
    minPanelsInSeries,
    panelSizingCompatibilityOk: compatibilityOk,
    panelSizingCompatibilityWarning: warningMsg || 'Selected PV Array configuration is fully compatible with inverter MPPT specifications.'
  };
}
