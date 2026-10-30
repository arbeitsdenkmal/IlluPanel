/* Kalkulation nach PREISLOGIK v6 §4 mit Anzahl (SPEZ_02 §8.1) und Brutto auf Cent [R 1.14]; aus dem alten Projekt übernommen (ohne Schild [R 1.13]).
 * je Folie: Verbrauch = Σ Zeichenflächenlänge × volle Rollenbreite (nur EK, Rollenwahl, Materialbedarf); ruesten = z(ruesten) + z(datei_cut), nach
 *   Fläche auf alle Exemplare verteilt; tape_folie = max(fläche_tape_m2, 1) × z(tape_m2) (Plott: alle Stücke; Druck: nur Stücke mit Tape), nach
 *   fläche_m2(o, f) auf die getapten Exemplare verteilt;
 * je Exemplar, × Anzahl summiert [A-5]: material = Σ fläche_m2(o, f) × vk_m2; flaechenzeit = Σ fläche_m2(o, f) × z(produktion_m2);
 *   entgittern = teile × z(teil) + schnitt_m × z(schnitt_m); trennen = z(trennen);
 *   montage = (z(stueck) + fläche × (z(montage_m2) + z(reinigen_m2)) + teile × z(montage_teil)) × (1 + Σ prozent/100) + fläche × Σ minuten;
 *   tape = fläche × tape_vk_m2 (nur Druck mit Tape);
 * je Stück: produktion = (ruesten_anteil + tape_anteil + flaechenzeit + entgittern + trennen) × (1 + komplexität/100);
 *   produkt = material + produktion × S + tape; montage_betrag = montage × S;
 * je Auftrag: produkt_summe = Σ produkt + z(datei_rip) × S (bei Druck) ≥ mindest.produkt;
 *   montage_summe = Σ montage_betrag + (z(auftrag_montage) + reinigen_rest) × S ≥ mindest.montage, reinigen_rest = max(0, 1 − Σ fläche × Anzahl) × z(reinigen_m2, alle);
 *   nur Aufkleber = produkt_summe, inkl. Montage = produkt_summe + montage_summe, je einzeln auf rundung aufgerundet; brutto = gerundet × (1 + mwst/100) auf Cent.
 * Minuten einmal, Beträge zweimal: VK mit S = stundensatz.vk / 60, Mindest-VK mit S = stundensatz.produktion / 60. Grafik nur dokumentiert [P §2.7]. */
"use strict";
const { nesten, nestenDruck } = require("./nesting");
const R = require("./rollen");
const D = require("./dokument");

const DATENSATZ_SCHEMA = 1, PREISLOGIK = 6;

/** Plott: Bogenhöhe = Nutzbreite der Serie (751C: 1260 − 25 = 1235 mm). */
function nestOptionen(aa, MK, serie) {
  return { hoehe_mm: R.nutzbreite(MK, serie, "plott"), max_breite_mm: aa.nesting.max_breite_mm, abstand_mm: aa.nesting.abstand_mm, rand_mm: aa.nesting.rand_mm };
}
/** Druck: Zeichenfläche = Grafik + OPOS-Zugabe + 2 × Abstand Marken–Rand, quer höchstens Rolle − 2 × Kantenhalter (config/medien.json). */
function druckOptionen(aa, MK, breite) {
  const d = aa.druck, w = R.druck(MK);
  return { medienbreite_mm: breite, kantenhalter_mm: w.kantenhalter_mm, rand_mm: w.rand_mm, abstand_mm: d.abstand_mm, max_laenge_mm: d.max_laenge_mm, max_laenge_sonder_mm: d.max_laenge_sonder_mm };
}
/**
 * Rollenwahl je Medium + Laminat [Produktionsregeln §3]: mit jeder vorrätigen Breite nesten; Standardbreite, außer (a) die Teile passen dort nicht,
 * in einer anderen aber doch, oder (b) eine andere Breite spart mindestens schwelle_prozent Verbrauch in m². Ergebnis null: passt in keiner Breite.
 */
