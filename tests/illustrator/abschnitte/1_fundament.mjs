// 3.1 Fundament (SPEZ_01, SPEZ_03_Konfigurationen §2, §5, §6): Anlegen „ohne Auftrag“ je Auftragsart, Quellen, Maßstab, Arbeitsdatei als Quelle,
// Exportkern lokal → Ablage, Nummerierung, kein Überschreiben.
import fs from "node:fs";
import path from "node:path";
import { th, thIn, schritt, pruefe, uebersprungen, OUT, ZIEL, KONFIG, muster, arbeitskopie, heute, xmpAusDatei, liste, alleDateien, nah, ev, warte, trennen } from "../lib/basis.mjs";
import { anlegen, arbeitsdateiPruefen, exportieren, dlg, textilWaehlen, pdfPruefen, serverOrdner, lokalOrdner, dateiname, hilfslinienBlock } from "../lib/ablauf.mjs";

const KUNDE = "Prüfkunde";
const KD = dateiname(KUNDE);
const ARTEN = Object.fromEntries(["fahrzeugbeschriftung", "beschriftung", "schild", "banner_rollup", "lasergravur", "offset", "textil", "sonstiges"].map(a => [a, KONFIG(`auftragsarten/${a}.json`)]));
const aoName = a => `${heute()}_${dateiname(ARTEN[a].name)}`;
const QUELLE = path.join(OUT, "vorlagen", "quelle_frei.ai");
const mtime = p => fs.statSync(p).mtimeMs;
const objektIn = async (name, ebene) => (await th("objekte", null, ebene)).objekte.find(o => o.name === name);
const breite = o => o ? Math.round((o.vb[2] - o.vb[0]) * 100) / 100 : null;
const offeneDoks = async () => (await th("dokumente")).dokumente;
const schliessenVorn = async () => { try { await th("schliessen", null); } catch (e) { /* schon zu */ } };
const merke = {};

await schritt("Testquellen anlegen", async () => {
  // freie Quelle ohne Panel-XMP: 300 × 200 mm, Ebene „Motiv“ mit Rechteck 100 × 50 mm
  await th("neu", 300, 200);
  await th("ebeneNeu", "Motiv");
  await th("zeichnen", [{ ebene: "Motiv", art: "rechteck", x: 50, y: 50, b: 100, h: 50, fuellung: { cmyk: [0, 60, 100, 0] }, name: "Q-Rechteck" }]);
  fs.mkdirSync(path.dirname(QUELLE), { recursive: true });
  await th("speichernUnter", QUELLE);
  await th("schliessen", null);
  pruefe("freie Quelle gespeichert", fs.existsSync(QUELLE), QUELLE);
  merke.testmuster = arbeitskopie(muster("Testmuster.ai"));
  pruefe("Arbeitskopie Testmuster.ai unter tests/out", fs.existsSync(merke.testmuster), merke.testmuster);
});

