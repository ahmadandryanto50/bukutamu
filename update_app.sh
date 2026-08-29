#!/bin/bash
cat << 'INNER_EOF' > /tmp/target.txt
  useEffect(() => {
    // Muat URL database permanen dari server terlebih dahulu
    const initializeDatabaseUrl = async () => {
      try {
        const res = await fetch('/api/get-url');
        const data = await res.json();
        
        const serverUrl = data?.url || '';
        const savedLocal = localStorage.getItem('smpn11palu_apps_script_url') || '';
        
        // Define default fallback URL to recognize it
        const defaultFallbackUrl = 'https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec';
        
        let finalUrl = serverUrl;

        // If server returns empty or default, BUT client has a custom URL, prioritize client's custom URL
        if ((!serverUrl || serverUrl === defaultFallbackUrl) && savedLocal && savedLocal !== defaultFallbackUrl && savedLocal.startsWith('https://script.google.com/')) {
            finalUrl = savedLocal;
            // Push this valid local URL back to server to restore it
            fetch('/api/save-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: finalUrl })
            }).catch(() => {});
        } else if (serverUrl === '' && !savedLocal) {
            finalUrl = ''; // Clear explicitly
        }

        if (finalUrl) {
          setStoredAppsScriptUrl(finalUrl);
          syncGuestsWithGoogleSheets(finalUrl);
          fetchSettingsFromGoogleSheets(finalUrl);
        } else {
          setStoredAppsScriptUrl('');
          syncGuestsWithGoogleSheets('');
          fetchSettingsFromGoogleSheets('');
        }
      } catch (err) {
        console.warn('Gagal memuat URL database dari server:', err);
        syncGuestsWithGoogleSheets();
        fetchSettingsFromGoogleSheets();
      }
    };

    initializeDatabaseUrl();
INNER_EOF

cat << 'INNER_EOF' > /tmp/replace.txt
  useEffect(() => {
    // Muat URL database permanen dari server terlebih dahulu
    const initializeDatabaseUrl = async () => {
      // 1. Ekstrak query param (Link Sakti) jika ada, yang akan otomatis memperbarui localStorage
      const localOrMagicUrl = getStoredAppsScriptUrl();
      const defaultFallbackUrl = 'https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec';
      const isMagicLink = window.location.search.includes('url=') || window.location.search.includes('script_url=');

      // Jika pengunjung membuka via Link Sakti, PRIORITASKAN ini
      if (isMagicLink && localOrMagicUrl && localOrMagicUrl.startsWith('https://script.google.com/') && localOrMagicUrl !== defaultFallbackUrl) {
        setStoredAppsScriptUrl(localOrMagicUrl);
        syncGuestsWithGoogleSheets(localOrMagicUrl);
        fetchSettingsFromGoogleSheets(localOrMagicUrl);
        
        // Push ke server
        fetch('/api/save-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: localOrMagicUrl })
        }).catch(() => {});

        // Bersihkan URL bar agar rapi
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return;
      }

      try {
        const res = await fetch('/api/get-url');
        const data = await res.json();
        
        const serverUrl = data?.url || '';
        const savedLocal = localStorage.getItem('smpn11palu_apps_script_url') || '';
        
        let finalUrl = serverUrl;

        // If server returns empty or default, BUT client has a custom URL, prioritize client's custom URL
        if ((!serverUrl || serverUrl === defaultFallbackUrl) && savedLocal && savedLocal !== defaultFallbackUrl && savedLocal.startsWith('https://script.google.com/')) {
            finalUrl = savedLocal;
            // Push this valid local URL back to server to restore it
            fetch('/api/save-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: finalUrl })
            }).catch(() => {});
        } else if (serverUrl === '' && !savedLocal) {
            finalUrl = ''; // Clear explicitly
        }

        if (finalUrl) {
          setStoredAppsScriptUrl(finalUrl);
          syncGuestsWithGoogleSheets(finalUrl);
          fetchSettingsFromGoogleSheets(finalUrl);
        } else {
          setStoredAppsScriptUrl('');
          syncGuestsWithGoogleSheets('');
          fetchSettingsFromGoogleSheets('');
        }
      } catch (err) {
        console.warn('Gagal memuat URL database dari server:', err);
        syncGuestsWithGoogleSheets();
        fetchSettingsFromGoogleSheets();
      }
    };

    initializeDatabaseUrl();
INNER_EOF
python3 -c "import sys; content=open('src/App.tsx').read(); target=open('/tmp/target.txt').read(); replace=open('/tmp/replace.txt').read(); open('src/App.tsx', 'w').write(content.replace(target, replace))"
