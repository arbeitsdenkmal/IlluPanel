/* Zuordnen (Fenster „Objekt“, SPEZ_02 §6) ohne Oberfläche: Vorauswahl, gemeinsame Werte bei Mehrfachauswahl, Farben der Auswahl, Medienliste aus der
 * Preisliste, Tags je Objekt beim OK. Regeln aus dem alten Objektmanager übernommen und auf IP_Folie/IP_Anzahl/IP_Attribute umgestellt.
 * Dazu Anzeigehilfen für Panel und „Zusammenfassung“ (Art und Folie eines Objekts, Zahlen deutsch). */
"use strict";

// ---------- Mehrfachauswahl: gemeinsamer Wert oder „unterschiedlich“ ----------
const UNTERSCHIEDLICH = Symbol("unterschiedlich");
/** gleicher Wert bei allen -> dieser Wert; sonst UNTERSCHIEDLICH (gestrichelt bzw. leer, ändert nur, wenn neu gewählt) */
function gemeinsam(werte) {
  if (!werte.length) return UNTERSCHIEDLICH;
  const a = JSON.stringify(werte[0]);
  return werte.every(w => JSON.stringify(w) === a) ? werte[0] : UNTERSCHIEDLICH;
}

// ---------- Vorauswahl je Auftrag (XMP vorauswahl), Preset wie bisher: 3551 matt, Serie 751C ----------
const PRESET = { medium: "3551", laminat: "matt", serie: "751C" };
function vorauswahl(xmp) {
  const v = (xmp && xmp.vorauswahl) || {};
  return { medium: v.medium || PRESET.medium, laminat: v.laminat || PRESET.laminat, serie: v.serie || PRESET.serie };
}
/** neue Werte übernehmen (nur gesetzte) */
function vorauswahlMerken(xmp, neu) {
  const v = Object.assign({}, (xmp && xmp.vorauswahl) || {});
  ["medium", "laminat", "serie"].forEach(k => { if (neu && neu[k]) v[k] = neu[k]; });
  return v;
}

// ---------- Tags lesen ----------
const attributeVon = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
/** IP_Anzahl: fehlt -> 1; ganze Zahl ≥ 1, sonst null */
function anzahlVon(v) {
  if (v === null || v === undefined || String(v).trim() === "") return 1;
  const s = String(v).trim();
  return /^\d+$/.test(s) && Number(s) >= 1 ? Number(s) : null;
}
/** Art eines zugeordneten Objekts aus IP_Folie: Plott-Schlüssel (751C-031) -> plott, sonst digitaldruck; ohne IP_Folie null */
function artNachTag(o, farben) {
  const f = o.tags && o.tags.folie;
  if (!f) return null;
  return farben.istPlottSchluessel(f) ? "plott" : "digitaldruck";
}
/** Vorauswahl der Art [§6]: nach Tag, sonst Sandbox -> Digitaldruck, sonst nach Ebene (Rolle plott/digitaldruck); sonst null */
function artVorauswahl(o, farben) {
  const t = artNachTag(o, farben);
  if (t) return t;
  if (o.rolle === "sandbox") return "digitaldruck";
  if (o.rolle === "plott" || o.rolle === "digitaldruck") return o.rolle;
  return null;
}
const medium = (o, medien) => { const f = o.tags && o.tags.folie; return f ? ((medien && medien.alias) || {})[f] || f : null; };
/** Komplexität aus IP_Komplexitaet: fehlt -> 0 */
const komplexitaetVon = o => { const k = o.tags && o.tags.komplexitaet; return k === null || k === undefined || String(k).trim() === "" ? 0 : Number(String(k).trim()); };
/** Komplexität wirkt nur bei Plott immer, bei Druck mit Cutkontur [R 1.8] */
const komplexitaetGilt = (o, art) => art === "plott" || (art === "digitaldruck" && !!o.cut);

// ---------- Farben der Auswahl (Plott) ----------
/** je Füllfarbe der ausgewählten Objekte eine Zeile (colorKey eindeutig, Reihenfolge des Vorkommens); Cutkonturen zählen nicht */
function farbenDerAuswahl(objekte) {
  const m = new Map();
  objekte.forEach(o => (o.blaetter || []).forEach(b => { if (!b.cut) (b.farben || []).forEach(f => { if (!m.has(f.key)) m.set(f.key, f); }); }));
  return [...m.values()];
}
/** Zuordnung einer Farbe: erkannte Oracal-Farbe, sonst bekannte farbzuordnung (colorKey exakt) -> Bibliothekseintrag; sonst null */
function farbeErkannt(f, farben, farbzuordnung) {
  const c = farben.erkennen(f.spot);
  if (c) return { farbe: c, quelle: "oracal" };
  const k = (farbzuordnung || {})[f.key];
  const z = k ? farben.nachSchluessel(k) : null;
  return z ? { farbe: z, quelle: "zuordnung" } : null;
}
/** Sperren für Plott: Konturen, Bilder, Verläufe – Texte wie bisher */
function plottSperren(objekte) {
  const bl = objekte.flatMap(o => o.blaetter || []), p = [];
  if (bl.some(b => b.kontur)) p.push("Objekt enthält Konturen – bitte entfernen oder umwandeln");
  if (bl.some(b => b.bild)) p.push("Objekt enthält Bilder – bei Plott nicht möglich");
  if (bl.some(b => b.verlauf)) p.push("Objekt enthält Verläufe/Muster – bei Plott nicht möglich");
  return p;
}
/** Digitaldruck darf keine Oracal-Farbe enthalten; umgefärbte Teile mit gesicherter Originalfarbe zählen nicht (sie werden zurückgefärbt) */
function oracalImDruck(objekte, farben) {
  const voll = [];
  objekte.forEach(o => (o.blaetter || []).filter(b => !b.originalfarbe).forEach(b => (b.farben || []).forEach(f => {
    const c = farben.erkennen(f.spot || f.label); if (c && !voll.includes(c.schluessel)) voll.push(c.schluessel);
  })));
  return voll;
}

