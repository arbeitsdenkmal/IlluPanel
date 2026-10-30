/* Ablauf Berechnen (SPEZ_02 §8.2) ohne Oberfläche: XMP lesen → Preisquelle laden → Objekte lesen und messen (JSX) → Varianten-Erkennung →
 * Prüfungen → Nesting → Kalkulation → Datensatz ins XMP-Feld kalkulation. Rückgabe { datensatz, warnungen, fehler }; bei Fehlern kein Datensatz,
 * nichts geschrieben außer neuen IP_Id/IP_Original der Varianten. Aufgerufen von „berechnen“ im Panel und im Fenster „Zusammenfassung“ (auch vor dem PDF). */
"use strict";
const D = require("./dokument");
const T = require("./teile");
const KA = require("./kalkulation");
const PC = require("./preisquelle_csv");

/**
 * @param host  evalScript-Brücke (gemeinsam.js host)
 * @param konf  Ergebnis von konfiguration.allesLaden { ext, arten, medien, farben, … }
 * @param opts  { jetzt, preisquelle (nur Tests) }
 */
async function berechnen(host, konf, opts) {
  const o = opts || {}, X = D.xmpZugriff(host);
  const ende = (fehler, warnungen) => ({ datensatz: null, warnungen: warnungen || [], fehler });
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
  const warnungen = T.hinweisZeilen(analyse.details, analyse.ohneZuordnung);
  if (analyse.fehler.length) return ende(analyse.fehler, warnungen);
  if (!analyse.objekte.length) return ende([], warnungen);

  let nest;
  try { nest = KA.nestingAlle(analyse, aa, konf.medien); } catch (e) { return ende([e.message], warnungen); }
  const erg = KA.rechnen(analyse, aa, pq, konf.medien, nest);
  const datensatz = KA.datensatz(erg, { aa, xmp, pq, preisliste: { quelle: pl.quelle, version: pl.version, stand: pl.stand }, warnungen, jetzt: o.jetzt });
  await X.xmpSchreiben(D.kalkulationSetzen(await X.xmpLesen() || xmp, datensatz));
  return { datensatz, warnungen, fehler: [], nesting: nest, analyse };
}

module.exports = { berechnen };
