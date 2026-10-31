/* Modaler Dialog „Auftrag“ (Extension de.pamnm.illupanels.anlegen), Stufe 1 nur Zweig „ohne Auftrag“ (SPEZ_01 §8).
 * Legt die Arbeitsdatei an (panel/lib/anlegen.js) und meldet das Ergebnis per CSEvent an das Panel. Fehler als Popup.
 * Offset, Banner/Roll-up, Sonstiges, Lasergravur, Schild (Verfahren, Material; SPEZ_03_Schild §2.3, §4), Textil (Marke → Modell → Farbe, SPEZ_03_Textil §4;
 * keine Maßstabsabfrage; gesperrt bei fehlerhafter Textil-Konfiguration oder ohne MockUp, Tooltip = Gründe bzw. erwarteter Ordner): die Felder werden zum Wahl-Objekt
 * (SPEZ_03_Konfigurationen §2.1); Vorbelegung aus der Quelle bei Wahl der
 * Art, Wechsel der Quelle und Wechsel der Maßstabsabfrage (§2.2). Vorlagen werden beim Öffnen des Dialogs auf Vorhandensein geprüft (§3.2, §4.2).
 * Aufbau SPEZ_03_Oberflaeche §4: Arten links als Liste, Quelle, Verfahren, Ausrichtung, Banner/Roll-up und Maßstab als Segment-Buttons (Funktion wie die
 * früheren Radiobuttons; „Datei öffnen“ öffnet bei jedem Klick den Dateidialog); die Linie über den Feldern der Art entfällt, wenn es keine gibt. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const AN = G.lib("anlegen.js");
  const TX = G.lib("textil.js");
  const TW = G.lib("textil_wahl.js");
  const $ = id => document.getElementById(id);

  let konf = null, arten = [], gewaehlt = null, laeuft = false, waehlt = false, erledigt = false;
  let angebot = []; // Offset-Produkte mit Vorlagen-Befund (AN.offsetAngebot)
  let mockups = [], textilWahl = null; // Textil: Modelle mit MockUp-Datei, Komponente Marke → Modell → Farbe
  // Quelle: „geöffnete Datei“ = das beim Öffnen des Dialogs aktive Dokument, „Datei öffnen“ = im Dialog gewählt und sofort geöffnet, „leer“
  let offenInfo = { hatDokument: false }, dateiInfo = null, geoeffnet = null;
  // Segment-Buttons statt Radiobuttons: gewählter Wert je Gruppe (null = nichts gewählt), Maßstab vorbelegt 1:1
  const wahlen = { quelle: null, verf: null, ausr: null, variante: null, mst: "1" };
  const GRUPPE = { quelle: "quelle", verf: "zVerfahren", ausr: "zAusrichtung", variante: "zVariante", mst: "zMassstab" };
  const segZeichnen = () => Object.keys(GRUPPE).forEach(n => $(GRUPPE[n]).querySelectorAll("button").forEach(b => b.classList.toggle("an", b.dataset.w === wahlen[n])));
  const modus = () => wahlen.quelle;
  const info = () => (modus() === "datei" ? dateiInfo : modus() === "offen" ? offenInfo : null);
  const quellXmp = () => { const i = info(); try { return i && i.hatDokument ? D.parsen(i.xmp) : null; } catch (e) { return null; } };
  const wert = n => wahlen[n] || undefined;
  const aa = () => (konf && gewaehlt ? konf.arten[gewaehlt] : null);
  // Offset: { frei: true } | Eintrag aus angebot | null (nichts gewählt)
  const produkt = () => { const v = $("produkt").value; return v === "frei" ? { frei: true } : v ? angebot[Number(v.slice(1))] : null; };
  const quelleMitInhalt = () => { const i = info(); return modus() !== "leer" && i && i.hatDokument ? i : null; };
  const massstabQuelle = () => { const x = quellXmp(); return x ? Number(x.massstab) || 1 : AN.massstabFrage(modus(), info(), x) ? Number(wert("mst")) || 1 : 1; };
  const istTextil = () => { const a = aa(); return !!a && a.id === "textil"; };
  const schliessen = () => G.cep.closeExtension();

  function zusatz() {
    const a = aa(), z = a ? a.zeichenflaeche : {}, q = modus(), x = quellXmp();
    $("zFahrzeug").hidden = !(a && z.fahrzeugvorlage);
    $("fzV").disabled = q === "leer" || !!x; // Fahrzeugvorlage nur aus einer Quelle mit Inhalt ohne Panel-XMP
    if ($("fzV").disabled) $("fzV").checked = false;
    $("zVerfahren").hidden = !(a && z.art === "vorlage" && a.verfahren);
    $("zMaterial").hidden = !(a && a.id === "schild");
    const off = !!a && a.id === "offset", br = !!a && a.id === "banner_rollup", p = off ? produkt() : null;
    $("zOffset").hidden = !off;
    $("zAusrichtung").hidden = !(p && !p.frei && p.ausrichtungen.length === 2);
    $("zVariante").hidden = !br;
    // Maße: Abfrage (Banner nur bei Wahl „Banner“) und freies Format; Anzahl allein bei Offset-Produkten mit 1/2
    const mass = (!!a && z.art === "abfrage" && (!br || wert("variante") === "banner")) || !!(p && p.frei);
    $("zBH").hidden = !mass;
    $("zMass").hidden = !(mass || (p && !p.frei && p.produkt.zeichenflaechen === "1/2"));
    $("anzahl").max = off ? "2" : "";
    $("zTextil").hidden = !istTextil();
    $("zMassstab").hidden = !(a && !istTextil() && AN.massstabFrage(q, info(), x) && !($("fzV").checked && !$("zFahrzeug").hidden));
    $("felder").hidden = ![...$("felder").children].some(c => !c.hidden); // Lasergravur: keine Felder, keine Linie
    segZeichnen();
  }
  function pruefe() {
    const a = aa(), q = modus();
    const quelleOk = q === "leer" || (q === "offen" && offenInfo.hatDokument) || (q === "datei" && !!dateiInfo);
    const n = Number($("anzahl").value), off = !!a && a.id === "offset", p = off ? produkt() : null;
    const massOk = $("zBH").hidden || (Number($("breite").value) > 0 && Number($("hoehe").value) > 0);
    const anzahlOk = $("zMass").hidden || (Number.isInteger(n) && n >= 1 && (!off || n <= 2));
    const verfOk = ($("zVerfahren").hidden || !!wert("verf")) && ($("zMaterial").hidden || !!$("material").value);
    const wahlOk = (!off || (!!p && ($("zAusrichtung").hidden || !!wert("ausr")))) && ($("zVariante").hidden || !!wert("variante"))
      && (!istTextil() || (!!textilWahl && textilWahl.gueltig()));
    $("los").disabled = laeuft || waehlt || !a || !$("kunde").value.trim() || !quelleOk || !massOk || !anzahlOk || !verfOk || !wahlOk;
  }
  function waehle(id) {
    gewaehlt = id;
    $("arten").querySelectorAll(".art").forEach(b => b.classList.toggle("an", b.dataset.id === id));
    const z = aa().zeichenflaeche;
    if (z.art === "abfrage") { // Vorbelegung aus der Konfiguration, falls vorhanden (Sonstiges danach aus der Quelle)
      $("breite").value = z.breite_mm || ""; $("hoehe").value = z.hoehe_mm || ""; $("anzahl").value = "1";
    }
    $("produkt").value = ""; // Offset, Banner/Roll-up und Schild-Material ohne Vorauswahl
    $("material").value = "";
    wahlen.variante = null;
    textilWahl = id === "textil" ? TW.modellwahl($("zTextil"), { mockups, marken: konf.textil.konfig.cfg.marken, farben: konf.textil.konfig.farben, aenderung: pruefe,
      darstellung: "untereinander", spalten: 6, flaeche: 22 }) : null;
    vorbelegen();
    zusatz(); pruefe(); $("kunde").focus();
  }
  // Vorbelegung aus der Quelle (Offset, Sonstiges): Realmaß von Zeichenfläche 1, Anzahl, Ausrichtung; leer aus der Konfiguration bzw. 1 / hoch
  function vorbelegen() {
    const a = aa();
    if (!a || !["offset", "sonstiges"].includes(a.id)) return;
    const v = AN.vorbelegung(a, quelleMitInhalt(), massstabQuelle());
    $("breite").value = v.breite_mm === null ? "" : v.breite_mm;
    $("hoehe").value = v.hoehe_mm === null ? "" : v.hoehe_mm;
    $("anzahl").value = a.id === "offset" ? Math.min(v.anzahl, 2) : v.anzahl;
    if (a.id === "offset") { wahlen.ausr = v.ausrichtung || null; segZeichnen(); }
  }
  // Wahl-Objekt (SPEZ_03_Konfigurationen §2.1); undefined für die übrigen Arten (Aufruf wie gebaut)
  function wahl() {
    const a = aa(), mass = { breite_mm: Number($("breite").value), hoehe_mm: Number($("hoehe").value) }, n = Number($("anzahl").value);
    if (a.id === "offset") {
      const p = produkt();
      if (p.frei) return Object.assign({ produkt: null, ausrichtung: null, seiten: n }, mass);
      const zf = p.produkt.zeichenflaechen;
      return { produkt: p.produkt.schluessel, ausrichtung: p.ausrichtungen.length === 2 ? wert("ausr") : p.ausrichtungen[0], seiten: zf === "1/2" ? n : Number(zf) };
    }
    if (a.id === "banner_rollup") { const v = wert("variante"); return v === "banner" ? Object.assign({ variante: v, anzahl: n }, mass) : { variante: v }; }
    if (a.id === "sonstiges") return Object.assign({ anzahl: n }, mass);
    if (a.id === "lasergravur") return {};
    if (a.id === "schild") return { verfahren: wert("verf") || null, material: $("material").value || null };
    if (a.id === "textil") return textilWahl.wahl();
    return undefined;
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
    waehlt = false; zusatz(); vorbelegen(); zusatz(); pruefe();
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
    waehlt = false; zusatz(); vorbelegen(); zusatz(); pruefe();
  }
  // Klick auf einen Segment-Button der Gruppe n: Wert setzen; fn nur bei Wechsel (wie das change-Ereignis der Radiobuttons)
  const segKlick = (n, fn) => $(GRUPPE[n]).querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    if (b.disabled || wahlen[n] === b.dataset.w) return;
    wahlen[n] = b.dataset.w; segZeichnen(); fn();
  }));
  $("quelle").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    if (b.disabled) return;
    const vorher = wahlen.quelle;
    wahlen.quelle = b.dataset.w; segZeichnen();
    if (b.dataset.w === "datei") { zusatz(); pruefe(); dateiWaehlen(); } // bei jedem Klick erneut wählen
    else if (vorher !== b.dataset.w) quelleGewechselt();
  }));
  ["kunde", "breite", "hoehe", "anzahl"].forEach(id => $(id).addEventListener("input", pruefe));
  segKlick("verf", pruefe);
  $("fzV").addEventListener("change", () => { zusatz(); pruefe(); });
  segKlick("mst", () => { vorbelegen(); pruefe(); });
  segKlick("ausr", pruefe);
  $("produkt").addEventListener("change", () => { zusatz(); pruefe(); });
  $("material").addEventListener("change", pruefe);

  async function los() {
    if ($("los").disabled) return;
    laeuft = true; pruefe();
    try {
      const r = await AN.anlegen({
        ext: G.EXT, konf, host: G.host, meldung: G.popup,
        ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad
      }, {
        art: gewaehlt, kunde: $("kunde").value, quelle: modus(), info: info(), quellXmp: quellXmp(),
        selbstGeoeffnet: modus() === "datei" && !!geoeffnet, fahrzeugvorlage: !$("zFahrzeug").hidden && $("fzV").checked,
        wahl: wahl(),
        quellMassstab: $("zMassstab").hidden ? 1 : Number(wert("mst"))
      });
      erledigt = true; geoeffnet = null;
      if (r.ausserhalb > 0) await G.popup(`${r.ausserhalb} Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage`);
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
    const csvFehler = konf.produkte.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n");
    const materialFehler = konf.schildMaterialien.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n");
    // Textil: Konfigurationsfehler, sonst ohne ein einziges MockUp gesperrt (Tooltip = erwarteter Ordner)
    const tk = konf.textil.konfig;
    mockups = tk ? TX.mockupsListe(G.EXT, tk) : [];
    const textilFehler = !tk ? konf.textil.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n") : !mockups.length ? TX.mockupOrdner(G.EXT, tk.cfg) : "";
    const gesperrt = id => (id === "offset" ? csvFehler : id === "schild" ? materialFehler : id === "textil" ? textilFehler : ""); // Sperrgrund als Tooltip, "" = frei
    for (const a of arten) {
      const b = document.createElement("button");
      b.className = "art"; b.textContent = a.name; b.dataset.id = a.id; b.title = a.name;
      if (gesperrt(a.id)) { b.disabled = true; b.title = gesperrt(a.id); } // produkte.csv bzw. schild_materialien.csv fehlerhaft: nur Offset bzw. Schild gesperrt
      b.addEventListener("click", () => waehle(a.id));
      $("arten").appendChild(b);
    }
    // Offset: Produkte in CSV-Reihenfolge, zuletzt „freies Format“; Vorlagen aus vorlage_hoch/vorlage_quer, Wahl hoch/quer nur bei beiden vorhanden;
    // ohne jede Vorlage gesperrt, Tooltip = erwartete Pfade
    if (konf.arten.offset && konf.produkte.liste) {
      const sel = $("produkt");
      sel.appendChild(new Option("", ""));
      angebot = AN.offsetAngebot(G.EXT, konf.arten.offset, konf.produkte.liste);
      angebot.forEach((x, i) => {
        const o = new Option(x.produkt.bezeichnung, `p${i}`);
        if (x.gesperrt) { o.disabled = true; o.title = x.fehlend.join("\n"); }
        sel.appendChild(o);
      });
      sel.appendChild(new Option(konf.arten.offset.frei.name, "frei"));
    }
    // Banner/Roll-up: „Banner“ und die Roll-up-Größen; fehlende Vorlage -> Option gesperrt, Tooltip = Pfad
    if (konf.arten.banner_rollup) {
      const br = konf.arten.banner_rollup;
      [{ id: "banner", name: br.banner.name, vorhanden: true }].concat(AN.rollupAngebot(G.EXT, br).map(x => ({ id: x.rollup.id, name: x.rollup.name, vorhanden: x.vorhanden, pfad: x.pfad })))
        .forEach(v => {
          const b = document.createElement("button");
          b.type = "button"; b.dataset.w = v.id; b.textContent = v.name; b.disabled = !v.vorhanden;
          if (!v.vorhanden) b.title = v.pfad;
          $("zVariante").appendChild(b);
        });
      segKlick("variante", () => { zusatz(); pruefe(); });
    }
    try {
      await G.kernLaden(konf.schema);
      offenInfo = await G.host("dokumentInfo");
    } catch (e) { await G.popup(e.message); }
    $("quelle").querySelector("[data-w=offen]").disabled = !offenInfo.hatDokument;
    wahlen.quelle = offenInfo.hatDokument ? "offen" : "leer";
    // Schild: Material mit bezeichnung in CSV-Reihenfolge, keine Vorauswahl
    if (konf.schildMaterialien.liste) {
      $("material").appendChild(new Option("", ""));
      konf.schildMaterialien.liste.forEach(m => $("material").appendChild(new Option(m.bezeichnung, m.schluessel)));
    }
    const erste = arten.find(a => !gesperrt(a.id));
    if (erste) waehle(erste.id);
    zusatz(); pruefe();
    setTimeout(() => $("kunde").focus(), 50);
  })();
})();
