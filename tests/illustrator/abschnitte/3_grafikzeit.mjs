// 3.3 Grafikzeit (SPEZ_02 §12): Puffer, Übernahme ins XMP bei Maus ins Panel und eigener Aktion, Gutschrift aus Druckbogen (gespeichert und ungespeichert),
// „+m“ positiv und negativ, Anzeige. Die Zählung bei echter Eingabe ist nicht Teil des Laufs: Puffereinträge werden geschrieben, nicht gezählt.
import fs from "node:fs";
import path from "node:path";
import { th, schritt, pruefe, uebersprungen, OUT, ROOT, require, RECHNERORDNER, ev, warte, abruf, panelNeu, panelZustand, panelFertig, klick, xmpVon, bis, trennen, evStill } from "../lib/basis.mjs";
import { anlegen, panelKlick, exportieren, boegenOffen } from "../lib/ablauf.mjs";

const GZ = require(path.join(ROOT, "panel", "lib", "grafikzeit.js"));
const PUFFER = path.join(RECHNERORDNER, GZ.PUFFER), DRUCKBOEGEN = path.join(RECHNERORDNER, "grafikzeit_druckboegen.json"); // entfällt mit SPEZ_02 Fassung 8
const puffer = () => { try { return JSON.parse(fs.readFileSync(PUFFER, "utf8")); } catch (e) { return {}; } };
const jetzt = Date.now();
function eintrag(pfad, sekunden, versatzMin) {
  const bis = new Date(jetzt - versatzMin * 60000), von = new Date(bis.getTime() - sekunden * 1000);
  GZ.anhaengen(PUFFER, pfad, { von: von.toISOString(), bis: bis.toISOString(), sekunden });
  const l = puffer()[pfad] || [];
  return l[l.length - 1].id;
}
const eintraege = async () => ((await xmpVon()) || {}).grafikzeit.eintraege;
const plusMin = async wert => {
  await ev("panel", `(()=>{ const f=document.getElementById("plusMin"); f.value=${JSON.stringify(wert)}; f.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); return true; })()`);
  await warte(500); await panelFertig(30000);
};
const m = {};

await schritt("Arbeitsdatei (Sonstiges) für die Grafikzeit", async () => {
  const r = await anlegen({ art: "sonstiges", kunde: "Grafiktest", quelle: "leer", breite: 210, hoehe: 297, anzahl: 1 });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  m.pfad = (await th("dok")).pfad;
  pruefe("XMP grafikzeit.eintraege leer", (await eintraege()).length === 0);
});

await schritt("Übernahme bei Maus ins Panel", async () => {
  const id = eintrag(m.pfad, 125, 10);
  pruefe("Puffereintrag geschrieben", (puffer()[m.pfad] || []).some(e => e.id === id), JSON.stringify(puffer()[m.pfad]));
  await abruf(); await warte(1500); await panelFertig(20000);
  const e = await eintraege();
  const neu = e.find(x => !x.manuell);
  pruefe("Eintrag im XMP: minuten 2,1 (125 s auf 0,1), manuell false, benutzer null, uebertragen false", neu && neu.minuten === 2.1 && neu.manuell === false && neu.benutzer === null && neu.uebertragen === false && neu.von && neu.bis, JSON.stringify(e));
  pruefe("Panel entfernt genau den übernommenen Eintrag aus dem Puffer", !(puffer()[m.pfad] || []).some(x => x.id === id), JSON.stringify(puffer()[m.pfad] || []));
  await panelNeu();
  pruefe("Anzeige „Grafik 2 min“", (await panelZustand()).grafik.text === "Grafik 2 min", (await panelZustand()).grafik.text);
});

await schritt("ohne Puffereintrag kein XMP-Schreiben", async () => {
  await th("speichern");
  await abruf(); await warte(1500); await panelFertig(20000);
  const d = await th("dok");
  pruefe("Dokument bleibt gespeichert (unverändert) bei Maus ins Panel ohne Einträge", d.gespeichert === true, JSON.stringify({ gespeichert: d.gespeichert }));
});

await schritt("Übernahme bei eigener Aktion (Masken)", async () => {
  const id = eintrag(m.pfad, 600, 5);
  await panelKlick("btnMasken");
  const e = await eintraege();
  pruefe("Aktion übernimmt den Puffereintrag (10 min)", e.some(x => x.minuten === 10 && !x.manuell) && !(puffer()[m.pfad] || []).some(x => x.id === id), JSON.stringify(e.map(x => x.minuten)));
});

