# Changelog

## 3.7.2 – Gesamtlauf (31.10.2026)

- Neu `tests/illustrator/`: Gesamtlauf in Illustrator über Remote-Debugging (Wächter mit Sicherung/Rückgabe von `rechner.json` und Grafikzeit-Dateien, Test-`rechner.json` unter `tests/out/`, DONTDISPLAYALERTS, Zeitgrenze 120 s je Aktion, Neustart bei fehlender Antwort), Abschnitte 3.1–3.9, JSX-Helfer.
- `panel/gemeinsam.js`: Testschalter (nur mit `.debug`): Meldungen und Rückfragen mitschreiben, Datei-/Ordnerdialoge aus einer Testdatei beantworten. `panel/main.js`: `window.PAM_TEST` (nur mit `.debug`) für das Flyout-Menü.
- Lauf: 3.1–3.4 durchgelaufen, ab 3.5 blockiert durch einen offen gebliebenen Skript-Dialog (Fehler der Testroutine, korrigiert); keine Code-Abweichung behoben, Befund Offset-Vorlage als offene Frage.
- Hilfslinien-Ebenen als Liste `hilfslinien.ebenen` („Hilfslinien“, „Sicherheitsabstand“) in `offset.json` und `banner_rollup.json`, Startprüfung, Anlegen und JSX (SPEZ_03_Konfigurationen Fassung 4 §12).
- Grafikzeit: Druckbögen zählen nicht (SPEZ_02 Fassung 8 §12); `grafikzeit_druckboegen.json` und die Zuordnung über den Dokumentnamen entfallen (Panel, Hintergrund-Extension, Nutzen, `grafikzeit.js`, `dokument_xmp.js`).
- Testbetrieb (nur `.debug`): Skripte aus `werkzeuge.json` werden nicht ausgeführt, nur mitgeschrieben.
- Gesamtlauf: Wächter mit Zeitgrenzen Aktion/Verbindung/Abschnitt/Lauf, Neustart nach Vorgabe mit einem Versuch, Wächterprobe als Schritt 0, `--nachlauf`; Testdaten 3.2 (Großformat mit Cutkontur, Prozessfarben), Routinen 3.1/3.3/3.5 angepasst. Nachlauf: Wächterprobe zweimal gescheitert (Panel nach dem Neustart wieder zu; Start abgelehnt mit Fehler -600), beide Ursachen in der Routine korrigiert, kein Nachlauf.
- Testreihe neu gebaut: Dokumentzugriffe per osascript, Panel nur für die Oberfläche; Wächter erkennt Hänger und beendet den Lauf (kein Neustart, kein Wegklicken); Abschnitte einzeln lauffähig, Nachlauf-Abschnitte 2e, 2p, 4b. Nachlauf: ok 705 · Fehler 12 (4 Vorlagen Visitenkarte, 7 Routine, 1 ungeklärt), keine Code-Abweichung; Routinen korrigiert (u. a. Vorlagen ohne Hilfslinien-Ebene zulässig).

## 3.7.1 – Vorlagen-Dateinamen, EK Flex/Flock (31.10.2026)

- `config/produkte.csv` nach SPEZ_03_Konfigurationen Fassung 3 §3.1: `ausrichtung` entfällt, neu `vorlage_hoch`/`vorlage_quer` (Dateinamen der Vorlagen von Markus); neu Einbruchfalz DIN A7.
- Startprüfung: acht Spalten, mindestens eine Vorlage, nur Dateiname mit Endung `.ait`.
- Anlegen Offset: Vorlagenpfad = `offset.vorlagen` + Dateiname aus der CSV, Schema `<schluessel>_<ausrichtung>.ait` entfällt; Wahl hoch/quer nur bei beiden vorhandenen Vorlagen; Prüfmaß ohne hoch-Vorlage ungedreht.
- Roll-up-Vorlagen `RollUp_850.ait`, `RollUp_1000.ait`.
- Preisliste: PoliTape Turbo und VelCutPro ek_m2 16,00, vk_m2 30,40.

