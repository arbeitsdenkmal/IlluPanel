// Gesamtlauf in Illustrator: node tests/illustrator/gesamtlauf.mjs [--nur <Abschnitte> | --nachlauf]
// Ein Durchgang, kein Lauf wird wiederholt. Wächter: Sicherung und Rückgabe von rechner.json und Grafikzeit-Puffer, Test-rechner.json mit allen Zielen
// unter tests/out, userInteractionLevel DONTDISPLAYALERTS, Testschalter (Meldungen und Dialoge), Zeitgrenzen (Aktion 120 s, Verbindung 10 s,
// Abschnitt 900 s, Lauf 3600 s). Hänger: erkennen, Screenshot, Abschnitt „hängt“, Lauf beenden und melden – kein Wegklicken, kein Neustart
// (Erfahrung folienkalkulation und Gesamtlauf 31.10.). Schritt 0 Wächterprobe: ein hängender Schritt ohne Illustrator-Blockade muss erkannt werden.
// Jeder Abschnitt ist einzeln lauffähig (eigene Testdaten, eigener Node-Prozess).
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { E, OUT, GL, ROOT, TI, DATEI, ZIEL, RECHNERORDNER, PORT, warte, ev, evStill, offen, trennen, protokollEintrag, statusSetzen } from "./lib/basis.mjs";
import * as I from "./lib/illu.mjs";

// [Kennung, Datei, Titel]
const ABSCHNITTE = [
  ["0", "0_waechterprobe", "Schritt 0 Wächterprobe"],
  ["1", "1_fundament", "3.1 Fundament"],
  ["2", "2_beschriftung", "3.2 Beschriftung und Fahrzeugbeschriftung"],
  ["2e", "2e_druckbogen_export", "3.2 Druckbogen-Export"],
  ["2p", "2p_plott_prozessfarben", "3.2 Plott mit Prozessfarben"],
  ["3", "3_grafikzeit", "3.3 Grafikzeit"],
  ["4", "4_werkzeuge", "3.4 Werkzeuge"],
  ["4b", "4b_breite", "3.4 Breite (Vorbelegung, Zugabe-Fehler)"],
  ["5", "5_konfigurationen", "3.5 Konfigurationen"],
  ["6", "6_schild", "3.6 Schild"],
  ["7", "7_textil", "3.7 Textil"],
  ["8", "8_nutzen", "3.8 Nutzen, Gitterscheiben, MB-Nr"],
  ["9", "9_oberflaeche", "3.9 Oberfläche"]
];
const VOLL = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const NACHLAUF = ["0", "2e", "2p", "4b", "5", "6", "7", "8", "9"]; // Auftrag Korrekturen 3.7.2, Abschnitt 4
// Optionen: unbekannte Option oder unbekannter Abschnitt = Abbruch (kein Volllauf)
const argv = process.argv.slice(2);
let AUSWAHL = VOLL, istNachlauf = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--nachlauf") { AUSWAHL = NACHLAUF; istNachlauf = true; }
  else if (argv[i] === "--nur" && argv[i + 1]) { AUSWAHL = argv[++i].split(",").map(x => x.trim()).filter(Boolean); }
  else { console.error(`ABBRUCH: unbekannte Option „${argv[i]}“. Erlaubt: --nur <${ABSCHNITTE.map(a => a[0]).join(",")}> | --nachlauf`); process.exit(3); }
}
const unbekannt = AUSWAHL.filter(k => !ABSCHNITTE.some(a => a[0] === k));
if (unbekannt.length) { console.error(`ABBRUCH: unbekannte Abschnitte ${unbekannt.join(", ")}`); process.exit(3); }
const LAUF_START = Date.now();
const laufUm = () => Date.now() - LAUF_START > E.lauf_s * 1000;
const log = t => { const z = `[${new Date().toISOString().slice(11, 19)}] ${t}`; console.log(z); fs.appendFileSync(path.join(GL, "waechter.log"), z + "\n"); };

