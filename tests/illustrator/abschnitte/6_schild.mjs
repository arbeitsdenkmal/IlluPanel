// 3.6 Schild (SPEZ_03_Schild): Folie und UV, Material Acryl und Nicht-Acryl, Bohrungen alle vier Anordnungen, Fenster „Schilder“, Schildregeln (Fehler und
// Warnungen), Export je Technik, Lochmarkierungen, Laserdatei an der Grenze 300 × 600, Summa und Druck auf Schild.
import fs from "node:fs";
import path from "node:path";
import { th, schritt, pruefe, uebersprungen, OUT, liste, nah, ev, warte, klick, marke, meldungsText, panelNeu, panelZustand, panelFertig, xmpVon, arbeitskopie, trennen, bis } from "../lib/basis.mjs";
import { anlegen, arbeitsdateiPruefen, exportieren, panelKlick, pdfPruefen, serverOrdner, dateiname, objektOeffnen, objKnopf, objZustand, objOk, fensterAuf, fensterZu, fensterSchliessen } from "../lib/ablauf.mjs";

const KUNDE = "Schildtest", KD = dateiname(KUNDE);
const m = {};
async function quelle(name, zfs, objekte) {
  const p = path.join(OUT, "vorlagen", name);
  await th("neu", zfs[0][0], zfs[0][1], zfs.slice(1));
  await th("ebeneNeu", "Motiv");
  await th("zeichnen", objekte);
  await th("speichernUnter", p);
  return p;
}
async function zuordnenTags(name, ebene, tags) {
  await th("aufEbene", name, ebene);
  for (const [k, v] of Object.entries(tags)) await th("tagSetzen", name, k, v);
}
const W = { spot: "070 (751 C)", cmyk: [0, 0, 0, 100] };

