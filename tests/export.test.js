"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const K = require("../panel/lib/konfiguration");
const D = require("../panel/lib/dokument");
const EX = require("../panel/lib/export");

// Temp-Ordner: Server (Kunden A–Z, DTF-Sammelordner) und lokaler Ausgang = Arbeitsdateien (Mac-Weg)
function umgebung() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-export-"));
  const kunden = path.join(tmp, "server", "kunden"), dtf = path.join(tmp, "server", "dtf"), lokal = path.join(tmp, "lokal");
  fs.mkdirSync(path.join(kunden, "M", "Mustermann"), { recursive: true });
  fs.mkdirSync(dtf, { recursive: true });
  fs.mkdirSync(lokal);
  const rechner = K.rechnerAusDaten({ rechner: "Test", server: { kunden, dtf_bestellen: dtf }, lokal: { arbeitsdateien: lokal, ausgang: lokal } }, "test");
  const ad = path.join(lokal, "Mustermann", "2026-10-30_Sonstiges", "Arbeitsdatei.ai");
  fs.mkdirSync(path.dirname(ad), { recursive: true });
  fs.writeFileSync(ad, "ai");
  const meldungen = [], dialog = [path.join(kunden, "M"), path.join(kunden, "M", "Mustermann")];
  let xmp = D.neu({ auftragsart: "sonstiges", massstab: 1, kunde: "Mustermann", kundenordner: null, auftragsordner: "2026-10-30_Sonstiges", quelle: { art: "leer" } });
  const u = {
    rechner, meldung: async t => { meldungen.push(t); }, ordnerWaehlen: async () => dialog.shift() || null,
    xmpSchreiben: async o => { xmp = o; }, arbeitsdatei: { pfad: ad }, zeitlimit_ms: 1000
  };
  const auftrag = dtfNamen => ({ xmp, dateien: [{ name: "Mustermann_druck.pdf", speichern: p => fs.writeFileSync(p, "%PDF-test") }], dtf: dtfNamen || [] });
  return { tmp, kunden, dtf, lokal, u, auftrag, meldungen, get xmp() { return xmp; } };
}
const teile = ordner => fs.readdirSync(ordner).filter(n => n.endsWith(".teil"));

test("Exportkern: Erfolg mit Kundenordner-Dialog, Arbeitsdatei-Kopie, Nummerierung", async () => {
  const t = umgebung();
  const auftrag = "2026-10-30_Sonstiges", server = path.join(t.kunden, "M", "Mustermann", auftrag);
  const r = await EX.exportieren(t.auftrag(), t.u);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.meldung, null);
  assert.strictEqual(t.meldungen.length, 1); // erster Dialogordner war ungültig (nur Buchstabe)
  assert.strictEqual(t.xmp.ablage.kundenordner, "M/Mustermann");
  assert.ok(fs.existsSync(path.join(server, "Mustermann_druck.pdf")));
  assert.ok(fs.existsSync(path.join(server, "Arbeitsdatei.ai")));
  assert.ok(!fs.existsSync(path.join(t.lokal, "Mustermann", auftrag, "Mustermann_druck.pdf")));
  assert.deepStrictEqual(t.xmp.exporte[0].dateien, [{ name: "Mustermann_druck.pdf", uebertragen: true }]);
  assert.strictEqual(t.xmp.exporte[0].ordner, `M/Mustermann/${auftrag}`);
  const r2 = await EX.exportieren(t.auftrag(), t.u); // gleicher Auftrag: eigener Ordner, nächste Nummer
  assert.strictEqual(r2.ok, true);
  assert.ok(fs.existsSync(path.join(server, "Mustermann_druck_02.pdf")));
  assert.ok(fs.existsSync(path.join(server, "Arbeitsdatei_02.ai")));
  assert.deepStrictEqual(teile(server), []);
  fs.rmSync(t.tmp, { recursive: true, force: true });
});

test("Exportkern: Transfer schlägt fehl -> geparkt, kein .teil übrig", async t0 => {
  const t = umgebung();
  t0.mock.method(fs.promises, "rename", async () => { throw Object.assign(new Error("Testfehler"), { code: "EIO" }); });
  const r = await EX.exportieren(t.auftrag(), t.u);
  const server = path.join(t.kunden, "M", "Mustermann", "2026-10-30_Sonstiges");
  const lokal = path.join(t.lokal, "Mustermann", "2026-10-30_Sonstiges", "Mustermann_druck.pdf");
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.geparkt, [lokal]);
  assert.ok(fs.existsSync(lokal));
  assert.deepStrictEqual(fs.readdirSync(server), []);
  assert.strictEqual(t.xmp.exporte[0].uebertragen, false);
  assert.match(r.meldung, /lokal abgelegt/);
  fs.rmSync(t.tmp, { recursive: true, force: true });
});

test("Exportkern: DTF-Kopie mit Nummerierung gegen den Sammelordner", async () => {
  const t = umgebung();
  fs.writeFileSync(path.join(t.dtf, "Mustermann_druck.pdf"), "alt");
  const r = await EX.exportieren(t.auftrag(["Mustermann_druck.pdf"]), t.u);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(fs.readFileSync(path.join(t.dtf, "Mustermann_druck_02.pdf"), "utf8"), "%PDF-test");
  assert.deepStrictEqual(teile(t.dtf), []);
  fs.rmSync(t.tmp, { recursive: true, force: true });
});
