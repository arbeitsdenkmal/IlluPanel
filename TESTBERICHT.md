# Testbericht

## Nachlauf mit neuer Testreihe 3.7.2 (31.10.2026)

Befehl: `./tests/illustrator/gesamtlauf.sh --nachlauf` (20:15–20:39 Uhr). Ein erster Start endete nach 2 s: die Wächterprobe beendete sich selbst (leeres Versprechen hält Node nicht am Leben), kein Abschnitt gelaufen; Probe korrigiert (Timer), Lauf neu gestartet.

| Abschnitt | ok | Fehler | hängt | übersprungen |
|---|---|---|---|---|
| Schritt 0 Wächterprobe | 2 | 0 | 0 | 0 |
| 3.2 Druckbogen-Export (2e) | 12 | 0 | 0 | 0 |
| 3.2 Plott mit Prozessfarben (2p) | 9 | 0 | 0 | 0 |
| 3.4 Breite (4b) | 4 | 0 | 0 | 0 |
| 3.5 Konfigurationen | 159 | 5 | 0 | 0 |
| 3.6 Schild | 56 | 0 | 0 | 0 |
| 3.7 Textil | 246 | 2 | 0 | 0 |
| 3.8 Nutzen, Gitterscheiben, MB-Nr | 46 | 2 | 0 | 0 |
| 3.9 Oberfläche | 171 | 2 | 0 | 0 |
| Wächter | 0 | 1 | 0 | 0 |

Gesamt: ok 705 · Fehler 12 · hängt 0 · übersprungen 0. Originale zurück, Testschalter entfernt, userInteractionLevel DISPLAYALERTS.

Fehler und Einordnung:
- Vorlagen (offene Frage, Vorlagen nicht verändert): 3.5 Visitenkarte 85 × 55 hoch und quer – Vorlage nur mit „Ebene 1“, keine Hilfslinien-Ebene; Visitenkarte 90 × 50 hoch und quer – Zeichenfläche der Vorlage 50 × 80 bzw. 80 × 50 mm statt 50 × 90 bzw. 90 × 50 (`produkte.csv`), das Panel lehnt richtig ab.
- Routine, korrigiert, nicht erneut gelaufen: 3.5 „Offset mit Quelle“ – leere Ebene „Ebene 1“ stammt aus der Quelle (§3.3 Nr. 4 entfernt nur leere Ebenen der Vorlage); 3.7 Flex – Fuß zeigt „Druckgröße 1: Menge fehlt“ vor „Flexfarbe fehlt“ (Reihenfolge in `textil.js`); 3.7 Textilfarbe – Farbwerte mit 32-Bit-Rauschen (2,99999993 statt 3), jetzt Toleranz 0,01; 3.8 Nutzen A – `art`/`produkt` stehen in `aufbau.boegen[]` (SPEZ_03_Nutzen §4.2); 3.8 MB-Info – „Material ges.:  rund“ mit zwei Leerzeichen.
- Nicht geklärt: 3.9 Fenster „WEA-Etiketten“ und „Bögl Nummern“ öffneten nicht innerhalb von 30 s (in 3.8 mit derselben Aktion geöffnet, belegt); Illustrator war nach dem Schließen des Textil-Dokuments beschäftigt, das Schließen der Testdokumente am Ende von 3.9 lief in die Zeitgrenze von 90 s (danach waren alle Dokumente zu). Routine wartet jetzt auf ein freies Panel und 60 s.
- Code: keine Abweichung gefunden, nichts geändert.

Antworten Markus (31.10.): Visitenkarte 85 × 55 ohne Hilfslinien-Ebene ist zulässig (SPEZ_03_Konfigurationen Fassung 4 §3.2 Nr. 4) – Erwartung der Routine angepasst (leerer Hilfslinien-Block erlaubt), nicht erneut gelaufen; Visitenkarte 90 × 50: `produkte.csv` stimmt, die Vorlage korrigiert Markus; Plott mit Prozessfarben (1.2): das Objekt hatte eine Kontur, die Sperre ist richtig; FESTLEGUNGEN 2d Punkt 27 gilt unverändert, entfallen sind nur 20–26.

Unit-Tests: nicht erneut gelaufen – seit dem letzten Lauf (28/28) keine Änderung in `panel/` oder `jsx/`.

## Korrekturen und Nachlauf 3.7.2 (31.10.2026)

