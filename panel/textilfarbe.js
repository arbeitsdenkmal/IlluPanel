/* Fenster „Textilfarbe“ (Extension de.pamnm.illupanels.textilfarbe, ModalDialog, SPEZ_03_Textil §6.1): Farbraster der Modell-ID aus textil_farben.csv mit der
 * aktuellen Farbe vorgewählt (ein gespeicherter Name ohne Listeneintrag als eigene Kachel ohne Farbfläche); ohne Liste Freitextfeld. Klick wählt nur aus.
 * OK schreibt textil.farbe ins XMP und färbt bei cmyk die Ebene „Stofffarbe“ um (IP.textilStofffarbe; fehlt die Ebene, wird nur der Name gespeichert);
 * Freitext färbt nicht um. Abbrechen ändert nichts. Enter = OK, Esc = Abbrechen. Rückmeldung per CSEvent EVENT_TEXTIL_FERTIG (das Panel liest neu). */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const TX = G.lib("textil.js");
  const TW = G.lib("textil_wahl.js");
  const $ = id => document.getElementById(id);
  const X = D.xmpZugriff(G.host);
  let raster = null, laeuft = false;
  const pruefen = () => { $("ok").disabled = laeuft || !raster || !raster.gueltig(); };

  async function ok() {
    if ($("ok").disabled) return;
    laeuft = true; pruefen();
    try {
      const f = raster.farbe(), x = await X.xmpLesen();
      await X.xmpSchreiben(D.aendern(x, { "textil.farbe": f }));
      if (f && f.cmyk) await G.host("textilStofffarbe", { cmyk: f.cmyk });
      G.senden(G.EVENT_TEXTIL_FERTIG, G.ID.textilfarbe, {});
      G.schliessen();
    } catch (e) { laeuft = false; pruefen(); await G.popup(e.message); }
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  (async () => {
    try {
      let konf;
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(konf.schema);
      const xmp = await X.xmpLesen(), aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa || aa.export.profil !== "textil" || !xmp.textil || !xmp.textil.modell) throw new Error("Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.");
      const tk = konf.textil.konfig;
      if (!tk) throw new Error(konf.textil.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      const m = xmp.textil.modell;
      $("kopf").textContent = `${m.marke || ""} ${m.bezeichnung || m.modell}`.trim();
      raster = TW.farbraster($("farbe"), { liste: TX.farbenFuer(tk.farben, m.id), wert: xmp.textil.farbe ? xmp.textil.farbe.name : "", aenderung: pruefen,
        spalten: 5, flaeche: 40 });
      pruefen();
      const f = document.querySelector("#farbe input"); if (f) f.focus();
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
