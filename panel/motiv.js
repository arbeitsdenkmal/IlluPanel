/* Fenster „Motiv“ (Extension de.pamnm.illupanels.motiv, ModalDialog 640 × 470, SPEZ_03_Textil §7): Zuordnen eines Textil-Motivs, aus dem alten Projekt
 * (panel/motiv.js, Stufe 44B) übernommen. Genau ein oberstes Objekt bzw. eine Gruppe ausgewählt, sonst Popup und Schluss.
 * Positionen als Pillen auf den Silhouetten (Kurzname, voller Name im Tooltip), „Ohne Position“ mit Sponsor und Namen; Positionen mit fehlendem Anker
 * ausgegraut (IP.ankerNamen, einmal beim Öffnen). Verfahren DTF · Flex · Flock · Stick, bei „Namen“ nur DTF. Flex/Flock: Serie aus der Preisliste (verfahren
 * flex bzw. flock; genau eine -> vorbelegt und nur angezeigt), je Füllfarbe des Objekts ein Feld „Flexfarbe“ (Pflicht, Vorbelegung aus IP_Farbe), Komplexität
 * K0–K3; gesperrt wie Plott (Konturen, Bilder, Verläufe) und bei Transparenz. Druckgrößen: zeigen · Maß (Maße der Position, „frei“, „Kinder“) · Bezug ·
 * Menge · Textilgrößen · blockout (nicht bei Stick) · ×; Summenzeile; Höhenhinweis als Popup. Fußzeile zeigt die erste offene Warnung, OK ist dann gesperrt.
 * „Kinder“: die Körpergröße steht in koerpergroesse_cm der Druckgröße und wird beim Öffnen wieder als „Kinder“ gezeigt (§2.2).
 * OK: Varianten-Erkennung, IP_Id vergeben, Tags (§5.1) schreiben, Objekt positionsgleich auf „Design“, skalieren auf Realmaß der zeigen-Druckgröße / Faktor
 * (Modell ohne Realmaß, Faktor null: keine Skalierung, §3.2)
 * des Modells, am Anker ausrichten (IP.textilZuordnen); CSEvent EVENT_OBJEKT_FERTIG. Enter = OK, Esc = Abbrechen. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const T = G.lib("teile.js");
  const TG = G.lib("tags.js");
  const PC = G.lib("preisquelle_csv.js");
  const Z = G.lib("zuordnen.js");
  const TX = G.lib("textil.js");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = D.xmpZugriff(G.host);

  let konf = null, aa = null, tk = null, o = null, faktor = null, serienAlle = [], stufenK = [], sperrGruende = [];
  let position = null, verfahren = null, stufen = [], serie = null, komplexitaet = 0, farben = [], verhaeltnis = 0, anker = null, bereit = false, laeuft = false;

  // Pillen: Kurzname und Lage (px) auf der Silhouette 210 × 196; links im Bild = rechte Seite des Trägers
  const PILLEN = {
    "Ärmel rechts": { seite: "Vorn", kurz: "Ärmel", x: 36, y: 56 }, "Ärmel links": { seite: "Vorn", kurz: "Ärmel", x: 174, y: 56 },
    "Brust rechts": { seite: "Vorn", kurz: "rechts", x: 68, y: 84 }, "Brust links": { seite: "Vorn", kurz: "links", x: 142, y: 84 },
    "Brust mittig": { seite: "Vorn", kurz: "mittig", x: 105, y: 106 }, "Front": { seite: "Vorn", kurz: "Front", x: 105, y: 132 }, "vorne unten": { seite: "Vorn", kurz: "unten", x: 105, y: 160 },
    "Nacken": { seite: "Hinten", kurz: "Nacken", x: 105, y: 42 }, "Rücken oben": { seite: "Hinten", kurz: "oben", x: 105, y: 78 },
    "Rücken": { seite: "Hinten", kurz: "Mitte", x: 105, y: 114 }, "Rücken unten": { seite: "Hinten", kurz: "unten", x: 105, y: 154 }
  };
  const nfc = s => String(s || "").normalize("NFC");
  // Anker fehlt im MockUp: nur bei Positionen mit anker und vorhandener Ebene „Anker“ (fehlt die Ebene ganz: nichts ausgrauen)
  const ankerFehlt = p => !!(anker && anker.ebene && p.anker && !anker.namen.has(nfc(p.anker)));
  const geschnitten = () => TX.istGeschnitten(verfahren);
  const serienFuer = v => serienAlle.filter(s => s.verfahren === String(v || "").toLowerCase()).map(s => s.schluessel);

  function knopf(text, an, fn, gesperrt, titel, cls) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text; b.title = titel || text; b.disabled = !!gesperrt;
    if (cls) b.className = cls;
    if (an) b.classList.add("an");
    b.addEventListener("click", fn);
    return b;
  }
  const masse = () => TX.masseFuer(tk.stufen, position).auswahl.map(String);
  function stufeNeu() {
    const m = TX.masseFuer(tk.stufen, position);
    return { mass_mm: m.standard || "", bezug: "Breite", menge: "", groessen: "", blockout: false, zeigen: !stufen.length, wahl: m.standard ? String(m.standard) : "frei", kinder_cm: "" };
  }
  // Maß, das es bei der Position nicht gibt: als „frei“ mit dem bisherigen Wert anzeigen; der Wert bleibt
  const wahlAnzeige = (s, opts) => (s.wahl === "frei" || s.wahl === "kinder" || opts.includes(s.wahl) ? s.wahl : "frei");

  function positionenZeichnen() {
    ["Vorn", "Hinten"].forEach(seite => {
      $("pillen" + seite).replaceChildren(...TX.POSITIONEN.filter(p => PILLEN[p.name] && PILLEN[p.name].seite === seite).map(p => {
        const k = PILLEN[p.name], fehlt = ankerFehlt(p);
        const b = knopf(k.kurz, p.name === position, () => positionWaehlen(p.name), fehlt, fehlt ? `${p.name} – kein Anker im MockUp` : p.name, "pille");
        b.style.left = `${k.x}px`; b.style.top = `${k.y}px`;
        return b;
      }));
    });
    $("ohnePosition").replaceChildren(...TX.POSITIONEN.filter(p => !PILLEN[p.name]).map(p => {
      const fehlt = ankerFehlt(p);
      return knopf(p.name, p.name === position, () => positionWaehlen(p.name), fehlt, fehlt ? `${p.name} – kein Anker im MockUp` : p.name);
    }));
  }
  function verfahrenZeichnen() {
    const v = TX.verfahrenFuer(position); // Namen nur DTF
    $("verfahren").replaceChildren(...TX.VERFAHREN.map(x => knopf(x, x === verfahren, () => verfahrenWaehlen(x), !v.includes(x))));
    flexZeichnen();
  }
  function verfahrenWaehlen(x) {
    verfahren = x;
    const l = serienFuer(x);
    if (!l.includes(serie)) serie = l.length === 1 ? l[0] : null;
    verfahrenZeichnen(); stufenZeichnen();
  }
  // Flex/Flock: Serie (genau eine -> nur angezeigt) und Komplexität in der rechten Spalte, Farben im Objekt über den Druckgrößen; bei DTF und Stick ohne Platz
  function flexZeichnen() {
    $("flexR").hidden = $("flexFarben").hidden = !geschnitten();
    if (!geschnitten()) return;
    const l = serienFuer(verfahren), sel = $("serie");
    sel.replaceChildren(new Option("", ""), ...l.map(k => new Option(k, k)));
    sel.value = serie || "";
    sel.hidden = l.length === 1;
    $("serieFest").textContent = l.length === 1 ? l[0] : "";
    $("komplex").replaceChildren(...stufenK.map(s => knopf(`K${s.stufe}`, komplexitaet === s.stufe, () => { komplexitaet = s.stufe; flexZeichnen(); },
      false, `${s.bezeichnung}, +${Z.zahl(s.prozent, 0)} % auf die Produktion`)));
    $("farben").replaceChildren(...farben.map(f => {
      const z = document.createElement("div"), chip = document.createElement("span"), was = document.createElement("span"), i = document.createElement("input");
      z.className = "fx"; chip.className = "big"; chip.style.background = f.rgb ? `rgb(${f.rgb.join(",")})` : "transparent";
      was.className = "fxname"; was.textContent = f.label; was.title = f.label;
      i.type = "text"; i.placeholder = "Flexfarbe"; i.title = "Flexfarbe"; i.autocomplete = "off"; i.spellcheck = false; i.value = f.flexfarbe;
      i.addEventListener("input", () => { f.flexfarbe = i.value; pruefen(); });
      z.append(chip, was, i);
      return z;
    }));
  }
  $("serie").addEventListener("change", () => { serie = $("serie").value || null; pruefen(); });
  // Positionswechsel: Verfahren bleibt, wenn erlaubt (Namen: DTF); eine einzige Druckgröße ohne Menge bekommt die Vorbelegung der neuen Position
  function positionWaehlen(p) {
    position = p;
    const v = TX.verfahrenFuer(p);
    if (!v.includes(verfahren)) verfahrenWaehlen(v.length === 1 ? v[0] : null);
    if (stufen.length === 1 && !stufen[0].menge) { stufen = []; stufen.push(stufeNeu()); } // erst leeren: stufeNeu setzt „zeigen“ nur für die erste Druckgröße
    const opts = masse();
    stufen.forEach(s => { if (s.wahl !== "frei" && s.wahl !== "kinder") s.wahl = opts.includes(String(s.mass_mm)) ? String(s.mass_mm) : "frei"; if (p === "Namen") s.bezug = "Breite"; });
    positionenZeichnen(); verfahrenZeichnen(); stufenZeichnen();
  }
  // Titelzeile: „<Position> · Standard <n> mm Breite“, ohne Standardmaß „<Position> · ohne Vorgabe“, ohne Position „ohne Vorgabe“
  function untertitel() {
    const m = position ? TX.masseFuer(tk.stufen, position) : { standard: null };
    $("stufenSub").textContent = !position ? "ohne Vorgabe" : m.standard ? `${position} · Standard ${TX.masszahl(m.standard)} mm Breite` : `${position} · ohne Vorgabe`;
  }
  function stufenZeichnen() {
    const opts = masse(), bo = TX.blockoutMoeglich(verfahren);
    untertitel();
    $("thBlockout").textContent = bo || !verfahren ? "blockout" : "";
    $("stufenBody").innerHTML = stufen.map((s, i) => { const w = wahlAnzeige(s, opts); return `<tr class="stufe${i % 2 ? " z2" : ""}" data-i="${i}">
      <td class="zeigen"><input type="radio" name="zeigen" data-f="zeigen" title="zeigen: diese Druckgröße im Korrekturabzug" ${s.zeigen ? "checked" : ""}></td>
      <td><span class="massz"><select data-f="wahl" title="Maß mm">${opts.map(v => `<option value="${v}" ${w === v ? "selected" : ""}>${v}</option>`).join("")}<option value="frei" ${w === "frei" ? "selected" : ""}>frei</option><option value="kinder" ${w === "kinder" ? "selected" : ""}>Kinder</option></select>${
        w === "frei" || w === "kinder" ? `<input type="number" min="1" step="any" data-f="mass_mm" placeholder="${w === "kinder" ? "Breite mm" : "mm"}" title="${w === "kinder" ? "Breite mm" : "mm"}" value="${esc(s.mass_mm)}">` : ""}${
        w === "kinder" ? `<input type="number" min="1" data-f="kinder_cm" placeholder="Körpergröße cm" title="Körpergröße cm" value="${esc(s.kinder_cm)}">` : ""}</span></td>
      <td><select class="bezug" data-f="bezug" title="Bezug" ${position === "Namen" ? "disabled" : ""}><option ${s.bezug === "Breite" ? "selected" : ""}>Breite</option><option ${s.bezug === "Höhe" ? "selected" : ""}>Höhe</option></select></td>
      <td><input type="number" class="menge" min="1" step="1" data-f="menge" title="Menge" value="${esc(s.menge)}"></td>
      <td><input type="text" class="gr" data-f="groessen" title="Textilgrößen" value="${esc(s.groessen)}" spellcheck="false"></td>
      <td class="bo">${bo ? `<input type="checkbox" data-f="blockout" title="blockout" ${s.blockout ? "checked" : ""}>` : ""}</td>
      <td class="weg">${stufen.length > 1 ? `<button type="button" class="weg" data-f="weg" title="Druckgröße entfernen">×</button>` : ""}</td></tr>`; }).join("");
    $("stufenBody").querySelectorAll(".stufe").forEach(z => {
      const s = stufen[Number(z.dataset.i)];
      z.querySelectorAll("[data-f]").forEach(el => {
        const f = el.dataset.f;
        const ev = el.tagName === "BUTTON" ? "click" : (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input");
        el.addEventListener(ev, () => {
          if (f === "weg") { stufen.splice(stufen.indexOf(s), 1); if (!stufen.some(x => x.zeigen)) stufen[0].zeigen = true; return stufenZeichnen(); }
          if (f === "zeigen") { stufen.forEach(x => { x.zeigen = x === s; }); return pruefen(); }
          if (f === "blockout") s.blockout = el.checked;
          else if (f === "wahl") { s.wahl = el.value; if (el.value !== "frei" && el.value !== "kinder") s.mass_mm = Number(el.value); return stufenZeichnen(); }
          else if (f === "kinder_cm") { s.kinder_cm = el.value; if (Number(el.value) > 0) { s.mass_mm = TX.kinderMass(Number(el.value), tk.cfg.kinder_faktor); z.querySelector('[data-f="mass_mm"]').value = s.mass_mm; } }
          else s[f] = el.value;
          pruefen();
        });
      });
    });
    pruefen();
  }
  // Summenzeile: „Gesamt <Σ Menge> Stück in <n> Druckgrößen · <Verfahren> · Anker <anker>“ (ohne Anker bzw. ohne Verfahren ohne den Teil)
  function summeZeigen() {
    const menge = stufen.reduce((a, s) => a + (Number.isInteger(Number(s.menge)) && Number(s.menge) > 0 ? Number(s.menge) : 0), 0);
    const p = TX.position(position), teile = [`in ${stufen.length} ${stufen.length === 1 ? "Druckgröße" : "Druckgrößen"}`];
    if (verfahren) teile.push(verfahren);
    if (p && p.anker) teile.push(`Anker ${p.anker}`);
    $("summe").innerHTML = `Gesamt <b>${menge} Stück</b> ${esc(teile.join(" · "))}`;
  }
  function pruefen() {
    const probleme = (position ? [] : ["Position wählen"]).concat(TX.dialogProbleme(verfahren, stufen, { sperren: sperrGruende, serie, farben: farben.map(f => f.flexfarbe) }));
    const w = TX.ersteWarnung(probleme);
    $("hinweis").textContent = w; $("hinweis").title = w;
    $("ok").disabled = !bereit || laeuft || probleme.length > 0;
    summeZeigen();
  }
  $("stufePlus").addEventListener("click", () => { stufen.push(stufeNeu()); stufenZeichnen(); });

  async function ok() {
    if ($("ok").disabled) return;
    laeuft = true; pruefen();
    try {
      const schl = x => `${x.ref.ebene}|${x.ref.index}`, v = verfahren, gs = TX.istGeschnitten(v);
      // Varianten-Erkennung (SPEZ_02 §3.1) über alle Objekte der Ebene „Design“ und die Auswahl, vor dem Schreiben der Tags
      const rollen = {}; aa.ebenen.forEach(e => { rollen[e.name] = e.rolle; });
      const alle = (await G.host("objekteLesen", { rollen, messen: false, blaetter: false })).objekte;
      if (!alle.some(x => schl(x) === schl(o))) alle.push({ ref: o.ref, tags: Object.assign({}, o.tags) });
      const neu = T.variantenErkennen(alle);
      if (neu.length) await G.host("objektTagsSchreiben", neu);
      const bisher = (alle.find(x => schl(x) === schl(o)) || o).tags.id || null;
      const st = stufen.map(s => ({ mass_mm: Number(s.mass_mm), bezug: position === "Namen" ? "Breite" : s.bezug, menge: Number(s.menge), groessen: String(s.groessen || "").trim(),
        blockout: TX.blockoutMoeglich(v) && !!s.blockout, zeigen: !!s.zeigen, koerpergroesse_cm: s.wahl === "kinder" && Number(s.kinder_cm) > 0 ? Number(s.kinder_cm) : null }));
      const zeigen = st.find(s => s.zeigen) || st[0];
      const fz = {};
      if (gs) farben.forEach(f => { fz[f.key] = f.flexfarbe.trim(); });
      // IP_Anzahl, IP_Laminat, IP_Attribute nicht bei Textil; IP_Folie, IP_Farbe, IP_Komplexitaet nur bei Flex/Flock (K0 ohne Tag)
      const tags = TG.tagsPruefen(konf.schema, { id: bisher || T.neueId(), position, verfahren: v, stufen: JSON.stringify(st), folie: gs ? serie : null,
        farbe: gs ? JSON.stringify(fz) : null, komplexitaet: gs && komplexitaet > 0 ? String(komplexitaet) : null, anzahl: null, laminat: null, attribute: null });
      const p = TX.position(position);
      await G.host("textilZuordnen", { ref: o.ref, id: bisher, tags, zielEbene: aa.quelle.sandbox, bezug: zeigen.bezug, wert_mm: faktor > 0 ? zeigen.mass_mm / faktor : null,
        anker: p.anker || null, modus: TX.ankerModus(p.anker) });
      const hinweise = st.map((s, i) => TX.hoehenHinweis(tk.cfg, position, s, verhaeltnis, i + 1)).filter(Boolean);
      if (hinweise.length) await G.popup(hinweise.join("\n")); // Höhenhinweis, nichts wird umgestellt
      G.senden(G.EVENT_OBJEKT_FERTIG, G.ID.motiv, {});
      G.schliessen();
    } catch (e) { laeuft = false; pruefen(); await G.popup(e.message); }
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  // ----- Start: Konfiguration, Textil-Arbeitsdatei, Preisliste (Serien, Komplexität), Auswahl, Anker; Vorbelegung -----
  (async () => {
    try {
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(konf.schema);
      const xmp = await X.xmpLesen();
      aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa || aa.export.profil !== "textil") throw new Error("Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.");
      tk = konf.textil.konfig;
      if (!tk) throw new Error(konf.textil.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n"));
      const m = xmp.textil && xmp.textil.modell;
      if (!m) throw new Error("Textil: Modell fehlt im Dokument");
      faktor = m.faktor; // null ohne Realmaß: Zuordnen ohne Skalierung (§3.2)
      const sel = await G.host("auswahlLesen", { rollen: { [aa.quelle.sandbox]: "textil" }, blaetter: true });
      if (sel.unterebene || sel.objekte.length !== 1) throw new Error("Bitte gruppieren: Es muss genau ein oberstes Objekt bzw. eine Gruppe ausgewählt sein.");
      o = sel.objekte[0];
      // Preisliste: Serien (flex/flock) und Komplexitätsstufen; fehlerhaft -> Popup, DTF und Stick bleiben möglich
      const pq = PC.erstellen(konf.ext, { medien: konf.medien }), pl = await pq.laden(aa.preis);
      if (pl.ok) {
        stufenK = pq.komplexitaet();
        pl.zeilen.filter(z => z.typ === "serie" && TX.GESCHNITTEN.map(x => x.toLowerCase()).includes(z.verfahren) && (z.gilt_fuer === aa.preis || z.gilt_fuer === "alle"))
          .forEach(z => { if (!serienAlle.some(s => s.schluessel === z.schluessel)) serienAlle.push({ schluessel: z.schluessel, verfahren: z.verfahren }); });
      } else await G.popup("Preisliste ungültig:\n• " + pl.fehler.join("\n• "));
      verhaeltnis = o.vb ? (o.vb[1] - o.vb[3]) / (o.vb[2] - o.vb[0]) : 0;
      try { const r = await G.host("ankerNamen"); anker = { ebene: !!r.ebene, namen: new Set((r.namen || []).map(nfc)) }; } catch (e) { anker = null; }
      const t = o.tags;
      position = TX.position(t.position) ? t.position : TX.POSITIONEN[0].name;
      const vv = TX.verfahrenFuer(position);
      verfahren = vv.includes(t.verfahren) ? t.verfahren : vv.length === 1 ? vv[0] : null;
      const l = serienFuer(verfahren);
      serie = l.includes(t.folie) ? t.folie : l.length === 1 ? l[0] : null;
      komplexitaet = Z.komplexitaetVon(o);
      const fz = TX.farbenVon(t);
      sperrGruende = TX.sperren([o]);
      farben = Z.farbenDerAuswahl([o]).map(f => ({ key: f.key, label: f.label, rgb: f.rgb, flexfarbe: fz[f.key] || "" }));
      const opts = TX.masseFuer(tk.stufen, position).auswahl.map(String);
      stufen = TX.stufenVon(t).map(s => Object.assign({ wahl: "frei", kinder_cm: "" }, s, Number(s.koerpergroesse_cm) > 0 ? { wahl: "kinder", kinder_cm: String(s.koerpergroesse_cm) }
        : { wahl: opts.includes(String(s.mass_mm)) ? String(s.mass_mm) : "frei" }));
      if (stufen.length && !stufen.some(s => s.zeigen)) stufen[0].zeigen = true;
      if (!stufen.length) stufen.push(stufeNeu());
      bereit = true;
      positionenZeichnen(); verfahrenZeichnen(); stufenZeichnen();
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
