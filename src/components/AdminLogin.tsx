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

    let isSuccess = false;
    let checkedFromDatabase = false;

    try {
      const url = getStoredAppsScriptUrl();
      if (url) {
        const liveAdmins = await fetchAdminsFromGoogleSheets(url);
        if (liveAdmins && Array.isArray(liveAdmins) && liveAdmins.length > 0) {
          checkedFromDatabase = true;
          const match = liveAdmins.find(
            (a: any) =>
              String(a.username || '').trim().toLowerCase() === inputUser &&
              String(a.password || '').trim() === inputPass
          );
          if (match) isSuccess = true;
        }
      }

      // Jika jaringan/live fetch gagal, gunakan cache data akun dari Google Sheets yang tersimpan
      if (!checkedFromDatabase) {
        const savedAdminsRaw = localStorage.getItem('smpn11palu_synced_admins');
        if (savedAdminsRaw) {
          const savedAdmins = JSON.parse(savedAdminsRaw);
          if (Array.isArray(savedAdmins) && savedAdmins.length > 0) {
            checkedFromDatabase = true;
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

    // Hanya jika database belum pernah terhubung/tersinkron sama sekali, gunakan akun awal standar Google Sheets ('admin'/'admin123' atau 'smpn11palu'/'smpn11palu')
    if (!checkedFromDatabase) {
      const initialDefaultAdmins = [
        { username: 'admin', password: 'admin123' },
        { username: 'smpn11palu', password: 'smpn11palu' }
      ];
      const match = initialDefaultAdmins.find(
        (a) => a.username.toLowerCase() === inputUser && a.password === inputPass
      );
      if (match) isSuccess = true;
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
    <div className="max-w-xs sm:max-w-sm mx-auto w-full py-2 sm:py-4 px-3">
      {/* Neumorphic Soft UI Card - Compact Edition */}
      <div className="bg-[#EBF1F7] rounded-[24px] shadow-[14px_14px_30px_rgba(10,25,47,0.3),-10px_-10px_25px_rgba(255,255,255,0.15)] border border-white/40 p-4 sm:p-5 relative overflow-hidden">
        
        {/* Top Center Emblem Badge */}
        <div className="flex justify-center pt-1 pb-0.5">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#EBF1F7] shadow-[4px_4px_10px_rgba(166,180,200,0.5),-4px_-4px_10px_rgba(255,255,255,0.95)] border border-white/80 p-1.5 flex items-center justify-center overflow-hidden">
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
                      fallback.className = "text-white text-[10px] font-bold";
                      fallback.innerText = settings.nama_sekolah.substring(0, 4).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <>
                  <School className="w-5 h-5 text-white drop-shadow-md" />
                  <span className="text-[7px] font-black tracking-widest text-amber-200 mt-0.5">
                    {settings.nama_sekolah.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7).toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="w-full border-t border-slate-300/60 my-2.5" />

        {/* App Title Badge */}
        <div className="text-center mb-3.5">
          <span className="text-[11px] sm:text-xs font-black text-blue-600 tracking-wider uppercase block">
            BUKU TAMU DIGITAL
          </span>
          <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase block mt-0.5">
            {settings.nama_sekolah}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Username Field */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1 block pl-1">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-[#EAF0F6] rounded-xl text-slate-800 font-semibold text-xs shadow-[inset_2px_2px_5px_rgba(166,180,200,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] outline-none border border-transparent focus:border-blue-400/60 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1 block pl-1">
              PASSWORD
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-[#EAF0F6] rounded-xl text-slate-800 font-semibold text-xs shadow-[inset_2px_2px_5px_rgba(166,180,200,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] outline-none border border-transparent focus:border-blue-400/60 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 w-6 h-6 rounded-full bg-[#EBF1F7] shadow-[1px_1px_4px_rgba(166,180,200,0.5),-1px_-1px_4px_rgba(255,255,255,0.95)] flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2 bg-red-100/90 border border-red-300 text-red-800 text-[10px] font-bold rounded-lg text-center shadow-sm">
              <p>Username atau Password salah!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-2.5 px-4 rounded-xl bg-[#EBF1F7] shadow-[4px_4px_10px_rgba(166,180,200,0.5),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:shadow-[inset_2px_2px_5px_rgba(166,180,200,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] text-[#1E293B] hover:text-blue-700 font-extrabold text-xs sm:text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 border border-white/60 disabled:opacity-70"
            >
              {isChecking ? 'Memeriksa...' : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


