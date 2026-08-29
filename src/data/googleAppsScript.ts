export const GOOGLE_APPS_SCRIPT_CODE = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Pastikan seluruh sheet database ('DataTamu', 'Admin', 'Pengaturan') otomatis dibuat jika salah satu belum ada
  var sheetTamu = ss.getSheetByName("DataTamu");
  var sheetAdmin = ss.getSheetByName("Admin");
  var sheetPengaturan = ss.getSheetByName("Pengaturan");
  if (!sheetTamu || !sheetAdmin || !sheetPengaturan) {
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
  
  // Endpoint untuk menambahkan tamu (fallback via GET jika doPost gagal)
  if (action === "addGuest") {
    var resultMsg = submitData(e.parameter);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: resultMsg }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Endpoint default: Mengambil data tamu dari sheet 'DataTamu'
  var sheetTamu = ss.getSheetByName("DataTamu");
  var data = sheetTamu ? sheetTamu.getDataRange().getDisplayValues() : [];
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  var body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      body = e.parameter;
    }
  } else if (e && e.parameter) {
    body = e.parameter;
  }
  action = action || body.action || "";

  if (action === "saveSettings") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (!sheetPengaturan) { setupDatabase(); sheetPengaturan = ss.getSheetByName("Pengaturan"); }
    var dataRows = sheetPengaturan.getDataRange().getValues();
    var keys = [];
    for (var k = 0; k < dataRows.length; k++) { keys.push(String(dataRows[k][0]).trim()); }
    
    var keysToSave = ["nama_sekolah", "logo_url", "copyright"];
    for (var j = 0; j < keysToSave.length; j++) {
      var key = keysToSave[j];
      var val = body[key];
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

  if (action === "addGuest" || body.nama) {
    var resultMsg = submitData(body);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: resultMsg }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak dikenali di POST." }))
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
// SCRIPT_URL_MARKER_START
export const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec";
// SCRIPT_URL_MARKER_END

const OLD_DEPRECATED_URL = "https://script.google.com/macros/s/AKfycbx8Dx0DSE7RsQn7-FzpCXT1peNxZ1_09IawvuwGRjZKs65gCcg1P8-W_jspyVS8AxhCHA/exec";

let inMemoryAppsScriptUrl = DEFAULT_APPS_SCRIPT_URL;

export const getStoredAppsScriptUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Cek query parameter 'url' di address bar untuk auto-konfigurasi perangkat/browser baru
    const searchParams = new URLSearchParams(window.location.search);
    const urlParam = searchParams.get('url') || searchParams.get('script_url');
    if (urlParam && urlParam.startsWith('https://script.google.com/') && urlParam.includes('/exec')) {
      const decodedUrl = decodeURIComponent(urlParam.trim());
      localStorage.setItem('smpn11palu_apps_script_url', decodedUrl);
      inMemoryAppsScriptUrl = decodedUrl;
      return decodedUrl;
    }

    const saved = localStorage.getItem('smpn11palu_apps_script_url');
    if (saved) {
      if (saved.trim() === OLD_DEPRECATED_URL) {
        localStorage.removeItem('smpn11palu_apps_script_url');
      } else if (saved.trim() !== '' && saved.startsWith('https://script.google.com/')) {
        return saved.trim();
      }
    }
  }
  return DEFAULT_APPS_SCRIPT_URL;
};

export const setStoredAppsScriptUrl = (url: string): void => {
  const trimmed = url.trim();
  inMemoryAppsScriptUrl = trimmed;
  if (typeof window !== 'undefined') {
    if (trimmed === "") {
      localStorage.removeItem('smpn11palu_apps_script_url');
    } else {
      localStorage.setItem('smpn11palu_apps_script_url', trimmed);
    }
    window.dispatchEvent(new CustomEvent('apps_script_url_changed', { detail: trimmed }));
  }
};

