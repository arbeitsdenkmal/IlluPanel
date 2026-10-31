// Gemeinsame Bausteine des Gesamtlaufs: Pfade, Einstellungen, Ports aus .debug, Remote-Debugging (CDP), JSX über das Panel, Protokoll je Prüfschritt.
// Nur für tests/illustrator (Gesamtlauf); schreibt ausschließlich unter tests/out/.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const require = createRequire(import.meta.url);
export const TI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT = path.resolve(TI, "..", "..");
export const OUT = path.join(ROOT, "tests", "out");
export const GL = path.join(OUT, "gesamtlauf");
const tilde = p => String(p).replace(/^~(?=\/|$)/, os.homedir());
const roh = JSON.parse(fs.readFileSync(path.join(TI, "einstellungen.json"), "utf8"));
export const E = { ...roh, musterdateien: tilde(roh.musterdateien) };
export const DATEI = {
  status: path.join(GL, "status.json"),
  ergebnis: path.join(GL, "ergebnis.jsonl"),
  meldungen: path.join(GL, "meldungen.jsonl"),
  schalter: path.join(os.tmpdir(), "de.pamnm.illupanels.test.json"),
  helfer: path.join(TI, "helfer.jsx")
};
// Ablageziele des Test-rechner.json (alle unter tests/out)
export const ZIEL = {
  kunden: path.join(OUT, "server", "Kunden A-Z"),
  dtf: path.join(OUT, "server", "dtf_bestellen"),
  wmd: path.join(OUT, "server", "wmd_bestellen"),
  arbeitsdateien: path.join(OUT, "lokal", "arbeitsdateien"),
  ausgang: path.join(OUT, "lokal", "ausgang")
};
export const RECHNERORDNER = path.join(os.homedir(), "Library", "Application Support", "PAM-Werkzeuge");

// Ports aus .debug: Kurzname (Teil nach de.pamnm.illupanels.) -> Port
export const PORT = (() => {
  const x = fs.readFileSync(path.join(ROOT, ".debug"), "utf8"), r = {};
  for (const m of x.matchAll(/Extension Id="de\.pamnm\.illupanels\.(\w+)"[\s\S]*?Port="(\d+)"/g)) r[m[1]] = Number(m[2]);
  return r;
})();
export const KONFIG = n => JSON.parse(fs.readFileSync(path.join(ROOT, "config", n), "utf8"));

export const warte = ms => new Promise(r => setTimeout(r, ms));
export const mitLimit = (s, cmd, args, opts = {}) => execFileSync("perl", ["-e", "alarm shift; exec @ARGV", String(s), cmd, ...args], { encoding: "utf8", ...opts });

// ---------- Remote-Debugging ----------
const verbindungen = new Map();
async function ziele(port) {
  const r = await fetch(`http://localhost:${port}/json`, { signal: AbortSignal.timeout(E.verbindung_s * 1000) });
  return (await r.json()).filter(t => t.type === "page" && t.webSocketDebuggerUrl);
}
export async function offen(name) { try { return (await ziele(PORT[name])).length > 0; } catch (e) { return false; } }
async function verbindung(port) {
  if (verbindungen.has(port)) return verbindungen.get(port);
  const t = (await ziele(port))[0];
  if (!t) throw new Error(`kein Ziel auf Port ${port}`);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  const v = { ws, id: 0, offen: new Map() };
  ws.onmessage = e => { const m = JSON.parse(e.data); const f = v.offen.get(m.id); if (f) { v.offen.delete(m.id); f(m); } };
  ws.onclose = () => { verbindungen.delete(port); for (const f of v.offen.values()) f({ error: { message: "Verbindung geschlossen" } }); v.offen.clear(); };
  await new Promise((ok, nein) => {
    const t = setTimeout(() => { try { ws.close(); } catch (e) { /* zu */ } nein(new Error(`Port ${port}: keine Verbindung nach ${E.verbindung_s} s`)); }, E.verbindung_s * 1000);
    ws.onopen = () => { clearTimeout(t); ok(); };
    ws.onerror = () => { clearTimeout(t); nein(new Error(`Port ${port}: Verbindung fehlgeschlagen`)); };
  });
  verbindungen.set(port, v);
  return v;
}
export async function cdp(port, method, params = {}, ms = 110000) {
  const v = await verbindung(port);
  return new Promise((ok, nein) => {
    const i = ++v.id;
    const t = setTimeout(() => { v.offen.delete(i); nein(new Error(`Zeitlimit ${method} auf Port ${port}`)); }, ms);
    v.offen.set(i, m => { clearTimeout(t); m.error ? nein(new Error(m.error.message)) : ok(m.result); });
    v.ws.send(JSON.stringify({ id: i, method, params }));
  });
}
// Ausdruck im Fenster name auswerten (Promises werden abgewartet), Ergebnis als Wert
export async function ev(name, expr, ms) {
  const r = await cdp(PORT[name], "Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, ms);
  if (r.exceptionDetails) throw new Error(`${name}: ${(r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text}`);
  return r.result ? r.result.value : undefined;
}
export const evStill = async (name, expr, standard = null) => { try { return await ev(name, expr, 20000); } catch (e) { return standard; } };
export function trennen() { for (const v of verbindungen.values()) { try { v.ws.close(); } catch (e) { /* zu */ } } verbindungen.clear(); }
export async function bildschirmfoto(name, datei) {
  const r = await cdp(PORT[name], "Page.captureScreenshot", { format: "png" }, 20000);
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, Buffer.from(r.data, "base64"));
}
// Klick zeitversetzt, damit der Aufruf sofort zurückkommt (lange Aktionen blockieren die Seite)
export const klick = (name, sel) => ev(name, `(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; setTimeout(()=>e.click(),10); return true; })()`);
export const istAn = (name, sel, prop) => ev(name, `(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); return e ? !!e.${prop} : null; })()`);
export async function eingabe(name, sel, wert, ereignis = "input") {
  return ev(name, `(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.value=${JSON.stringify(String(wert))}; e.dispatchEvent(new Event(${JSON.stringify(ereignis)},{bubbles:true})); return true; })()`);
}
export const taste = (name, key, sel = null) => ev(name, `(()=>{ const t=${sel ? `document.querySelector(${JSON.stringify(sel)})` : "document.activeElement||document"}; (t||document).dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(key)},bubbles:true,cancelable:true})); return true; })()`);
export async function bis(f, ms = 15000, schritt = 300) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await f()) return true; } catch (e) { /* weiter */ } await warte(schritt); }
  return false;
}

