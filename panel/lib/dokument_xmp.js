/* Dokumentobjekt des aktiven Dokuments ohne Abfrage an Illustrator (SPEZ_02 §12, Hintergrund-Extension), übernommen aus dem alten Projekt und auf
 * Schema 1 umgestellt: Pfad aus den Daten der Dokument-Ereignisse (<url>file://…</url>), ip:Dokument (Namespace 2.0, JSON-Text) per Node aus dem XMP
 * der gespeicherten Datei – nur lesend, stückweise, Schluss beim ersten XMP-Paket mit dem IP-Namensraum. Ergebnis je Pfad nach Änderungszeit und
 * Größe zwischengespeichert. Namespace und Eigenschaft nur aus config/schema.json. */
"use strict";
const fs = require("fs");
const path = require("path");
const D = require("./dokument");

const XMP = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "config", "schema.json"), "utf8")).xmp;
const NS = XMP.namespace;
const STUECK = 1 << 20;
const PAKET_MAX = 4 << 20; // ein unvollständiges Paket über 4 MB gilt als kaputt
const ANFANG = Buffer.from("<x:xmpmeta"), ENDE = Buffer.from("</x:xmpmeta>");

const entities = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (g, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    : { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" }[e.toLowerCase()]);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pfad des Dokuments aus event.data; "" bei ungespeichertem Dokument oder ohne Angabe. Windows: file:///C:/… bzw. file://server/freigabe/… */
function pfadAusEreignis(data) {
  const m = /<url>([\s\S]*?)<\/url>/.exec(String(data || ""));
  if (!m) return "";
  const roh = entities(m[1].trim()).replace(/^file:\/\//, "");
  let dekodiert = roh;
  try { dekodiert = decodeURIComponent(roh); } catch (e) { }
  const kandidaten = [];
  for (const p of [dekodiert, roh]) {
    if (/^\/?[A-Za-z]:[\\/]/.test(p)) kandidaten.push(path.win32.normalize(p.replace(/^\//, "")));
    else if (p.startsWith("//")) kandidaten.push(`\\\\${p.replace(/^\/+/, "").replace(/\//g, "\\")}`); // UNC (file:////server/…)
    else if (p.startsWith("/")) kandidaten.push(p); // POSIX
    else if (p.includes("/")) kandidaten.push(`\\\\${p.replace(/\//g, "\\")}`); // UNC (file://server/…)
  }
  for (const p of kandidaten) { try { if (fs.statSync(p).isFile()) return p; } catch (e) { } }
  return ""; // ungespeichert: nur Name oder leer
}

/** Text von ip:Dokument aus einem XMP-Paket (Attribut- oder Elementform) oder null */
function dokumentTextAusPaket(paket) {
  const px = new RegExp(`xmlns:([\\w.-]+)\\s*=\\s*["']${reEsc(NS)}["']`).exec(paket);
  if (!px) return null;
  const n = `${reEsc(px[1])}:${reEsc(XMP.eigenschaft)}`;
  const a = new RegExp(`${n}\\s*=\\s*"([^"]*)"`).exec(paket) || new RegExp(`${n}\\s*=\\s*'([^']*)'`).exec(paket)
    || new RegExp(`<${n}(?:\\s[^>]*)?>([^<]*)</${n}>`).exec(paket);
  return a ? entities(a[1]) : null;
}

/** Erstes XMP-Paket der Datei mit dem IP-Namensraum (als Text) oder null. */
async function paketLesen(pfad) {
  const fh = await fs.promises.open(pfad, "r");
  try {
    let puffer = Buffer.alloc(0), pos = 0;
    for (;;) {
      const stueck = Buffer.alloc(STUECK);
      const { bytesRead } = await fh.read(stueck, 0, STUECK, pos);
      if (!bytesRead) return null;
      pos += bytesRead;
      puffer = Buffer.concat([puffer, stueck.subarray(0, bytesRead)]);
      for (;;) {
        const a = puffer.indexOf(ANFANG);
        if (a < 0) { puffer = puffer.subarray(Math.max(0, puffer.length - ANFANG.length)); break; }
        const e = puffer.indexOf(ENDE, a);
        if (e < 0) { puffer = puffer.subarray(a); if (puffer.length > PAKET_MAX) puffer = puffer.subarray(ANFANG.length); break; }
        const paket = puffer.subarray(a, e + ENDE.length).toString("utf8");
        if (paket.includes(NS)) return paket;
        puffer = puffer.subarray(e + ENDE.length);
      }
    }
  } finally { await fh.close().catch(() => {}); }
}

const zwischen = new Map(); // pfad -> { stand, ergebnis }
/** Dokumentobjekt (ip:Dokument, Schema 1) der gespeicherten Datei oder null (kein Panel-Dokument, nicht lesbar). Wirft nie. */
async function dokumentAusDatei(pfad) {
  if (!pfad) return null;
  try {
    const st = await fs.promises.stat(pfad);
    const stand = `${st.mtimeMs}|${st.size}`, z = zwischen.get(pfad);
    if (z && z.stand === stand) return z.ergebnis;
    const paket = await paketLesen(pfad);
    let ergebnis = null;
    try { ergebnis = D.parsen(paket ? dokumentTextAusPaket(paket) : null); } catch (e) { ergebnis = null; }
    zwischen.set(pfad, { stand, ergebnis });
    return ergebnis;
  } catch (e) { return null; }
}

/** Schlüssel der Grafikzeit [M 11, B-14]: Druckbogen -> bogen.arbeitsdatei; jede andere Rolle -> der eigene Pfad; ohne Panel-XMP null */
function arbeitsdateiVon(pfad, o) {
  if (!pfad || !o) return null;
  if (o.rolle === "druckbogen") return o.bogen && typeof o.bogen.arbeitsdatei === "string" && o.bogen.arbeitsdatei ? o.bogen.arbeitsdatei : null;
  return pfad;
}
/** Pfad der Arbeitsdatei, der die Zeit im Dokument pfad gutgeschrieben wird, oder null. Wirft nie. */
async function arbeitsdateiAusDatei(pfad) { return arbeitsdateiVon(pfad, await dokumentAusDatei(pfad)); }

module.exports = { pfadAusEreignis, dokumentTextAusPaket, dokumentAusDatei, arbeitsdateiVon, arbeitsdateiAusDatei };
