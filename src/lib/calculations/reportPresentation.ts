import { Calculations, BatteryType, SystemVoltage, InverterType } from '../../types';
import { SYSTEM_STANDARDS, COPPER_CABLE_SPECS } from './engineeringStandards';

export const SOFTWARE_VERSION = '1.0.0';
export const CALCULATION_STANDARDS = ['IEC 60364', 'IEC 62548', 'NEC Article 690'];

export interface ReportInputs {
  backupHours: number;
  batteryType: BatteryType;
  systemVoltage: SystemVoltage;
  inverterType: InverterType;
  panelSize: number;
  resolvedSystemVoltageV: number;
  designId: string;
  issuedAt: Date;
}

export interface EnergyFlowSummary {
  pvGenerationKwh: number;
  systemLossesKwh: number;
  netEnergyAvailableKwh: number;
  customerConsumptionKwh: number;
  remainingReserveKwh: number;
}

export interface DesignPassportItem {
  label: string;
  status: 'PASS' | 'REVIEW' | 'FAIL';
}

export interface JustificationRow {
  label: string;
  value: string;
}

export interface EngineeringReportMeta {
  chemistryLabel: string;
  topologyLabel: string;
  installationTypeLabel: string;
  safetyMarginPercent: number;
  futureExpansionPercent: number;
  ambientColdC: number;
  ambientHotC: number;
  energyFlow: EnergyFlowSummary;
  requiredArrayKwp: number;
  engineeringMarginPercent: number;
  confidenceScore: number;
  confidenceReasons: string[];
  passport: DesignPassportItem[];
  overallStatus: 'CERTIFIED' | 'REVIEW REQUIRED';
  voltageMarginV: number;
  currentMarginA: number;
  powerMarginW: number;
  actualPvCurrentA: number;
  actualPvPowerW: number;
  maxPvCurrentA: number;
  maxPvPowerW: number;
  /** True when Maximum Power Point Tracker (MPPT) current is within limit */
  pvCurrentOk: boolean;
  /** True when protection devices meet calculated ampere requirements */
  protectionAdequacyOk: boolean;
  peakDemandDerivation: string;
  mpptMappingDescription: string;
  installedBatteryReservePercent: number;
  usableBatteryReservePercent: number;
  selectedPanelWattageWp: number;
  preferredPanelWattageWp: number;
  panelPreferenceNote: string;
  selectionJustifications: {
    inverter: JustificationRow[];
    battery: JustificationRow[];
    pv: JustificationRow[];
    protection: string;
  };
  pvMarginNotes: string[];
  stringElectricalChecks: {
    label: string;
    actual: string;
    limit: string;
    margin: string;
    pass: boolean;
  }[];
}

const CHEMISTRY_LABELS: Record<BatteryType, string> = {
  lithium: 'Lithium Iron Phosphate (LiFePO4)',
  tubular: 'Tubular Lead-Acid',
  agm: 'Absorbent Glass Mat (AGM) Lead-Acid',
  gel: 'Gel Lead-Acid'
};

const TOPOLOGY_LABELS: Record<InverterType, string> = {
  auto: 'Hybrid (Auto-Selected)',
  hybrid: 'Hybrid',
  off_grid: 'Off-Grid (Standalone)',
  grid_tie: 'Grid-Tied Hybrid'
};

function cableAmpacityFromSizeString(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const parallelMatch = sizeStr.match(/(\d+)\s*[×x]\s*([\d.]+)\s*mm/i);
  if (parallelMatch) {
    const runs = parseInt(parallelMatch[1], 10);
    const area = parseFloat(parallelMatch[2]);
    const unit =
      COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 === area) ||
      COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= area);
    if (unit && runs > 0) return unit.maxCurrentA * runs;
  }
  const match = sizeStr.match(/([\d.]+)\s*mm/);
  if (!match) return 0;
  const area = parseFloat(match[1]);
  const found =
    COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 === area) ||
    COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= area);
  if (found) return found.maxCurrentA;
  const largest = COPPER_CABLE_SPECS[COPPER_CABLE_SPECS.length - 1];
  const runs = Math.max(1, Math.ceil(area / largest.crossSectionMm2 - 1e-9));
  return largest.maxCurrentA * runs;
}