// ---------- Panel ----------
export const abruf = () => evStill("panel", `document.documentElement.dispatchEvent(new MouseEvent("mouseenter")); true`);
export const panelFrei = () => ev("panel", `!document.body.classList.contains("besch")`);
export async function panelFertig(ms = 110000) { await warte(400); return bis(panelFrei, ms, 400); }
// Abruf und warten, bis die Anzeige steht
export async function panelNeu() { await abruf(); await warte(600); await bis(panelFrei, 30000); await warte(300); }
export const panelZustand = () => ev("panel", `(()=>{ const z = id => { const e = document.getElementById(id); return e ? { text: e.innerText.trim(), sichtbar: !e.hidden && e.offsetParent !== null, gesperrt: !!e.disabled, akzent: e.classList.contains("akzent") } : null; };
  return { kopf: document.getElementById("kopf").innerText.trim(), grafik: z("grafikMin"), grafikZeile: !document.getElementById("grafik").hidden, objName: z("objName"), objFolie: z("objFolie"), objAnzahl: z("objAnzahl"),
    zuordnen: z("btnZuordnen"), berechnen: z("btnBerechnen"), schilder: z("btnSchilder"), farbe: z("btnFarbe"), modell: z("btnModell"), summa: z("btnSumma"), druck: z("btnDruck"),
    export: z("btnExport"), auftrag: z("btnAuftrag"), preisMaterial: z("preisMaterial"), preisMontage: z("preisMontage"), breite: z("btnBreite"), masken: z("btnMasken"), nutzen: z("btnNutzen"),
    menue: window.PAM_TEST ? PAM_TEST.menue() : null }; })()`);

// ---------- JSX ----------
// Zwei Kanäle (Erfahrung folienkalkulation): Dokumentzugriffe direkt per osascript „do javascript“ in Illustrators Skript-Umgebung, das Panel nur für
// die Oberfläche. Ein blockiertes Panel (z. B. offener Skript-Dialog) nimmt so die Dokumentprüfungen nicht mit.
const AS_JS = `on run argv
  tell application id "com.adobe.illustrator"
    with timeout of (item 2 of argv) seconds
      return do javascript (item 1 of argv)
    end timeout
  end tell
end run`;
// JSX-Code ausführen, Rückgabe = letzter Ausdruck als Text; Zeitlimit s (osascript zusätzlich hart begrenzt)
export function osaJsx(code, s = E.zeitgrenze_schritt_s - 10) {
  return mitLimit(s + 5, "osascript", ["-e", AS_JS, code, String(s)], { maxBuffer: 64 * 1024 * 1024 }).replace(/\n$/, "");
}
// JSX über das Panel (nur für Prüfungen, die das Panel selbst betreffen)
export async function jsx(code, ms = 110000, fenster = "panel") {
  return ev(fenster, `PAM.evalRoh(${JSON.stringify(code)})`, ms);
}
// TH.<fn>(…) aus tests/illustrator/helfer.jsx per osascript; Antwort { ok, … }. Der Helfer wird neu geladen, wenn sich die Datei geändert hat.
export async function th(fn, ...args) {
  const stand = JSON.stringify(String(fs.statSync(DATEI.helfer).mtimeMs));
  const laden = `if (typeof TH === "undefined" || TH.stand !== ${stand}) { $.global.TH_STAND = ${stand}; $.evalFile(File(${JSON.stringify(DATEI.helfer)})); }`;
  let r;
  try { r = osaJsx(`${laden} TH.${fn}(${args.map(a => JSON.stringify(a)).join(",")})`); }
  catch (e) { throw new Error(`TH.${fn}: osascript ${String(e.stderr || e.message).split("\n")[0].slice(0, 300)}`); }
  let o; try { o = JSON.parse(r); } catch (e) { throw new Error(`TH.${fn}: Antwort nicht lesbar: ${String(r).slice(0, 300)}`); }
  if (!o.ok) throw new Error(`TH.${fn}: ${o.error}`);
  return o;
}
export const thIn = (fenster, fn, ...args) => th(fn, ...args); // früher über ein Fenster; Dokumentzugriffe laufen jetzt immer per osascript
// ip:Dokument des vorderen bzw. benannten Dokuments als Objekt (oder null)
export async function xmpVon(name = null) { const r = await th("xmp", name); return r.text ? JSON.parse(r.text) : null; }

