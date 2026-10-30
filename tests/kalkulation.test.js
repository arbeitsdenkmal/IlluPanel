"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const K = require("../panel/lib/konfiguration");
const PC = require("../panel/lib/preisquelle_csv");
const T = require("../panel/lib/teile");
const KA = require("../panel/lib/kalkulation");
const N = require("../panel/lib/nesting");
const R = require("../panel/lib/rollen");
const A = require("../panel/lib/auftrag");

const EXT = path.join(__dirname, "..");
const CONFIG = path.join(EXT, "config");
const CSV = PC.csvPfad(EXT);
const medien = K.medienLaden(CONFIG);
const farben = K.farbenLaden(CONFIG);
const aa = K.auftragsartenLaden(CONFIG).fahrzeugbeschriftung;

// Rohdaten wie IP.objekteLesen: Rechteck b × h mm (Realmaß) bei Maßstab 1:30, Füllung 751C-031, 1 Teil, Schnittlänge = Umfang
const PT = 25.4 / 72 * 30;
function rechteck(nr, b_mm, h_mm, x_mm, tags) {
  const gb = [x_mm / PT, 0, (x_mm + b_mm) / PT, -h_mm / PT];
  return { ref: { ebene: "Plott", index: nr }, ebene: "Plott", rolle: "plott", name: "", typ: "PathItem", tags, gb, vb: gb, cut: false,
    blaetter: [{ path: [], typ: "PathItem", gb, vb: gb, laenge_pt: 2 * (b_mm + h_mm) / PT, teile: 1, farben: [{ key: "spot:031 (751 C)", label: "031 (751 C)", spot: "031 (751 C)" }] }] };
}
const ebenen = aa.ebenen.map(e => ({ name: e.name, rolle: e.rolle, unterebenen: 0 }));
const xmp = { schema: 1, rolle: "arbeitsdatei", auftragsart: "fahrzeugbeschriftung", massstab: 30, kunde: "Streifen", farbzuordnung: {}, grafikzeit: { eintraege: [] } };

async function rechnen(objekte) {
  const pq = PC.erstellen(EXT, { medien });
  assert.ok((await pq.laden(aa.preis)).ok);
  const an = T.aufbauen({ ebenen, objekte }, { aa, pq, farben, medien, xmp });
  assert.deepStrictEqual(an.fehler, []);
  return KA.rechnen(an, aa, pq, medien);
}

