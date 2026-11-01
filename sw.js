/* Copia dell'app sul telefono: si apre anche senza rete.
   A ogni modifica dei file alzare VERSIONE, altrimenti il telefono resta sulla vecchia. */
const VERSIONE = "fronda-v11";
const FILE = ["./", "index.html", "stile.css?v=11", "config.js?v=11", "cure.js?v=11", "salute.js?v=11", "disegni.js?v=11", "app.js?v=11", "manifest.json", "icona-180.png", "icona-512.png", "logo.svg"];
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

/* Promemoria del mattino */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Rigo", {
    body: d.body || "Qualche pianta ha sete oggi", tag: d.tag || "fronda", icon: "icona-180.png", badge: "icona-180.png"
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    for (const c of l) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
