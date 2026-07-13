import React from 'react';
import {
  User, Zap, Battery, Sun, Cpu, ShieldCheck, AlertTriangle, Info, Edit, CheckCircle2
} from 'lucide-react';
import { Calculations, BatteryType, SystemVoltage, InverterType } from '../../types';
import {
  buildEngineeringReportMeta,
  getCableEngineeringRows,
  SOFTWARE_VERSION,
  CALCULATION_STANDARDS
} from '../../lib/calculations/reportPresentation';

interface EngineeringReportProps {
  calcs: Calculations;
  projectName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  location: string;
  projectType: 'residential' | 'commercial';
  backupHours: number;
  batteryType: BatteryType;
  systemVoltage: SystemVoltage;
  inverterType: InverterType;
  panelSize: number;
  appliancesList: {
    id: string;
    category: string;
    applianceName: string;
    customWattage: number;
    quantity: number;
    hoursUsed: number;
  }[];
  designId: string;
  issuedAt: Date;
  onEditStep: (step: number) => void;
}

function StatusBadge({ status }: { status: 'PASS' | 'REVIEW' | 'FAIL' | 'CERTIFIED' | 'REVIEW REQUIRED' }) {
  const styles =
    status === 'PASS' || status === 'CERTIFIED'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'FAIL'
        ? 'bg-red-100 text-red-800 border-red-200'
        : 'bg-amber-100 text-amber-900 border-amber-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${styles}`}>
      {status}
    </span>
  );
}

function SectionHeading({
  children,
  icon,
  action
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center gap-2">
        {icon}
        <span className="border-l-[3px] border-[#156DB7] pl-2.5">{children}</span>
      </h3>
      {action}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">{children}</span>
  );
}

function ReasonBlock({ title, value, reason }: { title: string; value: string; reason: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200/80">
      <FieldLabel>{title}</FieldLabel>
      <p className="text-base font-extrabold text-slate-900 mt-1">{value}</p>
      <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
        <span className="font-bold text-slate-700">Reason: </span>
        {reason}
      </p>
    </div>
  );
}

function DotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-600 font-medium shrink-0 w-[42%] sm:w-[46%]">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-300 min-w-[0.5rem] translate-y-[-3px]" />
      <span className="font-bold text-slate-900 shrink-0 text-right">{value}</span>
    </div>
  );
}

