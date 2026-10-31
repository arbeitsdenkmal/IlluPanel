"use strict";
const test = require("node:test");
const assert = require("node:assert");
const S = require("../panel/lib/schild");

test("Schild: Lochmitten je Anordnung, Laserregel an der Grenze 300 × 600", () => {
  const b = (anordnung, x, y) => ({ anordnung, abstand_x_mm: x, abstand_y_mm: y, durchmesser_mm: 5 });
  assert.deepStrictEqual(S.lochmitten(297, 210, b("ecken", 20, 15)),
    [{ x_mm: 20, y_mm: 15 }, { x_mm: 277, y_mm: 15 }, { x_mm: 20, y_mm: 195 }, { x_mm: 277, y_mm: 195 }]);
  assert.deepStrictEqual(S.lochmitten(297, 210, b("mitte_oben_unten", 20, 10)), [{ x_mm: 148.5, y_mm: 10 }, { x_mm: 148.5, y_mm: 200 }]);
  assert.deepStrictEqual(S.lochmitten(297, 210, b("mitte_links_rechts", 10, 20)), [{ x_mm: 10, y_mm: 105 }, { x_mm: 287, y_mm: 105 }]);
  assert.deepStrictEqual(S.lochmitten(297, 210, { anordnung: "keine" }), []);

  const acryl = { kuerzel: "PMMA", staerke: 5, acryl: true }, max = [300, 600];
  assert.strictEqual(S.laserNoetig(acryl, 300, 600, max), true);
  assert.strictEqual(S.laserNoetig(acryl, 600, 300, max), true);
  assert.strictEqual(S.laserNoetig(acryl, 300.5, 600, max), false);
  assert.strictEqual(S.laserNoetig(acryl, 600, 300.5, max), false);
  assert.strictEqual(S.laserNoetig(acryl, 300, 600.5, max), false);
  assert.strictEqual(S.laserNoetig({ kuerzel: "Dib", staerke: 3, acryl: false }, 200, 200, max), false);
});