test("6.1 Preisquelle: echte preisliste.csv lädt; aufschlag mit prozent und minuten -> Fehler", async () => {
  const r = await PC.erstellen(EXT, { medien }).laden("fahrzeug");
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.fehler, []);
  assert.strictEqual(r.version, null);
  assert.strictEqual(r.quelle, "csv");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-preis-"));
  const kaputt = path.join(tmp, "preisliste.csv");
  fs.writeFileSync(kaputt, fs.readFileSync(CSV, "utf8").replace("aufschlag;sicke;alle;Sicke (auf Montage des Stücks);;;;;;50;", "aufschlag;sicke;alle;Sicke (auf Montage des Stücks);;;;;10;50;"));
  const f = await PC.erstellen(EXT, { medien, datei: kaputt }).laden("fahrzeug");
  assert.strictEqual(f.ok, false);
  assert.ok(f.fehler.some(x => /sicke/.test(x) && /entweder prozent oder minuten/.test(x)));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("6.2 Kalkulation Streifen (PREISLOGIK §11): 2 Stücke = 1 Stück mit Anzahl 2", async () => {
  const zwei = await rechnen([rechteck(0, 2060, 470, 0, { id: "a", folie: "751C-031" }), rechteck(1, 2060, 470, 3000, { id: "b", folie: "751C-031" })]);
  const eins = await rechnen([rechteck(0, 2060, 470, 0, { id: "a", folie: "751C-031", anzahl: "2" })]);
  for (const e of [zwei, eins]) {
    assert.strictEqual(Math.round(e.auftrag.produktionMin), 11);
    assert.strictEqual(Math.round(e.auftrag.montageMin), 17);
    assert.strictEqual(e.vk.nur_aufkleber.gerundet, 60);
    assert.strictEqual(e.mindest.nur_aufkleber.gerundet, 45);
    assert.strictEqual(e.vk.inkl_montage.gerundet, 105);
    assert.strictEqual(e.mindest.inkl_montage.gerundet, 75);
  }
  for (const k of ["nur_aufkleber", "inkl_montage"]) for (const s of ["vk", "mindest"]) {
    assert.ok(Math.abs(eins[s][k].netto - zwei[s][k].netto) < 1e-9);
    assert.strictEqual(eins[s][k].brutto, zwei[s][k].brutto);
  }
});

test("6.3 Nesting: Anzahl 3 ergibt 3 Exemplare; Plott-Nutzbreite 751C = 1235", () => {
  assert.strictEqual(R.nutzbreite(medien, "751C", "plott"), 1235);
  const n = N.nesten([{ id: "T0001", b_mm: 300, h_mm: 200, anzahl: 3 }], KA.nestOptionen(aa, medien, "751C"));
  const ex = n.bogen.flatMap(b => b.teile);
  assert.strictEqual(ex.length, 3);
  assert.deepStrictEqual(ex.map(t => t.id + "/" + t.exemplar).sort(), ["T0001/1", "T0001/2", "T0001/3"]);
});

test("6.4 Varianten-Erkennung: drei Objekte gleicher Id -> eine bleibt, zwei neue mit IP_Original", () => {
  const o = [0, 1, 2].map(i => ({ ref: { ebene: "Plott", index: i }, tags: { id: "abc", folie: "751C-031" } }));
  const s = T.variantenErkennen(o);
  assert.strictEqual(o[0].tags.id, "abc");
  assert.strictEqual(o[0].tags.original, undefined);
  assert.strictEqual(s.length, 2);
  for (const x of [o[1], o[2]]) { assert.notStrictEqual(x.tags.id, "abc"); assert.strictEqual(x.tags.original, "abc"); assert.strictEqual(x.tags.folie, "751C-031"); }
  assert.notStrictEqual(o[1].tags.id, o[2].tags.id);
  assert.deepStrictEqual(s.map(x => x.id), ["abc", "abc"]);
});

test("6.5 Datensatz-Struktur nach SPEZ_02 §8.4 über berechnen() mit Host-Attrappe", async () => {
  let geschrieben = null;
  const objekte = [rechteck(0, 2060, 470, 0, { id: "a", folie: "751C-031", anzahl: "2" })];
  const host = async (fn, arg) => {
    if (fn === "xmpLesen") return { text: JSON.stringify(geschrieben || xmp) };
    if (fn === "xmpSchreiben") { geschrieben = JSON.parse(arg); return {}; }
    if (fn === "objekteLesen") return { ebenen, objekte: JSON.parse(JSON.stringify(objekte)) };
    if (fn === "objektTagsSchreiben") return { geschrieben: arg.length };
    throw new Error(fn);
  };
  const r = await A.berechnen(host, { ext: EXT, arten: { fahrzeugbeschriftung: aa }, medien, farben });
  assert.deepStrictEqual(r.fehler, []);
  const d = geschrieben.kalkulation;
  assert.deepStrictEqual(d, r.datensatz);
  const felder = (o, liste) => liste.forEach(k => assert.ok(k in o, k));
  felder(d, ["schema", "zeit", "panel", "preislogik", "preisliste", "auftragsart", "massstab", "kunde", "stundensaetze", "mwst", "rundung", "objekte", "folien",
    "auftrag", "preise", "materialbedarf", "grafik", "warnungen"]);
  assert.deepStrictEqual(Object.keys(d.preisliste), ["quelle", "version", "stand"]);
  assert.strictEqual(d.preisliste.version, null);
  assert.strictEqual(d.preisliste.quelle, "csv");
  felder(d.stundensaetze, ["vk", "mindest", "grafik"]);
  felder(d.objekte[0], ["id", "name", "original", "anzahl", "verfahren", "folien", "laminat", "flaeche_m2", "flaeche_je_folie", "teile", "schnitt_m", "komplexitaet",
    "attribute", "tape", "minuten", "betraege"]);
  felder(d.objekte[0].minuten, ["ruesten_anteil", "tape_anteil", "flaechenzeit", "entgittern", "trennen", "produktion", "montage", "montage_attribute"]);
  felder(d.objekte[0].betraege, ["material", "tape", "produkt_vk", "montage_vk", "produkt_mindest", "montage_mindest"]);
  felder(d.folien[0], ["schluessel", "serie", "verfahren", "laminat", "rollenbreite_mm", "nutzbreite_mm", "boegen", "lfm", "verbrauch_m2", "flaeche_m2", "teile", "ek"]);
  felder(d.auftrag, ["datei_rip_min", "auftrag_montage_min", "reinigen_rest_min", "produktion_min", "montage_min"]);
  for (const s of ["vk", "mindest"]) for (const k of ["nur_aufkleber", "inkl_montage"]) felder(d.preise[s][k], ["netto", "gerundet", "brutto"]);
  for (const s of ["vk", "mindest"]) felder(d.preise.mindestbetrag_greift[s], ["produkt", "montage"]);
  felder(d.materialbedarf[0], ["schluessel", "verbrauch_m2", "lfm", "rollenbreite_mm"]);
  felder(d.grafik, ["min_auto", "min_manuell", "stundensatz", "betrag"]);
  assert.strictEqual(d.objekte[0].anzahl, 2);
  assert.strictEqual(d.folien[0].nutzbreite_mm, 1235);
  assert.strictEqual(d.preise.vk.inkl_montage.gerundet, 105);
  assert.strictEqual(d.preise.vk.inkl_montage.brutto, 124.95);
});
