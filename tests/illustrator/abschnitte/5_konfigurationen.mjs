// 3.5 Konfigurationen (SPEZ_03_Konfigurationen): jedes Offset-Produkt aus produkte.csv in jeder vorhandenen Ausrichtung (alle Vorlagen einmal, Zeichenfläche
// ± 0,1 mm), 1/2 mit 1 und 2 Zeichenflächen, freies Format, Export wmd mit Dokument-Anschnitt und Kopie im Sammelordner; Banner; beide Roll-ups mit 200 mm
// Anschnitt unten; Sonstiges mit und ohne Quelle; Lasergravur.
import fs from "node:fs";
import path from "node:path";
import { th, schritt, pruefe, uebersprungen, OUT, ROOT, ZIEL, KONFIG, liste, nah, trennen } from "../lib/basis.mjs";
import { anlegen, arbeitsdateiPruefen, exportieren, pdfPruefen, serverOrdner, dateiname, dlg, hilfslinienBlock } from "../lib/ablauf.mjs";

const KUNDE = "Konfigtest", KD = dateiname(KUNDE);
const CSV = fs.readFileSync(path.join(ROOT, "config", "produkte.csv"), "utf8").trim().split(/\r?\n/).map(z => z.split(";"));
const KOPF = CSV[0], PRODUKTE = CSV.slice(1).map(z => Object.fromEntries(KOPF.map((k, i) => [k, z[i] || ""])));
const BR = KONFIG("auftragsarten/banner_rollup.json"), HL = KONFIG("auftragsarten/offset.json").hilfslinien.ebenen;
const schliessen = async () => { try { await th("schliessen", null); } catch (e) { /* zu */ } };
const m = {};

async function quelle(name, zfs, objekte) {
  const p = path.join(OUT, "vorlagen", name);
  await th("neu", zfs[0][0], zfs[0][1], zfs.slice(1));
  await th("ebeneNeu", "Motiv");
  await th("zeichnen", objekte);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await th("speichernUnter", p);
  return p;
}

// ---------- alle Offset-Vorlagen ----------
let vorlagen = 0;
for (const p of PRODUKTE) {
  for (const ausr of ["hoch", "quer"]) {
    const datei = p[`vorlage_${ausr}`];
    if (!datei) continue;
    vorlagen++;
    await schritt(`Offset ${p.bezeichnung} ${ausr}`, async () => {
      const beide = !!(p.vorlage_hoch && p.vorlage_quer);
      const seiten = p.zeichenflaechen === "1" ? 1 : 2;
      const r = await anlegen({ art: "offset", kunde: KUNDE, quelle: "leer", produkt: p.bezeichnung, ausrichtung: beide ? ausr : undefined, anzahl: p.zeichenflaechen === "1/2" ? 2 : undefined,
        vorLos: async () => { m.wahl = await dlg(`!document.getElementById("zAusrichtung").hidden`); } });
      pruefe("Wahl hoch/quer nur bei beiden Vorlagen", m.wahl === beide, `sichtbar ${m.wahl}, beide ${beide}`);
      if (!pruefe("angelegt ohne Meldung", r.ok && !r.text, r.text || r.grund)) return;
      const d = await th("dok"), x = d.xmp ? JSON.parse(d.xmp) : null;
      // Sollmaß: breite/hoehe = hoch-Vorlage; quer gedreht; ohne hoch-Vorlage gilt das Maß für quer
      const b = Number(p.breite_mm), h = Number(p.hoehe_mm);
      const soll = ausr === "quer" && p.vorlage_hoch ? [h, b] : [b, h];
      pruefe(`Zeichenfläche 1 = ${soll.join(" × ")} ± 0,1 mm, ${seiten} Zeichenfläche(n)`, d.zf.length === seiten && nah(d.zf[0].breite, soll[0], 0.1) && nah(d.zf[0].hoehe, soll[1], 0.1), d.zf.map(z => `${z.breite}×${z.hoehe}`).join(", "));
      const hl = hilfslinienBlock(d.ebenen, HL);
      pruefe("Hilfslinien-Ebenen (hilfslinien.ebenen), sofern vorhanden, oberste, gesperrt, nicht druckend", hl.ok, hl.text);
      pruefe("XMP offset { produkt, bezeichnung, ausrichtung, seiten }", x && x.offset && x.offset.produkt === p.schluessel && x.offset.bezeichnung === p.bezeichnung && x.offset.ausrichtung === ausr && x.offset.seiten === seiten, JSON.stringify(x && x.offset));
      pruefe("Auftragsordner JJJJ-MM-TT_Offset-Daten", x && /^\d{4}-\d\d-\d\d_Offset-Daten(_\d\d)?$/.test(x.ablage.auftragsordner), x && x.ablage.auftragsordner);
      if (p.schluessel === "a4" && ausr === "hoch") m.a4 = d.pfad;
      await schliessen();
    });
  }
}
await schritt("Anzahl Vorlagen", async () => { pruefe("alle 21 Vorlagen einmal angelegt", vorlagen === 21, `${vorlagen} Vorlagen in produkte.csv`); });

