/* Auftragsart Textil (SPEZ_03_Textil) – reine Logik ohne Illustrator, aus dem alten Projekt (panel/lib/textil.js) übernommen: CSV-Lesen
 * (textil_stufen.csv, textil_modelle.csv, textil_farben.csv) und Prüfung von config/textil.json, Positionen, Anker-Modus, Verfahren, Faktor des Modells,
 * Maße je Position, Kinderformel, Höhenhinweis, Prüfung im Fenster „Motiv“, Dateinamen, Namen im Blocksatz, Infos-Zeilen, Export-Prüfungen.
 * Entfallen gegenüber dem alten Projekt: flexStreifen/streifenAnzahl (Streifen über das Nesting), MARKEN (config/textil.json „marken“), Namensvergabe.
 * Maße in mm. Fehler der Dateien als Liste { datei, grund } wie konfiguration.js (grund mit Zeilennummer, Kopfzeile = Zeile 1). */
"use strict";
const fs = require("fs");
const path = require("path");

// ---------- Positionen (Stand des gebauten Codes, SPEZ_03_Textil §3.3) ----------
// stufen = Zeile in textil_stufen.csv; anker = Objektname auf Ebene „Anker“ (Pfad mit genau einem Punkt)
const POSITIONEN = [
  { name: "Brust links", stufen: "Brust klein", anker: "Brust_links", hinweis: "brust_klein" },
  { name: "Brust rechts", stufen: "Brust klein", anker: "Brust_rechts", hinweis: "brust_klein" },
  { name: "Brust mittig", stufen: "Brust klein", anker: "Brust_Mitte", hinweis: "brust_klein" },
  { name: "Front", stufen: "Front", anker: "Brust_Mitte_Oben" },
  { name: "Rücken", stufen: "Rücken", anker: "Rücken_Mitte", hinweis: "ruecken" },
  { name: "Rücken oben", stufen: "Rücken oben" },
  { name: "Rücken unten", stufen: "Rücken unten" },
  { name: "vorne unten", stufen: "vorne unten" },
  { name: "Nacken", stufen: "Nacken", anker: "Rücken_Oben" },
  { name: "Ärmel links", stufen: "Ärmel" },
  { name: "Ärmel rechts", stufen: "Ärmel" },
  { name: "Sponsor", stufen: "Sponsor" },
  { name: "Namen", stufen: "Namen" }
];
/** Ausrichtung nach dem Ankernamen: endet auf „_Oben“ -> Oberkante auf den Anker, horizontal mittig; sonst Mitte auf den Anker */
const ankerModus = anker => (anker ? (/_Oben$/.test(anker) ? "oberkante" : "mitte") : null);
// Verfahren (§2.3): Reihenfolge der Buttons und der Zeile „Druck:“; geschnitten und kalkuliert nur Flex/Flock; blockout nicht bei Stick
const VERFAHREN = ["DTF", "Flex", "Flock", "Stick"];
const GESCHNITTEN = ["Flex", "Flock"];
const istGeschnitten = v => GESCHNITTEN.includes(v);
const blockoutMoeglich = v => v === "DTF" || istGeschnitten(v);
const position = n => POSITIONEN.find(p => p.name === n) || null;
/** Verfahren je Position: Namen nur DTF */
const verfahrenFuer = pos => (pos === "Namen" ? ["DTF"] : VERFAHREN.slice());
/** Farbschlüssel eines Flex-/Flock-Teils (§5.1): <Serie>-<Flexfarbe> */
const farbschluessel = (serie, farbe) => `${serie}-${farbe}`;

// ---------- Tags (§5.1) ----------
const jsonVon = (t, leer) => { try { const v = JSON.parse(t || ""); return v === null || typeof v !== "object" ? leer : v; } catch (e) { return leer; } };
/** IP_Stufen -> Druckgrößen [{ mass_mm, bezug, menge, groessen, blockout, zeigen }] */
const stufenVon = tags => { const s = jsonVon(tags && tags.stufen, []); return Array.isArray(s) ? s : []; };
/** IP_Farbe -> { <colorKey>: <Flexfarbe> } */
const farbenVon = tags => { const f = jsonVon(tags && tags.farbe, {}); return Array.isArray(f) ? {} : f; };
/** Motiv zugeordnet = IP_Position und IP_Verfahren gesetzt */
const zugeordnet = o => !!(o && o.tags && o.tags.position && o.tags.verfahren);
/** Σ Menge aller Druckgrößen (Marke „×n“ im Panel) */
const mengeSumme = tags => stufenVon(tags).reduce((s, x) => s + (Number.isInteger(Number(x.menge)) && Number(x.menge) > 0 ? Number(x.menge) : 0), 0);

