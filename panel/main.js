/* Panel „PAM-Werkzeuge“ (Extension de.pamnm.illupanels.panel), SPEZ_01 §3.
 * Start: Konfiguration laden und prüfen – jeder Fehler ein Popup mit Datei und Grund, Buttons bleiben gesperrt.
 * Aktualisierung nur bei Maus ins Panel, Fokus oder Aktion, keine Dauerabfragen. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const EX = G.lib("export.js");
  const FL = G.lib("export_flach.js");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = D.xmpZugriff(G.host);

  let konf = null;   // { rechner, schema, arten, mapping }
  let info = null;   // dokumentInfo des vorderen Dokuments
  let xmp = null;    // Dokumentobjekt (ip:Dokument) oder null
  let beschaeftigt = 0, abrufLaeuft = false;

  // ----- Kopfzeile und Buttons -----
  async function aktualisieren() {
    if (!konf) return;
    info = await G.host("dokumentInfo");
    xmp = null;
    if (info.hatDokument) { try { xmp = D.parsen(info.xmp); } catch (e) { xmp = null; } }
    const aa = xmp ? konf.arten[xmp.auftragsart] : null;
    if (!aa) xmp = null;
    $("kopf").innerHTML = aa ? `<b>${esc(xmp.kunde)}</b> · ${esc(aa.name)} · M 1:${esc(xmp.massstab)}` : "";
    $("kopf").title = aa && xmp.ablage.kundenordner ? xmp.ablage.kundenordner : "";
    $("btnAuftrag").disabled = false;
    $("btnExport").disabled = !(aa && aa.export.profil === "flach"); // Stufe 1: nur Profil „flach“
  }
  async function aufAbruf() {
    if (abrufLaeuft || beschaeftigt) return;
    abrufLaeuft = true;
    try { await aktualisieren(); } catch (e) { /* still */ } finally { abrufLaeuft = false; }
  }
  document.documentElement.addEventListener("mouseenter", aufAbruf);
  window.addEventListener("focus", aufAbruf);

  async function aktion(knopf, fn) {
    beschaeftigt++; document.body.classList.add("besch"); if (knopf) knopf.disabled = true;
    try { await fn(); }
    catch (e) { if (!e.abgebrochen) await G.popup(e.message); }
    finally {
      beschaeftigt--; document.body.classList.remove("besch");
      try { await aktualisieren(); } catch (e) { /* still */ }
    }
  }

  // ----- Auftrag: Dialog „ohne Auftrag“ -----
  $("btnAuftrag").addEventListener("click", () => G.cep.requestOpenExtension("de.pamnm.illupanels.anlegen", ""));
  G.cep.addEventListener(G.EVENT_ANGELEGT, () => aufAbruf());

  // ----- Export (Profil „flach“) über den Exportkern -----
  $("btnExport").addEventListener("click", () => aktion($("btnExport"), async () => {
    await aktualisieren();
    if (!xmp) return;
    const aa = konf.arten[xmp.auftragsart];
    if (!info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
    const auftrag = FL.auftrag(aa, xmp, G.host, info.pfad);
    const r = await EX.exportieren(auftrag, {
      rechner: konf.rechner,
      ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad,
      meldung: G.popup,
      xmpSchreiben: X.xmpSchreiben,
      arbeitsdatei: { pfad: info.pfad, speichern: () => G.host("dokumentSpeichern") }
    });
    if (r.meldung) await G.popup(r.meldung);
  }));

  // ----- Start -----
  (async () => {
    try { konf = K.allesLaden(G.EXT); }
    catch (e) {
      const liste = e instanceof K.KonfigFehler ? e.fehler : [{ datei: "", grund: e.message }];
      for (const f of liste) await G.popup(`${f.datei}\n${f.grund}`);
      return;
    }
    try { await G.kernLaden(konf.schema); await aktualisieren(); }
    catch (e) { konf = null; $("btnAuftrag").disabled = true; $("btnExport").disabled = true; await G.popup(e.message); }
  })();
})();
