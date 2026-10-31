/* Unsichtbare Hintergrund-Extension (de.pamnm.illupanels.hintergrund, SPEZ_02 §12): zählt die Grafikzeit, unabhängig davon, ob das Panel offen ist.
 * Keine Abfragen an Illustrator (evalScript) [R 4.7] – eine Abfrage während des PDF-Imports ließ im alten Panel den Inhalt im bereits offenen Dokument
 * landen. Das aktive Dokument kommt aus den Ereignisdaten (Pfad), Rolle und bogen.arbeitsdatei liest Node aus dem XMP der gespeicherten Datei
 * (lib/dokument_xmp.js); ungespeichertes Dokument: kein Zählen. Alle 5 s „Illustrator vorn“ und „Sekunden seit letzter Eingabe“ (lib/aktivitaet.js);
 * der Zähler legt seine Einträge alle 60 s, bei Dokumentwechsel und beim Beenden im Puffer ab (lib/grafikzeit.js); ins XMP schreibt nur das Panel. */
(function () {
  "use strict";
  const cep = window.__adobe_cep__;
  const path = require("path");
  const EXT = decodeURI(cep.getSystemPath("extension")).replace(/^file:\/\//, "");
  const lib = n => require(path.join(EXT, "panel", "lib", n));
  const GZ = lib("grafikzeit.js");
  const X = lib("dokument_xmp.js");
  const A = lib("aktivitaet.js");
  const INTERVALL_MS = 5000;
  let puffer = null;
  try { puffer = GZ.pufferDatei(); } catch (e) { puffer = null; } // %APPDATA% fehlt o. ä.: nicht zählen
  let schluessel = null; // Pfad der Arbeitsdatei, der die Zeit gutgeschrieben wird; bis zum ersten Dokument-Ereignis null
  let aktiverPfad = "";  // "" = kein Dokument, ungespeichert oder unbekannt
  let stand = 0;         // nur das Ergebnis des letzten Ereignisses zählt

  function setzen(pfad) {
    aktiverPfad = pfad; schluessel = null;
    const n = ++stand;
    X.arbeitsdateiAusDatei(pfad).then(s => { if (n === stand) schluessel = s; });
  }
  const zaehler = new GZ.Zaehler({
    schreiben: (s, eintrag) => { try { if (puffer) GZ.anhaengen(puffer, s, eintrag); } catch (e) { /* Rechnerordner nicht beschreibbar o. ä. */ } }
  });
  async function tick() {
    const [vorne, leerlauf_s] = await Promise.all([A.vorn(), A.leerlaufSekunden()]);
    zaehler.tick(Date.now(), { vorne, leerlauf_s, schluessel });
  }
  cep.addEventListener("documentAfterActivate", ev => { zaehler.flush(Date.now()); setzen(X.pfadAusEreignis(ev.data)); });
  // Deaktiviert: nur das bisher aktive Dokument abmelden (Reihenfolge Deactivate/Activate beim Wechsel nicht festgelegt)
  cep.addEventListener("documentAfterDeactivate", ev => {
    const p = X.pfadAusEreignis(ev.data);
    if (p && p === aktiverPfad) { zaehler.flush(Date.now()); setzen(""); }
  });
  // Gespeichert: aktives Dokument neu lesen; ein ungespeichertes aktives Dokument (z. B. neuer Auftrag) bekommt so seinen Pfad
  cep.addEventListener("documentAfterSave", ev => {
    const p = X.pfadAusEreignis(ev.data);
    if (p && (p === aktiverPfad || !aktiverPfad)) { zaehler.flush(Date.now()); setzen(p); }
  });
  const beenden = () => { zaehler.flush(Date.now()); A.beenden(); };
  cep.addEventListener("com.adobe.csxs.events.ApplicationBeforeQuit", beenden);
  window.addEventListener("beforeunload", beenden);
  setInterval(() => { tick().catch(() => {}); }, INTERVALL_MS);
  window.PAMHintergrund = { zaehler, get schluessel() { return schluessel; }, get pfad() { return aktiverPfad; }, puffer }; // für das Remote-Debugging
})();
