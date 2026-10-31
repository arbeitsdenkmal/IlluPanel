/* Druckbögen (SPEZ_02 §11.1, §11.2), aus dem alten Projekt (auftrag.js druckdatenAufbauen/druckdatenSpeichern) übernommen.
 * Aufbau: je Medium + Laminat + Rolle die Bögen aus dem Nesting (dieselbe Rollenwahl wie die Kalkulation), Nummer und „n von m“ je Gruppe; je IP_Id ein
 * Symbol (Name = Anzeigename, bei Doppelung „ (2)“), geometrisch gleiche Varianten als Instanz des Original-Symbols (herkunft.js); je Exemplar eine Instanz
 * „<Name> <k>“ mit IP_Herkunft. Export: Dateinamen <Kunde>_<Medium>-<Laminat>-<Breite>_<NN>_druck.pdf, …_cut.pdf, …_<NN>.ai (ersetzen: true).
 * Dokumente bauen, umwandeln, Marken zeichnen und speichern macht der JSX-Kern. */
"use strict";
const fs = require("fs");
const A = require("./ablage");
const D = require("./dokument");
const H = require("./herkunft");
const R = require("./rollen");
const T = require("./teile");

const TOL_FORM_MM = 0.1; // Geometrievergleich der Varianten: größte Restabweichung im Realmaß (wie im alten Projekt)
const nn = i => String(i).padStart(2, "0");

/** Lage der Objekt-Außenkante im Bogen (mm), wenn das Teil größer ist (Teil = Außenkante ∪ Cutkontur + Beschnitt bzw. + Reserve).
 *  Bogen: x quer, y längs; unverdreht x = Dokument-x, y = Dokument-y; gedreht (−90°, im Uhrzeigersinn): x = −Dokument-y, y = Dokument-x. */
function objektLage(t, p) {
  const B = t.box, O = t.objBox || t.box;
  if (!p.gedreht) return { obj_x_mm: p.x_mm + (O.x0 - B.x0), obj_y_mm: p.y_mm + (O.y0 - B.y0), obj_w_mm: O.x1 - O.x0, obj_h_mm: O.y1 - O.y0 };
  return { obj_x_mm: p.x_mm + (B.y1 - O.y1), obj_y_mm: p.y_mm + (O.x0 - B.x0), obj_w_mm: O.y1 - O.y0, obj_h_mm: O.x1 - O.x0 };
}

/** Schlüssel eines Stücks: IP_Id, ohne Id die laufende Nummer */
const sid = o => o.id || `#${o.nr}`;
/** eindeutige Namen je IP_Id: Anzeigename, bei Doppelung „ (2)“, „ (3)“ … in Ebenenreihenfolge */
function eindeutigeNamen(objekte) {
  const n = {}, out = {};
  objekte.forEach(o => {
    let name = o.name, k = 1;
    while (n[name]) name = `${o.name} (${++k})`;
    n[name] = true; out[sid(o)] = name;
  });
  return out;
}

const bezeichnung = (aa, laminat) => ((aa.laminate || []).find(l => l.schluessel === laminat) || {}).bezeichnung || laminat;

/**
 * Aufbau planen.
 * @param analyse  teile.aufbauen (ohne Fehler); nest: kalkulation.nestingAlle(…, "druck")
 * @param kx       { aa, medien, xmp (Arbeitsdatei), arbeitsdatei (Pfad), jetzt }
 * @returns { aufbau: { id, zeit, boegen: [{ medium, laminat, breite_mm, nr }] }, boegen: [{ medium, laminat, nr, gesamt, breite_mm, jsx (Spec für
 *            IP.druckbogenAufbauen) }] }
 */
