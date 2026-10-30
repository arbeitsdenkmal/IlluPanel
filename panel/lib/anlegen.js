/* Anlegen „ohne Auftrag“ (SPEZ_01 §8): Auftragsart manuell, Kunde, Quelle geöffnete Datei / Datei öffnen / leer.
 * Ablauf: Kundenordner sicherstellen (export.kundenordnerSicherstellen), Ziel bestimmen, XMP bauen, Arbeitsdatei im JSX-Kern erzeugen
 * (IP.arbeitsdateiAnlegen) und als Arbeitsdatei.ai speichern. Keine fremde Datei wird verändert oder verschoben. */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require("./ablage");
const D = require("./dokument");
const EX = require("./export");

const DIALOG_ARTEN = ["fahrzeugbeschriftung", "beschriftung", "schild", "banner_rollup", "lasergravur", "sonstiges"]; // Stufe 1: ohne Textil und Offset
const QUELLE_XMP = { offen: "geoeffnet", datei: "datei", leer: "leer" };

const dialogArten = arten => DIALOG_ARTEN.map(id => arten[id]).filter(Boolean).sort((a, b) => a.reihenfolge - b.reihenfolge);
const istAi = p => /\.ai$/i.test(String(p || ""));
/** Quelle braucht die Maßstabsfrage: .ai ohne Panel-XMP */
const massstabFrage = (quelle, info, quellXmp) => quelle !== "leer" && !!info && istAi(info.pfad) && !quellXmp;

/**
 * Ort der Arbeitsdatei: arbeitsdateien lokal -> <arbeitsdateien>/<Kunde>/<auftragsordner>/, „server“ -> Server-Auftragsordner.
 * Auftragsordner JJJJ-MM-TT_<Auftragsart>; ist er belegt (Server: vorhanden, lokal: Arbeitsdatei vorhanden), _02, _03 …
 */
function zielBestimmen(rechner, aa, kunde, kundenordner, jetzt) {
  const basisName = A.auftragsordnerName(jetzt, aa.name), datei = aa.dateien.arbeitsdatei;
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
    if (!fs.existsSync(path.join(basis, ao, datei))) return { auftragsordner: ao, ordner: path.join(basis, ao), basis: rechner.lokal.arbeitsdateien, datei: path.join(basis, ao, datei) };
  }
  throw new Error(`Kein freier Auftragsordner für ${basisName}`);
}

/**
 * Auftrag für IP.arbeitsdateiAnlegen aus Konfiguration und Dialog.
 * e: { quelle: "offen"|"datei"|"leer", selbstGeoeffnet, fahrzeugvorlage, verfahren, breite_mm, hoehe_mm, anzahl, quellMassstab, quellXmp }
 */
function jsxSpec(ext, aa, e) {
  const mitQuelle = e.quelle !== "leer";
  const fzv = !!(e.fahrzeugvorlage && aa.zeichenflaeche.fahrzeugvorlage && mitQuelle && !e.quellXmp);
  const z = fzv ? aa.zeichenflaeche.fahrzeugvorlage : aa.zeichenflaeche;
  // Maßstab: Quelle aus ihrem XMP, ohne XMP aus der Abfrage (Standard 1:1); bei Wechsel skaliert (pct), Ergebnis dann auf der Sandbox
  const q = mitQuelle ? (e.quellXmp ? Number(e.quellXmp.massstab) || 1 : Number(e.quellMassstab) || 1) : aa.massstab.standard;
  const pct = fzv ? 100 : q / aa.massstab.standard * 100;
  const gleich = !!(e.quellXmp && e.quellXmp.auftragsart === aa.id && pct === 100);
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
  else if (z.art === "vorlage") {
    const v = (aa.verfahren || {})[e.verfahren];
    if (!v) throw new Error(`${aa.name}: Verfahren wählen`);
    const ebenen = v.ebenen.map(n => aa.ebenen.find(x => x.name === n));
    if (ebenen.some(x => !x)) throw new Error(`${aa.name}: Verfahren „${e.verfahren}“ nennt eine unbekannte Ebene`);
    Object.assign(spec, { grundlage: "vorlage", vorlageDatei: path.join(ext, v.vorlage), zfAusQuelle: mitQuelle, abstand_mm: aa.zeichenflaechen_abstand_mm || 0,
      ebenen: ebenen.map(x => ({ name: x.name, gesperrt: !!x.gesperrt })) });
  } else if (z.art === "fest" || z.art === "abfrage") {
    const zf = z.art === "fest" ? { breite_mm: z.breite_mm, hoehe_mm: z.hoehe_mm, anzahl: 1 }
      : { breite_mm: Number(e.breite_mm), hoehe_mm: Number(e.hoehe_mm), anzahl: Number(e.anzahl) };
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
  const spec = jsxSpec(ctx.ext, aa, e);
  const jetzt = ctx.jetzt ? ctx.jetzt() : new Date();
  const k = await EX.kundenordnerSicherstellen(null, { rechner: ctx.konf.rechner, ordnerWaehlen: ctx.ordnerWaehlen, meldung: ctx.meldung });
  const z = zielBestimmen(ctx.konf.rechner, aa, kunde, k.kundenordner, jetzt);
  const xmp = D.neu({ auftragsart: aa.id, massstab: aa.massstab.standard, kunde, kundenordner: k.kundenordner, auftragsordner: z.auftragsordner,
    quelle: { art: QUELLE_XMP[e.quelle], pfad: e.quelle !== "leer" && e.info ? e.info.pfad || null : null }, jetzt });
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

module.exports = { DIALOG_ARTEN, dialogArten, massstabFrage, zielBestimmen, jsxSpec, anlegen };
