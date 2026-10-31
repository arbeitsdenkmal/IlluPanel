"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const K = require("../panel/lib/konfiguration");
const PC = require("../panel/lib/preisquelle_csv");
const T = require("../panel/lib/teile");
const KA = require("../panel/lib/kalkulation");
const PM = require("../panel/lib/passermarken");
const OP = require("../panel/lib/opos");

const EXT = path.join(__dirname, "..");
const CONFIG = path.join(EXT, "config");
const medien = K.medienLaden(CONFIG);
const farben = K.farbenLaden(CONFIG);
const aa = K.auftragsartenLaden(CONFIG).fahrzeugbeschriftung;
const P = medien.passermarken;

test("2c Passermarken: Lücke zwischen den Farben – zwei Marken 30 mm innen, Blöcke je Farbe", () => {
  const r = PM.planen({ A: [{ x0: 0, y0: 0, x1: 400, y1: 100 }], B: [{ x0: 0, y0: 200, x1: 400, y1: 300 }] }, P);
  assert.strictEqual(r.kante, 30);
  assert.deepStrictEqual(r.innen, [true, true]);
  assert.deepStrictEqual(r.marken, [{ x0: 0, y0: 105, x1: 30, y1: 135 }, { x0: 210, y0: 105, x1: 240, y1: 135 }]);
  assert.deepStrictEqual(r.bloecke, { A: { x0: 0, y0: 0, x1: 400, y1: 135 }, B: { x0: 0, y0: 105, x1: 400, y1: 300 } });
});

test("2c Passermarken: keine Lücke – Marken außen 5 mm neben dem Umriss, senkrecht mittig", () => {
  const r = PM.planen({ A: [{ x0: 0, y0: 0, x1: 200, y1: 100 }], B: [{ x0: 200, y0: 0, x1: 400, y1: 100 }] }, P);
  assert.strictEqual(r.kante, 10);
  assert.deepStrictEqual(r.innen, [false, false]);
  assert.deepStrictEqual(r.marken, [{ x0: -15, y0: 45, x1: -5, y1: 55 }, { x0: 405, y0: 45, x1: 415, y1: 55 }]);
  assert.deepStrictEqual(r.bloecke.A, { x0: -15, y0: 0, x1: 415, y1: 100 });
});

test("2c Passermarken: kleine Gruppe – Mindeststufe 5 mm, Abstand 5 mm zu Teilen und zueinander", () => {
  const r = PM.planen({ A: [{ x0: 0, y0: 0, x1: 40, y1: 20 }], B: [{ x0: 60, y0: 0, x1: 100, y1: 20 }] }, P);
  assert.strictEqual(r.kante, 5);
  assert.deepStrictEqual(r.marken, [{ x0: 45, y0: 0, x1: 50, y1: 5 }, { x0: 50, y0: 10, x1: 55, y1: 15 }]);
  assert.ok(PM.abstand(r.marken[0], r.marken[1]) >= 5);
  assert.deepStrictEqual(r.bloecke, { A: { x0: 0, y0: 0, x1: 55, y1: 20 }, B: { x0: 45, y0: 0, x1: 100, y1: 20 } });
});

