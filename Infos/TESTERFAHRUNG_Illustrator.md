# Testerfahrung Illustrator – was aus dem alten Projekt (folienkalkulation, Stufen 1–45) für Testroutinen gilt

Quelle: TESTBERICHT.md, CHANGELOG.md, KONTEXT.md und `tests/` in `~/tools/folienkalkulation` (nur lesen). Stand 31.10.2026.
Zweck: Claude Code soll Testroutinen, die Illustrator bedienen, nicht erneut auf demselben Lernweg bauen. Teil A ist verbindlich, B–E sind Befunde mit Beleg, F vergleicht mit `tests/illustrator/` im Neubau.

## A. Verbindliche Regeln für Testroutinen in Illustrator

1. **Dialoge werden nicht weggeklickt, sondern nicht ausgelöst.** System Events sieht weder Illustrator-eigene Dialoge (PDF-Importoptionen) noch ScriptUI-Dialoge als Fenster; Klicks per Skript kommen unzuverlässig an (Stufe 42; Gesamtlauf 3.7.2 im Neubau). Jede Stelle, die einen Dialog öffnen kann, bekommt einen Testschalter (Antwort aus Datei, Meldung mitschreiben) oder bleibt aus dem Lauf draußen (Skripte mit ScriptUI: Logo, VK-CC). `userInteractionLevel = DONTDISPLAYALERTS` nur für Illustrator-Rückfragen bei `open`/`save`/`close`/Kopieren, im `finally` zurück.
2. **Illustrator bleibt sichtbar und vorn.** Im Hintergrund liest Illustrator um ein Vielfaches langsamer (Berechnen 121 s statt 1–30 s); ausgeblendet bekommt ein CEP-Dialog keinen Tastaturfokus. Vor langen Aktionen `open -a <voller Pfad>`. Hintergrundbetrieb (`open -g`, Ausblenden per System Events) ist erprobt und aufgegeben – Illustrator holt sich beim Anlegen/Speichern ohnehin den Vordergrund.
3. **Illustrator über den vollen App-Pfad starten**, nicht per Bundle-ID: Illustrator 2024 hat dieselbe Bundle-ID. Direkt nach dem Beenden lehnt LaunchServices den Start ab (Fehler −600), der erste Start kam im alten Projekt ebenfalls nicht zustande.
4. **Kein Dokument über den Namen identifizieren.** Neue Dokumente heißen alle „Untitled“ bzw. „Unbenannt-n“, `fullName` liefert bei ungespeicherten „/Unbenannt-n“. Eigene Dokumente tragen eine XMP-Kennung des Laufs; neue Bögen werden über die Anzahl erkannt (die zuletzt gebauten liegen vorn), sofort vermessen und geschlossen.
5. **Testschutz vor dem ersten Schritt:** ungespeicherte Dokumente offen → Abbruch, nichts geschlossen. Namen der vorher offenen Dokumente merken (`$.global.IP_FREMDE_DOKUMENTE`); geschlossen wird nur, was unter `tests/out/` liegt oder die Kennung des Laufs trägt. Abschnitte, die das aktive Dokument übernehmen, brechen auch bei fremden **gespeicherten** Dokumenten ab (Befund: `UV-Schild.ait` von Markus wurde als Kundendatei übernommen und geschlossen).
6. **Jeder Testschalter wird zurückgesetzt** – im `exit`-Handler, bei SIGINT/SIGTERM, bei nicht gefangener Ausnahme. Ausgangswerte vorher lesen. Befund Stufe 9: nach einem Panel-Test startete „Druck“ kein OPOS mehr und Meldungen blieben weg, bis Illustrator neu startete. Nie einen Basisordner unter `tests/out/` als „vorher“ übernehmen.
7. **Keine festen Wartezeiten, sondern Polling mit Zeitlimit** (`erwarte(name, prüfung, {ms})`): bei Ablauf den zuletzt gesehenen Zustand ausgeben. Feste Wartezeiten nur in bewussten Beobachtungsfenstern (Flacker-Test). Auf das Objekt warten, nicht auf die Ebene (sonst gilt eine alte Auswahl als erreicht).
8. **Auswahl per Skript wiederholen, bis Illustrator sie meldet** (`waehle()`): eine einzelne Auswahl kam mehrfach nicht an, Ursache ungeklärt.
9. **Klicks, die Illustrator lange beschäftigen, zeitversetzt auslösen** (`setTimeout(click, 10)`), sonst kommt der CDP-Aufruf nicht zurück; das Panel antwortet bis über eine Minute nicht, solange Illustrator liest. Ebenso Schließen-Button und Esc eines Fensters mit `setTimeout(…, 50)`, weil die Verbindung mit dem Fenster wegbricht.
10. **Kein Abruf im Panel, solange auf einen Dialog gewartet wird** – der Abruf holt den Fokus aus dem Dialog.
11. **Erwartungswerte aus Konfiguration und CSV lesen, nicht fest eintragen.** Hauptursache der Fehlschläge im alten Projekt waren veraltete Erwartungen (Texte, DOM-IDs, Ports, Reihenfolgen, von Markus geänderte CSV-Werte).
12. **Jeder Abschnitt einzeln aufrufbar (`--nur`), ohne Mitläufer.** `--nur druck` zog 136 statt 27 Prüfungen mit; ein kaputter Vorbereitungsschritt ließ alle Folgeprüfungen in 15–30-s-Wartezeiten laufen. Neue Prüfteile bekommen eigene Abschnitte. Unbekannte Option = Abbruch, nicht Volllauf (`--help` startete einmal die ganze Abnahme).
13. **Kein Lauf wird wiederholt**, auch nicht wegen gekürzter Ausgabe. Sporadische Fehler: einmaliger gezielter Diagnoselauf mit eigenem Skript, sonst eine Zeile vermerken.
14. **Nach Manifest-Änderungen (neue Extension, Fenstergröße, Mindesthöhe) Illustrator neu starten**; Neuladen des Panels reicht nicht. Vor Live-Prüfungen `~/Library/Caches/CSXS` leeren. Jede Extension hat eine eigene Skript-Umgebung und lädt den Kern nur beim Start – Tests, die den Kern bei jedem Aufruf laden, sehen eine andere Fassung als das Panel.
15. **Nur unter `tests/out/` schreiben.** Originale (Skripte, MockUps, Vorlagen, Kundendateien) nur kopieren oder öffnen; Unverändertheit per mtime/Prüfsumme belegen.

