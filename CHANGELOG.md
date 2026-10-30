# Changelog

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
