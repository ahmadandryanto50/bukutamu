export const GOOGLE_APPS_SCRIPT_CODE = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Pastikan database dan sheet 'Admin' otomatis dibuat jika belum ada
  var sheetAdmin = ss.getSheetByName("Admin");
  if (!sheetAdmin) {
    setupDatabase();
  }
  
  var action = e && e.parameter ? e.parameter.action : "";
  
  // Endpoint untuk mengambil akun admin dari sheet 'Admin'
  if (action === "getAdmins") {
    var adminSheet = ss.getSheetByName("Admin");
    var adminData = adminSheet ? adminSheet.getDataRange().getValues() : [];
    var admins = [];
    for (var a = 1; a < adminData.length; a++) {
      if (adminData[a][0]) {
        admins.push({
          username: String(adminData[a][0]).trim(),
          password: String(adminData[a][1]).trim(),
          nama: String(adminData[a][2] || "Administrator"),
          keterangan: String(adminData[a][3] || "")
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", admins: admins }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Endpoint untuk mengambil pengaturan dari sheet 'Pengaturan'
  if (action === "getSettings") {
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (!sheetPengaturan) {
      setupDatabase();
      sheetPengaturan = ss.getSheetByName("Pengaturan");
    }
    var settingsData = sheetPengaturan.getDataRange().getValues();
    var settings = {};
    for (var s = 1; s < settingsData.length; s++) {
      if (settingsData[s][0]) {
        settings[String(settingsData[s][0]).trim()] = String(settingsData[s][1] || "").trim();
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", settings: settings }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Endpoint untuk menyimpan pengaturan dari URL parameter
  if (action === "saveSettings") {
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (!sheetPengaturan) {
      setupDatabase();
      sheetPengaturan = ss.getSheetByName("Pengaturan");
    }
    var dataRows = sheetPengaturan.getDataRange().getValues();
    var keys = [];
    for (var k = 0; k < dataRows.length; k++) {
      keys.push(String(dataRows[k][0]).trim());
    }
    
    var keysToSave = ["nama_sekolah", "logo_url", "copyright"];
    for (var j = 0; j < keysToSave.length; j++) {
      var key = keysToSave[j];
      var val = e.parameter[key];
      if (val !== undefined && val !== null) {
        var idx = keys.indexOf(key);
        if (idx !== -1) {
          sheetPengaturan.getRange(idx + 1, 2).setValue(val);
        } else {
          sheetPengaturan.appendRow([key, val, ""]);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Pengaturan berhasil disimpan!" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Endpoint default: Mengambil data tamu dari sheet 'DataTamu'
  var sheetTamu = ss.getSheetByName("DataTamu");
  var data = sheetTamu ? sheetTamu.getDataRange().getDisplayValues() : [];
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi untuk menyiapkan sheet 'DataTamu', 'Admin', dan 'Pengaturan' otomatis
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet 'DataTamu'
  var sheetTamu = ss.getSheetByName("DataTamu");
  if (!sheetTamu) {
    sheetTamu = ss.insertSheet("DataTamu");
    sheetTamu.appendRow(["No", "Tanggal & Waktu", "Kategori", "Nama", "Jenis Kelamin", "Instansi/Asal", "Tujuan", "Keperluan", "Saran", "No. HP/WA"]);
    var headerRange = sheetTamu.getRange("A1:J1");
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1E40AF");
    headerRange.setFontColor("white");
    sheetTamu.setFrozenRows(1);
  }
  
  // 2. Sheet 'Admin' untuk menyimpan Username & Password Login
  var sheetAdmin = ss.getSheetByName("Admin");
  if (!sheetAdmin) {
    sheetAdmin = ss.insertSheet("Admin");
    sheetAdmin.appendRow(["Username", "Password", "Nama Pengguna", "Keterangan"]);
    // Data bawaan awal (Bisa Anda ubah/tambah kapan saja langsung di Google Sheets)
    sheetAdmin.appendRow(["admin", "admin123", "Administrator Utama", "Dapat diubah kapan saja di sheet ini"]);
    sheetAdmin.appendRow(["smpn11palu", "smpn11palu", "Admin Sekolah", "Akun Cadangan"]);
    
    var headerAdmin = sheetAdmin.getRange("A1:D1");
    headerAdmin.setFontWeight("bold");
    headerAdmin.setBackground("#0D9488");
    headerAdmin.setFontColor("white");
    sheetAdmin.setFrozenRows(1);
  }

  // 3. Sheet 'Pengaturan' untuk menyimpan Konfigurasi Sekolah
  var sheetPengaturan = ss.getSheetByName("Pengaturan");
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet("Pengaturan");
    sheetPengaturan.appendRow(["Kunci", "Nilai", "Keterangan"]);
    sheetPengaturan.appendRow(["nama_sekolah", "SMP Negeri 11 Palu", "Nama sekolah yang ditampilkan di aplikasi"]);
    sheetPengaturan.appendRow(["logo_url", "https://i.ibb.co.com/gynMvF2/logo.png", "URL Logo sekolah"]);
    sheetPengaturan.appendRow(["copyright", "© 2026 Buku Tamu Digital SMP Negeri 11 Palu. All Rights Reserved.", "Teks copyright di kaki halaman"]);
    
    var headerPengaturan = sheetPengaturan.getRange("A1:C1");
    headerPengaturan.setFontWeight("bold");
    headerPengaturan.setBackground("#1E3A8A");
    headerPengaturan.setFontColor("white");
    sheetPengaturan.setFrozenRows(1);
  }
  
  return "Database, Sheet Admin, & Sheet Pengaturan siap digunakan!";
}

// Fungsi untuk menerima dan menyimpan data buku tamu
function submitData(formObject) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DataTamu");
  
  if (!sheet) { 
    setupDatabase(); 
    sheet = ss.getSheetByName("DataTamu"); 
  }

  var lastRow = sheet.getLastRow();
  var no = lastRow; 
  var tgl = Utilities.formatDate(new Date(), "Asia/Makassar", "dd/MM/yyyy HH:mm:ss");

  sheet.appendRow([
    no,
    tgl,
    formObject.kategori || "Umum",
    formObject.nama || "",
    formObject.jk || "Laki-laki",
    formObject.instansi || "-",
    formObject.tujuan || "-",
    formObject.keperluan || "-",
    formObject.saran || "",
    formObject.nohp || ""
  ]);
  
  return "Data berhasil disimpan ke Google Sheets!";
}

// Fungsi verifikasi login Admin langsung dari Sheet 'Admin'
function verifyAdmin(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetAdmin = ss.getSheetByName("Admin");
  if (!sheetAdmin) {
    setupDatabase();
    sheetAdmin = ss.getSheetByName("Admin");
  }
  
  var data = sheetAdmin.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var u = String(data[i][0]).trim().toLowerCase();
    var p = String(data[i][1]).trim();
    if (u === String(username).trim().toLowerCase() && p === String(password).trim()) {
      return true;
    }
  }
  return false;
}

// Fungsi mendapatkan URL Download Excel
function getDownloadUrl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = ss.getUrl();
  if (url) {
    return url.split('/edit')[0] + '/export?format=xlsx';
  }
  return "";
}
`;

// Default global Apps Script Web App URL fallback (agar saat dipublikasikan, semua laptop & HP langsung tersinkron tanpa perlu isi URL lagi)
let inMemoryAppsScriptUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || "";

export const DEFAULT_APPS_SCRIPT_URL = 
  (import.meta as any).env?.VITE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID/exec";

export const getStoredAppsScriptUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smpn11palu_apps_script_url');
    if (saved && saved.trim() !== '') return saved.trim();
  }
  return inMemoryAppsScriptUrl.trim();
};

export const setStoredAppsScriptUrl = (url: string): void => {
  const trimmed = url.trim();
  inMemoryAppsScriptUrl = trimmed;
  if (typeof window !== 'undefined') {
    localStorage.setItem('smpn11palu_apps_script_url', trimmed);
    window.dispatchEvent(new CustomEvent('apps_script_url_changed', { detail: trimmed }));
  }
};

export const fetchGuestsFromGoogleSheets = async (targetUrl?: string): Promise<any[] | null> => {
  const url = targetUrl || getStoredAppsScriptUrl();
  if (!url || !url.startsWith('https://script.google.com/') || !url.includes('/exec') || url.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const json = await response.json();
    
    let rawRows: any[] = [];
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      rawRows = json.data;
    } else if (Array.isArray(json)) {
      rawRows = json;
    } else {
      return null;
    }

    if (rawRows.length === 0) return [];

    // Transform 2D array or object list into GuestEntry[]
    const parsedGuests: any[] = [];
    rawRows.forEach((row: any, idx: number) => {
      if (Array.isArray(row)) {
        // Skip header row if present
        if (idx === 0 && (row[0] === 'No' || row[1] === 'Tanggal & Waktu')) {
          return;
        }
        if (!row[3]) return; // empty name
        parsedGuests.push({
          id: `GT-${row[0] || (100000 + idx)}`,
          waktu: row[1] || new Date().toLocaleString('id-ID'),
          kategori: row[2] === 'Khusus' ? 'Khusus' : 'Umum',
          nama: row[3] || 'Pengunjung',
          jk: row[4] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          instansi: row[5] || '-',
          tujuan: row[6] || '-',
          keperluan: row[7] || '-',
          saran: row[8] || '',
          noHp: row[9] || '',
        });
      } else if (typeof row === 'object' && row !== null) {
        parsedGuests.push({
          id: row.id || `GT-${100000 + idx}`,
          waktu: row.waktu || row.tanggal || new Date().toLocaleString('id-ID'),
          kategori: row.kategori === 'Khusus' ? 'Khusus' : 'Umum',
          nama: row.nama || 'Pengunjung',
          jk: row.jk === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          instansi: row.instansi || '-',
          tujuan: row.tujuan || '-',
          keperluan: row.keperluan || '-',
          saran: row.saran || '',
          noHp: row.nohp || row.noHp || '',
        });
      }
    });

    return parsedGuests;
  } catch (err) {
    // Soft log network/cors issues without throwing console error
    console.warn('Google Sheets sync unavailable or offline:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

export const sendGuestToGoogleSheets = async (guest: any, targetUrl?: string): Promise<boolean> => {
  const url = targetUrl || getStoredAppsScriptUrl();
  if (!url || !url.startsWith('https://script.google.com/') || !url.includes('/exec') || url.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
    return false;
  }

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guest),
    });
    return true;
  } catch (err) {
    console.warn('Gagal mengirim data ke Google Sheets:', err instanceof Error ? err.message : String(err));
    return false;
  }
};

export const fetchAdminsFromGoogleSheets = async (targetUrl?: string): Promise<any[] | null> => {
  const baseUrl = targetUrl || getStoredAppsScriptUrl();
  if (!baseUrl || !baseUrl.startsWith('https://script.google.com/') || !baseUrl.includes('/exec') || baseUrl.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
    return null;
  }

  try {
    const timestamp = Date.now();
    const fetchUrl = baseUrl.includes('?') 
      ? `${baseUrl}&action=getAdmins&_t=${timestamp}` 
      : `${baseUrl}?action=getAdmins&_t=${timestamp}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(fetchUrl, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const json = await response.json();
    if (json && json.status === 'success' && Array.isArray(json.admins)) {
      localStorage.setItem('smpn11palu_synced_admins', JSON.stringify(json.admins));
      return json.admins;
    }
    return null;
  } catch (err) {
    console.warn('Gagal mengambil daftar admin dari Google Sheets:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

export const fetchSettingsFromGoogleSheets = async (targetUrl?: string): Promise<Record<string, string> | null> => {
  const baseUrl = targetUrl || getStoredAppsScriptUrl();
  if (!baseUrl || !baseUrl.startsWith('https://script.google.com/') || !baseUrl.includes('/exec') || baseUrl.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
    return null;
  }

  try {
    const timestamp = Date.now();
    const fetchUrl = baseUrl.includes('?') 
      ? `${baseUrl}&action=getSettings&_t=${timestamp}` 
      : `${baseUrl}?action=getSettings&_t=${timestamp}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(fetchUrl, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const json = await response.json();
    if (json && json.status === 'success' && json.settings) {
      localStorage.setItem('smpn11palu_synced_settings', JSON.stringify(json.settings));
      window.dispatchEvent(new CustomEvent('settings_changed', { detail: json.settings }));
      return json.settings;
    }
    return null;
  } catch (err) {
    console.warn('Gagal mengambil pengaturan dari Google Sheets:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

export const saveSettingsToGoogleSheets = async (settings: Record<string, string>, targetUrl?: string): Promise<boolean> => {
  const baseUrl = targetUrl || getStoredAppsScriptUrl();
  if (!baseUrl || !baseUrl.startsWith('https://script.google.com/') || !baseUrl.includes('/exec') || baseUrl.includes('AKfycbx_SMPN11PALU_GOOGLE_APPS_SCRIPT_WEBAPP_ID')) {
    return false;
  }

  try {
    const params = new URLSearchParams({
      action: 'saveSettings',
      nama_sekolah: settings.nama_sekolah || '',
      logo_url: settings.logo_url || '',
      copyright: settings.copyright || ''
    });

    const saveUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(saveUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return false;
    const json = await response.json();
    if (json && json.status === 'success') {
      localStorage.setItem('smpn11palu_synced_settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('settings_changed', { detail: settings }));
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Gagal menyimpan pengaturan ke Google Sheets:', err instanceof Error ? err.message : String(err));
    return false;
  }
};



