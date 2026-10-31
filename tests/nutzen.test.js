"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const N = require("../panel/lib/nutzen");
const GI = require("../panel/lib/gitter");
const M = require("../panel/lib/mbnummern");

const NK = require(path.join(__dirname, "..", "config", "nutzen.json"));
const RAND = 24.353 + 2 * 10; // opos_zugabe_mm + 2 × opos_marken_rand_mm (config/medien.json)
const U = { rolle: 1370, kantenhalter: 15, rand: RAND, max_laenge: 2500, gB: NK.nutzen.abstand_boegen_mm, toleranz: NK.nutzen.toleranz, formate: NK.nutzen.formate };
const kurz = p => ({ len: p.len, prints: p.prints, boegen: p.boegen, pieces: p.pieces, nW: p.nW, nH: p.nH, bCols: p.bCols, bRows: p.bRows, perRow: p.perRow, rotM: p.rotM, bQuer: p.bQuer });

test("Nutzen-Planer: A4 wie im alten Projekt, Format „ohne“ mit zwei Bögen", () => {
  const m = { mW: 50, mH: 30, bleedMax: 2, hasCut: true, nCut: 1 };
  // A4, exakt oder kleiner, 100 Stück, 5 mm Abstand: Werte von panel/lib/nutzen.js planen() des alten Projekts
  const a4 = N.planen(m, { cnt: 100, format: "a4", strict: true, gm: 5 }, U);
  assert.deepStrictEqual(a4.picks.map(kurz), [
    { len: 214.353, prints: 1, boegen: 4, pieces: 100, nW: 1140, nH: 170, bCols: 5, bRows: 5, perRow: 4, rotM: false, bQuer: true },
    { len: 214.353, prints: 1, boegen: 7, pieces: 105, nW: 1240, nH: 170, bCols: 3, bRows: 8, perRow: 7, rotM: false, bQuer: false },
    { len: 259.353, prints: 1, boegen: 6, pieces: 120, nW: 1120, nH: 215, bCols: 5, bRows: 5, perRow: 6, rotM: true, bQuer: false },
    { len: 274.353, prints: 1, boegen: 8, pieces: 128, nW: 1160, nH: 230, bCols: 8, bRows: 3, perRow: 4, rotM: true, bQuer: true }]);
  assert.strictEqual(N.planZeile(a4.picks[0]), "0.21 m  |  Bogen 290×190 mm (5×5)  |  4 Bögen/Reihe  |  4 Bögen gesamt  |  1 Bögen  |  Bogen quer");
  const b1 = N.druckboegen(a4.picks[0], 20, 100);
  assert.strictEqual(b1.length, 1);
  assert.deepStrictEqual([b1[0].anzahl, b1[0].nW, b1[0].nH], [100, 1140, 170]);

  // ohne: Spalten über die Nutzbreite 1370 − 30 − 44,353 − 4 = 1291,647; 2000 Stück, Motiv 90° mit 37 Spalten, 44 Zeilen je Bogen, letzter Bogen exakt
  const oh = N.planen(m, { cnt: 2000, format: "ohne", strict: true, gm: 5 }, U);
  const x = oh.picks[0];
  assert.deepStrictEqual([x.rotM, x.cols, x.rowsMax, x.Z, x.prints, x.over, x.nW], [true, 37, 44, 55, 2, 0, 37 * 35 - 5]);
  const b2 = N.druckboegen(x, 20, 2000);
  assert.deepStrictEqual(b2.map(b => [b.anzahl, b.nW, b.nH]), [[1628, 1290, 44 * 55 - 5], [372, 1290, 11 * 55 - 5]]);
  assert.deepStrictEqual(b2[1].positionen[371], [(371 % 37) * 35, 10 * 55]);
});

test("Gitter-Planung: zwei Jobs, Einzelbogen und Bogenfolge, Längengrenze 2500 − 44,353", () => {
  const jobs = [{ datei: { name: "15x_A.pdf" }, anzahl: 15, daten: { zeilen: new Array(20).fill({ ring: "R", wea: "WEA1" }) }, typOben: "Typ" },
    { datei: { name: "3x_B.pdf" }, anzahl: 3, daten: { zeilen: new Array(45).fill({ ring: "R", wea: "WEA2" }) }, typOben: "" }];
  const pl = GI.planung(jobs, 90, 36, NK.gitter, { rand: RAND, max_laenge: 2500 });
  assert.deepStrictEqual(jobs.map(j => j.laenge), [21 * 40 - 4, 45 * 40 - 4]);
  assert.strictEqual(pl.nutzbreite, 1345 - RAND);
  // Einzelbogen mit 1 Druck (2456 mm) liegt über der Grenze und entfällt; Folge zuerst (wenigste Bahn), dann Einzelbögen mit 2, 3, 4 Drucken
  assert.deepStrictEqual(pl.varianten.map(v => [v.typ, v.dokumente, v.drucke, v.zuviel, v.ueber]),
    [["folge", 2, 2, 0, 0], ["einzel", 1, 2, 2, 0], ["einzel", 1, 3, 0, 0], ["einzel", 1, 4, 2, 0]]);
  assert.strictEqual(GI.variantenZeile(pl.varianten[0]), "2 Dateien, 2 Drucke gesamt   |   2.52 m Material   |   exakt   |   längster Bogen 1796 mm");
  assert.strictEqual(GI.detailText(pl.varianten[0], pl.bandHoehe), "Bogen 1: 1× drucken, 1300 × 1796 mm  –  längs 12 (1796 mm)\nBogen 2: 1× drucken, 836 × 640 mm  –  quer 6 (640 mm)");
  const p = GI.plaetze(jobs, pl, pl.varianten[0].boegen[1], 90);
  assert.deepStrictEqual(p.map(s => [s.job, s.x_mm, s.y_mm, s.quer]), [0, 1, 2, 3, 4, 5].map(i => [0, 0, i * 110, true]));
});

test("MB-Blöcke: zwei Nummern in einem gemischten Block", () => {
  const mengen = {}; for (let nr = 1; nr <= 10; nr++) mengen[nr] = 0;
  mengen[3] = 12; mengen[7] = 4;
  const pl = M.planung(mengen, NK.mb, { nutzbar: 1370 - 30 - RAND, max_hoehe: 2500 - RAND });
  assert.deepStrictEqual(pl.bloecke.map(b => b.map(t => [t.nr, t.reihen])), [[["3", 3], ["7", 1]]]);
  assert.strictEqual(pl.proZeile, 5);
  assert.deepStrictEqual(pl.boegen.map(b => [b.nutzenB, b.nutzenH]), [[215, 215]]);
  const s = M.schilder(pl, pl.boegen[0], NK.mb);
  assert.deepStrictEqual([s.filter(x => x.nr === 3).length, s.filter(x => x.nr === 7).length], [15, 5]);
  assert.deepStrictEqual(s.filter(x => x.nr === 7).map(x => x.y_mm), [180, 180, 180, 180, 180]); // zweite Nummer unten bündig (Reihe 5)
});
