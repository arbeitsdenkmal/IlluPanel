// 3.8 Nutzen, Gitterscheiben, MB-Nr (SPEZ_03_Nutzen): Nutzen aus Beschriftung-Arbeitsdatei (A) und aus beliebigem Dokument (B), Bogenformate A4, A3, ohne,
// über 2500 mm; Gitterscheiben beide Varianten; MB-Nummern; Ordner und Typ-Gedächtnis im Test-Bögl-Ordner.
import fs from "node:fs";
import path from "node:path";
import { aktion, th, schritt, pruefe, uebersprungen, OUT, ZIEL, KONFIG, muster, arbeitskopie, liste, nah, ev, warte, klick, marke, meldungsText, meldungenSeit, panelNeu, panelZustand, panelFertig, xmpVon, antworten, trennen, bis, monat, heute } from "../lib/basis.mjs";
import { anlegen, exportieren, serverOrdner, dateiname, kundenordner, fensterAuf, fensterZu, fensterSchliessen, pdfPruefen, boegenOffen } from "../lib/ablauf.mjs";

const NK = KONFIG("nutzen.json");
const BOEGL = path.join(ZIEL.kunden, NK.boegl.kundenordner);
const m = {};
const nv = expr => ev("nutzen", expr);
const boegenZu = async () => { for (const b of await boegenOffen()) await th("schliessen", b.name).catch(() => {}); };
const NUTZEN_BEREIT = `!!window.PAM && document.querySelectorAll("#format button").length > 0`;
async function nutzenOeffnen() {
  await panelNeu();
  const mk = marke();
  const auf = await fensterAuf("nutzen", () => klick("panel", "#btnNutzen"), NUTZEN_BEREIT, 60000);
  return { auf, mk };
}
const knopfText = (sel, t) => nv(`(()=>{ const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent===${JSON.stringify(t)}); if(!b) return false; b.click(); return true; })()`);
async function nutzenAufbauen(feld = {}, layout = 0) {
  for (const [id, w] of Object.entries(feld.text || {})) await nv(`(()=>{ const f=document.getElementById(${JSON.stringify(id)}); f.value=${JSON.stringify(String(w))}; f.dispatchEvent(new Event("input")); return true; })()`);
  if (feld.medium) await knopfText("#medium button", feld.medium);
  if (feld.laminat) await knopfText("#laminat button", feld.laminat);
  if (feld.format) await knopfText("#format button", feld.format);
  await warte(200);
  aktion("Nutzen Weiter");
  await klick("nutzen", "#weiter");
  const zwei = await bis(() => nv(`!document.getElementById("schritt2").hidden`), 30000);
  if (!zwei) return { ok: false, grund: "Schritt „Vorschau“ nicht erreicht" };
  const s2 = await nv(`({ layouts: [...document.querySelectorAll("#layouts input[type=radio]")].length, zeilen: [...document.querySelectorAll("#layouts > *")].map(x=>x.innerText.replace(/\\s+/g," ").trim()), vorgabe: document.getElementById("vorgabe").innerText })`);
  if (layout) await nv(`(()=>{ const r=document.querySelectorAll("#layouts input[type=radio]")[${layout}]; if(r){ r.checked=true; r.dispatchEvent(new Event("change")); } return !!r; })()`);
  aktion("Nutzen Aufbauen");
  await klick("nutzen", "#aufbauen");
  const zu = await fensterZu("nutzen", 115000);
  await panelFertig(30000);
  return { ok: zu, s2 };
}

