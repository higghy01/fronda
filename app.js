/* Rigo (prima Fronda) — app delle piante di casa.
   Tutto resta sul telefono: piante e foto in IndexedDB, impostazioni in localStorage. */
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DAY = 864e5;
const now = () => Date.now();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nuovoId = () => now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- Archivio sul telefono ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open("fronda", 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore("piante", { keyPath: "id" });
        d.createObjectStore("foto", { keyPath: "id" }).createIndex("pianta", "pianta");
      };
      r.onsuccess = () => { this.db = r.result; ok(); };
      r.onerror = () => ko(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((ok, ko) => {
      const t = this.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => ok(req && req.result);
      t.onerror = () => ko(t.error);
      t.onabort = () => ko(t.error);
    });
  },
  all: s => DB.tx(s, "readonly", st => st.getAll()),
  get: (s, k) => DB.tx(s, "readonly", st => st.get(k)),
  put: (s, v) => DB.tx(s, "readwrite", st => st.put(v)),
  del: (s, k) => DB.tx(s, "readwrite", st => st.delete(k)),
  clear: s => DB.tx(s, "readwrite", st => st.clear()),
  fotoDi: pid => DB.tx("foto", "readonly", st => st.index("pianta").getAll(pid)),
  // pianta nuova e sua foto insieme: niente foto rimaste senza pianta se lo spazio finisce
  salvaNuova(p, foto) { return DB.insieme(false, [p], foto ? [foto] : []); },
  // svuota e riscrive piante e foto nella stessa operazione: o va tutto, o non cambia niente
  sostituisci(piante, foto) { return DB.insieme(true, piante, foto); },
  insieme(svuota, piante, foto) {
    return new Promise((ok, ko) => {
      const t = this.db.transaction(["piante", "foto"], "readwrite");
      const sp = t.objectStore("piante"), sf = t.objectStore("foto");
      try {
        if (svuota) { sp.clear(); sf.clear(); }
        piante.forEach(p => sp.put(p)); foto.forEach(f => sf.put(f));
      } catch (e) { t.abort(); ko(e); return; }
      t.oncomplete = () => ok();
      t.onerror = () => ko(t.error);
      t.onabort = () => ko(t.error);
    });
  }
};

/* Una pianta letta da un file di copia: tiene solo i campi giusti, del tipo giusto */
const giorni = (v, base) => { const n = Math.round(+v); return n >= 1 && n <= 90 ? n : base; };
function pulisciPianta(p) {
  if (!p || typeof p.id !== "string" || !/^[a-z0-9]{4,40}$/i.test(p.id)) return null;
  const sp = SPECIE[p.sp] ? p.sp : "altro", s = SPECIE[sp];
  return {
    id: p.id, nome: String(p.nome || s.n).slice(0, 40), sp, sci: String(p.sci || "").slice(0, 80),
    stanza: String(p.stanza || "").slice(0, 30), e: giorni(p.e, s.e), i: giorni(p.i, s.i), note: String(p.note || "").slice(0, 400),
    creata: +p.creata || now(), last: +p.last || now(),
    storia: Array.isArray(p.storia) ? p.storia.map(Number).filter(Boolean).slice(0, 60) : [],
    da: p.da && typeof p.da === "object" && !Array.isArray(p.da) ? Object.fromEntries(Object.entries(p.da).filter(([k, v]) => /^\d{1,15}$/.test(k) && typeof v === "string").slice(0, 60).map(([k, v]) => [k, pulisciNome(v)])) : {},
    thumb: typeof p.thumb === "string" && p.thumb.startsWith("data:image/") ? p.thumb : null,
    coverId: p.coverId ? String(p.coverId) : null
  };
}

const IMP_KEY = "fronda-impostazioni";
let imp = { stagioni: true, promemoria: false, ora: "09:00", io: "Erika", aiuto: "", chi: "io", benvenuto: false };
try { Object.assign(imp, JSON.parse(localStorage.getItem(IMP_KEY)) || {}); } catch (e) {}
const salvaImp = () => { try { localStorage.setItem(IMP_KEY, JSON.stringify(imp)); } catch (e) {} };
/* Chi cura le piante: lei (di solito Erika) e, se vuole, chi la aiuta. Ogni annaffiatura ricorda chi l'ha fatta. */
const pulisciNome = v => String(v || "").replace(/\s+/g, " ").trim().slice(0, 24);
const nomeIo = () => pulisciNome(imp.io);
const nomeAiuto = () => pulisciNome(imp.aiuto);
const chiAnnaffia = () => imp.chi === "aiuto" && nomeAiuto() ? nomeAiuto() : nomeIo();
const iniziale = n => (n || "?").trim().charAt(0).toUpperCase();

let piante = [];
let filtro = "";      // stanza scelta
let cerca = "";
let primaVolta = true;

const salva = p => { aggiornaPromemoria(); return DB.put("piante", p).catch(() => toast("Non riesco a salvare: lo spazio del telefono è pieno?")); };

