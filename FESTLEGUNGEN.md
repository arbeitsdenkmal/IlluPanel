# Festlegungen

Eigene Festlegungen von Claude Code, die über den jeweiligen Auftrag hinausgehen (Verhalten, Grenzfall, Text, Struktur): Abschnitt je Teilstufe, nummeriert, je ein Satz. Das README übernimmt eine Festlegung erst nach Bestätigung durch Markus.

## 2a

Status: bestätigt 30.10. (SPEZ_02 §17)

1. Die Preisquelle besteht aus Kern und Adapter: Prüfung und Auflösung liegen in `preisquelle.js`, der Adapter liefert nur Zeilen.
2. `laden()` nimmt das Feld `preis` der Auftragsart (`fahrzeug` | `beschriftung`) als `gilt_fuer`.
3. `preise_freigegeben` ist Pflichtparameter. — geändert in 2b: kein Pflichtparameter mehr.
4. Gelesen werden nur sichtbare Objekte, gemessen wird nur Zugeordnetes.
5. Gesperrte Ebenen und Objekte werden zum Schreiben der Tags kurz entsperrt.
6. Plott gilt immer als getapt (Zeitanteil), `tape` im Datensatz bleibt dort `false`.
7. Komplexität bei Druck ohne Cutkontur wird als Stufe 0 gerechnet.
8. Zusätzliche Prüfungen: unbekannte Attribute, Stufen und Ebenen als Warnung; Abbruch bei Druckobjekt ohne passende Rolle, Tape ohne `tape_vk_m2` und ungültiger Anzahl.
9. Im Datensatz ist `netto` der Betrag nach Mindestbetrag vor Rundung, Fläche/Teile gelten je Exemplar, Minuten/Beträge für alle Exemplare, gerundet auf 2 bzw. 4 Nachkommastellen. — geändert in 2b: `mindestbetrag_greift` je Preisart (`vk`, `mindest`).
10. Die Varianten-Erkennung läuft vorerst nur bei Berechnen.
11. Neue Meldungstexte: „… hat eine ungültige Folie (…) – wird nicht berechnet“ und „…: Anzahl „…“ ungültig – ganze Zahl ≥ 1 erforderlich“.

## 2b

Status: bestätigt 30.10. (1–40 SPEZ_02 §17.1, 41–44 Auftrag 2c); Punkt 8, 13 und 26 geändert (Korrektur 2b), Punkt 42 mit neuem Wortlaut (Auftrag 2c); Punkte 45–46 offen (Fehlerauftrag 31.10.).

1. Originalfarben beim Umfärben liegen im neuen Tag `IP_Originalfarbe` (Schlüssel `originalfarbe` in `config/schema.json`), weil `IP_Original` ab SPEZ_02 die Id des Originals einer Variante trägt.
2. Das Fenster „Objekt“ hat eine feste Größe 480 × 470 für den Plott-Zustand (ORACAL 951 mit 145 Kacheln); bei Digitaldruck bleibt unten Leerraum, bei vielen Farben scrollt der Inhalt.
3. Der Panel-Zustand „Druckbogen vorn“ zeigt in 2b nur „· n“ (`bogen.nr`); die Gesamtzahl „/m“ kommt mit einem Feld im Bogen-XMP in 2c.
4. Im Panel sind die Abstände 3 px statt 5 px wie im MockUp, damit die fünf Zeilen in 122 px passen.
5. Ohne Panel-Dokument und bei einer Arbeitsdatei ohne Kalkulation bleiben alle fünf Panel-Zeilen stehen; nicht zutreffende Buttons sind gesperrt, „Auftrag“ ist aktiv.
6. Ein ausgewähltes Objekt ohne Illustrator-Namen heißt in der Objektzeile wie im Datensatz, sonst „Objekt“.
7. Folie und „×n“ stehen in der Objektzeile nur, wenn alle ausgewählten Objekte zugeordnet sind und Folie bzw. Anzahl gleich sind; Digitaldruck zeigt „<Medium> <Laminat>“ ohne Chip (wie in C3).
8. ~~„add“ ist ohne Auswahl gesperrt; orange ist „add“, solange die Auswahl leer oder nicht vollständig zugeordnet ist, sonst „berechnen“.~~ — geändert (Korrektur 2b): „add“ ist ohne Auswahl gesperrt und nicht orange; orange ist „add“, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst „berechnen“.
9. „Export“ ist bei Druckbogen vorn aktiv, tut in 2b aber noch nichts (Profil produktion in 2c).
10. „berechnen“ öffnet bzw. aktualisiert „Zusammenfassung“ nur, wenn ein Datensatz entstanden ist; Fehler und Hinweise stehen in einem Popup, Fehler zuerst.
11. Ereignisse: `de.pamnm.illupanels.objektFertig` (OK in „Objekt“), `de.pamnm.illupanels.objektOeffnen` (Doppelklick in „Zusammenfassung“, das Panel öffnet „Objekt“), `de.pamnm.illupanels.berechnet` (nach berechnen bzw. PDF, Absender in `data.von`); Übergabedatei `de.pamnm.illupanels.objekt.json` im temporären Ordner.
12. Die Übergabedatei enthält die Tape-Vorschläge je `IP_Id` aus dem letzten Datensatz; bei manuell gesetztem Tape ist der Vorschlag dort nicht ablesbar.
13. ~~„Tape“ wechselt per Klick zwischen „auto“ und „manuell“; „manuell aus“ gibt es nicht.~~ — geändert (Korrektur 2b): Tape hat drei Zustände, ein Klick schaltet weiter „Tape auto“ (kein Wert in `IP_Attribute`, Vorschlag gilt) → „Tape“ (`tape`) → „kein Tape“ (`kein_tape`); `kein_tape` schlägt den Vorschlag, `tape` setzt ihn, der Tooltip nennt den Vorschlag.
14. `IP_Folie` eines Plott-Objekts ist der Schlüssel seiner ersten Füllfarbe; weitere Farben ergeben sich beim Lesen aus den Füllungen.
15. K0 wird als fehlender Tag geschrieben; die Komplexität wird nur bei Objekten geschrieben, bei denen sie wirkt, und bei Digitaldruck angezeigt, sobald mindestens ein ausgewähltes Objekt eine Cutkontur hat.
16. Bei gemischter Art ohne neue Wahl bleiben Folie, Medium und Laminat je Objekt, nur Anzahl, Komplexität und Aufschläge ändern sich; sind nicht zugeordnete Objekte dabei, sperrt „Art wählen“ den OK-Button.
17. Medium und Laminat zeigen den gemeinsamen Wert aus Tags bzw. Vorauswahl (nicht zugeordnete Objekte zählen mit der Vorauswahl); ein Laminat, das ein beteiligtes Medium nicht erlaubt, ist gesperrt und wird bei der Medienwahl auf das erste erlaubte umgestellt.
18. Eine Farbzeile mit „✓“ lässt sich neu zuordnen; ein Klick auf eine Zeile markiert sie und stellt die Serie ihrer Folie ein.
19. Ein erneuter Klick auf die gewählte Serie hebt die Wahl auf (Suche über alle Serien); der Kachel-Tooltip ist der Farbfeldname wie im MockUp (z. B. „031 (751 C)“).
20. Enter im Feld „Farb-Nr.“ übernimmt nur bei genau einem Treffer, sonst passiert nichts (kein OK); nach jeder Zuordnung wird das Feld geleert.
21. Warnungen im Fuß: Texte wie bisher („Art wählen“, „Objekt enthält Konturen …“, „Objekt hat keine Füllfarbe“, „Digitaldruck darf keine Oracal-Farbe enthalten (…)“), offene Farbe „<Name>: keine Oracal-Farbe – bitte zuordnen“ wie im MockUp, ungültige Anzahl wie der 2a-Text ohne Objektnamen.
22. Ein leeres Feld „Anzahl“ lässt die Anzahl unverändert.
23. Umgefärbt werden neu gewählte Farben und Farben mit bekannter `farbzuordnung`; in `farbzuordnung` kommen nur neu gewählte Nicht-Oracal-Farben, in `vorauswahl` Medium und Laminat (bei gemeinsamem Wert im Digitaldruck) und die Serie der zuletzt gewählten Kachel.
24. Die Varianten-Erkennung beim Zuordnen läuft über alle Objekte der Rollen-Ebenen plus ausgewählte Objekte anderer Ebenen (hinten angehängt).
25. Zuordnen bricht wie bisher ab, wenn die Ziel- oder Quellebene gesperrt ist („Zielebene „…“ ist gesperrt“, „Objekt liegt auf gesperrter Ebene „…““); gesperrte Objekte werden kurz entsperrt.
26. ~~Zur Auswahl zählen nur oberste Objekte auf obersten Ebenen; Objekte in Unterebenen werden ignoriert.~~ — geändert (Korrektur 2b): Besteht die Auswahl nicht aus obersten Objekten (Objekte in Unterebenen), zeigt die Objektzeile gedimmt „Objekt in einer Unterebene“.
27. „Zusammenfassung“: Anzahl, Folie und Attribute kommen aus den aktuellen Tags, Teile (je Exemplar wie im Datensatz), m², Betrag (`produkt_vk`) und inkl. M. (`produkt_vk` + `montage_vk`) aus dem Datensatz.
28. Bei mehrfarbigen Plott-Objekten zeigt „Zusammenfassung“ alle Folien aus dem Datensatz kommagetrennt mit dem Chip der ersten.
29. Unbenannte Objekte heißen in „Zusammenfassung“ „Objekt n“ (Zugeordnete in Ebenenreihenfolge, „Ohne Zuordnung“ zählt weiter); ein Name aus dem Datensatz hat Vorrang.
30. Varianten stehen eingerückt unter ihrem Original, wenn es in der Liste ist, sonst an ihrem Platz, jeweils mit „· Variante“.
31. Die Gruppe „Ohne Zuordnung“ (Sandbox und nicht zugeordnete Objekte auf Plott/Druck-Ebenen) erscheint nur, wenn es solche Objekte gibt; ohne Datensatz fehlen Folien, Summen und Grafik.
32. Summen: Material = Σ Material + Tape-Material, Produktion und Montage in € = Minuten × VK-Satz, „davon je Auftrag“ = Montage gesamt − Σ Montage der Objekte (Auftragsmontage + Reinigen-Rest).
33. „Mindestbetrag Produkt greift“ steht bei „nur Aufkleber“, „Mindestbetrag Montage greift“ bei „inkl. Montage“, jeweils an der VK- bzw. Mindest-VK-Zeile.
34. Vor dem PDF wird automatisch berechnet; scheitert das, gibt es ein Popup und kein PDF, die Hinweise eines erfolgreichen Laufs stehen nur im PDF.
35. PDF-Kopf: Kunde fett, darunter „<Auftragsart> · Maßstab 1:n“ und rechts „Datum: TT.MM.JJJJ“; Abschnitte „Objekte“, „Folien“, „Warnungen“.
36. Zahlen werden deutsch mit eigener Funktion formatiert (`zuordnen.zahl`), unabhängig von der ICU-Ausstattung.
37. Neue Module `panel/lib/zuordnen.js` und `panel/lib/zusammenfassung.js` (Regeln ohne Oberfläche, gemeinsam für Fenster und PDF) und gemeinsames Fenster-CSS `panel/fenster.css`.
38. „Zusammenfassung“ hat die Mindestgröße 480 × 240.
39. Datensätze aus 2a mit `mindestbetrag_greift` ohne Preisart werden als VK gelesen.
40. `preise_freigegeben` wird, falls vorhanden, weiter auf 0/1 geprüft.
41. Enthält die Auswahl ein Objekt in einer Unterebene, gilt sie im Panel als leer: „add“ ist gesperrt und nicht orange (wie ohne Auswahl).
42. Tape-Tooltip: „Tape: <Tape | kein Tape | unterschiedlich | erst nach „berechnen“>“.
43. Tape bei Mehrfachauswahl mit unterschiedlichen Zuständen: gestrichelt mit der Beschriftung „Tape auto“, der erste Klick setzt alle auf „Tape auto“; gedrückt ist der Button, wenn Tape wirkt („Tape“ oder „Tape auto“ mit Vorschlag Tape).
44. Stehen `tape` und `kein_tape` beide in `IP_Attribute`, gilt `kein_tape`; „Zusammenfassung“ zeigt „Tape“ bei `tape` und bei „auto“ mit Tape im Datensatz.
45. (Fehlerauftrag 31.10., offen) OK verwendet die wirksame Art – neue Wahl oder die für alle Objekte gleiche Vorauswahl (nach Tag, Sandbox, Ebene) – für Tags, Umfärben/Zurückfärben und Zielebene; nur bei gemischter Art ohne neue Wahl bleibt es bei Punkt 16.
46. (Fehlerauftrag 31.10., offen) Ist Plott gesperrt, nennt der Tooltip des Plott-Buttons den Sperrgrund mit den Texten aus Punkt 21 („Objekt enthält Konturen – bitte entfernen oder umwandeln“ usw.).

