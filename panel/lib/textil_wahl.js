/* Textil-Wahl (SPEZ_03_Textil §4, §6; Darstellung SPEZ_03_Oberflaeche §4, §9, §10) – eine Komponente für „Auftrag anlegen“, Fenster „Modell“ und Fenster
 * „Textilfarbe“, aus dem alten Projekt (farbraster.js, Marken/Modelle aus anlegen.js und modell.js) übernommen. DOM über el.ownerDocument, Stil wird einmal je
 * Dokument eingefügt; Buttons und Zustand `an` aus fenster.css.
 *   farbraster: Kacheln in CSV-Reihenfolge (Farbfläche aus hex, Name darunter einzeilig mit Ellipse, voller Name als Tooltip), Klick wählt nur aus; Spaltenzahl
 *     und Flächenhöhe als Parameter (Auftrag 6 / 22 px, Textilfarbe 5 / 40 px, Modell 4 / 26 px); ohne Einträge Freitextfeld „Farbe“; ein gespeicherter Name ohne
 *     Listeneintrag als eigene Kachel ohne Farbfläche.
 *   modellwahl: Marken-Buttons (textil.json „marken“; gesperrt ohne Modell mit MockUp), die Modelle der Marke (Text bezeichnung, leer modell; nur Modelle mit
 *     MockUp-Datei), nach Wahl des Modells das Farbraster. Darstellung „untereinander“ (Dialog „Auftrag“: Marken in einer Reihe, Modelle in 3 Spalten, Raster
 *     höchstens 150 px hoch) oder „spalten“ (Fenster „Modell“: drei Spalten Marke · Modell · Farbe, Überschriften stehen immer). Marken- oder Modellwechsel setzt
 *     die Farbwahl zurück.
 * Ergebnis als Wahl-Objekt textil { modell, farbe: { name, cmyk | null } | null } (§2.4). */
"use strict";

const STIL = `
.tw-titel { color: var(--muted); font-size: 11px; margin-bottom: 2px; }
.tw-titel.lbl { text-transform: uppercase; letter-spacing: .04em; }
.tw-reihe { display: flex; flex-wrap: wrap; gap: 4px; }
.tw-modelle { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
.tw-liste { display: flex; flex-direction: column; gap: 3px; }
.tw-liste .tw-knopf { width: 100%; text-align: left; flex: none; }
.tw-spalten .tw-liste { overflow-y: auto; min-height: 0; }
.tw-knopf { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 6px; }
.tw-unter { display: flex; flex-direction: column; gap: 8px; }
.tw-spalten { display: grid; grid-template-columns: 110px 130px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 12px; height: 100%; min-height: 0; }
.tw-spalten > div { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.tw-spalten > div + div { border-left: 1px solid var(--line); padding-left: 12px; }
.tw-farbe { display: flex; flex-direction: column; min-height: 0; }
.tw-spalten .tw-farbe, .tw-fuellen { flex: 1 1 auto; }
.tw-raster { display: grid; gap: 4px; padding: 2px; overflow-y: auto; align-content: start; }
.tw-rahmen { border: 1px solid var(--line); border-radius: 3px; max-height: 150px; }
.tw-fuellen .tw-raster, .tw-spalten .tw-raster { flex: 1 1 auto; min-height: 0; }
.tw-raster .tw-kachel { display: flex; flex-direction: column; align-items: stretch; gap: 2px; height: auto; min-width: 0; padding: 3px; margin: 0; border: 1px solid transparent; border-radius: 3px; background: none; color: var(--fg); font: inherit; font-size: 11px; cursor: pointer; }
.tw-raster .tw-kachel.an { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); background: color-mix(in srgb, var(--accent) 22%, transparent); font-weight: 600; }
.tw-flaeche { display: block; border: 1px solid #999; border-radius: 2px; }
.tw-ohne { border-style: dashed; background: none; }
.tw-name { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
.tw-frei { display: flex; flex-direction: column; gap: 2px; color: var(--muted); font-size: 12px; }
.tw-frei input { width: 100%; }
`;
function stil(d) { if (!d.getElementById("twStil")) { const s = d.createElement("style"); s.id = "twStil"; s.textContent = STIL; d.head.appendChild(s); } }
const neu = (d, tag, cls, text) => { const x = d.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };

/**
 * Farbraster in el (ersetzt den Inhalt). opts { liste: [{ farbe, hex, cmyk }] (Farben des Modells), wert (vorgewählter Name), aenderung, spalten (Standard 6),
 * flaeche (Höhe der Farbfläche in px, Standard 22), titel (Überschrift „Farbe“: "cap" | "lbl" | null = ohne), rahmen (Rand und höchstens 150 px hoch) }.
 * Rückgabe { liste (Kacheln statt Freitext), farbe() -> { name, cmyk | null } | null, gueltig() (Liste: eine Kachel gewählt; Freitext darf leer sein) }
 */
