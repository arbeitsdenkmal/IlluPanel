/* Schild (SPEZ_03_Schild): Schild = Zeichenfläche mit Inhalt auf einer Produktionsebene (Plott, Digitaldruck, UV-Vorn, UV-Hinten), Nummer NN =
 * Reihenfolge der Zeichenfläche. Regeln ohne Oberfläche aus dem alten Projekt (sonderarten.js: schildRegeln, materialZuordnen, schildName), angepasst:
 * Zuordnung Eintrag in schild.schilder ↔ Zeichenfläche (Rechteck, sonst Name), Schildregeln (§8.2), Lochmitten (§6.1), Laserregel (§9.3), Dateinamen
 * (§9.4). Zeichenflächen-Rechtecke und Begrenzungen in pt (Illustrator, y nach oben), Maße in mm im Realmaß.
 * Dazu stand(): Zeichenflächen und Objekte über den JSX-Kern lesen und die Regeln prüfen (vor Summa, Druck und Export). */
"use strict";
const A = require("./ablage");

const PT_MM = 72 / 25.4;
const PRODUKTION = ["plott", "digitaldruck", "uv-vorn", "uv-hinten"];
const UV = ["uv-vorn", "uv-hinten"];
const ANORDNUNGEN = ["ecken", "mitte_oben_unten", "mitte_links_rechts", "keine"];
// Felder je Anordnung (Fenster „Schilder“ zeigt nur diese, gespeichert werden nur diese)
const FELDER = { ecken: ["abstand_x_mm", "abstand_y_mm", "durchmesser_mm"], mitte_oben_unten: ["abstand_y_mm", "durchmesser_mm"],
  mitte_links_rechts: ["abstand_x_mm", "durchmesser_mm"], keine: [] };
const TOL = 0.01;
const r2 = v => Math.round(v * 100) / 100;
const nn = i => String(i).padStart(2, "0");
const SCHILD = nr => `Schild ${nn(nr)}`;

// ---------- Zeichenflächen ----------
const schneidet = (b, r) => b[0] < r[2] && b[2] > r[0] && b[1] > r[3] && b[3] < r[1];
/** Zeichenfläche eines Objekts (Begrenzung in pt): Index, -1 (keine) oder „mehrere“ */
function zeichenflaecheVon(b, rechtecke) {
  const t = rechtecke.map((r, i) => (schneidet(b, r) ? i : -1)).filter(i => i >= 0);
  if (t.length > 1) return "mehrere";
  return t.length ? t[0] : -1;
}
/** Endmaß einer Zeichenfläche im Realmaß (mm, auf 0,01) */
const mass = (rect, massstab) => ({ breite_mm: r2((rect[2] - rect[0]) / PT_MM * (massstab || 1)), hoehe_mm: r2((rect[1] - rect[3]) / PT_MM * (massstab || 1)) });

/**
 * Zuordnung Eintrag ↔ Zeichenfläche wie materialZuordnen im alten Projekt: zuerst über das Rechteck (pt, 0,01 genau), sonst über den Namen; Umbenennen und
 * Umsortieren ändern die Zuordnung nicht. zeichenflaechen [{ name, rect }], schilder (XMP schild.schilder) -> je Zeichenfläche der Eintrag oder null
 */
const rectKey = r => r.map(v => r2(v)).join(",");
function zuordnen(zeichenflaechen, schilder) {
  const frei = (schilder || []).filter(Boolean).slice();
  const nimm = f => { const i = frei.findIndex(f); return i >= 0 ? frei.splice(i, 1)[0] : undefined; };
  const erg = zeichenflaechen.map(z => nimm(g => Array.isArray(g.rect) && rectKey(g.rect) === rectKey(z.rect)));
  return erg.map((e, i) => (e !== undefined ? e : nimm(g => g.name && g.name === zeichenflaechen[i].name) || null));
}
/** Bohrungen eines Eintrags, ohne Eintrag (oder ohne Angabe) bohrungen.standard */
const bohrungenVon = (eintrag, standard) => Object.assign({}, eintrag && eintrag.bohrungen ? eintrag.bohrungen : standard);
/** nur die Felder, die die Anordnung braucht */
function bohrungenKurz(b) {
  const r = { anordnung: b.anordnung };
  (FELDER[b.anordnung] || []).forEach(k => { r[k] = b[k]; });
  return r;
}

/**
 * schilder[] neu schreiben (§5): je Schild (inhalt[i]) ein Eintrag mit Rechteck, Name, nr, Endmaß und Bohrungen (bohrungen[i], sonst bisheriger Eintrag,
 * sonst Standard); weitere Felder eines bisherigen Eintrags bleiben. Zeichenflächen ohne Inhalt bekommen keinen Eintrag.
 */
