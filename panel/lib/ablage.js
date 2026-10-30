/* Ablage: Namen, Ordner, Nummerierung, Erreichbarkeit, sicherer Transfer (SPEZ_01 §7.2). Pfade kommen aufgelöst aus konfiguration.js;
 * hier gibt es kein /Volumes und keinen Laufwerksbuchstaben. */
"use strict";
const fs = require("fs");
const path = require("path");

/** Kundenname -> zulässiger Datei-/Ordnername (Umlaute umschreiben, unzulässige Zeichen ersetzen) – wie bisher */
function dateiname(s) {
  const um = { "ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss" };
  let r = String(s).replace(/[äöüÄÖÜß]/g, c => um[c]);
  r = r.normalize("NFD").replace(/[̀-ͯ]/g, "");
  r = r.replace(/[\/\\:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  return r || "Kunde";
}
const zweistellig = n => (n < 10 ? "0" : "") + n;
/** JJJJ-MM-TT (Ortszeit) */
const datum = d => `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}-${zweistellig(d.getDate())}`;
/** Auftragsordner JJJJ-MM-TT_<Produkt>; ohne Auftrag JJJJ-MM-TT_<Auftragsart> */
const auftragsordnerName = (jetzt, bezeichnung) => `${datum(jetzt)}_${dateiname(bezeichnung)}`;

/** n-te Fassung eines Namens: 1 -> Name.pdf, 2 -> Name_02.pdf … (bei Ordnern ohne Endung: Name, Name_02) */
function nummeriert(name, n) {
  if (n === 1) return name;
  const ext = path.extname(name), stamm = ext ? name.slice(0, -ext.length) : name;
  return `${stamm}_${zweistellig(n)}${ext}`;
}
const vorhanden = (ordner, name) => { try { fs.lstatSync(path.join(ordner, name)); return true; } catch (e) { return false; } };
/**
 * Erste freie Fassung von name, die in keinem der Ordner existiert (fehlende Ordner zählen als leer).
 * vergeben: Set schon vergebener Namen derselben Runde (wird ergänzt).
 */
function freierName(name, ordner, vergeben) {
  for (let n = 1; n < 1000; n++) {
    const k = nummeriert(name, n);
    if (vergeben && vergeben.has(k)) continue;
    if (ordner.filter(Boolean).some(o => vorhanden(o, k))) continue;
    if (vergeben) vergeben.add(k);
    return k;
  }
  throw new Error(`Keine freie Nummer für ${name}`);
}

/** Ordner erreichbar (fs.access) innerhalb ms – ein hängendes SMB blockiert das Panel nicht */
function erreichbar(ordner, ms) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(false), ms);
    fs.promises.access(ordner).then(() => { clearTimeout(t); resolve(true); }, () => { clearTimeout(t); resolve(false); });
  });
}

/** Kundenordner relativ zur Wurzel, genau zwei Ebenen darunter (<Buchstabe>/<Kunde>); sonst null. Rückgabe mit „/“. */
function kundenordnerRelativ(wurzel, gewaehlt, P) {
  const p = P || path;
  const rel = p.relative(p.resolve(wurzel), p.resolve(gewaehlt));
  if (!rel || rel.startsWith("..") || p.isAbsolute(rel)) return null;
  const teile = rel.split(p.sep).filter(Boolean);
  return teile.length === 2 ? teile.join("/") : null;
}
/** absoluter Pfad aus Wurzel und relativem Ordner („/“-getrennt) */
const unter = (wurzel, rel, P) => (P || path).join(wurzel, ...String(rel).split("/"));

/**
 * Sicherer Transfer: Kopie nach <ziel>/.<name>.teil, Größenvergleich, Umbenennen auf den Endnamen. Nie halbe Dateien unter Endnamen.
 * Fehler: .teil entfernen, Fehler weiterwerfen (Quelle bleibt unberührt).
 */
async function sicherKopieren(quelle, zielOrdner, name) {
  const teil = path.join(zielOrdner, `.${name}.teil`), ziel = path.join(zielOrdner, name);
  try {
    await fs.promises.copyFile(quelle, teil);
    const [a, b] = await Promise.all([fs.promises.stat(quelle), fs.promises.stat(teil)]);
    if (a.size !== b.size) throw new Error(`Größe weicht ab (${b.size} statt ${a.size} Byte)`);
    if (vorhanden(zielOrdner, name)) throw new Error(`${name} existiert bereits`);
    await fs.promises.rename(teil, ziel);
    return ziel;
  } catch (e) {
    try { await fs.promises.unlink(teil); } catch (x) { /* nicht entstanden */ }
    throw e;
  }
}

/** leere Ordner von innen nach außen entfernen, höchstens bis grenze (ausschließlich) */
function leereOrdnerWeg(ordner, grenze) {
  let o = path.resolve(ordner);
  const g = path.resolve(grenze);
  while (o.startsWith(g + path.sep)) {
    try { if (fs.readdirSync(o).length) return; fs.rmdirSync(o); } catch (e) { return; }
    o = path.dirname(o);
  }
}

module.exports = { dateiname, datum, auftragsordnerName, nummeriert, freierName, erreichbar, kundenordnerRelativ, unter, sicherKopieren, leereOrdnerWeg };