function aufbauPlanen(analyse, nest, kx) {
  const { aa, medien, xmp } = kx, jetzt = kx.jetzt || new Date();
  const id = String(jetzt.getTime()), zeit = jetzt.toISOString().replace(/\.\d{3}Z$/, "Z");
  const druck = analyse.objekte.filter(o => o.verfahren === "druck");
  const namen = eindeutigeNamen(druck);
  const tol = TOL_FORM_MM / (T.PT_MM * analyse.massstab);
  const symbole = H.symboleEinteilen(druck.map(o => ({ id: sid(o), original: o.original, name: namen[sid(o)], ref: o.ref, form: o.form })), tol);
  const teilVon = {}, cutsVon = {};
  for (const g of Object.values(analyse.gruppen)) g.teile.forEach(t => {
    teilVon[t.id] = t;
    if (g.verfahren === "druck") cutsVon[sid(analyse.objekte[t.objekt])] = t.blaetter.filter(b => b.cut).length;
  });
  const DW = R.druck(medien), einheit = M => M.every((v, i) => Math.abs(v - H.EINHEIT.M[i]) < 1e-9);
  const aufbau = { id, zeit, boegen: [] }, boegen = [];
  for (const key of Object.keys(nest).sort()) {
    const g = analyse.gruppen[key];
    if (!g || g.verfahren !== "druck") continue;
    const ne = nest[key], gesamt = ne.n.bogen.length, breite = ne.rollenbreite_mm;
    ne.n.bogen.forEach((b, i) => {
      const nr = i + 1;
      const bx = D.neu({ auftragsart: xmp.auftragsart, massstab: 1, kunde: xmp.kunde, auftragsordner: xmp.ablage.auftragsordner, rolle: "druckbogen", jetzt });
      bx.auftrag = JSON.parse(JSON.stringify(xmp.auftrag || bx.auftrag));
      bx.ablage = JSON.parse(JSON.stringify(xmp.ablage));
      bx.bogen = { aufbau: id, medium: g.schluessel, laminat: g.laminat, breite_mm: breite, nr, gesamt, arbeitsdatei: kx.arbeitsdatei };
      const teile = b.teile.map(p => {
        const t = teilVon[p.id], o = analyse.objekte[t.objekt], sy = symbole[sid(o)];
        return Object.assign({ name: `${namen[sid(o)]} ${p.exemplar}`, herkunft: o.id,
          symbol: { name: sy.symbol, ref: sy.bezugRef, cuts: cutsVon[sy.bezugId] || 0 }, M: einheit(sy.M) ? null : sy.M,
          x_mm: p.x_mm, y_mm: p.y_mm, b_mm: p.b_mm, h_mm: p.h_mm, gedreht: p.gedreht }, objektLage(t, p));
      });
      aufbau.boegen.push({ medium: g.schluessel, laminat: g.laminat, breite_mm: breite, nr });
      boegen.push({ medium: g.schluessel, laminat: g.laminat, nr, gesamt, breite_mm: breite, jsx: {
        massstab: analyse.massstab, xmp: D.serialisieren(bx), cut: { name: aa.druck.cut_farbfeld, cmyk: aa.druck.cut_cmyk },
        rand_mm: DW.rand_mm, abstand_mm: aa.druck.abstand_mm, breite_mm: b.breite_mm, laenge_mm: b.laenge_mm, laenge_m: Math.round(b.laenge_mm) / 1000,
        info: ["=== DRUCKBOGEN ===", "Kunde:     " + xmp.kunde, "Medium:    " + g.schluessel, "Laminat:   " + bezeichnung(aa, g.laminat),
          "Bogen:     " + nr + " von " + gesamt + (b.sonder ? "  (Sonderlänge)" : ""), "Rolle:     " + Math.round(breite) + " mm",
          "Format:    " + Math.round(b.breite_mm) + " × " + (Math.round(b.laenge_mm * 10) / 10) + " mm (inkl. OPOS-Rand)"],
        teile } });
    });
  }
  return { aufbau, boegen };
}

/** Kennung eines Bogens für den JSX-Kern (bogenDok) aus seinem bogen-Feld */
const ziel = b => ({ aufbau: b.aufbau, medium: b.medium, laminat: b.laminat, nr: b.nr });
const stamm = (kunde, b) => `${A.dateiname(kunde)}_${A.dateiname(b.medium)}-${A.dateiname(b.laminat)}-${b.breite_mm}_`;

/** Dateien eines Bogens: druck, cut, ai (in dieser Reihenfolge; nach der .ai schließt der JSX-Kern den Bogen) */
function dateien(kunde, b) {
  const s = stamm(kunde, b) + nn(Number(b.nr));
  return [{ art: "druck", name: `${s}_druck.pdf` }, { art: "cut", name: `${s}_cut.pdf` }, { art: "ai", name: `${s}.ai` }];
}

/** ältere Bögen mit höherer Nummer im Ordner (bleiben liegen, werden genannt); liste: bogen-Felder des Aufbaus */
function aeltere(ordner, kunde, liste) {
  const zahl = {};
  liste.forEach(b => { const s = stamm(kunde, b); zahl[s] = Math.max(zahl[s] || 0, Number(b.gesamt) || 0); });
  let namen = [];
  try { namen = fs.readdirSync(ordner); } catch (e) { return []; }
  const r = [];
  for (const [s, n] of Object.entries(zahl)) {
    namen.filter(f => f.startsWith(s)).forEach(f => { const m = /^(\d+)(_druck\.pdf|_cut\.pdf|\.ai)$/.exec(f.slice(s.length)); if (m && Number(m[1]) > n) r.push(f); });
  }
  return r.sort();
}

module.exports = { objektLage, eindeutigeNamen, aufbauPlanen, ziel, dateien, aeltere, TOL_FORM_MM };
