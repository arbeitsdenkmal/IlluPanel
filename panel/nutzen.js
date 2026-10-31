/* Fenster „Nutzen“ (Extension de.pamnm.illupanels.nutzen, ModalDialog, SPEZ_03_Nutzen §5.3–§5.5): zwei Schritte in einem Fenster.
 * Übergabe vom Panel über die Datei G.uebergabeNutzen: { einstieg "A" | "B", messung (Realmaß), massstab; bei A kunde, medium, laminat, anzahl, ref, id,
 * arbeitsdatei, auftrag, ablage }. Schritt 1 „Nutzen“: bei B Kunde, Stückzahl, Medium, Laminat (bei A nur als Text), Produkt, Bogenformat, Modus, Abstand
 * Motive (ohne Box „Motiv (gemessen)“, SPEZ_03_Oberflaeche §11; die Messung bleibt Grundlage der Planung); „Weiter →“ prüft (Texte aus dem alten Projekt) und
 * plant. Schritt 2 „Vorschau“: Vorgabe, eine Zeile je Layout (gewählte Zeile hervorgehoben), Detailtext;
 * „Aufbauen“ baut je Bogen über den Druckbogen-Kern (Quelle ref bzw. auswahl), schreibt bei A den aufbau in die Arbeitsdatei und meldet nur Befunde.
 * Enter = Weiter bzw. Aufbauen, Esc = Abbrechen; nach dem Aufbauen (oder einem Abbruch mit Popup) Rückmeldung per CSEvent EVENT_NUTZEN_FERTIG. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const A = G.lib("ablage.js");
  const R = G.lib("rollen.js");
  const PC = G.lib("preisquelle_csv.js");
  const Z = G.lib("zuordnen.js");
  const N = G.lib("nutzen.js");
  const NB = G.lib("nutzenbogen.js");
  const $ = id => document.getElementById(id);

  let konf = null, nk = null, aa = null, u = null, medienListe = [], schritt = 1, laeuft = false;
  let w = { medium: null, laminat: null, format: null, strict: true };
  let params = null, pl = null, gewaehlt = 0;

  const fertig = () => { G.senden(G.EVENT_NUTZEN_FERTIG, G.ID.nutzen, {}); G.schliessen(); };
  function knopf(text, an, fn) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text; if (an) b.classList.add("an");
    b.addEventListener("click", fn);
    return b;
  }

  // ----- Schritt 1 -----
  function zeichnen1() {
    const B = u.einstieg === "B";
    ["kunde", "stueckzahl"].forEach(id => { $(id).hidden = !B; $(id + "T").hidden = B; });
    $("medium").hidden = $("laminat").hidden = !B;
    $("mediumT").hidden = $("laminatT").hidden = B;
    if (B) {
      $("medium").replaceChildren(...medienListe.map(m => knopf(m, w.medium === m, () => {
        w.medium = m;
        if (!Z.laminateFuer(m, aa, konf.medien).includes(w.laminat)) w.laminat = Z.laminateFuer(m, aa, konf.medien)[0] || null;
        zeichnen1();
      })));
      $("laminat").replaceChildren(...Z.laminateFuer(w.medium, aa, konf.medien).map(l => knopf(Z.laminatName(aa, l), w.laminat === l, () => { w.laminat = l; zeichnen1(); })));
    }
    $("format").replaceChildren(...nk.nutzen.formate.map(f => knopf(f.name, w.format === f.id, () => { w.format = f.id; zeichnen1(); })));
    const ohne = w.format === "ohne";
    $("modusL").hidden = $("modus").hidden = ohne;
    $("modus").replaceChildren(knopf("exakt oder kleiner – Lagerung beim Kunden", w.strict, () => { w.strict = true; zeichnen1(); }),
      knopf("ca. ± 25 % – nur Handling", !w.strict, () => { w.strict = false; zeichnen1(); }));
    $("abstandB").textContent = ohne ? "" : `Abstand Bögen: ${nk.nutzen.abstand_boegen_mm} (fix – Schneidetisch)`;
  }

  // Rollenbreite (Standardbreite des Mediums), Bezeichnung des Laminats
  const mk = p => ({ medium: p.medium, laminat: NB.bezeichnung(aa, p.laminat), rolle: R.standardbreite(konf.medien, p.medium) });

  async function weiter() {
    if (laeuft || schritt !== 1) return;
    laeuft = true;
    try {
      const B = u.einstieg === "B";
      const f = { kunde: B ? $("kunde").value : u.kunde, count: B ? $("stueckzahl").value : String(u.anzahl), produkt: $("produkt").value,
        format: w.format, strict: w.strict, gapM: $("abstand").value, medium: B ? w.medium : u.medium, laminat: B ? w.laminat : u.laminat };
      const p = N.dialog1Pruefen(u.messung, f, u.einstieg);
      if (p.fehler) { await G.popup(p.fehler); return; }
      if (p.frage && !(await G.frage(p.frage))) return;
      params = p.params;
      const ms = NB.masse(konf, params.medium);
      if (!ms.rolle) { await G.popup(R.fehlt(params.medium)); return; }
      pl = N.planen(u.messung, params, { rolle: ms.rolle, kantenhalter: ms.kantenhalter, rand: ms.rand, max_laenge: ms.max_laenge,
        gB: nk.nutzen.abstand_boegen_mm, toleranz: nk.nutzen.toleranz, formate: nk.nutzen.formate });
      if (pl.fehler) { await G.popup(pl.fehler); fertig(); return; }
      schritt = 2; gewaehlt = 0;
      zeichnen2();
    } finally { laeuft = false; }
  }

  // ----- Schritt 2 -----
  const anschnitt = sel => (sel.rotM ? N.rotOff(u.messung.off0) : u.messung.off0);
  function zeichnen2() {
    $("schritt1").hidden = true; $("schritt2").hidden = false;
    $("weiter").hidden = true; $("aufbauen").hidden = false; $("aufbauen").disabled = false;
    document.title = "Vorschau";
    $("vorgabe").textContent = N.vorgabeZeilen(u.messung, params, pl, mk(params)).join("\n");
    $("layouts").replaceChildren(...pl.picks.map((x, i) => {
      const l = document.createElement("label"), r = document.createElement("input");
      r.type = "radio"; r.name = "layout"; r.checked = i === gewaehlt;
      r.addEventListener("change", () => { gewaehlt = i; detail(); });
      l.append(r, document.createTextNode(" " + N.planZeile(x)));
      return l;
    }));
    detail();
    $("aufbauen").focus();
  }
  function detail() {
    const x = pl.picks[gewaehlt];
    $("detail").textContent = N.detailText(x, params.cnt, pl, anschnitt(x));
    [...$("layouts").children].forEach((l, i) => l.classList.toggle("an", i === gewaehlt));
  }

  async function aufbauen() {
    if (laeuft || schritt !== 2) return;
    laeuft = true; $("aufbauen").disabled = $("abbrechen").disabled = true;
    try {
      const sel = pl.picks[gewaehlt], A_ = u.einstieg === "A", ms = NB.masse(konf, params.medium), jetzt = new Date();
      const a = anschnitt(sel);
      const q = { quelle: A_ ? "ref" : "auswahl", ref: A_ ? u.ref : null, herkunft: A_ ? u.id : null, cuts: u.messung.nCut, produkt: params.produkt, mk: mk(params) };
      const boegen = NB.nutzenBoegen(u.messung, params, pl, sel, ms, q);
      const plan = NB.aufbauPlanen(boegen, { art: "nutzen", aa, medien: konf.medien, kunde: A_ ? u.kunde : params.kunde, produkt: params.produkt,
        medium: params.medium, laminat: params.laminat, breite_mm: ms.rolle, auftrag: A_ ? u.auftrag : null,
        ablage: A_ ? u.ablage : { kundenordner: null, auftragsordner: NB.nutzenAuftragsordner(jetzt, params.produkt) },
        arbeitsdatei: A_ ? u.arbeitsdatei : null, massstab: u.massstab, abstand_mm: params.gm - Math.max(a.l + a.r, a.t + a.b), erstellt: N.ERSTELLT, jetzt });
      const r = await NB.aufbauen(G.host, plan);
      if (A_) {
        // aufbau in die Arbeitsdatei (§4.2)
        const xmp = D.parsen((await G.host("xmpLesen", u.arbeitsdatei)).text);
        await G.host("xmpSchreiben", D.serialisieren(D.aendern(xmp, { aufbau: plan.aufbau })), u.arbeitsdatei);
        if (!r.arbeitsdateiUnveraendert) r.hinweise.push("Achtung: Arbeitsdatei wurde beim Aufbau verändert");
      }
      if (r.hinweise.length) await G.popup(r.hinweise.join("\n"));
    } catch (e) { await G.popup(e.message); }
    fertig();
  }

  $("weiter").addEventListener("click", weiter);
  $("aufbauen").addEventListener("click", aufbauen);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); if (schritt === 1) weiter(); else aufbauen(); }
  });

  // ----- Start: Konfiguration, Kern, Übergabe; bei Einstieg B die Medien der Beschriftung (Preisliste) -----
  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      nk = konf.nutzen.konfig;
      if (!nk) throw new Error(konf.nutzen.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      await G.kernLaden(konf.schema);
      aa = konf.arten.beschriftung;
      u = G.uebergabeNutzen.lesen();
      if (!u.messung) throw new Error(N.KEINE_AUSWAHL);
      if (u.einstieg === "B") {
        const p = await PC.erstellen(konf.ext, { medien: konf.medien }).laden(aa.preis);
        if (!p.ok) throw new Error("Preisliste ungültig:\n• " + p.fehler.join("\n• "));
        medienListe = Z.medienListe(p.zeilen, aa.preis);
        w.medium = medienListe.includes(nk.nutzen.medium) ? nk.nutzen.medium : medienListe[0] || null;
        w.laminat = Z.laminateFuer(w.medium, aa, konf.medien).includes(nk.nutzen.laminat) ? nk.nutzen.laminat : Z.laminateFuer(w.medium, aa, konf.medien)[0] || null;
        $("stueckzahl").value = String(nk.nutzen.stueckzahl);
      } else {
        $("kundeT").textContent = u.kunde; $("stueckzahlT").textContent = String(u.anzahl);
        $("mediumT").textContent = u.medium; $("laminatT").textContent = Z.laminatName(aa, u.laminat);
      }
      w.format = (nk.nutzen.formate.find(f => f.id === "a4") || nk.nutzen.formate[0]).id;
      $("produkt").value = nk.nutzen.produkt;
      $("abstand").value = String(nk.nutzen.abstand_motive_mm).replace(".", ",");
      zeichnen1();
      $("weiter").disabled = false;
      setTimeout(() => { (u.einstieg === "B" ? $("kunde") : $("produkt")).focus(); }, 50);
    } catch (e) { await G.popup(e.message); fertig(); }
  })();
})();
