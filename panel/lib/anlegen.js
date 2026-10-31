/* Anlegen „ohne Auftrag“ (SPEZ_01 §8): Auftragsart manuell, Kunde, Quelle geöffnete Datei / Datei öffnen / leer.
 * Artabhängige Wahl für Offset, Banner/Roll-up, Sonstiges, Lasergravur als ein Wahl-Objekt e.wahl (SPEZ_03_Konfigurationen §2.1, Austauschstelle Stufe 3):
 *   offset { produkt: schluessel | null (freies Format), ausrichtung, seiten, breite_mm, hoehe_mm (nur freies Format) },
 *   banner_rollup { variante: "banner" | rollup-id, breite_mm, hoehe_mm, anzahl (nur banner) }, sonstiges { breite_mm, hoehe_mm, anzahl }, lasergravur {},
 *   schild { verfahren: "folie" | "uv", material: schluessel aus schild_materialien.csv } (SPEZ_03_Schild §2.3),
 *   textil { modell: id aus textil_modelle.csv, farbe: { name, cmyk: [c, m, y, k] | null } | null } (SPEZ_03_Textil §2.4).
 * Ablauf: Kundenordner sicherstellen (export.kundenordnerSicherstellen), Ziel bestimmen, XMP bauen, Arbeitsdatei im JSX-Kern erzeugen
 * (IP.arbeitsdateiAnlegen) und als Arbeitsdatei.ai speichern. Keine fremde Datei wird verändert oder verschoben.
 * Textil (SPEZ_03_Textil §4, §6.2): Grundlage „mockup“ – Kopie des MockUps des Modells als Korrekturabzug_<ID>.ai (dieselbe ID ein zweites Mal im Ordner
 * _02 …), Quellinhalt als Block auf „Design“, unskaliert; „Modell hinzufügen“ legt eine weitere Arbeitsdatei im Ordner der aktiven an. */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require("./ablage");
const D = require("./dokument");
const EX = require("./export");
const TX = require("./textil");

const DIALOG_ARTEN = ["fahrzeugbeschriftung", "beschriftung", "schild", "banner_rollup", "lasergravur", "offset", "textil", "sonstiges"];
const QUELLE_XMP = { offen: "geoeffnet", datei: "datei", leer: "leer" };

const dialogArten = arten => DIALOG_ARTEN.map(id => arten[id]).filter(Boolean).sort((a, b) => a.reihenfolge - b.reihenfolge);
const istAi = p => /\.ai$/i.test(String(p || ""));
/** Quelle braucht die Maßstabsfrage: .ai ohne Panel-XMP */
const massstabFrage = (quelle, info, quellXmp) => quelle !== "leer" && !!info && istAi(info.pfad) && !quellXmp;

// ----- Vorlagen Offset und Roll-up (SPEZ_03_Konfigurationen §3.2, §4.2): Prüfung auf vorhandene Dateien beim Öffnen des Dialogs -----
/** <ext>/<offset.vorlagen>/<Dateiname aus vorlage_hoch bzw. vorlage_quer> (SPEZ_03_Konfigurationen Fassung 3 §3.1) */
const offsetVorlage = (ext, aa, p, ausrichtung) => path.join(ext, aa.vorlagen, p.vorlagen[ausrichtung]);
/** je Produkt (CSV-Reihenfolge): angeboten = Ausrichtungen mit gefüllter Spalte und vorhandener Vorlage, fehlend = Pfade der fehlenden; gesperrt ohne jede Vorlage */
function offsetAngebot(ext, aa, produkte) {
  return (produkte || []).map(p => {
    const pfade = ["hoch", "quer"].filter(a => p.vorlagen[a]).map(a => ({ a, pfad: offsetVorlage(ext, aa, p, a) }));
    const da = pfade.filter(x => fs.existsSync(x.pfad));
    return { produkt: p, ausrichtungen: da.map(x => x.a), fehlend: pfade.filter(x => !da.includes(x)).map(x => x.pfad), gesperrt: !da.length };
  });
}
/** je Roll-up-Größe: pfad der Vorlage, vorhanden */
const rollupAngebot = (ext, aa) => (aa.rollup || []).map(r => ({ rollup: r, pfad: path.join(ext, r.vorlage), vorhanden: fs.existsSync(path.join(ext, r.vorlage)) }));

