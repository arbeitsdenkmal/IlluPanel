/* Stücke, Teile, Messung und Prüfungen (SPEZ_02 §3.1, §5); aus dem alten Projekt übernommen und auf IP_Id/IP_Folie/IP_Anzahl/IP_Attribute umgestellt.
 * Eingabe: Rohdaten aus IP.objekteLesen (pt, Dokumentmaßstab), Auftragsart, geladene Preisquelle, Farbverzeichnis, medien.json, XMP.
 * Ausgabe: Stücke und Teile in mm 1:1, Teile gruppiert nach Folie (Plott je Farbschlüssel, Druck je Medium + Laminat), Hinweise und Fehler.
 * Messwerte je Stück gelten für ein Exemplar; Nesting und Kalkulation multiplizieren mit der Anzahl.
 * Preisprüfungen („Serie/Medium ohne Preis“, Tape ohne tape_vk_m2) nur bei Auftragsarten mit Kalkulation; ohne (Schild, SPEZ_03_Schild §8.3) müssen Serie
 * bzw. Medium nur in serien.json bzw. medien.json bekannt sein.
 * Rohdaten je Blatt: laenge_pt (Schnittlänge, alle Teilpfade inkl. Punzen), teile (geschlossener bzw. zusammengesetzter Pfad = 1, Text = Anzahl der
 * Glyphenformen; Punzen zählen nicht), gb (Begrenzung). Näherung: Bei Schnittmasken zählt die volle Pfadlänge, die Fläche ist die sichtbare Begrenzung.
 * Textil Flex/Flock (SPEZ_03_Textil §9.1, aufbauenTextil): je Motiv und Druckgröße ein Stück; gemessen einmal im MockUp-Maß, je Druckgröße mit
 * f = mass_mm / mass_mm(zeigen) × Faktor des Modells auf Realmaß umgerechnet (Ersatzweg nur ohne Realmaß, Faktor null: mass_mm / Ist-Maß des Motivs, sichtbare
 * Grenzen, Bezug Breite bzw. Höhe); Nesting-Einheit ist das ganze Exemplar bzw. bei
 * mehrfarbigen Motiven der Block je Farbschlüssel (<Serie>-<Flexfarbe>) mit beiden Passermarken. */
"use strict";
const R = require("./rollen");
const PM = require("./passermarken");
const TX = require("./textil");
const A = require("./ablage");
const PT_MM = 25.4 / 72;

// Illustrator-Bounds [l, t, r, b] (y nach oben) -> mm 1:1 mit y nach unten.
// Illustrator rechnet mit 32-Bit-Gleitkomma; ×30 ergibt Rauschen im µm-Bereich -> auf 0,01 mm runden.
const r2 = v => Math.round(v * 100) / 100;
const TOL = 0.01;
function box(gb, k) { return gb ? { x0: r2(gb[0] * k), y0: r2(-gb[1] * k), x1: r2(gb[2] * k), y1: r2(-gb[3] * k) } : null; }
function union(a, b) {
  if (!a) return b; if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
const breite = b => b.x1 - b.x0, hoehe = b => b.y1 - b.y0;
const m2 = b => (b ? r2(breite(b)) * r2(hoehe(b)) / 1e6 : 0);

/** Einzelteile, Schnittlänge, Fläche (Begrenzung) und Dichten einer Blattmenge; k = mm je pt im Realmaß */
function messen(blaetter, k) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, laenge_mm = 0, teile = 0;
  for (const b of blaetter) {
    if (b.gb) { x0 = Math.min(x0, b.gb[0] * k); x1 = Math.max(x1, b.gb[2] * k); y0 = Math.min(y0, b.gb[3] * k); y1 = Math.max(y1, b.gb[1] * k); }
    laenge_mm += (b.laenge_pt || 0) * k;
    teile += b.teile || 0;
  }
  const flaeche_m2 = x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) / 1e6 : 0;
  const schnitt_m = laenge_mm / 1000;
  return { flaeche_m2, schnitt_m, teile, schnittdichte: flaeche_m2 > 0 ? schnitt_m / flaeche_m2 : 0, teiledichte: flaeche_m2 > 0 ? teile / flaeche_m2 : 0 };
}

/** Teilt ein übergroßes Teil an Lücken zwischen den Einzelobjekten (Projektion auf eine Achse). */
function anLueckenTeilen(blaetter, maxQuer, maxLang) {
  let best = null;
  for (const achse of ["x", "y"]) {
    const s = achse === "x" ? "x0" : "y0", e = achse === "x" ? "x1" : "y1";
    const sortiert = blaetter.slice().sort((p, q) => p.box[s] - q.box[s] || p.box[e] - q.box[e]);
    // Cluster: überlappende Intervalle gehören zusammen, Trennlinien nur in echten Lücken
    const cluster = [];
    for (const b of sortiert) {
      const c = cluster[cluster.length - 1];
      if (c && b.box[s] < c.ende + TOL) { c.blaetter.push(b); c.ende = Math.max(c.ende, b.box[e]); }
      else cluster.push({ start: b.box[s], ende: b.box[e], blaetter: [b] });
    }
    if (cluster.length < 2) continue;
    const stuecke = [];
    let cur = null, moeglich = true;
    for (const c of cluster) {
      if (c.ende - c.start > maxQuer + TOL) { moeglich = false; break; }
      if (cur && c.ende - cur.start <= maxQuer + TOL) { cur.blaetter.push(...c.blaetter); cur.ende = c.ende; }
      else { cur = { start: c.start, ende: c.ende, blaetter: c.blaetter.slice() }; stuecke.push(cur); }
    }
    if (!moeglich) continue;
    const res = stuecke.map(st => ({ blaetter: st.blaetter, box: st.blaetter.reduce((u, b) => union(u, b.box), null) }));
    if (res.some(r => Math.max(breite(r.box), hoehe(r.box)) > maxLang + TOL)) continue;
    if (!best || res.length < best.length) best = res;
  }
  return best;
}