/* ---------- Calcoli ---------- */
const inverno = () => { const m = new Date().getMonth(); return m >= 9 || m <= 2; }; // ottobre–marzo
const stagioneInv = () => imp.stagioni && inverno();
const specie = p => SPECIE[p.sp] || SPECIE.altro;
const ogni = p => stagioneInv() ? p.i : p.e;
const inizioGiorno = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const giorniDa = t => Math.round((inizioGiorno(now()) - inizioGiorno(t)) / DAY);
const mancano = p => ogni(p) - giorniDa(p.last);
const quando = n => n <= 0 ? "oggi" : n === 1 ? "domani" : `tra ${n} giorni`;
const fmt = t => new Date(t).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
const fmtLungo = t => { const g = giorniDa(t); return g === 0 ? "oggi" : g === 1 ? "ieri" : `${g} giorni fa`; };
const stanze = () => [...new Set(piante.map(p => (p.stanza || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));

/* ---------- Pezzi grafici ---------- */
const ICO = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>`,
  drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>`,
  air: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h8"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/></svg>`,
  cam: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>`
};
const ring = (frac, label, big) => {
  const r = big ? 25 : 15, c = 2 * Math.PI * r, s = big ? 60 : 38, f = Math.max(0, Math.min(1, frac));
  return `<svg class="ring${f <= 0 ? " vuoto" : ""}" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle class="bg" cx="${s/2}" cy="${s/2}" r="${r}"/><circle class="fg" cx="${s/2}" cy="${s/2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" style="--c:${c}" transform="rotate(-90 ${s/2} ${s/2})"/><text x="${s/2}" y="${s/2}">${label}</text></svg>`;
};
const semeDi = p => { let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) % 997; return h + 1; };
// ogni stanza ha il suo colore (sempre lo stesso), così l'elenco non è tutto verde
// tinte abbastanza scure da leggere bene il testo bianco sopra (contrasto 4:1 o più)
const TINTE = ["#C25E1C", "#2A7FD4", "#9A50B8", "#9A7209", "#C2456A", "#1F8A80", "#6A5FD8"];
// colori dati in ordine alfabetico delle stanze: due stanze vicine non hanno mai lo stesso colore
const tintaStanza = s => { const i = stanze().indexOf(String(s || "").trim()); return TINTE[(i < 0 ? 0 : i) % TINTE.length]; };
const pic = p => p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : art(specie(p).art, specie(p).c, semeDi(p), mancano(p) <= 0);

/* ---------- Le schede dell'app: Oggi, Piante, Impostazioni ----------
   Come un'app vera: la pagina sta ferma, scorre solo il contenuto della scheda aperta, sotto c'è la barra delle schede. */
const ICO_PIU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const ICO_GIU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;
function saluto() {
  const h = new Date().getHours();
  return h < 6 ? ["Buonanotte", "🌙"] : h < 13 ? ["Buongiorno", "☀️"] : h < 18 ? ["Buon pomeriggio", "🌤️"] : ["Buonasera", "🌙"];
}
const oggiData = () => new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const testa = (titolo, extra) => `<header class="top"><div><div class="date">${esc(oggiData())}</div><h1 class="titolo">${titolo}</h1></div>
  <div class="top-b">${extra || ""}<button class="round-btn piu" data-add aria-label="Aggiungi una pianta">${ICO_PIU}</button></div></header>`;
const vuoto = () => `<section class="empty">
      <div class="ill rimbalza">${art("monstera", SPECIE.monstera.c, 3)}</div>
      <h2>${nomeIo() && nomeAiuto() ? `${esc(nomeIo())} e ${esc(nomeAiuto())}, iniziamo dalla prima pianta` : nomeIo() ? `${esc(nomeIo())}, iniziamo dalla prima pianta` : "Iniziamo dalla prima pianta"}</h2>
      <p>Fai una foto, scegli il tipo e Rigo ti dice quando annaffiarla.</p>
      <button class="btn water" data-add style="max-width:280px">Aggiungi una pianta</button>
    </section>`;
/* "Chi annaffia?": se c'è anche chi la aiuta, due bollini in alto. Il prescelto firma le annaffiature. */
const TINTE_CHI = ["#2A7FD4", "#C2456A"];
const tintaChi = n => TINTE_CHI[n === nomeAiuto() && n !== nomeIo() ? 1 : 0];
const coppia = () => !nomeAiuto() ? "" : `<div class="coppia" role="radiogroup" aria-label="Chi annaffia?"><span class="coppia-t">Chi annaffia?</span>
  <div class="coppia-s${imp.chi === "aiuto" ? " due" : ""}"><i class="coppia-ind" aria-hidden="true"></i>
  ${[["io", nomeIo() || "Io"], ["aiuto", nomeAiuto()]].map(([k, n], i) => `<button role="radio" aria-checked="${(imp.chi === "aiuto") === (k === "aiuto")}" data-chi="${k}"><i class="chi-tag" style="--t:${TINTE_CHI[i]}">${esc(iniziale(n))}</i>${esc(n)}</button>`).join("")}</div></div>`;
function scegliChi(k) {
  if (imp.chi === k) return;
  imp.chi = k; salvaImp(); tocco();
  $$(".coppia-s").forEach(s => { s.classList.toggle("due", k === "aiuto"); s.querySelectorAll("[data-chi]").forEach(b => b.setAttribute("aria-checked", b.dataset.chi === k)); });
  const b = $(`.coppia-s [data-chi="${k}"] .chi-tag`);
  if (b && b.animate && !pocoMoto()) b.animate([{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-8deg)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" });
}
let sete = -1, daFesteggiare = false;   // la festa parte solo se si arriva a zero annaffiando (non eliminando, modificando o ripristinando)

function render() {
  const vo = $("#v-oggi"), vp = $("#v-piante");
  [vo, vp].forEach(v => v.classList.toggle("still", !primaVolta));
  primaVolta = false;
  const [ciao, em] = saluto();
  const ciaoNome = `${ciao}${nomeIo() ? `,<br><span class="nome-ciao">${esc(nomeIo())}</span>` : ""} <span class="em">${em}</span>`;

  if (!piante.length) {
    vo.innerHTML = testa(ciaoNome) + coppia() + consiglioHome() + vuoto();
    vp.innerHTML = testa("Le tue piante") + vuoto();
    document.body.classList.add("vuota");
    contatore(0); sete = 0;
    return;
  }

  document.body.classList.remove("vuota");
  const ordinate = [...piante].sort((a, b) => mancano(a) - mancano(b) || a.nome.localeCompare(b.nome, "it"));
  const oggi = ordinate.filter(p => mancano(p) <= 0);
  try { if (imp.promemoria && navigator.setAppBadge) oggi.length ? navigator.setAppBadge(oggi.length) : navigator.clearAppBadge(); } catch (e) {}
  const prossime = ordinate.filter(p => mancano(p) >= 1).slice(0, 5);
  const domani = ordinate.filter(p => mancano(p) === 1);
  const tot = piante.length;
  const elencoStanze = stanze();
  if (filtro && !elencoStanze.includes(filtro)) filtro = "";

  vo.innerHTML = `${testa(ciaoNome)}${coppia()}${consiglioHome()}
  <section class="today" data-k="today">
    ${ring(1 - oggi.length / tot, `${tot - oggi.length}/${tot}`, true).replace('class="ring', 'class="ring gauge')}
    <div><b>${oggi.length ? `${oggi.length === 1 ? "Una pianta ha" : oggi.length + " piante hanno"} sete oggi` : "Tutte a posto oggi"}</b>
    <span>${oggi.length ? "Sono qui sotto, in ordine" : domani.length ? `Domani: ${esc(domani.slice(0, 3).map(p => p.nome).join(", "))}${domani.length > 3 ? ` e altre ${domani.length - 3}` : ""}` : "Nessuna annaffiatura domani"}${stagioneInv() ? " · ritmo invernale" : ""}</span></div>
    <svg class="waves" viewBox="0 0 400 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 T250 6 T300 6 T350 6 T400 6 V10 H0z" fill="var(--water-soft)"/></svg>
  </section>

  ${oggi.length ? `<div class="section-h" data-k="h-oggi"><h2>Da annaffiare</h2><small>${oggi.length}</small></div>
  <div class="thirsty" id="thirsty">
    ${oggi.map((p, i) => `<div class="trow" style="--i:${i}" data-id="${esc(p.id)}" data-k="t-${esc(p.id)}">
      <button class="mini" data-open="${esc(p.id)}" aria-label="Apri ${esc(p.nome)}">${pic(p)}</button>
      <button class="t" data-open="${esc(p.id)}" style="text-align:left"><b>${esc(p.nome)}</b><small>${mancano(p) < 0 ? `in ritardo di ${-mancano(p)} ${mancano(p) === -1 ? "giorno" : "giorni"}` : "oggi"}${p.stanza ? " · " + esc(p.stanza) : ""}</small></button>
      <button class="wbtn" data-water="${esc(p.id)}">${ICO.drop}Fatto</button>
    </div>`).join("")}
    ${oggi.length > 1 ? `<button class="allbtn" id="water-all">Le ho annaffiate tutte</button>` : ""}
  </div>` : `<section class="felici" data-k="felici">
    <div class="felici-ill">${art(piante[0] ? specie(ordinate[0]).art : "monstera", piante[0] ? specie(ordinate[0]).c : SPECIE.monstera.c, 5)}</div>
    <div><b>Tutte felici</b><span>Oggi non c'è niente da annaffiare. Goditi il verde.</span></div>
  </section>`}

  ${prossime.length ? `<div class="section-h" data-k="h-pross"><h2>Nei prossimi giorni</h2></div>
  <div class="lista">${prossime.map((p, i) => { const m = mancano(p);
    return `<button class="riga" data-open="${esc(p.id)}" data-k="r-${esc(p.id)}" style="--i:${i}">
      <span class="mini">${pic(p)}</span><span class="t"><b>${esc(p.nome)}</b><small>${esc(p.stanza || specie(p).n)}</small></span>
      <span class="quando ${m === 1 ? "presto" : ""}">${m === 1 ? "domani" : `tra ${m} giorni`}</span>${ICO_GIU}</button>`; }).join("")}</div>` : ""}`;

  vp.innerHTML = `${testa("Le tue piante")}
  <div class="section-h" data-k="h-casa" style="margin-top:14px"><h2>In casa</h2><small>${tot} ${tot === 1 ? "pianta" : "piante"}</small></div>
  ${tot > 6 || elencoStanze.length > 1 ? `<div class="tools" data-k="tools" style="margin-top:0;margin-bottom:12px">
    ${tot > 6 ? `<div class="search">${ICO.search}<input id="cerca" type="search" placeholder="Cerca per nome, tipo o stanza" value="${esc(cerca)}" autocomplete="off" enterkeyhint="search"></div>` : ""}
    ${elencoStanze.length > 1 ? `<div class="rooms">${["", ...elencoStanze].map(s => `<button class="chip-f" data-room="${esc(s)}" aria-pressed="${s === filtro}"${s ? ` style="--t:${tintaStanza(s)}"` : ""}>${s ? `<i class="dot"></i>${esc(s)}` : "Tutte"}</button>`).join("")}</div>` : ""}
  </div>` : ""}
  <div class="grid" id="grid">${griglia(ordinate)}</div>`;

  // scrivendo nella ricerca cambia solo l'elenco: il campo resta lo stesso (suggerimenti e correzione di iOS non si interrompono)
  const inp = $("#cerca");
  if (inp) inp.oninput = e => { cerca = e.target.value; $("#grid").innerHTML = griglia(ordinate); osserva(); };
  osserva();
  $$("[data-room]").forEach(b => b.onclick = () => { filtro = b.dataset.room; tocco(); morbido(render); });
  const all = $("#water-all");
  if (all) all.onclick = () => annaffiaTutte(oggi);
  contatore(oggi.length);
  if (daFesteggiare && sete > 0 && oggi.length === 0) festa();
  daFesteggiare = false;
  sete = oggi.length;
}

/* Il numerino rosso sulla scheda Oggi: rimbalza quando cambia */
function contatore(n) {
  const el = $("#tab-n"); if (!el) return;
  const prima = el.textContent;
  el.textContent = n ? String(n) : "";
  el.classList.toggle("on", n > 0);
  if (n && prima !== String(n) && el.animate && !pocoMoto()) el.animate([{ transform: "scale(.4)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });
}

/* Festa: quando l'ultima pianta assetata è stata annaffiata cadono foglioline e gocce */
function festa() {
  if (pocoMoto()) return;
  const box = document.createElement("div"); box.className = "festa"; box.setAttribute("aria-hidden", "true");
  const pezzi = ["🍃", "💧", "🌿", "💚", "🍃", "💧"];
  for (let k = 0; k < 22; k++) {
    const e = document.createElement("span");
    e.textContent = pezzi[k % pezzi.length];
    e.style.cssText = `left:${Math.random() * 100}%;font-size:${16 + Math.random() * 14}px;animation-delay:${Math.random() * .5}s;animation-duration:${1.6 + Math.random() * 1.2}s;--r:${(Math.random() * 2 - 1) * 260}deg;--x:${(Math.random() * 2 - 1) * 60}px`;
    box.appendChild(e);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3400);
}

/* Cambio scheda in dissolvenza */
const SCHEDE = ["oggi", "piante", "imp"];
let tabAttiva = "oggi";
function vai(tab) {
  if (tab === tabAttiva) { const v = $("#v-" + tab); v.scrollTo({ top: 0, behavior: pocoMoto() ? "auto" : "smooth" }); return; }
  const da = $("#v-" + tabAttiva), a = $("#v-" + tab);
  tabAttiva = tab;
  if (tab === "imp") impostazioni();
  $$(".tab").forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  $("#tabbar").style.setProperty("--k", SCHEDE.indexOf(tab));
  da.classList.remove("on"); a.classList.add("on");
  barraTitolo();
  if (!pocoMoto() && a.animate) {
    // solo dissolvenza (con una scala leggerissima): le scivolate di lato a Sasha danno fastidio
    a.animate([{ opacity: 0, transform: "scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: MOLLA });
    da.animate([{ opacity: 1, visibility: "visible" }, { opacity: 0, visibility: "visible" }], { duration: 180, easing: "ease-out" });
  }
  const ic = $(`.tab[data-tab="${tab}"] svg`);
  if (ic && ic.animate && !pocoMoto()) ic.animate([{ transform: "scale(1)" }, { transform: "scale(.78) translateY(2px)" }, { transform: "scale(1.15) translateY(-3px)" }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out" });
  tocco();
}
/* Barra piccola in vetro: compare quando il titolo grande della scheda è scorso via */
function barraTitolo() {
  const v = $("#v-" + tabAttiva), h = v.querySelector(".titolo");
  $("#nav-t").textContent = h ? h.textContent.replace(/[^\p{L}\s']/gu, "").trim() : "";
  $("#navbar").classList.toggle("on", v.scrollTop > 56);
}

/* Le piante disegnate ondeggiano solo quando si vedono: con 50 piante il telefono resta fluido */
const vista = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("vis", e.isIntersecting)), { rootMargin: "60px" }) : null;
function osserva() { if (vista) vista.disconnect(); $$("#grid .card").forEach(c => vista ? vista.observe(c) : c.classList.add("vis")); }

/* Finché non è sulla Home, Safari può cancellare i dati dopo 7 giorni senza visite: lo diciamo anche qui */
const installata = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function consiglioChiuso() { try { return localStorage.getItem("rigo-consiglio-home") === "1"; } catch (e) { return false; } }
function consiglioHome() {
  if (installata() || consiglioChiuso()) return "";
  return `<div class="tip home-tip" data-k="tip"><button class="tip-x" id="tip-x" aria-label="Chiudi il consiglio">${ICO.x}</button><b>Mettila sulla Home</b>In Safari tocca Condividi, poi "Aggiungi alla schermata Home": si apre a tutto schermo e le piante restano salvate al sicuro.</div>`;
}
$("#app").addEventListener("click", e => {
  if (!e.target.closest("#tip-x")) return;
  try { localStorage.setItem("rigo-consiglio-home", "1"); } catch (er) {}
  morbido(render);
});

function griglia(ordinate) {
  const q = cerca.trim().toLowerCase();
  const visibili = ordinate.filter(p => (!filtro || (p.stanza || "").trim() === filtro) &&
    (!q || p.nome.toLowerCase().includes(q) || specie(p).n.toLowerCase().includes(q) || (p.stanza || "").toLowerCase().includes(q)));
  return visibili.map((p, i) => { const m = mancano(p);
    return `<button class="card" style="--i:${Math.min(i, 12)}" data-open="${esc(p.id)}" data-k="c-${esc(p.id)}">
      <div class="pic" style="--tint:${specie(p).c[1]}">${pic(p)}${m <= 1 ? `<span class="badge ${m <= 0 ? "due" : "soon"}">${m <= 0 ? "Ha sete" : "Domani"}</span>` : ""}</div>
      <div class="meta"><div class="txt"><div class="name">${esc(p.nome)}</div><div class="kind">${p.stanza ? `<i class="dot" style="--t:${tintaStanza(p.stanza)}"></i>` : ""}${esc(p.stanza || specie(p).n)}</div></div>${ring(Math.max(0, m) / ogni(p), m <= 0 ? "0g" : m + "g")}</div>
    </button>`; }).join("") || `<div class="nores">Nessuna pianta trovata</div>`;
}

$("#app").addEventListener("click", e => {
  const c = e.target.closest("[data-chi]");
  if (c) { scegliChi(c.dataset.chi); return; }
  const w = e.target.closest("[data-water]");
  if (w) { const p = piante.find(x => x.id === w.dataset.water); const row = w.closest(".trow"); if (!p || row.classList.contains("gone")) return; tocco(); row.classList.add("gone"); setTimeout(() => annaffia(p), 280); return; }
  const o = e.target.closest("[data-open]");
  if (o) scheda(o.dataset.open);
});

/* ---------- Movimenti morbidi ----------
   Prima di ridisegnare si segna dove sta ogni pezzo; dopo, ogni pezzo scivola dal posto vecchio al nuovo
   (come sull'iPhone quando una lista cambia), quelli nuovi compaiono piano. */
const MOLLA = "cubic-bezier(.32,.72,0,1)";
const pocoMoto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function morbido(fn) {
  if (pocoMoto() || !Element.prototype.animate) return fn();
  const prima = new Map();
  $$(".vista.on [data-k]").forEach(el => prima.set(el.dataset.k, el.getBoundingClientRect()));
  fn();
  $$(".vista.on [data-k]").forEach(el => {
    const r0 = prima.get(el.dataset.k), r1 = el.getBoundingClientRect();
    if (!r0) { el.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: MOLLA, delay: 80, fill: "backwards" }); return; }
    const dx = r0.left - r1.left, dy = r0.top - r1.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 520, easing: MOLLA });
  });
}

/* Un piccolo "tic" sotto le dita: vibrazione dove c'è, e su iPhone (iOS 18) il trucco dell'interruttore */
const tocco = (() => {
  let lab;
  return () => {
    try {
      if (navigator.vibrate) { navigator.vibrate(10); return; }
      if (!lab) {
        lab = document.createElement("label"); lab.setAttribute("aria-hidden", "true"); lab.style.display = "none";
        const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1;
        lab.appendChild(i); document.body.appendChild(lab);
      }
      lab.click();
    } catch (e) {}
  };
})();

/* ---------- Annaffiare ---------- */
function annaffia(p, dalla) {
  const prima = { last: p.last, storia: [...p.storia], da: { ...(p.da || {}) } };
  segnaAcqua(p);
  salva(p);
  daFesteggiare = true;
  morbido(render);
  const chi = chiAnnaffia();
  toast(chi ? `${p.nome} ringrazia ${chi}` : `${p.nome} ringrazia`, () => { Object.assign(p, prima); salva(p); morbido(render); if (schedaAperta === p.id) scheda(p.id, true); });
}
// segna l'acqua di adesso e chi l'ha data (si tiene il nome solo per le annaffiature ancora nello storico)
function segnaAcqua(p) {
  p.last = now();
  p.storia = [p.last, ...p.storia].slice(0, 60);
  const da = Object.assign({}, p.da), chi = chiAnnaffia();
  if (chi) da[p.last] = chi;
  p.da = Object.fromEntries(Object.entries(da).filter(([k]) => p.storia.includes(+k)));
}
function annaffiaTutte(lista) {
  const prima = lista.map(p => ({ p, last: p.last, storia: [...p.storia], da: { ...(p.da || {}) } }));
  tocco();
  $$(".trow").forEach((r, i) => setTimeout(() => r.classList.add("gone"), i * 50));
  setTimeout(() => {
    lista.forEach(p => { segnaAcqua(p); salva(p); });
    daFesteggiare = true;
    morbido(render);
    toast(`${lista.length} piante annaffiate`, () => { prima.forEach(x => { x.p.last = x.last; x.p.storia = x.storia; x.p.da = x.da; salva(x.p); }); morbido(render); });
  }, 280 + lista.length * 50);
}

/* ---------- Foglio dal basso ---------- */
let foglioAperto = false, viewerAperto = false, schedaAperta = null;
function apri(html, label) {
  const sh = $("#sheet");
  $("#toast").classList.remove("on"); clearTimeout(tt);
  sh.innerHTML = `<div class="grab"></div>` + html;
  sh.setAttribute("aria-label", label || "");
  sh.scrollTop = 0;
  if (!foglioAperto) { history.pushState({ foglio: 1 }, ""); foglioAperto = true; }
  $("#scrim").classList.add("on");
  sfondo(true);
  requestAnimationFrame(() => sh.classList.add("on"));
}
/* Con un foglio aperto la pagina dietro si rimpicciolisce un po', come le schede dell'iPhone */
function sfondo(on) {
  const a = $("#app"), r = document.documentElement;
  r.classList.toggle("aperto", on);
}
function chiudiFoglio() { if (foglioAperto) history.back(); }
function _chiudiFoglio() {
  foglioAperto = false; schedaAperta = null; liberaFoto();
  $("#sheet").classList.remove("on");
  $("#scrim").classList.remove("on");
  sfondo(false);
}
window.addEventListener("popstate", () => {
  if (viewerAperto) { viewerAperto = false; $("#viewer").classList.remove("on"); return; }
  if (foglioAperto) _chiudiFoglio();
});
$("#scrim").onclick = chiudiFoglio;
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (viewerAperto || foglioAperto) history.back(); } });

/* Trascinare giù per chiudere */
(() => {
  const sh = $("#sheet"), root = document.documentElement; let y0 = null, dy = 0, t0 = 0, vel = 0, yPrima = 0;
  sh.addEventListener("touchstart", e => { if (sh.scrollTop <= 0 && !e.target.closest("input,textarea,select,.sp-list")) { y0 = yPrima = e.touches[0].clientY; dy = 0; vel = 0; t0 = e.timeStamp; } else y0 = null; }, { passive: true });
  sh.addEventListener("touchmove", e => {
    if (y0 === null) return;
    const y = e.touches[0].clientY;
    dy = y - y0;
    const dt = Math.max(1, e.timeStamp - t0); vel = (y - yPrima) / dt; yPrima = y; t0 = e.timeStamp;
    if (dy > 0) {
      e.preventDefault(); sh.classList.add("drag"); root.classList.add("trascina");
      sh.style.transform = `translateY(${dy}px)`;
      root.style.setProperty("--p", Math.max(0, 1 - dy / Math.max(300, sh.offsetHeight)).toFixed(3));
    }
  }, { passive: false });
  sh.addEventListener("touchend", () => {
    if (y0 === null) return;
    sh.classList.remove("drag"); root.classList.remove("trascina"); sh.style.transform = ""; root.style.removeProperty("--p");
    if (dy > 110 || (dy > 30 && vel > .6)) chiudiFoglio();
    y0 = null;
  });
})();

/* ---------- Benvenuto (la prima volta) ----------
   Rigo è soprattutto per Erika: la saluta per nome e chiede chi la aiuta con le piante. */
function benvenuto() {
  if (foglioAperto) return;
  imp.benvenuto = true; salvaImp();
  const nome = nomeIo();
  apri(`
    <div class="benv">
      <div class="benv-ill" aria-hidden="true">
        <span class="benv-p p1">${art("monstera", SPECIE.monstera.c, 3)}</span>
        <span class="benv-p p2">${art(SPECIE.pothos.art, SPECIE.pothos.c, 7)}</span>
        <span class="benv-p p3">${art(SPECIE.sansevieria.art, SPECIE.sansevieria.c, 5)}</span>
        <i class="benv-c c1">💚</i><i class="benv-c c2">💧</i><i class="benv-c c3">✨</i>
      </div>
      <h3>${nome ? `Ciao ${esc(nome)}!` : "Ciao!"}</h3>
      <p class="benv-s">Benvenuta in <b>Rigo</b>, che in latino vuol dire <i>“io annaffio”</i>. Da oggi le tue piante hanno qualcuno che si ricorda di loro.</p>
      <ul class="benv-l">
        <li><span>💧</span>Ti dice chi ha sete, ogni mattina</li>
        <li><span>📸</span>Riconosce le piante da una foto</li>
        <li><span>🩺</span>Ti aiuta se una pianta non sta bene</li>
      </ul>
      <div class="field"><label for="bv-io">Il tuo nome</label><input id="bv-io" value="${esc(nome)}" maxlength="24" autocomplete="given-name" enterkeyhint="next"></div>
      <div class="field"><label for="bv-aiuto">Chi ti aiuta con le piante? <small>(facoltativo)</small></label><input id="bv-aiuto" value="${esc(nomeAiuto())}" placeholder="Il suo nome" maxlength="24" autocomplete="off" enterkeyhint="done"></div>
      <p class="note" style="margin-top:4px">Se lo scrivi, potrete segnare chi di voi due ha annaffiato.</p>
      <button class="btn water" id="bv-ok">Iniziamo</button>
    </div>
  `, "Benvenuta in Rigo");
  $("#bv-ok").onclick = () => {
    imp.io = pulisciNome($("#bv-io").value); imp.aiuto = pulisciNome($("#bv-aiuto").value); if (!imp.aiuto) imp.chi = "io";
    salvaImp(); chiudiFoglio(); tocco(); morbido(render); aggiornaPromemoria();
    toast(nomeIo() && nomeAiuto() ? `Benvenuti, ${nomeIo()} e ${nomeAiuto()}!` : nomeIo() ? `Benvenuta, ${nomeIo()}!` : "Benvenuta!");
  };
}

/* ---------- Scheda della pianta ---------- */
const storico = p => p.storia.slice(0, 6).map((t, i) => { const chi = nomeAiuto() && p.da && p.da[t];
  return `<div><span class="h-l">${i === 0 ? "Ultima" : "Annaffiata"}${chi ? ` <i class="chi-tag" style="--t:${tintaChi(chi)}">${esc(iniziale(chi))}</i>${esc(chi)}` : ""}</span><span>${fmt(t)}</span></div>`; }).join("") || `<div>Ancora nessuna<span></span></div>`;
async function scheda(id, senzaAnim) {
  const p = piante.find(x => x.id === id);
  if (!p) return;
  schedaAperta = id;
  const s = specie(p), m = mancano(p);
  apri(`
    <div class="hero" id="hero">${pic(p).replace("xMidYMid slice", "xMidYMax slice")}<button class="close" data-close aria-label="Chiudi">${ICO.x}</button></div>
    <h3>${esc(p.nome)}</h3><div class="latin">${p.sp === "altro" ? esc(p.sci || s.n) : (p.sci || s.l) === s.n ? esc(s.n) : esc(s.n) + " · " + esc(p.sci || s.l)}</div>
    <div class="chips">
      <span class="chip">${ICO.drop}Ogni ${ogni(p)} ${ogni(p) === 1 ? "giorno" : "giorni"}${stagioneInv() ? " (inverno)" : ""}</span>
      <span class="chip">${ICO.sun}${esc(s.luce)}</span>
      <span class="chip">${ICO.air}${esc(s.umid)}</span>
      ${p.stanza ? `<span class="chip">${ICO.home}${esc(p.stanza)}</span>` : ""}
    </div>
    <div class="waterbox" id="wb">${ring(Math.max(0, m) / ogni(p), m <= 0 ? "0g" : m + "g", true)}
      <div><b id="wb-t">${m < 0 ? `Ha sete da ${-m} ${m === -1 ? "giorno" : "giorni"}` : m === 0 ? "Ha sete: annaffiala oggi" : "Prossima acqua " + quando(m)}</b><span id="wb-s">Ultima volta ${fmtLungo(p.last)}${giorniDa(p.last) > 1 ? ", il " + fmt(p.last) : ""}</span></div></div>
    <button class="btn water" id="annaffia">${ICO.drop}Ho annaffiato</button>
    <div class="tip"><b>Il consiglio</b>${esc(s.tip)}</div>
    <button class="btn ghost salute-btn" id="salute"><span class="salute-ico">🩺</span>Come sta? Controlla la salute</button>
    ${p.note ? `<div class="block-h">Note</div><div class="note-p">${esc(p.note)}</div>` : ""}
    <div class="block-h">Le sue foto <small id="nfoto"></small></div>
    <div class="album" id="album"><label class="add" for="foto-in">${ICO.cam}Aggiungi<br>foto</label></div>
    <input type="file" id="foto-in" accept="image/*" hidden>
    <div class="block-h">Annaffiature</div>
    <div class="history" id="storico">${storico(p)}</div>
    <button class="btn ghost" id="modifica" style="margin-top:22px">Modifica pianta</button>
  `, "Scheda di " + p.nome);
  $("#sheet [data-close]").onclick = chiudiFoglio;
  $("#annaffia").onclick = e => animaAcqua(p, e);
  $("#salute").onclick = () => salute(p);
  $("#modifica").onclick = () => formPianta(p);
  $("#foto-in").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const { blob, thumb } = await preparaFoto(f);
      const ft = { id: nuovoId(), pianta: p.id, t: now(), blob };
      await DB.put("foto", ft);
      if (!p.coverId) { p.coverId = ft.id; p.thumb = thumb; await salva(p); render(); }
      toast("Foto aggiunta all'album");
      scheda(p.id, true);
    } catch (er) { toast("Questa foto non si riesce ad aprire. Prova con un'altra."); }
  };
  caricaAlbum(p);
}

const urlFoto = new Map();
const urlDi = f => { if (!urlFoto.has(f.id)) urlFoto.set(f.id, URL.createObjectURL(f.blob)); return urlFoto.get(f.id); };
// le foto grandi servono solo nella scheda: quando si chiude si liberano (dopo l'animazione di chiusura)
const liberaFoto = () => { const vecchi = [...urlFoto.values()]; urlFoto.clear(); setTimeout(() => vecchi.forEach(u => URL.revokeObjectURL(u)), 600); };
async function caricaAlbum(p) {
  const foto = (await DB.fotoDi(p.id)).sort((a, b) => b.t - a.t);
  if (schedaAperta !== p.id) return;
  $("#nfoto").textContent = foto.length === 1 ? "1 foto" : `${foto.length} foto`;
  const cover = foto.find(f => f.id === p.coverId);
  if (cover) { const h = $("#hero img"); if (h) h.src = urlDi(cover); }
  $("#album").insertAdjacentHTML("afterbegin", foto.map((f, i) =>
    `<button class="ph${f.id === p.coverId ? " is-cover" : ""}" data-foto="${esc(f.id)}" style="animation-delay:${i * 40}ms"><img src="${urlDi(f)}" alt="Foto del ${fmt(f.t)}"><i>${fmt(f.t)}</i></button>`).join(""));
  $$("#album [data-foto]").forEach(b => b.onclick = () => apriFoto(p, foto.find(f => f.id === b.dataset.foto)));
}

function apriFoto(p, f) {
  const v = $("#viewer");
  v.innerHTML = `<button class="close" data-x aria-label="Chiudi">${ICO.x}</button><img src="${urlDi(f)}" alt="">
    <div class="vbar">${f.id !== p.coverId ? `<button data-cover>Usa come copertina</button>` : ""}<button data-del>Elimina</button></div>`;
  history.pushState({ foto: 1 }, ""); viewerAperto = true;
  requestAnimationFrame(() => v.classList.add("on"));
  v.querySelector("[data-x]").onclick = () => history.back();
  const c = v.querySelector("[data-cover]");
  if (c) c.onclick = async () => { p.coverId = f.id; p.thumb = await miniatura(f.blob); await salva(p); render(); history.back(); setTimeout(() => scheda(p.id, true), 50); toast("Copertina cambiata"); };
  v.querySelector("[data-del]").onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.sure) {
      DB.del("foto", f.id).then(async () => {
        if (urlFoto.has(f.id)) { URL.revokeObjectURL(urlFoto.get(f.id)); urlFoto.delete(f.id); }
        if (p.coverId === f.id) { const resto = (await DB.fotoDi(p.id)).sort((a, b) => b.t - a.t); p.coverId = resto[0]?.id || null; p.thumb = resto[0] ? await miniatura(resto[0].blob) : null; await salva(p); render(); }
        history.back(); setTimeout(() => scheda(p.id, true), 50); toast("Foto eliminata");
      });
    } else { b.dataset.sure = 1; b.textContent = "Tocca ancora per eliminare"; b.style.background = "var(--warn)"; }
  };
}

function animaAcqua(p, e) {
  const b = e.currentTarget, r = b.getBoundingClientRect(), rp = document.createElement("span"), sz = Math.max(r.width, r.height) * 2;
  rp.className = "ripple"; rp.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - r.left - sz / 2}px;top:${e.clientY - r.top - sz / 2}px`;
  b.appendChild(rp); setTimeout(() => rp.remove(), 700); tocco();
  const wb = $("#wb"), rg = wb.querySelector(".ring"); wb.style.position = "relative";
  const rr = rg.getBoundingClientRect(), wr = wb.getBoundingClientRect();
  const cx = rr.left - wr.left + rr.width / 2, cy = rr.top - wr.top + rr.height / 2;
  for (let k = 0; k < 3; k++) {
    const d = document.createElement("div"); d.className = "drop";
    d.innerHTML = `<svg viewBox="0 0 16 22"><path d="M8 0s8 10 8 14a8 8 0 0 1-16 0C0 10 8 0 8 0z" fill="var(--water)"/></svg>`;
    d.style.left = cx + (k - 1) * 10 + "px"; d.style.animationDelay = k * 110 + "ms"; d.style.setProperty("--fall", cy + 30 + "px");
    wb.appendChild(d); setTimeout(() => d.remove(), 1300);
  }
  b.disabled = true;
  setTimeout(() => {
    const sp = document.createElement("div"); sp.className = "splash"; sp.style.left = cx + "px"; sp.style.top = cy + "px";
    wb.appendChild(sp); setTimeout(() => sp.remove(), 800);
    rg.querySelector(".fg").style.strokeDashoffset = "0";
    rg.querySelector("text").textContent = ogni(p) + "g";
    $("#wb-t").textContent = "Prossima acqua " + quando(ogni(p));
    $("#wb-s").textContent = "Annaffiata adesso";
    annaffia(p);
    const st = $("#storico"); if (st) { st.innerHTML = storico(p); const r = st.firstElementChild; if (r && r.animate && !pocoMoto()) r.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: MOLLA }); }
    b.disabled = false;
  }, 650);
}