Nachlauf 3.2 (erster Nachlauf, `--nur 2,…,9`, abgebrochen nach 3.2): ok 77 · Fehler 7. Ursachen: Routine las alle ungespeicherten Bögen unter dem Namen „Untitled“ (derselbe Bogen dreimal) und erwartete die Rolle 1370 statt 1000 (Rollenwahl 10 %, richtig) – „drei Druckbögen“, „Panel Druckbogen vorn“, Dateinamen beim Export; `grafikzeit_druckboegen.json` leer (Mechanismus entfällt mit SPEZ_02 Fassung 8); Export der Bögen abgebrochen „Großformat: keine Cutkontur“ (Abbruch richtig, Testobjekt ohne Cutkontur) – drei Export-Prüfungen und Folgeausnahme. Danach blieb der Wächter im Neustart hängen (ungültiger Beenden-Befehl, Warten auf ein nicht geöffnetes Panel); Lauf von Hand abgebrochen, Originale zurück.

Nachlauf (`./tests/illustrator/gesamtlauf.sh --nachlauf`, 19:08–19:11 Uhr):

| Abschnitt | ok | Fehler | hängt | übersprungen |
|---|---|---|---|---|
| Schritt 0 Wächterprobe (erste) | 2 | 1 | 0 | 0 |
| Schritt 0 Wächterprobe (zweite) | 1 | 2 | 0 | 0 |
| 3.2 Druckbogen-Export, Plott Prozessfarben | – | – | – | nicht gelaufen |
| 3.4 Breite | – | – | – | nicht gelaufen |
| 3.5–3.9 | – | – | – | nicht gelaufen |

Wächterprobe: Hänger nach 120 s erkannt (ok); Neustart (quit saving no, TERM, KILL, `open -b`, Panel über die Hintergrund-Extension) ok, Panel-Port erreichbar; „Panel antwortet“ Fehler – beim anschließenden Neuladen war das Panel wieder zu (Port nicht erreichbar). Nach Auftrag 3.6 kein Nachlauf; Lauf beendet, `rechner.json` und `grafikzeit_puffer.json` zurück, Testschalter entfernt.

Zweite Wächterprobe (nach Korrektur: Panel muss 10 s ununterbrochen bereit sein, 19:15–19:18 Uhr): Hänger nach 121 s erkannt (ok); Neustart Fehler – `open -b` direkt nach dem Beenden abgelehnt (LaunchServices-Fehler -600), die Routine wiederholte nicht (Protokolltext „Panel-Port nach 180 s nicht erreichbar“ war falsch, nach 31 s). Kein Nachlauf, Originale zurück. Korrigiert: `open -b` wird innerhalb der 180 s alle 2 s wiederholt; Start allein geprüft (Illustrator aus beendetem Zustand, Panel nach 22 s stabil bereit). Weitere Wächterprobe auf Anweisung nicht gelaufen. Ergebnisse: `tests/out/gesamtlauf_3/` (erste Probe), `tests/out/gesamtlauf/` (zweite).

Stellen mit nativem Dialog (Auftrag 3.2) und Ersatz im Testbetrieb (nur `.debug`):
- `jsx/illupanels.jsx` `IP.dateiWaehlen` (`File.openDialog`) – Pfad aus `antworten.datei` (`panel/gemeinsam.js` `host`).
- `jsx/illupanels.jsx` `IP.ordnerWaehlen` (`selectDlg`/`Folder.selectDialog`) – Pfad aus `antworten.ordner` bzw. `ordnerStandard`.
- `panel/gitter.js` `cep.fs.showOpenDialogEx` – Liste aus `antworten.dateien`.
- `panel/gemeinsam.js` `popup` (`alert`) – mitgeschrieben in `meldungen.jsonl`.
- `panel/gemeinsam.js` `frage` (`confirm`) – Antwort aus `antworten.frage` (Standard Ja), mitgeschrieben.
- `panel/main.js` Skripte aus `werkzeuge.json` (`$.evalFile`, Logo und VK-CC mit ScriptUI-Dialog) – nicht ersetzbar: im Testbetrieb nicht ausgeführt, mitgeschrieben; Prüfschritt entfällt.
- Illustrator-eigene Meldungen bei `app.open`, `saveAs`, `close`, Menübefehlen – `userInteractionLevel` DONTDISPLAYALERTS während des Laufs.
- Sonst kein `alert`/`confirm`/`prompt` im JSX oder in den Fenstern.