// ---------- Prüfung im Fenster „Motiv“ (§7) und erste offene Warnung ----------
/**
 * verf: Verfahren; stufen: Druckgrößen; flex (nur Flex/Flock): { sperren: [Grund], serie, farben: [Flexfarbe je Füllfarbe] }.
 * Reihenfolge: Verfahren wählen · Sperrgründe · Druckgröße n: Maß fehlt · Druckgröße n: Menge fehlt · Flexfarbe fehlt je offener Zeile · Serie fehlt
 */
function dialogProbleme(verf, stufen, flex) {
  const p = [], f = flex || {};
  if (!verf) p.push("Verfahren wählen");
  if (istGeschnitten(verf)) p.push(...(f.sperren || []));
  (stufen || []).forEach((s, i) => {
    if (!(Number(s.mass_mm) > 0)) p.push(`Druckgröße ${i + 1}: Maß fehlt`);
    if (!(Number.isInteger(Number(s.menge)) && Number(s.menge) > 0)) p.push(`Druckgröße ${i + 1}: Menge fehlt`);
  });
  if (istGeschnitten(verf)) {
    (f.farben || []).forEach(x => { if (!String(x || "").trim()) p.push("Flexfarbe fehlt"); });
    if (!f.serie) p.push("Serie fehlt");
  }
  return p;
}
/** In allen Dialogen nur die erste offene Warnung (leere Einträge zählen nicht) */
const ersteWarnung = liste => (liste || []).find(Boolean) || "";
/** Sperren wie Plott (SPEZ_02 §6) bei Flex/Flock: Konturen, Bilder, Verläufe, Transparenz; objekte mit blaetter aus IP.auswahlLesen */
function sperren(objekte) {
  const o = objekte || [], bl = o.flatMap(x => x.blaetter || []), p = [];
  if (bl.some(b => b.kontur)) p.push("Objekt enthält Konturen – bitte entfernen oder umwandeln");
  if (bl.some(b => b.bild)) p.push("Objekt enthält Bilder – bei Flex/Flock nicht möglich");
  if (bl.some(b => b.verlauf)) p.push("Objekt enthält Verläufe/Muster – bei Flex/Flock nicht möglich");
  if (o.some(x => x.transparenz) || bl.some(b => b.transparenz)) p.push("Objekt enthält Transparenz – bei Flex/Flock nicht möglich");
  return p;
}

