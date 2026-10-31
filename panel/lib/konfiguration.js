/* Konfiguration laden und prüfen (SPEZ_01 §4, §5.2, §6; SPEZ_02 §4): rechner.json je Rechner, config/schema.json, config/auftragsarten/*.json,
 * config/mapping.json, config/medien.json, config/serien.json mit den fünf ASE-Dateien in config/farbfelder; dazu die Startprüfung der Preisliste
 * (jede Serie mit Standardbreite). Fehler kommen als Liste { datei, grund } zurück – das Panel zeigt je Fehler ein Popup und sperrt die Buttons.
 * Die Plattform wird nur hier für Pfadauflösung und Ort der rechner.json benutzt. */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const F = require("./farben");
const PC = require("./preisquelle_csv");
const { pruefen: preislistePruefen } = require("./preisquelle");

const ARTEN = ["fahrzeugbeschriftung", "beschriftung", "schild", "banner_rollup", "lasergravur", "offset", "textil", "sonstiges"];
const PROFILE = ["flach", "offset", "produktion", "schild", "textil"];
const ZEICHENFLAECHEN = ["vorlage", "neu", "fest", "abfrage", "app", "produktvorlage", "mockup"];
const MIT_MASS = ["neu", "fest"];
const MASSSTAEBE = [1, 30];

class KonfigFehler extends Error {
  constructor(fehler) {
    super(fehler.map(f => `${f.datei}: ${f.grund}`).join("\n"));
    this.fehler = fehler;
  }
}

/** Umgebung für Pfadauflösung; im Test frei vorgebbar */
function umgebung(opts) {
  const o = opts || {};
  return { plattform: o.plattform || process.platform, home: o.home || os.homedir(), env: o.env || process.env };
}
const pfadModul = u => (u.plattform === "win32" ? path.win32 : path.posix);

/** ~ am Anfang und %VAR% auflösen; unbekannte Variable -> Fehler */
function pfadAufloesen(p, opts) {
  const u = umgebung(opts), P = pfadModul(u);
  let r = String(p);
  if (r === "~" || /^~[\/\\]/.test(r)) r = P.join(u.home, r.slice(1));
  r = r.replace(/%([^%]+)%/g, (g, name) => {
    const k = Object.keys(u.env).find(x => x.toUpperCase() === name.toUpperCase()); // Windows: Groß-/Kleinschreibung egal
    if (k === undefined || u.env[k] === undefined || u.env[k] === "") throw new Error(`Umgebungsvariable ${name} nicht gesetzt`);
    return u.env[k];
  });
  return P.normalize(r);
}

/** Ort der rechner.json: macOS ~/Library/Application Support/PAM-Werkzeuge, Windows %APPDATA%\PAM-Werkzeuge */
function rechnerOrt(opts) {
  const u = umgebung(opts);
  if (u.plattform === "win32") return pfadAufloesen("%APPDATA%\\PAM-Werkzeuge\\rechner.json", u);
  return path.posix.join(u.home, "Library", "Application Support", "PAM-Werkzeuge", "rechner.json");
}

function jsonLesen(datei, fehler) {
  let text;
  try { text = fs.readFileSync(datei, "utf8"); } catch (e) { fehler.push({ datei, grund: e.code === "ENOENT" ? "Datei fehlt" : `nicht lesbar (${e.code || e.message})` }); return undefined; }
  try { return JSON.parse(text); } catch (e) { fehler.push({ datei, grund: `kein gültiges JSON (${e.message})` }); return undefined; }
}
const istText = v => typeof v === "string" && v.trim() !== "";
const istObjekt = v => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * rechner.json prüfen und Pfade auflösen. Rückgabe { datei, rechner, server: { kunden, dtf_bestellen }, lokal: { arbeitsdateien, ausgang },
 * arbeitsdateienServer } – arbeitsdateien bleibt bei "server" der Text "server". Fehler -> KonfigFehler.
 */