function rolleWaehlen(teile, aa, medium, MK) {
  const schwelle = MK && MK.schwelle_prozent != null ? MK.schwelle_prozent : 10;
  const kandidaten = R.breiten(MK, medium).map(breite => {
    try { const n = nestenDruck(teile, druckOptionen(aa, MK, breite)); return { breite, n, m2: n.laenge_mm / 1000 * breite / 1000 }; }
    catch (e) { return { breite, n: null, m2: Infinity, fehler: e.message }; }
  });
  if (!kandidaten.length) return null;
  const std = kandidaten[0], moeglich = kandidaten.filter(k => k.n);
  if (!moeglich.length) return null;
  const sparsam = moeglich.reduce((a, b) => (b.m2 < a.m2 - 1e-9 ? b : a));
  let wahl = std, grund = "Standardbreite";
  if (!std.n) { wahl = sparsam; grund = `passt nicht in ${std.breite} mm`; }
  else if (sparsam !== std && (std.m2 - sparsam.m2) / std.m2 * 100 >= schwelle - 1e-9) { wahl = sparsam; grund = `spart ${Math.round((std.m2 - sparsam.m2) / std.m2 * 1000) / 10} % gegenüber ${std.breite} mm`; }
  return { breite: wahl.breite, n: wahl.n, m2: wahl.m2, grund, standard: std.breite, kandidaten: kandidaten.map(k => ({ breite: k.breite, m2: k.m2, passt: !!k.n })) };
}
/** Nesting aller Gruppen (Plott je Farbschlüssel, Druck je Medium + Laminat mit Rollenwahl); jedes Teil × Anzahl Exemplare. Für Kalkulation, Summa, Druck. */
function nestingAlle(analyse, aa, MK) {
  const r = {};
  for (const key of Object.keys(analyse.gruppen).sort()) {
    const g = analyse.gruppen[key], teile = g.teile.map(t => ({ id: t.id, b_mm: t.b_mm, h_mm: t.h_mm, anzahl: t.anzahl }));
    if (g.verfahren === "plott") {
      const opt = nestOptionen(aa, MK, g.serie);
      r[key] = { n: nesten(teile, opt), rollenbreite_mm: R.standardbreite(MK, g.serie), nutzbreite_mm: opt.hoehe_mm, rolle: null };
    } else {
      const rolle = rolleWaehlen(teile, aa, g.schluessel, MK);
      if (!rolle) throw new Error(`${g.schluessel} ${g.laminat}: passt in keiner vorrätigen Rollenbreite`);
      r[key] = { n: rolle.n, rollenbreite_mm: rolle.breite, nutzbreite_mm: R.grafikMaxQuer(MK, rolle.breite), rolle };
    }
  }
  return r;
}

/** Immer aufrunden auf ein Vielfaches von schritt (0/leer = keine Rundung); 1e-9 gegen Gleitkomma-Rauschen. */
function aufrunden(betrag, schritt) {
  if (!(schritt > 0)) return betrag;
  return Math.ceil(betrag / schritt - 1e-9) * schritt;
}
/** Bruttopreis aus gerundetem Nettopreis, auf Cent (Rechnung in ganzen Cent gegen Gleitkomma-Rauschen, z. B. 485,00 → 577,15). */
function brutto(netto, mwst) { return Math.round(Math.round(netto * 100) * (100 + mwst) / 100) / 100; }

/**
 * @param analyse  Ergebnis von teile.aufbauen (ohne Fehler)
 * @param pq       geladene Preisquelle
 * @param nest     Ergebnis von nestingAlle (sonst wird hier genestet)
 */
