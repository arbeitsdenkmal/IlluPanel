/* Eigene OPOS-Marken (SPEZ_02 §11.4), aus dem alten Projekt übernommen – Regel aus Infos/OPOS_ANALYSE.md §4 mit P = 400 mm, reine Funktionen.
 * Koordinaten in mm, y nach unten. Bezugsrechteck = sichtbare Begrenzung aller sichtbaren Objekte der Ebenen Druck und Cut
 * (Schnittmasken: Begrenzung des Maskenpfads). Relativ zum Bezugsrechteck: x ab linker Kante, y ab Oberkante; b quer, l in Einzugsrichtung.
 * Das JSX zeichnet nur die hier berechnete Liste. */
"use strict";
const MARKE = 3, ABSTAND = 9, LINIE = 3, LINIE_EINZUG = 1, RASTER = 300;
const MAX_ABSTAND = 400;            // Höchstabstand der Marken, gemessen eingegrenzt auf 396 … 406,66 mm (OPOS_ANALYSE.md §4)
const AUSSEN = ABSTAND + MARKE;     // 12 mm: Marken bzw. Linien bis Außenkante
const RAND_SOLL = 22.1765;          // Zeichenfläche je Seite: 12 Marken + 10,1765 Rand (OPOS_ANALYSE.md §7)
const XY2_AB_MM = 1000;             // XY2 ab Zeichenflächenlänge 1000 mm in Einzugsrichtung [B-12]
const DREIECK = { hoehe: 6, breite: 8 };
const TOL = 0.005;

/** Markenzahl je Seite: n − 1 = max(1, ⌊l / 300⌋, ⌈(l + 21) / 400⌉) */
const markenJeSeite = l => Math.max(1, Math.floor(l / RASTER + 1e-9), Math.ceil((l + 2 * ABSTAND + MARKE) / MAX_ABSTAND - 1e-9)) + 1;
const verfahren = zfLaenge => (zfLaenge >= XY2_AB_MM - TOL ? "XY2" : "XY");

/** Bezugsrechteck aus Blättern { vb: [x0, y0, x1, y1], clip: [..] | null, versteckt, druckrichtung }: sichtbare Begrenzung, durch Schnittmasken beschnitten */
function bezugsrechteck(blaetter) {
  let u = null;
  for (const b of blaetter || []) {
    if (b.versteckt || b.druckrichtung || !b.vb) continue;
    let r = b.vb;
    if (b.clip) { r = [Math.max(r[0], b.clip[0]), Math.max(r[1], b.clip[1]), Math.min(r[2], b.clip[2]), Math.min(r[3], b.clip[3])]; if (!(r[0] < r[2] && r[1] < r[3])) continue; }
    u = u ? [Math.min(u[0], r[0]), Math.min(u[1], r[1]), Math.max(u[2], r[2]), Math.max(u[3], r[3])] : r.slice();
  }
  return u;
}

/** Marken und Linien relativ zum Bezugsrechteck; Liste in Stapelfolge von oben. Linien: offener Pfad, 3 mm Kontur, stumpfe Enden, mittig im Plugin-Rechteck. */
function marken({ b, l }, vf) {
  const n = markenJeSeite(l), p = (l + 2 * ABSTAND + MARKE) / (n - 1), out = [];
  const linie = (name, y) => ({ name, art: "linie", punkte: [[LINIE_EINZUG, y], [b - LINIE_EINZUG, y]], strich_mm: LINIE,
    gb: [LINIE_EINZUG, y - LINIE / 2, b - LINIE_EINZUG, y + LINIE / 2] }); // sichtbare Begrenzung = Plugin-Rechteck
  if (vf === "XY2") out.push(linie("OPOS XY2 Line", -ABSTAND - LINIE / 2));
  out.push(linie("OPOS XY Line", l + ABSTAND + LINIE / 2));
  for (const x of [-AUSSEN, b + ABSTAND]) for (let i = 0; i < n; i++) {
    const y = -AUSSEN + i * p;
    out.push({ name: "Mark", art: "rechteck", gb: [x, y, x + MARKE, y + MARKE] });
  }
  return out;
}

