import React, { useEffect, useMemo, useState } from 'react';
import { X, BookOpen, Package, PenLine } from 'lucide-react';
import type { CatalogMarketId } from '../../lib/calculations/catalogMarkets';
import type { DatasheetInverterInput, InverterSpecs } from '../../lib/calculations/equipmentDatabase';
import {
  datasheetRowsFromInverter,
  findInverterByDisplayName,
  listInverterBrands,
  listInvertersForBrand
} from '../../lib/calculations/equipmentDatabase';

export type DatasheetDrawerMode = 'catalogue' | 'pick' | 'custom';

export interface InverterDatasheetSelection {
  mode: 'catalogue' | 'custom' | 'auto';
  preferredCatalog?: { brand: string; model: string } | null;
  customInverter?: DatasheetInverterInput | null;
}

interface InverterDatasheetDrawerProps {
  open: boolean;
  onClose: () => void;
  catalogMarket: CatalogMarketId;
  recommendedDisplayName?: string;
  recommendedBrand?: string;
  recommendedModel?: string;
  catalogMatchMode?: string;
  /** Current engineer selection (catalogue pick or custom). */
  selection: InverterDatasheetSelection;
  onApply: (selection: InverterDatasheetSelection) => void;
}

export const InverterDatasheetDrawer: React.FC<InverterDatasheetDrawerProps> = ({
  open,
  onClose,
  catalogMarket,
  recommendedDisplayName,
  recommendedBrand,
  recommendedModel,
  catalogMatchMode,
  selection,
  onApply
}) => {
  const [tab, setTab] = useState<DatasheetDrawerMode>('catalogue');
  const [pickBrand, setPickBrand] = useState('');
  const [pickModel, setPickModel] = useState('');

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

  const recommendedSku = useMemo(
    () =>
      findInverterByDisplayName(
        recommendedDisplayName,
        catalogMarket,
        recommendedBrand,
        recommendedModel
      ),
    [recommendedDisplayName, catalogMarket, recommendedBrand, recommendedModel]
  );

  const brands = useMemo(() => listInverterBrands(catalogMarket), [catalogMarket]);
  const modelsForBrand = useMemo(
    () => (pickBrand ? listInvertersForBrand(pickBrand, catalogMarket) : []),
    [pickBrand, catalogMarket]
  );

  const pickedSku: InverterSpecs | null = useMemo(() => {
    if (!pickBrand || !pickModel) return null;
    return findInverterByDisplayName(undefined, catalogMarket, pickBrand, pickModel);
  }, [pickBrand, pickModel, catalogMarket]);

  const viewingSku = tab === 'pick' ? pickedSku : recommendedSku;

  useEffect(() => {
    if (!open) return;
    if (selection.mode === 'custom') {
      setTab('custom');
      const c = selection.customInverter;
      if (c) {
        setDsBrand(c.brand || '');
        setDsModel(c.model || '');
        setDsSizeKva(String(c.sizeKva || ''));
        setDsVoltageV(String(c.voltageV || 48));
        setDsMpptVoc(c.mpptVocLimit != null ? String(c.mpptVocLimit) : '');
        setDsMpptVmpMin(c.mpptVmpMin != null ? String(c.mpptVmpMin) : '');
        setDsMpptVmpMax(c.mpptVmpMax != null ? String(c.mpptVmpMax) : '');
        setDsMaxPvCurrent(c.maxPvCurrent != null ? String(c.maxPvCurrent) : '');
        setDsMaxPvPower(c.maxPvPower != null ? String(c.maxPvPower) : '');
        setDsNumMppts(c.numMppts != null ? String(c.numMppts) : '2');
        setDsBattDischargeA(
          c.maxBatteryDischargeCurrentA != null ? String(c.maxBatteryDischargeCurrentA) : ''
        );
        setDsSurgeFactor(c.surgeFactor != null ? String(c.surgeFactor) : '2');
      }
    } else if (selection.mode === 'catalogue' && selection.preferredCatalog) {
      setTab('pick');
      setPickBrand(selection.preferredCatalog.brand);
      setPickModel(selection.preferredCatalog.model);
    } else {
      setTab('catalogue');
      if (recommendedBrand) setPickBrand(recommendedBrand);
      if (recommendedModel) setPickModel(recommendedModel);
    }
  }, [open, selection, recommendedBrand, recommendedModel]);

  if (!open) return null;

  const buildCustom = (): DatasheetInverterInput | null => {
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

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close datasheet"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#156DB7]">
              Full engineering
            </p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">Inverter datasheet</h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Catalogue specs for the recommended unit. Pick another SKU or enter a custom datasheet
              only if needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-slate-100">
          {(
            [
              { id: 'catalogue' as const, label: 'Recommended', icon: BookOpen },
              { id: 'pick' as const, label: 'Pick catalogue', icon: Package },
              { id: 'custom' as const, label: 'Custom', icon: PenLine }
            ] as const
          ).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-bold rounded-t-lg border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#156DB7] text-[#156DB7] bg-slate-50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'catalogue' && (
            <>
              {catalogMatchMode === 'generic' ? (
                <p className="text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
                  No catalogue SKU matched this design. Use <span className="font-semibold">Pick catalogue</span> or{' '}
                  <span className="font-semibold">Custom</span> to supply real datasheet limits.
                </p>
              ) : null}
              {viewingSku ? (
                <>
                  <p className="text-sm font-bold text-slate-800">
                    {viewingSku.brand} {viewingSku.model}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Company catalogue datasheet — used for Voc / MPPT / protection checks.
                  </p>
                  <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {datasheetRowsFromInverter(viewingSku).map(row => (
                      <div key={row.label} className="flex justify-between gap-3 px-3 py-2 text-xs">
                        <dt className="text-slate-500 font-medium">{row.label}</dt>
                        <dd className="font-bold text-slate-900 text-right">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Recommended unit is not in the catalogue (engineering size). Pick a catalogue model
                  or enter a custom datasheet.
                </p>
              )}
            </>
          )}

          {tab === 'pick' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Choose another brand/model from the company catalogue for this market. Datasheet
                limits load automatically.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brand</label>
                <select
                  value={pickBrand}
                  onChange={e => {
                    setPickBrand(e.target.value);
                    setPickModel('');
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">Select brand…</option>
                  {brands.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model</label>
                <select
                  value={pickModel}
                  onChange={e => setPickModel(e.target.value)}
                  disabled={!pickBrand}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm disabled:opacity-50"
                >
                  <option value="">Select model…</option>
                  {modelsForBrand.map(m => (
                    <option key={m.model} value={m.model}>
                      {m.model} ({m.sizeKva} kVA / {m.voltageV}V)
                    </option>
                  ))}
                </select>
              </div>
              {pickedSku ? (
                <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {datasheetRowsFromInverter(pickedSku).map(row => (
                    <div key={row.label} className="flex justify-between gap-3 px-3 py-2 text-xs">
                      <dt className="text-slate-500 font-medium">{row.label}</dt>
                      <dd className="font-bold text-slate-900 text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )}

          {tab === 'custom' && (
            <div className="space-y-3">
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
                Advanced: only when the unit is not in the company catalogue. Values must match the
                manufacturer PDF.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Brand', val: dsBrand, set: setDsBrand, ph: 'Deye' },
                  { label: 'Model', val: dsModel, set: setDsModel, ph: 'SUN-5K' },
                  { label: 'Size kVA *', val: dsSizeKva, set: setDsSizeKva, ph: '5' },
                  { label: 'Voc max (V)', val: dsMpptVoc, set: setDsMpptVoc, ph: '500' },
                  { label: 'Vmp min (V)', val: dsMpptVmpMin, set: setDsMpptVmpMin, ph: '120' },
                  { label: 'Vmp max (V)', val: dsMpptVmpMax, set: setDsMpptVmpMax, ph: '430' },
                  { label: 'Max PV A', val: dsMaxPvCurrent, set: setDsMaxPvCurrent, ph: '14' },
                  { label: 'Max PV W', val: dsMaxPvPower, set: setDsMaxPvPower, ph: '6500' },
                  { label: 'MPPTs', val: dsNumMppts, set: setDsNumMppts, ph: '2' },
                  { label: 'Batt discharge A', val: dsBattDischargeA, set: setDsBattDischargeA, ph: '120' },
                  { label: 'Surge factor', val: dsSurgeFactor, set: setDsSurgeFactor, ph: '2' }
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Battery V *</label>
                  <select
                    value={dsVoltageV}
                    onChange={e => setDsVoltageV(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="12">12 V</option>
                    <option value="24">24 V</option>
                    <option value="48">48 V</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          {tab === 'catalogue' && recommendedSku ? (
            <button
              type="button"
              className="flex-1 px-4 py-2.5 bg-[#156DB7] hover:bg-[#0F5288] text-white text-xs font-bold rounded-xl"
              onClick={() => {
                onApply({
                  mode: 'auto',
                  preferredCatalog: null,
                  customInverter: null
                });
                onClose();
              }}
            >
              Use recommended catalogue datasheet
            </button>
          ) : null}
          {tab === 'pick' ? (
            <button
              type="button"
              disabled={!pickedSku}
              className="flex-1 px-4 py-2.5 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              onClick={() => {
                if (!pickedSku) return;
                onApply({
                  mode: 'catalogue',
                  preferredCatalog: { brand: pickedSku.brand, model: pickedSku.model },
                  customInverter: null
                });
                onClose();
              }}
            >
              Use selected catalogue SKU
            </button>
          ) : null}
          {tab === 'custom' ? (
            <button
              type="button"
              disabled={!buildCustom()}
              className="flex-1 px-4 py-2.5 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              onClick={() => {
                const custom = buildCustom();
                if (!custom) return;
                onApply({
                  mode: 'custom',
                  preferredCatalog: null,
                  customInverter: custom
                });
                onClose();
              }}
            >
              Apply custom datasheet
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