// ---------- CSV (Semikolon, UTF-8, Dezimalkomma oder -punkt) ----------
/** Zahl; leer -> null, ungültig -> NaN */
const zahl = s => { const t = String(s == null ? "" : s).trim().replace(",", "."); return t === "" ? null : (/^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN); };
/** Zeilen mit Kopfzeile; eintrag(v, f) baut den Eintrag aus v(spalte) und meldet Gründe über f(grund). Ein Fehler verwirft die Liste. */
function csv(text, datei, spalten, eintrag) {
  const fehler = [], liste = [];
  const zeilen = String(text).replace(/^﻿/, "").split(/\r?\n/);
  const kopf = zeilen[0].split(";").map(x => x.trim());
  const fehlt = spalten.filter(s => !kopf.includes(s));
  if (fehlt.length) return { liste: null, fehler: [{ datei, grund: `Zeile 1: Spalte ${fehlt.join(", ")} fehlt in der Kopfzeile` }] };
  zeilen.slice(1).forEach((roh, i) => {
    if (!roh.trim()) return;
    const w = roh.split(";").map(x => x.trim()), v = s => (w[kopf.indexOf(s)] === undefined ? "" : w[kopf.indexOf(s)]);
    const vorher = fehler.length, e = eintrag(v, grund => fehler.push({ datei, grund: `Zeile ${i + 2}: ${grund}` }));
    if (fehler.length === vorher) liste.push(e);
  });
  return fehler.length ? { liste: null, fehler } : { liste, fehler: [] };
}
/** textil_stufen.csv: position;standard_mm;stufen_mm („|“-getrennt) -> { liste: { <position>: { standard_mm, stufen_mm[] } } } */
function stufenLesen(text, datei) {
  const r = csv(text, datei, ["position", "standard_mm", "stufen_mm"], (v, f) => {
    const std = zahl(v("standard_mm")), st = v("stufen_mm") ? v("stufen_mm").split("|").map(zahl) : [];
    if (!v("position")) f("position fehlt");
    if (std !== null && !(std > 0)) f("standard_mm muss > 0 sein");
    if (st.some(x => !(x > 0))) f("stufen_mm: jedes Maß muss > 0 sein");
    return { position: v("position"), standard_mm: std, stufen_mm: st };
  });
  if (!r.liste) return r;
  const out = {};
  r.liste.forEach(e => { out[e.position] = { standard_mm: e.standard_mm, stufen_mm: e.stufen_mm }; });
  return { liste: out, fehler: [] };
}
/** textil_modelle.csv: id;modell;dateimass_mm;realmass_mm;bezeichnung; realmass_mm darf fehlen (null) */
function modelleLesen(text, datei) {
  const ids = new Set();
  return csv(text, datei, ["id", "modell", "dateimass_mm", "realmass_mm", "bezeichnung"], (v, f) => {
    const m = { id: v("id"), modell: v("modell"), dateimass_mm: zahl(v("dateimass_mm")), realmass_mm: zahl(v("realmass_mm")), bezeichnung: v("bezeichnung") };
    if (!m.id) f("id fehlt"); else if (ids.has(m.id)) f(`id „${m.id}“ doppelt`);
    if (!m.modell) f("modell fehlt");
    if (!(m.dateimass_mm > 0)) f("dateimass_mm muss > 0 sein");
    if (m.realmass_mm !== null && !(m.realmass_mm > 0)) f("realmass_mm muss > 0 sein");
    if (m.id) ids.add(m.id);
    return m;
  });
}
/** textil_farben.csv: id;farbe;hex;c;m;y;k;groessen (groessen nicht ausgewertet) -> { liste: { <id>: [{ farbe, hex, cmyk }] } } in CSV-Reihenfolge */
function farbenLesen(text, datei) {
  const r = csv(text, datei, ["id", "farbe", "hex", "c", "m", "y", "k", "groessen"], (v, f) => {
    const cmyk = ["c", "m", "y", "k"].map(x => zahl(v(x)));
    if (!v("id")) f("id fehlt");
    if (!v("farbe")) f("farbe fehlt");
    if (cmyk.some(x => x === null || Number.isNaN(x) || x > 100)) f("c/m/y/k müssen 0–100 sein");
    return { id: v("id"), farbe: v("farbe"), hex: v("hex"), cmyk };
  });
  if (!r.liste) return r;
  const out = {};
  r.liste.forEach(e => { (out[e.id] = out[e.id] || []).push({ farbe: e.farbe, hex: e.hex, cmyk: e.cmyk }); });
  return { liste: out, fehler: [] };
}
/** Farben eines Modells (id); leer -> Freitext */
const farbenFuer = (farben, id) => (farben && farben[id]) || [];

/** config/textil.json (§3.1): alle Felder vorhanden, Zahlen > 0, daten_breite_max_mm ≤ zeichenflaeche_breite_mm − 2 × rand_mm. Rückgabe Gründe */
function konfigPruefen(c) {
  const f = [], obj = v => v !== null && typeof v === "object" && !Array.isArray(v), pos = v => typeof v === "number" && v > 0;
  if (!obj(c)) return ["kein JSON-Objekt"];
  if (!(typeof c.mockup_ordner === "string" && c.mockup_ordner.trim())) f.push("Feld mockup_ordner fehlt");
  if (!Array.isArray(c.marken) || !c.marken.length || !c.marken.every(m => typeof m === "string" && m.trim())) f.push("Feld marken fehlt oder ist leer");
  if (!pos(c.rand_mm)) f.push("Feld rand_mm fehlt (Zahl > 0)");
  if (!pos(c.kinder_faktor)) f.push("Feld kinder_faktor fehlt (Zahl > 0)");
  const block = (name, felder) => {
    const b = c[name];
    if (!obj(b) || !felder.every(k => pos(b[k]))) f.push(`Feld ${name} unvollständig (${felder.join(", ")} > 0)`);
  };
  block("hoehen_hinweis_mm", ["brust_klein", "ruecken"]);
  block("namen", ["max_breite_mm", "max_hoehe_mm", "abstand_mm", "zeilenabstand_mm"]);
  block("streifen", ["daten_breite_max_mm", "zeichenflaeche_breite_mm", "laenge_max_mm", "rand_mm", "abstand_mm", "rollenbreite_mm"]);
  const s = c.streifen;
  if (obj(s) && pos(s.daten_breite_max_mm) && pos(s.zeichenflaeche_breite_mm) && pos(s.rand_mm) && s.daten_breite_max_mm > s.zeichenflaeche_breite_mm - 2 * s.rand_mm)
    f.push("streifen.daten_breite_max_mm größer als zeichenflaeche_breite_mm − 2 × rand_mm");
  return f;
}

