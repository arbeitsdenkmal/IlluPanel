// 3.7 Textil (SPEZ_03_Textil, SPEZ_03_Oberflaeche §6, §7, §9, §10): alle MockUps einmal anlegen (ID-Prüfung, Ebenen, Anker); an einem Modell vollständig:
// Motiv-Fenster mit DTF, Flex, Flock, Stick, blockout, Kinder, Namen; Textilfarbe; Modell hinzufügen; berechnen Flex/Flock; Summa-Streifen mit Grenze 1500 mm
// und mehrfarbigem Motiv; Export DTF/Stick/Namen/Korrekturabzug, DTF-Sammelordner; Modell ohne Realmaß (Neutral_Kids); Modell ohne Farbliste (Kundenware).
import fs from "node:fs";
import path from "node:path";
import { aktion, th, schritt, pruefe, uebersprungen, ROOT, ZIEL, liste, nah, ev, warte, klick, marke, meldungsText, panelNeu, panelZustand, panelFertig, xmpVon, trennen, bis, pdfInfo } from "../lib/basis.mjs";
import { anlegen, arbeitsdateiPruefen, exportieren, panelKlick, pdfPruefen, serverOrdner, lokalOrdner, dateiname, textilWaehlen, objektOeffnen, fensterAuf, fensterZu, fensterSchliessen } from "../lib/ablauf.mjs";

const KUNDE = "Textiltest", KD = dateiname(KUNDE);
const csv = n => { const z = fs.readFileSync(path.join(ROOT, "config", n), "utf8").trim().split(/\r?\n/).map(l => l.split(";")); return z.slice(1).map(r => Object.fromEntries(z[0].map((k, i) => [k, r[i] || ""]))); };
const MODELLE = csv("textil_modelle.csv"), FARBEN = csv("textil_farben.csv");
const MOCKUPS = new Set(fs.readdirSync(path.join(ROOT, "config", "mockups")).filter(n => n.endsWith(".ai")).map(n => n.slice(0, -3)));
const schliessen = async () => { try { await th("schliessen", null); } catch (e) { /* zu */ } };
const m = {};

// ---------- Fenster „Motiv“ ----------
const MOTIV_BEREIT = `!!window.PAM && document.querySelectorAll("#verfahren button").length === 4`;
const mv = expr => ev("motiv", expr);
async function motivOeffnen(name) {
  const r = await objektOeffnen([name], "motiv");
  if (!r.auf) return false;
  return bis(() => mv(MOTIV_BEREIT), 15000);
}
const motivKnopf = (sel, text) => mv(`(()=>{ const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent===${JSON.stringify(text)} || (x.title||"").startsWith(${JSON.stringify(text)})); if(!b||b.disabled) return false; b.click(); return true; })()`);
async function zeileSetzen(i, s) {
  const z = `#stufenBody tr[data-i="${i}"]`;
  const set = async (f, w, evn) => mv(`(()=>{ const e=document.querySelector(${JSON.stringify(`${z} [data-f="${f}"]`)}); if(!e) return false; if (e.type==="checkbox") e.checked=${JSON.stringify(!!w)}; else e.value=${JSON.stringify(String(w))}; e.dispatchEvent(new Event(${JSON.stringify(evn)})); return true; })()`);
  if (s.wahl) await set("wahl", s.wahl, "change");
  if (s.mass !== undefined) await set("mass_mm", s.mass, "input");
  if (s.kinder_cm !== undefined) await set("kinder_cm", s.kinder_cm, "input");
  if (s.bezug) await set("bezug", s.bezug, "change");
  if (s.menge !== undefined) await set("menge", s.menge, "input");
  if (s.groessen !== undefined) await set("groessen", s.groessen, "input");
  if (s.blockout !== undefined) await set("blockout", s.blockout, "change");
}
// spec { position, verfahren, flexfarben: [..], komplex: "K1", stufen: [...] }
async function motivSetzen(sp) {
  if (sp.position) await motivKnopf("#pillenVorn button, #pillenHinten button, #ohnePosition button", sp.position);
  if (sp.verfahren) await motivKnopf("#verfahren button", sp.verfahren);
  await warte(200);
  if (sp.flexfarben) await mv(`(()=>{ const w=${JSON.stringify(sp.flexfarben)}; [...document.querySelectorAll("#farben input")].forEach((i,k)=>{ if (w[k]!==undefined) { i.value=w[k]; i.dispatchEvent(new Event("input")); } }); return true; })()`);
  if (sp.komplex) await motivKnopf("#komplex button", sp.komplex);
  for (let i = 0; i < (sp.stufen || []).length; i++) {
    if (i > 0) { await klick("motiv", "#stufePlus"); await warte(200); }
    await zeileSetzen(i, sp.stufen[i]);
  }
  await warte(200);
}
const motivZustand = () => mv(`({ hinweis: document.getElementById("hinweis").textContent, ok: !document.getElementById("ok").disabled, summe: document.getElementById("summe").innerText,
  flex: !document.getElementById("flexR").hidden, farben: document.querySelectorAll("#farben input").length, serie: document.getElementById("serieFest").textContent || document.getElementById("serie").value,
  blockoutKopf: document.getElementById("thBlockout").textContent, verfahren: [...document.querySelectorAll("#verfahren button")].map(b=>({ t: b.textContent, an: b.classList.contains("an"), aus: b.disabled })),
  sub: document.getElementById("stufenSub").textContent })`);
