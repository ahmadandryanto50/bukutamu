import React, { useState, useEffect } from 'react';
import { GuestEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, User, Building2, Target, FileText, MessageSquare, Phone, Users, Briefcase, QrCode, Clock, Award, Activity, Heart, Sparkles, Calendar, Database } from 'lucide-react';
import { sendGuestToGoogleSheets } from '../data/googleAppsScript';
import { getStoredSettings, AppSettings } from '../data/settings';

interface GuestFormProps {
  onAddGuest: (guest: GuestEntry) => void;
  guests?: GuestEntry[];
}

export const GuestForm: React.FC<GuestFormProps> = ({ onAddGuest, guests = [] }) => {
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [formData, setFormData] = useState({
    kategori: 'Umum' as 'Umum' | 'Khusus',
    nama: '',
    jk: '' as 'Laki-laki' | 'Perempuan' | '',
    instansi: '',
    tujuan: '',
    keperluan: '',
    saran: '',
    nohp: '',
  });

  useEffect(() => {
    const handleSettingsEvent = (e: any) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener('settings_changed', handleSettingsEvent);
    return () => {
      window.removeEventListener('settings_changed', handleSettingsEvent);
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedGuest, setSubmittedGuest] = useState<GuestEntry | null>(() => {
    try {
      const saved = localStorage.getItem('smpn11palu_submitted_guest');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const handleResetForm = () => {
    setSubmittedGuest(null);
    try {
      localStorage.removeItem('smpn11palu_submitted_guest');
    } catch (e) {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jk) {
      alert('Silakan pilih Jenis Kelamin.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    // YYYY-MM-DD HH:MM:SS format
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newEntry: GuestEntry = {
      ...formData,
      jk: formData.jk as 'Laki-laki' | 'Perempuan',
      id: `GT-${Math.floor(100000 + Math.random() * 900000)}`,
      waktu: formattedDate,
    };

    // Kirim data langsung ke Google Sheets secara pasti & instan (keberhasilan sinkronisasi jaringan HP)
    await sendGuestToGoogleSheets(newEntry);

    onAddGuest(newEntry);
    setSubmittedGuest(newEntry);
    try {
      localStorage.setItem('smpn11palu_submitted_guest', JSON.stringify(newEntry));
    } catch (e) {}
    setIsSubmitting(false);

    // Reset form data for next submission
    setFormData({
      kategori: 'Umum',
      nama: '',
      jk: '',
      instansi: '',
      tujuan: '',
      keperluan: '',
      saran: '',
      nohp: '',
    });
  };

  // Hitung statistik pengunjung hari ini secara dinamis
  const todayPrefix = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      iso: `${yyyy}-${mm}-${dd}`,
      slash: `${dd}/${mm}/${yyyy}`
    };
  })();

  const todayGuests = (guests || []).filter(
    (g) => g.waktu && (g.waktu.startsWith(todayPrefix.iso) || g.waktu.startsWith(todayPrefix.slash))
  );

  const totalToday = todayGuests.length;
  const totalUmumToday = todayGuests.filter((g) => g.kategori === 'Umum').length;
  const totalKhususToday = todayGuests.filter((g) => g.kategori === 'Khusus').length;

  const totalAllTime = (guests || []).length;
  const totalUmumAllTime = (guests || []).filter((g) => g.kategori === 'Umum').length;
  const totalKhususAllTime = (guests || []).filter((g) => g.kategori === 'Khusus').length;

  const rasioUmum = totalToday > 0 ? Math.round((totalUmumToday / totalToday) * 100) : 0;
  const rasioKhusus = totalToday > 0 ? Math.round((totalKhususToday / totalToday) * 100) : 0;

  // 5 Kunjungan Terakhir yang berhasil mengisi
  const recentVisits = (guests || []).slice(-5).reverse();

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Formulir / Tiket Sukses */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {submittedGuest ? (
          <motion.div
            key="ticket"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden relative"
          >
            {/* Top color bar */}
            <div className="h-3 w-full bg-emerald-500" />
            
            <div className="p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Registrasi Berhasil</h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">Data kunjungan Anda telah tersimpan di sistem.</p>
                  </div>
                </div>
                <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <QrCode className="w-16 h-16 text-slate-500 dark:text-slate-500" />
                </div>
              </div>

              <div className="mt-8 border-t border-dashed border-slate-300 dark:border-slate-700 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ID TIKET</p>
                  <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{submittedGuest.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">WAKTU TERCATAT</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{submittedGuest.waktu} WITA</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NAMA PENGUNJUNG</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{submittedGuest.nama}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TUJUAN</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{submittedGuest.tujuan}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Isi Buku Tamu Lagi</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-8 sm:p-10">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Formulir Kunjungan</h2>
                <p className="text-sm font-medium text-slate-600 mt-2">
                  Mohon lengkapi data di bawah ini dengan benar untuk keperluan administrasi sekolah.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Kategori Tamu */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    1. Kategori Kunjungan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, kategori: 'Umum' }))}
                      className={`p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${
                        formData.kategori === 'Umum'
                          ? 'border-blue-600 bg-blue-50/80'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.kategori === 'Umum' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${formData.kategori === 'Umum' ? 'text-blue-900' : 'text-slate-800'}`}>Tamu Umum</div>
                        <div className="text-xs font-medium text-slate-600 mt-1">Masyarakat, Orang Tua Siswa, Alumni</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, kategori: 'Khusus' }))}
                      className={`p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${
                        formData.kategori === 'Khusus'
                          ? 'border-blue-600 bg-blue-50/80'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.kategori === 'Khusus' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${formData.kategori === 'Khusus' ? 'text-blue-900' : 'text-slate-800'}`}>Tamu Khusus</div>
                        <div className="text-xs font-medium text-slate-600 mt-1">Dinas Pendidikan, Vendor, Undangan</div>
                      </div>
                    </button>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* 2. Detail Data */}
                <div className="space-y-6">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    2. Informasi Pribadi
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <User className="w-4 h-4 text-blue-600" />
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nama"
                        value={formData.nama}
                        onChange={handleChange}
                        placeholder="Nama lengkap beserta gelar"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Users className="w-4 h-4 text-blue-600" />
                        Jenis Kelamin <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, jk: 'Laki-laki' }))}
                          className={`flex-1 py-3 px-4 rounded-lg border text-sm font-semibold transition-all ${
                            formData.jk === 'Laki-laki'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Laki-laki
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, jk: 'Perempuan' }))}
                          className={`flex-1 py-3 px-4 rounded-lg border text-sm font-semibold transition-all ${
                            formData.jk === 'Perempuan'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Perempuan
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        Instansi / Asal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="instansi"
                        value={formData.instansi}
                        onChange={handleChange}
                        placeholder="Contoh: Dinas Pendidikan"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Phone className="w-4 h-4 text-blue-600" />
                        No. HP / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nohp"
                        value={formData.nohp}
                        onChange={handleChange}
                        placeholder="Contoh: 081234567890"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* 3. Keperluan */}
                <div className="space-y-6">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    3. Detail Kunjungan
                  </label>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Target className="w-4 h-4 text-blue-600" />
                        Tujuan (Bertemu Siapa) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="tujuan"
                        value={formData.tujuan}
                        onChange={handleChange}
                        placeholder="Nama atau Jabatan (Contoh: Kepala Sekolah)"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Keperluan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="keperluan"
                        rows={3}
                        value={formData.keperluan}
                        onChange={handleChange}
                        placeholder="Jelaskan maksud dan tujuan kunjungan secara detail..."
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none resize-y"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        Saran / Pesan <span className="text-slate-500 font-normal">(Opsional)</span>
                      </label>
                      <textarea
                        name="saran"
                        rows={2}
                        value={formData.saran}
                        onChange={handleChange}
                        placeholder={`Saran atau masukan untuk ${settings.nama_sekolah}...`}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none resize-y"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto min-w-[200px] py-3.5 px-8 rounded-xl font-bold text-white shadow-lg shadow-blue-600/25 bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Data Kunjungan</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Kolom Kanan: Live Monitor Statistik & Daftar Kehadiran Terbaru */}
    <div className="lg:col-span-5 xl:col-span-4 space-y-6">
      {/* Papan Monitor Kunjungan */}
      <div className="bg-[#0B213E] rounded-3xl p-6 border border-white/10 shadow-xl space-y-6 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full pointer-events-none" />
        
        {/* Live Indicator Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400">
              MONITOR REAL-TIME
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            Live Sync
          </span>
        </div>

        {/* Statistik Pengunjung Hari Ini & Keseluruhan */}
        <div className="space-y-5">
          {/* Hari Ini */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Statistik Hari Ini
            </h4>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-3xl font-black text-white tracking-tight">
                  {totalToday}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  Total Hari Ini
                </span>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs font-bold text-sky-300">
                  Umum: <span className="text-white ml-1">{totalUmumToday}</span>
                </div>
                <div className="text-xs font-bold text-amber-300">
                  Khusus: <span className="text-white ml-1">{totalKhususToday}</span>
                </div>
              </div>
            </div>

            {/* Dual Category Bar */}
            {totalToday > 0 ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500" 
                    style={{ width: `${rasioUmum}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" 
                    style={{ width: `${rasioKhusus}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span className="text-sky-300">Umum {rasioUmum}%</span>
                  <span className="text-amber-300">Khusus {rasioKhusus}%</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-800/20 rounded-xl border border-white/5 text-center text-xs text-slate-400 font-medium">
                Belum ada kunjungan hari ini.
              </div>
            )}
          </div>

          {/* Akumulasi Keseluruhan */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Akumulasi Keseluruhan
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <span className="text-xl font-black text-white block">
                  {totalAllTime}
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 block">
                  Total
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <span className="text-xl font-black text-sky-300 block">
                  {totalUmumAllTime}
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 block">
                  Umum
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <span className="text-xl font-black text-amber-300 block">
                  {totalKhususAllTime}
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 block">
                  Khusus
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Pengunjung Terbaru */}
        <div className="space-y-4 border-t border-white/5 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              Kehadiran Terbaru
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-950/80 text-sky-300 border border-sky-800/40 rounded-full">
              Selesai Mengisi
            </span>
          </div>

          <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1 custom-scrollbar">
            {recentVisits.length > 0 ? (
              recentVisits.map((visit, index) => {
                const initials = (visit.nama && typeof visit.nama === 'string')
                  ? (visit.nama.trim().split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'GT')
                  : 'GT';
                const timeOnly = (visit.waktu && typeof visit.waktu === 'string')
                  ? ((visit.waktu.includes(' ') ? visit.waktu.split(' ')[1] : visit.waktu)?.substring(0, 5) || '--:--')
                  : '--:--';
                
                // Highlight the newest addition
                const isNewest = index === 0;

                return (
                  <div 
                    key={`${visit.id || 'visit'}-${index}`} 
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                      isNewest 
                        ? 'bg-white/5 border-sky-500/40 shadow-md shadow-sky-500/5' 
                        : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Avatar initials with dynamic category border */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      visit.kategori === 'Khusus'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : 'bg-blue-500/10 text-sky-300 border border-blue-500/20'
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                          {visit.nama}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 shrink-0 bg-slate-950/40 px-1.5 py-0.5 rounded">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {timeOnly}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-300 font-semibold truncate mt-0.5">
                        {visit.instansi || 'Perorangan'}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          visit.kategori === 'Khusus' ? 'bg-amber-500/10 text-amber-300' : 'bg-blue-500/10 text-blue-300'
                        }`}>
                          {visit.kategori}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate font-medium">
                          Bertemu: {visit.tujuan}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <Heart className="w-8 h-8 text-slate-600 mx-auto stroke-1" />
                <p>Belum ada tamu tercatat.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Widget Footer */}
        <div className="text-[10px] text-slate-500 text-center border-t border-white/5 pt-3 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
          <span>Sistem Buku Tamu Digital {settings.nama_sekolah}</span>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};
