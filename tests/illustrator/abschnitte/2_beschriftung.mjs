// 3.2 Beschriftung und Fahrzeugbeschriftung (SPEZ_02 2a–2c): Zuordnen Plott und Digitaldruck (Einzel- und Mehrfachauswahl, Anzahl, Komplexität, Sicke,
// Wölbung, Tape drei Zustände, Farbzuordnung Nicht-Oracal), Varianten, berechnen, Zusammenfassung und PDF, Summa mit mehrfarbigem Stück, Druck mit
// Rollenwahl, Export mit OPOS-Marken (Bogen ≥ 1000 mm: XY2 und Dreieck), Wiederholung ersetzt Produktionsdateien; Fahrzeugbeschriftung mit CC-Vision-Vorlage.
import fs from "node:fs";
import path from "node:path";
import { aktion, th, schritt, pruefe, uebersprungen, OUT, ZIEL, muster, arbeitskopie, liste, nah, ev, warte, offen, panelZustand, panelNeu, klick, marke, meldungsText, xmpVon, DATEI, RECHNERORDNER, trennen, bis } from "../lib/basis.mjs";
import { anlegen, arbeitsdateiPruefen, exportieren, panelKlick, pdfPruefen, serverOrdner, dateiname, objektOeffnen, objKnopf, objZustand, objFarbNr, objOk, fensterAuf, fensterZu, fensterSchliessen, boegenOffen } from "../lib/ablauf.mjs";

const KUNDE = "Beschriftungstest", KD = dateiname(KUNDE);
const tagsVon = async n => (await th("tags", n)).tags;
const objekt = async n => (await th("objekte", null, null)).objekte.find(o => o.name === n);
const m = {};

await schritt("Arbeitsdatei Beschriftung und Testobjekte", async () => {
  const r = await anlegen({ art: "beschriftung", kunde: KUNDE, quelle: "leer" });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const { x } = await arbeitsdateiPruefen("Beschriftung", "beschriftung", KUNDE, { massstab: 1 });
  m.pfad = (await th("dok")).pfad; m.x = x;
  const W = { spot: "070 (751 C)", cmyk: [0, 0, 0, 100] }, R = { spot: "031 (751 C)", cmyk: [0, 100, 100, 0] }, G = { spot: "010 (751 C)", cmyk: [0, 0, 0, 0] };
  await th("zeichnen", [
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 0, b: 150, h: 40, fuellung: W, gruppe: "Schriftzug" },
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 50, b: 150, h: 40, fuellung: W, gruppe: "Schriftzug" },
    // mehrfarbig: zwei Farbschlüssel mit Lücke (Passermarken)
    { ebene: "Sandbox", art: "rechteck", x: 200, y: 0, b: 120, h: 200, fuellung: W, gruppe: "Logo zweifarbig" },
    { ebene: "Sandbox", art: "rechteck", x: 400, y: 0, b: 120, h: 200, fuellung: R, gruppe: "Logo zweifarbig" },
    // Nicht-Oracal-Farbe (CMYK ohne Farbfeld)
    { ebene: "Sandbox", art: "rechteck", x: 600, y: 0, b: 100, h: 60, fuellung: { cmyk: [10, 80, 0, 0] }, name: "Fremdfarbe" },
    // Digitaldruck mit Cutkontur
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 300, b: 400, h: 300, fuellung: { cmyk: [60, 0, 20, 0] }, gruppe: "Poster" },
    { ebene: "Sandbox", art: "rechteck", x: -3, y: 297, b: 406, h: 306, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Poster" },
    // Digitaldruck mit Cutkontur (SPEZ_02 §11.2: Druckbogen-Export verlangt Cutkontur je Objekt), passt quer nur auf 1520 (1356 + 2 × 3 mm)
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 700, b: 1350, h: 1350, fuellung: { cmyk: [0, 30, 90, 0] }, gruppe: "Großformat" },
    { ebene: "Sandbox", art: "rechteck", x: -3, y: 697, b: 1356, h: 1356, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Großformat" },
    // Plott mit Prozessfarben (SPEZ_02 §6): globale Prozessfarbe, nicht globale Prozessfarbe, CMYK ohne Farbfeld
    { ebene: "Sandbox", art: "rechteck", x: 1500, y: 0, b: 60, h: 60, fuellung: { prozess: "Test global", global: true, cmyk: [10, 80, 0, 0] }, gruppe: "Prozessfarben" },
    { ebene: "Sandbox", art: "rechteck", x: 1570, y: 0, b: 60, h: 60, fuellung: { prozess: "Test nicht global", cmyk: [60, 0, 20, 0] }, gruppe: "Prozessfarben" },
    { ebene: "Sandbox", art: "rechteck", x: 1640, y: 0, b: 60, h: 60, fuellung: { cmyk: [0, 30, 90, 10] }, gruppe: "Prozessfarben" },
    // bleibt ohne Zuordnung auf der Sandbox
    { ebene: "Sandbox", art: "rechteck", x: 800, y: 300, b: 50, h: 50, fuellung: G, name: "Rest" }
  ]);
  await th("speichern");
  pruefe("Testobjekte gezeichnet (7 oberste Objekte)", (await th("objekte", null, "Sandbox")).objekte.length === 7);
});