// ---------- Medien und Laminate ----------
/** Druckmedien aus der Preisliste (serie, verfahren druck; gilt_fuer = Auftragsart oder alle), Reihenfolge wie dort */
function medienListe(zeilen, A) {
  const l = [];
  (zeilen || []).forEach(z => { if (z.typ === "serie" && z.verfahren === "druck" && (z.gilt_fuer === A || z.gilt_fuer === "alle") && !l.includes(z.schluessel)) l.push(z.schluessel); });
  return l;
}
/** erlaubte Laminate eines Mediums (medien.json „laminate“, sonst alle der Auftragsart) */
function laminateFuer(m, aa, medien) {
  const erl = (((medien && medien.medien) || {})[m] || {}).laminate;
  return (aa.laminate || []).map(l => l.schluessel).filter(k => !erl || erl.includes(k));
}
const laminatName = (aa, k) => { const l = (aa.laminate || []).find(x => x.schluessel === k); return l ? l.bezeichnung : k || ""; };

// ---------- Tags beim OK ----------
/**
 * Tags eines Objekts nach der Wahl im Dialog. w: { art (null = je Objekt), folie (Plott: Schlüssel der ersten Farbe des Objekts, je Objekt über plottFolie),
 * medium, laminat (null = unverändert), anzahl (null = unverändert), komplexitaet (null = unverändert), attribute: {schluessel: true|false},
 * tape (null = unverändert, true = manuell an, false = auto) }, kx { farben, medien, vorauswahl, plottFolie(o) }.
 * Rückgabe { art, tags } (art des Objekts nach dem OK, tags nur geänderte Schlüssel; null entfernt).
 */
function tagsFuer(o, w, kx) {
  const art = w.art || artNachTag(o, kx.farben), t = {};
  if (!art) return { art: null, tags: t };
  if (!w.art) { /* gemischte Art ohne neue Wahl: Folie und Laminat bleiben je Objekt */ }
  else if (art === "plott") { t.folie = kx.plottFolie(o); t.laminat = null; }
  else {
    const alt = artNachTag(o, kx.farben) === "digitaldruck" ? medium(o, kx.medien) : null;
    t.folie = w.medium || alt || kx.vorauswahl.medium;
    const lamAlt = artNachTag(o, kx.farben) === "digitaldruck" ? o.tags.laminat : null;
    t.laminat = w.laminat || lamAlt || kx.vorauswahl.laminat;
  }
  if (w.anzahl !== null && w.anzahl !== undefined) t.anzahl = String(w.anzahl);
  if (w.komplexitaet !== null && w.komplexitaet !== undefined && komplexitaetGilt(o, art)) t.komplexitaet = w.komplexitaet > 0 ? String(w.komplexitaet) : null; // K0 ohne Tag
  const attr = attributeVon(o.tags.attribute);
  const setzen = (k, an) => { const i = attr.indexOf(k); if (an && i < 0) attr.push(k); if (!an && i >= 0) attr.splice(i, 1); };
  Object.keys(w.attribute || {}).forEach(k => setzen(k, w.attribute[k]));
  if (art === "digitaldruck" && w.tape !== null && w.tape !== undefined) setzen("tape", w.tape);
  if (attr.join(",") !== attributeVon(o.tags.attribute).join(",")) t.attribute = attr.length ? attr.join(",") : null;
  return { art, tags: t };
}

// ---------- Anzeige ----------
/** Zahl deutsch mit d Nachkommastellen und Tausenderpunkt (unabhängig von der ICU-Ausstattung) */
function zahl(n, d) {
  const s = (Math.round(Number(n) * 10 ** (d === undefined ? 2 : d)) / 10 ** (d === undefined ? 2 : d)).toFixed(d === undefined ? 2 : d);
  const [g, k] = s.split(".");
  return g.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (k ? "," + k : "");
}
/** Folie eines zugeordneten Objekts für Panel und Tabellen: Plott Schlüssel mit Chip-Farbe, Druck „Medium Laminat“ (ohne Chip, wie MockUp C3) */
function folieAnzeige(o, kx) {
  const art = artNachTag(o, kx.farben);
  if (art === "plott") { const c = kx.farben.nachSchluessel(o.tags.folie); return { text: o.tags.folie, rgb: c && c.rgb ? c.rgb : null }; }
  if (art === "digitaldruck") return { text: `${medium(o, kx.medien)} ${laminatName(kx.aa, o.tags.laminat)}`.trim(), rgb: null };
  return { text: "", rgb: null };
}

module.exports = { UNTERSCHIEDLICH, gemeinsam, PRESET, vorauswahl, vorauswahlMerken, attributeVon, anzahlVon, artNachTag, artVorauswahl, medium, komplexitaetVon,
  komplexitaetGilt, farbenDerAuswahl, farbeErkannt, plottSperren, oracalImDruck, medienListe, laminateFuer, laminatName, tagsFuer, zahl, folieAnzeige };