async function motivOk() { aktion("OK Motiv"); const mk = marke(); await klick("motiv", "#ok"); const zu = await fensterZu("motiv", 60000); await panelFertig(30000); return { zu, text: meldungsText(mk) }; }
const stufenVon = async n => { const t = (await th("tags", n)).tags; return { t, st: t.IP_Stufen ? JSON.parse(t.IP_Stufen) : null }; };

// ---------- alle MockUps ----------
const liste32 = MODELLE.filter(x => MOCKUPS.has(x.modell));
await schritt("Bestand MockUps", async () => {
  pruefe(`MockUps für alle Modelle der CSV (${liste32.length} von ${MODELLE.length}), 32 erwartet`, liste32.length === 32, MODELLE.filter(x => !MOCKUPS.has(x.modell)).map(x => x.modell).join(", "));
});
for (const md of liste32) {
  await schritt(`MockUp ${md.modell}`, async () => {
    const hatFarben = FARBEN.some(f => f.id === md.id);
    const r = await anlegen({ art: "textil", kunde: KUNDE, quelle: "leer", textil: () => textilWaehlen("anlegen", md.modell, hatFarben ? "erste" : null) });
    if (!pruefe("angelegt, keine Meldung (ID-Prüfung bestanden)", r.ok && !r.text, r.text || r.grund)) return;
    const d = await th("dok"), x = d.xmp ? JSON.parse(d.xmp) : null;
    pruefe(`Datei Korrekturabzug_${md.id}.ai`, new RegExp(`^Korrekturabzug_${md.id.replace(/[&]/g, "\\&")}(_\\d\\d)?\\.ai$`).test(path.basename(d.pfad || "")), d.pfad);
    pruefe("Ebenen Anker, ID, Stofffarbe, Textil, Infos, Design; aktive Ebene Design", ["Anker", "ID", "Stofffarbe", "Infos", "Design"].every(n => d.ebenen.some(e => e.name === n)) && d.aktiveEbene === "Design", `${d.ebenen.map(e => e.name).join(", ")}; aktiv ${d.aktiveEbene}`);
    const anker = d.ebenen.find(e => e.name === "Anker");
    pruefe("Anker vorhanden", anker && (anker.objekte + anker.unterebenen) > 0, JSON.stringify(anker));
    const faktor = md.realmass_mm ? Number(md.realmass_mm.replace(",", ".")) / Number(md.dateimass_mm.replace(",", ".")) : null;
    pruefe("XMP textil.modell (id, modell, bezeichnung, marke, faktor)", x && x.textil && x.textil.modell.id === md.id && x.textil.modell.modell === md.modell && x.textil.modell.marke === md.modell.split("_")[0]
      && (faktor === null ? x.textil.modell.faktor === null : nah(x.textil.modell.faktor, faktor, 0.01)), JSON.stringify(x && x.textil));
    pruefe("Maßstab 1:1, Auftragsordner JJJJ-MM-TT_Textil", x && x.massstab === 1 && /^\d{4}-\d\d-\d\d_Textil(_\d\d)?$/.test(x.ablage.auftragsordner), x && x.ablage.auftragsordner);
    await schliessen();
  });
}