// ---------- Varianten-Erkennung (SPEZ_02 §3.1) ----------
let idZaehler = 0;
/** neue IP_Id: zeitbasiert + Zufall, Text */
function neueId() {
  idZaehler = (idZaehler + 1) % 1296;
  return Date.now().toString(36) + idZaehler.toString(36).padStart(2, "0") + Math.random().toString(36).slice(2, 8);
}
/**
 * Vergleich nur der IP_Id-Texte: tragen mehrere Objekte dieselbe Id, behält das in Ebenenreihenfolge erste sie; jedes weitere bekommt eine neue
 * IP_Id und IP_Original = die bisherige Id. Alle übrigen Tags bleiben. objekte in Ebenenreihenfolge (IP.objekteLesen); sie werden angepasst.
 * Rückgabe: Aufträge für IP.objektTagsSchreiben [{ ref, id (bisherige Id zur Kontrolle), tags: { id, original } }].
 */
function variantenErkennen(objekte, idQuelle) {
  const neu = idQuelle || neueId, gesehen = new Set(), schreiben = [];
  for (const o of objekte) {
    const id = o.tags && o.tags.id;
    if (!id) continue;
    if (!gesehen.has(id)) { gesehen.add(id); continue; }
    let n;
    do n = neu(); while (gesehen.has(n));
    gesehen.add(n);
    schreiben.push({ ref: o.ref, id, tags: { id: n, original: id } });
    o.tags.id = n; o.tags.original = id; o.id = n;
  }
  return schreiben;
}

// ---------- Hinweise zusammenfassen (Produktionsregeln §4; Texte aus dem alten Panel) ----------
const SAMMEL = {
  sandbox: n => `${n} Objekte auf der Sandbox (werden nicht berechnet)`,
  konflikt: n => `${n} Konflikte (werden nicht berechnet)`,
  kontur: n => `${n} Plott-Objekte mit Kontur`,
  geteilt: n => `${n} Objekte an Lücken geteilt`,
  bild: n => `${n} Plott-Objekte mit Bild`,
  verlauf: n => `${n} Plott-Objekte mit Verlauf/Muster`,
  komplexitaet: n => `${n} Hinweise zur Komplexität`,
  kontur_textil: n => `${n} Flex-/Flock-Motive mit Kontur`
};
/** je Gruppe gleichartiger Hinweise eine Sammelzeile (ein einzelner mit vollem Text); „ohne Zuordnung“ als „n Objekte ohne Zuordnung“ */
function hinweisZeilen(details, ohneZuordnung) {
  const gruppen = new Map(), n = Number(ohneZuordnung) || 0;
  (details || []).forEach(w => { const k = w.typ === "unzugeordnet" || w.typ in SAMMEL ? w.typ : "#" + w.text; if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(w); });
  const z = [];
  for (const [k, ws] of gruppen) {
    if (k === "unzugeordnet") { if (n) z.push(`${n} Objekte ohne Zuordnung`); continue; }
    z.push(ws.length === 1 ? ws[0].text : SAMMEL[k](ws.length));
  }
  if (n && !gruppen.has("unzugeordnet")) z.push(`${n} Objekte ohne Zuordnung`);
  return z;
}

/** Anzahl aus IP_Anzahl: fehlt -> 1; ganze Zahl ≥ 1, sonst null */
function anzahlVon(v) {
  if (v === null || v === undefined || String(v).trim() === "") return 1;
  const s = String(v).trim();
  return /^\d+$/.test(s) && Number(s) >= 1 ? Number(s) : null;
}
const attributeVon = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);

/**
 * @param daten  Ergebnis von IP.objekteLesen { ebenen, objekte }
 * @param kx     { aa, pq (geladen), farben (farben.verzeichnis), medien (medien.json), xmp }
 * @returns { objekte (Stücke), gruppen: { key: { key, verfahren, schluessel, serie, laminat, teile[] } }, teile[], details[], fehler[], ohneZuordnung, massstab }
 */