await schritt("Zuordnen Plott einzeln (Anzahl, Komplexität, Sicke)", async () => {
  const { z, auf } = await objektOeffnen(["Schriftzug"]);
  pruefe("Panel: Objektzeile mit Name, add orange", z.objName.text === "Schriftzug" && z.zuordnen.text === "add" && z.zuordnen.akzent, JSON.stringify({ n: z.objName.text, b: z.zuordnen }));
  if (!pruefe("Fenster „Objekt“ geöffnet", auf)) return;
  const v = await objZustand();
  pruefe("Vorauswahl Sandbox → Digitaldruck", v.arten.find(a => a.t === "Digitaldruck").an, JSON.stringify(v.arten));
  await objKnopf("arten", "Plott");
  await warte(300);
  const p = await objZustand();
  pruefe("Plott: Farbe 070 erkannt (✓ 751C-070)", p.plott && p.farben.some(f => f.includes("751C-070") && f.includes("✓")), JSON.stringify(p.farben));
  pruefe("Serie 751C vorgewählt (serien.json standard), Kachelraster da", p.serien.some(s => s.t === "751C" && s.an) && p.kacheln > 0, JSON.stringify(p.serien) + ` ${p.kacheln} Kacheln`);
  await ev("objekt", `(()=>{ const a=document.getElementById("anzahl"); a.value="3"; a.dispatchEvent(new Event("input")); return true; })()`);
  await objKnopf("komplex", "K2");
  await objKnopf("attr", "Sicke");
  const r = await objOk();
  pruefe("OK schließt ohne Meldung", r.zu && !r.text, r.text);
  const t = await tagsVon("Schriftzug"), o = await objekt("Schriftzug");
  pruefe("Tags IP_Folie 751C-070, IP_Anzahl 3, IP_Komplexitaet 2, IP_Attribute sicke, IP_Id", t.IP_Folie === "751C-070" && t.IP_Anzahl === "3" && t.IP_Komplexitaet === "2" && t.IP_Attribute === "sicke" && !!t.IP_Id, JSON.stringify(t));
  pruefe("Objekt positionsgleich auf der Plott-Ebene „Cut“", o && o.ebene === "Cut", o && o.ebene);
  await panelNeu();
  const z2 = await panelZustand();
  pruefe("Panel: edit, Folie 751C-070 ×3", z2.zuordnen.text === "edit" && /751C-070/.test(z2.objFolie.text) && z2.objAnzahl.text === "×3", JSON.stringify({ f: z2.objFolie.text, a: z2.objAnzahl.text, b: z2.zuordnen.text }));
});

await schritt("Zuordnen Plott Mehrfachauswahl mit Nicht-Oracal-Farbe, Wölbung", async () => {
  const { auf } = await objektOeffnen(["Logo zweifarbig", "Fremdfarbe"]);
  if (!pruefe("Fenster geöffnet", auf)) return;
  await objKnopf("arten", "Plott");
  await warte(300);
  const p = await objZustand();
  pruefe("drei Farben im Objekt, eine offen (→ zuordnen), OK gesperrt", p.farben.length === 3 && p.farben.filter(f => f.includes("zuordnen")).length === 1 && !p.ok, JSON.stringify(p.farben) + " " + p.hinweis);
  // markierte Zeile = offene Farbe? sonst anklicken
  await ev("objekt", `(()=>{ const z=[...document.querySelectorAll("#farben .farbe")].find(x=>x.innerText.includes("zuordnen")); if(z) z.click(); return !!z; })()`);
  await objFarbNr("031");
  await warte(300);
  const p2 = await objZustand();
  pruefe("Farb-Nr. 031 + Enter ordnet zu, OK frei", p2.farben.every(f => f.includes("✓")) && p2.ok, JSON.stringify(p2.farben) + " " + p2.hinweis);
  await objKnopf("attr", "Wölbung");
  const r = await objOk();
  pruefe("OK ohne Meldung", r.zu && !r.text, r.text);
  const t1 = await tagsVon("Logo zweifarbig"), t2 = await tagsVon("Fremdfarbe");
  pruefe("beide mit Wölbung, Fremdfarbe IP_Folie 751C-031", /woelbung/.test(t1.IP_Attribute || "") && /woelbung/.test(t2.IP_Attribute || "") && t2.IP_Folie === "751C-031", JSON.stringify({ t1, t2 }));
  const f = (await th("pfadFarben", null, "Cut")).pfade;
  pruefe("Fremdfarbe umgefärbt auf Farbfeld 031 (751 C)", f.some(x => /031 \(751 C\)/.test(x.fuellung || "")), JSON.stringify(f.map(x => x.fuellung)));
  const x = await xmpVon();
  pruefe("XMP farbzuordnung colorKey → 751C-031, vorauswahl.serie 751C", Object.values(x.farbzuordnung || {}).includes("751C-031") && x.vorauswahl && x.vorauswahl.serie === "751C", JSON.stringify({ fz: x.farbzuordnung, v: x.vorauswahl }));
});

