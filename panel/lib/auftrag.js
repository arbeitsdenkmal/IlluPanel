/* Abläufe ohne Oberfläche (SPEZ_02 §8.2, §10, §11): Berechnen, Summa, Druck, Export der Druckbögen. Gemeinsam: XMP lesen → Preisquelle laden →
 * Objekte lesen und messen (JSX) → Varianten-Erkennung → Prüfungen. Berechnen schreibt den Datensatz ins XMP-Feld kalkulation; Summa und Export
 * laufen über den Exportkern (Profil produktion, ersetzen: true), Druck baut die Bögen und schreibt aufbau. Rückgaben enthalten die Zeilen für ein
 * Popup (Fehler zuerst); aufgerufen vom Panel, „berechnen“ auch vom Fenster „Zusammenfassung“ (auch vor dem PDF). */
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
  if (!aa.kalkulation || !aa.preis) return ende([`Für die Auftragsart „${aa.name}“ gibt es keine Kalkulation`]);

  // Preisquelle: bei jeder Berechnung neu gelesen und geprüft
  const pq = o.preisquelle || PC.erstellen(konf.ext, { medien: konf.medien });
  const pl = await pq.laden(aa.preis);
  if (!pl.ok) return ende(["Preisliste ungültig:\n• " + pl.fehler.join("\n• ")]);

  const rollen = {};
  aa.ebenen.forEach(e => { rollen[e.name] = e.rolle; });
  const daten = await host("objekteLesen", { rollen, messen: true });

  // Varianten-Erkennung (SPEZ_02 §3.1): doppelte IP_Id -> neue IP_Id und IP_Original, nur Tags schreiben
  const neu = T.variantenErkennen(daten.objekte);
  if (neu.length) await host("objektTagsSchreiben", neu);

  const analyse = T.aufbauen(daten, { aa, pq, farben: konf.farben, medien: konf.medien, xmp });
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
  const a = await analysieren(host, konf, o);
  if (a.fehler.length) return ende(a.fehler, a.warnungen);
  const { aa, pq, pl, analyse, warnungen, xmp } = a;
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

/**
 * Summa (§10): Schneidedaten je Farbschlüssel über den Exportkern. ui { ordnerWaehlen(start), meldung(text) }.
 * Rückgabe { zeilen } – Fehler, Hinweise und Warnungen für ein Popup (leer: keine Meldung).
 */
