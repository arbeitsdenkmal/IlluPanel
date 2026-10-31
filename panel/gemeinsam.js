/* Gemeinsames für Panel und Dialog (CEP-Seite): Host-Aufruf, JSX-Kern laden, Popup, Hell/Dunkel. Logik liegt in panel/lib. */
(function () {
  "use strict";
  const cep = window.__adobe_cep__;
  const path = require("path");
  const EXT = decodeURI(cep.getSystemPath("extension")).replace(/^file:\/\//, "");
  const lib = n => require(path.join(EXT, "panel", "lib", n));
  const fs = require("fs"), os = require("os");

  // Testschalter des Gesamtlaufs (tests/illustrator), nur wirksam mit .debug im Erweiterungsordner: Datei de.pamnm.illupanels.test.json im temporären
  // Ordner { meldungen: <Protokolldatei>, antworten: { frage: true|false, datei: [pfad …], ordner: [pfad …], ordnerStandard, dateien: [[pfad …] …] } }.
  // Meldungen und Rückfragen werden mitgeschrieben statt angezeigt, Datei- und Ordnerdialoge aus den Antworten beantwortet (Listen der Reihe nach).
  const TESTDATEI = path.join(os.tmpdir(), "de.pamnm.illupanels.test.json");
  const DEBUG = fs.existsSync(path.join(EXT, ".debug"));
  function test() { if (!DEBUG) return null; try { return JSON.parse(fs.readFileSync(TESTDATEI, "utf8")); } catch (e) { return null; } }
  function testProtokoll(t, art, text, antwort) {
    try { if (t.meldungen) fs.appendFileSync(t.meldungen, JSON.stringify({ zeit: new Date().toISOString(), fenster: document.title, art, text: String(text), antwort }) + "\n"); } catch (e) { /* still */ }
  }
  function testAntwort(t, schluessel) {
    const a = t.antworten || {}, liste = Array.isArray(a[schluessel]) ? a[schluessel] : [];
    if (!liste.length) return schluessel === "ordner" && a.ordnerStandard ? a.ordnerStandard : null;
    const w = liste.shift();
    try { fs.writeFileSync(TESTDATEI, JSON.stringify(t)); } catch (e) { /* still */ }
    return w;
  }
  // Dateidialog von CEP (WEA-Etiketten): im Test aus antworten.dateien
  if (DEBUG && window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
    const original = window.cep.fs.showOpenDialogEx;
    window.cep.fs.showOpenDialogEx = function () {
      const t = test();
      if (!t) return original.apply(this, arguments);
      const d = testAntwort(t, "dateien") || [];
      testProtokoll(t, "dateien", arguments[2] || "", d);
      return { err: 0, data: d };
    };
  }

  function evalRoh(code) { return new Promise(r => cep.evalScript(code, r)); }
  // IP.<fn>(…) im JSX-Kern; Antwort {ok:true,…} oder {ok:false,error}
  function host(fn, ...args) {
    const t = (fn === "dateiWaehlen" || fn === "ordnerWaehlen") ? test() : null;
    if (t) { const p = testAntwort(t, fn === "dateiWaehlen" ? "datei" : "ordner"); testProtokoll(t, fn, args[0] || "", p); return Promise.resolve({ ok: true, pfad: p }); }
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
  function popup(text) { const t = test(); if (t) { testProtokoll(t, "meldung", text); return Promise.resolve(""); } return evalRoh(`alert(${JSON.stringify(String(text))})`); }
  // Testbetrieb: Vorgang mitschreiben statt ausführen (Skripte mit ScriptUI-Dialog); true = Testschalter aktiv
  function testNotiz(art, text) { const t = test(); if (t) testProtokoll(t, art, text); return !!t; }

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

  // Übergabe Panel -> Fenster „Objekt“, „Breite“ bzw. „Nutzen“ über eine Datei im temporären Ordner (Muster der alten Fenster), Rückmeldung per CSEvent
  // EVENT_OBJEKT_FERTIG, EVENT_BREITE_FERTIG bzw. EVENT_NUTZEN_FERTIG
  const uebergabeDatei = name => {
    const datei = path.join(os.tmpdir(), `de.pamnm.illupanels.${name}.json`);
    return {
      lesen() { try { return JSON.parse(fs.readFileSync(datei, "utf8")); } catch (e) { return {}; } },
      schreiben(o) { fs.writeFileSync(datei, JSON.stringify(o || {})); }
    };
  };
  const uebergabe = uebergabeDatei("objekt"), uebergabeBreite = uebergabeDatei("breite"), uebergabeNutzen = uebergabeDatei("nutzen");
  const ID = { panel: "de.pamnm.illupanels.panel", anlegen: "de.pamnm.illupanels.anlegen", objekt: "de.pamnm.illupanels.objekt", zusammenfassung: "de.pamnm.illupanels.zusammenfassung",
    breite: "de.pamnm.illupanels.breite", schilder: "de.pamnm.illupanels.schilder", motiv: "de.pamnm.illupanels.motiv", textilfarbe: "de.pamnm.illupanels.textilfarbe",
    modell: "de.pamnm.illupanels.modell", nutzen: "de.pamnm.illupanels.nutzen", gitter: "de.pamnm.illupanels.gitter", mbnr: "de.pamnm.illupanels.mbnr" };

  // Rückfrage als Illustrator-Dialog (Ja/Nein) -> true | false
  function frage(text) {
    const t = test();
    if (t) { const a = !(t.antworten && t.antworten.frage === false); testProtokoll(t, "frage", text, a); return Promise.resolve(a); }
    return evalRoh(`confirm(${JSON.stringify(String(text))})`).then(r => r === "true");
  }

  window.PAM = { cep, EXT, DEBUG, lib, host, evalRoh, kernLaden, popup, frage, testNotiz, senden, empfangen, uebergabe, uebergabeBreite, uebergabeNutzen, ID,
    EVENT_ANGELEGT: "de.pamnm.illupanels.angelegt",
    EVENT_OBJEKT_FERTIG: "de.pamnm.illupanels.objektFertig",       // Fenster „Objekt“ bzw. „Motiv“ (Textil): OK
    EVENT_TEXTIL_FERTIG: "de.pamnm.illupanels.textilFertig",       // Fenster „Textilfarbe“ bzw. „Modell“: OK
    EVENT_BREITE_FERTIG: "de.pamnm.illupanels.breiteFertig",       // Fenster „Breite“: ausgeführt (auch nach Fehler)
    EVENT_NUTZEN_FERTIG: "de.pamnm.illupanels.nutzenFertig",       // Fenster „Nutzen“, „WEA-Etiketten“, „Bögl Nummern“: geschlossen (aufgebaut oder nicht)
    EVENT_SCHILDER_FERTIG: "de.pamnm.illupanels.schilderFertig",   // Fenster „Schilder“: OK
    EVENT_OBJEKT_OEFFNEN: "de.pamnm.illupanels.objektOeffnen",     // „Zusammenfassung“: Doppelklick -> Panel öffnet „Objekt“ bzw. „Motiv“
    EVENT_BERECHNET: "de.pamnm.illupanels.berechnet" };            // Panel bzw. „Zusammenfassung“ hat berechnet oder exportiert
})();
