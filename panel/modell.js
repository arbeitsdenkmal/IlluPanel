/* Fenster „Modell“ (Extension de.pamnm.illupanels.modell, ModalDialog, SPEZ_03_Textil §6.2): Marke → Modell → Farbe in drei Spalten (SPEZ_03_Oberflaeche §10,
 * panel/lib/textil_wahl.js, Darstellung „spalten“).
 * OK bei Modellen mit Farbliste erst nach Wahl einer Farbe. OK legt eine weitere Arbeitsdatei Korrekturabzug_<ID>.ai (bzw. _02 …) im Auftragsordner der
 * vorderen Textil-Arbeitsdatei an – ohne Quelle, mit kunde, auftrag, ablage der aktiven und eigenem Bereich textil (anlegen.modellHinzufuegen); sie wird aktiv.
 * Enter = OK, Esc = Abbrechen. Rückmeldung per CSEvent EVENT_TEXTIL_FERTIG. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const AN = G.lib("anlegen.js");
  const TX = G.lib("textil.js");
  const TW = G.lib("textil_wahl.js");
  const $ = id => document.getElementById(id);
  let konf = null, wahl = null, laeuft = false;
  const pruefen = () => { $("ok").disabled = laeuft || !wahl || !wahl.gueltig(); };

  async function ok() {
    if ($("ok").disabled) return;
    laeuft = true; pruefen();
    try {
      await AN.modellHinzufuegen({ ext: G.EXT, konf, host: G.host }, wahl.wahl());
      G.senden(G.EVENT_TEXTIL_FERTIG, G.ID.modell, {});
      G.schliessen();
    } catch (e) { laeuft = false; pruefen(); await G.popup(e.message); }
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(konf.schema);
      const xmp = await D.xmpZugriff(G.host).xmpLesen(), aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa || aa.export.profil !== "textil") throw new Error("Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.");
      const tk = konf.textil.konfig;
      if (!tk) throw new Error(konf.textil.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      const mockups = TX.mockupsListe(G.EXT, tk);
      if (!mockups.length) $("hinweis").textContent = `Kein MockUp in ${TX.mockupOrdner(G.EXT, tk.cfg)}`;
      wahl = TW.modellwahl($("wahl"), { mockups, marken: tk.cfg.marken, farben: tk.farben, aenderung: pruefen, darstellung: "spalten", spalten: 4, flaeche: 26 });
      pruefen();
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
