function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Pastikan seluruh sheet database ('DataTamu', 'Admin', 'Pengaturan') otomatis dibuat jika salah satu belum ada
  var sheetTamu = ss.getSheetByName("DataTamu");
  var sheetAdmin = ss.getSheetByName("Admin");
  var sheetPengaturan = ss.getSheetByName("Pengaturan");
  if (!sheetTamu || !sheetAdmin || !sheetPengaturan) {
    setupDatabase();
  }
  
  var action = e && e.parameter ? e.parameter.action : "";
  
  // Jika diakses langsung tanpa parameter 'action', dan file 'index' (HTML) ada, tampilkan halaman UI (index.html)
  if (!action && e && (!e.parameter || Object.keys(e.parameter).length === 0)) {
    try {
      return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Buku Tamu Digital SMPN 11 Palu')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } catch (err) {
      // Jika file index.html belum dibuat di Apps Script, kembalikan JSON data tamu sebagai fallback
    }
  }
  
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

  // Endpoint untuk menghapus tamu
  if (action === "deleteGuest") {
    var resultMsg = deleteData(e.parameter);
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

  // 1. Aksi Hapus Tamu (Prioritas utama di doPost)
  if (action === "deleteGuest") {
    var deleteMsg = deleteData(body);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: deleteMsg }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Aksi Simpan Pengaturan
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

  // 3. Aksi Tambah Tamu (Hanya jika bukan aksi delete/settings)
  if (action === "addGuest" || (body.nama && action !== "deleteGuest" && action !== "saveSettings" && action !== "getGuests")) {
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
  var namaInput = String(formObject.nama || "").trim();
  var instansiInput = String(formObject.instansi || "").trim();
  var tujuanInput = String(formObject.tujuan || "").trim();

  // Proteksi Duplikasi Data (Anti-Duplicate Guard):
  // Periksa apakah nama, instansi, dan tujuan yang sama persis sudah masuk dalam 5 baris terakhir
  if (lastRow > 1) {
    var checkRows = Math.min(5, lastRow - 1);
    var startRow = lastRow - checkRows + 1;
    var recentValues = sheet.getRange(startRow, 1, checkRows, 10).getValues();
    for (var r = 0; r < recentValues.length; r++) {
      var rNama = String(recentValues[r][3] || "").trim().toLowerCase();
      var rInstansi = String(recentValues[r][5] || "").trim().toLowerCase();
      var rTujuan = String(recentValues[r][6] || "").trim().toLowerCase();
      if (namaInput !== "" && 
          rNama === namaInput.toLowerCase() && 
          rInstansi === instansiInput.toLowerCase() && 
          rTujuan === tujuanInput.toLowerCase()) {
        return "Data sudah tercatat sebelumnya (Duplikasi dicegah).";
      }
    }
  }

  var no = lastRow; 
  var tgl = Utilities.formatDate(new Date(), "Asia/Makassar", "dd/MM/yyyy HH:mm:ss");

  sheet.appendRow([
    no,
    tgl,
    formObject.kategori || "Umum",
    namaInput,
    formObject.jk || "Laki-laki",
    instansiInput || "-",
    tujuanInput || "-",
    formObject.keperluan || "-",
    formObject.saran || "",
    formObject.nohp || ""
  ]);
  
  return "Data berhasil disimpan ke Google Sheets!";
}

// Fungsi untuk menghapus data berdasarkan ID, Nama, atau Waktu
function deleteData(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DataTamu");
  if (!sheet) return "Sheet DataTamu tidak ditemukan";

  var targetId = String(params.id || "").trim();
  var cleanId = targetId.replace("GT-", "").split("_")[0];
  var targetNama = String(params.nama || "").trim().toLowerCase();
  var targetWaktu = String(params.waktu || "").trim();
  var targetInstansi = String(params.instansi || "").trim().toLowerCase();
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    var rowNo = String(data[i][0] || "").trim();
    var rowId = "GT-" + rowNo;
    var rowWaktu = String(data[i][1] || "").trim();
    var rowNama = String(data[i][3] || "").trim().toLowerCase();
    var rowInstansi = String(data[i][5] || "").trim().toLowerCase();

    var isIdMatch = targetId !== "" && (rowId === targetId || rowNo === targetId || rowNo === cleanId);
    var isNameMatch = targetNama !== "" && rowNama === targetNama;
    var isWaktuMatch = targetWaktu !== "" && (rowWaktu === targetWaktu || rowWaktu.includes(targetWaktu.slice(0, 10)));
    var isInstansiMatch = targetInstansi !== "" && rowInstansi === targetInstansi;

    if (isIdMatch || (isNameMatch && (isWaktuMatch || isInstansiMatch || !targetWaktu))) {
      sheet.deleteRow(i + 1);
      return "Data tamu baris ke-" + (i + 1) + " terhapus!";
    }
  }
  return "Data tidak ditemukan untuk dihapus";
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
