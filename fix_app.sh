#!/bin/bash
cat << 'INNER_EOF' > /tmp/target_app.txt
      try {
        const res = await fetch('/api/get-url');
        const data = await res.json();
        
        const serverUrl = data?.url || '';
        const savedLocal = localStorage.getItem('smpn11palu_apps_script_url') || '';
INNER_EOF

cat << 'INNER_EOF' > /tmp/replace_app.txt
      try {
        let serverUrl = '';
        try {
          const res = await fetch('/api/get-url');
          if (res.ok) {
            const data = await res.json();
            serverUrl = data?.url || '';
          }
        } catch (e) {
          // Ignore network errors on Vercel for this endpoint
        }
        
        const savedLocal = localStorage.getItem('smpn11palu_apps_script_url') || '';
INNER_EOF

python3 -c "import sys; content=open('src/App.tsx').read(); target=open('/tmp/target_app.txt').read(); replace=open('/tmp/replace_app.txt').read(); open('src/App.tsx', 'w').write(content.replace(target, replace))"
