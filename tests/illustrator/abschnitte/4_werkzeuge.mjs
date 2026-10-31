// 3.4 Werkzeuge (SPEZ_03_Werkzeuge, Thema 1): Breite, Masken, Sichtbarkeit je Zustand.
// Logo und VK-CC (Skripte mit eigenem ScriptUI-Dialog) laufen im Gesamtlauf nicht mit; dass sie starten, ist belegt (erster Lauf 31.10.).
import { th, schritt, pruefe, uebersprungen, ev, warte, panelNeu, panelZustand, panelFertig, klick, marke, meldungsText, xmpVon, bis, trennen, jsx, evStill } from "../lib/basis.mjs";
import { anlegen, panelKlick, fensterAuf, fensterZu, druckbogenErzeugen } from "../lib/ablauf.mjs";

const breite = o => Math.round((o.vb[2] - o.vb[0]) * 100) / 100, hoehe = o => Math.round((o.vb[1] - o.vb[3]) * 100) / 100;
const obj = async n => (await th("objekte", null, null)).objekte.find(o => o.name === n);
async function zustand(titel, erwartet) {
  await panelNeu();
  const z = await panelZustand();
  const ist = { breite: !z.breite.gesperrt, masken: !z.masken.gesperrt, logo: z.menue ? !!z.menue.Logo : null, vkcc: z.menue ? !!z.menue["VK-CC"] : null };
  pruefe(`${titel}: Breite ${erwartet.breite ? "aktiv" : "gesperrt"}, Masken ${erwartet.masken ? "aktiv" : "gesperrt"}, Logo/VK-CC ${erwartet.logo ? "aktiv" : "gesperrt"}`,
    ist.breite === erwartet.breite && ist.masken === erwartet.masken && ist.logo === erwartet.logo && ist.vkcc === erwartet.logo, JSON.stringify(ist));
  pruefe(`${titel}: Werkzeugzeile vollständig sichtbar (Breite · Masken · Nutzen)`, z.breite.sichtbar && z.masken.sichtbar && z.nutzen.sichtbar, JSON.stringify([z.breite.sichtbar, z.masken.sichtbar, z.nutzen.sichtbar]));
}
const auftragSetzen = async () => { const x = await xmpVon(); x.auftrag.orderId = "TEST-1"; await th("xmpSetzen", JSON.stringify(x)); };
const m = {};

await schritt("Sichtbarkeit je Zustand", async () => {
  await zustand("kein Dokument", { breite: false, masken: false, logo: false });
  await th("neu", 300, 200);
  m.fremd = (await th("dok")).name;
  await zustand("Fremddokument", { breite: true, masken: true, logo: true });
  const r = await anlegen({ art: "sonstiges", kunde: "Werkzeugtest", quelle: "leer", breite: 300, hoehe: 200, anzahl: 1 });
  pruefe("Sonstiges angelegt", r.ok, r.text || r.grund);
  await zustand("Panel-Datei ohne Auftrag (Sonstiges)", { breite: true, masken: true, logo: true });
  await auftragSetzen();
  await zustand("mit Auftrag, Sonstiges", { breite: false, masken: true, logo: true });
  await th("schliessen", null);
  const f = await anlegen({ art: "fahrzeugbeschriftung", kunde: "Werkzeugtest", quelle: "leer" });
  pruefe("Fahrzeugbeschriftung angelegt", f.ok, f.text || f.grund);
  await zustand("Panel-Datei ohne Auftrag, Fahrzeugbeschriftung", { breite: false, masken: true, logo: true });
  await auftragSetzen();
  await zustand("mit Auftrag, Fahrzeugbeschriftung", { breite: false, masken: true, logo: false });
  await th("schliessen", null);
  const b = await druckbogenErzeugen("Werkzeugbogen");
  if (pruefe("Druckbogen erzeugt", b.ok, b.text)) await zustand("Druckbogen vorn", { breite: false, masken: false, logo: false });
});

