/* Rollenbreiten und Ränder aus config/medien.json (SPEZ_02 §7, aus dem alten Projekt übernommen).
 * Plott: Nutzbreite = Standardbreite − randabzug.plott (25 mm, Bogenhöhe höchstens).
 * Druck: Zeichenfläche = Außenkante der Grafik + opos_zugabe_mm + 2 × opos_marken_rand_mm (gleichmäßig je Seite);
 *        quer höchstens Rollenbreite − 2 × kantenhalter_mm; Grafik quer höchstens zusätzlich − Zuschlag. */
"use strict";

const eintrag = (MK, schluessel) => ((MK && MK.medien) || {})[schluessel] || {};
/** Standardbreite der Serie in mm oder null, wenn medien.json keine führt. */
function standardbreite(MK, schluessel) { const b = eintrag(MK, schluessel).standardbreite; return b > 0 ? b : null; }
/** Randabzug je Verfahren (plott | druck) in mm. */
function randabzug(MK, verfahren) { const r = ((MK && MK.randabzug) || {})[verfahren]; return Number(r) || 0; }
/** Druckwerte: rand_mm = Grafik bis Zeichenflächenrand je Seite (OPOS-Zugabe / 2 + Marken–Rand), zuschlag_mm = 2 × rand_mm;
 *  reserve_kontur_mm = Reserve je Seite für Objekte ohne Cutkontur (Stufe 12). */
function druck(MK) {
  const d = (MK && MK.druck) || {};
  const zugabe = Number(d.opos_zugabe_mm) || 0, marken = Number(d.opos_marken_rand_mm) || 0, kh = Number(d.kantenhalter_mm) || 0;
  return { opos_zugabe_mm: zugabe, opos_marken_rand_mm: marken, kantenhalter_mm: kh, rand_mm: zugabe / 2 + marken, zuschlag_mm: zugabe + 2 * marken, reserve_kontur_mm: Number(d.reserve_kontur_mm) || 0 };
}
/** Druck: Zeichenfläche quer höchstens (Rollenbreite − 2 × Kantenhalter), Grafik quer höchstens zusätzlich − Zuschlag. */
function zeichenflaecheMaxQuer(MK, breite) { return breite - 2 * druck(MK).kantenhalter_mm; }
function grafikMaxQuer(MK, breite) { return zeichenflaecheMaxQuer(MK, breite) - druck(MK).zuschlag_mm; }
/** Plott: Nutzbreite = Standardbreite − randabzug.plott; Druck: höchste Grafikbreite quer auf der Standardrolle. */
function nutzbreite(MK, schluessel, verfahren) {
  const b = standardbreite(MK, schluessel);
  if (b === null) return null;
  return verfahren === "druck" ? grafikMaxQuer(MK, b) : b - randabzug(MK, verfahren);
}
/** Vorrätige Breiten: Standardbreite zuerst, dann weitere aus „breiten“. */
function breiten(MK, schluessel) {
  const std = standardbreite(MK, schluessel);
  if (std === null) return [];
  return [std, ...(eintrag(MK, schluessel).breiten || []).filter(b => b !== std)];
}
/** Meldung, wenn eine verwendete Serie keine Standardbreite hat. */
const fehlt = schluessel => `Serie „${schluessel}“: keine Standardbreite in config/medien.json`;

module.exports = { standardbreite, randabzug, nutzbreite, breiten, fehlt, druck, zeichenflaecheMaxQuer, grafikMaxQuer };