/* ---------- Foto: ridotte prima di salvarle ---------- */
function caricaImg(file) {
  return new Promise((ok, ko) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => ok({ im, u }); im.onerror = ko; im.src = u; });
}
function suCanvas(im, lato) {
  const k = Math.min(1, lato / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); return c;
}
function quadrata(im, lato) {
  const s = Math.min(im.naturalWidth, im.naturalHeight), c = document.createElement("canvas");
  c.width = c.height = lato;
  c.getContext("2d").drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, lato, lato);
  return c.toDataURL("image/jpeg", .78);
}
async function preparaFoto(file) {
  const { im, u } = await caricaImg(file);
  const blob = await new Promise(ok => suCanvas(im, 1400).toBlob(ok, "image/jpeg", .82));
  const thumb = quadrata(im, 420);
  URL.revokeObjectURL(u);
  return { blob, thumb };
}
async function miniatura(blob) { const { im, u } = await caricaImg(blob); const t = quadrata(im, 420); URL.revokeObjectURL(u); return t; }

/* ---------- Aggiungi / modifica ---------- */
const STANZE_BASE = ["Soggiorno", "Cucina", "Camera", "Bagno", "Studio", "Balcone", "Ingresso"];
function formPianta(p) {
  const nuova = !p;
  const st = { sp: p ? p.sp : "", e: p ? p.e : 7, i: p ? p.i : 10, foto: null, quando: 0 };
  const listaSp = Object.entries(SPECIE).sort((a, b) => a[0] === "altro" ? 1 : b[0] === "altro" ? -1 : a[1].n.localeCompare(b[1].n, "it"));
  apri(`
    <h3 style="margin-top:4px">${nuova ? "Nuova pianta" : "Modifica " + esc(p.nome)}</h3>
    ${nuova ? `<label class="photo-pick" for="add-foto" id="pick" style="margin-top:14px"><div>${ICO.cam}<b>Scatta o scegli una foto</b><br><small>${window.PLANTNET_KEY ? "L'app prova a riconoscere la pianta" : "Facoltativa, puoi aggiungerla dopo"}</small></div></label>
    <input type="file" id="add-foto" accept="image/*" hidden><div id="guess-box"></div>` : ""}
    <div class="field"><label for="sp-cerca">Tipo di pianta</label>
      <input id="sp-cerca" type="search" placeholder="Cerca: monstera, pothos, cactus…" autocomplete="off">
      <div class="sp-list" id="sp-list"></div>
      <div class="note" id="sp-note"></div></div>
    <div class="field"><label for="f-nome">Il suo nome</label><input id="f-nome" value="${p ? esc(p.nome) : ""}" placeholder="Es. Gigi, Monstera del salotto" autocomplete="off" maxlength="40"></div>
    <div class="field"><label for="f-stanza">Stanza</label><input id="f-stanza" list="stanze-l" value="${p ? esc(p.stanza || "") : esc(filtro)}" placeholder="Es. Soggiorno" autocomplete="off" maxlength="30">
      <datalist id="stanze-l">${[...new Set([...stanze(), ...STANZE_BASE])].map(s => `<option value="${esc(s)}">`).join("")}</datalist></div>
    <div class="field"><label>Annaffiare ogni (giorni)</label>
      <div class="row2">
        <div><div class="note" style="margin:0 0 6px">D'estate</div><div class="stepper"><button data-st="e" data-d="-1" aria-label="Meno giorni d'estate">−</button><output id="out-e"></output><button data-st="e" data-d="1" aria-label="Più giorni d'estate">+</button></div></div>
        <div><div class="note" style="margin:0 0 6px">D'inverno</div><div class="stepper"><button data-st="i" data-d="-1" aria-label="Meno giorni d'inverno">−</button><output id="out-i"></output><button data-st="i" data-d="1" aria-label="Più giorni d'inverno">+</button></div></div>
      </div></div>
    ${nuova ? `<div class="field"><label for="f-quando">Ultima annaffiatura</label><select id="f-quando">
      <option value="0">Oggi</option><option value="1">Ieri</option><option value="3">3 giorni fa</option><option value="7">Una settimana fa</option><option value="-1">Non ricordo</option></select></div>` : ""}
    <div class="field"><label for="f-note">Note</label><textarea id="f-note" placeholder="Es. regalata da Marta, concime ogni 2 settimane" maxlength="400">${p ? esc(p.note || "") : ""}</textarea></div>
    <button class="btn water" id="f-salva" style="margin-top:20px">${nuova ? "Aggiungi alla casa" : "Salva"}</button>
    ${nuova ? `<button class="btn ghost" id="f-annulla">Annulla</button>` : `<div class="row2"><button class="btn ghost" id="f-annulla">Annulla</button><button class="btn danger" id="f-elimina">Elimina pianta</button></div><div id="f-conf"></div>`}
  `, nuova ? "Nuova pianta" : "Modifica pianta");

  const outs = () => { $("#out-e").textContent = st.e; $("#out-i").textContent = st.i; };
  const disegnaLista = () => {
    const q = $("#sp-cerca").value.trim().toLowerCase();
    let l = listaSp.filter(([k, s]) => !q || k === "altro" || s.n.toLowerCase().includes(q) || s.l.toLowerCase().includes(q));
    if (!q && st.sp) l = [...l.filter(([k]) => k === st.sp), ...l.filter(([k]) => k !== st.sp)];
    $("#sp-list").innerHTML = l.map(([k, s]) => `<button data-sp="${k}" class="${k === st.sp ? "sel" : ""}"><span><b>${esc(s.n)}</b><br><small>${esc(s.l)}</small></span><span class="d">${s.e}/${s.i} gg</span></button>`).join("");
  };
  const scegli = (k, auto) => {
    st.sp = k; const s = SPECIE[k];
    if (auto !== false) { st.e = s.e; st.i = s.i; outs(); }
    $("#sp-note").textContent = `${s.n}: ogni ${s.e} giorni d'estate, ${s.i} d'inverno. ${s.luce}.`;
    if (!$("#f-nome").value) $("#f-nome").placeholder = k === "altro" && st.comune ? st.comune : s.n;
    disegnaLista(); $("#sp-list").scrollTop = 0;
  };
  outs(); disegnaLista();
  if (p) scegli(p.sp, false);
  $("#sp-cerca").oninput = disegnaLista;
  $("#sp-list").onclick = e => { const b = e.target.closest("[data-sp]"); if (b) { st.sci = ""; st.comune = ""; $$(".guess button").forEach(x => x.classList.remove("sel")); scegli(b.dataset.sp); } };
  $$("[data-st]").forEach(b => b.onclick = () => { const k = b.dataset.st; st[k] = Math.max(1, Math.min(90, st[k] + +b.dataset.d)); outs(); });
  $("#f-annulla").onclick = () => nuova ? chiudiFoglio() : scheda(p.id);

  if (nuova) {
    $("#add-foto").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const attivo = !!window.PLANTNET_KEY;
      try { st.foto = await preparaFoto(f); $("#pick").innerHTML = `<img src="${st.foto.thumb}" alt="">${attivo ? `<div class="scan"></div>` : ""}`; }
      catch (er) { toast("Questa foto non si riesce ad aprire. Prova con un'altra."); return; }
      if (!attivo) return;
      $("#guess-box").innerHTML = `<div class="note">Sto riconoscendo la pianta…</div>`;
      const ris = await riconosci(st.foto.blob);
      $("#pick .scan")?.remove();
      if (!$("#guess-box")) return;
      if (ris.errore) { $("#guess-box").innerHTML = `<div class="note">${esc(ris.errore)}</div>`; return; }
      $("#guess-box").innerHTML = `<div class="guess">${ris.lista.map((g, i) => `<button data-g="${i}" style="animation-delay:${i * 80}ms"><span><b>${esc(g.nome)}</b><br><small class="latin">${esc(g.sci)}</small></span><span class="pct">${g.pct}%</span></button>`).join("")}</div>
        <div class="note">${ris.lista[0].pct < 15 ? "Non ne sono sicuro: prova una foto più vicina alle foglie, oppure cerca qui sotto." : "Tocca quella giusta, oppure cerca qui sotto."}</div>`;
      const usa = i => { const g = ris.lista[i]; st.sci = g.sci; st.comune = g.sp === "altro" ? g.nome : ""; $$(".guess button").forEach(b => b.classList.toggle("sel", +b.dataset.g === i)); scegli(g.sp); };
      $$(".guess button").forEach(b => b.onclick = () => usa(+b.dataset.g));
      if (ris.lista[0].pct >= 40) usa(0);
    };
  } else {
    $("#f-elimina").onclick = () => {
      $("#f-conf").innerHTML = `<div class="confirm"><p>Eliminare <b>${esc(p.nome)}</b> con tutte le sue foto? Non si può annullare.</p>
        <div class="row2"><button class="btn ghost" id="c-no">No, tienila</button><button class="btn warn" id="c-si">Elimina</button></div></div>`;
      $("#c-no").onclick = () => $("#f-conf").innerHTML = "";
      $("#c-si").onclick = async () => {
        for (const f of await DB.fotoDi(p.id)) await DB.del("foto", f.id);
        await DB.del("piante", p.id);
        piante = piante.filter(x => x.id !== p.id); aggiornaPromemoria();
        chiudiFoglio(); render(); toast("Pianta eliminata");
      };
    };
  }

  $("#f-salva").onclick = async e => {
    if (!st.sp) { toast("Scegli il tipo di pianta (o \"Altra pianta\")"); $("#sp-cerca").focus(); return; }
    const b = e.currentTarget; if (b.disabled) return; b.disabled = true;
    try { await salvaForm(); } catch (er) { toast("Non riesco a salvare: lo spazio del telefono è pieno?"); }
    b.disabled = false;
  };
  async function salvaForm() {
    const nome = $("#f-nome").value.trim() || (st.sp === "altro" && st.comune) || SPECIE[st.sp].n;
    const stanza = $("#f-stanza").value.trim();
    const note = $("#f-note").value.trim();
    if (nuova) {
      const q = +$("#f-quando").value;
      const np = { id: nuovoId(), nome, sp: st.sp, sci: st.sci || "", stanza, e: st.e, i: st.i, note, creata: now(), storia: [], thumb: null, coverId: null };
      np.last = q >= 0 ? inizioGiorno(now()) - q * DAY + 12 * 36e5 : now() - (stagioneInv() ? st.i : st.e) * DAY;
      if (q >= 0) np.storia = [np.last];
      let ft = null;
      if (st.foto) { ft = { id: nuovoId(), pianta: np.id, t: now(), blob: st.foto.blob }; np.coverId = ft.id; np.thumb = st.foto.thumb; }
      await DB.salvaNuova(np, ft); piante.push(np); aggiornaPromemoria();
      chiudiFoglio(); tocco(); morbido(render); toast("Benvenuta in casa!");
    } else {
      // il nome latino del riconoscimento vale solo per il tipo per cui è stato trovato
      const nuovi = { nome, sp: st.sp, sci: st.sp === p.sp ? p.sci : (st.sci || ""), stanza, e: st.e, i: st.i, note };
      await DB.put("piante", Object.assign({}, p, nuovi)); Object.assign(p, nuovi); aggiornaPromemoria();
      render(); scheda(p.id, true); toast("Salvato");
    }
  }
}

