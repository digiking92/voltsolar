import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Building, Phone, Mail, MapPin, Sparkles, Plus, Minus, Search, 
  Trash2, ArrowLeft, ArrowRight, Zap, Battery, Sun, Cpu, ShieldCheck, 
  Info, Edit, Printer, AlertTriangle, Download, ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_APPLIANCES } from '../../data/appliances';
import { runFullDesignCalculations } from '../../lib/calculations';
import {
  applianceDailyEnergyWh,
  calculateLoadSchedule,
  sumApplianceDailyEnergyWh
} from '../../lib/calculations/loadCalculator';
import { parseInverterReasonPoints } from '../../lib/calculations/reportPresentation';
import { Project, ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations, OperatingMode, LoadPriority, DesignAudience, SystemGoal } from '../../types';
import { EngineeringReport } from './EngineeringReport';
import type { ReportPdfData } from '../../lib/exportReportPdf';
import {
  attachWizardMeta,
  getWizardMeta,
  hasCompletedSizing,
  type ProjectStatus
} from '../../lib/projectDraft';
import {
  defaultLoadPriority,
  LOAD_PRIORITY_OPTIONS,
  resolveLoadPriority,
  resolveOperatingMode
} from '../../lib/calculations/hybridEnergyModel';
import {
  DESIGN_AUDIENCE_OPTIONS,
  SYSTEM_GOALS,
  getSystemGoal,
  resolveDesignAudience,
  resolveSystemGoal
} from '../../lib/calculations/systemGoals';
import { estimateSystemCostBand, plainLanguageSystemSummary } from '../../lib/calculations/costEstimate';
import {
  CATALOG_MARKETS,
  resolveCatalogMarket,
  type CatalogMarketId
} from '../../lib/calculations/catalogMarkets';
import {
  fetchNasaPowerPeakSunHours,
  resolvePeakSunHours
} from '../../lib/calculations/peakSunHours';
import type { DatasheetInverterInput } from '../../lib/calculations/equipmentDatabase';

