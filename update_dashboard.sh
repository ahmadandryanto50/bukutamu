#!/bin/bash
cat << 'INNER_EOF' > /tmp/target_dash.txt
                      <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={scriptUrl}
                          onChange={(e) => setScriptUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/AKfycb.../exec (Kosongkan untuk offline)"
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan URL</span>
                        </button>
                      </form>

                      <p className="text-xs text-slate-500">
                        URL ini didapatkan dari Google Sheets → <strong>Ekstensi</strong> → <strong>Apps Script</strong> → <strong>Terapkan (Deploy) Sebagai Aplikasi Web</strong>.
                      </p>
                    </div>

                    <div className="border border-blue-100 bg-blue-50/70 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                      <p className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                        <span>🚀</span> Cara Kerja Koneksi Otomatis:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 font-medium">
                        <li>URL ini disimpan secara permanen di server aplikasi dan otomatis diterapkan ke seluruh HP serta komputer pengguna secara real-time.</li>
                        <li>Pengunjung (tamu) tidak perlu melakukan konfigurasi apa pun lagi; aplikasi langsung tersinkron ke Google Sheets secara otomatis.</li>
                        <li>Aman dan andal dengan teknologi Proxy Server yang bebas dari masalah pemblokiran CORS browser.</li>
                      </ul>
INNER_EOF

cat << 'INNER_EOF' > /tmp/replace_dash.txt
                      <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={scriptUrl}
                          onChange={(e) => setScriptUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/AKfycb.../exec (Kosongkan untuk offline)"
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan URL</span>
                        </button>
                      </form>
                      
                      {scriptUrl && scriptUrl.startsWith('https://script.google.com/') && (
                        <div className="mt-4 p-4 border border-emerald-100 bg-emerald-50 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-emerald-900">✨ Bagikan Akses ke HP/Perangkat Lain</h4>
                            <p className="text-xs text-emerald-700">Karena ini adalah pratinjau yang terisolasi, perangkat teman Anda mungkin tidak mendapatkan URL-nya. Salin dan kirim "Link Sakti" berikut ke HP/teman Anda agar otomatis login!</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const magicLink = window.location.origin + '?url=' + encodeURIComponent(scriptUrl);
                              navigator.clipboard.writeText(magicLink);
                              setIsUrlCopied(true);
                              setTimeout(() => setIsUrlCopied(false), 2000);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                            <span>{isUrlCopied ? 'Tersalin!' : 'Salin Link Sakti'}</span>
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        URL ini didapatkan dari Google Sheets → <strong>Ekstensi</strong> → <strong>Apps Script</strong> → <strong>Terapkan (Deploy) Sebagai Aplikasi Web</strong>.
                      </p>
                    </div>

                    <div className="border border-blue-100 bg-blue-50/70 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                      <p className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                        <span>🚀</span> Cara Kerja Sinkronisasi URL:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 font-medium">
                        <li>Di lingkungan AI Studio, server mungkin saja "tertidur" dan menghapus riwayat setelan karena bersifat tanpa-status (stateless).</li>
                        <li>Agar koneksi tidak pernah hilang, <strong>Gunakan Tombol Salin Link Sakti di atas</strong> jika Anda ingin menguji di HP atau perangkat teman Anda.</li>
                        <li>Jika ingin mempublikasikan aplikasi ini ke internet secara permanen, gunakan fitur <strong>Ekspor ke Vercel</strong> di bawah.</li>
                      </ul>
INNER_EOF
python3 -c "import sys; content=open('src/components/AdminDashboard.tsx').read(); target=open('/tmp/target_dash.txt').read(); replace=open('/tmp/replace_dash.txt').read(); open('src/components/AdminDashboard.tsx', 'w').write(content.replace(target, replace))"