/* ---------- Riconoscimento dalla foto (Pl@ntNet, gratuito) ---------- */
function abbina(r) {
  const sp = r.species || {}, nome = sp.scientificNameWithoutAuthor || "";
  const gen = sp.genus?.scientificNameWithoutAuthor || nome.split(" ")[0];
  const fam = sp.family?.scientificNameWithoutAuthor || "";
  return ABBINA.specie[nome] || ABBINA.genere[gen] || ABBINA.famiglia[fam] || "altro";
}
function leggiRisultati(d) {
  const visti = new Set(), lista = [];
  for (const r of d.results || []) {
    const sp = abbina(r), sci = r.species?.scientificNameWithoutAuthor || "";
    const chiave = sp === "altro" ? sci : sp;
    if (!sci || visti.has(chiave)) continue; visti.add(chiave);
    const comune = (r.species?.commonNames || [])[0];
    lista.push({ sp, sci, pct: Math.max(1, Math.round(r.score * 100)), nome: sp === "altro" ? (comune ? comune[0].toUpperCase() + comune.slice(1) : sci) : SPECIE[sp].n });
    if (lista.length === 3) break;
  }
  return lista;
}
async function riconosci(blob) {
  if (!navigator.onLine) return { errore: "Senza rete non posso riconoscerla: scegli il tipo dall'elenco." };
  const fd = new FormData(); fd.append("images", blob, "pianta.jpg"); fd.append("organs", "auto");
  try {
    const ctl = new AbortController(); const tmo = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(window.PLANTNET_KEY)}&lang=it&nb-results=5`, { method: "POST", body: fd, signal: ctl.signal });
    clearTimeout(tmo);
    if (res.status === 404) return { errore: "Non l'ho riconosciuta. Prova una foto più vicina alle foglie, oppure scegli dall'elenco." };
    if (res.status === 429) return { errore: "Per oggi il riconoscimento ha finito i tentativi gratuiti: scegli dall'elenco." };
    if (!res.ok) return { errore: "Il riconoscimento non risponde: scegli il tipo dall'elenco." };
    const lista = leggiRisultati(await res.json());
    return lista.length ? { lista } : { errore: "Non l'ho riconosciuta: scegli il tipo dall'elenco." };
  } catch (e) { return { errore: "Il riconoscimento non risponde: scegli il tipo dall'elenco." }; }
}

/* ---------- Il dottore: come sta la pianta ----------
   Lei sceglie cosa vede (e se vuole fa una foto). Le scelte si incrociano con l'ultima annaffiatura;
   la foto la guarda Pl@ntNet (parassiti e funghi). Tutto resta sul telefono, tranne la foto mandata a Pl@ntNet. */
async function malattieDallaFoto(blob) {
  if (!navigator.onLine) return { errore: "Senza rete non posso guardare la foto: uso solo quello che hai scelto." };
  const fd = new FormData(); fd.append("images", blob, "pianta.jpg"); fd.append("organs", "auto");
  try {
    const ctl = new AbortController(); const tmo = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(`https://my-api.plantnet.org/v2/diseases/identify?api-key=${encodeURIComponent(window.PLANTNET_KEY)}&lang=it&nb-results=10`, { method: "POST", body: fd, signal: ctl.signal });
    clearTimeout(tmo);
    if (res.status === 404) return { lista: [] };
    if (res.status === 429) return { errore: "Per oggi i controlli dalla foto sono finiti: uso solo quello che hai scelto." };
    if (!res.ok) return { errore: "Il controllo della foto non risponde: uso solo quello che hai scelto." };
    const d = await res.json(), visti = new Set(), lista = [];
    for (const r of d.results || []) {
      if (r.score < .1) continue;
      const testo = `${r.name || ""} ${r.description || ""}`;
      const t = FOTO.find(([re]) => re.test(testo));
      if (!t || visti.has(t[1])) continue;
      visti.add(t[1]); lista.push({ k: t[1], pct: Math.round(r.score * 100) });
    }
    return { lista };
  } catch (e) { return { errore: "Il controllo della foto non risponde: uso solo quello che hai scelto." }; }
}
function diagnosi(p, scelti, dallaFoto) {
  const s = specie(p), r = giorniDa(p.last) / Math.max(1, ogni(p)), punti = new Map();
  const aggiungi = (k, w, perche) => {
    if (!w || !PROBLEMI[k]) return;
    const x = punti.get(k) || { k, w: 0, perche: new Set() };
    x.w += w; if (perche) x.perche.add(perche); punti.set(k, x);
  };
  scelti.forEach(id => { const sin = SINTOMI.find(x => x.id === id); if (sin) sin.c(r, s).forEach(([k, w, perche]) => aggiungi(k, w, perche)); });
  (dallaFoto || []).forEach(f => aggiungi(f.k, f.pct >= 30 ? 4 : 2, `Lo vedo anche nella foto (${f.pct}%).`));
  const lista = [...punti.values()].sort((a, b) => b.w - a.w).slice(0, 3);
  // "Probabile" solo alla prima, e solo se è chiaramente davanti alle altre: le altre sono "Possibile"
  lista.forEach((x, i) => x.alta = i === 0 && x.w >= 3 && (!lista[1] || x.w - lista[1].w >= 2));
  return lista;
}
function salute(p) {
  const conFoto = !!window.PLANTNET_KEY, scelti = new Set(); let foto = null;
  apri(`
    <h3 style="margin-top:4px">Come sta ${esc(p.nome)}?</h3>
    <p class="note" style="margin-top:6px">Tocca quello che vedi. ${conFoto ? "Se vuoi, aggiungi una foto da vicino della parte che non va." : ""}</p>
    ${conFoto ? `<label class="photo-pick salute-pick" for="sal-foto" id="sal-pick"><div>${ICO.cam}<b>Foto della parte malata</b><br><small>Facoltativa: cerca parassiti e funghi</small></div></label>
    <input type="file" id="sal-foto" accept="image/*" hidden>` : ""}
    <div class="block-h">Cosa vedi?</div>
    <div class="sintomi">${SINTOMI.map((x, i) => `<button class="sintomo" data-s="${x.id}" aria-pressed="false" style="--i:${i}"><span>${x.e}</span>${esc(x.n)}</button>`).join("")}</div>
    <button class="btn water" id="sal-vai" disabled>Vedi cosa può essere</button>
    <div id="sal-esito" aria-live="polite"></div>
    <button class="btn ghost" id="sal-torna" style="margin-top:18px">Torna alla scheda</button>
  `, "Salute di " + p.nome);
  const vai = $("#sal-vai");
  const pronto = () => { vai.disabled = !scelti.size && !foto; };
  $$("#sheet [data-s]").forEach(b => b.onclick = () => {
    const id = b.dataset.s, on = !scelti.has(id);
    on ? scelti.add(id) : scelti.delete(id); b.setAttribute("aria-pressed", on); tocco(); pronto();
  });
  if (conFoto) $("#sal-foto").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { foto = await preparaFoto(f); $("#sal-pick").innerHTML = `<img src="${foto.thumb}" alt="">`; pronto(); }
    catch (er) { toast("Questa foto non si riesce ad aprire. Prova con un'altra."); }
  };
  $("#sal-torna").onclick = () => scheda(p.id, true);
  vai.onclick = async () => {
    vai.disabled = true; tocco();
    const box = $("#sal-esito");
    let daFoto = null, avviso = "";
    if (foto) {
      vai.textContent = "Guardo la foto…";
      $("#sal-pick").insertAdjacentHTML("beforeend", `<div class="scan"></div>`);
      const ris = await malattieDallaFoto(foto.blob);
      $("#sal-pick .scan")?.remove();
      if (ris.errore) avviso = ris.errore; else { daFoto = ris.lista; if (!daFoto.length) avviso = "Nella foto non vedo parassiti o funghi che conosco."; }
    }
    if (!$("#sal-esito")) return;
    const esito = diagnosi(p, [...scelti], daFoto);
    vai.textContent = "Vedi cosa può essere"; pronto();
    box.innerHTML = `${avviso ? `<p class="note" style="margin-top:14px">${esc(avviso)}</p>` : ""}
      ${esito.length ? esito.map((x, i) => `<div class="diag" style="--i:${i}">
        <div class="diag-h"><b>${esc(PROBLEMI[x.k].t)}</b><span class="pill ${x.alta ? "alta" : ""}">${x.alta ? "Probabile" : "Possibile"}</span></div>
        ${[...x.perche].map(t => `<p class="diag-p">${esc(t)}</p>`).join("")}
        <ol>${PROBLEMI[x.k].r.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
      </div>`).join("") : `<div class="diag"><div class="diag-h"><b>Non vedo problemi chiari</b></div><p class="diag-p">Se qualcosa ti preoccupa, scegli cosa vedi qui sopra oppure prova una foto più da vicino.</p></div>`}
      <p class="note">Sono consigli generali: se la pianta peggiora, chiedi anche a un vivaio.</p>`;
    requestAnimationFrame(() => box.scrollIntoView({ behavior: pocoMoto() ? "auto" : "smooth", block: "start" }));
  };
}