## B. Aufbau, der sich bewährt hat

- **Zwei getrennte Kanäle.** JSX direkt per osascript (`do javascript` lädt eine Datei über `$.evalFile`, Fehler kommen als String `JSXERR: … line n` zurück, Rückgabe = letzter Ausdruck, `with timeout of 600 seconds`). Panel per Chrome-Remote-Debugging (Ports aus `.debug`, `Runtime.evaluate` mit `awaitPromise`/`returnByValue`). Die Abnahme (`abnahme.js`) ließ dieselben Abläufe wie das Panel (`panel/lib/auftrag.js`) in Node laufen, nur mit `host = osascript` statt `evalScript` – Geschäftslogik ohne Panel prüfbar, Panel-Tests nur für die Oberfläche.
- **Host-Adapter** (`tests/host.js`): je Aufruf eine Temp-`.jsx` mit Testschalter + Kern + Testhelfer + Code; Antwort muss JSON `{ok, …}` sein, sonst Fehler mit den ersten 500 Zeichen.
- **Testhelfer in JSX** (`testhelfer.jsx`): jede Funktion in `wrap()` → `{ok:false, error:"… (Zeile n)"}`; Helfer für Dokumente anlegen (mehrere Zeichenflächen, Ebenen, Objekte in realen mm bei Maßstab), Auswahl setzen, `dokStand()` (Zeichenflächen, Ebenen, Objekte, Bounds), `objektInfo`, `masse`, `farbStand`, `lageDruckCut`, Schließen mit Schutz, Bögen per XMP finden, PDF ohne Rückfrage öffnen (`pageToOpen = 1`), fremdes Skript mit vorgegebenen Dialogantworten über `$.global` ausführen. Liste in `~/tools/folienkalkulation/tests/testhelfer.jsx`.
- **Alt = Neu**: Testkopien der Originalskripte mit festen Dialogantworten und ohne OPOS erzeugen, Lagen aller Cutkonturen, Druck-Ebene, Zeichenfläche und Info-Text auf 0,01 mm vergleichen.
- **Prüfung über das fertige PDF** (öffnen, vermessen) findet Fehler, die im Dokument unsichtbar sind (Pathfinder mit leerer Gruppe). PDF ohne `AIPrivateData`/`OCProperties` prüfen; jsPDF schreibt Text unkomprimiert, Inhalt per Regex prüfbar.
- **Fixtures** (`--aufzeichnen`): Rohdaten von `readDocument` als JSON für Unit-Tests ohne Illustrator; Sollwerte mit `_herleitung` unabhängig vom Code hergeleitet; Vergleich mit Toleranz (`IP.stringify` rundet auf 6 Stellen, 32-Bit-Koordinaten rauschen im µm-Bereich).
- **Ohne Illustrator prüfen, wo es geht:** Layouts mit den echten `index.html`/`style.css` statisch im Browser bei Zielgröße vermessen; Kontrollrechnungen per `node -e` gegen `panel/lib`; JSX-Kern in Node mit nachgebildeten Illustrator-Objekten; Netzlaufwerk-Erkennung über gemockte Einhängepunkte. Unit-Tests unter 2 s.
- **Dialog-Extension testen:** Öffnen über Button im Panel, dann vier Wartestufen (Port in `/json`, Element da, Fokus im ersten Feld, Testschalter gesetzt). Modalität nur über die Fensterliste des Systems belegbar (`fenster.swift`, CGWindowList; `window.screenX/Y` ist in CEF immer 0). Modale CEP-Fenster blockieren osascript-Skripte nicht; `evalScript` aus dem modalen Fenster funktioniert.
- **CDP-Expressions:** `const` im globalen Scope kollidiert beim zweiten Aufruf → in `{ }` kapseln oder Panel neu laden. Aus dem Panel heraus: `requestOpenExtension`, `closeExtension`, `getHostEnvironment`. „Fenster offen?“ über `curl localhost:<port>/json`.
- **Screenshots in CEF:** Emulation höherer Ansicht kachelt, `captureBeyondViewport` hängt sporadisch → in Fensterhöhe scrollen, Einzelbilder aufnehmen, mit PIL zusammensetzen; Element-Ausschnitte mit `clip`/`scale 2`. `screencapture` war in Stufe 1.1 nicht erlaubt (Sandbox), im Neubau liefert es die Hänger-Screenshots. Ganzseiten-Screenshots waren später entbehrlich – optische Abnahme macht Markus.
- **Rechner wach halten:** Gesamtlauf unter `caffeinate -dimsu`; zugeklapptes MacBook ohne Monitor schläft.
- **Vordergrund protokollieren** (`lsappinfo front` alle 200 ms) klärt, wer wann den Fokus hatte.

