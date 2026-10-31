/* Nutzen-Bögen (SPEZ_03_Nutzen §2.2–§2.5, §4, §5.5, §6.4, §6.5, §7.3, §7.4): gemeinsamer Teil von Nutzen, Gitterscheiben und MB-Nummern auf dem Druckbogen-Kern.
 * Umrechnung Planer -> Kernformat (je Bogen { breite_mm, laenge_mm, teile: [{ x_mm, y_mm, b_mm, h_mm, gedreht }] } mit OPOS-Rand, linke obere Cutkante),
 * Bogen-XMP (rolle druckbogen, bogen.art nutzen | gitter | mb), Info-Zeilen, JSX-Spec für IP.druckbogenAufbauen (wie druckbogen.aufbauPlanen),
 * Dateinamen (Nutzen mit Produkt, Bögl-Funktionen „Nutzen NN“), Auftragsordner und Bögl-Ordnerregel („ 2“, „ 3“ …). Dokumente baut der JSX-Kern. */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require("./ablage");
const D = require("./dokument");
const R = require("./rollen");
const DB = require("./druckbogen");
const N = require("./nutzen");
const G = require("./gitter");
const M = require("./mbnummern");

const nn = i => String(i).padStart(2, "0");
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const SEP_BOEGL = "--------------------------------------";
const ERSTELLT_BOEGL = "Erstellt:       ";
const VERKLEINERT = "@@VERKLEINERT@@"; // Platzhalter: der JSX-Kern setzt dort die Verkleinerungen des Streifen-Aufbaus ein (Gitter)

/** Maße aus der Konfiguration: OPOS-Rand gesamt und je Seite, Kantenhalter, Längengrenze, Standardbreite (Rolle) eines Mediums */
function masse(konf, medium) {
  const dw = R.druck(konf.medien), aa = konf.arten.beschriftung;
  return { rand: dw.zuschlag_mm, randSeite: dw.rand_mm, kantenhalter: dw.kantenhalter_mm, max_laenge: aa.druck.max_laenge_mm,
    rolle: medium ? R.standardbreite(konf.medien, medium) : null };
}
const bezeichnung = (aa, laminat) => ((aa.laminate || []).find(l => l.schluessel === laminat) || {}).bezeichnung || laminat;

/** Auftragsordner Nutzen Einstieg B (§4.1): JJJJ-MM-TT_<Produkt>; Bögl (§6.5): JJJJ-MM_<ordner> */
const nutzenAuftragsordner = (jetzt, produkt) => A.auftragsordnerName(jetzt, produkt);
const boeglAuftragsordner = (jetzt, ordner) => `${A.datum(jetzt).slice(0, 7)}_${A.dateiname(ordner)}`;

/**
 * Bögl-Ordnerregel (§6.5): basis, dann „basis 2“, „basis 3“ … (Leerzeichen, Zahl ohne führende Null). Ein Ordner gehört zu diesem Aufbau, wenn ein
 * exporte[]-Eintrag eines Bogens des Aufbaus dorthin zeigt (eigene: Liste der Ordner „<Kundenordner>/<Auftragsordner>“); er wird dann wieder getroffen.
 */
function boeglOrdner(kundenPfad, kundenordner, basis, eigene) {
  for (let n = 1; n < 1000; n++) {
    const ao = n === 1 ? basis : `${basis} ${n}`;
    if (!fs.existsSync(path.join(kundenPfad, ao)) || (eigene || []).includes(`${kundenordner}/${ao}`)) return ao;
  }
  throw new Error(`Kein freier Auftragsordner für ${basis}`);
}

/** Lage der Objekt-Außenkante eines Exemplars (Cutkante + Anschnitt je Seite, nach der Drehung) */
function objektLage(t) {
  const a = t.anschnitt || { l: 0, t: 0, r: 0, b: 0 };
  return { obj_x_mm: t.x_mm - a.l, obj_y_mm: t.y_mm - a.t, obj_w_mm: t.b_mm + a.l + a.r, obj_h_mm: t.h_mm + a.t + a.b };
}

