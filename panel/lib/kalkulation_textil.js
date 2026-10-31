/* Kalkulation Textil Flex/Flock nach PREISLOGIK §13 (SPEZ_03_Textil §10), Preisquelle mit gilt_fuer textil. Nur Stücke mit kalkuliert (Flex/Flock); DTF, Stick,
 * Namen und das Textil selbst gehen nicht ein.
 * je Farbschlüssel f: Streifen (nesting.nestenStreifen, Exemplar bzw. Block je Farbe), Verbrauch = Σ Streifenlänge × rollenbreite_mm (nur EK, Materialbedarf,
 *   Datensatz); ruesten(f) = z(ruesten) + z(datei_cut), nach Flächenanteil fläche_m2(e, f) auf die Exemplare verteilt;
 * je Exemplar e: entgittern = teile × z(teil) + schnitt_m × z(schnitt_m); produktion = (ruesten_anteil + entgittern + z(trennen)) × (1 + komplexität/100);
 *   pressen = Pressvorgänge × z(pressen) (1, bei blockout 2); material = Σ fläche_m2(e, f) × vk_m2; preis = max(material + (produktion + pressen) × S, textil.mindest);
 * je Auftrag: falten = Textilzahl × z(falten) (Textilzahl = größte Mengensumme einer Position über die Flex-/Flock-Motive);
 *   preis_auftrag = Σ preis + falten × S, aufgerundet auf textil.rundung, brutto auf Cent [R 1.14].
 * Minuten einmal, Beträge zweimal: VK mit S = stundensatz.vk / 60, Mindest-VK mit S = stundensatz.produktion / 60; der Mindestbetrag je Exemplar gilt für beide.
 * Ein Preis: er steht in „inkl. Montage“, „nur Aufkleber“ bleibt null. Grafik nur dokumentiert [P §2.7]. */
"use strict";
const N = require("./nesting");
const KA = require("./kalkulation");
const D = require("./dokument");

/** Streifen je Farbschlüssel (Gruppen „textil|…“ aus teile.aufbauenTextil); sc = textil.json „streifen“ */
function nesting(analyse, sc) {
  const r = {};
  for (const key of Object.keys(analyse.gruppen).sort()) {
    const g = analyse.gruppen[key];
    if (g.verfahren !== "textil") continue;
    r[key] = { n: N.nestenStreifen(g.teile.map(t => ({ id: t.id, b_mm: t.b_mm, h_mm: t.h_mm, anzahl: t.anzahl })), sc), rollenbreite_mm: sc.rollenbreite_mm,
      nutzbreite_mm: sc.daten_breite_max_mm, rolle: null };
  }
  return r;
}

/** Textilzahl: größte Mengensumme einer Position über die Flex-/Flock-Stücke */
function textilzahl(objekte) {
  const je = {};
  objekte.filter(o => o.kalkuliert).forEach(o => { je[o.position] = (je[o.position] || 0) + o.anzahl; });
  return Math.max(0, ...Object.values(je));
}
/** aufrunden auf Vielfaches von schritt, auf Cent (0,1-Schritte ohne Gleitkomma-Rest) */
const aufrunden = (betrag, schritt) => Math.round(KA.aufrunden(betrag, schritt) * 100) / 100;

/**
 * @param analyse  teile.aufbauenTextil (ohne Fehler)
 * @param pq       geladene Preisquelle (gilt_fuer textil)
 * @param nest     Ergebnis von nesting()
 */