/* ---------- Impostazioni e copia di sicurezza ---------- */
function impostazioni() {
  const installata = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  $("#v-imp").innerHTML = (`
    <header class="top"><div><div class="date">${esc(oggiData())}</div><h1 class="titolo">Impostazioni</h1></div></header>
    ${installata ? "" : `<div class="tip" style="margin-top:14px"><b>Usala come un'app</b>In Safari tocca Condividi, poi "Aggiungi alla schermata Home". Così si apre a tutto schermo, anche senza rete.</div>`}
    <div class="block-h">Chi cura le piante</div>
    <div class="group nomi">
    <label class="campo-nome"><span class="chi-tag" style="--t:${TINTE_CHI[0]}">${esc(iniziale(nomeIo() || "Tu"))}</span><input id="n-io" value="${esc(nomeIo())}" placeholder="Il tuo nome" maxlength="24" autocomplete="given-name" aria-label="Il tuo nome"></label>
    <label class="campo-nome"><span class="chi-tag" style="--t:${TINTE_CHI[1]}">${nomeAiuto() ? esc(iniziale(nomeAiuto())) : "+"}</span><input id="n-aiuto" value="${esc(nomeAiuto())}" placeholder="Chi ti aiuta (facoltativo)" maxlength="24" autocomplete="off" aria-label="Chi ti aiuta"></label>
    </div>
    <p class="note" style="margin-top:6px">Con due nomi, nella scheda Oggi scegli chi annaffia: ogni annaffiatura ricorda chi l'ha fatta.</p>
    <div class="group">
    <div class="switch"><div><b>Ritmo stagionale</b><small>Da ottobre a marzo usa i giorni "d'inverno", perché le piante bevono meno</small></div><input type="checkbox" id="sw-stag" ${imp.stagioni ? "checked" : ""} aria-label="Ritmo stagionale"></div>
    <div class="switch"><div><b>Promemoria del mattino</b><small>${window.FIREBASE_PROGETTO ? "Un avviso sul telefono, solo nei giorni in cui una pianta ha sete" : "In arrivo: un avviso al mattino quando una pianta ha sete"}</small></div><input type="checkbox" id="sw-prom" ${imp.promemoria ? "checked" : ""} ${window.FIREBASE_PROGETTO ? "" : "disabled"} aria-label="Promemoria del mattino"></div>
    <div class="switch ora" id="ora-box" ${imp.promemoria ? "" : "hidden"}><label for="sel-ora"><b>A che ora</b></label><select id="sel-ora">${Array.from({ length: 15 }, (_, i) => String(i + 7).padStart(2, "0") + ":00").map(o => `<option ${o === imp.ora ? "selected" : ""}>${o}</option>`).join("")}</select></div>
    </div>
    <div id="prom-msg"></div>
    <div class="block-h">Copia di sicurezza</div>
    <p class="note" style="margin-top:0">Le piante e le foto sono salvate solo su questo telefono. Ogni tanto fai una copia e tienila in File o su iCloud Drive.</p>
    <div class="list-set">
      <button class="btn ghost" id="b-salva">Salva una copia</button>
      <label class="btn ghost" for="b-file" style="margin-top:0">Ripristina da una copia</label>
      <input type="file" id="b-file" accept="application/json,.json" hidden>
      <div id="b-conf"></div>
    </div>
    <p class="about"><img src="logo.svg" alt="" class="logo-mini"><br>Rigo · <i>“io annaffio”</i> · versione 6.2 · ${piante.length} ${piante.length === 1 ? "pianta" : "piante"}</p>
  `);
  const nomeCambiato = (id, k) => { const el = $(id); el.onchange = () => {
    imp[k] = pulisciNome(el.value); el.value = imp[k]; if (!nomeAiuto()) imp.chi = "io";
    salvaImp(); render(); impostazioni(); aggiornaPromemoria(); toast(imp[k] ? "Nome salvato" : "Nome tolto");
  }; };
  nomeCambiato("#n-io", "io"); nomeCambiato("#n-aiuto", "aiuto");
  $("#sw-stag").onchange = e => { imp.stagioni = e.target.checked; salvaImp(); render(); aggiornaPromemoria(); };
  $("#sw-prom").onchange = async e => {
    const sw = e.target; sw.disabled = true;
    const msg = t => $("#prom-msg").innerHTML = t ? `<div class="tip" style="margin-top:10px">${t}</div>` : "";
    msg("");
    const esito = sw.checked ? await attivaPromemoria() : await spegniPromemoria();
    if (esito) { msg(esito); sw.checked = !sw.checked; }
    $("#ora-box").hidden = !imp.promemoria;
    sw.disabled = false;
    if (!esito) toast(imp.promemoria ? "Promemoria attivo" : "Promemoria spento");
  };
  $("#sel-ora").onchange = e => { imp.ora = e.target.value; salvaImp(); aggiornaPromemoria(true); toast(`Promemoria alle ${imp.ora}`); };
  $("#b-salva").onclick = esportaCopia;
  $("#b-file").onchange = e => { const f = e.target.files[0]; if (f) chiediRipristino(f); e.target.value = ""; };
}

const blobInData = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
async function esportaCopia() {
  const b = $("#b-salva"); b.textContent = "Preparo la copia…"; b.disabled = true;
  try {
    // il file si costruisce a pezzi (una foto alla volta): niente stringa enorme in memoria con tante foto
    const testa = JSON.stringify({ app: "fronda", versione: 1, creata: new Date().toISOString(), impostazioni: imp, piante });
    const pezzi = [testa.slice(0, -1) + ',"foto":['];
    const foto = await DB.all("foto");
    for (let k = 0; k < foto.length; k++) {
      const f = foto[k];
      pezzi.push((k ? "," : "") + JSON.stringify({ id: f.id, pianta: f.pianta, t: f.t, data: await blobInData(f.blob) }));
    }
    pezzi.push("]}");
    const nome = `rigo-copia-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(pezzi, nome, { type: "application/json" });
    pezzi.length = 0;
    let fatta = true;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Copia di Rigo" }); }
      catch (e) { if (e.name === "AbortError") fatta = false; else throw e; }
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = nome;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    if (fatta) toast("Copia pronta");
  } catch (e) { toast("Non sono riuscito a fare la copia"); }
  b.textContent = "Salva una copia"; b.disabled = false;
}
function chiediRipristino(file) {
  const r = new FileReader();
  r.onload = () => {
    let d; try { d = JSON.parse(r.result); } catch (e) {}
    if (!d || d.app !== "fronda" || !Array.isArray(d.piante)) { toast("Questo file non è una copia di Rigo"); return; }
    $("#b-conf").innerHTML = `<div class="confirm"><p>La copia ha <b>${d.piante.length} piante</b> e ${d.foto?.length || 0} foto. Sostituisce tutto quello che c'è adesso sul telefono.</p>
      <div class="row2"><button class="btn ghost" id="r-no">Annulla</button><button class="btn warn" id="r-si">Ripristina</button></div></div>`;
    $("#r-no").onclick = () => $("#b-conf").innerHTML = "";
    $("#r-si").onclick = async e => {
      const b = e.currentTarget; b.disabled = true; b.textContent = "Ripristino…";
      try {
        // prima si prepara tutto, poi si sostituisce in un colpo solo: se qualcosa va storto resta tutto com'era
        const nuove = d.piante.map(pulisciPianta).filter(Boolean);
        const ids = new Set(nuove.map(p => p.id));
        const foto = [];
        for (const f of d.foto || []) {
          if (!f || typeof f.data !== "string" || !f.data.startsWith("data:image/") || !ids.has(f.pianta)) continue;
          foto.push({ id: String(f.id), pianta: f.pianta, t: +f.t || now(), blob: await (await fetch(f.data)).blob() });
        }
        await DB.sostituisci(nuove, foto);
        // il promemoria resta quello di questo telefono: l'iscrizione agli avvisi non viaggia con la copia
        if (d.impostazioni) { imp = Object.assign({}, imp, { stagioni: d.impostazioni.stagioni !== false, ora: d.impostazioni.ora || imp.ora,
          ...(typeof d.impostazioni.io === "string" ? { io: pulisciNome(d.impostazioni.io), aiuto: pulisciNome(d.impostazioni.aiuto), chi: d.impostazioni.chi === "aiuto" ? "aiuto" : "io" } : {}) }); salvaImp(); }
        piante = await DB.all("piante"); liberaFoto(); aggiornaPromemoria();
        chiudiFoglio(); render(); vai("oggi"); toast("Copia ripristinata");
      } catch (er) {
        b.disabled = false; b.textContent = "Ripristina";
        toast("Ripristino non riuscito: le piante di prima sono ancora tutte qui");
      }
    };
  };
  r.readAsText(file);
}

