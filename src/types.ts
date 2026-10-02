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
/** Full home backup (legacy) vs hybrid night essentials (solar/grid by day). */
export type OperatingMode = 'full_backup' | 'hybrid_essentials';
export type LoadPriority = 'critical' | 'essential' | 'managed' | 'heavy';
/** Simple home quote vs full engineering report. */
export type DesignAudience = 'simple' | 'engineering';
/** Novice-facing system goal (maps to backup hours + operating mode). */
export type SystemGoal = 'overnight_essentials' | 'half_day_backup' | 'full_home';

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
  /** Defaults to hybrid_essentials for new residential; older projects may omit. */
  operatingMode?: OperatingMode;
  designAudience?: DesignAudience;
  systemGoal?: SystemGoal;
  panelSize: number; // in Watts, e.g., 550
  createdAt: string;
  appliances: ProjectAppliance[];
  calculations?: Calculations;
  /** Optional UI fields derived from calculations._wizardMeta */
  status?: 'draft' | 'complete';
  wizardStep?: number;
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
  /**
   * Hybrid load priority. When omitted, a name-based default is applied.
   * critical | essential | managed | heavy
   */
  loadPriority?: LoadPriority;
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
  /** e.g. "26+13" when MPPTs are asymmetric */
  mpptCurrentLimitsLabel?: string;
  /** e.g. "1+1" string counts per MPPT after assignment */
  mpptStringAssignment?: string;
  maxPvPowerW?: number;
  seriesCount?: number;
  parallelCount?: number;
  /** Number of Maximum Power Point Tracker (MPPT) inputs on the selected inverter */
  numMppts?: number;
  /** Parallel PV strings assigned to each Maximum Power Point Tracker (MPPT) */
  stringsPerMppt?: number;
  /** Module wattage actually selected by the solver (may differ from preferred) */
  selectedPanelWattageWp?: number;
  targetPvKw?: number;
  /** Minimum array size from PV harvest target / (PSH × efficiency) */
  requiredArrayKwp?: number;
  panelSizingCompatibilityOk?: boolean;
  panelSizingCompatibilityWarning?: string;

  // Inverter Recommendation Breakdown
  inverterPreferredSizeKva?: number;
  inverterMinimumSizeKva?: number;
  inverterModelRecommended?: string;
  inverterBrandRecommended?: string;
  inverterModelNameRecommended?: string;
  /** Physics-first commercial inverter size (kVA) before brand matching. */
  engineeringRequiredInverterKva?: number;
  /** Physics-first battery installed target (kWh, lithium-class planning). */
  engineeringRequiredBatteryKwh?: number;
  /** Physics-first PV array target (kWp). */
  engineeringRequiredArrayKwp?: number;
  /** Suggested DC bus from load class (12 | 24 | 48). */
  suggestedSystemVoltageV?: number;
  /** Plain-language voltage / sizing guidance. */
  voltageGuidance?: string;
  /** catalog = brand SKU; datasheet = user-entered; generic = engineering size only. */
  catalogMatchMode?: 'catalog' | 'generic' | 'datasheet';
  /** Equipment market pack used for brand matching. */
  catalogMarket?: string;
  /** How peak sun hours were resolved. */
  peakSunHoursSource?: string;
  peakSunHoursNote?: string;

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
    /** False when any current-based device was selected below its calculated requirement. */
    protectionAdequacyOk?: boolean;
    protectionAdequacyNotes?: string[];
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
    pvCableLengthM?: number;
    batteryCableSize?: string;
    batteryCableVoltageDropPercent?: number;
    batteryCableAmpacityA?: number;
    batteryDesignCurrentA?: number;
    batteryCableLengthM?: number;
    acCableSize?: string;
    acCableVoltageDropPercent?: number;
    acCableAmpacityA?: number;
    acDesignCurrentA?: number;
    acCableLengthM?: number;
    earthCableSize?: string;
    /** True when one or more cable runs used standard residential default lengths. */
    cableLengthsAssumed?: boolean;
    pvLengthAssumed?: boolean;
    batteryLengthAssumed?: boolean;
    acLengthAssumed?: boolean;
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

  /** Operating strategy used for this design (defaults to full_backup). */
  operatingMode?: OperatingMode;
  operatingModeLabel?: string;
  energyStrategySummary?: string;
  designAudience?: DesignAudience;
  systemGoal?: SystemGoal;
  systemGoalLabel?: string;
  costEstimateNgnLow?: number;
  costEstimateNgnHigh?: number;
  costEstimateUsdLow?: number;
  costEstimateUsdHigh?: number;
  costEstimateDisclaimer?: string;
  batteryBackedDailyEnergyKwh?: number;
  solarGridPreferredDailyEnergyKwh?: number;
  nightOrBackupEnergyKwh?: number;
  daytimeEnergyKwh?: number;
  pvHarvestTargetKwh?: number;
  priorityEnergyBreakdown?: {
    criticalKwh: number;
    essentialKwh: number;
    managedKwh: number;
    heavyKwh: number;
  };
  /** Connected / peak load used for inverter selection (may exclude Heavy in hybrid mode). */
  inverterDesignConnectedLoadW?: number;
  inverterDesignPeakLoadW?: number;
}