## C. Was nicht geht – nicht erneut versuchen

- Illustrator-Dialoge und ScriptUI-Dialoge per System Events erkennen oder klicken (A1). `do javascript` blockiert bei offenem modalem Dialog; ein ScriptUI-Dialog aus einem per Panel gestarteten Skript blockiert alle folgenden `evalScript`-Aufrufe des Panels.
- Fenster-X eines CEP-Dialogs per Remote-Debugging betätigen.
- `CSInterface.resizeContent()` bei ModalDialog (Illustrator 2026, 30.8.2): wirkungslos → Fenstergrößen fest im Manifest.
- Echte Maus/Tastatur: macOS fokussiert Knöpfe beim Klick nicht; Tastatureingaben ins Textwerkzeug per Skript nicht möglich (nachgestellt über Auswahl im Text, Zeichen einfügen, Zoom). Tests lösen Klicks/Tasten über das DOM aus.
- OPOS per Skript (Dummy-Regmarks stattdessen). „Symbol bearbeiten“ per Skript (Ersatz: neues Symbol anlegen, Instanzen umhängen). ASE-Bibliotheken per Skript öffnen. LAB-Werte an Vollton-/globalen Farbfeldern per Skript (MRAP). Anschnitt per Skript (`bleedOffsetRect` rundet auf ganze Punkt, PDF-Preset ignoriert ihn).
- Dauerabfragen an Illustrator per `evalScript` (PARM beim Skalieren) und Abrufe bei `focus`/Dokument-Ereignissen (Inhalt landete beim PDF-Import im falschen Dokument). Panel aktualisiert nur auf `mouseenter` und eigene Aktionen; Tests simulieren den Mauseintritt.
- Lauf in einer Linux-VM (kein macOS, kein `~/Desktop`): nicht aussagekräftig.
- Automatischer Neustart von Illustrator aus dem Wächter: im alten Projekt scheiterte der erste Start, ein leeres „Unbenannt-1“ blieb offen und ließ alle Folgeläufe am Testschutz scheitern; 5 von 7 Läufen des Gesamtlaufs brachen vor der ersten Prüfung ab. Im Neubau blieb der Wächter im Neustart hängen (ungültiger Beenden-Befehl, Panel nach Neustart wieder zu). Einschätzung: Hänger erkennen, Screenshot, Lauf beenden und melden – nicht neu starten.

