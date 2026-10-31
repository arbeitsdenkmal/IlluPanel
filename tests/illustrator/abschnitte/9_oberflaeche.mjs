// 3.9 Oberfläche (SPEZ_03_Oberflaeche): Panel in jedem Zustand (ohne Dokument, je Auftragsart, Druckbogen vorn, Fremddokument), ausblenden statt sperren,
// Flyout-Menü, alle Fenster einmal geöffnet. Screenshots nach tests/out/screenshots/ (nur abgelegt, nicht bewertet).
import path from "node:path";
import { aktion, th, schritt, pruefe, uebersprungen, OUT, ev, warte, klick, panelNeu, panelZustand, panelFertig, bildschirmfoto, xmpVon, trennen, bis, antworten } from "../lib/basis.mjs";
import { anlegen, panelKlick, textilWaehlen, druckbogenErzeugen, fensterAuf, fensterSchliessen, objektOeffnen, OBJ_BEREIT } from "../lib/ablauf.mjs";

const BILD = n => path.join(OUT, "screenshots", `${n}.png`);
const foto = async (fenster, n) => { try { await bildschirmfoto(fenster, BILD(n)); return true; } catch (e) { return false; } };
const Z3 = ["zuordnen", "berechnen", "schilder", "farbe", "modell"], Z4 = ["summa", "druck", "export", "auftrag"];
const reihe = async ids => ev("panel", `${JSON.stringify(ids)}.map(id => { const e = document.getElementById(id); return e.hidden || e.offsetParent === null ? null : Math.round(e.getBoundingClientRect().width); })`);
const ID = { zuordnen: "btnZuordnen", berechnen: "btnBerechnen", schilder: "btnSchilder", farbe: "btnFarbe", modell: "btnModell", summa: "btnSumma", druck: "btnDruck", export: "btnExport", auftrag: "btnAuftrag", breite: "btnBreite", masken: "btnMasken", nutzen: "btnNutzen" };
let hoehe0 = null;

// erwartet: { z3: [...sichtbar], z4: [...sichtbar], export: true|false (aktiv), z6: [breite, masken, nutzen] aktiv, preis: "zwei"|"eins"|"leer"|null }
async function zustand(name, e) {
  await panelNeu();
  const z = await panelZustand();
  const sicht = ks => ks.filter(k => z[k].sichtbar);
  pruefe(`${name}: Zeile 3 sichtbar ${e.z3.join(" · ") || "leer"}`, JSON.stringify(sicht(Z3)) === JSON.stringify(e.z3), JSON.stringify(sicht(Z3)));
  pruefe(`${name}: Zeile 4 sichtbar ${e.z4.join(" · ")}`, JSON.stringify(sicht(Z4)) === JSON.stringify(e.z4), JSON.stringify(sicht(Z4)));
  pruefe(`${name}: Export ${e.export ? "aktiv und orange" : "gesperrt, nicht orange"}, Auftrag aktiv`, z.export.gesperrt === !e.export && z.export.akzent === e.export && !z.auftrag.gesperrt, JSON.stringify({ ex: z.export, au: z.auftrag.gesperrt }));
  const z6 = [z.breite, z.masken, z.nutzen];
  pruefe(`${name}: Werkzeugzeile vollständig sichtbar, aktiv ${JSON.stringify(e.z6)}`, z6.every(b => b.sichtbar) && JSON.stringify(z6.map(b => !b.gesperrt)) === JSON.stringify(e.z6) && z6.every(b => !b.akzent), JSON.stringify(z6.map(b => ({ s: b.sichtbar, a: !b.gesperrt }))));
  pruefe(`${name}: ausgeblendet statt gesperrt (kein sichtbarer gesperrter Button in Zeile 3/4 außer add ohne Auswahl bzw. Export)`, [...Z3, ...Z4].filter(k => z[k].sichtbar && z[k].gesperrt && !["zuordnen", "export"].includes(k)).length === 0, JSON.stringify([...Z3, ...Z4].filter(k => z[k].sichtbar && z[k].gesperrt)));
  for (const r of [Z3.map(k => ID[k]), Z4.map(k => ID[k]), ["btnBreite", "btnMasken", "btnNutzen"]]) {
    const w = (await reihe(r)).filter(x => x !== null);
    if (w.length > 1) pruefe(`${name}: sichtbare Buttons einer Zeile teilen sich die Breite (gleich breit ± 2 px)`, Math.max(...w) - Math.min(...w) <= 2, JSON.stringify(w));
  }
  if (e.preis === "leer") pruefe(`${name}: Preiszeile leer`, !z.preisMaterial.text && !z.preisMontage.text, `${z.preisMaterial.text} | ${z.preisMontage.text}`);
  const h = await ev("panel", `[document.getElementById("inhalt").getBoundingClientRect().height, document.querySelectorAll("#inhalt > .z").length]`);
  if (hoehe0 === null) hoehe0 = h[0];
  pruefe(`${name}: sechs Zeilen, Höhe fest`, h[1] === 6 && Math.abs(h[0] - hoehe0) < 1, JSON.stringify(h));
  if (e.menue) pruefe(`${name}: Flyout-Menü ${JSON.stringify(e.menue)}`, z.menue && Object.entries(e.menue).every(([k, v]) => z.menue[k] === v), JSON.stringify(z.menue));
  await foto("panel", `panel_${name.replace(/[^\wäöüÄÖÜß-]+/g, "_")}`);
  return z;
}
const ALLE_MENUE = { Logo: true, "VK-CC": true, Gitterscheiben: true, "MB-Nummern": true };
const m = {};

