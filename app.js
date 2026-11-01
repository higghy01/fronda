/* Fronda — app delle piante di casa.
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
  fotoDi: pid => DB.tx("foto", "readonly", st => st.index("pianta").getAll(pid))
};

const IMP_KEY = "fronda-impostazioni";
let imp = { stagioni: true };
try { Object.assign(imp, JSON.parse(localStorage.getItem(IMP_KEY)) || {}); } catch (e) {}
const salvaImp = () => { try { localStorage.setItem(IMP_KEY, JSON.stringify(imp)); } catch (e) {} };

let piante = [];
let filtro = "";      // stanza scelta
let cerca = "";
let primaVolta = true;

const salva = p => DB.put("piante", p).catch(() => toast("Non riesco a salvare: lo spazio del telefono è pieno?"));

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
  return `<svg class="ring" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle class="bg" cx="${s/2}" cy="${s/2}" r="${r}"/><circle class="fg" cx="${s/2}" cy="${s/2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${s/2} ${s/2})"/><text x="${s/2}" y="${s/2}">${label}</text></svg>`;
};
const semeDi = p => { let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) % 997; return h + 1; };
const pic = p => p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : art(specie(p).art, specie(p).c, semeDi(p));

/* ---------- Schermata principale ---------- */
function render() {
  $("#today-date").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const main = $("#main");
  main.classList.toggle("still", !primaVolta);
  primaVolta = false;

  if (!piante.length) {
    main.innerHTML = `<section class="empty">
      <div class="ill">${art("monstera", SPECIE.monstera.c, 3)}</div>
      <h2>Iniziamo dalla prima pianta</h2>
      <p>Fai una foto, scegli il tipo e Fronda ti dice quando annaffiarla.</p>
      <button class="btn water" id="empty-add" style="max-width:280px">Aggiungi una pianta</button>
    </section>`;
    $("#empty-add").onclick = () => formPianta();
    return;
  }

  const ordinate = [...piante].sort((a, b) => mancano(a) - mancano(b) || a.nome.localeCompare(b.nome, "it"));
  const oggi = ordinate.filter(p => mancano(p) <= 0);
  const domani = ordinate.filter(p => mancano(p) === 1);
  const tot = piante.length;
  const elencoStanze = stanze();
  if (filtro && !elencoStanze.includes(filtro)) filtro = "";

  const q = cerca.trim().toLowerCase();
  const visibili = ordinate.filter(p => (!filtro || (p.stanza || "").trim() === filtro) &&
    (!q || p.nome.toLowerCase().includes(q) || specie(p).n.toLowerCase().includes(q) || (p.stanza || "").toLowerCase().includes(q)));

  main.innerHTML = `
  <section class="today">
    ${ring(1 - oggi.length / tot, `${tot - oggi.length}/${tot}`, true).replace('class="ring"', 'class="ring gauge"')}
    <div><b>${oggi.length ? `${oggi.length === 1 ? "Una pianta ha" : oggi.length + " piante hanno"} sete oggi` : "Tutte a posto oggi"}</b>
    <span>${oggi.length ? "Sono qui sotto, in ordine" : domani.length ? `Domani: ${esc(domani.slice(0, 3).map(p => p.nome).join(", "))}${domani.length > 3 ? ` e altre ${domani.length - 3}` : ""}` : "Nessuna annaffiatura domani"}${stagioneInv() ? " · ritmo invernale" : ""}</span></div>
    <svg class="waves" viewBox="0 0 400 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 T250 6 T300 6 T350 6 T400 6 V10 H0z" fill="var(--water-soft)"/></svg>
  </section>

  ${oggi.length ? `<div class="section-h"><h2>Da annaffiare</h2><small>${oggi.length}</small></div>
  <div class="thirsty" id="thirsty">
    ${oggi.map((p, i) => `<div class="trow" style="--i:${i}" data-id="${p.id}">
      <button class="mini" data-open="${p.id}" aria-label="Apri ${esc(p.nome)}">${pic(p)}</button>
      <button class="t" data-open="${p.id}" style="text-align:left"><b>${esc(p.nome)}</b><small>${mancano(p) < 0 ? `in ritardo di ${-mancano(p)} ${mancano(p) === -1 ? "giorno" : "giorni"}` : "oggi"}${p.stanza ? " · " + esc(p.stanza) : ""}</small></button>
      <button class="wbtn" data-water="${p.id}">${ICO.drop}Fatto</button>
    </div>`).join("")}
    ${oggi.length > 1 ? `<button class="allbtn" id="water-all">Le ho annaffiate tutte</button>` : ""}
  </div>` : ""}

  <div class="section-h"><h2>In casa</h2><small>${tot} ${tot === 1 ? "pianta" : "piante"}</small></div>
  ${tot > 6 || elencoStanze.length > 1 ? `<div class="tools" style="margin-top:0;margin-bottom:12px">
    ${tot > 6 ? `<div class="search">${ICO.search}<input id="cerca" type="search" placeholder="Cerca per nome, tipo o stanza" value="${esc(cerca)}" autocomplete="off" enterkeyhint="search"></div>` : ""}
    ${elencoStanze.length > 1 ? `<div class="rooms">${["", ...elencoStanze].map(s => `<button class="chip-f" data-room="${esc(s)}" aria-pressed="${s === filtro}">${s ? esc(s) : "Tutte"}</button>`).join("")}</div>` : ""}
  </div>` : ""}
  <div class="grid" id="grid">
    ${visibili.map((p, i) => { const m = mancano(p);
      return `<button class="card" style="--i:${Math.min(i, 12)}" data-open="${p.id}">
        <div class="pic">${pic(p)}${m <= 1 ? `<span class="badge ${m <= 0 ? "due" : "soon"}">${m <= 0 ? "Ha sete" : "Domani"}</span>` : ""}</div>
        <div class="meta"><div class="txt"><div class="name">${esc(p.nome)}</div><div class="kind">${esc(p.stanza || specie(p).n)}</div></div>${ring(Math.max(0, m) / ogni(p), m <= 0 ? "0g" : m + "g")}</div>
      </button>`; }).join("") || `<div class="nores">Nessuna pianta trovata</div>`}
  </div>`;

  const inp = $("#cerca");
  if (inp) inp.oninput = e => { cerca = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#cerca"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} };
  $$("[data-room]").forEach(b => b.onclick = () => { filtro = b.dataset.room; render(); });
  const all = $("#water-all");
  if (all) all.onclick = () => annaffiaTutte(oggi);
}

$("#main").addEventListener("click", e => {
  const w = e.target.closest("[data-water]");
  if (w) { const p = piante.find(x => x.id === w.dataset.water); const row = w.closest(".trow"); row.classList.add("gone"); setTimeout(() => annaffia(p), 280); return; }
  const o = e.target.closest("[data-open]");
  if (o) scheda(o.dataset.open);
});

/* ---------- Annaffiare ---------- */
function annaffia(p, dalla) {
  const prima = { last: p.last, storia: [...p.storia] };
  p.last = now();
  p.storia = [p.last, ...p.storia].slice(0, 60);
  salva(p);
  render();
  if (navigator.vibrate) navigator.vibrate(12);
  toast(`${p.nome} ringrazia`, () => { Object.assign(p, prima); salva(p); render(); if (schedaAperta === p.id) scheda(p.id, true); });
}
function annaffiaTutte(lista) {
  const prima = lista.map(p => ({ p, last: p.last, storia: [...p.storia] }));
  $$(".trow").forEach((r, i) => setTimeout(() => r.classList.add("gone"), i * 50));
  setTimeout(() => {
    lista.forEach(p => { p.last = now(); p.storia = [p.last, ...p.storia].slice(0, 60); salva(p); });
    render();
    toast(`${lista.length} piante annaffiate`, () => { prima.forEach(x => { x.p.last = x.last; x.p.storia = x.storia; salva(x.p); }); render(); });
  }, 280 + lista.length * 50);
}

/* ---------- Foglio dal basso ---------- */
let foglioAperto = false, viewerAperto = false, schedaAperta = null;
function apri(html, label) {
  const sh = $("#sheet");
  sh.innerHTML = `<div class="grab"></div>` + html;
  sh.setAttribute("aria-label", label || "");
  sh.scrollTop = 0;
  if (!foglioAperto) { history.pushState({ foglio: 1 }, ""); foglioAperto = true; }
  $("#scrim").classList.add("on");
  requestAnimationFrame(() => sh.classList.add("on"));
}
function chiudiFoglio() { if (foglioAperto) history.back(); }
function _chiudiFoglio() {
  foglioAperto = false; schedaAperta = null;
  $("#sheet").classList.remove("on");
  $("#scrim").classList.remove("on");
}
window.addEventListener("popstate", () => {
  if (viewerAperto) { viewerAperto = false; $("#viewer").classList.remove("on"); return; }
  if (foglioAperto) _chiudiFoglio();
});
$("#scrim").onclick = chiudiFoglio;
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (viewerAperto || foglioAperto) history.back(); } });