/**
 * Aufbau planen (wie druckbogen.aufbauPlanen). boegen: Kernformat je Bogen { breite_mm, laenge_mm, auflage, info, teile: [{ name, herkunft, symbol: { name,
 * quelle: "ref" | "auswahl" | "fertig", ref, fertig, cuts }, x_mm, y_mm, b_mm, h_mm, gedreht, drehung, anschnitt }] }.
 * kx: { art, aa, medien, kunde, produkt, medium, laminat, breite_mm (Rolle), auftrag, ablage { kundenordner, auftragsordner }, arbeitsdatei, massstab,
 *       abstand_mm, erstellt (Präfix der Zeile „Erstellt“), fertig (Bauauftrag des Kerns für Quelle fertig), jetzt }
 * -> { aufbau: { id, zeit, boegen: [{ art, produkt, medium, laminat, breite_mm, nr }] }, boegen: [{ nr, gesamt, bogen, jsx }] }
 */
function aufbauPlanen(boegen, kx) {
  const jetzt = kx.jetzt || new Date(), id = String(jetzt.getTime()), zeit = jetzt.toISOString().replace(/\.\d{3}Z$/, "Z");
  const aa = kx.aa, dw = R.druck(kx.medien), gesamt = boegen.length;
  const aufbau = { id, zeit, boegen: [] }, out = [];
  boegen.forEach((b, i) => {
    const nr = i + 1;
    const bx = D.neu({ auftragsart: "beschriftung", massstab: 1, kunde: kx.kunde, kundenordner: kx.ablage.kundenordner, auftragsordner: kx.ablage.auftragsordner,
      rolle: "druckbogen", jetzt });
    bx.auftrag = JSON.parse(JSON.stringify(kx.auftrag || bx.auftrag));
    bx.bogen = D.bogen({ aufbau: id, art: kx.art, produkt: kx.produkt || null, medium: kx.medium, laminat: kx.laminat, breite_mm: kx.breite_mm, nr, gesamt,
      auflage: b.auflage || 1, arbeitsdatei: kx.arbeitsdatei || null });
    const teile = b.teile.map(t => Object.assign({ name: t.name, herkunft: t.herkunft || null, symbol: t.symbol, M: null,
      x_mm: t.x_mm, y_mm: t.y_mm, b_mm: t.b_mm, h_mm: t.h_mm, gedreht: !!t.gedreht, drehung: t.drehung || null }, objektLage(t)));
    aufbau.boegen.push({ art: kx.art, produkt: kx.produkt || null, medium: kx.medium, laminat: kx.laminat, breite_mm: kx.breite_mm, nr });
    out.push({ nr, gesamt, bogen: bx.bogen, jsx: {
      massstab: kx.massstab || 1, xmp: D.serialisieren(bx), cut: { name: aa.druck.cut_farbfeld, cmyk: aa.druck.cut_cmyk },
      rand_mm: dw.rand_mm, abstand_mm: kx.abstand_mm, breite_mm: b.breite_mm, laenge_mm: b.laenge_mm, laenge_m: Math.round(b.laenge_mm) / 1000,
      info: b.info, erstellt: kx.erstellt, fertig: kx.fertig || null, teile } });
  });
  return { aufbau, boegen: out };
}

/**
 * Bögen im Kern aufbauen (§2.2 Nr. 3): je Bogen IP.druckbogenAufbauen, danach der erste nach vorn. Rückgabe { hinweise („Bogen n: …“), dokumente (Namen der
 * ungespeicherten Bögen), arbeitsdateiUnveraendert }
 */
async function aufbauen(host, plan) {
  const hinweise = [], dokumente = [];
  let unveraendert = true;
  for (const b of plan.boegen) {
    const r = await host("druckbogenAufbauen", b.jsx);
    dokumente.push(r.dokument);
    r.pruefung.forEach(x => hinweise.push(`Bogen ${b.nr}: ${x}`));
    if (!r.arbeitsdateiUnveraendert) unveraendert = false;
  }
  if (plan.boegen.length) await host("bogenAktivieren", DB.ziel(plan.boegen[0].bogen));
  return { hinweise, dokumente, arbeitsdateiUnveraendert: unveraendert };
}

// ---------- Nutzen (§5.4, §5.5) ----------
/**
 * Bögen eines Nutzen-Layouts im Kernformat. m: Messung im Realmaß { mW, mH, bleedMax, off0 }, sel: gewähltes Layout, pl: planen(), params, ms: masse(),
 * q: { quelle: "ref" | "auswahl", ref, herkunft, cuts, produkt, mk: { medium, laminat (Bezeichnung), rolle } }
 */
