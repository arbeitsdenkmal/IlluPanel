/* Konfiguration laden und prüfen (SPEZ_01 §4, §5.2, §6; SPEZ_02 §4): rechner.json je Rechner, config/schema.json, config/auftragsarten/*.json,
 * config/mapping.json, config/medien.json, config/serien.json mit den fünf ASE-Dateien in config/farbfelder, config/werkzeuge.json (SPEZ_03 §5),
 * config/produkte.csv (SPEZ_03_Konfigurationen §3.1), config/schild_materialien.csv (SPEZ_03_Schild §3.1), config/textil.json mit textil_stufen.csv,
 * textil_modelle.csv, textil_farben.csv (SPEZ_03_Textil §3), config/nutzen.json mit den Vorlagen der Gitterscheiben und MB-Nummern (SPEZ_03_Nutzen §3.1); dazu die Startprüfung der Preisliste (jede Serie mit Standardbreite). Fehler kommen als Liste { datei, grund } zurück – das Panel zeigt je Fehler ein Popup und sperrt die Buttons.
 * Die Plattform wird nur hier für Pfadauflösung und Ort der rechner.json benutzt. */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const F = require("./farben");
const PC = require("./preisquelle_csv");
const { pruefen: preislistePruefen } = require("./preisquelle");
const TX = require("./textil");

const ARTEN = ["fahrzeugbeschriftung", "beschriftung", "schild", "banner_rollup", "lasergravur", "offset", "textil", "sonstiges"];
const PROFILE = ["flach", "offset", "produktion", "schild", "textil"];
const ZEICHENFLAECHEN = ["vorlage", "neu", "fest", "abfrage", "app", "produktvorlage", "mockup"];
const MIT_MASS = ["neu", "fest"];
const MASSSTAEBE = [1, 30];
const BOHRUNG_ANORDNUNGEN = ["ecken", "mitte_oben_unten", "mitte_links_rechts", "keine"];
const SERVER_FELDER = ["kunden", "dtf_bestellen", "wmd_bestellen"]; // Pfadfelder server.* von rechner.json (Sammelordner, SPEZ_03_Textil §3.4)

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
 * rechner.json prüfen und Pfade auflösen. Rückgabe { datei, rechner, server: { kunden, dtf_bestellen, wmd_bestellen }, lokal: { arbeitsdateien, ausgang },
 * arbeitsdateienServer } – arbeitsdateien bleibt bei "server" der Text "server". Fehler -> KonfigFehler.
 */