function aufbauen(daten, kx) {
  const { aa, pq, farben, medien, xmp } = kx;
  const details = [], fehler = [];
  const warn = (text, typ, objekt) => { if (!details.some(d => d.text === text)) details.push({ typ: typ || "sonstige", objekt: objekt || "", text }); };
  const leer = { objekte: [], gruppen: {}, teile: [], details, fehler, ohneZuordnung: 0, massstab: null };
  const massstab = xmp && xmp.massstab;
  if (!(massstab > 0)) { fehler.push("Kein gültiger Maßstab im Dokument gespeichert."); return leer; }
  const k = PT_MM * massstab;
  const MK = medien || {}, alias = MK.alias || {}, farbzuordnung = (xmp && xmp.farbzuordnung) || {};
  const A = aa.preis, preise = !!aa.kalkulation;
  const rolleVon = {};
  aa.ebenen.forEach(e => { rolleVon[e.name] = e.rolle; });
  const rand = aa.nesting.rand_mm, maxLang = aa.nesting.max_breite_mm - 2 * rand; // 5680 mm
  const druck = aa.druck, DW = R.druck(MK);
  const druckLangS = druck.max_laenge_sonder_mm - DW.zuschlag_mm;                        // längste Grafik (Sonderbogen)
  const beschnitt = Number(druck.beschnitt_mm) || 0, reserve = DW.reserve_kontur_mm;
  const um = (b, d) => ({ x0: r2(b.x0 - d), y0: r2(b.y0 - d), x1: r2(b.x1 + d), y1: r2(b.y1 + d) });
  const dez = v => (Math.round(v * 1000) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 3 });
  const plottSerien = new Set(farben.serien.map(s => s.preisserie));
  const serie = (schluessel, verfahren) => { const e = pq.serie(schluessel); return e && e.verfahren === verfahren ? e : null; };
  const breiteFehlt = schluessel => { const m = R.fehlt(schluessel); if (!fehler.includes(m)) fehler.push(m); };
  // Plott: Höhe innerhalb der Ränder = Nutzbreite der Serie − 2 × Rand (z. B. 751C: 1260 − 25 − 20 = 1215 mm)
  const maxQuerFuer = preisserie => { const nb = R.nutzbreite(MK, preisserie, "plott"); if (nb === null) { breiteFehlt(preisserie); return null; } return nb - 2 * rand; };
  const laminateFuer = medium => ((MK.medien || {})[medium] || {}).laminate || (aa.laminate || []).map(l => l.schluessel);
  const stufen = pq.komplexitaet();
  const aufschlaege = {};
  pq.aufschlaege().forEach(x => { aufschlaege[x.schluessel] = x; });
  const farbeVon = f => farben.erkennen(f.spot) || (Object.prototype.hasOwnProperty.call(farbzuordnung, f.key) ? farben.nachSchluessel(farbzuordnung[f.key]) : null);

  (daten.ebenen || []).forEach(e => {
    if (!e.rolle) warn(`Unbekannte Ebene „${e.name}“ – Objekte darauf werden nicht berechnet`, "ebene", e.name);
    else if (e.unterebenen && e.rolle !== "vorlage") warn(`Ebene „${e.name}“ enthält Unterebenen – diese werden nicht berechnet`, "ebene", e.name);
  });

  const gruppen = {}, teile = [], objekte = [];
  let tid = 0, ohneZuordnung = 0;
  const gruppe = (key, init) => (gruppen[key] = gruppen[key] || Object.assign({ key, teile: [] }, init));
  const teilNeu = (g, obj, extra) => {
    const t = Object.assign({ id: "T" + String(++tid).padStart(4, "0"), gruppe: g.key, objekt: obj.nr, anzahl: obj.anzahl, stueck: "" }, extra);
    teile.push(t); g.teile.push(t); obj.teile.push(t.id);
    return t;
  };

  for (const o of daten.objekte) {
    const r = rolleVon[o.ebene] || o.rolle;
    const wo = o.name ? `„${o.name}“` : `unbenanntes Objekt (${o.typ})`;
    const kurz = o.name || `unbenanntes Objekt (${o.typ}, Ebene ${o.ebene})`;
    if (r === "sandbox") { warn(`${wo} liegt auf der Sandbox – wird nicht berechnet`, "sandbox", kurz); continue; }
    if (r !== "plott" && r !== "digitaldruck") continue;
    const tags = o.tags || {}, folie = tags.folie;
    if (!folie) { ohneZuordnung++; warn(`${wo} auf Ebene „${o.ebene}“ ist nicht zugeordnet – wird nicht berechnet`, "unzugeordnet", kurz); continue; }
    const verfahren = r === "plott" ? "plott" : "druck";
    // Konflikt Zuordnung ↔ Ebene/Farbe – nie still zuordnen
    const alsPlott = farben.istPlottSchluessel(folie), medium = alias[folie] || folie;
    if (verfahren === "druck" && alsPlott) { warn(`Konflikt: ${wo} ist als Plott markiert, liegt aber auf Ebene „${o.ebene}“ – wird nicht berechnet`, "konflikt", kurz); continue; }
    if (verfahren === "plott" && !alsPlott) {
      if (serie(medium, "druck") || ((MK.medien || {})[medium] && !plottSerien.has(medium))) warn(`Konflikt: ${wo} ist als Digitaldruck markiert, liegt aber auf Ebene „${o.ebene}“ – wird nicht berechnet`, "konflikt", kurz);
      else warn(`Konflikt: ${wo} hat eine ungültige Folie (${folie}) – wird nicht berechnet`, "konflikt", kurz);
      continue;
    }
    const anzahl = anzahlVon(tags.anzahl);
    if (anzahl === null) { fehler.push(`${wo}: Anzahl „${tags.anzahl}“ ungültig – ganze Zahl ≥ 1 erforderlich`); continue; }
    if (verfahren === "druck") {
      const voll = [];
      o.blaetter.forEach(b => (b.farben || []).forEach(f => { const c = farben.erkennen(f.spot || f.label); if (c && !voll.includes(c.schluessel)) voll.push(c.schluessel); }));
      if (voll.length) { warn(`Konflikt: ${wo} hat Digitaldruck-Tags und eine Oracal-Füllung (${voll.join(", ")}) – wird nicht berechnet`, "konflikt", kurz); continue; }
      const bekannt = !!(MK.medien || {})[medium] && !plottSerien.has(medium);
      if (!((preise && serie(medium, "druck")) || bekannt) || !laminateFuer(medium).includes(tags.laminat)) { warn(`Konflikt: ${wo} hat ungültiges Medium/Laminat (${medium}/${tags.laminat}) – wird nicht berechnet`, "konflikt", kurz); continue; }
      if (preise && !serie(medium, "druck")) { fehler.push(`Medium „${medium}“ hat keinen Preis (serie, verfahren druck) für „${A}“ und keinen für „alle“ (verwendet von ${wo})`); continue; }
    }
    const attr = attributeVon(tags.attribute);
    const unbekannt = attr.filter(x => !aufschlaege[x] && x !== "tape" && x !== "kein_tape");
    if (unbekannt.length) warn(`${wo}: unbekannte Attribute ${unbekannt.join(", ")} – ignoriert`, "attribut", kurz);
    const obj = {
      nr: objekte.length, id: tags.id || null, original: tags.original || null, ref: o.ref, illustratorName: o.name || "", ebene: o.ebene, verfahren, anzahl,
      folie, medium: verfahren === "druck" ? medium : null, laminat: verfahren === "druck" ? tags.laminat : null, cut: !!o.cut,
      attribute: attr.filter(x => aufschlaege[x]), tape: { vorschlag: false, gesetzt: false }, teile: [], flaeche_je_folie: {}, teile_je_folie: {},
      form: o.form || null
    };

    if (verfahren === "plott") {
      const jeFolie = {};
      let kontur = false, farbFehler = false;
      for (const b of o.blaetter) {
        if (b.kontur) kontur = true;
        if (b.bild) warn(`${wo} enthält ein Bild – wird nicht geplottet`, "bild", kurz);
        if (b.verlauf) warn(`${wo} enthält einen Verlauf/ein Muster – wird nicht geplottet`, "verlauf", kurz);
        if (b.sonstiges) warn(`${wo} enthält ein nicht auswertbares Objekt (${b.typ})`, "sonstige", kurz);
        for (const f of b.farben || []) {
          const c = farbeVon(f);
          if (!c) { fehler.push(`${wo}: Farbe „${f.label}“ gehört zu keiner bekannten Oracal-Serie`); farbFehler = true; continue; }
          if (preise && !serie(c.preisserie, "plott")) { fehler.push(`Serie „${c.preisserie}“ hat keinen Preis (verfahren plott) für „${A}“ und keinen für „alle“ (Farbe ${c.schluessel}, ${wo})`); farbFehler = true; continue; }
          (jeFolie[c.schluessel] = jeFolie[c.schluessel] || { farbe: c, blaetter: [] }).blaetter.push({ path: b.path, clips: b.clips, text: !!b.text, box: box(b.gb, k), gb: b.gb, laenge_pt: b.laenge_pt, teile: b.teile });
        }
      }
      if (kontur) warn(`${wo}: Kontur auf Plott-Objekt`, "kontur", kurz);
      if (farbFehler) continue;
      obj.messung = messen(o.blaetter, k);
      const fk = Object.keys(jeFolie).sort();
      obj.folien = fk;
      fk.forEach(key => {
        const b = jeFolie[key].blaetter.reduce((u, x) => union(u, x.box), null);
        obj.flaeche_je_folie[key] = fk.length === 1 ? obj.messung.flaeche_m2 : m2(b);
        obj.teile_je_folie[key] = fk.length === 1 ? obj.messung.teile : messen(jeFolie[key].blaetter, k).teile;
      });
      // mehrfarbig (≥ 2 Farbschlüssel, §10.1): je Farbe ein Block aus den Teilen der Farbe plus beiden Passermarken, Lage zueinander fest, nie geteilt;
      // die Marken zählen nicht zu Teilen, Schnittlänge und Fläche
      const mitBox = fk.filter(key => jeFolie[key].blaetter.some(b => b.box));
      const pm = mitBox.length >= 2 ? PM.planen(Object.fromEntries(mitBox.map(key => [key, jeFolie[key].blaetter.filter(b => b.box).map(b => b.box)])), MK.passermarken) : null;
      const absolut = b => ({ x0: r2(b.x0 + pm.umriss.x0), y0: r2(b.y0 + pm.umriss.y0), x1: r2(b.x1 + pm.umriss.x0), y1: r2(b.y1 + pm.umriss.y0) });
      for (const key of fk) {
        const bl = jeFolie[key].blaetter.filter(b => b.box);
        if (!bl.length) continue;
        const gesamt = bl.reduce((u, b) => union(u, b.box), null);
        const block = pm ? absolut(pm.bloecke[key]) : null;
        let stuecke = [{ blaetter: bl, box: block || gesamt }];
        const w = breite(stuecke[0].box), h = hoehe(stuecke[0].box), mm = v => Math.round(v) + " mm";
        const maxQuer = maxQuerFuer(jeFolie[key].farbe.preisserie);
        if (maxQuer === null) continue;
        if (block && Math.min(w, h) > maxQuer + TOL) {
          fehler.push(`${wo} (${key}): Block mit Passermarken ${mm(w)} × ${mm(h)} passt in keiner Lage in ${maxQuer} mm Höhe`);
          continue;
        } else if (Math.min(w, h) > maxQuer + TOL) {
          const geteilt = anLueckenTeilen(bl, maxQuer, maxLang);
          if (!geteilt) { fehler.push(`${wo} (${key}): ${mm(w)} × ${mm(h)} passt in keiner Lage in ${maxQuer} mm Höhe und lässt sich nicht an Lücken teilen`); continue; }
          stuecke = geteilt;
          warn(`${wo} (${key}): ${mm(w)} × ${mm(h)} wurde an Lücken in ${geteilt.length} Teile geteilt`, "geteilt", `${kurz} (${geteilt.length} Teile)`);
        } else if (Math.max(w, h) > maxLang + TOL) {
          fehler.push(`${wo} (${key}): ${mm(Math.max(w, h))} lang – länger als ${maxLang} mm (Zeichenfläche ${aa.nesting.max_breite_mm} mm minus Rand)`);
          continue;
        }
        // je Farbschlüssel genestet (970G-010 und 970M-010 getrennt), Preis je Serie
        const c = jeFolie[key].farbe;
        const g = gruppe("plott|" + c.schluessel, { verfahren, schluessel: c.schluessel, serie: c.preisserie, laminat: null, farbfeld: c.name });
        stuecke.forEach((st, i) => teilNeu(g, obj, Object.assign({
          stueck: stuecke.length > 1 ? `${i + 1}/${stuecke.length}` : "", b_mm: r2(breite(st.box)), h_mm: r2(hoehe(st.box)), box: st.box,
          blaetter: st.blaetter.map(b => ({ path: b.path, clips: b.clips }))
        }, block ? { boxTeile: gesamt, ohneMarken: { b_mm: r2(breite(gesamt)), h_mm: r2(hoehe(gesamt)) }, marken: pm.marken.map(absolut), kante_mm: pm.kante } : {})));
      }
    } else {
      // Außenkante = sichtbare Begrenzung des ganzen Objekts (Motiv inkl. Anschnitt, vereinigt mit einer vorhandenen Cutkontur; durch Schnittmasken
      // beschnitten). Die Cutkontur ist keine Pflicht.
      const cuts = o.blaetter.filter(b => b.cut && b.gb);
      const cutBox = cuts.length ? cuts.reduce((u, b) => union(u, box(b.gb, k)), null) : null;
      const objBox = o.blaetter.filter(b => b.vb).reduce((u, b) => union(u, box(b.vb, k)), cutBox);
      if (!objBox) { warn(`${wo} enthält ein nicht auswertbares Objekt (${o.typ})`, "sonstige", kurz); continue; }
      // Nesting-Maß [R 3.7]: mit Cutkontur Außenkante ∪ (Cutkontur + Beschnitt), ohne Außenkante + Reserve + Beschnitt
      const teilBox = cutBox ? union(objBox, um(cutBox, beschnitt)) : um(objBox, reserve + beschnitt);
      const w = r2(breite(teilBox)), h = r2(hoehe(teilBox));
      const breiten = R.breiten(MK, medium);
      if (!breiten.length) { breiteFehlt(medium); continue; }
      const passt = breiten.some(b => { const q = R.grafikMaxQuer(MK, b); return Math.min(w <= q + TOL ? h : Infinity, h <= q + TOL ? w : Infinity) <= druckLangS + TOL; });
      if (!passt) {
        const q = Math.round(R.grafikMaxQuer(MK, Math.max(...breiten)) * 1000) / 1000;
        fehler.push(`${wo}: ${Math.round(w)} × ${Math.round(h)} mm passt nicht auf das Medium (bedruckbar höchstens ${dez(q)} mm breit, ${dez(druckLangS)} mm lang)`);
        continue;
      }
      // Messung an der Cutkontur, sonst am Motivumriss (1 Teil); Fläche des Stücks = Außenkante
      const cm = cuts.length ? messen(cuts, k) : messen([{ gb: o.umriss ? o.umriss.gb : null, laenge_pt: o.umriss ? o.umriss.laenge_pt : 0, teile: 1 }], k);
      obj.messung = { teile: cm.teile, schnitt_m: cm.schnitt_m, flaeche_m2: m2(objBox), schnittdichte: cm.schnittdichte, teiledichte: cm.teiledichte };
      obj.folien = [medium];
      obj.flaeche_je_folie[medium] = obj.messung.flaeche_m2;
      obj.teile_je_folie[medium] = cm.teile;
      // Tape-Vorschlag [R 1.9]: Dichten bezogen auf die Begrenzung der Messung; in IP_Attribute „kein_tape“ = aus (schlägt den Vorschlag),
      // „tape“ = an, sonst gilt der Vorschlag [§3.1]
      const grenze = n => { const v = pq.parameter(n); return v === null ? Infinity : v; }; // ohne Parameter (Preisliste fehlerhaft, Schild) kein Vorschlag
      const vorschlag = cm.schnittdichte >= grenze("tape.min_schnittdichte") || cm.teiledichte >= grenze("tape.min_teiledichte");
      obj.tape = { vorschlag, gesetzt: attr.includes("kein_tape") ? false : attr.includes("tape") || vorschlag };
      if (preise && obj.tape.gesetzt && serie(medium, "druck").tape_vk_m2 === null) fehler.push(`${wo}: Tape gesetzt, aber Serie „${medium}“ hat keinen tape_vk_m2`);
      // ein Teil je Objekt (Nesting-Maß), keine Teilung; b_mm = längs (vertikal im Dokument), h_mm = quer (horizontal)
      const g = gruppe(`druck|${medium}|${tags.laminat}`, { verfahren, schluessel: medium, serie: medium, laminat: tags.laminat });
      teilNeu(g, obj, { b_mm: r2(hoehe(teilBox)), h_mm: r2(breite(teilBox)), box: teilBox, objBox, cutBox,
        blaetter: o.blaetter.map(b => ({ path: b.path, clips: b.clips, cut: !!b.cut })) });
    }
    // Komplexität (manuell, Tag IP_Komplexitaet 0–3): Plott immer, Druck nur mit Cutkontur [R 1.8]; sonst Stufe 0
    const st0 = stufen[0] || { stufe: 0, prozent: 0 };
    let kst = st0;
    if (verfahren === "plott" || obj.cut) {
      const t = tags.komplexitaet;
      if (t !== null && t !== undefined && String(t).trim() !== "") {
        kst = stufen.find(s => String(s.stufe) === String(t).trim()) || null;
        if (!kst) { warn(`${wo}: unbekannte Komplexitätsstufe „${t}“ – K${st0.stufe} verwendet`, "komplexitaet", kurz); kst = st0; }
      }
    }
    obj.komplexitaet = { stufe: kst.stufe, prozent: kst.prozent };
    objekte.push(obj);
  }
  // Anzeigename [A-1]: Illustrator-Name, ohne Namen „Objekt“ + laufende Nummer in Ebenenreihenfolge (nur Anzeige, nicht gespeichert)
  objekte.forEach((o, i) => { o.name = o.illustratorName || `Objekt ${i + 1}`; });
  return { objekte, gruppen, teile, details, fehler, ohneZuordnung, massstab };
}