await schritt("Breite", async () => {
  await th("aktivieren", m.fremd);
  await th("zeichnen", [{ ebene: "Ebene 1", art: "rechteck", x: 20, y: 20, b: 100, h: 50, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Breitenobjekt" }]).catch(async () => {
    const e = (await th("dok")).ebenen[0].name;
    await th("zeichnen", [{ ebene: e, art: "rechteck", x: 20, y: 20, b: 100, h: 50, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Breitenobjekt" }]);
  });
  // ohne Auswahl: Popup mit dem Text des Skripts
  await th("auswahlLeer");
  const r0 = await panelKlick("btnBreite");
  pruefe("ohne Auswahl: „Du hast vergessen, etwas auszuwählen! Trottel!“", /Du hast vergessen, etwas auszuwählen! Trottel!/.test(r0.text), r0.text);
  await th("auswaehlen", ["Breitenobjekt"]);
  await panelNeu();
  const auf = await fensterAuf("breite", () => klick("panel", "#btnBreite"), `!!window.PAM && document.getElementById("ziel").value !== ""`, 30000);
  if (!pruefe("Fenster „Breite“ geöffnet", auf)) return;
  const v = await ev("breite", `[document.getElementById("ziel").value, document.getElementById("zugabe").value]`);
  pruefe("Zielbreite vorbelegt mit gemessener Breite wie fmtMm im Skript („100“), Zugabe „2“", v[0] === "100" && v[1] === "2", JSON.stringify(v));
  const setze = async (id, w) => ev("breite", `(()=>{ const f=document.getElementById(${JSON.stringify(id)}); f.value=${JSON.stringify(w)}; f.dispatchEvent(new Event("input")); return [document.getElementById("hinweis").textContent, document.getElementById("ok").disabled]; })()`);
  const f1 = await setze("ziel", "1.5");
  pruefe("Eingabe „1.5“: Fehlertext im Fuß, OK gesperrt", /Ungültige Eingabe für Breite\. Bitte eine gültige Zahl: Dezimaltrennzeichen nur Komma, Punkt nur als Tausender\./.test(f1[0]) && f1[1], JSON.stringify(f1));
  const f2 = await setze("ziel", "0");
  pruefe("Eingabe „0“: „Bitte eine Zahl > 0 angeben.“", /Breite\. Bitte eine Zahl > 0 angeben\./.test(f2[0]) && f2[1], JSON.stringify(f2));
  await setze("ziel", "200");
  const f3 = await setze("zugabe", "-1");
  pruefe("Zugabe „-1“: Fehlertext Zugabe", /Zugabe/.test(f3[0]) && f3[1], JSON.stringify(f3));
  await setze("ziel", "200"); const f4 = await setze("zugabe", "5");
  pruefe("gültige Eingaben: OK frei", !f4[1], JSON.stringify(f4));
  const mk = marke();
  await klick("breite", "#ok");
  await fensterZu("breite", 60000); await panelFertig(30000);
  const o = await obj("Breitenobjekt") || (await th("objekte", null, null)).objekte[0];
  const d = await th("dok");
  pruefe("Objekt proportional auf 200 mm skaliert (Höhe 100)", o && Math.abs(breite(o) - 200) < 0.2 && Math.abs(hoehe(o) - 100) < 0.2, o ? `${breite(o)} × ${hoehe(o)}` : "nicht gefunden");
  pruefe("aktive Zeichenfläche = Maß + Zugabe je Seite (210 × 110)", Math.abs(d.zf[0].breite - 210) < 0.2 && Math.abs(d.zf[0].hoehe - 110) < 0.2, JSON.stringify(d.zf[0]));
  pruefe("keine Erfolgsmeldung, kein XMP", !meldungsText(mk) && !d.xmp, meldungsText(mk));
});

await schritt("Masken", async () => {
  await th("aktivieren", m.fremd);
  const e = (await th("dok")).ebenen[0].name;
  await th("schnittmaske", e, "Maske frei", 0, 100, 80, 60);
  await th("ebeneNeu", "Gesperrt");
  await th("schnittmaske", "Gesperrt", "Maske gesperrt", 100, 100, 80, 60);
  await th("ebeneSperren", "Gesperrt", true);
  pruefe("zwei Schnittmasken vorher", (await th("geclippt")).n === 2);
  const r = await panelKlick("btnMasken");
  pruefe("Masken: keine Meldung (keine Statistik)", !r.text, r.text);
  pruefe("nur die Maske der ungesperrten Ebene gelöst", (await th("geclippt")).n === 1, `${(await th("geclippt")).n} übrig`);
});

trennen();
process.exit(0);