function farbraster(el, opts) {
  const o = opts || {}, d = el.ownerDocument, liste = o.liste || [];
  stil(d);
  let w = String(o.wert || "");
  el.replaceChildren();
  if (!liste.length) {
    const lab = neu(d, "label", "tw-frei", "Farbe"), inp = neu(d, "input");
    inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false; inp.value = w;
    inp.addEventListener("input", () => { w = inp.value; if (o.aenderung) o.aenderung(); });
    lab.appendChild(inp); el.appendChild(lab);
    return { liste: false, farbe: () => (w.trim() ? { name: w.trim(), cmyk: null } : null), gueltig: () => true };
  }
  const eintraege = (w && !liste.some(f => f.farbe === w) ? [{ farbe: w, hex: "", cmyk: null }] : []).concat(liste);
  const raster = neu(d, "div", o.rahmen ? "tw-raster tw-rahmen" : "tw-raster");
  raster.style.gridTemplateColumns = `repeat(${o.spalten || 6}, minmax(0, 1fr))`;
  raster.setAttribute("role", "group"); raster.setAttribute("aria-label", "Farbe");
  const kacheln = eintraege.map(f => {
    const b = neu(d, "button", "tw-kachel"), fl = neu(d, "span", "tw-flaeche");
    b.type = "button"; b.title = f.farbe;
    fl.style.height = `${o.flaeche || 22}px`;
    if (/^#[0-9a-f]{3,8}$/i.test(f.hex || "")) fl.style.background = f.hex; else fl.classList.add("tw-ohne");
    b.append(fl, neu(d, "span", "tw-name", f.farbe));
    b.addEventListener("click", () => { w = f.farbe; markieren(); if (o.aenderung) o.aenderung(); });
    return b;
  });
  const markieren = () => kacheln.forEach((b, i) => b.classList.toggle("an", eintraege[i].farbe === w));
  raster.append(...kacheln);
  if (o.titel) el.append(neu(d, "div", `tw-titel ${o.titel}`, "Farbe"));
  el.append(raster);
  markieren();
  const sichtbar = kacheln.find((b, i) => eintraege[i].farbe === w);
  if (sichtbar) setTimeout(() => sichtbar.scrollIntoView({ block: "nearest" }), 0);
  const eintrag = () => eintraege.find(f => f.farbe === w) || null;
  return { liste: true, farbe: () => { const e = eintrag(); return e ? { name: e.farbe, cmyk: Array.isArray(e.cmyk) ? e.cmyk.slice() : null } : null; }, gueltig: () => !!w };
}

/**
 * Marke → Modell → Farbe in el. opts { mockups (textil.mockupsListe), marken, farben (textil_farben je id), aenderung, darstellung ("untereinander" | "spalten"),
 * spalten, flaeche (Farbraster wie farbraster) }.
 * Rückgabe { wahl() -> { modell, farbe } | null, gueltig() (Modell gewählt und – bei Farbliste – eine Farbe) }
 */
function modellwahl(el, opts) {
  const o = opts || {}, d = el.ownerDocument, mockups = o.mockups || [], sp = o.darstellung === "spalten";
  stil(d);
  let marke = null, modell = null, raster = null, rasterModell;
  const titel = text => neu(d, "div", sp ? "tw-titel lbl" : "tw-titel", text);
  const marken = neu(d, "div", sp ? "tw-liste" : "tw-reihe"), modelle = neu(d, "div", sp ? "tw-liste" : "tw-modelle"), farbe = neu(d, "div", "tw-farbe");
  const mk = neu(d, "div"), mz = neu(d, "div"), fz = neu(d, "div");
  marken.setAttribute("role", "group"); marken.setAttribute("aria-label", "Marke");
  modelle.setAttribute("role", "group"); modelle.setAttribute("aria-label", "Modell");
  mk.append(titel("Marke"), marken);
  mz.append(titel("Modell"), modelle);
  if (sp) fz.append(titel("Farbe"), farbe); else fz.append(farbe);
  const rahmen = neu(d, "div", sp ? "tw-spalten" : "tw-unter");
  rahmen.append(mk, mz, fz);
  el.replaceChildren(rahmen);
  const knopf = (text, an, tip, fn) => {
    const b = neu(d, "button", an ? "tw-knopf an" : "tw-knopf", text);
    b.type = "button"; b.title = tip;
    b.addEventListener("click", fn);
    return b;
  };
  function zeichnen() {
    marken.replaceChildren(...(o.marken || []).map(m => {
      const b = knopf(m, m === marke, m, () => { if (m !== marke) modell = null; marke = m; zeichnen(); if (o.aenderung) o.aenderung(); });
      b.disabled = !mockups.some(x => x.marke === m);
      return b;
    }));
    mz.hidden = !sp && !marke; // „untereinander“: erst nach Wahl der Marke; „spalten“: Spalte bleibt mit Überschrift stehen
    modelle.replaceChildren(...mockups.filter(m => marke && m.marke === marke).map(m =>
      knopf(m.bezeichnung || m.modell, m.id === modell, m.modell, () => { modell = m.id; zeichnen(); if (o.aenderung) o.aenderung(); })));
    fz.hidden = !sp && !modell;
    if (modell !== rasterModell) {
      rasterModell = modell;
      raster = modell ? farbraster(farbe, { liste: (o.farben || {})[modell] || [], aenderung: o.aenderung, spalten: o.spalten, flaeche: o.flaeche,
        titel: sp ? null : "cap", rahmen: !sp }) : null;
      if (!modell) farbe.replaceChildren();
    }
  }
  zeichnen();
  return {
    wahl: () => (modell ? { modell, farbe: raster ? raster.farbe() : null } : null),
    gueltig: () => !!modell && !!raster && raster.gueltig()
  };
}

module.exports = { farbraster, modellwahl };
