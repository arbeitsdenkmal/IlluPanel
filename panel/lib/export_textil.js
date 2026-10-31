/* Profil „textil“ (SPEZ_03_Textil §11) nach dem Muster von export_schild.js: nur die vordere Arbeitsdatei (ein Korrekturabzug).
 *   1. Arbeitsdatei speichern (ungespeichert -> Abbruch), Varianten-Erkennung.
 *   2. Prüfungen ohne Änderung (alle Befunde in einem Popup, kein Export): Motiv ohne Druckgröße, Druckgröße ohne Menge, Namen-Gruppe leer, breitester Name
 *      breiter als max_breite_mm − 2 × rand_mm oder ein Name höher als der Bogen, Ebene „Infos“ (IP.textilInfos mit nurPruefen). Flex/Flock nicht (Summa).
 *   3. Ebene „Infos“ füllen (Farbe, Druck, Datum, Motivzeilen).
 *   4. DTF und Stick je Motiv und Druckgröße <Menge>x_<Kunde>_<Position>_<Maß>[_blockout][_<ID>].pdf (IP.textilMotivPdf).
 *   5. Namen (DTF): Faktor aus dem breitesten Namen, Blocksatz, Bögen ≤ max_breite_mm × max_hoehe_mm, weitere Bögen über die Nummerierung des Exportkerns
 *      (IP.textilNamenPdf); Menge = Zahl der Namen.
 *   6. Korrekturabzug: Zeichenfläche 1 als <Kunde>_Korrekturabzug[_<ID>].pdf, danach Arbeitsdatei gespeichert (IP.pdfSpeichern).
 *   7. _<ID> in den Dateinamen, sobald im Auftragsordner (lokal ∪ Server) mehr als ein Korrekturabzug_*.ai liegt.
 *   8. Exportkern: Auftragsordner, Nummerierung ohne Überschreiben, DTF-Dateien (auch Namen-Bögen) zusätzlich in den Sammelordner export.sammelordner,
 *      Arbeitsdatei-Kopie, ein Eintrag in exporte[]; Popup nur bei Fehlern bzw. geparkten Dateien. */
"use strict";
const path = require("path");
const A = require("./ablage");
const D = require("./dokument");
const EX = require("./export");
const T = require("./teile");
const TX = require("./textil");

const PT_MM = 25.4 / 72;

/** Ordner mit Korrekturabzügen: Ordner der Arbeitsdatei und – erreichbar – der Server-Auftragsordner */
async function ordnerZaehlen(R, xmp, pfad) {
  const o = [path.dirname(pfad)], ab = xmp.ablage || {};
  if (ab.kundenordner && await A.erreichbar(R.server.kunden, EX.ZEITLIMIT_MS)) o.push(path.join(A.unter(R.server.kunden, ab.kundenordner), ab.auftragsordner));
  return o;
}

/**
 * Plan der Dateien ohne Änderung am Dokument. motive [{ ref, id, name, position, verfahren, stufen, namen [{ index, b_pt, h_pt }], anzahlNamen }],
 * kx { kunde, id (Modell-ID), mehrere, cfg (textil.json), preset, host }. Rückgabe { befunde, dateien [{ name, speichern }], dtf [Name] }
 */
function plan(motive, kx) {
  const befunde = TX.exportFehler(motive), dateien = [], dtf = [], cfg = kx.cfg;
  for (const m of motive) {
    if (TX.istGeschnitten(m.verfahren)) continue; // Flex/Flock über Summa
    (m.stufen || []).forEach((s, i) => {
      if (!(Number(s.mass_mm) > 0) || !(Number.isInteger(Number(s.menge)) && Number(s.menge) > 0)) return; // steht in exportFehler
      const mass_mm = Number(s.mass_mm), bezug = s.bezug === "Höhe" ? "Höhe" : "Breite", dtfDatei = m.verfahren === "DTF";
      const name = n => TX.motivName(A.dateiname, { menge: n, kunde: kx.kunde, position: m.position, mass_mm, blockout: dtfDatei && !!s.blockout, id: kx.id, mehrere: kx.mehrere });
      if (m.position === "Namen") {
        if (!m.namen.length) return; // steht in exportFehler
        const breitester = Math.max(...m.namen.map(n => n.b_pt)), pct = mass_mm / (breitester * PT_MM) * 100;
        let boegen;
        try { boegen = TX.namenBoegen(m.namen.map(n => ({ b: n.b_pt * PT_MM * pct / 100, h: n.h_pt * PT_MM * pct / 100 })), cfg.namen, cfg.rand_mm); }
        catch (e) { befunde.push(`„${m.name}“, Druckgröße ${i + 1}: ${e.message}`); return; }
        const datei = name(m.namen.length);
        boegen.forEach(bg => dateien.push({ name: datei, speichern: lokal => kx.host("textilNamenPdf", { ref: m.ref, id: m.id, pct, preset: kx.preset, datei: lokal,
          bogen: { breite_mm: bg.breite_mm, hoehe_mm: bg.hoehe_mm, namen: bg.namen.map(n => ({ index: m.namen[n.index].index, x_mm: n.x_mm, y_mm: n.y_mm })) } }) }));
        if (!dtf.includes(datei)) dtf.push(datei);
        return;
      }
      const datei = name(Number(s.menge));
      dateien.push({ name: datei, speichern: lokal => kx.host("textilMotivPdf", { ref: m.ref, id: m.id, bezug, mass_mm, rand_mm: cfg.rand_mm, datei: lokal, preset: kx.preset }) });
      if (dtfDatei && !dtf.includes(datei)) dtf.push(datei);
    });
  }
  return { befunde, dateien, dtf };
}

