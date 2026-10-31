/* Panel „PAM-Werkzeuge“ (Extension de.pamnm.illupanels.panel), SPEZ_01 §3, SPEZ_02 §13 (MockUp A5/A7).
 * Start: Konfiguration laden und prüfen – jeder Fehler ein Popup mit Datei und Grund, Buttons bleiben gesperrt.
 * Aktualisierung nur bei Maus ins Panel, nach eigener Aktion und nach CSEvent aus „Objekt“ und „Zusammenfassung“; keine Dauerabfragen und kein
 * Abruf bei Fenster-Fokus (Befund Stufe 43: der Fokus-Abruf lief während des PDF-Imports, der Inhalt landete im falschen Dokument).
 * Zustände: ohne Panel-Dokument nur Auftrag; Arbeitsdatei ohne Kalkulation plus Zeile 1 (Export bei Profil „flach“ und „offset“); Druckbogen vorn: Zeile 1 mit dem
 * Bogen „n/m“, nur Export und Auftrag aktiv; kalkulierte Arbeitsdatei: Objektzeile, add/edit · berechnen, Summa · Druck · Export, Preiszeile aus dem
 * Datensatz im XMP. Summa, Druck und Export der Druckbögen (Profil produktion) laufen über panel/lib/auftrag.js.
 * Grafikzeit (SPEZ_02 §12): bei Maus ins Panel und vor jeder eigenen Aktion (Zuordnen, berechnen, Summa, Druck, Export, „+m“) übernimmt das Panel die
 * Puffereinträge der vorderen Arbeitsdatei ins XMP – nur wenn welche vorliegen, sonst bleibt das Dokument ungeändert; Export bei vorderem Druckbogen
 * übernimmt für dessen Arbeitsdatei. Arbeit in Druckbögen zählt nicht (SPEZ_02 Fassung 8 §12).
 * Oberfläche (SPEZ_03_Oberflaeche §3): sechs Zeilen; was es im Zustand nicht gibt, ist ausgeblendet (die übrigen Buttons der Zeile teilen sich die Breite),
 * gesperrt bleibt nur, was im selben Zustand gleich wieder gilt (add/edit ohne Auswahl, Nutzen ohne Auswahl, Werkzeugzeile ohne Dokument bzw. bei Druckbogen
 * vorn, Breite bei Fahrzeugbeschriftung bzw. mit Auftrag). Export und Auftrag immer sichtbar, Export orange nur, wenn aktiv.
 * Werkzeugzeile Breite · Masken · Nutzen (immer vollständig, keiner orange): Breite (Messen im Kern, Fenster „Breite“), Masken (Kern), Freigabe nach SPEZ_03 §2.
 * Flyout-Menü (§3.3): Logo, VK-CC (Skripte aus config/werkzeuge.json per $.evalFile), Trennlinie, Gitterscheiben, MB-Nummern; Freigabe im bestehenden Abruf
 * (updatePanelMenuItem), beim Klick nach dem Neulesen erneut geprüft; vorher die Grafikzeit-Übernahme wie bei jeder eigenen Aktion.
 * Schild (Profil schild): Objektzeile und add/edit wie bei Beschriftung, Button „Schilder“ (Fenster „Schilder“), ohne berechnen und Preis; Summa und Druck nach
 * werkzeuge der Auftragsart, Export über panel/lib/export_schild.js (Freigabe über Profil, nicht über kalkulation).
 * Textil (Profil textil): Objektzeile mit „<Position> · <Verfahren>“ (Flex/Flock mit Flexfarben) und „×<Σ Menge>“, add/edit öffnet „Motiv“, berechnen
 * (Flex/Flock), Buttons „Farbe“ (Chip + Name der Textilfarbe, öffnet „Textilfarbe“) und „Modell“ (öffnet „Modell“); Summa nach werkzeuge, Export über
 * panel/lib/export_textil.js; Preiszeile rechts „Preis <netto> <brutto>“.
 * Nutzen (SPEZ_03_Nutzen §5.1) bei vorderem Dokument mit Auswahl (Einstieg A: Beschriftung-Arbeitsdatei mit genau einem ausgewählten Digitaldruck-Objekt,
 * vorher speichern; sonst B), misst die Auswahl im Kern und öffnet „Nutzen“; Gitterscheiben und MB-Nummern öffnen „WEA-Etiketten“ bzw. „Bögl Nummern“; alle drei
 * gesperrt bei Druckbogen vorn und bei fehlerhafter config/nutzen.json. Nutzen-Bogen vorn: Zeile 1 „<Kunde> · Nutzen <Produkt> · n/m“ bzw.
 * „Max Bögl · Gitterscheiben · n/m“, „Max Bögl · Nummern · n/m“, sonst wie Druckbogen vorn. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const EX = G.lib("export.js");
  const FL = G.lib("export_flach.js");
  const OF = G.lib("export_offset.js");
  const ES = G.lib("export_schild.js");
  const ET = G.lib("export_textil.js");
  const TX = G.lib("textil.js");
  const PROFIL_EXPORT = { flach: FL, offset: OF }; // Arbeitsdatei ohne Kalkulation: Export über den Exportkern (SPEZ_03_Konfigurationen §2.3)
  const AU = G.lib("auftrag.js");
  const Z = G.lib("zuordnen.js");
  const GZ = G.lib("grafikzeit.js");
  const N = G.lib("nutzen.js");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = D.xmpZugriff(G.host);
  let puffer = null;
  try { puffer = GZ.pufferDatei(); } catch (e) { puffer = null; } // ohne Rechnerordner nur „+m“

  let konf = null;   // { rechner, schema, arten, mapping, medien, farben, werkzeuge }
  let info = null;   // dokumentInfo des vorderen Dokuments
  let xmp = null;    // Dokumentobjekt (ip:Dokument) oder null
  let aa = null;     // Auftragsart des vorderen Dokuments
  let auswahl = [];  // ausgewählte oberste Objekte (nur kalkulierte Arbeitsdatei)
  let unterebene = false; // Auswahl enthält Objekte in Unterebenen
  let beschaeftigt = 0, abrufLaeuft = false;
  let menueStand = {}; // Flyout-Menü: zuletzt gesetzte Freigabe je Label

  const textil = () => !!(xmp && xmp.rolle === "arbeitsdatei" && aa && aa.export.profil === "textil");
  const kalkuliert = () => !!(xmp && xmp.rolle === "arbeitsdatei" && aa && aa.kalkulation && aa.preis) && !textil();
  const schild = () => !!(xmp && xmp.rolle === "arbeitsdatei" && aa && aa.export.profil === "schild");
  const bearbeitbar = () => kalkuliert() || schild() || textil(); // Objektzeile, add/edit
  const werkzeug = n => kalkuliert() || ((schild() || textil()) && (aa.werkzeuge || []).includes(n)); // Summa, Druck
  const istZugeordnet = o => (textil() ? TX.zugeordnet(o) : Z.zugeordnet(o));
  // Textil: rechts in der Objektzeile „<Position> · <Verfahren>“, bei Flex/Flock die Flexfarben
  const textilAnzeige = o => ({ text: [o.tags.position, o.tags.verfahren].concat(TX.istGeschnitten(o.tags.verfahren)
    ? [[...new Set(Object.values(TX.farbenVon(o.tags)).filter(Boolean))].join(", ")] : []).filter(Boolean).join(" · "), rgb: null });
  // Chip der Textilfarbe: hex aus textil_farben.csv, sonst grob aus CMYK; ohne Farbe null
  function textilChip() {
    const f = xmp.textil && xmp.textil.farbe, m = xmp.textil && xmp.textil.modell, tk = konf.textil.konfig;
    if (!f) return null;
    const e = tk && m ? TX.farbenFuer(tk.farben, m.id).find(x => x.farbe === f.name) : null;
    if (e && /^#[0-9a-f]{3,8}$/i.test(e.hex || "")) return e.hex;
    if (Array.isArray(f.cmyk)) { const [c, mm, y, k] = f.cmyk.map(v => v / 100); return `rgb(${[c, mm, y].map(v => Math.round(255 * (1 - v) * (1 - k))).join(",")})`; }
    return null;
  }
  const druckbogen = () => !!(xmp && xmp.rolle === "druckbogen");
  const rollenVon = a => { const r = {}; a.ebenen.forEach(e => { r[e.name] = e.rolle; }); return r; };
  const kx = () => ({ farben: konf.farben, medien: konf.medien, aa });
  // SPEZ_03 §2: null = kein Dokument; „fremd“ = ohne Panel-XMP; „druckbogen“ vorn; „auftrag“ = auftrag.orderId oder productId gesetzt; sonst „ohne“
  function werkzeugZustand() {
    if (!info || !info.hatDokument) return null;
    if (!xmp) return "fremd";
    if (druckbogen()) return "druckbogen";
    const a = xmp.auftrag || {};
    return a.orderId != null || a.productId != null ? "auftrag" : "ohne";
  }
  const breiteFrei = () => { const z = werkzeugZustand(); return z === "fremd" || (z === "ohne" && xmp.auftragsart !== "fahrzeugbeschriftung"); };
  const maskenFrei = () => ["fremd", "ohne", "auftrag"].includes(werkzeugZustand());
  const skriptFrei = () => { const z = werkzeugZustand(); return z === "fremd" || z === "ohne" || (z === "auftrag" && xmp.auftragsart === "sonstiges"); };
  // SPEZ_03_Nutzen §8: Nutzen bei vorderem Dokument mit Auswahl, Gitterscheiben und MB-Nummern immer; alle drei nicht bei Druckbogen vorn und ohne gültige nutzen.json
  const nutzenKonf = () => !!(konf && konf.nutzen && konf.nutzen.konfig);
  const nutzenFrei = () => nutzenKonf() && !!(info && info.hatDokument && info.auswahl > 0) && werkzeugZustand() !== "druckbogen";
  const boeglFrei = () => nutzenKonf() && werkzeugZustand() !== "druckbogen";

  // ----- Anzeige -----
  async function aktualisieren() {
    if (!konf) return;
    info = await G.host("dokumentInfo");
    xmp = null;
    if (info.hatDokument) { try { xmp = D.parsen(info.xmp); } catch (e) { xmp = null; } }
    aa = xmp ? konf.arten[xmp.auftragsart] : null;
    if (!aa) xmp = null;
    const a = bearbeitbar() ? await G.host("auswahlLesen", { rollen: rollenVon(aa), blaetter: false }) : { objekte: [], unterebene: false };
    unterebene = !!a.unterebene;
    auswahl = unterebene ? [] : a.objekte;
    zeichnen();
  }

  function zeichnen() {
    // Zeile 1: Kunde · Auftragsart (ohne Maßstab) | Grafik N min + „+m“; Druckbogen: Kunde · Druckbogen <Medium> <Laminat> <Breite> · n/m
    // (ohne bogen.gesamt nur n)
    // Nutzen-Bogen (SPEZ_03_Nutzen §8): „Nutzen <Produkt>“, „Gitterscheiben“, „Nummern“ statt „Druckbogen <Medium> <Laminat> <Breite>“
    const b = druckbogen() ? xmp.bogen || {} : null;
    const bogenArt = b ? ({ nutzen: `Nutzen ${b.produkt || ""}`.trim(), gitter: "Gitterscheiben", mb: "Nummern" })[b.art] : null;
    $("kopf").innerHTML = !xmp ? "" : b ? `<b>${esc(xmp.kunde)}</b> · ${bogenArt ? esc(bogenArt) : `Druckbogen ${esc([b.medium, Z.laminatName(aa, b.laminat), b.breite_mm].filter(x => x !== undefined && x !== null && x !== "").join(" "))}`}${b.nr ? ` · ${esc(b.nr)}${b.gesamt ? `/${esc(b.gesamt)}` : ""}` : ""}`
      : `<b>${esc(xmp.kunde)}</b> · ${esc(aa.name)}`;
    $("kopf").title = xmp && xmp.ablage && xmp.ablage.kundenordner ? xmp.ablage.kundenordner : "";
    const eintraege = xmp && !b && xmp.grafikzeit && Array.isArray(xmp.grafikzeit.eintraege) ? xmp.grafikzeit.eintraege : null;
    $("grafik").hidden = !eintraege;
    $("grafikMin").textContent = eintraege ? `Grafik ${GZ.summeMinuten(xmp)} min` : "";

    // Zeile 2: Name der Auswahl, Folie mit Chip und „×n“ (nur wenn alle zugeordnet und gleich); „Keine Auswahl“ bzw. „Objekt in einer Unterebene“
    // gedimmt (die Auswahl gilt dann als leer); mehrere: „n Objekte“; Schild: UV-Objekte mit Ebenenname statt Folie, ohne „×n“
    const k = bearbeitbar(), kalk = kalkuliert(), tx = textil(), zugeordnet = auswahl.length > 0 && auswahl.every(istZugeordnet);
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
        const f = Z.gemeinsam(auswahl.map(o => (tx ? textilAnzeige(o) : Z.folieAnzeige(o, kx()))));
        const n = Z.gemeinsam(auswahl.map(o => (tx ? TX.mengeSumme(o.tags) : Z.anzahlVon(o.tags.anzahl))));
        if (f !== Z.UNTERSCHIEDLICH) { folie = f; if (n !== Z.UNTERSCHIEDLICH && n !== null && !auswahl.some(Z.istUv)) anzahl = n; }
      }
    }
    $("objName").textContent = name;
    $("objName").title = name;
    $("objName").classList.toggle("muted", k && !auswahl.length);
    $("objFolie").innerHTML = folie ? `${folie.rgb ? `<span class="chip" style="background:rgb(${folie.rgb.join(",")})"></span>` : ""}${esc(folie.text)}` : "";
    $("objAnzahl").hidden = anzahl === null;
    $("objAnzahl").textContent = anzahl === null ? "" : `×${anzahl}`;

    // Zeile 3 (§3.2): add (nicht oder nicht vollständig zugeordnet) bzw. edit · berechnen · Schilder · Farbe · Modell, ausgeblendet, was es im Zustand nicht gibt;
    // add ohne Auswahl gesperrt und nicht orange; orange: add, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst berechnen
    $("btnZuordnen").textContent = zugeordnet ? "edit" : "add";
    $("btnZuordnen").hidden = !k;
    $("btnZuordnen").disabled = !k || !auswahl.length;
    $("btnBerechnen").hidden = $("btnBerechnen").disabled = !(kalk || tx);
    const zuordnenNaechst = auswahl.length > 0 && !zugeordnet;
    $("btnZuordnen").classList.toggle("akzent", k && zuordnenNaechst);
    $("btnBerechnen").classList.toggle("akzent", (kalk || tx) && !zuordnenNaechst);
    $("btnSchilder").hidden = $("btnSchilder").disabled = !schild();
    // Textil: „Farbe“ mit Chip und Name der Textilfarbe (ohne Farbe grau), „Modell“
    $("btnFarbe").hidden = $("btnFarbe").disabled = $("btnModell").hidden = $("btnModell").disabled = !tx;
    const tf = tx && xmp.textil ? xmp.textil.farbe : null, chip = tx ? textilChip() : null;
    $("btnFarbe").innerHTML = tf ? `${chip ? `<span class="chip" style="background:${esc(chip)}"></span>` : ""}${esc(tf.name)}` : "Farbe";
    $("btnFarbe").classList.toggle("muted", tx && !tf);
    $("btnFarbe").title = tf ? tf.name : "Farbe";

    // Zeile 4: Summa und Druck bei kalkulierter Arbeitsdatei bzw. nach werkzeuge (Schild, Textil), sonst ausgeblendet; Export bei Profil „flach“, „offset“,
    // „schild“ und „textil“, bei kalkulierter Arbeitsdatei und bei Druckbogen vorn, sonst gesperrt (nicht orange); Auftrag immer
    $("btnSumma").hidden = $("btnSumma").disabled = !werkzeug("summa");
    $("btnDruck").hidden = $("btnDruck").disabled = !werkzeug("druck");
    $("btnExport").disabled = !((xmp && xmp.rolle === "arbeitsdatei" && PROFIL_EXPORT[aa.export.profil]) || kalk || schild() || tx || druckbogen());
    $("btnExport").classList.toggle("akzent", !$("btnExport").disabled);
    $("btnAuftrag").disabled = false;

    // Zeile 5: Preise aus dem Datensatz (VK): Material = nur Aufkleber, inkl. Mont. = inkl. Montage; gerundet netto, brutto fett; leer ohne Datensatz
    const p = kalk && xmp.kalkulation && xmp.kalkulation.preise ? xmp.kalkulation.preise.vk : null;
    const preis = (titel, x) => `${titel} <span class="netto">${Z.zahl(x.gerundet)}</span> <b>${Z.zahl(x.brutto)}</b>`;
    $("preisMaterial").innerHTML = p ? preis("Material", p.nur_aufkleber) : "";
    $("preisMontage").innerHTML = p ? preis("inkl. Mont.", p.inkl_montage) : "";
    // Textil: ein Preis (netto, brutto fett) aus inkl_montage rechts mit „Preis“ (Text der Textil-Zusammenfassung); ohne Flex-/Flock-Motive leer
    const pt = tx && xmp.kalkulation && xmp.kalkulation.preise ? xmp.kalkulation.preise.vk.inkl_montage : null;
    if (tx) $("preisMontage").innerHTML = pt ? preis("Preis", pt) : "";

    // Zeile 6 Breite · Masken · Nutzen (§3.1): immer vollständig, nicht Zutreffendes gesperrt, keiner orange
    $("btnBreite").disabled = !breiteFrei();
    $("btnMasken").disabled = !maskenFrei();
    $("btnNutzen").disabled = !nutzenFrei();
    menueFreigeben();
  }

  // ----- Flyout-Menü (§3.3): Logo, VK-CC (Labels aus werkzeuge.json), Trennlinie, Gitterscheiben, MB-Nummern -----
  const MENUE_GITTER = "Gitterscheiben", MENUE_MBNR = "MB-Nummern";
  const menueEintraege = () => (konf ? konf.werkzeuge.skripte.map((s, i) => ({ id: `skript${i}`, label: s.label, s })) : [])
    .concat([{ trenner: true }, { id: "gitter", label: MENUE_GITTER }, { id: "mbnr", label: MENUE_MBNR }]);
  // Freigabe: ein fehlendes Skript bleibt immer gesperrt; ohne geladene Konfiguration alles gesperrt
  const menueFrei = e => !!konf && (e.s ? e.s.vorhanden && skriptFrei() : boeglFrei());
  function menueSetzen() {
    const xmlEsc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const xml = `<Menu>${menueEintraege().map(e => (e.trenner ? `<MenuItem Label="---"/>`
      : `<MenuItem Id="${e.id}" Label="${xmlEsc(e.label)}" Enabled="${menueFrei(e)}" Checked="false"/>`)).join("")}</Menu>`;
    try { G.cep.invokeSync("setPanelFlyoutMenu", xml); } catch (e) { /* ohne Menü */ }
    menueStand = {};
    menueEintraege().forEach(e => { if (!e.trenner) menueStand[e.label] = menueFrei(e); });
  }
  // nur geänderte Einträge, keine eigene Abfrage [R 4.7]
  function menueFreigeben() {
    menueEintraege().forEach(e => {
      if (e.trenner || menueStand[e.label] === menueFrei(e)) return;
      menueStand[e.label] = menueFrei(e);
      try { G.cep.invokeSync("updatePanelMenuItem", JSON.stringify({ menuItemLabel: e.label, enabled: menueStand[e.label], checked: false })); } catch (x) { /* still */ }
    });
  }
  // Ereignisdaten: Objekt oder Text (JSON bzw. XML mit menuId)
  function menueId(ev) {
    let d = ev && ev.data;
    if (typeof d === "string") {
      try { d = JSON.parse(d); } catch (e) { const m = /menuId["'>=\s:]+([^"'<\s,}]+)/.exec(d); return m ? m[1] : null; }
    }
    return d && d.menuId ? String(d.menuId) : null;
  }
  function menueKlick(id) {
    const e = menueEintraege().find(x => !x.trenner && x.id === id);
    if (!e || !konf) return;
    if (e.s) skriptStarten(e.s);
    else if (e.id === "gitter") aktion(null, async () => { await aktualisieren(); if (boeglFrei()) G.cep.requestOpenExtension(G.ID.gitter, ""); });
    else if (e.id === "mbnr") aktion(null, async () => { await aktualisieren(); if (boeglFrei()) G.cep.requestOpenExtension(G.ID.mbnr, ""); });
  }
  G.cep.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", ev => menueKlick(menueId(ev)));
  // Gesamtlauf (tests/illustrator): Menüstand lesen und Menüeinträge auslösen, nur mit .debug
  if (G.DEBUG) window.PAM_TEST = { menue: () => Object.assign({}, menueStand), menueKlick };

  // ----- Grafikzeit: Übernahme aus dem Puffer ins XMP (u = { weitere: Einträge aus „+m“, druckbogen: Export bei vorderem Druckbogen }) -----
  async function grafikUebernehmen(u) {
    if (konf) await GZ.uebernehmenXmp(G.host, puffer, u);
  }

  // mitUebernahme nur bei Maus ins Panel (CSEvents lesen nur neu)
  async function aufAbruf(mitUebernahme) {
    if (abrufLaeuft || beschaeftigt) return;
    abrufLaeuft = true;
    try {
      if (mitUebernahme === true) await grafikUebernehmen().catch(() => { /* still, Einträge bleiben im Puffer */ });
      await aktualisieren();
    } catch (e) { /* still */ } finally { abrufLaeuft = false; }
  }
  document.documentElement.addEventListener("mouseenter", () => aufAbruf(true));

  // eigene Aktion: vorher Übernahme der Grafikzeit (still, die Aktion läuft weiter); u.weitere = Einträge aus „+m“ (Fehler als Popup),
  // u.druckbogen = Export (übernimmt bei vorderem Druckbogen für dessen Arbeitsdatei)
  async function aktion(knopf, fn, u) {
    beschaeftigt++; document.body.classList.add("besch"); if (knopf) knopf.disabled = true;
    try {
      if (u && u.weitere) await grafikUebernehmen(u);
      else await grafikUebernehmen(u).catch(() => { /* still, Einträge bleiben im Puffer */ });
      if (fn) await fn();
    }
    catch (e) { if (!e.abgebrochen) await G.popup(e.message); }
    finally {
      beschaeftigt--; document.body.classList.remove("besch");
      try { await aktualisieren(); } catch (e) { /* still */ }
    }
  }

  // ----- „+m“: ganze Minuten, auch negativ; Enter -> Eintrag { von = bis = jetzt, minuten, manuell: true }; 0 oder keine Zahl: nichts; Feld danach leer -----
  $("plusMin").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const n = GZ.manuellLesen(e.target.value);
    e.target.value = "";
    if (n !== null) aktion(null, null, { weitere: [GZ.eintragManuell(n)] });
  });

  // ----- Auftrag: Dialog „ohne Auftrag“ -----
  $("btnAuftrag").addEventListener("click", () => G.cep.requestOpenExtension(G.ID.anlegen, ""));
  G.cep.addEventListener(G.EVENT_ANGELEGT, () => aufAbruf());

  // ----- add/edit: Fenster „Objekt“ (Textil: „Motiv“, liest die Auswahl selbst); Übergabe: Tape-Vorschläge je IP_Id aus dem letzten Datensatz -----
  function objektOeffnen() {
    if (textil()) { G.cep.requestOpenExtension(G.ID.motiv, ""); return; }
    const d = xmp && xmp.kalkulation && Array.isArray(xmp.kalkulation.objekte) ? xmp.kalkulation.objekte : [];
    const tape = {};
    d.filter(o => o.id && o.verfahren === "druck").forEach(o => { tape[o.id] = !!o.tape; });
    G.uebergabe.schreiben({ tape });
    G.cep.requestOpenExtension(G.ID.objekt, "");
  }
  $("btnZuordnen").addEventListener("click", () => aktion(null, async () => {
    await aktualisieren();
    if (bearbeitbar() && auswahl.length) objektOeffnen();
  }));
  // Doppelklick in „Zusammenfassung“ (die Objekte sind dort schon ausgewählt)
  G.empfangen(G.EVENT_OBJEKT_OEFFNEN, () => aktion(null, async () => {
    await aktualisieren();
    if ((kalkuliert() || textil()) && auswahl.length) objektOeffnen();
  }));

  // ----- Textil: Fenster „Textilfarbe“ und „Modell“ (SPEZ_03_Textil §6); sie lesen Dokument und XMP selbst -----
  $("btnFarbe").addEventListener("click", () => aktion(null, async () => {
    await aktualisieren();
    if (textil()) G.cep.requestOpenExtension(G.ID.textilfarbe, "");
  }));
  $("btnModell").addEventListener("click", () => aktion(null, async () => {
    await aktualisieren();
    if (textil()) G.cep.requestOpenExtension(G.ID.modell, "");
  }));
  G.empfangen(G.EVENT_TEXTIL_FERTIG, () => aufAbruf());

  // ----- Schilder: Fenster „Schilder“ (Bohrungen je Schild, SPEZ_03_Schild §6.2); es liest Dokument und XMP selbst -----
  $("btnSchilder").addEventListener("click", () => aktion(null, async () => {
    await aktualisieren();
    if (schild()) G.cep.requestOpenExtension(G.ID.schilder, "");
  }));
  G.empfangen(G.EVENT_SCHILDER_FERTIG, () => aufAbruf());
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
    if (werkzeug("summa")) await zeigen(await AU.summa(G.host, konf, ui));
  }));
  $("btnDruck").addEventListener("click", () => aktion($("btnDruck"), async () => {
    await aktualisieren();
    if (!werkzeug("druck")) return;
    await zeigen(await AU.druck(G.host, konf));
  }));

  // ----- Export: Profil „flach“ bzw. „offset“ über den Exportkern; kalkulierte Arbeitsdatei bzw. Druckbogen vorn: Druckbögen des letzten Aufbaus;
  // Profil „schild“: Dateien je Schild und Technik, Laserdatei, dazu die Druckbögen eines vorliegenden Aufbaus -----
  $("btnExport").addEventListener("click", () => aktion($("btnExport"), async () => {
    await aktualisieren();
    if (kalkuliert() || druckbogen()) { await zeigen(await AU.exportDruckboegen(G.host, konf, ui)); return; }
    if (schild()) { await zeigen(await ES.exportieren(G.host, konf, ui)); return; }
    if (textil()) { await zeigen(await ET.exportieren(G.host, konf, ui)); return; }
    if (!xmp || xmp.rolle !== "arbeitsdatei" || !PROFIL_EXPORT[aa.export.profil]) return;
    if (!info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
    const auftrag = PROFIL_EXPORT[aa.export.profil].auftrag(aa, xmp, G.host, info.pfad);
    const r = await EX.exportieren(auftrag, {
      rechner: konf.rechner,
      ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad,
      meldung: G.popup,
      xmpSchreiben: X.xmpSchreiben,
      arbeitsdatei: { pfad: info.pfad, speichern: () => G.host("dokumentSpeichern") }
    });
    if (r.meldung) await G.popup(r.meldung);
  }, { druckbogen: true }));

  // ----- Breite: Messen im Kern (Vorprüfung als Popup), dann Fenster „Breite“ mit der gemessenen Breite; das Fenster führt aus (SPEZ_03 §3) -----
  $("btnBreite").addEventListener("click", () => aktion($("btnBreite"), async () => {
    await aktualisieren();
    if (!breiteFrei()) return;
    const m = await G.host("breiteMessen");
    G.uebergabeBreite.schreiben({ breite: m.text });
    G.cep.requestOpenExtension(G.ID.breite, "");
  }));
  G.empfangen(G.EVENT_BREITE_FERTIG, () => aufAbruf());

  // ----- Masken: alle Schnittmasken des Dokuments lösen (SPEZ_03 §4); Ausnahmen des Laufs als ein Popup, sonst keine Meldung -----
  $("btnMasken").addEventListener("click", () => aktion($("btnMasken"), async () => {
    await aktualisieren();
    if (!maskenFrei()) return;
    const r = await G.host("maskenLoesen");
    if (r.fehler.length) await G.popup([...new Set(r.fehler)].join("\n"));
  }));

  // ----- Nutzen (SPEZ_03_Nutzen §5.1): Einstieg A bei Beschriftung-Arbeitsdatei mit genau einem ausgewählten obersten Digitaldruck-Objekt (vorher speichern),
  // sonst B; Auswahl im Kern messen (Realmaß: × Maßstab aus dem XMP, ohne XMP 1), ohne Cutkontur Rückfrage; Übergabe an das Fenster „Nutzen“ -----
  $("btnNutzen").addEventListener("click", () => aktion($("btnNutzen"), async () => {
    await aktualisieren();
    if (!nutzenFrei()) return;
    const einstiegA = kalkuliert() && xmp.auftragsart === "beschriftung" && !unterebene && auswahl.length === 1 && Z.artNachTag(auswahl[0], konf.farben) === "digitaldruck";
    let quelle = null;
    try { quelle = D.parsen(info.xmp); } catch (e) { quelle = null; }
    const mst = einstiegA ? xmp.massstab : (quelle && quelle.massstab > 0 ? quelle.massstab : 1);
    if (einstiegA) {
      if (!info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
      await G.host("dokumentSpeichern", info.pfad);
    }
    const m = await G.host("nutzenMessen");
    if (!m.hasCut && !(await G.frage(N.TEXT_OHNE_CUT))) return;
    const f = v => v * mst, o = m.off0;
    const messung = { mW: f(m.mW), mH: f(m.mH), hasCut: m.hasCut, nCut: m.nCut, bleedMax: f(m.bleedMax), off0: { l: f(o.l), t: f(o.t), r: f(o.r), b: f(o.b) } };
    const u = { einstieg: einstiegA ? "A" : "B", messung, massstab: mst };
    if (einstiegA) {
      const s = auswahl[0];
      Object.assign(u, { kunde: xmp.kunde, medium: Z.medium(s, konf.medien), laminat: s.tags.laminat, anzahl: Z.anzahlVon(s.tags.anzahl) || 1, ref: s.ref,
        id: s.tags.id || null, arbeitsdatei: info.pfad, auftrag: xmp.auftrag, ablage: xmp.ablage });
    }
    G.uebergabeNutzen.schreiben(u);
    G.cep.requestOpenExtension(G.ID.nutzen, "");
  }));
  // Gitterscheiben, MB-Nummern (SPEZ_03_Nutzen §6, §7) über das Flyout-Menü: Fenster „WEA-Etiketten“ bzw. „Bögl Nummern“; sie lesen Konfiguration und
  // Bögl-Kundenordner selbst
  G.empfangen(G.EVENT_NUTZEN_FERTIG, () => aufAbruf());

  // ----- Skripte aus config/werkzeuge.json (SPEZ_03 §5) über das Flyout-Menü: Kopien in <Extension>/skripte, unverändert per $.evalFile; Fehler als Popup -----
  function skriptStarten(s) {
    aktion(null, async () => {
      await aktualisieren();
      if (!s.vorhanden || !skriptFrei()) return;
      if (!require("fs").existsSync(s.pfad)) throw new Error(`Skript nicht gefunden: ${s.pfad}`);
      if (G.testNotiz("skript", s.label)) return; // Gesamtlauf: Skripte öffnen eigene ScriptUI-Dialoge und laufen nicht mit
      const r = await G.evalRoh(`(function(){ try { $.evalFile(new File(${JSON.stringify(s.pfad)})); return "OK"; } catch (e) { return "FEHLER: " + (e && e.message ? e.message : e) + (e && e.line ? " (Zeile " + e.line + ")" : ""); } })()`);
      if (r !== "OK") throw new Error(r);
    });
  }

  // ----- Start -----
  (async () => {
    try { konf = K.allesLaden(G.EXT); }
    catch (e) {
      const liste = e instanceof K.KonfigFehler ? e.fehler : [{ datei: "", grund: e.message }];
      for (const f of liste) await G.popup(`${f.datei}\n${f.grund}`);
      return;
    }
    menueSetzen();
    for (const f of konf.werkzeuge.fehler) await G.popup(`${f.datei}\n${f.grund}`); // fehlendes Skript: nur sein Menüeintrag gesperrt
    for (const f of konf.produkte.fehler) await G.popup(`${f.datei}\n${f.grund}`); // produkte.csv fehlerhaft: nur Offset im Dialog gesperrt
    for (const f of konf.schildMaterialien.fehler) await G.popup(`${f.datei}\n${f.grund}`); // schild_materialien.csv fehlerhaft: nur Schild im Dialog gesperrt
    for (const f of konf.textil.fehler) await G.popup(`${f.datei}\n${f.grund}`); // textil.json bzw. textil_*.csv fehlerhaft: nur Textil im Dialog gesperrt
    for (const f of konf.nutzen.fehler) await G.popup(`${f.datei}\n${f.grund}`); // nutzen.json fehlerhaft: nur Nutzen, Gitterscheiben, MB-Nummern gesperrt
    for (const f of konf.farben.standardFehler) await G.popup(`${f.datei}\n${f.grund}`); // serien.json „standard“ fehlt oder unbekannt: Serie ohne Vorwahl
    try { await G.kernLaden(konf.schema); await aktualisieren(); }
    catch (e) {
      konf = null; document.querySelectorAll("button").forEach(b => { b.disabled = true; b.classList.remove("akzent"); });
      menueSetzen(); await G.popup(e.message);
    }
  })();
})();