// ---------- Anlegen „leer“ je Auftragsart ----------
const LEER = {
  fahrzeugbeschriftung: { e: {}, zf: [[210, 297]], massstab: 30 },
  beschriftung: { e: {}, zf: [[1000, 1000]], massstab: 1 },
  schild: { e: { verfahren: "folie", material: "dibond-3" }, zf: null, massstab: 1, ebenen: ["Sandbox", "Plott", "Digitaldruck"] },
  banner_rollup: { e: { variante: "banner", breite: 800, hoehe: 400, anzahl: 1 }, zf: [[800, 400]], massstab: 1 },
  lasergravur: { e: {}, zf: [[600, 300]], massstab: 1 },
  offset: { e: { produkt: "A6", ausrichtung: "hoch", anzahl: 2 }, zf: [[105, 148], [105, 148]], massstab: 1 },
  textil: { e: { textil: () => textilWaehlen("anlegen", "B&C_E190_Men", "erste") }, zf: null, massstab: 1 },
  sonstiges: { e: { breite: 210, hoehe: 297, anzahl: 2 }, zf: [[210, 297], [210, 297]], massstab: 1 }
};
for (const [art, s] of Object.entries(LEER)) {
  await schritt(`Anlegen leer: ${ARTEN[art].name}`, async () => {
    const r = await anlegen({ art, kunde: KUNDE, quelle: "leer", ...s.e });
    if (!pruefe(`${art}: angelegt, keine Meldung`, r.ok && !r.text, r.grund || r.text)) { if (!r.ok) return; }
    const ebenen = s.ebenen || (ARTEN[art].ebenen.length ? ARTEN[art].ebenen.map(e => e.name) : undefined);
    const { d, x } = await arbeitsdateiPruefen(art, art, KUNDE, { massstab: s.massstab, quelleArt: "leer", ebenen });
    if (x) pruefe(`${art}: Kundenordner im XMP relativ (P/${KUNDE})`, x.ablage.kundenordner === `P/${KUNDE}`, x.ablage.kundenordner);
    if (x) pruefe(`${art}: Auftragsordner ${aoName(art)}`, x.ablage.auftragsordner === aoName(art), x.ablage.auftragsordner);
    if (s.zf) pruefe(`${art}: Zeichenflächen ${JSON.stringify(s.zf)}`, d.zf.length === s.zf.length && d.zf.every((z, i) => nah(z.breite, s.zf[i][0], 0.1) && nah(z.hoehe, s.zf[i][1], 0.1)), d.zf.map(z => `${z.breite}×${z.hoehe}`).join(", "));
    // Offset (Fassung 4 §12 Nr. 4): Hilfslinien-Ebenen aus hilfslinien.ebenen; A6 ohne Falz hat nur „Sicherheitsabstand“
    if (art === "offset") { const h = hilfslinienBlock(d.ebenen, ARTEN.offset.hilfslinien.ebenen); pruefe(`offset: Ebenen nach Konfiguration (oberste Ebenen aus hilfslinien.ebenen, gesperrt, nicht druckend)`, h.ok, h.text); }
    if (art === "fahrzeugbeschriftung") pruefe("Fahrzeugkontur gesperrt", (d.ebenen.find(e => e.name === "Fahrzeugkontur") || {}).gesperrt === true, JSON.stringify(d.ebenen));
    if (art === "schild" && x) pruefe("Schild: XMP schild.verfahren und Material aus der CSV", x.schild && x.schild.verfahren === "folie" && x.schild.material && x.schild.material.schluessel === "dibond-3" && x.schild.material.kuerzel === "Dib", JSON.stringify(x.schild));
    if (art === "banner_rollup" && x) pruefe("Banner: XMP banner_rollup.variante banner", x.banner_rollup && x.banner_rollup.variante === "banner", JSON.stringify(x.banner_rollup));
    if (art === "offset" && x) pruefe("Offset: XMP offset { produkt a6, bezeichnung A6, ausrichtung hoch, seiten 2 }", x.offset && x.offset.produkt === "a6" && x.offset.bezeichnung === "A6" && x.offset.ausrichtung === "hoch" && x.offset.seiten === 2, JSON.stringify(x.offset));
    if (art === "textil" && x) pruefe("Textil: XMP textil.modell E190m", x.textil && x.textil.modell && x.textil.modell.id === "E190m", JSON.stringify(x.textil));
    merke[art] = d.pfad;
    await schliessenVorn();
  });
}