await schritt("Nutzen Einstieg A (Beschriftung-Arbeitsdatei, A4)", async () => {
  const r = await anlegen({ art: "beschriftung", kunde: "Nutzentest", quelle: "leer" });
  pruefe("Beschriftung angelegt", r.ok, r.text || r.grund);
  m.ad = (await th("dok")).pfad; m.xad = await xmpVon();
  await th("zeichnen", [
    { ebene: "Print", art: "rechteck", x: 0, y: 0, b: 80, h: 50, fuellung: { cmyk: [0, 50, 100, 0] }, gruppe: "Etikett" },
    { ebene: "Print", art: "rechteck", x: 2, y: 2, b: 76, h: 46, kontur: { cut: true }, konturStaerke: 0.25, gruppe: "Etikett" }]);
  for (const [k, v] of [["IP_Id", "nutzen-a"], ["IP_Folie", "3551"], ["IP_Laminat", "matt"], ["IP_Anzahl", "40"]]) await th("tagSetzen", "Etikett", k, v);
  await th("speichern");
  await th("auswaehlen", ["Etikett"]);
  const { auf } = await nutzenOeffnen();
  if (!pruefe("Fenster „Nutzen“ geöffnet", auf)) return;
  const s1 = await nv(`({ kundeT: document.getElementById("kundeT").textContent, kundeFeld: !document.getElementById("kunde").hidden, medium: document.getElementById("mediumT").textContent, stk: document.getElementById("stueckzahlT").textContent, produkt: document.getElementById("produkt").value, format: (document.querySelector("#format button.an")||{}).textContent, abstand: document.getElementById("abstand").value })`);
  pruefe("Einstieg A: Kunde, Medium, Stückzahl als Text aus XMP/Tags; Produkt „Aufkleber“, A4, Abstand 5", s1.kundeT.includes("Nutzentest") && !s1.kundeFeld && /3551/.test(s1.medium) && /40/.test(s1.stk) && s1.produkt === NK.nutzen.produkt && s1.format === "A4" && s1.abstand === "5", JSON.stringify(s1));
  const a = await nutzenAufbauen();
  pruefe("Vorschau mit Layouts, Aufbauen", a.ok && a.s2 && a.s2.layouts >= 1, JSON.stringify(a.s2 || a.grund));
  const b = await boegenOffen();
  pruefe("Nutzen-Bogen: rolle druckbogen, bogen.art nutzen, produkt Aufkleber, arbeitsdatei = Pfad", b.length >= 1 && b.every(x => x.x.bogen.art === "nutzen" && x.x.bogen.produkt === "Aufkleber" && x.x.bogen.arbeitsdatei === m.ad), JSON.stringify(b.map(x => x.x.bogen)));
  if (b.length) {
    await th("aktivieren", b[0].name);
    const o = (await th("objekte", null, "Druck")).objekte;
    pruefe("Instanzen „Aufkleber <k>“ mit IP_Herkunft = IP_Id", o.length > 0 && o.every(i => /^Aufkleber \d+$/.test(i.name) && i.tags.IP_Herkunft === "nutzen-a"), JSON.stringify(o.slice(0, 3).map(i => [i.name, i.tags.IP_Herkunft])));
    await panelNeu();
    const z = await panelZustand();
    pruefe("Panel Nutzen-Bogen vorn: „Nutzentest · Nutzen Aufkleber · n/m“, Werkzeugzeile gesperrt", /Nutzentest · Nutzen Aufkleber · \d+\/\d+/.test(z.kopf) && z.nutzen.gesperrt && z.breite.gesperrt && z.masken.gesperrt, z.kopf);
    const info = (await th("texte", "Info")).texte.join("\n");
    pruefe("Info-Ebene mit Bogen n von m und Materiallänge", /Bogen/.test(info) && /Material/.test(info), info.slice(0, 300));
  }
  const xa = await xmpVon(m.ad);
  pruefe("Arbeitsdatei: aufbau, Einträge mit art nutzen, produkt (SPEZ_03_Nutzen §4.2)", xa.aufbau && xa.aufbau.boegen.length > 0 && xa.aufbau.boegen.every(b => b.art === "nutzen" && b.produkt === "Aufkleber"), JSON.stringify(xa.aufbau));
  const e = await exportieren();
  const so = serverOrdner(m.xad.ablage.kundenordner, m.xad.ablage.auftragsordner), d = liste(so);
  pruefe("Export: <Kunde>_<Produkt>_<Medium>-<Laminat>-<Breite>_NN_druck/_cut.pdf, .ai im Auftragsordner der Arbeitsdatei", ["_druck.pdf", "_cut.pdf", ".ai"].every(s => d.includes(`Nutzentest_Aufkleber_3551-matt-1370_01${s}`)), `${d.join(", ")} · ${e.text}`);
  await th("schliessen", m.ad).catch(() => {});
});