function rechnen(analyse, pq, nest) {
  const P = k => pq.parameter(k);
  const S = P("stundensatz.vk") / 60, SM = P("stundensatz.produktion") / 60, mindest = P("textil.mindest");
  const z = (name, v) => pq.z(name, v) || 0; // fehlende Schlüssel meldet die Preisquelle beim Laden
  const stuecke = analyse.objekte.filter(o => o.kalkuliert);
  const folien = [], ruesten = {}; // Stück-Nr -> min Rüsten (alle Exemplare)
  for (const key of Object.keys(nest).sort()) {
    const g = analyse.gruppen[key], se = pq.serie(g.serie), ne = nest[key];
    const lfm = ne.n.laenge_mm / 1000, verbrauch = lfm * ne.rollenbreite_mm / 1000;
    const zf = { key, schluessel: g.schluessel, serie: g.serie, farbe: g.farbe, verfahren: se.verfahren, rollenbreite_mm: ne.rollenbreite_mm, nutzbreite_mm: ne.nutzbreite_mm,
      streifen: ne.n.bogen.length, lfm, verbrauch_m2: verbrauch, flaeche_m2: 0, teile: 0, ek: verbrauch * se.ek_m2, vk_m2: se.vk_m2,
      ruesten_min: z("ruesten", se.verfahren) + z("datei_cut", se.verfahren) };
    stuecke.forEach(o => { if (o.folien.includes(g.schluessel)) { zf.flaeche_m2 += o.flaeche_je_folie[g.schluessel] * o.anzahl; zf.teile += (o.teile_je_folie[g.schluessel] || 0) * o.anzahl; } });
    stuecke.forEach(o => { if (o.folien.includes(g.schluessel) && zf.flaeche_m2 > 0) ruesten[o.nr] = (ruesten[o.nr] || 0) + zf.ruesten_min * o.flaeche_je_folie[g.schluessel] * o.anzahl / zf.flaeche_m2; });
    folien.push(zf);
  }
  const folieVon = k => folien.find(f => f.schluessel === k);
  const objekte = stuecke.map(o => {
    const v = o.verfahren.toLowerCase(), n = o.anzahl, m = o.messung, presse = o.druckgroesse.blockout ? 2 : 1;
    const ruestenE = (ruesten[o.nr] || 0) / n;
    const entgittern = m.teile * z("teil", v) + m.schnitt_m * z("schnitt_m", v), trennen = z("trennen", v);
    const produktion = (ruestenE + entgittern + trennen) * (1 + (o.komplexitaet.prozent || 0) / 100);
    const pressen = presse * z("pressen", v);
    const material = o.folien.reduce((s, k) => s + o.flaeche_je_folie[k] * folieVon(k).vk_m2, 0);
    const preis = s => { const roh = material + (produktion + pressen) * s; return { roh, preis: Math.max(roh, mindest), greift: roh < mindest }; };
    return { o, n, presse, ruesten: ruestenE * n, entgittern: entgittern * n, trennen: trennen * n, produktion: produktion * n, pressen: pressen * n, material: material * n,
      vk: preis(S), mindest: preis(SM) };
  });
  const summe = f => objekte.reduce((s, x) => s + f(x), 0);
  const T = textilzahl(stuecke), faltenMin = T * z("falten", "alle");
  const preise = (art, s) => {
    if (!objekte.length) return { nur_aufkleber: null, inkl_montage: null, exemplare: 0 };
    const netto = summe(x => x[art].preis * x.n) + faltenMin * s, gerundet = aufrunden(netto, P("textil.rundung"));
    return { nur_aufkleber: null, inkl_montage: { netto, gerundet, brutto: KA.brutto(gerundet, P("mwst")) }, exemplare: objekte.filter(x => x[art].greift).reduce((a, x) => a + x.n, 0) };
  };
  return { folien, objekte, nestings: nest, auftrag: { faltenMin, textilzahl: T, produktionMin: summe(x => x.produktion), pressenMin: summe(x => x.pressen),
    pressvorgaenge: summe(x => x.presse * x.n) }, vk: preise("vk", S), mindest: preise("mindest", SM) };
}

const rund = (v, s) => { const f = 10 ** s; return Math.round(v * f) / f; };
const r2 = v => rund(v, 2), r4 = v => rund(v, 4);
const preisFeld = p => (p ? { netto: r2(p.netto), gerundet: p.gerundet, brutto: p.brutto } : null);

/**
 * Kalkulationsdatensatz Textil (SPEZ_03_Textil §10.3, Struktur SPEZ_02 §8.4): objekte je Motiv und Druckgröße (DTF/Stick/Namen mit null-Beträgen), folien je
 * Farbschlüssel, auftrag mit falten_min und textilzahl, Preis in inkl_montage, mindest_greift je Exemplar (vk, mindest), rundung textil.rundung, textil aus dem XMP.
 * erg = rechnen() oder null (ohne Flex-/Flock-Motive); kx { analyse, xmp, pq, preisliste, warnungen, jetzt }
 */