// ---------- ein Modell vollständig ----------
await schritt("Arbeitsdatei B&C_E190_Men mit Motiven", async () => {
  const r = await anlegen({ art: "textil", kunde: KUNDE, quelle: "leer", textil: () => textilWaehlen("anlegen", "B&C_E190_Men", "erste") });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const d = await th("dok");
  m.pfad = d.pfad; m.x = JSON.parse(d.xmp); m.ordner = path.dirname(d.pfad);
  await th("zeichnen", [
    { ebene: "Design", art: "rechteck", x: 10, y: 10, b: 8, h: 4, fuellung: { cmyk: [100, 50, 0, 0] }, name: "Brustlogo" },
    { ebene: "Design", art: "rechteck", x: 30, y: 10, b: 12, h: 6, fuellung: { cmyk: [0, 0, 0, 0] }, gruppe: "Rückenschrift" },
    { ebene: "Design", art: "rechteck", x: 44, y: 10, b: 12, h: 6, fuellung: { cmyk: [0, 100, 100, 0] }, gruppe: "Rückenschrift" },
    { ebene: "Design", art: "rechteck", x: 10, y: 30, b: 5, h: 5, fuellung: { cmyk: [0, 0, 0, 100] }, name: "Ärmeldruck" },
    { ebene: "Design", art: "rechteck", x: 30, y: 30, b: 6, h: 4, fuellung: { cmyk: [0, 60, 100, 0] }, name: "Stickerei" },
    { ebene: "Design", art: "rechteck", x: 10, y: 50, b: 10, h: 6, fuellung: { cmyk: [60, 0, 100, 0] }, name: "Kinderlogo" },
    { ebene: "Design", art: "text", x: 30, y: 50, text: "Anna", groesse: 6, gruppe: "Namen" },
    { ebene: "Design", art: "text", x: 30, y: 58, text: "Bernd", groesse: 6, gruppe: "Namen" },
    { ebene: "Design", art: "text", x: 30, y: 66, text: "Christina", groesse: 6, gruppe: "Namen" },
    { ebene: "Design", art: "rechteck", x: 50, y: 50, b: 4, h: 4, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Ohne Zuordnung" }
  ]);
  await th("speichern");
  await panelNeu();
  const z = await panelZustand();
  pruefe("Panel Textil: add/edit · berechnen · Farbe · Modell; Summa · Export · Auftrag (Druck ausgeblendet)", z.zuordnen.sichtbar && z.berechnen.sichtbar && z.farbe.sichtbar && z.modell.sichtbar && z.summa.sichtbar && !z.druck.sichtbar && z.export.sichtbar, JSON.stringify({ b: z.berechnen.sichtbar, f: z.farbe.text, d: z.druck.sichtbar }));
  pruefe("Button „Farbe“ mit Name der Textilfarbe", z.farbe.text === m.x.textil.farbe.name, `${z.farbe.text} / ${m.x.textil.farbe.name}`);
});

await schritt("Motiv DTF mit zwei Druckgrößen und blockout", async () => {
  if (!(await motivOeffnen("Brustlogo"))) return pruefe("Fenster „Motiv“ geöffnet", false);
  const v0 = await motivZustand();
  pruefe("neues Motiv: erste Position vorbelegt, Verfahren fehlt", /Verfahren/.test(v0.hinweis) && !v0.ok, v0.hinweis);
  await motivSetzen({ position: "Brust links", verfahren: "DTF", stufen: [{ wahl: "90", menge: 10, groessen: "S-XL" }, { wahl: "frei", mass: 110, menge: 5, groessen: "XXL", blockout: true }] });
  const v = await motivZustand();
  pruefe("DTF: ohne Flex-Bereich, blockout-Spalte, Summenzeile „Gesamt 15 Stück in 2 Druckgrößen · DTF · Anker Brust_links“", !v.flex && v.blockoutKopf === "blockout" && /Gesamt 15 Stück in 2 Druckgrößen · DTF · Anker Brust_links/.test(v.summe) && v.ok, JSON.stringify(v));
  const r = await motivOk();
  pruefe("OK", r.zu, r.text);
  const { t, st } = await stufenVon("Brustlogo");
  pruefe("Tags IP_Position, IP_Verfahren DTF, IP_Stufen (90/10, 110/5 blockout, zeigen erste), kein IP_Folie/IP_Anzahl", t.IP_Position === "Brust links" && t.IP_Verfahren === "DTF" && st && st.length === 2 && st[0].mass_mm === 90 && st[0].menge === 10 && st[0].zeigen && st[1].mass_mm === 110 && st[1].blockout && !t.IP_Folie && !t.IP_Anzahl, JSON.stringify(t));
  const o = (await th("objekte", null, "Design")).objekte.find(x => x.name === "Brustlogo");
  pruefe("skaliert auf Realmaß / Faktor (90 mm / Faktor)", o && nah(o.gb[2] - o.gb[0], 90 / m.x.textil.modell.faktor, 0.05), o && `${(o.gb[2] - o.gb[0]).toFixed(2)} mm, Soll ${(90 / m.x.textil.modell.faktor).toFixed(2)}`);
  await panelNeu();
  const z = await panelZustand();
  pruefe("Objektzeile „Brust links · DTF“ ×15", /Brust links · DTF/.test(z.objFolie.text) && z.objAnzahl.text === "×15", JSON.stringify({ f: z.objFolie.text, a: z.objAnzahl.text }));
});

await schritt("Motiv Flex mehrfarbig, Flock, Stick, Kinder, Namen", async () => {
  if (await motivOeffnen("Rückenschrift")) {
    await motivSetzen({ position: "Rücken", verfahren: "Flex" });
    const v = await motivZustand();
    pruefe("Flex: Serie eine → angezeigt (PoliTape Turbo), zwei Farben im Objekt, OK gesperrt (Fuß: erste offene Warnung, „Menge fehlt“ vor „Flexfarbe fehlt“)", v.flex && v.serie === "PoliTape Turbo" && v.farben === 2 && /Menge fehlt|Flexfarbe fehlt/.test(v.hinweis) && !v.ok, JSON.stringify(v));
    await motivSetzen({ flexfarben: ["Weiss", "Rot"], komplex: "K1", stufen: [{ wahl: "300", menge: 80, groessen: "M-XL" }] });
    const r = await motivOk();
    pruefe("Flex OK", r.zu, r.text);
    const { t } = await stufenVon("Rückenschrift");
    pruefe("Tags IP_Folie PoliTape Turbo, IP_Farbe zwei Flexfarben, IP_Komplexitaet 1", t.IP_Folie === "PoliTape Turbo" && Object.values(JSON.parse(t.IP_Farbe || "{}")).sort().join(",") === "Rot,Weiss" && t.IP_Komplexitaet === "1", JSON.stringify(t));
  } else pruefe("Fenster Rückenschrift", false);
  if (await motivOeffnen("Ärmeldruck")) {
    await motivSetzen({ position: "Ärmel links", verfahren: "Flock", flexfarben: ["Schwarz"], stufen: [{ wahl: "75", menge: 4 }] });
    const v = await motivZustand();
    pruefe("Flock: Serie VelCutPro", v.serie === "VelCutPro" && v.ok, JSON.stringify(v));
    await motivOk();
  }
  if (await motivOeffnen("Stickerei")) {
    await motivSetzen({ position: "Brust rechts", verfahren: "Stick", stufen: [{ wahl: "75", menge: 6 }] });
    const v = await motivZustand();
    pruefe("Stick: ohne blockout-Spalte", v.blockoutKopf === "" && v.ok, JSON.stringify(v));
    await motivOk();
  }
  if (await motivOeffnen("Kinderlogo")) {
    await motivSetzen({ position: "Front", verfahren: "DTF", stufen: [{ wahl: "kinder", kinder_cm: 140, menge: 8 }] });
    await motivOk();
    const { st } = await stufenVon("Kinderlogo");
    pruefe("Kinder: koerpergroesse_cm 140, Maß aus kinder_faktor", st && st[0].koerpergroesse_cm === 140 && st[0].mass_mm > 0, JSON.stringify(st));
    // beim Öffnen wieder als „Kinder“
    if (await motivOeffnen("Kinderlogo")) {
      const w = await mv(`document.querySelector('#stufenBody [data-f="wahl"]').value`);
      pruefe("beim Öffnen wieder „Kinder“", w === "kinder", w);
      await fensterSchliessen("motiv");
    }
  }
  if (await motivOeffnen("Namen")) {
    await motivSetzen({ position: "Namen" });
    const v = await motivZustand();
    pruefe("Namen: nur DTF wählbar", v.verfahren.filter(x => !x.aus).map(x => x.t).join(",") === "DTF", JSON.stringify(v.verfahren));
    await motivSetzen({ verfahren: "DTF", stufen: [{ wahl: "frei", mass: 200, menge: 3 }] });
    await motivOk();
    pruefe("Namen zugeordnet", (await th("tags", "Namen")).tags.IP_Position === "Namen", JSON.stringify((await th("tags", "Namen")).tags));
  }
  // Mehrfachauswahl: Popup „Bitte gruppieren“
  await th("auswaehlen", ["Brustlogo", "Stickerei"]);
  await panelNeu();
  const mk = marke();
  await klick("panel", "#btnZuordnen");
  await warte(4000);
  const offenM = await bis(async () => (await ev("motiv", "true").catch(() => false)), 3000);
  const txt = meldungsText(mk);
  pruefe("zwei Objekte: Popup „Bitte gruppieren: …“", /Bitte gruppieren/.test(txt), txt);
  if (offenM) await fensterSchliessen("motiv");
  await th("speichern");
});

await schritt("Textilfarbe", async () => {
  await th("aktivieren", m.pfad);
  await panelNeu();
  const auf = await fensterAuf("textilfarbe", () => klick("panel", "#btnFarbe"), `!!window.PAM && document.querySelectorAll(".tw-kachel").length > 0`, 30000);
  if (!pruefe("Fenster „Textilfarbe“ geöffnet", auf)) return;
  const s = await ev("textilfarbe", `({ an: (document.querySelector(".tw-kachel.an")||{}).title, n: document.querySelectorAll(".tw-kachel").length, spalten: getComputedStyle(document.querySelector(".tw-raster")).gridTemplateColumns.split(" ").length })`);
  pruefe("aktuelle Farbe vorgewählt, 5 Spalten", s.an === m.x.textil.farbe.name && s.spalten === 5, JSON.stringify(s));
  const neu = FARBEN.filter(f => f.id === "E190m" && f.farbe !== m.x.textil.farbe.name)[1];
  await ev("textilfarbe", `(()=>{ const k=[...document.querySelectorAll(".tw-kachel")].find(x=>x.title===${JSON.stringify(neu.farbe)}); if(k) k.click(); return !!k; })()`);
  aktion("Textilfarbe OK");
  await klick("textilfarbe", "#ok");
  await fensterZu("textilfarbe", 30000); await panelFertig(20000);
  const x = await xmpVon();
  const cmyk = [neu.c, neu.m, neu.y, neu.k].map(Number);
  pruefe("XMP textil.farbe = neue Farbe mit CMYK", x.textil.farbe.name === neu.farbe && JSON.stringify(x.textil.farbe.cmyk) === JSON.stringify(cmyk), JSON.stringify(x.textil.farbe));
  const f = (await th("pfadFarben", null, "Stofffarbe")).pfade.filter(p => p.fuellung);
  // Illustrator liefert die Farbwerte mit 32-Bit-Rauschen (2.99999993 statt 3): Vergleich auf 0,01
  const gleich = p => /^cmyk:/.test(p.fuellung || "") && p.fuellung.slice(5).split("/").map(Number).every((v, i) => Math.abs(v - cmyk[i]) < 0.01);
  pruefe("gefüllte Pfade der Ebene „Stofffarbe“ umgefärbt", f.length > 0 && f.every(gleich), JSON.stringify(f.slice(0, 3)));
  await panelNeu();
  pruefe("Panel-Button „Farbe“ zeigt die neue Farbe", (await panelZustand()).farbe.text === neu.farbe, (await panelZustand()).farbe.text);
});

await schritt("berechnen Flex/Flock", async () => {
  await th("aktivieren", m.pfad);
  const r = await panelKlick("btnBerechnen");
  const k = (await xmpVon()).kalkulation;
  if (!pruefe("Datensatz Textil", k && k.auftragsart === "textil", r.text)) return;
  pruefe("Hinweis: Objekt auf „Design“ ohne Zuordnung", /ohne Zuordnung|Zuordnung/.test(r.text), r.text);
  pruefe("objekte je Motiv und Druckgröße (DTF/Stick mit null-Beträgen)", k.objekte.length >= 7 && k.objekte.some(o => o.verfahren === "DTF" && o.betraege === null || (o.betraege && o.betraege.produkt_vk === null)), k.objekte.map(o => `${o.name}/${o.verfahren}/${o.druckgroesse && o.druckgroesse.mass_mm}`).join(", "));
  pruefe("Folien je Farbschlüssel: PoliTape Turbo-Weiss, -Rot, VelCutPro-Schwarz mit Streifen", ["PoliTape Turbo-Weiss", "PoliTape Turbo-Rot", "VelCutPro-Schwarz"].every(s => k.folien.some(f => f.schluessel === s && f.streifen >= 1)), JSON.stringify(k.folien.map(f => [f.schluessel, f.streifen, f.lfm])));
  pruefe("Preis in inkl_montage, nur_aufkleber null, rundung 0,1, auftrag.textilzahl und falten_min", k.preise.vk.nur_aufkleber === null && k.preise.vk.inkl_montage.brutto > 0 && k.rundung === 0.1 && k.auftrag.textilzahl > 0 && k.auftrag.falten_min >= 0, JSON.stringify({ p: k.preise.vk, r: k.rundung, a: k.auftrag }));
  pruefe("Mindestbetrag je Exemplar: gerundet ≥ 5,40 × Exemplare Flex/Flock", k.preise.vk.inkl_montage.gerundet >= 5.4 * (80 + 4) - 0.001, String(k.preise.vk.inkl_montage.gerundet));
  pruefe("Datensatz textil { modell, farbe }", k.textil && k.textil.modell && k.textil.modell.id === "E190m", JSON.stringify(k.textil));
  await panelNeu();
  const z = await panelZustand();
  pruefe("Panel: ein Preis rechts „Preis <netto> <brutto>“, links leer", z.preisMontage.text.startsWith("Preis") && !z.preisMaterial.text, `${z.preisMaterial.text} | ${z.preisMontage.text}`);
  if (await bis(() => ev("zusammenfassung", "document.querySelectorAll('#objekte tr').length > 0").catch(() => false), 15000)) {
    const t = await ev("zusammenfassung", `({ kopf: document.getElementById("kopfzeile").innerText, zeilen: document.querySelectorAll("#objekte tr").length, kalk: document.getElementById("kalk").innerText })`);
    pruefe("Zusammenfassung Textil: Spalten Motiv · Position · Verfahren · Maß mm · Menge · Textilgrößen · K · Teile · Betrag", ["Motiv", "Position", "Verfahren", "Maß mm", "Menge", "Textilgrößen", "K", "Teile", "Betrag"].every(s => t.kopf.includes(s)), t.kopf);
    pruefe("Summen mit Pressen, Falten, Preis", /Pressen/.test(t.kalk) && /Falten/.test(t.kalk) && /Preis/.test(t.kalk), t.kalk.slice(0, 400));
    await fensterSchliessen("zusammenfassung");
  } else uebersprungen("Zusammenfassung Textil", "Fenster nicht offen");
});

await schritt("Summa: Streifen je Farbschlüssel bis 1500 mm", async () => {
  await th("aktivieren", m.pfad);
  const r = await panelKlick("btnSumma");
  const so = serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), d = liste(so);
  const weiss = d.filter(n => n.startsWith(`${KD}_PoliTape Turbo-Weiss_cut_`)), rot = d.filter(n => n.startsWith(`${KD}_PoliTape Turbo-Rot_cut_`)), fl = d.filter(n => n.startsWith(`${KD}_VelCutPro-Schwarz_cut_`));
  pruefe("Dateien <Kunde>_<Serie>-<Farbe>_cut_NN.pdf je Farbschlüssel, weitere Streifen über 1500 mm", weiss.length >= 2 && rot.length >= 2 && fl.length >= 1, `${d.filter(n => /_cut_/.test(n)).join(", ")} · ${r.text}`);
  for (const n of weiss.concat(fl)) {
    const i = pdfInfo(path.join(so, n));
    pruefe(`${n}: Breite 480, Länge ≤ 1500`, nah(i.boxen[0].media[0], 480, 0.5) && i.boxen[0].media[1] <= 1500.5, JSON.stringify(i.boxen[0]));
  }
  // mehrfarbig: Passermarken im Streifen der zweiten Farbe
  if (rot.length) {
    await th("oeffnen", path.join(so, rot[0]));
    const p = (await th("pfadFarben", null, null)).pfade.filter(x => x.fuellung);
    const q = p.filter(x => { const b = x.vb[2] - x.vb[0], h = x.vb[1] - x.vb[3]; return Math.abs(b - h) < 0.2 && [30, 20, 15, 10, 5].some(s => nah(b, s, 0.3)); });
    pruefe("Passermarken: je Exemplar zwei Quadrate im Streifen", q.length >= 2 && q.length % 2 === 0, `${q.length} Quadrate, ${p.length} gefüllte Pfade`);
    await th("schliessen", null);
  }
});

