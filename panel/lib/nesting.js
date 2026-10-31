/* Nesting – ein Algorithmus für Kalkulation und Schneidedaten.
 * Rechteck-Packing nach MaxRects (Jylänki) mit Drehung um 90°.
 * Mehrere Platzierungsregeln × Sortierreihenfolgen werden probiert, die kürzeste Gesamtlänge gewinnt
 * (eine einzelne gierige Regel ist zu kurzsichtig, z. B. stellt „kleinste rechte Kante“ Teile hochkant,
 * obwohl quer eine exakte Spalte entstünde).
 * Alles deterministisch (feste Reihenfolgen, Tiebreaker über die Teil-ID).
 *
 * Abstände: Jedes Teil wird um den Abstand a vergrößert (a/2 rundum), die Packfläche um a.
 * Dann liegen Teile ≥ a auseinander und ≥ rand vom Rand der Zeichenfläche (bei rand = a/2 exakt).
 * Zeichenfläche (Stufe 8): Umriss aller Teile des Bogens + Rand gleichmäßig je Seite; die Bogenmaße der Packfläche
 * (Plott Höhe = Nutzbreite, Länge ≤ max_breite; Druck bedruckbare Breite, Länge ≤ max_laenge) sind nur Maximalmaß.
 * Die Anordnung bleibt unverändert, die Teile werden nur verschoben.
 * Anzahl (SPEZ_02 §7): jedes Teil mit anzahl n wird als n Exemplare genestet; im Ergebnis trägt jedes Exemplar id (Teil) und exemplar (1 … n).
 * Aus dem alten Projekt übernommen.
 */
"use strict";
const EPS = 0.005; // mm; Maße kommen auf 0,01 mm gerundet an

class Bin {
  constructor(W, H) { this.W = W; this.H = H; this.free = [{ x: 0, y: 0, w: W, h: H }]; this.used = []; }

  find(w, h, regel) {
    let best = null;
    const consider = (f, pw, ph, rot) => {
      const s = regel(f, pw, ph, rot);
      if (!best || kleiner(s, best.s)) best = { x: f.x, y: f.y, w: pw, h: ph, rot, s };
    };
    for (const f of this.free) {
      if (w <= f.w + EPS && h <= f.h + EPS) consider(f, w, h, false);
      if (h <= f.w + EPS && w <= f.h + EPS && Math.abs(w - h) > EPS) consider(f, h, w, true);
    }
    return best;
  }

  place(r) {
    const neu = [];
    for (const f of this.free) {
      if (r.x >= f.x + f.w - EPS || r.x + r.w <= f.x + EPS || r.y >= f.y + f.h - EPS || r.y + r.h <= f.y + EPS) { neu.push(f); continue; }
      if (r.x > f.x + EPS) neu.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w - EPS) neu.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - r.x - r.w, h: f.h });
      if (r.y > f.y + EPS) neu.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h - EPS) neu.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - r.y - r.h });
    }
    // enthaltene freie Rechtecke entfernen
    this.free = neu.filter((a, i) => !neu.some((b, j) => j !== i &&
      a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.w <= b.x + b.w + EPS && a.y + a.h <= b.y + b.h + EPS &&
      (j < i || !(Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS && Math.abs(a.w - b.w) <= EPS && Math.abs(a.h - b.h) <= EPS))));
    this.used.push(r);
  }

  rechteKante() { return this.used.reduce((m, r) => Math.max(m, r.x + r.w), 0); }
}

/** Jedes Teil × anzahl Exemplare (Standard 1); key eindeutig je Exemplar, Reihenfolge stabil. */
function exemplare(teile) {
  const out = [];
  for (const t of teile) {
    const n = Number.isInteger(t.anzahl) && t.anzahl > 0 ? t.anzahl : 1;
    for (let k = 1; k <= n; k++) out.push({ key: n > 1 ? `${t.id}#${k}` : t.id, id: t.id, exemplar: k, b_mm: t.b_mm, h_mm: t.h_mm });
  }
  return out;
}
const exemplarVon = liste => { const m = {}; liste.forEach(e => { m[e.key] = e; }); return key => m[key]; };

