import { SYSTEM_STANDARDS, COPPER_CABLE_SPECS, findRequiredCableSize } from './engineeringStandards';

export interface CableSizingResult {
  pvCableSize: string;
  pvCableVoltageDropPercent: number;
  pvCableAmpacityA: number;
  pvDesignCurrentA: number;
  batteryCableSize: string;
  batteryCableVoltageDropPercent: number;
  batteryCableAmpacityA: number;
  batteryDesignCurrentA: number;
  acCableSize: string;
  acCableVoltageDropPercent: number;
  acCableAmpacityA: number;
  acDesignCurrentA: number;
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
  const pvDistanceM = 20;
  const batteryDistanceM = 2;
  const acDistanceM = 10;

  const pvContinuousCurrent = stringIscMax;
  const pvDesignCurrent = pvContinuousCurrent * SYSTEM_STANDARDS.necBreakerMultiplier;
  const pvMinAreaByCurrent = findRequiredCableSize(pvDesignCurrent);

  const pvAllowedDropV = stringVmpMax * SYSTEM_STANDARDS.maxCableVoltageDropPv;
  const pvMinAreaByDrop = pvAllowedDropV > 0
    ? (2 * pvContinuousCurrent * pvDistanceM * 0.0172) / pvAllowedDropV
    : 4.0;

  const pvRequiredArea = Math.max(4.0, pvMinAreaByCurrent, pvMinAreaByDrop);
  const pvSelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= pvRequiredArea) || COPPER_CABLE_SPECS[1];

  const pvActualDropV = (2 * pvContinuousCurrent * pvDistanceM * 0.0172) / pvSelectedCable.crossSectionMm2;
  const pvActualDropPercent = stringVmpMax > 0 ? (pvActualDropV / stringVmpMax) * 100 : 0;

  const batteryContinuousCurrent = maxInverterDcCurrent;
  const batteryDesignCurrent = batteryContinuousCurrent * SYSTEM_STANDARDS.necBreakerMultiplier;
  const batteryMinAreaByCurrent = findRequiredCableSize(batteryDesignCurrent);

  const batteryAllowedDropV = batteryVoltageNum * SYSTEM_STANDARDS.maxCableVoltageDropBattery;
  const batteryMinAreaByDrop = batteryAllowedDropV > 0
    ? (2 * batteryContinuousCurrent * batteryDistanceM * 0.0172) / batteryAllowedDropV
    : 16.0;

  const batteryRequiredArea = Math.max(16.0, batteryMinAreaByCurrent, batteryMinAreaByDrop);
  const batterySelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= batteryRequiredArea) || COPPER_CABLE_SPECS[4];

  const batteryActualDropV = (2 * batteryContinuousCurrent * batteryDistanceM * 0.0172) / batterySelectedCable.crossSectionMm2;
  const batteryActualDropPercent = (batteryActualDropV / batteryVoltageNum) * 100;

  const acContinuousCurrent = maxAcOutputCurrent;
  const acDesignCurrent = acContinuousCurrent * SYSTEM_STANDARDS.necBreakerMultiplier;
  const acMinAreaByCurrent = findRequiredCableSize(acDesignCurrent);

  const acAllowedDropV = SYSTEM_STANDARDS.acNominalVoltageV * SYSTEM_STANDARDS.maxCableVoltageDropAc;
  const acMinAreaByDrop = (2 * acContinuousCurrent * acDistanceM * 0.0172) / acAllowedDropV;

  const acRequiredArea = Math.max(2.5, acMinAreaByCurrent, acMinAreaByDrop);
  const acSelectedCable = COPPER_CABLE_SPECS.find(c => c.crossSectionMm2 >= acRequiredArea) || COPPER_CABLE_SPECS[0];

  const acActualDropV = (2 * acContinuousCurrent * acDistanceM * 0.0172) / acSelectedCable.crossSectionMm2;
  const acActualDropPercent = (acActualDropV / SYSTEM_STANDARDS.acNominalVoltageV) * 100;

  let earthCableSizeMm2 = 6;
  if (batterySelectedCable.crossSectionMm2 >= 35) {
    earthCableSizeMm2 = 16;
  } else if (batterySelectedCable.crossSectionMm2 >= 16) {
    earthCableSizeMm2 = 10;
  }

  return {
    pvCableSize: `${pvSelectedCable.crossSectionMm2.toFixed(1)} mm² Single-Core PV1-F Copper Solar Cable`,
    pvCableVoltageDropPercent: parseFloat(pvActualDropPercent.toFixed(2)),
    pvCableAmpacityA: pvSelectedCable.maxCurrentA,
    pvDesignCurrentA: parseFloat(pvDesignCurrent.toFixed(1)),
    batteryCableSize: `${batterySelectedCable.crossSectionMm2.toFixed(1)} mm² Flex-Core Double-Insulated Copper Welding Cable`,
    batteryCableVoltageDropPercent: parseFloat(batteryActualDropPercent.toFixed(2)),
    batteryCableAmpacityA: batterySelectedCable.maxCurrentA,
    batteryDesignCurrentA: parseFloat(batteryDesignCurrent.toFixed(1)),
    acCableSize: `${acSelectedCable.crossSectionMm2.toFixed(1)} mm² Multi-Strand Copper Twin & Earth Cable`,
    acCableVoltageDropPercent: parseFloat(acActualDropPercent.toFixed(2)),
    acCableAmpacityA: acSelectedCable.maxCurrentA,
    acDesignCurrentA: parseFloat(acDesignCurrent.toFixed(1)),
    earthCableSize: `${earthCableSizeMm2.toFixed(1)} mm² Yellow/Green Copper Grounding Conductor`,
    calculationsRaw: {
      pvCableAreaMm2: pvSelectedCable.crossSectionMm2,
      batteryCableAreaMm2: batterySelectedCable.crossSectionMm2,
      acCableAreaMm2: acSelectedCable.crossSectionMm2
    }
  };
}
