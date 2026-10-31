// Abläufe, die mehrere Abschnitte brauchen: Auftrag anlegen über den Dialog, Fenster öffnen und abwarten, Kundenordner, Export über das Panel.
import fs from "node:fs";
import path from "node:path";
import { vorholen } from "./illu.mjs";
import { ev, evStill, offen, bis, warte, klick, eingabe, ZIEL, antworten, marke, meldungenSeit, meldungsText, panelFertig, panelNeu, th, thIn, xmpVon, heute, pruefe, abruf, trennen, aktion } from "./basis.mjs";

const A = (await import("node:module")).createRequire(import.meta.url)("../../../panel/lib/ablage.js");
export const dateiname = A.dateiname;

// Kundenordner <Buchstabe>/<Kunde> im Test-Server anlegen und als Antwort des Ordnerdialogs setzen
export function kundenordner(kunde) {
  const b = A.dateiname(kunde)[0].toUpperCase();
  const p = path.join(ZIEL.kunden, b, kunde);
  fs.mkdirSync(p, { recursive: true });
  antworten({ ordner: [p] });
  return { pfad: p, rel: `${b}/${kunde}` };
}
export const serverOrdner = (rel, ao) => path.join(ZIEL.kunden, rel, ao);
// offene ungespeicherte Druckbögen; name = „bogen:<Schlüssel>“ (im Skript heißen alle ungespeicherten Dokumente „Untitled“), für th(…, name)
export async function boegenOffen() {
  return (await th("dokumente")).dokumente.filter(d => !d.pfad && d.bogen).map(d => ({ name: `bogen:${d.bogen}`, x: JSON.parse(d.xmp), vorn: d.vorn }));
}
export const lokalOrdner = (kunde, ao) => path.join(ZIEL.arbeitsdateien, A.dateiname(kunde), ao);

// Fenster öffnen lassen (Aktion fn) und warten, bis es geladen ist (bereit: Ausdruck im Fenster)
export async function fensterAuf(name, fn, bereit = "!!window.PAM", ms = 60000) {
  aktion(`Fenster ${name}`);
  if (fn) await fn();
  const ok = await bis(async () => (await offen(name)) && (await ev(name, bereit)), ms, 400);
  return ok;
}
export async function fensterZu(name, ms = 110000) {
  return bis(async () => !(await offen(name)), ms, 500);
}
export async function fensterSchliessen(name) {
  if (await offen(name)) await evStill(name, "setTimeout(() => PAM.cep.closeExtension(), 50); true"); // zeitversetzt: die Verbindung bricht beim Schließen weg
  await fensterZu(name, 10000);
  trennen();
}

