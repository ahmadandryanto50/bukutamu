export interface AppSettings {
  nama_sekolah: string;
  logo_url: string;
  copyright: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  nama_sekolah: "SMP Negeri 11 Palu",
  logo_url: "https://cdn.phototourl.com/free/2026-08-29-9f6b4b4c-d28f-41fc-922e-7f6792ef2ca0.jpg",
  copyright: "© 2026 Buku Tamu Digital SMP Negeri 11 Palu. All Rights Reserved."
};

export const getStoredSettings = (): AppSettings => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smpn11palu_synced_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          nama_sekolah: parsed.nama_sekolah || DEFAULT_SETTINGS.nama_sekolah,
          logo_url: parsed.logo_url || DEFAULT_SETTINGS.logo_url,
          copyright: parsed.copyright || DEFAULT_SETTINGS.copyright
        };
      } catch (e) {
        // ignore
      }
    }
  }
  return DEFAULT_SETTINGS;
};

export const setStoredSettings = (settings: AppSettings): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smpn11palu_synced_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settings_changed', { detail: settings }));
  }
};
