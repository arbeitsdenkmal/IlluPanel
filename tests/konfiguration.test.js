"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const K = require("../panel/lib/konfiguration");

const CONFIG = path.join(__dirname, "..", "config");

test("acht Auftragsarten, Mapping und Schema gültig", () => {
  const schema = K.schemaLaden(CONFIG);
  const arten = K.auftragsartenLaden(CONFIG);
  assert.deepStrictEqual(Object.keys(arten).sort(), [...K.ARTEN].sort());
  const mapping = K.mappingLaden(CONFIG, arten);
  assert.strictEqual(K.artZuProdukt(mapping, "LFP", "ROLLUP"), "banner_rollup");
  assert.strictEqual(K.artZuProdukt(mapping, "STAMP", "IRGENDWAS"), "lasergravur");
  assert.strictEqual(schema.xmp.namespace, "http://ns.pam-nm.de/illupanels/2.0/");
  assert.strictEqual(schema.tags.anzahl, "IP_Anzahl");
});

test("bewusst fehlerhafte Auftragsart und Mapping werden gemeldet", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-konfig-"));
  fs.cpSync(CONFIG, tmp, { recursive: true });
  const datei = path.join(tmp, "auftragsarten", "schild.json");
  const a = JSON.parse(fs.readFileSync(datei, "utf8"));
  a.export.profil = "unbekannt";
  a.ebenen.push({ name: "Sandbox", rolle: "sandbox2" });
  fs.writeFileSync(datei, JSON.stringify(a));
  fs.writeFileSync(path.join(tmp, "mapping.json"), JSON.stringify({ LFP: { BANNER: "gibtsnicht" } }));
  assert.throws(() => K.auftragsartenLaden(tmp), e => e instanceof K.KonfigFehler && e.fehler.length === 2 && e.fehler.every(f => f.datei === datei));
  const arten = K.auftragsartenLaden(CONFIG);
  assert.throws(() => K.mappingLaden(tmp, arten), e => e instanceof K.KonfigFehler && /gibtsnicht/.test(e.fehler[0].grund));
  fs.writeFileSync(path.join(tmp, "schema.json"), "{ kaputt");
  assert.throws(() => K.schemaLaden(tmp), e => /kein gültiges JSON/.test(e.fehler[0].grund));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("rechner.json: Mac-Beispiel mit ~", () => {
  const roh = JSON.parse(fs.readFileSync(path.join(CONFIG, "rechner.beispiel.json"), "utf8"));
  const r = K.rechnerAusDaten(roh, "rechner.json", { plattform: "darwin", home: "/Users/mk", env: {} });
  assert.strictEqual(r.lokal.arbeitsdateien, "/Users/mk/Desktop");
  assert.strictEqual(r.server.kunden, "/Volumes/Server A-Z/_03_Kunden A-Z");
  assert.strictEqual(r.arbeitsdateienServer, false);
  assert.strictEqual(K.rechnerOrt({ plattform: "darwin", home: "/Users/mk", env: {} }), "/Users/mk/Library/Application Support/PAM-Werkzeuge/rechner.json");
});

test("rechner.json: Windows-Beispiel mit %VAR% und „server“, fehlendes Feld", () => {
  const opts = { plattform: "win32", home: "C:\\Users\\mk", env: { APPDATA: "C:\\Users\\mk\\AppData\\Roaming", LOCALAPPDATA: "C:\\Users\\mk\\AppData\\Local" } };
  const roh = { rechner: "MK", server: { kunden: "Y:\\_03_Kunden A-Z", dtf_bestellen: "Y:\\_02_Produktion\\= DTF bestellen =" },
    lokal: { arbeitsdateien: "server", ausgang: "%LOCALAPPDATA%\\PAM-Werkzeuge\\Ausgang" } };
  const r = K.rechnerAusDaten(roh, "rechner.json", opts);
  assert.strictEqual(r.lokal.ausgang, "C:\\Users\\mk\\AppData\\Local\\PAM-Werkzeuge\\Ausgang");
  assert.strictEqual(r.lokal.arbeitsdateien, "server");
  assert.strictEqual(r.arbeitsdateienServer, true);
  assert.strictEqual(K.rechnerOrt(opts), "C:\\Users\\mk\\AppData\\Roaming\\PAM-Werkzeuge\\rechner.json");
  delete roh.server.dtf_bestellen;
  assert.throws(() => K.rechnerAusDaten(roh, "rechner.json", opts), e => /server\.dtf_bestellen/.test(e.fehler[0].grund));
});