## 3.7.0 – Oberfläche (31.10.2026)

- Gestaltung nach `SPEZ_03_Oberflaeche.md` und `MOCKUP_THEMA6_*_2`; Manifest-Größen nach §14.
- Panel 320 × 172: sechs Zeilen, Werkzeugzeile Breite · Masken · Nutzen, ausblenden statt sperren, Export gesperrt nicht orange, Textil-Preis mit „Preis“; Logo, VK-CC, Gitterscheiben, MB-Nummern im Flyout-Menü.
- „Auftrag anlegen“ 560 × 480: Arten links als Liste, Segment-Buttons statt Radiobuttons; `textil_wahl.js` mit Darstellungen „untereinander“/„spalten“ und Rasterparametern.
- „Objekt“ 480 × 440: Art und Anzahl in einer Zeile, Farb-Nr. groß vor den Serien, Schlüssel bei Mouseover; `serien.json` `standard` (751C) mit Startprüfung; kein Tape bei Schild.
- „Motiv“: Silhouette hell, Verfahren 2 × 2, Serie/Komplexität rechts, Farben im Objekt nur bei Flex/Flock, Zebra.
- „Zusammenfassung“ 700 breit, Textil eine Zeile je Druckgröße (auch im PDF); „Schilder“ mit Bohrungsskizze; „Textilfarbe“ 5 Spalten; „Modell“ drei Spalten; „Nutzen“ ohne Box „Motiv (gemessen)“; „WEA-Etiketten“ mit Etikett-Vorschau und Variantentabelle; „Bögl Nummern“ 5 × 2 mit Ergebnis beim Tippen.

## 3.6.0 – Nutzen, Gitterscheiben, MB-Nummern (31.10.2026)

- `config/nutzen.json` mit Startprüfung (Fehler sperren nur Nutzen, Gitter, MB-Nr); `schema.json` ohne Rolle `nutzenbogen`, `bogen` mit `art`, `produkt`, `auflage`.
- Gemeinsamer Kern: `panel/lib/nutzenbogen.js`; `IP.druckbogenAufbauen` mit Quellen `auswahl` und `fertig`; Export von Bögen ohne Arbeitsdatei (`exporte[]` vorab, Bögl-Ordnerregel, zulässige Breite 1345 bei Gitter).
- Nutzen (`nutzen.js`, Fenster `.nutzen`): Einstiege A und B, Bogenformat „ohne“, weitere Bögen statt mehrerer Drucke, Dateinamen mit Produkt.
- Gitterscheiben (`gitter.js`, `gitter_leser.js`, Fenster `.gitter`): Dateidialog, Typ-Gedächtnis im Bögl-Kundenordner, Symbol je Kundendatei, ohne „über 2,5 m“.
- MB-Nummern (`mbnummern.js`, Fenster `.mbnr`): `auftrag.txt` im Bögl-Kundenordner, Symbol je Nummer, Zeilen auf Bögen verteilt.
- Panel: siebte Zeile Nutzen · Gitter · MB-Nr, Zustand „Nutzen-Bogen vorn“; Kopien der vier alten Skripte in `Infos/Skripte_alt/`.
- Korrektur: Materiallänge Nutzen in Layoutzeile und Info = Summe der Zeichenflächenlängen inkl. Anschnitt; FESTLEGUNGEN „Nutzen“ bestätigt.

## 3.5.0 – Textil (31.10.2026)