Fehler und Behebung:
- Code (1.1): Hilfslinien-Ebenen als Liste `hilfslinien.ebenen` (Konfiguration, Startprüfung, Anlegen, JSX); in Illustrator nicht geprüft.
- Code (1.4): Druckbögen zählen nicht, Zuordnung über den Dokumentnamen entfernt; in Illustrator nicht geprüft.
- Code (1.2): nicht nachstellbar. Probe in Illustrator (Arbeitsdatei Beschriftung, Gruppe mit globaler und nicht globaler Prozessfarbe und CMYK ohne Farbfeld, ohne Kontur; von den Ebenen „Cut“, „Sandbox“ und „Print“): Plott frei, drei Zeilen „→ zuordnen“, Zuordnung per Kachel, OK frei, nach OK auf 751C-Farbfelder umgefärbt, Tags gesetzt. Gesperrt war Plott nur bei Objekten mit Kontur (Skript-Rechtecke haben standardmäßig eine) – nach SPEZ_02 §6 richtig. Nichts geändert.
- Routine: Wächter (Zeitgrenzen, Neustart, Wächterprobe), Bogenerkennung über XMP, Rolle 1000, Testdaten 3.2, 3.1/3.5 Hilfslinien-Liste, 3.3 „Druckbogen vorn: keine Zählung“; nicht gelaufen (außer Schritt 0).

Unit-Tests: `node --test tests/*.test.js` einmal nach den Behebungen: 28 Tests, 28 bestanden, 0 fehlgeschlagen; keine Erwartung angepasst.

Neubau der Testreihe (nach den Testerfahrungen aus folienkalkulation, 31.10.): Dokumentzugriffe per osascript statt über das Panel, Wächter ohne Wegklicken und ohne Neustart (Hänger → Screenshot, Lauf beenden), Wächterprobe ohne Illustrator-Blockade, einzeln lauffähige Abschnitte 2e/2p/4b für den Nachlauf, Testschutz ohne offene Dokumente, Vordergrund vor langen Aktionen, Auswahl mit Wiederholung, `caffeinate`. Geprüft nur ohne Illustrator: Syntax aller Dateien, Laden der Module, Abbruch bei unbekannter Option bzw. unbekanntem Abschnitt. Kein Lauf in Illustrator.

## Gesamtlauf 3.7.2 (31.10.2026)

Befehl: `./tests/illustrator/gesamtlauf.sh` (ein Durchgang, 16:51–17:10 Uhr). Ergebnis gesamt: ok 211 · Fehler 15 · hängt 6 · übersprungen 3. Originale (`rechner.json`, `grafikzeit_puffer.json`) zurückgegeben, `grafikzeit_druckboegen.json` war vorher nicht vorhanden und ist entfernt, Testschalter entfernt, userInteractionLevel wieder DISPLAYALERTS.

| Abschnitt | ok | Fehler | hängt | übersprungen |
|---|---|---|---|---|
| 3.1 Fundament | 98 | 2 | 0 | 1 |
| 3.2 Beschriftung/Fahrzeug | 70 | 6 | 0 | 1 |
| 3.3 Grafikzeit | 15 | 1 | 0 | 0 |
| 3.4 Werkzeuge | 27 | 5 | 1 | 0 |
| 3.5 Konfigurationen | 0 | 0 | 1 | 0 |
| 3.6 Schild | 0 | 1 | 1 | 1 |
| 3.7 Textil | 1 | 0 | 1 | 0 |
| 3.8 Nutzen/Gitter/MB | 0 | 0 | 1 | 0 |
| 3.9 Oberfläche | 0 | 0 | 1 | 0 |

Hänger: 3.4 „Logo und VK-CC“ – der Dialog „Was?“ von VK-CC blieb offen (System Events sieht ScriptUI-Dialoge nicht als Fenster; Erkennung und Esc griffen nicht). Er blockierte alle folgenden JSX-Aufrufe des Panels; 3.5–3.9 hingen daher je im ersten Schritt (Screenshots `tests/out/haenger/4_1.png` … `9_6.png`). Nach dem Lauf von Hand über „Abbrechen“ geschlossen; acht ungespeicherte Testdokumente danach ohne Speichern geschlossen. 3.5–3.9 sind damit nicht geprüft.