function rechnerAusDaten(roh, datei, opts) {
  const fehler = [];
  const felder = [["server", "kunden"], ["server", "dtf_bestellen"], ["lokal", "arbeitsdateien"], ["lokal", "ausgang"]];
  const r = { datei, rechner: roh && istText(roh.rechner) ? roh.rechner : null, server: {}, lokal: {}, arbeitsdateienServer: false };
  if (!istObjekt(roh)) throw new KonfigFehler([{ datei, grund: "kein JSON-Objekt" }]);
  for (const [b, f] of felder) {
    const v = istObjekt(roh[b]) ? roh[b][f] : undefined;
    if (!istText(v)) { fehler.push({ datei, grund: `Feld ${b}.${f} fehlt` }); continue; }
    if (b === "lokal" && f === "arbeitsdateien" && v === "server") { r.lokal.arbeitsdateien = "server"; r.arbeitsdateienServer = true; continue; }
    try { r[b][f] = pfadAufloesen(v, opts); } catch (e) { fehler.push({ datei, grund: `Feld ${b}.${f}: ${e.message}` }); }
  }
  if (fehler.length) throw new KonfigFehler(fehler);
  return r;
}
function rechnerLaden(opts) {
  const datei = (opts && opts.datei) || rechnerOrt(opts), fehler = [];
  const roh = jsonLesen(datei, fehler);
  if (fehler.length) throw new KonfigFehler(fehler);
  return rechnerAusDaten(roh, datei, opts);
}

/** config/schema.json: XMP-Namespace, Schemaversion, Rollen, Tag-Namen (einzige Quelle) */
function schemaLaden(configOrdner) {
  const datei = path.join(configOrdner, "schema.json"), fehler = [];
  const s = jsonLesen(datei, fehler);
  if (fehler.length) throw new KonfigFehler(fehler);
  const x = istObjekt(s) && istObjekt(s.xmp) ? s.xmp : null;
  if (!x) fehler.push({ datei, grund: "Bereich xmp fehlt" });
  else {
    for (const f of ["namespace", "praefix", "eigenschaft"]) if (!istText(x[f])) fehler.push({ datei, grund: `Feld xmp.${f} fehlt` });
    if (!Number.isInteger(x.schema) || x.schema < 1) fehler.push({ datei, grund: "Feld xmp.schema muss eine ganze Zahl ≥ 1 sein" });
  }
  if (!Array.isArray(s.rollen) || !s.rollen.length || !s.rollen.every(istText)) fehler.push({ datei, grund: "Feld rollen fehlt oder ist leer" });
  if (!istObjekt(s.tags) || !Object.keys(s.tags).length) fehler.push({ datei, grund: "Bereich tags fehlt oder ist leer" });
  else {
    const namen = Object.values(s.tags);
    for (const [k, v] of Object.entries(s.tags)) if (!istText(v) || !/^IP_\w+$/.test(v)) fehler.push({ datei, grund: `Tag ${k}: Name muss mit IP_ beginnen` });
    const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
    if (doppelt.length) fehler.push({ datei, grund: `Tag-Name doppelt: ${[...new Set(doppelt)].join(", ")}` });
  }
  if (fehler.length) throw new KonfigFehler(fehler);
  return s;
}

function zeichenflaechePruefen(z, datei, feld, fehler) {
  if (!istObjekt(z)) { fehler.push({ datei, grund: `Feld ${feld} fehlt` }); return; }
  if (!ZEICHENFLAECHEN.includes(z.art)) { fehler.push({ datei, grund: `${feld}.art „${z.art}“ unbekannt` }); return; }
  if (MIT_MASS.includes(z.art) && !(z.breite_mm > 0 && z.hoehe_mm > 0)) fehler.push({ datei, grund: `${feld}: breite_mm und hoehe_mm fehlen` });
  for (const alt of ["fahrzeugvorlage", "mit_auftrag"]) if (z[alt] !== undefined) zeichenflaechePruefen(z[alt], datei, `${feld}.${alt}`, fehler);
}