async function summa(host, konf, ui, opts) {
  const pfad = await arbeitsdateiSpeichern(host);
  const a = await analysieren(host, konf, opts);
  if (a.fehler.length) return { zeilen: a.fehler.concat(a.warnungen) };
  let nest;
  try { nest = KA.nestingAlle(a.analyse, a.aa, konf.medien, "plott"); } catch (e) { return { zeilen: [e.message].concat(a.warnungen) }; }
  const boegen = SD.boegen(a.analyse, nest, a.xmp.kunde);
  if (!boegen.length) return { zeilen: ["Keine Plott-Objekte"].concat(a.warnungen) };
  const hinweise = [];
  let veraendert = false;
  const dateien = boegen.map(b => ({ name: b.name, ersetzen: true, speichern: async lokal => {
    const r = await host("schneidebogenSpeichern", { massstab: a.analyse.massstab, preset: a.aa.export.preset, datei: lokal, breite_mm: b.breite_mm,
      hoehe_mm: b.hoehe_mm, farbfeld: b.farbfeld, teile: b.teile.map(t => ({ name: t.name, ref: t.ref, blaetter: t.blaetter, x_mm: t.x_mm, y_mm: t.y_mm, gedreht: t.gedreht, marken: t.marken })) });
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
 * Rückgabe { zeilen, aufbau }.
 */
async function druck(host, konf, opts) {
  const o = opts || {};
  const pfad = await arbeitsdateiSpeichern(host);
  const a = await analysieren(host, konf, o);
  if (a.fehler.length) return { zeilen: a.fehler.concat(a.warnungen) };
  let nest;
  try { nest = KA.nestingAlle(a.analyse, a.aa, konf.medien, "druck"); } catch (e) { return { zeilen: [e.message].concat(a.warnungen) }; }
  const plan = DB.aufbauPlanen(a.analyse, nest, { aa: a.aa, medien: konf.medien, xmp: a.xmp, arbeitsdatei: pfad, jetzt: o.jetzt });
  if (!plan.boegen.length) return { zeilen: ["Keine Digitaldruck-Objekte"].concat(a.warnungen) };
  const hinweise = [];
  let veraendert = false;
  for (const b of plan.boegen) {
    const r = await host("druckbogenAufbauen", b.jsx);
    r.pruefung.forEach(x => hinweise.push(`${b.medium} ${b.laminat}, Bogen ${b.nr}: ${x}`));
    if (!r.arbeitsdateiUnveraendert) veraendert = true;
  }
  const xmp = await xmpVon(host, pfad);
  await host("xmpSchreiben", D.serialisieren(D.aendern(xmp, { aufbau: plan.aufbau })), pfad);
  await host("bogenAktivieren", DB.ziel(Object.assign({ aufbau: plan.aufbau.id }, plan.boegen[0])));
  if (veraendert) hinweise.push("Achtung: Arbeitsdatei wurde beim Aufbau verändert");
  return { zeilen: hinweise.concat(a.warnungen), aufbau: plan.aufbau };
}

const parsenSicher = t => { try { return D.parsen(t); } catch (e) { return null; } };

/**
 * Export der Druckbögen (§11.2) bei vorderem Druckbogen oder vorderer Arbeitsdatei einer kalkulierten Art: alle offenen Bögen des letzten Aufbaus.
 * Rückgabe { zeilen }.
 */
async function exportDruckboegen(host, konf, ui) {
  const info = await host("dokumentInfo"), vorn = info.hatDokument ? parsenSicher(info.xmp) : null;
  const pfad = vorn && vorn.rolle === "druckbogen" ? vorn.bogen && vorn.bogen.arbeitsdatei : info.pfad;
  if (!pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
  const liste = (await host("dokumenteListe")).dokumente.map(d => Object.assign({ o: parsenSicher(d.xmp) }, d));
  const ad = liste.find(d => d.pfad === pfad && d.o && d.o.rolle === "arbeitsdatei");
  if (!ad) throw new Error(`Arbeitsdatei nicht geöffnet:\n${pfad}`);
  const aa = konf.arten[ad.o.auftragsart];
  await host("dokumentSpeichern", pfad);
  const aufbauId = ad.o.aufbau && ad.o.aufbau.id;
  const alle = liste.filter(d => d.o && d.o.rolle === "druckbogen" && d.o.bogen && d.o.bogen.arbeitsdatei === pfad);
  const praefix = d => `${d.o.bogen.medium} ${d.o.bogen.laminat}, Bogen ${d.o.bogen.nr} (${d.name}): `;
  const hinweise = alle.filter(d => !aufbauId || String(d.o.bogen.aufbau) !== String(aufbauId)).map(d => `${praefix(d)}stammt aus einem früheren Aufbau – nicht gespeichert`);
  const boegen = alle.filter(d => aufbauId && String(d.o.bogen.aufbau) === String(aufbauId))
    .sort((x, y) => (x.o.bogen.medium + x.o.bogen.laminat + nn3(x.o.bogen.nr)) < (y.o.bogen.medium + y.o.bogen.laminat + nn3(y.o.bogen.nr)) ? -1 : 1);
  if (!boegen.length) return { zeilen: ["Keine offenen Druckbögen"].concat(hinweise) };

  // Sammelprüfung ohne Änderung: Cutkontur je Objekt, danach je Bogen Marken planen (Breite ≤ Rolle − 2 × Kantenhalter); alle Befunde in einem Popup
  const kh = R.druck(konf.medien).kantenhalter_mm, befunde = [];
  const planen = async d => {
    const l = await host("bogenLesen", DB.ziel(d.o.bogen));
    try { return OP.plan({ bezug: OP.bezugsrechteck(l.blaetter), zf: l.zf, rollenbreite: d.o.bogen.breite_mm, kantenhalter_mm: kh, nr: d.o.bogen.nr }); }
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
  const dateien = [];
  for (const d of boegen) for (const f of DB.dateien(ad.o.kunde, d.o.bogen)) {
    dateien.push({ name: f.name, ersetzen: true, speichern: lokal => host("bogenSpeichern", { ziel: DB.ziel(d.o.bogen), art: f.art, datei: lokal, preset: aa.export.preset }) });
  }
  const r = await EX.exportieren({ xmp: await xmpVon(host, pfad), dateien, dtf: [] }, umgebung(host, konf, ui, pfad));
  const alt = DB.aeltere(r.ordner, ad.o.kunde, boegen.map(d => d.o.bogen));
  return { zeilen: (r.meldung ? [r.meldung] : []).concat(hinweise, alt.length ? [AELTERE, ...alt] : []), ergebnis: r };
}
const nn3 = n => String(n).padStart(3, "0");

module.exports = { analysieren, berechnen, summa, druck, exportDruckboegen };
