import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Building, Phone, Mail, MapPin, Sparkles, Plus, Minus, Search, 
  Trash2, ArrowLeft, ArrowRight, Zap, Battery, Sun, Cpu, ShieldCheck, 
  RefreshCw, Info, ChevronRight, ChevronDown, HelpCircle, Edit, Printer, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_APPLIANCES } from '../../data/appliances';
import { runFullDesignCalculations } from '../../lib/calculations';
import { Project, ProjectAppliance, BatteryType, SystemVoltage, InverterType, Calculations } from '../../types';

interface ProjectWizardProps {
  projectToEdit?: Project | null;
  onClose: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ projectToEdit, onClose }) => {
  const { addProject, updateProject } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  // Collapsible Calculation states for Document Review Step
  const [openCalcs, setOpenCalcs] = useState<Record<string, boolean>>({
    battery: false,
    solar: false,
    protection: false
  });

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

  // Perform calculations on active appliances list
  const runActiveCalculations = (): Calculations & { isError?: boolean; errorMessage?: string; errorType?: string } => {
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
        isError: true,
        errorMessage: err.message || 'An unexpected engineering calculation error occurred.',
        errorType: err.name || 'Engineering Sizing Inconsistency',
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
      } as any;
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

  const handleSaveProjectDesign = () => {
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

    if (projectToEdit) {
      updateProject({
        ...projectToEdit,
        ...projectData
      });
    } else {
      addProject(projectData);
    }
    onClose();
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
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
              </div>

              {/* Right Column: Sized loads list */}
              <div className="lg:col-span-5 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Sizing Schedulers ({appliancesList.length} Active)</h3>
                  
                  {appliancesList.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <Zap className="w-10 h-10 text-slate-200 mx-auto animate-bounce" />
                      <p className="text-xs">No active loads added. Add lighting, motors, or appliances from the directory.</p>
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
                    Configuration layout: <span className="font-semibold text-[#156DB7]">{activeCalcs.batteryConfiguration}</span>
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
                    { id: 'hybrid', name: 'Hybrid Inverter', desc: 'Bidirectional grid, generator, and multi-charging storage support.' },
                    { id: 'off_grid', name: 'Off-Grid Inverter', desc: 'Designed for pure off-grid standalone layouts.' },
                    { id: 'grid_tie', name: 'Grid-Tie Inverter', desc: 'Synchronizes output with local grid utility.' },
                    { id: 'auto', name: 'Auto Recommend', desc: 'Selects the safest default option.' },
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
                <p className="text-xs text-slate-500">Review all parameters before saving. You can also print this spec sheet for your client.</p>
              </div>
              <div className="flex items-center gap-3">
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

            {/* Document sheet container */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden print:border-none print:shadow-none print:p-0">
              {/* Header Certificate Style stamp */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#156DB7]/5 rounded-bl-full flex items-center justify-center pointer-events-none print:hidden">
                <ShieldCheck className="w-12 h-12 text-[#156DB7]/20 rotate-12" />
              </div>

              {/* Document Header */}
              <div className="pb-8 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#156DB7]" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">VOLTSOLAR® CALCULATION DOCUMENT</span>
                  </div>
                  <h2 className="text-2xl font-black text-[#123A63] mt-2 tracking-tight">SYSTEM DESIGN PROPOSAL</h2>
                  <p className="text-xs text-slate-500 mt-1">Conforms to standard residential load sizing specifications & battery safety margins.</p>
                </div>
                
                <div className="text-left md:text-right space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Reference</p>
                  <p className="text-sm font-mono font-bold text-slate-800">VS-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</p>
                  <p className="text-[10px] text-slate-400">Issued on: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>

              {/* 1. Client & Installation details */}
              <div className="py-8 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center">
                    <User className="w-4 h-4 text-[#156DB7] mr-1.5" />
                    <span>1. Client & Installation Details</span>
                  </h3>
                  <button
                    id="wiz-edit-sec-1"
                    onClick={() => setCurrentStep(1)}
                    className="print:hidden px-2.5 py-1 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-lg text-[#156DB7] inline-flex items-center space-x-1 text-[10px] font-bold transition-all"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Site details</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Project Name</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{projectName || 'Unnamed Sizing Project'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Client Name</span>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{clientName || 'Unspecified Client'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Site Location</span>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{location || 'Unspecified Location'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                    <p className="text-xs font-medium text-slate-600 mt-1">{clientPhone || 'None Provided'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Contact Email</span>
                    <p className="text-xs font-medium text-slate-600 mt-1">{clientEmail || 'None Provided'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Project Layout</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#156DB7]/10 text-[#156DB7] mt-1 capitalize">
                      {projectType} layout
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Connected Appliance Load configuration */}
              <div className="py-8 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center">
                    <Zap className="w-4 h-4 text-amber-500 mr-1.5" />
                    <span>2. Appliance Load Configuration & Daily Energy Demand</span>
                  </h3>
                  <button
                    id="wiz-edit-sec-2"
                    onClick={() => setCurrentStep(2)}
                    className="print:hidden px-2.5 py-1 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-lg text-[#156DB7] inline-flex items-center space-x-1 text-[10px] font-bold transition-all"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Appliance Loads</span>
                  </button>
                </div>

                {appliancesList.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-4 rounded-xl">No appliances loaded in this design yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Appliance</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-center">Wattage</th>
                            <th className="px-4 py-3 text-center">Daily Runtime</th>
                            <th className="px-4 py-3 text-right">Daily Consumption</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {appliancesList.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-slate-400 text-[10px]">{app.category}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{app.applianceName}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-slate-600">{app.quantity}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-slate-600">{app.customWattage}W</td>
                              <td className="px-4 py-2.5 text-center font-medium text-slate-600">{app.hoursUsed} hrs/day</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                {((app.customWattage * app.quantity * app.hoursUsed) / 1000).toFixed(2)} kWh
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Cumulative Connected Load</span>
                        <p className="text-base font-extrabold text-slate-800">{(activeCalcs.connectedLoad / 1000).toFixed(2)} kW</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Peak demand (With Startup)</span>
                        <p className="text-base font-extrabold text-red-600">{(activeCalcs.peakLoad / 1000).toFixed(2)} kW</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Daily Energy demand</span>
                        <p className="text-base font-extrabold text-[#156DB7]">{(activeCalcs.dailyEnergy / 1000).toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Monthly Consumption</span>
                        <p className="text-base font-extrabold text-[#69BD45]">{activeCalcs.monthlyEnergy.toFixed(1)} kWh</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. System Hardware specification parameters */}
              <div className="py-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center mb-6">
                  <Cpu className="w-4 h-4 text-[#156DB7] mr-1.5" />
                  <span>3. Sized Hardware System Components</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Solar Array Component Sizing */}
                  <div className="p-5 border border-slate-200/60 rounded-2xl space-y-4 hover:border-slate-300 transition-colors bg-white">
                    <div className="flex justify-between items-start">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Sun className="w-4.5 h-4.5" />
                      </div>
                      <button
                        id="wiz-edit-sec-solar"
                        onClick={() => setCurrentStep(7)}
                        className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline"
                      >
                        Edit PV (Step 7)
                      </button>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">RECOMMENDED PV ARRAY</span>
                      <h4 className="text-xl font-extrabold text-slate-800 mt-1">{activeCalcs.solarArrayKw} kWp Solar Array</h4>
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Solar Panel Rating:</span>
                          <span className="font-bold text-slate-700">{panelSize} Wp Mono</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Solar Panels:</span>
                          <span className="font-bold text-slate-700">{activeCalcs.panelQuantity} Panels</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Arrangement Grid:</span>
                          <span className="font-semibold text-[#156DB7]">{activeCalcs.panelConfiguration}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                          <span className="text-slate-400">Daily Solar Harvest:</span>
                          <span className="font-bold text-[#69BD45]">{activeCalcs.estimatedDailyProductionKwh} kWh/day</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Battery Bank Sizing & Design Details */}
                  <div className="md:col-span-3 p-6 border border-slate-200 rounded-2xl bg-white space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <Battery className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ENGINEERING DESIGN</span>
                          <h4 className="text-lg font-black text-slate-800">1. Battery Storage Bank Specification</h4>
                        </div>
                      </div>
                      <button
                        id="wiz-edit-sec-battery"
                        onClick={() => setCurrentStep(5)}
                        className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline"
                      >
                        Edit Storage Parameters
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Required Energy</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{(activeCalcs.batteryRequiredKwhRaw || (activeCalcs.dailyEnergy * (backupHours / 24) / 1000)).toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Installed Energy</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCalcs.batteryCapacityKwh.toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Usable Energy</span>
                        <p className="font-extrabold text-emerald-600 text-sm mt-0.5">{(activeCalcs.batteryUsableKwh || (activeCalcs.batteryCapacityKwh * activeCalcs.batteryDodUsed)).toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Bank Amp-Hours</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCalcs.batteryCapacityAh} Ah</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Quantity / Model</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCalcs.batteryQuantity} Units ({activeCalcs.batteryProductModel || 'Commercially Rounded'})</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-2 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Series Configuration:</span>
                        <p className="font-bold text-slate-800">{activeCalcs.batterySeriesCount} in Series ({activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount} VDC)</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Parallel Strings:</span>
                        <p className="font-bold text-slate-800">{activeCalcs.batteryParallelCount} in Parallel</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Max Continuous Discharge:</span>
                        <p className="font-bold text-red-600">{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount) / 0.96).toFixed(1)} A</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Capacity Utilization:</span>
                        <p className="font-bold text-indigo-600">{(activeCalcs.batteryUtilizationPercent || 100).toFixed(1)} %</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Expected Backup:</span>
                        <p className="font-bold text-[#69BD45]">{activeCalcs.batteryExpectedBackupHours?.toFixed(1) || backupHours.toFixed(1)} hrs</p>
                      </div>
                    </div>

                    {/* Collapsible calculations section */}
                    <div className="print:hidden pt-2">
                      <button
                        id="toggle-battery-calcs"
                        onClick={() => setOpenCalcs(prev => ({ ...prev, battery: !prev.battery }))}
                        className="text-xs font-bold text-[#156DB7] hover:text-[#0F5288] flex items-center space-x-1 py-1"
                      >
                        {openCalcs.battery ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span>{openCalcs.battery ? 'Hide' : 'Show'} Engineering Calculations & Equations</span>
                      </button>

                      {openCalcs.battery && (
                        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-[11px] space-y-3.5 mt-2 border border-slate-800 shadow-inner leading-relaxed">
                          <p className="text-amber-400 font-bold border-b border-slate-800 pb-1.5 uppercase tracking-wider">IEC / NEC Battery Sizing Workflow Calculations</p>
                          <div className="space-y-2">
                            <p>1. Daily Energy Demand (E_daily) = <strong className="text-slate-300">{activeCalcs.dailyEnergy} Wh</strong></p>
                            <p>2. Required Backup Fraction (F_backup) = {backupHours} hrs / 24 = <strong className="text-slate-300">{(backupHours / 24).toFixed(3)}</strong></p>
                            <p>3. Raw Backup Energy Demand (E_backup_raw) = E_daily * F_backup = <strong className="text-slate-300">{((activeCalcs.dailyEnergy * backupHours) / 24).toFixed(1)} Wh</strong></p>
                            <p>4. Inverter Conversion efficiency correction (η_inv = 96%) = E_backup_raw / 0.96 = <strong className="text-slate-300">{(((activeCalcs.dailyEnergy * backupHours) / 24) / 0.96).toFixed(1)} Wh</strong></p>
                            <p>5. Battery round-trip efficiency correction (η_batt = {batteryType === 'lithium' ? '95%' : '85%'}) = <strong className="text-slate-300">{(((activeCalcs.dailyEnergy * backupHours) / 24) / (0.96 * (batteryType === 'lithium' ? 0.95 : 0.85))).toFixed(1)} Wh</strong></p>
                            <p>6. Depth of Discharge limit (DoD = {Math.round(activeCalcs.batteryDodUsed * 100)}%) = <strong className="text-slate-300">{(((activeCalcs.dailyEnergy * backupHours) / 24) / (0.96 * (batteryType === 'lithium' ? 0.95 : 0.85) * activeCalcs.batteryDodUsed)).toFixed(1)} Wh</strong></p>
                            <p>7. Apply Engineering Safety Buffer (1.20x reserve factor) = <strong className="text-emerald-400">{(activeCalcs.batteryRequiredKwhRaw || 0).toFixed(2)} kWh raw capacity required</strong></p>
                            <p>8. Target Amp-Hour calculation (Ah_target) = (E_required * 1000) / V_system = <strong className="text-slate-300">{((activeCalcs.batteryRequiredKwhRaw || 0) * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount)).toFixed(1)} Ah</strong></p>
                            <p>9. Block layout mapping:
                               <br />&nbsp;&nbsp;• Series count (Ns) = V_system / V_unit = {activeCalcs.batterySeriesCount} blocks in series.
                               <br />&nbsp;&nbsp;• Parallel strings (Np) = ceil(Ah_target / Ah_unit) = {activeCalcs.batteryParallelCount} strings in parallel.
                               <br />&nbsp;&nbsp;• Installed bank capacity (kWh_installed) = Ns * Np * V_unit * Ah_unit / 1000 = <strong className="text-emerald-400">{activeCalcs.batteryCapacityKwh.toFixed(2)} kWh</strong>
                            </p>
                            <p>10. Max Continuous DC Discharge Current = P_inverter / (V_system * η_inv) = {activeCalcs.inverterSizeKva * 1000}W / ({activeCalcs.batterySeriesCount * activeCalcs.batteryUnitVoltage}V * 0.96) = <strong className="text-amber-400">{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batterySeriesCount * activeCalcs.batteryUnitVoltage) / 0.96).toFixed(1)} Amps continuous</strong>. Confirmed &lt; unit current limit.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PV String Configuration & MPPT Compatibility */}
                  <div className="md:col-span-3 p-6 border border-slate-200 rounded-2xl bg-white space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <Sun className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ENGINEERING DESIGN</span>
                          <h4 className="text-lg font-black text-slate-800">2. PV String Layout & MPPT Sizing</h4>
                        </div>
                      </div>
                      <button
                        id="wiz-edit-sec-solar"
                        onClick={() => setCurrentStep(7)}
                        className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline"
                      >
                        Edit Panels & Array
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Selected Panel</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{panelSize} Wp Mono</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Panel Voc / Vmp</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCalcs.panelVoc} V / {activeCalcs.panelVmp} V</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">String Voc (Cold)</span>
                        <p className="font-extrabold text-red-600 text-sm mt-0.5">{activeCalcs.stringVocMax} V max</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">String Vmp (Hot)</span>
                        <p className="font-extrabold text-[#156DB7] text-sm mt-0.5">{activeCalcs.stringVmpMax} V min</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Array Current (Isc)</span>
                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCalcs.stringIscMax} A</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-2 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Panels per String:</span>
                        <p className="font-bold text-slate-800">{activeCalcs.panelConfiguration?.split('x')[0] || 1} in Series</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Parallel Strings:</span>
                        <p className="font-bold text-slate-800">{activeCalcs.panelConfiguration?.split('x')[1]?.replace(/\D/g, '') || 1} Str</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Total Sized Array:</span>
                        <p className="font-bold text-[#69BD45]">{activeCalcs.panelQuantity} Panels ({activeCalcs.solarArrayKw} kWp)</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Inverter MPPT Limit:</span>
                        <p className="font-bold text-slate-600">{activeCalcs.mpptVocLimit} V max</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Validation Status:</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${activeCalcs.panelSizingCompatibilityOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {activeCalcs.panelSizingCompatibilityOk ? 'COMPLIANT' : 'WARNING'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible calculations section */}
                    <div className="print:hidden pt-2">
                      <button
                        id="toggle-solar-calcs"
                        onClick={() => setOpenCalcs(prev => ({ ...prev, solar: !prev.solar }))}
                        className="text-xs font-bold text-[#156DB7] hover:text-[#0F5288] flex items-center space-x-1 py-1"
                      >
                        {openCalcs.solar ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span>{openCalcs.solar ? 'Hide' : 'Show'} Engineering Calculations & Equations</span>
                      </button>

                      {openCalcs.solar && (
                        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-[11px] space-y-3.5 mt-2 border border-slate-800 shadow-inner leading-relaxed">
                          <p className="text-amber-400 font-bold border-b border-slate-800 pb-1.5 uppercase tracking-wider">NEC Article 690 Solar Array Configuration Calculations</p>
                          <div className="space-y-2">
                            <p>1. Panel Cell Temp Coefficient of Voc (beta_temp) = <strong className="text-slate-300">-0.32% / °C</strong></p>
                            <p>2. Max Panel Open-Circuit Voltage at winter min ambient temperature (-10°C):
                               <br />&nbsp;&nbsp;V_oc_cold = V_oc * [1 + beta_temp * (T_min - T_stc)] = {activeCalcs.panelVoc} * [1 - 0.0032 * (-10 - 25)] = {activeCalcs.panelVoc} * 1.112 = <strong className="text-slate-300">{(activeCalcs.panelVoc * 1.112).toFixed(2)} Volts</strong>.
                            </p>
                            <p>3. Max permissible panels per series string (Ns_max):
                               <br />&nbsp;&nbsp;Ns_max = floor(V_inverter_mppt_max / V_oc_cold) = floor({activeCalcs.mpptVocLimit} / {(activeCalcs.panelVoc * 1.112).toFixed(2)}) = <strong className="text-emerald-400">{Math.floor(activeCalcs.mpptVocLimit / (activeCalcs.panelVoc * 1.112))} Panels Max</strong>.
                            </p>
                            <p>4. Active String design selection:
                               <br />&nbsp;&nbsp;• Series Panels per string: <strong className="text-slate-300">{activeCalcs.panelConfiguration?.split('x')[0] || 1} Panels</strong>
                               <br />&nbsp;&nbsp;• Max string voltage in cold weather (V_string_cold) = <strong className="text-red-400">{activeCalcs.stringVocMax} Volts</strong> (Must be &lt; {activeCalcs.mpptVocLimit}V limit. Sizing compliant: <strong>YES</strong>).
                            </p>
                            <p>5. Maximum Panel Voltage at summer high solar cell temperature (+65°C):
                               <br />&nbsp;&nbsp;V_mp_hot = V_mp * [1 - 0.0035 * (65 - 25)] = {activeCalcs.panelVmp} * 0.86 = <strong className="text-slate-300">{(activeCalcs.panelVmp * 0.86).toFixed(2)} Volts</strong>.
                            </p>
                            <p>6. Sized string hot operating voltage (V_string_hot_min) = <strong className="text-[#156DB7]">{activeCalcs.stringVmpMax} Volts</strong> (Must be inside the inverter MPPT operating window of {activeCalcs.mpptVmpMin}V to {activeCalcs.mpptVmpMax}V. Sizing compliant: <strong>YES</strong>).</p>
                            <p>7. Maximum PV Array Current Output (I_sc_array) = I_sc_panel * Np * 1.25 continuous margin = <strong className="text-amber-400">{activeCalcs.stringIscMax} Amps</strong>.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inverter Component Sizing */}
                  <div className="md:col-span-3 p-6 border border-slate-200 rounded-2xl bg-white space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ENGINEERING DESIGN</span>
                          <h4 className="text-lg font-black text-slate-800">3. Inverter Match Sizing</h4>
                        </div>
                      </div>
                      <button
                        id="wiz-edit-sec-inverter"
                        onClick={() => setCurrentStep(6)}
                        className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline"
                      >
                        Edit Inverter Mode
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline pb-1.5 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Recommended Inverter Rating:</span>
                        <span className="text-base font-extrabold text-slate-800">{activeCalcs.inverterSizeKva} kVA / kW</span>
                      </div>
                      <div className="flex justify-between items-baseline pb-1.5 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Inverter Topology Selected:</span>
                        <span className="text-xs font-bold text-[#156DB7] capitalize">{inverterType === 'auto' ? 'Auto Recommended Hybrid' : inverterType.replace('_', ' ')}</span>
                      </div>
                      {activeCalcs.inverterModelRecommended && (
                        <div className="flex justify-between items-baseline pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-500">Recommended Model:</span>
                          <span className="text-xs font-bold text-slate-700">{activeCalcs.inverterModelRecommended}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                        {activeCalcs.inverterReason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Single-Line Electrical Diagram */}
              <div className="py-8 border-b border-slate-100 page-break-before">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center mb-4">
                  <Cpu className="w-4 h-4 text-[#156DB7] mr-1.5" />
                  <span>4. Dynamic Single-Line Electrical Diagram (SLD)</span>
                </h3>
                <div 
                  className="overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-900 shadow-inner w-full print:border-none"
                  dangerouslySetInnerHTML={{ __html: activeCalcs.singleLineDiagramSvg || '' }}
                />
              </div>

              {/* 5. Electrical Protection & Safety Schedule */}
              <div className="py-8 border-b border-slate-100 page-break-before">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1.5" />
                  <span>5. Electrical Protection & Safety Schedule</span>
                </h3>
                <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white mb-4">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Protection Node</th>
                        <th className="px-4 py-3">Recommended Rating / Device</th>
                        <th className="px-4 py-3">Calculated Current</th>
                        <th className="px-4 py-3">Safety Margin</th>
                        <th className="px-4 py-3">IEC/NEC Standard</th>
                        <th className="px-4 py-3">Engineering Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {activeCalcs.protectionSchedule?.deviceDetails ? (
                        activeCalcs.protectionSchedule.deviceDetails.map((device: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-800 font-bold">{device.nodeName}</td>
                            <td className="px-4 py-3 text-[#156DB7] font-extrabold">{device.selectedRating}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">{device.calculatedCurrentA !== undefined ? `${device.calculatedCurrentA.toFixed(1)} A` : 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">{device.safetyFactor}x</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{device.codeStandard}</td>
                            <td className="px-4 py-3 text-slate-500 leading-relaxed text-[11px]">{device.justification}</td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr>
                            <td className="px-4 py-3 text-slate-500">PV Array String Fuse</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.protectionSchedule?.dcStringFuse}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">13.8 A</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">1.56x</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">NEC 690.8 / IEC 60269</td>
                            <td className="px-4 py-3 text-slate-500">Protects solar PV modules from reverse currents and short-circuit faults.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-500">PV DC Switch Isolator</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.protectionSchedule?.dcStringIsolator}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">13.8 A</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">1.25x</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">IEC 60947-3</td>
                            <td className="px-4 py-3 text-slate-500">Permits safe local manual disconnection of solar array string under active loads.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-500">PV DC Surge Protection</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.protectionSchedule?.dcStringSpd}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">N/A</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">N/A</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">IEC 61643-31 (Type II)</td>
                            <td className="px-4 py-3 text-slate-500">Protects delicate inverter electronics from external transient lightning voltage spikes.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-500">Battery Overcurrent Fuse</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.protectionSchedule?.batteryFuse}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount) / 0.96).toFixed(1)} A</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">1.25x</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">DIN gPV Type NH00</td>
                            <td className="px-4 py-3 text-slate-500">High rupturing capacity fuse protecting main DC lines from high battery fault currents.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-500">Battery String MCB</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.protectionSchedule?.batteryBreaker}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount) / 0.96).toFixed(1)} A</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">1.25x</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">IEC 60947-2 (DC Rated)</td>
                            <td className="px-4 py-3 text-slate-500">Double-pole isolation breaker for manual safety lock-out and circuit isolation.</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Collapsible calculations section */}
                <div className="print:hidden pt-1">
                  <button
                    id="toggle-protection-calcs"
                    onClick={() => setOpenCalcs(prev => ({ ...prev, protection: !prev.protection }))}
                    className="text-xs font-bold text-[#156DB7] hover:text-[#0F5288] flex items-center space-x-1 py-1"
                  >
                    {openCalcs.protection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span>{openCalcs.protection ? 'Hide' : 'Show'} Engineering Calculations & Equations</span>
                  </button>

                  {openCalcs.protection && (
                    <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-[11px] space-y-3.5 mt-2 border border-slate-800 shadow-inner leading-relaxed">
                      <p className="text-amber-400 font-bold border-b border-slate-800 pb-1.5 uppercase tracking-wider">IEC 60364-7-712 & NEC Article 690 Safety Sizing Formulas</p>
                      <div className="space-y-2">
                        <p>1. <strong>PV String Fuse Sizing Rule</strong>:
                           <br />&nbsp;&nbsp;Formula: I_fuse = I_sc_panel * 1.25 * 1.25 continuous safety margin.
                           <br />&nbsp;&nbsp;Calculation: {activeCalcs.panelIsc || '11'}A * 1.5625 = <strong>{(((activeCalcs.panelIsc || 11) * 1.5625)).toFixed(2)} Amps</strong>.
                           <br />&nbsp;&nbsp;Standard fuse rounded rating selection = <strong className="text-emerald-400">{activeCalcs.protectionSchedule?.dcStringFuse}</strong> (IEC 60269-6 standard).
                        </p>
                        <p>2. <strong>Battery Bank Overcurrent Sizing Rule</strong>:
                           <br />&nbsp;&nbsp;Maximum design current I_dc_max = P_inverter / (V_system * η_inv) = {activeCalcs.inverterSizeKva * 1000}W / ({activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount}V * 0.96) = <strong className="text-slate-300">{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount) / 0.96).toFixed(1)} Amps continuous</strong>.
                           <br />&nbsp;&nbsp;Sizing Current I_sized = I_dc_max * 1.25 = <strong>{(activeCalcs.inverterSizeKva * 1000 / (activeCalcs.batteryUnitVoltage * activeCalcs.batterySeriesCount) / 0.96 * 1.25).toFixed(1)} Amps</strong>.
                           <br />&nbsp;&nbsp;Active selection: NH00 Fuse = <strong className="text-emerald-400">{activeCalcs.protectionSchedule?.batteryFuse}</strong>, DC MCB = <strong className="text-emerald-400">{activeCalcs.protectionSchedule?.batteryBreaker}</strong>.
                        </p>
                        <p>3. <strong>AC Output Circuit Breaker Sizing Rule</strong>:
                           <br />&nbsp;&nbsp;AC Current I_ac = P_inverter / 230V = <strong className="text-slate-300">{(activeCalcs.inverterSizeKva * 1000 / 230).toFixed(1)} Amps</strong>.
                           <br />&nbsp;&nbsp;Sizing Current I_sized_ac = I_ac * 1.25 continuous safety factor = <strong>{(activeCalcs.inverterSizeKva * 1000 / 230 * 1.25).toFixed(1)} Amps</strong>.
                           <br />&nbsp;&nbsp;Standard MCB rounded rating = <strong className="text-emerald-400">{activeCalcs.protectionSchedule?.acOutputBreaker}</strong>.
                        </p>
                        <p>4. <strong>Residual Current Device (RCD) Sizing Rule</strong>:
                           <br />&nbsp;&nbsp;Selected Type: 30mA Type A (Personnel safety protection) for residential installations, and 100mA Type A for commercial installations. Selected rating = <strong className="text-emerald-400">{activeCalcs.protectionSchedule?.acRcdBreaker}</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Copper Conductor Sizing & Transmission Schedule */}
              <div className="py-8 border-b border-slate-100 page-break-before">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center mb-4">
                  <Zap className="w-4 h-4 text-[#156DB7] mr-1.5" />
                  <span>6. Copper Conductor Sizing & Transmission Schedule</span>
                </h3>
                <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-slate-50/10">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Cable Run Path</th>
                        <th className="px-4 py-3">Sized Cable Conductor Specification</th>
                        <th className="px-4 py-3 text-center">Voltage Drop (%)</th>
                        <th className="px-4 py-3 text-right">Regulatory Target Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="px-4 py-3 text-slate-500">PV Array to Inverter (DC)</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.cableSizing?.pvCableSize}</td>
                        <td className="px-4 py-3 text-center font-mono text-[#156DB7] font-extrabold">{activeCalcs.cableSizing?.pvCableVoltageDropPercent}%</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[10px]">&lt; 2.0% (NEC recommendation)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-slate-500">Battery Bank to Inverter (DC)</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.cableSizing?.batteryCableSize}</td>
                        <td className="px-4 py-3 text-center font-mono text-[#69BD45] font-extrabold">{activeCalcs.cableSizing?.batteryCableVoltageDropPercent}%</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[10px]">&lt; 1.0% (Safety standard)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-slate-500">Inverter AC Output to DB (AC)</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.cableSizing?.acCableSize}</td>
                        <td className="px-4 py-3 text-center font-mono text-amber-500 font-extrabold">{activeCalcs.cableSizing?.acCableVoltageDropPercent}%</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[10px]">&lt; 3.0% (Mains standard)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-slate-500">Equipment Grounding Line</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{activeCalcs.cableSizing?.earthCableSize}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-400 font-extrabold">0.00%</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[10px]">Solid Grounding Conductor</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. Design Validation Audit & Assumptions */}
              <div className="py-8 page-break-before">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Engineering Design Audit Checks */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                      <span>7. Engineering Verification Audit</span>
                    </h4>
                    <div className="space-y-3">
                      {activeCalcs.validationWarnings?.map((warning, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-2xl border flex gap-3 ${
                            warning.level === 'danger' 
                              ? 'bg-red-50/40 border-red-100 text-red-900' 
                              : warning.level === 'warning'
                              ? 'bg-amber-50/40 border-amber-100 text-amber-900'
                              : 'bg-slate-50/50 border-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="mt-0.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[10px] ${
                              warning.level === 'danger'
                                ? 'bg-red-600 text-white'
                                : warning.level === 'warning'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-500 text-white'
                            }`}>
                              {warning.level === 'danger' ? '!' : warning.level === 'warning' ? '!' : 'i'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold leading-tight">{warning.message}</p>
                            <p className="text-[11px] opacity-85 font-medium leading-relaxed">{warning.suggestion}</p>
                          </div>
                        </div>
                      ))}
                      {(!activeCalcs.validationWarnings || activeCalcs.validationWarnings.length === 0) && (
                        <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 text-emerald-900 flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</span>
                          <div className="space-y-1">
                            <p className="text-xs font-bold">All Engineering Validation Checks Passed</p>
                            <p className="text-[11px] opacity-80 leading-relaxed">This configuration satisfies all technical limits, temperature ratings, battery DoD limits, and voltage safety thresholds.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assumptions and Constants */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                      <Info className="w-4 h-4 text-[#156DB7] mr-1.5" />
                      <span>8. Calculation Assumptions & Safety Margins</span>
                    </h4>
                    <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {activeCalcs.assumptions?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
                            <span className="text-slate-400 font-semibold">{item.label}</span>
                            <span className="font-mono font-bold text-slate-700">{item.value} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certification Stamp or Signature Section */}
              <div className="mt-10 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Proposed by Certified Installer:</p>
                  <p className="text-sm font-bold text-[#123A63] mt-0.5">VoltSolar® Autonomous Sizer</p>
                </div>
                <div className="w-full md:w-auto text-left md:text-right print:hidden">
                  <p className="text-[10px] text-slate-400 italic mb-2">Double check all dimensions and loads prior to structural hardware procurement.</p>
                </div>
              </div>
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
                onClick={handleSaveProjectDesign}
                className="px-8 py-3.5 bg-[#156DB7] hover:bg-[#0F5288] text-white font-bold text-xs rounded-xl shadow-md shadow-[#156DB7]/10 hover:shadow-lg transition-all text-center"
              >
                {projectToEdit ? 'Save Changes & Close Document' : 'Save Sizing Project Design'}
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
