# Produktionsregeln

Stand 29.10.2026, entspricht dem bisherigen Panel (Stufe 45). Fachliche Regeln ohne technischen Aufbau. Preisberechnung: `PREISLOGIK.md`, `PREISLOGIK_Schild.md`. Werte aus `Stammdaten/medien.json` und `Stammdaten/auftragsarten/`.

## 1. Cutkontur

- Cutkontur ist jeder Pfad, dessen Kontur oder Füllung ein Volltonfarbfeld C0 M100 Y0 K0 hat (Toleranz 0,5). Der Name des Farbfelds ist egal; Prozessfarbe M100 zählt nicht.
- In allen erzeugten Dateien heißt das Farbfeld nur „Cutkontur“; andere M100-Volltonfelder werden darauf zusammengeführt.
- Das Dokument des Kunden wird nicht angefasst.

## 2. Plott (Schneidedaten)

- Farben: Oracal 651, 751C, 951, 970 glossy, 970 matt (ASE-Bibliotheken). Farbschlüssel `651-NNN`, `751C-NNN`, `951-NNN`, `970G-NNN`, `970M-NNN`; Preisserie je Bibliothek (`serien.json`, 970G und 970M → 970).
- Rollen: 651, 751C, 951 1260 mm; 970 1520 mm. Nutzbreite = Rollenbreite − 40 mm.
- Nesting MaxRects mit 90°-Drehung, reproduzierbar; 20 mm Abstand, 10 mm Rand; Länge höchstens 5700 mm.
- Übergroße Teile werden an Lücken geteilt (Warnung).
- Ausgabe je Farbschlüssel und Bogen, PDF/X-4, 1:1, Zeichenfläche = Umriss + 10 mm je Seite: `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf`.

## 3. Digitaldruck

**Medien und Rollen:** 3162, 3551, 3676, UltraTack 1370 mm; 3951 1520 mm; MonsterTack 1220 mm; 3551 zusätzlich 1000 und 1520 mm vorrätig. Medien nur als Kürzel. Laminat matt oder glänzend als Produktionsinfo (3676 nur glänzend). Druck ist immer laminiert.

**Rollenwahl:** je Medium und Laminat mit jeder vorrätigen Breite nesten; gewählt wird die Standardbreite, außer die Objekte passen nur in einer anderen oder eine andere spart mindestens 10 % Verbrauch (m²).

**Ablauf bisher:**
1. Zuordnen: Medium und Laminat je Objekt.
2. Gleiche Motive als Kopie anlegen (Name Pflicht, Herkunft wird mitgeführt); Kopien dürfen skaliert, gedreht, gespiegelt werden.
3. Druckbögen aufbauen: ein Bogen je Rolle bzw. Länge, Ebenen Druck / Cut / Info, gleiche Herkunft als Symbol.
4. Mensch: Beschnitt und Cutkontur von Hand im Bogen bzw. einmal im Symbol. (Automatischer Beschnitt war versucht und ist verworfen.)
5. Export: Sammelprüfung, Marken, speichern.

**Nesting und Zeichenfläche:**
- Ohne Cutkontur: Außenkante + 10 mm (Abstand Motiv–Cutkontur) + 3 mm je Seite. Mit Cutkontur: Außenkante ∪ Cutkontur + 3 mm.
- Zeichenfläche = Außenkante + 44,353 mm (OPOS-Zugabe 24,353 + 2 × 10 mm Markenrand, d. h. 22,1765 mm je Seite).
- Quer höchstens Rollenbreite − 2 × 15 mm (Kantenhalter HP Latex, nicht bedruckbar); Grafik quer zusätzlich abzüglich der OPOS-Zugabe und Markenränder.
- Länge höchstens 2500 mm, Sonderbogen für Einzelobjekte bis 5700 mm.
- Verbrauch = Zeichenflächenlänge × volle Rollenbreite (nur für EK und Rollenwahl).

**Export der Druckbögen:**
- Sammelprüfung über alle Bögen des Auftrags (Cutkontur je Objekt vorhanden, Breite nach den Marken) mit einem Fehler-Popup.
- Symbole umwandeln, Cutkonturen auf Ebene „Cut“.
- OPOS-Marken auf Ebene „Regmark“, Marken 3 × 3 mm: XY; ab 1000 mm Länge in Einzugsrichtung XY2 mit Druckrichtungsdreieck (Regel und Markenzahl: `OPOS_ANALYSE.md`). Rückfall: Marken von Hand mit dem Summa-Plugin.
- `<Kunde>_<Medium>-<Laminat>-<Breite>_<NN>_druck.pdf`, `…_cut.pdf` und `….ai`.

## 4. Prüfungen vor Kalkulation und Schneidedaten

- **Warnung (es wird gerechnet):** Objekte auf der Sandbox, ohne Namen oder ohne Zuordnung (nicht berechnet); Konflikt zwischen Zuordnung und Ebene oder Farbe (nicht berechnet); Konturen auf Plott-Objekten; an Lücken geteilte Teile.
- **Abbruch:** Teil länger als 5680 mm; Teil passt in keiner Lage in die Nutzbreite; Farbe ohne Oracal-Serie oder Serie/Medium ohne Preis; doppelte Objektnamen.
- Warnungen gleicher Art werden in einer Meldung zusammengefasst (z. B. „3 Objekte auf der Sandbox“).

## 5. Nutzen