function kleiner(a, b) {
  for (let i = 0; i < a.length; i++) { if (a[i] < b[i] - EPS) return true; if (a[i] > b[i] + EPS) return false; }
  return false;
}
// Platzierungsregeln: liefern einen Score (lexikografisch, kleiner ist besser)
const REGELN = [
  ["rechte Kante", (f, w, h, rot) => [f.x + w, f.y, rot ? 1 : 0]],
  ["unten-links, quer", (f, w, h, rot) => [f.x, f.y, w >= h ? 0 : 1, rot ? 1 : 0]],
  ["unten-links, hoch", (f, w, h, rot) => [f.x, f.y, w <= h ? 0 : 1, rot ? 1 : 0]],
  ["kürzeste Restseite", (f, w, h, rot) => [Math.min(f.w - w, f.h - h), Math.max(f.w - w, f.h - h), f.x, f.y]],
];

const ORDNUNGEN = [
  ["Fläche", (a, b) => b.w * b.h - a.w * a.h],
  ["längste Seite", (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || Math.min(b.w, b.h) - Math.min(a.w, a.h)],
  ["kürzeste Seite", (a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h)],
  ["Umfang", (a, b) => (b.w + b.h) - (a.w + a.h)],
];

/** Zeichenfläche = Umriss der Teile + rand je Seite; Teile so verschoben, dass der Umriss bei (rand, rand) beginnt.
 *  teile: [{x, y, w, h}] in Packflächen-Koordinaten (Maße ohne Abstand). */
function umriss(teile, randX, randY) {
  const x0 = Math.min(...teile.map(t => t.x)), y0 = Math.min(...teile.map(t => t.y));
  const x1 = Math.max(...teile.map(t => t.x + t.w)), y1 = Math.max(...teile.map(t => t.y + t.h));
  return { w: x1 - x0 + 2 * randX, h: y1 - y0 + 2 * randY, dx: randX - x0, dy: randY - y0 };
}

/**
 * @param teile  [{id, b_mm, h_mm, anzahl}] Maße 1:1 ohne Abstand
 * @param o      {hoehe_mm, max_breite_mm, abstand_mm, rand_mm}
 * @returns {laenge_mm (Σ Bogenlänge), bogen:[{breite_mm (Länge), hoehe_mm, teile:[{id, exemplar, x_mm, y_mm, b_mm, h_mm, gedreht}]}], ordnung}
 *          Zeichenfläche je Bogen = Umriss der Teile + rand je Seite (Länge und Höhe); hoehe_mm ≤ o.hoehe_mm
 */
function nesten(teile, o) {
  const a = o.abstand_mm, rand = o.rand_mm;
  const W = o.max_breite_mm - 2 * rand + a, H = o.hoehe_mm - 2 * rand + a;
  const ex = exemplare(teile), von = exemplarVon(ex);
  const items = ex.map(t => ({ id: t.key, w: t.b_mm + a, h: t.h_mm + a }));
  for (const it of items) {
    const passt = (it.w <= W + EPS && it.h <= H + EPS) || (it.h <= W + EPS && it.w <= H + EPS);
    if (!passt) throw new Error(`Teil ${von(it.id).id} (${(it.w - a).toFixed(0)}×${(it.h - a).toFixed(0)} mm) passt auf keine Zeichenfläche`);
  }
  let best = null;
  for (const [rname, regel] of REGELN) for (const [oname, cmp] of ORDNUNGEN) {
    const reihe = items.slice().sort((x, y) => cmp(x, y) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    const bins = [];
    for (const it of reihe) {
      let ok = false;
      for (const b of bins) {
        const p = b.find(it.w, it.h, regel);
        if (p) { b.place({ ...p, id: it.id }); ok = true; break; }
      }
      if (!ok) { const b = new Bin(W, H); b.place({ ...b.find(it.w, it.h, regel), id: it.id }); bins.push(b); }
    }
    const laenge = bins.reduce((s, b) => s + b.rechteKante() - a + 2 * rand, 0);
    if (!best || laenge < best.laenge - EPS || (Math.abs(laenge - best.laenge) <= EPS && bins.length < best.bins.length))
      best = { laenge, bins, ordnung: rname + " / " + oname };
  }
  const bogen = best.bins.map(b => {
    const t = b.used.map(r => ({ id: r.id, x: r.x, y: r.y, w: r.w - a, h: r.h - a, gedreht: r.rot }));
    const u = umriss(t, rand, rand);
    return { breite_mm: u.w, hoehe_mm: u.h, teile: t.map(p => ({ id: von(p.id).id, exemplar: von(p.id).exemplar, x_mm: p.x + u.dx, y_mm: p.y + u.dy, b_mm: p.w, h_mm: p.h, gedreht: p.gedreht })) };
  });
  return { laenge_mm: bogen.reduce((s, b) => s + b.breite_mm, 0), ordnung: best.ordnung, bogen };
}

/**
 * Druck-Nesting (Digitaldruck). Gleicher MaxRects-Kern und dieselben Regeln/Ordnungen wie beim Plott.
 * Packfläche (Maximalmaß): quer Medienbreite − 2 × Kantenhalter − 2 × rand, längs max_laenge − 2 × rand.
 * Zeichenfläche (Stufe 9): Außenkante aller Teile + rand je Seite (rand = OPOS-Zugabe / 2 + Abstand Marken–Rand),
 * quer und längs gleich; Länge inkl. Rand ≤ max_laenge bzw. ≤ max_laenge_sonder.
 * Bedruckbar: quer Medienbreite − OPOS seitlich, längs Länge − OPOS oben/unten. Teile liegen bündig am
 * bedruckbaren Bereich, untereinander ≥ abstand.
 * Länge inkl. OPOS normal ≤ max_laenge; mehrere kurze Bögen haben Vorrang. Ein Teil, das in keiner Lage
 * kürzer passt, bekommt einen eigenen Bogen bis max_laenge_sonder (andere Teile dürfen daneben, nie dahinter).
 * @param teile [{id, b_mm (längs, unverdreht), h_mm (quer, unverdreht), anzahl}] – Maße der Cutkontur 1:1
 * @param o {medienbreite_mm, kantenhalter_mm, rand_mm (je Seite), abstand_mm, max_laenge_mm, max_laenge_sonder_mm}
 * @returns {laenge_mm (Summe Bogenlängen inkl. OPOS-Rand), bogen:[{breite_mm (Zeichenfläche quer), laenge_mm, sonder, teile:[{id, exemplar, x_mm (quer), y_mm (längs), b_mm, h_mm, gedreht}]}], ordnung}
 *          x/y = linke obere Ecke der Cutkontur ab linker oberer Ecke der Zeichenfläche
 */
function nestenDruck(teile, o) {
  const a = o.abstand_mm, rs = o.rand_mm, rl = o.rand_mm;
  const quer = o.medienbreite_mm - 2 * o.kantenhalter_mm - 2 * o.rand_mm;  // Grafik quer höchstens (1370: 1295,647 mm)
  const lang = o.max_laenge_mm - 2 * o.rand_mm;                           // Grafik längs höchstens, Normalbogen
  const langS = o.max_laenge_sonder_mm - 2 * o.rand_mm;                   // Sonderbogen
  // Packfläche: W = Länge (+a), H = Breite (+a); Teile um a vergrößert, bündig am bedruckbaren Rand
  const ex = exemplare(teile), von = exemplarVon(ex);
  const items = ex.map(t => ({ id: t.key, w: t.b_mm + a, h: t.h_mm + a }));
  const minLaenge = it => Math.min(it.h - a <= quer + EPS ? it.w - a : Infinity, it.w - a <= quer + EPS ? it.h - a : Infinity);
  for (const it of items) if (minLaenge(it) > langS + EPS) throw new Error(`Teil ${von(it.id).id} passt nicht auf das Medium`);
  const sonder = items.filter(it => minLaenge(it) > lang + EPS);
  const normal = items.filter(it => minLaenge(it) <= lang + EPS);
  let best = null;
  for (const [rname, regel] of REGELN) for (const [oname, cmp] of ORDNUNGEN) {
    const bins = [];
    // Sonderteile: je ein eigener Bogen, genau so lang wie nötig (in der kürzesten Lage)
    for (const it of sonder.slice().sort((x, y) => cmp(x, y) || (x.id < y.id ? -1 : 1))) {
      const len = minLaenge(it) + a;
      const b = new Bin(len, quer + a); b.sonder = true;
      const p = b.find(it.w, it.h, regel);
      b.place({ ...p, id: it.id }); bins.push(b);
    }
    const reihe = normal.slice().sort((x, y) => cmp(x, y) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    for (const it of reihe) {
      let ok = false;
      for (const b of bins) { const p = b.find(it.w, it.h, regel); if (p) { b.place({ ...p, id: it.id }); ok = true; break; } }
      if (!ok) { const b = new Bin(lang + a, quer + a); b.place({ ...b.find(it.w, it.h, regel), id: it.id }); bins.push(b); }
    }
    const laenge = bins.reduce((s, b) => s + b.rechteKante() - a + 2 * rl, 0);
    if (!best || laenge < best.laenge - EPS || (Math.abs(laenge - best.laenge) <= EPS && bins.length < best.bins.length))
      best = { laenge, bins, ordnung: rname + " / " + oname };
  }
  const bogen = best.bins.map(b => {
    // Packfläche: x = längs, y = quer; Zeichenfläche: x_mm quer, y_mm längs
    const t = b.used.map(r => ({ id: r.id, x: r.y, y: r.x, w: r.h - a, h: r.w - a, b_mm: r.w - a, h_mm: r.h - a, gedreht: r.rot }));
    const u = umriss(t, rs, rl);
    return { breite_mm: u.w, laenge_mm: u.h, sonder: !!b.sonder,
      teile: t.map(p => ({ id: von(p.id).id, exemplar: von(p.id).exemplar, x_mm: p.x + u.dx, y_mm: p.y + u.dy, b_mm: p.b_mm, h_mm: p.h_mm, gedreht: p.gedreht })) };
  });
  return { laenge_mm: bogen.reduce((s, b) => s + b.laenge_mm, 0), ordnung: best.ordnung, bogen };
}

/**
 * Textil-Streifen Flex/Flock (SPEZ_03_Textil §9.2): derselbe Kern wie Plott, Länge senkrecht. Nutzbreite (quer) daten_breite_max_mm, Streifenlänge
 * (Inhalt + 2 × rand) ≤ laenge_max_mm, sonst weitere Streifen; Zeichenfläche zeichenflaeche_breite_mm × Länge, Inhalt waagrecht mittig.
 * @param teile  [{ id, b_mm (waagrecht), h_mm (senkrecht), anzahl }] – Exemplare bzw. Blöcke 1:1
 * @param o      { daten_breite_max_mm, zeichenflaeche_breite_mm, laenge_max_mm, rand_mm, abstand_mm }
 * @returns { laenge_mm (Σ Streifenlänge), bogen: [{ breite_mm, hoehe_mm (Länge), teile: [{ id, exemplar, x_mm, y_mm, b_mm, h_mm, gedreht }] }], ordnung }
 */
function nestenStreifen(teile, o) {
  const r = o.rand_mm;
  const n = nesten(teile.map(t => ({ id: t.id, b_mm: t.h_mm, h_mm: t.b_mm, anzahl: t.anzahl })),
    { hoehe_mm: o.daten_breite_max_mm + 2 * r, max_breite_mm: o.laenge_max_mm, abstand_mm: o.abstand_mm, rand_mm: r });
  const bogen = n.bogen.map(b => {
    const dx = (o.zeichenflaeche_breite_mm - (b.hoehe_mm - 2 * r)) / 2 - r; // Packfläche x = Länge, y = quer
    return { breite_mm: o.zeichenflaeche_breite_mm, hoehe_mm: b.breite_mm,
      teile: b.teile.map(p => ({ id: p.id, exemplar: p.exemplar, x_mm: p.y_mm + dx, y_mm: p.x_mm, b_mm: p.h_mm, h_mm: p.b_mm, gedreht: p.gedreht })) };
  });
  return { laenge_mm: bogen.reduce((s, b) => s + b.hoehe_mm, 0), ordnung: n.ordnung, bogen };
}

module.exports = { nesten, nestenDruck, nestenStreifen, exemplare };