// ---------- Vorprüfung (Testschutz: kein Dokument offen) ----------
fs.mkdirSync(GL, { recursive: true });
for (const f of ["ergebnis.jsonl", "meldungen.jsonl", "waechter.log", "status.json"]) fs.rmSync(path.join(GL, f), { force: true });
if (!fs.existsSync(path.join(ROOT, ".debug"))) { console.error("ABBRUCH: .debug fehlt (Testschalter und Remote-Debugging)."); process.exit(3); }
if (!I.laeuft()) { console.error("ABBRUCH: Illustrator läuft nicht. Bitte Illustrator starten (der Lauf startet Illustrator nicht selbst)."); process.exit(3); }
if (!I.antwortet()) { console.error("ABBRUCH: Illustrator antwortet nicht."); process.exit(3); }
const startDoks = I.dokumente();
if (startDoks.length) { console.error(`ABBRUCH: Dokumente offen (${startDoks.map(d => d.name).join(", ")}). Der Lauf beginnt nur ohne offene Dokumente; nichts verändert.`); process.exit(3); }
const FREMD = [];
if (!(await offen("panel")) && !(await I.panelOeffnen())) { console.error(`ABBRUCH: Panel nicht erreichbar (Port ${PORT.panel}).`); process.exit(3); }

// ---------- Sicherung ----------
const SICHERUNG = path.join(GL, "sicherung");
const GESICHERT = ["rechner.json", "grafikzeit_puffer.json"];
fs.rmSync(SICHERUNG, { recursive: true, force: true });
fs.mkdirSync(SICHERUNG, { recursive: true });
const vorhanden = {};
for (const n of GESICHERT) {
  const p = path.join(RECHNERORDNER, n);
  vorhanden[n] = fs.existsSync(p);
  if (vorhanden[n]) fs.copyFileSync(p, path.join(SICHERUNG, n));
}
fs.writeFileSync(path.join(SICHERUNG, "vorhanden.json"), JSON.stringify(vorhanden));
let uilVorher = null;
try { uilVorher = I.uilLesen(); } catch (e) { uilVorher = "UserInteractionLevel.DISPLAYALERTS"; }
log(`Sicherung: ${Object.entries(vorhanden).map(([n, v]) => `${n} ${v ? "gesichert" : "nicht vorhanden"}`).join(", ")}; userInteractionLevel ${uilVorher}`);

let zurueckGegeben = false;
function zurueck(grund) {
  if (zurueckGegeben) return;
  zurueckGegeben = true;
  try { fs.rmSync(DATEI.schalter, { force: true }); } catch (e) { /* weiter */ }
  for (const n of GESICHERT) {
    const p = path.join(RECHNERORDNER, n);
    try { if (vorhanden[n]) fs.copyFileSync(path.join(SICHERUNG, n), p); else fs.rmSync(p, { force: true }); } catch (e) { console.error(`Rückgabe ${n} fehlgeschlagen: ${e.message}`); }
  }
  try { if (I.antwortet(15)) I.uilSetzen(uilVorher || "DISPLAYALERTS"); } catch (e) { console.error("userInteractionLevel nicht zurückgesetzt: " + e.message); }
  // Panel und Hintergrund mit dem echten rechner.json neu laden
  try { execFileSync("node", [path.join(TI, "lib", "neuladen.mjs")], { timeout: 30000 }); } catch (e) { /* still */ }
  log(`Originale zurück (${grund}): ${GESICHERT.join(", ")}, Testschalter entfernt, userInteractionLevel ${uilVorher}`);
}
process.on("exit", () => zurueck("Ende"));
process.on("SIGINT", () => { zurueck("Abbruch SIGINT"); process.exit(130); });
process.on("SIGTERM", () => { zurueck("Abbruch SIGTERM"); process.exit(143); });
process.on("uncaughtException", e => { console.error("ABBRUCH:", e.stack || e); zurueck("Abbruch Ausnahme"); process.exit(2); });
process.on("unhandledRejection", e => { console.error("ABBRUCH:", (e && e.stack) || e); zurueck("Abbruch Ausnahme"); process.exit(2); });

// ---------- Testumgebung ----------
// tests/out/server, tests/out/lokal frisch (nur eigene Testordner)
for (const o of [path.join(OUT, "server"), path.join(OUT, "lokal"), path.join(OUT, "vorlagen"), path.join(OUT, "haenger"), path.join(OUT, "screenshots")]) fs.rmSync(o, { recursive: true, force: true });
for (const b of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") fs.mkdirSync(path.join(ZIEL.kunden, b), { recursive: true });
const nk = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "nutzen.json"), "utf8"));
const boegl = path.join(ZIEL.kunden, nk.boegl.kundenordner);
fs.mkdirSync(boegl, { recursive: true });
fs.writeFileSync(path.join(boegl, nk.boegl.auftrag), "nummer1=20\nnummer2=7\nnummer3=0\nnummer4=12\n");
for (const o of [ZIEL.dtf, ZIEL.wmd, ZIEL.arbeitsdateien, ZIEL.ausgang]) fs.mkdirSync(o, { recursive: true });
fs.mkdirSync(RECHNERORDNER, { recursive: true });
fs.writeFileSync(path.join(RECHNERORDNER, "rechner.json"), JSON.stringify({
  rechner: "Gesamtlauf",
  server: { kunden: ZIEL.kunden, dtf_bestellen: ZIEL.dtf, wmd_bestellen: ZIEL.wmd },
  lokal: { arbeitsdateien: ZIEL.arbeitsdateien, ausgang: ZIEL.ausgang }
}, null, 2));
fs.rmSync(path.join(RECHNERORDNER, "grafikzeit_puffer.json"), { force: true });
fs.writeFileSync(DATEI.schalter, JSON.stringify({ meldungen: DATEI.meldungen, antworten: {} }));
fs.writeFileSync(DATEI.meldungen, "");

