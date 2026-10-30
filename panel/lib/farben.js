/* Oracal-Farbfeldbibliotheken (SPEZ_02 §4, §5): config/serien.json und config/farbfelder/*.ase lesen, Farbfeldnamen erkennen.
 * Erkennung über den Namen "NNN (<namenszusatz>)", tolerant gegenüber Illustrators Duplikat-Zusatz
 * (z. B. "020 (751 C) 1", wenn dieselbe Farbe mit abweichenden Werten erneut ins Dokument geholt wird). Aus dem alten Projekt übernommen. */
"use strict";
const fs = require("fs");
const path = require("path");
const { lesen, labZuRgb } = require("./ase");

/** serien.json und die ASE-Dateien lesen; Fehler als Liste { datei, grund } (konfiguration.js macht daraus das Start-Popup). */
function serienLaden(configOrdner) {
  const datei = path.join(configOrdner, "serien.json"), fehler = [];
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(datei, "utf8")); }
  catch (e) { return { serien: [], fehler: [{ datei, grund: e.code === "ENOENT" ? "Datei fehlt" : e instanceof SyntaxError ? `kein gültiges JSON (${e.message})` : `nicht lesbar (${e.code || e.message})` }] }; }
  if (!cfg || !Array.isArray(cfg.serien) || !cfg.serien.length) return { serien: [], fehler: [{ datei, grund: "Feld serien fehlt oder ist leer" }] };
  const serien = [];
  cfg.serien.forEach((s, i) => {
    const fehlt = ["bibliothek", "datei", "namenszusatz", "schluessel", "preisserie"].filter(f => !(s && typeof s[f] === "string" && s[f]));
    if (fehlt.length) { fehler.push({ datei, grund: `serien[${i}]: Feld ${fehlt.join(", ")} fehlt` }); return; }
    const ase = path.join(configOrdner, "farbfelder", s.datei);
    let roh;
    try { roh = lesen(ase); }
    catch (e) { fehler.push({ datei: ase, grund: e.code === "ENOENT" ? "Datei fehlt" : `nicht lesbar (${e.code || e.message})` }); return; }
    const farben = roh.map(f => {
      const m = /^(\d+)\s*\((.+)\)$/.exec(f.name);
      const nummer = m ? m[1] : f.name;
      return { name: f.name, nummer, schluessel: `${s.schluessel}-${nummer}`, serie: s.schluessel, preisserie: s.preisserie, bibliothek: s.bibliothek, lab: f.lab, rgb: f.lab ? labZuRgb(f.lab) : null };
    });
    serien.push(Object.assign({}, s, { farben }));
  });
  return { serien, fehler };
}

/** Nachschlagen: erkennen(Farbfeldname) und nachSchluessel(Folienschlüssel, z. B. „751C-031“) -> Bibliothekseintrag oder null. */
function verzeichnis(serien) {
  const nachZusatz = {}, nachName = {}, nachSchl = {};
  for (const s of serien) {
    nachZusatz[s.namenszusatz] = s;
    for (const f of s.farben) { nachName[f.name] = f; nachSchl[f.schluessel] = f; }
  }
  function erkennen(name) {
    if (!name) return null;
    if (nachName[name]) return nachName[name];
    const m = /^(\d+)\s*\((.+)\)(?:\s+\d+)?$/.exec(String(name).trim());
    if (!m || !nachZusatz[m[2]]) return null;
    return nachName[`${m[1]} (${m[2]})`] || null;
  }
  const nachSchluessel = k => nachSchl[k] || null;
  /** Folienschlüssel einer Plott-Serie (Form <schluessel>-NNN mit bekannter Serie, auch ohne Eintrag in der Bibliothek)? */
  const istPlottSchluessel = k => serien.some(s => String(k || "").startsWith(s.schluessel + "-"));
  return { serien, erkennen, nachSchluessel, istPlottSchluessel };
}

module.exports = { serienLaden, verzeichnis };
