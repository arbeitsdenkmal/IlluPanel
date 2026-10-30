/* Gemeinsamer Exportkern (SPEZ_01 §7): erst lokal schreiben, dann auf den Server verschieben und nachprüfen.
 * Alle Exporte aller Auftragsarten laufen hier durch; die Profile (export_flach.js …) liefern nur Dateien und ihr speichern().
 *
 * exportieren(auftrag, umgebung)
 *   auftrag  = { xmp, dateien: [{ name, speichern(lokalerPfad) }], dtf: [name …] }
 *   umgebung = { rechner (konfiguration.rechnerLaden), ordnerWaehlen(start) -> pfad|null, meldung(text), xmpSchreiben(obj),
 *                arbeitsdatei: { pfad, speichern() } | null, jetzt() (Test), zeitlimit_ms (Test) }
 *   -> { ok, ordner, dateien[], geparkt[], fehler[], meldung, xmp }   meldung nur bei Fehlern (Popup); kein Erfolgs-Popup
 * Abbruch durch den Menschen (Ordnerdialog abgebrochen) -> Fehler der Klasse Abbruch (ohne Popup). */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require("./ablage");
const D = require("./dokument");

const ZEITLIMIT_MS = 3000;
class Abbruch extends Error { constructor() { super("abgebrochen"); this.abgebrochen = true; } }

/**
 * Schritt 1 (auch beim Anlegen): Kundenordner sicherstellen. Steht er im XMP, weiter. Sonst Server prüfen (3 s); erreichbar -> Ordnerdialog
 * ab server.kunden, gültig nur <Buchstabe>/<Kunde>; nicht erreichbar: arbeitsdateien „server“ -> Fehler, sonst ohne Kundenordner weiter.
 * -> { kundenordner: rel | null, erreichbar: true | false | null (nicht geprüft) }
 */
async function kundenordnerSicherstellen(xmp, u) {
  const R = u.rechner, wurzel = R.server.kunden;
  if (xmp && xmp.ablage && xmp.ablage.kundenordner) return { kundenordner: xmp.ablage.kundenordner, erreichbar: null };
  if (!(await A.erreichbar(wurzel, u.zeitlimit_ms || ZEITLIMIT_MS))) {
    if (R.arbeitsdateienServer) throw new Error(`Server nicht erreichbar:\n${wurzel}`);
    return { kundenordner: null, erreichbar: false };
  }
  for (;;) {
    const p = await u.ordnerWaehlen(wurzel);
    if (!p) throw new Abbruch();
    const rel = A.kundenordnerRelativ(wurzel, p);
    if (rel) return { kundenordner: rel, erreichbar: true };
    await u.meldung(`Kein gültiger Kundenordner:\n${p}\n\nGültig ist nur ein Ordner <Buchstabe>/<Kunde> in\n${wurzel}`);
  }
}

/** Schritt 2: freier Auftragsordner im Kundenordner. Eigener Ordner = die Arbeitsdatei liegt darin oder ein Export dieses Dokuments ging dorthin. */
function auftragsordnerFrei(kundenPfad, xmp, arbeitsdateiPfad) {
  const eigen = ao => {
    const p = path.join(kundenPfad, ao);
    if (arbeitsdateiPfad && path.resolve(arbeitsdateiPfad).startsWith(path.resolve(p) + path.sep)) return true;
    return (xmp.exporte || []).some(e => e && e.ordner === `${xmp.ablage.kundenordner}/${ao}`);
  };
  const basis = xmp.ablage.auftragsordner;
  for (let n = 1; n < 1000; n++) {
    const ao = A.nummeriert(basis, n);
    if (!fs.existsSync(path.join(kundenPfad, ao)) || eigen(ao)) return ao;
  }
  throw new Error(`Kein freier Auftragsordner für ${basis}`);
}

/** Meldungstext Schritt 10 (nur bei Fehlern) */
function meldungstext(geparkt, fehler) {
  const t = [];
  if (geparkt.length) t.push("Nicht auf den Server übertragen, lokal abgelegt:\n" + geparkt.join("\n"));
  if (fehler.length) t.push(fehler.join("\n"));
  return t.length ? t.join("\n\n") : null;
}