function schilderSchreiben(zeichenflaechen, schilder, inhalt, opts) {
  const o = opts || {}, alt = zuordnen(zeichenflaechen, schilder), r = [];
  zeichenflaechen.forEach((z, i) => {
    if (!inhalt[i]) return;
    const b = o.bohrungen && o.bohrungen[i] ? o.bohrungen[i] : bohrungenVon(alt[i], o.standard);
    r.push(Object.assign({}, alt[i] || {}, { rect: z.rect.map(r2), name: z.name, nr: i + 1 }, mass(z.rect, o.massstab), { bohrungen: bohrungenKurz(b) }));
  });
  return r;
}

// ---------- Bohrungen (§6.1) ----------
/** Lochmitten in mm ab der linken oberen Ecke der Zeichenfläche (y nach unten); keine -> [] */
function lochmitten(breite, hoehe, b) {
  const x = b.abstand_x_mm, y = b.abstand_y_mm;
  if (b.anordnung === "ecken") return [{ x_mm: x, y_mm: y }, { x_mm: breite - x, y_mm: y }, { x_mm: x, y_mm: hoehe - y }, { x_mm: breite - x, y_mm: hoehe - y }];
  if (b.anordnung === "mitte_oben_unten") return [{ x_mm: breite / 2, y_mm: y }, { x_mm: breite / 2, y_mm: hoehe - y }];
  if (b.anordnung === "mitte_links_rechts") return [{ x_mm: x, y_mm: hoehe / 2 }, { x_mm: breite - x, y_mm: hoehe / 2 }];
  return [];
}
/** Lochmitten in pt (Dokumentkoordinaten) einer Zeichenfläche rect bei Maßstab massstab */
function lochmittenPt(rect, b, massstab) {
  const k = PT_MM / (massstab || 1), m = mass(rect, massstab);
  return lochmitten(m.breite_mm, m.hoehe_mm, b).map(p => [rect[0] + p.x_mm * k, rect[1] - p.y_mm * k]);
}
/** Prüfung bei OK (§6.1): Werte > 0, jede Bohrung ganz auf dem Schild (Abstand ≥ halber Durchmesser), keine Überschneidung -> true/false */
function bohrungenPassen(breite, hoehe, b) {
  if (!b || !ANORDNUNGEN.includes(b.anordnung)) return false;
  if (b.anordnung === "keine") return true;
  if (!FELDER[b.anordnung].every(k => typeof b[k] === "number" && b[k] > 0)) return false;
  const d = b.durchmesser_mm, h = d / 2;
  // je Achse: Abstand ≥ halber Durchmesser und zwei Bohrungen überschneiden sich nicht (2 × Abstand + Durchmesser ≤ Seite); mittig: Durchmesser ≤ Seite
  const paar = (abstand, seite) => abstand >= h - 1e-9 && 2 * abstand + d <= seite + 1e-9;
  if (b.anordnung === "ecken") return paar(b.abstand_x_mm, breite) && paar(b.abstand_y_mm, hoehe);
  if (b.anordnung === "mitte_oben_unten") return paar(b.abstand_y_mm, hoehe) && d <= breite + 1e-9;
  return paar(b.abstand_x_mm, breite) && d <= hoehe + 1e-9;
}

// ---------- Laser (§9.3) ----------
/** Laserdatei, wenn das Material Acryl ist und das Schild in eine der beiden Lagen von max_mm passt (Grenze eingeschlossen) */
function laserNoetig(material, breite, hoehe, max_mm) {
  if (!material || material.acryl !== true) return false;
  const [a, b] = max_mm;
  return (breite <= a + TOL && hoehe <= b + TOL) || (breite <= b + TOL && hoehe <= a + TOL);
}

// ---------- Dateinamen (§9.4) ----------
/** <Kunde>_<technik>_NN_<Kürzel>-<Stärke>.pdf, Stärke mit Komma bei Dezimalwerten */
const dateiname = (kunde, technik, nr, material) => `${A.dateiname(kunde)}_${technik}_${nn(nr)}_${material.kuerzel}-${String(material.staerke).replace(".", ",")}.pdf`;

// ---------- Schildregeln (§8.2) ----------
/** Bereich schild im XMP vollständig (Verfahren der Auftragsart, Material mit Kürzel und Stärke) */
const vollstaendig = (schild, aa) => !!(schild && aa.verfahren && aa.verfahren[schild.verfahren] && schild.material && schild.material.kuerzel && schild.material.staerke > 0);
const wo = o => (o.name ? `„${o.name}“` : `unbenanntes Objekt (${o.typ})`);
/** gleichartige Warnungen zusammenfassen: gleicher Text nach „Schild NN: “ -> „Schild 01, 02: …“ */
function zusammenfassen(zeilen) {
  const m = new Map(), r = [];
  zeilen.forEach(z => {
    const x = /^Schild (\d+): (.*)$/.exec(z);
    if (!x) { r.push(z); return; }
    if (!m.has(x[2])) { m.set(x[2], []); r.push(x[2]); }
    m.get(x[2]).push(x[1]);
  });
  return r.map(z => (m.has(z) ? `Schild ${m.get(z).join(", ")}: ${z}` : z));
}
/**
 * objekte: [{ name, typ, gb (pt, sichtbar), rolle }] (oberste Objekte der Produktionsebenen); zeichenflaechen: [{ name, rect }]; schild: XMP-Bereich; aa.
 * Rückgabe { fehler, warnungen, jeZf: [{ rollen: [...], inhalt, nr, breite_mm, hoehe_mm }] }. Objekte außerhalb jeder Zeichenfläche zählen nicht.
 */
