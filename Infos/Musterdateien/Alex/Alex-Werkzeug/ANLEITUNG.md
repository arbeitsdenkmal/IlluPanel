# Alex Brandschutzordnungen – Werkzeug

## Was es tut

Dateien oder einen Ordner auf das Droplet ziehen. Je PDF wird die letzte Seite genommen,
der Rotton aus der Randkontur gelesen, die Seite auf 190 mm Breite mittig auf A4 gesetzt
und dahinter eine rote Fläche 210 × 297 mm im gleichen Ton gelegt. Dann erscheint ein
Fenster mit allen Dateien und einem Feld für die Stückzahl (leer oder 0 = nicht drucken).
„Drucken“ schickt alles an **Canon_CC** (A4, Mehrzweckfach, einseitig, farbig, ohne
Skalierung). Dateien ohne rote Randkontur werden übersprungen und im Fenster gemeldet;
der Rest geht trotzdem raus. Es wird nichts gespeichert.

## Einmalig: Droplet in Automator bauen

1. Ordner `Alex-Werkzeug` an seinen endgültigen Platz legen (z. B. `~/tools/Alex-Werkzeug`).
   Danach nicht mehr verschieben, sonst Schritt 4 wiederholen.
2. Terminal: `chmod +x ~/tools/Alex-Werkzeug/start.sh` (Pfad anpassen).
3. Automator öffnen → Neues Dokument → **Programm**.
4. Aktion **„Shell-Skript ausführen“** einfügen. Shell: `/bin/bash`, Eingabe übergeben:
   **als Argumente**. Inhalt:

       "$HOME/tools/Alex-Werkzeug/start.sh" "$@"

5. Sichern als `Alex Brandschutz.app` auf dem Schreibtisch.

Beim ersten Start fragt macOS ggf. nach Zugriff auf Schreibtisch/Downloads – erlauben.

## Test ohne Drucker

Terminal, schreibt die fertigen PDFs in einen Ordner statt zu drucken:

    ~/tools/Alex-Werkzeug/start.sh --out ~/Desktop/Alex-Test /Pfad/zu/den/PDFs

## Einstellungen ändern

Oben in `alex_brandschutz.py`: `PRINTER`, `LP_OPTIONS` (Fach, Duplex, Farbe …),
`TARGET_WIDTH_MM`. Die verfügbaren Optionswerte zeigt `lpoptions -p Canon_CC -l`.
