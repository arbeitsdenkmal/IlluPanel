/* Adobe Swatch Exchange (.ase) lesen – Binärformat, Big Endian (aus dem alten Projekt übernommen).
 * Kopf: "ASEF", Version (2× uint16), Anzahl Blöcke (uint32).
 * Block: Typ (uint16: 0x0001 Farbe, 0xC001 Gruppenbeginn, 0xC002 Gruppenende), Länge (uint32), Daten.
 * Farbe: Namenslänge (uint16, Zeichen inkl. 0), Name (UTF-16BE), Modell (4 Zeichen "LAB "/"RGB "/"CMYK"/"Gray"),
 *        Werte (float32), Farbtyp (uint16: 0 global, 1 Vollton, 2 normal).
 * LAB: L in 0..1 (×100 = L*), a/b direkt. */
"use strict";
const fs = require("fs");
const TYPEN = ["global", "vollton", "normal"];

function lesen(datei) {
  const b = fs.readFileSync(datei);
  if (b.toString("ascii", 0, 4) !== "ASEF") throw new Error(`${datei}: keine ASE-Datei`);
  const n = b.readUInt32BE(8);
  let o = 12, gruppe = null;
  const farben = [];
  for (let i = 0; i < n; i++) {
    const typ = b.readUInt16BE(o), len = b.readUInt32BE(o + 2), start = o + 6;
    if (typ === 0x0001 || typ === 0xC001) {
      const nl = b.readUInt16BE(start);
      let name = "";
      for (let k = 0; k < nl - 1; k++) name += String.fromCharCode(b.readUInt16BE(start + 2 + 2 * k));
      if (typ === 0xC001) gruppe = name;
      else {
        let p = start + 2 + 2 * nl;
        const modell = b.toString("ascii", p, p + 4).trim(); p += 4;
        const anz = { LAB: 3, RGB: 3, CMYK: 4, Gray: 1 }[modell];
        if (!anz) throw new Error(`${datei}: unbekanntes Farbmodell ${modell}`);
        const w = [];
        for (let k = 0; k < anz; k++) { w.push(b.readFloatBE(p)); p += 4; }
        const ft = TYPEN[b.readUInt16BE(p)] || "?";
        const f = { name, modell, farbtyp: ft, gruppe };
        if (modell === "LAB") f.lab = [w[0] * 100, w[1], w[2]];
        else if (modell === "RGB") f.rgb = w.map(x => x * 255);
        else if (modell === "CMYK") f.cmyk = w.map(x => x * 100);
        else f.grau = w[0] * 100;
        farben.push(f);
      }
    } else if (typ === 0xC002) gruppe = null;
    o = start + len;
  }
  return farben;
}

// LAB (D50, wie Illustrator) -> sRGB für die Farbvorschau im Panel
function labZuRgb([L, a, b]) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const f = t => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  let X = 0.96422 * f(fx), Y = 1.0 * f(fy), Z = 0.82521 * f(fz);
  // Bradford D50 -> D65
  [X, Y, Z] = [0.9555766 * X - 0.0230393 * Y + 0.0631636 * Z, -0.0282895 * X + 1.0099416 * Y + 0.0210077 * Z, 0.0122982 * X - 0.0204830 * Y + 1.3299098 * Z];
  const lin = [3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z, -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z, 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z];
  return lin.map(c => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))));
}

module.exports = { lesen, labZuRgb };
