import React, { useState, useEffect } from 'react';
import { ThemeMode, ActiveTab } from '../types';
import { Moon, Sun, UserCheck, PenTool, School, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getStoredAppsScriptUrl } from '../data/googleAppsScript';
import { getStoredSettings, AppSettings } from '../data/settings';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  activeTab: ActiveTab;
  onToggleTab: () => void;
  isLoggedIn: boolean;
  isSyncing?: boolean;
  settings?: AppSettings;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  activeTab,
  onToggleTab,
  isLoggedIn,
  isSyncing = false,
  settings: propSettings,
}) => {
  const [time, setTime] = useState<Date>(new Date());
  const [hasScriptUrl, setHasScriptUrl] = useState<boolean>(!!getStoredAppsScriptUrl());
  const [localSettings, setLocalSettings] = useState<AppSettings>(getStoredSettings());

  const settings = propSettings || localSettings;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleUrlEvent = (e: any) => {
      setHasScriptUrl(!!e.detail);
    };
    const handleSettingsEvent = (e: any) => {
      if (e.detail) setLocalSettings(e.detail);
    };
    
    window.addEventListener('apps_script_url_changed', handleUrlEvent);
    window.addEventListener('settings_changed', handleSettingsEvent);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('apps_script_url_changed', handleUrlEvent);
      window.removeEventListener('settings_changed', handleSettingsEvent);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B2545] border-b border-blue-400/20 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand / Logo Section */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-900 shadow-lg shadow-blue-950/20 shrink-0 overflow-hidden p-1">
              {settings.logo_url && settings.logo_url.startsWith('http') ? (
                <img 
                  src={settings.logo_url} 
                  className="w-full h-full object-contain" 
                  alt="School Logo" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to School icon on error
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = "text-blue-900";
                      fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school w-6 h-6"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v5h12z"/><path d="M12 7h.01"/></svg>`;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <School className="w-6 h-6" />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold leading-tight text-white tracking-tight">
                  {settings.nama_sekolah}
                </h1>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-sky-200">
                Sistem Buku Tamu Digital
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Real-time Clock (Hidden on very small screens) */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white/10 rounded-lg text-sm font-semibold text-white border border-white/10">
              <Clock className="w-4 h-4 text-sky-300" />
              <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</span>
            </div>

            {/* Navigation Toggle */}
            <button
              onClick={onToggleTab}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 focus:ring-2 focus:ring-sky-300 outline-none ${
                activeTab === 'admin'
                  ? 'bg-sky-400 text-blue-950 shadow-md hover:bg-sky-300'
                  : 'bg-white text-blue-900 hover:bg-sky-50 shadow-sm'
              }`}
            >
              {activeTab === 'admin' ? (
                <>
                  <PenTool className="w-4 h-4" />
                  <span className="hidden sm:inline">Isi Form</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">{isLoggedIn ? 'Dashboard' : 'Admin'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

