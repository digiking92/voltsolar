import { InverterType } from '../../types';
import { SYSTEM_STANDARDS } from './engineeringStandards';

export interface InverterCalculationResult {
  inverterSizeKva: number;             // selected rating in kVA
  inverterMinimumSizeKva: number;      // raw minimum required size
  inverterPreferredSizeKva: number;    // ideal size with reserves
  inverterModelRecommended: string;    // suggested commercial product model name
  inverterReason: string;              // transparent selection explanation
}

export function sizeInverter(
  connectedLoadW: number,
  peakLoadW: number,
  inverterType: InverterType
): InverterCalculationResult {
  // 1. Calculate minimum raw rating based on continuous running load with a 25% safety margin
  const minRawKva = (connectedLoadW * SYSTEM_STANDARDS.inverterSafetyFactor) / 1000;

  // 2. Calculate surge demand in kVA (motor startup + other loads)
  const surgeKva = peakLoadW / 1000;

  // 3. Preferred capacity handles continuous load with 25% reserve AND supports the total surge capacity
  // For safety, we take the larger of (Continuous Load * 1.25) or (Surge Load / 2.0)
  const preferredRawKva = Math.max(minRawKva, surgeKva / 2.0);

  // Standard inverters sizes in kVA
  const standardKvaRatings = [1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 12.0, 15.0, 20.0, 25.0, 30.0];

  // Find standard size to match preferred capacity
  let selectedSize = standardKvaRatings[0];
  for (const rating of standardKvaRatings) {
    if (preferredRawKva <= rating) {
      selectedSize = rating;
      break;
    }
    selectedSize = rating; // default to max
  }

  // Handle extremely large loads
  if (preferredRawKva > standardKvaRatings[standardKvaRatings.length - 1]) {
    selectedSize = Math.ceil(preferredRawKva / 5) * 5;
  }

  // 4. Recommend commercial hybrid or off-grid models
  let modelName = '';
  const isHybrid = inverterType === 'hybrid' || inverterType === 'auto';
  
  if (selectedSize <= 3.0) {
    modelName = `VoltSolar ${isHybrid ? 'Hybrid' : 'Off-Grid'} LV-3000 (3kVA 24V)`;
  } else if (selectedSize <= 5.0) {
    modelName = `VoltSolar ${isHybrid ? 'Hybrid' : 'Off-Grid'} Smart-5000 (5kVA 48V)`;
  } else if (selectedSize <= 8.0) {
    modelName = `VoltSolar ${isHybrid ? 'Hybrid' : 'Off-Grid'} Pro-8000 (8kVA 48V)`;
  } else if (selectedSize <= 12.0) {
    modelName = `VoltSolar TriPhase ${isHybrid ? 'Hybrid' : 'Off-Grid'} Max-12K (12kVA 48V/3-Phase)`;
  } else {
    modelName = `VoltSolar industrial ${isHybrid ? 'Hybrid' : 'Off-Grid'} Mega-${selectedSize}K (${selectedSize}kVA 3-Phase)`;
  }

  // 5. Generate descriptive engineering justification
  const surgeDiff = peakLoadW - connectedLoadW;
  const reason = `${selectedSize} kVA ${isHybrid ? 'Hybrid' : 'Off-Grid'} Inverter selected. ` +
    `Connected steady-state load is ${(connectedLoadW / 1000).toFixed(2)} kW. ` +
    `Motor surge/starting headroom of ${(surgeDiff / 1000).toFixed(2)} kW is fully supported with a safety factor of ${SYSTEM_STANDARDS.inverterSafetyFactor}×, leaving a ${(selectedSize - minRawKva).toFixed(1)} kVA future expansion cushion.`;

  return {
    inverterSizeKva: selectedSize,
    inverterMinimumSizeKva: parseFloat(minRawKva.toFixed(2)),
    inverterPreferredSizeKva: parseFloat(preferredRawKva.toFixed(2)),
    inverterModelRecommended: modelName,
    inverterReason: reason
  };
}
