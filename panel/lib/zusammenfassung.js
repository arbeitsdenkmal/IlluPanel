/* Fenster „Zusammenfassung“ und <Kunde>_Zusammenfassung.pdf (SPEZ_02 §9, MockUp C3) ohne Oberfläche: Zeilen der Objekttabelle aus der aktuellen
 * Objektliste (IP.objekteLesen ohne Messen) und dem letzten Datensatz, Folien und Summen aus dem Datensatz. Gemeinsam für Fenster und PDF.
 * Anzahl, Folie und Attribute kommen aus den Tags (aktueller Stand), Teile, m², Betrag und inkl. M. aus dem Datensatz (sonst „–“). */
"use strict";
const Z = require("./zuordnen");

const STRICH = "–";
const ATTR = { sicke: "Sicke", woelbung: "Wölbung" };

/**
 * @param objekte  IP.objekteLesen (Ebenenreihenfolge; rolle je Objekt)
 * @param ds       Kalkulationsdatensatz (XMP kalkulation) oder null
 * @param kx       { aa, farben, medien }
 * @returns { objekte: [zeile], ohne: [zeile] }  zeile { o, name, variante, eingerueckt, verfahren, anzahl, folie: {text, rgb}, attribute, teile, m2, betrag, inkl, d }
 */
function zeilen(objekte, ds, kx) {
  const dsObj = ds && Array.isArray(ds.objekte) ? ds.objekte : [];
  const zug = objekte.filter(o => (o.rolle === "plott" || o.rolle === "digitaldruck") && o.tags && o.tags.folie);
  const ohne = objekte.filter(o => o.rolle === "sandbox" || ((o.rolle === "plott" || o.rolle === "digitaldruck") && !(o.tags && o.tags.folie)));
  // Anzeigename [A-1]: Illustrator-Name, sonst Name aus dem Datensatz, sonst „Objekt n“ in Ebenenreihenfolge (Ohne Zuordnung zählt weiter)
  const zeile = (o, nr) => {
    const d = o.tags.id ? dsObj.find(x => x.id === o.tags.id) || null : null;
    const art = Z.artNachTag(o, kx.farben), verfahren = art === "plott" ? "plott" : art === "digitaldruck" ? "druck" : null;
    const anzahl = Z.anzahlVon(o.tags.anzahl);
    let folie = { text: "", rgb: null };
    if (verfahren === "plott" && d && d.folien.length) { const c = kx.farben.nachSchluessel(d.folien[0]); folie = { text: d.folien.join(", "), rgb: c && c.rgb ? c.rgb : null }; }
    else if (verfahren) folie = Z.folieAnzeige(o, kx);
    const a = [];
    if (verfahren) {
      const k = Z.komplexitaetVon(o);
      if (k > 0 && Z.komplexitaetGilt(o, art)) a.push(`K${k}`);
      Z.attributeVon(o.tags.attribute).forEach(x => { if (ATTR[x]) a.push(ATTR[x]); });
      if (verfahren === "druck" && (Z.attributeVon(o.tags.attribute).includes("tape") || (d && d.tape))) a.push("Tape");
    }
    return { o, d, name: o.name || (d && d.name) || `Objekt ${nr}`, variante: !!o.tags.original, eingerueckt: false, verfahren,
      anzahl: anzahl === null ? String(o.tags.anzahl) : anzahl, folie, attribute: a.join(", "),
      teile: d ? d.teile : null, m2: d ? Math.round(d.flaeche_m2 * d.anzahl * 100) / 100 : null,
      betrag: d ? d.betraege.produkt_vk : null, inkl: d ? Math.round((d.betraege.produkt_vk + d.betraege.montage_vk) * 100) / 100 : null };
  };
  const z = zug.map((o, i) => zeile(o, i + 1));
  // Varianten eingerückt unter dem Original (in Ebenenreihenfolge); fehlt das Original, bleibt die Variante an ihrem Platz
  const ids = new Set(z.map(x => x.o.tags.id).filter(Boolean));
  const sortiert = [];
  z.filter(x => !(x.variante && ids.has(x.o.tags.original) && x.o.tags.original !== x.o.tags.id)).forEach(x => {
    sortiert.push(x);
    if (x.o.tags.id) z.filter(v => v.variante && v.o.tags.original === x.o.tags.id && v !== x).forEach(v => { v.eingerueckt = true; sortiert.push(v); });
  });
  const o2 = ohne.map((o, i) => ({ o, d: null, name: o.name || `Objekt ${z.length + i + 1}`, variante: false, eingerueckt: false, verfahren: null, ebene: o.ebene }));
  return { objekte: sortiert, ohne: o2 };
}

/** Folien aus dem Datensatz: Folie (Plott Schlüssel mit Chip, Druck „Medium Laminat“), Rolle, Bögen, lfm, m² Verbrauch, EK */
function folien(ds, kx) {
  return (ds && Array.isArray(ds.folien) ? ds.folien : []).map(f => {
    const c = f.verfahren === "plott" ? kx.farben.nachSchluessel(f.schluessel) : null;
    return { text: f.verfahren === "plott" ? f.schluessel : `${f.schluessel} ${Z.laminatName(kx.aa, f.laminat)}`.trim(), rgb: c && c.rgb ? c.rgb : null,
      rolle: f.rollenbreite_mm, boegen: f.boegen, lfm: f.lfm, verbrauch: f.verbrauch_m2, ek: f.ek };
  });
}

/** Summen: Material (inkl. Tape-Material), Produktion und Montage (min und € mit dem VK-Satz; Montage davon je Auftrag), Preise, Mindestbetrag, Grafik */
function summen(ds) {
  const S = ds.stundensaetze.vk / 60, o = ds.objekte || [], A = ds.auftrag;
  const montageObjekte = o.reduce((s, x) => s + x.minuten.montage, 0);
  const g = ds.preise.mindestbetrag_greift || {};
  return {
    material: o.reduce((s, x) => s + x.betraege.material + x.betraege.tape, 0),
    produktion_min: A.produktion_min, produktion: A.produktion_min * S,
    montage_min: A.montage_min, montage_auftrag_min: Math.max(0, A.montage_min - montageObjekte), montage: A.montage_min * S,
    vk: ds.preise.vk, mindest: ds.preise.mindest, greift: g.vk ? g : { vk: g, mindest: {} }, mwst: ds.mwst, satz_mindest: ds.stundensaetze.mindest, // 2a: nur VK
    grafik: ds.grafik
  };
}

const zahl = (v, d) => (v === null || v === undefined ? STRICH : Z.zahl(v, d));

module.exports = { zeilen, folien, summen, zahl, STRICH };