/**
 * Export bei vorderer Textil-Arbeitsdatei. ui { ordnerWaehlen(start), meldung(text) }. Rückgabe { zeilen } – Befunde der Prüfung bzw. Meldung des Exportkerns
 * (leer: keine Meldung).
 */
async function exportieren(host, konf, ui) {
  const info = await host("dokumentInfo");
  if (!info.hatDokument || !info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
  const pfad = info.pfad, X = D.xmpZugriff(host);
  await host("dokumentSpeichern", pfad);
  const xmp = await X.xmpLesen(), aa = konf.arten[xmp.auftragsart], tk = konf.textil.konfig;
  if (!tk) return { zeilen: konf.textil.fehler.map(f => `${f.datei}: ${f.grund}`) };
  const m = (xmp.textil && xmp.textil.modell) || {};

  // Varianten-Erkennung (SPEZ_02 §3.1), dann die Motive der Ebene „Design“ (Anzeigename „Objekt n“ wie beim Messen)
  const rollen = {}; aa.ebenen.forEach(e => { rollen[e.name] = e.rolle; });
  const neu = T.variantenErkennen((await host("objekteLesen", { rollen, messen: false, blaetter: false })).objekte);
  if (neu.length) await host("objektTagsSchreiben", neu);
  const motive = (await host("textilMotive", { ebene: aa.quelle.sandbox })).motive.map((o, i) => ({ ref: o.ref, id: o.id, name: o.name || `Objekt ${i + 1}`,
    position: o.tags.position, verfahren: o.tags.verfahren, stufen: TX.stufenVon(o.tags), namen: o.namen, anzahlNamen: o.tags.position === "Namen" ? o.namen.length : 0 }));

  const mehrere = TX.korrekturDateien(await ordnerZaehlen(konf.rechner, xmp, pfad), aa.dateien.arbeitsdatei).length > 1;
  const p = plan(motive, { kunde: xmp.kunde, id: m.id, mehrere, cfg: tk.cfg, preset: aa.export.preset, host });
  const infos = TX.infosZeilen(motive, xmp.textil && xmp.textil.farbe ? xmp.textil.farbe.name : "", new Date());
  try { await host("textilInfos", Object.assign({ nurPruefen: true }, infos)); } catch (e) { p.befunde.push(e.message); }
  if (p.befunde.length) return { zeilen: p.befunde };

  // Infos füllen, dann alle Dateien über den Exportkern; der Korrekturabzug zuletzt (speichert danach die Arbeitsdatei)
  await host("textilInfos", infos);
  p.dateien.push({ name: TX.korrekturName(A.dateiname, xmp.kunde, m.id, mehrere),
    speichern: lokal => host("pdfSpeichern", { datei: lokal, preset: aa.export.preset, artboardRange: "1", arbeitsdatei: pfad }) });
  const r = await EX.exportieren({ xmp: D.parsen((await host("xmpLesen", pfad)).text), dateien: p.dateien, dtf: p.dtf, sammelordner: aa.export.sammelordner }, {
    rechner: konf.rechner, ordnerWaehlen: ui.ordnerWaehlen, meldung: ui.meldung,
    xmpSchreiben: async o => { await host("xmpSchreiben", D.serialisieren(o), pfad); return o; },
    arbeitsdatei: { pfad, speichern: () => host("dokumentSpeichern", pfad) }
  });
  return { zeilen: r.meldung ? [r.meldung] : [] };
}

module.exports = { plan, exportieren };