async function umgebungSetzen() {
  I.uilSetzen("DONTDISPLAYALERTS");
  execFileSync("node", [path.join(TI, "lib", "neuladen.mjs")], { timeout: 60000, stdio: "inherit" });
}
await umgebungSetzen();
log(`Test-rechner.json: ${JSON.stringify({ kunden: ZIEL.kunden, dtf: ZIEL.dtf, wmd: ZIEL.wmd, arbeitsdateien: ZIEL.arbeitsdateien, ausgang: ZIEL.ausgang })}`);

// ---------- Abschnitte ----------
async function fensterZu() {
  for (const n of Object.keys(PORT)) {
    if (n === "panel" || n === "hintergrund") continue;
    if (await offen(n)) { await evStill(n, "setTimeout(() => PAM.cep.closeExtension(), 50); true"); }
  }
  trennen();
}
const lesen = () => { try { return JSON.parse(fs.readFileSync(DATEI.status, "utf8")); } catch (e) { return null; } };
function baumBeenden(pid) {
  const kinder = p => { try { return execFileSync("pgrep", ["-P", String(p)], { encoding: "utf8" }).split("\n").filter(Boolean).flatMap(k => [...kinder(k), k]); } catch (e) { return []; } };
  for (const p of [...kinder(pid), pid]) { try { process.kill(Number(p), "SIGKILL"); } catch (e) { /* weg */ } }
}
let haengerNr = 0;
let abbruch = null; // Grund, aus dem der Lauf vorzeitig endet