function rechnerAusDaten(roh, datei, opts) {
  const fehler = [];
  const felder = [["server", "kunden"], ["server", "dtf_bestellen"], ["server", "wmd_bestellen"], ["lokal", "arbeitsdateien"], ["lokal", "ausgang"]];
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
  // Offset, Banner/Roll-up (SPEZ_03_Konfigurationen Fassung 4 §12): hilfslinien.ebenen = Liste mit mindestens einem nicht leeren Ebenennamen
  if ((id === "offset" || id === "banner_rollup") && !(istObjekt(a.hilfslinien) && Array.isArray(a.hilfslinien.ebenen) && a.hilfslinien.ebenen.some(istText)
    && a.hilfslinien.ebenen.every(x => typeof x === "string"))) f("Feld hilfslinien.ebenen fehlt (Liste mit mindestens einem Ebenennamen)");
  // Banner/Roll-up (SPEZ_03_Konfigurationen §4.1): rollup[] mit id (eindeutig, nicht „banner“), name, Maßen > 0, vorlage; banner.name
  if (id === "banner_rollup") {
    if (!Array.isArray(a.rollup)) f("Feld rollup fehlt");
    else {
      a.rollup.forEach((r, i) => {
        if (!istObjekt(r)) { f(`rollup[${i}]: kein Objekt`); return; }
        if (!istText(r.id) || r.id === "banner") f(`rollup[${i}]: id fehlt oder ist „banner“`);
        if (!istText(r.name)) f(`rollup[${i}]: name fehlt`);
        if (!(r.breite_mm > 0 && r.hoehe_mm > 0)) f(`rollup[${i}]: breite_mm und hoehe_mm müssen > 0 sein`);
        if (!istText(r.vorlage)) f(`rollup[${i}]: vorlage fehlt`);
      });
      const ids = a.rollup.map(r => r && r.id), doppelt = ids.filter((x, i) => istText(x) && ids.indexOf(x) !== i);
      if (doppelt.length) f(`rollup: id doppelt: ${[...new Set(doppelt)].join(", ")}`);
    }
    if (!istObjekt(a.banner) || !istText(a.banner.name)) f("Feld banner.name fehlt");
  }
  // Schild (SPEZ_03_Schild §3.2): bohrungen.standard und .markierung vollständig, export.techniken und export.laser vollständig, druck wie Beschriftung;
  // materialien (CSV) prüft schildMaterialienLaden (Fehler sperren nur Schild)
  if (id === "schild") {
    const zahlen = (v, n) => Array.isArray(v) && v.length === n && v.every(x => typeof x === "number" && x >= 0);
    const b = a.bohrungen, st = istObjekt(b) ? b.standard : null, mk = istObjekt(b) ? b.markierung : null;
    if (!istObjekt(st) || !BOHRUNG_ANORDNUNGEN.includes(st.anordnung) || !["abstand_x_mm", "abstand_y_mm", "durchmesser_mm"].every(k => typeof st[k] === "number" && st[k] > 0))
      f("Feld bohrungen.standard unvollständig (anordnung, abstand_x_mm, abstand_y_mm, durchmesser_mm > 0)");
    if (!istObjekt(mk) || !(typeof mk.durchmesser_mm === "number" && mk.durchmesser_mm > 0) || !zahlen(mk.cmyk, 4)) f("Feld bohrungen.markierung unvollständig (durchmesser_mm > 0, cmyk)");
    const ex = istObjekt(a.export) ? a.export : {};
    if (!Array.isArray(ex.techniken) || !ex.techniken.every(t => istObjekt(t) && istText(t.rolle) && istText(t.name))) f("Feld export.techniken fehlt (rolle und name je Technik)");
    const l = ex.laser;
    if (!istObjekt(l) || !istText(l.name) || !(zahlen(l.max_mm, 2) && l.max_mm.every(x => x > 0)) || !(typeof l.kontur_pt === "number" && l.kontur_pt > 0)
      || !zahlen(l.umriss_cmyk, 4) || !zahlen(l.loch_cmyk, 4)) f("Feld export.laser unvollständig (name, max_mm, kontur_pt, umriss_cmyk, loch_cmyk)");
    const d = a.druck;
    if (!istObjekt(d) || !["abstand_mm", "beschnitt_mm", "max_laenge_mm", "max_laenge_sonder_mm"].every(k => typeof d[k] === "number") || !istText(d.cut_farbfeld) || !zahlen(d.cut_cmyk, 4))
      f("Feld druck unvollständig (abstand_mm, beschnitt_mm, max_laenge_mm, max_laenge_sonder_mm, cut_farbfeld, cut_cmyk)");
  }
  // Textil (SPEZ_03_Textil §3.4): kalkuliert_verfahren nicht leer, export.sammelordner ein Pfadfeld von rechner.json, summa.preset;
  // textil (config/textil.json mit den CSVs) prüft textilLaden (Fehler sperren nur Textil)
  if (id === "textil") {
    if (!Array.isArray(a.kalkuliert_verfahren) || !a.kalkuliert_verfahren.length || !a.kalkuliert_verfahren.every(v => TX.VERFAHREN.includes(v)))
      f(`Feld kalkuliert_verfahren fehlt oder ist leer (${TX.VERFAHREN.join(", ")})`);
    const ex = istObjekt(a.export) ? a.export : {};
    if (!SERVER_FELDER.includes(ex.sammelordner)) f(`Feld export.sammelordner muss ein Pfadfeld von rechner.json sein (${SERVER_FELDER.join(", ")})`);
    if (!istObjekt(a.summa) || !istText(a.summa.preset)) f("Feld summa.preset fehlt");
    if (!istObjekt(a.dateien) || !istText(a.dateien.arbeitsdatei)) f("Feld dateien.arbeitsdatei fehlt");
  }
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

/**
 * config/serien.json und config/farbfelder/*.ase: jede Datei vorhanden und lesbar; Rückgabe Farbverzeichnis (farben.js) mit standard (vorgewählte Serie im
 * Fenster „Objekt“, SPEZ_03_Oberflaeche §5) und standardFehler: fehlt „standard“ oder ist es kein schluessel der Liste, ein Popup beim Start, Serie dann
 * ohne Vorwahl (standard null); sperrt nichts.
 */
function farbenLaden(configOrdner) {
  const r = F.serienLaden(configOrdner);
  if (r.fehler.length) throw new KonfigFehler(r.fehler);
  const datei = path.join(configOrdner, "serien.json"), st = r.standard;
  const standardFehler = !istText(st) ? [{ datei, grund: "Feld standard fehlt" }]
    : !r.serien.some(s => s.schluessel === st) ? [{ datei, grund: `standard „${st}“ unbekannt` }] : [];
  return Object.assign(F.verzeichnis(r.serien), { standard: standardFehler.length ? null : st, standardFehler });
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
 * config/werkzeuge.json (SPEZ_03 §5): skripte[] mit datei und label, Pfad <ext>/skripte/<datei>. Fehler der Datei selbst -> KonfigFehler;
 * ein fehlendes Skript sperrt nur seinen Button: Rückgabe { skripte: [{ datei, label, pfad, vorhanden }], fehler: [{ datei: pfad, grund }] }
 */
function werkzeugeLaden(ext, configOrdner) {
  const datei = path.join(configOrdner || path.join(ext, "config"), "werkzeuge.json"), fehler = [];
  const w = jsonLesen(datei, fehler);
  if (fehler.length) throw new KonfigFehler(fehler);
  if (!istObjekt(w) || !Array.isArray(w.skripte)) throw new KonfigFehler([{ datei, grund: "Feld skripte fehlt" }]);
  w.skripte.forEach((s, i) => { if (!istObjekt(s) || !istText(s.datei) || !istText(s.label)) fehler.push({ datei, grund: `skripte[${i}]: datei und label nötig` }); });
  if (fehler.length) throw new KonfigFehler(fehler);
  const skripte = w.skripte.map(s => {
    const pfad = path.join(ext, "skripte", s.datei);
    return { datei: s.datei, label: s.label, pfad, vorhanden: fs.existsSync(pfad) };
  });
  return { skripte, fehler: skripte.filter(s => !s.vorhanden).map(s => ({ datei: s.pfad, grund: "Datei fehlt" })) };
}

/**
 * config/produkte.csv (SPEZ_03_Konfigurationen Fassung 3 §3.1), Pfad aus offset.produkte relativ zur Extension. Spalten durch „;“ getrennt, Kopfzeile mit
 * allen acht Spalten; schluessel eindeutig und nicht leer, bezeichnung nicht leer, Maße > 0, zeichenflaechen 1 | 2 | 1/2; vorlage_hoch/vorlage_quer: nur
 * Dateiname in offset.vorlagen (leer = Ausrichtung gibt es nicht), mindestens eine gefüllt, ohne Pfadtrenner, Endung .ait.
 * Fehler sperren nur die Art Offset: Rückgabe { liste: [{ schluessel, bezeichnung, breite_mm, hoehe_mm, zeichenflaechen, vorlagen: { hoch, quer } (Dateiname
 * oder null), app_typ }] | null, fehler: [{ datei, grund }] } (grund mit Zeilennummer der Datei, Kopfzeile = Zeile 1).
 */
const PRODUKT_SPALTEN = ["schluessel", "bezeichnung", "breite_mm", "hoehe_mm", "zeichenflaechen", "vorlage_hoch", "vorlage_quer", "app_typ"];
const PRODUKT_ZEICHENFLAECHEN = ["1", "2", "1/2"];
const csvZahl = v => Number(String(v).trim().replace(",", "."));
/**
 * gemeinsame CSV-Prüfung (produkte.csv, schild_materialien.csv): Spalten über die Kopfzeile, Leerzeilen übersprungen, Werte getrimmt, BOM entfernt;
 * schluessel eindeutig und nicht leer; eintrag(v, f) baut aus v(spalte) den Eintrag und meldet weitere Gründe über f(grund). Ein Fehler verwirft die Liste.
 */
function csvAusText(text, datei, spalten, eintrag) {
  const fehler = [], liste = [];
  const zeilen = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);
  const kopf = zeilen[0].split(";").map(x => x.trim());
  const fehlt = spalten.filter(s => !kopf.includes(s));
  if (fehlt.length) return { liste: null, fehler: [{ datei, grund: `Zeile 1: Spalte ${fehlt.join(", ")} fehlt in der Kopfzeile` }] };
  const spalte = s => kopf.indexOf(s);
  const schluessel = new Set();
  zeilen.slice(1).forEach((roh, i) => {
    const nr = i + 2, f = grund => fehler.push({ datei, grund: `Zeile ${nr}: ${grund}` });
    if (!roh.trim()) return;
    const w = roh.split(";").map(x => x.trim()), v = s => (w[spalte(s)] === undefined ? "" : w[spalte(s)]);
    const vorher = fehler.length;
    const k = v("schluessel");
    if (!k) f("schluessel fehlt");
    else if (schluessel.has(k)) f(`schluessel „${k}“ doppelt`);
    const p = eintrag(v, f);
    if (k) schluessel.add(k);
    if (fehler.length === vorher) liste.push(p);
  });
  return fehler.length ? { liste: null, fehler } : { liste, fehler: [] };
}
function produkteAusText(text, datei) {
  return csvAusText(text, datei, PRODUKT_SPALTEN, (v, f) => {
    const p = { schluessel: v("schluessel"), bezeichnung: v("bezeichnung"), breite_mm: csvZahl(v("breite_mm")), hoehe_mm: csvZahl(v("hoehe_mm")),
      zeichenflaechen: v("zeichenflaechen"), vorlagen: { hoch: v("vorlage_hoch") || null, quer: v("vorlage_quer") || null }, app_typ: v("app_typ") || null };
    if (!p.bezeichnung) f("bezeichnung fehlt");
    if (!(p.breite_mm > 0)) f("breite_mm muss > 0 sein");
    if (!(p.hoehe_mm > 0)) f("hoehe_mm muss > 0 sein");
    if (!PRODUKT_ZEICHENFLAECHEN.includes(p.zeichenflaechen)) f(`zeichenflaechen „${p.zeichenflaechen}“ unbekannt (1, 2 oder 1/2)`);
    if (!p.vorlagen.hoch && !p.vorlagen.quer) f("vorlage_hoch und vorlage_quer leer");
    for (const a of ["hoch", "quer"]) {
      const d = p.vorlagen[a];
      if (!d) continue;
      if (/[\\/]/.test(d)) f(`vorlage_${a} „${d}“: nur Dateiname ohne Pfad`);
      else if (!/\.ait$/i.test(d)) f(`vorlage_${a} „${d}“: Endung .ait fehlt`);
    }
    return p;
  });
}
function produkteLaden(ext, offset) {
  if (!offset || !istText(offset.produkte)) return { liste: null, fehler: [{ datei: path.join(ext, "config", "auftragsarten", "offset.json"), grund: "Feld produkte fehlt" }] };
  const datei = path.join(ext, offset.produkte);
  let text;
  try { text = fs.readFileSync(datei, "utf8"); }
  catch (e) { return { liste: null, fehler: [{ datei, grund: e.code === "ENOENT" ? "Datei fehlt" : `nicht lesbar (${e.code || e.message})` }] }; }
  return produkteAusText(text, datei);
}

/**
 * config/schild_materialien.csv (SPEZ_03_Schild §3.1), Pfad aus schild.materialien relativ zur Extension. Kopfzeile mit allen fünf Spalten; schluessel
 * eindeutig und nicht leer, bezeichnung und kuerzel nicht leer, staerke > 0 (Dezimalkomma oder -punkt), acryl ja | nein. Fehler sperren nur die Art Schild:
 * Rückgabe { liste: [{ schluessel, bezeichnung, kuerzel, staerke, acryl (true/false) }] | null, fehler: [{ datei, grund }] }.
 */
const MATERIAL_SPALTEN = ["schluessel", "bezeichnung", "kuerzel", "staerke", "acryl"];
const ACRYL = { ja: true, nein: false };
function schildMaterialienAusText(text, datei) {
  return csvAusText(text, datei, MATERIAL_SPALTEN, (v, f) => {
    const m = { schluessel: v("schluessel"), bezeichnung: v("bezeichnung"), kuerzel: v("kuerzel"), staerke: csvZahl(v("staerke")), acryl: ACRYL[v("acryl")] };
    if (!m.bezeichnung) f("bezeichnung fehlt");
    if (!m.kuerzel) f("kuerzel fehlt");
    if (!(m.staerke > 0)) f("staerke muss > 0 sein");
    if (m.acryl === undefined) f(`acryl „${v("acryl")}“ unbekannt (ja oder nein)`);
    return m;
  });
}
function schildMaterialienLaden(ext, schild) {
  if (!schild || !istText(schild.materialien)) return { liste: null, fehler: [{ datei: path.join(ext, "config", "auftragsarten", "schild.json"), grund: "Feld materialien fehlt" }] };
  const datei = path.join(ext, schild.materialien);
  let text;
  try { text = fs.readFileSync(datei, "utf8"); }
  catch (e) { return { liste: null, fehler: [{ datei, grund: e.code === "ENOENT" ? "Datei fehlt" : `nicht lesbar (${e.code || e.message})` }] }; }
  return schildMaterialienAusText(text, datei);
}

/**
 * Textil (SPEZ_03_Textil §3): config/textil.json (Pfad aus textil.textil relativ zur Extension) und daneben textil_stufen.csv, textil_modelle.csv,
 * textil_farben.csv. Fehler sperren nur die Art Textil: Rückgabe { konfig: { datei, cfg, stufen, modelle, farben } | null, fehler: [{ datei, grund }] }.
 */
const TEXTIL_CSV = [["textil_stufen.csv", "stufen", TX.stufenLesen], ["textil_modelle.csv", "modelle", TX.modelleLesen], ["textil_farben.csv", "farben", TX.farbenLesen]];
function textilLaden(ext, textil) {
  if (!textil || !istText(textil.textil)) return { konfig: null, fehler: [{ datei: path.join(ext, "config", "auftragsarten", "textil.json"), grund: "Feld textil fehlt" }] };
  const datei = path.join(ext, textil.textil), fehler = [];
  const cfg = jsonLesen(datei, fehler);
  if (cfg !== undefined) TX.konfigPruefen(cfg).forEach(grund => fehler.push({ datei, grund }));
  const k = { datei, cfg };
  for (const [name, feld, lesen] of TEXTIL_CSV) {
    const d = path.join(path.dirname(datei), name);
    let text;
    try { text = fs.readFileSync(d, "utf8"); }
    catch (e) { fehler.push({ datei: d, grund: e.code === "ENOENT" ? "Datei fehlt" : `nicht lesbar (${e.code || e.message})` }); continue; }
    const r = lesen(text, d);
    fehler.push(...r.fehler);
    k[feld] = r.liste;
  }
  return fehler.length ? { konfig: null, fehler } : { konfig: k, fehler: [] };
}

/**
 * config/nutzen.json (SPEZ_03_Nutzen §3.1): Nutzen, Bögl-Funktionen (Gitterscheiben, MB-Nummern). Prüfung: Datei lesbar, alle Felder vorhanden, Zahlen > 0,
 * Medien in medien.json, Laminat eines der Auftragsart Beschriftung, beide Vorlagen vorhanden (relativ zur Extension). Fehler sperren nur die Buttons
 * Nutzen, Gitter, MB-Nr: Rückgabe { konfig | null, fehler: [{ datei, grund }] }.
 */
const NUTZEN_FELDER = {
  nutzen: { zahlen: ["stueckzahl", "abstand_motive_mm", "abstand_boegen_mm", "toleranz"], texte: ["medium", "laminat", "produkt", "dateiname"] },
  boegl: { zahlen: [], texte: ["kunde", "kundenordner", "medium", "laminat", "typgedaechtnis", "auftrag", "dateiname"] },
  gitter: { zahlen: ["teilung_etikett_mm", "teilung_streifen_mm", "zulaessig_mm", "schrift_schritt_pt", "schrift_min_pt"], texte: ["ordner", "vorlage", "praefix_trenner"] },
  mb: { zahlen: ["schild_mm", "abstand_mm", "spalten", "block_abstand_mm", "nummern"], texte: ["ordner", "vorlage"] }
};
function nutzenPruefen(c, ext, medien, beschriftung) {
  const f = [], pos = v => typeof v === "number" && v > 0;
  if (!istObjekt(c)) return ["kein JSON-Objekt"];
  for (const [b, { zahlen, texte }] of Object.entries(NUTZEN_FELDER)) {
    if (!istObjekt(c[b])) { f.push(`Bereich ${b} fehlt`); continue; }
    for (const k of zahlen) if (!pos(c[b][k])) f.push(`Feld ${b}.${k} fehlt (Zahl > 0)`);
    for (const k of texte) if (!istText(c[b][k])) f.push(`Feld ${b}.${k} fehlt`);
  }
  if (f.length) return f;
  const fm = c.nutzen.formate;
  if (!Array.isArray(fm) || !fm.length) f.push("Feld nutzen.formate fehlt oder ist leer");
  else {
    fm.forEach((x, i) => {
      if (!istObjekt(x) || !istText(x.id) || !istText(x.name)) f.push(`nutzen.formate[${i}]: id und name nötig`);
      else if (x.id !== "ohne" && !(pos(x.breite_mm) && pos(x.hoehe_mm))) f.push(`nutzen.formate[${i}]: breite_mm und hoehe_mm fehlen (Zahl > 0)`);
    });
    if (!fm.some(x => istObjekt(x) && x.id === "ohne")) f.push("nutzen.formate: Format „ohne“ fehlt");
  }
  const em = c.gitter.etikett_mm;
  if (!Array.isArray(em) || em.length !== 2 || !em.every(pos)) f.push("Feld gitter.etikett_mm fehlt (zwei Zahlen > 0)");
  if (!/^[^/]+\/[^/]+$/.test(c.boegl.kundenordner)) f.push(`Feld boegl.kundenordner „${c.boegl.kundenordner}“: <Buchstabe>/<Kunde> erwartet`);
  const laminate = ((beschriftung && beschriftung.laminate) || []).map(l => l.schluessel);
  for (const b of ["nutzen", "boegl"]) {
    if (!((medien && medien.medien) || {})[c[b].medium]) f.push(`Feld ${b}.medium: Medium „${c[b].medium}“ steht nicht in config/medien.json`);
    if (!laminate.includes(c[b].laminat)) f.push(`Feld ${b}.laminat: Laminat „${c[b].laminat}“ unbekannt (${laminate.join(", ")})`);
  }
  for (const b of ["gitter", "mb"]) if (!fs.existsSync(path.join(ext, c[b].vorlage))) f.push(`Vorlage fehlt: ${c[b].vorlage}`);
  return f;
}
function nutzenLaden(ext, medien, arten, configOrdner) {
  const datei = path.join(configOrdner || path.join(ext, "config"), "nutzen.json"), fehler = [];
  const c = jsonLesen(datei, fehler);
  if (c !== undefined) nutzenPruefen(c, ext, medien, arten && arten.beschriftung).forEach(grund => fehler.push({ datei, grund }));
  return fehler.length ? { konfig: null, fehler } : { konfig: c, fehler: [] };
}

/**
 * Alles beim Panelstart: { ext, rechner, schema, arten, mapping, medien, farben, werkzeuge, produkte, schildMaterialien, textil, nutzen } oder KonfigFehler mit
 * allen Fehlern (werkzeuge.fehler, fehlende Skripte, produkte.fehler, Art Offset gesperrt, schildMaterialien.fehler, Art Schild gesperrt, textil.fehler, Art
 * Textil gesperrt, und nutzen.fehler, Nutzen, Gitter und MB-Nr gesperrt, zeigt das Panel selbst).
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
  const werkzeuge = sammle(() => werkzeugeLaden(ext, config));
  if (fehler.length) throw new KonfigFehler(fehler);
  const produkte = produkteLaden(ext, arten.offset);
  const schildMaterialien = schildMaterialienLaden(ext, arten.schild);
  const textil = textilLaden(ext, arten.textil);
  const nutzen = nutzenLaden(ext, medien, arten, config);
  return { ext, rechner, schema, arten, mapping, medien, farben, werkzeuge, produkte, schildMaterialien, textil, nutzen };
}

/** Auftragsarten in Dialog-Reihenfolge */
const artenSortiert = arten => Object.values(arten).sort((a, b) => a.reihenfolge - b.reihenfolge);

module.exports = { ARTEN, PROFILE, ZEICHENFLAECHEN, KonfigFehler, pfadAufloesen, rechnerOrt, rechnerAusDaten, rechnerLaden, schemaLaden,
  artPruefen, auftragsartenLaden, mappingLaden, artZuProdukt, medienLaden, farbenLaden, preislisteStartpruefung, werkzeugeLaden, produkteAusText, produkteLaden,
  schildMaterialienAusText, schildMaterialienLaden, textilLaden, nutzenPruefen, nutzenLaden, allesLaden, artenSortiert };