// ---------- Dialog „Auftrag anlegen“ ----------
const DLG_BEREIT = `!!window.PAM && document.querySelectorAll("#arten .art").length > 0 && !!document.querySelector("#quelle button.an")`;
export async function dialogAuf() {
  if (await offen("anlegen")) await fensterSchliessen("anlegen");
  await panelNeu();
  return fensterAuf("anlegen", () => klick("panel", "#btnAuftrag"), DLG_BEREIT);
}
export const dlg = expr => ev("anlegen", expr);
export const segment = (gruppe, w) => klick("anlegen", `#${gruppe} button[data-w="${w}"]`);
export async function artWaehlen(id) { await klick("anlegen", `#arten .art[data-id="${id}"]`); await warte(300); }
// e: { art, kunde, quelle: "offen"|"datei"|"leer", datei, massstab: "1"|"30", fahrzeugvorlage, verfahren, material, produkt (Schlüssel|"frei"),
//      ausrichtung, variante, breite, hoehe, anzahl, textil: fn(dlg) }; Rückgabe { ok, meldungen, ordner (lokal), datei, gesperrt }
export async function anlegen(e) {
  aktion(`Anlegen ${e.art}`);
  vorholen();
  const kd = kundenordner(e.kunde);
  if (!(await dialogAuf())) return { ok: false, grund: "Dialog nicht geöffnet" };
  await artWaehlen(e.art);
  await eingabe("anlegen", "#kunde", e.kunde);
  if (e.quelle === "datei") {
    antworten({ datei: [e.datei] });
    await segment("quelle", "datei");
    // die gewählte Datei wird im Dialog geöffnet; fertig, wenn sie offen ist und „Let's go“ wieder geprüft wurde
    await bis(async () => (await thIn("anlegen", "dokumente").catch(() => ({ dokumente: [] }))).dokumente.some(x => x.pfad === e.datei), 60000, 800);
    await warte(1500);
  }
  else if (e.quelle) { await segment("quelle", e.quelle); await warte(1200); }
  if (e.fahrzeugvorlage) await dlg(`(()=>{ const c=document.getElementById("fzV"); if(!c.checked){ c.checked=true; c.dispatchEvent(new Event("change")); } return true; })()`);
  if (e.massstab) await segment("zMassstab", e.massstab);
  if (e.verfahren) await segment("zVerfahren", e.verfahren);
  if (e.material) await eingabe("anlegen", "#material", e.material, "change");
  if (e.produkt) {
    const v = e.produkt === "frei" ? "frei" : await dlg(`(()=>{ const o=[...document.querySelectorAll("#produkt option")].find(o=>o.textContent===${JSON.stringify(e.produkt)}); return o ? o.value : null; })()`);
    await eingabe("anlegen", "#produkt", v || "", "change");
  }
  if (e.ausrichtung) await segment("zAusrichtung", e.ausrichtung);
  if (e.variante) await segment("zVariante", e.variante);
  if (e.breite !== undefined) await eingabe("anlegen", "#breite", e.breite);
  if (e.hoehe !== undefined) await eingabe("anlegen", "#hoehe", e.hoehe);
  if (e.anzahl !== undefined) await eingabe("anlegen", "#anzahl", e.anzahl);
  if (e.textil) await e.textil();
  await warte(300);
  if (e.vorLos) await e.vorLos();
  const gesperrt = await dlg(`document.getElementById("los").disabled`);
  if (gesperrt) { await fensterSchliessen("anlegen"); return { ok: false, gesperrt: true, grund: "„Let's go“ gesperrt" }; }
  const m = marke();
  aktion(`Let's go ${e.art}`);
  await klick("anlegen", "#los");
  const zu = await fensterZu("anlegen", 110000);
  await panelFertig(30000);
  const mel = meldungenSeit(m);
  return { ok: zu, meldungen: mel, text: mel.filter(x => x.art === "meldung").map(x => x.text).join(" ¶ "), kundenordner: kd };
}

// Hilfslinien-Ebenen (SPEZ_03_Konfigurationen Fassung 4 §3.1, §3.2 Nr. 4, §12): oberster Block aus Ebenen mit Namen aus liste, gesperrt, nicht druckend;
// darunter keine Ebene mit einem dieser Namen. Ein leerer Block ist zulässig (Vorlagen ohne Hilfslinien-Ebene, z. B. Visitenkarte 85 × 55). -> { ok, oben, text }
export function hilfslinienBlock(ebenen, liste) {
  let k = 0;
  while (k < ebenen.length && liste.includes(ebenen[k].name)) k++;
  const oben = ebenen.slice(0, k), unten = ebenen.slice(k).filter(e => liste.includes(e.name));
  return { ok: oben.every(e => e.gesperrt && !e.druckend) && !unten.length, oben: oben.map(e => e.name),
    text: ebenen.map(e => `${e.name}${e.gesperrt ? " (gesperrt)" : ""}${e.druckend ? "" : " (nicht druckend)"}`).join(", ") };
}
// Prüfungen der neuen Arbeitsdatei (vorderes Dokument): Pfad, XMP-Grundfelder, Ebenen nach Konfiguration
export async function arbeitsdateiPruefen(titel, art, kunde, { massstab, quelleArt, ebenen, auftragsordner } = {}) {
  const d = await th("dok");
  const x = d.xmp ? JSON.parse(d.xmp) : null;
  const ao = auftragsordner || x && x.ablage && x.ablage.auftragsordner;
  pruefe(`${titel}: Arbeitsdatei.ai im lokalen Auftragsordner`, d.pfad && d.pfad.startsWith(ZIEL.arbeitsdateien + "/" + A.dateiname(kunde) + "/") && path.basename(d.pfad).startsWith(art === "textil" ? "Korrekturabzug" : "Arbeitsdatei") && d.gespeichert, d.pfad);
  pruefe(`${titel}: XMP Grundfelder`, !!x && x.schema === 1 && x.rolle === "arbeitsdatei" && x.auftragsart === art && x.kunde === kunde && x.auftrag && x.auftrag.orderId === null && x.auftrag.productId === null
    && x.grafikzeit && Array.isArray(x.grafikzeit.eintraege) && Array.isArray(x.exporte) && (massstab === undefined || x.massstab === massstab) && (quelleArt === undefined || (x.quelle && x.quelle.art === quelleArt)),
    x ? JSON.stringify({ schema: x.schema, panel: x.panel, rolle: x.rolle, auftragsart: x.auftragsart, massstab: x.massstab, kunde: x.kunde, auftrag: x.auftrag, ablage: x.ablage, quelle: x.quelle }) : "kein XMP");
  if (x) pruefe(`${titel}: Auftragsordner JJJJ-MM-TT_<Art>`, new RegExp(`^${heute()}_`).test(ao || "") && path.basename(path.dirname(d.pfad)) === ao, `${ao} / ${path.basename(path.dirname(d.pfad || ""))}`);
  if (ebenen) pruefe(`${titel}: Ebenen nach Konfiguration`, JSON.stringify(d.ebenen.map(e => e.name).filter(n => ebenen.includes(n)).sort()) === JSON.stringify([...ebenen].sort()), d.ebenen.map(e => `${e.name}${e.gesperrt ? " (gesperrt)" : ""}`).join(", "));
  return { d, x };
}