// ---------- Modelle, Marken, MockUps (§3.1, §3.3, §4) ----------
/** Marke eines Modells = Präfix von modell vor dem ersten „_“, nur wenn es in marken steht; sonst null */
function marke(modell, marken) { const i = String(modell || "").indexOf("_"), p = i > 0 ? modell.slice(0, i) : ""; return (marken || []).includes(p) ? p : null; }
/** Ordner der MockUps (relativ zur Extension) */
const mockupOrdner = (ext, cfg) => path.resolve(ext, cfg.mockup_ordner);
/** wählbare Modelle: mit Marke aus der Liste und vorhandener Datei <mockup_ordner>/<modell>.ai, CSV-Reihenfolge */
function mockupsListe(ext, tk) {
  const ordner = mockupOrdner(ext, tk.cfg);
  let dateien = [];
  try { dateien = fs.readdirSync(ordner); } catch (e) { return []; }
  return tk.modelle.filter(m => marke(m.modell, tk.cfg.marken) && dateien.includes(m.modell + ".ai"))
    .map(m => Object.assign({}, m, { marke: marke(m.modell, tk.cfg.marken), datei: path.join(ordner, m.modell + ".ai") }));
}
/** Faktor = realmass_mm / dateimass_mm; ohne Realmaß null */
const faktor = m => (m && m.realmass_mm > 0 && m.dateimass_mm > 0 ? m.realmass_mm / m.dateimass_mm : null);
/** Abbruchtext bei fehlendem Realmaß (§3.2) */
const realmassFehlt = m => `Modell „${m.modell}“ (ID ${m.id}): realmass_mm fehlt in config/textil_modelle.csv`;
/** XMP-Bereich textil.modell (§5): beim Anlegen vollständig aus der CSV festgeschrieben */
const modellXmp = (m, marken) => ({ id: m.id, modell: m.modell, bezeichnung: m.bezeichnung || "", marke: marke(m.modell, marken), faktor: faktor(m) });

// ---------- Maße (Fenster „Motiv“) ----------
/** Maße zur Auswahl einer Position (standard_mm zuerst, dann stufen_mm); Vorbelegung neue Druckgröße = standard_mm oder leer */
function masseFuer(stufen, pos) {
  const p = position(pos), z = p && stufen ? stufen[p.stufen] : null;
  if (!z) return { standard: null, auswahl: [] };
  return { standard: z.standard_mm, auswahl: [z.standard_mm, ...z.stufen_mm].filter(x => x > 0) };
}
/** Kinder: Breite mm = Körpergröße cm × kinder_faktor, auf 10 mm gerundet */
const kinderMass = (cm, f) => Math.round(cm * f / 10) * 10;
/** Höhenhinweis: Bezug Breite und Höhe (aus Seitenverhältnis h/w) > Grenze der Position -> Text, sonst null */
function hoehenHinweis(cfg, pos, stufe, verhaeltnis, nr) {
  const p = position(pos);
  if (!p || !p.hinweis || stufe.bezug !== "Breite" || !(verhaeltnis > 0)) return null;
  const grenze = cfg.hoehen_hinweis_mm[p.hinweis], h = Math.round(stufe.mass_mm * verhaeltnis);
  return h > grenze ? `Druckgröße ${nr}: ${stufe.mass_mm} mm breit ergibt ${h} mm Höhe (über ${grenze} mm bei ${pos})` : null;
}