## D. Illustrator-/ExtendScript-Eigenheiten mit Testwirkung

- MRAP: `spots.add()` direkt nach `documents.add()` (vorher `redraw`, einmal wiederholen); `duplicate()` direkt in eine Gruppe eines anderen Dokuments (in die Ebene duplizieren, dann `move()`). Ein „sporadischer“ MRAP trat später auch bei Markus auf – real, nicht wegerklären.
- `save()` speichert nur das vordere Dokument und meldet sonst nichts → Ziel nach vorn holen. Nach jedem Medium die Arbeitsdatei wieder aktivieren.
- Absturz Plugin „Snapomatic“ (intelligente Hilfslinien), wenn ein Skript direkt nach dem Schließen anderer Dokumente ein PDF öffnet → `smartGuides/isEnabled` für die Messung aus. Absturz beim Öffnen eines PDF/X-4 mit eingebetteter AI-Kopie (`preserveEditability`).
- `app.redraw()` ohne Dokument wirft „there is no document“.
- Dokumentprofil bringt eigene Volltonfelder („Cutkontour“, „Cutkontour 2“) und 6 Standardsymbole mit; Dokumentvorgabe sprachabhängig („Druck“/„Print“); `colorMode` im Preset bricht `addDocument` ab. Koordinatenursprung eines neuen Dokuments weicht ab (Versatz 210 bzw. 1,4 mm) → von der tatsächlichen Lage aus verschieben.
- 32-Bit-Koordinaten: auf 0,01 mm runden, Nesting-Toleranz 0,005 mm. Text: `geometricBounds` enthält Ober-/Unterlänge, exakt nur über umgewandelte Kopie – aber nie ein Hilfsdokument in `selectionInfo` anlegen (löste `documentAfterActivate` und eine Ereignisschleife aus).
- `Layer.pageItems` nur direkte Objekte; `Document.pageItems` zählt auch ausgeblendete/gesperrte; Stapelreihenfolge Objekte/Unterebenen nicht abfragbar (`zOrderPosition` unbrauchbar). Ausgeblendete Ebenen nicht per `Layer.move` verschiebbar. `selection` in einer Gruppe meldet die Gruppe; bei Textbearbeitung kann `selection` ein einzelner `TextRange` sein. Leere Untergruppe wird zwischen Lesen und Setzen von Illustrator selbst entfernt (Indexpfade verschieben sich).
- `SymbolItem` ohne Matrix, `breakLink()` ohne Rückgabe, Ebenenliste aktualisiert sich im selben Lauf nicht. `pageItems.getByName()` liefert bei CompoundPath kein `pathItems`.
- Steuerzeichen (U+0003) in Textfeldern machen JSON unlesbar → U+0000–U+001F maskieren. Umlaute in zerlegter und zusammengesetzter Form vergleichen (NFC).
- ExtendScript: kein `Array.map`, Sortierung nicht stabil (Index als zweiten Schlüssel), verschachtelter Ternär bei `null` falsch (mit `if` schreiben).
- `executeMenuCommand`: `OffsetPath v23` öffnet je Objekt einen Dialog, `v22` nicht.
- Kein Ereignis vor dem Speichern, keins beim Duplizieren; Auswahländerungen meldet Illustrator nicht zuverlässig an CEP. Pfad in `event.data` zwischen `<url>`/`</url>`, URL-dekodiert, ohne `file://`. Hintergrund-Extension (Custom) startet erst Sekunden nach den Panels und zählt Grafikzeit während des Tests mit (Erwartung als Band [Soll, Soll + 2)).
- Illustrator schreibt beim Speichern von `.ait` eine `.ai`. Dateisystem ohne Groß-/Kleinschreibung verdeckt falsche Dateinamen in Konfigurationen.
- Polygonzerlegung mit tausenden Ankerpunkten ließ Illustrator fast hängen (54 Pfade setzen ≈ 24 s).