// ---------- Quellen ----------
await schritt("Quelle geöffnete Datei (Beschriftung, 1:1)", async () => {
  const vorher = mtime(QUELLE);
  await th("oeffnen", QUELLE);
  const r = await anlegen({ art: "beschriftung", kunde: KUNDE, quelle: "offen", massstab: "1" });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const q = await objektIn("Q-Rechteck", "Sandbox");
  pruefe("Quellinhalt auf der Sandbox, 1:1 (100 mm)", q && nah(breite(q), 100, 0.2), q ? `${breite(q)} mm auf ${q.ebene}` : "nicht gefunden");
  const x = JSON.parse((await th("dok")).xmp || "null");
  pruefe("XMP quelle { art geoeffnet, pfad }", x && x.quelle.art === "geoeffnet" && x.quelle.pfad === QUELLE, JSON.stringify(x && x.quelle));
  merke.beschriftungQuelle = (await th("dok")).pfad;
  const doks = await offeneDoks();
  const orig = doks.find(d => d.pfad === QUELLE);
  pruefe("Original bleibt unverändert offen", !!orig && orig.gespeichert && mtime(QUELLE) === vorher, JSON.stringify(orig));
  await schliessenVorn();
  if (orig) await th("schliessen", QUELLE);
});

await schritt("Quelle Datei öffnen (Sonstiges, Vorbelegung aus der Quelle)", async () => {
  const vorher = mtime(QUELLE);
  let vorbelegung = null;
  const r = await anlegen({ art: "sonstiges", kunde: KUNDE, quelle: "datei", datei: QUELLE,
    vorLos: async () => { vorbelegung = await dlg(`[document.getElementById("breite").value, document.getElementById("hoehe").value, document.getElementById("anzahl").value].join("|")`); } });
  pruefe("Vorbelegung Breite × Höhe, Anzahl aus Zeichenfläche 1 der Quelle (300 × 200, 1)", vorbelegung === "300|200|1", vorbelegung);
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok");
  pruefe("Zeichenfläche 300 × 200", d.zf.length === 1 && nah(d.zf[0].breite, 300) && nah(d.zf[0].hoehe, 200), JSON.stringify(d.zf));
  const q = await objektIn("Q-Rechteck", "Motiv");
  pruefe("Kopie der Quelle mit unveränderten Ebenen (Motiv, 100 mm)", q && nah(breite(q), 100, 0.2), q ? `${breite(q)} mm` : JSON.stringify(d.ebenen));
  const doks = await offeneDoks();
  pruefe("gewählte Datei danach geschlossen und unverändert", !doks.some(x => x.pfad === QUELLE) && mtime(QUELLE) === vorher, doks.map(x => x.name).join(", "));
  merke.sonstigesDatei = d.pfad;
  await schliessenVorn();
});

await schritt("Maßstab 1:30 (Quelle ohne XMP → Beschriftung 1:1)", async () => {
  await th("oeffnen", QUELLE);
  let abfrage = null;
  const r = await anlegen({ art: "beschriftung", kunde: KUNDE, quelle: "offen", massstab: "30", vorLos: async () => { abfrage = await dlg(`!document.getElementById("zMassstab").hidden`); } });
  pruefe("Maßstabsabfrage bei .ai-Quelle ohne Panel-XMP sichtbar", abfrage === true, String(abfrage));
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const q = await objektIn("Q-Rechteck", "Sandbox");
  pruefe("Inhalt skaliert um Quelle/Ziel (100 mm × 30 = 3000 mm), auf der Sandbox", q && nah(breite(q), 3000, 1), q ? `${breite(q)} mm` : "nicht gefunden");
  await schliessenVorn();
  // Fahrzeugbeschriftung (1:30) aus Quelle 1:1: 100 mm / 30
  const r2 = await anlegen({ art: "fahrzeugbeschriftung", kunde: KUNDE, quelle: "offen", massstab: "1" });
  pruefe("Fahrzeugbeschriftung aus Quelle 1:1 angelegt", r2.ok && !r2.text, r2.text || r2.grund);
  const q2 = await objektIn("Q-Rechteck", "Sandbox");
  pruefe("Inhalt 1:1 → 1:30 skaliert (3,33 mm) auf der Sandbox", q2 && nah(breite(q2), 100 / 30, 0.05), q2 ? `${breite(q2)} mm` : "nicht gefunden");
  await schliessenVorn();
  await th("schliessen", QUELLE).catch(() => {});
});