## 2c

Status: bestätigt 31.10. (SPEZ_02 §17.2). Rückfrage 31.10. beantwortet: Druckbogen-Nummer, „n von m“, NN im Dateinamen und `bogen.gesamt` zählen je Medium + Laminat + Rolle.

1. Die Lagesuche der Passermarken rechnet mit den Begrenzungsrechtecken der Blätter (Pfad, zusammengesetzter Pfad, Textrahmen) je Farbe; Abstand ist der kürzeste Abstand zweier Rechtecke.
2. Eine Marke gilt als „in der linken Hälfte“, wenn sie ganz innerhalb des Umrisses und ganz links der Umrissmitte liegt (rechts entsprechend).
3. Die beiden Marken halten auch zueinander mindestens `abstand_mm`; gibt es innen kein solches Paar, liegt die rechte Marke außen.
4. Rasterreihenfolge ist Zeile für Zeile von oben links; bei gleicher Blockflächensumme entscheidet zuerst die Lage der linken, dann die der rechten Marke.
5. Ist schon die kleinste Stufe größer als `anteil` × kürzere Umrissseite, gilt die kleinste Stufe (5 mm).
6. Ein Block, der in keiner Lage passt, bricht ab mit „<Objekt> (<Folie>): Block mit Passermarken <b> × <h> mm passt in keiner Lage in <n> mm Höhe“.
7. Die Rüstzeit wird bei Blöcken nach der Fläche ohne Marken verteilt, damit die Marken nur über das Nesting auf Verbrauch/EK wirken.
8. Im Schneidedokument werden die Marken (Name „Passermarke“, Füllung Farbfeld der Farbe) an ihrer Lage im Realmaß relativ zu den Teilen gezeichnet und mit ihnen gruppiert, skaliert und gedreht.
9. An Lücken geteilte Teile heißen im Schneidedokument „<Anzeigename> <k> <i>/<n>“.
10. Ohne passende Objekte melden Summa „Keine Plott-Objekte“ und Druck „Keine Digitaldruck-Objekte“.
11. Ältere Bögen mit höherer Nummer stehen im Popup unter „Ältere Bögen mit höherer Nummer (bleiben liegen):“, geprüft im Zielordner des Exports (Server-Auftragsordner, sonst lokal).
12. Der Hinweis zur Ist-Lage bei Summa lautet wie bisher „<Datei>: „<Teil>“ weicht n mm von der Planung ab“ und gilt wie beim Druck ab 0,1 mm einschließlich.
13. Die Aufbau-Id ist der Millisekunden-Zeitstempel als Text, `aufbau.zeit` die ISO-Zeit.
14. Das Bogen-XMP entsteht als neues Dokumentobjekt (Rolle `druckbogen`, Maßstab 1, Quelle „leer“, leere Grafikzeit und Exporte) mit Kopien von `auftrag` und `ablage` der Arbeitsdatei.
15. Offene Druckbögen werden über `bogen.aufbau`, `medium`, `laminat` und `nr` im XMP gefunden, nicht über den Dokumentnamen.
16. Je `IP_Id` gibt es einen eindeutigen Namen (Anzeigename, bei Doppelung „ (2)“); Instanzen heißen „<eindeutiger Name> <k>“, auch wenn eine Variante das Symbol des Originals nutzt.
17. Der Geometrievergleich der Varianten nutzt wie bisher 0,1 mm Toleranz im Realmaß gegen den Bezug des Original-Symbols; die Form liefert `objekteLesen` für jedes gemessene Digitaldruck-Objekt.
18. Prüfhinweise beim Druck tragen das Präfix „<Medium> <Laminat>, Bogen n: “; „Cutkontur ragt über die Objekt-Außenkante“ und die Cutkonturen-Zahl werden am Symbolinhalt beim Anlegen des Symbols geprüft.
19. Ist die Arbeitsdatei beim Export nicht offen, lautet das Popup „Arbeitsdatei nicht geöffnet:“ mit dem Pfad.
20. Befunde der Sammelprüfung (keine Cutkontur, Breite) und „stammt aus einem früheren Aufbau – nicht gespeichert“ haben die Texte des alten Projekts; Cutkontur- und Breitenbefunde stehen gemeinsam in einem Popup.
21. „Keine offenen Druckbögen“ nennt darunter offene Bögen früherer Aufbauten.
22. Die Breite wird in der Sammelprüfung am noch nicht umgewandelten Bogen geplant und nach dem Umwandeln für das Zeichnen erneut.
23. Mit `ersetzen` entfernt der Exportkern eine lokal liegende alte Datei gleichen Namens vor dem Schreiben.
24. `IP.xmpLesen`, `IP.xmpSchreiben` und `IP.dokumentSpeichern` nehmen optional einen Dokumentpfad; Summa, Druck und Export schreiben XMP und speichern gezielt in der Arbeitsdatei.
25. Name und CMYK des Cutkontur-Farbfelds kommen aus `druck.cut_farbfeld`/`cut_cmyk` der Auftragsart statt aus einer Konstante im JSX-Kern.
26. Summa und Druck sind bei kalkulierter Arbeitsdatei immer aktiv, Export auch bei kalkulierter Arbeitsdatei.
27. Popup-Reihenfolge bei Summa und Export: Meldung des Exportkerns, Hinweise, ältere Bögen, Warnungen der Prüfungen.
28. Nach dem Schreiben von `aufbau` wird die Arbeitsdatei nicht erneut gespeichert; das geschieht vor dem Export.
29. Die Startprüfung verlangt `passermarken.stufen_mm` (> 0, absteigend), `anteil` (> 0 und ≤ 1) und `abstand_mm` (≥ 0).
30. Neue Module `passermarken.js`, `herkunft.js`, `opos.js`, `schneidedaten.js`, `druckbogen.js`; `auftrag.js` enthält die gemeinsame Analyse sowie `summa`, `druck` und `exportDruckboegen`.

## 2d

Status: Punkte 1–19 bestätigt 31.10. (Auftrag Nachtrag 2d), Punkt 9 und 10 geändert, Punkt 19 angepasst (Version); Punkt 5 geändert und Punkte 20–26 entfallen mit SPEZ_02 Fassung 8 §12 (3.7.2); Punkt 27 gilt unverändert (Markus 31.10.).

