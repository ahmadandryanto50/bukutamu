const http = require('http');

http.get('http://localhost:3000/api/guests', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log("Raw rows count:", parsed.data.length);
    let rawRows = parsed.data;
    const parsedGuests = [];
    rawRows.forEach((row, idx) => {
      if (Array.isArray(row)) {
        if (idx === 0 && (row[0] === 'No' || row[1] === 'Tanggal & Waktu')) {
          return;
        }
        if (!row[3]) return;
        parsedGuests.push({
          id: `GT-${row[0] || (100000 + idx)}`,
          waktu: row[1] || new Date().toLocaleString('id-ID'),
          nama: row[3] || 'Pengunjung',
        });
      }
    });
    console.log("Parsed guests:", parsedGuests.length);
  });
});