async function exportieren(auftrag, u) {
  const R = u.rechner, ms = u.zeitlimit_ms || ZEITLIMIT_MS, jetzt = u.jetzt ? u.jetzt() : new Date();
  let xmp = auftrag.xmp;
  const fehler = [], geparkt = [];
  const xmpAendern = async aenderungen => { xmp = D.aendern(xmp, aenderungen); await u.xmpSchreiben(xmp); };

  // 1. Kundenordner
  const k = await kundenordnerSicherstellen(xmp, u);
  if (k.kundenordner !== xmp.ablage.kundenordner) await xmpAendern({ "ablage.kundenordner": k.kundenordner });

  // 2. Auftragsordner auf dem Server (nur mit Kundenordner und erreichbarem Server)
  let serverOrdner = null;
  if (xmp.ablage.kundenordner) {
    const ok = k.erreichbar === true || await A.erreichbar(R.server.kunden, ms);
    const kundenPfad = A.unter(R.server.kunden, xmp.ablage.kundenordner);
    if (!ok) fehler.push(`Server nicht erreichbar: ${R.server.kunden}`);
    else if (!fs.existsSync(kundenPfad)) fehler.push(`Kundenordner fehlt auf dem Server: ${kundenPfad}`);
    else {
      const ao = auftragsordnerFrei(kundenPfad, xmp, u.arbeitsdatei && u.arbeitsdatei.pfad);
      if (ao !== xmp.ablage.auftragsordner) await xmpAendern({ "ablage.auftragsordner": ao });
      const p = path.join(kundenPfad, ao);
      try { if (!fs.existsSync(p)) fs.mkdirSync(p); serverOrdner = p; }
      catch (e) { fehler.push(`Auftragsordner nicht angelegt: ${p} (${e.code || e.message})`); }
    }
  }

  // 3. Lokaler Schreibort
  const lokalOrdner = path.join(R.lokal.ausgang, A.dateiname(xmp.kunde), xmp.ablage.auftragsordner);
  fs.mkdirSync(lokalOrdner, { recursive: true });

  // 4. Dateinamen: erste freie Nummer gegen lokalen und Server-Ordner, vor dem Schreiben
  const vergeben = new Set();
  const dateien = auftrag.dateien.map(d => {
    const name = A.freierName(d.name, [lokalOrdner, serverOrdner], vergeben);
    return { quelle: d, name, lokal: path.join(lokalOrdner, name), uebertragen: false, ziel: null };
  });

  // 5. Schreiben und prüfen (Fehler -> Abbruch vor dem Transfer)
  for (const d of dateien) {
    await d.quelle.speichern(d.lokal);
    let st = null;
    try { st = fs.statSync(d.lokal); } catch (e) { /* fehlt */ }
    if (!st || !(st.size > 0)) throw new Error(`Datei nicht geschrieben:\n${d.lokal}`);
  }

  // 6. Transfer: .teil, Größenvergleich, Umbenennen; Fehler -> lokal geparkt
  for (const d of dateien) {
    if (!serverOrdner) { geparkt.push(d.lokal); continue; }
    try { d.ziel = await A.sicherKopieren(d.lokal, serverOrdner, d.name); d.uebertragen = true; }
    catch (e) { geparkt.push(d.lokal); fehler.push(`${d.name}: Übertragung fehlgeschlagen (${e.code || e.message})`); }
  }

  // 7. DTF-Sammelordner: zusätzliche Kopie, Nummerierung gegen den Sammelordner; Fehler gilt nur für die DTF-Kopie
  const dtf = dateien.filter(d => (auftrag.dtf || []).includes(d.quelle.name));
  if (dtf.length) {
    const z = R.server.dtf_bestellen;
    if (!(await A.erreichbar(z, ms))) fehler.push(`DTF-Sammelordner nicht erreichbar, keine DTF-Kopie: ${z}`);
    else for (const d of dtf) {
      try { await A.sicherKopieren(d.lokal, z, A.freierName(d.name, [z])); }
      catch (e) { fehler.push(`${d.name}: DTF-Kopie fehlgeschlagen (${e.code || e.message})`); }
    }
  }

  // übertragene Dateien lokal löschen (Verschieben), leere lokale Ordner entfernen
  for (const d of dateien) if (d.uebertragen) { try { fs.unlinkSync(d.lokal); } catch (e) { fehler.push(`${d.lokal}: lokale Datei nicht gelöscht (${e.code || e.message})`); } }
  A.leereOrdnerWeg(lokalOrdner, R.lokal.ausgang);

  // 9. XMP: Eintrag in exporte[] (vor der Arbeitsdatei-Kopie, damit die Kopie ihn enthält)
  const alle = dateien.every(d => d.uebertragen);
  xmp =D.exportAnhaengen(xmp, {
    zeit: jetzt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    ordner: serverOrdner ? `${xmp.ablage.kundenordner}/${xmp.ablage.auftragsordner}` : null,
    dateien: dateien.map(d => ({ name: d.name, uebertragen: d.uebertragen })),
    uebertragen: alle
  });
  await u.xmpSchreiben(xmp);

  // 8. Arbeitsdatei: bei lokalem Arbeitsort nach erfolgreichem Transfer als Kopie in den Server-Auftragsordner (fortlaufend nummeriert)
  if (!R.arbeitsdateienServer && serverOrdner && alle && u.arbeitsdatei && u.arbeitsdatei.pfad) {
    try {
      if (u.arbeitsdatei.speichern) await u.arbeitsdatei.speichern();
      await A.sicherKopieren(u.arbeitsdatei.pfad, serverOrdner, A.freierName(path.basename(u.arbeitsdatei.pfad), [serverOrdner]));
    } catch (e) { fehler.push(`Arbeitsdatei nicht auf den Server kopiert (${e.code || e.message})`); }
  }

  // 10. Meldung nur bei Fehlern
  return { ok: !fehler.length && !geparkt.length, ordner: serverOrdner || lokalOrdner, dateien: dateien.map(d => d.ziel || d.lokal),
    geparkt, fehler, meldung: meldungstext(geparkt, fehler), xmp };
}

module.exports = { ZEITLIMIT_MS, Abbruch, kundenordnerSicherstellen, auftragsordnerFrei, exportieren, meldungstext };