// ---------- Protokoll ----------
export const ctx = { abschnitt: process.env.GL_ABSCHNITT || "?", schritt: null };
function anhaengen(o) { fs.mkdirSync(GL, { recursive: true }); fs.appendFileSync(DATEI.ergebnis, JSON.stringify({ zeit: new Date().toISOString(), ...o }) + "\n"); }
export function statusSetzen(o) { fs.mkdirSync(GL, { recursive: true }); fs.writeFileSync(DATEI.status, JSON.stringify({ ...o, pid: process.pid })); }
export async function schritt(name, fn) {
  ctx.schritt = name;
  statusSetzen({ abschnitt: ctx.abschnitt, schritt: name, start: Date.now() });
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${ctx.abschnitt} · ${name}`);
  try { await fn(); } catch (e) { pruefe("Ablauf ohne Ausnahme", false, e.message); }
  statusSetzen({ abschnitt: ctx.abschnitt, schritt: null, start: Date.now() });
}
// Teilschritt: die Zeitgrenze (120 s) gilt je Aktion; der Wächter sieht Schritt · Aktion
export function aktion(label) { statusSetzen({ abschnitt: ctx.abschnitt, schritt: `${ctx.schritt} · ${label}`, start: Date.now() }); }
export function pruefe(name, ok, befund = "") {
  const b = typeof befund === "string" ? befund : JSON.stringify(befund);
  anhaengen({ abschnitt: ctx.abschnitt, schritt: ctx.schritt, pruefung: name, status: ok ? "ok" : "Fehler", befund: b });
  console.log(`  ${ok ? "ok    " : "FEHLER"} ${name}${b ? " – " + b.slice(0, 400) : ""}`);
  return !!ok;
}
export function uebersprungen(name, grund) {
  anhaengen({ abschnitt: ctx.abschnitt, schritt: ctx.schritt, pruefung: name, status: "übersprungen", befund: grund });
  console.log(`  übersp. ${name} – ${grund}`);
}
export const protokollEintrag = anhaengen;

// ---------- Meldungen (Testschalter) ----------
export function meldungen() {
  try { return fs.readFileSync(DATEI.meldungen, "utf8").split("\n").filter(Boolean).map(z => JSON.parse(z)); } catch (e) { return []; }
}
export const marke = () => meldungen().length;
export const meldungenSeit = m => meldungen().slice(m);
export const meldungsText = m => meldungenSeit(m).filter(x => x.art === "meldung").map(x => x.text).join(" ¶ ");
// Antworten für Datei-, Ordnerdialoge und Rückfragen setzen (Testschalter-Datei)
export function antworten(a) {
  const t = JSON.parse(fs.readFileSync(DATEI.schalter, "utf8"));
  t.antworten = { ...(t.antworten || {}), ...a };
  fs.writeFileSync(DATEI.schalter, JSON.stringify(t));
}

// ---------- Dateien ----------
export function pdfInfo(datei) {
  const out = execFileSync("python3", [path.join(TI, "lib", "pdfinfo.py"), datei], { encoding: "utf8" });
  return JSON.parse(out);
}
export const existiert = p => fs.existsSync(p);
export function liste(ordner) { try { return fs.readdirSync(ordner).filter(n => !n.startsWith(".")).sort(); } catch (e) { return []; } }
export function alleDateien(ordner) {
  const r = [];
  (function lauf(o) { for (const n of liste(o)) { const p = path.join(o, n); if (fs.statSync(p).isDirectory()) lauf(p); else r.push(path.relative(ordner, p)); } })(ordner);
  return r.sort();
}
export async function xmpAusDatei(datei) { return require(path.join(ROOT, "panel", "lib", "dokument_xmp.js")).dokumentAusDatei(datei); }
export const heute = () => { const d = new Date(), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
export const monat = () => heute().slice(0, 7);
export const muster = (...teile) => path.join(E.musterdateien, ...teile);
// Arbeitskopie einer Musterdatei unter tests/out/vorlagen (Musterdateien werden nur gelesen)
export function arbeitskopie(quelle, name = path.basename(quelle)) {
  const ziel = path.join(OUT, "vorlagen", name);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.copyFileSync(quelle, ziel);
  return ziel;
}
export const nah = (a, b, tol = 0.1) => Math.abs(Number(a) - Number(b)) <= tol;