await schritt("Zuordnen Digitaldruck mit Cutkontur, Tape drei Zustände", async () => {
  const { auf } = await objektOeffnen(["Poster"]);
  if (!pruefe("Fenster geöffnet", auf)) return;
  const v = await objZustand();
  pruefe("Digitaldruck: Medium-Liste und Laminat, Komplexität sichtbar (Cutkontur)", v.druck && v.medium.length >= 6 && v.laminat.length === 2 && v.komplexSichtbar, JSON.stringify({ m: v.medium.map(x => x.t), l: v.laminat.map(x => x.t), k: v.komplexSichtbar }));
  pruefe("Vorauswahl ohne Eintrag: 3551 matt", v.medium.some(x => x.t === "3551" && x.an) && v.laminat.some(x => x.t === "matt" && x.an), JSON.stringify({ m: v.medium.filter(x => x.an), l: v.laminat.filter(x => x.an) }));
  await objKnopf("laminat", "glänzend");
  await objKnopf("komplex", "K1");
  const t0 = (await objZustand()).attr.find(a => /Tape/.test(a.t));
  pruefe("Tape-Button „Tape auto“ mit Tooltip „erst nach „berechnen““", t0 && t0.t === "Tape auto" && /berechnen/.test(t0.titel), JSON.stringify(t0));
  await objKnopf("attr", "Tape auto");
  const t1 = (await objZustand()).attr.find(a => /Tape/.test(a.t));
  pruefe("Klick: „Tape“ (gedrückt)", t1 && t1.t === "Tape" && t1.an, JSON.stringify(t1));
  const r = await objOk();
  pruefe("OK ohne Meldung", r.zu && !r.text, r.text);
  const t = await tagsVon("Poster"), o = await objekt("Poster");
  pruefe("Tags IP_Folie 3551, IP_Laminat glaenzend, IP_Komplexitaet 1, IP_Attribute tape; Ebene Print", t.IP_Folie === "3551" && t.IP_Laminat === "glaenzend" && t.IP_Komplexitaet === "1" && t.IP_Attribute === "tape" && o.ebene === "Print", JSON.stringify(t) + " " + o.ebene);
  // Großformat: Anzahl 2, mit Cutkontur Komplexität sichtbar; Tape → „kein Tape“
  const g = await objektOeffnen(["Großformat"]);
  if (!pruefe("Fenster Großformat geöffnet", g.auf)) return;
  const gv = await objZustand();
  pruefe("mit Cutkontur Komplexität sichtbar; Vorauswahl aus XMP: glänzend", gv.komplexSichtbar && gv.laminat.some(x => x.t === "glänzend" && x.an), JSON.stringify({ k: gv.komplexSichtbar, l: gv.laminat }));
  await objKnopf("laminat", "matt");
  await ev("objekt", `(()=>{ const a=document.getElementById("anzahl"); a.value="2"; a.dispatchEvent(new Event("input")); return true; })()`);
  await objKnopf("attr", "Tape auto"); await objKnopf("attr", "Tape");
  const tk = (await objZustand()).attr.find(a => /Tape/.test(a.t));
  pruefe("zweiter Klick: „kein Tape“", tk && tk.t === "kein Tape", JSON.stringify(tk));
  await objOk();
  const tg = await tagsVon("Großformat");
  pruefe("Großformat: IP_Anzahl 2, matt, kein_tape", tg.IP_Anzahl === "2" && tg.IP_Laminat === "matt" && tg.IP_Attribute === "kein_tape", JSON.stringify(tg));
  // dritter Zustand: wieder „Tape auto“ (kein Wert)
  const g2 = await objektOeffnen(["Großformat"]);
  if (g2.auf) {
    await objKnopf("attr", "kein Tape");
    const ta = (await objZustand()).attr.find(a => /Tape/.test(a.t));
    pruefe("dritter Klick: „Tape auto“", ta && ta.t === "Tape auto", JSON.stringify(ta));
    await objOk();
    const tg2 = await tagsVon("Großformat");
    pruefe("Tape auto: weder tape noch kein_tape in IP_Attribute", !/tape/.test(tg2.IP_Attribute || ""), JSON.stringify(tg2));
  }
  await th("speichern");
});

