/* Grafikzeit (SPEZ_02 §12): Zähllogik der Hintergrund-Extension und Puffer grafikzeit_puffer.json im Rechnerordner.
 * Gezählt wird nur, wenn gleichzeitig Illustrator vorn ist, die letzte Eingabe < 30 s her ist und das aktive Dokument einen Schlüssel hat
 * (Pfad der Arbeitsdatei; Druckbögen zählen nicht, SPEZ_02 Fassung 8 §12). Gerechnet wird mit Zeitstempeln (Abstand zwischen zwei Abfragen), Lücken
 * (Ruhezustand, Hänger) höchstens 15 s. Der Zähler schreibt nicht selbst; die Hintergrund-Extension hängt seine Einträge an den Puffer an.
 * Ins XMP schreibt nur das Panel: es übernimmt die Puffereinträge der vorderen Arbeitsdatei und entfernt genau die übernommenen Ids [B-15].
 * Puffer: { "<Pfad Arbeitsdatei>": [ { id, von, bis, sekunden } ] }; beide Seiten lesen–ändern–schreiben atomar (Temp-Datei + Umbenennen). */
"use strict";
const fs = require("fs");
const path = require("path");
const K = require("./konfiguration");
const D = require("./dokument");
const { neueId } = require("./teile");

const PUFFER = "grafikzeit_puffer.json";

/** Ort des Puffers: Rechnerordner (Ordner der rechner.json; macOS ~/Library/Application Support/PAM-Werkzeuge, Windows %APPDATA%\PAM-Werkzeuge) */
const pufferDatei = opts => path.join(path.dirname(K.rechnerOrt(opts)), PUFFER);
/** Schlüssel im Puffer: Pfad in Unicode-NFC (macOS liefert Umlaute in Ereignisdaten und fsName nicht immer gleich zusammengesetzt) */
const schluessel = pfad => String(pfad || "").normalize("NFC");

