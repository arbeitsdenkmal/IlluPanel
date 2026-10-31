/* Symbole der Druckbögen (SPEZ_02 §3.1, §11.1), aus dem alten Projekt übernommen und auf IP_Id/IP_Original umgestellt.
 * Je IP_Id ein Symbol. Eine Variante (IP_Original zeigt auf ein vorhandenes Objekt) wird Instanz des Symbols ihres Originals, wenn geometrieVergleich
 * ergibt, dass sie aus dessen Bezug nur durch Skalierung (proportional), Drehung, Spiegelung und Verschiebung hervorgeht: Ähnlichkeitstransformation
 * nach kleinsten Quadraten über alle Punkte (Anker und Griffe aller Pfade, je Text/Bild drei Punkte aus seiner Matrix), mit und ohne Spiegelung; gilt,
 * wenn der Aufbau (Signatur) gleich ist und die größte Restabweichung höchstens die Toleranz beträgt. Sonst eigenes Symbol unter ihrem Namen.
 * Koordinaten: pt im Dokument (y nach oben). Matrix M = [a, b, c, d] mit x' = a·x + c·y, y' = b·x + d·y (wie Illustrator). */
"use strict";

/** Ähnlichkeitstransformation P → Q: {M, t, s, winkel (Grad), spiegel, fehler (größte Restabweichung)} oder null */
function aehnlichkeit(P, Q) {
  const n = P.length;
  if (!n || n !== Q.length) return null;
  const mp = [0, 0], mq = [0, 0];
  for (let i = 0; i < n; i++) { mp[0] += P[i][0]; mp[1] += P[i][1]; mq[0] += Q[i][0]; mq[1] += Q[i][1]; }
  mp[0] /= n; mp[1] /= n; mq[0] /= n; mq[1] /= n;
  let best = null;
  for (const spiegel of [false, true]) {
    const f = spiegel ? -1 : 1; // Spiegelung an der y-Achse vor der Drehung
    let a = 0, b = 0, pp = 0;
    for (let i = 0; i < n; i++) {
      const px = f * (P[i][0] - mp[0]), py = P[i][1] - mp[1], qx = Q[i][0] - mq[0], qy = Q[i][1] - mq[1];
      a += px * qx + py * qy; b += px * qy - py * qx; pp += px * px + py * py;
    }
    const w = Math.atan2(b, a), s = pp > 0 ? Math.sqrt(a * a + b * b) / pp : 1, co = Math.cos(w) * s, si = Math.sin(w) * s;
    const M = [co * f, si * f, -si, co]; // R·s·diag(f, 1)
    const t = [mq[0] - (M[0] * mp[0] + M[2] * mp[1]), mq[1] - (M[1] * mp[0] + M[3] * mp[1])];
    let fehler = 0;
    for (let i = 0; i < n; i++) {
      const x = M[0] * P[i][0] + M[2] * P[i][1] + t[0], y = M[1] * P[i][0] + M[3] * P[i][1] + t[1];
      fehler = Math.max(fehler, Math.hypot(x - Q[i][0], y - Q[i][1]));
    }
    if (!best || fehler < best.fehler) best = { M, t, s, winkel: w * 180 / Math.PI, spiegel, fehler };
  }
  return best;
}

/** Geometrievergleich zweier Formen ({signatur, punkte}); tol in pt. Ergebnis: Transformation oder null (eigenständig). */
function geometrieVergleich(bezug, form, tol) {
  if (!bezug || !form || bezug.signatur !== form.signatur) return null;
  const r = aehnlichkeit(bezug.punkte, form.punkte);
  return r && r.fehler <= tol ? r : null;
}

/** Matrix des Exemplars relativ zum Symbolinhalt; Symbolinhalt = Bezug, Exemplar = M·Bezug (ohne Verschiebung). */
const EINHEIT = { M: [1, 0, 0, 1], s: 1, winkel: 0, spiegel: false, fehler: 0 };

/**
 * Einteilung in Symbole.
 * @param objekte [{ id, original, name (eindeutiger Anzeigename), ref, form }] in Ebenenreihenfolge
 * @param tol Toleranz in pt (Dokument)
 * @returns { <IP_Id>: { symbol (Name), bezugId, bezugRef, M } }
 */
function symboleEinteilen(objekte, tol) {
  const nachId = {}, out = {};
  objekte.forEach(o => { nachId[o.id] = o; });
  const eigenes = o => ({ symbol: o.name, bezugId: o.id, bezugRef: o.ref, M: EINHEIT.M });
  // Originale zuerst, damit eine Variante das Symbol ihres Originals vorfindet
  const reihe = objekte.filter(o => !o.original || !nachId[o.original]).concat(objekte.filter(o => o.original && nachId[o.original]));
  for (const o of reihe) {
    const orig = o.original ? nachId[o.original] : null, os = orig ? out[orig.id] : null;
    const tr = os ? geometrieVergleich(nachId[os.bezugId].form, o.form, tol) : null;
    out[o.id] = tr ? { symbol: os.symbol, bezugId: os.bezugId, bezugRef: os.bezugRef, M: tr.M } : eigenes(o);
  }
  return out;
}

module.exports = { aehnlichkeit, geometrieVergleich, symboleEinteilen, EINHEIT };