await schritt("Zuordnen Plott Prozessfarben", async () => {
  const { auf } = await objektOeffnen(["Prozessfarben"]);
  if (!pruefe("Fenster „Objekt“ geöffnet", auf)) return;
  const v = await objZustand();
  const plott = v.arten.find(a => a.t === "Plott");
  pruefe("Plott nicht gesperrt (keine Konturen, Bilder, Verläufe)", plott && !plott.aus, JSON.stringify(v.arten));
  await objKnopf("arten", "Plott");
  await warte(300);
  const p = await objZustand();
  pruefe("Farben im Objekt: drei Zeilen (globale, nicht globale Prozessfarbe, CMYK ohne Farbfeld), alle „→ zuordnen“, OK gesperrt",
    p.farben.length === 3 && p.farben.every(f => f.includes("zuordnen")) && !p.ok && p.farben.some(f => f.includes("Test global")), JSON.stringify(p.farben) + " " + p.hinweis);
  // erste Zeile per Kachel, zweite per Farb-Nr. + Enter, dritte per Kachel
  await ev("objekt", `(()=>{ const s=document.querySelector("#raster span"); if(s) s.click(); return !!s; })()`);
  await objFarbNr("031");
  await ev("objekt", `(()=>{ const s=document.querySelectorAll("#raster span")[1]; if(s) s.click(); return !!s; })()`);
  await warte(300);
  const p2 = await objZustand();
  pruefe("alle drei Zeilen zugeordnet (Kachel bzw. Farb-Nr.), OK frei", p2.farben.length === 3 && p2.farben.every(f => f.includes("✓")) && p2.ok, JSON.stringify(p2.farben) + " " + p2.hinweis);
  const r = await objOk();
  pruefe("OK ohne Meldung", r.zu && !r.text, r.text);
  const t = await tagsVon("Prozessfarben"), o = await objekt("Prozessfarben");
  pruefe("Tags: IP_Folie Plott-Schlüssel, IP_Id; Ebene „Cut“", /^751C-\d+$/.test(t.IP_Folie || "") && !!t.IP_Id && o && o.ebene === "Cut", JSON.stringify(t) + " " + (o && o.ebene));
  const f = (await th("pfadFarben", null, "Cut", "Prozessfarben")).pfade;
  pruefe("bei OK umgefärbt: alle drei Füllungen Oracal-Farbfelder (751 C)", f.length === 3 && f.every(x => /\(751 C\)/.test(x.fuellung || "")), JSON.stringify(f.map(x => x.fuellung)));
});