/**
 * Textil (SPEZ_03_Textil §9.1): Motive = oberste Objekte der Ebene mit Rolle textil („Design“) mit IP_Position. DTF/Stick je Druckgröße ohne Messung
 * (kalkuliert false, für Datensatz und Zusammenfassung); Flex/Flock gemessen, je Druckgröße ein Stück mit Teilen je Farbschlüssel.
 * @param daten  IP.objekteLesen (messen: true)
 * @param kx     { aa, pq (geladen oder null: Summa bei fehlerhafter Preisliste ohne Serienprüfung), xmp, medien (passermarken), streifen (textil.json),
 *                 berechnen (zusätzlich Serie ohne Preis) }
 * @returns wie aufbauen, objekte je Motiv und Druckgröße; gruppen „textil|<Farbschlüssel>“ mit serie, farbe, datei
 */
function aufbauenTextil(daten, kx) {
  const { aa, pq, medien, streifen: sc } = kx;
  const details = [], fehler = [];
  const warn = (text, typ, objekt) => { if (!details.some(d => d.text === text)) details.push({ typ: typ || "sonstige", objekt: objekt || "", text }); };
  const rolleVon = {};
  aa.ebenen.forEach(e => { rolleVon[e.name] = e.rolle; });
  const B = sc.daten_breite_max_mm, L = sc.laenge_max_mm - 2 * sc.rand_mm;
  const stufenK = pq ? pq.komplexitaet() : [];
  const gruppen = {}, teile = [], objekte = [];
  let tid = 0, ohneZuordnung = 0, motivNr = 0;
  const gruppe = (key, init) => (gruppen[key] = gruppen[key] || Object.assign({ key, teile: [] }, init));
  const mm = v => Math.round(v) + " mm";

  for (const o of daten.objekte) {
    if ((rolleVon[o.ebene] || o.rolle) !== "textil") continue;
    const tags = o.tags || {}, wo0 = o.name ? `„${o.name}“` : `unbenanntes Objekt (${o.typ})`;
    if (!tags.position) { ohneZuordnung++; warn(`${wo0} auf Ebene „${o.ebene}“ ist nicht zugeordnet – wird nicht berechnet`, "unzugeordnet", o.name || wo0); continue; }
    motivNr++;
    const name = o.name || `Objekt ${motivNr}`, wo = `„${name}“`, v = tags.verfahren;
    if (!TX.VERFAHREN.includes(v)) { warn(`${wo}: Verfahren „${v || ""}“ unbekannt – wird nicht berechnet`, "konflikt", name); continue; }
    const st = TX.stufenVon(tags);
    if (!st.length) { fehler.push(`${wo}: keine Druckgröße`); continue; }
    let stufenOk = true;
    st.forEach((s, i) => {
      if (!(Number(s.mass_mm) > 0)) { fehler.push(`${wo}, Druckgröße ${i + 1}: Maß fehlt`); stufenOk = false; }
      if (!(Number.isInteger(Number(s.menge)) && Number(s.menge) > 0)) { fehler.push(`${wo}, Druckgröße ${i + 1}: Menge fehlt`); stufenOk = false; }
    });
    if (!stufenOk) continue;
    const basis = { id: tags.id || null, original: tags.original || null, ref: o.ref, illustratorName: o.name || "", name, ebene: o.ebene, verfahren: v,
      position: tags.position, kalkuliert: TX.istGeschnitten(v), teile: [], folien: [], flaeche_je_folie: {}, teile_je_folie: {}, farben: {}, serie: null };
    const dg = (s, i) => ({ nr: i + 1, mass_mm: Number(s.mass_mm), bezug: s.bezug === "Höhe" ? "Höhe" : "Breite", groessen: s.groessen || "", blockout: !!s.blockout, zeigen: !!s.zeigen });
    if (!TX.istGeschnitten(v)) {
      st.forEach((s, i) => objekte.push(Object.assign({}, basis, { nr: objekte.length, druckgroesse: dg(s, i), anzahl: Number(s.menge), messung: null, komplexitaet: null })));
      continue;
    }
    // Serie aus IP_Folie: muss in der Preisliste mit verfahren flex bzw. flock stehen; bei berechnen mit Preis
    const serie = tags.folie || "", vk = v.toLowerCase(), se = pq ? pq.serie(serie) : null;
    if (pq && (!se || se.verfahren !== vk)) { fehler.push(`${wo}: Serie „${serie}“ steht nicht in der Preisliste (verfahren ${vk})`); continue; }
    if (kx.berechnen && (se.ek_m2 === null || se.vk_m2 === null)) {
      const t = `Serie „${serie}“ hat keinen Preis (ek_m2, vk_m2) für „${aa.preis}“`;
      if (!fehler.includes(t)) fehler.push(t);
      continue;
    }
    // Füllfarben -> Farbschlüssel <Serie>-<Flexfarbe> über IP_Farbe (colorKey exakt)
    const fz = TX.farbenVon(tags), jeFarbe = {};
    let kontur = false, ohneFlex = false;
    for (const b of o.blaetter || []) {
      if (b.kontur) kontur = true;
      if (b.bild) warn(`${wo} enthält ein Bild – wird nicht geplottet`, "bild", name);
      if (b.verlauf) warn(`${wo} enthält einen Verlauf/ein Muster – wird nicht geplottet`, "verlauf", name);
      for (const f of b.farben || []) {
        const ff = Object.prototype.hasOwnProperty.call(fz, f.key) ? String(fz[f.key] || "").trim() : "";
        if (!ff) { ohneFlex = true; continue; }
        const key = TX.farbschluessel(serie, ff);
        (jeFarbe[key] = jeFarbe[key] || { farbe: ff, keys: new Set(), blaetter: [] });
        jeFarbe[key].keys.add(f.key);
        if (!jeFarbe[key].blaetter.includes(b)) jeFarbe[key].blaetter.push(b);
      }
    }
    if (kontur) warn(`${wo}: Kontur auf Flex-/Flock-Motiv`, "kontur_textil", name);
    if (ohneFlex) { fehler.push(`${wo}: Füllfarbe ohne Flexfarbe`); continue; }
    const fk = Object.keys(jeFarbe).sort();
    if (!fk.length) { warn(`${wo} enthält keine Füllfarbe – wird nicht berechnet`, "sonstige", name); continue; }
    // Faktor des Modells (XMP textil.modell.faktor); ohne Realmaß Ersatzweg über das Ist-Maß des Motivs im Dokument (sichtbare Grenzen, mm)
    const mf = kx.xmp && kx.xmp.textil && kx.xmp.textil.modell ? kx.xmp.textil.modell.faktor : null, zeigen = Number((st.find(x => x.zeigen) || st[0]).mass_mm);
    const vb = o.vb || o.gb, w0 = (vb[2] - vb[0]) * PT_MM, h0 = (vb[1] - vb[3]) * PT_MM;
    if (!(w0 > 0 && h0 > 0)) { warn(`${wo} enthält ein nicht auswertbares Objekt (${o.typ})`, "sonstige", name); continue; }
    const faktorVon = d => (mf > 0 ? d.mass_mm / zeigen * mf : d.mass_mm / (d.bezug === "Höhe" ? h0 : w0));
    const m0 = messen(o.blaetter, PT_MM);
    const fl0 = {}, tl0 = {};
    fk.forEach(key => {
      const bl = jeFarbe[key].blaetter, bx = bl.reduce((u, b) => union(u, box(b.gb, PT_MM)), null);
      fl0[key] = fk.length === 1 ? m0.flaeche_m2 : m2(bx);
      tl0[key] = fk.length === 1 ? m0.teile : messen(bl, PT_MM).teile;
    });
    // Komplexität (IP_Komplexitaet, ohne Tag K0) aus der Preisliste; ohne Preisliste (Summa) ohne Prozent
    const kTag = String(tags.komplexitaet === null || tags.komplexitaet === undefined ? "" : tags.komplexitaet).trim() || "0";
    let kst = stufenK.find(x => String(x.stufe) === kTag);
    if (!kst && pq) warn(`${wo}: unbekannte Komplexitätsstufe „${kTag}“ – K${(stufenK[0] || { stufe: 0 }).stufe} verwendet`, "komplexitaet", name);
    kst = kst || (pq ? stufenK[0] : null) || { stufe: Number(kTag) || 0, prozent: 0 };
    const farben = {};
    fk.forEach(key => jeFarbe[key].keys.forEach(c => { farben[c] = jeFarbe[key].farbe; }));
    let versatz = 0;
    st.forEach((s, i) => {
      const d = dg(s, i), menge = Number(s.menge), f = faktorVon(d), kk = PT_MM * f;
      const obj = Object.assign({}, basis, { nr: objekte.length, druckgroesse: d, anzahl: menge, serie, farben, skala: f, teile: [], folien: fk.slice(), flaeche_je_folie: {}, teile_je_folie: {},
        komplexitaet: { stufe: kst.stufe, prozent: kst.prozent }, messung: { teile: m0.teile, schnitt_m: m0.schnitt_m * f, flaeche_m2: m0.flaeche_m2 * f * f } });
      fk.forEach(key => { obj.flaeche_je_folie[key] = fl0[key] * f * f; obj.teile_je_folie[key] = tl0[key]; });
      // Exemplar (einfarbig) bzw. Block je Farbe mit Passermarken (mehrfarbig, Markengröße aus dem Umriss im Realmaß der Druckgröße)
      const boxen = {};
      fk.forEach(key => { boxen[key] = jeFarbe[key].blaetter.filter(b => b.gb).map(b => box(b.gb, kk)); });
      const pm = fk.length >= 2 ? PM.planen(boxen, medien.passermarken) : null;
      const absolut = b => ({ x0: r2(b.x0 + pm.umriss.x0), y0: r2(b.y0 + pm.umriss.y0), x1: r2(b.x1 + pm.umriss.x0), y1: r2(b.y1 + pm.umriss.y0) });
      let passt = true;
      fk.forEach(key => {
        const gesamt = boxen[key].reduce((u, b) => union(u, b), null), bx = pm ? absolut(pm.bloecke[key]) : gesamt;
        const w = r2(breite(bx)), h = r2(hoehe(bx));
        if (!((w <= B + TOL && h <= L + TOL) || (h <= B + TOL && w <= L + TOL))) {
          fehler.push(`${wo}, Druckgröße ${d.nr}${pm ? ` (${key}): Block mit Passermarken` : ":"} ${mm(w)} × ${mm(h)} passt in keiner Lage in ${B} × ${L} mm`);
          passt = false; return;
        }
        const g = gruppe("textil|" + key, { verfahren: "textil", schluessel: key, serie, farbe: jeFarbe[key].farbe, laminat: null, farbfeld: null, datei: A.dateiname(key) });
        const t = Object.assign({ id: "T" + String(++tid).padStart(4, "0"), gruppe: g.key, objekt: obj.nr, anzahl: menge, stueck: "", versatz, skala: f,
          b_mm: w, h_mm: h, box: bx, blaetter: jeFarbe[key].blaetter.map(b => ({ path: b.path, clips: b.clips })) },
          pm ? { boxTeile: gesamt, ohneMarken: { b_mm: r2(breite(gesamt)), h_mm: r2(hoehe(gesamt)) }, marken: pm.marken.map(absolut), kante_mm: pm.kante } : {});
        teile.push(t); g.teile.push(t); obj.teile.push(t.id);
      });
      versatz += menge;
      if (passt) objekte.push(obj);
    });
  }
  return { objekte, gruppen, teile, details, fehler, ohneZuordnung, massstab: 1, textil: true };
}

module.exports = { aufbauen, aufbauenTextil, messen, anLueckenTeilen, variantenErkennen, neueId, hinweisZeilen, anzahlVon, SAMMEL, PT_MM };
