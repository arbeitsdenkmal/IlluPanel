/* Profil „flach“ (SPEZ_01 §7.3): Lasergravur <Kunde>_laser.pdf, Sonstiges und Banner/Roll-up <Kunde>_druck.pdf.
 * Preset der Auftragsart („pam x4“), alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen (JSX IP.pdfSpeichern).
 * Liefert den Auftrag für den Exportkern; Ort, Nummer, Transfer und XMP macht export.js. */
"use strict";
const A = require("./ablage");

/** aa: Auftragsart, xmp: Dokumentobjekt, host: JSX-Brücke, arbeitsdatei: Pfad der .ai (das Dokument ist danach wieder sie) */
function auftrag(aa, xmp, host, arbeitsdatei) {
  if (aa.export.profil !== "flach") throw new Error(`Auftragsart ${aa.id}: Export-Profil „${aa.export.profil}“ ist nicht „flach“`);
  const name = `${A.dateiname(xmp.kunde)}_${aa.export.dateiname}.pdf`;
  return {
    xmp,
    dateien: [{ name, speichern: lokal => host("pdfSpeichern", { datei: lokal, preset: aa.export.preset, arbeitsdatei }) }],
    dtf: []
  };
}

module.exports = { auftrag };
