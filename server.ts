import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Ambil URL database Google Sheets yang tersimpan di server
  app.get("/api/get-url", (req, res) => {
    try {
      const configPath = path.join(process.cwd(), "src/data/config.json");
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (data && data.appsScriptUrl) {
          res.json({ success: true, url: data.appsScriptUrl.trim() });
          return;
        }
      }
      res.json({ success: true, url: "" });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // API Route: Simpan URL database Google Sheets secara permanen di server
  app.post("/api/save-url", (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.startsWith("https://script.google.com/") || !url.includes("/exec")) {
        res.status(400).json({ success: false, error: "Format URL tidak valid." });
        return;
      }

      const trimmedUrl = url.trim();

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

      res.json({ success: true, message: "URL database berhasil disimpan secara permanen!" });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as any).message });
    }
  });

  // Helper untuk membaca URL Google Sheets secara dinamis di server
  function getSavedAppsScriptUrl(req?: any): string {
    if (req && req.query && req.query.targetUrl) {
      return String(req.query.targetUrl).trim();
    }
    try {
      const configPath = path.join(process.cwd(), "src/data/config.json");
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (data && data.appsScriptUrl) {
          return data.appsScriptUrl.trim();
        }
      }
    } catch (err) {
      console.error("Gagal membaca appsScriptUrl dari config.json:", err);
    }
    return "https://script.google.com/macros/s/AKfycbxxwQC6njPECwewLJtWpagWmi2uFLgJExDXRHy1wvGtvnAAWVZvEqMWFrorTLMeD-ZESg/exec";
  }

  // Proxy Route: Ambil daftar tamu dari Google Sheets server-side
  app.get("/api/guests", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { signal: controller.signal });
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

  // Proxy Route: Kirim data tamu baru ke Google Sheets server-side
  app.post("/api/guests", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as any).message });
    }
  });

  // Proxy Route: Ambil pengaturan sekolah dari Google Sheets server-side
  app.get("/api/settings", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const timestamp = Date.now();
      const fetchUrl = url.includes("?") 
        ? `${url}&action=getSettings&_t=${timestamp}` 
        : `${url}?action=getSettings&_t=${timestamp}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        res.status(response.status).json({ error: "Gagal menyinkronkan pengaturan dengan Google Sheets." });
        return;
      }

      const json = await response.json();
      res.json(json);
    } catch (error) {
      res.status(500).json({ error: (error as any).message });
    }
  });

  // Proxy Route: Simpan pengaturan sekolah ke Google Sheets server-side
  app.post("/api/settings", async (req, res) => {
    try {
      const url = getSavedAppsScriptUrl(req);
      if (!url) {
        res.status(400).json({ error: "URL database belum dikonfigurasi." });
        return;
      }

      const settings = req.body;
      const params = new URLSearchParams({
        action: "saveSettings",
        nama_sekolah: settings.nama_sekolah || "",
        logo_url: settings.logo_url || "",
        copyright: settings.copyright || "",
      });

      const saveUrl = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(saveUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        res.status(response.status).json({ error: "Gagal menyimpan pengaturan ke Google Sheets." });
        return;
      }

      const json = await response.json();
      res.json(json);
    } catch (error) {
      res.status(500).json({ error: (error as any).message });
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