await schritt("Flyout-Menü: Einträge und Reihenfolge", async () => {
  await panelNeu();
  const z = await panelZustand();
  pruefe("Einträge Logo, VK-CC, Gitterscheiben, MB-Nummern in dieser Reihenfolge", z.menue && JSON.stringify(Object.keys(z.menue)) === JSON.stringify(["Logo", "VK-CC", "Gitterscheiben", "MB-Nummern"]), JSON.stringify(z.menue));
  const xml = await ev("panel", `(()=>{ try { return document.querySelectorAll("button#btnLogo, button#btnVkcc, button#btnGitter, button#btnMbnr").length; } catch (e) { return -1; } })()`);
  pruefe("kein zusätzlicher Button im Panel für die Menüeinträge", xml === 0, String(xml));
});

await schritt("Panel ohne Dokument und Fremddokument", async () => {
  await zustand("kein Dokument", { z3: [], z4: ["export", "auftrag"], export: false, z6: [false, false, false], preis: "leer", menue: { Logo: false, "VK-CC": false, Gitterscheiben: true, "MB-Nummern": true } });
  await th("neu", 300, 200);
  const e0 = (await th("dok")).ebenen[0].name;
  await th("zeichnen", [{ ebene: e0, art: "rechteck", x: 10, y: 10, b: 50, h: 30, fuellung: { cmyk: [0, 100, 0, 0] }, name: "Fremdmotiv" }, { ebene: e0, art: "rechteck", x: 9, y: 9, b: 52, h: 32, kontur: { cut: true }, name: "Fremdcut" }]);
  m.fremd = (await th("dok")).name;
  await th("auswahlLeer");
  await zustand("Fremddokument ohne Auswahl", { z3: [], z4: ["export", "auftrag"], export: false, z6: [true, true, false], preis: "leer", menue: ALLE_MENUE });
  await th("auswaehlen", ["Fremdmotiv"]);
  await zustand("Fremddokument mit Auswahl", { z3: [], z4: ["export", "auftrag"], export: false, z6: [true, true, true], preis: "leer" });
});

await schritt("Fenster „Breite“ und „Nutzen“ (Fremddokument)", async () => {
  await th("aktivieren", m.fremd);
  await th("auswaehlen", ["Fremdmotiv"]);
  await panelNeu();
  if (await fensterAuf("breite", () => klick("panel", "#btnBreite"), `!!window.PAM && document.getElementById("ziel").value !== ""`, 30000)) {
    pruefe("Fenster „Breite“ geöffnet", await foto("breite", "fenster_breite"));
    await fensterSchliessen("breite");
  } else pruefe("Fenster „Breite“ geöffnet", false);
  await th("auswaehlen", ["Fremdmotiv", "Fremdcut"]);
  await panelNeu();
  if (await fensterAuf("nutzen", () => klick("panel", "#btnNutzen"), `!!window.PAM && document.querySelectorAll("#format button").length > 0`, 60000)) {
    pruefe("Fenster „Nutzen“ Schritt 1", await foto("nutzen", "fenster_nutzen_1"));
    await ev("nutzen", `(()=>{ document.getElementById("kunde").value="Oberflaeche"; document.getElementById("kunde").dispatchEvent(new Event("input")); return true; })()`);
    await klick("nutzen", "#weiter");
    if (await bis(() => ev("nutzen", `!document.getElementById("schritt2").hidden`), 20000)) await foto("nutzen", "fenster_nutzen_2");
    await fensterSchliessen("nutzen");
  } else pruefe("Fenster „Nutzen“ geöffnet", false);
});