export function buildEngineeringReportMeta(
  calcs: Calculations,
  inputs: ReportInputs
): EngineeringReportMeta {
  const dailyConsumptionKwh = calcs.dailyEnergy / 1000;
  const rawHarvestKwh = calcs.dailyHarvestWhRaw ?? (calcs.solarArrayKw * (calcs.peakSunHoursUsed || 4.5));
  const netAvailable = calcs.estimatedDailyProductionKwh;
  const systemLossesKwh = Math.max(0, rawHarvestKwh - netAvailable);
  const remainingReserveKwh = netAvailable - dailyConsumptionKwh;

  const efficiencyFrac = (calcs.overallSystemEfficiency || 78) / 100;
  const psh = calcs.peakSunHoursUsed || 4.5;
  const requiredArrayKwp =
    psh > 0 && efficiencyFrac > 0 ? dailyConsumptionKwh / (psh * efficiencyFrac) : calcs.solarArrayKw;
  const engineeringMarginPercent =
    requiredArrayKwp > 0
      ? Math.max(0, Math.round(((calcs.solarArrayKw / requiredArrayKwp) - 1) * 100))
      : 0;

  const inverterW = calcs.inverterSizeKva * 1000;
  const futureExpansionPercent = Math.max(
    0,
    Math.round((1 - calcs.connectedLoad / Math.max(inverterW, 1)) * 100)
  );

  const maxPvCurrentA = calcs.maxPvCurrentA ?? 0;
  const maxPvPowerW = calcs.maxPvPowerW ?? 0;
  const actualPvCurrentA = calcs.currentPerMpptA ?? calcs.stringIscMax ?? 0;
  const actualPvPowerW = calcs.solarArrayKw * 1000;
  // Signed margins — negative means over limit (must FAIL, not hide behind Math.max(0, …))
  const voltageMarginV = (calcs.mpptVocLimit || 0) - (calcs.stringVocMax || 0);
  const currentMarginA = maxPvCurrentA - actualPvCurrentA;
  const powerMarginW = maxPvPowerW - actualPvPowerW;
  const pvCurrentOk = maxPvCurrentA <= 0 || actualPvCurrentA <= maxPvCurrentA;
  const pvVoltageOk = voltageMarginV >= 0 && calcs.panelSizingCompatibilityOk !== false;
  const pvPowerOk = maxPvPowerW <= 0 || actualPvPowerW <= maxPvPowerW;
  const protectionAdequacyOk = calcs.protectionSchedule?.protectionAdequacyOk !== false;
  const protectionNotes = calcs.protectionSchedule?.protectionAdequacyNotes || [];

  const selectedPanelWattageWp =
    calcs.selectedPanelWattageWp ??
    (calcs.panelQuantity > 0
      ? Math.round((calcs.solarArrayKw * 1000) / calcs.panelQuantity)
      : inputs.panelSize);
  const preferredPanelWattageWp = inputs.panelSize;
  const panelPreferenceNote =
    selectedPanelWattageWp === preferredPanelWattageWp
      ? `Selected module wattage matches the preferred ${preferredPanelWattageWp} watts-peak (Wp) choice.`
      : `Preferred panel wattage was ${preferredPanelWattageWp} watts-peak (Wp). The engine selected ${selectedPanelWattageWp} Wp modules because that combination scored better for Maximum Power Point Tracker (MPPT) voltage/current fit while still meeting the daily energy target.`;

  const numMppts = calcs.numMppts ?? 0;
  const stringsPerMppt = calcs.stringsPerMppt ?? 0;
  const seriesCount = calcs.seriesCount ?? 0;
  const parallelCount = calcs.parallelCount ?? 0;
  const mpptMappingDescription =
    numMppts > 0 && seriesCount > 0 && stringsPerMppt > 0
      ? `Array layout ${seriesCount} panels in series × ${parallelCount} parallel strings, split across ${numMppts} Maximum Power Point Tracker (MPPT) input(s): approximately ${stringsPerMppt} string(s) per MPPT → ${actualPvCurrentA.toFixed(1)} A operating current per MPPT (limit ${maxPvCurrentA} A).`
      : `Array layout ${seriesCount} series × ${parallelCount} parallel. Confirm Maximum Power Point Tracker (MPPT) string mapping on the inverter datasheet before installation.`;

  const diversity = calcs.diversityFactor ?? 0.8;
  const connectedKw = calcs.connectedLoad / 1000;
  const motorStartupKw = (calcs.motorStartupLoadW ?? 0) / 1000;
  const peakKw = calcs.peakLoad / 1000;
  const peakDemandDerivation = `Peak demand = (Total Connected Load × Diversity Factor ${diversity}) + Motor/Compressor Starting Surplus = (${connectedKw.toFixed(2)} kW × ${diversity}) + ${motorStartupKw.toFixed(2)} kW = ${peakKw.toFixed(2)} kW. Diversity accounts for appliances that do not all run at full rated power at the same time; motor surplus covers compressor and pump start-up current.`;

  // Confidence score: start 100, deduct for warnings / tight margins / hard failures
  let confidenceScore = 100;
  const confidenceReasons: string[] = [];
  const warnings = calcs.validationWarnings || [];
  const dangerCount = warnings.filter(w => w.level === 'danger').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;
  if (dangerCount > 0) {
    confidenceScore -= dangerCount * 25;
    confidenceReasons.push(`${dangerCount} critical engineering finding(s).`);
  }
  if (warningCount > 0) {
    confidenceScore -= warningCount * 8;
    confidenceReasons.push(
      ...warnings.filter(w => w.level === 'warning').map(w => w.message)
    );
  }
  if (!pvCurrentOk) {
    confidenceScore -= 25;
    confidenceReasons.push(
      `Maximum Power Point Tracker (MPPT) operating current ${actualPvCurrentA.toFixed(1)} A exceeds the inverter limit ${maxPvCurrentA} A — FAIL.`
    );
  }
  if (!protectionAdequacyOk) {
    confidenceScore -= 25;
    confidenceReasons.push(
      ...(protectionNotes.length
        ? protectionNotes
        : ['One or more protection devices are rated below the calculated requirement — FAIL.'])
    );
  }
  if (futureExpansionPercent < 15) {
    confidenceScore -= 5;
    confidenceReasons.push('Future expansion headroom is limited (<15%).');
  }
  if (remainingReserveKwh < 0) {
    confidenceScore -= 10;
    confidenceReasons.push('Daily photovoltaic (PV) net energy is below customer consumption.');
  } else if (remainingReserveKwh < dailyConsumptionKwh * 0.1) {
    confidenceScore -= 4;
    confidenceReasons.push('Daily energy reserve margin is thin (<10% of consumption).');
  }
  if (pvVoltageOk && voltageMarginV < 20) {
    confidenceScore -= 3;
    confidenceReasons.push(
      'Cold-weather open-circuit voltage (Voc) margin to the inverter limit is narrow.'
    );
  }
  if (pvCurrentOk && currentMarginA < 2 && maxPvCurrentA > 0) {
    confidenceScore -= 3;
    confidenceReasons.push(
      'Maximum Power Point Tracker (MPPT) current headroom is narrow.'
    );
  }
  confidenceScore = Math.max(40, Math.min(100, Math.round(confidenceScore)));
  if (confidenceReasons.length === 0) {
    confidenceReasons.push('No warnings. All hard electrical and capacity checks passed.');
  }

  const cablePass =
    (calcs.cableSizing?.pvCableVoltageDropPercent ?? 99) <= 2.0 &&
    (calcs.cableSizing?.batteryCableVoltageDropPercent ?? 99) <= 1.0 &&
    (calcs.cableSizing?.acCableVoltageDropPercent ?? 99) <= 3.0;

  const hotVmpOk =
    (calcs.stringVmpHot ?? calcs.stringVmpMax ?? 0) >= (calcs.mpptVmpMin || 0) &&
    (calcs.stringVmpHot ?? calcs.stringVmpMax ?? 0) <= (calcs.mpptVmpMax || Infinity);

  const passport: DesignPassportItem[] = [
    { label: 'Battery Bank Design', status: 'PASS' },
    {
      label: 'Photovoltaic (PV) Array Design',
      status: calcs.panelSizingCompatibilityOk === false ? 'FAIL' : remainingReserveKwh < 0 ? 'REVIEW' : 'PASS'
    },
    { label: 'Inverter Compatibility', status: 'PASS' },
    {
      label: 'Protection Design',
      status: !calcs.protectionSchedule?.deviceDetails?.length
        ? 'REVIEW'
        : protectionAdequacyOk
          ? 'PASS'
          : 'FAIL'
    },
    { label: 'Cable Design', status: cablePass ? 'PASS' : 'REVIEW' },
    {
      label: 'Voltage Validation',
      status: pvVoltageOk ? 'PASS' : 'FAIL'
    },
    {
      label: 'Current Validation',
      status: pvCurrentOk ? 'PASS' : 'FAIL'
    },
    {
      label: 'Power Validation',
      status: pvPowerOk ? 'PASS' : 'FAIL'
    }
  ];

  if (dangerCount > 0) {
    passport.forEach(p => {
      if (p.status === 'PASS') p.status = 'REVIEW';
    });
  }

  // CERTIFIED only when every passport check is PASS and hard electrical gates are green
  const hardGatesOk = pvCurrentOk && pvVoltageOk && pvPowerOk && protectionAdequacyOk && hotVmpOk;
  const overallStatus =
    passport.every(p => p.status === 'PASS') && hardGatesOk && confidenceScore >= 85
      ? 'CERTIFIED'
      : 'REVIEW REQUIRED';

  const usableBatt =
    calcs.batteryUsableKwh ?? calcs.batteryCapacityKwh * (calcs.batteryDodUsed || 0.9);
  const requiredBatt =
    calcs.batteryRequiredKwhRaw ??
    (calcs.dailyEnergy * (inputs.backupHours / 24)) / 1000;
  const installedBattKwh = calcs.batteryInstalledKwh || calcs.batteryCapacityKwh;
  const installedBatteryReservePercent =
    requiredBatt > 0
      ? Math.max(0, Math.round(((installedBattKwh - requiredBatt) / requiredBatt) * 100))
      : 0;
  const usableBatteryReservePercent =
    requiredBatt > 0
      ? Math.max(0, Math.round(((usableBatt - requiredBatt) / requiredBatt) * 100))
      : 0;

  const stringElectricalChecks = [
    {
      label: 'Cold-Weather String Open-Circuit Voltage (Voc)',
      actual: `${calcs.stringVocMax ?? '-'} V`,
      limit: `${calcs.mpptVocLimit ?? '-'} V`,
      margin: `${parseFloat(voltageMarginV.toFixed(1))} V`,
      pass: pvVoltageOk
    },
    {
      label: 'Hot-Weather String Maximum Power Voltage (Vmp)',
      actual: `${calcs.stringVmpHot ?? calcs.stringVmpMax ?? '-'} V`,
      limit: `${calcs.mpptVmpMin ?? '-'}-${calcs.mpptVmpMax ?? '-'} V`,
      margin: hotVmpOk ? 'Within window' : 'Outside window',
      pass: hotVmpOk
    },
    {
      label: 'Standard Test Condition String Maximum Power Voltage (Vmp at STC)',
      actual: `${calcs.stringVmpMax ?? '-'} V`,
      limit: `${calcs.mpptVmpMin ?? '-'}-${calcs.mpptVmpMax ?? '-'} V (reference)`,
      margin: 'STC (25 °C cells)',
      pass: true
    },
    {
      label: 'Maximum Power Point Tracker (MPPT) Operating Current',
      actual: `${parseFloat(actualPvCurrentA.toFixed(1))} A`,
      limit: `${maxPvCurrentA} A`,
      margin: `${parseFloat(currentMarginA.toFixed(1))} A`,
      pass: pvCurrentOk
    },
    {
      label: 'Photovoltaic (PV) Array Power',
      actual: `${Math.round(actualPvPowerW)} W`,
      limit: `${maxPvPowerW} W`,
      margin: `${Math.round(powerMarginW)} W`,
      pass: pvPowerOk
    }
  ];

  const selectionJustifications = {
    inverter: [
      {
        label: 'Total Connected Load',
        value: `${connectedKw.toFixed(2)} kW within ${calcs.inverterSizeKva} kilovolt-ampere (kVA) rating`
      },
      {
        label: 'Peak Demand',
        value: `${peakKw.toFixed(2)} kW — ${peakDemandDerivation}`
      },
      {
        label: 'Surge Requirement',
        value: `${peakKw.toFixed(2)} kW peak demand validated against inverter surge capacity during selection`
      },
      {
        label: 'Battery Voltage Compatibility',
        value: `${inputs.resolvedSystemVoltageV} V direct-current (DC) bus matched to selected inverter`
      },
      {
        label: 'Photovoltaic (PV) Voltage Compatibility',
        value: `Cold open-circuit voltage (Voc) ${calcs.stringVocMax ?? '-'} V ${
          pvVoltageOk ? '<=' : '>'
        } Maximum Power Point Tracker (MPPT) limit ${calcs.mpptVocLimit ?? '-'} V`
      },
      {
        label: 'Maximum Power Point Tracker (MPPT) Current Compatibility',
        value: `${actualPvCurrentA.toFixed(1)} A ${pvCurrentOk ? '<=' : '>'} ${maxPvCurrentA} A inverter PV input${
          pvCurrentOk ? '' : ' — FAIL'
        }`
      },
      {
        label: 'Future Expansion Margin',
        value: `~${futureExpansionPercent}% connected-load headroom on the inverter continuous rating`
      }
    ],
    battery: [
      {
        label: 'Selected Backup Hours',
        value: `${inputs.backupHours} h target from user selection`
      },
      {
        label: 'Load Profile Basis',
        value: 'Average daily load energy (not simultaneous full connected load)'
      },
      {
        label: 'Required Energy',
        value: `${requiredBatt.toFixed(2)} kilowatt-hours (kWh) before efficiency / Depth of Discharge (DoD) / reserve`
      },
      {
        label: 'Installed / Usable',
        value: `${installedBattKwh.toFixed(2)} kWh installed, ${usableBatt.toFixed(2)} kWh usable`
      },
      {
        label: 'Chemistry & Depth of Discharge (DoD)',
        value: `${CHEMISTRY_LABELS[inputs.batteryType]} at ${Math.round((calcs.batteryDodUsed || 0.9) * 100)}% Depth of Discharge (DoD)`
      },
      {
        label: 'Installed Engineering Reserve',
        value:
          installedBatteryReservePercent > 0
            ? `~${installedBatteryReservePercent}% above minimum required energy (installed capacity vs required)`
            : 'Matched to minimum plus efficiency stack'
      },
      {
        label: 'Usable Engineering Reserve',
        value:
          usableBatteryReservePercent > 0
            ? `~${usableBatteryReservePercent}% above minimum required energy after Depth of Discharge (DoD) limit`
            : 'Usable capacity is at or near the minimum required energy'
      },
      {
        label: 'Product / Configuration',
        value: `${calcs.batteryProductModel || 'Commercial battery bank'} | ${calcs.batterySeriesCount ?? '-'} in series × ${calcs.batteryParallelCount ?? '-'} in parallel`
      }
    ],
    pv: [
      {
        label: 'Daily Consumption',
        value: `${(calcs.dailyEnergy / 1000).toFixed(2)} kilowatt-hours (kWh)`
      },
      {
        label: 'Minimum Array Target',
        value: `${parseFloat(requiredArrayKwp.toFixed(2))} kilowatt-peak (kWp) from energy / (Peak Sun Hours × efficiency)`
      },
      {
        label: 'Selected Array',
        value: `${calcs.solarArrayKw} kWp (${calcs.panelQuantity} panels × ${selectedPanelWattageWp} Wp, ${calcs.panelConfiguration})`
      },
      {
        label: 'Panel Preference',
        value: panelPreferenceNote
      },
      {
        label: 'Engineering Margin',
        value: `${engineeringMarginPercent}% above minimum energy target`
      },
      {
        label: 'String Electrical Fit',
        value: `Cold Voc ${calcs.stringVocMax ?? '-'} V · Hot Vmp ${calcs.stringVmpHot ?? '-'} V · STC Vmp ${calcs.stringVmpMax ?? '-'} V within Maximum Power Point Tracker (MPPT) limits`
      },
      {
        label: 'Maximum Power Point Tracker (MPPT) Mapping',
        value: mpptMappingDescription
      },
      {
        label: 'Daily Net Production',
        value: `${calcs.estimatedDailyProductionKwh} kWh/day estimated`
      }
    ],
    protection: protectionAdequacyOk
      ? 'Each protection device is sized from calculated continuous current, then multiplied by the applicable International Electrotechnical Commission (IEC) / National Electrical Code (NEC) safety factor and rounded UP to the nearest standard rating that meets or exceeds the requirement.'
      : `Protection adequacy FAIL: ${
          protectionNotes.join(' ') ||
          'One or more selected ratings are below the calculated requirement. Do not mark this design CERTIFIED until corrected.'
        }`
  };

  const pvMarginNotes: string[] = [];
  if (!pvCurrentOk) {
    pvMarginNotes.push(
      `FAIL: Maximum Power Point Tracker (MPPT) operating current ${actualPvCurrentA.toFixed(1)} A exceeds the inverter limit ${maxPvCurrentA} A. Reduce parallel strings per MPPT or select an inverter with a higher PV input current rating.`
    );
  }
  if (!protectionAdequacyOk) {
    pvMarginNotes.push(...(protectionNotes.length ? protectionNotes : [
      'FAIL: Protection device rating is below the calculated requirement.'
    ]));
  }
  if (pvVoltageOk && voltageMarginV > 0 && voltageMarginV < 15) {
    pvMarginNotes.push(
      `Cold-weather open-circuit voltage (Voc) margin is only ${voltageMarginV.toFixed(1)} V below the inverter limit (${calcs.stringVocMax} V vs ${calcs.mpptVocLimit} V). Acceptable, but verify for extremely cold installation environments.`
    );
  } else if (pvVoltageOk && voltageMarginV >= 15) {
    pvMarginNotes.push(
      `Cold-weather open-circuit voltage (Voc) headroom of ${voltageMarginV.toFixed(1)} V provides comfortable margin to the inverter Voc limit.`
    );
  }
  if (pvCurrentOk && currentMarginA > 0 && currentMarginA < 5) {
    pvMarginNotes.push(
      `Maximum Power Point Tracker (MPPT) current margin is only ${currentMarginA.toFixed(1)} A. Do not add parallel strings without re-validating inverter PV current limits.`
    );
  } else if (pvCurrentOk && currentMarginA >= 5) {
    pvMarginNotes.push(
      `Maximum Power Point Tracker (MPPT) current headroom of ${currentMarginA.toFixed(1)} A is adequate for the published string layout.`
    );
  }
  if (hotVmpOk) {
    pvMarginNotes.push(
      `Hot-weather string maximum power voltage (Vmp ≈ ${calcs.stringVmpHot ?? calcs.stringVmpMax} V at ${SYSTEM_STANDARDS.maxCellTempC} °C cell temperature) operates within the inverter Maximum Power Point Tracker (MPPT) window (${calcs.mpptVmpMin}-${calcs.mpptVmpMax} V). Standard Test Condition (STC) string Vmp is ${calcs.stringVmpMax ?? '-'} V (8 × module Vmp at 25 °C) — use hot Vmp for tracking-window checks and STC Vmp for reference only.`
    );
  }
  pvMarginNotes.push(mpptMappingDescription);

  return {
    chemistryLabel: CHEMISTRY_LABELS[inputs.batteryType],
    topologyLabel: TOPOLOGY_LABELS[inputs.inverterType],
    installationTypeLabel: TOPOLOGY_LABELS[inputs.inverterType],
    safetyMarginPercent: Math.round((SYSTEM_STANDARDS.batteryEngineeringReserve - 1) * 100),
    futureExpansionPercent,
    ambientColdC: SYSTEM_STANDARDS.minDesignTempC,
    ambientHotC: SYSTEM_STANDARDS.maxCellTempC,
    energyFlow: {
      pvGenerationKwh: parseFloat(rawHarvestKwh.toFixed(2)),
      systemLossesKwh: parseFloat(systemLossesKwh.toFixed(2)),
      netEnergyAvailableKwh: parseFloat(netAvailable.toFixed(2)),
      customerConsumptionKwh: parseFloat(dailyConsumptionKwh.toFixed(2)),
      remainingReserveKwh: parseFloat(remainingReserveKwh.toFixed(2))
    },
    requiredArrayKwp: parseFloat(requiredArrayKwp.toFixed(2)),
    engineeringMarginPercent,
    confidenceScore,
    confidenceReasons: confidenceReasons.slice(0, 6),
    passport,
    overallStatus,
    voltageMarginV: parseFloat(voltageMarginV.toFixed(1)),
    currentMarginA: parseFloat(currentMarginA.toFixed(1)),
    powerMarginW: Math.round(powerMarginW),
    actualPvCurrentA: parseFloat(actualPvCurrentA.toFixed(1)),
    actualPvPowerW: Math.round(actualPvPowerW),
    maxPvCurrentA,
    maxPvPowerW,
    pvCurrentOk,
    protectionAdequacyOk,
    peakDemandDerivation,
    mpptMappingDescription,
    installedBatteryReservePercent,
    usableBatteryReservePercent,
    selectedPanelWattageWp,
    preferredPanelWattageWp,
    panelPreferenceNote,
    selectionJustifications,
    pvMarginNotes,
    stringElectricalChecks
  };
}

