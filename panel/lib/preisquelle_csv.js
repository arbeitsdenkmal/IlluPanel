/* Entwicklungsquelle der Preise (SPEZ_02 §4, R 6.4): Infos/Stammdaten/preisliste.csv relativ zum Erweiterungsordner, eine Datei im Repo.
 * UTF-8, Semikolon, Dezimalkomma/-punkt; bei jedem laden() neu eingelesen. version = null (kein Hash), stand = Änderungszeit der Datei,
 * quelle = "csv". Kein Einstellungsfenster, kein wählbarer Pfad. Stufe 3 ersetzt dieses Modul durch den SDK-Adapter. */
"use strict";
const fs = require("fs");
const path = require("path");
const { preisquelle, SPALTEN } = require("./preisquelle");

const DATEI = ["Infos", "Stammdaten", "preisliste.csv"];
const csvPfad = ext => path.join(ext, ...DATEI);

// CSV mit Semikolon, Anführungszeichen erlaubt, UTF-8 (BOM wird entfernt)
function csvZeilen(text) {
  text = text.replace(/^﻿/, "");
  const zeilen = [];
  let feld = "", zeile = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; }
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === ";") { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld); feld = "";
      zeilen.push(zeile); zeile = [];
    } else feld += c;
  }
  if (feld !== "" || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  return zeilen;
}

/** CSV-Text -> Zeilenobjekte { zeile (Nummer in der Datei), typ, schluessel, … }; fehlende Spalte in der Kopfzeile -> Error */
function zeilenAusText(text) {
  const roh = csvZeilen(text), out = [];
  if (!roh.length) return out;
  const kopf = roh[0].map(h => h.trim().toLowerCase()), fehlt = SPALTEN.filter(s => !kopf.includes(s));
  if (fehlt.length) throw new Error(fehlt.map(s => `Spalte „${s}“ fehlt in der Kopfzeile`).join("\n"));
  roh.slice(1).forEach((z, n) => {
    if (!z.some(f => f.trim() !== "")) return;
    const o = { zeile: n + 2 };
    SPALTEN.forEach(s => { o[s] = z[kopf.indexOf(s)] || ""; });
    out.push(o);
  });
  return out;
}

/** Adapter für preisquelle(): liest die Datei bei jedem Aufruf neu */
function adapter(ext, datei) {
  const pfad = datei || csvPfad(ext);
  return {
    quelle: "csv",
    pfad,
    async lesen() {
      let text, st;
      try { text = fs.readFileSync(pfad, "utf8"); st = fs.statSync(pfad); }
      catch (e) { throw new Error(`Preisliste nicht lesbar (${pfad}: ${e.code || e.message})`); }
      return { zeilen: zeilenAusText(text), version: null, stand: st.mtime.toISOString().replace(/\.\d{3}Z$/, "Z") };
    }
  };
}

/** Preisquelle über der CSV im Erweiterungsordner; opts { medien, datei (nur Tests) } */
function erstellen(ext, opts) {
  const o = opts || {};
  return preisquelle(adapter(ext, o.datei), { medien: o.medien });
}

module.exports = { erstellen, adapter, csvPfad, csvZeilen, zeilenAusText };
