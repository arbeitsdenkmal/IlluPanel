/* Fenster „WEA-Etiketten“ (Extension de.pamnm.illupanels.gitter, ModalDialog, SPEZ_03_Nutzen §6): drei Schritte in einem Fenster, Texte aus dem alten
 * Projekt (teilc.js, 03-Gitterscheiben.jsx v2.9). Schritt 1: Liste der Kundendateien (Name, Anzahl, „Entfernen“), „Dateien hinzufügen …“ (Dateidialog mit
 * Mehrfachauswahl, Start im Bögl-Kundenordner), Stückzahl aus dem Präfix; „Weiter“ prüft und liest ein (gitter_leser.js). Schritt 2: Typbezeichnung je
 * Datei (blättert im selben Fenster), Gedächtnis typzuordnung.txt im Bögl-Kundenordner (lesen beim Öffnen, schreiben nach dem letzten „Übernehmen“;
 * Server nicht erreichbar: nur der Vorschlag, nichts geschrieben). Danach Vorlage messen, Varianten rechnen; Schritt 3: Variante wählen, „Aufbauen“ je Bogen
 * über den Druckbogen-Kern (Quelle fertig: Streifen je Kundendatei). Prüfmeldungen gesammelt als ein Popup, sonst keine Meldung. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const A = G.lib("ablage.js");
  const R = G.lib("rollen.js");
  const GI = G.lib("gitter.js");
  const L = G.lib("gitter_leser.js");
  const NB = G.lib("nutzenbogen.js");
  const EX = G.lib("export.js");
  const path = require("path");
  const $ = id => document.getElementById(id);

  let konf = null, nk = null, schritt = 1, laeuft = false;
  const liste = [];                 // Schritt 1: { datei: { name, pfad }, anzahl, feld }
  let jobs = [], warnungen = [], typCache = null, neuTyp = {}, ti = 0, td = null, pl = null, m = null, gewaehlt = 0;

  const fertig = () => { G.senden(G.EVENT_NUTZEN_FERTIG, G.ID.gitter, {}); G.schliessen(); };
  const boeglOrdner = () => A.unter(konf.rechner.server.kunden, nk.boegl.kundenordner);
  const vorlage = () => path.join(G.EXT, nk.gitter.vorlage);
  const zeigen = n => {
    schritt = n;
    [1, 2, 3].forEach(i => { $("schritt" + i).hidden = i !== n; });
    $("weiter").hidden = n !== 1; $("uebernehmen").hidden = n !== 2; $("aufbauen").hidden = n !== 3;
  };

  // ----- Schritt 1: Jobliste -----
  // werteUebernehmen: gültige Zahl > 0 übernehmen, sonst bleibt der alte Wert
  const werte = () => liste.forEach(j => { if (j.feld) { const n = parseInt(j.feld.value, 10); if (!isNaN(n) && n > 0) j.anzahl = n; } });
  function zeichne() {
    const l = $("liste"); l.textContent = "";
    if (!liste.length) { const d = document.createElement("div"); d.className = "zl leer muted"; d.textContent = "Noch keine Datei gewählt."; l.appendChild(d); }
    liste.forEach((j, idx) => {
      const z = document.createElement("div"); z.className = "zl";
      const n = document.createElement("span"); n.className = "dname"; n.textContent = j.datei.name; n.title = j.datei.pfad;
      const f = document.createElement("input"); f.type = "text"; f.value = String(j.anzahl); j.feld = f;
      const b = document.createElement("button"); b.textContent = "Entfernen";
      b.addEventListener("click", () => { werte(); liste.splice(idx, 1); zeichne(); });
      z.append(n, f, b); l.appendChild(z);
    });
  }
  // Dateidialog von CEP mit Mehrfachauswahl; Start im Bögl-Kundenordner, nicht erreichbar -> Standardordner des Dialogs
  async function hinzufuegen() {
    werte();
    const start = (await A.erreichbar(boeglOrdner(), EX.ZEITLIMIT_MS)) ? boeglOrdner() : "";
    let r = null;
    try { r = window.cep.fs.showOpenDialogEx(true, false, "Kundendateien wählen", start, GI.TYPEN); } catch (e) { r = null; }
    const pfade = r && r.err === 0 && r.data ? r.data : [];
    for (const p of pfade) liste.push({ datei: { name: path.basename(p), pfad: p }, anzahl: GI.mengeAusName(path.basename(p), nk.gitter.praefix_trenner) });
    zeichne();
  }
  async function weiter() {
    if (laeuft || schritt !== 1) return;
    laeuft = true;
    try {
      werte();
      const p = GI.dialog1Pruefen(liste, vorlage(), nk.gitter.vorlage);
      if (p.fehler) { await G.popup(p.fehler); return; }
      jobs = []; warnungen = [];
      for (const j of liste) {
        try { const r = L.einlesen(j.datei.pfad); warnungen.push(...r.warnungen); jobs.push({ datei: j.datei, anzahl: j.anzahl, daten: r.daten }); }
        catch (e) { await G.popup("Fehler beim Einlesen:\n\n" + (e.message || e)); fertig(); return; }
      }
      // Gedächtnis beim Öffnen von Schritt 2 lesen (3 s); nicht erreichbar -> nur der Vorschlag aus den Kopfzeilen
      typCache = await GI.gedaechtnisLesen(path.join(boeglOrdner(), nk.boegl.typgedaechtnis), EX.ZEITLIMIT_MS);
      ti = 0; neuTyp = {};
      zeigen(2); typZeigen();
    } finally { laeuft = false; }
  }

  // ----- Schritt 2: Typbezeichnung je Datei -----
  function typZeigen() {
    td = GI.typDialog(jobs[ti], typCache);
    document.title = td.titel;
    $("kopf").value = td.kopfText; $("oben").value = td.oben; $("unten").value = td.unten; $("typHinweis").textContent = td.hinweis;
    vorschau();
    setTimeout(() => $("oben").focus(), 30);
  }
  // Etikett-Vorschau (SPEZ_03_Oberflaeche §12.2): Sinnbild, folgt jeder Eingabe
  const vorschau = () => { $("vorOben").textContent = $("oben").value; $("vorUnten").textContent = $("unten").value; };
  $("oben").addEventListener("input", vorschau);
  $("unten").addEventListener("input", vorschau);
  async function uebernehmen() {
    if (laeuft || schritt !== 2) return;
    laeuft = true;
    try {
      jobs[ti].typOben = $("oben").value; jobs[ti].typUnten = $("unten").value;
      neuTyp[td.schluessel] = $("oben").value + "\u001F" + $("unten").value;
      if (++ti < jobs.length) { typZeigen(); return; }
      $("uebernehmen").disabled = $("abbrechen").disabled = true;
      if (typCache) await GI.gedaechtnisSchreiben(path.join(boeglOrdner(), nk.boegl.typgedaechtnis), neuTyp, EX.ZEITLIMIT_MS);
      // Vorlage öffnen und messen, Varianten rechnen
      try { m = await G.host("gitterVorlageMessen", vorlage(), nk.gitter.etikett_mm); } catch (e) { await G.popup(e.message); fertig(); return; }
      warnungen.push(...m.warnungen);
      const ms = NB.masse(konf, nk.boegl.medium);
      pl = GI.planung(jobs, m.etW, m.etH, nk.gitter, { rand: ms.rand, max_laenge: ms.max_laenge });
      if (!pl.varianten.length) { await G.popup("Es konnte kein Layout berechnet werden."); fertig(); return; }
      document.title = "WEA-Etiketten – Variante wählen";
      gewaehlt = 0;
      // Tabelle: Radio · Dateien/Drucke · Material in m · zu viel bzw. exakt · längster Bogen in mm; gewählte Zeile hervorgehoben, Zebra; Klick auf die Zeile wählt
      $("varianten").replaceChildren(...pl.varianten.map((v, i) => {
        const tr = document.createElement("tr"), r = document.createElement("input"), t = GI.variantenTeile(v);
        r.type = "radio"; r.name = "variante"; r.checked = i === 0;
        r.addEventListener("change", () => { gewaehlt = i; detail(); });
        const td = (text, l) => { const x = document.createElement("td"); if (l) x.className = "l"; x.textContent = text; return x; };
        const rz = document.createElement("td"); rz.append(r);
        tr.append(rz, td(t.dateien, true), td(t.material), td(t.zuviel, true), td(t.bogen));
        tr.addEventListener("click", () => { if (!r.checked) { r.checked = true; gewaehlt = i; detail(); } });
        return tr;
      }));
      detail();
      zeigen(3);
      $("abbrechen").disabled = false;
      $("aufbauen").focus();
    } finally { laeuft = false; }
  }
  const detail = () => {
    $("detail").textContent = GI.detailText(pl.varianten[gewaehlt], pl.bandHoehe);
    [...$("varianten").children].forEach((tr, i) => { tr.classList.toggle("an", i === gewaehlt); tr.classList.toggle("zebra", i !== gewaehlt && i % 2 === 1); });
  };

  // ----- Schritt 3: Aufbauen (§6.4) -----
  async function aufbauen() {
    if (laeuft || schritt !== 3) return;
    laeuft = true; $("aufbauen").disabled = $("abbrechen").disabled = true;
    try {
      const v = pl.varianten[gewaehlt], ms = NB.masse(konf, nk.boegl.medium), name = path.basename(nk.gitter.vorlage);
      const plan = NB.aufbauPlanen(NB.gitterBoegen(jobs, pl, v, m.etW, ms, name), { art: "gitter", aa: konf.arten.beschriftung, medien: konf.medien,
        kunde: nk.boegl.kunde, produkt: null, medium: nk.boegl.medium, laminat: nk.boegl.laminat, breite_mm: ms.rolle, auftrag: null,
        ablage: { kundenordner: nk.boegl.kundenordner, auftragsordner: NB.boeglAuftragsordner(new Date(), nk.gitter.ordner) }, arbeitsdatei: null,
        massstab: 1, abstand_mm: pl.gap, erstellt: NB.ERSTELLT_BOEGL, fertig: NB.gitterFertig(jobs, nk.gitter, vorlage()) });
      plan.boegen.forEach(b => { b.jsx.verkleinert = { marke: NB.VERKLEINERT, kopf: [NB.SEP_BOEGL, "Verkleinert:"], einzug: "                " }; });
      const r = await NB.aufbauen(G.host, plan);
      const text = GI.pruefText(warnungen.concat(r.hinweise));
      if (text) await G.popup(text);
    } catch (e) { await G.popup(e.message); }
    fertig();
  }

  $("hinzu").addEventListener("click", () => { hinzufuegen().catch(e => G.popup(e.message)); });
  $("weiter").addEventListener("click", weiter);
  $("uebernehmen").addEventListener("click", uebernehmen);
  $("aufbauen").addEventListener("click", aufbauen);
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.isComposing || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (schritt === 1) weiter(); else if (schritt === 2) uebernehmen(); else aufbauen();
  });

  // ----- Start -----
  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      nk = konf.nutzen.konfig;
      if (!nk) throw new Error(konf.nutzen.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      if (!R.standardbreite(konf.medien, nk.boegl.medium)) throw new Error(R.fehlt(nk.boegl.medium));
      await G.kernLaden(konf.schema);
      zeichne();
      zeigen(1);
      $("weiter").disabled = false;
      $("weiter").focus();
    } catch (e) { await G.popup(e.message); fertig(); }
  })();
})();