await schritt("Folie, Acryl 3 mm, mit Quelle (vier Schilder)", async () => {
  // S1 300 × 600 (Lasergrenze, eingeschlossen), S2 601 × 300 (über der Grenze), S3 200 × 150, S4 300 × 200
  const q = await quelle("schild_quelle.ai", [[300, 600], [601, 300], [200, 150], [300, 200]], [
    { ebene: "Motiv", art: "rechteck", x: 50, y: 100, b: 200, h: 300, fuellung: { cmyk: [0, 40, 90, 0] }, name: "Motiv 1" },
    { ebene: "Motiv", art: "rechteck", x: 100, y: 50, b: 200, h: 150, fuellung: { cmyk: [70, 0, 30, 0] }, gruppe: "Aufkleber 2", zf: 1 },
    { ebene: "Motiv", art: "rechteck", x: 98, y: 48, b: 204, h: 154, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Aufkleber 2", zf: 1 },
    { ebene: "Motiv", art: "rechteck", x: 400, y: 100, b: 150, h: 40, fuellung: W, name: "Schrift 2", zf: 1 },
    { ebene: "Motiv", art: "rechteck", x: 30, y: 50, b: 140, h: 40, fuellung: W, name: "Schrift 3", zf: 2 },
    { ebene: "Motiv", art: "rechteck", x: 20, y: 20, b: 260, h: 160, fuellung: { cmyk: [10, 10, 80, 0] }, name: "Motiv 4", zf: 3 }]);
  const r = await anlegen({ art: "schild", kunde: KUNDE, quelle: "offen", verfahren: "folie", material: "acryl-3" });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const { d, x } = await arbeitsdateiPruefen("Schild Folie", "schild", KUNDE, { massstab: 1, ebenen: ["Sandbox", "Plott", "Digitaldruck"] });
  pruefe("Zeichenflächen wie in der Quelle (4, nebeneinander 10 mm)", d.zf.length === 4 && [[300, 600], [601, 300], [200, 150], [300, 200]].every((s, i) => nah(d.zf[i].breite, s[0], 0.1) && nah(d.zf[i].hoehe, s[1], 0.1)) && nah(d.zf[1].rect[0] - d.zf[0].rect[2], 10, 0.1), d.zf.map(z => `${z.breite}×${z.hoehe}`).join(", "));
  pruefe("Inhalt je Zeichenfläche auf der Sandbox", (await th("objekte", null, "Sandbox")).objekte.length === 5, String((await th("objekte", null, "Sandbox")).objekte.length));
  pruefe("XMP schild: Verfahren folie, Material Acryl 3 mm festgeschrieben (acryl true, Kürzel PMMA, Stärke 3)", x && x.schild && x.schild.verfahren === "folie" && x.schild.material.acryl === true && x.schild.material.kuerzel === "PMMA" && x.schild.material.staerke === 3, JSON.stringify(x && x.schild));
  m.a = d.pfad; m.xa = x;
  await th("schliessen", q).catch(() => {});
  await th("aktivieren", m.a);
  await panelNeu();
  const z = await panelZustand();
  pruefe("Panel Schild: add/edit · Schilder, ohne berechnen; Summa · Druck · Export · Auftrag; Preiszeile leer", z.zuordnen.sichtbar && z.schilder.sichtbar && !z.berechnen.sichtbar && z.summa.sichtbar && z.druck.sichtbar && z.export.sichtbar && !z.export.gesperrt && !z.preisMaterial.text && !z.preisMontage.text, JSON.stringify({ zu: z.zuordnen.sichtbar, sch: z.schilder.sichtbar, be: z.berechnen.sichtbar, su: z.summa.sichtbar, dr: z.druck.sichtbar }));
});

await schritt("Zuordnen auf Schild (Folie: Digitaldruck, Plott; ohne Tape; über mehrere Zeichenflächen)", async () => {
  if (!m.a) return uebersprungen("Zuordnen", "keine Arbeitsdatei");
  const o = await objektOeffnen(["Aufkleber 2"]);
  if (!pruefe("Fenster geöffnet", o.auf)) return;
  const v = await objZustand();
  pruefe("Arten nur Digitaldruck, Plott", JSON.stringify(v.arten.map(a => a.t)) === JSON.stringify(["Digitaldruck", "Plott"]), JSON.stringify(v.arten.map(a => a.t)));
  pruefe("kein Tape-Button bei Schild, Komplexität (Cutkontur) da", !v.attr.some(a => /Tape/.test(a.t)) && v.komplexSichtbar, JSON.stringify(v.attr.map(a => a.t)));
  const ok = await objOk();
  pruefe("OK ohne Meldung", ok.zu && !ok.text, ok.text);
  const t = (await th("tags", "Aufkleber 2")).tags;
  pruefe("Aufkleber 2: IP_Folie 3551, kein Tape-Zustand, Ebene Digitaldruck", t.IP_Folie === "3551" && !/tape/.test(t.IP_Attribute || "") && (await th("objekte", null, "Digitaldruck")).objekte.some(x => x.name === "Aufkleber 2"), JSON.stringify(t));
  const p = await objektOeffnen(["Schrift 2"]);
  if (p.auf) { await objKnopf("arten", "Plott"); await objOk(); }
  pruefe("Schrift 2: Plott 751C-070", (await th("tags", "Schrift 2")).tags.IP_Folie === "751C-070", JSON.stringify((await th("tags", "Schrift 2")).tags));
  await zuordnenTags("Motiv 1", "Digitaldruck", { IP_Id: "sch-m1", IP_Folie: "3551", IP_Laminat: "matt" });
  await zuordnenTags("Schrift 3", "Plott", { IP_Id: "sch-s3", IP_Folie: "751C-070" });
  await zuordnenTags("Motiv 4", "Digitaldruck", { IP_Id: "sch-m4", IP_Folie: "3551", IP_Laminat: "matt" });
  // Objekt über zwei Zeichenflächen
  await th("zeichnen", [{ ebene: "Sandbox", art: "rechteck", x: 250, y: 10, b: 120, h: 30, fuellung: W, name: "Brücke" }]);
  const b = await objektOeffnen(["Brücke"]);
  if (b.auf) {
    const bz = await objZustand();
    pruefe("Fuß „Objekt ragt über mehrere Zeichenflächen“, OK gesperrt", /Objekt ragt über mehrere Zeichenflächen/.test(bz.hinweis) && !bz.ok, bz.hinweis);
    await fensterSchliessen("objekt");
  }
  await zuordnenTags("Brücke", "Plott", { IP_Id: "sch-br", IP_Folie: "751C-070" });
  await th("speichern");
  const rs = await panelKlick("btnSumma");
  pruefe("Schildregel Fehler: „„Brücke“ ragt über mehrere Zeichenflächen“, nichts erzeugt", /„Brücke“ ragt über mehrere Zeichenflächen/.test(rs.text) && !liste(serverOrdner(m.xa.ablage.kundenordner, m.xa.ablage.auftragsordner)).some(n => /_cut_/.test(n)), rs.text);
  await th("loeschen", "Brücke");
  await th("speichern");
});

await schritt("Fenster „Schilder“ (alle vier Anordnungen, Prüfung)", async () => {
  await panelNeu();
  const auf = await fensterAuf("schilder", () => klick("panel", "#btnSchilder"), `!!window.PAM && document.querySelectorAll("#zeilen .schild").length > 0`, 30000);
  if (!pruefe("Fenster „Schilder“ geöffnet", auf)) return;
  const s = await ev("schilder", `({ kopf: document.getElementById("kopf").textContent, karten: [...document.querySelectorAll("#zeilen .schild")].map(k => ({ t: k.innerText.replace(/\\s+/g, " "), sel: k.querySelector("select").value, felder: k.querySelectorAll("input").length, punkte: k.querySelectorAll(".loch").length })) })`);
  pruefe("Kopf „Folie · Acryl 3 mm“", s.kopf === "Folie · Acryl 3 mm", s.kopf);
  pruefe("vier Karten „Schild 01“ … „Schild 04“ mit Maß, Standard 4 Ecken, 3 Felder, 4 Punkte", s.karten.length === 4 && s.karten.every((k, i) => k.t.includes(`Schild 0${i + 1}`) && k.sel === "ecken" && k.felder === 3 && k.punkte === 4) && /300 × 600 mm/.test(s.karten[0].t), JSON.stringify(s.karten));
  const setze = async (i, anordnung, werte) => ev("schilder", `(()=>{ const k=document.querySelectorAll("#zeilen .schild")[${i}], s=k.querySelector("select"); s.value=${JSON.stringify(anordnung)}; s.dispatchEvent(new Event("change"));
    const w=${JSON.stringify(werte)}; [...k.querySelectorAll("input")].forEach((f,j)=>{ if (w[j] !== undefined) { f.value=w[j]; f.dispatchEvent(new Event("input")); } }); return { felder: k.querySelectorAll("input").length, punkte: k.querySelectorAll(".loch").length }; })()`);
  const s2 = await setze(1, "mitte_oben_unten", ["15", "4"]);
  pruefe("2 mittig oben/unten: Felder Abstand senkrecht, Durchmesser; 2 Punkte", s2.felder === 2 && s2.punkte === 2, JSON.stringify(s2));
  const s3 = await setze(2, "mitte_links_rechts", ["1", "5"]);
  pruefe("2 mittig links/rechts: 2 Felder", s3.felder === 2, JSON.stringify(s3));
  const s4 = await setze(3, "keine", []);
  pruefe("keine: keine Felder, keine Punkte", s4.felder === 0 && s4.punkte === 0, JSON.stringify(s4));
  const mk = marke();
  await klick("schilder", "#ok"); await warte(1500);
  pruefe("Abstand 1 mm bei Ø 5: Popup „Schild 03: Bohrungen passen nicht auf das Schild“, Fenster bleibt offen", /Schild 03: Bohrungen passen nicht auf das Schild/.test(meldungsText(mk)) && await ev("schilder", "true").catch(() => false), meldungsText(mk));
  await setze(2, "mitte_links_rechts", ["10", "3"]);
  await klick("schilder", "#ok");
  pruefe("OK schließt", await fensterZu("schilder", 30000));
  const x = await xmpVon();
  const sc = x.schild.schilder || [];
  pruefe("XMP schilder[]: nr, Endmaß, Bohrungen je Schild", sc.length === 4 && sc[0].bohrungen.anordnung === "ecken" && sc[1].bohrungen.anordnung === "mitte_oben_unten" && sc[1].bohrungen.abstand_y_mm === 15 && sc[1].bohrungen.durchmesser_mm === 4 && sc[2].bohrungen.anordnung === "mitte_links_rechts" && sc[2].bohrungen.abstand_x_mm === 10 && sc[3].bohrungen.anordnung === "keine" && sc.every((e, i) => e.nr === i + 1) && sc[0].breite_mm === 300 && sc[0].hoehe_mm === 600, JSON.stringify(sc.map(e => [e.nr, e.breite_mm, e.hoehe_mm, e.bohrungen])));
});

await schritt("Summa und Druck auf Schild", async () => {
  const so = serverOrdner(m.xa.ablage.kundenordner, m.xa.ablage.auftragsordner);
  const rs = await panelKlick("btnSumma");
  pruefe("Summa: Plott-Objekte aller Schilder → <Kunde>_751C-070_cut_01.pdf", liste(so).includes(`${KD}_751C-070_cut_01.pdf`), `${liste(so).join(", ")} · ${rs.text}`);
  const rd = await panelKlick("btnDruck");
  const boegen = [];
  for (const d of (await th("dokumente")).dokumente.filter(d => !d.pfad)) { const x = await xmpVon(d.name); if (x && x.rolle === "druckbogen") boegen.push(x); }
  pruefe("Druck: nur Digitaldruck mit Cutkontur → ein Bogen", boegen.length === 1, `${boegen.length} Bögen · ${rd.text}`);
  if (boegen.length) {
    await th("aktivieren", (await th("dokumente")).dokumente.find(d => !d.pfad).name);
    const o = (await th("objekte", null, "Druck")).objekte;
    pruefe("Bogen enthält nur „Aufkleber 2“", o.length === 1 && /^Aufkleber 2/.test(o[0].name), JSON.stringify(o.map(x => x.name)));
    await th("aktivieren", m.a);
  }
});

await schritt("Export Schild Folie (Druck-PDF mit Lochmarkierungen, Laserdatei an der Grenze)", async () => {
  await th("aktivieren", m.a);
  const r = await exportieren();
  const so = serverOrdner(m.xa.ablage.kundenordner, m.xa.ablage.auftragsordner), d = liste(so);
  pruefe("Export ohne Fehlermeldung", !/Fehler|ragt|fehlt/.test(r.text), r.text);
  const erw = [`${KD}_druck_01_PMMA-3.pdf`, `${KD}_druck_04_PMMA-3.pdf`, `${KD}_laser_01_PMMA-3.pdf`, `${KD}_laser_03_PMMA-3.pdf`, `${KD}_laser_04_PMMA-3.pdf`];
  pruefe("Dateien <Kunde>_<technik>_NN_<Kürzel>-<Stärke>.pdf: druck 01, 04; laser 01 (300 × 600), 03, 04", erw.every(n => d.includes(n)), `fehlt: ${erw.filter(n => !d.includes(n)).join(", ")}`);
  pruefe("keine Laserdatei für Schild 02 (601 × 300), keine Druck-PDF für Schild 02/03", !d.includes(`${KD}_laser_02_PMMA-3.pdf`) && !d.includes(`${KD}_druck_02_PMMA-3.pdf`) && !d.includes(`${KD}_druck_03_PMMA-3.pdf`), d.filter(n => /PMMA/.test(n)).join(", "));
  pruefe("Druckbögen des Aufbaus im selben Klick exportiert", d.some(n => /_3551-matt-\d+_01_druck\.pdf$/.test(n)), d.filter(n => /3551/.test(n)).join(", "));
  const i = await pdfPruefen("druck_01", path.join(so, `${KD}_druck_01_PMMA-3.pdf`), 1, [300, 600]);
  if (i && i.boxen) pruefe("druck_01: Anschnitt aus dem Dokument (5 mm)", i.boxen[0].bleed && nah(i.boxen[0].bleed[0], 310, 0.5) && nah(i.boxen[0].bleed[1], 610, 0.5), JSON.stringify(i.boxen));
  if (d.includes(`${KD}_druck_01_PMMA-3.pdf`)) {
    await th("oeffnen", path.join(so, `${KD}_druck_01_PMMA-3.pdf`));
    const p = (await th("pfadFarben", null, null)).pfade;
    const loch = p.filter(x => x.fuellung === "cmyk:100/0/0/0" && !x.kontur && nah(x.vb[2] - x.vb[0], 2, 0.1));
    pruefe("Lochmarkierungen: 4 Kreise Ø 2 mm, 100 % C, ohne Kontur", loch.length === 4, `${loch.length} · ${JSON.stringify(p.slice(0, 8))}`);
    await th("schliessen", null);
  }
  if (d.includes(`${KD}_laser_01_PMMA-3.pdf`)) {
    await pdfPruefen("laser_01", path.join(so, `${KD}_laser_01_PMMA-3.pdf`), 1, [300, 600]);
    await th("oeffnen", path.join(so, `${KD}_laser_01_PMMA-3.pdf`));
    const p = (await th("pfadFarben", null, null)).pfade.filter(x => x.kontur || x.fuellung);
    const umriss = p.filter(x => x.kontur === "cmyk:0/100/0/0" && nah(x.vb[2] - x.vb[0], 300, 0.5));
    const loecher = p.filter(x => x.kontur === "cmyk:100/0/0/0" && nah(x.vb[2] - x.vb[0], 5, 0.3));
    pruefe("Laserdatei: Umriss 100 % M, 4 Löcher Ø 5 als Kontur 100 % C, 0,25 pt, keine Füllungen", umriss.length === 1 && loecher.length === 4 && p.every(x => !x.fuellung) && p.every(x => nah(x.staerke, 0.25, 0.02)), JSON.stringify(p.slice(0, 8)));
    await th("schliessen", null);
  }
  const x = await xmpVon(m.a);
  pruefe("XMP exporte[] und schilder[] aktualisiert", x.exporte.length > 0 && x.schild.schilder.length === 4, JSON.stringify(x.exporte.map(e => e.dateien.length)));
  const mt = await th("dok", m.a);
  pruefe("Arbeitsdatei unverändert (keine temporäre Ebene übrig)", !mt.ebenen.some(e => !["Sandbox", "Plott", "Digitaldruck"].includes(e.name)), JSON.stringify(mt.ebenen.map(e => e.name)));
  await th("schliessen", m.a).catch(() => {});
});

await schritt("UV-Druck, Forex 5 mm (Nicht-Acryl): Zuordnen UV, Schildregeln, Export", async () => {
  const q = await quelle("schild_uv_quelle.ai", [[500, 700], [300, 200]], [
    { ebene: "Motiv", art: "rechteck", x: 50, y: 50, b: 300, h: 400, fuellung: { cmyk: [0, 80, 80, 0] }, name: "UV vorn" },
    { ebene: "Motiv", art: "rechteck", x: 20, y: 20, b: 200, h: 100, fuellung: { cmyk: [80, 80, 0, 0] }, name: "UV hinten", zf: 1 },
    { ebene: "Motiv", art: "rechteck", x: 230, y: 20, b: 50, h: 30, fuellung: W, name: "Plott UV", zf: 1 }]);
  const r = await anlegen({ art: "schild", kunde: KUNDE, quelle: "offen", verfahren: "uv", material: "forex-5" });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const { d, x } = await arbeitsdateiPruefen("Schild UV", "schild", KUNDE, { ebenen: ["Sandbox", "Plott", "UV-Vorn", "UV-Hinten"] });
  pruefe("XMP schild: uv, Forex 5 mm (acryl false)", x && x.schild.verfahren === "uv" && x.schild.material.acryl === false && x.schild.material.kuerzel === "PVC", JSON.stringify(x && x.schild));
  m.u = d.pfad; m.xu = x;
  await th("schliessen", q).catch(() => {});
  await th("aktivieren", m.u);
  const o = await objektOeffnen(["UV vorn"]);
  if (o.auf) {
    const v = await objZustand();
    pruefe("Arten bei UV: Plott, UV-Vorn, UV-Hinten", JSON.stringify(v.arten.map(a => a.t)) === JSON.stringify(["Plott", "UV-Vorn", "UV-Hinten"]), JSON.stringify(v.arten.map(a => a.t)));
    await objKnopf("arten", "UV-Vorn");
    const u = await objZustand();
    pruefe("UV-Vorn: ohne Anzahl, Komplexität, Aufschläge", !u.anzahlSichtbar && !u.komplexSichtbar && u.attr.length === 0 || (!u.anzahlSichtbar && !u.komplexSichtbar), JSON.stringify({ a: u.anzahlSichtbar, k: u.komplexSichtbar, at: u.attr }));
    await objOk();
  }
  const t = (await th("tags", "UV vorn")).tags;
  pruefe("UV vorn: IP_Id, Ebene UV-Vorn, keine Folie", !!t.IP_Id && !t.IP_Folie && (await th("objekte", null, "UV-Vorn")).objekte.some(z => z.name === "UV vorn"), JSON.stringify(t));
  await panelNeu();
  await th("auswaehlen", ["UV vorn"]); await panelNeu();
  const z = await panelZustand();
  pruefe("Objektzeile zeigt bei UV den Ebenennamen statt Folie, ohne ×n", /UV-Vorn/.test(z.objFolie.text) && !z.objAnzahl.sichtbar, JSON.stringify({ f: z.objFolie.text, a: z.objAnzahl }));
  await zuordnenTags("UV hinten", "UV-Hinten", { IP_Id: "uv-h" });
  await zuordnenTags("Plott UV", "Plott", { IP_Id: "uv-p", IP_Folie: "751C-070" });
  await th("speichern");
  const r1 = await exportieren();
  pruefe("Fehler „Schild 02: UV und Plott zusammen“, Abbruch", /Schild 02: UV und Plott zusammen/.test(r1.text) && !liste(serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner)).some(n => /uv-/.test(n)), r1.text);
  await th("loeschen", "Plott UV"); await th("speichern");
  const r2 = await exportieren();
  pruefe("Warnungen gesammelt: „Schild 02: UV-Hinten auf Forex 5 mm“ und „Schild 01: UV-Vorn bzw. UV-Hinten größer als A2 (500 × 700 mm)“", /Schild 02: UV-Hinten auf Forex 5 mm/.test(r2.text) && /Schild 01: UV-(Vorn|Hinten)( bzw\. UV-Hinten)? größer als A2 \(500 × 700 mm\)/.test(r2.text), r2.text);
  const so = serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner), dl = liste(so);
  pruefe("Dateien uv-vorn_01, uv-hinten_02 (PVC-5), keine Laserdatei (Nicht-Acryl)", dl.includes(`${KD}_uv-vorn_01_PVC-5.pdf`) && dl.includes(`${KD}_uv-hinten_02_PVC-5.pdf`) && !dl.some(n => /laser/.test(n)), dl.join(", "));
  const i = await pdfPruefen("uv-vorn_01", path.join(so, `${KD}_uv-vorn_01_PVC-5.pdf`), 1, [500, 700]);
  if (i && i.boxen) pruefe("UV: Anschnitt aus dem Dokument (2 mm)", i.boxen[0].bleed && nah(i.boxen[0].bleed[0], 504, 0.5), JSON.stringify(i.boxen));
  // Nummerierung ohne Überschreiben
  await exportieren();
  pruefe("zweiter Export: _02 statt Überschreiben", liste(so).includes(`${KD}_uv-vorn_01_PVC-5_02.pdf`), liste(so).filter(n => /uv-vorn/.test(n)).join(", "));
});
trennen();
process.exit(0);
