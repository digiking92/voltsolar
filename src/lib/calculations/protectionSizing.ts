export interface ProtectionDeviceDetail {
  device: string;
  calculatedCurrentA: number;
  safetyFactor: number;
  selectedRating: string;
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
    maxAcOutputCurrent: number;
    recommendedAcBreakerRating: number;
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

  // 1. PV DC String Fuse Sizing (Isc * 1.25 * 1.25)
  const pvCalculatedCurrent = stringIscMax;
  const pvSafetyFactor = 1.5625; // 1.25 * 1.25
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
    calculatedCurrentA: parseFloat(pvCalculatedCurrent.toFixed(2)),
    safetyFactor: pvSafetyFactor,
    selectedRating: dcStringFuse,
    justification: `Based on PV String Isc (${stringIscMax}A) × 1.25 (Continuous load multiplier) × 1.25 (Irradiance enhancement safety factor) = ${rawPvFuseRating.toFixed(2)}A target. Sized to closest standard gPV fuse.`
  });

  // 2. PV DC Switch Isolator Sizing
  // Rating must be > Maximum PV Voltage and Current must be > Maximum PV Current (String Isc * 1.25)
  const dcIsolatorVoltage = stringVocMax > 500 ? 1000 : 500;
  const dcIsolatorCurrentCalculated = stringIscMax * 1.25;
  const standardDCIsolators = [16, 25, 32, 40, 63];
  let selectedDcIsolatorCurrent = standardDCIsolators[0];
  for (const rating of standardDCIsolators) {
    if (dcIsolatorCurrentCalculated <= rating) {
      selectedDcIsolatorCurrent = rating;
      break;
    }
    selectedDcIsolatorCurrent = rating;
  }
  const dcStringIsolator = `${selectedDcIsolatorCurrent}A ${dcIsolatorVoltage}V DC 4-Pole Rotary Isolator Switch`;
  details.push({
    device: 'PV DC Switch Isolator',
    calculatedCurrentA: parseFloat(stringIscMax.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: dcStringIsolator,
    justification: `Sized with 25% safety margin on maximum string Isc (${stringIscMax}A) and rated for worst-case cold open-circuit voltage String Voc (${stringVocMax}V).`
  });

  // 3. DC Surge Protection Device (SPD)
  let spdVoltage = 1000;
  if (stringVocMax <= 150) spdVoltage = 150;
  else if (stringVocMax <= 500) spdVoltage = 500;
  const dcStringSpd = `Type II DC Surge Protection Device (SPD) Rated ${spdVoltage}V DC`;
  details.push({
    device: 'PV DC Surge Protection',
    calculatedCurrentA: 0,
    safetyFactor: 1.0,
    selectedRating: dcStringSpd,
    justification: `Type II surge protection to clamp overvoltages and lightning induced surges up to ${spdVoltage}V DC.`
  });

  // 4. Battery Overcurrent Fuse and Breaker Sizing
  // Battery Current = Inverter Power / Battery Voltage
  const maxInverterDcCurrent = inverterPowerW / batteryVoltageNum;
  const recommendedBatteryBreakerRating = maxInverterDcCurrent * 1.25;

  const standardBatteryBreakers = [40, 50, 63, 80, 100, 125, 160, 200, 250, 300];
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
    safetyFactor: 1.25,
    selectedRating: batteryFuse,
    justification: `Sized for max DC battery draw from inverter (${maxInverterDcCurrent.toFixed(1)}A) × 125% continuous rating factor = ${recommendedBatteryBreakerRating.toFixed(1)}A. Employs ultra-fast NH00 semiconductor response.`
  });

  const batteryBreaker = `${selectedBatteryBreaker}A 2-Pole High-Capacity DC MCB`;
  details.push({
    device: 'Battery String MCB / Isolator',
    calculatedCurrentA: parseFloat(maxInverterDcCurrent.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: batteryBreaker,
    justification: `Sized for inverter maximum discharge current with 25% overhead. Provides thermal-magnetic overload protection and physical DC isolation.`
  });

  // 5. AC Output Sizing (Assuming single-phase 230V AC output, power factor 1.0)
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
    device: 'Inverter AC MCB',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    safetyFactor: 1.25,
    selectedRating: acOutputBreaker,
    justification: `Sized based on AC maximum power output current (${maxAcOutputCurrent.toFixed(1)}A) × 125% safety overhead = ${recommendedAcBreakerRating.toFixed(1)}A. Class C trip curve handles high initial reactive loads.`
  });

  // 6. AC Residual Leakage Breaker (RCD)
  // Automatically recommend 30mA for residential or 100mA for commercial applications
  const leakageCurrentRating = isCommercial ? '100mA' : '30mA';
  const acRcdBreaker = `${selectedAcBreaker}A Double-Pole AC RCD, ${leakageCurrentRating} Type A`;
  details.push({
    device: 'AC Residual Leakage (RCD)',
    calculatedCurrentA: parseFloat(maxAcOutputCurrent.toFixed(2)),
    safetyFactor: 1.0,
    selectedRating: acRcdBreaker,
    justification: `Provides critical personnel electrocution and earth fault fire protection. Sized at ${leakageCurrentRating} threshold based on project classification.`
  });

  // 7. Grounding and Enclosure Specs
  const earthElectrode = `16mm x 1.2m Copper-Clad Steel Earth Rod`;
  const distributionBoard = `IP65 Weatherproof Polycarbonate Box with DIN rail`;

  return {
    dcStringFuse,
    dcStringIsolator,
    dcStringSpd,
    batteryFuse,
    batteryBreaker,
    acOutputBreaker,
    acRcdBreaker,
    earthElectrode,
    distributionBoard,
    deviceDetails: details,
    calculationsRaw: {
      maxInverterDcCurrent: parseFloat(maxInverterDcCurrent.toFixed(1)),
      recommendedBatteryBreakerRating: parseFloat(recommendedBatteryBreakerRating.toFixed(1)),
      maxAcOutputCurrent: parseFloat(maxAcOutputCurrent.toFixed(1)),
      recommendedAcBreakerRating: parseFloat(recommendedAcBreakerRating.toFixed(1))
    }
  };
}