/* Trascinare giù per chiudere */
(() => {
  const sh = $("#sheet"); let y0 = null, dy = 0;
  sh.addEventListener("touchstart", e => { if (sh.scrollTop <= 0 && !e.target.closest("input,textarea,select,.sp-list")) { y0 = e.touches[0].clientY; dy = 0; } else y0 = null; }, { passive: true });
  sh.addEventListener("touchmove", e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { e.preventDefault(); sh.classList.add("drag"); sh.style.transform = `translateY(${dy}px)`; }
  }, { passive: false });
  sh.addEventListener("touchend", () => {
    if (y0 === null) return;
    sh.classList.remove("drag"); sh.style.transform = "";
    if (dy > 110) chiudiFoglio();
    y0 = null;
  });
})();

/* ---------- Scheda della pianta ---------- */
async function scheda(id, senzaAnim) {
  const p = piante.find(x => x.id === id);
  if (!p) return;
  schedaAperta = id;
  const s = specie(p), m = mancano(p);
  apri(`
    <div class="hero" id="hero">${pic(p)}<button class="close" data-close aria-label="Chiudi">${ICO.x}</button></div>
    <h3>${esc(p.nome)}</h3><div class="latin">${p.sp === "altro" ? esc(p.sci || s.n) : esc(s.n) + " · " + esc(p.sci || s.l)}</div>
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
    ${p.note ? `<div class="block-h">Note</div><div class="note-p">${esc(p.note)}</div>` : ""}
    <div class="block-h">Le sue foto <small id="nfoto"></small></div>
    <div class="album" id="album"><label class="add" for="foto-in">${ICO.cam}Aggiungi<br>foto</label></div>
    <input type="file" id="foto-in" accept="image/*" hidden>
    <div class="block-h">Annaffiature</div>
    <div class="history">${p.storia.slice(0, 6).map((t, i) => `<div>${i === 0 ? "Ultima" : "Annaffiata"}<span>${fmt(t)}</span></div>`).join("") || `<div>Ancora nessuna<span></span></div>`}</div>
    <button class="btn ghost" id="modifica" style="margin-top:22px">Modifica pianta</button>
  `, "Scheda di " + p.nome);
  $("#sheet [data-close]").onclick = chiudiFoglio;
  $("#annaffia").onclick = e => animaAcqua(p, e);
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
async function caricaAlbum(p) {
  const foto = (await DB.fotoDi(p.id)).sort((a, b) => b.t - a.t);
  if (schedaAperta !== p.id) return;
  $("#nfoto").textContent = foto.length === 1 ? "1 foto" : `${foto.length} foto`;
  const cover = foto.find(f => f.id === p.coverId);
  if (cover) { const h = $("#hero img"); if (h) h.src = urlDi(cover); }
  $("#album").insertAdjacentHTML("afterbegin", foto.map((f, i) =>
    `<button class="ph${f.id === p.coverId ? " is-cover" : ""}" data-foto="${f.id}" style="animation-delay:${i * 40}ms"><img src="${urlDi(f)}" alt="Foto del ${fmt(f.t)}"><i>${fmt(f.t)}</i></button>`).join(""));
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
        if (p.coverId === f.id) { const resto = (await DB.fotoDi(p.id)).sort((a, b) => b.t - a.t); p.coverId = resto[0]?.id || null; p.thumb = resto[0] ? await miniatura(resto[0].blob) : null; await salva(p); render(); }
        history.back(); setTimeout(() => scheda(p.id, true), 50); toast("Foto eliminata");
      });
    } else { b.dataset.sure = 1; b.textContent = "Tocca ancora per eliminare"; b.style.background = "var(--warn)"; }
  };
}