await schritt("Nutzen Einstieg B (beliebiges Dokument, A3), Export mit Ordnerdialog", async () => {
  await th("neu", 200, 200);
  const e0 = (await th("dok")).ebenen[0].name;
  await th("zeichnen", [
    { ebene: e0, art: "rechteck", x: 10, y: 10, b: 60, h: 40, fuellung: { cmyk: [100, 0, 50, 0] }, name: "Motiv B" },
    { ebene: e0, art: "rechteck", x: 9, y: 9, b: 62, h: 42, kontur: { cut: true }, konturStaerke: 0.25, name: "Cut B" }]);
  await th("auswaehlen", ["Motiv B", "Cut B"]);
  const { auf } = await nutzenOeffnen();
  if (!pruefe("Fenster „Nutzen“ geöffnet (B)", auf)) return;
  const s1 = await nv(`({ kunde: !document.getElementById("kunde").hidden, stk: document.getElementById("stueckzahl").value, medium: (document.querySelector("#medium button.an")||{}).textContent, laminat: (document.querySelector("#laminat button.an")||{}).textContent })`);
  pruefe("Einstieg B: Felder Kunde, Stückzahl (100), Medium (3551), Laminat (matt)", s1.kunde && s1.stk === String(NK.nutzen.stueckzahl) && s1.medium === "3551" && s1.laminat === "matt", JSON.stringify(s1));
  const a = await nutzenAufbauen({ text: { kunde: "Nutzenkunde", stueckzahl: 30, produkt: "Sticker" }, laminat: "glänzend", format: "A3" });
  pruefe("aufgebaut", a.ok, a.grund);
  const b = await boegenOffen();
  pruefe("Bogen ohne Arbeitsdatei (bogen.arbeitsdatei null), Laminat glaenzend", b.length >= 1 && b.every(x => x.x.bogen.arbeitsdatei === null && x.x.bogen.laminat === "glaenzend" && x.x.kunde === "Nutzenkunde"), JSON.stringify(b.map(x => [x.x.bogen, x.x.kunde])));
  const kd = kundenordner("Nutzenkunde");
  const e = await exportieren();
  const ao = `${heute()}_Sticker`, so = path.join(kd.pfad, ao);
  pruefe("Kundenordner über den Ordnerdialog, Auftragsordner JJJJ-MM-TT_<Produkt>", fs.existsSync(so) && liste(so).includes("Nutzenkunde_Sticker_3551-glaenzend-1370_01_druck.pdf"), `${liste(kd.pfad).join(", ")} / ${liste(so).join(", ")} · ${e.text}`);
  pruefe("keine Arbeitsdatei-Kopie bei Bögen ohne Arbeitsdatei", !liste(so).some(n => /^Arbeitsdatei/.test(n)), liste(so).join(", "));
});

