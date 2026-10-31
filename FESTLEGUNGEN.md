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

Status: bestätigt 30.10. (1–40 SPEZ_02 §17.1, 41–44 Auftrag 2c); Punkt 8, 13 und 26 geändert (Korrektur 2b), Punkt 42 mit neuem Wortlaut (Auftrag 2c).

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

## 2c

Status: offen (zur Bestätigung). Rückfrage 31.10. beantwortet: Druckbogen-Nummer, „n von m“, NN im Dateinamen und `bogen.gesamt` zählen je Medium + Laminat + Rolle.

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
