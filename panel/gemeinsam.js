/* Gemeinsames für Panel und Dialog (CEP-Seite): Host-Aufruf, JSX-Kern laden, Popup, Hell/Dunkel. Logik liegt in panel/lib. */
(function () {
  "use strict";
  const cep = window.__adobe_cep__;
  const path = require("path");
  const EXT = decodeURI(cep.getSystemPath("extension")).replace(/^file:\/\//, "");
  const lib = n => require(path.join(EXT, "panel", "lib", n));

  function evalRoh(code) { return new Promise(r => cep.evalScript(code, r)); }
  // IP.<fn>(…) im JSX-Kern; Antwort {ok:true,…} oder {ok:false,error}
  function host(fn, ...args) {
    const code = `IP.${fn}(${args.map(a => JSON.stringify(a)).join(",")})`;
    return new Promise((resolve, reject) => cep.evalScript(code, res => {
      let o;
      try { o = JSON.parse(res); } catch (e) { return reject(new Error(`Antwort von ${fn} nicht lesbar: ${res}`)); }
      o.ok ? resolve(o) : reject(new Error(o.error));
    }));
  }
  // JSX-Kern laden und Schema übergeben (Tag-Namen und XMP-Namespace nur aus config/schema.json)
  async function kernLaden(schema) {
    const kern = path.join(EXT, "jsx", "illupanels.jsx");
    const r = await evalRoh(`$.evalFile(${JSON.stringify(kern)}); typeof IP.init`);
    if (r !== "function") throw new Error(`JSX-Kern nicht geladen: ${kern}\n${r}`);
    await host("init", JSON.stringify(schema));
  }
  // Fehler als Illustrator-Meldung; keine Erfolgsmeldungen
  function popup(text) { return evalRoh(`alert(${JSON.stringify(String(text))})`); }

  // Hell/Dunkel aus dem Illustrator-Theme
  function theme() {
    try {
      const c = JSON.parse(cep.getHostEnvironment()).appSkinInfo.panelBackgroundColor.color;
      document.documentElement.classList.toggle("hell", (c.red + c.green + c.blue) / 3 > 128);
      document.documentElement.style.setProperty("--bg", `rgb(${Math.round(c.red)},${Math.round(c.green)},${Math.round(c.blue)})`);
    } catch (e) { /* Standard: dunkel */ }
  }
  cep.addEventListener("com.adobe.csxs.events.ThemeColorChanged", theme);
  theme();

  function senden(type, extensionId, data) {
    const appId = JSON.parse(cep.getHostEnvironment()).appId;
    cep.dispatchEvent({ type, scope: "APPLICATION", appId, extensionId, data: JSON.stringify(data || {}) });
  }
  // CSEvent empfangen, data als Objekt
  const empfangen = (type, fn) => cep.addEventListener(type, ev => { let d = {}; try { d = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data || {}; } catch (e) { /* leer */ } fn(d); });

  // Übergabe Panel -> Fenster „Objekt“ über eine Datei im temporären Ordner (Muster der alten Fenster), Rückmeldung per CSEvent EVENT_OBJEKT_FERTIG
  const fs = require("fs"), os = require("os");
  const UEBERGABE = path.join(os.tmpdir(), "de.pamnm.illupanels.objekt.json");
  const uebergabe = {
    lesen() { try { return JSON.parse(fs.readFileSync(UEBERGABE, "utf8")); } catch (e) { return {}; } },
    schreiben(o) { fs.writeFileSync(UEBERGABE, JSON.stringify(o || {})); }
  };
  const ID = { panel: "de.pamnm.illupanels.panel", anlegen: "de.pamnm.illupanels.anlegen", objekt: "de.pamnm.illupanels.objekt", zusammenfassung: "de.pamnm.illupanels.zusammenfassung" };

  window.PAM = { cep, EXT, lib, host, evalRoh, kernLaden, popup, senden, empfangen, uebergabe, ID,
    EVENT_ANGELEGT: "de.pamnm.illupanels.angelegt",
    EVENT_OBJEKT_FERTIG: "de.pamnm.illupanels.objektFertig",       // Fenster „Objekt“: OK
    EVENT_OBJEKT_OEFFNEN: "de.pamnm.illupanels.objektOeffnen",     // „Zusammenfassung“: Doppelklick -> Panel öffnet „Objekt“
    EVENT_BERECHNET: "de.pamnm.illupanels.berechnet" };            // Panel bzw. „Zusammenfassung“ hat berechnet oder exportiert
})();