- Auswahl messen (Cutkontur, Schnittmasken, Anschnitt).
- Eingaben: Stückzahl (Standard 100), Medienbreite (1370), A4 oder A3, „exakt oder kleiner“ oder „ca. ± 25 %“, Abstand Motive (Standard 5 mm, frei änderbar), Bögen (20).
- Vorschau mit Layoutwahl, dann Nutzen-Bogen: Symbole, Ebenen Druck / Cut / Info, Zeichenfläche = Nutzen + 2 × 22,1765 mm; zulässige Breite 1340 mm.
- Export: Abfrage Kunde und Produkt; Ordner `KUNDE_JJJJ-MM_PRODUKT`; je Bogen `Nutzen NN_druck.pdf`, `Nutzen NN_cut.pdf`, `Arbeitsdaten NN.ai`.

## 6. Gitterscheiben (WEA-Etiketten, Max Bögl)

- Eingang: Kundendateien in `GitterMaster`, Menge aus dem Präfix „15x_“; Leser für PDF, XLSX, TXT/CSV.
- Je Datei Typbezeichnung zuordnen (wird gemerkt), Variante wählen.
- Aufbau je Bogen aus der Vorlage „Etikett“: Nutzbreite 1300,647 mm, zulässige Breite 1345 mm, Länge je Druck 2500 mm; Prüfmeldungen am Ende in einem Popup.

## 7. Bögl Nummern (MB-Nr)

- Stückzahl je Nummer aus `GitterMaster/auftrag.txt`, Vorlage „Bögl Nummern Masterdatei“.
- Blöcke bis 5 je Zeile, Zeichenfläche nach dem Inhalt + 44,353 mm.
- Info-Ebene mit Materialbedarf und Überproduktion durch das 5er-Raster.

## 8. Auftragsarten

| Auftragsart | Kalkulation | Ebenen | Maßstab | Grundlage | Export |
|---|---|---|---|---|---|
| Fahrzeugbeschriftung | ja | Sandbox, Fahrzeugkontur (gesperrt), Plott, Digitaldruck | 1:30 | mit Fahrzeugvorlage die CC-Vision-Datei (je Auftrag einzeln heruntergeladen), sonst A4 hoch | Schneidedaten, Druckbögen |
| Beschriftung | ja | Sandbox, Cut, Print, Foto | 1:1 | neues Dokument, leer 1000 × 1000 mm | Schneidedaten, Druckbögen |
| Schild | ja (künftig App) | Folie: Sandbox, Plott, Digitaldruck · UV-Druck: Sandbox, Plott, UV-Vorn, UV-Hinten | 1:1 | Vorlage Schild (5 mm) bzw. UV-Schild (2 mm) | siehe 9 |
| Lasergravur | nur Zeit | – | 1:1 | Kopie der Kundendatei, leer 600 × 300 mm | Preset „pam x4“, `<Kunde>_laser.pdf` |
| Offset-Daten | nur Zeit | Vorlage + „Hilfslinien“ (Falz, Sicherheitsabstand) | 1:1 | Vorlage Offset (3 mm), Produkt aus `produkte.csv` oder freies Format | Preset „wmd“, alle Zeichenflächen in `<Kunde>_<Produkt>_druck.pdf` |
| Textil | nur Zeit | MockUp-Ebenen, Inhalt auf „Design“ | 1:1 | MockUp des Modells | siehe 10 |
| Sonstiges | nur Zeit | – | 1:1 | Kopie der Kundendatei, leer 600 × 300 mm | Preset „pam x4“, `<Kunde>_druck.pdf` |

## 9. Schild

- Je Zeichenfläche mit Inhalt ein Schild; je Zeichenfläche ein Material (Dibond 3 mm, Forex 3/5/10 mm, Acryl 3/5/8/10 mm) und die Zahl der Bohrungen.
- Verfahren aus den Ebenen: UV-Vorn oder UV-Hinten = UV, beide = UV beidseitig, Digitaldruck oder Plott = Digitaldruck kaschiert.
- Fehler: Objekt über mehrere Zeichenflächen; UV zusammen mit Plott bzw. Digitaldruck; Digitaldruck und Plott zusammen; Zeichenfläche ohne Material. Warnung: UV-Hinten auf Acryl; UV größer als A2.
- Schneidedaten wie Fahrzeugbeschriftung, keine Druckbögen.
- Export je Zeichenfläche und Technik: `<Kunde>_druck_NN_<Kürzel>-<Stärke>.pdf`, `…_uv-vorn_…`, `…_uv-hinten_…`.

## 10. Textil

- Positionen, Druckgrößen, Ausrichtung am Anker, Namen-Bogen, Flex-Streifen: `SPEZIFIKATION_Textil.md`, Werte in `Stammdaten/textil*`.
- Verfahren DTF, Flex, Stick; Namen nur DTF; blockout nur DTF; Flex mit Farbe.
- Ausgabe: je Motiv und Druckgröße `<Menge>x_<Kunde>_<Position>_<Maß>[_blockout].pdf` (Zeichenfläche umlaufend 2 mm größer); Namen-Bögen höchstens 560 × 1000 mm; Flex-Streifen `<Streifen>x_<Kunde>_<Position>_<Maß>_<Farbe>[_<ID>]_cut.pdf` (Daten bis 470 mm, Zeichenfläche 480 mm); Korrekturabzug `<Kunde>_Korrekturabzug[_<ID>].pdf`.
- Keine Sammelbögen bei DTF, der Zulieferer nestet selbst.

## 11. Export allgemein

- PDFs `[PDF/X-4:2008]` bzw. das Preset der Auftragsart, ohne Illustrator-Bearbeitungsdaten und ohne PDF-Ebenen.
- Export überschreibt nie: `Name.pdf`, dann `Name_02.pdf` …
