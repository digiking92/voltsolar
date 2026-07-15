export interface ProtectionDeviceDetail {
  device: string;
  calculatedCurrentA: number;
  requiredCurrentA: number;
  safetyFactor: number;
  selectedRating: string;
  nearestStandardRating: string;
  codeStandard: string;
  justification: string;
}

export interface ProtectionCalculationResult {
  dcStringFuse: string;
  dcStringIsolator: string;
  dcStringSpd: string;
  batteryFuse: string;
  batteryBreaker: string;
  acOutputBreaker: string;
  acRcdBreaker: string;
  earthElectrode: string;
  distributionBoard: string;
  deviceDetails: ProtectionDeviceDetail[];
  calculationsRaw: {
    maxInverterDcCurrent: number;
    recommendedBatteryBreakerRating: number;
    selectedBatteryBreakerRating: number;
    maxAcOutputCurrent: number;
    recommendedAcBreakerRating: number;
    selectedAcBreakerRating: number;
    acPhases: 1 | 3;
  };
}

function nextStandardRating(requiredA: number, ratings: number[]): number {
  for (const rating of ratings) {
    if (requiredA <= rating) return rating;
  }
  return ratings[ratings.length - 1];
}

/** Line current for inverter AC output (1ϕ 230V or 3ϕ 400V). */
export function inverterAcLineCurrentA(
  inverterPowerW: number,
  phases: 1 | 3
): number {
  if (phases === 3) {
    // I_L = P / (√3 × U_L) with U_L = 400 V
    return inverterPowerW / (Math.sqrt(3) * 400);
  }
  return inverterPowerW / 230;
}

/**
 * Protection / enclosure schedule.
 * PV fuses are sized PER STRING (module Isc), never on paralleled array Isc.
 */
