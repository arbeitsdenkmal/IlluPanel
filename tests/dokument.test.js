"use strict";
const test = require("node:test");
const assert = require("node:assert");
const D = require("../panel/lib/dokument");
const A = require("../panel/lib/ablage");
const fs = require("fs");
const os = require("os");
const path = require("path");

test("XMP-JSON: serialisieren und parsen, unbekannte Felder bleiben", () => {
  const o = D.neu({ auftragsart: "sonstiges", massstab: 1, kunde: "Müller", kundenordner: null, auftragsordner: "2026-10-30_Sonstiges",
    quelle: { art: "leer" }, jetzt: new Date("2026-10-30T14:00:00Z") });
  assert.strictEqual(o.erstellt, "2026-10-30T14:00:00Z");
  assert.deepStrictEqual(D.pruefen(o), []);
  const fremd = Object.assign({}, o, { schild: { verfahren: "uv" }, zukunft: [1, 2] });
  const zurueck = D.parsen(D.serialisieren(fremd));
  const geaendert = D.aendern(zurueck, { "ablage.kundenordner": "M/Mueller" });
  assert.deepStrictEqual(geaendert.schild, { verfahren: "uv" });
  assert.deepStrictEqual(geaendert.zukunft, [1, 2]);
  assert.strictEqual(geaendert.ablage.kundenordner, "M/Mueller");
  assert.strictEqual(zurueck.ablage.kundenordner, null);
  assert.strictEqual(D.parsen(""), null);
  assert.throws(() => D.parsen("{kaputt"), /kein gültiges JSON/);
  assert.throws(() => D.parsen('{"schema":2}'), /Schema 2/);
});

test("Nummerierung gegen zwei Ordner", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-nr-"));
  const lokal = path.join(tmp, "lokal"), server = path.join(tmp, "server");
  fs.mkdirSync(lokal); fs.mkdirSync(server);
  fs.writeFileSync(path.join(lokal, "Mueller_druck.pdf"), "x");
  fs.writeFileSync(path.join(server, "Mueller_druck_02.pdf"), "x");
  assert.strictEqual(A.freierName("Mueller_druck.pdf", [lokal, server]), "Mueller_druck_03.pdf");
  assert.strictEqual(A.freierName("Neu.pdf", [lokal, null, path.join(tmp, "fehlt")]), "Neu.pdf");
  const vergeben = new Set(["Neu.pdf"]);
  assert.strictEqual(A.freierName("Neu.pdf", [lokal], vergeben), "Neu_02.pdf");
  fs.rmSync(tmp, { recursive: true, force: true });
});
