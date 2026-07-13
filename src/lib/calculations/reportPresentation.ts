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
}

const CHEMISTRY_LABELS: Record<BatteryType, string> = {
  lithium: 'LiFePO4',
  tubular: 'Tubular Lead-Acid',
  agm: 'AGM Lead-Acid',
  gel: 'Gel Lead-Acid'
};

const TOPOLOGY_LABELS: Record<InverterType, string> = {
  auto: 'Hybrid (Auto-Selected)',
  hybrid: 'Hybrid',
  off_grid: 'Off-Grid',
  grid_tie: 'Grid-Tie'
};

function cableAmpacityFromSizeString(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*mm/);
  if (!match) return 0;
  const area = parseFloat(match[1]);
  const found =
    COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 === area) ||
    COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= area);
  return found?.maxCurrentA ?? 0;
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
  const voltageMarginV = Math.max(0, (calcs.mpptVocLimit || 0) - (calcs.stringVocMax || 0));
  const currentMarginA = Math.max(0, maxPvCurrentA - actualPvCurrentA);
  const powerMarginW = Math.max(0, maxPvPowerW - actualPvPowerW);

  // Confidence score: start 100, deduct for warnings / tight margins
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
  if (futureExpansionPercent < 15) {
    confidenceScore -= 5;
    confidenceReasons.push('Future expansion headroom is limited (<15%).');
  }
  if (remainingReserveKwh < 0) {
    confidenceScore -= 10;
    confidenceReasons.push('Daily PV net energy is below customer consumption.');
  } else if (remainingReserveKwh < dailyConsumptionKwh * 0.1) {
    confidenceScore -= 4;
    confidenceReasons.push('Daily energy reserve margin is thin (<10% of consumption).');
  }
  if (voltageMarginV < 20) {
    confidenceScore -= 3;
    confidenceReasons.push('Cold-weather Voc margin to inverter limit is narrow.');
  }
  if (currentMarginA < 2 && maxPvCurrentA > 0) {
    confidenceScore -= 3;
    confidenceReasons.push('MPPT current headroom is narrow.');
  }
  confidenceScore = Math.max(55, Math.min(100, Math.round(confidenceScore)));
  if (confidenceReasons.length === 0) {
    confidenceReasons.push('No warnings. All hard electrical and capacity checks passed.');
  }

  const cablePass =
    (calcs.cableSizing?.pvCableVoltageDropPercent ?? 99) <= 2.0 &&
    (calcs.cableSizing?.batteryCableVoltageDropPercent ?? 99) <= 1.0 &&
    (calcs.cableSizing?.acCableVoltageDropPercent ?? 99) <= 3.0;

  const passport: DesignPassportItem[] = [
    { label: 'Battery Bank Design', status: 'PASS' },
    {
      label: 'PV Array Design',
      status: calcs.panelSizingCompatibilityOk === false ? 'FAIL' : remainingReserveKwh < 0 ? 'REVIEW' : 'PASS'
    },
    { label: 'Inverter Compatibility', status: 'PASS' },
    { label: 'Protection Design', status: calcs.protectionSchedule?.deviceDetails?.length ? 'PASS' : 'REVIEW' },
    { label: 'Cable Design', status: cablePass ? 'PASS' : 'REVIEW' },
    { label: 'Voltage Validation', status: voltageMarginV >= 0 && calcs.panelSizingCompatibilityOk !== false ? 'PASS' : 'FAIL' },
    { label: 'Current Validation', status: currentMarginA >= 0 ? 'PASS' : 'FAIL' },
    { label: 'Power Validation', status: powerMarginW >= 0 ? 'PASS' : 'FAIL' }
  ];

  if (dangerCount > 0) {
    passport.forEach(p => {
      if (p.status === 'PASS') p.status = 'REVIEW';
    });
  }

  const overallStatus = passport.every(p => p.status === 'PASS') && confidenceScore >= 85
    ? 'CERTIFIED'
    : 'REVIEW REQUIRED';

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
    confidenceReasons: confidenceReasons.slice(0, 4),
    passport,
    overallStatus,
    voltageMarginV: parseFloat(voltageMarginV.toFixed(1)),
    currentMarginA: parseFloat(currentMarginA.toFixed(1)),
    powerMarginW: Math.round(powerMarginW),
    actualPvCurrentA: parseFloat(actualPvCurrentA.toFixed(1)),
    actualPvPowerW: Math.round(actualPvPowerW),
    maxPvCurrentA,
    maxPvPowerW,
  };
}

export function getCableEngineeringRows(calcs: Calculations): {
  path: string;
  specification: string;
  requiredCurrentA: number;
  cableRatingA: number;
  utilizationPercent: number;
  voltageDropPercent: number;
  limitPercent: number;
  status: 'PASS' | 'REVIEW';
}[] {
  const pvCurrent = (calcs.stringIscMax || 0) * SYSTEM_STANDARDS.necBreakerMultiplier;
  const battCurrent = (calcs.batteryContinuousCurrentA || 0) * SYSTEM_STANDARDS.necBreakerMultiplier;
  const acCurrent =
    ((calcs.inverterSizeKva * 1000) / SYSTEM_STANDARDS.acNominalVoltageV) *
    SYSTEM_STANDARDS.necBreakerMultiplier;

  const rows = [
    {
      path: 'PV Array → Inverter (DC)',
      specification: calcs.cableSizing?.pvCableSize || '—',
      requiredCurrentA: pvCurrent,
      cableRatingA: calcs.cableSizing?.pvCableAmpacityA || cableAmpacityFromSizeString(calcs.cableSizing?.pvCableSize),
      voltageDropPercent: calcs.cableSizing?.pvCableVoltageDropPercent || 0,
      limitPercent: 2.0
    },
    {
      path: 'Battery Bank → Inverter (DC)',
      specification: calcs.cableSizing?.batteryCableSize || '—',
      requiredCurrentA: battCurrent,
      cableRatingA:
        calcs.cableSizing?.batteryCableAmpacityA ||
        cableAmpacityFromSizeString(calcs.cableSizing?.batteryCableSize),
      voltageDropPercent: calcs.cableSizing?.batteryCableVoltageDropPercent || 0,
      limitPercent: 1.0
    },
    {
      path: 'Inverter → Distribution Board (AC)',
      specification: calcs.cableSizing?.acCableSize || '—',
      requiredCurrentA: acCurrent,
      cableRatingA: calcs.cableSizing?.acCableAmpacityA || cableAmpacityFromSizeString(calcs.cableSizing?.acCableSize),
      voltageDropPercent: calcs.cableSizing?.acCableVoltageDropPercent || 0,
      limitPercent: 3.0
    }
  ];

  return rows.map(r => {
    const utilizationPercent =
      r.cableRatingA > 0 ? Math.round((r.requiredCurrentA / r.cableRatingA) * 100) : 0;
    const status: 'PASS' | 'REVIEW' =
      utilizationPercent <= 100 && r.voltageDropPercent <= r.limitPercent ? 'PASS' : 'REVIEW';
    return {
      ...r,
      requiredCurrentA: parseFloat(r.requiredCurrentA.toFixed(1)),
      utilizationPercent,
      status
    };
  });
}
