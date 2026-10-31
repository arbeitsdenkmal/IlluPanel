// 3.2 Druckbogen-Export (einzeln lauffähig, Nachlauf Auftrag 4.1): eigene Arbeitsdatei mit zwei Digitaldruck-Objekten mit Cutkontur (SPEZ_02 §11.2),
// zugeordnet über Tags (FESTLEGUNGEN Gesamtlauf 11), berechnen und Druck als Vorbereitung; geprüft werden die Dateien je Bogen, das Schließen der
// gespeicherten Bögen, exporte[] in der Arbeitsdatei, OPOS-Marken ab 1000 mm und die Wiederholung (gleiche Namen ersetzt).
// Rollenwahl (PRODUKTIONSREGELN, 10-%-Regel): Poster (2 × 406 × 306 mm mit Cutkontur) auf 1000, Großformat (1356 + 2 × 3 mm, Anzahl 2) nur auf 1520.
import fs from "node:fs";
import path from "node:path";
import { th, schritt, pruefe, uebersprungen, liste, xmpVon, arbeitskopie, trennen } from "../lib/basis.mjs";
import { anlegen, exportieren, panelKlick, pdfPruefen, serverOrdner, dateiname, boegenOffen, fensterSchliessen } from "../lib/ablauf.mjs";

const KUNDE = "Exporttest", KD = dateiname(KUNDE);
const m = {};

await schritt("Vorbereitung: Arbeitsdatei, Objekte, berechnen, Druck", async () => {
  const r = await anlegen({ art: "beschriftung", kunde: KUNDE, quelle: "leer" });
  if (!pruefe("Arbeitsdatei Beschriftung angelegt", r.ok && !r.text, r.text || r.grund)) return;
  const d = await th("dok");
  m.pfad = d.pfad; m.x = JSON.parse(d.xmp);
  await th("zeichnen", [
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 0, b: 400, h: 300, fuellung: { cmyk: [60, 0, 20, 0] }, gruppe: "Poster" },
    { ebene: "Sandbox", art: "rechteck", x: -3, y: -3, b: 406, h: 306, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Poster" },
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 400, b: 1350, h: 1350, fuellung: { cmyk: [0, 30, 90, 0] }, gruppe: "Großformat" },
    { ebene: "Sandbox", art: "rechteck", x: -3, y: 397, b: 1356, h: 1356, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Großformat" }
  ]);
  const zuordnen = { Poster: ["exp-poster", "glaenzend", "2"], "Großformat": ["exp-gross", "matt", "2"] };
  for (const [name, [id, lam, anz]] of Object.entries(zuordnen)) {
    await th("tagSetzen", name, "IP_Id", id);
    await th("tagSetzen", name, "IP_Folie", "3551");
    await th("tagSetzen", name, "IP_Laminat", lam);
    await th("tagSetzen", name, "IP_Anzahl", anz);
    await th("aufEbene", name, "Print");
  }
  await th("speichern");
  await panelKlick("btnBerechnen");
  await fensterSchliessen("zusammenfassung").catch(() => {});
  const x = await xmpVon(m.pfad);
  if (!pruefe("berechnet (Kalkulationsdatensatz im XMP)", x && !!x.kalkulation, x && x.kalkulation ? "" : "kein Datensatz")) return;
  await th("aktivieren", m.pfad);
  const rd = await panelKlick("btnDruck");
  const b = await boegenOffen();
  m.boegen = b;
  pruefe("Druck: drei Bögen 3551 glänzend 1000 (1/1), matt 1520 (1/2, 2/2)", b.length === 3
    && b.some(z => z.x.bogen.laminat === "glaenzend" && z.x.bogen.breite_mm === 1000 && z.x.bogen.gesamt === 1)
    && b.filter(z => z.x.bogen.laminat === "matt" && z.x.bogen.breite_mm === 1520 && z.x.bogen.gesamt === 2).length === 2,
    JSON.stringify(b.map(z => [z.x.bogen.laminat, z.x.bogen.breite_mm, z.x.bogen.nr, z.x.bogen.gesamt])) + " " + rd.text);
});