await schritt("Modell hinzufügen", async () => {
  await th("aktivieren", m.pfad);
  await panelNeu();
  const auf = await fensterAuf("modell", () => klick("panel", "#btnModell"), `!!window.PAM && document.querySelectorAll(".tw-knopf").length > 0`, 30000);
  if (!pruefe("Fenster „Modell“ geöffnet", auf)) return;
  await textilWaehlen("modell", "Promodoro_Hoodie", "erste");
  aktion("Modell OK");
  await klick("modell", "#ok");
  await fensterZu("modell", 90000); await panelFertig(30000);
  const d = await th("dok"), x = JSON.parse(d.xmp || "null");
  pruefe("neue Arbeitsdatei Korrekturabzug_PHood.ai im selben Auftragsordner, aktiv, gleiche Ablage", path.basename(d.pfad) === "Korrekturabzug_PHood.ai" && path.dirname(d.pfad) === m.ordner && x && x.ablage.auftragsordner === m.x.ablage.auftragsordner && x.kunde === KUNDE && x.textil.modell.id === "PHood", d.pfad);
  m.zweit = d.pfad;
});

await schritt("Export Textil (DTF, Stick, Namen, Korrekturabzug, DTF-Sammelordner)", async () => {
  await th("aktivieren", m.pfad);
  const r = await exportieren();
  const so = serverOrdner(m.x.ablage.kundenordner, m.x.ablage.auftragsordner), d = liste(so);
  pruefe("Export ohne Fehlermeldung", !/fehlt|leer|zu breit|zu hoch|Fehler/.test(r.text), r.text);
  const id = "_E190m";
  const erw = [`10x_${KD}_Brust links_90${id}.pdf`, `5x_${KD}_Brust links_110_blockout${id}.pdf`, `6x_${KD}_Brust rechts_75${id}.pdf`, `${KD}_Korrekturabzug${id}.pdf`];
  pruefe("Dateien mit _<ID> (zwei Korrekturabzüge im Ordner): DTF, blockout, Stick, Korrekturabzug", erw.every(n => d.includes(n)), `fehlt: ${erw.filter(n => !d.includes(n)).join(", ")} · vorhanden: ${d.filter(n => /\.pdf$/.test(n)).join(", ")}`);
  pruefe("Kinder-DTF und Namen-Bogen (Menge = Zahl der Namen)", d.some(n => new RegExp(`^8x_${KD}_Front_\\d+(,\\d)?${id}\\.pdf$`).test(n)) && d.some(n => new RegExp(`^3x_${KD}_Namen_200${id}\\.pdf$`).test(n)), d.filter(n => /Front|Namen/.test(n)).join(", "));
  pruefe("Flex/Flock nicht im Export (nur Summa)", !d.some(n => /Rücken_300|Ärmel links_75/.test(n)), d.filter(n => /Rücken|Ärmel/.test(n)).join(", "));
  const dtf = liste(ZIEL.dtf);
  pruefe("DTF-Dateien und Namen-Bogen zusätzlich in dtf_bestellen, Stick nicht", dtf.some(n => n.startsWith(`10x_${KD}_Brust links_90`)) && dtf.some(n => n.startsWith(`3x_${KD}_Namen_200`)) && !dtf.some(n => /Brust rechts/.test(n)), dtf.join(", "));
  const dtfPdf = path.join(so, `10x_${KD}_Brust links_90${id}.pdf`);
  if (fs.existsSync(dtfPdf)) { const i = pdfInfo(dtfPdf); pruefe("DTF-PDF: Breite = Maß + 2 × 2 mm Rand", nah(i.boxen[0].media[0], 94, 0.6), JSON.stringify(i.boxen[0])); }
  const info = (await th("texte", "Infos")).texte.join("\n");
  pruefe("Ebene „Infos“: Farbe:, Druck: (DTF, Flex, Flock, Stick), Datum:, Motivzeilen", /Farbe:/.test(info) && /Druck:\s*DTF, Flex, Flock, Stick/.test(info) && /Datum:/.test(info) && /Brust links: 90 mm/.test(info), info.slice(0, 500));
  const x = await xmpVon();
  pruefe("exporte[] im XMP", x.exporte.length > 0, JSON.stringify(x.exporte.map(e => e.dateien.length)));
  await th("schliessen", m.zweit).catch(() => {});
  await schliessen();
});

