/* Plott-Schneidedaten „Summa“ (SPEZ_02 §10), aus dem alten Projekt (auftrag.js schneidedaten) übernommen: Bögen aus dem Nesting je Farbschlüssel,
 * Dateinamen <Kunde>_<Serie>-<Farbe>_cut_NN.pdf (NN = Bogen), je Exemplar eine Gruppe „<Anzeigename> <k>“, bei Blöcken mit beiden Passermarken.
 * Textil-Streifen Flex/Flock (SPEZ_03_Textil §9.2): Gruppen „textil“, Serie und Farbe im Dateinamen umgeschrieben wie der Kundenname (g.datei), k zählt
 * über alle Druckgrößen eines Motivs (t.versatz), je Exemplar der Faktor Dokument -> Realmaß (t.skala).
 * Erzeugen und Speichern macht der JSX-Kern (IP.schneidebogenSpeichern), Ablage und Transfer der Exportkern (ersetzen: true). */
"use strict";
const fs = require("fs");
const A = require("./ablage");

const nn = i => String(i).padStart(2, "0");
const dateiStamm = (kunde, schluessel) => `${A.dateiname(kunde)}_${schluessel}_cut_`;

/**
 * @param analyse  teile.aufbauen (ohne Fehler)
 * @param nest     kalkulation.nestingAlle(…, "plott")
 * @returns [{ name, schluessel, farbfeld, breite_mm, hoehe_mm, teile: [{ name, ref, blaetter, x_mm, y_mm, gedreht, marken, skala, soll }] }]
 */
function boegen(analyse, nest, kunde) {
  const out = [];
  for (const key of Object.keys(nest).sort()) {
    const g = analyse.gruppen[key];
    if (!g || (g.verfahren !== "plott" && g.verfahren !== "textil")) continue;
    const teil = {}, schluessel = g.datei || g.schluessel;
    g.teile.forEach(t => { teil[t.id] = t; });
    nest[key].n.bogen.forEach((b, i) => out.push({
      name: `${dateiStamm(kunde, schluessel)}${nn(i + 1)}.pdf`, schluessel, farbfeld: g.farbfeld, breite_mm: b.breite_mm, hoehe_mm: b.hoehe_mm,
      teile: b.teile.map(p => {
        const t = teil[p.id], o = analyse.objekte[t.objekt];
        return { name: `${o.name} ${p.exemplar + (t.versatz || 0)}${t.stueck ? " " + t.stueck : ""}`, ref: o.ref, blaetter: t.blaetter, x_mm: p.x_mm, y_mm: p.y_mm, gedreht: p.gedreht,
          marken: t.marken || null, skala: t.skala || null, soll: { x_mm: p.x_mm, y_mm: p.y_mm, b_mm: p.b_mm, h_mm: p.h_mm } };
      })
    }));
  }
  return out;
}

/** Ist-Lage gegen Planung (Hinweis ab 0,1 mm); ist: Rückgabe von IP.schneidebogenSpeichern in Planungsreihenfolge */
function lagePruefen(bogen, ist) {
  const h = [];
  (ist || []).forEach((x, j) => {
    const s = bogen.teile[j] && bogen.teile[j].soll;
    if (!s) return;
    const d = Math.max(Math.abs(x.x_mm - s.x_mm), Math.abs(x.y_mm - s.y_mm), Math.abs(x.b_mm - s.b_mm), Math.abs(x.h_mm - s.h_mm));
    if (d >= 0.1) h.push(`${bogen.name}: „${x.name}“ weicht ${d.toFixed(2)} mm von der Planung ab`);
  });
  return h;
}

/** ältere Bögen mit höherer Nummer im Ordner (bleiben liegen, werden genannt) */
function aeltere(ordner, kunde, liste) {
  const zahl = {};
  liste.forEach(b => { zahl[b.schluessel] = (zahl[b.schluessel] || 0) + 1; });
  let namen = [];
  try { namen = fs.readdirSync(ordner); } catch (e) { return []; }
  const r = [];
  for (const [schluessel, n] of Object.entries(zahl)) {
    const stamm = dateiStamm(kunde, schluessel);
    namen.filter(f => f.startsWith(stamm)).forEach(f => { const m = /^(\d+)\.pdf$/.exec(f.slice(stamm.length)); if (m && Number(m[1]) > n) r.push(f); });
  }
  return r.sort();
}

module.exports = { boegen, lagePruefen, aeltere };
