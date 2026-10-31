// 3.2 Plott mit Prozessfarben (einzeln lauffähig, Nachlauf Auftrag 4.1, SPEZ_02 §6): Gruppe mit drei Füllfarben – globale Prozessfarbe, nicht globale
// Prozessfarbe, CMYK ohne Farbfeld – erscheint unter „Farben im Objekt“, Zuordnung über Kachel bzw. Farb-Nr., Umfärben bei OK. Plott sperren nur
// Konturen, Bilder, Verläufe/Muster: die Testobjekte haben keine Kontur.
import { th, schritt, pruefe, ev, warte, trennen } from "../lib/basis.mjs";
import { anlegen, objektOeffnen, objKnopf, objZustand, objFarbNr, objOk } from "../lib/ablauf.mjs";

const m = {};

await schritt("Vorbereitung: Arbeitsdatei und Gruppe „Prozessfarben“", async () => {
  const r = await anlegen({ art: "beschriftung", kunde: "Prozesstest", quelle: "leer" });
  if (!pruefe("Arbeitsdatei Beschriftung angelegt", r.ok && !r.text, r.text || r.grund)) return;
  await th("zeichnen", [
    { ebene: "Sandbox", art: "rechteck", x: 0, y: 0, b: 60, h: 60, fuellung: { prozess: "Test global", global: true, cmyk: [10, 80, 0, 0] }, gruppe: "Prozessfarben" },
    { ebene: "Sandbox", art: "rechteck", x: 70, y: 0, b: 60, h: 60, fuellung: { prozess: "Test nicht global", cmyk: [60, 0, 20, 0] }, gruppe: "Prozessfarben" },
    { ebene: "Sandbox", art: "rechteck", x: 140, y: 0, b: 60, h: 60, fuellung: { cmyk: [0, 30, 90, 10] }, gruppe: "Prozessfarben" }
  ]);
  await th("speichern");
  const f = (await th("pfadFarben", null, "Sandbox", "Prozessfarben")).pfade;
  m.bereit = pruefe("Testobjekt: drei Füllungen (Spot „Test global“, zwei CMYK), ohne Kontur", f.length === 3 && f.every(x => !x.kontur) && f.some(x => x.fuellung === "spot:Test global") && f.filter(x => /^cmyk:/.test(x.fuellung || "")).length === 2, JSON.stringify(f.map(x => [x.fuellung, x.kontur])));
});

await schritt("Zuordnen Plott Prozessfarben", async () => {
  if (!m.bereit) return pruefe("Vorbereitung vollständig", false, "Testobjekt fehlt");
  const { auf } = await objektOeffnen(["Prozessfarben"]);
  if (!pruefe("Fenster „Objekt“ geöffnet", auf)) return;
  const v = await objZustand();
  const plott = v.arten.find(a => a.t === "Plott");
  pruefe("Plott nicht gesperrt (keine Konturen, Bilder, Verläufe)", plott && !plott.aus, JSON.stringify(v.arten));
  await objKnopf("arten", "Plott");
  await warte(300);
  const p = await objZustand();
  pruefe("Farben im Objekt: drei Zeilen, alle „→ zuordnen“, OK gesperrt", p.farben.length === 3 && p.farben.every(f => f.includes("zuordnen")) && !p.ok && p.farben.some(f => f.includes("Test global")), JSON.stringify(p.farben) + " " + p.hinweis);
  // erste Zeile per Kachel, zweite per Farb-Nr. + Enter, dritte per Kachel
  await ev("objekt", `(()=>{ const s=document.querySelector("#raster span"); if(s) s.click(); return !!s; })()`);
  await objFarbNr("031");
  await ev("objekt", `(()=>{ const s=document.querySelectorAll("#raster span")[1]; if(s) s.click(); return !!s; })()`);
  await warte(300);
  const p2 = await objZustand();
  pruefe("alle drei Zeilen zugeordnet (Kachel bzw. Farb-Nr.), OK frei", p2.farben.length === 3 && p2.farben.every(f => f.includes("✓")) && p2.ok, JSON.stringify(p2.farben) + " " + p2.hinweis);
  const r = await objOk();
  pruefe("OK ohne Meldung, Fenster zu", r.zu && !r.text, r.text);
  const t = (await th("tags", "Prozessfarben")).tags, o = (await th("objekte", null, null)).objekte.find(x => x.name === "Prozessfarben");
  pruefe("Tags: IP_Folie Plott-Schlüssel, IP_Id; Ebene „Cut“", /^751C-\d+$/.test(t.IP_Folie || "") && !!t.IP_Id && o && o.ebene === "Cut", JSON.stringify(t) + " " + (o && o.ebene));
  const f = (await th("pfadFarben", null, "Cut", "Prozessfarben")).pfade;
  pruefe("bei OK umgefärbt: alle drei Füllungen Oracal-Farbfelder (751 C)", f.length === 3 && f.every(x => /\(751 C\)/.test(x.fuellung || "")), JSON.stringify(f.map(x => x.fuellung)));
});
trennen();
process.exit(0);
