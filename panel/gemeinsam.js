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

  window.PAM = { cep, EXT, lib, host, evalRoh, kernLaden, popup, senden, EVENT_ANGELEGT: "de.pamnm.illupanels.angelegt" };
})();
