export interface UserProfile {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export type BatteryType = 'lithium' | 'tubular' | 'agm' | 'gel';
export type SystemVoltage = '12V' | '24V' | '48V' | 'auto';
export type InverterType = 'hybrid' | 'off_grid' | 'grid_tie' | 'auto';

export interface Project {
  id: string;
  userId: string;
  projectName: string;
  clientName: string;
  phone: string;
  email: string;
  location: string;
  projectType: 'residential' | 'commercial';
  backupHours: number;
  batteryType: BatteryType;
  systemVoltage: SystemVoltage;
  inverterType: InverterType;
  panelSize: number; // in Watts, e.g., 550
  createdAt: string;
  appliances: ProjectAppliance[];
  calculations?: Calculations;
}

export interface Appliance {
  id: string;
  category: string;
  applianceName: string;
  defaultWattage: number;
  surgeMultiplier: number;
}

export interface ProjectAppliance {
  id: string;
  projectId: string;
  category: string;
  applianceName: string;
  customWattage: number;
  quantity: number;
  hoursUsed: number; // per day
  /** When set (e.g. custom appliances), overrides name-based surge lookup */
  surgeMultiplier?: number;
}

export interface Calculations {
  connectedLoad: number; // Watts
  peakLoad: number;      // Watts (sum of wattage * surge multipliers)
  dailyEnergy: number;    // Wh
  monthlyEnergy: number;  // kWh
  batteryCapacityKwh: number; // kWh required
  batteryCapacityAh: number;  // Ah required
  batteryQuantity: number;
  batteryConfiguration: string;
  inverterSizeKva: number; // kVA / kW
  inverterReason: string;
  solarArrayKw: number; // kWp
  panelQuantity: number;
  panelConfiguration: string;
  estimatedDailyProductionKwh: number;

  // --- Extended Engineering fields (NEW) ---
  // Load breakdown
  continuousLoadW?: number;
  motorStartupLoadW?: number;
  designLoadW?: number;
  diversityFactor?: number;
  loadBreakdown?: {
    applianceName: string;
    wattage: number;
    quantity: number;
    surgeMultiplier: number;
    peakLoadW: number;
    dailyEnergyWh: number;
  }[];

  // Battery Sizing Breakdown
  batteryProductModel?: string;
  batteryUnitCapacityAh?: number;
  batteryUnitVoltage?: number;
  batteryRequiredKwhRaw?: number;
  batteryUsableKwh?: number;
  batteryInstalledKwh?: number;
  batteryEfficiency?: number;
  batteryDodUsed?: number;
  batterySeriesCount?: number;
  batteryParallelCount?: number;
  batteryExpectedBackupHours?: number;
  batteryUtilizationPercent?: number;
  batteryMaxDischargeCurrentA?: number;
  batteryMaxChargeCurrentA?: number;
  batteryContinuousCurrentA?: number;
  batteryChemistry?: BatteryType;
  batteryConnectionSchematic?: string;

  // Solar Sizing Breakdown
  peakSunHoursUsed?: number;
  overallSystemEfficiency?: number;
  temperatureLossPercent?: number;
  dustLossPercent?: number;
  cableLossPercent?: number;
  dailyHarvestWhRaw?: number;

  // Panel Configuration Compatibility
  panelVoc?: number;
  panelVmp?: number;
  panelIsc?: number;
  panelImp?: number;
  stringVocMax?: number;
  stringVmpMax?: number;
  stringVmpHot?: number;
  stringIscMax?: number;
  mpptVocLimit?: number;
  mpptVmpMin?: number;
  mpptVmpMax?: number;
  currentPerMpptA?: number;
  maxPvCurrentA?: number;
  maxPvPowerW?: number;
  seriesCount?: number;
  parallelCount?: number;
  targetPvKw?: number;
  panelSizingCompatibilityOk?: boolean;
  panelSizingCompatibilityWarning?: string;

  // Inverter Recommendation Breakdown
  inverterPreferredSizeKva?: number;
  inverterMinimumSizeKva?: number;
  inverterModelRecommended?: string;

  // Protection Sizing Schedule
  protectionSchedule?: {
    dcStringFuse?: string;
    dcStringIsolator?: string;
    dcStringSpd?: string;
    batteryFuse?: string;
    batteryBreaker?: string;
    acOutputBreaker?: string;
    acRcdBreaker?: string;
    earthElectrode?: string;
    distributionBoard?: string;
    deviceDetails?: {
      device: string;
      calculatedCurrentA: number;
      requiredCurrentA?: number;
      safetyFactor: number;
      selectedRating: string;
      nearestStandardRating?: string;
      codeStandard?: string;
      justification: string;
    }[];
  };

  // Cable Sizing Schedule
  cableSizing?: {
    pvCableSize?: string;
    pvCableVoltageDropPercent?: number;
    pvCableAmpacityA?: number;
    pvDesignCurrentA?: number;
    batteryCableSize?: string;
    batteryCableVoltageDropPercent?: number;
    batteryCableAmpacityA?: number;
    batteryDesignCurrentA?: number;
    acCableSize?: string;
    acCableVoltageDropPercent?: number;
    acCableAmpacityA?: number;
    acDesignCurrentA?: number;
    earthCableSize?: string;
  };

  // Design Validation warnings
  validationWarnings?: {
    level: 'info' | 'warning' | 'danger';
    message: string;
    suggestion: string;
  }[];

  // Engineering assumptions list
  assumptions?: {
    label: string;
    value: string | number;
    unit?: string;
  }[];

  // Dynamic Single-Line Diagram
  singleLineDiagramSvg?: string;
}