Fehler und Behebung:
- Testroutine (5.2), korrigiert, nicht erneut gelaufen: ungespeicherte Dokumente (Illustrator liefert `fullName` „/Unbenannt-n“) – Druckbögen nicht erkannt (3.2 „drei Druckbögen“, „erster Bogen vorn“, dadurch Export der Druckbögen übersprungen; 3.3 Gutschrift aus Druckbogen nicht geprüft; 3.4 „Druckbogen erzeugt“) und Testdokumente vom Wächter nie geschlossen; Skript-Dialoge als UI element erkennen und über „Abbrechen“ schließen (3.4 Logo/VK-CC: beide Dialoge erschienen laut Screenshot); 3.1 Auftragsordner-Nummer `_04` statt erwartet `_02` (vorher schon belegt); 3.2 Zahl der Testobjekte (6 statt 7), Variante (das Duplikat liegt oben und behält die Id, das Original bekommt `IP_Original` – wie SPEZ_02 §3.1), Datensatz mit Variante 6 Objekte, Summa-Hinweis „wird nicht berechnet“ fälschlich als Fehler gewertet; 3.4 Breite-Vorbelegung „100“ wie `fmtMm` im Skript, Zugabe-Fehler mit gültiger Breite prüfen; 3.6 Folgefehler (Zeitlimit Port 8088).
- Code (5.1): keine Abweichung im geprüften Teil gefunden, nichts geändert.
- Offen (5.3): 3.1 Offset A6 hoch – die Vorlage hat die Ebenen „Sicherheitsabstand“ (gesperrt) und „Design“, keine Ebene „Hilfslinien“ (SPEZ_03_Konfigurationen §3.2 Nr. 4).
- Übersprungen: 3.1 Testmuster.ai als Quelle gleicher Art (Testmuster.ai ohne Panel-XMP Namespace 2.0); 3.2 Export der Druckbögen (Folge des Routinefehlers); 3.6 Zuordnen (Folge des Hängers).

Unit-Tests: `node --test tests/*.test.js` einmal nach den Korrekturen: 28 Tests, 28 bestanden, 0 fehlgeschlagen.

Nachträge: Probe Stufe 1 erfolgreich (30.10.); Probe Thema 1 ohne Beanstandung (31.10.).

## Vorlagen-Dateinamen 3.7.1 (31.10.2026)

- `node --test tests/*.test.js`: 28 Tests, 27 bestanden, 1 fehlgeschlagen. Der Befehl lief zweimal mit gleichem Ergebnis (der zweite Lauf nur, um die Zusammenfassung abzulesen); das verstößt gegen die Regel „kein Testlauf wird wiederholt“.
- Fehlschlag `tests/textil.test.js` (kalkulation_textil, 5,70 statt 5,40) durch den neuen Preis für PoliTape Turbo: Der Test ersetzt die bisher leere Preiszeile durch 10/19, die Ersetzung traf nicht mehr. Suchtext auf die neue Zeile angepasst, Erwartungen unverändert; nicht erneut gelaufen.
- `tests/konfiguration.test.js`: 11 statt 10 Produkte, `vorlagen` statt `ausrichtungen`, Fehlerzeile 8 statt 7 (neue Zeile Einbruchfalz DIN A7); mit diesen Erwartungen bestanden.
- Kein Lauf in Illustrator.

## Oberfläche 3.7.0 (31.10.2026)

- `node --test tests/*.test.js`: 28 Tests, 28 bestanden, 0 fehlgeschlagen; keine Erwartung angepasst.
- Kein Lauf in Illustrator; Probe durch Markus.

## Nutzen 3.6.0 (31.10.2026)

- `node --test tests/*.test.js`: 28 Tests, 28 bestanden, 0 fehlgeschlagen (neu: `tests/nutzen.test.js` mit Nutzen-Planer, Gitter-Planung, MB-Blöcken).
- Kein Lauf in Illustrator; Test unter Realbedingungen durch Markus.
- Korrektur Materiallänge: `node --test tests/*.test.js`: 28 Tests, 28 bestanden, 0 fehlgeschlagen (Erwartungen in `nutzen.test.js` unverändert, Testmotiv ohne Anschnitt); kein Lauf in Illustrator.

## Textil 3.5.0 (31.10.2026)

