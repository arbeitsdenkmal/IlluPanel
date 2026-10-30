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

Status: 1–40 bestätigt 30.10. (SPEZ_02 §17.1), Punkt 8, 13 und 26 geändert (Korrektur 2b); 41–44 aus der Korrektur 2b offen (zur Bestätigung).

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
42. Tape-Tooltip: „Tape (VK je m² Objektfläche) – Vorschlag aus der Messung der Cutkontur, sonst des Motivumrisses: <Tape | kein Tape | unterschiedlich | erst nach „berechnen“>“.
43. Tape bei Mehrfachauswahl mit unterschiedlichen Zuständen: gestrichelt mit der Beschriftung „Tape auto“, der erste Klick setzt alle auf „Tape auto“; gedrückt ist der Button, wenn Tape wirkt („Tape“ oder „Tape auto“ mit Vorschlag Tape).
44. Stehen `tape` und `kein_tape` beide in `IP_Attribute`, gilt `kein_tape`; „Zusammenfassung“ zeigt „Tape“ bei `tape` und bei „auto“ mit Tape im Datensatz.
