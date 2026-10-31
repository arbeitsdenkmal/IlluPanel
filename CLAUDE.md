# Verbindliche Regeln für Claude Code in diesem Projekt

## a) Tests
- Nur `node --test tests/*.test.js`, und nur wenn Code in `panel/` oder `jsx/` geändert wurde.
- Keine Läufe in Illustrator, nie aus eigener Initiative.
- Keine neuen Tests, Testhelfer oder Umbauten an Tests ohne Auftrag. Schlägt ein Test nur wegen einer beauftragten Änderung fehl, wird nur diese Erwartung angepasst.
- Fremde Fehlschläge: eine Zeile im Testbericht, nicht beheben.
- Kein Testlauf wird wiederholt.
- Testbericht kurz: Befehle und Ergebnis.

## b) Tabu
- Originalskripte von Markus (`~/tools/01-*.jsx`, Skripte-Ordner von Illustrator) und `/Applications/interne Tools/Illustrator Panels` nie verändern.
- `~/tools/folienkalkulation` nur lesen.

## c) Ende jeder Stufe
- `README.md` (aktueller Stand), `CHANGELOG.md` (knapp), `TESTBERICHT.md` (minimal) am Ende jeder Stufe. Keine Commits und Pushes aus eigenem Antrieb: `git commit` und `git push` nur, wenn der Auftrag es ausdrücklich nennt; Nachfragen und Korrekturen werden ohne Commit in der Arbeitskopie erledigt.
- FESTLEGUNGEN.md pflegen (eigene Festlegungen, nummeriert); README erst nach Bestätigung.

## d) Festlegungen
- Keine Namen, Anzeigetexte oder Festlegungen erfinden; bei Unklarheit fragen und anhalten.
