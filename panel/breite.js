/* Fenster „Breite“ (Extension de.pamnm.illupanels.breite, ModalDialog, SPEZ_03 §3): Zielbreite und umlaufende Zugabe in mm.
 * Übergabe vom Panel über die Datei G.uebergabeBreite ({ breite: gemessene Breite als Text }), Rückmeldung per CSEvent EVENT_BREITE_FERTIG.
 * Eingabe wie parseStrictMmNumber in 01-Druckbreite.jsx; der Fuß zeigt den ersten Eingabefehler, OK ist dann gesperrt. Enter = OK, Esc = Abbrechen.
 * OK: IP.breiteSetzen (gruppieren, skalieren, Zeichenfläche); Fehler der Ausführung als Popup, danach schließt das Fenster. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const path = require("path");
  const $ = id => document.getElementById(id);
  let bereit = false, laeuft = false;

  // Komma als Dezimaltrennzeichen, Punkt nur als Tausender; auf zwei Nachkommastellen, die dritte rundet; ungültig -> NaN (01-Druckbreite.jsx)
  function mmLesen(str) {
    let t = String(str).trim();
    if (t === "") return NaN;
    let vz = 1;
    if (t.charAt(0) === "-") { vz = -1; t = t.substring(1).trim(); }
    else if (t.charAt(0) === "+") t = t.substring(1).trim();
    if (t === "") return NaN;
    const ganz = /^(\d{1,3}(\.\d{3})+|\d+)$/;
    if (t.split(",").length > 2) return NaN;
    const ci = t.indexOf(",");
    let vor = t, nach = null;
    if (ci >= 0) {
      vor = t.substring(0, ci); nach = t.substring(ci + 1);
      if (nach === "" || !/^\d+$/.test(nach) || vor === "") return NaN;
    }
    if (!ganz.test(vor)) return NaN;
    const n = parseInt(vor.replace(/\./g, ""), 10);
    if (isNaN(n)) return NaN;
    if (nach === null) return vz * n;
    let cent;
    if (nach.length === 1) cent = n * 100 + parseInt(nach, 10) * 10;
    else if (nach.length === 2) cent = n * 100 + parseInt(nach, 10);
    else cent = n * 100 + parseInt(nach.substring(0, 2), 10) + (parseInt(nach.charAt(2), 10) >= 5 ? 1 : 0);
    return vz * cent / 100;
  }

  // Fehlertexte aus 01-Druckbreite.jsx; Rückgabe { breite, zugabe, fehler }
  function lesen() {
    const b = mmLesen($("ziel").value), z = mmLesen($("zugabe").value);
    const zahl = was => `Ungültige Eingabe für ${was}. Bitte eine gültige Zahl: Dezimaltrennzeichen nur Komma, Punkt nur als Tausender.`;
    let fehler = null;
    if (isNaN(b)) fehler = zahl("Breite");
    else if (b <= 0) fehler = "Ungültige Eingabe für Breite. Bitte eine Zahl > 0 angeben.";
    else if (isNaN(z)) fehler = zahl("Zugabe");
    else if (z < 0) fehler = "Ungültige Eingabe für Zugabe. Bitte eine Zahl ≥ 0 angeben.";
    return { breite: b, zugabe: z, fehler };
  }
  function pruefen() {
    const f = lesen().fehler;
    $("hinweis").textContent = f || "";
    $("hinweis").title = f || "";
    $("ok").disabled = !bereit || laeuft || !!f;
  }
  ["ziel", "zugabe"].forEach(id => $(id).addEventListener("input", pruefen));

  async function ok() {
    if ($("ok").disabled) return;
    const e = lesen();
    laeuft = true; pruefen();
    try { await G.host("breiteSetzen", { breite_mm: e.breite, zugabe_mm: e.zugabe }); }
    catch (x) { await G.popup(x.message); }
    G.senden(G.EVENT_BREITE_FERTIG, G.ID.breite, {});
    G.schliessen();
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  // ----- Start: JSX-Kern mit Schema, Vorbelegung aus der Übergabe -----
  (async () => {
    try {
      let schema;
      try { schema = K.schemaLaden(path.join(G.EXT, "config")); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(schema);
      const u = G.uebergabeBreite.lesen();
      $("ziel").value = u.breite || "";
      bereit = true;
      pruefen();
      setTimeout(() => { $("ziel").focus(); $("ziel").select(); }, 50);
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
