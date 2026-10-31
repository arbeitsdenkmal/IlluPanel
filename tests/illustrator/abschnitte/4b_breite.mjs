// 3.4 Breite (einzeln lauffähig, Nachlauf Auftrag 4.2): nur Vorbelegung des Fensters „Breite“ und Fehlertext der Zugabe – die beiden Erwartungen, die
// im ersten Lauf falsch waren. Fremddokument mit einem 100-mm-Rechteck; das Fenster wird ohne OK geschlossen (nichts skaliert).
import { th, schritt, pruefe, ev, klick, panelNeu, trennen } from "../lib/basis.mjs";
import { fensterAuf, fensterSchliessen, waehle } from "../lib/ablauf.mjs";

await schritt("Breite: Vorbelegung und Zugabe-Fehler", async () => {
  await th("neu", 300, 200);
  const e = (await th("dok")).ebenen[0].name;
  await th("zeichnen", [{ ebene: e, art: "rechteck", x: 20, y: 20, b: 100, h: 50, fuellung: { cmyk: [0, 0, 100, 0] }, name: "Breitenobjekt" }]);
  if (!pruefe("Auswahl „Breitenobjekt“ von Illustrator gemeldet", await waehle(["Breitenobjekt"]))) return;
  await panelNeu();
  const auf = await fensterAuf("breite", () => klick("panel", "#btnBreite"), `!!window.PAM && document.getElementById("ziel").value !== ""`, 30000);
  if (!pruefe("Fenster „Breite“ geöffnet", auf)) return;
  const v = await ev("breite", `[document.getElementById("ziel").value, document.getElementById("zugabe").value]`);
  pruefe("Zielbreite vorbelegt mit gemessener Breite wie fmtMm im Skript („100“), Zugabe „2“", v[0] === "100" && v[1] === "2", JSON.stringify(v));
  const setze = async (id, w) => ev("breite", `(()=>{ const f=document.getElementById(${JSON.stringify(id)}); f.value=${JSON.stringify(w)}; f.dispatchEvent(new Event("input")); return [document.getElementById("hinweis").textContent, document.getElementById("ok").disabled]; })()`);
  await setze("ziel", "200");
  const f = await setze("zugabe", "-1");
  pruefe("gültige Breite, Zugabe „-1“: Fehlertext zur Zugabe, OK gesperrt", /Zugabe/.test(f[0]) && f[1], JSON.stringify(f));
  await fensterSchliessen("breite");
});
trennen();
process.exit(0);
