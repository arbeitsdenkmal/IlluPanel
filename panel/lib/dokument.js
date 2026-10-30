/* Dokumentschema Version 1 (SPEZ_01 §5.1, SPEZ_02 §3.2): JSON-Block in ip:Dokument. Nur der JSX-Kern berührt XMP; hier entsteht, prüft und
 * ändert sich das Objekt. Unbekannte Felder (spätere Stufen, Art-Bereiche wie schild/textil) bleiben beim Ändern und Schreiben erhalten.
 * Bekannte Felder ab Stufe 2 mit Standardwert (STANDARD): fehlen sie in einem älteren Dokument, ergänzt parsen() sie. */
"use strict";
const fs = require("fs");
const path = require("path");

// Schemaversion und Rollen aus config/schema.json (einzige Quelle)
const SCHEMA_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "config", "schema.json"), "utf8"));
const SCHEMA = SCHEMA_JSON.xmp.schema;
const ROLLEN = SCHEMA_JSON.rollen;
const PANEL_VERSION = "3.1.0-2a"; // = ExtensionBundleVersion in CSXS/manifest.xml
const QUELLEN = ["geoeffnet", "datei", "leer"];
// SPEZ_02 §3.2: vorauswahl, farbzuordnung je Auftrag; kalkulation = letzter Kalkulationsdatensatz (§8.4); aufbau = letzter Druckbogen-Aufbau.
// Druckbogen-Dokumente (rolle „druckbogen“) tragen zusätzlich bogen { aufbau, medium, laminat, breite_mm, nr, arbeitsdatei } (config/schema.json „rollenfelder“).
const STANDARD = { vorauswahl: () => ({}), farbzuordnung: () => ({}), kalkulation: () => null, aufbau: () => null };

/** neues Dokumentobjekt; d: { auftragsart, massstab, kunde, kundenordner, auftragsordner, quelle: { art, pfad }, rolle, jetzt } */
function neu(d) {
  return {
    schema: SCHEMA,
    panel: PANEL_VERSION,
    erstellt: (d.jetzt || new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
    rolle: d.rolle || "arbeitsdatei",
    auftragsart: d.auftragsart,
    massstab: d.massstab,
    kunde: d.kunde,
    auftrag: { orderId: null, productId: null },
    ablage: { kundenordner: d.kundenordner || null, auftragsordner: d.auftragsordner },
    quelle: { art: d.quelle ? d.quelle.art : "leer", pfad: d.quelle && d.quelle.pfad ? d.quelle.pfad : null },
    grafikzeit: { eintraege: [] },
    vorauswahl: {},
    farbzuordnung: {},
    kalkulation: null,
    aufbau: null,
    exporte: []
  };
}
/** fehlende bekannte Felder mit Standardwert ergänzen (in place) */
function standardErgaenzen(o) {
  for (const [k, f] of Object.entries(STANDARD)) if (!(k in o)) o[k] = f();
  return o;
}

/** Text aus ip:Dokument -> Objekt; leer/null -> null (kein Panel-Dokument); ungültig -> Fehler */
function parsen(text) {
  if (text === null || text === undefined || String(text).trim() === "") return null;
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error(`XMP ip:Dokument: kein gültiges JSON (${e.message})`); }
  if (o === null || typeof o !== "object" || Array.isArray(o)) throw new Error("XMP ip:Dokument: kein JSON-Objekt");
  if (o.schema !== SCHEMA) throw new Error(`XMP ip:Dokument: Schema ${o.schema} unbekannt (erwartet ${SCHEMA})`);
  return standardErgaenzen(o);
}
const serialisieren = o => JSON.stringify(o);

/** Prüfung der Felder, die Stufe 1 liest und schreibt; Rückgabe Liste der Mängel */
function pruefen(o) {
  const m = [];
  if (!o || typeof o !== "object") return ["kein Objekt"];
  if (o.schema !== SCHEMA) m.push("schema");
  if (!ROLLEN.includes(o.rolle)) m.push("rolle");
  if (typeof o.auftragsart !== "string" || !o.auftragsart) m.push("auftragsart");
  if (!(o.massstab > 0)) m.push("massstab");
  if (typeof o.kunde !== "string") m.push("kunde");
  if (!o.ablage || typeof o.ablage !== "object") m.push("ablage");
  else if (o.ablage.kundenordner !== null && !/^[^/]+\/[^/]+$/.test(String(o.ablage.kundenordner))) m.push("ablage.kundenordner");
  if (!Array.isArray(o.exporte)) m.push("exporte");
  if (o.quelle && !QUELLEN.includes(o.quelle.art)) m.push("quelle.art");
  return m;
}

/** tiefe Kopie mit geänderten Feldern; aenderungen = { "ablage.kundenordner": "M/Mustermann", … } – alles andere bleibt erhalten */
function aendern(o, aenderungen) {
  const r = JSON.parse(JSON.stringify(o));
  for (const [pfad, wert] of Object.entries(aenderungen)) {
    const teile = pfad.split(".");
    let z = r;
    for (const t of teile.slice(0, -1)) { if (z[t] === null || typeof z[t] !== "object") z[t] = {}; z = z[t]; }
    z[teile[teile.length - 1]] = wert;
  }
  return r;
}
/** Exporteintrag anhängen (SPEZ_01 §7.2 Schritt 9): { zeit, ordner, dateien: [{ name, uebertragen }], uebertragen } */
function exportAnhaengen(o, eintrag) {
  const r = JSON.parse(JSON.stringify(o));
  if (!Array.isArray(r.exporte)) r.exporte = [];
  r.exporte.push(eintrag);
  return r;
}

/** Kalkulationsdatensatz (SPEZ_02 §8.4) ins Feld kalkulation; ersetzt den vorigen */
const kalkulationSetzen = (o, datensatz) => aendern(o, { kalkulation: datensatz });

/** Node-Seite des XMP-Zugriffs über den JSX-Kern (host = evalScript-Brücke): xmpLesen() -> Objekt|null, xmpSchreiben(obj) */
function xmpZugriff(host) {
  return {
    async xmpLesen() { return parsen((await host("xmpLesen")).text); },
    async xmpSchreiben(obj) { await host("xmpSchreiben", serialisieren(obj)); return obj; }
  };
}

module.exports = { SCHEMA, PANEL_VERSION, ROLLEN, QUELLEN, STANDARD, neu, parsen, serialisieren, pruefen, aendern, exportAnhaengen, kalkulationSetzen,
  standardErgaenzen, xmpZugriff };