// ---------- Dateinamen (§2.1, §11) ----------
const masszahl = v => String(Math.round(v * 10) / 10).replace(".", ",");
/** <Menge>x_<Kunde>_<Position>_<Maß>[_blockout][_<ID>].pdf (ID nur bei mehreren Korrekturabzügen im Auftragsordner); dn = ablage.dateiname */
function motivName(dn, { menge, kunde, position: pos, mass_mm, blockout, id, mehrere }) {
  return `${menge}x_${dn(kunde)}_${dn(pos)}_${masszahl(mass_mm)}${blockout ? "_blockout" : ""}${mehrere ? "_" + dn(id) : ""}.pdf`;
}
/** <Kunde>_Korrekturabzug[_<ID>].pdf */
const korrekturName = (dn, kunde, id, mehrere) => `${dn(kunde)}_Korrekturabzug${mehrere ? "_" + dn(id) : ""}.pdf`;
/** Arbeitsdatei <Stamm>_<ID>.ai, dieselbe ID ein zweites Mal im Ordner <Stamm>_<ID>_02.ai …; vorhanden(name) prüft den Ordner */
function arbeitsdateiName(dn, stamm, id, vorhanden) {
  const basis = `${stamm}_${dn(id)}`;
  for (let n = 1; n < 1000; n++) { const name = n === 1 ? `${basis}.ai` : `${basis}_${String(n).padStart(2, "0")}.ai`; if (!vorhanden(name)) return name; }
  throw new Error(`Kein freier Name für ${basis}.ai`);
}
/** Korrekturabzüge (<Stamm>_*.ai) in den Ordnern, je Name einmal (lokal ∪ Server) */
function korrekturDateien(ordner, stamm) {
  const namen = new Set(), re = new RegExp(`^${stamm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_.+\\.ai$`);
  (ordner || []).filter(Boolean).forEach(o => { try { fs.readdirSync(o).filter(f => re.test(f)).forEach(f => namen.add(f)); } catch (e) { /* fehlt */ } });
  return [...namen];
}

// ---------- Namen im Blocksatz (§11 Schritt 5, aus dem alten Projekt) ----------
/**
 * Verteilt Namen (Breite, Höhe in mm, bereits skaliert) in Zeilen gleicher Breite W (Blocksatz). Je Kandidat W werden die Namen
 * nach Breite absteigend in die erste Zeile gelegt, in die sie mit Mindestabstand passen (First Fit Decreasing – Zeilen möglichst voll).
 * Zeilen mit mehreren Namen: links und rechts bündig, der Rest der Zeile gleichmäßig in die Abstände; eine Zeile mit nur einem Namen
 * linksbündig. Gesucht wird W vom breitesten Namen bis maxBreite in 1-mm-Schritten; gewählt wird die kleinste Fläche (W × Höhe),
 * bei gleicher Fläche die kleinste größte Lücke.
 * @returns { breite, hoehe, zeilen: [{ y, hoehe, namen: [{ index, x, y }] }] }
 */