function datensatz(erg, kx) {
  const { analyse, xmp, pq } = kx, P = k => pq.parameter(k);
  const je = {};
  ((erg && erg.objekte) || []).forEach(x => { je[x.o.nr] = x; });
  const folien = erg ? erg.folien : [];
  return {
    schema: KA.DATENSATZ_SCHEMA, zeit: (kx.jetzt || new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"), panel: D.PANEL_VERSION, preislogik: KA.PREISLOGIK,
    preisliste: { quelle: kx.preisliste.quelle, version: kx.preisliste.version, stand: kx.preisliste.stand },
    auftragsart: "textil", massstab: 1, kunde: xmp.kunde,
    stundensaetze: { vk: P("stundensatz.vk"), mindest: P("stundensatz.produktion"), grafik: P("stundensatz.grafik") }, mwst: P("mwst"), rundung: P("textil.rundung"),
    objekte: analyse.objekte.map(o => {
      const x = je[o.nr], d = o.druckgroesse, fl = {};
      (o.kalkuliert ? o.folien : []).forEach(k => { fl[k] = r4(o.flaeche_je_folie[k]); });
      return {
        id: o.id, name: o.name, original: o.original, anzahl: o.anzahl, verfahren: o.verfahren, position: o.position,
        druckgroesse: { nr: d.nr, mass_mm: d.mass_mm, bezug: d.bezug, groessen: d.groessen, blockout: d.blockout, zeigen: d.zeigen },
        folien: o.kalkuliert ? o.folien.slice() : [], farben: Object.assign({}, o.farben), laminat: null,
        flaeche_m2: o.kalkuliert ? r4(o.messung.flaeche_m2) : null, flaeche_je_folie: fl, teile: o.kalkuliert ? o.messung.teile : null,
        schnitt_m: o.kalkuliert ? r2(o.messung.schnitt_m) : null, komplexitaet: o.kalkuliert ? o.komplexitaet.stufe : null, attribute: [], tape: false,
        minuten: x ? { ruesten_anteil: r2(x.ruesten), entgittern: r2(x.entgittern), trennen: r2(x.trennen), produktion: r2(x.produktion), pressen: r2(x.pressen) } : null,
        betraege: x ? { material: r2(x.material), tape: 0, produkt_vk: r2(x.vk.preis * x.n), montage_vk: 0, produkt_mindest: r2(x.mindest.preis * x.n), montage_mindest: 0,
          mindest_greift: { vk: x.vk.greift, mindest: x.mindest.greift } } : null
      };
    }),
    folien: folien.map(f => ({ schluessel: f.schluessel, serie: f.serie, farbe: f.farbe, verfahren: f.verfahren, laminat: null, rollenbreite_mm: f.rollenbreite_mm,
      nutzbreite_mm: f.nutzbreite_mm, streifen: f.streifen, lfm: r2(f.lfm), verbrauch_m2: r4(f.verbrauch_m2), flaeche_m2: r4(f.flaeche_m2), teile: f.teile, ek: r2(f.ek) })),
    auftrag: erg ? { falten_min: r2(erg.auftrag.faltenMin), textilzahl: erg.auftrag.textilzahl, produktion_min: r2(erg.auftrag.produktionMin), pressen_min: r2(erg.auftrag.pressenMin),
      pressvorgaenge: erg.auftrag.pressvorgaenge } : { falten_min: 0, textilzahl: 0, produktion_min: 0, pressen_min: 0, pressvorgaenge: 0 },
    preise: {
      vk: { nur_aufkleber: null, inkl_montage: erg ? preisFeld(erg.vk.inkl_montage) : null },
      mindest: { nur_aufkleber: null, inkl_montage: erg ? preisFeld(erg.mindest.inkl_montage) : null },
      mindestbetrag_greift: null
    },
    materialbedarf: folien.map(f => ({ schluessel: f.schluessel, verbrauch_m2: r4(f.verbrauch_m2), lfm: r2(f.lfm), rollenbreite_mm: f.rollenbreite_mm })),
    grafik: KA.grafik(xmp, P("stundensatz.grafik")),
    textil: xmp.textil ? { modell: xmp.textil.modell || null, farbe: xmp.textil.farbe || null } : { modell: null, farbe: null },
    warnungen: (kx.warnungen || []).slice()
  };
}

module.exports = { nesting, rechnen, datensatz, textilzahl, aufrunden };