await schritt("Arbeitsdatei als Quelle (gleiche und andere Art)", async () => {
  if (!merke.beschriftungQuelle) return uebersprungen("Arbeitsdatei als Quelle", "keine Beschriftung-Arbeitsdatei aus dem vorigen Schritt");
  await th("oeffnen", merke.beschriftungQuelle);
  await th("aufEbene", "Q-Rechteck", "Cut");
  await th("speichern");
  const r = await anlegen({ art: "beschriftung", kunde: KUNDE, quelle: "offen" });
  pruefe("gleiche Art: angelegt ohne Maßstabsabfrage", r.ok && !r.text, r.text || r.grund);
  const q = await objektIn("Q-Rechteck", "Cut");
  pruefe("gleiche Art, gleicher Maßstab: Inhalt in der gleichnamigen Ebene „Cut“", !!q, q ? `${q.ebene} ${breite(q)} mm` : JSON.stringify((await th("objekte", null, null)).objekte.map(o => o.ebene + ":" + o.name)));
  const x = JSON.parse((await th("dok")).xmp || "null");
  pruefe("neue Arbeitsdatei mit eigenem Auftragsordner _NN (belegt)", x && /_\d\d$/.test(x.ablage.auftragsordner), x && x.ablage.auftragsordner);
  await schliessenVorn();
  const r2 = await anlegen({ art: "fahrzeugbeschriftung", kunde: KUNDE, quelle: "offen" });
  pruefe("andere Art: angelegt", r2.ok && !r2.text, r2.text || r2.grund);
  const q2 = await objektIn("Q-Rechteck", "Sandbox");
  pruefe("andere Art und Maßstabswechsel 1 → 30: Inhalt auf der Sandbox, skaliert", q2 && nah(breite(q2), 100 / 30, 0.05), q2 ? `${q2.ebene} ${breite(q2)} mm` : "nicht gefunden");
  await schliessenVorn();
  await th("schliessen", merke.beschriftungQuelle).catch(() => {});
  // Testmuster (Fahrzeugbeschriftung mit Panel-XMP?) als Quelle derselben Art
  const tx = await xmpAusDatei(merke.testmuster);
  if (!tx || tx.auftragsart !== "fahrzeugbeschriftung") { uebersprungen("Testmuster.ai als Quelle gleicher Art", `Testmuster.ai ohne Panel-XMP Fahrzeugbeschriftung (${tx ? tx.auftragsart : "kein XMP"})`); return; }
  await th("oeffnen", merke.testmuster);
  const r3 = await anlegen({ art: "fahrzeugbeschriftung", kunde: KUNDE, quelle: "offen" });
  pruefe("Testmuster → Fahrzeugbeschriftung angelegt", r3.ok && !r3.text, r3.text || r3.grund);
  const o = (await th("objekte", null, "Digitaldruck")).objekte;
  pruefe("Testmuster: Inhalt in der gleichnamigen Ebene „Digitaldruck“", o.length > 0, `${o.length} Objekte`);
  await schliessenVorn();
  await th("schliessen", merke.testmuster).catch(() => {});
});

