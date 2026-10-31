/* Abläufe ohne Oberfläche (SPEZ_02 §8.2, §10, §11): Berechnen, Summa, Druck, Export der Druckbögen. Gemeinsam: XMP lesen → Preisquelle laden →
 * Objekte lesen und messen (JSX) → Varianten-Erkennung → Prüfungen. Berechnen schreibt den Datensatz ins XMP-Feld kalkulation; Summa und Export
 * laufen über den Exportkern (Profil produktion, ersetzen: true), Druck baut die Bögen und schreibt aufbau. Rückgaben enthalten die Zeilen für ein
 * Popup (Fehler zuerst); aufgerufen vom Panel, „berechnen“ auch vom Fenster „Zusammenfassung“ (auch vor dem PDF).
 * Schild (Profil schild, ohne Kalkulation, SPEZ_03_Schild §8): Summa und Druck nach den Schildregeln; Preisliste ohne Auftragsart (Komplexität,
 * Aufschläge, Tape-Vorschlag), ohne Preisprüfungen; Druck nur Digitaldruck-Objekte mit Cutkontur.
 * Textil (Profil textil, SPEZ_03_Textil §9, §10): Lesen und Messen der Motive auf „Design“ (teile.aufbauenTextil), Streifen je Farbschlüssel
 * (kalkulation_textil.nesting), Kalkulation Flex/Flock (kalkulation_textil.rechnen); Summa ohne Preisprüfung, bei fehlerhafter Preisliste ohne Serienprüfung. */
"use strict";
const D = require("./dokument");
const T = require("./teile");
const KA = require("./kalkulation");
const PC = require("./preisquelle_csv");
const EX = require("./export");
const R = require("./rollen");
const OP = require("./opos");
const SD = require("./schneidedaten");
const DB = require("./druckbogen");
const NB = require("./nutzenbogen");
const S = require("./schild");
const KT = require("./kalkulation_textil");

/**
 * Lesen, Varianten-Erkennung, Prüfungen. Rückgabe { xmp, aa, pq, pl, analyse, warnungen, fehler }; bei Fehlern ohne analyse (oder mit Fehlern darin).
 * opts: { preisquelle (nur Tests) }
 */
async function analysieren(host, konf, opts) {
  const o = opts || {}, X = D.xmpZugriff(host);
  const ende = (fehler, warnungen) => ({ fehler, warnungen: warnungen || [] });
  const xmp = await X.xmpLesen();
  const aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
  if (!aa) return ende(["Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“."]);
  const schild = aa.export.profil === "schild" && !o.berechnen, textil = aa.export.profil === "textil";
  if (!schild && (!aa.kalkulation || !aa.preis)) return ende([`Für die Auftragsart „${aa.name}“ gibt es keine Kalkulation`]);
  const tk = textil && konf.textil ? konf.textil.konfig : null;
  if (textil && !tk) return ende(konf.textil.fehler.map(f => `${f.datei}: ${f.grund}`));

  // Preisquelle: bei jeder Berechnung neu gelesen und geprüft; Schild ohne Auftragsart, fehlerhaft -> ohne Stufen, Aufschläge und Tape-Vorschlag;
  // Textil-Summa bei fehlerhafter Preisliste ohne Preisquelle (keine Serienprüfung)
  let pq = o.preisquelle || PC.erstellen(konf.ext, { medien: konf.medien }), pl = null;
  if (schild) pq = await S.preisquelleOhneArt(pq);
  else {
    pl = await pq.laden(aa.preis);
    if (!pl.ok && !(textil && !o.berechnen)) return ende(["Preisliste ungültig:\n• " + pl.fehler.join("\n• ")]);
    if (!pl.ok) pq = null;
  }

  const rollen = {};
  aa.ebenen.forEach(e => { rollen[e.name] = e.rolle; });
  const daten = await host("objekteLesen", { rollen, messen: true });

  // Varianten-Erkennung (SPEZ_02 §3.1): doppelte IP_Id -> neue IP_Id und IP_Original, nur Tags schreiben
  const neu = T.variantenErkennen(daten.objekte);
  if (neu.length) await host("objektTagsSchreiben", neu);

  const analyse = textil ? T.aufbauenTextil(daten, { aa, pq, xmp, medien: konf.medien, streifen: tk.cfg.streifen, berechnen: !!o.berechnen })
    : T.aufbauen(daten, { aa, pq, farben: konf.farben, medien: konf.medien, xmp });
  return { xmp, aa, pq, pl, analyse, warnungen: T.hinweisZeilen(analyse.details, analyse.ohneZuordnung), fehler: analyse.fehler };
}