/**
 * Vorbelegung (SPEZ_03_Konfigurationen §2.2, §3.3, §5): info = dokumentInfo einer Quelle mit Inhalt oder null (leer); massstab der Quelle.
 * Mit Quelle Realmaß von Zeichenfläche 1 (Dokumentmaß × Maßstab, auf 0,01 mm), Anzahl ihrer Zeichenflächen, „quer“ wenn Zeichenfläche 1 breiter als hoch;
 * leer Maße aus der Konfiguration (sonst null), Anzahl 1, „hoch“. -> { breite_mm, hoehe_mm, anzahl, ausrichtung }
 */
function vorbelegung(aa, info, massstab) {
  const z = aa.zeichenflaeche, zf = info && Array.isArray(info.zeichenflaechen) ? info.zeichenflaechen : null;
  if (!zf || !zf.length) return { breite_mm: z.breite_mm || null, hoehe_mm: z.hoehe_mm || null, anzahl: 1, ausrichtung: "hoch" };
  const m = Number(massstab) || 1, real = v => Math.round(v * m * 100) / 100, e = zf[0];
  return { breite_mm: real(e.breite_mm), hoehe_mm: real(e.hoehe_mm), anzahl: zf.length, ausrichtung: e.breite_mm > e.hoehe_mm ? "quer" : "hoch" };
}

/**
 * Ort der Arbeitsdatei: arbeitsdateien lokal -> <arbeitsdateien>/<Kunde>/<auftragsordner>/, „server“ -> Server-Auftragsordner.
 * Auftragsordner JJJJ-MM-TT_<Auftragsart>; ist er belegt (Server: vorhanden, lokal: Arbeitsdatei vorhanden, Textil: irgendein Korrekturabzug_*.ai), _02, _03 …
 * name: Dateiname der Arbeitsdatei (Textil: Korrekturabzug_<ID>.ai), sonst dateien.arbeitsdatei.
 */
function zielBestimmen(rechner, aa, kunde, kundenordner, jetzt, name) {
  const basisName = A.auftragsordnerName(jetzt, aa.name), datei = name || aa.dateien.arbeitsdatei;
  const belegt = o => (aa.id === "textil" ? TX.korrekturDateien([o], aa.dateien.arbeitsdatei).length > 0 : fs.existsSync(path.join(o, datei)));
  if (rechner.arbeitsdateienServer) {
    if (!kundenordner) throw new Error("Kein Kundenordner – Arbeitsdatei kann nicht auf dem Server angelegt werden");
    const kundenPfad = A.unter(rechner.server.kunden, kundenordner);
    if (!fs.existsSync(kundenPfad)) throw new Error(`Kundenordner fehlt auf dem Server:\n${kundenPfad}`);
    const ao = EX.auftragsordnerFrei(kundenPfad, { ablage: { kundenordner, auftragsordner: basisName }, exporte: [] }, null);
    return { auftragsordner: ao, ordner: path.join(kundenPfad, ao), basis: kundenPfad, datei: path.join(kundenPfad, ao, datei) };
  }
  const basis = path.join(rechner.lokal.arbeitsdateien, A.dateiname(kunde));
  for (let n = 1; n < 1000; n++) {
    const ao = A.nummeriert(basisName, n);
    if (!belegt(path.join(basis, ao))) return { auftragsordner: ao, ordner: path.join(basis, ao), basis: rechner.lokal.arbeitsdateien, datei: path.join(basis, ao, datei) };
  }
  throw new Error(`Kein freier Auftragsordner für ${basisName}`);
}

/** Hilfslinien-Ebenen (SPEZ_03_Konfigurationen Fassung 4 §3.1, §12): alle Ebenen der Vorlage mit einem Namen aus hilfslinien.ebenen */
const hilfslinienEbenen = aa => (aa.hilfslinien && Array.isArray(aa.hilfslinien.ebenen) ? aa.hilfslinien.ebenen.filter(n => typeof n === "string" && n) : []);
/** Offset (Grundlage produktvorlage, SPEZ_03_Konfigurationen §3.3): Vorlage je Produkt und Ausrichtung bzw. Offset.ait (freies Format);
 * Prüfmaß = breite_mm/hoehe_mm, für quer gedreht – ohne hoch-Vorlage gilt das Maß für quer */