1. Der Puffer liegt im Ordner der `rechner.json` (`konfiguration.rechnerOrt`), damit die Plattformunterscheidung des Rechnerordners in `konfiguration.js` bleibt.
2. Schlüssel im Puffer sind Pfade in Unicode-NFC, weil macOS Umlaute in Ereignisdaten und `fsName` unterschiedlich zusammengesetzt liefern kann.
3. Die Id eines Puffereintrags entsteht wie `IP_Id` (`teile.neueId`, zeitbasiert + Zufall).
4. Ein fehlender oder ungültiger Puffer gilt als leer; Pfade ohne Einträge entfallen beim Schreiben.
5. Dokumente aller Rollen außer `druckbogen` werden ihrem eigenen Pfad gutgeschrieben; ~~ein Druckbogen ohne `bogen.arbeitsdatei` wird nicht gezählt~~ — geändert (SPEZ_02 Fassung 8 §12, 3.7.2): kein Druckbogen wird gezählt (alle `bogen.art`), keine Gutschrift an die Arbeitsdatei.
6. `von`/`bis` gehen unverändert (ISO-Zeit mit Millisekunden) aus dem Puffer ins XMP; „+m“ schreibt die ISO-Zeit mit Millisekunden.
7. Die Übernahme läuft vor der eigenen Aktion, damit „berechnen“ die neuen Minuten im Block `grafik` hat und Summa/Export die Einträge mitspeichern; bei „+m“ in einem XMP-Schreiben zusammen mit dem manuellen Eintrag.
8. Fehler der Übernahme bei Maus ins Panel und vor einer Aktion bleiben still (Einträge bleiben im Puffer, die Aktion läuft weiter); bei „+m“ erscheinen sie als Popup.
9. ~~„berechnen“ und „PDF“ im Fenster „Zusammenfassung“ übernehmen nicht aus dem Puffer, weil nach §12 nur das Panel schreibt.~~ — geändert (Nachtrag 2d): „berechnen“ im Fenster „Zusammenfassung“ übernimmt vor dem Rechnen ebenfalls aus dem Puffer (still wie im Panel); „PDF“ übernimmt nicht.
10. ~~Bei vorderem Druckbogen übernimmt das Panel nichts, auch nicht bei Export (§12: vordere Arbeitsdatei).~~ — geändert (Nachtrag 2d): Export bei vorderem Druckbogen übernimmt für die Arbeitsdatei des Exports (`bogen.arbeitsdatei`, wenn sie offen ist); sonst übernimmt das Panel bei vorderem Druckbogen nichts.
11. Nach CSEvents aus „Objekt“, „Zusammenfassung“ und „Auftrag“ liest das Panel nur neu, ohne Übernahme.
12. „+m“ nimmt nur ganze Zahlen mit optionalem Vorzeichen; das Feld wird nach Enter immer geleert.
13. Der Block `grafik` rundet `min_auto` und `min_manuell` auf 2 Nachkommastellen wie die übrigen Minuten im Datensatz.
14. Ereignis-URLs unter Windows (`file:///C:/…`, `file://server/…`) werden zu Laufwerks- bzw. UNC-Pfaden und gelten nur, wenn die Datei existiert.
15. Windows: der PowerShell-Prozess startet mit der ersten Abfrage (`-EncodedCommand`), nach seinem Ende mit der nächsten neu und wird beim Beenden der Extension geschlossen; `vorn()` und `leerlaufSekunden()` eines Takts teilen sich eine Anfrage.
16. Eine Antwort der Aktivitätserkennung nach mehr als 3 s gilt als „nicht aktiv“ (Zeitlimit wie im alten Projekt).
17. Die Hintergrund-Extension startet über `ApplicationActivate` wie im alten Projekt; Debug-Port 8092.
18. Ist der Rechnerordner nicht bestimmbar, zählt die Hintergrund-Extension nicht und das Panel trägt nur „+m“ ein.
19. Neue Module `aktivitaet.js`, `grafikzeit.js`, `dokument_xmp.js`; Version ~~3.1.0-2d~~ 3.1.0 in Manifest und `dokument.PANEL_VERSION` (Nachtrag 2d: CEP lehnt Versionen mit Bindestrich ab, siehe Testbericht).
20. ~~Ungespeicherte Druckbögen werden über `grafikzeit_druckboegen.json` neben dem Puffer zugeordnet: `{ "<Dokumentname>": "<Pfad Arbeitsdatei>" }`, atomar geschrieben wie der Puffer.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
21. ~~Die Zuordnung schreibt das Panel nach `auftrag.druck` (Rückgabe `dokumente`, `arbeitsdatei`), damit `auftrag.js` den Rechnerordner nicht berührt; eingetragen werden nur Bögen, die danach ungespeichert offen sind.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
22. ~~Einträge zu Dokumenten, die nicht mehr ungespeichert offen sind (gespeichert oder geschlossen), entfallen im Panel bei „Druck“, bei Maus ins Panel und nach jeder eigenen Aktion (`IP.dokumenteListe`, nur wenn es Einträge gibt), weil die Hintergrund-Extension Illustrator nicht abfragt.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
23. ~~Die Hintergrund-Extension leert die Zuordnung bei ihrem Start, weil die Namen „Unbenannt-n“ in jeder Illustrator-Sitzung neu beginnen.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
24. ~~Die Hintergrund-Extension liest die Zuordnung je Takt (5 s) neu, weil „Druck“ sie erst nach dem Aktivieren der Bögen schreibt.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
25. ~~Wird das aktive ungespeicherte Dokument gespeichert, entfernt die Hintergrund-Extension seinen Eintrag; danach zählt es über sein XMP (Druckbogen → `bogen.arbeitsdatei`).~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
26. ~~Ein ungespeichertes Dokument ohne Eintrag (kein Bogen aus „Druck“) wird weiter nicht gezählt; ein Dokument ohne Pfad wird beim Deaktivieren über seinen Namen abgemeldet.~~ — entfällt (SPEZ_02 Fassung 8 §12, 3.7.2)
27. Die Übernahme ins XMP liegt als `grafikzeit.uebernehmenXmp(host, puffer, opts)` gemeinsam für Panel und „Zusammenfassung“ in `grafikzeit.js`.

## Werkzeuge

Status: offen (zur Prüfung durch Markus)

1. Messen läuft vor dem Fenster über die ungruppierte Auswahl (Vereinigung der sichtbaren Maße); nach OK wird gruppiert und wie im Skript an der Gruppe neu gemessen, bevor skaliert wird.
2. Die gemessene Breite steht im Feld wie im Skript (`fmtMm`): auf zwei Nachkommastellen gerundet, ohne Nullen am Ende (523,4 statt 523,40), wie im MockUp.
3. Der Parser übernimmt `parseStrictMmNumber` unverändert: Ergebnis auf zwei Nachkommastellen, die dritte rundet, weitere werden ignoriert (so verstehe ich „drei Nachkommastellen gerundet“).
4. Eingabefehler werden beim Tippen geprüft; der Fuß zeigt den ersten Fehler (Breite vor Zugabe), der volle Text steht im Tooltip, weil er bei 320 px Breite abgeschnitten wird.
5. Scheitert die Ausführung nach OK, erscheint der Fehler als Popup und das Fenster schließt (das Skript endete ebenfalls); das Panel liest danach in jedem Fall neu.
6. Fenster „Breite“: ModalDialog 320 × 120, Debug-Port 8093, Übergabedatei `de.pamnm.illupanels.breite.json` im temporären Ordner, CSEvent `de.pamnm.illupanels.breiteFertig`; `gemeinsam.js` erzeugt beide Übergabedateien über dieselbe Funktion.
7. Das Fenster lädt nur `schema.json` (für den JSX-Kern), nicht die ganze Konfiguration.
8. Masken: Gruppen auf gesperrten Ebenen (auch über eine gesperrte Elternebene) werden samt Inhalt übersprungen, ohne Fehler; das Skript lief dort in Ausnahmen.
9. Masken: das Popup listet die Ausnahmemeldungen, je Meldung eine Zeile, gleiche Meldungen nur einmal, ohne Überschrift.
10. Skript-Fehler: das Popup zeigt den Text aus dem try/catch unverändert (`FEHLER: <message> (Zeile n)`), ohne das Label davor wie im alten Panel; dazu wie im alten Panel vor dem Start die Prüfung „Skript nicht gefunden: <Pfad>“.
11. `werkzeuge.json`: Fehler der Datei selbst (fehlt, kein JSON, `skripte` fehlt, Eintrag ohne `datei`/`label`) sperren wie die übrigen Konfigurationsdateien das ganze Panel; ein fehlendes Skript erzeugt ein Popup „<Pfad> / Datei fehlt“ und sperrt nur seinen Button. Neue Grundtexte: „Feld skripte fehlt“, „skripte[n]: datei und label nötig“.
12. Tooltip der Skript-Buttons wie im alten Panel: Dateiname ohne `.jsx`, bei fehlender Datei „Nicht gefunden: <Pfad>“.
13. Zustände: ein Dokument mit unlesbarem Panel-XMP oder unbekannter Auftragsart gilt wie überall im Panel als Fremddokument; die Rollen `nutzenbogen` und `hilfsdokument` werden wie Arbeitsdateien nach `auftrag` beurteilt.
14. Sechste Zeile: Buttons 18 px hoch statt 22 px, weil die Zeile mit Linie und Abstand sonst 30 px braucht und 26 px (142 → 168) nicht reichen; alle fünf bisherigen Zeilen bleiben unverändert.
15. Jeder Button prüft beim Klick nach dem Neulesen die Freigabe erneut und tut nichts, wenn sie inzwischen nicht mehr gilt.
16. Version 3.2.0 in Manifest (alle Extensions) und `dokument.PANEL_VERSION`.

## Konfigurationen

Status: bestätigt 31.10. (SPEZ_03_Konfigurationen §10), Punkt 15 geändert. Auf Rückfrage entschieden (31.10.), keine eigene Festlegung: Offset mit Quelle „leer“ lässt die Ebenen der Vorlage unverändert; ein Wechsel der Maßstabsabfrage setzt die Vorbelegung ebenfalls neu.

