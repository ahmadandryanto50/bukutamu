const url = "https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec?action=getGuests";
fetch(url).then(res => res.json()).then(console.log).catch(console.error);