/* ---------- Promemoria del mattino ----------
   Il telefono manda al database solo nome, ultima annaffiatura e giorni di ogni pianta (niente foto).
   Ogni ora un programma su GitHub controlla e manda l'avviso a chi ha una pianta con sete. */
const FS = percorso => `https://firestore.googleapis.com/v1/projects/${window.FIREBASE_PROGETTO}/databases/(default)/documents/${percorso}`;
function idTelefono() {
  let id = null;
  try { id = localStorage.getItem("fronda-telefono"); } catch (e) {}
  if (!id) {
    const a = new Uint8Array(18); crypto.getRandomValues(a);
    id = [...a].map(x => x.toString(36).padStart(2, "0")).join("").slice(0, 28);
    try { localStorage.setItem("fronda-telefono", id); } catch (e) {}
  }
  return id;
}
const giornoISO = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function campiPromemoria() {
  const lista = piante.map(p => ({ mapValue: { fields: { n: { stringValue: String(p.nome).slice(0, 40) }, l: { stringValue: giornoISO(p.last) }, e: { integerValue: String(p.e) }, i: { integerValue: String(p.i) } } } }));
  return { nome: { stringValue: nomeIo() }, ora: { stringValue: imp.ora || "09:00" }, stagioni: { booleanValue: !!imp.stagioni }, agg: { timestampValue: new Date().toISOString() }, piante: { arrayValue: lista.length ? { values: lista } : {} } };
}
/* L'iscrizione alle notifiche di questo telefono. Si manda SEMPRE insieme ai dati: se il programma del mattino
   ha tolto il documento (iscrizione scaduta), la scrittura dopo lo ricrea invece di essere rifiutata. */