function rechnen(analyse, aa, pq, MK, nest) {
  const P = k => pq.parameter(k);
  const S = P("stundensatz.vk") / 60, SM = P("stundensatz.produktion") / 60; // €/min: VK und Mindest-VK
  const z = (name, v) => pq.z(name, v) || 0; // fehlende Schlüssel meldet die Preisquelle beim Laden
  const a = aa.nesting.abstand_mm;
  const nestings = nest || nestingAlle(analyse, aa, MK);
  const folien = [], ruestenAnteil = {}; // Teil-ID -> min Rüsten (alle Exemplare)
  for (const key of Object.keys(analyse.gruppen).sort((x, y) => {
    const gx = analyse.gruppen[x], gy = analyse.gruppen[y];
    return (gx.verfahren === gy.verfahren ? 0 : gx.verfahren === "plott" ? -1 : 1) || (x < y ? -1 : 1);
  })) {
    const g = analyse.gruppen[key], v = g.verfahren, se = pq.serie(g.serie), ne = nestings[key];
    const lfm = ne.n.laenge_mm / 1000, verbrauch = lfm * ne.rollenbreite_mm / 1000;
    const zf = { key, schluessel: g.schluessel, serie: g.serie, verfahren: v, laminat: g.laminat, rollenbreite_mm: ne.rollenbreite_mm, nutzbreite_mm: ne.nutzbreite_mm,
      boegen: ne.n.bogen.length, lfm, verbrauch_m2: verbrauch, flaeche_m2: 0, flaeche_tape_m2: 0, teile: 0, ek: verbrauch * se.ek_m2, vk_m2: se.vk_m2,
      ruesten_min: z("ruesten", v) + z("datei_cut", v), tape_folie_min: 0, rolle: ne.rolle };
    folien.push(zf);
    // Rüsten nach Flächenanteil auf alle Exemplare verteilen: Begrenzung inkl. halbem Abstand rundum (wie bisher)
    const fl = g.teile.map(t => (t.b_mm + a) * (t.h_mm + a) * t.anzahl);
    const summe = fl.reduce((s, x) => s + x, 0);
    g.teile.forEach((t, i) => { ruestenAnteil[t.id] = (ruestenAnteil[t.id] || 0) + zf.ruesten_min * fl[i] / summe; });
  }
  const folieVon = (o, schluessel) => folien.find(f => (o.verfahren === "plott" ? f.schluessel === schluessel : f.key === `druck|${o.medium}|${o.laminat}`));
  // Tape am Bogen vor dem Trennen: Plott immer, Druck nur Stücke mit Tape
  const getapt = o => o.verfahren === "plott" || o.tape.gesetzt;
  analyse.objekte.forEach(o => o.folien.forEach(s => {
    const zf = folieVon(o, s), f = o.flaeche_je_folie[s] * o.anzahl;
    zf.flaeche_m2 += f; if (getapt(o)) zf.flaeche_tape_m2 += f;
    zf.teile += (o.teile_je_folie[s] || 0) * o.anzahl;
  }));
  folien.forEach(zf => { zf.tape_folie_min = zf.flaeche_tape_m2 > 0 ? Math.max(zf.flaeche_tape_m2, 1) * z("tape_m2", zf.verfahren) : 0; });

  const attrMap = {};
  pq.aufschlaege().forEach(x => { attrMap[x.schluessel] = x; });
  const objekte = analyse.objekte.map(o => {
    const v = o.verfahren, n = o.anzahl, m = o.messung;
    const attr = o.attribute.map(x => attrMap[x]);
    const montageProzent = attr.reduce((s, x) => s + (x.prozent || 0), 0);        // Attribute mit prozent (Sicke): Faktor auf die Montage
    const attributMin = attr.reduce((s, x) => s + (x.minuten || 0), 0) * m.flaeche_m2; // Attribute mit minuten (Wölbung) je m² Stückfläche
    const material = o.folien.reduce((s, k) => s + o.flaeche_je_folie[k] * folieVon(o, k).vk_m2, 0) * n;
    const flaechenzeit = o.folien.reduce((s, k) => s + o.flaeche_je_folie[k] * z("produktion_m2", v), 0) * n;
    const ruesten = o.teile.reduce((s, id) => s + (ruestenAnteil[id] || 0), 0);
    const tapeAnteil = getapt(o) ? o.folien.reduce((s, k) => { const zf = folieVon(o, k); return s + (zf.flaeche_tape_m2 > 0 ? zf.tape_folie_min * o.flaeche_je_folie[k] * n / zf.flaeche_tape_m2 : 0); }, 0) : 0;
    const entgittern = (m.teile * z("teil", v) + m.schnitt_m * z("schnitt_m", v)) * n;
    const trennen = z("trennen", v) * n;
    const produktion = (ruesten + tapeAnteil + flaechenzeit + entgittern + trennen) * (1 + (o.komplexitaet.prozent || 0) / 100);
    const montage = ((z("stueck", v) + m.flaeche_m2 * (z("montage_m2", v) + z("reinigen_m2", v)) + m.teile * z("montage_teil", v)) * (1 + montageProzent / 100) + attributMin) * n;
    const tape = v === "druck" && o.tape.gesetzt ? m.flaeche_m2 * pq.serie(o.medium).tape_vk_m2 * n : 0;
    return { o, material, ruesten, tapeAnteil, flaechenzeit, entgittern, trennen, produktion, montage, montageAttribute: attributMin * n, tape,
      flaecheGesamt: m.flaeche_m2 * n,
      vk: { produkt: material + produktion * S + tape, montage: montage * S }, mindest: { produkt: material + produktion * SM + tape, montage: montage * SM } };
  });

  const summe = f => objekte.reduce((s, x) => s + f(x), 0);
  const dateiRipMin = objekte.some(x => x.o.verfahren === "druck") ? z("datei_rip", "druck") : 0;
  const auftragMontageMin = objekte.length ? z("auftrag_montage", "alle") : 0;
  const reinigenRestMin = objekte.length ? Math.max(0, 1 - summe(x => x.flaecheGesamt)) * z("reinigen_m2", "alle") : 0;
  const produktionMin = summe(x => x.produktion) + dateiRipMin, montageMin = summe(x => x.montage) + auftragMontageMin + reinigenRestMin;
  // §4.7–4.8 je Stundensatz s [€/min]: Mindestbeträge, Rundung und MwSt gelten für VK und Mindest-VK gleich; Grafik nicht im Preis
  const preise = s => {
    const produktRoh = summe(x => x.material + x.tape) + produktionMin * s, montageRoh = montageMin * s;
    const produktGreift = produktRoh < P("mindest.produkt"), montageGreift = montageRoh < P("mindest.montage");
    const produkt = produktGreift ? P("mindest.produkt") : produktRoh, montage = montageGreift ? P("mindest.montage") : montageRoh;
    const preis = netto => { const gerundet = aufrunden(netto, P("rundung")); return { netto, gerundet, brutto: brutto(gerundet, P("mwst")) }; };
    return { nur_aufkleber: preis(produkt), inkl_montage: preis(produkt + montage), greift: { produkt: produktGreift, montage: montageGreift } };
  };
  return { folien, objekte, nestings, auftrag: { dateiRipMin, auftragMontageMin, reinigenRestMin, produktionMin, montageMin }, vk: preise(S), mindest: preise(SM) };
}