await schritt("„+m“ positiv, negativ, 0 und keine Zahl", async () => {
  const n0 = (await eintraege()).length;
  await plusMin("5");
  let e = await eintraege();
  const p = e[e.length - 1];
  pruefe("„+m“ 5: Eintrag manuell true, minuten 5, von = bis", e.length === n0 + 1 && p.manuell === true && p.minuten === 5 && p.von === p.bis && p.benutzer === null, JSON.stringify(p));
  pruefe("Feld danach leer", (await ev("panel", `document.getElementById("plusMin").value`)) === "");
  await plusMin("-3");
  e = await eintraege();
  pruefe("„+m“ −3: negativer Eintrag", e.length === n0 + 2 && e[e.length - 1].minuten === -3, JSON.stringify(e[e.length - 1]));
  await plusMin("0"); await plusMin("abc");
  pruefe("0 und keine Zahl: kein Eintrag", (await eintraege()).length === n0 + 2, String((await eintraege()).length));
  await panelNeu();
  const summe = Math.round((await eintraege()).reduce((s, x) => s + x.minuten, 0));
  pruefe(`Anzeige = Σ aller Einträge ganzzahlig (Grafik ${summe} min)`, (await panelZustand()).grafik.text === `Grafik ${summe} min`, (await panelZustand()).grafik.text);
  await th("schliessen", null);
});

// SPEZ_02 Fassung 8 §12: Arbeit in Druckbögen zählt nicht (ungespeichert und gespeichert, alle bogen.art), keine Gutschrift an die Arbeitsdatei
await schritt("Druckbogen vorn: keine Zählung (ungespeichert und gespeichert)", async () => {
  const r = await anlegen({ art: "beschriftung", kunde: "Grafikbogen", quelle: "leer" });
  pruefe("Beschriftung angelegt", r.ok, r.text || r.grund);
  m.ad = (await th("dok")).pfad;
  await th("zeichnen", [{ ebene: "Print", art: "rechteck", x: 0, y: 0, b: 300, h: 200, fuellung: { cmyk: [20, 0, 60, 0] }, name: "Druckmotiv" }]);
  await th("tagSetzen", "Druckmotiv", "IP_Id", "gz-druck-1");
  await th("tagSetzen", "Druckmotiv", "IP_Folie", "3551");
  await th("tagSetzen", "Druckmotiv", "IP_Laminat", "matt");
  await th("speichern");
  const rd = await panelKlick("btnDruck");
  const boegen = await boegenOffen();
  if (!pruefe("Druck: ein ungespeicherter Bogen vorn", boegen.length === 1 && boegen[0].vorn, JSON.stringify(boegen.map(b => b.name)) + " " + rd.text)) return;
  pruefe("keine Zuordnungsdatei grafikzeit_druckboegen.json", !fs.existsSync(DRUCKBOEGEN));
  const hg = () => evStill("hintergrund", "window.PAMHintergrund ? { s: PAMHintergrund.schluessel, p: PAMHintergrund.pfad } : null");
  // Arbeitsdatei vorn: Schlüssel = Arbeitsdatei; danach Bogen vorn: kein Schlüssel (der Zähler schreibt nur mit Schlüssel)
  await th("aktivieren", m.ad);
  pruefe("Hintergrund: Arbeitsdatei vorn → Schlüssel = Arbeitsdatei", await bis(async () => ((await hg()) || {}).s === m.ad, 20000, 1000), JSON.stringify(await hg()));
  await th("aktivieren", boegen[0].name);
  await warte(6000); // ein Takt (5 s)
  pruefe("Hintergrund: ungespeicherter Bogen vorn → kein Schlüssel, keine Zählung", ((await hg()) || {}).s === null, JSON.stringify(await hg()));
  // Export bei vorderem Druckbogen übernimmt den Puffer der Arbeitsdatei (FESTLEGUNGEN 2d Punkt 10, unverändert)
  const id = eintrag(m.ad, 240, 3);
  await panelNeu();
  pruefe("Druckbogen vorn: keine Grafikzeile", !(await panelZustand()).grafikZeile);
  // gespeichert: Bogen unter tests/out speichern → weiterhin kein Schlüssel
  const bp = path.join(OUT, "vorlagen", "grafik_bogen.ai");
  await th("speichernUnter", bp);
  await warte(6000);
  pruefe("Hintergrund: gespeicherter Bogen vorn → kein Schlüssel, keine Zählung", (await hg() || {}).p === bp && (await hg()).s === null, JSON.stringify(await hg()));
  await exportieren();
  const xa = await xmpVon(m.ad);
  pruefe("Export bei vorderem Druckbogen übernimmt den Puffer der Arbeitsdatei", xa && xa.grafikzeit.eintraege.some(e => e.minuten === 4) && !(puffer()[m.ad] || []).some(e => e.id === id), JSON.stringify(xa && xa.grafikzeit.eintraege));
});

await schritt("Datensatz: Block grafik (auto/manuell)", async () => {
  await th("aktivieren", m.ad);
  await plusMin("7");
  await panelKlick("btnBerechnen");
  const k = (await xmpVon()).kalkulation;
  const e = (await xmpVon()).grafikzeit.eintraege;
  const auto = e.filter(x => !x.manuell).reduce((s, x) => s + x.minuten, 0), man = e.filter(x => x.manuell).reduce((s, x) => s + x.minuten, 0);
  pruefe("kalkulation.grafik: min_auto und min_manuell = Summen der Einträge", k && k.grafik && Math.abs(k.grafik.min_auto - auto) < 0.01 && Math.abs(k.grafik.min_manuell - man) < 0.01, JSON.stringify(k && k.grafik) + ` erwartet ${auto}/${man}`);
  await evStill("zusammenfassung", "PAM.cep.closeExtension(); true");
});
trennen();
process.exit(0);