1. Fehler in `produkte.csv` zeigt das Panel beim Start je Fehler als Popup (`<Datei>` / `Zeile n: <Grund>`), der Dialog sperrt den Button „Offset-Daten“ mit denselben Texten als Tooltip und wählt dann die nächste Art vor.
2. Grundtexte der CSV-Prüfung: „Spalte … fehlt in der Kopfzeile“, „schluessel fehlt“, „schluessel „…“ doppelt“, „bezeichnung fehlt“, „breite_mm muss > 0 sein“, „hoehe_mm muss > 0 sein“, „zeichenflaechen „…“ unbekannt (1, 2 oder 1/2)“, „ausrichtung „…“ unbekannt (hoch, quer oder hoch/quer)“, je mit „Zeile n:“ davor (Zeile der Datei, Kopfzeile = 1).
3. Die CSV-Prüfung überspringt Leerzeilen, trimmt Werte, entfernt ein BOM, erlaubt bei Maßen das Dezimalkomma, findet die Spalten über die Kopfzeile und verwirft bei einem Fehler die ganze Liste.
4. Grundtexte der Roll-up-Prüfung: „Feld rollup fehlt“, „rollup[n]: kein Objekt“, „rollup[n]: id fehlt oder ist „banner““, „rollup[n]: name fehlt“, „rollup[n]: breite_mm und hoehe_mm müssen > 0 sein“, „rollup[n]: vorlage fehlt“, „rollup: id doppelt: …“, „Feld banner.name fehlt“.
5. Von den neuen Feldern in `offset.json` prüft der Start nur `produkte`; fehlt es, meldet `produkteLaden` „Feld produkte fehlt“ wie einen CSV-Fehler (nur Offset gesperrt).
6. Die Produktliste beginnt mit einem leeren Eintrag (keine Vorauswahl); ein Tooltip steht nur an gesperrten Einträgen und nennt alle erwarteten Pfade, je Zeile einen.
7. Offset und Roll-up nutzen dieselbe JSX-Grundlage `produktvorlage`, unterschieden durch `platzierung` „zeichenflaeche“ (Offset) bzw. „block“ (Roll-up), statt einer eigenen Roll-up-Grundlage.
8. Vorlagenprüfung beim Anlegen: `<Datei>` ist der Dateiname der Vorlage, Grund „n Zeichenfläche(n) statt m“ bzw. „Zeichenfläche 1 ist B × H mm statt B × H mm“ (auf 0,1 mm, Komma); das freie Format (`Offset.ait`) wird nicht geprüft.
9. Beim freien Format ist `ausrichtung` auch im Wahl-Objekt `null`, weil es dort keine Wahl gibt.
10. Die Vorbelegung rundet das Realmaß auf 0,01 mm, setzt bei Offset höchstens Anzahl 2, behandelt „Datei öffnen“ vor der Dateiwahl wie „leer“ und ändert beim Wechsel des Produkts nichts.
11. Der Hinweis „<n> Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage“ zählt alle Quell-Zeichenflächen über die Zahl der Vorlagen-Zeichenflächen hinaus (auch leere) und erscheint im Dialog nach dem Speichern der Arbeitsdatei.
12. Objekte außerhalb jeder Quell-Zeichenfläche gelten wie im bisherigen Kern als Inhalt von Zeichenfläche 1 (ihr Versatz zu ihr bleibt).
13. Bei anderem Maßstab der Quelle skaliert die Übernahme in die Produktvorlage jedes Objekt samt Abstand zur Zeichenflächenmitte um Quelle/Ziel; die Ebenen bleiben gleichnamig (keine Sandbox).
14. Ausgelassen wird nur eine oberste Ebene der Quelle mit dem Namen aus `hilfslinien.ebene`; gleichnamige Unterebenen werden übernommen.
15. ~~Beim Roll-up wird eine Ebene „Hilfslinien“ der Vorlage weder nach oben geholt noch gesperrt und eine gleichnamige Ebene der Quelle übernommen, weil §4 dafür nichts festlegt.~~ — geändert (Korrektur 3.3.0): Roll-up behandelt „Hilfslinien“ wie Offset; eine oberste Quell-Ebene mit dem Namen aus `hilfslinien.ebene` (neu in `banner_rollup.json`, auf Rückfrage) wird nicht übernommen, die Ebene der Vorlage kommt nach oben, gesperrt, nicht druckend, bei „leer“ bleiben die Ebenen der Vorlage unverändert.
16. Der Block beim Roll-up ist der geometrische Umriss aller übernommenen Objekte; seine Mitte kommt auf die Mitte der Zeichenfläche.
17. Nach dem Anlegen aus einer Produktvorlage ist die oberste Ebene außer „Hilfslinien“ aktiv.
18. Meldungen des wmd-Sammelordners analog DTF: „wmd-Sammelordner nicht erreichbar, keine wmd-Kopie: …“, „<Datei>: wmd-Kopie fehlgeschlagen (…)“; die Ziele stehen als Liste `SAMMELORDNER` in `export.js`.
19. `export_offset.js` setzt `wmd` nur bei `export.sammelordner: "wmd_bestellen"`, damit der Sammelordner aus der Konfiguration kommt.
20. `export_flach.js` erkennt Roll-up an `banner_rollup.variante` ungleich „banner“; fehlt der Bereich (ältere Arbeitsdatei), gilt sie wie Banner ohne Anschnittangabe.
21. `dokument.neu()` schreibt `offset` und `banner_rollup` immer, `null` für die übrigen Arten.
22. Version 3.3.0 in Manifest (alle Extensions) und `dokument.PANEL_VERSION`.
23. Die Illustrator-Probe Thema 1 ist im TESTBERICHT unter 3.2.0 nachgetragen (Register, Offene Punkte 9).

## Schild

Status: offen (zur Prüfung durch Markus). Auf Rückfrage entschieden (31.10.), keine eigene Festlegung: `schild.json` bekommt den Block `druck` wie Beschriftung (Startprüfung verlangt ihn); Schild lädt die Preisliste ohne Auftragsart (nur allgemeine Prüfungen, Einträge „alle“) für Komplexitätsstufen, Aufschläge und Tape-Schwellen, ist sie fehlerhaft, läuft Schild still ohne diese weiter.

1. Medien für Digitaldruck bei Schild kommen aus `medien.json` ohne die Plott-Serien aus `serien.json`, Reihenfolge wie dort.
2. Fehlt `materialien` in `schild.json` oder ist die CSV nicht lesbar, gilt das wie ein CSV-Fehler („Feld materialien fehlt“, „Datei fehlt“): nur Schild gesperrt, nicht das ganze Panel (wie Offset, Konfigurationen Punkt 5).
3. Grundtexte der Material-Prüfung: „kuerzel fehlt“, „staerke muss > 0 sein“, „acryl „…“ unbekannt (ja oder nein)“, sonst wie `produkte.csv`; beide CSV-Prüfungen laufen über eine gemeinsame Funktion `csvAusText`.
4. Die Startprüfung verlangt zusätzlich `bohrungen.markierung` (Durchmesser > 0, CMYK) und `export.techniken` (rolle, name); Texte „Feld bohrungen.standard unvollständig (…)“, „Feld bohrungen.markierung unvollständig (…)“, „Feld export.techniken fehlt (…)“, „Feld export.laser unvollständig (…)“, „Feld druck unvollständig (…)“.
5. Anlegen: unbekanntes Material → „Material „…“ fehlt in schild_materialien.csv“; `schilder` ist nach dem Anlegen leer (`[]`).
6. Eine Schild-Quelle ohne Bereich `schild` (älteres Dokument) gilt als anderes Verfahren: alles auf die Sandbox.
7. Inhalt eines Schildes sind die obersten sichtbaren Objekte der Produktionsebenen, zugeordnet oder nicht, mit ihrer sichtbaren Begrenzung; Objekte außerhalb jeder Zeichenfläche zählen nicht (wie im alten Projekt).
8. Ein unbenanntes Objekt heißt in „ragt über mehrere Zeichenflächen“ wie in den Prüfungen von `teile.js`: „unbenanntes Objekt (<Typ>) ragt über mehrere Zeichenflächen“.
9. Gleichartige Warnungen der Schildregeln (gleicher Text nach „Schild NN: “) stehen in einer Zeile „Schild 01, 02: …“.
10. `schilder[]`: Endmaß auf 0,01 mm, Rechteck auf 0,01 pt gerundet; gespeichert werden nur die Felder der Anordnung (`keine`: nur `anordnung`); weitere Felder eines bisherigen Eintrags bleiben erhalten (Stufe 3).
11. Fenster „Schilder“: ModalDialog 560 × 360, Debug-Port 8094, CSEvent `de.pamnm.illupanels.schilderFertig`; Maß „B × H mm“ auf 0,1 mm mit Komma; Eingabe mit Komma oder Punkt; beim Wechsel der Anordnung bleiben die eingegebenen Werte stehen; leere oder ungültige Werte gelten als „Bohrungen passen nicht auf das Schild“; alle betroffenen Schilder stehen in einem Popup, je Zeile eines.
12. Fenster „Schilder“ ohne Schild (keine Zeichenfläche mit Inhalt) zeigt nur den Kopf, OK schreibt eine leere Liste; ohne vollständigen Bereich `schild` Popup „Schild: Verfahren oder Material fehlt“, das Fenster schließt.
13. Panel: Button „Schilder“ nur bei Profil `schild` sichtbar; „berechnen“ ist bei Schild nie orange; UV-Objekte zeigen kein „×n“.
14. Fenster „Objekt“: eine Vorauswahl, die das Verfahren nicht hat (z. B. Sandbox → Digitaldruck bei UV-Druck), gilt als keine („Art wählen“); „ragt über mehrere Zeichenflächen“ wird je Objekt der Auswahl an der sichtbaren Begrenzung geprüft (wie im alten Projekt).
15. OK mit UV-Vorn/UV-Hinten entfernt `IP_Folie`, `IP_Laminat`, `IP_Anzahl`, `IP_Komplexitaet`, `IP_Attribute` und holt Originalfarben eines als Plott umgefärbten Objekts zurück wie Digitaldruck.
16. Der Tape-Tooltip „Tape: erst nach „berechnen““ bleibt bei Schild bis zur MockUp-Runde unverändert, obwohl Schild nicht berechnet; ohne Tape-Schwellen gibt es keinen Tape-Vorschlag.
17. Summa und Druck: die Schildregeln laufen vor dem Lesen und Messen; ihre Warnungen stehen am Ende des Popups.
18. Export-Popup: Meldung des Exportkerns, Zeilen des Druckbogen-Exports, Warnungen der Schildregeln.
19. Druckbögen exportiert der Schild-Export nur, wenn Bögen des letzten Aufbaus offen sind, sonst still (kein „Keine offenen Druckbögen“); dann kopiert nur der Druckbogen-Export die Arbeitsdatei auf den Server (neu im Exportkern `arbeitsdatei.kopie: false`), damit es eine Kopie je Klick gibt.
20. Ohne Schild-Dateien und ohne offene Bögen läuft der Exportkern ohne Dateien (Arbeitsdatei-Kopie, Eintrag in `exporte[]`), ohne Meldung.
21. Export: nach dem Schreiben von `schilder[]` wird die Arbeitsdatei gespeichert; die Druck-PDF (Folie) entsteht nur, wenn auf dem Schild mindestens ein Digitaldruck-Objekt ohne Cutkontur liegt; die Laserdatei entsteht auch bei Anordnung „keine“ (nur Umriss).
22. Temporäre Elemente liegen auf einer obersten Ebene „IP_temp“ mit CMYK-Farben ohne Farbfelder; die Ebene wird vor dem Zurückspeichern der Arbeitsdatei entfernt.
23. `IP.dokumentInfo` liefert je Zeichenfläche zusätzlich Name und Rechteck (pt); das Fenster „Objekt“ nutzt das für die Zeichenflächen-Prüfung.
24. Ist ein Druckbogen einer Schild-Arbeitsdatei vorn, exportiert „Export“ wie bei Beschriftung nur die Druckbögen.
25. Die Regel „Schild: Verfahren oder Material fehlt“ verlangt ein Verfahren der Auftragsart und ein Material mit Kürzel und Stärke > 0.
26. Im Dateinamen wird der Kunde wie bisher umgeschrieben (`ablage.dateiname`), Kürzel und Stärke bleiben unverändert.
27. `dokument.neu()` schreibt `schild` immer (`null` für die übrigen Arten); Version 3.4.0 in Manifest (alle Extensions) und `dokument.PANEL_VERSION`.