await schritt("Dialog „Auftrag anlegen“", async () => {
  await panelNeu();
  if (await fensterAuf("anlegen", () => klick("panel", "#btnAuftrag"), `!!window.PAM && document.querySelectorAll("#arten .art").length > 0 && !!document.querySelector("#quelle button.an")`, 30000)) {
    const a = await ev("anlegen", `({ arten: [...document.querySelectorAll("#arten .art")].map(b=>b.textContent), quelle: [...document.querySelectorAll("#quelle button")].map(b=>b.textContent), los: document.getElementById("los").textContent })`);
    pruefe("Arten links als Liste (acht, Reihenfolge der Konfiguration), Quelle als drei Segment-Buttons, „Let's go“", JSON.stringify(a.arten) === JSON.stringify(["Fahrzeugbeschriftung", "Beschriftung", "Schild", "Banner/Roll-up", "Lasergravur", "Offset-Daten", "Textil", "Sonstiges"]) && a.quelle.length === 3 && a.los === "Let's go", JSON.stringify(a));
    for (const art of ["fahrzeugbeschriftung", "schild", "offset", "textil", "banner_rollup", "sonstiges"]) {
      await klick("anlegen", `#arten .art[data-id="${art}"]`); await warte(400);
      if (art === "textil") await textilWaehlen("anlegen", "B&C_E190_Men", "erste");
      await foto("anlegen", `dialog_auftrag_${art}`);
    }
    await fensterSchliessen("anlegen");
  } else pruefe("Dialog geöffnet", false);
});

await schritt("Panel flach und Offset", async () => {
  for (const [art, e] of [["sonstiges", { breite: 210, hoehe: 297, anzahl: 1 }], ["lasergravur", {}], ["banner_rollup", { variante: "banner", breite: 500, hoehe: 300, anzahl: 1 }], ["offset", { produkt: "A7", ausrichtung: "hoch", anzahl: 1 }]]) {
    const r = await anlegen({ art, kunde: "Oberflaeche", quelle: "leer", ...e });
    if (!pruefe(`${art} angelegt`, r.ok, r.text || r.grund)) continue;
    await th("auswahlLeer");
    await zustand(art, { z3: [], z4: ["export", "auftrag"], export: true, z6: [true, true, false], preis: "leer", menue: ALLE_MENUE });
    await th("schliessen", null);
  }
});

