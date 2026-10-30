/* Objekt-Tags IP_* (SPEZ_01 §5.2): Namen nur aus config/schema.json „tags“ (Schlüssel -> Tag-Name). Werte immer als Text.
 * Lesen/Schreiben am PageItem macht der JSX-Kern (tagsLesen/tagsSchreiben); hier die Schema-Prüfung der Werte vor dem Schreiben. */
"use strict";

/**
 * Prüft ein Tag-Objekt { schluessel: wert } gegen das Schema und gibt es als Text-Werte zurück.
 * null/"" = Tag entfernen. Unbekannter Schlüssel oder Wert, der weder Text noch Zahl ist -> Fehler.
 */
function tagsPruefen(schema, obj) {
  const r = {}, fehler = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (!Object.prototype.hasOwnProperty.call(schema.tags, k)) { fehler.push(`Tag „${k}“ nicht in schema.json`); continue; }
    if (v === null || v === undefined || v === "") { r[k] = null; continue; }
    if (typeof v !== "string" && typeof v !== "number") { fehler.push(`Tag „${k}“: Wert muss Text sein`); continue; }
    r[k] = String(v);
  }
  if (fehler.length) throw new Error(fehler.join("\n"));
  return r;
}

module.exports = { tagsPruefen };