function offsetSpec(ext, aa, w, produkte, mitQuelle) {
  const seiten = Number(w.seiten);
  const s = { grundlage: "produktvorlage", platzierung: "zeichenflaeche", hilfslinien: hilfslinienEbenen(aa), ohne: hilfslinienEbenen(aa), leereWeg: mitQuelle,
    pruefung: null, nurErste: false, zf: null };
  if (!(seiten === 1 || seiten === 2)) throw new Error("Anzahl Zeichenflächen angeben");
  if (w.produkt === null) {
    const zf = { breite_mm: Number(w.breite_mm), hoehe_mm: Number(w.hoehe_mm), anzahl: seiten, abstand_mm: aa.zeichenflaechen_abstand_mm || 0 };
    if (!(zf.breite_mm > 0 && zf.hoehe_mm > 0)) throw new Error("Breite und Höhe angeben");
    return Object.assign(s, { vorlageDatei: path.join(ext, aa.frei.vorlage), zf });
  }
  const p = (produkte || []).find(x => x.schluessel === w.produkt);
  if (!p) throw new Error(`Produkt „${w.produkt}“ fehlt in produkte.csv`);
  if (!["hoch", "quer"].includes(w.ausrichtung) || !p.vorlagen[w.ausrichtung]) throw new Error(`${p.bezeichnung}: Ausrichtung „${w.ausrichtung}“ nicht vorgesehen`);
  if (p.zeichenflaechen !== "1/2" && seiten !== Number(p.zeichenflaechen)) throw new Error(`${p.bezeichnung}: ${p.zeichenflaechen} Zeichenfläche(n)`);
  const quer = w.ausrichtung === "quer" && !!p.vorlagen.hoch;
  return Object.assign(s, { vorlageDatei: offsetVorlage(ext, aa, p, w.ausrichtung),
    pruefung: { breite_mm: quer ? p.hoehe_mm : p.breite_mm, hoehe_mm: quer ? p.breite_mm : p.hoehe_mm, anzahl: p.zeichenflaechen === "1" ? 1 : 2 },
    nurErste: p.zeichenflaechen === "1/2" && seiten === 1 });
}
/** Roll-up (Grundlage produktvorlage, SPEZ_03_Konfigurationen §4.3): Zeichenfläche aus der Vorlage, Quellinhalt als ein Block mittig; Hilfslinien wie Offset */
function rollupSpec(ext, aa, w, mitQuelle) {
  const r = (aa.rollup || []).find(x => x.id === w.variante);
  if (!r) throw new Error(`${aa.name}: Variante „${w.variante}“ unbekannt`);
  return { grundlage: "produktvorlage", platzierung: "block", hilfslinien: hilfslinienEbenen(aa), ohne: hilfslinienEbenen(aa), leereWeg: mitQuelle, vorlageDatei: path.join(ext, r.vorlage),
    pruefung: { breite_mm: r.breite_mm, hoehe_mm: r.hoehe_mm, anzahl: 1 }, nurErste: false, zf: null };
}
/** Textil: Modell mit MockUp-Datei zum Wahl-Objekt (tk = konf.textil.konfig) */
function textilModell(ext, tk, w) {
  if (!tk) throw new Error("Textil: Konfiguration fehlerhaft (config/textil.json, textil_*.csv)");
  if (!w || !w.modell) throw new Error("Modell wählen");
  const m = TX.mockupsListe(ext, tk).find(x => x.id === w.modell);
  if (!m) throw new Error(`Modell „${w.modell}“: kein MockUp in ${TX.mockupOrdner(ext, tk.cfg)}`);
  return m;
}
/** Textil (Grundlage „mockup“, SPEZ_03_Textil §4): MockUp öffnen, ID prüfen, Quelle als Block auf „Design“ (unskaliert; Arbeitsdatei Textil als Quelle:
 *  nur ihre Ebene „Design“), Stofffarbe umfärben bei cmyk */
