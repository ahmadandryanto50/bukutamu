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
