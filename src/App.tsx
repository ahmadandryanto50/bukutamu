import { useState, useEffect, useCallback } from 'react';
import { GuestEntry, ThemeMode, ActiveTab } from './types';
import { INITIAL_GUESTS } from './data/initialGuests';
import { Header } from './components/Header';
import { GuestForm } from './components/GuestForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { fetchGuestsFromGoogleSheets, getStoredAppsScriptUrl, setStoredAppsScriptUrl, fetchSettingsFromGoogleSheets } from './data/googleAppsScript';
import { getStoredSettings, AppSettings } from './data/settings';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('smpn11palu_theme');
    return (saved as ThemeMode) || 'light';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('form');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('smpn11palu_admin_logged') === 'true';
  });

  const [guests, setGuests] = useState<GuestEntry[]>(() => {
    try {
      const saved = localStorage.getItem('smpn11palu_guests');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to parse saved guests:', err);
    }
    return INITIAL_GUESTS;
  });

  const syncGuestsWithGoogleSheets = useCallback(async (customUrl?: string) => {
    const url = customUrl || getStoredAppsScriptUrl();
    if (!url || !url.startsWith('https://script.google.com/')) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const remoteGuests = await fetchGuestsFromGoogleSheets(url);
      if (remoteGuests !== null && Array.isArray(remoteGuests)) {
        setGuests(remoteGuests);
        localStorage.setItem('smpn11palu_guests', JSON.stringify(remoteGuests));
        setSyncStatus('success');
      } else {
        setSyncStatus('idle');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smpn11palu_theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    // Muat URL database permanen dari server terlebih dahulu
    const initializeDatabaseUrl = async () => {
      try {
        const res = await fetch('/api/get-url');
        const data = await res.json();
        if (data && data.success && data.url) {
          setStoredAppsScriptUrl(data.url);
          syncGuestsWithGoogleSheets(data.url);
          fetchSettingsFromGoogleSheets(data.url);
        } else {
          // Jika server kosong tapi browser lokal ini punya URL, unggah ke server secara otomatis
          const savedLocal = localStorage.getItem('smpn11palu_apps_script_url');
          if (savedLocal && savedLocal.startsWith('https://script.google.com/') && savedLocal.includes('/exec') && !savedLocal.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
            fetch('/api/save-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: savedLocal })
            }).catch(() => {});
          }
          syncGuestsWithGoogleSheets();
          fetchSettingsFromGoogleSheets();
        }
      } catch (err) {
        console.warn('Gagal memuat URL database dari server:', err);
        syncGuestsWithGoogleSheets();
        fetchSettingsFromGoogleSheets();
      }
    };
    
    initializeDatabaseUrl();

    // Dengarkan perubahan URL Web App saat disimpan di Admin Dashboard
    const handleUrlChange = (e: any) => {
      syncGuestsWithGoogleSheets(e.detail);
      fetchSettingsFromGoogleSheets(e.detail);
    };

    const handleSettingsEvent = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };

    window.addEventListener('apps_script_url_changed', handleUrlChange);
    window.addEventListener('settings_changed', handleSettingsEvent);

    // Auto-poll rekap sinkronisasi setiap 20 detik
    const interval = setInterval(() => {
      syncGuestsWithGoogleSheets();
      fetchSettingsFromGoogleSheets();
    }, 20000);

    return () => {
      window.removeEventListener('apps_script_url_changed', handleUrlChange);
      window.removeEventListener('settings_changed', handleSettingsEvent);
      clearInterval(interval);
    };
  }, [syncGuestsWithGoogleSheets]);

  useEffect(() => {
    try {
      localStorage.setItem('smpn11palu_guests', JSON.stringify(guests));
    } catch (err) {
      console.error('Failed to save guests:', err);
    }
  }, [guests]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const toggleTab = () => setActiveTab((prev) => (prev === 'form' ? 'admin' : 'form'));

  const handleAddGuest = (newGuest: GuestEntry) => {
    setGuests((prev) => [...prev, newGuest]);
  };

  const handleDeleteGuest = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleRefreshGuests = async () => {
    await syncGuestsWithGoogleSheets();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#0A192F] via-[#0B2545] to-[#134074] text-slate-100">
      {/* Lightweight subtle background grid pattern */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" 
      />

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        activeTab={activeTab}
        onToggleTab={toggleTab}
        isLoggedIn={isLoggedIn}
        settings={settings}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <GuestForm onAddGuest={handleAddGuest} guests={guests} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {isLoggedIn ? (
                <AdminDashboard
                  guests={guests}
                  onRefresh={handleRefreshGuests}
                  onDeleteGuest={handleDeleteGuest}
                  onLogout={() => {
                    setIsLoggedIn(false);
                    localStorage.removeItem('smpn11palu_admin_logged');
                  }}
                />
              ) : (
                <AdminLogin onLoginSuccess={() => {
                  setIsLoggedIn(true);
                  localStorage.setItem('smpn11palu_admin_logged', 'true');
                }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center relative z-10 px-4">
        <p className="text-sm font-medium text-blue-100/80 max-w-2xl mx-auto">
          {settings.copyright}
        </p>
      </footer>
    </div>
  );
}