function mockupSpec(m, w, e) {
  const textilQuelle = !!(e.quellXmp && e.quellXmp.auftragsart === "textil");
  return { grundlage: "mockup", vorlageDatei: m.datei, id: m.id, nurEbene: textilQuelle ? "Design" : null,
    stofffarbe: w.farbe && Array.isArray(w.farbe.cmyk) ? w.farbe.cmyk : null };
}
/** art-spezifische XMP-Bereiche (SPEZ_03_Konfigurationen §8, SPEZ_03_Schild §5, SPEZ_03_Textil §5) aus dem Wahl-Objekt; Bezeichnung, Material bzw. Modell
 *  werden beim Anlegen festgeschrieben; materialien: Liste aus config/schild_materialien.csv; tm: Textil-Modell (textilModell), marken aus textil.json */
function bereiche(aa, w, produkte, materialien, tm, marken) {
  if (aa.id === "offset") {
    const p = w.produkt === null ? null : (produkte || []).find(x => x.schluessel === w.produkt);
    return { offset: { produkt: p ? p.schluessel : null, bezeichnung: p ? p.bezeichnung : null, ausrichtung: p ? w.ausrichtung : null, seiten: Number(w.seiten) } };
  }
  if (aa.id === "banner_rollup") return { banner_rollup: { variante: w.variante } };
  if (aa.id === "schild") {
    const m = (materialien || []).find(x => x.schluessel === w.material);
    if (!m) throw new Error(`Material „${w.material}“ fehlt in schild_materialien.csv`);
    return { schild: { verfahren: w.verfahren, material: Object.assign({}, m), schilder: [] } };
  }
  if (aa.id === "textil") {
    const f = w.farbe && String(w.farbe.name || "").trim() ? { name: String(w.farbe.name).trim(), cmyk: Array.isArray(w.farbe.cmyk) ? w.farbe.cmyk.slice() : null } : null;
    return { textil: { modell: TX.modellXmp(tm, marken), farbe: f } };
  }
  return {};
}

/**
 * Auftrag für IP.arbeitsdateiAnlegen aus Konfiguration und Dialog.
 * e: { quelle: "offen"|"datei"|"leer", selbstGeoeffnet, fahrzeugvorlage, wahl (Offset, Banner/Roll-up, Sonstiges, Lasergravur, Schild, Textil), quellMassstab,
 * quellXmp }; produkte: Liste aus config/produkte.csv (Offset); tm: Textil-Modell mit MockUp-Datei (textilModell)
 */