// Export über das Panel; Rückgabe der Meldungen
export async function exportieren() {
  aktion("Export");
  vorholen();
  await panelNeu();
  const m = marke();
  await klick("panel", "#btnExport");
  await panelFertig(115000);
  return { meldungen: meldungenSeit(m), text: meldungsText(m) };
}
export async function panelKlick(id, ms = 115000) {
  aktion(id);
  vorholen(); // Illustrator vorn: im Hintergrund liest es um ein Vielfaches langsamer
  await panelNeu();
  const m = marke();
  await klick("panel", `#${id}`);
  await panelFertig(ms);
  return { meldungen: meldungenSeit(m), text: meldungsText(m) };
}
export { xmpVon, abruf };

// Textil: Marke → Modell → Farbe in der Komponente textil_wahl (Dialog „Auftrag“ bzw. Fenster „Modell“); farbe: Name, "erste" oder null (Freitext/keine)
export async function textilWaehlen(fenster, modell, farbe = "erste") {
  const marke = modell.split("_")[0];
  await ev(fenster, `(()=>{ const b=[...document.querySelectorAll(".tw-knopf")].find(x=>x.textContent===${JSON.stringify(marke)}); if(b) b.click(); return !!b; })()`);
  await warte(250);
  const m = await ev(fenster, `(()=>{ const b=[...document.querySelectorAll(".tw-knopf")].find(x=>x.title===${JSON.stringify(modell)}); if(b) b.click(); return !!b; })()`);
  await warte(250);
  if (farbe === "erste") await ev(fenster, `(()=>{ const k=document.querySelector(".tw-kachel"); if(k) k.click(); return !!k; })()`);
  else if (farbe) await ev(fenster, `(()=>{ const k=[...document.querySelectorAll(".tw-kachel")].find(x=>x.title===${JSON.stringify(farbe)}); if(k) { k.click(); return true; } const i=document.querySelector(".tw-frei input"); if(i){ i.value=${JSON.stringify(farbe)}; i.dispatchEvent(new Event("input")); return true; } return false; })()`);
  await warte(250);
  return m;
}
// PDF prüfen: Seitenzahl und Endformat (TrimBox, sonst MediaBox) in mm, Toleranz 0,5 mm
export async function pdfPruefen(titel, datei, seiten, mass, tol = 0.5) {
  const { pdfInfo, existiert } = await import("./basis.mjs");
  if (!existiert(datei)) return pruefe(`${titel}: PDF vorhanden`, false, datei);
  let i; try { i = pdfInfo(datei); } catch (e) { return pruefe(`${titel}: PDF lesbar`, false, e.message); }
  const end = i.boxen.map(b => b.trim || b.media);
  const okS = seiten == null || i.seiten === seiten;
  const okM = !mass || end.every((b, k) => { const m = Array.isArray(mass[0]) ? mass[k] : mass; return m && Math.abs(b[0] - m[0]) <= tol && Math.abs(b[1] - m[1]) <= tol; });
  pruefe(`${titel}: PDF ${seiten != null ? seiten + " Seite(n)" : ""}${mass ? " im Format " + JSON.stringify(mass) : ""}`, okS && okM, `${path.basename(datei)}: ${i.seiten} Seiten, ${JSON.stringify(i.boxen)}`);
  return i;
}

