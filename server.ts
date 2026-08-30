import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { DEFAULT_APPS_SCRIPT_URL } from "./src/data/googleAppsScript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Ambil URL database Google Sheets yang tersimpan di server
  app.get("/api/get-url", (req, res) => {
    try {
      const activeUrl = getSavedAppsScriptUrl(req);
      res.json({ success: true, url: activeUrl });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // API Route: Simpan URL database Google Sheets secara permanen di server
  app.post("/api/save-url", (req, res) => {
    try {
      const { url } = req.body;
      const isClearing = url === "" || url === null || url === undefined;
      
      if (!isClearing && (!url.startsWith("https://script.google.com/") || !url.includes("/exec"))) {
        res.status(400).json({ success: false, error: "Format URL tidak valid." });
        return;
      }

      const trimmedUrl = isClearing ? "" : url.trim();

      // 1. Simpan ke src/data/config.json (Persistensi runtime server)
      const configPath = path.join(process.cwd(), "src/data/config.json");
      fs.writeFileSync(configPath, JSON.stringify({ appsScriptUrl: trimmedUrl }, null, 2), "utf-8");

      // 2. Tulis ulang secara permanen ke src/data/googleAppsScript.ts agar terbawa saat rilis/build produksi
      const scriptPath = path.join(process.cwd(), "src/data/googleAppsScript.ts");
      if (fs.existsSync(scriptPath)) {
        let content = fs.readFileSync(scriptPath, "utf-8");
        const markerStart = "// SCRIPT_URL_MARKER_START";
        const markerEnd = "// SCRIPT_URL_MARKER_END";
        const startIndex = content.indexOf(markerStart);
        const endIndex = content.indexOf(markerEnd);

        if (startIndex !== -1 && endIndex !== -1) {
          const before = content.substring(0, startIndex + markerStart.length);
          const after = content.substring(endIndex);
          const newContent = `${before}\nexport const DEFAULT_APPS_SCRIPT_URL = "${trimmedUrl}";\n${after}`;
          fs.writeFileSync(scriptPath, newContent, "utf-8");
        }
      }

      res.json({ success: true, message: isClearing ? "URL database berhasil dihapus. Aplikasi kembali ke mode offline." : "URL database berhasil disimpan secara permanen!" });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // Helper untuk membaca URL Google Sheets secara dinamis di server
  function getSavedAppsScriptUrl(req?: any): string {
    if (req && req.query && req.query.targetUrl) {
      return String(req.query.targetUrl).trim();
    }
    // 1. Cek environment variables terlebih dahulu
    if (process.env.VITE_APPS_SCRIPT_URL) {
      return process.env.VITE_APPS_SCRIPT_URL.trim();
    }
    if (process.env.APPS_SCRIPT_URL) {
      return process.env.APPS_SCRIPT_URL.trim();
    }
    // 2. Cek config.json di disk
    try {
      const configPath = path.join(process.cwd(), "src/data/config.json");
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (data && typeof data.appsScriptUrl === 'string') {
          return data.appsScriptUrl.trim();
        }
      }
    } catch (err) {
      console.error("Gagal membaca appsScriptUrl dari config.json:", err);
    }
    return DEFAULT_APPS_SCRIPT_URL;
  }

  // Proxy Route: Ambil daftar tamu dari Google Sheets server-side
  app.get("/api/guests", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const timestamp = Date.now();
      const fetchUrl = url.includes("?")
        ? `${url}&action=getGuests&_t=${timestamp}`
        : `${url}?action=getGuests&_t=${timestamp}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        res.status(response.status).json({ error: "Gagal menyinkronkan data dengan Google Sheets." });
        return;
      }

      const json = await response.json();
      res.json(json);
    } catch (error) {
      res.status(500).json({ error: (error as any).message });
    }
  });

  // Proxy Route: Kirim data tamu baru ke Google Sheets server-side (Tepat 1 kali kirim tanpa duplikasi)
  app.post("/api/guests", async (req, res) => {
    try {
      const url = req.body?.targetUrl || getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ success: false, error: "URL database belum dikonfigurasi." });
        return;
      }

      const guestData = {
        action: 'addGuest',
        kategori: req.body?.kategori || 'Umum',
        nama: req.body?.nama || '',
        jk: req.body?.jk || '',
        instansi: req.body?.instansi || '-',
        tujuan: req.body?.tujuan || '-',
        keperluan: req.body?.keperluan || '-',
        saran: req.body?.saran || '',
        nohp: req.body?.nohp || req.body?.noHp || '',
        _t: String(Date.now()),
      };

      const params = new URLSearchParams(guestData);
      const fullUrl = url.includes('?') ? `${url}&${params.toString()}` : `${url}?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Kirim tepat SATU kali request via GET (URL Encoded) yang aman melewati Google 302 Redirect
      const response = await fetch(fullUrl, { 
        method: "GET",
        signal: controller.signal 
      }).catch(() => null);
      clearTimeout(timeoutId);

      let jsonRes: any = null;
      if (response && response.ok) {
        jsonRes = await response.json().catch(() => null);
      }

      res.json({ success: true, result: jsonRes });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // Proxy Route: Hapus data tamu dari Google Sheets server-side
  app.post("/api/guests/delete", async (req, res) => {
    try {
      const url = req.body?.targetUrl || getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ success: false, error: "URL database belum dikonfigurasi." });
        return;
      }

      const deleteParams = new URLSearchParams({
        action: 'deleteGuest',
        id: req.body?.id || '',
        nama: req.body?.nama || '',
        _t: String(Date.now()),
      });

      const fullUrl = url.includes('?') ? `${url}&${deleteParams.toString()}` : `${url}?${deleteParams.toString()}`;

      let response = await fetch(fullUrl, { method: "GET" }).catch(() => null);
      let jsonRes: any = null;
      if (response && response.ok) {
        jsonRes = await response.json().catch(() => null);
      }
      res.json({ success: true, result: jsonRes });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // Proxy Route: Ambil pengaturan sekolah dari Google Sheets server-side (dengan fallback ke settings lokal server)
  app.get("/api/settings", async (req, res) => {
    const settingsPath = path.join(process.cwd(), "src/data/settings.json");
    let fallbackSettings = {
      nama_sekolah: "SMP Negeri 11 Palu",
      logo_url: "https://cdn.phototourl.com/free/2026-08-29-9f6b4b4c-d28f-41fc-922e-7f6792ef2ca0.jpg",
      copyright: "© 2026 Buku Tamu Digital SMP Negeri 11 Palu. All Rights Reserved."
    };

    if (fs.existsSync(settingsPath)) {
      try {
        fallbackSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      } catch (e) {}
    }

    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.json({ status: "success", settings: fallbackSettings });
        return;
      }

      const timestamp = Date.now();
      const fetchUrl = url.includes("?") 
        ? `${url}&action=getSettings&_t=${timestamp}` 
        : `${url}?action=getSettings&_t=${timestamp}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && json.status === "success" && json.settings) {
          // Cache pengaturan terbaru dari Google Sheets ke disk server
          try {
            fs.writeFileSync(settingsPath, JSON.stringify(json.settings, null, 2), "utf-8");
          } catch (e) {}
          res.json(json);
          return;
        }
      }

      res.json({ status: "success", settings: fallbackSettings });
    } catch (error) {
      res.json({ status: "success", settings: fallbackSettings });
    }
  });

  // Proxy Route: Simpan pengaturan sekolah ke Google Sheets server-side & persist ke server
  app.post("/api/settings", async (req, res) => {
    try {
      const settings = req.body || {};
      const settingsPath = path.join(process.cwd(), "src/data/settings.json");
      
      // Simpan langsung ke file server agar instan aktif di semua perangkat
      try {
        fs.writeFileSync(settingsPath, JSON.stringify({
          nama_sekolah: settings.nama_sekolah || "SMP Negeri 11 Palu",
          logo_url: settings.logo_url || "",
          copyright: settings.copyright || ""
        }, null, 2), "utf-8");
      } catch (e) {}

      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.json({ status: "success", message: "Pengaturan tersimpan di server." });
        return;
      }

      const params = new URLSearchParams({
        action: "saveSettings",
        nama_sekolah: settings.nama_sekolah || "",
        logo_url: settings.logo_url || "",
        copyright: settings.copyright || "",
      });

      const saveUrl = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(saveUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json().catch(() => null);
        res.json(json || { status: "success" });
        return;
      }

      res.json({ status: "success", message: "Pengaturan tersimpan." });
    } catch (error) {
      res.json({ status: "success", message: "Pengaturan tersimpan lokal server." });
    }
  });

  // Proxy Route: Ambil daftar admin dari Google Sheets server-side
  app.get("/api/admins", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const timestamp = Date.now();
      const fetchUrl = url.includes("?") 
        ? `${url}&action=getAdmins&_t=${timestamp}` 
        : `${url}?action=getAdmins&_t=${timestamp}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        res.status(response.status).json({ error: "Gagal menyinkronkan daftar admin." });
        return;
      }

      const json = await response.json();
      res.json(json);
    } catch (error) {
      res.status(500).json({ error: (error as any).message });
    }
  });

  // Integrasi Vite Middleware (untuk Development) & Penyajian File Statis (untuk Produksi)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Buku Tamu berjalan di http://localhost:${PORT}`);
  });
}

startServer();
