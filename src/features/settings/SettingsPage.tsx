import React, { useEffect, useState } from 'react';
import { Sliders, Sun, ShieldAlert, Check, Trash2, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PREFS_KEY = 'voltsolar_preferences';

type Prefs = {
  units: 'metric' | 'imperial';
  notifications: { email: boolean; sms: boolean };
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return { units: 'metric', notifications: { email: true, sms: false } };
    }
    return JSON.parse(raw) as Prefs;
  } catch {
    return { units: 'metric', notifications: { email: true, sms: false } };
  }
}

export const SettingsPage: React.FC = () => {
  const { logout } = useApp();
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [notifications, setNotifications] = useState({ email: true, sms: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setUnits(prefs.units);
    setNotifications(prefs.notifications);
  }, []);

  const persist = (next: Prefs) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        'This will sign you out of VoltSolar on this device. Permanent account deletion is not fully automated yet. After signing out, contact support from the Contact page to request irreversible deletion of your cloud profile and projects.'
      )
    ) {
      void logout();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">App Preferences</h1>
        <p className="text-sm text-slate-500 mt-1">
          Preferences are saved on this device. Notification delivery is not connected to email/SMS providers yet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Sliders className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Sizing Units & Calculations</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Display Units
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <button
                    id="units-metric-btn"
                    type="button"
                    onClick={() => {
                      setUnits('metric');
                      persist({ units: 'metric', notifications });
                    }}
                    className={`px-4 py-3 border text-xs font-bold rounded-xl text-center transition-all ${
                      units === 'metric'
                        ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Metric (kW, Wh, °C)
                  </button>
                  <button
                    id="units-imperial-btn"
                    type="button"
                    onClick={() => {
                      setUnits('imperial');
                      persist({ units: 'imperial', notifications });
                    }}
                    className={`px-4 py-3 border text-xs font-bold rounded-xl text-center transition-all ${
                      units === 'imperial'
                        ? 'border-[#156DB7] bg-slate-50 text-[#156DB7]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Imperial (kW, Wh, °F)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Sun className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Workspace Theme</span>
            </h2>
            <div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-4">
                VoltSolar uses a high-contrast light theme for readability outdoors on installation sites.
              </p>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#156DB7]/10 text-[#156DB7] text-xs font-bold">
                <Check className="w-4 h-4 mr-1.5" />
                Active: Light Slate Canvas
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Bell className="w-5 h-5 text-[#156DB7] mr-2" />
              <span>Alert Preferences</span>
            </h2>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              These toggles save your preference locally. Outbound email/SMS alerts are not enabled yet.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Email Updates</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Preferred channel once email digests ship.</p>
                </div>
                <button
                  id="notif-email-toggle"
                  type="button"
                  onClick={() => {
                    const next = { ...notifications, email: !notifications.email };
                    setNotifications(next);
                    persist({ units, notifications: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    notifications.email ? 'bg-[#156DB7]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      notifications.email ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">SMS Project Dispatch</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Preferred channel once SMS dispatch ships.</p>
                </div>
                <button
                  id="notif-sms-toggle"
                  type="button"
                  onClick={() => {
                    const next = { ...notifications, sms: !notifications.sms };
                    setNotifications(next);
                    persist({ units, notifications: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    notifications.sms ? 'bg-[#156DB7]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      notifications.sms ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-rose-800 flex items-center">
              <ShieldAlert className="w-5 h-5 text-rose-600 mr-2" />
              <span>Danger Zone</span>
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Sign out clears this session. Full cloud account deletion currently requires a support request so we
                can verify ownership and remove projects safely.
              </p>
              <button
                id="delete-account-btn"
                type="button"
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-100"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sign out & request deletion</span>
              </button>
            </div>
          </div>

          {saved ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 text-center">
              Preferences saved on this device
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
