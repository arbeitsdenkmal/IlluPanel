/* Fenster „Zusammenfassung“ (Extension de.pamnm.illupanels.zusammenfassung, Modeless, SPEZ_02 §9, MockUp C3): ersetzt „Objekte“ und „Details“.
 * Objekttabelle aus der aktuellen Objektliste (IP.objekteLesen ohne Messen) und dem Datensatz im XMP, Folien, Summen, Grafik. Liest beim Öffnen und nach
 * CSEvent aus Panel und „Objekt“. Klick wählt in Illustrator aus (Cmd: dazu/weg, Shift: Bereich), Doppelklick öffnet „Objekt“ über das Panel.
 * Fuß: berechnen (wie im Panel), PDF (<Kunde>_Zusammenfassung.pdf, vorher automatisch berechnen, über den Exportkern), Schließen (auch Esc).
 * Textil (Profil textil, SPEZ_03_Oberflaeche §7): eine Zeile je Druckgröße (Motiv, Position, Verfahren, Maß mm, Menge, Textilgrößen, blockout/zeigen, K, Teile,
 * Betrag; Motiv, Position, Verfahren, K, Teile, Betrag nur in der ersten Zeile des Motivs), die Zeilen eines Motivs gehören zusammen (Zebra, Auswahl, Doppelklick);
 * „Ohne Zuordnung (n)“, Folien je Farbschlüssel, Summen Material, Produktion, Pressen, Falten, Preis und Mindest-VK; Doppelklick öffnet über das Panel „Motiv“. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const AU = G.lib("auftrag.js");
  const EX = G.lib("export.js");
  const AB = G.lib("ablage.js");
  const Z = G.lib("zuordnen.js");
  const ZS = G.lib("zusammenfassung.js");
  const PDF = G.lib("zusammenfassung_pdf.js");
  const GZ = G.lib("grafikzeit.js");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = D.xmpZugriff(G.host);
  let puffer = null;
  try { puffer = GZ.pufferDatei(); } catch (e) { puffer = null; } // Grafikzeit-Puffer im Rechnerordner

  let konf = null, xmp = null, aa = null, liste = [], gewaehlt = new Set(), anker = -1, laeuft = false, beschaeftigt = false;
  const rollenVon = a => { const r = {}; a.ebenen.forEach(e => { r[e.name] = e.rolle; }); return r; };
  const kx = () => ({ aa, farben: konf.farben, medien: konf.medien });
  const chip = v => (v ? `<span class="chip" style="background:rgb(${v.join(",")})"></span>` : "");
  const eur = v => `${Z.zahl(v)} €`;
  const textil = () => !!aa && aa.export.profil === "textil";
  const KOPF = `<tr><th class="l">Objekt</th><th>Anzahl</th><th class="l">Folie</th><th class="l">Attribute</th><th>Teile</th><th>m²</th><th>Betrag</th><th>inkl. M.</th></tr>`;
  const KOPF_TEXTIL = `<tr><th class="l">Motiv</th><th class="l">Position</th><th class="l">Verfahren</th><th>Maß mm</th><th>Menge</th><th class="l">Textilgrößen</th><th class="l"></th>`
    + `<th>K</th><th>Teile</th><th>Betrag</th></tr>`;

  async function lesen() {
    if (laeuft || !konf) return;
    laeuft = true;
    try {
      try { xmp = await X.xmpLesen(); } catch (e) { xmp = null; }
      aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa || !aa.kalkulation || !aa.preis) { aa = null; liste = []; }
      else {
        const daten = await G.host("objekteLesen", { rollen: rollenVon(aa), messen: false });
        const z = textil() ? ZS.zeilenTextil(daten.objekte, xmp.kalkulation) : ZS.zeilen(daten.objekte, xmp.kalkulation, kx());
        liste = z.objekte.concat(z.ohne);
        liste.ohne = z.ohne.length;
      }
      gewaehlt = new Set(); anker = -1;
      zeichnen();
    } catch (e) { await G.popup(e.message); } finally { laeuft = false; }
  }

  function objektZeile(z, i, zebra) {
    const kl = [z.eingerueckt ? "var" : "", zebra ? "zebra" : "", gewaehlt.has(i) ? "sel" : ""].filter(Boolean).join(" ");
    if (textil()) {
      // eine Zeile je Druckgröße, alle mit data-i des Motivs (Zebra, Auswahl, Doppelklick je Motiv); ohne Druckgröße eine Zeile mit leeren Spalten
      const nameT = `${esc(z.name)}${z.variante ? ` <span class="min">· Variante</span>` : ""}`, dg = z.druckgroessen.length ? z.druckgroessen : [{}];
      const stufe = s => `<td>${esc(s.mass)}</td><td>${esc(s.menge)}</td><td class="l">${esc(s.groessen)}</td><td class="l">${esc(s.art)}</td>`;
      return dg.map((s, k) => (k === 0
        ? `<tr data-i="${i}"${kl ? ` class="${kl}"` : ""}><td class="l obj${z.variante ? "" : " n"}" title="${esc(z.name)}">${nameT}</td><td class="l">${esc(z.position)}</td>`
          + `<td class="l">${esc(z.verfahren)}</td>${stufe(s)}<td>${esc(z.k)}</td><td>${z.teile === null ? ZS.STRICH : z.teile}</td><td>${ZS.zahl(z.betrag)}</td></tr>`
        : `<tr data-i="${i}"${kl ? ` class="${kl}"` : ""}><td></td><td></td><td></td>${stufe(s)}<td></td><td></td><td></td></tr>`)).join("");
    }
    const name = `<span class="streif ${z.verfahren || ""}"></span>${esc(z.name)}${z.variante ? ` <span class="min">· Variante</span>` : ""}`;
    return `<tr data-i="${i}"${kl ? ` class="${kl}"` : ""}><td class="l obj${z.variante ? "" : " n"}" title="${esc(z.name)}">${name}</td><td>${esc(z.anzahl)}</td>`
      + `<td class="l">${chip(z.folie.rgb)}${esc(z.folie.text)}</td><td class="l">${esc(z.attribute)}</td><td>${z.teile === null ? ZS.STRICH : z.teile}</td>`
      + `<td>${ZS.zahl(z.m2)}</td><td>${ZS.zahl(z.betrag)}</td><td>${ZS.zahl(z.inkl)}</td></tr>`;
  }
  function zeichnen() {
    const n = liste.length - (liste.ohne || 0), t = textil();
    $("kopfzeile").innerHTML = t ? KOPF_TEXTIL : KOPF;
    const z = liste.slice(0, n).map((x, i) => objektZeile(x, i, i % 2 === 1));
    if (liste.ohne) {
      z.push(`<tr class="grp ohne"><td colspan="${t ? 10 : 8}">Ohne Zuordnung (${liste.ohne})${t ? "" : " – wird nicht berechnet"}</td></tr>`);
      liste.slice(n).forEach((x, k) => {
        const i = n + k;
        z.push(`<tr data-i="${i}" class="ohne${gewaehlt.has(i) ? " sel" : ""}"><td class="l obj" title="${esc(x.name)}">${esc(x.name)}</td><td${t ? ` class="l"` : ""}>${t ? esc(x.ebene) : ""}</td>`
          + (t ? `<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>` : `<td class="l">${esc(x.ebene)}</td><td class="l"></td><td></td><td></td><td></td><td></td></tr>`));
      });
    }
    $("objekte").innerHTML = z.join("");
    $("kalk").innerHTML = aa && xmp.kalkulation ? (t ? kalkHtmlTextil(xmp.kalkulation) : kalkHtml(xmp.kalkulation)) : "";
    $("btnBerechnen").disabled = $("btnPdf").disabled = !aa || beschaeftigt;
  }

  // Folien, Summen, Grafik aus dem Datensatz
  function kalkHtml(ds) {
    const f = ZS.folien(ds, kx()).map(x => `<tr><td class="l">${chip(x.rgb)}${esc(x.text)}</td><td>${x.rolle}</td><td>${x.boegen}</td><td>${Z.zahl(x.lfm)}</td><td>${Z.zahl(x.verbrauch)}</td><td>${Z.zahl(x.ek)}</td></tr>`).join("");
    const S = ZS.summen(ds), mw = `inkl. MwSt. ${Z.zahl(S.mwst, 0)} %`;
    const hinweis = an => (an ? ` &nbsp;<span class="hinweiszeile">${an}</span>` : "");
    const preis = (kl, titel, p, h) => `<tr class="preis${kl}"><td class="l">${titel}</td><td class="w">${eur(p.gerundet)}<span class="brutto">${eur(p.brutto)} ${mw}</span>${hinweis(h)}</td></tr>`;
    const mvk = (p, h) => `<tr class="mvk"><td class="l">Mindest-VK <span class="min">(${Z.zahl(S.satz_mindest, 0)} €/h)</span></td><td>${eur(p.gerundet)} <span class="min">${eur(p.brutto)}</span>${hinweis(h)}</td></tr>`;
    // Hinweis an der Preiszeile, bei der er greift: Produkt bei „nur Aufkleber“, Montage bei „inkl. Montage“, je VK bzw. Mindest-VK
    const gp = "Mindestbetrag Produkt greift", gm = "Mindestbetrag Montage greift", g = S.greift;
    const G2 = S.grafik;
    return `<div class="ueber" style="margin-top:8px">Folien</div>
      <table><thead><tr><th class="l">Folie</th><th>Rolle</th><th>Bögen</th><th>lfm</th><th>m² Verbrauch</th><th>EK €</th></tr></thead><tbody>${f}</tbody></table>
      <div class="ueber" style="margin-top:8px">Summen</div>
      <table class="summen"><tbody>
        <tr><td class="l">Material</td><td>${Z.zahl(S.material)}</td></tr>
        <tr><td class="l">Produktion <span class="min">${Z.zahl(S.produktion_min, 0)} min</span></td><td>${Z.zahl(S.produktion)}</td></tr>
        <tr><td class="l">Montage <span class="min">${Z.zahl(S.montage_min, 0)} min, davon ${Z.zahl(S.montage_auftrag_min, 0)} je Auftrag</span></td><td>${Z.zahl(S.montage)}</td></tr>
        ${preis("", "nur Aufkleber", S.vk.nur_aufkleber, g.vk.produkt && gp)}
        ${mvk(S.mindest.nur_aufkleber, g.mindest.produkt && gp)}
        ${preis(" akzent", "inkl. Montage", S.vk.inkl_montage, g.vk.montage && gm)}
        ${mvk(S.mindest.inkl_montage, g.mindest.montage && gm)}
      </tbody></table>
      <div class="block"><table class="summen"><tbody><tr><td class="l min">Grafik ${Z.zahl(G2.min_auto + G2.min_manuell, 0)} min <span class="min">(${Z.zahl(G2.min_auto, 0)} auto, ${Z.zahl(G2.min_manuell, 0)} manuell) · ${Z.zahl(G2.stundensatz, 0)} €/h</span></td><td class="min">${eur(G2.betrag)}</td></tr></tbody></table></div>`;
  }

  // Textil: Folien je Farbschlüssel, Summen Material, Produktion, Pressen, Falten, Preis (inkl. Pressen) und Mindest-VK, Grafik wie gebaut
  function kalkHtmlTextil(ds) {
    const f = ZS.folienTextil(ds).map(x => `<tr><td class="l">${esc(x.text)}</td><td>${x.streifen}</td><td>${Z.zahl(x.lfm)}</td><td>${Z.zahl(x.verbrauch)}</td><td>${Z.zahl(x.ek)}</td></tr>`).join("");
    const S = ZS.summenTextil(ds), mw = `inkl. MwSt. ${Z.zahl(S.mwst, 0)} %`, G2 = S.grafik;
    const hinweis = n => (n ? ` &nbsp;<span class="hinweiszeile">Mindestbetrag je Motiv greift (${n} Exemplare)</span>` : "");
    const preis = S.vk ? `<tr class="preis akzent"><td class="l">Preis</td><td class="w">${eur(S.vk.gerundet)}<span class="brutto">${eur(S.vk.brutto)} ${mw}</span>${hinweis(S.greift.vk)}</td></tr>
        <tr class="mvk"><td class="l">Mindest-VK <span class="min">(${Z.zahl(S.satz_mindest, 0)} €/h)</span></td><td>${eur(S.mindest.gerundet)} <span class="min">${eur(S.mindest.brutto)}</span>${hinweis(S.greift.mindest)}</td></tr>` : "";
    return `<div class="ueber" style="margin-top:8px">Folien</div>
      <table><thead><tr><th class="l">Farbschlüssel</th><th>Streifen</th><th>lfm</th><th>m² Verbrauch</th><th>EK €</th></tr></thead><tbody>${f}</tbody></table>
      <div class="ueber" style="margin-top:8px">Summen</div>
      <table class="summen"><tbody>
        <tr><td class="l">Material</td><td>${Z.zahl(S.material)}</td></tr>
        <tr><td class="l">Produktion <span class="min">${Z.zahl(S.produktion_min, 0)} min</span></td><td></td></tr>
        <tr><td class="l">Pressen <span class="min">${Z.zahl(S.pressen_min, 0)} min, ${S.pressvorgaenge} Pressvorgänge</span></td><td></td></tr>
        <tr><td class="l">Falten <span class="min">${Z.zahl(S.falten_min, 0)} min, Textilzahl ${S.textilzahl}</span></td><td></td></tr>
        ${preis}
      </tbody></table>
      <div class="block"><table class="summen"><tbody><tr><td class="l min">Grafik ${Z.zahl(G2.min_auto + G2.min_manuell, 0)} min <span class="min">(${Z.zahl(G2.min_auto, 0)} auto, ${Z.zahl(G2.min_manuell, 0)} manuell) · ${Z.zahl(G2.stundensatz, 0)} €/h</span></td><td class="min">${eur(G2.betrag)}</td></tr></tbody></table></div>`;
  }

  // ----- Auswahl in Illustrator -----
  const auswaehlen = () => G.host("objekteAuswaehlen", [...gewaehlt].sort((a, b) => a - b).map(i => ({ ref: liste[i].o.ref, id: liste[i].o.tags.id || null })))
    .catch(e => G.popup(e.message));
  $("objekte").addEventListener("click", e => {
    const tr = e.target.closest("tr[data-i]"); if (!tr) return;
    const i = Number(tr.dataset.i);
    if (e.metaKey || e.ctrlKey) { if (gewaehlt.has(i)) gewaehlt.delete(i); else gewaehlt.add(i); anker = i; }
    else if (e.shiftKey && anker >= 0) { gewaehlt = new Set(); for (let k = Math.min(anker, i); k <= Math.max(anker, i); k++) gewaehlt.add(k); }
    else { gewaehlt = new Set([i]); anker = i; }
    zeichnen();
    auswaehlen();
  });
  $("objekte").addEventListener("dblclick", async e => {
    const tr = e.target.closest("tr[data-i]"); if (!tr) return;
    const i = Number(tr.dataset.i);
    if (!gewaehlt.has(i)) { gewaehlt = new Set([i]); anker = i; zeichnen(); }
    await auswaehlen();
    G.senden(G.EVENT_OBJEKT_OEFFNEN, G.ID.zusammenfassung, {});
  });

  // ----- berechnen, PDF -----
  async function aktion(fn) {
    if (beschaeftigt) return;
    beschaeftigt = true; document.body.style.cursor = "wait"; zeichnen();
    try { await fn(); }
    catch (e) { if (!e.abgebrochen) await G.popup(e.message); }
    finally {
      beschaeftigt = false; document.body.style.cursor = "";
      await lesen();
      G.senden(G.EVENT_BERECHNET, G.ID.zusammenfassung, { von: "zusammenfassung" });
    }
  }
  // berechnen: vorher Übernahme der Grafikzeit aus dem Puffer (still, wie im Panel), damit der Block grafik die neuen Minuten enthält
  $("btnBerechnen").addEventListener("click", () => aktion(async () => {
    await GZ.uebernehmenXmp(G.host, puffer).catch(() => { /* still, Einträge bleiben im Puffer */ });
    const r = await AU.berechnen(G.host, konf);
    const zeilen = r.fehler.concat(r.warnungen);
    if (zeilen.length) await G.popup(zeilen.join("\n"));
  }));
  $("btnPdf").addEventListener("click", () => aktion(async () => {
    const r = await AU.berechnen(G.host, konf);
    if (!r.datensatz) { const zeilen = r.fehler.concat(r.warnungen); if (zeilen.length) await G.popup(zeilen.join("\n")); return; }
    const info = await G.host("dokumentInfo");
    if (!info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
    const x = await X.xmpLesen(), daten = await G.host("objekteLesen", { rollen: rollenVon(aa), messen: false });
    const m = x.textil && x.textil.modell, tf = x.textil && x.textil.farbe;
    const inhalt = textil()
      ? { kunde: x.kunde, auftragsart: aa.name, datum: new Date(), textil: { modell: m ? `${m.marke || ""} ${m.bezeichnung || m.modell}`.trim() : "", farbe: tf ? tf.name : "" },
        zeilen: ZS.zeilenTextil(daten.objekte, x.kalkulation), folien: ZS.folienTextil(x.kalkulation), warnungen: x.kalkulation.warnungen || [] }
      : { kunde: x.kunde, auftragsart: aa.name, datum: new Date(), massstab: x.massstab,
        zeilen: ZS.zeilen(daten.objekte, x.kalkulation, kx()), folien: ZS.folien(x.kalkulation, kx()), warnungen: x.kalkulation.warnungen || [] };
    const ex = await EX.exportieren({ xmp: x, dateien: [{ name: `${AB.dateiname(x.kunde)}_Zusammenfassung.pdf`, speichern: async lokal => PDF.erzeugen(inhalt, lokal) }], dtf: [] }, {
      rechner: konf.rechner,
      ordnerWaehlen: async start => (await G.host("ordnerWaehlen", start)).pfad,
      meldung: G.popup,
      xmpSchreiben: X.xmpSchreiben,
      arbeitsdatei: { pfad: info.pfad, speichern: () => G.host("dokumentSpeichern") }
    });
    if (ex.meldung) await G.popup(ex.meldung);
  }));

  G.empfangen(G.EVENT_OBJEKT_FERTIG, () => lesen());
  G.empfangen(G.EVENT_BERECHNET, d => { if (d.von !== "zusammenfassung") lesen(); });

  // ----- Start -----
  (async () => {
    try { konf = K.allesLaden(G.EXT); }
    catch (e) {
      const l = e instanceof K.KonfigFehler ? e.fehler : [{ datei: "", grund: e.message }];
      for (const f of l) await G.popup(`${f.datei}\n${f.grund}`);
      return;
    }
    try { await G.kernLaden(konf.schema); await lesen(); }
    catch (e) { await G.popup(e.message); }
  })();
})();
