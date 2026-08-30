import { useState, useEffect, useCallback, useRef } from 'react';
import { GuestEntry, ThemeMode, ActiveTab } from './types';
import { Header } from './components/Header';
import { GuestForm } from './components/GuestForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { fetchGuestsFromGoogleSheets, getStoredAppsScriptUrl, setStoredAppsScriptUrl, fetchSettingsFromGoogleSheets, fetchAdminsFromGoogleSheets, DEFAULT_APPS_SCRIPT_URL, deleteGuestFromGoogleSheets } from './data/googleAppsScript';
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

  // Menyimpan tamu lokal yang baru saja dibuat di sesi ini dalam 15 detik terakhir
  const recentLocalEntriesRef = useRef<Map<string, { guest: GuestEntry; timestamp: number }>>(new Map());
  // Menyimpan ID dan nama tamu yang baru dihapus agar tidak ditarik kembali saat proses hapus di Google Sheets sedang berlangsung
  const deletedGuestSignaturesRef = useRef<Map<string, number>>(new Map());

  // Helper untuk menjamin semua ID guest bersifat unik (mencegah error React key collision)
  const ensureUniqueGuestIds = (list: GuestEntry[]): GuestEntry[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.map((guest, idx) => {
      let baseId = guest.id || `GT-${100000 + idx}`;
      let uniqueId = baseId;
      let counter = 1;
      while (seen.has(uniqueId)) {
        uniqueId = `${baseId}_${counter}`;
        counter++;
      }
      seen.add(uniqueId);
      return { ...guest, id: uniqueId };
    });
  };

  const [guests, setGuests] = useState<GuestEntry[]>(() => {
    try {
      const saved = localStorage.getItem('smpn11palu_guests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return ensureUniqueGuestIds(parsed);
      }
    } catch (err) {
      console.error('Failed to parse saved guests:', err);
    }
    return [];
  });

  const syncGuestsWithGoogleSheets = useCallback(async (customUrl?: string) => {
    const url = typeof customUrl === 'string' ? customUrl : getStoredAppsScriptUrl();
    if (!url || !url.startsWith('https://script.google.com/')) {
      setSyncStatus('idle');
      return;
    }

    setIsSyncing(true);

    try {
      const remoteGuests = await fetchGuestsFromGoogleSheets(url);
      if (remoteGuests !== null && Array.isArray(remoteGuests)) {
        const now = Date.now();

        // Bersihkan data hapus lokal yang usianya sudah lebih dari 30 detik
        deletedGuestSignaturesRef.current.forEach((timestamp, key) => {
          if (now - timestamp > 30000) {
            deletedGuestSignaturesRef.current.delete(key);
          }
        });

        // Saring data remote agar tidak memunculkan data yang baru saja dihapus oleh admin
        const activeRemoteGuests = remoteGuests.filter((g) => {
          const nameInstKey = `${(g.nama || '').trim().toLowerCase()}_${(g.instansi || '').trim().toLowerCase()}`;
          if (deletedGuestSignaturesRef.current.has(nameInstKey) || deletedGuestSignaturesRef.current.has(g.id)) {
            return false;
          }
          return true;
        });

        // Buat daftar nama+instansi yang sudah ada di remote
        const remoteNames = new Set(
          activeRemoteGuests.map((g) => `${(g.nama || '').trim().toLowerCase()}_${(g.instansi || '').trim().toLowerCase()}`)
        );

        const updatedList = [...activeRemoteGuests];

        // Bersihkan recentLocalEntries yang sudah berhasil masuk ke Google Sheets
        recentLocalEntriesRef.current.forEach((val, keyId) => {
          const localKey = `${(val.guest.nama || '').trim().toLowerCase()}_${(val.guest.instansi || '').trim().toLowerCase()}`;
          if (remoteNames.has(localKey) || (now - val.timestamp > 15000)) {
            recentLocalEntriesRef.current.delete(keyId);
          } else {
            // Hanya masukkan jika belum dihapus
            if (!deletedGuestSignaturesRef.current.has(localKey) && !deletedGuestSignaturesRef.current.has(keyId)) {
              updatedList.push(val.guest);
            }
          }
        });

        // Anti-duplikasi cerdas pada tampilan UI: Hapus baris yang identik (nama, instansi, tujuan) yang terulang beruntun
        const deduplicatedList: GuestEntry[] = [];
        const seenSignatures = new Set<string>();

        updatedList.forEach((entry) => {
          const sig = `${(entry.nama || '').trim().toLowerCase()}_${(entry.instansi || '').trim().toLowerCase()}_${(entry.tujuan || '').trim().toLowerCase()}_${(entry.waktu || '').slice(0, 16)}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            deduplicatedList.push(entry);
          }
        });

        const sanitizedList = ensureUniqueGuestIds(deduplicatedList);
        setGuests(sanitizedList);
        try {
          localStorage.setItem('smpn11palu_guests', JSON.stringify(sanitizedList));
        } catch (e) {}

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
    // Muat URL database permanen dari server atau gunakan default fallback
    const initializeDatabaseUrl = async () => {
      try {
        let serverUrl = '';
        try {
          const res = await fetch('/api/get-url');
          if (res.ok) {
            const data = await res.json();
            serverUrl = data?.url || '';
          }
        } catch (e) {
          // Ignore network errors on static hosting (Vercel/GitHub Pages)
        }
        
        const savedLocal = localStorage.getItem('smpn11palu_apps_script_url') || '';
        const OLD_DEPRECATED_URL = "https://script.google.com/macros/s/AKfycbx8Dx0DSE7RsQn7-FzpCXT1peNxZ1_09IawvuwGRjZKs65gCcg1P8-W_jspyVS8AxhCHA/exec";

        if (savedLocal === OLD_DEPRECATED_URL) {
          localStorage.removeItem('smpn11palu_apps_script_url');
        }
        
        let finalUrl = serverUrl;

        // Jika localStorage memiliki URL custom yang valid (dan bukan URL lama yang rusak), utamakan URL tersebut
        if (savedLocal && savedLocal !== OLD_DEPRECATED_URL && savedLocal.startsWith('https://script.google.com/')) {
          finalUrl = savedLocal;
          if (serverUrl !== savedLocal) {
            fetch('/api/save-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: finalUrl })
            }).catch(() => {});
          }
        }

        // Jika tidak ada URL di server maupun local, gunakan DEFAULT_APPS_SCRIPT_URL
        if (!finalUrl || finalUrl === OLD_DEPRECATED_URL || !finalUrl.startsWith('https://script.google.com/')) {
          finalUrl = DEFAULT_APPS_SCRIPT_URL;
        }

        setStoredAppsScriptUrl(finalUrl);
        syncGuestsWithGoogleSheets(finalUrl);
        fetchSettingsFromGoogleSheets(finalUrl);
        fetchAdminsFromGoogleSheets(finalUrl);
      } catch (err) {
        console.warn('Gagal memuat URL database dari server:', err);
        const fallbackUrl = DEFAULT_APPS_SCRIPT_URL;
        setStoredAppsScriptUrl(fallbackUrl);
        syncGuestsWithGoogleSheets(fallbackUrl);
        fetchSettingsFromGoogleSheets(fallbackUrl);
        fetchAdminsFromGoogleSheets(fallbackUrl);
      }
    };
    
    initializeDatabaseUrl();

    // Dengarkan perubahan URL Web App saat disimpan di Admin Dashboard
    const handleUrlChange = (e: any) => {
      syncGuestsWithGoogleSheets(e.detail);
      fetchSettingsFromGoogleSheets(e.detail);
      fetchAdminsFromGoogleSheets(e.detail);
    };

    const handleSettingsEvent = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };

    window.addEventListener('apps_script_url_changed', handleUrlChange);
    window.addEventListener('settings_changed', handleSettingsEvent);

    // Auto-poll rekap sinkronisasi setiap 8 detik agar HP dan Laptop selalu realtime seragam
    const interval = setInterval(() => {
      syncGuestsWithGoogleSheets();
      fetchSettingsFromGoogleSheets();
    }, 8000);

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
    recentLocalEntriesRef.current.set(newGuest.id, { guest: newGuest, timestamp: Date.now() });
    setGuests((prev) => {
      const filtered = prev.filter((g) => g.id !== newGuest.id);
      const nextList = [...filtered, newGuest];
      try {
        localStorage.setItem('smpn11palu_guests', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    // Otomatis sinkronkan ulang setelah 2.5 detik
    setTimeout(() => {
      syncGuestsWithGoogleSheets();
    }, 2500);
  };

  const handleDeleteGuest = async (id: string, nama?: string, extra?: { waktu?: string; instansi?: string }) => {
    recentLocalEntriesRef.current.delete(id);
    const targetGuest = guests.find((g) => g.id === id);
    const targetNama = (nama || targetGuest?.nama || '').trim();
    const targetWaktu = extra?.waktu || targetGuest?.waktu || '';
    const targetInstansi = (extra?.instansi || targetGuest?.instansi || '').trim();

    const nameInstKey = `${targetNama.toLowerCase()}_${targetInstansi.toLowerCase()}`;
    const now = Date.now();

    if (nameInstKey !== "_") {
      deletedGuestSignaturesRef.current.set(nameInstKey, now);
    }
    deletedGuestSignaturesRef.current.set(id, now);

    setGuests((prev) => {
      const nextList = prev.filter((g) => {
        if (g.id === id) return false;
        if (targetNama && targetInstansi && 
            (g.nama || '').trim().toLowerCase() === targetNama.toLowerCase() && 
            (g.instansi || '').trim().toLowerCase() === targetInstansi.toLowerCase() &&
            (targetWaktu ? (g.waktu || '').slice(0, 16) === targetWaktu.slice(0, 16) : true)) {
          return false;
        }
        return true;
      });
      try {
        localStorage.setItem('smpn11palu_guests', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    // Kirim sinyal hapus ke Google Sheets secara asinkron
    await deleteGuestFromGoogleSheets(id, targetNama, { waktu: targetWaktu, instansi: targetInstansi });

    // Otomatis sinkronkan ulang setelah beberapa saat
    setTimeout(() => {
      syncGuestsWithGoogleSheets();
    }, 2000);
  };

  const handleResetCache = async () => {
    recentLocalEntriesRef.current.clear();
    try {
      localStorage.removeItem('smpn11palu_guests');
    } catch (e) {}
    setGuests([]);
    await syncGuestsWithGoogleSheets();
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
                  onResetCache={handleResetCache}
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
