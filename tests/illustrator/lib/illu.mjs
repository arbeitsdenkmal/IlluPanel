// Illustrator von außen (osascript, Prozesse): Antwortprüfung, Dokumente schließen, Vordergrund, Screenshot, Panel öffnen. Dialoge werden nicht
// weggeklickt (System Events sieht Illustrator- und ScriptUI-Dialoge nicht zuverlässig), Illustrator wird nicht neu gestartet.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { E, OUT, ROOT, osaJsx, warte, offen, evStill, PORT, trennen } from "./basis.mjs";

export const laeuft = () => { try { execFileSync("pgrep", ["-x", "Adobe Illustrator"]); return true; } catch (e) { return false; } };
// JSX per osascript (Wächter: Vorprüfung, Schließen, Antwortprüfung); Zeitlimit s
export const osaJs = (code, s = 30) => osaJsx(code, Math.max(5, s - 5)).trim();
export function antwortet(s = E.antwort_s) { if (!laeuft()) return false; try { osaJs("app.name", s); return true; } catch (e) { return false; } }
// Illustrator sichtbar und vorn (im Hintergrund liest Illustrator um ein Vielfaches langsamer); voller App-Pfad, weil ältere Versionen dieselbe
// Bundle-ID haben
export const vorholen = () => { try { execFileSync("open", ["-a", E.illustrator], { timeout: 15000, stdio: "ignore" }); } catch (e) { /* still */ } };

// Dokumente des Laufs ohne Speichern schließen: gespeichert unter tests/out oder ungespeichert und nicht in fremd (Namen beim Start)
export function testDokumenteSchliessen(fremd = []) {
  const code = `var f = ${JSON.stringify(fremd)}, n = 0;
for (var i = app.documents.length - 1; i >= 0; i--) { var d = app.documents[i], p = ""; try { var f = new File(d.fullName); p = f.exists ? f.fsName : ""; } catch (e) { p = ""; }
  var unter = p.indexOf(${JSON.stringify(OUT + "/")}) === 0, neu = !p;
  var fremdDok = false; for (var k = 0; k < f.length; k++) if (f[k] === d.name) fremdDok = true;
  if (unter || (neu && !fremdDok)) { d.close(SaveOptions.DONOTSAVECHANGES); n++; } }
n`;
  return Number(osaJs(code, 90));
}
// offene Dokumente: Name, Pfad, gespeichert
export function dokumente() {
  const r = osaJs(`var r = []; for (var i = 0; i < app.documents.length; i++) { var d = app.documents[i], p = ""; try { var f = new File(d.fullName); p = f.exists ? f.fsName : ""; } catch (e) { } r.push(d.name + "\\t" + p + "\\t" + d.saved); } r.join("\\n")`, 30);
  return r ? r.split("\n").map(z => { const [name, pfad, saved] = z.split("\t"); return { name, pfad, gespeichert: saved === "true" }; }) : [];
}
export const uilLesen = () => osaJs("String(app.userInteractionLevel)", 30);
export const uilSetzen = w => osaJs(`app.userInteractionLevel = UserInteractionLevel.${String(w).replace("UserInteractionLevel.", "")}; String(app.userInteractionLevel)`, 30);

export function bildschirm(datei) { fs.mkdirSync(path.dirname(datei), { recursive: true }); try { execFileSync("screencapture", ["-x", datei]); return true; } catch (e) { return false; } }
// Panel öffnen, falls es zu ist (nur Vorprüfung; Illustrator muss laufen): requestOpenExtension über die Hintergrund-Extension, fertig, wenn das Panel
// 10 s ununterbrochen bereit ist (ein zu früh geöffnetes Panel schließt Illustrator beim Fertigstarten wieder); höchstens panel_warten_s
export async function panelOeffnen() {
  vorholen(); // die Hintergrund-Extension startet erst, wenn Illustrator aktiviert wird
  const t0 = Date.now();
  let angefragt = 0, bereitSeit = 0;
  while (Date.now() - t0 < E.panel_warten_s * 1000) {
    const bereit = (await offen("panel")) && await evStill("panel", `!!window.PAM && !document.getElementById("btnAuftrag").disabled`, false);
    if (bereit) {
      if (!bereitSeit) bereitSeit = Date.now();
      if (Date.now() - bereitSeit >= 10000) { trennen(); return true; }
    } else {
      bereitSeit = 0;
      trennen();
      if (Date.now() - angefragt > 15000 && !(await offen("panel")) && await offen("hintergrund")) {
        angefragt = Date.now();
        await evStill("hintergrund", `window.__adobe_cep__.requestOpenExtension("de.pamnm.illupanels.panel", ""); true`);
      }
    }
    await warte(2000);
  }
  trennen();
  return false;
}
export { PORT };