/** Druckrichtungsmarkierung (nur XY2): Dreieck 8 × 6 mm, x mittig, senkrecht mittig zwischen Unterkante der XY-Linie (l + 12) und Zeichenflächenrand unten (zfUnten, relativ), Spitze nach unten */
function dreieck({ b, l }, zfUnten) {
  const yc = (l + AUSSEN + zfUnten) / 2, x = b / 2, h = DREIECK.hoehe / 2, w = DREIECK.breite / 2;
  return { art: "dreieck", punkte: [[x - w, yc - h], [x + w, yc - h], [x, yc + h]], gb: [x - w, yc - h, x + w, yc + h] };
}

const r2 = v => Math.round(v * 1000) / 1000;
const dez = v => (Math.round(v * 1000) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 3 });
/**
 * Plan für einen Druckbogen. bezug, zf: [x0, y0, x1, y1] in mm (Dokument, y nach unten); rollenbreite, kantenhalter_mm, nr.
 * Zeichenfläche: Soll = Bezug + 22,1765 je Seite; kleinere Seiten auf das Soll erweitern, nie verkleinern. Breiter als Rolle − 2 × Kantenhalter: Fehler.
 * Rückgabe { fehler } oder { zf, erweitert, verfahren, objekte (absolut, mm), dreieck, info: { format, laenge } }.
 */
function plan({ bezug, zf, rollenbreite, kantenhalter_mm, nr }) {
  if (!bezug) throw new Error("Druckbogen ohne Objekte auf den Ebenen Druck und Cut");
  const soll = [bezug[0] - RAND_SOLL, bezug[1] - RAND_SOLL, bezug[2] + RAND_SOLL, bezug[3] + RAND_SOLL];
  const neu = [Math.min(zf[0], soll[0]), Math.min(zf[1], soll[1]), Math.max(zf[2], soll[2]), Math.max(zf[3], soll[3])];
  const erweitert = neu.some((v, i) => Math.abs(v - zf[i]) > TOL);
  const breite = neu[2] - neu[0], laenge = neu[3] - neu[1];
  const zul = rollenbreite - 2 * kantenhalter_mm;
  if (zul > 0 && breite > zul + 0.01) return { fehler: `Bogen ${nr}: ${dez(breite)} mm passt nicht auf das Medium (höchstens ${dez(zul)} mm breit)` };
  const b = bezug[2] - bezug[0], l = bezug[3] - bezug[1], vf = verfahren(laenge);
  const abs = o => Object.assign({}, o, { gb: [o.gb[0] + bezug[0], o.gb[1] + bezug[1], o.gb[2] + bezug[0], o.gb[3] + bezug[1]],
    punkte: o.punkte ? o.punkte.map(([x, y]) => [x + bezug[0], y + bezug[1]]) : undefined });
  const objekte = marken({ b, l }, vf).map(abs);
  const dr = vf === "XY2" ? abs(dreieck({ b, l }, neu[3] - bezug[1])) : null;
  // Info-Ebene: Zeilen „Format“ und „Länge“ wie beim Aufbau des Bogens, mit der neuen Zeichenfläche
  return { zf: neu.map(r2), erweitert, verfahren: vf, objekte, dreieck: dr, b, l,
    info: { format: `Format:    ${Math.round(breite)} × ${Math.round(laenge * 10) / 10} mm (inkl. OPOS-Rand)`, laenge: `Länge:     ${Math.round(laenge) / 1000} m` } };
}

module.exports = { markenJeSeite, verfahren, bezugsrechteck, marken, dreieck, plan, MARKE, ABSTAND, LINIE, LINIE_EINZUG, RASTER, MAX_ABSTAND, RAND_SOLL, XY2_AB_MM, DREIECK };