await schritt("Modell ohne Realmaß (Neutral_Kids)", async () => {
  const r = await anlegen({ art: "textil", kunde: KUNDE, quelle: "leer", textil: () => textilWaehlen("anlegen", "Neutral_Kids", "erste") });
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const x = await xmpVon();
  pruefe("faktor null", x && x.textil.modell.faktor === null, JSON.stringify(x && x.textil.modell));
  await th("zeichnen", [{ ebene: "Design", art: "rechteck", x: 10, y: 10, b: 8, h: 4, fuellung: { cmyk: [100, 0, 0, 0] }, name: "Kidslogo" }]);
  const vor = (await th("objekte", null, "Design")).objekte.find(o => o.name === "Kidslogo");
  if (await motivOeffnen("Kidslogo")) {
    await motivSetzen({ position: "Brust links", verfahren: "DTF", stufen: [{ wahl: "90", menge: 3 }] });
    const ok = await motivOk();
    const nach = (await th("objekte", null, "Design")).objekte.find(o => o.name === "Kidslogo");
    pruefe("Zuordnen ohne Skalierung, ohne Popup; Tags gesetzt", ok.zu && !ok.text && nach && nah(nach.gb[2] - nach.gb[0], vor.gb[2] - vor.gb[0], 0.05) && nach.tags.IP_Position === "Brust links", JSON.stringify({ vor: vor && vor.gb, nach: nach && nach.gb, t: ok.text }));
  } else pruefe("Fenster „Motiv“", false);
  await schliessen();
});

await schritt("Modell ohne Farbliste (Kundenware)", async () => {
  const kw = liste32.find(x => !FARBEN.some(f => f.id === x.id));
  if (!kw) return uebersprungen("Kundenware ohne Farbliste", "jedes Modell hat Farben");
  let frei = null;
  const r = await anlegen({ art: "textil", kunde: KUNDE, quelle: "leer", textil: async () => { await textilWaehlen("anlegen", kw.modell, null); frei = await ev("anlegen", `!!document.querySelector(".tw-frei input")`); await ev("anlegen", `(()=>{ const i=document.querySelector(".tw-frei input"); if(i){ i.value="Kundenfarbe"; i.dispatchEvent(new Event("input")); } return true; })()`); } });
  pruefe(`${kw.modell}: Freitextfeld „Farbe“ statt Raster`, frei === true, String(frei));
  pruefe("angelegt", r.ok && !r.text, r.text || r.grund);
  const x = await xmpVon();
  pruefe("XMP farbe { name Kundenfarbe, cmyk null }", x && x.textil.farbe && x.textil.farbe.name === "Kundenfarbe" && x.textil.farbe.cmyk === null, JSON.stringify(x && x.textil.farbe));
  await schliessen();
});
trennen();
process.exit(0);