## Textil

Status: bestätigt 31.10. (SPEZ_03_Textil §14), Punkte 1, 13, 18 geändert (Korrektur Textil); Punkte 17, 22, 32, 33 vorläufig bis zur MockUp-Runde.

1. ~~Der Umrechnungsfaktor je Druckgröße wird als `mass_mm` / Ist-Maß des Motivs im Dokument gerechnet.~~ — geändert (Korrektur Textil): der Faktor je Druckgröße ist nach §9.1 `mass_mm / mass_mm(zeigen)` × Modellfaktor, für Messung und Streifen; `mass_mm` / Ist-Maß des Motivs (sichtbare Grenzen, Bezug Breite bzw. Höhe) nur als Ersatzweg bei Modell ohne Realmaß (Faktor null).
2. Marke → Modell → Farbraster liegen als gemeinsame Komponente in `panel/lib/textil_wahl.js` (Anlegen, Fenster „Modell“, Fenster „Textilfarbe“), zusätzlich zu den Dateien aus §13.
3. Die Textil-CSVs liest `textil.js` mit einem eigenen kleinen CSV-Leser, `konfiguration.textilLaden` liest die Dateien; `id` in `textil_modelle.csv` muss eindeutig sein.
4. Grundtexte der Textil-CSV-Prüfung: „position fehlt“, „standard_mm muss > 0 sein“, „stufen_mm: jedes Maß muss > 0 sein“, „id fehlt“, „id „…“ doppelt“, „modell fehlt“, „dateimass_mm muss > 0 sein“, „realmass_mm muss > 0 sein“, „farbe fehlt“, „c/m/y/k müssen 0–100 sein“, „Zeile 1: Spalte … fehlt in der Kopfzeile“.
5. Grundtexte der `textil.json`-Prüfung: „Feld mockup_ordner fehlt“, „Feld marken fehlt oder ist leer“, „Feld … fehlt (Zahl > 0)“, „Feld … unvollständig (… > 0)“, „streifen.daten_breite_max_mm größer als zeichenflaeche_breite_mm − 2 × rand_mm“; fehlt `textil` in der Auftragsart („Feld textil fehlt“) oder ist eine Datei nicht lesbar, ist nur Textil gesperrt.
6. Die Startprüfung der Auftragsart Textil verlangt zusätzlich `kalkuliert_verfahren` nur aus DTF, Flex, Flock, Stick, `summa.preset` und `dateien.arbeitsdatei`; Pfadfelder für `export.sammelordner` sind `kunden`, `dtf_bestellen`, `wmd_bestellen`.
7. Preisquelle: `gilt_fuer` textil und `verfahren` flex/flock (Serie und Zeit) sind zulässig, `ek_m2`/`vk_m2` einer flex/flock-Serie dürfen leer sein (null), und beim Laden für textil sind die sieben Zeitschlüssel je flex und flock sowie `textil.mindest` und `textil.rundung` Pflicht.
8. Beim Anlegen Textil gilt ein lokaler Auftragsordner als belegt, sobald irgendein `Korrekturabzug_*.ai` darin liegt; die ID steht im Dateinamen umgeschrieben wie der Kundenname.
9. Wahl-Objekt: ein leerer Freitext ergibt `farbe: null`.
10. Texte beim Anlegen: „Modell wählen“, „Modell „…“: kein MockUp in <Ordner>“, „Textil: Konfiguration fehlerhaft (config/textil.json, textil_*.csv)“, „MockUp nicht gefunden: …“, „MockUp „…“: Ebene „ID“ fehlt“, „MockUp „…“: Ebene „ID“ braucht genau ein Textfeld“, „MockUp „…“: Ebene „Design“ fehlt“.
11. „Stofffarbe“ entsperrt zum Umfärben auch gesperrte Unterebenen kurz und stellt ihre Sperrung danach wieder her.
12. „Modell hinzufügen“ verlangt eine gespeicherte vordere Textil-Arbeitsdatei („Keine Textil-Arbeitsdatei vorn“, „Arbeitsdatei ist nicht gespeichert“), der Ordner ist der Ordner dieser Arbeitsdatei, `quelle.art` ist „leer“; ohne MockUp zeigt das Fenster im Fuß „Kein MockUp in <Ordner>“.
13. ~~Das Fenster „Motiv“ bricht schon beim Öffnen ab, wenn das Modell kein Realmaß hat.~~ — geändert (Korrektur Textil, §3.2): ohne Realmaß ist Zuordnen möglich, OK skaliert nicht, Tags und Ankerausrichtung wie sonst, kein Popup (Export und Streifen unverändert absolut auf `mass_mm`); das Fenster bricht beim Öffnen ab, wenn die Textil-Konfiguration fehlerhaft ist oder das Dokument keine Textil-Arbeitsdatei ist; bei fehlerhafter Preisliste erscheint ein Popup, DTF und Stick bleiben möglich, Flex/Flock ohne Serie.
14. Reihenfolge der Fußwarnungen in „Motiv“: Position wählen, Verfahren wählen, Sperrgründe, Druckgrößen (Maß, Menge), „Flexfarbe fehlt“, „Serie fehlt“.
15. Sperrtexte bei Flex/Flock: „Objekt enthält Konturen – bitte entfernen oder umwandeln“, „Objekt enthält Bilder – bei Flex/Flock nicht möglich“, „Objekt enthält Verläufe/Muster – bei Flex/Flock nicht möglich“, „Objekt enthält Transparenz – bei Flex/Flock nicht möglich“.
16. Transparenz heißt Deckkraft unter 100 % oder Füllmethode außer „Normal“ am Objekt oder an einem sichtbaren Teil darin (JSX `hatTransparenz`).
17. Der Flex/Flock-Block (Serie, Komplexität, Farben im Objekt mit eigenem Scrollbereich) steht zwischen den Silhouetten und den Druckgrößen, 82 px hoch und sonst unsichtbar mit Platz; die Druckgrößen-Tabelle scrollt.
18. ~~`IP_Stufen` speichert nur sechs Felder, die Körpergröße bei „Kinder“ wird nicht gespeichert.~~ — geändert (Korrektur Textil, §2.2/§7): `IP_Stufen` speichert als siebtes Feld `koerpergroesse_cm` (nur bei „Kinder“, sonst null), „Motiv“ zeigt beim Öffnen wieder „Kinder“ mit der Körpergröße; blockout ist bei Stick immer false.
19. OK in „Motiv“ entfernt immer `IP_Anzahl`, `IP_Laminat`, `IP_Attribute`, bei DTF/Stick zusätzlich `IP_Folie`, `IP_Farbe`, `IP_Komplexitaet`; K0 steht ohne Tag.
20. „Motiv“ meldet OK über das CSEvent des Fensters „Objekt“ (`objektFertig`), „Textilfarbe“ und „Modell“ über das neue `de.pamnm.illupanels.textilFertig`; Debug-Ports 8095 (.motiv), 8096 (.textilfarbe), 8097 (.modell).
21. Panel: ein Textil-Motiv gilt als zugeordnet mit `IP_Position` und `IP_Verfahren`; die Freigaben der kalkulierten Arten (Fenster „Objekt“, Druck, Druckbogen-Export, zwei Preise) gelten nicht für Profil `textil`.
22. Panel: der Preis steht vorläufig rechts in Zeile 5 ohne Beschriftung; der Chip der Textilfarbe kommt aus `hex` der CSV, sonst grob aus CMYK; ohne Farbe zeigt der Button grau „Farbe“.
23. Der Anzeigename „Objekt n“ zählt bei Textil nur die Motive (mit `IP_Position`) auf „Design“ in Ebenenreihenfolge.
24. Texte beim Lesen und Messen: „„…“: Verfahren „…“ unbekannt – wird nicht berechnet“, „„…“: keine Druckgröße“, „„…“, Druckgröße n: Maß fehlt“ bzw. „Menge fehlt“, „„…“: Serie „…“ steht nicht in der Preisliste (verfahren …)“, „Serie „…“ hat keinen Preis (ek_m2, vk_m2) für „textil““, „„…“: Kontur auf Flex-/Flock-Motiv“ (Sammelzeile „n Flex-/Flock-Motive mit Kontur“), „„…“ enthält keine Füllfarbe – wird nicht berechnet“, „„…“, Druckgröße n: B × H mm passt in keiner Lage in 470 × 1490 mm“ (Block: „(<Farbschlüssel>): Block mit Passermarken …“), Summa ohne Streifen „Keine Flex-/Flock-Motive“.
25. Summa mit fehlerhafter Preisliste läuft ohne Serienprüfung und ohne Komplexitätsprozente weiter.
26. In den Streifen zählt k der Gruppe „<Anzeigename> <k>“ über alle Druckgrößen eines Motivs fortlaufend, damit die Gruppennamen eindeutig bleiben.
27. Rüsten und Datei je Farbschlüssel werden nach `fläche_m2(e, f)` × Menge (Stückfläche der Farbe ohne Abstand) auf die Exemplare verteilt.
28. Falten nimmt den Zeitschlüssel mit Verfahren „alle“.
29. Datensatz Textil: `betraege` behält die bisherigen Felder (`tape`, `montage_vk`, `montage_mindest` = 0) und ergänzt `mindest_greift { vk, mindest }`; `preise.mindestbetrag_greift` ist null; `minuten { ruesten_anteil, entgittern, trennen, produktion, pressen }`; `auftrag { falten_min, textilzahl, produktion_min, pressen_min, pressvorgaenge }`; `folien[]` mit `farbe`.
30. berechnen schreibt bei Textil immer einen Datensatz und öffnet „Zusammenfassung“, auch ohne Motive.
31. Der aufgerundete Preis wird nach dem Aufrunden auf Cent gerundet (gegen Gleitkomma-Reste bei 0,10 €).
32. Zusammenfassung Textil: eine Zeile je Motiv mit den Druckgrößen untereinander („… · blockout“, „… · zeigen“), Teile aus dem Datensatz, Betrag = Σ der Druckgrößen; Preiszeile heißt „Preis“, Produktion, Pressen und Falten nur in Minuten; der Hinweis „Mindestbetrag je Motiv greift (n Exemplare)“ steht an Preis und Mindest-VK mit der jeweiligen Zahl.
33. PDF Textil: Kopfzeile „Textil · <Marke> <Bezeichnung> · <Textilfarbe>“, Objekte mit Motiv, Position, Verfahren, Druckgrößen, K, Teile.
34. Export Textil: Varianten-Erkennung vorher; weitere Namen-Bögen tragen denselben Namen und werden vom Exportkern nummeriert; der Server-Auftragsordner zählt für `_<ID>` nur, wenn der Server erreichbar ist; Befunde erscheinen ohne Vorspann in einem Popup („„…“: keine Druckgröße“, „„…“, Druckgröße n: Menge fehlt“, „„…“, Druckgröße n: <Namen-Befund>“, „„…“: Namen-Gruppe ist leer“).
35. Exportkern: das optionale `auftrag.sammelordner` ersetzt nur für die Liste `dtf` das Feld `dtf_bestellen`.