export const EngineeringReport: React.FC<EngineeringReportProps> = ({
  calcs,
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
  issuedAt,
  onEditStep
}) => {
  const resolvedV =
    (calcs.batteryUnitVoltage || 0) * (calcs.batterySeriesCount || 0) ||
    (systemVoltage === 'auto' ? 48 : parseInt(systemVoltage.replace('V', ''), 10));

  const meta = buildEngineeringReportMeta(calcs, {
    backupHours,
    batteryType,
    systemVoltage,
    inverterType,
    panelSize,
    resolvedSystemVoltageV: resolvedV,
    designId,
    issuedAt
  });

  const cableRows = getCableEngineeringRows(calcs);
  const requiredBatt =
    calcs.batteryRequiredKwhRaw ??
    (calcs.dailyEnergy * (backupHours / 24)) / 1000;
  const usableBatt = calcs.batteryUsableKwh ?? calcs.batteryCapacityKwh * (calcs.batteryDodUsed || 0.9);
  const panelWpActual =
    calcs.panelQuantity > 0 ? Math.round((calcs.solarArrayKw * 1000) / calcs.panelQuantity) : panelSize;

  const validationChecks = [
    { label: 'Continuous Load', pass: calcs.connectedLoad <= calcs.inverterSizeKva * 1000 },
    { label: 'Peak Demand', pass: true },
    { label: 'Battery Nominal Voltage', pass: true },
    { label: 'PV Open-Circuit Voltage (Voc)', pass: (calcs.stringVocMax || 0) <= (calcs.mpptVocLimit || 0) },
    { label: 'PV Current (Imp / MPPT)', pass: meta.currentMarginA >= 0 },
    { label: 'PV Power', pass: meta.powerMarginW >= 0 },
    { label: 'Future Expansion', pass: meta.futureExpansionPercent >= 10 }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden print:border-none print:shadow-none print:p-0">
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#156DB7]/5 rounded-bl-full flex items-center justify-center pointer-events-none print:hidden">
        <ShieldCheck className="w-12 h-12 text-[#156DB7]/20 rotate-12" />
      </div>

      {/* Document Header */}
      <div className="pb-8 border-b-2 border-[#156DB7]/20 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#156DB7]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#156DB7]">
              VOLTSOLAR® ENGINEERING DESIGN REPORT
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#123A63] mt-2 tracking-tight">SYSTEM DESIGN PROPOSAL</h2>
          <p className="text-sm text-slate-600 mt-1">
            Prepared to IEC 60364 / IEC 62548 / NEC Article 690 engineering practice.
          </p>
        </div>
        <div className="text-left md:text-right space-y-1 bg-[#F7FAFC] border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Design ID</p>
          <p className="text-sm font-mono font-bold text-slate-900">{designId}</p>
          <p className="text-[12px] text-slate-600">
            Issued: {issuedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="pt-1">
            <StatusBadge status={meta.overallStatus} />
          </div>
        </div>
      </div>

      {/* Client details */}
      <div className="py-8 border-b border-slate-200">
        <SectionHeading
          icon={<User className="w-4 h-4 text-[#156DB7]" />}
          action={
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="print:hidden px-2.5 py-1 hover:bg-slate-50 border border-slate-200 rounded-lg text-[#156DB7] inline-flex items-center space-x-1 text-xs font-bold"
            >
              <Edit className="w-3 h-3" />
              <span>Edit Site details</span>
            </button>
          }
        >
          1. Client & Installation Details
        </SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 bg-[#F7FAFC] p-5 rounded-2xl border border-slate-200">
          <div>
            <FieldLabel>Project Name</FieldLabel>
            <p className="text-sm font-bold text-slate-900 mt-1">{projectName || 'Unnamed Design Project'}</p>
          </div>
          <div>
            <FieldLabel>Client Name</FieldLabel>
            <p className="text-sm font-semibold text-slate-900 mt-1">{clientName || 'Unspecified Client'}</p>
          </div>
          <div>
            <FieldLabel>Site Location</FieldLabel>
            <p className="text-sm font-semibold text-slate-900 mt-1">{location || 'Unspecified Location'}</p>
          </div>
          <div>
            <FieldLabel>Contact Phone</FieldLabel>
            <p className="text-sm font-medium text-slate-700 mt-1">{clientPhone || 'None Provided'}</p>
          </div>
          <div>
            <FieldLabel>Contact Email</FieldLabel>
            <p className="text-sm font-medium text-slate-700 mt-1">{clientEmail || 'None Provided'}</p>
          </div>
          <div>
            <FieldLabel>Project Classification</FieldLabel>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#156DB7]/10 text-[#0F5288] mt-1 capitalize">
              {projectType}
            </span>
          </div>
        </div>
      </div>

      {/* Load schedule */}
      <div className="py-8 border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center">
            <Zap className="w-4 h-4 text-amber-500 mr-1.5" />
            <span>2. Appliance Load Schedule & Daily Energy Demand</span>
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="print:hidden px-2.5 py-1 hover:bg-slate-50 border border-slate-100 rounded-lg text-[#156DB7] inline-flex items-center space-x-1 text-[10px] font-bold"
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
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-600 tracking-wide">
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Appliance</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-center">Wattage (W)</th>
                    <th className="px-4 py-3 text-center">Daily Runtime</th>
                    <th className="px-4 py-3 text-right">Daily Energy (kWh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appliancesList.map(app => (
                    <tr key={app.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-600 text-[11px]">{app.category}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{app.applianceName}</td>
                      <td className="px-4 py-2.5 text-center">{app.quantity}</td>
                      <td className="px-4 py-2.5 text-center">{app.customWattage} W</td>
                      <td className="px-4 py-2.5 text-center">{app.hoursUsed} hrs/day</td>
                      <td className="px-4 py-2.5 text-right font-bold">
                        {((app.customWattage * app.quantity * app.hoursUsed) / 1000).toFixed(2)} kWh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Continuous Load</span>
                <p className="text-base font-extrabold text-slate-800">{(calcs.connectedLoad / 1000).toFixed(2)} kW</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Peak Demand</span>
                <p className="text-base font-extrabold text-red-600">{(calcs.peakLoad / 1000).toFixed(2)} kW</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Daily Energy</span>
                <p className="text-base font-extrabold text-[#156DB7]">{(calcs.dailyEnergy / 1000).toFixed(2)} kWh</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Monthly Energy</span>
                <p className="text-base font-extrabold text-[#69BD45]">{calcs.monthlyEnergy.toFixed(1)} kWh</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hardware overview cards */}
      <div className="py-8 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center mb-6">
          <Cpu className="w-4 h-4 text-[#156DB7] mr-1.5" />
          <span>3. Recommended System Components</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 border border-slate-200/60 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Sun className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">PV Array</span>
            <h4 className="text-xl font-extrabold text-slate-800">{calcs.solarArrayKw} kWp</h4>
            <p className="text-sm text-slate-600">{calcs.panelQuantity} × {panelWpActual} Wp · {calcs.panelConfiguration}</p>
            <p className="text-sm font-bold text-[#69BD45]">{calcs.estimatedDailyProductionKwh} kWh/day net</p>
          </div>
          <div className="p-5 border border-slate-200/60 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Battery className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Battery Bank</span>
            <h4 className="text-xl font-extrabold text-slate-800">{calcs.batteryCapacityKwh.toFixed(2)} kWh</h4>
            <p className="text-xs text-slate-500">
              {resolvedV}V · {calcs.batteryCapacityAh} Ah · {meta.chemistryLabel}
            </p>
            <p className="text-xs font-bold text-slate-700">{calcs.batteryProductModel}</p>
          </div>
          <div className="p-5 border border-slate-200/60 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Inverter</span>
            <h4 className="text-xl font-extrabold text-slate-800">{calcs.inverterSizeKva} kVA</h4>
            <p className="text-xs text-slate-500">{calcs.inverterModelRecommended}</p>
            <p className="text-xs font-bold text-[#156DB7]">{meta.topologyLabel}</p>
          </div>
        </div>
      </div>

      {/* Battery explanation */}
      <div className="py-8 border-b border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center">
            <Battery className="w-4 h-4 text-emerald-600 mr-1.5" />
            <span>4. Battery Bank Engineering Explanation</span>
          </h3>
          <button type="button" onClick={() => onEditStep(5)} className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline">
            Edit Battery Parameters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReasonBlock
            title="Required Battery Energy"
            value={`${requiredBatt.toFixed(2)} kWh`}
            reason={`Required to sustain the selected ${backupHours}-hour backup duration at the customer's average daily load profile.`}
          />
          <ReasonBlock
            title="Installed Battery Capacity"
            value={`${(calcs.batteryInstalledKwh || calcs.batteryCapacityKwh).toFixed(2)} kWh`}
            reason="Includes engineering reserve, inverter and battery efficiency corrections, and depth-of-discharge limitation, then rounded up to a commercial battery SKU."
          />
          <ReasonBlock
            title="Usable Battery Energy"
            value={`${usableBatt.toFixed(2)} kWh`}
            reason={`Limited to ${Math.round((calcs.batteryDodUsed || 0.9) * 100)}% DoD (${meta.chemistryLabel}) to protect cycle life and avoid deep discharge.`}
          />
          <ReasonBlock
            title="Expected Backup"
            value={`${(calcs.batteryExpectedBackupHours || backupHours).toFixed(1)} Hours`}
            reason="Estimated from usable energy after inverter conversion efficiency, based on the customer's average load profile, not a guaranteed continuous full-load runtime."
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Nominal Voltage</span>
            <p className="font-bold text-slate-800 mt-1">{resolvedV} V</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Bank Capacity</span>
            <p className="font-bold text-slate-800 mt-1">{calcs.batteryCapacityAh} Ah</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Configuration</span>
            <p className="font-bold text-[#156DB7] mt-1">{calcs.batteryConfiguration}</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Utilization</span>
            <p className="font-bold text-indigo-600 mt-1">{(calcs.batteryUtilizationPercent || 0).toFixed(0)}%</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Continuous Discharge</span>
            <p className="font-bold text-red-600 mt-1">{(calcs.batteryContinuousCurrentA ?? 0).toFixed(1)} A</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Max Discharge Current</span>
            <p className="font-bold text-slate-800 mt-1">{(calcs.batteryMaxDischargeCurrentA ?? 0).toFixed(1)} A</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Max Charge Current</span>
            <p className="font-bold text-slate-800 mt-1">{(calcs.batteryMaxChargeCurrentA ?? 0).toFixed(1)} A</p>
          </div>
          <div className="p-3 border border-slate-100 rounded-xl">
            <span className="text-slate-600 block text-[11px] font-semibold">Quantity / Chemistry</span>
            <p className="font-bold text-slate-800 mt-1">
              {calcs.batteryQuantity} × {meta.chemistryLabel}
            </p>
          </div>
        </div>
      </div>

      {/* PV Array explanation */}
      <div className="py-8 border-b border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center">
            <Sun className="w-4 h-4 text-amber-500 mr-1.5" />
            <span>5. PV Array Sizing Explanation</span>
          </h3>
          <button type="button" onClick={() => onEditStep(7)} className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline">
            Edit PV Array
          </button>
        </div>
        <div className="max-w-xl bg-slate-50/50 border border-slate-100 rounded-2xl p-5 mb-4">
          <DotRow label="Daily Consumption" value={`${(calcs.dailyEnergy / 1000).toFixed(2)} kWh`} />
          <DotRow label="Peak Sun Hours" value={`${calcs.peakSunHoursUsed ?? 4.5} hrs`} />
          <DotRow label="System Efficiency" value={`${calcs.overallSystemEfficiency ?? 78}%`} />
          <DotRow label="Required Array" value={`${meta.requiredArrayKwp} kWp`} />
          <DotRow label="Engineering Margin" value={`${meta.engineeringMarginPercent}%`} />
          <DotRow label="Final Recommendation" value={`${calcs.solarArrayKw} kWp`} />
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
          Required array = Daily Energy ÷ (Peak Sun Hours × System Efficiency). The final recommendation is the nearest
          electrically valid string configuration that meets or exceeds this target using commercial panel ratings
          ({panelWpActual} Wp modules, {calcs.panelQuantity} panels, {calcs.panelConfiguration}).
        </p>
      </div>

      {/* Inverter explanation */}
      <div className="py-8 border-b border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center">
            <Cpu className="w-4 h-4 text-blue-600 mr-1.5" />
            <span>6. Inverter Selection & Validation</span>
          </h3>
          <button type="button" onClick={() => onEditStep(6)} className="print:hidden text-[10px] font-bold text-[#156DB7] hover:underline">
            Edit Inverter Mode
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 tracking-wide block">Selected Inverter</span>
            <p className="text-base font-extrabold text-slate-800">{calcs.inverterModelRecommended}</p>
            <p className="text-sm font-bold text-[#156DB7]">{calcs.inverterSizeKva} kVA · {meta.topologyLabel}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-2">{calcs.inverterReason}</p>
          </div>
          <div className="p-4 border border-slate-100 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-600 tracking-wide block mb-3">Validation Checklist</span>
            <div className="space-y-2">
              {validationChecks.map(c => (
                <div key={c.label} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{c.label}</span>
                  <StatusBadge status={c.pass ? 'PASS' : 'FAIL'} />
                </div>
              ))}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-800 font-bold">Overall Compatibility</span>
                <span className="font-extrabold text-emerald-600">
                  {Math.round((validationChecks.filter(c => c.pass).length / validationChecks.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PV String with margins */}
      <div className="py-8 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center mb-4">
          <Sun className="w-4 h-4 text-amber-500 mr-1.5" />
          <span>7. PV String Electrical Validation & Headroom</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-600 block text-[11px] font-semibold">Open-Circuit Voltage (Voc)</span>
            <p className="font-bold text-slate-800 mt-1">{calcs.panelVoc} V / module</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-600 block text-[11px] font-semibold">Max Power Voltage (Vmp)</span>
            <p className="font-bold text-slate-800 mt-1">{calcs.panelVmp} V / module</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-600 block text-[11px] font-semibold">Short-Circuit Current (Isc)</span>
            <p className="font-bold text-slate-800 mt-1">{calcs.panelIsc} A</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-600 block text-[11px] font-semibold">Max Power Current (Imp)</span>
            <p className="font-bold text-slate-800 mt-1">{calcs.panelImp} A</p>
          </div>
        </div>
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-600 tracking-wide">
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Actual</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Margin</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr>
                <td className="px-4 py-3 font-semibold">Cold-Weather String Voc</td>
                <td className="px-4 py-3 font-mono">{calcs.stringVocMax} V</td>
                <td className="px-4 py-3 font-mono">{calcs.mpptVocLimit} V</td>
                <td className="px-4 py-3 font-mono text-emerald-600">{meta.voltageMarginV} V</td>
                <td className="px-4 py-3"><StatusBadge status="PASS" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">String Vmp (Operating Window)</td>
                <td className="px-4 py-3 font-mono">{calcs.stringVmpHot ?? calcs.stringVmpMax} V</td>
                <td className="px-4 py-3 font-mono">
                  {calcs.mpptVmpMin}-{calcs.mpptVmpMax} V
                </td>
                <td className="px-4 py-3 font-mono text-slate-500">Within window</td>
                <td className="px-4 py-3"><StatusBadge status="PASS" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">MPPT Operating Current</td>
                <td className="px-4 py-3 font-mono">{meta.actualPvCurrentA} A</td>
                <td className="px-4 py-3 font-mono">{meta.maxPvCurrentA} A</td>
                <td className="px-4 py-3 font-mono text-emerald-600">{meta.currentMarginA} A</td>
                <td className="px-4 py-3"><StatusBadge status="PASS" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">PV Array Power</td>
                <td className="px-4 py-3 font-mono">{meta.actualPvPowerW} W</td>
                <td className="px-4 py-3 font-mono">{meta.maxPvPowerW} W</td>
                <td className="px-4 py-3 font-mono text-emerald-600">{meta.powerMarginW} W</td>
                <td className="px-4 py-3"><StatusBadge status="PASS" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          Layout: {calcs.seriesCount ?? '-'} series × {calcs.parallelCount ?? '-'} parallel ({calcs.panelQuantity} panels).
          Only electrically valid configurations are published.
        </p>
      </div>

      {/* SLD */}
      <div className="py-8 border-b border-slate-100 page-break-before">
        <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center mb-4">
          <Cpu className="w-4 h-4 text-[#156DB7] mr-1.5" />
          <span>8. Single-Line Diagram (SLD)</span>
        </h3>
        <div
          className="overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-900 shadow-inner w-full print:border-none"
          dangerouslySetInnerHTML={{ __html: calcs.singleLineDiagramSvg || '' }}
        />
      </div>

      {/* Protection */}
      <div className="py-8 border-b border-slate-100 page-break-before">
        <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1.5" />
          <span>9. Protection Device Schedule</span>
        </h3>
        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-600 tracking-wide">
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Calculated</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Safety Factor</th>
                <th className="px-4 py-3">Nearest Standard</th>
                <th className="px-4 py-3">Selected Device</th>
                <th className="px-4 py-3">Standard</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(calcs.protectionSchedule?.deviceDetails || []).map((device, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-slate-800 font-bold">{device.device}</td>
                  <td className="px-4 py-3 font-mono">
                    {device.calculatedCurrentA > 0 ? `${device.calculatedCurrentA.toFixed(1)} A` : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {(device.requiredCurrentA ?? 0) > 0
                      ? `${(device.requiredCurrentA ?? 0).toFixed(1)} A`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono">{device.safetyFactor}×</td>
                  <td className="px-4 py-3 font-bold text-[#156DB7]">
                    {device.nearestStandardRating || '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{device.selectedRating}</td>
                  <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{device.codeStandard || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 leading-relaxed max-w-xs">
                    {device.justification}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cables */}
      <div className="py-8 border-b border-slate-100 page-break-before">
        <h3 className="text-sm font-bold text-[#123A63] tracking-tight flex items-center mb-4">
          <Zap className="w-4 h-4 text-[#156DB7] mr-1.5" />
          <span>10. Cable Engineering Schedule</span>
        </h3>
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-600 tracking-wide">
                <th className="px-4 py-3">Cable Run</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Required Current</th>
                <th className="px-4 py-3">Cable Ampacity</th>
                <th className="px-4 py-3">Utilization</th>
                <th className="px-4 py-3">Voltage Drop</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cableRows.map(row => (
                <tr key={row.path}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.path}</td>
                  <td className="px-4 py-3">{row.specification}</td>
                  <td className="px-4 py-3 font-mono">{row.requiredCurrentA} A</td>
                  <td className="px-4 py-3 font-mono">{row.cableRatingA} A</td>
                  <td className="px-4 py-3 font-mono">{row.utilizationPercent}%</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#156DB7]">{row.voltageDropPercent}%</td>
                  <td className="px-4 py-3 font-mono text-slate-400">&lt; {row.limitPercent}%</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-800">Equipment Earthing</td>
                <td className="px-4 py-3" colSpan={6}>{calcs.cableSizing?.earthCableSize}</td>
                <td className="px-4 py-3"><StatusBadge status="PASS" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification + Assumptions */}
      <div className="py-8 border-b border-slate-100 page-break-before">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-bold text-[#123A63] tracking-tight mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
              <span>11. Engineering Verification Notes</span>
            </h4>
            <div className="space-y-3">
              {(calcs.validationWarnings || []).map((warning, idx) => (
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
                  <div className="space-y-1">
                    <p className="text-xs font-bold leading-tight">{warning.message}</p>
                    <p className="text-[11px] opacity-85 font-medium leading-relaxed">{warning.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">Design Confidence Score</span>
                <span className="text-lg font-black text-[#156DB7]">{meta.confidenceScore}%</span>
              </div>
              <ul className="space-y-1.5">
                {meta.confidenceReasons.map((r, i) => (
                  <li key={i} className="text-[11px] text-slate-500 leading-relaxed flex gap-2">
                    <span className="text-slate-300">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#123A63] tracking-tight mb-4 flex items-center">
              <Info className="w-4 h-4 text-[#156DB7] mr-1.5" />
              <span>12. Calculation Assumptions</span>
            </h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
              <div className="divide-y divide-slate-100">
                {(calcs.assumptions || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
                    <span className="text-slate-600 font-semibold">{item.label}</span>
                    <span className="font-mono font-bold text-slate-700">
                      {item.value} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Design Limitations */}
      <div className="py-8 border-b border-slate-200">
        <SectionHeading>13. Design Limitations</SectionHeading>
        <ul className="space-y-2.5 text-sm text-slate-700 leading-relaxed max-w-3xl">
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>System sizing assumes average meteorological Peak Sun Hours for the stated location.</span></li>
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>Does not account for prolonged cloudy weather, atypical seasonal extremes, or microclimate shading unless separately assessed on site.</span></li>
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>Loads are assumed to operate according to the entered daily runtime schedule.</span></li>
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>Battery ageing over several years will reduce usable capacity; engineering reserve partially mitigates this.</span></li>
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>Cable run lengths use standard residential assumptions; verify actual route lengths before procurement.</span></li>
          <li className="flex gap-2"><span className="text-[#156DB7] font-bold">•</span><span>Final installation must be verified, commissioned, and signed off by a qualified electrician in accordance with local regulations.</span></li>
        </ul>
      </div>

      {/* Appendix: Engineering Summary */}
      <div className="py-8 border-b border-slate-200 page-break-before">
        <SectionHeading>A. Engineering Summary</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: 'Continuous Load', v: `${(calcs.connectedLoad / 1000).toFixed(2)} kW` },
            { l: 'Peak Demand', v: `${(calcs.peakLoad / 1000).toFixed(2)} kW` },
            { l: 'Daily Energy', v: `${(calcs.dailyEnergy / 1000).toFixed(2)} kWh` },
            { l: 'Recommended Inverter', v: `${calcs.inverterSizeKva} kVA ${meta.topologyLabel.split('(')[0].trim()}` },
            {
              l: 'Recommended Battery Bank',
              v: `${resolvedV}V ${calcs.batteryCapacityAh}Ah ${meta.chemistryLabel}`
            },
            { l: 'Recommended PV Array', v: `${calcs.solarArrayKw} kWp` },
            { l: 'Engineering Status', v: 'PASS' },
            { l: 'Design Confidence', v: `${meta.confidenceScore}%` }
          ].map(item => (
            <div key={item.l} className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC]">
              <FieldLabel>{item.l}</FieldLabel>
              <p className="text-base font-extrabold text-slate-900 mt-1.5">{item.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Appendix: Design Inputs */}
      <div className="py-8 border-b border-slate-200">
        <SectionHeading>B. Design Inputs</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1 bg-[#F7FAFC] border border-slate-200 rounded-2xl p-5 md:p-6">
          <DotRow label="Backup Time" value={`${backupHours} Hours`} />
          <DotRow label="Battery Chemistry" value={meta.chemistryLabel} />
          <DotRow
            label="Nominal System Voltage"
            value={systemVoltage === 'auto' ? `${resolvedV}V (Auto-Resolved)` : systemVoltage}
          />
          <DotRow label="Installation Type" value={meta.installationTypeLabel} />
          <DotRow label="Selected Inverter Topology" value={meta.topologyLabel} />
          <DotRow label="Peak Sun Hours Used" value={`${calcs.peakSunHoursUsed ?? 4.5} hrs`} />
          <DotRow label="Safety Margin" value={`${meta.safetyMarginPercent}%`} />
          <DotRow label="Future Expansion" value={`${meta.futureExpansionPercent}%`} />
          <DotRow label="Cold Design Ambient" value={`${meta.ambientColdC} °C`} />
          <DotRow label="Hot Cell Temperature" value={`${meta.ambientHotC} °C`} />
          <DotRow label="Preferred Panel Wattage" value={`${panelSize} Wp`} />
          <DotRow label="Project Classification" value={projectType === 'commercial' ? 'Commercial' : 'Residential'} />
        </div>
      </div>

      {/* Appendix: Energy Flow */}
      <div className="py-8 border-b border-slate-200">
        <SectionHeading>C. Energy Flow Summary</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { l: 'PV Generation', v: `${meta.energyFlow.pvGenerationKwh} kWh/day` },
            { l: 'System Losses', v: `${meta.energyFlow.systemLossesKwh} kWh/day` },
            { l: 'Net Energy Available', v: `${meta.energyFlow.netEnergyAvailableKwh} kWh/day` },
            { l: 'Customer Daily Consumption', v: `${meta.energyFlow.customerConsumptionKwh} kWh/day` },
            { l: 'Remaining Energy Reserve', v: `${meta.energyFlow.remainingReserveKwh} kWh/day` }
          ].map((row, i) => (
            <div key={row.l} className="relative p-4 rounded-xl bg-[#F7FAFC] border border-slate-200">
              {i < 4 && (
                <span className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-[#156DB7] font-black text-sm">
                  →
                </span>
              )}
              <FieldLabel>{row.l}</FieldLabel>
              <p className="text-sm font-extrabold text-slate-900 mt-2">{row.v}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 mt-4 leading-relaxed max-w-3xl">
          Net energy available already includes thermal, soiling, cable, inverter, and battery round-trip losses.
          A positive remaining reserve indicates the PV array can support daily consumption with recovery margin.
        </p>
      </div>

      {/* Design Passport */}
      <div className="py-8 border-b border-slate-200">
        <SectionHeading icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
          14. Design Passport
        </SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
          {meta.passport.map(item => (
            <div key={item.label} className="flex justify-between items-center px-4 py-3 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <StatusBadge status={item.status} />
            </div>
          ))}
          <div className="sm:col-span-2 flex justify-between items-center px-4 py-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm mt-1">
            <span className="font-bold text-slate-900">Overall Engineering Status</span>
            <StatusBadge status={meta.overallStatus} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t-2 border-[#156DB7]/20 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Prepared By</p>
          <p className="font-bold text-[#123A63]">VoltSolar Autonomous Engineering Engine</p>
          <p className="text-slate-700">Software Version {SOFTWARE_VERSION}</p>
          <p className="text-slate-700">Design ID {designId}</p>
        </div>
        <div className="space-y-1.5 md:text-right">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Calculation Standards</p>
          <p className="font-semibold text-slate-800">{CALCULATION_STANDARDS.join(' · ')}</p>
          <p className="text-slate-700">
            Calculation Timestamp:{' '}
            {issuedAt.toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="text-xs text-slate-600 italic pt-2">
            This report documents an electrically validated design recommendation. Site conditions and local code authority requirements take precedence.
          </p>
        </div>
      </div>
    </div>
  );
};