await schritt("Bogenformate ohne (ohne Cutkontur, Rückfrage) und über 2500 mm", async () => {
  await th("neu", 200, 200);
  const e0 = (await th("dok")).ebenen[0].name;
  await th("zeichnen", [{ ebene: e0, art: "rechteck", x: 10, y: 10, b: 80, h: 50, fuellung: { cmyk: [0, 0, 100, 20] }, name: "Ohne Cut" }]);
  await th("auswaehlen", ["Ohne Cut"]);
  const { auf, mk } = await nutzenOeffnen();
  const frage = meldungenSeit(mk).find(x => x.art === "frage");
  pruefe("ohne Cutkontur: Rückfrage „Keine Cutkontur gefunden …“ (im Test mit Ja beantwortet)", frage && /Keine Cutkontur gefunden/.test(frage.text), JSON.stringify(frage));
  if (!pruefe("Fenster geöffnet", auf)) return;
  await knopfText("#format button", "ohne");
  const ohne = await nv(`({ modus: !document.getElementById("modus").hidden, abstandB: document.getElementById("abstandB").textContent })`);
  pruefe("„ohne“: Modus und Abstand Bögen ausgeblendet", !ohne.modus && !ohne.abstandB, JSON.stringify(ohne));
  const a = await nutzenAufbauen({ text: { kunde: "Rollenkunde", stueckzahl: 1500, produkt: "Rolle" } });
  pruefe("aufgebaut", a.ok, a.grund);
  const b = await boegenOffen();
  const rolle = b.filter(x => x.x.kunde === "Rollenkunde");
  pruefe("über 2500 mm: weitere Bögen desselben Aufbaus (gesamt ≥ 2, gleiche aufbau-Id)", rolle.length >= 2 && rolle.every(x => x.x.bogen.gesamt === rolle.length && x.x.bogen.aufbau === rolle[0].x.bogen.aufbau), JSON.stringify(rolle.map(x => x.x.bogen)));
  for (const x of rolle) {
    const d = await th("dok", x.name);
    pruefe(`Bogen ${x.x.bogen.nr}: Länge ≤ 2500 mm`, d.zf[0].hoehe <= 2500.5 && d.zf[0].breite <= 2500.5, JSON.stringify(d.zf[0]));
  }
  await boegenZu();
});

async function gitterLauf(titel, dateien, variante) {
  await panelNeu();
  const auf = await fensterAuf("gitter", () => ev("panel", `setTimeout(() => PAM_TEST.menueKlick("gitter"), 10); true`), `!!window.PAM && !!document.getElementById("hinzu")`, 60000);
  if (!pruefe(`${titel}: Fenster „WEA-Etiketten“ aus dem Flyout-Menü geöffnet`, auf)) return null;
  antworten({ dateien: [dateien] });
  await klick("gitter", "#hinzu"); await warte(1500);
  const l = await ev("gitter", `[...document.querySelectorAll("#liste .zl")].map(z => [z.querySelector(".dname") && z.querySelector(".dname").textContent, z.querySelector("input") && z.querySelector("input").value])`);
  pruefe(`${titel}: Liste mit Stückzahl aus dem Präfix <Zahl>x_`, l.length === dateien.length && l.every(z => z[1] === (/^(\d+)x_/.exec(z[0]) || [, "1"])[1]), JSON.stringify(l));
  aktion("Gitter Weiter");
  await klick("gitter", "#weiter");
  const typ = [];
  for (let i = 0; i < dateien.length; i++) {
    if (!(await bis(() => ev("gitter", `!document.getElementById("schritt2").hidden && document.getElementById("oben").value !== undefined`), 30000))) break;
    await warte(500);
    typ.push(await ev("gitter", `({ titel: document.title, oben: document.getElementById("oben").value, unten: document.getElementById("unten").value, hinweis: document.getElementById("typHinweis").textContent, vor: document.getElementById("vorOben").textContent })`));
    if (variante === 0) await ev("gitter", `(()=>{ const f=document.getElementById("oben"); f.value="TEST OBEN ${i + 1}"; f.dispatchEvent(new Event("input")); return document.getElementById("vorOben").textContent; })()`);
    aktion(`Gitter Übernehmen ${i + 1}`);
    await klick("gitter", "#uebernehmen"); await warte(800);
  }
  const drei = await bis(() => ev("gitter", `!document.getElementById("schritt3").hidden`), 90000);
  if (!pruefe(`${titel}: Schritt 3 „Variante wählen“`, drei, JSON.stringify(typ))) { await fensterSchliessen("gitter"); return { typ }; }
  const v = await ev("gitter", `[...document.querySelectorAll("#varianten tr")].map(t => t.innerText.replace(/\\s+/g, " ").trim())`);
  const idx = variante === "letzte" ? v.length - 1 : 0;
  await ev("gitter", `(()=>{ const r=document.querySelectorAll("#varianten input[type=radio]")[${idx}]; r.checked=true; r.dispatchEvent(new Event("change")); return true; })()`);
  const detail = await ev("gitter", `document.getElementById("detail").textContent`);
  aktion("Gitter Aufbauen");
  await klick("gitter", "#aufbauen");
  await fensterZu("gitter", 115000); await panelFertig(30000);
  return { typ, varianten: v, idx, detail };
}