/**
 * Berechnen: Rückgabe { datensatz, warnungen, fehler }; bei Fehlern kein Datensatz, nichts geschrieben außer neuen IP_Id/IP_Original der Varianten.
 * @param host  evalScript-Brücke (gemeinsam.js host)
 * @param konf  Ergebnis von konfiguration.allesLaden { ext, arten, medien, farben, … }
 * @param opts  { jetzt, preisquelle (nur Tests) }
 */
async function berechnen(host, konf, opts) {
  const o = opts || {}, X = D.xmpZugriff(host);
  const ende = (fehler, warnungen) => ({ datensatz: null, warnungen: warnungen || [], fehler });
  const a = await analysieren(host, konf, Object.assign({}, o, { berechnen: true }));
  if (a.fehler.length) return ende(a.fehler, a.warnungen);
  const { aa, pq, pl, analyse, warnungen, xmp } = a;
  if (analyse.textil) {
    // Textil: Streifen je Farbschlüssel, Kalkulation Flex/Flock; ohne Flex-/Flock-Motive Datensatz mit leeren Preisen
    let nest;
    try { nest = KT.nesting(analyse, konf.textil.konfig.cfg.streifen); } catch (e) { return ende([e.message], warnungen); }
    const ds = KT.datensatz(KT.rechnen(analyse, pq, nest), { analyse, xmp, pq, preisliste: { quelle: pl.quelle, version: pl.version, stand: pl.stand }, warnungen, jetzt: o.jetzt });
    await X.xmpSchreiben(D.kalkulationSetzen(await X.xmpLesen() || xmp, ds));
    return { datensatz: ds, warnungen, fehler: [], nesting: nest, analyse };
  }
  if (!analyse.objekte.length) return ende([], warnungen);

  let nest;
  try { nest = KA.nestingAlle(analyse, aa, konf.medien); } catch (e) { return ende([e.message], warnungen); }
  const erg = KA.rechnen(analyse, aa, pq, konf.medien, nest);
  const datensatz = KA.datensatz(erg, { aa, xmp, pq, preisliste: { quelle: pl.quelle, version: pl.version, stand: pl.stand }, warnungen, jetzt: o.jetzt });
  await X.xmpSchreiben(D.kalkulationSetzen(await X.xmpLesen() || xmp, datensatz));
  return { datensatz, warnungen, fehler: [], nesting: nest, analyse };
}

/** Exportkern-Umgebung für die Arbeitsdatei unter pfad (XMP und Speichern gezielt, auch wenn ein Bogen vorn ist); ui { ordnerWaehlen, meldung } */
function umgebung(host, konf, ui, pfad) {
  return { rechner: konf.rechner, ordnerWaehlen: ui.ordnerWaehlen, meldung: ui.meldung,
    xmpSchreiben: async o => { await host("xmpSchreiben", D.serialisieren(o), pfad); return o; },
    arbeitsdatei: { pfad, speichern: () => host("dokumentSpeichern", pfad) } };
}
const xmpVon = async (host, pfad) => D.parsen((await host("xmpLesen", pfad)).text);
const AELTERE = "Ältere Bögen mit höherer Nummer (bleiben liegen):";