export const fetchGuestsFromGoogleSheets = async (targetUrl?: string): Promise<any[] | null> => {
  try {
    const timestamp = Date.now();
    const proxyUrl = targetUrl 
      ? `/api/guests?targetUrl=${encodeURIComponent(targetUrl)}&_t=${timestamp}` 
      : `/api/guests?_t=${timestamp}`;
    
    let response = await fetch(proxyUrl, { cache: 'no-store' }).catch(() => null);
    
    // FALLBACK: Jika server proxy tidak ada (misal di Vercel/GitHub Pages), lakukan direct fetch CORS
    if (!response || !response.ok) {
      const finalUrl = targetUrl || getStoredAppsScriptUrl();
      if (!finalUrl || !finalUrl.startsWith('https://script.google.com/')) return null;
      
      const directUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}action=getGuests&_t=${timestamp}`;
      response = await fetch(directUrl, { cache: 'no-store' }).catch(() => null);
      if (!response || !response.ok) return null;
    }

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
          nohp: row[9] || '',
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
          nohp: row.nohp || row.noHp || '',
        });
      }
    });

    return parsedGuests;
  } catch (err) {
    console.warn('Google Sheets sync unavailable or offline:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

export const sendGuestToGoogleSheets = async (guest: any, targetUrl?: string): Promise<boolean> => {
  try {
    const finalUrl = targetUrl || getStoredAppsScriptUrl();
    if (!finalUrl || !finalUrl.startsWith('https://script.google.com/')) {
      console.warn('URL Google Apps Script tidak valid.');
      return false;
    }

    const payloadData: Record<string, string> = {
      action: 'addGuest',
      kategori: guest.kategori || 'Umum',
      nama: guest.nama || '',
      jk: guest.jk || '',
      instansi: guest.instansi || '',
      tujuan: guest.tujuan || '',
      keperluan: guest.keperluan || '',
      saran: guest.saran || '',
      nohp: guest.nohp || '',
      _t: String(Date.now()),
    };

    const params = new URLSearchParams(payloadData);
    const getUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${params.toString()}`;
    const jsonBody = JSON.stringify({ action: 'addGuest', ...guest });

    // 1. Jika backend proxy aktif (misal running server fullstack), kirim via proxy
    try {
      const proxyRes = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...guest, targetUrl: finalUrl }),
        keepalive: true,
      });
      if (proxyRes && proxyRes.ok) {
        return true;
      }
    } catch (e) {
      // Proxy tidak tersedia (misal di Vercel static build), lanjut ke direct fetch
    }

    // 2. Kirim langsung via fetch POST dengan mode no-cors & keepalive (Standar 100% kompatibel di HP Android/iOS)
    let postSuccess = false;
    try {
      await fetch(getUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: jsonBody,
        keepalive: true,
      });
      postSuccess = true;
    } catch (e) {
      console.warn('POST request error:', e);
    }

    // 3. Fallback jika POST gagal total pada browser tua: Image beacon ping sederhana
    if (!postSuccess) {
      try {
        const img = new Image();
        img.src = getUrl;
      } catch (e) {
        // Ignore
      }
    }

    return true;
  } catch (err) {
    console.warn('Gagal mengirim data ke Google Sheets:', err instanceof Error ? err.message : String(err));
    return false;
  }
};

export const fetchAdminsFromGoogleSheets = async (targetUrl?: string): Promise<any[] | null> => {
  try {
    const proxyUrl = targetUrl ? `/api/admins?targetUrl=${encodeURIComponent(targetUrl)}` : '/api/admins';
    let response = await fetch(proxyUrl).catch(() => null);
    
    // FALLBACK Direct fetch
    if (!response || !response.ok) {
      const finalUrl = targetUrl || getStoredAppsScriptUrl();
      if (!finalUrl || !finalUrl.startsWith('https://script.google.com/')) return null;
      
      const timestamp = Date.now();
      const directUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}action=getAdmins&_t=${timestamp}`;
      response = await fetch(directUrl).catch(() => null);
      if (!response || !response.ok) return null;
    }

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
  try {
    const proxyUrl = targetUrl ? `/api/settings?targetUrl=${encodeURIComponent(targetUrl)}` : '/api/settings';
    let response = await fetch(proxyUrl).catch(() => null);

    // FALLBACK Direct fetch
    if (!response || !response.ok) {
      const finalUrl = targetUrl || getStoredAppsScriptUrl();
      if (!finalUrl || !finalUrl.startsWith('https://script.google.com/')) return null;
      
      const timestamp = Date.now();
      const directUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}action=getSettings&_t=${timestamp}`;
      response = await fetch(directUrl).catch(() => null);
      if (!response || !response.ok) return null;
    }

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
  try {
    const proxyUrl = targetUrl ? `/api/settings?targetUrl=${encodeURIComponent(targetUrl)}` : '/api/settings';
    let response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    }).catch(() => null);

    // FALLBACK Bypass CORS
    if (!response || !response.ok) {
      const finalUrl = targetUrl || getStoredAppsScriptUrl();
      if (!finalUrl || !finalUrl.startsWith('https://script.google.com/')) return false;
      
      response = await fetch(finalUrl, {
        method: 'POST',
        // text/plain bypasses CORS Preflight
        body: JSON.stringify({ action: 'saveSettings', ...settings }),
      }).catch(() => null);
      if (!response || !response.ok) return false;
    }

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