await schritt("Gitterscheiben Lauf 1 (erste Variante), Typ-Gedächtnis schreiben", async () => {
  fs.rmSync(path.join(BOEGL, NK.boegl.typgedaechtnis), { force: true });
  m.gitter = [arbeitskopie(muster("MBMuster", "WEA0104634_Zuweisung_WEA-Betonring__E21_S1.1.pdf"), "2x_WEA0104634.pdf"), arbeitskopie(muster("tests", "fixtures", "gitter", "Typ_A.txt"), "3x_Typ_A.txt")];
  const r = await gitterLauf("Gitter 1", m.gitter, 0);
  if (!r || !r.varianten) return;
  pruefe("mehrere Varianten (Einzelbogen/Bogenfolge), ohne „über 2,5 m“", r.varianten.length >= 2 && !r.varianten.some(z => /über 2,5/.test(z)), JSON.stringify(r.varianten));
  pruefe("Typbezeichnung je Datei mit Hinweis „… Etiketten je Streifen, … mal benötigt.“", r.typ.length === 2 && r.typ.every(t => /Etiketten je Streifen, \d+ mal benötigt\./.test(t.hinweis)), JSON.stringify(r.typ));
  const ged = path.join(BOEGL, NK.boegl.typgedaechtnis);
  pruefe("typzuordnung.txt im Test-Bögl-Kundenordner geschrieben", fs.existsSync(ged) && /TEST OBEN 1/.test(fs.readFileSync(ged, "utf8")), fs.existsSync(ged) ? fs.readFileSync(ged, "utf8").slice(0, 200) : "fehlt");
  const b = await boegenOffen();
  pruefe("Gitter-Bögen: art gitter, Kunde Max Bögl, ohne Arbeitsdatei, Symbol je Kundendatei", b.length >= 1 && b.every(x => x.x.bogen.art === "gitter" && x.x.kunde === NK.boegl.kunde && x.x.bogen.arbeitsdatei === null), JSON.stringify(b.map(x => x.x.bogen)));
  if (b.length) {
    await th("aktivieren", b[0].name);
    const o = await th("objekte", null, "Druck");
    pruefe("Instanzen der Streifen-Symbole", o.objekte.length > 0 && o.objekte.every(i => i.typ === "SymbolItem"), `${o.objekte.length} Objekte, ${o.symbole} Symbole`);
    await panelNeu();
    pruefe("Panel: „Max Bögl · Gitterscheiben · n/m“", /Max Bögl · Gitterscheiben · \d+\/\d+/.test((await panelZustand()).kopf), (await panelZustand()).kopf);
    const info = (await th("texte", "Info")).texte.join("\n");
    pruefe("Info-Ebene „=== WEA-ETIKETTEN ===“", /=== WEA-ETIKETTEN ===/.test(info), info.slice(0, 200));
  }
  const e = await exportieren();
  const ao = path.join(BOEGL, `${monat()}_${NK.gitter.ordner}`);
  pruefe("Export: Kundenordner fest M/01_Max Bögl, Auftragsordner JJJJ-MM_Gitterscheiben, Nutzen 01_druck/_cut.pdf, .ai", ["_druck.pdf", "_cut.pdf", ".ai"].every(s => liste(ao).includes(`${NK.boegl.dateiname} 01${s}`)), `${liste(ao).join(", ")} · ${e.text}`);
});