- Konfiguration: `config/textil.json`, `textil_stufen.csv`, `textil_modelle.csv`, `textil_farben.csv`, `config/mockups/` (Startprüfung, Fehler sperren nur Textil); `textil.json` der Auftragsart kalkuliert (`preis` textil, `kalkuliert_verfahren`, `export.sammelordner`); Preisliste um die Zeilen aus PREISLOGIK §13.5 ergänzt (Serien ohne Preis).
- Anlegen Textil (Marke → Modell → Farbe, Wahl-Objekt `textil`, JSX-Grundlage `mockup`, `Korrekturabzug_<ID>.ai`), XMP-Bereich `textil`; Fenster „Motiv“, „Textilfarbe“, „Modell“ (`.motiv`, `.textilfarbe`, `.modell`).
- Panel Profil `textil`: Objektzeile mit Position und Verfahren, add/edit → „Motiv“, berechnen, Buttons „Farbe“ und „Modell“, Summa, Export, ein Preis.
- Flex/Flock: Lesen und Messen je Druckgröße, Streifen je Farbschlüssel bis 1500 mm (`nesting.nestenStreifen`, Summa), Kalkulation PREISLOGIK §13 (`kalkulation_textil.js`), Datensatz und Zusammenfassung mit Textil-Spalten.
- Export Profil `textil` (`export_textil.js`): Infos, DTF/Stick je Motiv und Druckgröße, Namen-Bögen, Korrekturabzug; DTF-Sammelordner über `export.sammelordner`.
- Korrektur Textil: Faktor je Druckgröße nach §9.1 (Ist-Maß nur ohne Realmaß), „Motiv“ ohne Realmaß zuordnen ohne Skalierung, `koerpergroesse_cm` in `IP_Stufen`; FESTLEGUNGEN „Textil“ bestätigt.

## 3.4.0 – Schild (31.10.2026)

- `config/schild_materialien.csv` (Startprüfung, Fehler sperren nur Schild); `schild.json` mit `materialien` (CSV), Werkzeugen Summa und Druck, `druck` wie Beschriftung, `bohrungen`, `export.laser`, ohne oberste `vorlage` und Hilfsdokument.
- Anlegen: Material im Dialog, Wahl-Objekt `schild { verfahren, material }`, XMP-Bereich `schild` mit festgeschriebenem Material; Schild-Quelle mit gleichem Verfahren in gleichnamige Ebenen.
- Fenster „Schilder“ (`.schilder`): Bohrungen je Schild; `panel/lib/schild.js` (Zuordnung, Schildregeln, Lochmitten, Laserregel, Dateinamen).
- Panel Profil `schild`: Button „Schilder“, Summa, Druck (nur mit Cutkontur), Export; Fenster „Objekt“ mit UV-Vorn/UV-Hinten; Preisprüfungen nur bei Kalkulation.
- Export `export_schild.js`: Druck-PDF mit Lochmarkierungen (Folie), UV-PDFs, Laserdatei; JSX `IP.schildLesen`, `IP.pdfSpeichern` mit Zeichenfläche, einer Ebene und temporärer Ebene.

## 3.3.0 – Konfigurationen (31.10.2026)

- Offset-Daten im Dialog: `config/produkte.csv` (Startprüfung, Fehler sperren nur Offset), Vorlagen je Produkt und Ausrichtung in `config/vorlagen/offset/` (Prüfung beim Öffnen und beim Anlegen), „freies Format“ auf `Offset.ait`; JSX-Grundlage `produktvorlage`.
- Banner/Roll-up: Wahl Banner oder Roll-up 850/1000 × 2000 (`rollup[]`, Vorlagen in `config/vorlagen/rollup/`); Roll-up-PDF mit Dokument-Anschnitt.
- Sonstiges vorbelegt aus der Quelle, ohne Quelle 210 × 297; Lasergravur unverändert. Artwahl als Wahl-Objekt `e.wahl`; `IP.dokumentInfo` mit `zeichenflaechen`.
- Export-Profil `offset` (`export_offset.js`, „wmd“, `bleedLink`), Sammelordner `server.wmd_bestellen` (Pflichtfeld in `rechner.json`); XMP-Bereiche `offset`, `banner_rollup`.
- Korrektur: Roll-up Hilfslinien wie Offset (`hilfslinien.ebene` in `banner_rollup.json`); FESTLEGUNGEN „Konfigurationen“ bestätigt.

## 3.2.0 – Werkzeuge (31.10.2026)