// ---------- Fenster „Objekt“ (Zuordnen) ----------
export const OBJ_BEREIT = `!!window.PAM && document.querySelectorAll("#arten button").length > 0`;
// Objekte auswählen, Panel lesen lassen, add/edit klicken, auf das Fenster warten; Rückgabe Panelzustand vor dem Klick
// Auswahl setzen und wiederholen, bis Illustrator sie meldet (eine einzelne Auswahl kam im alten Projekt mehrfach nicht an)
export async function waehle(namen, versuche = 3) {
  for (let i = 0; i < versuche; i++) {
    await th("auswaehlen", namen);
    if ((await th("dok")).auswahl === namen.length) return true;
    await warte(300);
  }
  return false;
}
export async function objektOeffnen(namen, fenster = "objekt") {
  aktion(`${fenster} ${namen.join(", ")}`);
  await waehle(namen);
  await panelNeu();
  const { panelZustand } = await import("./basis.mjs");
  const z = await panelZustand();
  const auf = await fensterAuf(fenster, () => klick("panel", "#btnZuordnen"), fenster === "objekt" ? OBJ_BEREIT : "!!window.PAM && document.readyState === 'complete'", 60000);
  await warte(800);
  return { z, auf };
}
export const obj = expr => ev("objekt", expr);
export const objKnopf = (gruppe, text) => obj(`(()=>{ const b=[...document.querySelectorAll("#${gruppe} button")].find(x=>x.textContent===${JSON.stringify(text)} || x.textContent.startsWith(${JSON.stringify(text)})); if(!b||b.disabled) return false; b.click(); return true; })()`);
export const objZustand = () => obj(`(()=>{ const an = g => [...document.querySelectorAll("#"+g+" button")].map(b=>({ t: b.textContent, an: b.classList.contains("an"), mixed: b.classList.contains("mixed"), aus: b.disabled, titel: b.title }));
  return { arten: an("arten"), medium: an("medium"), laminat: an("laminat"), komplex: an("komplex"), attr: an("attr"), serien: an("serien"), anzahl: document.getElementById("anzahl").value,
    anzahlSichtbar: !document.getElementById("anzahlZ").hidden, komplexSichtbar: !document.getElementById("komplex").hidden, druck: !document.getElementById("druck").hidden, plott: !document.getElementById("plott").hidden,
    farben: [...document.querySelectorAll("#farben .farbe")].map(z=>z.innerText.replace(/\\s+/g," ").trim()), hinweis: document.getElementById("hinweis").textContent, ok: !document.getElementById("ok").disabled,
    kacheln: document.querySelectorAll("#raster span").length }; })()`);
export async function objFarbNr(nr) {
  return obj(`(()=>{ const f=document.getElementById("farbNr"); f.value=${JSON.stringify(nr)}; f.dispatchEvent(new Event("input")); f.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true})); return true; })()`);
}
export async function objOk(fenster = "objekt") {
  aktion(`OK ${fenster}`);
  const m = marke();
  await klick(fenster, "#ok");
  const zu = await fensterZu(fenster, 60000);
  await panelFertig(30000);
  return { zu, text: meldungsText(m) };
}

// Beschriftung-Arbeitsdatei mit einem zugeordneten Digitaldruck-Objekt (Tags direkt gesetzt) und „Druck“ → { ad, bogen (Name des ersten Bogens), text }
export async function druckbogenErzeugen(kunde, b = 300, h = 200) {
  const r = await anlegen({ art: "beschriftung", kunde, quelle: "leer" });
  if (!r.ok) return { ok: false, text: r.text || r.grund };
  const ad = (await th("dok")).pfad;
  await th("zeichnen", [{ ebene: "Print", art: "rechteck", x: 0, y: 0, b, h, fuellung: { cmyk: [20, 0, 60, 0] }, name: "Druckmotiv" }]);
  await th("tagSetzen", "Druckmotiv", "IP_Id", `${dateiname(kunde)}-1`);
  await th("tagSetzen", "Druckmotiv", "IP_Folie", "3551");
  await th("tagSetzen", "Druckmotiv", "IP_Laminat", "matt");
  await th("speichern");
  const d = await panelKlick("btnDruck");
  const bogen = (await th("dokumente")).dokumente.find(x => !x.pfad && x.vorn);
  return { ok: !!bogen, ad, bogen: bogen && bogen.name, text: d.text };
}