await schritt("Panel Fahrzeugbeschriftung und Beschriftung; Fenster „Objekt“ und „Zusammenfassung“", async () => {
  const f = await anlegen({ art: "fahrzeugbeschriftung", kunde: "Oberflaeche", quelle: "leer" });
  if (pruefe("Fahrzeugbeschriftung angelegt", f.ok, f.text || f.grund)) {
    await th("auswahlLeer");
    const z = await zustand("Fahrzeugbeschriftung", { z3: ["zuordnen", "berechnen"], z4: ["summa", "druck", "export", "auftrag"], export: true, z6: [false, true, false], menue: ALLE_MENUE });
    pruefe("add ohne Auswahl gesperrt und nicht orange, „Keine Auswahl“ gedimmt", z.zuordnen.gesperrt && !z.zuordnen.akzent && z.objName.text === "Keine Auswahl", JSON.stringify({ zu: z.zuordnen, n: z.objName.text }));
    await th("schliessen", null);
  }
  const b = await anlegen({ art: "beschriftung", kunde: "Oberflaeche", quelle: "leer" });
  if (!pruefe("Beschriftung angelegt", b.ok, b.text || b.grund)) return;
  await th("zeichnen", [{ ebene: "Sandbox", art: "rechteck", x: 0, y: 0, b: 100, h: 50, fuellung: { spot: "070 (751 C)", cmyk: [0, 0, 0, 100] }, name: "Oberflächenobjekt" },
    { ebene: "Print", art: "rechteck", x: 0, y: 100, b: 100, h: 50, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Druckobjekt" }]);
  for (const [k, v] of [["IP_Id", "ob-1"], ["IP_Folie", "3551"], ["IP_Laminat", "matt"]]) await th("tagSetzen", "Druckobjekt", k, v);
  await th("speichern");
  await th("auswaehlen", ["Oberflächenobjekt"]);
  const z = await zustand("Beschriftung mit Auswahl", { z3: ["zuordnen", "berechnen"], z4: ["summa", "druck", "export", "auftrag"], export: true, z6: [true, true, true], menue: ALLE_MENUE });
  pruefe("Orange-Regel: add orange bei nicht zugeordneter Auswahl, berechnen nicht", z.zuordnen.akzent && !z.berechnen.akzent, JSON.stringify({ zu: z.zuordnen.akzent, be: z.berechnen.akzent }));
  const o = await objektOeffnen(["Oberflächenobjekt"]);
  if (o.auf) {
    await foto("objekt", "fenster_objekt_digitaldruck");
    await ev("objekt", `(()=>{ const b=[...document.querySelectorAll("#arten button")].find(x=>x.textContent==="Plott"); if(b) b.click(); return true; })()`);
    await warte(400); await foto("objekt", "fenster_objekt_plott");
    await fensterSchliessen("objekt");
  } else pruefe("Fenster „Objekt“ geöffnet", false);
  await th("auswaehlen", ["Druckobjekt"]);
  const z2 = await zustand("Beschriftung zugeordnete Auswahl", { z3: ["zuordnen", "berechnen"], z4: ["summa", "druck", "export", "auftrag"], export: true, z6: [true, true, true] });
  pruefe("edit, berechnen orange", z2.zuordnen.text === "edit" && z2.berechnen.akzent && !z2.zuordnen.akzent, JSON.stringify({ zu: z2.zuordnen, be: z2.berechnen.akzent }));
  await panelKlick("btnBerechnen");
  if (await fensterAuf("zusammenfassung", null, "!!window.PAM && document.querySelectorAll('#objekte tr').length > 0", 30000)) {
    pruefe("Fenster „Zusammenfassung“ geöffnet", await foto("zusammenfassung", "fenster_zusammenfassung"));
    await fensterSchliessen("zusammenfassung");
  } else pruefe("Fenster „Zusammenfassung“ geöffnet", false);
  const z3 = await zustand("Beschriftung berechnet", { z3: ["zuordnen", "berechnen"], z4: ["summa", "druck", "export", "auftrag"], export: true, z6: [true, true, true] });
  pruefe("zwei Preise (Material, inkl. Mont.)", /^Material/.test(z3.preisMaterial.text) && /^inkl\. Mont\./.test(z3.preisMontage.text), `${z3.preisMaterial.text} | ${z3.preisMontage.text}`);
  m.besch = (await th("dok")).pfad;
});

await schritt("Panel Druckbogen vorn und Nutzen-Bogen vorn", async () => {
  if (m.besch) {
    await th("aktivieren", m.besch);
    await panelKlick("btnDruck");
    await zustand("Druckbogen vorn", { z3: [], z4: ["export", "auftrag"], export: true, z6: [false, false, false], preis: "leer", menue: { Logo: false, "VK-CC": false, Gitterscheiben: false, "MB-Nummern": false } });
    pruefe("keine Grafikzeile bei Druckbogen vorn", !(await panelZustand()).grafikZeile);
  }
  await th("aktivieren", m.fremd);
  await th("auswaehlen", ["Fremdmotiv", "Fremdcut"]);
  await panelNeu();
  if (await fensterAuf("nutzen", () => klick("panel", "#btnNutzen"), `!!window.PAM && document.querySelectorAll("#format button").length > 0`, 60000)) {
    await ev("nutzen", `(()=>{ const k=document.getElementById("kunde"); k.value="Oberflaeche"; k.dispatchEvent(new Event("input")); return true; })()`);
    await klick("nutzen", "#weiter");
    await bis(() => ev("nutzen", `!document.getElementById("schritt2").hidden`), 20000);
    aktion("Nutzen Aufbauen");
    await klick("nutzen", "#aufbauen");
    await bis(async () => !(await ev("nutzen", "true").catch(() => false)), 90000);
    await panelFertig(30000);
    const z = await zustand("Nutzen-Bogen vorn", { z3: [], z4: ["export", "auftrag"], export: true, z6: [false, false, false], preis: "leer" });
    pruefe("Kopf „<Kunde> · Nutzen <Produkt> · n/m“ ohne Grafikzeile", /Oberflaeche · Nutzen Aufkleber · \d+\/\d+/.test(z.kopf) && !z.grafikZeile, z.kopf);
  } else pruefe("Nutzen-Bogen aufgebaut", false);
});

await schritt("Panel Schild; Fenster „Schilder“", async () => {
  const r = await anlegen({ art: "schild", kunde: "Oberflaeche", quelle: "leer", verfahren: "folie", material: "acryl-5" });
  if (!pruefe("Schild angelegt", r.ok, r.text || r.grund)) return;
  await th("zeichnen", [{ ebene: "Digitaldruck", art: "rechteck", x: 20, y: 20, b: 50, h: 30, fuellung: { cmyk: [0, 50, 0, 0] }, name: "Schildmotiv" }]);
  for (const [k, v] of [["IP_Id", "ob-s"], ["IP_Folie", "3551"], ["IP_Laminat", "matt"]]) await th("tagSetzen", "Schildmotiv", k, v);
  await th("speichern");
  await th("auswahlLeer");
  await zustand("Schild", { z3: ["zuordnen", "schilder"], z4: ["summa", "druck", "export", "auftrag"], export: true, z6: [true, true, false], preis: "leer", menue: ALLE_MENUE });
  await panelNeu();
  if (await fensterAuf("schilder", () => klick("panel", "#btnSchilder"), `!!window.PAM && document.querySelectorAll("#zeilen .schild").length > 0`, 30000)) {
    pruefe("Fenster „Schilder“ geöffnet", await foto("schilder", "fenster_schilder"));
    await fensterSchliessen("schilder");
  } else pruefe("Fenster „Schilder“ geöffnet", false);
  await th("schliessen", null);
});

await schritt("Panel Textil; Fenster „Motiv“, „Textilfarbe“, „Modell“", async () => {
  const r = await anlegen({ art: "textil", kunde: "Oberflaeche", quelle: "leer", textil: () => textilWaehlen("anlegen", "B&C_E190_Men", "erste") });
  if (!pruefe("Textil angelegt", r.ok, r.text || r.grund)) return;
  await th("zeichnen", [{ ebene: "Design", art: "rechteck", x: 10, y: 10, b: 8, h: 4, fuellung: { cmyk: [0, 0, 0, 100] }, name: "Oberflächenmotiv" }]);
  await th("speichern");
  await th("auswahlLeer");
  await zustand("Textil", { z3: ["zuordnen", "berechnen", "farbe", "modell"], z4: ["summa", "export", "auftrag"], export: true, z6: [true, true, false], menue: ALLE_MENUE });
  const o = await objektOeffnen(["Oberflächenmotiv"], "motiv");
  if (o.auf && await bis(() => ev("motiv", `document.querySelectorAll("#verfahren button").length === 4`), 15000)) {
    await foto("motiv", "fenster_motiv_dtf");
    await ev("motiv", `(()=>{ const b=[...document.querySelectorAll("#verfahren button")].find(x=>x.textContent==="Flex"); if(b) b.click(); return true; })()`);
    await warte(400); await foto("motiv", "fenster_motiv_flex");
    pruefe("Fenster „Motiv“ geöffnet", true);
    await fensterSchliessen("motiv");
  } else pruefe("Fenster „Motiv“ geöffnet", false);
  await panelNeu();
  if (await fensterAuf("textilfarbe", () => klick("panel", "#btnFarbe"), `!!window.PAM && document.querySelectorAll(".tw-kachel").length > 0`, 30000)) {
    pruefe("Fenster „Textilfarbe“ geöffnet", await foto("textilfarbe", "fenster_textilfarbe"));
    await fensterSchliessen("textilfarbe");
  } else pruefe("Fenster „Textilfarbe“ geöffnet", false);
  await panelNeu();
  if (await fensterAuf("modell", () => klick("panel", "#btnModell"), `!!window.PAM && document.querySelectorAll(".tw-knopf").length > 0`, 30000)) {
    await textilWaehlen("modell", "Promodoro_Hoodie", "erste");
    pruefe("Fenster „Modell“ geöffnet", await foto("modell", "fenster_modell"));
    await fensterSchliessen("modell");
  } else pruefe("Fenster „Modell“ geöffnet", false);
  await th("schliessen", null);
});

await schritt("Fenster „WEA-Etiketten“ und „Bögl Nummern“", async () => {
  await panelNeu();
  await panelFertig(60000); // nach dem Schließen des Textil-Dokuments ist Illustrator noch beschäftigt
  if (await fensterAuf("gitter", () => ev("panel", `setTimeout(() => PAM_TEST.menueKlick("gitter"), 10); true`), `!!window.PAM && !!document.getElementById("hinzu")`, 60000)) {
    pruefe("Fenster „WEA-Etiketten“ geöffnet", await foto("gitter", "fenster_wea_etiketten"));
    await fensterSchliessen("gitter");
  } else pruefe("Fenster „WEA-Etiketten“ geöffnet", false);
  await panelNeu();
  if (await fensterAuf("mbnr", () => ev("panel", `setTimeout(() => PAM_TEST.menueKlick("mbnr"), 10); true`), `!!window.PAM && document.querySelectorAll("#nummern input").length > 0`, 60000)) {
    pruefe("Fenster „Bögl Nummern“ geöffnet", await foto("mbnr", "fenster_boegl_nummern"));
    await fensterSchliessen("mbnr");
  } else pruefe("Fenster „Bögl Nummern“ geöffnet", false);
});
trennen();
process.exit(0);
