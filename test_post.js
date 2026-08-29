const url = "https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec";
fetch(url, {
  method: 'POST',
  body: JSON.stringify({ action: 'addGuest', nama: 'Test Vercel', kategori: 'Umum' })
}).then(res => res.text()).then(console.log).catch(console.error);