const rund = (v, s) => { const f = 10 ** s; return Math.round(v * f) / f; };
const r2 = v => rund(v, 2), r4 = v => rund(v, 4);
const preisFeld = p => ({ netto: r2(p.netto), gerundet: p.gerundet, brutto: p.brutto });

/** Grafikminuten aus grafikzeit.eintraege (auto + manuell) [M 1]; Betrag nur dokumentiert */
function grafik(xmp, stundensatz) {
  const e = (xmp && xmp.grafikzeit && Array.isArray(xmp.grafikzeit.eintraege)) ? xmp.grafikzeit.eintraege : [];
  const sum = f => e.filter(f).reduce((s, x) => s + (Number(x.minuten) || 0), 0);
  const auto = sum(x => !x.manuell), manuell = sum(x => !!x.manuell);
  return { min_auto: auto, min_manuell: manuell, stundensatz, betrag: r2((auto + manuell) / 60 * stundensatz) };
}

/**
 * Kalkulationsdatensatz (SPEZ_02 §8.4, XMP-Feld kalkulation). Messwerte je Objekt (flaeche_m2, flaeche_je_folie, teile, schnitt_m) gelten für ein Exemplar;
 * Minuten und Beträge je Objekt für alle Exemplare. netto = nach Mindestbeträgen, vor dem Runden.
 * kx { aa, xmp, pq, preisliste: { quelle, version, stand }, warnungen[], jetzt }
 */