function animaAcqua(p, e) {
  const b = e.currentTarget, r = b.getBoundingClientRect(), rp = document.createElement("span"), sz = Math.max(r.width, r.height) * 2;
  rp.className = "ripple"; rp.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - r.left - sz / 2}px;top:${e.clientY - r.top - sz / 2}px`;
  b.appendChild(rp); setTimeout(() => rp.remove(), 700);
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
        piante = piante.filter(x => x.id !== p.id);
        chiudiFoglio(); render(); toast("Pianta eliminata");
      };
    };
  }

  $("#f-salva").onclick = async () => {
    if (!st.sp) { toast("Scegli il tipo di pianta (o \"Altra pianta\")"); $("#sp-cerca").focus(); return; }
    const nome = $("#f-nome").value.trim() || (st.sp === "altro" && st.comune) || SPECIE[st.sp].n;
    const stanza = $("#f-stanza").value.trim();
    const note = $("#f-note").value.trim();
    if (nuova) {
      const q = +$("#f-quando").value;
      const np = { id: nuovoId(), nome, sp: st.sp, sci: st.sci || "", stanza, e: st.e, i: st.i, note, creata: now(), storia: [], thumb: null, coverId: null };
      np.last = q >= 0 ? inizioGiorno(now()) - q * DAY + 12 * 36e5 : now() - (stagioneInv() ? st.i : st.e) * DAY;
      if (q >= 0) np.storia = [np.last];
      if (st.foto) {
        const ft = { id: nuovoId(), pianta: np.id, t: now(), blob: st.foto.blob };
        await DB.put("foto", ft); np.coverId = ft.id; np.thumb = st.foto.thumb;
      }
      await salva(np); piante.push(np);
      chiudiFoglio(); render(); toast("Benvenuta in casa!");
    } else {
      Object.assign(p, { nome, sp: st.sp, stanza, e: st.e, i: st.i, note });
      await salva(p); render(); scheda(p.id, true); toast("Salvato");
    }
  };
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

/* ---------- Impostazioni e copia di sicurezza ---------- */
function impostazioni() {
  const installata = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  apri(`
    <h3 style="margin-top:4px">Impostazioni</h3>
    ${installata ? "" : `<div class="tip" style="margin-top:14px"><b>Usala come un'app</b>In Safari tocca Condividi, poi "Aggiungi alla schermata Home". Così si apre a tutto schermo, anche senza rete.</div>`}
    <div class="switch"><div><b>Ritmo stagionale</b><small>Da ottobre a marzo usa i giorni "d'inverno", perché le piante bevono meno</small></div><input type="checkbox" id="sw-stag" ${imp.stagioni ? "checked" : ""} aria-label="Ritmo stagionale"></div>
    <div class="switch"><div><b>Promemoria sul telefono</b><small>In arrivo: un avviso al mattino quando una pianta ha sete</small></div><input type="checkbox" disabled aria-label="Promemoria (in arrivo)"></div>
    <div class="block-h">Copia di sicurezza</div>
    <p class="note" style="margin-top:0">Le piante e le foto sono salvate solo su questo telefono. Ogni tanto fai una copia e tienila in File o su iCloud Drive.</p>
    <div class="list-set">
      <button class="btn ghost" id="b-salva">Salva una copia</button>
      <label class="btn ghost" for="b-file" style="margin-top:0">Ripristina da una copia</label>
      <input type="file" id="b-file" accept="application/json,.json" hidden>
      <div id="b-conf"></div>
    </div>
    <button class="btn water" id="ok-set" style="margin-top:20px">Fatto</button>
    <p class="about">Fronda · versione 2 · ${piante.length} ${piante.length === 1 ? "pianta" : "piante"}</p>
  `, "Impostazioni");
  $("#sw-stag").onchange = e => { imp.stagioni = e.target.checked; salvaImp(); render(); };
  $("#ok-set").onclick = chiudiFoglio;
  $("#b-salva").onclick = esportaCopia;
  $("#b-file").onchange = e => { const f = e.target.files[0]; if (f) chiediRipristino(f); e.target.value = ""; };
}

const blobInData = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
async function esportaCopia() {
  const b = $("#b-salva"); b.textContent = "Preparo la copia…"; b.disabled = true;
  try {
    const foto = await DB.all("foto");
    const dati = { app: "fronda", versione: 1, creata: new Date().toISOString(), impostazioni: imp, piante,
      foto: await Promise.all(foto.map(async f => ({ id: f.id, pianta: f.pianta, t: f.t, data: await blobInData(f.blob) }))) };
    const nome = `fronda-copia-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(dati)], nome, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Copia di Fronda" }).catch(() => {});
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = nome;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    toast("Copia pronta");
  } catch (e) { toast("Non sono riuscito a fare la copia"); }
  b.textContent = "Salva una copia"; b.disabled = false;
}
function chiediRipristino(file) {
  const r = new FileReader();
  r.onload = () => {
    let d; try { d = JSON.parse(r.result); } catch (e) {}
    if (!d || d.app !== "fronda" || !Array.isArray(d.piante)) { toast("Questo file non è una copia di Fronda"); return; }
    $("#b-conf").innerHTML = `<div class="confirm"><p>La copia ha <b>${d.piante.length} piante</b> e ${d.foto?.length || 0} foto. Sostituisce tutto quello che c'è adesso sul telefono.</p>
      <div class="row2"><button class="btn ghost" id="r-no">Annulla</button><button class="btn warn" id="r-si">Ripristina</button></div></div>`;
    $("#r-no").onclick = () => $("#b-conf").innerHTML = "";
    $("#r-si").onclick = async () => {
      await DB.clear("piante"); await DB.clear("foto");
      for (const p of d.piante) await DB.put("piante", p);
      for (const f of d.foto || []) { const blob = await (await fetch(f.data)).blob(); await DB.put("foto", { id: f.id, pianta: f.pianta, t: f.t, blob }); }
      if (d.impostazioni) { imp = Object.assign({ stagioni: true }, d.impostazioni); salvaImp(); }
      piante = await DB.all("piante"); urlFoto.clear();
      chiudiFoglio(); render(); toast("Copia ripristinata");
    };
  };
  r.readAsText(file);
}

/* ---------- Avvisi in basso ---------- */
let tt;
function toast(t, annulla) {
  const el = $("#toast");
  el.innerHTML = esc(t) + (annulla ? ` <button id="t-undo" style="color:var(--water-soft);font-weight:700;margin-left:8px;pointer-events:auto">Annulla</button>` : "");
  el.style.pointerEvents = annulla ? "auto" : "none";
  if (annulla) $("#t-undo").onclick = () => { annulla(); el.classList.remove("on"); };
  el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), annulla ? 4500 : 2200);
}

/* ---------- Avvio ---------- */
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("visibilitychange", () => { if (!document.hidden && piante.length) render(); });
$("#open-add").onclick = () => formPianta();
$("#open-settings").onclick = impostazioni;

(async () => {
  try {
    await DB.open();
    piante = await DB.all("piante");
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) {
    toast("Il telefono non lascia salvare i dati: forse è una finestra privata");
  }
  render();
})();

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
