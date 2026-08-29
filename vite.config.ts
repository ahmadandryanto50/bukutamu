import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import fs from 'fs';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'save-apps-script-url-api',
        configureServer(server) {
          server.middlewares.use('/api/save-url', (req: any, res: any, next: any) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const url = data.url;
                  if (url && url.startsWith('https://script.google.com/') && url.includes('/exec')) {
                    const filePath = path.resolve(__dirname, 'src/data/googleAppsScript.ts');
                    if (fs.existsSync(filePath)) {
                      let content = fs.readFileSync(filePath, 'utf-8');
                      const markerStart = '// SCRIPT_URL_MARKER_START';
                      const markerEnd = '// SCRIPT_URL_MARKER_END';
                      const startIndex = content.indexOf(markerStart);
                      const endIndex = content.indexOf(markerEnd);
                      
                      if (startIndex !== -1 && endIndex !== -1) {
                        const before = content.substring(0, startIndex + markerStart.length);
                        const after = content.substring(endIndex);
                        const newContent = `${before}\nexport const DEFAULT_APPS_SCRIPT_URL = "${url.trim()}";\n${after}`;
                        fs.writeFileSync(filePath, newContent, 'utf-8');
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'URL permanently saved to code!' }));
                        return;
                      }
                    }
                  }
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Invalid URL format or markers not found.' }));
                } catch (error) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: (error as any).message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
