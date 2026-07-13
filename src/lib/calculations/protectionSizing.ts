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
  };
}

export function sizeProtectionDevices(
  stringIscMax: number,
  stringVocMax: number,
  batteryVoltageNum: number,
  inverterPowerW: number,
  isCommercial: boolean = false
): ProtectionCalculationResult {
  const details: ProtectionDeviceDetail[] = [];

  const pvSafetyFactor = 1.5625;
  const rawPvFuseRating = stringIscMax * pvSafetyFactor;
  const standardFuseRatings = [10, 12, 15, 20, 25, 30, 40, 50];
  let pvFuseRating = standardFuseRatings[0];
  for (const rating of standardFuseRatings) {
    if (rawPvFuseRating <= rating) {
      pvFuseRating = rating;
      break;
    }
    pvFuseRating = rating;
  }
  const dcStringFuse = `${pvFuseRating}A 1000V DC Symmetrical gPV Fuse`;
  details.push({
    device: 'PV Array String Fuse',
    calculatedCurrentA: parseFloat(stringIscMax.toFixed(2)),
    requiredCurrentA: parseFloat(rawPvFuseRating.toFixed(2)),
    safetyFactor: pvSafetyFactor,
    selectedRating: dcStringFuse,
    nearestStandardRating: `${pvFuseRating}A`,
    codeStandard: 'NEC 690.8 / IEC 60269-6',
    justification: `Isc ${stringIscMax.toFixed(1)}A × 1.25 × 1.25 = ${rawPvFuseRating.toFixed(1)}A. Next available IEC standard rating selected.`
  });

  const dcStringIsolator = `${Math.max(pvFuseRating, 16)}A 1000V DC Load-Break Isolator`;
  details.push({
    device: 'PV DC Switch Isolator',
    calculatedCurrentA: parseFloat(stringIscMax.toFixed(2)),
    requiredCurrentA: parseFloat((stringIscMax * 1.25).toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: dcStringIsolator,
    nearestStandardRating: `${Math.max(pvFuseRating, 16)}A`,
    codeStandard: 'IEC 60947-3',
    justification: 'Provides safe manual disconnection of the PV array under load for maintenance and isolation.'
  });

  const dcStringSpd = `Type II 40kA DC SPD (${Math.ceil(stringVocMax / 100) * 100}V Uc)`;
  details.push({
    device: 'PV DC Surge Protection (SPD)',
    calculatedCurrentA: 0,
    requiredCurrentA: 0,
    safetyFactor: 1.0,
    selectedRating: dcStringSpd,
    nearestStandardRating: 'Type II 40kA',
    codeStandard: 'IEC 61643-31',
    justification: `Selected for string Voc ${stringVocMax}V cold-weather maximum. Protects inverter MPPT inputs from transient overvoltage.`
  });

  const maxInverterDcCurrent = inverterPowerW / (batteryVoltageNum * 0.96);
  const recommendedBatteryBreakerRating = maxInverterDcCurrent * 1.25;
  const standardBatteryBreakers = [63, 80, 100, 125, 160, 200, 250, 315, 400];
  let selectedBatteryBreaker = standardBatteryBreakers[0];
  for (const rating of standardBatteryBreakers) {
    if (recommendedBatteryBreakerRating <= rating) {
      selectedBatteryBreaker = rating;
      break;
    }
    selectedBatteryBreaker = rating;
  }

  const batteryFuse = `${selectedBatteryBreaker}A DC High-Speed Fuse (Type NH00)`;
  details.push({
    device: 'Battery Overcurrent Fuse',
    calculatedCurrentA: parseFloat(maxInverterDcCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedBatteryBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: batteryFuse,
    nearestStandardRating: `${selectedBatteryBreaker}A`,
    codeStandard: 'DIN NH00 / IEC 60269',
    justification: `Battery continuous draw ${maxInverterDcCurrent.toFixed(1)}A × 1.25 = ${recommendedBatteryBreakerRating.toFixed(1)}A. Next standard NH00 rating selected.`
  });

  const batteryBreaker = `${selectedBatteryBreaker}A 2-Pole High-Capacity DC MCB`;
  details.push({
    device: 'Battery String MCB / Isolator',
    calculatedCurrentA: parseFloat(maxInverterDcCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedBatteryBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: batteryBreaker,
    nearestStandardRating: `${selectedBatteryBreaker}A`,
    codeStandard: 'IEC 60947-2 (DC)',
    justification: 'Provides thermal-magnetic overload protection and lockable DC isolation of the battery bank.'
  });

  const maxAcOutputCurrent = inverterPowerW / 230;
  const recommendedAcBreakerRating = maxAcOutputCurrent * 1.25;
  const standardAcBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
  let selectedAcBreaker = standardAcBreakers[0];
  for (const rating of standardAcBreakers) {
    if (recommendedAcBreakerRating <= rating) {
      selectedAcBreaker = rating;
      break;
    }
    selectedAcBreaker = rating;
  }

  const acOutputBreaker = `${selectedAcBreaker}A 230V AC Double-Pole MCB Class C`;
  details.push({
    device: 'Inverter AC Output MCB',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(recommendedAcBreakerRating.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: acOutputBreaker,
    nearestStandardRating: `${selectedAcBreaker}A`,
    codeStandard: 'IEC 60898 / IEC 60947-2',
    justification: `AC output ${maxAcOutputCurrent.toFixed(1)}A × 1.25 = ${recommendedAcBreakerRating.toFixed(1)}A. Next standard Class C MCB rating selected.`
  });

  const leakageCurrentRating = isCommercial ? '100mA' : '30mA';
  const acRcdBreaker = `${selectedAcBreaker}A Double-Pole AC RCD, ${leakageCurrentRating} Type A`;
  details.push({
    device: 'AC Residual Current Device (RCD)',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    requiredCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    safetyFactor: 1.0,
    selectedRating: acRcdBreaker,
    nearestStandardRating: `${leakageCurrentRating} Type A`,
    codeStandard: 'IEC 61008 / IEC 61009',
    justification: `${leakageCurrentRating} Type A RCD selected for ${isCommercial ? 'commercial' : 'residential'} personnel and earth-fault protection.`
  });

  return {
    dcStringFuse,
    dcStringIsolator,
    dcStringSpd,
    batteryFuse,
    batteryBreaker,
    acOutputBreaker,
    acRcdBreaker,
    earthElectrode: `16mm x 1.2m Copper-Clad Steel Earth Rod`,
    distributionBoard: `IP65 Weatherproof Polycarbonate Box with DIN rail`,
    deviceDetails: details,
    calculationsRaw: {
      maxInverterDcCurrent: parseFloat(maxInverterDcCurrent.toFixed(1)),
      recommendedBatteryBreakerRating: parseFloat(recommendedBatteryBreakerRating.toFixed(1)),
      selectedBatteryBreakerRating: selectedBatteryBreaker,
      maxAcOutputCurrent: parseFloat(maxAcOutputCurrent.toFixed(1)),
      recommendedAcBreakerRating: parseFloat(recommendedAcBreakerRating.toFixed(1)),
      selectedAcBreakerRating: selectedAcBreaker
    }
  };
}