// ---------- Exportkern ----------
await schritt("Exportkern lokal → Ablage (Sonstiges)", async () => {
  if (!merke.sonstigesDatei) return uebersprungen("Export", "keine Sonstiges-Arbeitsdatei");
  await th("oeffnen", merke.sonstigesDatei);
  const x0 = JSON.parse((await th("dok")).xmp);
  const ao = x0.ablage.auftragsordner, so = serverOrdner(x0.ablage.kundenordner, ao);
  const r = await exportieren();
  pruefe("Export ohne Meldung", !r.text, r.text);
  const pdf = path.join(so, `${KD}_druck.pdf`);
  await pdfPruefen("Sonstiges", pdf, 1, [300, 200]);
  pruefe("Arbeitsdatei-Kopie im Server-Auftragsordner", fs.existsSync(path.join(so, "Arbeitsdatei.ai")), liste(so).join(", "));
  pruefe("keine .teil-Dateien, lokaler Ausgang aufgeräumt", !fs.readdirSync(so).some(n => n.endsWith(".teil")) && !fs.existsSync(path.join(ZIEL.ausgang, KD, ao)), alleDateien(ZIEL.ausgang).join(", "));
  const x = JSON.parse((await th("dok")).xmp);
  const e = x.exporte[x.exporte.length - 1];
  pruefe("XMP exporte[] mit Ordner und Dateien übertragen", e && e.ordner === `${x.ablage.kundenordner}/${ao}` && e.uebertragen === true && e.dateien.some(f => f.name === `${KD}_druck.pdf` && f.uebertragen === true), JSON.stringify(e));
  const kopie = await xmpAusDatei(path.join(so, "Arbeitsdatei.ai"));
  pruefe("Server-Kopie der Arbeitsdatei enthält den exporte-Eintrag", kopie && kopie.exporte.length === x.exporte.length, kopie ? `${kopie.exporte.length} Einträge` : "kein XMP");
  merke.export = { so, pdf, t: mtime(pdf) };
});

await schritt("Nummerierung, kein Überschreiben", async () => {
  if (!merke.export) return uebersprungen("Nummerierung", "erster Export fehlt");
  const r = await exportieren();
  pruefe("zweiter Export ohne Meldung", !r.text, r.text);
  const so = merke.export.so;
  pruefe("zweite PDF _02, erste unverändert", fs.existsSync(path.join(so, `${KD}_druck_02.pdf`)) && mtime(merke.export.pdf) === merke.export.t, liste(so).join(", "));
  pruefe("Arbeitsdatei-Kopie _02", fs.existsSync(path.join(so, "Arbeitsdatei_02.ai")), liste(so).join(", "));
  await schliessenVorn();
  // Anlegen derselben Art am selben Tag → Auftragsordner _02 bzw. _03
  const r2 = await anlegen({ art: "sonstiges", kunde: KUNDE, quelle: "leer", breite: 100, hoehe: 100, anzahl: 1 });
  const x = JSON.parse((await th("dok")).xmp || "null");
  pruefe("Anlegen erneut: belegter Auftragsordner → _NN", r2.ok && x && /_0[2-9]$/.test(x.ablage.auftragsordner) && fs.existsSync(path.join(lokalOrdner(KUNDE, x.ablage.auftragsordner), "Arbeitsdatei.ai")), x && x.ablage.auftragsordner);
  await schliessenVorn();
});

await schritt("Export Lasergravur und Banner (Profil flach)", async () => {
  for (const [art, name, mass] of [["lasergravur", "laser", [600, 300]], ["banner_rollup", "druck", [800, 400]]]) {
    if (!merke[art]) { uebersprungen(`${art} Export`, "Arbeitsdatei fehlt"); continue; }
    await th("oeffnen", merke[art]);
    const x = JSON.parse((await th("dok")).xmp);
    const r = await exportieren();
    pruefe(`${art}: Export ohne Meldung`, !r.text, r.text);
    const pdf = path.join(serverOrdner(x.ablage.kundenordner, x.ablage.auftragsordner), `${KD}_${name}.pdf`);
    const i = await pdfPruefen(art, pdf, 1, mass);
    if (art === "banner_rollup" && i && i.boxen) pruefe("Banner ohne Anschnitt (MediaBox = Endformat)", i.boxen.every(b => nah(b.media[0], mass[0], 0.5) && nah(b.media[1], mass[1], 0.5)), JSON.stringify(i.boxen));
    await schliessenVorn();
  }
});
trennen();
process.exit(0);
