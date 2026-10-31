/* Preisquellen-Schnittstelle (SPEZ_02 §4). Eine Quelle (Adapter) liefert nur Zeilen; Prüfung und Auflösung liegen hier.
 *   const pq = preisquelle(adapter, { medien })
 *   await pq.laden(auftragsart)  -> { ok, version, stand, quelle, zeilen[], fehler[] }   auftragsart = gilt_fuer-Schlüssel (fahrzeug | beschriftung | textil)
 *   pq.z(name, verfahren)        Minutenwert; Auflösung Auftragsart vor „alle“, Verfahren vor „alle“ [P §8.4]
 *   pq.serie(schluessel)         { verfahren, ek_m2, vk_m2, tape_vk_m2 } oder null
 *   pq.parameter(name)           Zahl oder null
 *   pq.aufschlaege()             [{ schluessel, bezeichnung, prozent | minuten }]
 *   pq.komplexitaet()            [{ stufe, prozent, bezeichnung }] aufsteigend
 * Adapter: { quelle, async lesen() -> { zeilen: [{ typ, schluessel, gilt_fuer, … } als Text oder Zahl], version, stand } }.
 * Stufe 2: preisquelle_csv.js; Stufe 3 ersetzt nur den Adapter (SDK). Prüfungen wie bisher [P §9] aus dem alten Projekt übernommen.
 * Textil Flex/Flock [P §13.5]: Serien mit verfahren flex bzw. flock (ek_m2/vk_m2 dürfen leer sein, null = ohne Preis), Zeitschlüssel je Verfahren flex/flock
 * oder alle, Pflichtparameter textil.mindest und textil.rundung. */
"use strict";

const SPALTEN = ["typ", "schluessel", "gilt_fuer", "bezeichnung", "verfahren", "ek_m2", "vk_m2", "tape_vk_m2", "minuten", "prozent", "wert"];
// andere Typen (z. B. platte der Schildlogik) werden ignoriert
const TYPEN = ["parameter", "serie", "zeit", "aufschlag", "komplexitaet"];
const GILT = ["fahrzeug", "beschriftung", "schild", "textil", "alle"];
const PFLICHT = ["stundensatz.vk", "stundensatz.produktion", "stundensatz.grafik", "mindest.produkt", "mindest.montage", "rundung", "mwst", "tape.min_schnittdichte", "tape.min_teiledichte"];
// Zeitschlüssel [P §8.4]: je Verfahren; datei_rip nur bei Druck; je Auftrag mit Verfahren „alle“
const ZEIT_VERFAHREN = ["ruesten", "datei_cut", "tape_m2", "produktion_m2", "teil", "schnitt_m", "trennen", "stueck", "montage_m2", "reinigen_m2", "montage_teil"];
const ZEIT_DRUCK = ["datei_rip"];
const ZEIT_AUFTRAG = ["auftrag_montage", "reinigen_m2"];
const KALKULIERT = ["fahrzeug", "beschriftung", "textil"];
// Textil Flex/Flock [P §13.4]: Zeitschlüssel je Verfahren flex und flock (Auflösung über „alle“), Pflichtparameter
const TEXTIL_VERFAHREN = ["flex", "flock"];
const ZEIT_TEXTIL = ["ruesten", "datei_cut", "teil", "schnitt_m", "trennen", "pressen", "falten"];
const PFLICHT_TEXTIL = ["textil.mindest", "textil.rundung"];