function datensatz(erg, kx) {
  const { aa, xmp, pq } = kx, P = k => pq.parameter(k);
  return {
    schema: DATENSATZ_SCHEMA, zeit: (kx.jetzt || new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"), panel: D.PANEL_VERSION, preislogik: PREISLOGIK,
    preisliste: { quelle: kx.preisliste.quelle, version: kx.preisliste.version, stand: kx.preisliste.stand },
    auftragsart: aa.id, massstab: xmp.massstab, kunde: xmp.kunde,
    stundensaetze: { vk: P("stundensatz.vk"), mindest: P("stundensatz.produktion"), grafik: P("stundensatz.grafik") }, mwst: P("mwst"), rundung: P("rundung"),
    objekte: erg.objekte.map(x => {
      const o = x.o, je = {};
      o.folien.forEach(k => { je[k] = r4(o.flaeche_je_folie[k]); });
      return {
        id: o.id, name: o.name, original: o.original, anzahl: o.anzahl, verfahren: o.verfahren,
        folien: o.folien.slice(), laminat: o.laminat, flaeche_m2: r4(o.messung.flaeche_m2), flaeche_je_folie: je,
        teile: o.messung.teile, schnitt_m: r2(o.messung.schnitt_m), komplexitaet: o.komplexitaet.stufe, attribute: o.attribute.slice(), tape: o.verfahren === "druck" && o.tape.gesetzt,
        minuten: { ruesten_anteil: r2(x.ruesten), tape_anteil: r2(x.tapeAnteil), flaechenzeit: r2(x.flaechenzeit), entgittern: r2(x.entgittern), trennen: r2(x.trennen),
          produktion: r2(x.produktion), montage: r2(x.montage), montage_attribute: r2(x.montageAttribute) },
        betraege: { material: r2(x.material), tape: r2(x.tape), produkt_vk: r2(x.vk.produkt), montage_vk: r2(x.vk.montage), produkt_mindest: r2(x.mindest.produkt), montage_mindest: r2(x.mindest.montage) }
      };
    }),
    folien: erg.folien.map(f => ({ schluessel: f.schluessel, serie: f.serie, verfahren: f.verfahren, laminat: f.laminat, rollenbreite_mm: f.rollenbreite_mm, nutzbreite_mm: rund(f.nutzbreite_mm, 3),
      boegen: f.boegen, lfm: r2(f.lfm), verbrauch_m2: r4(f.verbrauch_m2), flaeche_m2: r4(f.flaeche_m2), teile: f.teile, ek: r2(f.ek) })),
    auftrag: { datei_rip_min: r2(erg.auftrag.dateiRipMin), auftrag_montage_min: r2(erg.auftrag.auftragMontageMin), reinigen_rest_min: r2(erg.auftrag.reinigenRestMin),
      produktion_min: r2(erg.auftrag.produktionMin), montage_min: r2(erg.auftrag.montageMin) },
    preise: {
      vk: { nur_aufkleber: preisFeld(erg.vk.nur_aufkleber), inkl_montage: preisFeld(erg.vk.inkl_montage) },
      mindest: { nur_aufkleber: preisFeld(erg.mindest.nur_aufkleber), inkl_montage: preisFeld(erg.mindest.inkl_montage) },
      mindestbetrag_greift: { vk: { produkt: erg.vk.greift.produkt, montage: erg.vk.greift.montage }, mindest: { produkt: erg.mindest.greift.produkt, montage: erg.mindest.greift.montage } }
    },
    materialbedarf: erg.folien.map(f => ({ schluessel: f.schluessel, verbrauch_m2: r4(f.verbrauch_m2), lfm: r2(f.lfm), rollenbreite_mm: f.rollenbreite_mm })),
    grafik: grafik(xmp, P("stundensatz.grafik")),
    warnungen: (kx.warnungen || []).slice()
  };
}

module.exports = { rechnen, datensatz, grafik, nestingAlle, nestOptionen, druckOptionen, rolleWaehlen, aufrunden, brutto, DATENSATZ_SCHEMA, PREISLOGIK };