let subJSON = null;
async function prendiSub() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && "Notification" in window && Notification.permission === "granted") {
    const r = await fetch(FS("config/pubblica"));
    const chiave = r.ok ? (await r.json()).fields?.vapid?.stringValue : null;
    if (chiave) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64InByte(chiave) });
  }
  subJSON = sub ? JSON.stringify(sub) : null;
  return subJSON;
}
function promemoriaPerso() {
  imp.promemoria = false; salvaImp(); subJSON = null;
  toast("Il promemoria si è spento: riaccendilo dalle Impostazioni");
}
async function scriviPromemoria(extra, lasciaPartire) {
  const s = subJSON || await prendiSub().catch(() => null);
  if (!s) { promemoriaPerso(); return; }
  const fields = Object.assign(campiPromemoria(), { sub: { stringValue: s } }, extra || {});
  const mask = Object.keys(fields).map(k => "updateMask.fieldPaths=" + k).join("&");
  const r = await fetch(FS("telefoni/" + idTelefono()) + "?" + mask, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }), keepalive: !!lasciaPartire });
  if (r.status === 400 || r.status === 403) { subJSON = null; throw new Error("rifiutata " + r.status); }
  if (!r.ok) throw new Error("scrittura " + r.status);
}
let tPromemoria = null;
function aggiornaPromemoria(subito) {
  if (!imp.promemoria || !window.FIREBASE_PROGETTO) return;
  clearTimeout(tPromemoria);
  tPromemoria = setTimeout(() => { tPromemoria = null; scriviPromemoria().catch(e => console.warn("Promemoria:", e.message)); }, subito ? 0 : 1500);
}
// se l'app si chiude mentre una modifica aspetta, la si manda subito (keepalive: parte anche a pagina chiusa)
function svuotaPromemoria() {
  if (tPromemoria === null) return;
  clearTimeout(tPromemoria); tPromemoria = null;
  scriviPromemoria(null, true).catch(() => {});
}
addEventListener("pagehide", svuotaPromemoria);
document.addEventListener("visibilitychange", () => { if (document.hidden) svuotaPromemoria(); });
const b64InByte = s => { const p = "=".repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function attivaPromemoria() {
  const installata = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return installata ? "Questo telefono non riceve avvisi dalle app web: serve iOS 16.4 o più recente." : "Prima aggiungi Rigo alla schermata Home (Safari → Condividi → \"Aggiungi alla schermata Home\"), poi aprila da lì e accendi il promemoria.";
  try {
    if (await Notification.requestPermission() !== "granted") return "Il telefono non ha dato il permesso. Puoi darlo da Impostazioni → Notifiche → Rigo.";
    const r = await fetch(FS("config/pubblica"));
    if (!r.ok) return "Il servizio dei promemoria non è ancora pronto. Riprova più tardi.";
    const chiave = (await r.json()).fields?.vapid?.stringValue;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64InByte(chiave) });
    imp.promemoria = true; salvaImp();
    subJSON = JSON.stringify(sub);
    await scriviPromemoria();
    render();
    return null;
  } catch (e) {
    imp.promemoria = false; salvaImp();
    return "Non sono riuscito ad accendere il promemoria. Controlla la rete e riprova.";
  }
}
async function spegniPromemoria() {
  imp.promemoria = false; salvaImp(); subJSON = null;
  clearTimeout(tPromemoria); tPromemoria = null;
  try { await fetch(FS("telefoni/" + idTelefono()), { method: "DELETE" }); } catch (e) {}
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {}
  try { navigator.clearAppBadge && navigator.clearAppBadge(); } catch (e) {}
  return null;
}