function nutzenBoegen(m, params, pl, sel, ms, q) {
  const a = sel.rotM ? N.rotOff(m.off0) : m.off0, rs = ms.randSeite, dbs = N.druckboegen(sel, pl.gB, params.cnt);
  let k = 0;
  return dbs.map((db, i) => ({
    breite_mm: db.nW + ms.rand + a.l + a.r, laenge_mm: db.nH + ms.rand + a.t + a.b, auflage: 1,
    info: N.infoZeilen(m, params, pl, sel, db, i + 1, dbs.length, q.mk),
    teile: db.positionen.map(([x, y]) => ({ name: `${q.produkt} ${++k}`, herkunft: q.herkunft || null,
      symbol: { name: q.produkt, quelle: q.quelle, ref: q.ref || null, cuts: q.cuts },
      x_mm: x + rs + a.l, y_mm: y + rs + a.t, b_mm: sel.effMW, h_mm: sel.effMH, gedreht: sel.rotM, anschnitt: a }))
  }));
}

// ---------- Gitterscheiben (§6.4) ----------
/** Info-Zeilen eines Gitter-Bogens (wie baueBogen im Skript, ohne „Schrift“; „Verkleinert“ setzt der Kern am Platzhalter ein) */
function gitterInfo(jobs, pl, v, bi, ms, vorlageName) {
  const bogen = v.boegen[bi], zaehl = jobs.map(() => 0);
  let etiketten = 0;
  bogen.baender.forEach(b => b.streifen.forEach(s => { const j = jobs.indexOf(s.job); zaehl[j]++; etiketten += jobs[j].daten.zeilen.length + ((jobs[j].typOben || jobs[j].typUnten) ? 1 : 0); }));
  const info = ["=== WEA-ETIKETTEN ===", "Bogen:          " + (bi + 1) + " von " + v.boegen.length, "", ">>> " + bogen.auflage + " x DRUCKEN <<<", "",
    "Nutzen:         " + r1(bogen.breite) + " x " + r1(bogen.hoehe) + " mm",
    "Zeichenfläche:  " + r1(bogen.breite + ms.rand) + " x " + r1(bogen.hoehe + ms.rand) + " mm",
    "Etiketten:      " + etiketten + " je Druck", SEP_BOEGL];
  jobs.forEach((j, ii) => {
    if (!zaehl[ii]) return;
    info.push("Datei:          " + j.datei.name,
      "  Typ:          „" + (j.typOben || "-") + "“ / „" + (j.typUnten || "-") + "“",
      "  Streifen:     " + j.daten.zeilen.length + " Etiketten, " + r1(j.laenge) + " mm lang",
      "  auf Bogen:    " + zaehl[ii] + " x  =  " + (zaehl[ii] * bogen.auflage) + " Stück");
  });
  info.push(SEP_BOEGL);
  bogen.baender.forEach((bd, i) => info.push("Band " + (i + 1) + ":         " + (bd.lage === "laengs" ? "längs" : "quer ") + "  " + bd.streifen.length + " Streifen, " + r1(pl.bandHoehe(bd)) + " mm hoch"));
  info.push(SEP_BOEGL,
    "Variante:       " + (v.typ === "einzel" ? "ein Bogen, " + v.drucke + " Drucke" : "Folge aus " + v.dokumente + " Bögen"),
    "Material ges.:  rund " + r2(v.bahn / 1000) + " m Bahn");
  if (v.zuviel > 0) info.push("Überproduktion: " + v.zuviel + " Streifen");
  info.push(SEP_BOEGL,
    "Teilung:        " + pl.teilungEtikett + " mm im Streifen, " + pl.teilungStreifen + " mm zwischen Streifen",
    "Bahnbreite:     " + r1(pl.nutzbreite) + " mm nutzbar",
    "Vorlage:        " + vorlageName, VERKLEINERT, SEP_BOEGL);
  return info;
}
/** Bögen einer Gitter-Variante im Kernformat: ein Symbol je Kundendatei (Quelle fertig = Index des Jobs), Instanz je Streifen-Platz, quer um 90° gedreht */
function gitterBoegen(jobs, pl, v, etW, ms, vorlageName) {
  return v.boegen.map((bogen, bi) => {
    const k = jobs.map(() => 0);
    return { breite_mm: bogen.breite + ms.rand, laenge_mm: bogen.hoehe + ms.rand, auflage: bogen.auflage, info: gitterInfo(jobs, pl, v, bi, ms, vorlageName),
      teile: G.plaetze(jobs, pl, bogen, etW).map(p => {
        const j = jobs[p.job], cuts = j.daten.zeilen.length + ((j.typOben || j.typUnten) ? 1 : 0);
        return { name: `${j.datei.name} ${++k[p.job]}`, symbol: { name: j.datei.name, quelle: "fertig", fertig: p.job, cuts },
          x_mm: p.x_mm + ms.randSeite, y_mm: p.y_mm + ms.randSeite, b_mm: p.b_mm, h_mm: p.h_mm, gedreht: p.quer, drehung: p.quer ? 90 : null };
      }) };
  });
}
/** Bauauftrag des Kerns für die Gitter-Streifen (Quelle fertig): Vorlage, Schrittweite und Untergrenze der Schrift, je Job Name, Typ und Etikettentexte */
const gitterFertig = (jobs, g, vorlage) => ({ art: "gitter", vorlage, schritt_pt: g.schrift_schritt_pt, min_pt: g.schrift_min_pt, etikett_mm: g.etikett_mm,
  teilung_etikett_mm: g.teilung_etikett_mm,
  jobs: jobs.map(j => ({ name: j.datei.name, typOben: j.typOben || "", typUnten: j.typUnten || "", zeilen: j.daten.zeilen.map(z => ({ ring: z.ring, wea: z.wea })) })) });