await schritt("Offset 1/2 mit einer Zeichenfläche", async () => {
  const r = await anlegen({ art: "offset", kunde: KUNDE, quelle: "leer", produkt: "A5", ausrichtung: "quer", anzahl: 1 });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok"), x = JSON.parse(d.xmp || "null");
  pruefe("A5 quer, 1 Zeichenfläche 210 × 148, XMP seiten 1", d.zf.length === 1 && nah(d.zf[0].breite, 210, 0.1) && nah(d.zf[0].hoehe, 148, 0.1) && x && x.offset.seiten === 1, JSON.stringify(d.zf) + JSON.stringify(x && x.offset));
  await schliessen();
});

await schritt("Offset freies Format (2 Zeichenflächen)", async () => {
  const r = await anlegen({ art: "offset", kunde: KUNDE, quelle: "leer", produkt: "frei", breite: 150, hoehe: 100, anzahl: 2 });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok"), x = JSON.parse(d.xmp || "null");
  pruefe("zwei Zeichenflächen 150 × 100 nebeneinander mit 10 mm", d.zf.length === 2 && d.zf.every(z => nah(z.breite, 150, 0.1) && nah(z.hoehe, 100, 0.1)) && nah(d.zf[1].rect[0] - d.zf[0].rect[2], 10, 0.1), JSON.stringify(d.zf.map(z => z.rect)));
  pruefe("XMP freies Format: produkt, bezeichnung, ausrichtung null, seiten 2", x && x.offset && x.offset.produkt === null && x.offset.bezeichnung === null && x.offset.ausrichtung === null && x.offset.seiten === 2, JSON.stringify(x && x.offset));
  m.frei = d.pfad;
  await schliessen();
});

