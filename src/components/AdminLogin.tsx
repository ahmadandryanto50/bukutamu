import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Moon, School, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { fetchAdminsFromGoogleSheets, getStoredAppsScriptUrl } from '../data/googleAppsScript';
import { getStoredSettings, AppSettings } from '../data/settings';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasGoogleSheets, setHasGoogleSheets] = useState<boolean>(!!getStoredAppsScriptUrl());
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());

  useEffect(() => {
    // Try to pre-fetch admin accounts from Google Sheets if URL is saved
    if (getStoredAppsScriptUrl()) {
      fetchAdminsFromGoogleSheets().then(() => {
        setHasGoogleSheets(true);
      });
    }

    const handleSettingsEvent = (e: any) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener('settings_changed', handleSettingsEvent);
    return () => {
      window.removeEventListener('settings_changed', handleSettingsEvent);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setErrorMsg(false);

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    // 1. Check directly from live Google Sheets Admin Accounts
    let isSuccess = false;
    let liveFetched = false;
    try {
      if (getStoredAppsScriptUrl()) {
        const liveAdmins = await fetchAdminsFromGoogleSheets();
        if (liveAdmins && Array.isArray(liveAdmins)) {
          liveFetched = true;
          const match = liveAdmins.find(
            (a: any) =>
              String(a.username || '').trim().toLowerCase() === inputUser &&
              String(a.password || '').trim() === inputPass
          );
          if (match) isSuccess = true;
        }
      }

      // Only fallback to cached local storage if live network fetch failed
      if (!liveFetched && !isSuccess) {
        const savedAdminsRaw = localStorage.getItem('smpn11palu_synced_admins');
        if (savedAdminsRaw) {
          const savedAdmins = JSON.parse(savedAdminsRaw);
          if (Array.isArray(savedAdmins)) {
            const match = savedAdmins.find(
              (a: any) =>
                String(a.username || '').trim().toLowerCase() === inputUser &&
                String(a.password || '').trim() === inputPass
            );
            if (match) isSuccess = true;
          }
        }
      }
    } catch (err) {
      console.warn('Sync check error:', err);
    }

    // 2. Fallback check for standard default accounts (ONLY allowed if Google Sheets URL is not configured yet)
    if (!isSuccess && !getStoredAppsScriptUrl()) {
      const defaultUsers = ['admin', 'smpn11palu', 'smpn11', 'smp11', 'operator'];
      const defaultPasses = ['123', 'admin123', 'admin', 'smpn11palu', 'smp11palu', '123456'];
      if (defaultUsers.includes(inputUser) && defaultPasses.includes(inputPass)) {
        isSuccess = true;
      }
    }

    setTimeout(() => {
      setIsChecking(false);
      if (isSuccess) {
        onLoginSuccess();
      } else {
        setErrorMsg(true);
      }
    }, 400);
  };

  return (
    <div className="max-w-md mx-auto w-full py-6 sm:py-10 px-2">
      {/* Neumorphic Soft UI Card */}
      <div className="bg-[#EBF1F7] rounded-[36px] shadow-[20px_20px_45px_rgba(10,25,47,0.35),-15px_-15px_35px_rgba(255,255,255,0.15)] border border-white/40 p-7 sm:p-9 relative overflow-hidden">
        


        {/* Top Center Emblem Badge */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-[#EBF1F7] shadow-[6px_6px_14px_rgba(166,180,200,0.5),-6px_-6px_14px_rgba(255,255,255,0.95)] border border-white/80 p-2.5 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex flex-col items-center justify-center text-white p-1 shadow-inner border border-amber-300/60 overflow-hidden">
              {settings.logo_url && settings.logo_url.startsWith('http') ? (
                <img 
                  src={settings.logo_url} 
                  className="w-full h-full object-contain filter drop-shadow-sm rounded-full" 
                  alt="School Logo" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = "text-white text-xs font-bold";
                      fallback.innerText = settings.nama_sekolah.substring(0, 4).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <>
                  <School className="w-7 h-7 text-white drop-shadow-md" />
                  <span className="text-[8px] font-black tracking-widest text-amber-200 mt-0.5">
                    {settings.nama_sekolah.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7).toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>



        {/* Subtle Divider */}
        <div className="w-full border-t border-slate-300/60 my-4" />

        {/* App Title Badge */}
        <div className="text-center mb-5">
          <span className="text-xs sm:text-sm font-black text-blue-600 tracking-wider uppercase block">
            BUKU TAMU DIGITAL
          </span>
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase block mt-0.5">
            {settings.nama_sekolah}
          </span>
        </div>



        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-[#EAF0F6] rounded-2xl text-slate-800 font-semibold text-sm shadow-[inset_3px_3px_6px_rgba(166,180,200,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] outline-none border border-transparent focus:border-blue-400/60 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
              PASSWORD
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-[#EAF0F6] rounded-2xl text-slate-800 font-semibold text-sm shadow-[inset_3px_3px_6px_rgba(166,180,200,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] outline-none border border-transparent focus:border-blue-400/60 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 w-7 h-7 rounded-full bg-[#EBF1F7] shadow-[2px_2px_5px_rgba(166,180,200,0.5),-2px_-2px_5px_rgba(255,255,255,0.95)] flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-100/90 border border-red-300 text-red-800 text-xs font-bold rounded-xl text-center shadow-sm">
              <p>Username atau Password salah!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#EBF1F7] shadow-[6px_6px_14px_rgba(166,180,200,0.5),-6px_-6px_14px_rgba(255,255,255,0.95)] hover:shadow-[inset_3px_3px_6px_rgba(166,180,200,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] text-[#1E293B] hover:text-blue-700 font-extrabold text-sm sm:text-base transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-white/60 disabled:opacity-70"
            >
              {isChecking ? 'Checking...' : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


