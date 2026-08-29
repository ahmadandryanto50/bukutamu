function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Buku Tamu SMPN 11 Palu')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi untuk membuat/menyiapkan database otomatis
function setupDatabase() {
  var sheetName = "DataTamu";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Membuat Header
    sheet.appendRow(["No", "Tanggal & Waktu", "Kategori", "Nama", "Jenis Kelamin", "Instansi/Asal", "Tujuan", "Keperluan", "Saran", "No. HP/WA"]);
    
    // Formatting Header
    var headerRange = sheet.getRange("A1:J1");
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4CAF50");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }
  return "Database siap digunakan!";
}

// Fungsi untuk menerima dan menyimpan data dari HTML
function submitData(formObject) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DataTamu");
  
  // Jika sheet belum ada, buat otomatis
  if (!sheet) { 
    setupDatabase(); 
    sheet = ss.getSheetByName("DataTamu"); 
  }

  var lastRow = sheet.getLastRow();
  var no = lastRow; // Baris terakhir adalah nomor urut (karena baris 1 adalah header)
  
  // Format Tanggal Wita (Waktu Indonesia Tengah)
  var tgl = Utilities.formatDate(new Date(), "Asia/Makassar", "dd/MM/yyyy HH:mm:ss");

  sheet.appendRow([
    no,
    tgl,
    formObject.kategori,
    formObject.nama,
    formObject.jk,
    formObject.instansi,
    formObject.tujuan,
    formObject.keperluan,
    formObject.saran,
    formObject.nohp
  ]);
  
  return "Data berhasil disimpan. Terima kasih atas kunjungan Anda!";
}

// Fungsi verifikasi login Admin
function verifyAdmin(username, password) {
  // Ganti username dan password di bawah ini sesuai keinginan Anda
  if (username === "admin" && password === "smpn11palu") {
    return true;
  }
  return false;
}

// Fungsi mengambil data untuk ditampilkan di tabel admin
function getData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DataTamu");
  if (!sheet) return [];
  // Mengambil semua data sebagai teks untuk ditampilkan
  return sheet.getDataRange().getDisplayValues(); 
}

// Fungsi mendapatkan URL Download Excel
function getDownloadUrl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = ss.getUrl();
  // Mengubah URL Google Sheets menjadi link direct download format Excel (.xlsx)
  if (url) {
    return url.split('/edit')[0] + '/export?format=xlsx';
  }
  return "";
}
