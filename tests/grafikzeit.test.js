"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const GZ = require("../panel/lib/grafikzeit");

test("Zaehler mit simulierten Ticks: aktiv, Leerlauf, Lücke, Dokumentwechsel, Bündel 60 s", () => {
  const geschrieben = [];
  const z = new GZ.Zaehler({ schreiben: (k, e) => geschrieben.push([k, e.sekunden]) });
  const A = "/a/Arbeitsdatei.ai", B = "/b/Arbeitsdatei.ai";
  const t0 = Date.UTC(2026, 9, 31, 8, 0, 0);
  const tick = (s, z2) => z.tick(t0 + s * 1000, Object.assign({ vorne: true, leerlauf_s: 1, schluessel: A }, z2));
  tick(0); tick(5); tick(10);                     // 10 s aktiv
  tick(15, { leerlauf_s: 40 });                   // Leerlauf ≥ 30 s -> Ende, Eintrag 10 s
  tick(20); tick(60);                             // 5 s, dann Lücke 40 s -> höchstens 15 s
  tick(65, { vorne: false });                     // nicht vorn -> Eintrag 20 s
  tick(70); tick(75, { schluessel: B }); tick(80, { schluessel: B }); // Wechsel: A 5 s, dann B 5 s + 5 s
  tick(85, { schluessel: null });                 // ungespeichert -> Eintrag B 10 s
  assert.deepStrictEqual(geschrieben, [[A, 10], [A, 20], [A, 5], [B, 10]]);

  // Bündel: nach 60 s Aktivität wird geschrieben, der Rest beim flush
  geschrieben.length = 0;
  for (let s = 90; s <= 170; s += 5) tick(s);
  z.flush(t0 + 171000);
  assert.deepStrictEqual(geschrieben.map(x => x[1]), [60, 25]);
});

test("Pufferübernahme: Minutenrundung, nur übernommene Ids entfernt, ohne Einträge kein XMP", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-grafik-"));
  const puffer = GZ.pufferDatei({ plattform: "darwin", home: tmp });
  assert.strictEqual(puffer, path.join(tmp, "Library", "Application Support", "PAM-Werkzeuge", "grafikzeit_puffer.json"));
  const A = path.join(tmp, "Müller", "Arbeitsdatei.ai"), B = path.join(tmp, "B", "Arbeitsdatei.ai"); // A in NFD
  GZ.anhaengen(puffer, A, { von: "2026-10-31T08:00:00.000Z", bis: "2026-10-31T08:01:23.200Z", sekunden: 83.2 });
  GZ.anhaengen(puffer, A, { von: "2026-10-31T09:00:00.000Z", bis: "2026-10-31T09:00:02.900Z", sekunden: 2.9 });
  GZ.anhaengen(puffer, B, { von: "2026-10-31T10:00:00.000Z", bis: "2026-10-31T10:00:30.000Z", sekunden: 30 });
  assert.deepStrictEqual(fs.readdirSync(path.dirname(puffer)), ["grafikzeit_puffer.json"]); // keine Temp-Dateien

  const xmp = { schema: 1, rolle: "arbeitsdatei", grafikzeit: { eintraege: [{ von: "x", bis: "x", minuten: 5, manuell: true, benutzer: null, uebertragen: false }] } };
  const u = GZ.uebernahme(puffer, A.normalize("NFC"), xmp);
  assert.deepStrictEqual(u.xmp.grafikzeit.eintraege.slice(1), [
    { von: "2026-10-31T08:00:00.000Z", bis: "2026-10-31T08:01:23.200Z", minuten: 1.4, manuell: false, benutzer: null, uebertragen: false },
    { von: "2026-10-31T09:00:00.000Z", bis: "2026-10-31T09:00:02.900Z", minuten: 0, manuell: false, benutzer: null, uebertragen: false }]);
  assert.strictEqual(xmp.grafikzeit.eintraege.length, 1); // Eingabe unverändert
  assert.strictEqual(GZ.summeMinuten(u.xmp), 6);

  // inzwischen angehängter Eintrag bleibt, übernommene verschwinden, B bleibt unberührt
  GZ.anhaengen(puffer, A, { von: "2026-10-31T11:00:00.000Z", bis: "2026-10-31T11:00:10.000Z", sekunden: 10 });
  GZ.entfernen(puffer, A, u.ids);
  assert.deepStrictEqual(GZ.eintraegeVon(puffer, A).map(e => e.sekunden), [10]);
  assert.deepStrictEqual(GZ.eintraegeVon(puffer, B).map(e => e.sekunden), [30]);
  GZ.entfernen(puffer, A, GZ.eintraegeVon(puffer, A).map(e => e.id));
  assert.deepStrictEqual(Object.keys(GZ.pufferLesen(puffer)), [B]);

  // ohne Puffereinträge: nichts zu schreiben; „+m“ als weiterer Eintrag
  assert.strictEqual(GZ.uebernahme(puffer, A, xmp), null);
  const m = GZ.uebernahme(puffer, A, xmp, [GZ.eintragManuell(-3, new Date("2026-10-31T12:00:00Z"))]);
  assert.deepStrictEqual(m.ids, []);
  assert.deepStrictEqual(m.xmp.grafikzeit.eintraege[1], { von: "2026-10-31T12:00:00.000Z", bis: "2026-10-31T12:00:00.000Z", minuten: -3, manuell: true, benutzer: null, uebertragen: false });
  assert.deepStrictEqual(["12", "-4", "+2", "0", "1,5", "x", ""].map(GZ.manuellLesen), [12, -4, 2, null, null, null, null]);
  fs.rmSync(tmp, { recursive: true, force: true });
});