export function parseInverterReasonPoints(reason: string): {
  headline: string;
  items: JustificationRow[];
} {
  const text = (reason || '').trim();
  if (!text) return { headline: '', items: [] };

  const parts = text
    .split(/(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const headline = parts[0] || text;
  const items: JustificationRow[] = [];

  for (const part of parts.slice(1)) {
    const cleaned = part.replace(/\.$/, '').trim();
    const colon = cleaned.indexOf(':');
    if (colon > 0 && colon < 48) {
      items.push({
        label: cleaned.slice(0, colon).trim(),
        value: cleaned.slice(colon + 1).trim()
      });
    } else if (cleaned) {
      items.push({ label: 'Check', value: cleaned });
    }
  }

  return { headline, items };
}

export function getCableEngineeringRows(calcs: Calculations): {
  path: string;
  specification: string;
  requiredCurrentA: number;
  cableRatingA: number;
  cableLengthM: number;
  allowableDropPercent: number;
  utilizationPercent: number;
  voltageDropPercent: number;
  limitPercent: number;
  status: 'PASS' | 'REVIEW';
  lengthAssumed: boolean;
}[] {
  const cs = calcs.cableSizing;

  const rows = [
    {
      path: 'PV Array -> Inverter (DC)',
      specification: cs?.pvCableSize || '-',
      requiredCurrentA: cs?.pvDesignCurrentA ?? (calcs.stringIscMax || 0) * SYSTEM_STANDARDS.necBreakerMultiplier,
      cableRatingA: cs?.pvCableAmpacityA || cableAmpacityFromSizeString(cs?.pvCableSize),
      cableLengthM: cs?.pvCableLengthM ?? 20,
      allowableDropPercent: 2.0,
      voltageDropPercent: cs?.pvCableVoltageDropPercent || 0,
      limitPercent: 2.0,
      lengthAssumed: cs?.pvLengthAssumed ?? cs?.cableLengthsAssumed !== false
    },
    {
      path: 'Battery Bank -> Inverter (DC)',
      specification: cs?.batteryCableSize || '-',
      requiredCurrentA:
        cs?.batteryDesignCurrentA ??
        (calcs.batteryContinuousCurrentA || 0) * SYSTEM_STANDARDS.necBreakerMultiplier,
      cableRatingA:
        cs?.batteryCableAmpacityA || cableAmpacityFromSizeString(cs?.batteryCableSize),
      cableLengthM: cs?.batteryCableLengthM ?? 2,
      allowableDropPercent: 1.0,
      voltageDropPercent: cs?.batteryCableVoltageDropPercent || 0,
      limitPercent: 1.0,
      lengthAssumed: cs?.batteryLengthAssumed ?? cs?.cableLengthsAssumed !== false
    },
    {
      path: 'Inverter -> Distribution Board (AC)',
      specification: cs?.acCableSize || '-',
      requiredCurrentA:
        cs?.acDesignCurrentA ??
        ((calcs.inverterSizeKva * 1000) / SYSTEM_STANDARDS.acNominalVoltageV) *
          SYSTEM_STANDARDS.necBreakerMultiplier,
      cableRatingA: cs?.acCableAmpacityA || cableAmpacityFromSizeString(cs?.acCableSize),
      cableLengthM: cs?.acCableLengthM ?? 10,
      allowableDropPercent: 3.0,
      voltageDropPercent: cs?.acCableVoltageDropPercent || 0,
      limitPercent: 3.0,
      lengthAssumed: cs?.acLengthAssumed ?? cs?.cableLengthsAssumed !== false
    }
  ];

  return rows.map(r => {
    const utilizationPercent =
      r.cableRatingA > 0 ? Math.round((r.requiredCurrentA / r.cableRatingA) * 100) : 0;
    const status: 'PASS' | 'REVIEW' =
      utilizationPercent <= 100 && r.voltageDropPercent <= r.limitPercent ? 'PASS' : 'REVIEW';
    return {
      path: r.path,
      specification: r.specification,
      requiredCurrentA: parseFloat(r.requiredCurrentA.toFixed(1)),
      cableRatingA: r.cableRatingA,
      cableLengthM: r.cableLengthM,
      allowableDropPercent: r.allowableDropPercent,
      utilizationPercent,
      voltageDropPercent: r.voltageDropPercent,
      limitPercent: r.limitPercent,
      status,
      lengthAssumed: r.lengthAssumed
    };
  });
}