/** Puffer lesen; fehlt oder ungültig -> {} */
function pufferLesen(datei) {
  try {
    const p = JSON.parse(fs.readFileSync(datei, "utf8"));
    return p && typeof p === "object" && !Array.isArray(p) ? p : {};
  } catch (e) { return {}; }
}
function atomarSchreiben(datei, p) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const tmp = `${datei}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(p, null, 1));
  fs.renameSync(tmp, datei);
}
/** Lesen, ändern, atomar schreiben (Hintergrund-Extension und Panel schreiben in dieselbe Datei); leere Listen entfallen */
function pufferAendern(datei, fn) {
  const p = pufferLesen(datei);
  fn(p);
  for (const k of Object.keys(p)) if (!Array.isArray(p[k]) || !p[k].length) delete p[k];
  atomarSchreiben(datei, p);
  return p;
}

/** Eintrag { von, bis, sekunden } des Zählers mit neuer Id an den Puffer anhängen */
function anhaengen(datei, pfad, eintrag) {
  const k = schluessel(pfad);
  pufferAendern(datei, p => { (p[k] = Array.isArray(p[k]) ? p[k] : []).push(Object.assign({ id: neueId() }, eintrag)); });
}
/** Puffereinträge zum Pfad (unverändert, mit Id) */
const eintraegeVon = (datei, pfad) => { const l = pufferLesen(datei)[schluessel(pfad)]; return Array.isArray(l) ? l.filter(e => e && e.id) : []; };
/** genau diese Ids zum Pfad entfernen (neu gelesen: inzwischen angehängte Einträge bleiben) */
function entfernen(datei, pfad, ids) {
  const k = schluessel(pfad), weg = new Set(ids);
  if (!weg.size) return;
  pufferAendern(datei, p => { if (Array.isArray(p[k])) p[k] = p[k].filter(e => !e || !weg.has(e.id)); });
}

/** Minuten = Sekunden/60 auf 0,1 gerundet [B-16] */
const minuten = sekunden => Math.round((Number(sekunden) || 0) / 60 * 10) / 10;
/** XMP-Eintrag aus einem Puffereintrag [B-16] */
const eintragAuto = e => ({ von: e.von, bis: e.bis, minuten: minuten(e.sekunden), manuell: false, benutzer: null, uebertragen: false });
/** XMP-Eintrag „+m“: ganze Minuten, auch negativ; von = bis = jetzt [R 4.8, B-16] */
function eintragManuell(min, jetzt) {
  const t = (jetzt || new Date()).toISOString();
  return { von: t, bis: t, minuten: min, manuell: true, benutzer: null, uebertragen: false };
}
/** Feld „+m“: ganze Zahl ungleich 0 (Vorzeichen erlaubt), sonst null (nichts eintragen) */
function manuellLesen(text) {
  const t = String(text == null ? "" : text).trim();
  if (!/^[+-]?\d+$/.test(t)) return null;
  const n = Number(t);
  return n === 0 ? null : n;
}

/**
 * Übernahme vorbereiten: Puffereinträge zum Pfad als XMP-Einträge an grafikzeit.eintraege des Dokumentobjekts anhängen, dazu ggf. weitere
 * (manuell). Rückgabe { xmp, ids } oder null, wenn nichts anzuhängen ist (dann kein XMP-Schreiben). Nach dem Schreiben ins XMP: entfernen(ids).
 */
function uebernahme(datei, pfad, xmp, weitere) {
  const p = pfad ? eintraegeVon(datei, pfad) : [];
  const neu = p.map(eintragAuto).concat(weitere || []);
  if (!neu.length) return null;
  const r = JSON.parse(JSON.stringify(xmp));
  if (!r.grafikzeit || typeof r.grafikzeit !== "object") r.grafikzeit = {};
  if (!Array.isArray(r.grafikzeit.eintraege)) r.grafikzeit.eintraege = [];
  r.grafikzeit.eintraege.push(...neu);
  return { xmp: r, ids: p.map(e => e.id) };
}
/**
 * Übernahme ins XMP über den JSX-Kern (host = evalScript-Brücke), nur Panel und „Zusammenfassung“: vordere Arbeitsdatei; bei vorderem Druckbogen nur
 * mit opts.druckbogen (Export) die Arbeitsdatei aus bogen.arbeitsdatei, wenn sie offen ist. opts.weitere = zusätzliche Einträge („+m“).
 * Kein XMP-Schreiben ohne neue Einträge. Rückgabe true, wenn geschrieben wurde.
 */
async function uebernehmenXmp(host, datei, opts) {
  const o = opts || {};
  const i = await host("dokumentInfo");
  if (!i.hatDokument) return false;
  let vorn = null;
  try { vorn = D.parsen(i.xmp); } catch (e) { return false; }
  if (!vorn) return false;
  let pfad = i.pfad || null, xmp = vorn;
  if (vorn.rolle === "druckbogen") {
    pfad = o.druckbogen && vorn.bogen && typeof vorn.bogen.arbeitsdatei === "string" ? vorn.bogen.arbeitsdatei : null;
    if (!pfad) return false;
    try { xmp = D.parsen((await host("xmpLesen", pfad)).text); } catch (e) { return false; } // Arbeitsdatei nicht offen
    if (!xmp || xmp.rolle !== "arbeitsdatei") return false;
  } else if (vorn.rolle !== "arbeitsdatei") return false;
  const u = uebernahme(datei, datei && pfad ? pfad : null, xmp, o.weitere);
  if (!u) return false;
  if (pfad) await host("xmpSchreiben", D.serialisieren(u.xmp), pfad); else await host("xmpSchreiben", D.serialisieren(u.xmp));
  entfernen(datei, pfad, u.ids);
  return true;
}

/** Anzeige „Grafik N min“: Σ aller Einträge, ganzzahlig gerundet [B-16] */
const summeMinuten = xmp => {
  const e = xmp && xmp.grafikzeit && Array.isArray(xmp.grafikzeit.eintraege) ? xmp.grafikzeit.eintraege : [];
  return Math.round(e.reduce((s, x) => s + (Number(x.minuten) || 0), 0));
};

/** Zähllogik ohne Ein-/Ausgabe (testbar mit simulierten Ticks). schreiben(schluessel, { von, bis, sekunden }) legt einen Eintrag ab. */
class Zaehler {
  constructor({ schreiben, leerlauf_max_s = 30, maxLuecke_s = 15, buendel_s = 60 } = {}) {
    Object.assign(this, { schreiben, leerlauf_max_s, maxLuecke_s, buendel_s });
    this.letzte = null; this.offen = null; this.letzteSchreibung = null;
  }
  /** t in ms, z = { vorne, leerlauf_s, schluessel: Pfad der Arbeitsdatei | null } */
  tick(t, z) {
    const aktiv = !!(z.vorne && z.leerlauf_s < this.leerlauf_max_s && z.schluessel);
    const k = aktiv ? z.schluessel : null;
    if (this.offen && this.offen.schluessel !== k) this.flush(t); // Dokumentwechsel bzw. Ende der Aktivität
    if (aktiv && this.letzte !== null) {
      const dt = Math.min((t - this.letzte) / 1000, this.maxLuecke_s);
      if (dt > 0) {
        if (!this.offen) this.offen = { schluessel: k, von: this.letzte, sekunden: 0 };
        this.offen.sekunden += dt; this.offen.bis = t;
      }
    }
    this.letzte = t;
    if (this.letzteSchreibung === null) this.letzteSchreibung = t;
    if (this.offen && (t - this.letzteSchreibung) / 1000 >= this.buendel_s) this.flush(t);
  }
  flush(t) {
    if (this.offen && this.offen.sekunden > 0) {
      const o = this.offen;
      this.schreiben(o.schluessel, { von: new Date(o.von).toISOString(), bis: new Date(o.bis).toISOString(), sekunden: Math.round(o.sekunden * 10) / 10 });
    }
    this.offen = null; this.letzteSchreibung = t;
  }
}

module.exports = { PUFFER, pufferDatei, uebernehmenXmp, schluessel, pufferLesen, pufferAendern, anhaengen, eintraegeVon, entfernen, minuten, eintragAuto, eintragManuell,
  manuellLesen, uebernahme, summeMinuten, Zaehler };
