// Service worker de Fibra: guarda la app para abrirla sin internet y siempre
// intenta traer la versión más nueva primero. No toca tus datos.
const CACHE = "fibra-shell-v3";
const SHELL = [
  "./", "./index.html", "./config.js", "./vendor/supabase.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
  "./fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "./fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "./fonts/bricolage-grotesque-latin-wght-normal.woff2"
];
// Con mala señal no se queda esperando: pasado este tiempo abre con lo guardado
// y la versión nueva queda lista para la próxima vez que abras la app.
const WAIT_MS = 3000, SLOW_MS = 30000;
let slowUntil = 0;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y demás: directo a la red
  const fresh = fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  let answered = false;
  e.waitUntil(fresh.catch(() => {}).then(() => { answered = true; })); // aunque se responda con lo guardado, la descarga termina y se guarda
  e.respondWith((async () => {
    const saved = (await caches.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await caches.match("./index.html") : undefined);
    if (!saved) return fresh;
    if (Date.now() < slowUntil) return saved; // la red ya se mostró lenta hace un momento: el resto de archivos no espera otra vez
    return Promise.race([fresh.then(res => res.ok ? res : saved, () => saved), new Promise(done => setTimeout(() => { if (!answered) slowUntil = Date.now() + SLOW_MS; done(saved); }, WAIT_MS))]);
  })());
});