function jsxSpec(ext, aa, e, produkte, tm) {
  const mitQuelle = e.quelle !== "leer";
  const fzv = !!(e.fahrzeugvorlage && aa.zeichenflaeche.fahrzeugvorlage && mitQuelle && !e.quellXmp);
  const z = fzv ? aa.zeichenflaeche.fahrzeugvorlage : aa.zeichenflaeche;
  // Maßstab: Quelle aus ihrem XMP, ohne XMP aus der Abfrage (Standard 1:1); bei Wechsel skaliert (pct), Ergebnis dann auf der Sandbox
  // Textil: keine Maßstabsabfrage, immer 1:1 (SPEZ_03_Textil §4)
  const q = mitQuelle && z.art !== "mockup" ? (e.quellXmp ? Number(e.quellXmp.massstab) || 1 : Number(e.quellMassstab) || 1) : aa.massstab.standard;
  const pct = fzv ? 100 : q / aa.massstab.standard * 100;
  // Schild: gleichnamige Ebenen nur bei gleichem Verfahren der Quelle (SPEZ_03_Schild §4), sonst alles auf die Sandbox
  const w = e.wahl || {};
  const verfahrenGleich = aa.id !== "schild" || !!(e.quellXmp && e.quellXmp.schild && e.quellXmp.schild.verfahren === w.verfahren);
  const gleich = !!(e.quellXmp && e.quellXmp.auftragsart === aa.id && pct === 100 && verfahrenGleich);
  const spec = {
    quelle: e.quelle, selbstGeoeffnet: !!e.selbstGeoeffnet, kopie: null, pct, gleich,
    ohne: gleich ? aa.ebenen.filter(x => x.rolle === "vorlage").map(x => x.name) : [],
    sandbox: aa.quelle.sandbox, ebenen: aa.ebenen.map(x => ({ name: x.name, gesperrt: !!x.gesperrt })),
    aktiveEbene: aa.aktiveEbene || aa.quelle.sandbox || null
  };
  if (fzv) {
    spec.grundlage = "fahrzeugvorlage";
    spec.vorlageEbene = (aa.ebenen.find(x => x.rolle === "vorlage") || {}).name;
    if (!spec.vorlageEbene) throw new Error(`${aa.name}: keine Ebene mit Rolle „vorlage“`);
  } else if (z.art === "neu") Object.assign(spec, { grundlage: "neu", breite_mm: z.breite_mm, hoehe_mm: z.hoehe_mm });
  else if (z.art === "produktvorlage") Object.assign(spec, offsetSpec(ext, aa, w, produkte, mitQuelle));
  else if (z.art === "mockup") Object.assign(spec, mockupSpec(tm, w, e), { gleich: false, ohne: [] });
  else if (aa.id === "banner_rollup" && w.variante !== "banner") Object.assign(spec, rollupSpec(ext, aa, w, mitQuelle));
  else if (z.art === "vorlage") {
    const v = (aa.verfahren || {})[w.verfahren];
    if (!v) throw new Error(`${aa.name}: Verfahren wählen`);
    const ebenen = v.ebenen.map(n => aa.ebenen.find(x => x.name === n));
    if (ebenen.some(x => !x)) throw new Error(`${aa.name}: Verfahren „${w.verfahren}“ nennt eine unbekannte Ebene`);
    Object.assign(spec, { grundlage: "vorlage", vorlageDatei: path.join(ext, v.vorlage), zfAusQuelle: mitQuelle, abstand_mm: aa.zeichenflaechen_abstand_mm || 0,
      ebenen: ebenen.map(x => ({ name: x.name, gesperrt: !!x.gesperrt })) });
  } else if (z.art === "fest" || z.art === "abfrage") {
    const zf = z.art === "fest" ? { breite_mm: z.breite_mm, hoehe_mm: z.hoehe_mm, anzahl: 1 }
      : { breite_mm: Number(w.breite_mm), hoehe_mm: Number(w.hoehe_mm), anzahl: Number(w.anzahl) };
    if (!(zf.breite_mm > 0 && zf.hoehe_mm > 0)) throw new Error("Breite und Höhe angeben");
    if (!(Number.isInteger(zf.anzahl) && zf.anzahl >= 1)) throw new Error("Anzahl Zeichenflächen angeben");
    zf.abstand_mm = aa.zeichenflaechen_abstand_mm || 0;
    Object.assign(spec, { grundlage: "duplikat", zf });
  } else throw new Error(`${aa.name}: Zeichenfläche „${z.art}“ ist in Stufe 1 nicht angelegt`);
  return spec;
}

/**
 * Arbeitsdatei anlegen. ctx: { ext, konf, host, ordnerWaehlen, meldung, jetzt }; e wie jsxSpec plus { art, kunde, info (dokumentInfo der Quelle) }.
 * -> Ergebnis des JSX-Kerns plus { ordner, xmp }. Abbruch im Ordnerdialog -> export.Abbruch.
 */
