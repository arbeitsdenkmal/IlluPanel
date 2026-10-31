/* <Kunde>_Zusammenfassung.pdf (SPEZ_02 §9, Produktionsdatenblatt): Kopf (Kunde, Auftragsart, Datum, Maßstab), Objekttabelle und Folien wie im Fenster
 * „Zusammenfassung“, Warnungen des Laufs – ohne Summen, Preise, EK und Grafik. jsPDF wie im alten Projekt (lib/jspdf.umd.min.js, Lizenz lib/LICENSE).
 * Ablage über den Exportkern (zusammenfassung.js im Panel); hier nur das Schreiben der Datei.
 * Textil (SPEZ_03_Oberflaeche §7, e.textil): Kopf Kunde, „Textil · <Modell> · <Textilfarbe>“, Datum; Objekte mit den Spalten des Fensters ohne Betrag (eine Zeile
 * je Druckgröße) und Folien (Farbschlüssel, Streifen, lfm, m² Verbrauch) – ohne Summen, Preise, EK und Grafik. */
"use strict";
const fs = require("fs");
const path = require("path");
const Z = require("./zuordnen");
const ZS = require("./zusammenfassung");

// UMD-Bundle per require laden: im mixed-context hängt es sich nicht an window
const jsPDF = () => require(path.join(__dirname, "jspdf.umd.min.js")).jsPDF;
const datum = d => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

/**
 * @param e     { kunde, auftragsart (Name), datum (Date), massstab, zeilen: ZS.zeilen(…), folien: ZS.folien(…), warnungen[] };
 *              Textil: { textil: { modell, farbe } (Anzeigetexte), zeilen: ZS.zeilenTextil(…), folien: ZS.folienTextil(…) } statt massstab
 * @param ziel  Dateipfad
 */
function erzeugen(e, ziel) {
  const Ctor = jsPDF();
  const doc = new Ctor({ orientation: "portrait", unit: "mm", format: "a4" });
  const L = 15, R = 195, UNTEN = 280;
  let y = 18;
  const font = (b, s) => { doc.setFont("helvetica", b ? "bold" : "normal"); doc.setFontSize(s); };
  const txt = (s, x, yy, opt) => { s = String(s == null ? "" : s); if (s !== "") doc.text(s, x, yy, opt); };
  const neueSeiteWennNoetig = h => { if (y + h > UNTEN) { doc.addPage(); y = 18; return true; } return false; };

  font(true, 15); txt(e.kunde, L, y); y += 7;
  const kopf = e.textil ? [e.auftragsart, e.textil.modell, e.textil.farbe].filter(Boolean).join(" · ") : `${e.auftragsart} · Maßstab 1:${e.massstab}`;
  font(false, 10); txt(kopf, L, y); txt(`Datum: ${datum(e.datum)}`, R, y, { align: "right" }); y += 10;

  // Tabelle: spalten [{ t, x, a, w }], zeilen [{ werte[], fett (erste Spalte; mit ganz: alle), einzug, grau }]
  function tabelle(titel, spalten, zeilen) {
    neueSeiteWennNoetig(16);
    font(true, 11); txt(titel, L, y); y += 6;
    const kopf = () => {
      font(true, 8.5);
      spalten.forEach(s => txt(s.t, s.x, y, { align: s.a || "left" }));
      y += 1.8; doc.setDrawColor(150); doc.line(L, y, R, y); y += 4;
    };
    kopf();
    zeilen.forEach(z => {
      font(!!z.fett, 8.5);
      const texte = spalten.map((s, i) => { const v = String(z.werte[i] == null ? "" : z.werte[i]); return s.w ? doc.splitTextToSize(v, s.w - (i === 0 && z.einzug ? 4 : 0)) : [v]; });
      const h = Math.max(...texte.map(t => t.length)) * 3.8;
      if (neueSeiteWennNoetig(h)) { kopf(); font(!!z.fett, 8.5); }
      if (z.grau) doc.setTextColor(110);
      spalten.forEach((s, i) => { font(!!z.fett && (i === 0 || z.ganz), 8.5); if (texte[i].join("") !== "") doc.text(texte[i], s.x + (i === 0 && z.einzug ? 4 : 0), y, { align: s.a || "left" }); });
      doc.setTextColor(0);
      y += h; doc.setDrawColor(225); doc.line(L, y - 2.6, R, y - 2.6); y += 1;
    });
    y += 5;
  }

  const zahl = (v, d) => (v === null || v === undefined ? ZS.STRICH : Z.zahl(v, d));
  if (e.textil) { textilTabellen(e, tabelle); warnungen(); fs.writeFileSync(ziel, Buffer.from(doc.output("arraybuffer"))); return ziel; }
  const ob = e.zeilen.objekte.map(z => ({ werte: [z.name + (z.variante ? " · Variante" : ""), z.anzahl, z.folie.text, z.attribute, z.teile === null ? ZS.STRICH : z.teile, zahl(z.m2)],
    fett: !z.variante, einzug: z.eingerueckt }));
  if (e.zeilen.ohne.length) {
    ob.push({ werte: [`Ohne Zuordnung (${e.zeilen.ohne.length}) – wird nicht berechnet`, "", "", "", "", ""], fett: true, ganz: true });
    e.zeilen.ohne.forEach(z => ob.push({ werte: [z.name, "", z.ebene, "", "", ""], grau: true }));
  }
  tabelle("Objekte", [
    { t: "Objekt", x: L, w: 62 }, { t: "Anzahl", x: 94, a: "right" }, { t: "Folie", x: 100, w: 42 }, { t: "Attribute", x: 144, w: 26 },
    { t: "Teile", x: 180, a: "right" }, { t: "m²", x: R, a: "right" }
  ], ob);

  tabelle("Folien", [
    { t: "Folie", x: L, w: 70 }, { t: "Rolle", x: 110, a: "right" }, { t: "Bögen", x: 130, a: "right" }, { t: "lfm", x: 155, a: "right" }, { t: "m² Verbrauch", x: R, a: "right" }
  ], e.folien.map(f => ({ werte: [f.text, f.rolle, f.boegen, Z.zahl(f.lfm), Z.zahl(f.verbrauch)] })));

  function warnungen() {
    if (!e.warnungen || !e.warnungen.length) return;
    neueSeiteWennNoetig(12);
    font(true, 10); txt("Warnungen", L, y); y += 5; font(false, 8);
    e.warnungen.forEach(w => { const t = doc.splitTextToSize("• " + w, R - L); neueSeiteWennNoetig(t.length * 3.6); doc.text(t, L, y); y += t.length * 3.6; });
  }
  warnungen();

  fs.writeFileSync(ziel, Buffer.from(doc.output("arraybuffer")));
  return ziel;
}