- `config/werkzeuge.json` (Logo, VK-CC) mit Startprüfung (`konfiguration.werkzeugeLaden`); Skripte aus `skripte/` per `$.evalFile`, fehlendes Skript sperrt nur seinen Button.
- JSX-Kern: `IP.breiteMessen`, `IP.breiteSetzen` (aus `01-Druckbreite.jsx`), `IP.maskenLoesen` (aus `06-releaseClippingMasks.jsx`, ohne Statistik).
- Fenster „Breite“ (`.breite`, ModalDialog 320 × 120, Debug-Port 8093); Übergabe über `de.pamnm.illupanels.breite.json`, Rückmeldung `breiteFertig`.
- Panel 320 × 168: sechste Zeile Breite · Masken · Logo · VK-CC (vorläufig), Freigabe nach SPEZ_03 §2.

## 3.1.0 – Nachtrag 2d (31.10.2026)

- Manifest-Versionen numerisch (`3.1.0`): CEP lehnte seit 2a das Manifest wegen „-“ in der Version ab, das Panel erschien nicht.
- Grafikzeit: ungespeicherte Druckbögen über ihren Namen der Arbeitsdatei gutgeschrieben (Zuordnung neben dem Puffer); „berechnen“ in „Zusammenfassung“ und Export bei vorderem Druckbogen übernehmen aus dem Puffer.
- CLAUDE.md c): Commit und Push nur auf ausdrücklichen Auftrag; FESTLEGUNGEN 2d bestätigt (9, 10 geändert).

## 3.1.0-2d – Stufe 2d „Grafikzeit“ (31.10.2026)

- Hintergrund-Extension `.hintergrund` (Custom, StartOn, ohne evalScript): zählt über `aktivitaet.js` (macOS lsappinfo/ioreg, Windows ein PowerShell-Prozess) und `grafikzeit.Zaehler`, Puffer `grafikzeit_puffer.json` im Rechnerordner; Druckbogen → `bogen.arbeitsdatei`; `dokument_xmp.js` liest ip:Dokument (Schema 1) aus der Datei.
- Panel: Übernahme aus dem Puffer ins XMP bei Maus ins Panel und vor eigenen Aktionen, Feld „+m“; Block `grafik` mit gerundeten Minuten.
- FESTLEGUNGEN 2c bestätigt.

## 3.1.0-2c – Stufe 2c „Produktionsdaten“ (31.10.2026)

- Passermarken für mehrfarbigen Plott (`passermarken.js`), Block-Nesting in `teile.js`/Kalkulation; `medien.json` Block `passermarken` mit Startprüfung.
- Summa (`schneidedaten.js`, `IP.schneidebogenSpeichern`), Druck (`druckbogen.js`, `herkunft.js`, `IP.druckbogenAufbauen`, `aufbau` ins XMP, `bogen.gesamt`), Export der Druckbögen mit eigenen OPOS-Marken (`opos.js`).
- Exportkern: `ersetzen` je Datei. `schema.json`: Tag `druckrichtung`, `bogen.gesamt`. Panel: Summa/Druck/Export aktiv, „n/m“ bei Druckbogen; Tape-Tooltip „Tape: …“.

## 3.1.0-2b – Korrektur 2b (30.10.2026)

- Panel: add ohne Auswahl gesperrt und nicht orange, „Objekt in einer Unterebene“; Tape mit drei Zuständen (`kein_tape` in `IP_Attribute`); FESTLEGUNGEN 2b bestätigt.

## 3.1.0-2b – Stufe 2b „Oberfläche“ (30.10.2026)