await schritt("Varianten und berechnen", async () => {
  await th("duplizieren", "Poster", "Poster Kopie", 500);
  const r = await panelKlick("btnBerechnen");
  const zf = await fensterAuf("zusammenfassung", null, "!!window.PAM && document.querySelectorAll('#objekte tr').length > 0", 30000);
  pruefe("berechnen: Zusammenfassung öffnet", zf);
  pruefe("Hinweise als ein Popup: Sandbox-Objekt genannt", /Sandbox/.test(r.text), r.text);
  const tk = await tagsVon("Poster Kopie"), to = await tagsVon("Poster");
  // das in Ebenenreihenfolge erste behält die Id (das Duplikat liegt darüber), das andere bekommt neue IP_Id und IP_Original
  pruefe("Variante: eine neue IP_Id, IP_Original = bisherige Id", tk.IP_Id && to.IP_Id && tk.IP_Id !== to.IP_Id && (tk.IP_Original === to.IP_Id || to.IP_Original === tk.IP_Id), JSON.stringify({ tk, to }));
  const x = await xmpVon(), k = x.kalkulation;
  if (!pruefe("Kalkulationsdatensatz im XMP", !!k, "kein Datensatz")) return;
  pruefe("Datensatz: Schema 1, preislogik 6, auftragsart, massstab 1, Kunde", k.schema === 1 && k.preislogik === 6 && k.auftragsart === "beschriftung" && k.massstab === 1 && k.kunde === KUNDE, JSON.stringify({ s: k.schema, p: k.preislogik, a: k.auftragsart }));
  pruefe("Datensatz: 6 Objekte mit Variante (Rest ohne Zuordnung nicht)", k.objekte.length === 6, k.objekte.map(o => o.name).join(", "));
  const sz = k.objekte.find(o => o.name === "Schriftzug"), gf = k.objekte.find(o => o.name === "Großformat"), po = k.objekte.find(o => o.name === "Poster");
  pruefe("Anzahl im Datensatz (Schriftzug 3, Großformat 2), Komplexität und Attribute", sz && sz.anzahl === 3 && sz.komplexitaet === 2 && sz.attribute.includes("sicke") && gf && gf.anzahl === 2, JSON.stringify({ sz, gf: gf && gf.anzahl }));
  pruefe("Tape manuell an beim Poster", po && po.tape === true, JSON.stringify(po && po.tape));
  const lg = k.objekte.find(o => o.name === "Logo zweifarbig");
  pruefe("mehrfarbiges Stück mit zwei Folien", lg && lg.folien.length === 2, JSON.stringify(lg && lg.folien));
  pruefe("Folien: 751C-070, 751C-031, 3551 (zwei Laminate)", ["751C-070", "751C-031"].every(s => k.folien.some(f => f.schluessel === s)) && k.folien.filter(f => f.schluessel === "3551" || f.serie === "3551").length >= 2, k.folien.map(f => `${f.schluessel}/${f.laminat}/${f.rollenbreite_mm}`).join(", "));
  const gr = k.folien.find(f => f.laminat === "matt" && (f.schluessel === "3551" || f.serie === "3551"));
  pruefe("Rollenwahl: Großformat (1350 × 1350) auf 1520", gr && gr.rollenbreite_mm === 1520, JSON.stringify(gr));
  pruefe("Preise vk/mindest mit nur_aufkleber und inkl_montage, mindestbetrag_greift je Preisart", k.preise && k.preise.vk.nur_aufkleber.gerundet > 0 && k.preise.mindest.inkl_montage.brutto > 0 && k.preise.mindestbetrag_greift.vk && k.preise.mindestbetrag_greift.mindest, JSON.stringify(k.preise));
  await panelNeu();
  const z = await panelZustand();
  const zahl = v => Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  pruefe("Panel-Preiszeile: Material <netto> <brutto>, inkl. Mont. <netto> <brutto>", z.preisMaterial.text.startsWith("Material") && z.preisMaterial.text.includes(zahl(k.preise.vk.nur_aufkleber.brutto)) && z.preisMontage.text.startsWith("inkl. Mont.") && z.preisMontage.text.includes(zahl(k.preise.vk.inkl_montage.brutto)), `${z.preisMaterial.text} | ${z.preisMontage.text}`);
  m.kalk = k;
});

await schritt("Zusammenfassung und PDF", async () => {
  if (!(await offen("zusammenfassung"))) return uebersprungen("Zusammenfassung", "Fenster nicht offen");
  const t = await ev("zusammenfassung", `({ zeilen: [...document.querySelectorAll("#objekte tr")].map(r=>r.innerText.replace(/\\s+/g," ").trim()), kalk: document.getElementById("kalk").innerText })`);
  pruefe("Objekttabelle: Variante eingerückt mit „· Variante“", t.zeilen.some(z => /Variante/.test(z)), t.zeilen.join(" | "));
  pruefe("„Ohne Zuordnung (1) – wird nicht berechnet“", t.zeilen.some(z => /Ohne Zuordnung \(1\)/.test(z)), t.zeilen.join(" | "));
  pruefe("Summen: nur Aufkleber, inkl. Montage, Mindest-VK, Grafik", /nur Aufkleber/.test(t.kalk) && /inkl\. Montage/.test(t.kalk) && /Mindest-VK/.test(t.kalk) && /Grafik/.test(t.kalk), t.kalk.slice(0, 600));
  for (const nr of ["", "_02"]) {
    const mk = marke();
    aktion(`PDF${nr}`);
    await klick("zusammenfassung", "#btnPdf");
    await bis(async () => fs.existsSync(path.join(serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), `${KD}_Zusammenfassung${nr}.pdf`)), 90000, 1000);
    await warte(1500);
    const pdf = path.join(serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), `${KD}_Zusammenfassung${nr}.pdf`);
    const i = await pdfPruefen(`Zusammenfassung${nr}`, pdf, null, null);
    if (i && i.text !== undefined) pruefe(`Zusammenfassung${nr}: Kopf mit Kunde, ohne Preise`, i.text.includes(KUNDE) && !/inkl\. Montage|Mindest-VK/.test(i.text), i.text.slice(0, 300));
    pruefe(`Zusammenfassung${nr}: keine Fehlermeldung`, !meldungsText(mk), meldungsText(mk));
  }
  await fensterSchliessen("zusammenfassung");
});

