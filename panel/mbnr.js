/* Fenster „Bögl Nummern“ (Extension de.pamnm.illupanels.mbnr, ModalDialog, SPEZ_03_Nutzen §7, SPEZ_03_Oberflaeche §12.3): Felder „Nummer 1:“ … vorbelegt aus
 * auftrag.txt im Bögl-Kundenordner (nicht erreichbar oder fehlend: 0); Ergebnis beim Tippen (Material und Überproduktion wie die Info-Ebene, mbnummern.planung,
 * nutzenbogen.mbErgebnis; ohne gültige Stückzahl leer); „Aufbauen“ prüft (Texte aus 03-MB Nummern.jsx v1.3), plant und baut je Bogen über den Druckbogen-Kern
 * (Quelle fertig: Gruppen der Masterdatei). Prüfmeldungen gesammelt als ein Popup, sonst keine Meldung. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const A = G.lib("ablage.js");
  const R = G.lib("rollen.js");
  const GI = G.lib("gitter.js");
  const M = G.lib("mbnummern.js");
  const NB = G.lib("nutzenbogen.js");
  const EX = G.lib("export.js");
  const path = require("path");
  const $ = id => document.getElementById(id);

  let konf = null, nk = null, laeuft = false;
  const felder = {};
  const fertig = () => { G.senden(G.EVENT_NUTZEN_FERTIG, G.ID.mbnr, {}); G.schliessen(); };

  async function aufbauen() {
    if (laeuft || !nk) return;
    laeuft = true;
    try {
      const mb = nk.mb, werte = {};
      for (let nr = 1; nr <= mb.nummern; nr++) werte[nr] = felder[nr].value;
      const vorlage = path.join(G.EXT, mb.vorlage), p = M.mengenPruefen(vorlage, mb.vorlage, werte, mb.nummern);
      if (p.fehler) { await G.popup(p.fehler); return; }
      $("aufbauen").disabled = $("abbrechen").disabled = true;
      const ms = NB.masse(konf, nk.boegl.medium);
      const pl = M.planung(p.mengen, mb, { nutzbar: ms.rolle - 2 * ms.kantenhalter - ms.rand, max_hoehe: ms.max_laenge - ms.rand });
      if (pl.fehler) { await G.popup(pl.fehler); fertig(); return; }
      try {
        const plan = NB.aufbauPlanen(NB.mbBoegen(pl, p.mengen, mb, ms, path.basename(mb.vorlage)), { art: "mb", aa: konf.arten.beschriftung, medien: konf.medien,
          kunde: nk.boegl.kunde, produkt: null, medium: nk.boegl.medium, laminat: nk.boegl.laminat, breite_mm: ms.rolle, auftrag: null,
          ablage: { kundenordner: nk.boegl.kundenordner, auftragsordner: NB.boeglAuftragsordner(new Date(), mb.ordner) }, arbeitsdatei: null,
          massstab: 1, abstand_mm: mb.abstand_mm, erstellt: NB.ERSTELLT_BOEGL, fertig: NB.mbFertig(pl, p.mengen, mb, vorlage) });
        const r = await NB.aufbauen(G.host, plan);
        const text = GI.pruefText(r.hinweise);
        if (text) await G.popup(text);
      } catch (e) { await G.popup(e.message); }
      fertig();
    } finally { laeuft = false; }
  }
  // Ergebnis beim Tippen: dieselbe Planung und Rechnung wie beim Aufbauen bzw. in der Info-Ebene
  function ergebnis() {
    const mb = nk.mb, werte = {};
    for (let nr = 1; nr <= mb.nummern; nr++) werte[nr] = felder[nr].value;
    const m = M.mengenLesen(werte, mb.nummern), ms = NB.masse(konf, nk.boegl.medium);
    const pl = m.summe > 0 ? M.planung(m.mengen, mb, { nutzbar: ms.rolle - 2 * ms.kantenhalter - ms.rand, max_hoehe: ms.max_laenge - ms.rand }) : null;
    $("ergebnis").textContent = pl && !pl.fehler ? NB.mbErgebnis(pl, m.mengen, mb, ms).join("\n") : "";
  }
  $("aufbauen").addEventListener("click", aufbauen);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); aufbauen(); } });

  // ----- Start: Konfiguration, Kern, Vorbelegung aus auftrag.txt -----
  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      const n = konf.nutzen.konfig;
      if (!n) throw new Error(konf.nutzen.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      if (!R.standardbreite(konf.medien, n.boegl.medium)) throw new Error(R.fehlt(n.boegl.medium));
      await G.kernLaden(konf.schema);
      const datei = path.join(A.unter(konf.rechner.server.kunden, n.boegl.kundenordner), n.boegl.auftrag);
      const vorgabe = await M.leseAuftrag(datei, n.mb.nummern, EX.ZEITLIMIT_MS);
      for (let nr = 1; nr <= n.mb.nummern; nr++) {
        const z = document.createElement("label"); z.className = "nummer";
        const s = document.createElement("span"); s.className = "muted"; s.textContent = "Nummer " + nr + ":";
        const f = document.createElement("input"); f.type = "text"; f.value = String(vorgabe[nr] !== undefined ? vorgabe[nr] : 0);
        f.addEventListener("input", ergebnis);
        felder[nr] = f; z.append(s, f); $("nummern").appendChild(z);
      }
      nk = n;
      ergebnis();
      $("aufbauen").disabled = false;
      setTimeout(() => { felder[1].focus(); felder[1].select(); }, 50);
    } catch (e) { await G.popup(e.message); fertig(); }
  })();
})();