- Panel nach A5/A7 (320 × 142): Objektzeile, add/edit · berechnen, Werkzeugzeile (Summa/Druck gesperrt bis 2c), Preiszeile aus dem Datensatz; Zustände ohne Panel-Dokument, ohne Kalkulation, Druckbogen vorn.
- Fenster „Objekt“ (`.objekt`, ModalDialog 480 × 470): Zuordnen Plott/Digitaldruck mit Farbliste, Serie, Farb-Nr., Kachelraster, Mehrfachauswahl; Umfärben mit `IP_Originalfarbe`; Varianten-Erkennung auch beim Zuordnen.
- Fenster „Zusammenfassung“ (`.zusammenfassung`, Modeless 620 × 520): Objekttabelle, Folien, Summen, Grafik; berechnen, PDF.
- `<Kunde>_Zusammenfassung.pdf` (jsPDF) über den Exportkern.
- JSX: `IP.auswahlLesen`, `IP.objekteZuordnen`, `IP.objekteAuswaehlen`; Farb-Vorschau, `objekteLesen` mit `blaetter: false`.
- `preise_freigegeben` kein Pflichtparameter; `mindestbetrag_greift` je Preisart.
- `FESTLEGUNGEN.md`; CLAUDE.md um die Pflege ergänzt.

## 3.1.0-2a – Stufe 2a „Kalkulationskern“ (30.10.2026)

- Konfiguration: `medien.json` (Randabzug Plott 25, ohne `opos_marken`), `serien.json`, fünf Oracal-ASE; Startprüfung inkl. Preisliste (Serie mit Standardbreite).
- Preisquellen-Schnittstelle `preisquelle.js` mit Entwicklungsquelle `Infos/Stammdaten/preisliste.csv` (`preisquelle_csv.js`).
- JSX: `IP.objekteLesen` (Objekte, Blätter, Cutkontur, Text in Pfade, Motivumriss im Hilfsdokument), `IP.objektTagsSchreiben`.
- `teile.js` (Messung, Prüfungen, Varianten-Erkennung, Hinweise), `nesting.js` mit Anzahl-Exemplaren, `rollen.js`, `kalkulation.js` (PREISLOGIK v6 mit Anzahl, Brutto auf Cent, Datensatz §8.4), `auftrag.berechnen()` ohne Oberfläche.
- XMP: Felder `vorauswahl`, `farbzuordnung`, `kalkulation`, `aufbau` mit Standardwerten; `schema.json` dokumentiert `bogen` der Rolle druckbogen.

## 3.0.1 – Nachtrag Stufe 1 (30.10.2026)

- „Auftrag“ mit oranger Schrift (wie im alten Panel; „Export“ bleibt orangefarbener Button).
- Kein Abruf mehr bei Fenster-Fokus; Aktualisierung nur bei Maus ins Panel und nach eigener Aktion (Befund Stufe 43).
- README: Windows-`rechner.json` mit `"rechner": "MK-PC"`.

## 3.0.0 – Stufe 1 „Fundament“ (30.10.2026)

- Neues Repo, Manifest `de.pamnm.illupanels` 3.0.0 „PAM-Werkzeuge“ mit `.panel` und `.anlegen`, `.debug`.
- Konfiguration: `schema.json`, acht Auftragsarten (aus `Infos/Stammdaten`, neu `banner_rollup`), `mapping.json`, `rechner.beispiel.json`, Vorlagen (.ait) kopiert; Lade- und Prüfmodul mit `~`/`%VAR%`-Auflösung.
- Datenschicht: XMP `ip:Dokument` (Namespace 2.0, Schema 1, unbekannte Felder bleiben), Tags `IP_*` aus `schema.json`.
- Exportkern: lokal schreiben, `.teil`-Transfer mit Größenprüfung, Nummerierung gegen lokal und Server, DTF-Kopie, Arbeitsdatei-Kopie, `exporte[]`; Server-Prüfung mit 3 s Zeitlimit.
- Panel: Kopfzeile Kunde · Auftragsart · M 1:n, Buttons „Auftrag“ und „Export“; Hell/Dunkel.
- Dialog „ohne Auftrag“ für Fahrzeugbeschriftung, Beschriftung, Schild, Banner/Roll-up, Lasergravur, Sonstiges; Maßstab-Umrechnung.
- Profil „flach“ als erster Verbraucher des Exportkerns.
- Tests `tests/*.test.js`.