export function sizeProtectionDevices(
  moduleIscA: number,
  parallelStringCount: number,
  maxSeriesFuseA: number,
  stringVocMax: number,
  batteryVoltageNum: number,
  inverterPowerW: number,
  phases: 1 | 3 = 1,
  isCommercial: boolean = false
): ProtectionCalculationResult {
  const details: ProtectionDeviceDetail[] = [];

  // NEC 690.8 / IEC — per-string fuse rating from ONE module string Isc
  const pvSafetyFactor = 1.5625; // 1.25 × 1.25 continuous
  const rawPvFuseRating = moduleIscA * pvSafetyFactor;
  const standardFuseRatings = [10, 12, 15, 20, 25, 30, 40, 50];
  let pvFuseRating = nextStandardRating(rawPvFuseRating, standardFuseRatings);
  // Must not exceed module series-fuse rating
  if (pvFuseRating > maxSeriesFuseA) {
    pvFuseRating =
      standardFuseRatings.filter(r => r <= maxSeriesFuseA).pop() || maxSeriesFuseA;
  }

  let dcStringFuse: string;
  if (parallelStringCount < 2) {
    dcStringFuse = `Not required for single string (use ${Math.max(pvFuseRating, 16)}A DC isolator). Max module series fuse ${maxSeriesFuseA}A`;
    details.push({
      device: 'PV String Fuse',
      calculatedCurrentA: parseFloat(moduleIscA.toFixed(2)),
      requiredCurrentA: parseFloat(rawPvFuseRating.toFixed(2)),
      safetyFactor: pvSafetyFactor,
      selectedRating: dcStringFuse,
      nearestStandardRating: 'N/A (1 string)',
      codeStandard: 'NEC 690.9 / IEC 62548',
      justification: `Single string into the inverter: string fusing is typically not required. Provide DC isolation. Module max series fuse = ${maxSeriesFuseA}A.`
    });
  } else {
    dcStringFuse = `${pvFuseRating}A 1000V DC gPV fuse × ${parallelStringCount} (one per string)`;
    details.push({
      device: 'PV String Fuse (per string)',
      calculatedCurrentA: parseFloat(moduleIscA.toFixed(2)),
      requiredCurrentA: parseFloat(rawPvFuseRating.toFixed(2)),
      safetyFactor: pvSafetyFactor,
      selectedRating: dcStringFuse,
      nearestStandardRating: `${pvFuseRating}A`,
      codeStandard: 'NEC 690.8 / IEC 60269-6',
      justification: `Per-string Isc ${moduleIscA.toFixed(1)}A × 1.25 × 1.25 = ${rawPvFuseRating.toFixed(1)}A, capped ≤ module max series fuse ${maxSeriesFuseA}A. Fuse EACH of ${parallelStringCount} strings — never one fuse on combined array Isc.`
    });
  }

  const isolatorRating = Math.max(pvFuseRating, 16, Math.ceil(moduleIscA * 1.25));
  const isolatorCount =
    parallelStringCount >= 2 ? `${isolatorRating}A × ${parallelStringCount} (or combiner + master)` : `${isolatorRating}A`;
  const dcStringIsolator = `${isolatorCount} 1000V DC Load-Break Isolator`;
  details.push({
    device: 'PV DC Switch Isolator',
    calculatedCurrentA: parseFloat(moduleIscA.toFixed(2)),
    requiredCurrentA: parseFloat((moduleIscA * 1.25).toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: dcStringIsolator,
    nearestStandardRating: `${isolatorRating}A`,
    codeStandard: 'IEC 60947-3',
    justification: `Rated for string Voc ${stringVocMax.toFixed(0)}V cold max and string operating current. Provides safe manual disconnection for maintenance.`
  });

  const dcStringSpd = `Type II 40kA DC SPD (${Math.ceil(stringVocMax / 100) * 100}V Uc) in DCDB`;
  details.push({
    device: 'PV DC Surge Protection (SPD)',
    calculatedCurrentA: 0,
    requiredCurrentA: 0,
    safetyFactor: 1.0,
    selectedRating: dcStringSpd,
    nearestStandardRating: 'Type II 40kA',
    codeStandard: 'IEC 61643-31',
    justification: `Selected for string Voc ${stringVocMax.toFixed(0)}V cold-weather maximum. Mount in DCDB near inverter MPPT inputs.`
  });

  const maxInverterDcCurrent = inverterPowerW / (batteryVoltageNum * 0.96);
  const recommendedBatteryBreakerRating = maxInverterDcCurrent * 1.25;
  const standardBatteryBreakers = [63, 80, 100, 125, 160, 200, 250, 315, 400];
  const selectedBatteryBreaker = nextStandardRating(
    recommendedBatteryBreakerRating,
    standardBatteryBreakers
  );

  const batteryFuse = `${selectedBatteryBreaker}A DC NH00 / Class T battery fuse`;
  details.push({
    device: 'Battery Overcurrent Fuse',
    calculatedCurrentA: parseFloat(maxInverterDcCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedBatteryBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: batteryFuse,
    nearestStandardRating: `${selectedBatteryBreaker}A`,
    codeStandard: 'DIN NH00 / IEC 60269',
    justification: `Inverter DC bus draw ~${maxInverterDcCurrent.toFixed(1)}A × 1.25. Place fuse within ~300 mm of battery positive terminal.`
  });

  const batteryBreaker = `${selectedBatteryBreaker}A 2-Pole DC MCB / battery isolator`;
  details.push({
    device: 'Battery String MCB / Isolator',
    calculatedCurrentA: parseFloat(maxInverterDcCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedBatteryBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: batteryBreaker,
    nearestStandardRating: `${selectedBatteryBreaker}A`,
    codeStandard: 'IEC 60947-2 (DC)',
    justification: 'Thermal-magnetic overload protection and lockable DC isolation of the battery bank (coordinate with BMS if supplied).'
  });

  const maxAcOutputCurrent = inverterAcLineCurrentA(inverterPowerW, phases);
  const recommendedAcBreakerRating = maxAcOutputCurrent * 1.25;
  const standardAcBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
  const selectedAcBreaker = nextStandardRating(
    recommendedAcBreakerRating,
    standardAcBreakers
  );

  const poleLabel = phases === 3 ? '3-Pole / 4-Pole' : 'Double-Pole';
  const acVoltageLabel = phases === 3 ? '400V 3ϕ' : '230V 1ϕ';
  const acOutputBreaker = `${selectedAcBreaker}A ${acVoltageLabel} ${poleLabel} MCB Class C`;
  details.push({
    device: 'Inverter AC Output MCB (ACDB)',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedAcBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: acOutputBreaker,
    nearestStandardRating: `${selectedAcBreaker}A`,
    codeStandard: 'IEC 60898 / IEC 60947-2',
    justification:
      phases === 3
        ? `3-phase line current I = P/(√3×400) = ${maxAcOutputCurrent.toFixed(1)}A × 1.25 → ${recommendedAcBreakerRating.toFixed(1)}A.`
        : `1-phase current I = P/230 = ${maxAcOutputCurrent.toFixed(1)}A × 1.25 → ${recommendedAcBreakerRating.toFixed(1)}A.`
  });

  const leakageCurrentRating = isCommercial ? '100mA' : '30mA';
  const acRcdBreaker = `${selectedAcBreaker}A ${poleLabel} RCD/RCBO, ${leakageCurrentRating} Type A`;
  details.push({
    device: 'AC Residual Current Device (ACDB)',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    safetyFactor: 1.0,
    selectedRating: acRcdBreaker,
    nearestStandardRating: `${leakageCurrentRating} Type A`,
    codeStandard: 'IEC 61008 / IEC 61009',
    justification: `${leakageCurrentRating} Type A for ${isCommercial ? 'commercial' : 'residential'} earth-fault protection on inverter AC output.`
  });

  details.push({
    device: 'AC Type II SPD (ACDB)',
    calculatedCurrentA: 0,
    requiredCurrentA: 0,
    safetyFactor: 1.0,
    selectedRating: phases === 3 ? 'Type II 40kA 3P+N 400V SPD' : 'Type II 40kA 1P+N 230V SPD',
    nearestStandardRating: 'Type II 40kA',
    codeStandard: 'IEC 61643-11',
    justification: 'Surge protection on ACDB supply / inverter output side per IEC installation practice.'
  });

  return {
    dcStringFuse,
    dcStringIsolator,
    dcStringSpd,
    batteryFuse,
    batteryBreaker,
    acOutputBreaker,
    acRcdBreaker,
    earthElectrode: '16 mm × 1.2 m copper-clad earth electrode ≤10 Ω (verify on site)',
    distributionBoard:
      'Separate DCDB (string fuses/isolator/SPD) + ACDB (MCB/RCD/SPD) — IP65 outdoor-rated DIN enclosures',
    deviceDetails: details,
    calculationsRaw: {
      maxInverterDcCurrent: parseFloat(maxInverterDcCurrent.toFixed(1)),
      recommendedBatteryBreakerRating: parseFloat(recommendedBatteryBreakerRating.toFixed(1)),
      selectedBatteryBreakerRating: selectedBatteryBreaker,
      maxAcOutputCurrent: parseFloat(maxAcOutputCurrent.toFixed(1)),
      recommendedAcBreakerRating: parseFloat(recommendedAcBreakerRating.toFixed(1)),
      selectedAcBreakerRating: selectedAcBreaker,
      acPhases: phases
    }
  };
}
