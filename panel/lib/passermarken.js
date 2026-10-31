/* Passermarken für mehrfarbigen Plott (SPEZ_02 §10.1), reine Funktionen. Koordinaten in mm im Realmaß, y nach unten.
 * Eingabe: Teile je Farbschlüssel als Begrenzungsrechtecke { x0, y0, x1, y1 } (Dokumentkoordinaten), Werte aus medien.json „passermarken“.
 * Kantenlänge: größte Stufe ≤ anteil × kürzere Seite des Gruppenumrisses, mindestens die kleinste Stufe.
 * Lage: zwei Quadrate innerhalb des Umrisses, eines ganz in der linken, eines ganz in der rechten Hälfte, je mit ≥ abstand_mm zu allen Teilen aller
 * Farben und zueinander. Kandidaten auf einem Raster (Schrittweite = Kantenlänge / 2, Zeile für Zeile von oben links); gewählt wird das Paar mit der
 * kleinsten Summe der Blockflächen je Farbe (Block = Begrenzung der Teile der Farbe ∪ beide Marken), bei Gleichstand das erste in Rasterreihenfolge
 * (linke Marke vor rechter). Ohne Lücke in einer Hälfte: Marke außerhalb, abstand_mm links bzw. rechts vom Umriss, senkrecht mittig.
 * Ausgabe: beide Marken und je Farbe der Block relativ zur linken oberen Ecke des Gruppenumrisses. */
"use strict";
const EPS = 1e-6;

const vereinigt = (a, b) => (!a ? Object.assign({}, b) : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
/** kürzester Abstand zweier Rechtecke (0 bei Überlappung) */
function abstand(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1), dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.hypot(dx, dy);
}
const verschoben = (b, dx, dy) => ({ x0: b.x0 - dx, y0: b.y0 - dy, x1: b.x1 - dx, y1: b.y1 - dy });

/** Kantenlänge zum Umriss nach den Stufen (absteigend) */
function kante(umriss, P) {
  const kurz = Math.min(umriss.x1 - umriss.x0, umriss.y1 - umriss.y0), st = P.stufen_mm;
  return st.find(s => s <= P.anteil * kurz + EPS) || st[st.length - 1];
}

/**
 * @param teile  { <Farbschlüssel>: [{ x0, y0, x1, y1 }] } (mindestens zwei Farben)
 * @param P      { stufen_mm, anteil, abstand_mm }
 * @returns { umriss (absolut), kante, marken: [links, rechts] (relativ), innen: [bool, bool], bloecke: { <Farbschlüssel>: Rechteck (relativ) } }
 */
function planen(teile, P) {
  const farben = Object.keys(teile).sort(), alle = [].concat(...farben.map(f => teile[f]));
  const umriss = alle.reduce((u, b) => vereinigt(u, b), null);
  const k = kante(umriss, P), s = k / 2, a = P.abstand_mm, mitte = (umriss.x0 + umriss.x1) / 2;
  const box = farben.map(f => teile[f].reduce((u, b) => vereinigt(u, b), null));
  const kosten = ms => {
    let sum = 0;
    for (const b of box) {
      let x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
      for (const m of ms) { if (m.x0 < x0) x0 = m.x0; if (m.y0 < y0) y0 = m.y0; if (m.x1 > x1) x1 = m.x1; if (m.y1 > y1) y1 = m.y1; }
      sum += (x1 - x0) * (y1 - y0);
    }
    return sum;
  };

  // Raster Zeile für Zeile; nur freie Kandidaten ganz im Umriss und ganz in ihrer Hälfte
  const links = [], rechts = [];
  let idx = 0;
  for (let j = 0; umriss.y0 + j * s + k <= umriss.y1 + EPS; j++) {
    for (let i = 0; umriss.x0 + i * s + k <= umriss.x1 + EPS; i++, idx++) {
      const m = { x0: umriss.x0 + i * s, y0: umriss.y0 + j * s, x1: umriss.x0 + i * s + k, y1: umriss.y0 + j * s + k };
      if (alle.some(t => abstand(m, t) < a - EPS)) continue;
      const c = { m, idx, c: kosten([m]) };
      if (m.x1 <= mitte + EPS) links.push(c);
      if (m.x0 >= mitte - EPS) rechts.push(c);
    }
  }
  const cy = (umriss.y0 + umriss.y1) / 2;
  const aussenL = { m: { x0: umriss.x0 - a - k, y0: cy - k / 2, x1: umriss.x0 - a, y1: cy + k / 2 }, idx: -1, aussen: true };
  const aussenR = { m: { x0: umriss.x1 + a, y0: cy - k / 2, x1: umriss.x1 + a + k, y1: cy + k / 2 }, idx: -1, aussen: true };
  const L = links.length ? links : [aussenL], R = rechts.length ? rechts : [aussenR];
  L.forEach(x => { if (x.c === undefined) x.c = kosten([x.m]); });
  R.forEach(x => { if (x.c === undefined) x.c = kosten([x.m]); });

  // Paar mit kleinster Kostensumme; Schranke: die Kosten eines Paars sind ≥ die Kosten jeder einzelnen Marke
  const sortiert = liste => liste.slice().sort((p, q) => p.c - q.c || p.idx - q.idx);
  const Ls = sortiert(L), Rs = sortiert(R);
  let best = null;
  const besser = (c, l, r) => !best || c < best.c - EPS || (Math.abs(c - best.c) <= EPS && (l.idx < best.l.idx || (l.idx === best.l.idx && r.idx < best.r.idx)));
  for (const l of Ls) {
    if (best && l.c > best.c + EPS) break;
    for (const r of Rs) {
      if (best && r.c > best.c + EPS) break;
      if (abstand(l.m, r.m) < a - EPS) continue;
      const c = kosten([l.m, r.m]);
      if (besser(c, l, r)) best = { c, l, r };
    }
  }
  // Kein verträgliches Paar innen (Marken zu nah beieinander): rechte Marke außen
  if (!best) best = { l: Ls[0], r: aussenR };
  const ml = best.l.m, mr = best.r.m, bloecke = {};
  farben.forEach((f, i) => { bloecke[f] = verschoben(vereinigt(vereinigt(box[i], ml), mr), umriss.x0, umriss.y0); });
  return { umriss, kante: k, marken: [verschoben(ml, umriss.x0, umriss.y0), verschoben(mr, umriss.x0, umriss.y0)], innen: [!best.l.aussen, !best.r.aussen], bloecke };
}

module.exports = { planen, kante, abstand };