## E. Zeiten (gemessen, als Orientierung für Zeitlimits)

- Panel nach Illustrator-Start erreichbar: 23 s (einzeln), 85 s (Gesamtlauf); Hintergrund-Extension einige Sekunden später.
- Unit-Tests 0,4–2 s. Abnahme komplett 79 s (178 Prüfungen) bis ~340 s bei allen Abschnitten; `druck` 52–192 s, einmal 5 min (Ausreißer, nur vermerkt); `textil` 67–87 s; Panel-Test voll 1:47 min; `teilc` 20 s; `objekte,details` 37 s.
- Zeitlimits, die sich bewährt haben: Berechnen 240 s, Summa/Druck/Save/PDF 120 s, Dialog zu + Datei da 30 s, Fenster öffnen 20 s, Einzelprüfung 15 s, Beenden 60 s bis TERM, Watchdog je Lauf 600 s (= doppelte längste Dauer, mindestens 10 min).
- Berechnen im Hintergrund 121 s statt 1 s.

## F. Abgleich mit `tests/illustrator/` im Neubau (Stand 31.10., Einschätzung)

1. **JSX läuft nur über das Panel** (`PAM.evalRoh` per CDP). Damit hängt jede Dokumentprüfung am Panel; der ScriptUI-Dialog aus 3.4 blockierte deshalb 3.5–3.9 komplett. Alt: JSX per osascript, Panel nur für Oberfläche – ein blockiertes Panel nahm die Dokumentprüfungen nicht mit.
2. **Hänger-Behandlung über System Events** (`fensterSchliessen`, `dialogAbbrechen`, Esc) – im alten Projekt als unzuverlässig belegt (A1). Der heutige Hänger bestätigt das.
3. **Automatischer Neustart** mit `open -b <Bundle-ID>`: Bundle-ID ist mehrdeutig (A3), Neustart-Automatik scheiterte in beiden Projekten (C). Einschätzung: Wächter nur erkennen und beenden.
4. **Dokumente über `fullName`** erkannt – heute im Lauf gescheitert („Unbenannt-n“), laut Testbericht inzwischen auf XMP umgestellt (A4).
5. **`vorholen()` nur bei Esc**, nicht vor Berechnen/Lesen (A2).
6. **Ein Lauf mit neun Abschnitten und 3600 s** statt einzeln aufrufbarer Abschnitte: ein Hänger im ersten Abschnitt lässt alle folgenden in die Zeitgrenze laufen (A12). `--nur` existiert, aber die Abschnitte bauen aufeinander auf.
7. Was im Neubau bereits richtig ist: Testschalter-Datei für `alert`/`confirm`/Datei-/Ordnerdialoge, DONTDISPLAYALERTS mit Rücksetzen, Skripte mit ScriptUI ausgenommen, Sicherung von `rechner.json`, Testschutz bei ungespeicherten Dokumenten, Rücksetzen bei SIGINT/SIGTERM, `klick` zeitversetzt, Polling mit `bis()`.