// ---------- MB-Nummern (§7.3) ----------
const nummerName = nr => `Nummer ${nr}`;
/** Info-Zeilen eines MB-Bogens (wie mbAufbauen im Skript); bestellt/gebaut und Material über den ganzen Aufbau, „Bogen n von m“ nur bei mehreren Bögen */
function mbInfo(pl, mengen, mb, ms, bi, vorlageName, gebaut) {
  const bogen = pl.boegen[bi], gesamt = pl.boegen.length, schilder = M.schilder(pl, bogen, mb).length;
  const info = ["=== BÖGL NUMMERN ==="].concat(gesamt > 1 ? ["Bogen:          " + (bi + 1) + " von " + gesamt] : [], ["", ">>> 1 x DRUCKEN <<<", "",
    "Nutzen:         " + r1(bogen.nutzenB) + " x " + r1(bogen.nutzenH) + " mm",
    "Zeichenfläche:  " + r1(bogen.nutzenB + ms.rand) + " x " + r1(bogen.nutzenH + ms.rand) + " mm",
    "Schilder:       " + schilder, SEP_BOEGL]);
  for (let ii = 1; ii <= mb.nummern; ii++) {
    if (!(mengen[ii] > 0)) continue;
    const geb = gebaut[ii] || 0;
    info.push("Nummer " + ii + ":" + (ii < 10 ? "  " : " ") + "     " + mengen[ii] + " bestellt, " + geb + " gebaut"
      + (geb > mengen[ii] ? "   (" + (geb - mengen[ii]) + " zu viel)" : "   (exakt)"));
  }
  info.push(...mbErgebnis(pl, mengen, mb, ms, gebaut), SEP_BOEGL);
  let nr2 = 1;
  bogen.zeilen.forEach((z, z3) => z.forEach(bl => {
    const teile = bl.map(t => "Nr " + t.nr + " mit " + t.reihen + " Reihe" + (t.reihen > 1 ? "n" : ""));
    info.push("Block " + nr2 + " (Zeile " + (z3 + 1) + "):  " + r1(pl.blockHoehe(bl)) + " mm hoch  -  " + teile.join(" + "));
    nr2++;
  }));
  info.push(SEP_BOEGL,
    "Raster:         " + mb.schild_mm + " mm Schild, " + mb.abstand_mm + " mm Abstand, " + mb.block_abstand_mm + " mm zwischen Blöcken",
    "Blöcke/Zeile:   " + pl.proZeile, "Vorlage:        " + vorlageName, SEP_BOEGL);
  return info;
}
/** gebaut je Nummer über alle Bögen der MB-Planung */
function mbGebaut(pl, mb) {
  const gebaut = {};
  pl.boegen.forEach(b => M.schilder(pl, b, mb).forEach(s => { gebaut[s.nr] = (gebaut[s.nr] || 0) + 1; }));
  return gebaut;
}
/**
 * Ergebniszeilen der Info-Ebene (und des Fensters „Bögl Nummern“ beim Tippen, SPEZ_03_Oberflaeche §12.3): „Material ges.:  rund <x> m Bahn“ (Σ Zeichenflächenlängen
 * des Aufbaus) und bei Überproduktion „<n> Stück Überproduktion durch das 5er-Raster.“; gebaut je Nummer (Standard mbGebaut)
 */