interface ProjectWizardProps {
  projectToEdit?: Project | null;
  onClose: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ projectToEdit, onClose }) => {
  const { addProject, updateProject } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  // Step 1: Client Info
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [location, setLocation] = useState('');
  const [projectType, setProjectType] = useState<'residential' | 'commercial'>('residential');
  /** Simple home quote vs full engineering — default simple for medium customers. */
  const [designAudience, setDesignAudience] = useState<DesignAudience>('simple');
  /** Novice system goal — drives backup hours + hybrid vs full backup. */
  const [systemGoal, setSystemGoal] = useState<SystemGoal>('overnight_essentials');
  /** Equipment market pack for brand matching. */
  const [catalogMarket, setCatalogMarket] = useState<CatalogMarketId>('global');
  /** Manual peak sun hours override (blank = use city table / NASA). */
  const [peakSunHoursOverride, setPeakSunHoursOverride] = useState('');
  const [pshLookupNote, setPshLookupNote] = useState('');
  const [isLookingUpPsh, setIsLookingUpPsh] = useState(false);

  // Step 2: Appliances State
  // List of appliances actively selected
  const [appliancesList, setAppliancesList] = useState<ProjectAppliance[]>([]);
  const [applianceSearch, setApplianceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customName, setCustomName] = useState('');
  const [customWattage, setCustomWattage] = useState('100');
  const [customQty, setCustomQty] = useState('1');
  const [customAppHours, setCustomAppHours] = useState('4');
  const [customSurge, setCustomSurge] = useState('1.2');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  // Step 4: Backup Hours + operating mode
  const [backupHours, setBackupHours] = useState<number>(8);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustomHours, setIsCustomHours] = useState(false);
  /** Residential default: Hybrid Night Essentials (more realistic for medium homes). */
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('hybrid_essentials');

  // Step 5: Battery
  const [batteryType, setBatteryType] = useState<BatteryType>('lithium');
  const [systemVoltage, setSystemVoltage] = useState<SystemVoltage>('auto');
  // Optional cable run lengths (metres) — blank = standard residential defaults
  const [pvCableDistanceM, setPvCableDistanceM] = useState('');
  const [batteryCableDistanceM, setBatteryCableDistanceM] = useState('');
  const [acCableDistanceM, setAcCableDistanceM] = useState('');

  // Step 6: Inverter
  const [inverterType, setInverterType] = useState<InverterType>('auto');
  const [useDatasheetInverter, setUseDatasheetInverter] = useState(false);
  const [dsBrand, setDsBrand] = useState('');
  const [dsModel, setDsModel] = useState('');
  const [dsSizeKva, setDsSizeKva] = useState('');
  const [dsVoltageV, setDsVoltageV] = useState('48');
  const [dsMpptVoc, setDsMpptVoc] = useState('');
  const [dsMpptVmpMin, setDsMpptVmpMin] = useState('');
  const [dsMpptVmpMax, setDsMpptVmpMax] = useState('');
  const [dsMaxPvCurrent, setDsMaxPvCurrent] = useState('');
  const [dsMaxPvPower, setDsMaxPvPower] = useState('');
  const [dsNumMppts, setDsNumMppts] = useState('2');
  const [dsBattDischargeA, setDsBattDischargeA] = useState('');
  const [dsSurgeFactor, setDsSurgeFactor] = useState('2');

  // Step 7: Solar Panels
  const [panelSize, setPanelSize] = useState<number>(550);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string>('');
  const [persistedProject, setPersistedProject] = useState<Project | null>(projectToEdit || null);
  const reportRef = useRef<HTMLDivElement>(null);
  const reportAutoSavedRef = useRef(false);

  const reportIssuedAt = useMemo(() => new Date(), []);
  const designId = useMemo(() => {
    const seed = `${projectName}|${clientName}|${location}|${backupHours}|${batteryType}|${systemVoltage}|${panelSize}|${operatingMode}|${appliancesList.length}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    return `VS-${reportIssuedAt.getFullYear()}-${Math.abs(hash % 9000) + 1000}`;
  }, [projectName, clientName, location, backupHours, batteryType, systemVoltage, panelSize, operatingMode, appliancesList.length, reportIssuedAt]);

  const applySystemGoal = (goalId: SystemGoal) => {
    const goal = getSystemGoal(goalId);
    setSystemGoal(goalId);
    setOperatingMode(goal.operatingMode);
    setBackupHours(goal.backupHours);
    setIsCustomHours(false);
    setCustomHours('');
  };

  const parsedPshOverride = (() => {
    const n = parseFloat(peakSunHoursOverride);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const livePshPreview = useMemo(
    () => resolvePeakSunHours(location, parsedPshOverride),
    [location, parsedPshOverride]
  );

  const buildCustomInverterInput = (): DatasheetInverterInput | null => {
    if (!useDatasheetInverter) return null;
    const sizeKva = parseFloat(dsSizeKva);
    const voltageV = parseInt(dsVoltageV, 10);
    if (!Number.isFinite(sizeKva) || sizeKva <= 0 || ![12, 24, 48].includes(voltageV)) return null;
    const num = (raw: string) => {
      const v = parseFloat(raw);
      return Number.isFinite(v) && v > 0 ? v : undefined;
    };
    return {
      brand: dsBrand || 'Datasheet',
      model: dsModel || `${sizeKva} kVA datasheet`,
      sizeKva,
      voltageV,
      topology: inverterType === 'off_grid' ? 'off_grid' : 'hybrid',
      mpptVocLimit: num(dsMpptVoc),
      mpptVmpMin: num(dsMpptVmpMin),
      mpptVmpMax: num(dsMpptVmpMax),
      maxPvCurrent: num(dsMaxPvCurrent),
      maxPvPower: num(dsMaxPvPower),
      numMppts: num(dsNumMppts) ? Math.round(num(dsNumMppts)!) : undefined,
      maxBatteryDischargeCurrentA: num(dsBattDischargeA),
      surgeFactor: num(dsSurgeFactor)
    };
  };

  const handleLookupIrradiance = async () => {
    if (!location.trim()) {
      window.alert('Enter an installation location first.');
      return;
    }
    setIsLookingUpPsh(true);
    setPshLookupNote('Looking up NASA POWER irradiance…');
    try {
      const result = await fetchNasaPowerPeakSunHours(location);
      setPeakSunHoursOverride(String(result.peakSunHours));
      setPshLookupNote(result.note);
    } catch (err) {
      setPshLookupNote(err instanceof Error ? err.message : 'Irradiance lookup failed.');
    } finally {
      setIsLookingUpPsh(false);
    }
  };

  // Populate data if editing / continuing a draft
  useEffect(() => {
    if (projectToEdit) {
      setPersistedProject(projectToEdit);
      setProjectName(projectToEdit.projectName);
      setClientName(projectToEdit.clientName);
      setClientPhone(projectToEdit.phone || '');
      setClientEmail(projectToEdit.email || '');
      setLocation(projectToEdit.location);
      setProjectType(projectToEdit.projectType);

      setAppliancesList(
        (projectToEdit.appliances || []).map(app => ({
          ...app,
          customWattage: Math.max(0, Number(app.customWattage) || 0),
          quantity: Math.max(0, Number(app.quantity) || 0),
          hoursUsed: Math.max(0, Number(app.hoursUsed) || 0),
          loadPriority: resolveLoadPriority(app)
        }))
      );

      const hours = projectToEdit.backupHours;
      if ([4, 6, 8, 12, 18, 24].includes(hours)) {
        setBackupHours(hours);
        setIsCustomHours(false);
      } else {
        setBackupHours(hours);
        setCustomHours(hours.toString());
        setIsCustomHours(true);
      }

      const calcs = projectToEdit.calculations as Calculations | undefined;
      setOperatingMode(
        resolveOperatingMode(
          projectToEdit.operatingMode || calcs?.operatingMode
        )
      );
      setDesignAudience(
        resolveDesignAudience(projectToEdit.designAudience || calcs?.designAudience)
      );
      setSystemGoal(
        resolveSystemGoal(projectToEdit.systemGoal || calcs?.systemGoal)
      );
      setCatalogMarket(
        resolveCatalogMarket(calcs?.catalogMarket || (projectToEdit as Project & { catalogMarket?: string }).catalogMarket)
      );
      if (calcs?.peakSunHoursSource === 'manual_override' || calcs?.peakSunHoursSource === 'nasa_power') {
        if (calcs.peakSunHoursUsed) setPeakSunHoursOverride(String(calcs.peakSunHoursUsed));
      }
      if (calcs?.peakSunHoursNote) setPshLookupNote(calcs.peakSunHoursNote);

      setBatteryType(projectToEdit.batteryType);
      setSystemVoltage(projectToEdit.systemVoltage);
      setInverterType(projectToEdit.inverterType);
      setPanelSize(projectToEdit.panelSize);
      const cs = projectToEdit.calculations?.cableSizing;
      setPvCableDistanceM(
        cs && cs.pvLengthAssumed === false && cs.pvCableLengthM != null
          ? String(cs.pvCableLengthM)
          : ''
      );
      setBatteryCableDistanceM(
        cs && cs.batteryLengthAssumed === false && cs.batteryCableLengthM != null
          ? String(cs.batteryCableLengthM)
          : ''
      );
      setAcCableDistanceM(
        cs && cs.acLengthAssumed === false && cs.acCableLengthM != null
          ? String(cs.acCableLengthM)
          : ''
      );

      const meta = getWizardMeta(projectToEdit);
      reportAutoSavedRef.current = meta.status === 'complete';
      setCurrentStep(meta.status === 'complete' ? 8 : meta.step);
    } else {
      setPersistedProject(null);
      setProjectName('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setLocation('');
      setProjectType('residential');
      setAppliancesList([]);
      setBackupHours(8);
      setIsCustomHours(false);
      setBatteryType('lithium');
      setSystemVoltage('auto');
      setInverterType('auto');
      setPanelSize(550);
      setPvCableDistanceM('');
      setBatteryCableDistanceM('');
      setAcCableDistanceM('');
      reportAutoSavedRef.current = false;
      setCurrentStep(1);
    }
  }, [projectToEdit]);

  // Appliance Category List
  const categories = ['All', 'Lighting', 'Kitchen', 'Living Room', 'Bedroom', 'Office', 'Heavy Loads'];

  // Handle Appliance Increment/Decrement
  const handleModifyApplianceQty = (appId: string, delta: number, defaultApp?: any) => {
    const existing = appliancesList.find(a => a.id === appId);

    if (existing) {
      const updatedQty = existing.quantity + delta;
      if (updatedQty <= 0) {
        // Remove
        setAppliancesList(appliancesList.filter(a => a.id !== appId));
      } else {
        setAppliancesList(appliancesList.map(a => a.id === appId ? { ...a, quantity: updatedQty } : a));
      }
    } else if (delta > 0 && defaultApp) {
      // Add new appliance to selection
      const newApp: ProjectAppliance = {
        id: appId,
        projectId: projectToEdit?.id || 'temp',
        category: defaultApp.category,
        applianceName: defaultApp.applianceName,
        customWattage: defaultApp.defaultWattage,
        quantity: 1,
        hoursUsed: 4, // default 4 hours per day
        surgeMultiplier: defaultApp.surgeMultiplier,
        loadPriority: defaultLoadPriority(defaultApp.applianceName)
      };
      setAppliancesList([...appliancesList, newApp]);
    }
  };

  const handleUpdateWattage = (appId: string, wattage: number) => {
    setAppliancesList(appliancesList.map(a => a.id === appId ? { ...a, customWattage: Math.max(1, wattage) } : a));
  };

  const handleUpdateHours = (appId: string, hours: number) => {
    setAppliancesList(appliancesList.map(a => a.id === appId ? { ...a, hoursUsed: Math.min(24, Math.max(0.5, hours)) } : a));
  };

  const handleUpdatePriority = (appId: string, priority: LoadPriority) => {
    setAppliancesList(
      appliancesList.map(a => (a.id === appId ? { ...a, loadPriority: priority } : a))
    );
  };

  const handleAddCustomAppliance = () => {
    setCustomError(null);
    const name = customName.trim();
    const watts = Math.max(1, parseInt(customWattage, 10) || 0);
    const qty = Math.max(1, parseInt(customQty, 10) || 0);
    const hours = Math.min(24, Math.max(0.5, parseFloat(customAppHours) || 0));
    const surge = Math.min(5, Math.max(1, parseFloat(customSurge) || 1.2));

    if (!name) {
      setCustomError('Enter an appliance name.');
      return;
    }
    if (!watts) {
      setCustomError('Enter a wattage (W) of at least 1.');
      return;
    }

    const newApp: ProjectAppliance = {
      id: 'custom-' + Math.random().toString(36).slice(2, 10),
      projectId: projectToEdit?.id || 'temp',
      category: 'Custom',
      applianceName: name,
      customWattage: watts,
      quantity: qty,
      hoursUsed: hours,
      surgeMultiplier: surge,
      loadPriority: defaultLoadPriority(name)
    };

    setAppliancesList([...appliancesList, newApp]);
    setCustomName('');
    setCustomWattage('100');
    setCustomQty('1');
    setCustomAppHours('4');
    setCustomSurge('1.2');
  };

  // Perform calculations on active appliances list
  const emptyCalculations = (): Calculations & { isError?: boolean; errorMessage?: string; errorType?: string } => ({
    connectedLoad: 0,
    peakLoad: 0,
    dailyEnergy: 0,
    monthlyEnergy: 0,
    batteryCapacityKwh: 0,
    batteryCapacityAh: 0,
    batteryQuantity: 0,
    batteryConfiguration: '',
    inverterSizeKva: 0,
    inverterReason: '',
    solarArrayKw: 0,
    panelQuantity: 0,
    panelConfiguration: '',
    estimatedDailyProductionKwh: 0,
  });

  const parseOptionalDistance = (raw: string): number | undefined => {
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // Direct list sum — same formula as each scheduler card. Never uses design/battery solvers.
  const totalDailyEnergyWh = sumApplianceDailyEnergyWh(appliancesList);
  const totalDailyEnergyKwh = totalDailyEnergyWh / 1000;
  const totalConnectedLoadW = appliancesList.reduce(
    (sum, app) => sum + Math.max(0, Number(app.customWattage) || 0) * Math.max(0, Number(app.quantity) || 0),
    0
  );
  const totalMonthlyEnergyKwh = (totalDailyEnergyWh * 30) / 1000;

  const runActiveCalculations = (): Calculations & { isError?: boolean; errorMessage?: string; errorType?: string } => {
    // Expected during early wizard steps — do not run the engine or spam the console
    if (appliancesList.length === 0) {
      return emptyCalculations();
    }

    // Always overlay appliance-derived load totals so design failures can never zero the UI.
    const loadSnapshot: Partial<Calculations> = {
      connectedLoad: totalConnectedLoadW,
      dailyEnergy: totalDailyEnergyWh,
      monthlyEnergy: totalMonthlyEnergyKwh
    };
    try {
      const loadRes = calculateLoadSchedule(appliancesList);
      Object.assign(loadSnapshot, {
        connectedLoad: loadRes.connectedLoad,
        peakLoad: loadRes.peakLoad,
        dailyEnergy: loadRes.dailyEnergy,
        monthlyEnergy: loadRes.monthlyEnergy,
        continuousLoadW: loadRes.continuousLoadW,
        motorStartupLoadW: loadRes.motorStartupLoadW,
        designLoadW: loadRes.designLoadW,
        diversityFactor: loadRes.diversityFactor,
        loadBreakdown: loadRes.loadBreakdown
      });
    } catch (loadErr) {
      console.warn('Load schedule fallback to direct appliance sum:', loadErr);
    }

    try {
      const actualBackupHours = isCustomHours ? (parseInt(customHours, 10) || 8) : backupHours;
      const design = runFullDesignCalculations(
        appliancesList,
        actualBackupHours,
        batteryType,
        systemVoltage,
        panelSize,
        location,
        inverterType,
        projectType,
        {
          pvDistanceM: parseOptionalDistance(pvCableDistanceM),
          batteryDistanceM: parseOptionalDistance(batteryCableDistanceM),
          acDistanceM: parseOptionalDistance(acCableDistanceM)
        },
        operatingMode,
        systemGoal,
        {
          catalogMarket,
          peakSunHoursOverride: parsedPshOverride,
          customInverter: buildCustomInverterInput()
        }
      );
      return { ...design, ...loadSnapshot };
    } catch (err: any) {
      console.error(err);
      return {
        ...emptyCalculations(),
        ...loadSnapshot,
        isError: true,
        errorMessage: err.message || 'An unexpected engineering calculation error occurred.',
        errorType: err.name || 'Engineering Sizing Inconsistency',
      };
    }
  };

  const activeCalcs = runActiveCalculations();

  // PV array: required (load/PSH/efficiency) vs installed (whole panels × module Wp)
  const pvRequiredArrayKwp =
    activeCalcs.requiredArrayKwp ?? activeCalcs.engineeringRequiredArrayKwp ?? null;
  const pvSelectedModuleWp = activeCalcs.selectedPanelWattageWp ?? panelSize;
  const pvInstalledArrayKwp = activeCalcs.solarArrayKw ?? 0;
  const pvArrayMarginPct =
    pvRequiredArrayKwp != null && pvRequiredArrayKwp > 0
      ? Math.max(0, Math.round((pvInstalledArrayKwp / pvRequiredArrayKwp - 1) * 100))
      : null;

  const buildProjectPayload = (status: ProjectStatus, step: number) => {
    const actualBackupHours = isCustomHours ? parseInt(customHours, 10) || 8 : backupHours;
    const liveCalcs = runActiveCalculations();
    const calcsForSave =
      status === 'complete' && !liveCalcs.isError
        ? liveCalcs
        : liveCalcs.dailyEnergy > 0 || liveCalcs.connectedLoad > 0
          ? liveCalcs
          : undefined;

    return {
      projectName: projectName.trim() || 'Untitled Draft',
      clientName: clientName.trim() || 'Draft client',
      phone: clientPhone,
      email: clientEmail,
      location: location.trim() || 'Draft location',
      projectType,
      backupHours: actualBackupHours,
      batteryType,
      systemVoltage,
      inverterType,
      operatingMode,
      designAudience,
      systemGoal,
      panelSize,
      appliances: appliancesList,
      calculations: {
        ...attachWizardMeta(calcsForSave, { status, step }),
        operatingMode,
        designAudience,
        systemGoal,
        systemGoalLabel: getSystemGoal(systemGoal).title,
        catalogMarket,
        peakSunHoursSource: livePshPreview.source,
        peakSunHoursNote: pshLookupNote || livePshPreview.note
      },
      status,
      wizardStep: step
    };
  };

  const persistProject = async (
    status: ProjectStatus,
    step: number,
    options?: { closeAfter?: boolean; silent?: boolean }
  ): Promise<Project | null> => {
    if (isSavingProject) return persistedProject;
    setIsSavingProject(true);
    try {
      const projectData = buildProjectPayload(status, step);
      let saved: Project;
      if (persistedProject) {
        saved = {
          ...persistedProject,
          ...projectData
        };
        await updateProject(saved);
      } else {
        saved = await addProject(projectData);
      }
      setPersistedProject(saved);
      if (!options?.silent) {
        setDraftStatus(
          status === 'complete'
            ? 'Project saved with engineering report.'
            : `Draft saved at step ${step}/8.`
        );
        window.setTimeout(() => setDraftStatus(''), 2500);
      }
      if (options?.closeAfter) onClose();
      return saved;
    } catch (err) {
      console.error('Project save failed:', err);
      const message =
        err instanceof Error ? err.message : 'Could not save this project. Please try again.';
      if (!options?.silent) window.alert(message);
      return null;
    } finally {
      setIsSavingProject(false);
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    if (currentStep === 1) {
      if (!projectName || !clientName || !location) {
        alert('Please fill in Project Name, Client Name, and Installation Location to proceed.');
        return;
      }
    }
    if (currentStep === 2) {
      if (appliancesList.length === 0) {
        alert('Please add at least one appliance to compute sizing load.');
        return;
      }
    }
    if (currentStep < totalSteps) {
      // Simple home quote: skip battery/inverter/panel detail steps (auto-selected)
      let nextStep = currentStep + 1;
      if (designAudience === 'simple' && currentStep === 4) {
        nextStep = 8;
      }
      const status: ProjectStatus = nextStep >= totalSteps ? 'complete' : 'draft';
      if (status === 'complete') reportAutoSavedRef.current = true;
      setCurrentStep(nextStep);
      await persistProject(status, nextStep, { silent: true });
      setDraftStatus(
        status === 'complete' ? 'Report ready — project auto-saved.' : `Draft saved · Step ${nextStep}/8`
      );
      window.setTimeout(() => setDraftStatus(''), 2500);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      let prev = currentStep - 1;
      if (designAudience === 'simple' && currentStep === 8) {
        prev = 4;
      }
      setCurrentStep(prev);
    }
  };

  const handleSaveProjectDesign = async () => {
    await persistProject('complete', 8, { closeAfter: true });
  };

  const handleSaveDraftOnly = async () => {
    if (currentStep === 1 && !projectName.trim() && !clientName.trim() && !location.trim()) {
      window.alert('Enter at least a project name, client name, or location before saving a draft.');
      return;
    }
    const status: ProjectStatus = currentStep >= totalSteps ? 'complete' : 'draft';
    await persistProject(status, currentStep);
  };

  // Auto-save when the engineering report step is reached with valid sizing
  useEffect(() => {
    if (currentStep !== 8) return;
    if (activeCalcs.isError) return;
    if (!hasCompletedSizing(activeCalcs)) return;
    if (reportAutoSavedRef.current) return;
    reportAutoSavedRef.current = true;
    void persistProject('complete', 8, { silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once per report landing
  }, [currentStep, activeCalcs.isError, activeCalcs.solarArrayKw, activeCalcs.inverterSizeKva]);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    if (!activeCalcs || activeCalcs.isError) {
      window.alert(
        activeCalcs?.isError
          ? 'Cannot download PDF while sizing is blocked. Fix the calculation error first.'
          : 'Report calculations are not ready yet. Please wait a moment and try again.'
      );
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const name = (projectName || 'engineering-report').trim();
      const { exportReportPdf } = await import('../../lib/exportReportPdf');
      const payload: ReportPdfData = {
        calcs: activeCalcs,
        projectName,
        clientName,
        clientPhone,
        clientEmail,
        location,
        projectType,
        backupHours,
        batteryType,
        systemVoltage,
        inverterType,
        panelSize,
        appliancesList,
        designId,
        issuedAt: reportIssuedAt,
        designAudience
      };
      await exportReportPdf(payload, `${name}-VoltSolar-Report`);
    } catch (err) {
      console.error('PDF export failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Could not download the PDF. Please try again or use Print → Save as PDF.';
      window.alert(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {projectToEdit ? `Edit System: ${projectName}` : 'Create Sizing Design'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {currentStep} of {totalSteps} • {
              currentStep === 1 ? 'Quote type & client' :
              currentStep === 2 ? 'Appliances' :
              currentStep === 3 ? 'Load summary' :
              currentStep === 4 ? 'Backup strategy' :
              currentStep === 5 ? 'Battery' :
              currentStep === 6 ? 'Inverter' :
              currentStep === 7 ? 'Solar panels' :
              designAudience === 'simple' ? 'Home quote' : 'Engineering report'
            }
            {draftStatus ? (
              <span className="ml-2 text-[#69BD45] font-semibold">· {draftStatus}</span>
            ) : isSavingProject ? (
              <span className="ml-2 text-[#156DB7] font-semibold">· Saving…</span>
            ) : null}
          </p>
        </div>
        <button
          id="wizard-close-btn"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
        >
          Cancel Wizard
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-[#156DB7] to-[#69BD45] h-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Panels */}
      <div className="min-h-[450px]">
        {activeCalcs.isError && currentStep >= 3 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 text-white p-8 md:p-12 rounded-3xl border border-red-500/20 shadow-2xl space-y-6 text-center max-w-2xl mx-auto my-6"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto border border-red-500/20 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-red-400 uppercase">Engineering Sizing Blocked</h1>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">{activeCalcs.errorType || 'Sizing Inconsistency Detected'}</p>
            </div>
            
            <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-6 text-left space-y-3 font-medium">
              <p className="text-slate-200 text-xs leading-relaxed text-center">
                {activeCalcs.errorMessage}
              </p>
              <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-500 text-center leading-relaxed">
                VoltSolar engineering protocols have suspended report generation to prevent compiling an electrically invalid, inconsistent, or unsafe solar design.
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                id="wiz-err-go-loads"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-700 font-sans"
              >
                Adjust Connected Loads
              </button>
              <button
                id="wiz-err-reset-constants"
                onClick={() => {
                  setSystemVoltage('auto');
                  setInverterType('auto');
                  setPanelSize(550);
                }}
                className="px-5 py-2.5 bg-[#156DB7] hover:bg-[#125ba1] text-xs font-bold rounded-xl transition-colors font-sans"
              >
                Reset Sizing Constants
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {currentStep === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-4">
              <User className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Client & Installation Details</span>
            </h2>

            <div className="space-y-3 mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Who is this quote for?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DESIGN_AUDIENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    id={`audience-${opt.id}`}
                    onClick={() => setDesignAudience(opt.id)}
                    className={`text-left p-4 border rounded-xl transition-all ${
                      designAudience === opt.id
                        ? 'border-[#156DB7] bg-slate-50 ring-1 ring-[#156DB7]/25'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800">{opt.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                What should the system do? (pick one)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SYSTEM_GOALS.map(goal => (
                  <button
                    key={goal.id}
                    type="button"
                    id={`goal-${goal.id}`}
                    onClick={() => applySystemGoal(goal.id)}
                    className={`text-left p-4 border rounded-xl transition-all ${
                      systemGoal === goal.id
                        ? 'border-[#156DB7] bg-slate-50 ring-1 ring-[#156DB7]/25'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800">{goal.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{goal.plainSummary}</p>
                    <p className="text-[10px] font-semibold text-[#156DB7] mt-2">{goal.whoItsFor}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This sets backup hours to <span className="font-semibold">{backupHours} h</span> and mode to{' '}
                <span className="font-semibold">
                  {operatingMode === 'hybrid_essentials' ? 'Hybrid Night Essentials' : 'Full Home Backup'}
                </span>
                . You can fine-tune later if you choose Full engineering design.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Project Name *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Sparkles className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="wiz-prj-name"
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
                    placeholder="e.g. Miller Off-Grid Setup"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Client Name *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="wiz-client-name"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
                    placeholder="e.g. David Miller"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Client Phone</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="wiz-client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
                    placeholder="e.g. +1 (555) 012-3456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Client Email</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="wiz-client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
                    placeholder="e.g. miller@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Installation Location *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="wiz-location"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
                    placeholder="e.g. Lagos, Nigeria"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Peak sun hours (irradiance)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Manual override (hrs/day)
                    </label>
                    <input
                      id="wiz-psh-override"
                      type="number"
                      min="1.5"
                      max="8.5"
                      step="0.1"
                      value={peakSunHoursOverride}
                      onChange={e => setPeakSunHoursOverride(e.target.value)}
                      placeholder={`Auto: ${livePshPreview.peakSunHours}`}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                    />
                  </div>
                  <button
                    type="button"
                    id="wiz-psh-lookup"
                    disabled={isLookingUpPsh || !location.trim()}
                    onClick={() => void handleLookupIrradiance()}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl border border-[#156DB7]/30 text-[#156DB7] hover:bg-[#156DB7]/5 disabled:opacity-50"
                  >
                    {isLookingUpPsh ? 'Looking up…' : 'Lookup irradiance (NASA)'}
                  </button>
                  {peakSunHoursOverride ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPeakSunHoursOverride('');
                        setPshLookupNote('');
                      }}
                      className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Clear override
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {pshLookupNote || livePshPreview.note}
                </p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Equipment market (brand catalog)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {CATALOG_MARKETS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      id={`catalog-market-${m.id}`}
                      onClick={() => setCatalogMarket(m.id)}
                      className={`text-left p-3 border rounded-xl transition-all ${
                        catalogMarket === m.id
                          ? 'border-[#156DB7] bg-slate-50 ring-1 ring-[#156DB7]/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-800">{m.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Project Type</label>
                <div className="flex space-x-4">
                  <button
                    id="wiz-type-res"
                    type="button"
                    onClick={() => setProjectType('residential')}
                    className={`flex-1 py-3 text-xs font-semibold rounded-xl text-center border transition-all ${projectType === 'residential' ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    Residential Layout
                  </button>
                  <button
                    id="wiz-type-comm"
                    type="button"
                    disabled
                    className="flex-1 py-3 text-xs font-semibold rounded-xl text-center border border-dashed border-slate-200 text-slate-400 cursor-not-allowed relative"
                  >
                    <span>Commercial Layout</span>
                    <span className="absolute top-1 right-2 text-[8px] font-bold tracking-widest uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full scale-75">Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Appliance Selector Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Selecting catalog list */}
              <div className="lg:col-span-7 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <h2 className="text-base font-bold text-slate-800">Add Appliances to Sizer</h2>
                  {/* Search box */}
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      id="appliance-search-wiz"
                      type="text"
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                      placeholder="Search catalog..."
                      value={applianceSearch}
                      onChange={(e) => setApplianceSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Categories Scroll pill headers */}
                <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      id={`cat-pill-${cat.replace(/\s+/g, '-')}`}
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all shrink-0 uppercase tracking-wider ${selectedCategory === cat ? 'bg-[#156DB7] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200/60'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Appliances Grid list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-1">
                  {DEFAULT_APPLIANCES
                    .filter(app => selectedCategory === 'All' || app.category === selectedCategory)
                    .filter(app => app.applianceName.toLowerCase().includes(applianceSearch.toLowerCase()))
                    .map((app) => {
                      const selected = appliancesList.find(a => a.id === app.id);
                      return (
                        <div 
                          key={app.id} 
                          className={`p-4 border rounded-xl flex items-center justify-between transition-all ${selected ? 'border-[#156DB7] bg-slate-50/60' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{app.category}</span>
                            <h4 className="text-xs font-bold text-slate-800 mt-0.5">{app.applianceName}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">{app.defaultWattage}W baseline</p>
                          </div>

                          <div className="flex items-center space-x-2">
                            {selected ? (
                              <div className="flex items-center space-x-2.5 bg-white border border-[#156DB7]/30 rounded-lg p-1">
                                <button
                                  id={`app-dec-${app.id}`}
                                  type="button"
                                  onClick={() => handleModifyApplianceQty(app.id, -1)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold text-slate-800 px-0.5">{selected.quantity}</span>
                                <button
                                  id={`app-inc-${app.id}`}
                                  type="button"
                                  onClick={() => handleModifyApplianceQty(app.id, 1)}
                                  className="p-1 hover:bg-slate-100 rounded text-[#156DB7]"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`app-add-btn-${app.id}`}
                                type="button"
                                onClick={() => handleModifyApplianceQty(app.id, 1, app)}
                                className="px-3 py-1.5 bg-[#156DB7]/10 hover:bg-[#156DB7]/15 text-[#156DB7] text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Custom appliance — click to expand */}
                <div className="pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    id="toggle-custom-appliance"
                    onClick={() => setCustomOpen(v => !v)}
                    className="w-full flex items-center justify-between gap-3 text-left rounded-xl px-3 py-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                    aria-expanded={customOpen}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Add a custom appliance</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Not in the list? Click to enter name, wattage, and daily hours.
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${customOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {customOpen && (
                    <div className="mt-3 space-y-3 px-1">
                      {customError && (
                        <p className="text-[11px] text-rose-600 font-medium">{customError}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label htmlFor="custom-app-name" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Appliance name
                          </label>
                          <input
                            id="custom-app-name"
                            type="text"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder="e.g. Chest freezer, Sewing machine"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                          />
                        </div>
                        <div>
                          <label htmlFor="custom-app-watts" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Wattage (W)
                          </label>
                          <input
                            id="custom-app-watts"
                            type="number"
                            min={1}
                            value={customWattage}
                            onChange={e => setCustomWattage(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                          />
                        </div>
                        <div>
                          <label htmlFor="custom-app-qty" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Quantity
                          </label>
                          <input
                            id="custom-app-qty"
                            type="number"
                            min={1}
                            value={customQty}
                            onChange={e => setCustomQty(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                          />
                        </div>
                        <div>
                          <label htmlFor="custom-app-hours" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Hours / day
                          </label>
                          <input
                            id="custom-app-hours"
                            type="number"
                            min={0.5}
                            max={24}
                            step={0.5}
                            value={customAppHours}
                            onChange={e => setCustomAppHours(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                          />
                        </div>
                        <div>
                          <label htmlFor="custom-app-surge" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Startup / surge
                          </label>
                          <select
                            id="custom-app-surge"
                            value={customSurge}
                            onChange={e => setCustomSurge(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                          >
                            <option value="1">Low (lights, electronics) — 1×</option>
                            <option value="1.2">Typical resistive load — 1.2×</option>
                            <option value="1.5">Mild motor / appliance — 1.5×</option>
                            <option value="2.5">AC / pump / motor — 2.5×</option>
                            <option value="3">Compressor / fridge / fridge-like — 3×</option>
                          </select>
                        </div>
                      </div>

                      <button
                        id="add-custom-appliance-btn"
                        type="button"
                        onClick={handleAddCustomAppliance}
                        className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#123A63] hover:bg-[#0e2f52] text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add custom appliance</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Sized loads list */}
              <div className="lg:col-span-5 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Sizing Schedulers ({appliancesList.length} Active)</h3>
                  
                  {appliancesList.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <Zap className="w-10 h-10 text-slate-200 mx-auto animate-bounce" />
                      <p className="text-xs">No active loads yet. Pick from the catalog or add a custom appliance below it.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {appliancesList.map((app) => (
                        <div key={app.id} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{app.applianceName}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">{app.category} • qty: {app.quantity}</p>
                            </div>
                            <button
                              id={`app-remove-${app.id}`}
                              type="button"
                              onClick={() => handleModifyApplianceQty(app.id, -app.quantity)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                              title="Delete load"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Wattage (W)</label>
                              <input
                                id={`app-watt-${app.id}`}
                                type="number"
                                className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs text-slate-800 font-medium"
                                value={app.customWattage}
                                onChange={(e) => handleUpdateWattage(app.id, parseInt(e.target.value, 10) || 1)}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hours / Day</label>
                              <input
                                id={`app-hours-${app.id}`}
                                type="number"
                                step="0.5"
                                max="24"
                                min="0.5"
                                className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs text-slate-800 font-medium"
                                value={app.hoursUsed}
                                onChange={(e) => handleUpdateHours(app.id, parseFloat(e.target.value) || 1)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Load Priority (for Hybrid Night Essentials)
                            </label>
                            <select
                              id={`app-priority-${app.id}`}
                              value={resolveLoadPriority(app)}
                              onChange={e =>
                                handleUpdatePriority(app.id, e.target.value as LoadPriority)
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-xs text-slate-800 font-medium"
                            >
                              {LOAD_PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.short} — {opt.hint}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="text-[10px] text-right font-semibold text-slate-500 pt-1 border-t border-slate-100/60">
                            Daily Sizing Load:{' '}
                            <span className="font-bold text-[#156DB7]">
                              {(applianceDailyEnergyWh(app) / 1000).toFixed(2)} kWh
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Total Estimated Daily Energy:</span>
                    <span className="text-base text-[#156DB7]">
                      {totalDailyEnergyKwh.toFixed(2)} kWh
                    </span>
                  </div>
                  {activeCalcs.isError ? (
                    <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Load total above is correct. Equipment matching could not finish yet for this
                      load size — keep System Voltage / Inverter on Auto, or lower peak motor hours
                      before the final report steps.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-6">
              <Cpu className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Load Sizing Analysis</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected Load</span>
                <h3 className="text-2xl font-bold text-slate-900">{(totalConnectedLoadW / 1000).toFixed(2)} kW</h3>
                <p className="text-[10px] text-slate-500">Cumulative sum of active wattage loads.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-[#156DB7] uppercase tracking-widest">Peak Startup Surge</span>
                <h3 className="text-2xl font-bold text-slate-900">{((activeCalcs.peakLoad || totalConnectedLoadW) / 1000).toFixed(2)} kW</h3>
                <p className="text-[10px] text-slate-500">Includes startup overhead calculations.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-[#69BD45] uppercase tracking-widest">Daily Consumption</span>
                <h3 className="text-2xl font-bold text-slate-900">{totalDailyEnergyKwh.toFixed(2)} kWh</h3>
                <p className="text-[10px] text-slate-500">Continuous daily electrical consumption.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Monthly Sizing</span>
                <h3 className="text-2xl font-bold text-slate-900">{totalMonthlyEnergyKwh.toFixed(1)} kWh</h3>
                <p className="text-[10px] text-slate-500">Monthly billing baseline calculation.</p>
              </div>
            </div>

            {!activeCalcs.isError && (activeCalcs.solarArrayKw || 0) > 0 && (() => {
              const earlyCost = estimateSystemCostBand(activeCalcs);
              const earlyPlain = plainLanguageSystemSummary(activeCalcs);
              return (
                <div className="mt-6 rounded-2xl border border-[#156DB7]/20 bg-gradient-to-br from-[#F0F7FC] to-white p-5 space-y-3">
                  <p className="text-[10px] font-bold text-[#156DB7] uppercase tracking-widest">
                    Early planning cost (based on current goal)
                  </p>
                  <p className="text-sm font-semibold text-slate-700">{earlyPlain.headline}</p>
                  <p className="text-2xl font-black text-[#123A63] tracking-tight">{earlyCost.ngn.formatted}</p>
                  <p className="text-xs font-semibold text-slate-500">{earlyCost.usd.formatted} · indicative only</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{earlyCost.disclaimer}</p>
                </div>
              );
            })()}

            {/* Appliance Breakdown table */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Connected Appliance Breakdowns</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-4 py-3">Appliance</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Wattage</th>
                      <th className="px-4 py-3">Run-time (Hrs)</th>
                      <th className="px-4 py-3 text-right">Daily Energy (kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliancesList.map((app) => (
                      <tr key={app.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-800">{app.applianceName}</td>
                        <td className="px-4 py-3 text-slate-600">{app.quantity}</td>
                        <td className="px-4 py-3 text-slate-600">{app.customWattage}W</td>
                        <td className="px-4 py-3 text-slate-600">{app.hoursUsed} hrs/day</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {(applianceDailyEnergyWh(app) / 1000).toFixed(2)} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-6">
              <Battery className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>How Should the System Run? (Backup Strategy)</span>
            </h2>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  System Operating Mode
                </label>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                  This choice controls whether the battery is sized for the whole house or only for
                  Critical and Essential loads at night / during outages. Solar can still power daytime
                  loads in either mode.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                  <button
                    type="button"
                    id="op-mode-full-backup"
                    onClick={() => setOperatingMode('full_backup')}
                    className={`text-left p-4 border rounded-xl transition-all ${
                      operatingMode === 'full_backup'
                        ? 'border-[#156DB7] bg-slate-50/80 ring-1 ring-[#156DB7]/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800">Full Home Backup</p>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      Battery covers average daily energy for your backup hours (closer to off-grid).
                      Use when most appliances must stay on during an outage. This is the classic VoltSolar method.
                    </p>
                  </button>
                  <button
                    type="button"
                    id="op-mode-hybrid-essentials"
                    onClick={() => setOperatingMode('hybrid_essentials')}
                    className={`text-left p-4 border rounded-xl transition-all ${
                      operatingMode === 'hybrid_essentials'
                        ? 'border-[#156DB7] bg-slate-50/80 ring-1 ring-[#156DB7]/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800">Hybrid Night Essentials</p>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      Solar / grid run Managed and Heavy loads by day. Battery is sized from Critical + Essential
                      loads only for your backup hours (typical hybrid home with grid available).
                    </p>
                  </button>
                </div>
                {operatingMode === 'hybrid_essentials' && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-3xl leading-relaxed">
                    Tip: check Load Priority on each appliance in Step 2. Cookers, kettles, heaters, and irons
                    should usually be <span className="font-semibold">Heavy</span>. Freezers, lights, and fans
                    should be <span className="font-semibold">Critical</span>.
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Select the target backup duration. In Full Home Backup this applies to total average daily energy.
                In Hybrid Night Essentials it applies to Critical + Essential loads only.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Backup Duration (Hours)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
                  {[4, 6, 8, 12, 18, 24].map((hours) => (
                    <button
                      id={`backup-hr-${hours}`}
                      key={hours}
                      type="button"
                      onClick={() => { setBackupHours(hours); setIsCustomHours(false); }}
                      className={`px-4 py-3 border text-xs font-bold rounded-xl text-center transition-all ${(!isCustomHours && backupHours === hours) ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {hours} Hours
                    </button>
                  ))}
                  <button
                    id="backup-hr-custom"
                    type="button"
                    onClick={() => setIsCustomHours(true)}
                    className={`px-4 py-3 border text-xs font-bold rounded-xl text-center transition-all ${isCustomHours ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Custom Hours
                  </button>
                </div>
              </div>

              {isCustomHours && (
                <div className="max-w-xs animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Enter Custom Backup Hours</label>
                  <input
                    id="wiz-custom-hours-val"
                    type="number"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#156DB7]"
                    placeholder="e.g. 10"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                  />
                </div>
              )}

              {!activeCalcs.isError && (activeCalcs.solarArrayKw || 0) > 0 && (() => {
                const stepCost = estimateSystemCostBand(activeCalcs);
                return (
                  <div className="rounded-2xl border border-[#156DB7]/20 bg-[#F0F7FC]/60 p-5 space-y-2">
                    <p className="text-[10px] font-bold text-[#156DB7] uppercase tracking-widest">
                      Cost band with this backup strategy
                    </p>
                    <p className="text-xl font-black text-[#123A63]">{stepCost.ngn.formatted}</p>
                    <p className="text-xs text-slate-500">{stepCost.usd.formatted} · updates as you change hours or mode</p>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {currentStep === 5 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-6">
              <Battery className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Battery Bank Parameter Specification</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chemistry Select */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Battery Chemistry</label>
                <div className="space-y-3">
                  {[
                    { id: 'lithium', name: 'Lithium Iron Phosphate (LiFePO4)', dod: '90% DoD', desc: 'Superior lifecycle, maintenance-free, lightweight parameters.' },
                    { id: 'tubular', name: 'Tubular Deep Cycle', dod: '60% DoD', desc: 'Robust lead-acid design, excellent thermal tolerances.' },
                    { id: 'agm', name: 'AGM (Absorbent Glass Mat)', dod: '50% DoD', desc: 'Maintenance-free, standard entry level battery storage.' },
                    { id: 'gel', name: 'GEL Deep Cycle', dod: '50% DoD', desc: 'Enhanced deep-cycle performance under variable temperatures.' },
                  ].map((bat) => (
                    <button
                      id={`bat-chem-${bat.id}`}
                      key={bat.id}
                      type="button"
                      onClick={() => setBatteryType(bat.id as BatteryType)}
                      className={`w-full text-left p-4 border rounded-xl transition-all flex justify-between items-center ${batteryType === bat.id ? 'border-[#156DB7] bg-slate-50/60' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{bat.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{bat.desc}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-[#156DB7]/10 text-[#156DB7] px-2.5 py-0.5 rounded-full">{bat.dod}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voltage Select */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Bus DC Voltage</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: '12V', name: '12 VDC', desc: 'For smaller loads < 1 kW' },
                    { id: '24V', name: '24 VDC', desc: 'Standard residential 1 to 3 kW' },
                    { id: '48V', name: '48 VDC', desc: 'High-power layouts > 3 kW' },
                    { id: 'auto', name: 'Auto Recommend', desc: 'Automate system voltage' },
                  ].map((v) => {
                    const suggested = activeCalcs.suggestedSystemVoltageV;
                    const isSuggested =
                      (v.id === 'auto' && !!suggested) ||
                      (suggested != null && v.id === `${suggested}V`);
                    return (
                    <button
                      id={`sys-volt-${v.id}`}
                      key={v.id}
                      type="button"
                      onClick={() => setSystemVoltage(v.id as SystemVoltage)}
                      className={`text-left p-4 border rounded-xl transition-all ${systemVoltage === v.id ? 'border-[#156DB7] bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <h4 className="text-xs font-bold text-slate-800">
                        {v.name}
                        {isSuggested && v.id !== 'auto' ? (
                          <span className="ml-1.5 text-[9px] font-bold text-[#156DB7]">· suggested</span>
                        ) : null}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">{v.desc}</p>
                    </button>
                    );
                  })}
                </div>

                {activeCalcs.voltageGuidance ? (
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-[#F0F7FC] border border-[#156DB7]/15 rounded-lg px-3 py-2">
                    {activeCalcs.voltageGuidance}
                  </p>
                ) : null}

                {activeCalcs.engineeringRequiredInverterKva ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[9px] font-bold text-[#156DB7] uppercase tracking-widest block">
                      Engineering need (before brand)
                    </span>
                    <p className="text-xs font-semibold text-slate-800">
                      ~{activeCalcs.engineeringRequiredInverterKva} kVA inverter
                      {activeCalcs.engineeringRequiredBatteryKwh != null
                        ? ` · ~${activeCalcs.engineeringRequiredBatteryKwh} kWh battery`
                        : ''}
                      {activeCalcs.engineeringRequiredArrayKwp != null
                        ? ` · ~${activeCalcs.engineeringRequiredArrayKwp} kWp PV`
                        : ''}
                    </p>
                  </div>
                ) : null}

                {/* Instant math output */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/60 space-y-2 mt-6">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Sized Battery Bank Required</span>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-slate-800">{activeCalcs.batteryCapacityKwh} kWh</h3>
                    <span className="text-xs font-semibold text-slate-500">~{activeCalcs.batteryCapacityAh} Ah required</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Configuration layout:{' '}
                    <span className="font-semibold text-[#156DB7]">
                      {activeCalcs.batterySeriesCount ?? '-'}S × {activeCalcs.batteryParallelCount ?? '-'}P · {activeCalcs.batteryQuantity} total
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">{activeCalcs.batteryConfiguration}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Optional cable lengths — not required; blank uses residential defaults */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Optional Cable Run Lengths (metres)
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to use standard residential assumptions (PV 20 m, battery 2 m, AC 10 m). Entered values recalculate voltage drop and conductor size.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">PV Array to Inverter</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 20"
                    value={pvCableDistanceM}
                    onChange={e => setPvCableDistanceM(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Inverter to Battery</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 2"
                    value={batteryCableDistanceM}
                    onChange={e => setBatteryCableDistanceM(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Inverter to Distribution Board</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 10"
                    value={acCableDistanceM}
                    onChange={e => setAcCableDistanceM(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 6 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-6">
              <Cpu className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Inverter Matching specifications</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Type Select */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inverter Topology</label>
                <div className="space-y-3">
                  {[
                    { id: 'hybrid', name: 'Hybrid Inverter', desc: 'Grid + battery. Built-in MPPT(s) — no separate charge controller needed.' },
                    { id: 'off_grid', name: 'Off-Grid Inverter', desc: 'Standalone AIO with built-in MPPT (MUST / Growatt SPF / Felicity / SRNE). Not a bare inverter/charger.' },
                    { id: 'grid_tie', name: 'Grid + Battery Hybrid', desc: 'Sizes a hybrid with built-in MPPT for grid sync + battery backup.' },
                    { id: 'auto', name: 'Auto Recommend', desc: 'Picks the safest hybrid or off-grid AIO (with built-in MPPT).' },
                  ].map((inv) => (
                    <button
                      id={`inv-type-${inv.id}`}
                      key={inv.id}
                      type="button"
                      onClick={() => setInverterType(inv.id as InverterType)}
                      className={`w-full text-left p-4 border rounded-xl transition-all ${inverterType === inv.id ? 'border-[#156DB7] bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <h4 className="text-xs font-bold text-slate-800">{inv.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{inv.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation reason */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#123A63]">
                    <ShieldCheck className="w-5 h-5 text-[#69BD45]" />
                    <span>VoltSolar Matching Recommendation</span>
                  </div>

                  {activeCalcs.engineeringRequiredInverterKva != null ? (
                    <div className="p-3 rounded-xl bg-white border border-slate-100">
                      <span className="text-[10px] font-bold text-[#156DB7] uppercase tracking-wider">
                        Engineering need (global)
                      </span>
                      <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                        ~{activeCalcs.engineeringRequiredInverterKva} kVA
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Calculated from your loads first — brand matching comes after.
                      </p>
                    </div>
                  ) : null}
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {activeCalcs.catalogMatchMode === 'generic'
                        ? 'Engineering size (no catalog SKU)'
                        : activeCalcs.catalogMatchMode === 'datasheet'
                          ? 'Datasheet-matched capacity'
                          : 'Catalog-matched capacity'}
                    </span>
                    <h3 className="text-3xl font-extrabold text-slate-900">{activeCalcs.inverterSizeKva.toFixed(1)} kVA / kW</h3>
                    {activeCalcs.inverterModelRecommended ? (
                      <p className="text-xs font-semibold text-slate-700 pt-1">{activeCalcs.inverterModelRecommended}</p>
                    ) : null}
                    {activeCalcs.catalogMatchMode === 'generic' ? (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                        Planning size only — enter datasheet specs below for Voc/MPPT/fuse verification, or change market/voltage.
                      </p>
                    ) : null}
                    {activeCalcs.catalogMatchMode === 'datasheet' ? (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mt-2">
                        Using your datasheet limits for string and protection checks. Confirm against the manufacturer PDF.
                      </p>
                    ) : null}
                  </div>

                  {(() => {
                    const designConnectedW =
                      activeCalcs.inverterDesignConnectedLoadW ?? activeCalcs.connectedLoad ?? 0;
                    const designPeakW =
                      activeCalcs.inverterDesignPeakLoadW ?? activeCalcs.peakLoad ?? 0;
                    const rawKw = designConnectedW / 1000;
                    const withSafetyKw = rawKw * 1.25;
                    const peakKw = designPeakW / 1000;
                    const minKva =
                      activeCalcs.inverterMinimumSizeKva ??
                      parseFloat(withSafetyKw.toFixed(2));

                    if (rawKw <= 0 && peakKw <= 0) {
                      return (
                        <p className="text-xs text-slate-500 bg-white p-3.5 rounded-xl border border-slate-100">
                          Add appliances first to see the inverter sizing math.
                        </p>
                      );
                    }

                    return (
                      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide px-3.5 py-2 border-b border-slate-100">
                          How this capacity was calculated
                        </p>
                        <ol className="divide-y divide-slate-100 text-xs text-slate-800">
                          <li className="px-3.5 py-2.5 flex justify-between gap-3">
                            <span className="text-slate-600">
                              1. Design connected load
                              {activeCalcs.operatingMode === 'hybrid_essentials'
                                ? ' (Critical + Essential + Managed)'
                                : ' (all appliances)'}
                            </span>
                            <span className="font-bold shrink-0">{rawKw.toFixed(2)} kW</span>
                          </li>
                          <li className="px-3.5 py-2.5 flex justify-between gap-3">
                            <span className="text-slate-600">
                              2. Apply continuous safety factor (× 1.25)
                            </span>
                            <span className="font-bold shrink-0">
                              {rawKw.toFixed(2)} × 1.25 = {withSafetyKw.toFixed(2)} kVA
                            </span>
                          </li>
                          <li className="px-3.5 py-2.5 flex justify-between gap-3">
                            <span className="text-slate-600">
                              3. Peak demand (diversity + motor start surplus)
                            </span>
                            <span className="font-bold shrink-0">{peakKw.toFixed(2)} kW</span>
                          </li>
                          <li className="px-3.5 py-2.5 flex justify-between gap-3">
                            <span className="text-slate-600">
                              4. Minimum continuous target used for matching
                            </span>
                            <span className="font-bold text-[#156DB7] shrink-0">
                              {minKva.toFixed(2)} kVA
                            </span>
                          </li>
                          <li className="px-3.5 py-2.5 flex justify-between gap-3">
                            <span className="text-slate-600">
                              5. Selected commercial inverter (must also cover peak surge)
                            </span>
                            <span className="font-bold text-[#69BD45] shrink-0">
                              {activeCalcs.inverterSizeKva.toFixed(1)} kVA
                            </span>
                          </li>
                        </ol>
                      </div>
                    );
                  })()}

                  {(() => {
                    const parsed = parseInverterReasonPoints(activeCalcs.inverterReason || '');
                    if (!parsed.headline && parsed.items.length === 0) return null;
                    return (
                      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        {parsed.headline ? (
                          <p className="text-xs font-semibold text-slate-800 px-3.5 py-2.5 border-b border-slate-100">
                            {parsed.headline.replace(/\.$/, '')}
                          </p>
                        ) : null}
                        <ul className="divide-y divide-slate-100">
                          {parsed.items.map(item => (
                            <li
                              key={`${item.label}-${item.value}`}
                              className="px-3.5 py-2.5 flex flex-col gap-0.5"
                            >
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                {item.label}
                              </span>
                              <span className="text-xs text-slate-800 leading-snug">{item.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100/50 flex items-start space-x-3 text-[10px] text-amber-800 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    The <span className="font-semibold">1.25× factor</span> is applied to the
                    design <span className="font-semibold">connected load</span> (step 1 → 2 above)
                    so the inverter has continuous headroom under heat. Peak demand is checked
                    separately against the inverter’s surge capacity — it is not multiplied by 1.25.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Datasheet inverter (optional)</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xl">
                    Enter manufacturer limits so Voc / MPPT / fuse math uses real datasheet values —
                    required for global installs when the built-in catalog has no matching SKU.
                  </p>
                </div>
                <button
                  type="button"
                  id="toggle-datasheet-inverter"
                  onClick={() => setUseDatasheetInverter(v => !v)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                    useDatasheetInverter
                      ? 'border-[#156DB7] bg-[#156DB7]/10 text-[#156DB7]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {useDatasheetInverter ? 'Using datasheet specs' : 'Enter datasheet specs'}
                </button>
              </div>

              {useDatasheetInverter && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'ds-brand', label: 'Brand', val: dsBrand, set: setDsBrand, ph: 'e.g. Deye' },
                    { id: 'ds-model', label: 'Model', val: dsModel, set: setDsModel, ph: 'e.g. SUN-5K' },
                    { id: 'ds-kva', label: 'Size (kVA) *', val: dsSizeKva, set: setDsSizeKva, ph: '5' },
                    { id: 'ds-voc', label: 'MPPT Voc max (V)', val: dsMpptVoc, set: setDsMpptVoc, ph: '500' },
                    { id: 'ds-vmpmin', label: 'MPPT Vmp min (V)', val: dsMpptVmpMin, set: setDsMpptVmpMin, ph: '120' },
                    { id: 'ds-vmpmax', label: 'MPPT Vmp max (V)', val: dsMpptVmpMax, set: setDsMpptVmpMax, ph: '430' },
                    { id: 'ds-ipv', label: 'Max PV current (A)', val: dsMaxPvCurrent, set: setDsMaxPvCurrent, ph: '14' },
                    { id: 'ds-ppv', label: 'Max PV power (W)', val: dsMaxPvPower, set: setDsMaxPvPower, ph: '6500' },
                    { id: 'ds-mppt', label: 'Number of MPPTs', val: dsNumMppts, set: setDsNumMppts, ph: '2' },
                    { id: 'ds-ibat', label: 'Max batt discharge (A)', val: dsBattDischargeA, set: setDsBattDischargeA, ph: '120' },
                    { id: 'ds-surge', label: 'Surge factor', val: dsSurgeFactor, set: setDsSurgeFactor, ph: '2' }
                  ].map(f => (
                    <div key={f.id}>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{f.label}</label>
                      <input
                        id={f.id}
                        type="text"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.ph}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#156DB7]/25"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Battery voltage *</label>
                    <select
                      id="ds-voltage"
                      value={dsVoltageV}
                      onChange={e => setDsVoltageV(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#156DB7]/25"
                    >
                      <option value="12">12 V</option>
                      <option value="24">24 V</option>
                      <option value="48">48 V</option>
                    </select>
                  </div>
                  {!buildCustomInverterInput() ? (
                    <p className="col-span-2 md:col-span-4 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Enter at least Size (kVA) and battery voltage to apply datasheet matching.
                    </p>
                  ) : activeCalcs.catalogMatchMode === 'datasheet' ? (
                    <p className="col-span-2 md:col-span-4 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      Datasheet inverter active — Voc/MPPT/protection use your entered limits. Confirm against the manufacturer PDF.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentStep === 7 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800 flex items-center mb-6">
              <Sun className="w-5 h-5 text-amber-500 mr-2" />
              <span>Solar PV Array Specification</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Panel Size Select */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Solar Panel Rating (Watts)</label>
                <div className="grid grid-cols-2 gap-4">
                  {[450, 550, 600, 650].map((watts) => (
                    <button
                      id={`pv-watt-${watts}`}
                      key={watts}
                      type="button"
                      onClick={() => setPanelSize(watts)}
                      className={`p-4 border text-center rounded-xl transition-all ${panelSize === watts ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <h4 className="text-sm font-bold text-slate-800">{watts} Wp</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Mono-crystalline</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Output — required target vs installed array */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Calculated Grid Architecture</span>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[10px] text-slate-400">Required array (from load)</span>
                      <span className="text-sm font-bold text-slate-700 tabular-nums">
                        {pvRequiredArrayKwp != null ? `${pvRequiredArrayKwp} kWp` : '—'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-snug">
                      Fixed by daily energy, peak sun hours, and system losses — not by panel wattage.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400">Installed Array Size</span>
                      <h4 className="text-xl font-bold text-slate-800 mt-0.5 tabular-nums">{pvInstalledArrayKwp} kWp</h4>
                      {pvArrayMarginPct != null ? (
                        <p className="text-[9px] text-[#156DB7] font-semibold mt-0.5">~{pvArrayMarginPct}% above required</p>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Panel Quantity</span>
                      <h4 className="text-xl font-bold text-slate-800 mt-0.5">{activeCalcs.panelQuantity} Panels</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {activeCalcs.panelQuantity} × {pvSelectedModuleWp} Wp
                        {pvSelectedModuleWp !== panelSize ? ` (fit ${pvSelectedModuleWp} Wp)` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200/60 space-y-2">
                    <span className="text-[10px] text-slate-400">Recommended Array Configuration</span>
                    <p className="text-xs font-bold text-[#156DB7]">
                      {activeCalcs.panelConfiguration}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200/60 space-y-1">
                    <span className="text-[10px] text-slate-400">Estimated Daily Production</span>
                    <p className="text-sm font-bold text-[#69BD45]">
                      {activeCalcs.estimatedDailyProductionKwh} kWh / day
                    </p>
                    <p className="text-[9px] text-slate-400">
                      From the installed array · {activeCalcs.peakSunHoursUsed ?? 4.5} peak sun hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 8 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 print:hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#156DB7] uppercase tracking-wider">Project Review Stage</span>
                <h3 className="text-sm font-bold text-slate-800">Sizing Specification Proposal Document</h3>
                <p className="text-xs text-slate-500">Review all parameters before saving. Download a PDF or print this report for your client.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="wiz-pdf-btn"
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-[#156DB7]/30 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-60 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingPdf ? 'Preparing PDF…' : 'Download PDF'}</span>
                </button>
                <button
                  id="wiz-print-btn"
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Print Sizing Sheet</span>
                </button>
                <button
                  id="wiz-direct-edit-step1"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#156DB7] hover:text-[#0F5288]"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Base Info</span>
                </button>
              </div>
            </div>

            <div ref={reportRef} id="engineering-report">
            <EngineeringReport
              calcs={activeCalcs}
              projectName={projectName}
              clientName={clientName}
              clientPhone={clientPhone}
              clientEmail={clientEmail}
              location={location}
              projectType={projectType}
              backupHours={backupHours}
              batteryType={batteryType}
              systemVoltage={systemVoltage}
              inverterType={inverterType}
              panelSize={panelSize}
              appliancesList={appliancesList}
              designId={designId}
              issuedAt={reportIssuedAt}
              onEditStep={setCurrentStep}
              designAudience={designAudience}
            />
            </div>

            {/* Save Actions and start new buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end print:hidden">
              <button
                id="wiz-start-fresh"
                onClick={() => {
                  if (confirm("Are you sure you want to discard current changes and start a new empty sizing template?")) {
                    setCurrentStep(1);
                    setProjectName('');
                    setClientName('');
                    setClientPhone('');
                    setClientEmail('');
                    setLocation('');
                    setProjectType('residential');
                    setDesignAudience('simple');
                    setSystemGoal('overnight_essentials');
                    setAppliancesList([]);
                    setBackupHours(8);
                    setIsCustomHours(false);
                    setOperatingMode('hybrid_essentials');
                    setBatteryType('lithium');
                    setSystemVoltage('auto');
                    setInverterType('auto');
                    setPanelSize(550);
                    setPvCableDistanceM('');
                    setBatteryCableDistanceM('');
                    setAcCableDistanceM('');
                  }
                }}
                className="px-6 py-3.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 font-semibold text-xs rounded-xl transition-all text-center"
              >
                Start New Empty Design
              </button>
              
              <button
                id="wiz-back-to-list"
                onClick={onClose}
                className="px-6 py-3.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all text-center"
              >
                Back to Projects List
              </button>

              <button
                id="wiz-final-save-btn"
                type="button"
                disabled={isSavingProject}
                onClick={() => void handleSaveProjectDesign()}
                className="px-8 py-3.5 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-[#156DB7]/10 hover:shadow-lg transition-all text-center"
              >
                {isSavingProject
                  ? 'Saving to cloud…'
                  : persistedProject
                    ? 'Save Updates & Close'
                    : 'Save Project & Close'}
              </button>
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>

      {/* Navigation Buttons at bottom */}
      {currentStep < totalSteps && (
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-200">
          <button
            id="wiz-back-btn"
            type="button"
            disabled={currentStep === 1}
            onClick={handleBack}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 border border-slate-200 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              id="wiz-save-draft-btn"
              type="button"
              disabled={isSavingProject}
              onClick={() => void handleSaveDraftOnly()}
              className="inline-flex items-center justify-center px-5 py-3 border border-slate-200 hover:border-[#156DB7]/40 hover:bg-[#156DB7]/5 text-slate-700 disabled:opacity-60 rounded-xl font-semibold text-xs transition-colors"
            >
              {isSavingProject ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              id="wiz-next-btn"
              type="button"
              disabled={isSavingProject}
              onClick={() => void handleNext()}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-60 text-white rounded-xl font-semibold text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <span>
                {isSavingProject
                  ? 'Saving draft…'
                  : designAudience === 'simple' && currentStep === 4
                    ? 'See home quote'
                    : currentStep === totalSteps - 1
                      ? 'Generate Report'
                      : 'Continue'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