## Nutzen

Status: bestätigt 31.10. (SPEZ_03_Nutzen §11), Punkte 1–23; Punkt 6 geändert (Korrektur Thema 5).

1. Das Panel ist 320 × 194 (Inhalt 174 px) statt 320 × 186 (166 px): die siebte Zeile in der Optik der sechsten (Linie, Abstand, 18 px hohe Buttons) braucht 26 px wie diese, mit 18 px müssten die bisherigen Zeilen enger werden.
2. In der Layoutzeile (`planZeile`) heißt der frühere Teil „n× drucken“ jetzt „n Bögen“ (Zahl der Druckbögen des Aufbaus), auch bei n = 1.
3. Die Messung der Nutzen-Auswahl nimmt als Begrenzung die sichtbare Begrenzung des Druckbogen-Kerns (`visibleBounds`, Text geometrisch, Schnittmaske = Maskenpfad), damit Anschnitt, Ausrichtung der Instanzen und OPOS-Bezug übereinstimmen; das alte `nkVisualBounds` nahm `geometricBounds`.
4. „2 × Anschnitt quer“ bzw. „längs“ (§5.4) ist der Anschnitt links + rechts bzw. oben + unten nach der Drehung des Motivs; die Zeichenfläche ist damit genau Begrenzung + 22,1765 mm je Seite, der Detailtext zeigt diese Zeichenfläche.
5. Die Abstandsprüfung des Kerns läuft bei Nutzen mit Abstand Motive − größter Anschnitt eines Paars (links + rechts bzw. oben + unten), bei Gitter mit der Streifen-Lücke (Teilung − Etikettbreite), bei MB mit `mb.abstand_mm`; sonst würde jede geplante Nachbarschaft gemeldet.
6. ~~Die Bahnlänge in Vorschau und Info („Materiallänge“) bleibt die des Planers (Nutzen + OPOS-Rand, ohne Anschnitt), wie im alten Projekt.~~ — geändert (Korrektur Thema 5, §11): die Materiallänge in Vorschau und Info ist die Summe der Zeichenflächenlängen aller Bögen des Aufbaus einschließlich Anschnitt (Nutzen: Planerlänge + Anschnitt oben und unten je Bogen; Gitter und MB ohne Anschnitt, dort unverändert, Gitter je Druck der Auflage); die Sortierung der Layouts bleibt bei der Planerlänge.
7. Format „ohne“: eine Variante je Motivdrehung, Duplikat bei gleicher Spaltenzahl, Zeilenzahl und Breite; Füllung „<n> Plätze je Motivzeile, <z> Motivzeile(n).“, bei mehreren Bögen „<p> Bögen: (p − 1)× voll (<r> Motivzeilen) + 1× mit <z> Motivzeile(n) – exakt <n> Stk.“, sonst „Letzte Motivzeile <k> von <n> Plätzen belegt – exakt <n> Stk.“; kein Layout: „Kein Layout berechenbar. … passt mit … mm Abstand nicht auf das Medium.“
8. Info-Ebene Nutzen: „Motive im Bogen“, „Bogen n von m“ als eigene Zeile nach „Benötigt“, Medium, Laminat und Rolle als drei Zeilen „Medium:“, „Laminat:“, „Rolle:“ statt „Medienbreite“; bei „ohne“ entfallen Bogen, Bogen-Außenmaß, Schnitt, Bögen gesamt und „Bögen“ bei den Abständen, Füllung „<n> Plätze je Motivzeile“ / „<z> Motivzeile(n)“; „Letzte Motivzeile“ und die Drucke-Zeilen entfallen.
9. Vorgabe in der Vorschau: „Medium <Medium> <Laminat>, Rolle <Breite> mm“; bei „ohne“ „Zielformat: ohne“ und nur der Motivabstand.
10. Mehrere Bögen bei A4/A3: Bogen 1 … p − 1 mit `maxBZ` vollen Bogenzeilen, der letzte mit dem Rest auf volle Motivzeilen; Detailtext „<p> Bögen: (p − 1)× voll (… Bogenzeilen) + 1× mit … Bogenzeile(n) / … Motivzeile(n).“ (ohne „Rest im letzten Druck löschen“).
11. Namen: Nutzen Symbol „<Produkt>“, Instanz „<Produkt> <k>“ fortlaufend über den Aufbau; Gitter Symbol „<Dateiname>“, Instanz „<Dateiname> <k>“; MB Symbol „Nummer <n>“ (wie die Felder im Fenster), Instanz „Nummer <n> <k>“.
12. Einstieg A nimmt den Maßstab der Arbeitsdatei, B den des Panel-XMP der Quelle, sonst 1; Medium bei A über den Alias aus `medien.json` wie im Fenster „Objekt“, Stückzahl ohne gültiges `IP_Anzahl` 1.
13. Prüfungen in Schritt 1 wie bisher (`parseInt` der Stückzahl); bei B zusätzlich Kunde, Medium und Laminat Pflicht, bei beiden Produkt; die Medienliste kommt aus der Preisliste wie im Fenster „Objekt“ (Preisliste ungültig → Popup, Fenster schließt).
14. Gitter-Info: die Zeile „Schrift: n Textobjekte in Pfade“ entfällt (nicht in der Liste §6.4); Hinweis „„<Datei>“: n Textobjekt(e) konnten nicht in Pfade gewandelt werden.“; Prüfmeldungen des Kerns mit „Bogen n: “ davor.
15. MB-Info: „Bogen: n von m“ (Wortlaut der Gitter-Info) nur bei mehreren Bögen; bestellt/gebaut je Nummer und „Material ges.“ über den ganzen Aufbau, „Schilder“ und Blöcke (Nummerierung ab 1) je Bogen.
16. MB-Zeilen werden der Reihe nach auf Bögen verteilt, ein neuer Bogen beginnt, wenn die nächste Zeile über `max_laenge_mm` − OPOS-Rand hinausginge.
17. Exporte ohne Arbeitsdatei: der vorab geschriebene `exporte[]`-Eintrag trägt Ordner und Dateinamen mit `uebertragen: false`; der endgültige Eintrag erreicht nur noch offene Bögen (die gespeicherten .ai behalten den Vorab-Eintrag).
18. Bögl-Ordner: „eigen“ sind alle `exporte[].ordner` der offenen Bögen des Aufbaus; der lokale Parkordner heißt wie im Exportkern `<ausgang>/Max Boegl/<Auftragsordner>` (Kundenname umgeschrieben).
19. Die Freigabe „Nutzen“ liest die Zahl der ausgewählten Objekte aus `IP.dokumentInfo` (neues Feld `auswahl`), auch bei Fremddokumenten.
20. Fenstergrößen vorläufig: „Nutzen“ 860 × 500, „WEA-Etiketten“ 860 × 480, „Bögl Nummern“ 620 × 420 (größte Maße der alten Fenster); Debug-Ports 8098 (.nutzen), 8099 (.gitter), 8100 (.mbnr); Rückmeldung an das Panel über das CSEvent `de.pamnm.illupanels.nutzenFertig`.
21. `bogenPruefen` merkt sich die Cutkontur-Prüfung je Symbol, damit Bögen mit vielen Instanzen eines Symbols nicht jede Instanz einzeln umwandeln.
22. Der Kern baut Gitter-Streifen und MB-Schilder ohne vorderes Dokument; das vordere Dokument wird nach jedem Bogen wieder aktiviert, ohne Dokument bleibt der Bogen vorn.
23. `gitter.etikett_mm` ersetzt das feste 90 × 36 im Warntext der Vorlagenmessung.

## Oberfläche

Status: bestätigt 31.10. (SPEZ_03_Oberflaeche §18)

