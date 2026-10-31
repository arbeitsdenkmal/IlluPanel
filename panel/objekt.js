/* Fenster „Objekt“ (Extension de.pamnm.illupanels.objekt, ModalDialog, SPEZ_02 §6, Aufbau SPEZ_03_Oberflaeche §5): Zuordnen eines oder mehrerer oberster Objekte.
 * Art Digitaldruck | Plott, Anzahl; Digitaldruck: Medium (Preisliste), Laminat; Plott: Farben im Objekt (markierte Zeile bekommt die nächste Wahl), Farb-Nr. als
 * Filter, Serie, Kachelraster aus den ASE; Komplexität (Plott, Druck mit Cutkontur), Aufschläge, bei Druck Tape (auto → Tape → kein Tape, nicht bei Schild).
 * Vorauswahl und Farbzuordnung aus dem XMP, Serie ohne gemerkte aus serien.json „standard“; Mehrfachauswahl: gleiche Werte für alle, unterschiedliche
 * gestrichelt bzw. leer, ändern nur bei neuer Wahl.
 * Übergabe vom Panel über die Datei G.uebergabe (Tape-Vorschläge je IP_Id), Rückmeldung per CSEvent EVENT_OBJEKT_FERTIG.
 * OK: Varianten-Erkennung, IP_Id vergeben, Tags schreiben, Umfärben (Originalfarben in IP_Originalfarbe) bzw. Zurückfärben, Objekte positionsgleich auf
 * die Ebene der Rolle, vorauswahl/farbzuordnung ins XMP. Enter = OK, Esc = Abbrechen; Fuß zeigt die erste offene Warnung, OK ist dann gesperrt.
 * Schild (SPEZ_03_Schild §8.1): Arten der Ebenen des Verfahrens (Folie: Digitaldruck, Plott; UV-Druck: Plott, UV-Vorn, UV-Hinten); UV ohne Anzahl, Folie,
 * Laminat, Komplexität, Aufschläge und Tape (nur IP_Id und Ebene); ohne Tape-Button, OK schreibt keinen Tape-Zustand (SPEZ_03_Oberflaeche §5); Medien aus
 * medien.json, Preisliste ohne Auftragsart; ragt ein Objekt über mehrere Zeichenflächen, ist OK gesperrt. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const T = G.lib("teile.js");
  const TG = G.lib("tags.js");
  const PC = G.lib("preisquelle_csv.js");
  const Z = G.lib("zuordnen.js");
  const S = G.lib("schild.js");
  const U = Z.UNTERSCHIEDLICH;
  const $ = id => document.getElementById(id);
  const X = D.xmpZugriff(G.host);

  let konf = null, aa = null, xmp = null, pq = null, medienListe = [], objs = [], ueb = {}, vor = null, bereit = false, laeuft = false;
  let artenListe = ["digitaldruck", "plott"], rects = null, istSchild = false; // Schild: Arten des Verfahrens, Zeichenflächen-Rechtecke
  // init: gemeinsame Werte der Auswahl; w: neue Wahl im Dialog (null/undefined = nicht gewählt)
  let init = {}, w = { art: null, medium: null, laminat: null, komplexitaet: null, attribute: {}, tape: null };
  let farben = [], markiert = 0, serie = null, letzteSerie = null;

  const rollenVon = a => { const r = {}; a.ebenen.forEach(e => { r[e.name] = e.rolle; }); return r; };
  const art = () => w.art || (init.art !== U ? init.art : null);
  const istDruck = o => Z.artNachTag(o, konf.farben) === "digitaldruck";
  const mediumVon = o => w.medium || (istDruck(o) ? Z.medium(o, konf.medien) : vor.medium);
  const laminatVon = o => w.laminat || (istDruck(o) && o.tags.laminat ? o.tags.laminat : vor.laminat);
  const kurz = b => String(b || "").replace(/\s*\(.*$/, "");
  const rgb = v => (v ? `rgb(${v.join(",")})` : "transparent");

  function knopf(text, zustand, titel, fn, gesperrt) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text; b.title = titel || text;
    if (zustand === U) b.classList.add("mixed"); else if (zustand) b.classList.add("an");
    b.disabled = !!gesperrt;
    b.addEventListener("click", fn);
    return b;
  }

  // ----- Art, Anzahl, Medium, Laminat -----
  function artenZeichnen() {
    const sperren = Z.plottSperren(objs);
    const bez = k => ((aa.arten || []).find(x => x.schluessel === k) || {}).bezeichnung || k;
    // gesperrtes Plott: Tooltip nennt den Sperrgrund (die Fußzeile zeigt Warnungen nur zur gewählten Art)
    const gesperrt = k => k === "plott" && sperren.length > 0 && art() !== "plott";
    $("arten").replaceChildren(...artenListe.map(k => knopf(bez(k), w.art ? w.art === k : init.art === U ? U : init.art === k,
      gesperrt(k) ? sperren.join("\n") : bez(k), () => { w.art = k; zeichnen(); }, gesperrt(k))));
  }
  function druckZeichnen() {
    const d = art() === "digitaldruck";
    $("druck").hidden = !d;
    if (!d) return;
    const mG = w.medium || Z.gemeinsam(objs.map(mediumVon)), lG = w.laminat || Z.gemeinsam(objs.map(laminatVon));
    $("medium").replaceChildren(...medienListe.map(m => knopf(m, mG === U || !medienListe.includes(mG) ? U : mG === m, m, () => {
      w.medium = m;
      const erl = Z.laminateFuer(m, aa, konf.medien);
      if (objs.some(o => !erl.includes(laminatVon(o)))) w.laminat = erl[0]; // 3676 nur glänzend
      zeichnen();
    })));
    // Laminat: nicht erlaubt (für eines der Medien) -> gesperrt
    const medien = [...new Set(objs.map(mediumVon))];
    $("laminat").replaceChildren(...(aa.laminate || []).map(l => knopf(l.bezeichnung, lG === U ? U : lG === l.schluessel, l.bezeichnung,
      () => { w.laminat = l.schluessel; zeichnen(); }, medien.some(m => !Z.laminateFuer(m, aa, konf.medien).includes(l.schluessel)))));
  }

  // ----- Plott: Farben im Objekt, Serie, Farb-Nr., Kachelraster -----
  const wirksam = f => f.wahl || f.ziel;
  function naechsteOffene(ab) {
    for (let k = 1; k <= farben.length; k++) { const i = (ab + k) % farben.length; if (!wirksam(farben[i])) return i; }
    return -1;
  }
  function plottZeichnen() {
    const p = art() === "plott";
    ["plott", "serieZ", "raster"].forEach(id => { $(id).hidden = !p; });
    if (!p) return;
    $("farben").replaceChildren(...farben.map((f, i) => {
      const z = document.createElement("div"), c = wirksam(f);
      z.className = "farbe" + (i === markiert ? " an" : "");
      z.innerHTML = `<span class="big" style="background:${rgb(f.rgb || (f.ziel && f.ziel.rgb))}"></span><span class="was"></span>`
        + (c ? `<span class="ok"></span>` : `<span class="warn">→ zuordnen</span>`);
      z.querySelector(".was").textContent = f.label;
      if (c) z.querySelector(".ok").textContent = `✓ ${c.schluessel}`;
      z.addEventListener("click", () => { markiert = i; if (wirksam(f)) serie = wirksam(f).serie; zeichnen(); });
      return z;
    }));
    $("serien").replaceChildren(...konf.farben.serien.map(s => knopf(s.schluessel, serie === s.schluessel, s.bibliothek, () => { serie = serie === s.schluessel ? null : s.schluessel; zeichnen(); })));
    rasterZeichnen();
  }
  const treffer = () => {
    const q = $("farbNr").value.trim();
    return konf.farben.serien.filter(s => !serie || s.schluessel === serie).flatMap(s => s.farben).filter(c => !q || c.nummer.includes(q));
  };
  function rasterZeichnen() {
    const f = farben[markiert], c = f ? wirksam(f) : null;
    $("raster").replaceChildren(...treffer().map(x => {
      const s = document.createElement("span");
      s.style.background = rgb(x.rgb); s.title = x.name; s.dataset.n = x.schluessel;
      if (c && c.schluessel === x.schluessel) s.classList.add("an");
      s.addEventListener("click", () => zuordnen(x));
      return s;
    }));
  }
  // Kachel bzw. Farb-Nr. + Enter: der markierten Zeile zuordnen, Markierung zur nächsten offenen Zeile, Feld leeren
  function zuordnen(c) {
    const f = farben[markiert];
    if (!f) return;
    f.wahl = c; letzteSerie = c.serie;
    const n = naechsteOffene(markiert);
    if (n >= 0) markiert = n;
    $("farbNr").value = "";
    zeichnen();
  }
  $("farbNr").addEventListener("input", () => rasterZeichnen());
  $("farbNr").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation(); // Enter übernimmt hier nur die Farbe, nicht OK
    const t = treffer();
    if (t.length === 1) zuordnen(t[0]);
  });

  // ----- Komplexität, Aufschläge, Tape -----
  // Vorschlag aus dem letzten Berechnen (Übergabe), null = nicht bekannt
  const tapeVorschlag = o => (ueb.tape && o.tags.id && o.tags.id in ueb.tape ? !!ueb.tape[o.tags.id] : null);
  const TAPE_TEXT = { auto: "Tape auto", tape: "Tape", kein_tape: "kein Tape" }, TAPE_WEITER = { auto: "tape", tape: "kein_tape", kein_tape: "auto" };
  function zusatzZeichnen() {
    const a = art(), gilt = objs.filter(o => Z.komplexitaetGilt(o, a));
    const uv = Z.UV.includes(a);
    $("anzahlL").hidden = $("anzahlZ").hidden = uv; // UV: keine Anzahl
    if (uv) { $("zusatz").hidden = true; return; }  // UV: keine Komplexität, Aufschläge, Tape
    const stufen = pq.komplexitaet();
    $("komplexL").hidden = $("komplex").hidden = !gilt.length || !stufen.length;
    if (gilt.length) {
      const g = w.komplexitaet !== null ? w.komplexitaet : Z.gemeinsam(gilt.map(Z.komplexitaetVon));
      $("komplex").replaceChildren(...stufen.map(s => knopf(`K${s.stufe}`, g === U ? U : g === s.stufe, `${s.bezeichnung}, +${Z.zahl(s.prozent, 0)} % auf die Produktion`,
        () => { w.komplexitaet = s.stufe; zeichnen(); })));
    }
    const attr = pq.aufschlaege().map(x => {
      const g = w.attribute[x.schluessel] !== undefined ? w.attribute[x.schluessel] : Z.gemeinsam(objs.map(o => Z.attributeVon(o.tags.attribute).includes(x.schluessel)));
      const titel = x.prozent !== undefined ? `${kurz(x.bezeichnung)}: +${Z.zahl(x.prozent, 0)} % auf die Montage des Stücks` : `${kurz(x.bezeichnung)}: +${Z.zahl(x.minuten, 0)} min je m² Stückfläche`;
      return knopf(kurz(x.bezeichnung), g, titel, () => { w.attribute[x.schluessel] = g !== true; zeichnen(); });
    });
    if (a === "digitaldruck" && !istSchild) {
      // Tape [§6]: drei Zustände, Klick schaltet weiter „Tape auto“ (Vorschlag gilt) → „Tape“ (tape) → „kein Tape“ (kein_tape); unterschiedlich: gestrichelt,
      // Klick beginnt bei „Tape auto“. Gedrückt = Tape wirkt (manuell an oder auto mit Vorschlag Tape). Tooltip nennt den Vorschlag.
      const z = w.tape || Z.gemeinsam(objs.map(Z.tapeZustand)), vs = objs.map(tapeVorschlag), vg = Z.gemeinsam(vs);
      const vText = vs.every(v => v === null) ? "erst nach „berechnen“" : vg === U || vg === null ? "unterschiedlich" : vg ? "Tape" : "kein Tape";
      attr.push(knopf(z === U ? TAPE_TEXT.auto : TAPE_TEXT[z], z === U ? U : z === "tape" || (z === "auto" && vg === true),
        `Tape: ${vText}`,
        () => { w.tape = z === U ? "auto" : TAPE_WEITER[z]; zeichnen(); }));
    }
    $("attr").replaceChildren(...attr);
    $("attrL").hidden = $("attr").hidden = !attr.length;
    $("zusatz").hidden = $("komplex").hidden && $("attr").hidden;
  }

  // ----- Prüfen: erste offene Warnung im Fuß, OK gesperrt -----
  function anzahlWahl() {
    const v = $("anzahl").value.trim();
    if (v === "") return { wert: null, ok: true };
    return /^\d+$/.test(v) && Number(v) >= 1 ? { wert: Number(v), ok: true } : { wert: null, ok: false, text: `Anzahl „${v}“ ungültig – ganze Zahl ≥ 1 erforderlich` };
  }
  function warnungen() {
    const a = art(), p = [], an = Z.UV.includes(a) ? { ok: true } : anzahlWahl();
    if (!a && objs.some(o => !Z.artNachTag(o, konf.farben))) p.push("Art wählen");
    if (!an.ok) p.push(an.text);
    if (rects && objs.some(o => S.zeichenflaecheVon(o.vb || o.gb, rects) === "mehrere")) p.push("Objekt ragt über mehrere Zeichenflächen");
    if (a === "plott") {
      p.push(...Z.plottSperren(objs));
      if (objs.some(o => !Z.farbenDerAuswahl([o]).length)) p.push("Objekt hat keine Füllfarbe");
      const offen = farben.find(f => !wirksam(f));
      if (offen) p.push(`${offen.label}: keine Oracal-Farbe – bitte zuordnen`);
    } else if (a === "digitaldruck") {
      const voll = Z.oracalImDruck(objs, konf.farben);
      if (voll.length) p.push(`Digitaldruck darf keine Oracal-Farbe enthalten (${voll.join(", ")})`);
    }
    return p;
  }
  function pruefen() {
    const p = warnungen();
    $("hinweis").textContent = p[0] || "";
    $("hinweis").title = p[0] || "";
    $("ok").disabled = !bereit || laeuft || p.length > 0;
  }
  function zeichnen() { artenZeichnen(); druckZeichnen(); plottZeichnen(); zusatzZeichnen(); pruefen(); }
  $("anzahl").addEventListener("input", () => { $("anzahl").classList.toggle("mixed", init.anzahl === U && $("anzahl").value === ""); pruefen(); });

  // ----- OK -----
  async function ok() {
    if ($("ok").disabled) return;
    laeuft = true; pruefen();
    try {
      const a = w.art || (init.art !== U ? init.art : null), schl = o => `${o.ref.ebene}|${o.ref.index}`;
      // Varianten-Erkennung (SPEZ_02 §3.1) über alle Objekte der Rollen-Ebenen und die Auswahl, vor dem Schreiben der Tags
      const alle = (await G.host("objekteLesen", { rollen: rollenVon(aa), messen: false, blaetter: false })).objekte;
      objs.forEach(o => { if (!alle.some(x => schl(x) === schl(o))) alle.push({ ref: o.ref, tags: Object.assign({}, o.tags) }); });
      const neu = T.variantenErkennen(alle);
      if (neu.length) await G.host("objektTagsSchreiben", neu);
      const idVon = {};
      alle.forEach(x => { idVon[schl(x)] = x.tags.id || null; });

      // Plott: Folie = erste Farbe des Objekts; Umfärben aller zugeordneten Nicht-Oracal-Farben und neu gewählter Farben
      const nachKey = {};
      farben.forEach(f => { nachKey[f.key] = f; });
      const plottFolie = o => { const f = Z.farbenDerAuswahl([o])[0]; const c = f && nachKey[f.key] ? wirksam(nachKey[f.key]) : null; return c ? c.schluessel : o.tags.folie || null; };
      const umfaerben = {};
      if (a === "plott") farben.forEach(f => { const c = wirksam(f); if (c && (f.wahl || f.quelle === "zuordnung")) umfaerben[f.key] = { name: c.name, lab: c.lab }; });

      // Art = neue Wahl oder gemeinsame Vorauswahl (nach Tag, Sandbox, Ebene); nur bei gemischter Art ohne neue Wahl null
      const wahl = { art: a, medium: w.medium, laminat: w.laminat, anzahl: Z.UV.includes(a) ? null : anzahlWahl().wert, komplexitaet: w.komplexitaet, attribute: w.attribute, tape: w.tape };
      const ziele = objs.map(o => {
        const id = idVon[schl(o)] !== undefined ? idVon[schl(o)] : o.tags.id || null;
        const r = Z.tagsFuer(Object.assign({}, o, { tags: Object.assign({}, o.tags, { id }) }), wahl, { farben: konf.farben, medien: konf.medien, vorauswahl: vor, plottFolie });
        if (!id) r.tags.id = T.neueId(); // IP_Id vergeben, falls fehlend
        return { ref: o.ref, id, tags: TG.tagsPruefen(konf.schema, r.tags) };
      });
      const zielEbene = a ? ((aa.arten || []).find(x => x.schluessel === a) || {}).ebene || null : null;
      await G.host("objekteZuordnen", { ziele, art: a, farben: umfaerben, zielEbene });

      // zuletzt gewählte Werte und Farbzuordnung (Nicht-Oracal-Farbe -> Folienschlüssel) je Auftrag ins XMP
      const x = (await X.xmpLesen()) || xmp;
      const mG = Z.gemeinsam(objs.map(mediumVon)), lG = Z.gemeinsam(objs.map(laminatVon));
      const vNeu = Z.vorauswahlMerken(x, { medium: a === "digitaldruck" && mG !== U ? mG : null, laminat: a === "digitaldruck" && lG !== U ? lG : null, serie: letzteSerie });
      const fz = Object.assign({}, x.farbzuordnung || {});
      if (a === "plott") farben.forEach(f => { if (f.wahl && !konf.farben.erkennen(f.spot)) fz[f.key] = f.wahl.schluessel; });
      await X.xmpSchreiben(D.aendern(x, { vorauswahl: vNeu, farbzuordnung: fz }));
      G.senden(G.EVENT_OBJEKT_FERTIG, G.ID.objekt, {});
      G.schliessen();
    } catch (e) { laeuft = false; pruefen(); await G.popup(e.message); }
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  // ----- Start: Konfiguration, Auftrag, Preisliste, Auswahl; Vorbelegung -----
  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(konf.schema);
      xmp = await X.xmpLesen();
      aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa) throw new Error("Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.");
      const schild = istSchild = aa.export.profil === "schild";
      if (!schild && (!aa.kalkulation || !aa.preis)) throw new Error(`Für die Auftragsart „${aa.name}“ gibt es keine Kalkulation`);
      pq = PC.erstellen(konf.ext, { medien: konf.medien });
      if (schild) {
        // Schild: Arten des Verfahrens, Medien aus medien.json, Preisliste ohne Auftragsart (fehlerhaft: ohne Stufen und Aufschläge), Zeichenflächen
        artenListe = S.arten(aa, xmp.schild);
        if (!artenListe.length) throw new Error("Schild: Verfahren oder Material fehlt");
        medienListe = Z.medienAusKonfig(konf.medien, konf.farben);
        pq = await S.preisquelleOhneArt(pq);
        rects = (await G.host("dokumentInfo")).zeichenflaechen.map(z => z.rect);
      } else {
        const pl = await pq.laden(aa.preis);
        if (!pl.ok) throw new Error("Preisliste ungültig:\n• " + pl.fehler.join("\n• "));
        medienListe = Z.medienListe(pl.zeilen, aa.preis);
      }
      objs = (await G.host("auswahlLesen", { rollen: rollenVon(aa), blaetter: true })).objekte;
      if (!objs.length) { G.schliessen(); return; }
      ueb = G.uebergabe.lesen();
      vor = Z.vorauswahl(xmp, konf.farben.standard);

      const arten = objs.map(o => Z.artVorauswahl(o, konf.farben, schild ? artenListe : null));
      init.art = arten.some(x => !x) ? U : Z.gemeinsam(arten);
      const anz = Z.gemeinsam(objs.map(o => Z.anzahlVon(o.tags.anzahl)));
      init.anzahl = anz === U || anz === null ? U : anz;
      $("anzahl").value = init.anzahl === U ? "" : String(init.anzahl);
      $("anzahl").classList.toggle("mixed", init.anzahl === U);
      farben = Z.farbenDerAuswahl(objs).map(f => { const e = Z.farbeErkannt(f, konf.farben, xmp.farbzuordnung); return Object.assign({}, f, { ziel: e ? e.farbe : null, quelle: e ? e.quelle : null, wahl: null }); });
      markiert = Math.max(0, farben.findIndex(f => !f.ziel));
      serie = farben[markiert] && farben[markiert].ziel ? farben[markiert].ziel.serie : vor.serie;
      bereit = true;
      zeichnen();
      setTimeout(() => { (art() === "plott" ? $("farbNr") : $("anzahl")).focus(); }, 50);
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
