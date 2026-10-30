/* Modaler Dialog „Auftrag“ (Extension de.pamnm.illupanels.anlegen), Stufe 1 nur Zweig „ohne Auftrag“ (SPEZ_01 §8).
 * Legt die Arbeitsdatei an (panel/lib/anlegen.js) und meldet das Ergebnis per CSEvent an das Panel. Fehler als Popup. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const AN = G.lib("anlegen.js");
  const $ = id => document.getElementById(id);

  let konf = null, arten = [], gewaehlt = null, laeuft = false, waehlt = false, erledigt = false;
  // Quelle: „geöffnete Datei“ = das beim Öffnen des Dialogs aktive Dokument, „Datei öffnen“ = im Dialog gewählt und sofort geöffnet, „leer“
  let offenInfo = { hatDokument: false }, dateiInfo = null, geoeffnet = null;
  const modus = () => (document.querySelector("input[name=quelle]:checked") || {}).value || null;
  const info = () => (modus() === "datei" ? dateiInfo : modus() === "offen" ? offenInfo : null);
  const quellXmp = () => { const i = info(); try { return i && i.hatDokument ? D.parsen(i.xmp) : null; } catch (e) { return null; } };
  const wert = n => (document.querySelector(`input[name=${n}]:checked`) || {}).value;
  const aa = () => (konf && gewaehlt ? konf.arten[gewaehlt] : null);
  const schliessen = () => G.cep.closeExtension();

  function zusatz() {
    const a = aa(), z = a ? a.zeichenflaeche : {}, q = modus(), x = quellXmp();
    $("zFahrzeug").hidden = !(a && z.fahrzeugvorlage);
    $("fzV").disabled = q === "leer" || !!x; // Fahrzeugvorlage nur aus einer Quelle mit Inhalt ohne Panel-XMP
    if ($("fzV").disabled) $("fzV").checked = false;
    $("zVerfahren").hidden = !(a && z.art === "vorlage" && a.verfahren);
    $("zMass").hidden = !(a && z.art === "abfrage");
    $("zMassstab").hidden = !(a && AN.massstabFrage(q, info(), x) && !($("fzV").checked && !$("zFahrzeug").hidden));
  }
  function pruefe() {
    const a = aa(), q = modus(), z = a ? a.zeichenflaeche : {};
    const quelleOk = q === "leer" || (q === "offen" && offenInfo.hatDokument) || (q === "datei" && !!dateiInfo);
    const massOk = z.art !== "abfrage" || (Number($("breite").value) > 0 && Number($("hoehe").value) > 0 && Number.isInteger(Number($("anzahl").value)) && Number($("anzahl").value) >= 1);
    const verfOk = $("zVerfahren").hidden || !!wert("verf");
    $("los").disabled = laeuft || waehlt || !a || !$("kunde").value.trim() || !quelleOk || !massOk || !verfOk;
  }
  function waehle(id) {
    gewaehlt = id;
    $("arten").querySelectorAll(".art").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    const z = aa().zeichenflaeche;
    if (z.art === "abfrage") { // Vorbelegung aus der Konfiguration, falls vorhanden
      $("breite").value = z.breite_mm || ""; $("hoehe").value = z.hoehe_mm || ""; $("anzahl").value = "1";
    }
    zusatz(); pruefe(); $("kunde").focus();
  }

  // Datei öffnen: Dateidialog von Illustrator, die gewählte Datei wird sofort geöffnet (ist sie schon offen, nur aktiviert)
  async function dateiWaehlen() {
    waehlt = true; pruefe();
    try {
      const pfad = (await G.host("dateiWaehlen")).pfad;
      if (pfad) {
        await dateiZurueck(false);
        const r = await G.host("dateiOeffnen", pfad);
        dateiInfo = r.info; geoeffnet = r.selbstGeoeffnet ? { name: r.info.name, pfad: r.info.pfad } : null;
      }
    } catch (e) { await G.popup(e.message); }
    waehlt = false; zusatz(); pruefe();
  }
  // die im Dialog geöffnete Datei ohne Speichern schließen und – bei aktivieren – das vorherige Dokument wieder aktivieren
  async function dateiZurueck(aktivieren) {
    const spec = { schliessen: geoeffnet, vorher: aktivieren && offenInfo.hatDokument ? { name: offenInfo.name, pfad: offenInfo.pfad } : null };
    geoeffnet = null; dateiInfo = null;
    if (spec.schliessen || spec.vorher) await G.host("dateiZurueck", spec);
  }
  async function quelleGewechselt() {
    waehlt = true; pruefe();
    try { await dateiZurueck(true); } catch (e) { await G.popup(e.message); }
    waehlt = false; zusatz(); pruefe();
  }
  $("qOffen").addEventListener("change", quelleGewechselt);
  $("qLeer").addEventListener("change", quelleGewechselt);
  $("qDatei").addEventListener("click", () => { zusatz(); pruefe(); dateiWaehlen(); }); // click: auch bei schon gewähltem Feld erneut wählen
  ["kunde", "breite", "hoehe", "anzahl"].forEach(id => $(id).addEventListener("input", pruefe));
  document.querySelectorAll("input[name=verf]").forEach(r => r.addEventListener("change", pruefe));
  $("fzV").addEventListener("change", () => { zusatz(); pruefe(); });

  async function los() {
    if ($("los").disabled) return;
    laeuft = true; pruefe();
    try {
      await AN.anlegen({
        ext: G.EXT, konf, host: G.host, meldung: G.popup,
        ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad
      }, {
        art: gewaehlt, kunde: $("kunde").value, quelle: modus(), info: info(), quellXmp: quellXmp(),
        selbstGeoeffnet: modus() === "datei" && !!geoeffnet, fahrzeugvorlage: !$("zFahrzeug").hidden && $("fzV").checked,
        verfahren: wert("verf"), breite_mm: $("breite").value, hoehe_mm: $("hoehe").value, anzahl: $("anzahl").value,
        quellMassstab: $("zMassstab").hidden ? 1 : Number(wert("mst"))
      });
      erledigt = true; geoeffnet = null;
      G.senden(G.EVENT_ANGELEGT, "de.pamnm.illupanels.anlegen", { ok: true });
      schliessen();
    } catch (e) {
      if (!e.abgebrochen) await G.popup(e.message);
      laeuft = false; pruefe();
    }
  }
  async function abbrechen() {
    erledigt = true;
    if (modus() === "datei") { try { await dateiZurueck(true); } catch (e) { /* Dialog schließt trotzdem */ } }
    schliessen();
  }
  $("los").addEventListener("click", los);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); los(); }
    if (e.key === "Escape") { e.preventDefault(); abbrechen(); }
  });
  // Schließen über das Fenster-X räumt auf wie Esc (ohne await beim Entladen)
  window.addEventListener("beforeunload", () => {
    if (erledigt || !geoeffnet) return;
    const spec = { schliessen: geoeffnet, vorher: offenInfo.hatDokument ? { name: offenInfo.name, pfad: offenInfo.pfad } : null };
    try { G.cep.evalScript(`IP.dateiZurueck(${JSON.stringify(spec)})`, () => {}); } catch (e) { /* zu */ }
  });

  // ----- Start: Konfiguration, JSX-Kern, vorderes Dokument -----
  (async () => {
    try { konf = K.allesLaden(G.EXT); }
    catch (e) {
      const liste = e instanceof K.KonfigFehler ? e.fehler : [{ datei: "", grund: e.message }];
      for (const f of liste) await G.popup(`${f.datei}\n${f.grund}`);
      return;
    }
    arten = AN.dialogArten(konf.arten);
    for (const a of arten) {
      const b = document.createElement("button");
      b.className = "art"; b.textContent = a.name; b.dataset.id = a.id; b.title = a.name;
      b.addEventListener("click", () => waehle(a.id));
      $("arten").appendChild(b);
    }
    try {
      await G.kernLaden(konf.schema);
      offenInfo = await G.host("dokumentInfo");
    } catch (e) { await G.popup(e.message); }
    $("qOffen").disabled = !offenInfo.hatDokument;
    (offenInfo.hatDokument ? $("qOffen") : $("qLeer")).checked = true;
    if (arten.length) waehle(arten[0].id);
    zusatz(); pruefe();
    setTimeout(() => $("kunde").focus(), 50);
  })();
})();
