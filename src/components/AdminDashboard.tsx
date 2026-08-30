import React, { useState, useMemo, useEffect } from 'react';
import { GuestEntry } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE, getStoredAppsScriptUrl, setStoredAppsScriptUrl, saveSettingsToGoogleSheets } from '../data/googleAppsScript';
import { getStoredSettings, setStoredSettings } from '../data/settings';
import { 
  Search, Filter, Download, Trash2, RefreshCw, 
  ChevronDown, LogOut, FileSpreadsheet, Eye, 
  Users, Award, CalendarDays, Printer, Database, X,
  Code, Copy, Check, Globe, Link as LinkIcon, Save, ExternalLink, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


const parseGuestDate = (waktuStr: string | undefined): { year: number, month: number, day: number } | null => {
  if (!waktuStr) return null;
  const datePart = waktuStr.trim().split(' ')[0];
  if (!datePart) return null;

  // Try dash first (e.g. YYYY-MM-DD)
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p0 > 1000) {
          return { year: p0, month: p1 - 1, day: p2 };
        } else if (p2 > 1000) {
          return { year: p2, month: p1 - 1, day: p0 };
        }
      }
    }
  }

  // Try slash (e.g. DD/MM/YYYY)
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p0 > 1000) {
          return { year: p0, month: p1 - 1, day: p2 };
        } else if (p2 > 1000) {
          return { year: p2, month: p1 - 1, day: p0 };
        }
      }
    }
  }

  // Fallback
  const parsedDate = new Date(waktuStr);
  if (!isNaN(parsedDate.getTime())) {
    return {
      year: parsedDate.getFullYear(),
      month: parsedDate.getMonth(),
      day: parsedDate.getDate()
    };
  }

  return null;
};

