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
- `README.md` (aktueller Architektur- und Funktionsstand, keine Historie), `CHANGELOG.md` (knapp), `TESTBERICHT.md` (minimal); dann `git commit` und `git push`.

## d) Festlegungen
- Keine Namen, Anzeigetexte oder Festlegungen erfinden; bei Unklarheit fragen und anhalten.