await schritt("Summa (mehrfarbiges Stück mit Passermarken)", async () => {
  await th("aktivieren", m.pfad);
  const r = await panelKlick("btnSumma");
  const so = serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner);
  const dateien = liste(so);
  pruefe("Summa: Schneidedaten je Farbschlüssel <Kunde>_<Serie>-<Farbe>_cut_NN.pdf", ["751C-070", "751C-031"].every(s => dateien.includes(`${KD}_${s}_cut_01.pdf`)), dateien.join(", "));
  pruefe("Summa: Meldungen nur Hinweise", !/Abbruch|Fehler|passt in keiner/.test(r.text), r.text);
  const x = await xmpVon();
  pruefe("Summa: Eintrag in exporte[]", x.exporte.some(e => e.dateien.some(f => /_cut_01\.pdf$/.test(f.name))), JSON.stringify(x.exporte.map(e => e.dateien.map(f => f.name))));
  // Passermarken: das 031-Teil des zweifarbigen Logos plus zwei Marken = 3 gefüllte Pfade im Schneidedokument 751C-031 (Fremdfarbe kommt dazu)
  const pdf031 = path.join(so, `${KD}_751C-031_cut_01.pdf`);
  if (fs.existsSync(pdf031)) {
    await pdfPruefen("Schneidedaten 751C-031", pdf031, 1, null);
    await th("oeffnen", pdf031);
    const p = (await th("pfadFarben", null, null)).pfade.filter(x => x.fuellung);
    // Logo-Teil 120 × 200, Fremdfarbe 100 × 60, zwei quadratische Marken (Kante aus 30/20/15/10/5)
    const quadrate = p.filter(x => { const b = x.vb[2] - x.vb[0], h = x.vb[1] - x.vb[3]; return Math.abs(b - h) < 0.2 && [30, 20, 15, 10, 5].some(s => nah(b, s, 0.3)); });
    pruefe("Passermarken: zwei Quadrate in der Schneidedatei der zweiten Farbe", quadrate.length === 2, `${p.length} gefüllte Pfade, Quadrate ${JSON.stringify(quadrate.map(q => q.vb))}`);
    await th("schliessen", null);
  }
  m.summa = { so, t: fs.existsSync(path.join(so, `${KD}_751C-070_cut_01.pdf`)) ? fs.statSync(path.join(so, `${KD}_751C-070_cut_01.pdf`)).mtimeMs : 0 };
  // Wiederholung ersetzt
  await th("aktivieren", m.pfad);
  await panelKlick("btnSumma");
  const d2 = liste(so);
  const neu = fs.existsSync(path.join(so, `${KD}_751C-070_cut_01.pdf`)) ? fs.statSync(path.join(so, `${KD}_751C-070_cut_01.pdf`)).mtimeMs : 0;
  pruefe("Summa wiederholt: gleiche Namen ersetzt, keine _02", neu > m.summa.t && !d2.some(n => /_cut_01_02\.pdf$/.test(n)), d2.filter(n => /_cut_/.test(n)).join(", "));
});