function namenBlock(namen, { abstand_mm: a, zeilenabstand_mm: za }, maxBreite) {
  if (!namen.length) throw new Error("Namen-Gruppe ist leer");
  const breitester = Math.max(...namen.map(n => n.b));
  if (breitester > maxBreite + 1e-9) throw new Error(`Breitester Name (${Math.round(breitester)} mm) breiter als ${maxBreite} mm`);
  const reihe = namen.map((n, i) => ({ i, b: n.b, h: n.h })).sort((x, y) => y.b - x.b || x.i - y.i);
  let best = null;
  for (let W = Math.ceil(breitester); W <= Math.floor(maxBreite) + 1e-9; W++) {
    const zeilen = [];
    for (const n of reihe) {
      const z = zeilen.find(r => r.summe + a * r.namen.length + n.b <= W + 1e-9);
      if (z) { z.namen.push(n); z.summe += n.b; } else zeilen.push({ namen: [n], summe: n.b });
    }
    const hoehe = zeilen.reduce((s, r) => s + Math.max(...r.namen.map(n => n.h)), 0) + za * (zeilen.length - 1);
    const luecke = Math.max(0, ...zeilen.filter(r => r.namen.length > 1).map(r => (W - r.summe) / (r.namen.length - 1)));
    const flaeche = W * hoehe;
    if (!best || flaeche < best.flaeche - 1e-6 || (Math.abs(flaeche - best.flaeche) <= 1e-6 && luecke < best.luecke - 1e-9)) best = { W, hoehe, zeilen, flaeche, luecke };
  }
  let y = 0;
  const zeilen = best.zeilen.map(r => {
    const hr = Math.max(...r.namen.map(n => n.h)), gap = r.namen.length > 1 ? (best.W - r.summe) / (r.namen.length - 1) : 0;
    let x = 0;
    const z = { y, hoehe: hr, abstand: gap, namen: r.namen.map(n => { const o = { index: n.i, x, y, b: n.b, h: n.h }; x += n.b + gap; return o; }) };
    y += hr + za;
    return z;
  });
  return { breite: best.W, hoehe: best.hoehe, zeilen };
}
/** Bögen: Zeilen der Reihe nach, solange Block + 2 × Rand ≤ max_hoehe_mm; Breite = Block + 2 × Rand (≤ max_breite_mm) */
function namenBoegen(namen, nc, rand) {
  const block = namenBlock(namen, nc, nc.max_breite_mm - 2 * rand), maxH = nc.max_hoehe_mm - 2 * rand, boegen = [];
  let akt = null;
  for (const z of block.zeilen) {
    if (z.hoehe > maxH + 1e-9) throw new Error(`Name (${Math.round(z.hoehe)} mm hoch) höher als der Bogen`);
    if (!akt || z.y - akt.y0 + z.hoehe > maxH + 1e-9) { akt = { y0: z.y, zeilen: [] }; boegen.push(akt); }
    akt.zeilen.push(z);
  }
  return boegen.map(bg => {
    const hoehe = bg.zeilen[bg.zeilen.length - 1].y + bg.zeilen[bg.zeilen.length - 1].hoehe - bg.y0;
    return { breite_mm: block.breite + 2 * rand, hoehe_mm: hoehe + 2 * rand,
      namen: bg.zeilen.flatMap(z => z.namen.map(n => ({ index: n.index, x_mm: rand + n.x, y_mm: rand + n.y - bg.y0 }))) };
  });
}

// ---------- Prüfungen vor dem Export (§11 Schritt 2) und Ebene „Infos“ (§11 Schritt 3) ----------
/** motive [{ name, position, verfahren, stufen, anzahlNamen }]; Flex/Flock werden nicht geprüft (Summa) */
function exportFehler(motive) {
  const f = [];
  for (const m of motive) {
    if (istGeschnitten(m.verfahren)) continue;
    const st = m.stufen || [];
    if (!st.length) { f.push(`„${m.name}“: keine Druckgröße`); continue; }
    st.forEach((s, i) => { if (!(Number.isInteger(Number(s.menge)) && Number(s.menge) > 0)) f.push(`„${m.name}“, Druckgröße ${i + 1}: Menge fehlt`); });
    if (m.position === "Namen" && !(m.anzahlNamen > 0)) f.push(`„${m.name}“: Namen-Gruppe ist leer`);
  }
  return f;
}
/** Zeilen für „Infos“: Farbe, Druck (verwendete Verfahren, Komma, Reihenfolge DTF, Flex, Flock, Stick), Datum; je Motiv „<Position>: <Maß> mm (<Textilgrößen>) · …“ */
function infosZeilen(motive, farbe, datum) {
  const verfahren = VERFAHREN.filter(v => motive.some(m => m.verfahren === v));
  const zeilen = motive.map(m => `${m.position}: ` + (m.stufen || []).map(s => `${masszahl(s.mass_mm)} mm${s.groessen ? ` (${s.groessen})` : ""}`).join(" · "));
  return { farbe: farbe || "", druck: verfahren.join(", "), datum: datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }), motive: zeilen };
}

module.exports = { POSITIONEN, VERFAHREN, GESCHNITTEN, ankerModus, istGeschnitten, blockoutMoeglich, position, verfahrenFuer, farbschluessel, stufenVon, farbenVon,
  zugeordnet, mengeSumme, dialogProbleme, ersteWarnung, sperren, zahl, stufenLesen, modelleLesen, farbenLesen, farbenFuer, konfigPruefen, marke, mockupOrdner,
  mockupsListe, faktor, realmassFehlt, modellXmp, masseFuer, kinderMass, hoehenHinweis, masszahl, motivName, korrekturName, arbeitsdateiName, korrekturDateien,
  namenBlock, namenBoegen, exportFehler, infosZeilen };