1. Version 3.7.0 im Bundle und in allen 13 Extensions des Manifests sowie in `dokument.PANEL_VERSION`.
2. Startprüfung `serien.json` „standard“ mit den neuen Grundtexten „Feld standard fehlt“ und „standard „<Wert>“ unbekannt“; das Popup kommt beim Panelstart nach den übrigen Popups und sperrt nichts.
3. Das feste Preset 751C für die Serie in `zuordnen.PRESET` entfällt; ohne gemerkte Serie kommt sie nur noch aus `standard`, bei fehlerhaftem `standard` ist keine Serie vorgewählt (Raster zeigt alle Serien).
4. Flyout-Menü: Ids `skript<n>`, `gitter`, `mbnr`, Trennlinie als `<MenuItem Label="---"/>`; ohne geladene Konfiguration sind alle Einträge gesperrt.
5. `updatePanelMenuItem` wird nur für Einträge aufgerufen, deren Freigabe sich gegenüber dem zuletzt gesetzten Stand geändert hat.
6. Die Klickdaten des Flyout-Menüs werden als Objekt, als JSON-Text oder als XML-Text mit `menuId` gelesen, weil CEP-Hosts unterschiedliche Formen liefern.
7. Der Tooltip „Nicht gefunden: <Pfad>“ der bisherigen Skript-Buttons entfällt, weil Menüeinträge keinen Tooltip haben; das Start-Popup bei fehlendem Skript bleibt.
8. Panel-Zeile 3 hat eine Mindesthöhe von 22 px, damit sie ohne Buttons ihre Höhe behält.
9. Fenster „Objekt“: der Schlüssel beim Überfahren erscheint über CSS `:hover` in derselben Marke wie an der gewählten Kachel; die überfahrene Kachel bekommt einen 1-px-Rahmen in `--fg` statt #ddd aus dem MockUp (keine neue Farbe).
10. Dialog „Auftrag anlegen“ nutzt jetzt `fenster.css` (Farben, Buttons, Zustand `an`) statt eigener Stile; Auftragsart und Segment-Buttons zeigen die Wahl über die Klasse `an` statt `aria-pressed`.
11. Segment-Buttons im Dialog „Auftrag“ merken den Wert je Gruppe; ein Klick auf den schon gewählten Button löst wie das `change` der Radiobuttons nichts aus, außer bei „Datei öffnen“.
12. Die Linie über den Feldern der Art entfällt immer, wenn kein Feld sichtbar ist (Lasergravur, aber z. B. auch Beschriftung mit Quelle mit Panel-XMP).
13. `textil_wahl`: Darstellung „untereinander“ zeigt Modell und Farbe wie gebaut erst nach Wahl von Marke bzw. Modell; Darstellung „spalten“ lässt die Spalten mit Überschrift stehen.
14. `textil_wahl`: Überschriften im Dialog „Auftrag“ klein (`cap`), im Fenster „Modell“ als `lbl` wie im MockUp; im Fenster „Textilfarbe“ steht wie im MockUp keine Überschrift „Farbe“.
15. `textil_wahl`: der Parameter `gross` entfällt zugunsten `spalten` und `flaeche`; gewählte Buttons und Kacheln tragen die Klasse `an`.
16. Fenster „Motiv“: „Abstand 4 px“ der rechten Spalte ist der Zeilenabstand darin; der Abstand zur Linie bleibt 12 px.
17. Fenster „Motiv“: „Farben im Objekt“ ist höchstens zwei Reihen (56 px) hoch und scrollt darüber, damit die Druckgrößen Platz behalten.
18. Zusammenfassung Textil: ein Motiv ohne Druckgröße bekommt eine Zeile mit leeren Druckgrößen-Spalten.
19. PDF Textil: Spalten bei Motiv 15, Position 47, Verfahren 71, Maß mm 116 (rechts), Menge 129 (rechts), Textilgrößen 132, blockout/zeigen 162, K 187 (rechts), Teile 195 mm (rechts).
20. `zusammenfassung.druckgroesseText` ist durch `druckgroesseZeile` (Maß, Menge, Textilgrößen, blockout/zeigen einzeln) ersetzt.
21. Fenster „Schilder“: die Skizze zeigt Punkte nur, wenn alle Felder der Anordnung (Durchmesser eingeschlossen) eine Zahl > 0 enthalten; Punkte außerhalb des Schilds werden nicht abgeschnitten.
22. Fenster „Schilder“: der 1-px-Rand der Platte hat die Farbe `--line`, weil die Spezifikation keine nennt.
23. Boxen in „Nutzen“, „WEA-Etiketten“ und „Bögl Nummern“ (Vorgabe, Detail, Ergebnis) haben den Hintergrund `--kopf-bg` statt des festen rgba(0,0,0,.18) aus dem MockUp und Schrift monospace 11 px wie dort; die Layoutzeilen in „Vorschau“ ebenfalls monospace.
24. Fenster „Nutzen“: die Überschriftenspalte ist auch in Schritt 1 84 px breit, „Abstand Motive (mm)“ bricht darin um.
25. „WEA-Etiketten“ Schritt 1: die Liste scrollt in ihrem Rahmen, der Kopf bleibt stehen, „Noch keine Datei gewählt.“ steht als Zeile in der Liste.
26. „WEA-Etiketten“ Schritt 2: Etikett-Schrift #111 auf `--etikett` in beiden Themen, zu lange Zeilen mit Ellipse.
27. „WEA-Etiketten“ Schritt 3: ein Klick auf die Zeile wählt die Variante wie das Radio; gewählte Zeile mit `--farbe-an`, Zebra auf den übrigen geraden Zeilen.
28. „Bögl Nummern“: `mbnummern.mengenLesen` liest die Felder wie bisher die Prüfung bei „Aufbauen“, `nutzenbogen.mbErgebnis` erzeugt die beiden Zeilen für Info-Ebene und Fenster; `mbnummern.HINWEIS` entfällt.
29. „Bögl Nummern“: die Ergebnisbox bleibt auch leer sichtbar (Mindesthöhe 40 px), damit das Fenster nicht springt; liefert die Planung einen Fehler, bleibt sie leer.

## Konfigurationen Fassung 3

Status: offen (3.7.1)

