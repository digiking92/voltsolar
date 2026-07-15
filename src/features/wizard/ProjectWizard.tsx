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
import { exportReportPdf } from '../../lib/exportReportPdf';
import { Project, ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations } from '../../types';
import { EngineeringReport } from './EngineeringReport';

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

  // Step 4: Backup Hours
  const [backupHours, setBackupHours] = useState<number>(8);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustomHours, setIsCustomHours] = useState(false);

  // Step 5: Battery
  const [batteryType, setBatteryType] = useState<BatteryType>('lithium');
  const [systemVoltage, setSystemVoltage] = useState<SystemVoltage>('auto');

  // Step 6: Inverter
  const [inverterType, setInverterType] = useState<InverterType>('auto');

  // Step 7: Solar Panels
  const [panelSize, setPanelSize] = useState<number>(550);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportIssuedAt = useMemo(() => new Date(), []);
  const designId = useMemo(() => {
    const seed = `${projectName}|${clientName}|${location}|${backupHours}|${batteryType}|${systemVoltage}|${panelSize}|${appliancesList.length}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    return `VS-${reportIssuedAt.getFullYear()}-${Math.abs(hash % 9000) + 1000}`;
  }, [projectName, clientName, location, backupHours, batteryType, systemVoltage, panelSize, appliancesList.length, reportIssuedAt]);

  // Populate data if editing
  useEffect(() => {
    if (projectToEdit) {
      setProjectName(projectToEdit.projectName);
      setClientName(projectToEdit.clientName);
      setClientPhone(projectToEdit.phone || '');
      setClientEmail(projectToEdit.email || '');
      setLocation(projectToEdit.location);
      setProjectType(projectToEdit.projectType);
      
      setAppliancesList(projectToEdit.appliances);
      
      const hours = projectToEdit.backupHours;
      if ([4, 6, 8, 12, 18, 24].includes(hours)) {
        setBackupHours(hours);
        setIsCustomHours(false);
      } else {
        setBackupHours(hours);
        setCustomHours(hours.toString());
        setIsCustomHours(true);
      }

      setBatteryType(projectToEdit.batteryType);
      setSystemVoltage(projectToEdit.systemVoltage);
      setInverterType(projectToEdit.inverterType);
      setPanelSize(projectToEdit.panelSize);
      
      setCurrentStep(8); // Open in Document Preview mode immediately
    } else {
      // Set some sensible initial default empty template
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
      
      setCurrentStep(1); // Start at step 1 for new designs
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
        hoursUsed: 4 // default 4 hours per day
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
      surgeMultiplier: surge
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

  const runActiveCalculations = (): Calculations & { isError?: boolean; errorMessage?: string; errorType?: string } => {
    // Expected during early wizard steps — do not run the engine or spam the console
    if (appliancesList.length === 0) {
      return emptyCalculations();
    }

    try {
      const actualBackupHours = isCustomHours ? (parseInt(customHours, 10) || 8) : backupHours;
      return runFullDesignCalculations(
        appliancesList,
        actualBackupHours,
        batteryType,
        systemVoltage,
        panelSize,
        location,
        inverterType,
        projectType
      );
    } catch (err: any) {
      console.error(err);
      return {
        ...emptyCalculations(),
        isError: true,
        errorMessage: err.message || 'An unexpected engineering calculation error occurred.',
        errorType: err.name || 'Engineering Sizing Inconsistency',
      };
    }
  };

  const activeCalcs = runActiveCalculations();

  // Navigation handlers
  const handleNext = () => {
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
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveProjectDesign = async () => {
    if (isSavingProject) return;
    const actualBackupHours = isCustomHours ? (parseInt(customHours, 10) || 8) : backupHours;
    const finalCalcs = runActiveCalculations();

    const projectData = {
      projectName,
      clientName,
      phone: clientPhone,
      email: clientEmail,
      location,
      projectType,
      backupHours: actualBackupHours,
      batteryType,
      systemVoltage,
      inverterType,
      panelSize,
      appliances: appliancesList,
      calculations: finalCalcs
    };

    setIsSavingProject(true);
    try {
      if (projectToEdit) {
        await updateProject({
          ...projectToEdit,
          ...projectData
        });
      } else {
        await addProject(projectData);
      }
      onClose();
    } catch (err) {
      console.error('Project save failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Could not save this project. Please try again.';
      window.alert(message);
    } finally {
      setIsSavingProject(false);
    }
  };

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
      await exportReportPdf(
        {
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
          issuedAt: reportIssuedAt
        },
        `${name}-VoltSolar-Report`
      );
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
              currentStep === 1 ? 'Client Profiler' :
              currentStep === 2 ? 'Appliance Load Entry' :
              currentStep === 3 ? 'Load Calculation Summary' :
              currentStep === 4 ? 'Backup Schedules' :
              currentStep === 5 ? 'Battery Sizing Parameters' :
              currentStep === 6 ? 'Inverter Sizing recommendation' :
              currentStep === 7 ? 'Solar Array Grid sizing' :
              'Completed Engineering Results'
            }
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
                    placeholder="e.g. Austin, TX"
                  />
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

                          <div className="text-[10px] text-right font-semibold text-slate-500 pt-1 border-t border-slate-100/60">
                            Daily Sizing Load: <span className="font-bold text-[#156DB7]">{((app.customWattage * app.quantity * app.hoursUsed) / 1000).toFixed(2)} kWh</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Total Estimated Daily Energy:</span>
                    <span className="text-base text-[#156DB7]">{(activeCalcs.dailyEnergy / 1000).toFixed(2)} kWh</span>
                  </div>
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
                <h3 className="text-2xl font-bold text-slate-900">{(activeCalcs.connectedLoad / 1000).toFixed(2)} kW</h3>
                <p className="text-[10px] text-slate-500">Cumulative sum of active wattage loads.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-[#156DB7] uppercase tracking-widest">Peak Startup Surge</span>
                <h3 className="text-2xl font-bold text-slate-900">{(activeCalcs.peakLoad / 1000).toFixed(2)} kW</h3>
                <p className="text-[10px] text-slate-500">Includes startup overhead calculations.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-[#69BD45] uppercase tracking-widest">Daily Consumption</span>
                <h3 className="text-2xl font-bold text-slate-900">{(activeCalcs.dailyEnergy / 1000).toFixed(2)} kWh</h3>
                <p className="text-[10px] text-slate-500">Continuous daily electrical consumption.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Monthly Sizing</span>
                <h3 className="text-2xl font-bold text-slate-900">{(activeCalcs.monthlyEnergy).toFixed(1)} kWh</h3>
                <p className="text-[10px] text-slate-500">Monthly billing baseline calculation.</p>
              </div>
            </div>

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
                          {((app.customWattage * app.quantity * app.hoursUsed) / 1000).toFixed(2)} kWh
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
              <span>Configure Backup Run-Times</span>
            </h2>

            <div className="space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Select the target backup duration during which batteries must support continuous electrical loads without solar or grid charging inputs.
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
                  ].map((v) => (
                    <button
                      id={`sys-volt-${v.id}`}
                      key={v.id}
                      type="button"
                      onClick={() => setSystemVoltage(v.id as SystemVoltage)}
                      className={`text-left p-4 border rounded-xl transition-all ${systemVoltage === v.id ? 'border-[#156DB7] bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <h4 className="text-xs font-bold text-slate-800">{v.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{v.desc}</p>
                    </button>
                  ))}
                </div>

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
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Capacity</span>
                    <h3 className="text-3xl font-extrabold text-slate-900">{activeCalcs.inverterSizeKva.toFixed(1)} kVA / kW</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-100">
                    {activeCalcs.inverterReason}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100/50 flex items-start space-x-3 text-[10px] text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>The calculation applies a safety factor of 1.25× to peak reactive starting currents to secure structural inverter continuous ratings under thermal margins.</span>
                </div>
              </div>
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

              {/* Instant Output calculations summary */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Calculated Grid Architecture</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400">Total Array Size</span>
                      <h4 className="text-xl font-bold text-slate-800 mt-0.5">{activeCalcs.solarArrayKw} kWp</h4>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Panel Quantity</span>
                      <h4 className="text-xl font-bold text-slate-800 mt-0.5">{activeCalcs.panelQuantity} Panels</h4>
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
                    <p className="text-[9px] text-slate-400">Based on a localized standard 4.5 Peak Sun Hours metric.</p>
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
                    setAppliancesList([]);
                    setBackupHours(8);
                    setIsCustomHours(false);
                    setBatteryType('lithium');
                    setSystemVoltage('auto');
                    setInverterType('auto');
                    setPanelSize(550);
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
                  : projectToEdit
                    ? 'Save Changes & Close Document'
                    : 'Save Sizing Project Design'}
              </button>
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>

      {/* Navigation Buttons at bottom */}
      {currentStep < totalSteps && (
        <div className="flex justify-between items-center pt-6 border-t border-slate-200">
          <button
            id="wiz-back-btn"
            type="button"
            disabled={currentStep === 1}
            onClick={handleBack}
            className="inline-flex items-center space-x-2 px-5 py-3 border border-slate-200 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            id="wiz-next-btn"
            type="button"
            onClick={handleNext}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#156DB7] hover:bg-[#0F5288] text-white rounded-xl font-semibold text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <span>{currentStep === totalSteps - 1 ? 'Generate Calculations' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