function regeln(objekte, zeichenflaechen, schild, aa, massstab) {
  const fehler = [], warnungen = [];
  const jeZf = zeichenflaechen.map((z, i) => Object.assign({ rollen: new Set(), inhalt: false, nr: i + 1 }, mass(z.rect, massstab)));
  if (!vollstaendig(schild, aa)) fehler.push("Schild: Verfahren oder Material fehlt");
  const rects = zeichenflaechen.map(z => z.rect);
  for (const o of objekte) {
    if (!PRODUKTION.includes(o.rolle) || !o.gb) continue;
    const z = zeichenflaecheVon(o.gb, rects);
    if (z === "mehrere") { fehler.push(`${wo(o)} ragt über mehrere Zeichenflächen`); continue; }
    if (z < 0) continue;
    jeZf[z].inhalt = true; jeZf[z].rollen.add(o.rolle);
  }
  const m = schild && schild.material, [aw, ah] = aa.uv_max_mm || [420, 594];
  jeZf.forEach(z => {
    const uv = UV.some(r => z.rollen.has(r));
    if (uv && z.rollen.has("plott")) fehler.push(`${SCHILD(z.nr)}: UV und Plott zusammen`);
    if (z.rollen.has("uv-hinten") && m && m.acryl !== true) warnungen.push(`${SCHILD(z.nr)}: UV-Hinten auf ${m.bezeichnung}`);
    const w = z.breite_mm, h = z.hoehe_mm, gross = !((w <= aw + TOL && h <= ah + TOL) || (w <= ah + TOL && h <= aw + TOL));
    if (uv && gross) warnungen.push(`${SCHILD(z.nr)}: UV-Vorn bzw. UV-Hinten größer als A2 (${Math.round(w)} × ${Math.round(h)} mm)`);
  });
  return { fehler, warnungen: zusammenfassen(warnungen), jeZf: jeZf.map(z => Object.assign({}, z, { rollen: [...z.rollen] })) };
}

/** Ebenenname -> Rolle der Auftragsart */
const rollenVon = aa => { const r = {}; aa.ebenen.forEach(e => { r[e.name] = e.rolle; }); return r; };
/**
 * Stand des vorderen Dokuments: Zeichenflächen und oberste Objekte der Produktionsebenen (IP.schildLesen) und Schildregeln.
 * pfad (optional): Dokument mit diesem Pfad. Rückgabe { zeichenflaechen, objekte, regeln }
 */
async function stand(host, aa, xmp, pfad) {
  const r = await host("schildLesen", { rollen: rollenVon(aa) }, pfad || null);
  return { zeichenflaechen: r.zeichenflaechen, objekte: r.objekte, regeln: regeln(r.objekte, r.zeichenflaechen, xmp.schild, aa, xmp.massstab) };
}

/** Arten im Fenster „Objekt“ (§8.1): Arten der Ebenen des Verfahrens in der Reihenfolge Digitaldruck, Plott, UV-Vorn, UV-Hinten */
const REIHENFOLGE = ["digitaldruck", "plott", "uv-vorn", "uv-hinten"];
function arten(aa, schild) {
  const v = schild && aa.verfahren ? aa.verfahren[schild.verfahren] : null;
  if (!v) return [];
  return REIHENFOLGE.filter(k => (aa.arten || []).some(a => a.schluessel === k && v.ebenen.includes(a.ebene)));
}

/** Preisquelle ohne Auftragsart (nur allgemeine Prüfungen, Einträge „alle“) für Komplexitätsstufen, Aufschläge und Tape-Vorschlag; fehlerhaft -> leer */
const LEER = { serie: () => null, parameter: () => null, aufschlaege: () => [], komplexitaet: () => [], z: () => null };
async function preisquelleOhneArt(pq) {
  try { const pl = await pq.laden(null); return pl.ok ? pq : LEER; } catch (e) { return LEER; }
}

module.exports = { PT_MM, PRODUKTION, UV, ANORDNUNGEN, FELDER, SCHILD, nn, zeichenflaecheVon, mass, zuordnen, bohrungenVon, bohrungenKurz, schilderSchreiben,
  lochmitten, lochmittenPt, bohrungenPassen, laserNoetig, dateiname, vollstaendig, zusammenfassen, regeln, rollenVon, stand, arten, preisquelleOhneArt };