await schritt("Offset mit Quelle (3 Zeichenflächen auf 2)", async () => {
  const q = await quelle("offset_quelle.ai", [[148, 105], [148, 105], [148, 105]], [
    { ebene: "Motiv", art: "rechteck", x: 10, y: 10, b: 50, h: 30, fuellung: { cmyk: [0, 100, 0, 0] }, name: "Vorderseite" },
    { ebene: "Motiv", art: "rechteck", x: 10, y: 10, b: 50, h: 30, fuellung: { cmyk: [100, 0, 0, 0] }, name: "Rückseite", zf: 1 },
    { ebene: "Motiv", art: "rechteck", x: 10, y: 10, b: 50, h: 30, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Dritte", zf: 2 }]);
  await th("ebeneNeu", "Hilfslinien");
  await th("zeichnen", [{ ebene: "Hilfslinien", art: "linie", x: 0, y: 50, b: 148, kontur: { cmyk: [0, 0, 0, 50] } }]);
  await th("speichern");
  const quellEbenen = (await th("dok", q)).ebenen.map(e => e.name); // §3.3 Nr. 4 entfernt nur leere Ebenen der Vorlage, Ebenen der Quelle bleiben
  const r = await anlegen({ art: "offset", kunde: KUNDE, quelle: "offen", produkt: "A6", ausrichtung: "quer", anzahl: 2 });
  pruefe("Hinweis „1 Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage“", /1 Zeichenfläche\(n\) der Quelle liegen außerhalb der Vorlage/.test(r.text), r.text);
  const d = await th("dok"), o = (await th("objekte", null, null)).objekte;
  const hl = hilfslinienBlock(d.ebenen, HL);
  pruefe("Ebene „Motiv“ übernommen, Hilfslinien-Ebenen nur aus der Vorlage (oberste), leere Vorlagenebenen entfernt", hl.ok && d.ebenen.some(e => e.name === "Motiv") && d.ebenen.every(e => HL.includes(e.name) || e.objekte > 0 || quellEbenen.includes(e.name)), hl.text);
  const vs = o.find(x => x.name === "Vorderseite"), rs = o.find(x => x.name === "Rückseite"), dr = o.find(x => x.name === "Dritte");
  const innen = (it, z) => it && it.vb[0] >= z.rect[0] - 0.1 && it.vb[2] <= z.rect[2] + 0.1;
  pruefe("Inhalt Quell-Zeichenfläche n auf Vorlagen-Zeichenfläche n, dritte daneben", innen(vs, d.zf[0]) && innen(rs, d.zf[1]) && dr && dr.vb[0] > d.zf[1].rect[2], JSON.stringify({ vs: vs && vs.vb, rs: rs && rs.vb, dr: dr && dr.vb, zf: d.zf.map(z => z.rect) }));
  await schliessen();
  await th("schliessen", q).catch(() => {});
});

await schritt("Export Offset (wmd, Dokument-Anschnitt, Sammelordner)", async () => {
  for (const [pfad, name, mass] of [[m.a4, `${KD}_A4_druck.pdf`, [210, 297]], [m.frei, `${KD}_druck.pdf`, [150, 100]]]) {
    if (!pfad) { uebersprungen(`Export ${name}`, "Arbeitsdatei fehlt"); continue; }
    await th("oeffnen", pfad);
    const x = JSON.parse((await th("dok")).xmp);
    const r = await exportieren();
    pruefe(`${name}: Export ohne Meldung`, !r.text, r.text);
    const so = serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner);
    const i = await pdfPruefen(name, path.join(so, name), 2, mass);
    if (i && i.boxen) pruefe(`${name}: Anschnitt aus dem Dokument (BleedBox größer als TrimBox)`, i.boxen.every(bx => bx.bleed && bx.trim && bx.bleed[0] > bx.trim[0] + 1 && bx.bleed[1] > bx.trim[1] + 1), JSON.stringify(i.boxen));
    pruefe(`${name}: Kopie in wmd_bestellen`, liste(ZIEL.wmd).includes(name), liste(ZIEL.wmd).join(", "));
    pruefe(`${name}: Arbeitsdatei-Kopie im Auftragsordner`, liste(so).some(n => /^Arbeitsdatei(_\d\d)?\.ai$/.test(n)), liste(so).join(", "));
    await schliessen();
  }
});

await schritt("Banner mit Quelle", async () => {
  const q = await quelle("banner_quelle.ai", [[400, 200]], [{ ebene: "Motiv", art: "rechteck", x: 0, y: 0, b: 400, h: 200, fuellung: { cmyk: [0, 20, 100, 0] }, name: "Bannermotiv" }]);
  const r = await anlegen({ art: "banner_rollup", kunde: KUNDE, quelle: "offen", variante: "banner", breite: 2000, hoehe: 1000, anzahl: 1,
    vorLos: async () => { m.bvor = await dlg(`[document.getElementById("breite").value, document.getElementById("hoehe").value].join("|")`); } });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok");
  pruefe("Banner: Zeichenfläche nach Abfrage 2000 × 1000, Ebenen der Quelle unverändert", d.zf.length === 1 && nah(d.zf[0].breite, 2000) && nah(d.zf[0].hoehe, 1000) && d.ebenen.some(e => e.name === "Motiv"), JSON.stringify({ zf: d.zf, e: d.ebenen.map(e => e.name) }));
  await schliessen();
  await th("schliessen", q).catch(() => {});
});

for (const ru of BR.rollup) {
  await schritt(`Roll-up ${ru.name}`, async () => {
    const mitQuelle = ru === BR.rollup[0];
    let q = null;
    if (mitQuelle) q = await quelle("rollup_quelle.ai", [[300, 300]], [{ ebene: "Motiv", art: "rechteck", x: 50, y: 50, b: 200, h: 100, fuellung: { cmyk: [80, 0, 0, 0] }, name: "Rollupmotiv" }]);
    const r = await anlegen({ art: "banner_rollup", kunde: KUNDE, quelle: mitQuelle ? "offen" : "leer", variante: ru.id,
      vorLos: async () => { m.rmass = await dlg(`!document.getElementById("zBH").hidden`); } });
    pruefe("Roll-up ohne Maßabfrage", m.rmass === false, String(m.rmass));
    pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
    const d = await th("dok"), x = JSON.parse(d.xmp || "null");
    pruefe(`Zeichenfläche ${ru.breite_mm} × ${ru.hoehe_mm} aus der Vorlage`, d.zf.length === 1 && nah(d.zf[0].breite, ru.breite_mm, 0.1) && nah(d.zf[0].hoehe, ru.hoehe_mm, 0.1), JSON.stringify(d.zf));
    pruefe("XMP banner_rollup.variante", x && x.banner_rollup && x.banner_rollup.variante === ru.id, JSON.stringify(x && x.banner_rollup));
    if (mitQuelle) {
      const o = (await th("objekte", null, null)).objekte.find(z => z.name === "Rollupmotiv"), z = d.zf[0].rect;
      const mx = o ? (o.vb[0] + o.vb[2]) / 2 : null, zx = (z[0] + z[2]) / 2;
      // Block = gesamter Inhalt der Quelle (eine Zeichenfläche, Motiv mittig darauf) → Motiv waagrecht mittig
      pruefe("Quelle als Block 1:1 mittig, Breite 200 mm", o && nah(o.vb[2] - o.vb[0], 200, 0.2) && nah(mx, zx, 0.5), JSON.stringify({ o: o && o.vb, z }));
    }
    const r2 = await exportieren();
    pruefe("Export ohne Meldung", !r2.text, r2.text);
    const pdf = path.join(serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner), `${KD}_druck.pdf`);
    const i = await pdfPruefen(ru.name, pdf, 1, [ru.breite_mm, ru.hoehe_mm]);
    if (i && i.boxen) pruefe("Anschnitt aus dem Dokument: unten 200 mm (BleedBox Höhe + 200, Breite gleich)", i.boxen[0].bleed && nah(i.boxen[0].bleed[0], ru.breite_mm, 0.5) && nah(i.boxen[0].bleed[1], ru.hoehe_mm + 200, 0.5), JSON.stringify(i.boxen));
    await schliessen();
    if (q) await th("schliessen", q).catch(() => {});
  });
}

await schritt("Sonstiges ohne und mit Quelle", async () => {
  let vor = null;
  const r = await anlegen({ art: "sonstiges", kunde: KUNDE, quelle: "leer", vorLos: async () => { vor = await dlg(`[document.getElementById("breite").value, document.getElementById("hoehe").value, document.getElementById("anzahl").value].join("|")`); } });
  pruefe("ohne Quelle vorbelegt 210 × 297, 1", vor === "210|297|1", vor);
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  await schliessen();
  const q = await quelle("sonstiges_quelle.ai", [[300, 200], [200, 100]], [{ ebene: "Motiv", art: "rechteck", x: 10, y: 10, b: 100, h: 50, fuellung: { cmyk: [0, 0, 0, 60] }, name: "Sonstmotiv" }]);
  let vor2 = null;
  const r2 = await anlegen({ art: "sonstiges", kunde: KUNDE, quelle: "offen", vorLos: async () => { vor2 = await dlg(`[document.getElementById("breite").value, document.getElementById("hoehe").value, document.getElementById("anzahl").value].join("|")`); } });
  pruefe("mit Quelle vorbelegt aus Zeichenfläche 1 (300 × 200) und Anzahl 2", vor2 === "300|200|2", vor2);
  pruefe("angelegt", r2.ok && !r2.text, r2.text || r2.grund);
  const d = await th("dok");
  pruefe("zwei Zeichenflächen 300 × 200 nebeneinander (10 mm), Ebenen der Quelle", d.zf.length === 2 && d.zf.every(z => nah(z.breite, 300) && nah(z.hoehe, 200)) && nah(d.zf[1].rect[0] - d.zf[0].rect[2], 10, 0.1) && d.ebenen.some(e => e.name === "Motiv"), JSON.stringify(d.zf.map(z => z.rect)));
  await schliessen();
  await th("schliessen", q).catch(() => {});
});

await schritt("Lasergravur mit Quelle (Inhalt 1:1, nicht verschoben)", async () => {
  const q = await quelle("laser_quelle.ai", [[600, 300]], [{ ebene: "Motiv", art: "rechteck", x: 100, y: 50, b: 120, h: 40, kontur: { cmyk: [0, 0, 0, 100] }, name: "Gravur" }]);
  const vorher = (await th("objekte", null, null)).objekte.find(o => o.name === "Gravur"), vz = (await th("dok")).zf[0].rect;
  const r = await anlegen({ art: "lasergravur", kunde: KUNDE, quelle: "offen" });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok"), o = (await th("objekte", null, null)).objekte.find(z => z.name === "Gravur");
  pruefe("Zeichenfläche fest 600 × 300", d.zf.length === 1 && nah(d.zf[0].breite, 600) && nah(d.zf[0].hoehe, 300), JSON.stringify(d.zf));
  pruefe("Inhalt 1:1 an derselben Stelle", o && vorher && nah(o.vb[0] - d.zf[0].rect[0], vorher.vb[0] - vz[0], 0.2) && nah(o.vb[1] - d.zf[0].rect[1], vorher.vb[1] - vz[1], 0.2) && nah(o.vb[2] - o.vb[0], 120.25, 0.6), JSON.stringify({ vorher: vorher && vorher.vb, nach: o && o.vb, zf: d.zf[0].rect }));
  const x = JSON.parse(d.xmp);
  const r2 = await exportieren();
  pruefe("Export ohne Meldung, kein Sammelordner", !r2.text && !liste(ZIEL.wmd).some(n => n.includes("laser")) && !liste(ZIEL.dtf).some(n => n.includes("laser")), r2.text);
  await pdfPruefen("Lasergravur", path.join(serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner), `${KD}_laser.pdf`), 1, [600, 300]);
  await schliessen();
  await th("schliessen", q).catch(() => {});
});
trennen();
process.exit(0);