test("2c Nesting mit Block: mehrfarbiges Stück je Farbe ein Block mit denselben Marken, je Exemplar ein Block", async () => {
  const PT = 25.4 / 72 * 30;
  const blatt = (x0, y0, x1, y1, spot) => { const gb = [x0 / PT, -y0 / PT, x1 / PT, -y1 / PT]; return { path: [], typ: "PathItem", gb, vb: gb, laenge_pt: 2 * (x1 - x0 + y1 - y0) / PT, teile: 1, farben: [{ key: "spot:" + spot, label: spot, spot }] }; };
  const b1 = blatt(0, 0, 400, 100, "031 (751 C)"), b2 = blatt(0, 200, 400, 300, "010 (751 C)");
  const gb = [b1.gb[0], b1.gb[1], b2.gb[2], b2.gb[3]];
  const objekt = { ref: { ebene: "Plott", index: 0 }, ebene: "Plott", rolle: "plott", name: "Logo", typ: "GroupItem", gb, vb: gb, cut: false,
    tags: { id: "a", folie: "751C-031", anzahl: "2" }, blaetter: [b1, b2] };
  const pq = PC.erstellen(EXT, { medien });
  assert.ok((await pq.laden(aa.preis)).ok);
  const xmp = { schema: 1, rolle: "arbeitsdatei", auftragsart: "fahrzeugbeschriftung", massstab: 30, kunde: "Block", farbzuordnung: {}, grafikzeit: { eintraege: [] } };
  const an = T.aufbauen({ ebenen: aa.ebenen.map(e => ({ name: e.name, rolle: e.rolle, unterebenen: 0 })), objekte: [objekt] }, { aa, pq, farben, medien, xmp });
  assert.deepStrictEqual(an.fehler, []);
  assert.strictEqual(an.objekte[0].messung.teile, 2); // Marken zählen nicht
  const g31 = an.gruppen["plott|751C-031"], g10 = an.gruppen["plott|751C-010"];
  assert.strictEqual(g31.teile.length, 1);
  assert.strictEqual(g10.teile.length, 1);
  assert.deepStrictEqual(g31.teile[0].marken, g10.teile[0].marken);
  assert.deepStrictEqual([g31.teile[0].b_mm, g31.teile[0].h_mm], [400, 135]);
  assert.deepStrictEqual([g10.teile[0].b_mm, g10.teile[0].h_mm], [400, 195]);
  assert.deepStrictEqual(g31.teile[0].ohneMarken, { b_mm: 400, h_mm: 100 });
  const nest = KA.nestingAlle(an, aa, medien, "plott");
  for (const [key, h] of [["plott|751C-031", 135], ["plott|751C-010", 195]]) {
    const ex = nest[key].n.bogen.flatMap(b => b.teile);
    assert.strictEqual(ex.length, 2);
    ex.forEach(t => assert.deepStrictEqual([Math.min(t.b_mm, t.h_mm), Math.max(t.b_mm, t.h_mm)], [h, 400]));
  }
  assert.ok(!("plott|751C-031" in KA.nestingAlle(an, aa, medien, "druck")));
});

test("2c OPOS-Regel gegen die Fälle aus OPOS_ANALYSE §2/§5 (Toleranz 0,01 mm)", () => {
  const text = fs.readFileSync(path.join(EXT, "Infos", "OPOS_ANALYSE.md"), "utf8");
  const zahl = s => Number(s.trim().replace(",", "."));
  const paar = (s, t) => s.split(t).map(zahl);
  const zeilen = text.split("\n").filter(z => /^\| [ANKZ]_/.test(z));
  assert.strictEqual(zeilen.length, 40);
  const nah = (a, b, was) => assert.ok(Math.abs(a - b) <= 0.01 + 1e-9, `${was}: ${a} statt ${b}`);
  for (const z of zeilen) {
    const f = z.split("|").slice(1, -1).map(x => x.trim());
    const [b, l] = paar(f[3], "×"), vf = f[2], n = Number(f[4]), fall = `${f[0]} ${vf}`;
    assert.strictEqual(OP.markenJeSeite(l), n, fall);
    const m = OP.marken({ b, l }, vf), marks = m.filter(o => o.name === "Mark");
    assert.strictEqual(marks.length, 2 * n, fall);
    const [xl, xr] = paar(f[6], "/"), [y0, y1] = paar(f[7], "/");
    nah(marks[0].gb[0], xl, fall + " links x"); nah(marks[n].gb[0], xr, fall + " rechts x");
    nah(marks[0].gb[1], y0, fall + " erste y"); nah(marks[n - 1].gb[1], y1, fall + " letzte y");
    nah(marks[1].gb[1] - marks[0].gb[1], zahl(f[5]), fall + " Abstand");
    const linie = (name, feld) => {
      const o = m.find(x => x.name === name);
      if (feld === "–") return assert.strictEqual(o, undefined, fall + " " + name);
      const [xs, ys] = feld.split(", "), [a0, a1] = paar(xs, "–"), [c0, c1] = paar(ys, /(?<=\d)–/);
      [[o.gb[0], a0], [o.gb[2], a1], [o.gb[1], c0], [o.gb[3], c1]].forEach(([ist, soll]) => nah(ist, soll, `${fall} ${name}`));
    };
    linie("OPOS XY Line", f[8]);
    linie("OPOS XY2 Line", f[9]);
  }
});
