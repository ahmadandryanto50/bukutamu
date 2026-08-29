#!/bin/bash
cat << 'INNER_EOF' > /tmp/target_adm.txt
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
INNER_EOF

# Ensure everything is correctly escaped or handled if needed.