/** Arbeitsdatei vorn speichern; ungespeichert -> Abbruch [B-7]. Rückgabe Pfad */
async function arbeitsdateiSpeichern(host) {
  const info = await host("dokumentInfo");
  if (!info.hatDokument || !info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
  await host("dokumentSpeichern", info.pfad);
  return info.pfad;
}

/** Schild: Schildregeln vor Summa und Druck (§8.2); Rückgabe Warnungen, bei Fehlern { zeilen } zum Abbruch */
async function schildPruefen(host, konf) {
  const xmp = await D.xmpZugriff(host).xmpLesen(), aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
  if (!aa || aa.export.profil !== "schild") return { warnungen: [] };
  const r = (await S.stand(host, aa, xmp)).regeln;
  return r.fehler.length ? { zeilen: r.fehler.concat(r.warnungen), warnungen: r.warnungen } : { warnungen: r.warnungen };
}
/** Schild-Druck: Digitaldruck-Objekte ohne Cutkontur gehen nicht auf Druckbögen (§8.3); objekte behalten ihre Stelle (Teile verweisen per Index) */
function nurMitCutkontur(analyse) {
  const raus = new Set(analyse.objekte.filter(o => o.verfahren === "druck" && !o.cut).map(o => o.nr));
  if (!raus.size) return analyse;
  const gruppen = {};
  for (const [k, g] of Object.entries(analyse.gruppen)) {
    const teile = g.teile.filter(t => !raus.has(t.objekt));
    if (teile.length) gruppen[k] = Object.assign({}, g, { teile });
  }
  return Object.assign({}, analyse, { gruppen, teile: analyse.teile.filter(t => !raus.has(t.objekt)),
    objekte: analyse.objekte.map(o => (raus.has(o.nr) ? Object.assign({}, o, { verfahren: null }) : o)) });
}

/**
 * Summa (§10): Schneidedaten je Farbschlüssel über den Exportkern. ui { ordnerWaehlen(start), meldung(text) }.
 * Rückgabe { zeilen } – Fehler, Hinweise und Warnungen für ein Popup (leer: keine Meldung).
 */
async function summa(host, konf, ui, opts) {
  const pfad = await arbeitsdateiSpeichern(host);
  const sp = await schildPruefen(host, konf);
  if (sp.zeilen) return { zeilen: sp.zeilen };
  const a = await analysieren(host, konf, opts);
  a.warnungen = a.warnungen.concat(sp.warnungen);
  if (a.fehler.length) return { zeilen: a.fehler.concat(a.warnungen) };
  let nest;
  const textil = !!a.analyse.textil;
  try { nest = textil ? KT.nesting(a.analyse, konf.textil.konfig.cfg.streifen) : KA.nestingAlle(a.analyse, a.aa, konf.medien, "plott"); }
  catch (e) { return { zeilen: [e.message].concat(a.warnungen) }; }
  const boegen = SD.boegen(a.analyse, nest, a.xmp.kunde);
  if (!boegen.length) return { zeilen: [textil ? "Keine Flex-/Flock-Motive" : "Keine Plott-Objekte"].concat(a.warnungen) };
  const preset = textil ? a.aa.summa.preset : a.aa.export.preset;
  const hinweise = [];
  let veraendert = false;
  const dateien = boegen.map(b => ({ name: b.name, ersetzen: true, speichern: async lokal => {
    const r = await host("schneidebogenSpeichern", { massstab: a.analyse.massstab, preset, datei: lokal, breite_mm: b.breite_mm,
      hoehe_mm: b.hoehe_mm, farbfeld: b.farbfeld, teile: b.teile.map(t => ({ name: t.name, ref: t.ref, blaetter: t.blaetter, x_mm: t.x_mm, y_mm: t.y_mm, gedreht: t.gedreht, marken: t.marken,
        skala: t.skala })) });
    hinweise.push(...SD.lagePruefen(b, r.teile));
    if (!r.arbeitsdateiUnveraendert) veraendert = true;
  } }));
  const r = await EX.exportieren({ xmp: await xmpVon(host, pfad), dateien, dtf: [] }, umgebung(host, konf, ui, pfad));
  if (veraendert) hinweise.push("Achtung: Arbeitsdatei wurde beim Erzeugen verändert");
  const alt = SD.aeltere(r.ordner, a.xmp.kunde, boegen);
  return { zeilen: (r.meldung ? [r.meldung] : []).concat(hinweise, alt.length ? [AELTERE, ...alt] : [], a.warnungen), ergebnis: r };
}

/**
 * Druck (§11.1): Bögen je Medium + Laminat + Rolle aufbauen (nicht gespeichert), aufbau ins XMP der Arbeitsdatei, erster Bogen nach vorn.
 * Rückgabe { zeilen, aufbau, dokumente (Namen der ungespeicherten Bögen), arbeitsdatei }.
 */
async function druck(host, konf, opts) {
  const o = opts || {};
  const pfad = await arbeitsdateiSpeichern(host);
  const sp = await schildPruefen(host, konf);
  if (sp.zeilen) return { zeilen: sp.zeilen };
  const a = await analysieren(host, konf, o);
  a.warnungen = a.warnungen.concat(sp.warnungen);
  if (a.fehler.length) return { zeilen: a.fehler.concat(a.warnungen) };
  if (a.aa.export.profil === "schild") a.analyse = nurMitCutkontur(a.analyse);
  let nest;
  try { nest = KA.nestingAlle(a.analyse, a.aa, konf.medien, "druck"); } catch (e) { return { zeilen: [e.message].concat(a.warnungen) }; }
  const plan = DB.aufbauPlanen(a.analyse, nest, { aa: a.aa, medien: konf.medien, xmp: a.xmp, arbeitsdatei: pfad, jetzt: o.jetzt });
  if (!plan.boegen.length) return { zeilen: ["Keine Digitaldruck-Objekte"].concat(a.warnungen) };
  const hinweise = [];
  let veraendert = false;
  const dokumente = [];
  for (const b of plan.boegen) {
    const r = await host("druckbogenAufbauen", b.jsx);
    dokumente.push(r.dokument);
    r.pruefung.forEach(x => hinweise.push(`${b.medium} ${b.laminat}, Bogen ${b.nr}: ${x}`));
    if (!r.arbeitsdateiUnveraendert) veraendert = true;
  }
  const xmp = await xmpVon(host, pfad);
  await host("xmpSchreiben", D.serialisieren(D.aendern(xmp, { aufbau: plan.aufbau })), pfad);
  await host("bogenAktivieren", DB.ziel(Object.assign({ aufbau: plan.aufbau.id }, plan.boegen[0])));
  if (veraendert) hinweise.push("Achtung: Arbeitsdatei wurde beim Aufbau verändert");
  return { zeilen: hinweise.concat(a.warnungen), aufbau: plan.aufbau, dokumente, arbeitsdatei: pfad };
}

const parsenSicher = t => { try { return D.parsen(t); } catch (e) { return null; } };

/**
 * Export der Druckbögen (§11.2) bei vorderem Druckbogen oder vorderer Arbeitsdatei einer kalkulierten Art: alle offenen Bögen des letzten Aufbaus.
 * Bögen ohne Arbeitsdatei (SPEZ_03_Nutzen §2.5: Nutzen Einstieg B, Gitterscheiben, MB-Nummern) bei vorderem Bogen: alle offenen Bögen mit derselben
 * bogen.aufbau-Id, keine Arbeitsdatei, kein aufbau-Abgleich; Exportkern mit dem XMP des ersten Bogens, ablage und exporte[] in alle Bögen des Aufbaus
 * (exporte[] vor dem Speichern der .ai); Bögl-Funktionen mit fester Ablage (§6.5). Zulässige Breite bei bogen.art gitter: gitter.zulaessig_mm (§2.3).
 * Rückgabe { zeilen }.
 */
async function exportDruckboegen(host, konf, ui) {
  const info = await host("dokumentInfo"), vorn = info.hatDokument ? parsenSicher(info.xmp) : null;
  const ohneAd = !!(vorn && vorn.rolle === "druckbogen" && vorn.bogen && !vorn.bogen.arbeitsdatei);
  const liste = (await host("dokumenteListe")).dokumente.map(d => Object.assign({ o: parsenSicher(d.xmp) }, d));
  const praefix = d => `${d.o.bogen.medium} ${d.o.bogen.laminat}, Bogen ${d.o.bogen.nr} (${d.name}): `;
  let pfad = null, ad = null, aa, hinweise = [], boegen;
  if (ohneAd) {
    aa = konf.arten[vorn.auftragsart];
    boegen = liste.filter(d => d.o && d.o.rolle === "druckbogen" && d.o.bogen && !d.o.bogen.arbeitsdatei && String(d.o.bogen.aufbau) === String(vorn.bogen.aufbau))
      .sort((x, y) => Number(x.o.bogen.nr) - Number(y.o.bogen.nr));
  } else {
    pfad = vorn && vorn.rolle === "druckbogen" ? vorn.bogen && vorn.bogen.arbeitsdatei : info.pfad;
    if (!pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
    ad = liste.find(d => d.pfad === pfad && d.o && d.o.rolle === "arbeitsdatei");
    if (!ad) throw new Error(`Arbeitsdatei nicht geöffnet:\n${pfad}`);
    aa = konf.arten[ad.o.auftragsart];
    await host("dokumentSpeichern", pfad);
    const aufbauId = ad.o.aufbau && ad.o.aufbau.id;
    const alle = liste.filter(d => d.o && d.o.rolle === "druckbogen" && d.o.bogen && d.o.bogen.arbeitsdatei === pfad);
    hinweise = alle.filter(d => !aufbauId || String(d.o.bogen.aufbau) !== String(aufbauId)).map(d => `${praefix(d)}stammt aus einem früheren Aufbau – nicht gespeichert`);
    boegen = alle.filter(d => aufbauId && String(d.o.bogen.aufbau) === String(aufbauId))
      .sort((x, y) => (x.o.bogen.medium + x.o.bogen.laminat + nn3(x.o.bogen.nr)) < (y.o.bogen.medium + y.o.bogen.laminat + nn3(y.o.bogen.nr)) ? -1 : 1);
  }
  if (!boegen.length) return { zeilen: ["Keine offenen Druckbögen"].concat(hinweise) };
  const nk = konf.nutzen && konf.nutzen.konfig;
  if (boegen.some(d => d.o.bogen.art) && !nk) throw new Error(konf.nutzen.fehler.map(f => `${f.datei}: ${f.grund}`).join("\n"));

  // Sammelprüfung ohne Änderung: Cutkontur je Objekt, danach je Bogen Marken planen (Breite ≤ Rolle − 2 × Kantenhalter; Gitter: gitter.zulaessig_mm);
  // alle Befunde in einem Popup
  const kh = R.druck(konf.medien).kantenhalter_mm, befunde = [];
  const planen = async d => {
    const l = await host("bogenLesen", DB.ziel(d.o.bogen)), gitter = d.o.bogen.art === "gitter";
    try { return OP.plan({ bezug: OP.bezugsrechteck(l.blaetter), zf: l.zf, rollenbreite: gitter ? nk.gitter.zulaessig_mm : d.o.bogen.breite_mm, kantenhalter_mm: gitter ? 0 : kh, nr: d.o.bogen.nr }); }
    catch (e) { return { fehler: e.message }; }
  };
  for (const d of boegen) (await host("bogenPruefen", DB.ziel(d.o.bogen))).ohneCut.forEach(n => befunde.push(`${praefix(d)}${n}: keine Cutkontur`));
  for (const d of boegen) { const p = await planen(d); if (p.fehler) befunde.push(`${d.o.bogen.medium} ${d.o.bogen.laminat}, ${p.fehler}`); }
  if (befunde.length) return { zeilen: befunde.concat(hinweise) };

  // je Bogen: Instanzen umwandeln, Cutkonturen auf Cut, Farbfeld vereinheitlichen, eigene OPOS-Marken
  const cut = { name: aa.druck.cut_farbfeld, cmyk: aa.druck.cut_cmyk };
  for (const d of boegen) {
    await host("bogenVorbereiten", DB.ziel(d.o.bogen), cut);
    const p = await planen(d);
    if (p.fehler) throw new Error(`${d.o.bogen.medium} ${d.o.bogen.laminat}, ${p.fehler}`);
    await host("markenZeichnen", DB.ziel(d.o.bogen), { zf: p.zf, objekte: p.objekte, dreieck: p.dreieck, info: p.info });
  }

  // Exportkern: je Bogen druck.pdf, cut.pdf, .ai (danach geschlossen), ersetzen
  const kunde = ohneAd ? boegen[0].o.kunde : ad.o.kunde, geschlossen = new Set(), dateien = [];
  for (const d of boegen) for (const f of NB.dateien(kunde, d.o.bogen, nk)) {
    dateien.push({ name: f.name, ersetzen: true, speichern: async lokal => {
      await host("bogenSpeichern", { ziel: DB.ziel(d.o.bogen), art: f.art, datei: lokal, preset: aa.export.preset });
      if (f.art === "ai") geschlossen.add(d);
    } });
  }
  let r;
  if (!ohneAd) r = await EX.exportieren({ xmp: await xmpVon(host, pfad), dateien, dtf: [] }, umgebung(host, konf, ui, pfad));
  else {
    // ablage und exporte[] in jeden noch offenen Bogen des Aufbaus (geschlossene tragen den Stand ihrer .ai)
    const xmpSchreiben = async o => {
      for (const d of boegen) {
        if (geschlossen.has(d)) continue;
        d.o = D.aendern(d.o, { ablage: o.ablage, exporte: o.exporte });
        await host("bogenXmpSchreiben", DB.ziel(d.o.bogen), D.serialisieren(d.o));
      }
      return o;
    };
    const boegl = NB.boegl(boegen[0].o.bogen);
    const eigene = [...new Set([].concat(...boegen.map(d => (d.o.exporte || []).map(e => e && e.ordner).filter(Boolean))))];
    const auftrag = { xmp: boegen[0].o, dateien, dtf: [] };
    if (boegl) Object.assign(auftrag, { serverPflicht: true, ordnerregel: (kundenPfad, x) => NB.boeglOrdner(kundenPfad, x.ablage.kundenordner, x.ablage.auftragsordner, eigene) });
    r = await EX.exportieren(auftrag, { rechner: konf.rechner, ordnerWaehlen: ui.ordnerWaehlen, meldung: ui.meldung, xmpSchreiben, arbeitsdatei: null, exporteVorab: true });
  }
  const alt = NB.aeltere(r.ordner, kunde, boegen.map(d => d.o.bogen), nk);
  return { zeilen: (r.meldung ? [r.meldung] : []).concat(hinweise, alt.length ? [AELTERE, ...alt] : []), ergebnis: r };
}
const nn3 = n => String(n).padStart(3, "0");

module.exports = { analysieren, berechnen, summa, druck, exportDruckboegen };