await schritt("Export der Druckbögen", async () => {
  if (!m.boegen || m.boegen.length !== 3) return uebersprungen("Export Druckbögen", "Vorbereitung ohne drei Bögen");
  const r = await exportieren();
  const so = serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), d = liste(so);
  const erwartet = ["3551-glaenzend-1000_01", "3551-matt-1520_01", "3551-matt-1520_02"].flatMap(b => [`${KD}_${b}_druck.pdf`, `${KD}_${b}_cut.pdf`, `${KD}_${b}.ai`]);
  pruefe("je Bogen _druck.pdf, _cut.pdf, .ai mit <Kunde>_<Medium>-<Laminat>-<Breite>_<NN>", erwartet.every(n => d.includes(n)), `fehlt: ${erwartet.filter(n => !d.includes(n)).join(", ") || "nichts"} · Meldung: ${r.text}`);
  const offenNoch = (await boegenOffen()).length;
  pruefe("gespeicherte Bögen geschlossen", offenNoch === 0, `${offenNoch} Bögen offen`);
  const x = await xmpVon(m.pfad);
  pruefe("Arbeitsdatei: Eintrag in exporte[] mit allen Bogendateien (9)", x && (x.exporte || []).some(e => e.dateien.length >= 9), JSON.stringify(x && (x.exporte || []).map(e => e.dateien.length)));
  const ai = path.join(so, `${KD}_3551-matt-1520_01.ai`);
  if (!fs.existsSync(ai)) return uebersprungen("OPOS-Marken 1520", "Bogendatei fehlt");
  const pdf = await pdfPruefen("Druck-PDF 1520", path.join(so, `${KD}_3551-matt-1520_01_druck.pdf`), 1, null);
  if (pdf && pdf.boxen) pruefe("Bogenbreite nach Marken ≤ Rolle − 2 × 15 (1490), Länge ≥ 1000", pdf.boxen[0].media[0] <= 1490.5 && pdf.boxen[0].media[1] >= 1000, JSON.stringify(pdf.boxen[0]));
  await th("oeffnen", arbeitskopie(ai, "export_bogen_1520.ai"));
  const reg = (await th("objekte", null, "Regmark")).objekte.map(o => o.name);
  const druck = (await th("objekte", null, "Druck")).objekte;
  const dok = await th("dok");
  pruefe("Regmark oberste Ebene, gesperrt", dok.ebenen[0].name === "Regmark" && dok.ebenen[0].gesperrt, JSON.stringify(dok.ebenen.map(e => e.name)));
  pruefe("OPOS XY Line und XY2 Line, Marken", reg.includes("OPOS XY Line") && reg.includes("OPOS XY2 Line") && reg.filter(n => n === "Mark").length >= 8, JSON.stringify(reg));
  pruefe("Druckrichtungsdreieck auf Druck mit IP_Druckrichtung", druck.some(o => o.tags.IP_Druckrichtung === "1"), JSON.stringify(druck.map(o => [o.name, o.tags])));
  await th("schliessen", null);
  m.so = so;
});

await schritt("Wiederholung: Druck und Export ersetzen die Produktionsdateien", async () => {
  if (!m.so) return uebersprungen("Wiederholung", "erster Export ohne Dateien");
  const datei = path.join(m.so, `${KD}_3551-glaenzend-1000_01_druck.pdf`);
  const t0 = fs.existsSync(datei) ? fs.statSync(datei).mtimeMs : 0;
  await th("aktivieren", m.pfad);
  await panelKlick("btnDruck");
  await exportieren();
  const d2 = liste(m.so);
  pruefe("Produktionsdateien ersetzt, keine _02-Kopien", fs.existsSync(datei) && fs.statSync(datei).mtimeMs > t0 && !d2.some(n => /_druck_02\.pdf$|_cut_02\.pdf$/.test(n)), d2.filter(n => /3551/.test(n)).join(", "));
});
trennen();
process.exit(0);