async function anlegen(ctx, e) {
  const aa = ctx.konf.arten[e.art];
  if (!aa || !DIALOG_ARTEN.includes(e.art)) throw new Error("Auftragsart wählen");
  const kunde = String(e.kunde || "").trim();
  if (!kunde) throw new Error("Kundenname fehlt");
  const produkte = ctx.konf.produkte ? ctx.konf.produkte.liste : null;
  const materialien = ctx.konf.schildMaterialien ? ctx.konf.schildMaterialien.liste : null;
  const tk = ctx.konf.textil ? ctx.konf.textil.konfig : null, tm = aa.id === "textil" ? textilModell(ctx.ext, tk, e.wahl) : null;
  const spec = jsxSpec(ctx.ext, aa, e, produkte, tm);
  const jetzt = ctx.jetzt ? ctx.jetzt() : new Date();
  const k = await EX.kundenordnerSicherstellen(null, { rechner: ctx.konf.rechner, ordnerWaehlen: ctx.ordnerWaehlen, meldung: ctx.meldung });
  const name = tm ? TX.arbeitsdateiName(A.dateiname, aa.dateien.arbeitsdatei, tm.id, () => false) : null; // neuer Auftragsordner: ohne _02
  const z = zielBestimmen(ctx.konf.rechner, aa, kunde, k.kundenordner, jetzt, name);
  const xmp = D.neu({ auftragsart: aa.id, massstab: aa.massstab.standard, kunde, kundenordner: k.kundenordner, auftragsordner: z.auftragsordner,
    quelle: { art: QUELLE_XMP[e.quelle], pfad: e.quelle !== "leer" && e.info ? e.info.pfad || null : null }, jetzt,
    ...bereiche(aa, e.wahl || {}, produkte, materialien, tm, tk && tk.cfg.marken) });
  Object.assign(spec, { xmp: D.serialisieren(xmp), datei: z.datei });
  fs.mkdirSync(z.ordner, { recursive: true });
  // gespeicherte, unveränderte .ai als Grundlage (Fahrzeugvorlage, Arten ohne Sandbox): Dateikopie statt Duplikat; das Original wird nur gelesen
  if (e.quelle === "offen" && ["fahrzeugvorlage", "duplikat"].includes(spec.grundlage) && e.info && e.info.gespeichert && istAi(e.info.pfad)) {
    fs.copyFileSync(e.info.pfad, z.datei, fs.constants.COPYFILE_EXCL);
    spec.kopie = z.datei;
  }
  try {
    const r = await ctx.host("arbeitsdateiAnlegen", spec);
    return Object.assign(r, { ordner: z.ordner, xmp });
  } catch (err) {
    if (spec.kopie) { try { fs.unlinkSync(spec.kopie); } catch (x) { /* schon weg */ } }
    A.leereOrdnerWeg(z.ordner, z.basis);
    throw err;
  }
}

/**
 * Textil „Modell hinzufügen“ (SPEZ_03_Textil §6.2): weitere Arbeitsdatei Korrekturabzug_<ID>.ai (bzw. _02 …) im Ordner der vorderen, gespeicherten
 * Textil-Arbeitsdatei, ohne Quelle, mit kunde, auftrag und ablage der aktiven und eigenem Bereich textil; sie wird aktiv.
 * ctx { ext, konf, host, jetzt }; wahl = Wahl-Objekt textil. -> Ergebnis des JSX-Kerns plus { xmp }
 */
async function modellHinzufuegen(ctx, wahl) {
  const aa = ctx.konf.arten.textil, info = await ctx.host("dokumentInfo");
  let alt = null;
  try { alt = info.hatDokument ? D.parsen(info.xmp) : null; } catch (e) { alt = null; }
  if (!alt || alt.rolle !== "arbeitsdatei" || alt.auftragsart !== "textil") throw new Error("Keine Textil-Arbeitsdatei vorn");
  if (!info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
  const tk = ctx.konf.textil ? ctx.konf.textil.konfig : null, tm = textilModell(ctx.ext, tk, wahl);
  const ordner = path.dirname(info.pfad);
  const datei = path.join(ordner, TX.arbeitsdateiName(A.dateiname, aa.dateien.arbeitsdatei, tm.id, n => fs.existsSync(path.join(ordner, n))));
  const ab = alt.ablage || {};
  const xmp = D.neu({ auftragsart: aa.id, massstab: aa.massstab.standard, kunde: alt.kunde, kundenordner: ab.kundenordner || null, auftragsordner: ab.auftragsordner,
    quelle: { art: "leer", pfad: null }, auftrag: alt.auftrag, jetzt: ctx.jetzt ? ctx.jetzt() : new Date(), ...bereiche(aa, wahl, null, null, tm, tk.cfg.marken) });
  const spec = Object.assign(jsxSpec(ctx.ext, aa, { quelle: "leer", wahl }, null, tm), { xmp: D.serialisieren(xmp), datei });
  return Object.assign(await ctx.host("arbeitsdateiAnlegen", spec), { xmp });
}

module.exports = { DIALOG_ARTEN, dialogArten, massstabFrage, offsetVorlage, offsetAngebot, rollupAngebot, vorbelegung, zielBestimmen, jsxSpec, bereiche, anlegen,
  modellHinzufuegen, textilModell };
