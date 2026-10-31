/* Profil „offset“ (SPEZ_03_Konfigurationen §3.4): <Kunde>_<Bezeichnung>_druck.pdf, freies Format <Kunde>_druck.pdf; Bezeichnung aus dem XMP (offset).
 * Preset der Auftragsart („wmd“), alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen, Anschnitt aus dem Dokument (JSX IP.pdfSpeichern).
 * Zusätzlich eine Kopie in den Sammelordner server.wmd_bestellen (Exportkern Schritt 7). Ort, Nummer, Transfer und XMP macht export.js. */
"use strict";
const A = require("./ablage");

/** aa: Auftragsart, xmp: Dokumentobjekt, host: JSX-Brücke, arbeitsdatei: Pfad der .ai (das Dokument ist danach wieder sie) */
function auftrag(aa, xmp, host, arbeitsdatei) {
  if (aa.export.profil !== "offset") throw new Error(`Auftragsart ${aa.id}: Export-Profil „${aa.export.profil}“ ist nicht „offset“`);
  const o = xmp.offset || {}, teile = [A.dateiname(xmp.kunde)];
  if (o.bezeichnung) teile.push(A.dateiname(o.bezeichnung)); // freies Format: ohne Bezeichnung
  const name = `${teile.join("_")}_${aa.export.dateiname}.pdf`;
  return {
    xmp,
    dateien: [{ name, speichern: lokal => host("pdfSpeichern", { datei: lokal, preset: aa.export.preset, anschnitt: aa.export.anschnitt, arbeitsdatei }) }],
    dtf: [],
    wmd: aa.export.sammelordner === "wmd_bestellen" ? [name] : []
  };
}

module.exports = { auftrag };