1. Version 3.7.1 im Bundle und in allen Extensions des Manifests sowie in `dokument.PANEL_VERSION`.
2. Ein Produkt aus `produkte.csv` trägt statt `ausrichtungen` das Feld `vorlagen { hoch, quer }` (Dateiname oder `null`); `anlegen.offsetAngebot` liefert weiter `ausrichtungen` = die verfügbaren Ausrichtungen, der Dialog bleibt dadurch unverändert.
3. Neue Grundtexte der CSV-Prüfung (je mit „Zeile n:“ davor): „vorlage_hoch und vorlage_quer leer“, „vorlage_hoch „…“: nur Dateiname ohne Pfad“ bzw. „vorlage_quer …“, „vorlage_hoch „…“: Endung .ait fehlt“ bzw. „vorlage_quer …“; der Text „ausrichtung „…“ unbekannt …“ entfällt.
4. Pfadtrenner sind `/` und `\`; die Endung `.ait` wird ohne Rücksicht auf Groß-/Kleinschreibung geprüft; enthält ein Feld einen Pfadtrenner, wird nur dieser Grund gemeldet.
5. Beim Anlegen muss `ausrichtung` im Wahl-Objekt eine Ausrichtung mit gefüllter Spalte sein, sonst der bestehende Fehler „<bezeichnung>: Ausrichtung „…“ nicht vorgesehen“.
6. Tooltip eines gesperrten Produkts: erwartete Pfade in der Reihenfolge hoch, quer, je Zeile ein Pfad; nur gefüllte Spalten.

## Gesamtlauf

Status: offen (3.7.2)

1. Testroutinen in `tests/illustrator/`: `gesamtlauf.mjs` (Wächter), `gesamtlauf.sh` (Aufruf), `abschnitte/<kennung>_<name>.mjs` je Abschnitt (0, 3.1–3.9, Nachlauf 2e, 2p, 4b; eigener Node-Prozess), `lib/basis.mjs` (CDP, JSX per osascript, Protokoll), `lib/ablauf.mjs` (Anlegen, Fenster, Export, Auswahl), `lib/illu.mjs` (osascript, Prozesse, Screenshot, Panel öffnen), `lib/neuladen.mjs`, `lib/pdfinfo.py` (pypdf), `helfer.jsx` (TH-Funktionen), `einstellungen.json` (Pfad der Musterdateien, Zeitgrenzen).
2. Testschalter: Datei `de.pamnm.illupanels.test.json` im temporären Ordner, wirksam nur mit `.debug` im Erweiterungsordner (`gemeinsam.js`). Er schreibt Meldungen und Rückfragen nach `tests/out/gesamtlauf/meldungen.jsonl` statt sie anzuzeigen und beantwortet Rückfragen (Standard Ja), Datei- und Ordnerdialoge (`dateiWaehlen`, `ordnerWaehlen`, CEP-Dateidialog der WEA-Etiketten) aus Listen in der Datei. Der Wächter entfernt die Datei am Ende und bei jedem Abbruch.
3. Nur mit `.debug`: `window.PAM_TEST` im Panel mit `menue()` (Freigabe der Flyout-Einträge) und `menueKlick(id)` (wie ein Klick im Flyout-Menü), weil das native Menü per Remote-Debugging nicht erreichbar ist.
4. Zeitgrenze 120 s je Aktion (Anlegen, Panel-Klick, Export, Fenster öffnen, OK), nicht je Abschnittsschritt; der Wächter liest Schritt und Aktion aus `tests/out/gesamtlauf/status.json`.
5. ~~Bei einem Hänger bricht der Wächter den Abschnittsprozess ab und macht mit dem nächsten Abschnitt weiter (Neustart siehe 18); Fenster schließt er per AppleScript nur, wenn ihr Titel einer der CEP-Fenstertitel oder der beiden Skript-Dialoge („Was?“, „Logopaket erstellen“) ist oder es ein Systemdialog ist.~~ — geändert (Neubau 3.7.2): bei einem Hänger (Aktion, Abschnitt oder Lauf über der Zeitgrenze) Screenshot, Abschnittsprozess beenden, Eintrag „hängt“, Lauf beenden; nichts wird per System Events weggeklickt, keine Esc-Taste, kein Neustart (Erfahrung folienkalkulation, Anweisung 31.10.). Antwortet Illustrator danach, schließt der Wächter die Testdokumente.
6. Testdokumente schließt der Wächter nach jedem Abschnitt: gespeichert unter `tests/out/` oder ungespeichert und beim Start nicht offen.
7. Test-`rechner.json`: `server.kunden` = `tests/out/server/Kunden A-Z` (Ordner A–Z, `M/01_Max Bögl` mit `auftrag.txt` „nummer1=20, nummer2=7, nummer3=0, nummer4=12“), `dtf_bestellen`/`wmd_bestellen` unter `tests/out/server/`, `lokal.arbeitsdateien` und `lokal.ausgang` unter `tests/out/lokal/`; Panel und Hintergrund-Extension werden danach neu geladen (rechner.json wird nur beim Start gelesen) und am Ende wieder.
8. Grafikzeit: Puffereinträge schreibt der Lauf über `grafikzeit.anhaengen`; ~~die Gutschrift aus Druckbögen prüft er~~ dass ein vorderer Druckbogen nicht zählt, prüft er (SPEZ_02 Fassung 8) an `window.PAMHintergrund.schluessel` der Hintergrund-Extension (null = kein Zählen).
9. ~~Logo und VK-CC: der Lauf startet die Skripte über `PAM_TEST.menueKlick`, prüft das Erscheinen ihres Dialogs und schließt ihn über „Abbrechen“.~~ — geändert (Auftrag Korrekturen 3.7.2, 3.1): Logo und VK-CC laufen nicht mit; im Testbetrieb führt das Panel Skripte aus `werkzeuge.json` nicht aus, sondern schreibt sie als Art „skript“ in `meldungen.jsonl` (`PAM.testNotiz`). Die ScriptUI-Dialoge sind für System Events „UI element“ des Prozesses, keine Fenster.
10. Kundenware ohne Farbliste wird im Lauf mit Freitext „Kundenfarbe“ angelegt; beim Anlegen aller MockUps bleibt der Freitext leer.
11. Zum Zuordnen in Test-Arbeitsdateien setzt der Lauf Tags teils direkt (`IP_Id`, `IP_Folie`, `IP_Laminat`, `IP_Anzahl`) und verschiebt Objekte auf die Ebene der Rolle; das Fenster „Objekt“ wird je Fall mindestens einmal bedient.
12. Musterdateien bleiben in `~/tools/folienkalkulation`; der Lauf kopiert Testmuster.ai, `Fahrzeugmuster/Kraus.pdf`, `MBMuster/WEA0104634_…pdf` und `tests/fixtures/gitter/Typ_A.txt` nach `tests/out/vorlagen/`.
13. ~~Ungespeicherte Dokumente erkennt der Lauf daran, dass zu `fullName` keine Datei existiert (Illustrator liefert „/Unbenannt-n“ bzw. „/Untitled“).~~ — geändert (Neubau 3.7.2): siehe 20; Testschutz siehe 26.
14. Version 3.7.2 im Bundle, in allen Extensions und in `dokument.PANEL_VERSION`.
15. ~~Nachlauf (`--nachlauf`): je Abschnitt ein Plan in `gesamtlauf.mjs` (Umgebungsvariable `GL_PLAN`); nicht genannte Schritte laufen nicht. Schritte, die nur den Zustand für die aufgezeichneten herstellen, laufen als „Vorbereitung“: ihre Prüfungen erscheinen nur im Abschnittsprotokoll, im Ergebnis steht je Schritt eine Zeile „Vorbereitung“ (ok/Fehler mit den ersten Befunden). In 3.4 „Breite“ werden nur die Prüfungen „Zielbreite vorbelegt …“ und „Zugabe „-1“ …“ aufgezeichnet.~~ — entfällt (Neubau 3.7.2): statt Plänen eigene, einzeln lauffähige Abschnitte (siehe 24).
16. ~~3.2 im Nachlauf: Vorbereitung „Arbeitsdatei Beschriftung und Testobjekte“, „Zuordnen Digitaldruck …“, „Varianten und berechnen“, „Druck …“ (Druck verlangt eine kalkulierte Arbeitsdatei); aufgezeichnet „Zuordnen Plott Prozessfarben“ und „Export der Druckbögen …“; Plott einzeln/Mehrfachauswahl, Zusammenfassung, Summa und Fahrzeug laufen nicht.~~ — entfällt (Neubau 3.7.2), siehe 24.
17. Zeitgrenzen: 120 s je Aktion (wie 4), 10 s je Verbindung (HTTP `/json` und WebSocket-Aufbau), 900 s je Abschnitt (gemessen ab Start des Abschnittsprozesses), 3600 s ab Start des Wächters; Abschnitts- und Gesamtgrenze werden wie ein Hänger behandelt (siehe 5).
18. ~~Neustart genau einmal je Bedarf, kein zweiter Versuch: `quit saving no` (osascript, höchstens 30 s), TERM nach 30 s ab Beginn, KILL nach weiteren 15 s; Start `open -b com.adobe.illustrator`, bei Ablehnung (LaunchServices-Fehler -600 direkt nach dem Beenden) alle 2 s erneut innerhalb der 180 s; alle 15 s `requestOpenExtension` des Panels über `window.__adobe_cep__` der Hintergrund-Extension, solange das Panel zu ist; fertig, wenn das Panel 10 s ununterbrochen bereit ist (`window.PAM`, „Auftrag“ frei), höchstens 180 s (Befund Wächterprobe: ein zu früh geöffnetes Panel schließt Illustrator beim Fertigstarten wieder). Danach DONTDISPLAYALERTS und Neuladen von Panel und Hintergrund. Scheitert er, endet der Lauf mit Rückgabe der Originale.~~ — entfällt (Neubau 3.7.2): kein Neustart.
19. ~~Schritt 0 Wächterprobe: `while (true) {}` über `PAM.evalRoh`; bestanden, wenn der Wächter den Hänger nach höchstens 120 s (+ 5 s Takt) erkennt, Illustrator danach nicht antwortet, der Neustart gelingt und das Panel danach `window.PAM` mit freiem „Auftrag“-Button meldet.~~ — geändert (Neubau 3.7.2): siehe 25.
20. Druckbögen erkennt der Lauf über ihr XMP (`bogen.aufbau|art|medium|laminat|breite_mm|nr` als Schlüssel `bogen:<…>` in `helfer.jsx`), weil Illustrator ungespeicherte Dokumente im Skript alle „Untitled“ nennt (Fenstertitel „Unbenannt-n“).
21. Testobjekte 3.2: „Großformat“ als Gruppe mit Cutkontur 3 mm außen (wie „Poster“); neu „Prozessfarben“ (Gruppe aus drei Rechtecken: globale Prozessfarbe „Test global“, nicht globale Prozessfarbe „Test nicht global“, CMYK ohne Farbfeld; ohne Kontur).
22. Hilfslinien-Prüfung 3.1/3.5: oberster Block aus Ebenen mit Namen aus `hilfslinien.ebenen`, alle gesperrt und nicht druckend, darunter keine Ebene mit einem dieser Namen (`ablauf.hilfslinienBlock`); ein leerer Block ist zulässig, Vorlagen ohne Hilfslinien-Ebene sind erlaubt (SPEZ_03_Konfigurationen Fassung 4 §3.2 Nr. 4, z. B. Visitenkarte 85 × 55).
23. Gesichert und zurückgegeben werden nur noch `rechner.json` und `grafikzeit_puffer.json` (`grafikzeit_druckboegen.json` entfällt mit SPEZ_02 Fassung 8).
24. Neubau 3.7.2: jeder Abschnitt ist einzeln lauffähig (eigene Testdaten, eigener Node-Prozess). Für den Nachlauf eigene Abschnitte `2e_druckbogen_export` (Arbeitsdatei „Exporttest“: Poster 400 × 300 mit Cutkontur, glänzend, Anzahl 2; Großformat 1350 × 1350 mit Cutkontur, matt, Anzahl 2; Zuordnung über Tags, berechnen und Druck als Vorbereitung mit einer Prüfung „drei Bögen“), `2p_plott_prozessfarben` (Arbeitsdatei „Prozesstest“, Gruppe „Prozessfarben“ wie 21) und `4b_breite` (nur Vorbelegung und Zugabe-Fehler, Fenster ohne OK geschlossen). `--nachlauf` = 0, 2e, 2p, 4b, 5–9; Volllauf = 0–9. Unbekannte Option oder unbekannter Abschnitt = Abbruch.
25. Schritt 0 Wächterprobe: ein Schritt, der nicht zurückkehrt, ohne Illustrator zu blockieren (kein JSX); bestanden, wenn der Wächter ihn nach höchstens 120 s (+ 5 s Takt) erkennt, den Prozess beendet, den Screenshot schreibt und danach Illustrator und Panel antworten. Sonst kein weiterer Abschnitt.
26. Testschutz: der Lauf beginnt nur ohne offene Dokumente (auch keine gespeicherten fremden), sonst Abbruch ohne Änderung. Illustrator muss laufen; der Lauf startet es nicht. Ist das Panel zu, öffnet der Wächter es über `requestOpenExtension` der Hintergrund-Extension und wartet, bis es 10 s ununterbrochen bereit ist (höchstens 180 s).
27. Zwei Kanäle: Dokumentzugriffe (`th`, Helfer `helfer.jsx`) per osascript `do javascript` in Illustrators Skript-Umgebung, ohne JSX-Kern (`TH.xmpSetzen` schreibt das XMP selbst); das Panel per Remote-Debugging nur für die Oberfläche. Zeitlimit je osascript-Aufruf 110 s.
28. Vordergrund: vor jedem Abschnitt, Anlegen, Panel-Klick und Export holt der Lauf Illustrator nach vorn (`open -a` mit vollem App-Pfad aus `einstellungen.json`, nicht per Bundle-ID). Auswahl wird bis zu dreimal gesetzt, bis Illustrator sie meldet (`ablauf.waehle`). Fenster schließt der Lauf zeitversetzt (`setTimeout(closeExtension, 50)`).
29. `gesamtlauf.sh` läuft unter `caffeinate -dimsu`.
30. Farbwerte vergleicht der Lauf auf 0,01 genau (Illustrator liefert CMYK-Werte mit 32-Bit-Rauschen, z. B. 2,99999993 statt 3).
31. Bei „Offset mit Quelle“ gelten leere Ebenen, die aus der Quelle stammen, nicht als Fehler (§3.3 Nr. 4 entfernt nur leere Ebenen der Vorlage).