function mbErgebnis(pl, mengen, mb, ms, gebaut) {
  const g = gebaut || mbGebaut(pl, mb);
  let zuviel = 0;
  for (let ii = 1; ii <= mb.nummern; ii++) if (mengen[ii] > 0) zuviel += (g[ii] || 0) - mengen[ii];
  const material = pl.boegen.reduce((s, b) => s + b.nutzenH + ms.rand, 0);
  return ["Material ges.:  rund " + r2(material / 1000) + " m Bahn"].concat(zuviel > 0 ? [zuviel + " Stück Überproduktion durch das 5er-Raster."] : []);
}
/** Bögen der MB-Planung im Kernformat: ein Symbol je Nummer (Quelle fertig = Nummer), Instanz je Schild */
function mbBoegen(pl, mengen, mb, ms, vorlageName) {
  const lagen = pl.boegen.map(b => M.schilder(pl, b, mb)), gebaut = mbGebaut(pl, mb), k = {};
  return pl.boegen.map((bogen, bi) => ({ breite_mm: bogen.nutzenB + ms.rand, laenge_mm: bogen.nutzenH + ms.rand, auflage: 1,
    info: mbInfo(pl, mengen, mb, ms, bi, vorlageName, gebaut),
    teile: lagen[bi].map(s => ({ name: `${nummerName(s.nr)} ${k[s.nr] = (k[s.nr] || 0) + 1}`, symbol: { name: nummerName(s.nr), quelle: "fertig", fertig: s.nr, cuts: 1 },
      x_mm: s.x_mm + ms.randSeite, y_mm: s.y_mm + ms.randSeite, b_mm: mb.schild_mm, h_mm: mb.schild_mm, gedreht: false })) }));
}
const mbFertig = (pl, mengen, mb, vorlage) => ({ art: "mb", vorlage, schild_mm: mb.schild_mm, nummern: Object.keys(mengen).filter(n => mengen[n] > 0).map(Number) });

// ---------- Export: Dateinamen (§5.6, §6.5) ----------
const boegl = b => b.art === "gitter" || b.art === "mb";
/** Stamm eines Bogens: Bögl „<dateiname> “; Nutzen „<Kunde>_<Produkt>_<Medium>-<Laminat>-<Breite>_“; Druckbogen wie druckbogen.js */
function stamm(kunde, b, nk) {
  if (boegl(b)) return `${A.dateiname(nk.boegl.dateiname)} `;
  if (b.art === "nutzen") return `${A.dateiname(kunde)}_${A.dateiname(b.produkt)}_${A.dateiname(b.medium)}-${A.dateiname(b.laminat)}-${b.breite_mm}_`;
  return null;
}
/** Dateien eines Bogens: druck, cut, ai (nach der .ai schließt der JSX-Kern den Bogen) */
function dateien(kunde, b, nk) {
  const s = stamm(kunde, b, nk);
  if (s === null) return DB.dateien(kunde, b);
  const n = s + nn(Number(b.nr));
  return [{ art: "druck", name: `${n}_druck.pdf` }, { art: "cut", name: `${n}_cut.pdf` }, { art: "ai", name: `${n}.ai` }];
}
/** ältere Bögen mit höherer Nummer im Ordner (bleiben liegen, werden genannt); liste: bogen-Felder des Aufbaus */
function aeltere(ordner, kunde, liste, nk) {
  if (!liste.length || stamm(kunde, liste[0], nk) === null) return DB.aeltere(ordner, kunde, liste);
  const zahl = {};
  liste.forEach(b => { const s = stamm(kunde, b, nk); zahl[s] = Math.max(zahl[s] || 0, Number(b.gesamt) || 0); });
  let namen = [];
  try { namen = fs.readdirSync(ordner); } catch (e) { return []; }
  const r = [];
  for (const [s, n] of Object.entries(zahl)) {
    namen.filter(f => f.startsWith(s)).forEach(f => { const m = /^(\d+)(_druck\.pdf|_cut\.pdf|\.ai)$/.exec(f.slice(s.length)); if (m && Number(m[1]) > n) r.push(f); });
  }
  return r.sort();
}

module.exports = { VERKLEINERT, SEP_BOEGL, ERSTELLT_BOEGL, masse, bezeichnung, nutzenAuftragsordner, boeglAuftragsordner, boeglOrdner, objektLage, aufbauPlanen, aufbauen,
  nutzenBoegen, gitterInfo, gitterBoegen, gitterFertig, nummerName, mbInfo, mbGebaut, mbErgebnis, mbBoegen, mbFertig, boegl, stamm, dateien, aeltere };
