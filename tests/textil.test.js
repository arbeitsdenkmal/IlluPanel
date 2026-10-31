"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const K = require("../panel/lib/konfiguration");
const PC = require("../panel/lib/preisquelle_csv");
const T = require("../panel/lib/teile");
const KT = require("../panel/lib/kalkulation_textil");
const N = require("../panel/lib/nesting");

const EXT = path.join(__dirname, "..");
const CONFIG = path.join(EXT, "config");
const medien = K.medienLaden(CONFIG);
const aa = K.auftragsartenLaden(CONFIG).textil;
const tk = K.textilLaden(EXT, aa).konfig;

// Rohdaten wie IP.objekteLesen: Motiv b × h mm im Dokument (Maßstab 1), ein Pfad, Füllung Weiß, Schnittlänge = Umfang
const PT = 72 / 25.4;
function motiv(nr, b_mm, h_mm, tags) {
  const gb = [0, 0, b_mm * PT, -h_mm * PT];
  return { ref: { ebene: "Design", index: nr }, ebene: "Design", rolle: "textil", name: "", typ: "PathItem", tags, gb, vb: gb,
    blaetter: [{ path: [], typ: "PathItem", gb, vb: gb, laenge_pt: 2 * (b_mm + h_mm) * PT, teile: 1, farben: [{ key: "cmyk:0,0,0,0", label: "CMYK 0/0/0/0" }] }] };
}

test("kalkulation_textil: Mindestbetrag je Exemplar, blockout = 2 Pressvorgänge, Textilzahl, Rundung 0,10, nur_aufkleber null", async () => {
  // Preisliste mit Preis für PoliTape Turbo (ek_m2 10, vk_m2 19), sonst unverändert
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-textil-"));
  const csv = path.join(tmp, "preisliste.csv");
  fs.writeFileSync(csv, fs.readFileSync(PC.csvPfad(EXT), "utf8").replace("serie;PoliTape Turbo;textil;PoliTape Turbo;flex;16,00;30,40;;;;", "serie;PoliTape Turbo;textil;PoliTape Turbo;flex;10;19;;;;"));
  const pq = PC.erstellen(EXT, { medien, datei: csv });
  assert.ok((await pq.laden(aa.preis)).ok);
  const farbe = JSON.stringify({ "cmyk:0,0,0,0": "Weiß" });
  const an = T.aufbauenTextil({ ebenen: [], objekte: [
    motiv(0, 40, 20, { id: "a", position: "Brust links", verfahren: "Flex", folie: "PoliTape Turbo", farbe,
      stufen: JSON.stringify([{ mass_mm: 80, bezug: "Breite", menge: 10, zeigen: true }, { mass_mm: 100, bezug: "Breite", menge: 5, blockout: true }]) }),
    motiv(1, 100, 50, { id: "b", position: "Rücken", verfahren: "Flex", folie: "PoliTape Turbo", farbe, stufen: JSON.stringify([{ mass_mm: 280, bezug: "Breite", menge: 12, zeigen: true }]) }),
    motiv(2, 30, 30, { id: "c", position: "Nacken", verfahren: "DTF", stufen: JSON.stringify([{ mass_mm: 90, bezug: "Breite", menge: 15, zeigen: true }]) })
  ] }, { aa, pq, xmp: {}, medien, streifen: tk.cfg.streifen, berechnen: true });
  assert.deepStrictEqual(an.fehler, []);
  const e = KT.rechnen(an, pq, KT.nesting(an, tk.cfg.streifen));
  // Mindestbetrag 5,40 € je Exemplar: 80 mm und 280 mm liegen darunter, 100 mm mit blockout darüber
  const [a80, a100, b280] = e.objekte;
  assert.strictEqual(a80.vk.preis, 5.4); assert.strictEqual(a80.vk.greift, true);
  assert.strictEqual(b280.vk.preis, 5.4); assert.strictEqual(b280.vk.greift, true);
  assert.ok(a100.vk.preis > 5.4); assert.strictEqual(a100.vk.greift, false);
  // blockout: 2 Pressvorgänge je Exemplar (5 × 2 × 1 min), sonst 1
  assert.strictEqual(a100.pressen, 10);
  assert.strictEqual(a80.pressen, 10);
  assert.strictEqual(e.auftrag.pressvorgaenge, 10 + 5 * 2 + 12);
  // Textilzahl = größte Mengensumme einer Position (Brust links 10 + 5), DTF zählt nicht
  assert.strictEqual(e.auftrag.textilzahl, 15);
  assert.strictEqual(e.auftrag.faltenMin, 15 * 0.33);
  // ein Preis in inkl_montage, aufgerundet auf 0,10 €, brutto auf Cent; nur_aufkleber null
  assert.strictEqual(e.vk.inkl_montage.gerundet, 161.7);
  assert.strictEqual(e.vk.inkl_montage.brutto, 192.42);
  assert.ok(e.vk.inkl_montage.netto <= 161.7 && e.vk.inkl_montage.netto > 161.6);
  assert.strictEqual(e.mindest.inkl_montage.gerundet, 152.8);
  const ds = KT.datensatz(e, { analyse: an, xmp: { kunde: "Test", textil: null }, pq, preisliste: { quelle: "csv", version: null, stand: null }, warnungen: [] });
  for (const s of ["vk", "mindest"]) assert.strictEqual(ds.preise[s].nur_aufkleber, null);
  assert.strictEqual(ds.rundung, 0.1);
  assert.strictEqual(ds.objekte.find(o => o.verfahren === "DTF").betraege, null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("Streifenaufteilung an der Grenze 1500 mm", () => {
  const sc = tk.cfg.streifen; // 470 mm Daten, 480 mm Zeichenfläche, 1500 mm Länge, 5 mm Rand, 10 mm Abstand
  const genau = N.nestenStreifen([{ id: "T1", b_mm: 470, h_mm: 740, anzahl: 2 }], sc); // 5 + 740 + 10 + 740 + 5 = 1500
  assert.strictEqual(genau.bogen.length, 1);
  assert.strictEqual(genau.bogen[0].hoehe_mm, 1500);
  assert.strictEqual(genau.bogen[0].breite_mm, 480);
  const drueber = N.nestenStreifen([{ id: "T1", b_mm: 470, h_mm: 740.5, anzahl: 2 }], sc);
  assert.strictEqual(drueber.bogen.length, 2);
  assert.ok(drueber.bogen.every(b => b.hoehe_mm <= 1500));
});