/** Textil: Objekte mit einer Zeile je Druckgröße (Motiv, Position, Verfahren, K, Teile nur in der ersten) und Folien je Farbschlüssel */
function textilTabellen(e, tabelle) {
  const L = 15, R = 195, ob = [];
  e.zeilen.objekte.forEach(z => (z.druckgroessen.length ? z.druckgroessen : [{}]).forEach((s, k) => {
    const dg = [s.mass, s.menge, s.groessen, s.art];
    ob.push(k === 0 ? { werte: [z.name + (z.variante ? " · Variante" : ""), z.position, z.verfahren, ...dg, z.k, z.teile === null ? ZS.STRICH : z.teile],
      fett: !z.variante, einzug: z.eingerueckt } : { werte: ["", "", "", ...dg, "", ""] });
  }));
  if (e.zeilen.ohne.length) {
    ob.push({ werte: [`Ohne Zuordnung (${e.zeilen.ohne.length})`, "", "", "", "", "", "", "", ""], fett: true, ganz: true });
    e.zeilen.ohne.forEach(z => ob.push({ werte: [z.name, "", z.ebene, "", "", "", "", "", ""], grau: true }));
  }
  tabelle("Objekte", [
    { t: "Motiv", x: L, w: 30 }, { t: "Position", x: 47, w: 22 }, { t: "Verfahren", x: 71, w: 34 }, { t: "Maß mm", x: 116, a: "right" }, { t: "Menge", x: 129, a: "right" },
    { t: "Textilgrößen", x: 132, w: 28 }, { t: "", x: 162, w: 20 }, { t: "K", x: 187, a: "right" }, { t: "Teile", x: R, a: "right" }
  ], ob);
  tabelle("Folien", [
    { t: "Farbschlüssel", x: L, w: 90 }, { t: "Streifen", x: 130, a: "right" }, { t: "lfm", x: 160, a: "right" }, { t: "m² Verbrauch", x: R, a: "right" }
  ], e.folien.map(f => ({ werte: [f.text, f.streifen, Z.zahl(f.lfm), Z.zahl(f.verbrauch)] })));
}

module.exports = { erzeugen };