await schritt("Gitterscheiben Lauf 2 (letzte Variante), Gedächtnis gelesen, Ordner „ 2“", async () => {
  const r = await gitterLauf("Gitter 2", m.gitter, "letzte");
  if (!r || !r.typ) return;
  pruefe("Typ-Gedächtnis: obere Zeile aus typzuordnung.txt vorbelegt", r.typ.length === 2 && r.typ.every((t, i) => t.oben === `TEST OBEN ${i + 1}`), JSON.stringify(r.typ));
  if (!r.varianten) return;
  pruefe("andere Variante gewählt", r.idx > 0, JSON.stringify({ idx: r.idx, v: r.varianten[r.idx], detail: r.detail }));
  await exportieren();
  const ao2 = path.join(BOEGL, `${monat()}_${NK.gitter.ordner} 2`);
  pruefe("fremder Ordner gleichen Namens → „JJJJ-MM_Gitterscheiben 2“", liste(ao2).includes(`${NK.boegl.dateiname} 01_druck.pdf`), `${liste(BOEGL).join(", ")}`);
});

await schritt("MB-Nummern", async () => {
  await panelNeu();
  const auf = await fensterAuf("mbnr", () => ev("panel", `setTimeout(() => PAM_TEST.menueKlick("mbnr"), 10); true`), `!!window.PAM && document.querySelectorAll("#nummern input").length === ${NK.mb.nummern}`, 60000);
  if (!pruefe("Fenster „Bögl Nummern“ aus dem Flyout-Menü geöffnet, zehn Felder", auf)) return;
  const w = await ev("mbnr", `[...document.querySelectorAll("#nummern input")].map(i=>i.value)`);
  pruefe("vorbelegt aus auftrag.txt (20, 7, 0, 12, sonst 0)", JSON.stringify(w.slice(0, 5)) === JSON.stringify(["20", "7", "0", "12", "0"]), JSON.stringify(w));
  await ev("mbnr", `(()=>{ const i=document.querySelectorAll("#nummern input")[2]; i.value="5"; i.dispatchEvent(new Event("input")); return true; })()`);
  const erg = await ev("mbnr", `document.getElementById("ergebnis").textContent`);
  pruefe("Ergebnis beim Tippen: „Material ges.: …“ und Überproduktion", /Material ges\./.test(erg) && /Überproduktion/.test(erg), erg);
  aktion("MB Aufbauen");
  await klick("mbnr", "#aufbauen");
  await fensterZu("mbnr", 115000); await panelFertig(30000);
  const b = (await boegenOffen()).filter(x => x.x.bogen.art === "mb");
  pruefe("MB-Bögen: art mb, Kunde Max Bögl", b.length >= 1, JSON.stringify(b.map(x => x.x.bogen)));
  if (b.length) {
    await th("aktivieren", b[0].name);
    const info = (await th("texte", "Info")).texte.join("\n");
    pruefe("Info-Ebene „=== BÖGL NUMMERN ===“, „Material ges.: rund … m Bahn“", /=== BÖGL NUMMERN ===/.test(info) && /Material ges\.:\s+rund/.test(info), info.slice(0, 300));
    await panelNeu();
    pruefe("Panel: „Max Bögl · Nummern · n/m“", /Max Bögl · Nummern · \d+\/\d+/.test((await panelZustand()).kopf), (await panelZustand()).kopf);
    const e = await exportieren();
    const ao = path.join(BOEGL, `${monat()}_${NK.mb.ordner}`);
    pruefe("Export: JJJJ-MM_Nummern/Nutzen 01_druck.pdf, _cut.pdf, .ai", ["_druck.pdf", "_cut.pdf", ".ai"].every(s => liste(ao).includes(`${NK.boegl.dateiname} 01${s}`)), `${liste(ao).join(", ")} · ${e.text}`);
  }
});
trennen();
process.exit(0);