/* ---------- Avvisi in basso ---------- */
let tt;
function toast(t, annulla) {
  const el = $("#toast");
  el.innerHTML = esc(t) + (annulla ? ` <button id="t-undo">Annulla</button>` : "");
  el.style.pointerEvents = annulla ? "auto" : "none";
  if (annulla) $("#t-undo").onclick = () => { tocco(); annulla(); el.classList.remove("on"); };
  el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), annulla ? 4500 : 2200);
}

/* ---------- Avvio ---------- */
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("visibilitychange", () => { if (!document.hidden && piante.length) render(); });
// "+" in alto e nello stato vuoto, barra delle schede, barra piccola che compare scorrendo
$("#app").addEventListener("click", e => { if (e.target.closest("[data-add]")) { tocco(); formPianta(); } });
$$(".tab").forEach(b => b.onclick = () => vai(b.dataset.tab));
/* Tastiera dell'iPhone: il campo scelto resta visibile, e quando la tastiera si chiude la pagina torna al suo posto */
document.addEventListener("focusin", e => {
  const c = e.target.closest("input,textarea,select"); if (!c || c.type === "file" || c.type === "checkbox") return;
  setTimeout(() => c.scrollIntoView({ block: "center", behavior: pocoMoto() ? "auto" : "smooth" }), 320);
});
document.addEventListener("focusout", () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches("input,textarea,select")) window.scrollTo(0, 0); }, 80));
$$(".vista").forEach(v => {
  let attesa = false;
  v.addEventListener("scroll", () => {
    if (attesa || !v.classList.contains("on")) return; attesa = true;
    requestAnimationFrame(() => { barraTitolo(); attesa = false; });
  }, { passive: true });
});

(async () => {
  try {
    await DB.open();
    piante = await DB.all("piante");
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) {
    toast("Il telefono non lascia salvare i dati: forse è una finestra privata");
  }
  render();
  if (!imp.benvenuto) setTimeout(benvenuto, 650);
  // a ogni apertura si rinfresca il promemoria: se il documento era stato tolto, si ricrea
  if (imp.promemoria && "serviceWorker" in navigator) aggiornaPromemoria(true);
})();

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