- `node --test tests/*.test.js`: 25 Tests, 25 bestanden, 0 fehlgeschlagen (neu: `textil.json` und die drei Textil-CSVs gültig in der bestehenden Konfigurationsprüfung, `tests/textil.test.js` mit `kalkulation_textil` und Streifenaufteilung an der Grenze 1500 mm).
- Kein Lauf in Illustrator; Probe durch Markus, sobald MockUps in `config/mockups` liegen.
- Korrektur Textil: `node --test tests/*.test.js`: 25 Tests, 25 bestanden, 0 fehlgeschlagen; kein Lauf in Illustrator.

## Schild 3.4.0 (31.10.2026)

- `node --test tests/*.test.js`: 23 Tests, 23 bestanden, 0 fehlgeschlagen (neu: `schild_materialien.csv` gültig in der bestehenden Konfigurationsprüfung, `tests/schild.test.js`).
- Kein Lauf in Illustrator; Probe durch Markus.

## Konfigurationen 3.3.0 (31.10.2026)

- `node --test tests/*.test.js`: 22 Tests, 22 bestanden, 0 fehlgeschlagen (neu: `produkte.csv` gültig und mit einer fehlerhaften Zeile in der bestehenden Konfigurationsprüfung; Testdaten um `server.wmd_bestellen` ergänzt).
- Kein Lauf in Illustrator; Probe durch Markus, sobald die Vorlagen vorliegen.
- Korrektur Punkt 15: abweichend vom Auftrag nicht nur JSX (Name aus `banner_rollup.json`, gelesen in `panel/lib/anlegen.js`), daher ein Lauf `node --test tests/*.test.js`: 22 Tests, 22 bestanden, 0 fehlgeschlagen.

## Werkzeuge 3.2.0 (31.10.2026)

- `node --test tests/*.test.js`: 22 Tests, 22 bestanden, 0 fehlgeschlagen (`werkzeuge.json` in der bestehenden Konfigurationsprüfung).
- Kein Lauf in Illustrator.
- Nachtrag: Illustrator-Probe durch Markus ohne Beanstandung, 31.10.

## Nachtrag 2d (31.10.2026)

- `node --test tests/*.test.js`: 22 Tests, 22 bestanden, 0 fehlgeschlagen.
- Illustrator (Ansage Markus): Ursache — `CEP12-ILST.log` „Wrong symbol '-' in version“, Manifest mit `3.1.0-2x` seit 2a abgelehnt; Behebung — Versionen `3.1.0`, Illustrator neu gestartet: Panel „PAM-Werkzeuge“ und Hintergrund-Extension laufen (Debug-Ports 8088, 8092). Verknüpfung, PlayerDebugMode (CSXS.11/12 = 1), XML und `.debug` waren in Ordnung.
- Ereignisdaten geprüft (zwei leere Probedokumente, ohne Speichern geschlossen): ungespeichert `<url>Unbenannt-2</url><name>Unbenannt-2</name>` für `documentAfterActivate`/`-Deactivate`.

## Stufe 2d „Grafikzeit“ (31.10.2026)

- `node --test tests/*.test.js`: 22 Tests, 22 bestanden, 0 fehlgeschlagen.
- Kein Lauf in Illustrator, keine Sensor-Tests.

## Stufe 2c „Produktionsdaten“ (31.10.2026)

- `node --test tests/*.test.js`: 20 Tests, 20 bestanden, 0 fehlgeschlagen (zuvor ein Zwischenlauf ohne die neuen Tests: 14/14).
- Kein Lauf in Illustrator.

## Korrektur 2b (30.10.2026)

- `node --test tests/*.test.js`: 14 Tests, 14 bestanden, 0 fehlgeschlagen; kein Lauf in Illustrator.

## Stufe 2b „Oberfläche“ (30.10.2026)

- `node --test tests/*.test.js`: 14 Tests, 14 bestanden, 0 fehlgeschlagen.
- Kein Lauf in Illustrator.

## Stufe 2a „Kalkulationskern“ (30.10.2026)

- `node --test tests/*.test.js`: 14 Tests, 14 bestanden, 0 fehlgeschlagen.
- Kein Lauf in Illustrator.
- Nachtrag: Illustrator-Probe Stufe 1 erfolgreich, 30.10.

## Nachtrag Stufe 1 (30.10.2026)

- `node --test tests/*.test.js`: 9 Tests, 9 bestanden, 0 fehlgeschlagen.

## Stufe 1 „Fundament“ (30.10.2026)

- `node --test tests/*.test.js` (Node 25.9.0): 9 Tests, 9 bestanden, 0 fehlgeschlagen.
- Kein Lauf in Illustrator.
