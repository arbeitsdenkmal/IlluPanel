/* Panel „PAM-Werkzeuge“ (Extension de.pamnm.illupanels.panel), SPEZ_01 §3, SPEZ_02 §13 (MockUp A5/A7).
 * Start: Konfiguration laden und prüfen – jeder Fehler ein Popup mit Datei und Grund, Buttons bleiben gesperrt.
 * Aktualisierung nur bei Maus ins Panel, nach eigener Aktion und nach CSEvent aus „Objekt“ und „Zusammenfassung“; keine Dauerabfragen und kein
 * Abruf bei Fenster-Fokus (Befund Stufe 43: der Fokus-Abruf lief während des PDF-Imports, der Inhalt landete im falschen Dokument).
 * Zustände: ohne Panel-Dokument nur Auftrag; Arbeitsdatei ohne Kalkulation plus Zeile 1 (Export bei Profil „flach“); Druckbogen vorn: Zeile 1 mit dem
 * Bogen „n/m“, nur Export und Auftrag aktiv; kalkulierte Arbeitsdatei: Objektzeile, add/edit · berechnen, Summa · Druck · Export, Preiszeile aus dem
 * Datensatz im XMP. Summa, Druck und Export der Druckbögen (Profil produktion) laufen über panel/lib/auftrag.js. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const EX = G.lib("export.js");
  const FL = G.lib("export_flach.js");
  const AU = G.lib("auftrag.js");
  const Z = G.lib("zuordnen.js");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = D.xmpZugriff(G.host);

  let konf = null;   // { rechner, schema, arten, mapping, medien, farben }
  let info = null;   // dokumentInfo des vorderen Dokuments
  let xmp = null;    // Dokumentobjekt (ip:Dokument) oder null
  let aa = null;     // Auftragsart des vorderen Dokuments
  let auswahl = [];  // ausgewählte oberste Objekte (nur kalkulierte Arbeitsdatei)
  let unterebene = false; // Auswahl enthält Objekte in Unterebenen
  let beschaeftigt = 0, abrufLaeuft = false;

  const kalkuliert = () => !!(xmp && xmp.rolle === "arbeitsdatei" && aa && aa.kalkulation && aa.preis);
  const druckbogen = () => !!(xmp && xmp.rolle === "druckbogen");
  const rollenVon = a => { const r = {}; a.ebenen.forEach(e => { r[e.name] = e.rolle; }); return r; };
  const kx = () => ({ farben: konf.farben, medien: konf.medien, aa });

  // ----- Anzeige -----
  async function aktualisieren() {
    if (!konf) return;
    info = await G.host("dokumentInfo");
    xmp = null;
    if (info.hatDokument) { try { xmp = D.parsen(info.xmp); } catch (e) { xmp = null; } }
    aa = xmp ? konf.arten[xmp.auftragsart] : null;
    if (!aa) xmp = null;
    const a = kalkuliert() ? await G.host("auswahlLesen", { rollen: rollenVon(aa), blaetter: false }) : { objekte: [], unterebene: false };
    unterebene = !!a.unterebene;
    auswahl = unterebene ? [] : a.objekte;
    zeichnen();
  }

  function zeichnen() {
    // Zeile 1: Kunde · Auftragsart (ohne Maßstab) | Grafik N min + „+m“ (Feld ohne Funktion bis 2d); Druckbogen: Kunde · Druckbogen <Medium> <Laminat> <Breite> · n/m
    // (ohne bogen.gesamt nur n)
    const b = druckbogen() ? xmp.bogen || {} : null;
    $("kopf").innerHTML = !xmp ? "" : b ? `<b>${esc(xmp.kunde)}</b> · Druckbogen ${esc([b.medium, Z.laminatName(aa, b.laminat), b.breite_mm].filter(x => x !== undefined && x !== null && x !== "").join(" "))}${b.nr ? ` · ${esc(b.nr)}${b.gesamt ? `/${esc(b.gesamt)}` : ""}` : ""}`
      : `<b>${esc(xmp.kunde)}</b> · ${esc(aa.name)}`;
    $("kopf").title = xmp && xmp.ablage && xmp.ablage.kundenordner ? xmp.ablage.kundenordner : "";
    const eintraege = xmp && !b && xmp.grafikzeit && Array.isArray(xmp.grafikzeit.eintraege) ? xmp.grafikzeit.eintraege : null;
    $("grafik").hidden = !eintraege;
    $("grafikMin").textContent = eintraege ? `Grafik ${Math.round(eintraege.reduce((s, e) => s + (Number(e.minuten) || 0), 0))} min` : "";

    // Zeile 2: Name der Auswahl, Folie mit Chip und „×n“ (nur wenn alle zugeordnet und gleich); „Keine Auswahl“ bzw. „Objekt in einer Unterebene“
    // gedimmt (die Auswahl gilt dann als leer); mehrere: „n Objekte“
    const k = kalkuliert(), zugeordnet = auswahl.length > 0 && auswahl.every(o => !!o.tags.folie);
    let name = "", folie = null, anzahl = null;
    if (k) {
      if (unterebene) name = "Objekt in einer Unterebene";
      else if (!auswahl.length) name = "Keine Auswahl";
      else if (auswahl.length > 1) name = `${auswahl.length} Objekte`;
      else {
        const d = xmp.kalkulation && Array.isArray(xmp.kalkulation.objekte) ? xmp.kalkulation.objekte.find(x => x.id && x.id === auswahl[0].tags.id) : null;
        name = auswahl[0].name || (d && d.name) || "Objekt";
      }
      if (zugeordnet) {
        const f = Z.gemeinsam(auswahl.map(o => Z.folieAnzeige(o, kx())));
        const n = Z.gemeinsam(auswahl.map(o => Z.anzahlVon(o.tags.anzahl)));
        if (f !== Z.UNTERSCHIEDLICH) { folie = f; if (n !== Z.UNTERSCHIEDLICH && n !== null) anzahl = n; }
      }
    }
    $("objName").textContent = name;
    $("objName").title = name;
    $("objName").classList.toggle("muted", k && !auswahl.length);
    $("objFolie").innerHTML = folie ? `${folie.rgb ? `<span class="chip" style="background:rgb(${folie.rgb.join(",")})"></span>` : ""}${esc(folie.text)}` : "";
    $("objAnzahl").hidden = anzahl === null;
    $("objAnzahl").textContent = anzahl === null ? "" : `×${anzahl}`;

    // Zeile 3: add (nicht oder nicht vollständig zugeordnet) bzw. edit · berechnen; add ohne Auswahl gesperrt und nicht orange;
    // orange: add, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst berechnen
    $("btnZuordnen").textContent = zugeordnet ? "edit" : "add";
    $("btnZuordnen").disabled = !k || !auswahl.length;
    $("btnBerechnen").disabled = !k;
    const zuordnenNaechst = auswahl.length > 0 && !zugeordnet;
    $("btnZuordnen").classList.toggle("akzent", k && zuordnenNaechst);
    $("btnBerechnen").classList.toggle("akzent", k && !zuordnenNaechst);

    // Zeile 4: Summa und Druck bei kalkulierter Arbeitsdatei; Export bei Profil „flach“, bei kalkulierter Arbeitsdatei und bei Druckbogen vorn; Auftrag immer
    $("btnSumma").disabled = !k;
    $("btnDruck").disabled = !k;
    $("btnExport").disabled = !((xmp && xmp.rolle === "arbeitsdatei" && aa.export.profil === "flach") || k || druckbogen());
    $("btnAuftrag").disabled = false;

    // Zeile 5: Preise aus dem Datensatz (VK): Material = nur Aufkleber, inkl. Mont. = inkl. Montage; gerundet netto, brutto fett; leer ohne Datensatz
    const p = k && xmp.kalkulation && xmp.kalkulation.preise ? xmp.kalkulation.preise.vk : null;
    const preis = (titel, x) => `${titel} <span class="netto">${Z.zahl(x.gerundet)}</span> <b>${Z.zahl(x.brutto)}</b>`;
    $("preisMaterial").innerHTML = p ? preis("Material", p.nur_aufkleber) : "";
    $("preisMontage").innerHTML = p ? preis("inkl. Mont.", p.inkl_montage) : "";
  }

  async function aufAbruf() {
    if (abrufLaeuft || beschaeftigt) return;
    abrufLaeuft = true;
    try { await aktualisieren(); } catch (e) { /* still */ } finally { abrufLaeuft = false; }
  }
  document.documentElement.addEventListener("mouseenter", aufAbruf);

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
  $("btnAuftrag").addEventListener("click", () => G.cep.requestOpenExtension(G.ID.anlegen, ""));
  G.cep.addEventListener(G.EVENT_ANGELEGT, () => aufAbruf());

  // ----- add/edit: Fenster „Objekt“; Übergabe: Tape-Vorschläge je IP_Id aus dem letzten Datensatz -----
  function objektOeffnen() {
    const d = xmp && xmp.kalkulation && Array.isArray(xmp.kalkulation.objekte) ? xmp.kalkulation.objekte : [];
    const tape = {};
    d.filter(o => o.id && o.verfahren === "druck").forEach(o => { tape[o.id] = !!o.tape; });
    G.uebergabe.schreiben({ tape });
    G.cep.requestOpenExtension(G.ID.objekt, "");
  }
  $("btnZuordnen").addEventListener("click", () => aktion(null, async () => {
    await aktualisieren();
    if (kalkuliert() && auswahl.length) objektOeffnen();
  }));
  // Doppelklick in „Zusammenfassung“ (die Objekte sind dort schon ausgewählt)
  G.empfangen(G.EVENT_OBJEKT_OEFFNEN, () => aktion(null, async () => {
    await aktualisieren();
    if (kalkuliert() && auswahl.length) objektOeffnen();
  }));
  G.empfangen(G.EVENT_OBJEKT_FERTIG, () => aufAbruf());
  G.empfangen(G.EVENT_BERECHNET, d => { if (d.von !== "panel") aufAbruf(); });

  // ----- berechnen: rechnet, schreibt den Datensatz, öffnet bzw. aktualisiert „Zusammenfassung“, Hinweise als ein Popup -----
  $("btnBerechnen").addEventListener("click", () => aktion($("btnBerechnen"), async () => {
    const r = await AU.berechnen(G.host, konf);
    if (r.datensatz) {
      G.cep.requestOpenExtension(G.ID.zusammenfassung, "");
      G.senden(G.EVENT_BERECHNET, G.ID.panel, { von: "panel" });
    }
    const zeilen = r.fehler.concat(r.warnungen);
    if (zeilen.length) await G.popup(zeilen.join("\n"));
  }));

  // ----- Summa, Druck, Export der Druckbögen (Profil produktion): Fehler, Hinweise und Warnungen als ein Popup -----
  const ui = { ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad, meldung: G.popup };
  const zeigen = async r => { if (r.zeilen.length) await G.popup(r.zeilen.join("\n")); };
  $("btnSumma").addEventListener("click", () => aktion($("btnSumma"), async () => {
    await aktualisieren();
    if (kalkuliert()) await zeigen(await AU.summa(G.host, konf, ui));
  }));
  $("btnDruck").addEventListener("click", () => aktion($("btnDruck"), async () => {
    await aktualisieren();
    if (kalkuliert()) await zeigen(await AU.druck(G.host, konf));
  }));

  // ----- Export: Profil „flach“ über den Exportkern; kalkulierte Arbeitsdatei bzw. Druckbogen vorn: Druckbögen des letzten Aufbaus -----
  $("btnExport").addEventListener("click", () => aktion($("btnExport"), async () => {
    await aktualisieren();
    if (kalkuliert() || druckbogen()) { await zeigen(await AU.exportDruckboegen(G.host, konf, ui)); return; }
    if (!xmp || xmp.rolle !== "arbeitsdatei" || aa.export.profil !== "flach") return;
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
    catch (e) { konf = null; document.querySelectorAll("button").forEach(b => { b.disabled = true; }); await G.popup(e.message); }
  })();
})();
