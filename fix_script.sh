#!/bin/bash
cat << 'INNER_EOF' > /tmp/target_str.txt
  // Endpoint default: Mengambil data tamu dari sheet 'DataTamu'
  var sheetTamu = ss.getSheetByName("DataTamu");
  var data = sheetTamu ? sheetTamu.getDataRange().getDisplayValues() : [];
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi untuk menyiapkan sheet 'DataTamu', 'Admin', dan 'Pengaturan' otomatis
INNER_EOF

cat << 'INNER_EOF' > /tmp/replace_str.txt
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
INNER_EOF

python3 -c "import sys; content=open('src/data/googleAppsScript.ts').read(); target=open('/tmp/target_str.txt').read(); replace=open('/tmp/replace_str.txt').read(); open('src/data/googleAppsScript.ts', 'w').write(content.replace(target, replace))"