await schritt("Druck (Rollenwahl, Bögen, Symbole, Info)", async () => {
  await th("aktivieren", m.pfad);
  const r = await panelKlick("btnDruck");
  pruefe("Druck: keine Abbruchmeldung", !/Abbruch|passt auf keine/.test(r.text), r.text);
  const doks = (await th("dokumente")).dokumente;
  const boegen = await boegenOffen();
  // Rollenwahl (PRODUKTIONSREGELN): zwei Poster 406 × 306 mm passen auf 1000 mm und sparen gegenüber der Standardbreite 1370 mehr als 10 %
  pruefe("drei Druckbögen: 3551 glänzend 1000 (1/1), 3551 matt 1520 (1/2, 2/2)", boegen.length === 3
    && boegen.some(b => b.x.bogen.laminat === "glaenzend" && b.x.bogen.breite_mm === 1000 && b.x.bogen.nr === 1 && b.x.bogen.gesamt === 1)
    && boegen.filter(b => b.x.bogen.laminat === "matt" && b.x.bogen.breite_mm === 1520 && b.x.bogen.gesamt === 2).length === 2,
    JSON.stringify(boegen.map(b => b.x.bogen)));
  pruefe("Bogen-XMP: arbeitsdatei = Pfad, massstab 1, ablage aus der Arbeitsdatei", boegen.every(b => b.x.bogen.arbeitsdatei === m.pfad && b.x.massstab === 1 && b.x.ablage.auftragsordner === m.x.ablage.auftragsordner), JSON.stringify(boegen.map(b => [b.x.bogen.arbeitsdatei, b.x.massstab])));
  const xa = await xmpVon(m.pfad);
  pruefe("Arbeitsdatei: aufbau mit drei Bögen", xa && xa.aufbau && xa.aufbau.boegen.length === 3 && boegen.every(b => b.x.bogen.aufbau === xa.aufbau.id), JSON.stringify(xa && xa.aufbau));
  const vorn = boegen.find(b => b.vorn);
  pruefe("erster Bogen vorn", !!vorn, doks.map(d => `${d.name}${d.vorn ? "*" : ""}`).join(", "));
  if (vorn) {
    const d = await th("dok", vorn.name);
    pruefe("Bogen-Ebenen Druck, Cut, Info", ["Druck", "Cut", "Info"].every(n => d.ebenen.some(e => e.name === n)) && (d.ebenen.find(e => e.name === "Info") || {}).druckend === false, JSON.stringify(d.ebenen));
    await th("aktivieren", vorn.name);
    const o = (await th("objekte", null, "Druck")).objekte;
    pruefe("Symbolinstanzen „<Name> <k>“ mit IP_Herkunft", o.length > 0 && o.every(i => i.typ === "SymbolItem" && /\s\d+$/.test(i.name) && i.tags.IP_Herkunft), JSON.stringify(o.map(i => [i.name, i.typ, i.tags.IP_Herkunft])));
    const info = (await th("texte", "Info")).texte.join("\n");
    pruefe("Info-Ebene: === DRUCKBOGEN ===, Kunde, Medium, Bogen n von m", /=== DRUCKBOGEN ===/.test(info) && info.includes(KUNDE) && /3551/.test(info) && /1 von 1|1\/1/.test(info), info.slice(0, 400));
    await panelNeu();
    const z = await panelZustand();
    pruefe("Panel Druckbogen vorn: „Kunde · Druckbogen 3551 glänzend 1000 · 1/1“, keine Grafikzeile, nur Export und Auftrag", /Druckbogen 3551 glänzend 1000 · 1\/1/.test(z.kopf) && !z.grafikZeile && z.export.sichtbar && !z.export.gesperrt && !z.zuordnen.sichtbar && !z.summa.sichtbar, JSON.stringify({ k: z.kopf, g: z.grafikZeile }));
  }
  pruefe("keine Zuordnungsdatei grafikzeit_druckboegen.json (SPEZ_02 Fassung 8 §12)", !fs.existsSync(path.join(RECHNERORDNER, "grafikzeit_druckboegen.json")));
  m.boegen = boegen;
});

await schritt("Export der Druckbögen (OPOS, XY2 und Dreieck ab 1000 mm)", async () => {
  if (!m.boegen || !m.boegen.length) return uebersprungen("Export Druckbögen", "keine Bögen");
  const r = await exportieren();
  const so = serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), d = liste(so);
  const erwartet = ["3551-glaenzend-1000_01", "3551-matt-1520_01", "3551-matt-1520_02"].flatMap(b => [`${KD}_${b}_druck.pdf`, `${KD}_${b}_cut.pdf`, `${KD}_${b}.ai`]);
  pruefe("je Bogen _druck.pdf, _cut.pdf, .ai mit <Kunde>_<Medium>-<Laminat>-<Breite>_<NN>", erwartet.every(n => d.includes(n)), `fehlt: ${erwartet.filter(n => !d.includes(n)).join(", ")} · Meldung: ${r.text}`);
  const offenNoch = (await th("dokumente")).dokumente.filter(x => !x.pfad).length;
  pruefe("gespeicherte Bögen geschlossen", offenNoch === 0, `${offenNoch} ungespeicherte Dokumente offen`);
  const ai = path.join(so, `${KD}_3551-matt-1520_01.ai`);
  if (fs.existsSync(ai)) {
    const pdf = await pdfPruefen("Druck-PDF 1520", path.join(so, `${KD}_3551-matt-1520_01_druck.pdf`), 1, null);
    if (pdf && pdf.boxen) pruefe("Bogenbreite nach Marken ≤ Rolle − 2 × 15 (1490), Länge ≥ 1000", pdf.boxen[0].media[0] <= 1490.5 && pdf.boxen[0].media[1] >= 1000, JSON.stringify(pdf.boxen[0]));
    const kopie = arbeitskopie(ai, "bogen_1520.ai");
    await th("oeffnen", kopie);
    const reg = (await th("objekte", null, "Regmark")).objekte.map(o => o.name);
    const druck = (await th("objekte", null, "Druck")).objekte;
    const dok = await th("dok");
    pruefe("Regmark oberste Ebene, gesperrt", dok.ebenen[0].name === "Regmark" && dok.ebenen[0].gesperrt, JSON.stringify(dok.ebenen.map(e => e.name)));
    pruefe("OPOS XY Line und XY2 Line, Marken", reg.includes("OPOS XY Line") && reg.includes("OPOS XY2 Line") && reg.filter(n => n === "Mark").length >= 8, JSON.stringify(reg));
    pruefe("Druckrichtungsdreieck auf Druck mit IP_Druckrichtung", druck.some(o => o.tags.IP_Druckrichtung === "1"), JSON.stringify(druck.map(o => [o.name, o.tags])));
    await th("schliessen", null);
  }
  const x = await xmpVon(m.pfad);
  pruefe("Arbeitsdatei: Eintrag in exporte[] mit allen Bogendateien", x.exporte.some(e => e.dateien.length >= 9), JSON.stringify(x.exporte.map(e => e.dateien.length)));
  // Wiederholung: Druck und Export erneut → gleiche Namen ersetzt
  const t0 = fs.statSync(path.join(so, `${KD}_3551-glaenzend-1000_01_druck.pdf`)).mtimeMs;
  await th("aktivieren", m.pfad);
  await panelKlick("btnDruck");
  await exportieren();
  const d2 = liste(so);
  pruefe("Wiederholung: Produktionsdateien ersetzt, keine _02-Kopien", fs.statSync(path.join(so, `${KD}_3551-glaenzend-1000_01_druck.pdf`)).mtimeMs > t0 && !d2.some(n => /_druck_02\.pdf$|_cut_02\.pdf$/.test(n)), d2.filter(n => /3551/.test(n)).join(", "));
});