interface AdminDashboardProps {
  guests: GuestEntry[];
  onRefresh: () => void;
  onDeleteGuest: (id: string, nama?: string, extra?: { waktu?: string; instansi?: string }) => void;
  onResetCache?: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  guests,
  onRefresh,
  onDeleteGuest,
  onResetCache,
  onLogout,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<'data' | 'recap' | 'settings'>('data');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [copyrightText, setCopyrightText] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<GuestEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'script' | 'url' | 'vercel'>('url');
  const [isCopied, setIsCopied] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isShareUrlCopied, setIsShareUrlCopied] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(getStoredAppsScriptUrl());
  const [isSavedUrl, setIsSavedUrl] = useState(false);

  useEffect(() => {
    const handleSettingsEvent = (e: any) => {
      if (e.detail) {
        setSchoolName(e.detail.nama_sekolah || '');
        setSchoolLogo(e.detail.logo_url || '');
        setCopyrightText(e.detail.copyright || '');
      }
    };

    const handleUrlChangeEvent = (e: any) => {
      if (e.detail) {
        setScriptUrl(e.detail);
      }
    };

    const sets = getStoredSettings();
    setSchoolName(sets.nama_sekolah);
    setSchoolLogo(sets.logo_url);
    setCopyrightText(sets.copyright);
    setScriptUrl(getStoredAppsScriptUrl());

    window.addEventListener('settings_changed', handleSettingsEvent);
    window.addEventListener('apps_script_url_changed', handleUrlChangeEvent);
    return () => {
      window.removeEventListener('settings_changed', handleSettingsEvent);
      window.removeEventListener('apps_script_url_changed', handleUrlChangeEvent);
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveStatus('idle');

    const updated = {
      nama_sekolah: schoolName.trim(),
      logo_url: schoolLogo.trim(),
      copyright: copyrightText.trim()
    };

    // Save locally immediately
    setStoredSettings(updated);

    // Save to Google Sheets if configured
    const url = getStoredAppsScriptUrl();
    if (url && url.startsWith('https://script.google.com/') && !url.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
      try {
        const success = await saveSettingsToGoogleSheets(updated, url);
        if (success) {
          setSettingsSaveStatus('success');
        } else {
          setSettingsSaveStatus('error');
        }
      } catch (err) {
        console.warn('Gagal menyimpan pengaturan online:', err);
        setSettingsSaveStatus('error');
      }
    } else {
      // Local only is a success
      setSettingsSaveStatus('success');
    }
    
    setIsSavingSettings(false);
    setTimeout(() => setSettingsSaveStatus('idle'), 4000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(scriptUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoredAppsScriptUrl(scriptUrl);
    setIsSavedUrl(true);
    
    // Panggang (bake) URL ke kode sumber server secara permanen jika sedang berjalan di preview pembuat
    try {
      await fetch('/api/save-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scriptUrl })
      });
    } catch (err) {
      console.warn('Sistem mencadangkan URL ke penyimpanan browser lokal saja:', err);
    }

    setTimeout(() => setIsSavedUrl(false), 2000);
  };


  // Stats calculation
  const totalTamu = guests.length;
  const totalUmum = guests.filter(g => g.kategori === 'Umum').length;
  const totalKhusus = guests.filter(g => g.kategori === 'Khusus').length;
  
  const totalHariIni = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curDay = now.getDate();
    return guests.filter(g => {
      const parsed = parseGuestDate(g.waktu);
      if (!parsed) return false;
      return parsed.year === curYear && parsed.month === curMonth && parsed.day === curDay;
    }).length;
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesSearch = 
        guest.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.instansi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.tujuan.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || guest.kategori === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [guests, searchQuery, categoryFilter]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleDownloadExcel = () => {
    const headers = ["No", "Tanggal & Waktu", "Kategori", "Nama", "Jenis Kelamin", "Instansi/Asal", "Tujuan", "Keperluan", "Saran", "No. HP/WA"];
    const csvContent = [
      headers.join(','),
      ...guests.map((g, idx) => {
        const no = idx + 1;
        const waktuValue = g.waktu || '';
        const kategoriValue = g.kategori || 'Umum';
        const namaValue = g.nama || '';
        const jkValue = g.jk || 'Laki-laki';
        const instansiValue = g.instansi || '-';
        const tujuanValue = g.tujuan || '-';
        const keperluanValue = g.keperluan || '-';
        const saranValue = g.saran || '';
        const nohpValue = g.nohp || (g as any).noHp || '';
        return `"${no}","${waktuValue}","${kategoriValue}","${namaValue}","${jkValue}","${instansiValue}","${tujuanValue}","${keperluanValue}","${saranValue}","${nohpValue}"`;
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Data_Tamu_Lengkap_${new Date().toLocaleDateString('id-ID')}.csv`;
    link.click();
  };

  const handlePrintGeneral = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak rekap.');
      return;
    }

    const reportTitle = `Laporan Daftar Tamu & Pengunjung`;

    const rowsHtml = filteredGuests.map((g, idx) => {
      const no = idx + 1;
      const nohpValue = g.nohp || (g as any).noHp || '';
      const keperluan = g.keperluan || '';
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${no}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-family: monospace; font-size: 11px;">${g.waktu}</td>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${g.nama}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${g.kategori}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${g.jk}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${g.instansi}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${g.tujuan}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${keperluan}</td>
          <td style="padding: 10px; border: 1px solid #ddd; font-size: 11px;">${nohpValue}</td>
        </tr>
      `;
    }).join('');

    const emptyRowHtml = filteredGuests.length === 0 ? `
      <tr>
        <td colspan="9" style="padding: 24px; border: 1px solid #ddd; text-align: center; color: #666; font-style: italic;">Tidak ada data tamu yang sesuai penyaringan.</td>
      </tr>
    ` : '';

    const logoHtml = schoolLogo 
      ? `<img src="${schoolLogo}" style="height: 85px; max-width: 100px; object-fit: contain; margin-right: 20px;" alt="Logo" referrerPolicy="no-referrer" />`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; color: #111; margin: 40px; line-height: 1.5; }
            .kop-surat { display: flex; align-items: center; border-bottom: 4px double #000; padding-bottom: 12px; margin-bottom: 25px; }
            .kop-text { flex-grow: 1; text-align: center; }
            .kop-text h1 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-text h2 { margin: 3px 0; font-size: 21px; font-weight: bold; text-transform: uppercase; }
            .kop-text p { margin: 2px 0 0; font-size: 11px; font-style: italic; color: #444; }
            .report-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; text-decoration: underline; }
            .info-table { font-size: 13px; margin-bottom: 20px; border-collapse: collapse; width: 100%; }
            .info-table td { padding: 4px 0; border: none; }
            .stats-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 35px; font-size: 12px; }
            .stats-table th { background-color: #f5f5f5; font-weight: bold; padding: 10px; border: 1px solid #111; text-transform: uppercase; font-size: 11px; text-align: center; }
            .stats-table td { border: 1px solid #111; padding: 8px; }
            .signature-section { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 13px; }
            .signature-box { width: 250px; text-align: center; }
            .signature-space { height: 75px; }
            @media print {
              @page { size: A4 landscape; margin: 1.2cm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="kop-surat">
            ${logoHtml}
            <div class="kop-text">
              <h1>PEMERINTAH PROVINSI SULAWESI TENGAH</h1>
              <h1>DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
              <h2>${schoolName || 'SMP NEGERI 11 PALU'}</h2>
              <p>Alamat: Jl. Ki Hajar Dewantara No. 11, Palu, Sulawesi Tengah. Telp: (0451) 421234</p>
            </div>
          </div>
          
          <div class="report-title">${reportTitle}</div>
          
          <table class="info-table">
            <tr>
              <td style="width: 15%;"><strong>Penyaringan</strong></td>
              <td style="width: 2%;">:</td>
              <td>${categoryFilter === 'all' ? 'Semua Kategori' : 'Kategori ' + categoryFilter} ${searchQuery ? `(Kata Kunci: "${searchQuery}")` : ''}</td>
            </tr>
            <tr>
              <td><strong>Tanggal Cetak</strong></td>
              <td>:</td>
              <td>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td><strong>Jumlah Baris</strong></td>
              <td>:</td>
              <td>${filteredGuests.length} baris data</td>
            </tr>
          </table>

          <table class="stats-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 12%;">Waktu</th>
                <th style="width: 18%;">Nama Lengkap</th>
                <th style="width: 10%;">Kategori</th>
                <th style="width: 10%;">Gender</th>
                <th style="width: 15%;">Instansi</th>
                <th style="width: 12%;">Tujuan</th>
                <th style="width: 18%;">Keperluan</th>
                <th style="width: 10%;">No. HP/WA</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${emptyRowHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <p>Mengetahui,</p>
              <p style="font-weight: bold; margin-top: 5px;">Kepala Sekolah</p>
              <div class="signature-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">..................................................</p>
              <p>NIP. ..........................................</p>
            </div>
            <div class="signature-box">
              <p>Palu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p style="font-weight: bold; margin-top: 5px;">Petugas Admin</p>
              <div class="signature-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${schoolName ? 'Operator ' + schoolName : 'Petugas Perpustakaan'}</p>
              <p>NIP/NPT. ....................................</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const INDONESIAN_MONTHS = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], []);

  // Filter guests in the selected month & year
  const selectedMonthGuests = useMemo(() => {
    return guests.filter(g => {
      const parsed = parseGuestDate(g.waktu);
      if (!parsed) return false;
      return parsed.year === selectedYear && parsed.month === selectedMonth;
    });
  }, [guests, selectedMonth, selectedYear]);

  // Aggregate stats for the selected month
  const selectedMonthStats = useMemo(() => {
    const total = selectedMonthGuests.length;
    const umum = selectedMonthGuests.filter(g => g.kategori === 'Umum').length;
    const khusus = selectedMonthGuests.filter(g => g.kategori === 'Khusus').length;
    const laki = selectedMonthGuests.filter(g => g.jk === 'Laki-laki').length;
    const perempuan = selectedMonthGuests.filter(g => g.jk === 'Perempuan').length;
    return { total, umum, khusus, laki, perempuan };
  }, [selectedMonthGuests]);

  // Group monthly guests by date to get daily summaries
  const selectedMonthDailyBreakdown = useMemo(() => {
    const dailyData: { [day: number]: { total: number; umum: number; khusus: number; l: number; p: number } } = {};
    
    selectedMonthGuests.forEach(g => {
      const parsed = parseGuestDate(g.waktu);
      if (!parsed) return;
      const day = parsed.day;

      if (!dailyData[day]) {
        dailyData[day] = { total: 0, umum: 0, khusus: 0, l: 0, p: 0 };
      }
      dailyData[day].total++;
      if (g.kategori === 'Umum') dailyData[day].umum++;
      else dailyData[day].khusus++;

      if (g.jk === 'Laki-laki') dailyData[day].l++;
      else dailyData[day].p++;
    });

    return Object.keys(dailyData).map(Number).sort((a, b) => a - b).map(day => ({
      day,
      ...dailyData[day]
    }));
  }, [selectedMonthGuests]);

  // Dynamic list of years from data + current year + surrounding years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Always include current year, past 3 years, and next 5 years for a complete range
    yearsSet.add(currentYear);
    for (let i = 1; i <= 3; i++) {
      yearsSet.add(currentYear - i);
    }
    for (let i = 1; i <= 5; i++) {
      yearsSet.add(currentYear + i);
    }

    // Also parse and add any historical years present in the guest list database
    guests.forEach(g => {
      const parsed = parseGuestDate(g.waktu);
      if (parsed && parsed.year > 1900 && parsed.year < 2100) {
        yearsSet.add(parsed.year);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [guests]);

  // Handlers for printing and exporting monthly data
  const handlePrintMonthly = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak rekap bulanan.');
      return;
    }

    const reportTitle = `Laporan Rekapitulasi Buku Tamu Bulanan`;
    const periodStr = `${INDONESIAN_MONTHS[selectedMonth]} ${selectedYear}`;

    const sortedDays = selectedMonthDailyBreakdown;
    const rowsHtml = sortedDays.map(data => {
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${data.day} ${periodStr}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${data.umum}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${data.khusus}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${data.l} L / ${data.p} P</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; background-color: #fcfcfc;">${data.total}</td>
        </tr>
      `;
    }).join('');

    const emptyRowHtml = sortedDays.length === 0 ? `
      <tr>
        <td colspan="5" style="padding: 24px; border: 1px solid #ddd; text-align: center; color: #666; font-style: italic;">Tidak ada kunjungan tercatat pada periode ini.</td>
      </tr>
    ` : '';

    const logoHtml = schoolLogo 
      ? `<img src="${schoolLogo}" style="height: 85px; max-width: 100px; object-fit: contain; margin-right: 20px;" alt="Logo" referrerPolicy="no-referrer" />`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle} - ${periodStr}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; color: #111; margin: 40px; line-height: 1.5; }
            .kop-surat { display: flex; align-items: center; border-b: 4px double #000; padding-bottom: 12px; margin-bottom: 25px; }
            .kop-text { flex-grow: 1; text-align: center; }
            .kop-text h1 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-text h2 { margin: 3px 0; font-size: 21px; font-weight: bold; text-transform: uppercase; }
            .kop-text p { margin: 2px 0 0; font-size: 11px; font-style: italic; color: #444; }
            .report-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; text-decoration: underline; }
            .info-table { font-size: 13px; margin-bottom: 20px; border-collapse: collapse; width: 100%; }
            .info-table td { padding: 4px 0; border: none; }
            .stats-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 35px; font-size: 13px; }
            .stats-table th { background-color: #f5f5f5; font-weight: bold; padding: 10px; border: 1px solid #111; text-transform: uppercase; font-size: 12px; }
            .stats-table td { border: 1px solid #111; }
            .summary-cards { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #111; padding: 15px; border-radius: 4px; text-align: center; background-color: #fafafa; }
            .card-title { font-size: 11px; font-weight: bold; color: #333; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px; }
            .card-value { font-size: 26px; font-weight: bold; }
            .signature-section { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 13px; }
            .signature-box { width: 250px; text-align: center; }
            .signature-space { height: 75px; }
            @media print {
              @page { size: A4 portrait; margin: 1.5cm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="kop-surat">
            ${logoHtml}
            <div class="kop-text">
              <h1>PEMERINTAH PROVINSI SULAWESI TENGAH</h1>
              <h1>DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
              <h2>${schoolName || 'SMP NEGERI 11 PALU'}</h2>
              <p>Alamat: Jl. Ki Hajar Dewantara No. 11, Palu, Sulawesi Tengah. Telp: (0451) 421234</p>
            </div>
          </div>
          
          <div class="report-title">${reportTitle}</div>
          
          <table class="info-table">
            <tr>
              <td style="width: 15%;"><strong>Periode</strong></td>
              <td style="width: 2%;">:</td>
              <td>${periodStr}</td>
            </tr>
            <tr>
              <td><strong>Tanggal Cetak</strong></td>
              <td>:</td>
              <td>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Total Pengunjung</div>
              <div class="card-value">${selectedMonthStats.total}</div>
            </div>
            <div class="card">
              <div class="card-title">Tamu Umum</div>
              <div class="card-value">${selectedMonthStats.umum}</div>
            </div>
            <div class="card">
              <div class="card-title">Tamu Khusus</div>
              <div class="card-value">${selectedMonthStats.khusus}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 10px; font-size: 14px; text-transform: uppercase; font-family: sans-serif;">A. Rincian Kunjungan Harian</h3>
          <table class="stats-table">
            <thead>
              <tr>
                <th style="width: 25%;">Hari / Tanggal</th>
                <th style="width: 20%;">Tamu Umum</th>
                <th style="width: 20%;">Tamu Khusus</th>
                <th style="width: 20%;">Rasio Gender</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${emptyRowHtml}
              <tr style="font-weight: bold; background-color: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #111; text-align: center; text-transform: uppercase;">Jumlah Total</td>
                <td style="padding: 10px; border: 1px solid #111; text-align: center;">${selectedMonthStats.umum}</td>
                <td style="padding: 10px; border: 1px solid #111; text-align: center;">${selectedMonthStats.khusus}</td>
                <td style="padding: 10px; border: 1px solid #111; text-align: center;">${selectedMonthStats.laki} L / ${selectedMonthStats.perempuan} P</td>
                <td style="padding: 10px; border: 1px solid #111; text-align: center;">${selectedMonthStats.total}</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <p>Mengetahui,</p>
              <p style="font-weight: bold; margin-top: 5px;">Kepala Sekolah</p>
              <div class="signature-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">..................................................</p>
              <p>NIP. ..........................................</p>
            </div>
            <div class="signature-box">
              <p>Palu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p style="font-weight: bold; margin-top: 5px;">Petugas Admin</p>
              <div class="signature-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${schoolName ? 'Operator ' + schoolName : 'Petugas Perpustakaan'}</p>
              <p>NIP/NPT. ....................................</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadExcelMonthly = () => {
    // We will download a clean CSV of visitors in this month matching the database layout
    const headersRaw = ["No", "Tanggal & Waktu", "Kategori", "Nama", "Jenis Kelamin", "Instansi/Asal", "Tujuan", "Keperluan", "Saran", "No. HP/WA"];
    const rawRows = selectedMonthGuests.map((g, idx) => {
      const no = idx + 1;
      const waktuValue = g.waktu || '';
      const kategoriValue = g.kategori || 'Umum';
      const namaValue = g.nama || '';
      const jkValue = g.jk || 'Laki-laki';
      const instansiValue = g.instansi || '-';
      const tujuanValue = g.tujuan || '-';
      const keperluanValue = g.keperluan || '-';
      const saranValue = g.saran || '';
      const nohpValue = g.nohp || (g as any).noHp || '';
      return `"${no}","${waktuValue}","${kategoriValue}","${namaValue}","${jkValue}","${instansiValue}","${tujuanValue}","${keperluanValue}","${saranValue}","${nohpValue}"`;
    });

    const csvContent = [
      `"LAPORAN BULANAN BUKU TAMU - ${INDONESIAN_MONTHS[selectedMonth].toUpperCase()} ${selectedYear}"`,
      `"Nama Sekolah:","${schoolName || 'SMP Negeri 11 Palu'}"`,
      `"Total Pengunjung:","${selectedMonthStats.total}"`,
      `"Tamu Umum:","${selectedMonthStats.umum}"`,
      `"Tamu Khusus:","${selectedMonthStats.khusus}"`,
      `"Laki-laki:","${selectedMonthStats.laki}"`,
      `"Perempuan:","${selectedMonthStats.perempuan}"`,
      '',
      headersRaw.join(','),
      ...rawRows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Bulanan_${INDONESIAN_MONTHS[selectedMonth]}_${selectedYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Admin</h2>
          <p className="text-sm font-medium text-blue-200 dark:text-slate-400 mt-1">Manajemen & Rekapitulasi Data Buku Tamu</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowScriptModal(true)}
            title="Pengaturan Script & URL"
            className="p-2 sm:p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center"
          >
            <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
          <button
            onClick={handleDownloadExcel}
            className="p-2 sm:px-4 sm:py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handlePrintGeneral}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleRefreshClick}
            className="p-2 sm:px-4 sm:py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onLogout}
            className="p-2 sm:px-4 sm:py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ml-auto md:ml-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 gap-2 mb-2">
        <button
          onClick={() => setCurrentSubTab('data')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            currentSubTab === 'data'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Daftar Tamu & Statistik
        </button>
        <button
          onClick={() => setCurrentSubTab('recap')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            currentSubTab === 'recap'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Rekap Bulanan
        </button>
        <button
          onClick={() => setCurrentSubTab('settings')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            currentSubTab === 'settings'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Pengaturan Sekolah
        </button>
      </div>

      {currentSubTab === 'data' && (
        <>
          {/* Bento Grid Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Pengunjung', value: totalTamu, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100/80' },
              { label: 'Tamu Umum', value: totalUmum, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100/80' },
              { label: 'Tamu Khusus', value: totalKhusus, icon: Award, color: 'text-amber-600', bg: 'bg-amber-100/80' },
              { label: 'Kunjungan Hari Ini', value: totalHariIni, icon: CalendarDays, color: 'text-purple-600', bg: 'bg-purple-100/80' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-lg shadow-blue-950/5 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, instansi, atau keperluan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors placeholder:text-slate-400"
                />
              </div>
              <div className="relative shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none transition-colors text-slate-800"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="Umum">Tamu Umum</option>
                  <option value="Khusus">Tamu Khusus</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Tamu</th>
                    <th className="px-6 py-4">Instansi</th>
                    <th className="px-6 py-4">Tujuan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuests.length > 0 ? (
                    [...filteredGuests].reverse().map((guest, idx) => (
                      <tr key={`${guest.id || 'guest'}-${idx}`} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{guest.waktu}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{guest.nama}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              guest.kategori === 'Khusus' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {guest.kategori}
                            </span>
                            <span className="text-xs text-slate-600">{guest.jk}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{guest.instansi}</td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{guest.tujuan}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedGuest(guest)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                              title="Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setGuestToDelete(guest)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600">
                        Tidak ada data tamu yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentSubTab === 'recap' && (
        <div className="space-y-6">
          {/* Filters & Actions Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {INDONESIAN_MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Tahun</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={handlePrintMonthly}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Cetak Rekap
              </button>
              <button
                onClick={handleDownloadExcelMonthly}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel (.csv)
              </button>
            </div>
          </div>

          {/* Month Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Tamu Bulan Ini', value: selectedMonthStats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              { label: 'Kategori Tamu Umum', value: selectedMonthStats.umum, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Kategori Tamu Khusus', value: selectedMonthStats.khusus, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
              { label: 'Rasio Gender L / P', value: `${selectedMonthStats.laki} L / ${selectedMonthStats.perempuan} P`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white p-5 rounded-2xl border ${stat.bg} shadow-md flex flex-col justify-between h-28`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-1.5 rounded-lg bg-white ${stat.color} shadow-sm border border-slate-100`}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Daily Table Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Rincian Kehadiran Harian</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ringkasan total kunjungan tamu per hari untuk bulan {INDONESIAN_MONTHS[selectedMonth]} {selectedYear}</p>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
                {selectedMonthDailyBreakdown.length} Hari Aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-3.5">Tanggal</th>
                    <th className="px-6 py-3.5 text-center">Tamu Umum</th>
                    <th className="px-6 py-3.5 text-center">Tamu Khusus</th>
                    <th className="px-6 py-3.5 text-center">Laki-laki / Perempuan</th>
                    <th className="px-6 py-3.5 text-right">Total Kunjungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMonthDailyBreakdown.length > 0 ? (
                    selectedMonthDailyBreakdown.map((row) => (
                      <tr key={row.day} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {row.day} {INDONESIAN_MONTHS[selectedMonth]} {selectedYear}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-full font-bold text-xs">
                            {row.umum}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-bold text-xs">
                            {row.khusus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-slate-600">
                          {row.l} L / {row.p} P
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                          {row.total}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-medium">
                        Tidak ada data kunjungan pada periode {INDONESIAN_MONTHS[selectedMonth]} {selectedYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentSubTab === 'settings' && (
        <div className="bg-[#EBF1F7] rounded-3xl p-6 sm:p-8 border border-white/50 shadow-xl space-y-6 max-w-2xl text-slate-800">
          <div className="border-b border-slate-300/60 pb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600 animate-pulse" />
              Pengaturan Buku Tamu Digital
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Atur identitas, logo, dan footer teks copyright aplikasi Anda agar tersinkron ke Google Sheets.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Nama Sekolah
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMP Negeri 11 Palu"
                className="w-full px-4 py-3 bg-[#EAF0F6] rounded-xl text-slate-800 font-semibold text-sm shadow-[inset_2px_2px_5px_rgba(166,180,200,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] border border-transparent focus:border-blue-500/60 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                URL Logo Sekolah (PNG/JPG)
              </label>
              <input
                type="url"
                value={schoolLogo}
                onChange={(e) => setSchoolLogo(e.target.value)}
                placeholder="Contoh: https://i.ibb.co.com/gynMvF2/logo.png"
                className="w-full px-4 py-3 bg-[#EAF0F6] rounded-xl text-slate-800 font-semibold text-sm shadow-[inset_2px_2px_5px_rgba(166,180,200,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] border border-transparent focus:border-blue-500/60 transition-all outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Gunakan link gambar eksternal yang valid untuk logo sekolah Anda. Biarkan kosong untuk menggunakan logo default.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Teks Copyright Kaki Halaman
              </label>
              <textarea
                rows={2}
                required
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                placeholder="Contoh: © 2026 Buku Tamu Digital SMP Negeri 11 Palu. All Rights Reserved."
                className="w-full px-4 py-3 bg-[#EAF0F6] rounded-xl text-slate-800 font-semibold text-sm shadow-[inset_2px_2px_5px_rgba(166,180,200,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] border border-transparent focus:border-blue-500/60 transition-all outline-none resize-none"
              />
            </div>

            {settingsSaveStatus === 'success' && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pengaturan berhasil disimpan dan disinkronkan!</span>
              </div>
            )}

            {settingsSaveStatus === 'error' && (
              <div className="p-3 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-2">
                <X className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pengaturan lokal disimpan, namun gagal disinkronkan ke Google Sheets. Silakan cek URL Apps Script Anda.</span>
              </div>
            )}

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Pengaturan
                  </>
                )}
              </button>

              <div className="text-xs text-slate-500">
                Pembaruan ini akan tersimpan langsung ke Google Sheets pada sheet bernama <span className="font-bold underline">Pengaturan</span>.
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedGuest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuest(null)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detail Pengunjung</h3>
                  <button
                    onClick={() => setSelectedGuest(null)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tanggal & Waktu</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedGuest.waktu}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kategori Tamu</p>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                        selectedGuest.kategori === 'Khusus' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {selectedGuest.kategori}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        <tr>
                          <td className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 font-medium text-slate-600 dark:text-slate-400 w-1/3">Nama Lengkap</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{selectedGuest.nama}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 font-medium text-slate-600 dark:text-slate-400">Jenis Kelamin</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{selectedGuest.jk}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 font-medium text-slate-600 dark:text-slate-400">Instansi / Asal</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{selectedGuest.instansi}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 font-medium text-slate-600 dark:text-slate-400">No. HP / WhatsApp</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{selectedGuest.noHp || '-'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 font-medium text-slate-600 dark:text-slate-400 align-top">Tujuan / Keperluan</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedGuest.tujuan}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setGuestToDelete(selectedGuest)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Tamu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGuest(null)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Script Code.gs Modal */}
        {showScriptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScriptModal(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20">
                      <Code className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Integrasi Google Apps Script & Vercel</h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Kelola URL Web App dan salin kode <code>Code.gs</code> untuk koneksi GitHub & Vercel
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowScriptModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/80">
                  <button
                    onClick={() => setActiveModalTab('url')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      activeModalTab === 'url'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>1. Setel URL Web App</span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('script')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      activeModalTab === 'script'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>2. Salin Kode Code.gs</span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('vercel')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      activeModalTab === 'vercel'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>3. Panduan GitHub & Vercel</span>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* TAB 1: SETEL URL WEB APP */}
                {activeModalTab === 'url' && (
                  <div className="space-y-5">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-blue-600" />
                          URL Deployment Web App Google Apps Script
                        </label>
                        {isSavedUrl && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <Check className="w-3.5 h-3.5" /> Berhasil Disimpan!
                          </span>
                        )}
                      </div>
                      
                      <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={scriptUrl}
                          onChange={(e) => setScriptUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/AKfycb.../exec (Kosongkan untuk offline)"
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan URL</span>
                        </button>
                      </form>
                      
                      {scriptUrl && scriptUrl.startsWith('https://script.google.com/') && (
                        <div className="mt-4 p-4 border border-emerald-100 bg-emerald-50 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-emerald-900">✨ Bagikan Akses ke HP/Perangkat Lain</h4>
                            <p className="text-xs text-emerald-700">Karena ini adalah pratinjau yang terisolasi, perangkat teman Anda mungkin tidak mendapatkan URL-nya. Salin dan kirim "Link Sakti" berikut ke HP/teman Anda agar otomatis login!</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const magicLink = window.location.origin + '?url=' + encodeURIComponent(scriptUrl);
                              navigator.clipboard.writeText(magicLink);
                              setIsUrlCopied(true);
                              setTimeout(() => setIsUrlCopied(false), 2000);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                            <span>{isUrlCopied ? 'Tersalin!' : 'Salin Link Sakti'}</span>
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        URL ini didapatkan dari Google Sheets → <strong>Ekstensi</strong> → <strong>Apps Script</strong> → <strong>Terapkan (Deploy) Sebagai Aplikasi Web</strong>.
                      </p>
                    </div>

                    <div className="border border-blue-100 bg-blue-50/70 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                      <p className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                        <span>🚀</span> Cara Kerja Sinkronisasi URL:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 font-medium">
                        <li>Di lingkungan AI Studio, server mungkin saja "tertidur" dan menghapus riwayat setelan karena bersifat tanpa-status (stateless).</li>
                        <li>Agar koneksi tidak pernah hilang, <strong>Gunakan Tombol Salin Link Sakti di atas</strong> jika Anda ingin menguji di HP atau perangkat teman Anda.</li>
                        <li>Jika ingin mempublikasikan aplikasi ini ke internet secara permanen, gunakan fitur <strong>Ekspor ke Vercel</strong> di bawah.</li>
                      </ul>
                    </div>


                  </div>
                )}

                {/* TAB 2: SALIN KODE CODE.GS */}
                {activeModalTab === 'script' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                      <p className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                        <span>💡</span> Cara Pemasangan di Google Sheets:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1 font-medium">
                        <li>Buka Google Sheets target Anda.</li>
                        <li>Klik menu <strong>Ekstensi</strong> → <strong>Apps Script</strong>.</li>
                        <li>Hapus seluruh kode bawaan, lalu <strong>Tempel (Paste)</strong> kode <code>Code.gs</code> di bawah ini.</li>
                        <li>Klik <strong>Terapkan (Deploy)</strong> → <strong>Terapkan Sebagai Aplikasi Web (New Deployment)</strong>.</li>
                        <li>Setel akses: <em>Who has access</em> ke <strong>Anyone (Siapa saja)</strong>.</li>
                      </ol>
                    </div>

                    {/* Code Box Header with Copy Button */}
                    <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-4 py-2.5 rounded-t-xl font-mono text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                        Code.gs
                      </span>
                      <button
                        onClick={handleCopyScript}
                        className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Berhasil Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Seluruh Kode</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code Block Container */}
                    <div className="relative">
                      <pre className="bg-slate-950 text-emerald-400 p-4 rounded-b-xl font-mono text-xs overflow-x-auto max-h-[300px] leading-relaxed select-all">
                        <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* TAB 3: PANDUAN GITHUB & VERCEL */}
                {activeModalTab === 'vercel' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                          <span>📦</span> Variabel Lingkungan Vercel (Environment Variable)
                        </h4>
                        <button
                          onClick={handleCopyUrl}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          {isUrlCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{isUrlCopied ? 'URL Disalin' : 'Salin URL'}</span>
                        </button>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-slate-300 space-y-1 border border-slate-800">
                        <div className="text-slate-400"># KEY:</div>
                        <div className="text-emerald-400 font-bold">VITE_APPS_SCRIPT_URL</div>
                        <div className="text-slate-400 mt-2"># VALUE:</div>
                        <div className="text-sky-300 break-all">{scriptUrl}</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-900">Langkah-Langkah Connect GitHub ke Vercel:</h4>
                      <ol className="list-decimal pl-5 space-y-2 font-medium">
                        <li>Export repositori ini ke <strong>GitHub</strong> (melalui menu Export AI Studio / Git commit).</li>
                        <li>Buka dashboard <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Vercel.com</a> lalu klik <strong>Add New Project</strong>.</li>
                        <li>Pilih repositori GitHub Buku Tamu SMPN 11 Palu Anda.</li>
                        <li>Pada bagian <strong>Environment Variables</strong>, masukkan:
                          <ul className="list-disc pl-5 mt-1 space-y-0.5 font-mono text-blue-700">
                            <li>Key: <code>VITE_APPS_SCRIPT_URL</code></li>
                            <li>Value: <code>{scriptUrl}</code></li>
                          </ul>
                        </li>
                        <li>Klik <strong>Deploy</strong>. Aplikasi Anda akan langsung aktif di Vercel dan terkoneksi 100% dengan Google Sheets!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  File ini juga tersimpan otomatis di repository sebagai <code>/public/Code.gs</code> & <code>.env.example</code>
                </span>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Data Tamu */}
        {guestToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setGuestToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden z-10"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 mx-auto border border-red-100 shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                Konfirmasi Hapus Data Tamu
              </h3>
              
              <p className="text-sm text-slate-600 text-center mb-5 leading-relaxed">
                Apakah Anda yakin ingin menghapus data kunjungan dari <strong className="text-slate-900">{guestToDelete.nama}</strong> ({guestToDelete.instansi || 'Umum'})?
                <br />
                <span className="text-xs text-red-500 font-medium mt-1.5 block">
                  Data akan dihapus dari daftar aplikasi dan Google Sheets.
                </span>
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setGuestToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    const target = guestToDelete;
                    try {
                      await onDeleteGuest(target.id, target.nama, { waktu: target.waktu, instansi: target.instansi });
                      if (selectedGuest && (selectedGuest.id === target.id || selectedGuest.nama === target.nama)) {
                        setSelectedGuest(null);
                      }
                      setDeleteToast(`Data kunjungan ${target.nama} berhasil dihapus.`);
                      setTimeout(() => setDeleteToast(null), 3500);
                    } catch (err) {
                      console.warn('Gagal memproses penghapusan:', err);
                    } finally {
                      setIsDeleting(false);
                      setGuestToDelete(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus Data</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Notifikasi Toast Sukses Hapus */}
        {deleteToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[130] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{deleteToast}</span>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