/** eine Auftragsart prüfen (Pflichtfelder SPEZ_01 §6); fehler wird ergänzt */
function artPruefen(a, id, datei, fehler) {
  const f = grund => fehler.push({ datei, grund });
  if (!istObjekt(a)) { f("kein JSON-Objekt"); return; }
  if (a.id !== id) f(`id „${a.id}“ passt nicht zum Dateinamen`);
  if (!istText(a.name)) f("Feld name fehlt");
  if (typeof a.reihenfolge !== "number") f("Feld reihenfolge fehlt");
  if (typeof a.kalkulation !== "boolean") f("Feld kalkulation fehlt");
  if (!Array.isArray(a.ebenen)) f("Feld ebenen fehlt");
  else {
    a.ebenen.forEach((e, i) => {
      if (!istObjekt(e) || !istText(e.name) || !istText(e.rolle)) f(`ebenen[${i}]: name und rolle nötig`);
      else if (e.gesperrt !== undefined && typeof e.gesperrt !== "boolean") f(`ebenen[${i}]: gesperrt muss true/false sein`);
    });
    const namen = a.ebenen.map(e => e && e.name), rollen = a.ebenen.map(e => e && e.rolle);
    const dn = namen.filter((n, i) => namen.indexOf(n) !== i), dr = rollen.filter((n, i) => rollen.indexOf(n) !== i);
    if (dn.length) f(`Ebenenname doppelt: ${[...new Set(dn)].join(", ")}`);
    if (dr.length) f(`Rolle doppelt: ${[...new Set(dr)].join(", ")}`);
  }
  if (!istObjekt(a.massstab) || !MASSSTAEBE.includes(a.massstab.standard)) f("Feld massstab.standard muss 1 oder 30 sein");
  zeichenflaechePruefen(a.zeichenflaeche, datei, "zeichenflaeche", fehler);
  if (!istObjekt(a.quelle) || !(a.quelle.sandbox === null || istText(a.quelle.sandbox))) f("Feld quelle.sandbox fehlt (Ebenenname oder null)");
  else if (a.quelle.sandbox && Array.isArray(a.ebenen) && !a.ebenen.some(e => e && e.name === a.quelle.sandbox)) f(`quelle.sandbox „${a.quelle.sandbox}“ ist keine Ebene der Auftragsart`);
  if (!istObjekt(a.export)) f("Feld export fehlt");
  else {
    if (!PROFILE.includes(a.export.profil)) f(`Export-Profil „${a.export.profil}“ unbekannt`);
    if (!istText(a.export.preset)) f("Feld export.preset fehlt");
    if (!(a.export.dateiname === null || istText(a.export.dateiname))) f("Feld export.dateiname fehlt (Text oder null)");
    if (a.export.profil === "flach" && !istText(a.export.dateiname)) f("Profil flach braucht export.dateiname");
  }
  if (a.zeichenflaeche && a.zeichenflaeche.art === "abfrage" && !(a.zeichenflaechen_abstand_mm >= 0)) f("Feld zeichenflaechen_abstand_mm fehlt");
}

/** alle acht Auftragsarten; Rückgabe { id: art } */
function auftragsartenLaden(configOrdner) {
  const fehler = [], arten = {};
  for (const id of ARTEN) {
    const datei = path.join(configOrdner, "auftragsarten", id + ".json");
    const a = jsonLesen(datei, fehler);
    if (a === undefined) continue;
    const vorher = fehler.length;
    artPruefen(a, id, datei, fehler);
    if (fehler.length === vorher) arten[id] = a;
  }
  if (fehler.length) throw new KonfigFehler(fehler);
  return arten;
}

/** mapping.json: department -> type -> Auftragsart ("*" = alle); jede Zielart muss existieren */
function mappingLaden(configOrdner, arten) {
  const datei = path.join(configOrdner, "mapping.json"), fehler = [];
  const m = jsonLesen(datei, fehler);
  if (fehler.length) throw new KonfigFehler(fehler);
  if (!istObjekt(m)) throw new KonfigFehler([{ datei, grund: "kein JSON-Objekt" }]);
  for (const [dep, typen] of Object.entries(m)) {
    if (!istObjekt(typen)) { fehler.push({ datei, grund: `${dep}: kein Objekt` }); continue; }
    for (const [typ, ziel] of Object.entries(typen)) if (!arten[ziel]) fehler.push({ datei, grund: `${dep}/${typ}: Auftragsart „${ziel}“ unbekannt` });
  }
  if (fehler.length) throw new KonfigFehler(fehler);
  return m;
}
/** Auftragsart zu department/type aus der App, null wenn ohne Eintrag */
function artZuProdukt(mapping, department, type) {
  const t = mapping[department];
  if (!t) return null;
  return t[type] || t["*"] || null;
}

