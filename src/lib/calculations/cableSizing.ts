import { SYSTEM_STANDARDS, COPPER_CABLE_SPECS, findRequiredCableSize } from './engineeringStandards';

export interface CableSizingResult {
  pvCableSize: string;
  pvCableVoltageDropPercent: number;
  batteryCableSize: string;
  batteryCableVoltageDropPercent: number;
  acCableSize: string;
  acCableVoltageDropPercent: number;
  earthCableSize: string;
  calculationsRaw: {
    pvCableAreaMm2: number;
    batteryCableAreaMm2: number;
    acCableAreaMm2: number;
  };
}

export function sizeSystemCables(
  stringIscMax: number,
  stringVmpMax: number,
  maxInverterDcCurrent: number,
  batteryVoltageNum: number,
  maxAcOutputCurrent: number
): CableSizingResult {
  const resistivity = SYSTEM_STANDARDS.copperResistivity; // 1.72e-8 Ω·m

  // Default installation routing distances in meters (standard residential layout assumptions)
  const pvDistanceM = 20;     // Panels on roof to inverter
  const batteryDistanceM = 2; // Battery adjacent to inverter (must be short to minimize voltage drop)
  const acDistanceM = 10;     // Inverter to main distribution panel
  const earthDistanceM = 5;

  // 1. PV DC String Cable Sizing
  // Criteria 1: Amplicity (continuous current * 1.25 margin)
  const pvContinuousCurrent = stringIscMax;
  const pvDesignCurrent = pvContinuousCurrent * SYSTEM_STANDARDS.inverterSafetyFactor;
  const pvMinAreaByCurrent = findRequiredCableSize(pvDesignCurrent);

  // Criteria 2: Voltage drop (target drop <= 2% on PV string)
  // V_drop_limit = 2% of String Vmp
  const pvAllowedDropV = stringVmpMax * SYSTEM_STANDARDS.maxCableVoltageDropPv;
  // A_min = (2 * I * L * resistivity) / V_drop
  // Since resistivity is in ohm-meters and Area in m², let's convert Area to mm²:
  // A_mm2 = (2 * I * L * resistivity_copper * 10^6) / V_drop
  // = (2 * I * L * 0.0172) / V_drop
  const pvMinAreaByDrop = pvAllowedDropV > 0
    ? (2 * pvContinuousCurrent * pvDistanceM * 0.0172) / pvAllowedDropV
    : 4.0;

  const pvRequiredArea = Math.max(4.0, pvMinAreaByCurrent, pvMinAreaByDrop); // Minimum 4mm² for mechanical strength in PV
  const pvSelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= pvRequiredArea) || COPPER_CABLE_SPECS[1]; // default 4mm²
  
  // Calculate actual voltage drop percent for selected cable
  const pvActualDropV = (2 * pvContinuousCurrent * pvDistanceM * 0.0172) / pvSelectedCable.crossSectionMm2;
  const pvActualDropPercent = stringVmpMax > 0 ? (pvActualDropV / stringVmpMax) * 100 : 0;


  // 2. Battery DC Cable Sizing
  // High current path! Voltage drop limit is 1% of battery bank voltage
  const batteryContinuousCurrent = maxInverterDcCurrent;
  const batteryDesignCurrent = batteryContinuousCurrent * SYSTEM_STANDARDS.inverterSafetyFactor;
  const batteryMinAreaByCurrent = findRequiredCableSize(batteryDesignCurrent);

  const batteryAllowedDropV = batteryVoltageNum * SYSTEM_STANDARDS.maxCableVoltageDropBattery;
  const batteryMinAreaByDrop = batteryAllowedDropV > 0
    ? (2 * batteryContinuousCurrent * batteryDistanceM * 0.0172) / batteryAllowedDropV
    : 16.0;

  const batteryRequiredArea = Math.max(16.0, batteryMinAreaByCurrent, batteryMinAreaByDrop); // Minimum 16mm² for battery link
  const batterySelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= batteryRequiredArea) || COPPER_CABLE_SPECS[4]; // default 16mm²

  const batteryActualDropV = (2 * batteryContinuousCurrent * batteryDistanceM * 0.0172) / batterySelectedCable.crossSectionMm2;
  const batteryActualDropPercent = (batteryActualDropV / batteryVoltageNum) * 100;


  // 3. AC Output Cable Sizing
  // Voltage drop limit is 3% of 230V
  const acContinuousCurrent = maxAcOutputCurrent;
  const acDesignCurrent = acContinuousCurrent * SYSTEM_STANDARDS.inverterSafetyFactor;
  const acMinAreaByCurrent = findRequiredCableSize(acDesignCurrent);

  const acAllowedDropV = 230 * SYSTEM_STANDARDS.maxCableVoltageDropAc; // 3% drop limit
  const acMinAreaByDrop = (2 * acContinuousCurrent * acDistanceM * 0.0172) / acAllowedDropV;

  const acRequiredArea = Math.max(2.5, acMinAreaByCurrent, acMinAreaByDrop); // Minimum 2.5mm² for standard AC mains
  const acSelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= acRequiredArea) || COPPER_CABLE_SPECS[0]; // default 2.5mm²

  const acActualDropV = (2 * acContinuousCurrent * acDistanceM * 0.0172) / acSelectedCable.crossSectionMm2;
  const acActualDropPercent = (acActualDropV / 230) * 100;


  // 4. Earth ground cable sizing (grounding wire typically sized relative to AC conductors)
  let earthCableSizeMm2 = 6;
  if (batterySelectedCable.crossSectionMm2 >= 35) {
    earthCableSizeMm2 = 16;
  } else if (batterySelectedCable.crossSectionMm2 >= 16) {
    earthCableSizeMm2 = 10;
  }

  return {
    pvCableSize: `${pvSelectedCable.crossSectionMm2.toFixed(1)} mm² Single-Core PV1-F Copper Solar Cable`,
    pvCableVoltageDropPercent: parseFloat(pvActualDropPercent.toFixed(2)),
    batteryCableSize: `${batterySelectedCable.crossSectionMm2.toFixed(1)} mm² Flex-Core Double-Insulated Copper Welding Cable`,
    batteryCableVoltageDropPercent: parseFloat(batteryActualDropPercent.toFixed(2)),
    acCableSize: `${acSelectedCable.crossSectionMm2.toFixed(1)} mm² Multi-Strand Copper Twin & Earth Cable`,
    acCableVoltageDropPercent: parseFloat(acActualDropPercent.toFixed(2)),
    earthCableSize: `${earthCableSizeMm2.toFixed(1)} mm² Yellow/Green Copper Grounding Conductor`,
    calculationsRaw: {
      pvCableAreaMm2: pvSelectedCable.crossSectionMm2,
      batteryCableAreaMm2: batterySelectedCable.crossSectionMm2,
      acCableAreaMm2: acSelectedCable.crossSectionMm2
    }
  };
}
