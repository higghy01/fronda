/* Copia dell'app sul telefono: si apre anche senza rete.
   A ogni modifica dei file alzare VERSIONE, altrimenti il telefono resta sulla vecchia. */
const VERSIONE = "fronda-v2";
const FILE = ["./", "index.html", "stile.css?v=2", "config.js?v=2", "cure.js?v=2", "disegni.js?v=2", "app.js?v=2", "manifest.json", "icona-180.png", "icona-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSIONE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (u.origin === location.origin) {
    // prima la rete (così le novità arrivano subito), se manca la rete la copia
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSIONE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match("index.html"))));
  } else if (u.host.endsWith("fonts.googleapis.com") || u.host.endsWith("fonts.gstatic.com")) {
    // caratteri: prima la copia
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { const c = n.clone(); caches.open(VERSIONE).then(x => x.put(e.request, c)); return n; })));
  }
});