/** config/medien.json: Rollenbreiten, Randabzüge, Druckwerte (SPEZ_02 §4) */
function medienLaden(configOrdner) {
  const datei = path.join(configOrdner, "medien.json"), fehler = [];
  const m = jsonLesen(datei, fehler);
  if (fehler.length) throw new KonfigFehler(fehler);
  if (!istObjekt(m)) throw new KonfigFehler([{ datei, grund: "kein JSON-Objekt" }]);
  if (!istObjekt(m.randabzug) || typeof m.randabzug.plott !== "number") fehler.push({ datei, grund: "Feld randabzug.plott fehlt" });
  if (!istObjekt(m.druck)) fehler.push({ datei, grund: "Bereich druck fehlt" });
  else for (const f of ["opos_zugabe_mm", "opos_marken_rand_mm", "kantenhalter_mm", "reserve_kontur_mm"]) if (typeof m.druck[f] !== "number") fehler.push({ datei, grund: `Feld druck.${f} fehlt` });
  if (typeof m.schwelle_prozent !== "number") fehler.push({ datei, grund: "Feld schwelle_prozent fehlt" });
  // Passermarken (SPEZ_02 §10.1): Stufen > 0 absteigend, Anteil 0 … 1, Abstand ≥ 0
  const pm = m.passermarken;
  if (!istObjekt(pm)) fehler.push({ datei, grund: "Bereich passermarken fehlt" });
  else {
    const st = pm.stufen_mm;
    if (!Array.isArray(st) || !st.length || !st.every(v => typeof v === "number" && v > 0) || st.some((v, i) => i && v >= st[i - 1]))
      fehler.push({ datei, grund: "Feld passermarken.stufen_mm fehlt oder ist nicht absteigend" });
    if (!(typeof pm.anteil === "number" && pm.anteil > 0 && pm.anteil <= 1)) fehler.push({ datei, grund: "Feld passermarken.anteil fehlt (Zahl > 0 und ≤ 1)" });
    if (!(typeof pm.abstand_mm === "number" && pm.abstand_mm >= 0)) fehler.push({ datei, grund: "Feld passermarken.abstand_mm fehlt" });
  }
  if (!istObjekt(m.medien) || !Object.keys(m.medien).length) fehler.push({ datei, grund: "Bereich medien fehlt oder ist leer" });
  if (fehler.length) throw new KonfigFehler(fehler);
  return m;
}

/** config/serien.json und config/farbfelder/*.ase: jede Datei vorhanden und lesbar; Rückgabe Farbverzeichnis (farben.js) */
function farbenLaden(configOrdner) {
  const r = F.serienLaden(configOrdner);
  if (r.fehler.length) throw new KonfigFehler(r.fehler);
  return F.verzeichnis(r.serien);
}

/** Startprüfung der Preisliste (Infos/Stammdaten/preisliste.csv): allgemeine Prüfungen, jede Serie mit Standardbreite in medien.json */
function preislisteStartpruefung(ext, medien, datei) {
  const a = PC.adapter(ext, datei);
  let zeilen;
  try { zeilen = PC.zeilenAusText(fs.readFileSync(a.pfad, "utf8")); }
  catch (e) { throw new KonfigFehler([{ datei: a.pfad, grund: e.code === "ENOENT" ? "Datei fehlt" : e.code ? `nicht lesbar (${e.code})` : e.message }]); }
  const f = preislistePruefen(zeilen, null, medien).fehler;
  if (f.length) throw new KonfigFehler(f.map(grund => ({ datei: a.pfad, grund })));
}

/**
 * Alles beim Panelstart: { ext, rechner, schema, arten, mapping, medien, farben } oder KonfigFehler mit allen Fehlern.
 * opts: { config (Ordner, Standard <ext>/config), rechner: Optionen für rechnerLaden, preisliste (Datei, nur Tests) }
 */
function allesLaden(ext, opts) {
  const o = opts || {}, config = o.config || path.join(ext, "config"), fehler = [];
  const sammle = fn => { try { return fn(); } catch (e) { if (e instanceof KonfigFehler) fehler.push(...e.fehler); else throw e; } };
  const rechner = sammle(() => rechnerLaden(o.rechner));
  const schema = sammle(() => schemaLaden(config));
  const arten = sammle(() => auftragsartenLaden(config));
  const mapping = arten ? sammle(() => mappingLaden(config, arten)) : undefined;
  const medien = sammle(() => medienLaden(config));
  const farben = sammle(() => farbenLaden(config));
  if (medien) sammle(() => preislisteStartpruefung(ext, medien, o.preisliste));
  if (fehler.length) throw new KonfigFehler(fehler);
  return { ext, rechner, schema, arten, mapping, medien, farben };
}

/** Auftragsarten in Dialog-Reihenfolge */
const artenSortiert = arten => Object.values(arten).sort((a, b) => a.reihenfolge - b.reihenfolge);

module.exports = { ARTEN, PROFILE, ZEICHENFLAECHEN, KonfigFehler, pfadAufloesen, rechnerOrt, rechnerAusDaten, rechnerLaden, schemaLaden,
  artPruefen, auftragsartenLaden, mappingLaden, artZuProdukt, medienLaden, farbenLaden, preislisteStartpruefung, allesLaden, artenSortiert };