await schritt("Fahrzeugbeschriftung mit CC-Vision-Vorlage", async () => {
  const q = arbeitskopie(muster("Fahrzeugmuster", "Kraus.pdf"), "Kraus.pdf");
  await th("oeffnen", q);
  const vor = await th("dok");
  const vorObj = (await th("objekte", null, null)).objekte;
  const r = await anlegen({ art: "fahrzeugbeschriftung", kunde: "Fahrzeugtest", quelle: "offen", fahrzeugvorlage: true });
  pruefe("Fahrzeugvorlage: angelegt", r.ok && !r.text, r.text || r.grund);
  const { d, x } = await arbeitsdateiPruefen("Fahrzeug", "fahrzeugbeschriftung", "Fahrzeugtest", { massstab: 30, ebenen: ["Sandbox", "Fahrzeugkontur", "Plott", "Digitaldruck"] });
  pruefe("Zeichenfläche aus der Vorlage", d.zf.length === vor.zf.length && nah(d.zf[0].breite, vor.zf[0].breite, 0.5) && nah(d.zf[0].hoehe, vor.zf[0].hoehe, 0.5), `${JSON.stringify(vor.zf)} → ${JSON.stringify(d.zf)}`);
  const fk = d.ebenen.find(e => e.name === "Fahrzeugkontur");
  pruefe("Inhalt der Vorlage in „Fahrzeugkontur“ (gesperrt), nicht skaliert", fk && fk.gesperrt && (fk.objekte + fk.unterebenen) > 0, JSON.stringify(fk));
  const nachObj = (await th("objekte", null, "Fahrzeugkontur")).objekte;
  const umriss = l => l.reduce((a, o) => [Math.min(a[0], o.vb[0]), Math.max(a[1], o.vb[1]), Math.max(a[2], o.vb[2]), Math.min(a[3], o.vb[3])], [1e9, -1e9, -1e9, 1e9]);
  if (vorObj.length && nachObj.length) { const a = umriss(vorObj), b = umriss(nachObj); pruefe("Umriss unverändert (Breite ± 0,5 mm)", nah(a[2] - a[0], b[2] - b[0], 0.5), `${(a[2] - a[0]).toFixed(1)} → ${(b[2] - b[0]).toFixed(1)}`); }
  // Plott-Objekt zuordnen und berechnen: Realmaß 1:30
  await th("zeichnen", [{ ebene: "Sandbox", art: "rechteck", x: 10, y: 10, b: 20, h: 5, fuellung: { spot: "070 (751 C)", cmyk: [0, 0, 0, 100] }, name: "Türbeschriftung" }]);
  const o = await objektOeffnen(["Türbeschriftung"]);
  if (o.auf) { await objKnopf("arten", "Plott"); await objOk(); }
  await th("speichern");
  const rb = await panelKlick("btnBerechnen");
  const k = (await xmpVon()).kalkulation;
  const tb = k && k.objekte.find(z => z.name === "Türbeschriftung");
  pruefe("Fahrzeug: Fläche im Realmaß (600 × 150 mm = 0,09 m²)", tb && nah(tb.flaeche_m2, 0.09, 0.002), JSON.stringify(tb && { f: tb.flaeche_m2 }) + " " + rb.text);
  await fensterSchliessen("zusammenfassung");
  await th("schliessen", q).catch(() => {});
});
trennen();
process.exit(0);