for (const [nr, datei, titel] of ABSCHNITTE.filter(a => AUSWAHL.includes(a[0])).sort((a, b) => AUSWAHL.indexOf(a[0]) - AUSWAHL.indexOf(b[0]))) {
  if (abbruch) break;
  if (laufUm()) { abbruch = `Gesamtgrenze ${E.lauf_s} s erreicht`; break; }
  if (!I.antwortet()) { abbruch = `Illustrator antwortet vor ${titel} nicht`; break; }
  I.vorholen(); // im Hintergrund liest Illustrator Dokumente um ein Vielfaches langsamer
  log(`== ${titel}`);
  statusSetzen({ abschnitt: titel, schritt: null, start: Date.now() });
  const kind = spawn("node", [path.join(TI, "abschnitte", `${datei}.mjs`)], { env: { ...process.env, GL_ABSCHNITT: titel }, stdio: ["ignore", "pipe", "pipe"] });
  const logDatei = fs.createWriteStream(path.join(GL, `${datei}.log`));
  kind.stdout.on("data", d => { process.stdout.write(d); logDatei.write(d); });
  kind.stderr.on("data", d => { process.stderr.write(d); logDatei.write(d); });
  let ende = false;
  kind.on("exit", () => { ende = true; });
  const start = Date.now();
  let haenger = null;
  while (!ende) {
    await warte(1000);
    const s = lesen();
    const schrittUm = !!(s && s.schritt && Date.now() - s.start > E.zeitgrenze_schritt_s * 1000);
    const abschnittUm = Date.now() - start > E.abschnitt_s * 1000, gesamtUm = laufUm();
    if (!schrittUm && !abschnittUm && !gesamtUm) continue;
    // Hänger: Screenshot, Abschnittsprozess beenden; nichts wegklicken
    const bild = path.join(OUT, "haenger", `${nr}_${++haengerNr}.png`);
    I.bildschirm(bild);
    baumBeenden(kind.pid);
    haenger = { schritt: (s && s.schritt) || "(zwischen Schritten)", bild, nach_s: Math.round((Date.now() - (schrittUm ? s.start : start)) / 1000),
      grund: schrittUm ? `Zeitgrenze ${E.zeitgrenze_schritt_s} s` : abschnittUm ? `Abschnitt ${E.abschnitt_s} s` : `Lauf ${E.lauf_s} s` };
    log(`${titel}: „${haenger.schritt}“ hängt (${haenger.grund}) – Screenshot ${path.relative(ROOT, bild)}`);
    break;
  }
  logDatei.end();
  await warte(1000);
  const antwortetNoch = I.antwortet(15);

  if (nr === "0") {
    // Wächterprobe: der hängende Schritt blockiert Illustrator nicht; erkannt innerhalb der Zeitgrenze, danach antworten Illustrator und Panel
    const erkannt = !!haenger && haenger.grund.startsWith("Zeitgrenze") && haenger.nach_s <= E.zeitgrenze_schritt_s + 5;
    protokollEintrag({ abschnitt: titel, schritt: "Wächterprobe", pruefung: `hängender Schritt innerhalb der Zeitgrenze (${E.zeitgrenze_schritt_s} s) erkannt, Prozess beendet, Screenshot`,
      status: erkannt ? "ok" : "Fehler", befund: haenger ? `nach ${haenger.nach_s} s; ${path.relative(ROOT, haenger.bild)}` : "kein Hänger erkannt" });
    let panel = false;
    try { panel = await ev("panel", `!!window.PAM && !document.getElementById("btnAuftrag").disabled`, 20000); } catch (e) { panel = false; }
    trennen();
    protokollEintrag({ abschnitt: titel, schritt: "Wächterprobe", pruefung: "danach antworten Illustrator und Panel", status: antwortetNoch && panel ? "ok" : "Fehler",
      befund: `Illustrator ${antwortetNoch ? "antwortet" : "antwortet nicht"}, Panel ${panel ? "bereit" : "nicht bereit"}` });
    if (!erkannt || !antwortetNoch || !panel) { abbruch = "Wächterprobe gescheitert – kein weiterer Abschnitt"; break; }
    continue;
  }

  if (haenger) {
    protokollEintrag({ abschnitt: titel, schritt: haenger.schritt, pruefung: haenger.grund, status: "hängt",
      befund: `nach ${haenger.nach_s} s; Screenshot ${path.relative(ROOT, haenger.bild)}; Illustrator ${antwortetNoch ? "antwortet" : "antwortet nicht (blockiert)"}` });
    abbruch = `${titel}: Schritt „${haenger.schritt}“ hängt`;
  }
  // nach jedem Abschnitt (auch nach einem Hänger, sofern Illustrator antwortet): Fenster zu, Testdokumente ohne Speichern schließen
  if (antwortetNoch) {
    try { await fensterZu(); } catch (e) { /* still */ }
    try { const n = I.testDokumenteSchliessen(FREMD); log(`${titel}: ${n} Testdokument(e) ohne Speichern geschlossen`); }
    catch (e) { log(`${titel}: Schließen der Testdokumente fehlgeschlagen (${e.message.split("\n")[0]})`); abbruch = abbruch || `${titel}: Testdokumente nicht geschlossen`; }
  } else log(`${titel}: Illustrator antwortet nicht – Testdokumente nicht geschlossen`);
}
if (abbruch) { log(`Lauf beendet: ${abbruch}`); protokollEintrag({ abschnitt: "Wächter", schritt: "Lauf", pruefung: "Lauf vorzeitig beendet", status: "Fehler", befund: abbruch }); }

// ---------- Zusammenfassung ----------
const alle = fs.existsSync(DATEI.ergebnis) ? fs.readFileSync(DATEI.ergebnis, "utf8").split("\n").filter(Boolean).map(z => JSON.parse(z)) : [];
const zaehl = l => ["ok", "Fehler", "hängt", "übersprungen"].map(s => `${s} ${l.filter(x => x.status === s).length}`).join(" · ");
const md = ["# Gesamtlauf " + new Date().toISOString() + (istNachlauf ? " (Nachlauf)" : ""), "", `Gesamt: ${zaehl(alle)}`, abbruch ? `Lauf vorzeitig beendet: ${abbruch}` : "", ""];
for (const titel of [...ABSCHNITTE.map(a => a[2]), "Wächter"]) {
  const l = alle.filter(x => x.abschnitt === titel);
  if (!l.length) continue;
  md.push(`## ${titel}`, "", zaehl(l), "");
  for (const x of l.filter(x => x.status !== "ok")) md.push(`- **${x.status}** ${x.schritt} · ${x.pruefung}${x.befund ? ` – ${x.befund}` : ""}`);
  md.push("");
}
fs.writeFileSync(path.join(GL, "zusammenfassung.md"), md.join("\n"));
log(`Ende: ${zaehl(alle)}`);
zurueck("Ende");
process.exit(0);