/** Zahl mit Dezimalkomma oder -punkt; Tausenderpunkt bei Komma-Schreibweise erlaubt ("1.260,00"); leer -> null, ungültig -> NaN */
function zahl(s) {
  if (typeof s === "number") return s;
  s = String(s == null ? "" : s).trim().replace(/\s|€|%/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}
const stufenNr = k => { const m = /(\d+)$/.exec(k); return m ? Number(m[1]) : NaN; };
const text = v => (v === null || v === undefined ? "" : String(v)).trim();

/**
 * Zeilen prüfen und Liste bauen [P §8, §9]. A = gilt_fuer der Auftragsart oder null (Startprüfung: nur allgemeine Prüfungen).
 * medien = config/medien.json: jede Serie braucht eine Standardbreite. Rückgabe { liste, fehler[] } – kein Werfen.
 */
function pruefen(zeilen, A, medien) {
  const f = [];
  const liste = { eintraege: { parameter: [], serie: [], zeit: [], aufschlag: [], komplexitaet: [] }, zeilen: [] };
  if (!zeilen || !zeilen.length) return { liste, fehler: ["Datei ist leer"] };
  const gesehen = new Set();
  const pflichtZahl = (ort, get, spalte) => {
    const v = zahl(get(spalte));
    if (v === null || Number.isNaN(v) || v < 0) { f.push(`${ort}: ${spalte} ungültig („${get(spalte)}“) – Zahl ≥ 0 erforderlich`); return null; }
    return v;
  };
  zeilen.forEach((z, n) => {
    const zn = z.zeile || n + 2;
    const get = s => text(z[s]);
    const typ = get("typ").toLowerCase(), key = get("schluessel"), gilt = get("gilt_fuer").toLowerCase(), verf = get("verfahren").toLowerCase();
    const ort = `Zeile ${zn} (${typ || "?"};${key || "?"}${gilt ? ";" + gilt : ""}${verf ? ";" + verf : ""})`;
    if (!TYPEN.includes(typ)) return;
    if (!key) { f.push(`${ort}: schluessel fehlt`); return; }
    const id = `${typ}|${key}|${gilt}|${verf}`;
    if (gesehen.has(id)) { f.push(`${ort}: doppelter Eintrag (gleicher typ, schluessel, gilt_fuer, verfahren)`); return; }
    gesehen.add(id);
    const e = { typ, schluessel: key, gilt_fuer: gilt, bezeichnung: get("bezeichnung") || key };
    if (!GILT.includes(gilt)) f.push(`${ort}: gilt_fuer muss fahrzeug, beschriftung, schild, textil oder alle sein („${get("gilt_fuer")}“)`);
    if (typ === "serie") {
      e.verfahren = verf;
      if (!["plott", "druck"].concat(TEXTIL_VERFAHREN).includes(verf)) f.push(`${ort}: verfahren muss plott, druck, flex oder flock sein („${get("verfahren")}“)`);
      // Flex/Flock: ek_m2/vk_m2 trägt Markus ein; leer = ohne Preis (berechnen bricht dann ab, Summa läuft) [P §13.5]
      const offen = s => TEXTIL_VERFAHREN.includes(verf) && get(s) === "";
      e.ek_m2 = offen("ek_m2") ? null : pflichtZahl(ort, get, "ek_m2"); e.vk_m2 = offen("vk_m2") ? null : pflichtZahl(ort, get, "vk_m2");
      // Tape optional, nur Druck; leer = kein Tape-Preis (Fehler erst, wenn ein Objekt Tape hat)
      e.tape_vk_m2 = get("tape_vk_m2") === "" ? null : pflichtZahl(ort, get, "tape_vk_m2");
      if (verf === "plott" && e.tape_vk_m2 !== null) f.push(`${ort}: tape_vk_m2 nur bei verfahren druck (beim Plott steckt Tape im vk_m2)`);
    } else if (typ === "zeit") {
      e.verfahren = verf;
      if (!["plott", "druck", "uv", "alle"].concat(TEXTIL_VERFAHREN).includes(verf)) f.push(`${ort}: verfahren muss plott, druck, uv, flex, flock oder alle sein („${get("verfahren")}“)`);
      e.minuten = pflichtZahl(ort, get, "minuten");
    } else if (typ === "aufschlag") {
      // [P §4.5, §9]: entweder prozent (Faktor auf die Montage) oder minuten (je m² Stückfläche), nicht beides, nicht keins
      const hatP = get("prozent") !== "", hatM = get("minuten") !== "";
      if (hatP === hatM) { f.push(`${ort}: entweder prozent oder minuten angeben (${hatP ? "beides" : "keins"} gesetzt)`); e.prozent = null; e.minuten = null; }
      else { e.prozent = hatP ? pflichtZahl(ort, get, "prozent") : null; e.minuten = hatM ? pflichtZahl(ort, get, "minuten") : null; }
    } else if (typ === "komplexitaet") {
      e.prozent = pflichtZahl(ort, get, "prozent");
      e.stufe = stufenNr(key);
      if (Number.isNaN(e.stufe)) f.push(`${ort}: Schlüssel einer Komplexitätsstufe muss mit der Stufennummer enden (z. B. stufe1)`);
    } else {
      e.wert = zahl(get("wert"));
      if (e.wert === null || Number.isNaN(e.wert) || e.wert < 0) { f.push(`${ort}: wert ungültig („${get("wert")}“) – Zahl ≥ 0 erforderlich`); e.wert = null; }
    }
    liste.eintraege[typ].push(e);
    liste.zeilen.push(e);
  });

  const E = liste.eintraege;
  // gilt_fuer: zuerst konkrete Auftragsart, dann „alle“
  const aufloesen = (typ, k, a) => E[typ].find(e => e.schluessel === k && e.gilt_fuer === a) || E[typ].find(e => e.schluessel === k && e.gilt_fuer === "alle") || null;
  // Zeitschlüssel: zuerst konkrete Auftragsart, dann „alle“; je Auftragsart zuerst konkretes Verfahren, dann „alle“
  const zeitEintrag = (k, a, v) => {
    const l = E.zeit.filter(e => e.schluessel === k);
    for (const g of [a, "alle"]) for (const x of [v, "alle"]) { const e = l.find(y => y.gilt_fuer === g && y.verfahren === x); if (e) return e; }
    return null;
  };
  const stufen = a => [...new Set(E.komplexitaet.filter(e => e.gilt_fuer === a || e.gilt_fuer === "alle").map(e => e.schluessel))]
    .map(k => aufloesen("komplexitaet", k, a)).sort((x, y) => x.stufe - y.stufe);
  PFLICHT.forEach(k => { if (!E.parameter.some(e => e.schluessel === k)) f.push(`Pflichtparameter „${k}“ fehlt`); });
  const fr = aufloesen("parameter", "preise_freigegeben", A || "alle");
  if (fr && fr.wert !== null && ![0, 1].includes(fr.wert)) f.push("preise_freigegeben muss 0 oder 1 sein");
  // Komplexitätsstufen aufsteigend (je Auftragsart, nach Auflösung): Prozent muss mit der Stufe steigen; Stufe 0 = Standard
  KALKULIERT.forEach(a => {
    const st = stufen(a);
    if (!st.length) return;
    if (st[0].stufe !== 0) f.push(`Komplexität (${a}): Stufe 0 fehlt`);
    for (let i = 1; i < st.length; i++) {
      const x = st[i - 1], y = st[i];
      if (x.prozent === null || y.prozent === null) continue;
      if (!(y.prozent > x.prozent)) f.push(`Komplexitätsstufen (${a}) nicht aufsteigend: ${x.schluessel} → ${y.schluessel} (Prozent muss steigen)`);
    }
  });
  // Serie ohne Standardbreite (config/medien.json)
  if (medien) [...new Set(E.serie.filter(e => e.verfahren === "plott" || e.verfahren === "druck").map(e => e.schluessel))].forEach(k => {
    const m = (medien.medien || {})[k];
    if (!(m && m.standardbreite > 0)) f.push(`Serie „${k}“: keine Standardbreite in config/medien.json`);
  });
  if (A) {
    if (!KALKULIERT.includes(A)) f.push(`Keine Kalkulation für „${A}“`);
    if (!stufen(A).length) f.push(`Keine Komplexitätsstufen für „${A}“ (weder ${A} noch alle)`);
    if (A === "textil") {
      TEXTIL_VERFAHREN.forEach(v => ZEIT_TEXTIL.forEach(k => { if (!zeitEintrag(k, A, v)) f.push(`Zeitschlüssel „${k}“ fehlt für Verfahren „${v}“ (${A})`); }));
      PFLICHT_TEXTIL.forEach(k => { if (!aufloesen("parameter", k, A)) f.push(`Pflichtparameter „${k}“ fehlt`); });
    } else {
      ["plott", "druck"].forEach(v => ZEIT_VERFAHREN.concat(v === "druck" ? ZEIT_DRUCK : []).forEach(k => { if (!zeitEintrag(k, A, v)) f.push(`Zeitschlüssel „${k}“ fehlt für Verfahren „${v}“ (${A})`); }));
      ZEIT_AUFTRAG.forEach(k => { if (!zeitEintrag(k, A, "alle")) f.push(`Zeitschlüssel „${k}“ fehlt (${A})`); });
    }
  }
  Object.assign(liste, { aufloesen, zeitEintrag, stufen });
  return { liste, fehler: f };
}

/** Preisquelle über einem Adapter; opts.medien = config/medien.json (Prüfung Standardbreite). */
function preisquelle(adapter, opts) {
  const medien = opts && opts.medien;
  let L = null, A = null;
  const geladen = () => { if (!L) throw new Error("Preisquelle nicht geladen"); return L; };
  return {
    async laden(auftragsart) {
      L = null; A = auftragsart || null;
      let roh;
      try { roh = await adapter.lesen(); }
      catch (e) { return { ok: false, version: null, stand: null, quelle: adapter.quelle, zeilen: [], fehler: [e.message] }; }
      const { liste, fehler } = pruefen(roh.zeilen, A, medien);
      if (!fehler.length) L = liste;
      return { ok: !fehler.length, version: roh.version === undefined ? null : roh.version, stand: roh.stand || null, quelle: adapter.quelle, zeilen: liste.zeilen, fehler };
    },
    z(name, verfahren) { const e = geladen().zeitEintrag(name, A, verfahren); return e ? e.minuten : null; },
    serie(schluessel) {
      const e = geladen().aufloesen("serie", schluessel, A);
      return e ? { verfahren: e.verfahren, ek_m2: e.ek_m2, vk_m2: e.vk_m2, tape_vk_m2: e.tape_vk_m2 } : null;
    },
    parameter(name) { const e = geladen().aufloesen("parameter", name, A); return e ? e.wert : null; },
    aufschlaege() {
      const l = geladen();
      return [...new Set(l.eintraege.aufschlag.map(e => e.schluessel))].map(k => l.aufloesen("aufschlag", k, A)).filter(Boolean)
        .map(e => (e.prozent !== null ? { schluessel: e.schluessel, bezeichnung: e.bezeichnung, prozent: e.prozent } : { schluessel: e.schluessel, bezeichnung: e.bezeichnung, minuten: e.minuten }));
    },
    komplexitaet() { return geladen().stufen(A).map(e => ({ stufe: e.stufe, prozent: e.prozent, bezeichnung: e.bezeichnung })); }
  };
}

module.exports = { preisquelle, pruefen, zahl, SPALTEN, PFLICHT, ZEIT_VERFAHREN, ZEIT_DRUCK, ZEIT_AUFTRAG, ZEIT_TEXTIL, PFLICHT_TEXTIL, TEXTIL_VERFAHREN };
