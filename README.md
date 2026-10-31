# PAM-Werkzeuge (Illustrator-Panel)

CEP-Erweiterung für Illustrator (Bundle `de.pamnm.illupanels` 3.7.2, Panel „PAM-Werkzeuge“). Stand: Stufe 1 „Fundament“ nach `Infos/SPEZ_01_Fundament.md`, Stufe 2a „Kalkulationskern“, 2b „Oberfläche“, 2c „Produktionsdaten“ und 2d „Grafikzeit“ nach `Infos/SPEZ_02_Kalkulation_Produktion.md` (Fassung 6) und den MockUps `Infos/mockups/MOCKUP_STUFE2.html` (Panel A5/A7, Fenster „Objekt“ B3/B4, Fenster „Zusammenfassung“ C3, `<Kunde>_Zusammenfassung.pdf`); Thema 1 der SDK-unabhängigen Reste „Werkzeuge“ (Breite, Masken, Skript-Buttons) nach `Infos/SPEZ_03_Werkzeuge.md` Thema 2 „Konfigurationen“ (Offset-Daten, Banner/Roll-up, Sonstiges, Lasergravur) nach `Infos/SPEZ_03_Konfigurationen.md` (Vorlagen-Dateinamen nach Fassung 3, 3.7.1) Thema 3 „Schild“ (Folie und UV-Druck, Bohrungen, Laserdatei) nach `Infos/SPEZ_03_Schild.md`, Thema 4 „Textil“ (Anlegen auf MockUp, Fenster „Motiv“, „Textilfarbe“, „Modell“, Flex/Flock-Streifen und -Kalkulation, Export DTF/Stick/Namen/Korrekturabzug) nach `Infos/SPEZ_03_Textil.md` und `Infos/PREISLOGIK.md` §13 und Thema 5 „Nutzen, Gitterscheiben, MB-Nummern“ (Nutzen-Bögen auf dem Druckbogen-Kern) nach `Infos/SPEZ_03_Nutzen.md`; Thema 6 „Oberfläche“ (Gestaltung des Panels und aller Fenster) nach `Infos/SPEZ_03_Oberflaeche.md` und den MockUps `Infos/mockups/MOCKUP_THEMA6_Panel_2`, `_Auftrag_2`, `_Zuordnen_2`, `_Fenster_2` (ersetzt die vorläufigen Platzierungen der Themen 1–5). Supabase/SDK ist nicht enthalten.

Eigene Festlegungen von Claude Code, die über den Auftrag hinausgehen, stehen nummeriert je Teilstufe in `FESTLEGUNGEN.md`; dieses README übernimmt sie erst nach Bestätigung durch Markus.

## Aufbau

```
CSXS/manifest.xml        Extensions .panel (Panel 320 × 172, min. 320 × 172), .anlegen (ModalDialog 560 × 480), .objekt (ModalDialog 480 × 440),
                         .zusammenfassung (Modeless 700 × 520, min. 480 × 240), .hintergrund (Custom, StartOn, ohne Oberfläche), .breite (ModalDialog 320 × 120),
                         .schilder (ModalDialog 560 × 400), .motiv (ModalDialog 640 × 470), .textilfarbe (ModalDialog 420 × 300), .modell (ModalDialog 720 × 320),
                         .nutzen (ModalDialog 840 × 380), .gitter (ModalDialog 560 × 260), .mbnr (ModalDialog 460 × 230); ILST [28.0, 99.9], CSXS 12, Node an
.debug                   Debug-Ports 8088 (.panel), 8089 (.anlegen), 8090 (.objekt), 8091 (.zusammenfassung), 8092 (.hintergrund), 8093 (.breite), 8094 (.schilder), 8095 (.motiv), 8096 (.textilfarbe), 8097 (.modell), 8098 (.nutzen), 8099 (.gitter), 8100 (.mbnr)
FESTLEGUNGEN.md          eigene Festlegungen je Teilstufe (nummeriert, Status)
panel/
  index.html, main.js    Panel (MOCKUP_THEMA6_Panel_2, Flyout-Menü)
  anlegen.html, .js      Dialog „ohne Auftrag“
  objekt.html, .js       Fenster „Objekt“ (Zuordnen, MOCKUP_THEMA6_Zuordnen_2 A)
  zusammenfassung.html, .js  Fenster „Zusammenfassung“ (C3)
  hintergrund.html, .js  Hintergrund-Extension der Grafikzeit (ohne evalScript)
  breite.html, .js       Fenster „Breite“ (Zielbreite, Zugabe)
  schilder.html, .js     Fenster „Schilder“ (Bohrungen je Schild)
  motiv.html, .js        Fenster „Motiv“ (Zuordnen Textil)
  textilfarbe.html, .js  Fenster „Textilfarbe“
  modell.html, .js       Fenster „Modell“ (Modell hinzufügen)
  nutzen.html, .js       Fenster „Nutzen“ (Schritt „Nutzen“, Schritt „Vorschau“)
  gitter.html, .js       Fenster „WEA-Etiketten“ (Kundendateien, Typbezeichnung, Variante)
  mbnr.html, .js         Fenster „Bögl Nummern“
  gemeinsam.js           Host-Aufruf (evalScript), JSX-Kern laden, Popup, Hell/Dunkel, CSEvents, Übergabedateien Panel -> „Objekt“, „Breite“ bzw. „Nutzen“, Rückfrage
  fenster.js             alle Fenster (ModalDialog, „Zusammenfassung“): Abbrechen/Schließen und Esc
  style.css, fenster.css
  lib/                   reine Node-Module ohne Illustrator-Bezug (CommonJS, Node 17)
    konfiguration.js     rechner.json, schema.json, Auftragsarten, Mapping, werkzeuge.json, produkte.csv, schild_materialien.csv, textil.json mit textil_*.csv, nutzen.json laden und prüfen
    dokument.js          Dokumentschema (XMP-JSON), xmpLesen/xmpSchreiben über den JSX-Kern
    tags.js              Prüfung der IP_*-Tags gegen schema.json
    ablage.js            Dateinamen, Nummerierung, Erreichbarkeit (3 s), .teil-Transfer
    export.js            Exportkern (mit „ersetzen“ für Produktionsdateien)
    export_flach.js      Profil „flach“
    export_offset.js     Profil „offset“
    export_schild.js     Profil „schild“ (Dateien je Schild und Technik, Laserdatei)
    schild.js            Schild: Zuordnung Eintrag ↔ Zeichenfläche, Schildregeln, Lochmitten, Laserregel, Dateinamen
    export_textil.js     Profil „textil“ (DTF, Stick, Namen-Bögen, Korrekturabzug, DTF-Sammelordner)
    textil.js            Textil: CSV-Lesen, Positionen, Anker-Modus, Faktor, Maße je Position, Kinderformel, Höhenhinweis, Dateinamen, Namen-Blocksatz, Infos-Zeilen, Export-Prüfungen
    textil_wahl.js       Textil: Marke → Modell → Farbraster (Anlegen, „Modell“, „Textilfarbe“)
    kalkulation_textil.js  Textil Flex/Flock: Streifen je Farbschlüssel, Kalkulation PREISLOGIK §13, Kalkulationsdatensatz
    anlegen.js           Anlegen „ohne Auftrag“ (Wahl-Objekt, Vorlagen-Angebot, Vorbelegung)
    ase.js, farben.js    Oracal-ASE lesen, Farbfeldnamen → Folienschlüssel
    preisquelle.js       Preisquellen-Schnittstelle, Prüfung und Auflösung der Preisliste
    preisquelle_csv.js   Entwicklungsquelle Infos/Stammdaten/preisliste.csv
    teile.js             Stücke, Teile, Messung, Prüfungen, Varianten-Erkennung, Hinweise
    rollen.js            Rollenbreiten, Nutzbreiten, Druckmaße aus medien.json
    nesting.js           MaxRects-Nesting Plott, Druck und Textil-Streifen, Anzahl als Exemplare
    passermarken.js      Passermarken mehrfarbiger Plott-Stücke: Kantenlänge, Lage, Blöcke je Farbe
    kalkulation.js       Rollenwahl, Kalkulation PREISLOGIK v6, Kalkulationsdatensatz
    herkunft.js          Geometrievergleich der Varianten, Symbole je IP_Id
    opos.js              eigene OPOS-Marken (Regel OPOS_ANALYSE §4)
    schneidedaten.js     Summa: Bögen, Dateinamen, Ist-Lage, ältere Bögen
    druckbogen.js        Druck: Aufbau planen (Symbole, Info, Bogen-XMP); Export: Dateinamen, ältere Bögen
    nutzen.js            Nutzen: Planer (A4/A3/ohne, Bögen je Aufbau), Texte der Fenster, Info-Zeilen
    gitter.js            Gitterscheiben: Planung (Bänder, Einzelbogen/Bogenfolge), Streifen-Plätze, Typbezeichnung mit Gedächtnis, Prüftexte
    gitter_leser.js      Gitterscheiben: Leser PDF/XLSX/TXT/CSV, werteAus, typVorschlag (aus dem alten Projekt unverändert)
    mbnummern.js         MB-Nummern: auftrag.txt, Mengenprüfung, Blöcke, Zeilen je Bogen, Schild-Lagen
    nutzenbogen.js       Nutzen-Bögen: Planer -> Kernformat, Bogen-XMP, Info Gitter/MB, JSX-Spec, Dateinamen, Auftragsordner, Bögl-Ordnerregel, Aufbau
    auftrag.js           Abläufe ohne Oberfläche: berechnen, summa, druck, exportDruckboegen (Summa/Druck auch für Schild)
    zuordnen.js          Regeln des Fensters „Objekt“ (Vorauswahl, gemeinsame Werte, Farben, Medienliste, Tags), Anzeige von Folie und Zahlen
    zusammenfassung.js   Zeilen der Objekttabelle, Folien und Summen für Fenster und PDF
    zusammenfassung_pdf.js  <Kunde>_Zusammenfassung.pdf mit jsPDF (jspdf.umd.min.js, Lizenz LICENSE)
    aktivitaet.js        Grafikzeit: „Illustrator vorn“, Sekunden seit letzter Eingabe (einzige Plattformweiche außerhalb konfiguration.js)
    grafikzeit.js        Grafikzeit: Zähler, Puffer lesen/ändern/schreiben (atomar), Übernahme ins XMP-Objekt
    dokument_xmp.js      Grafikzeit: Pfad aus Dokument-Ereignissen, ip:Dokument aus der gespeicherten Datei (lesend)
jsx/illupanels.jsx       ExtendScript-Kern, nur Dokumentzugriff (XMP, Tags, Ebenen, Zeichenflächen, Objekte und Auswahl lesen und messen, Zuordnen mit Umfärben, Auswählen,
                         Schneidedokumente, Druckbögen mit Symbolen, Bogen prüfen/vorbereiten, Marken zeichnen, Speichern; Werkzeuge Breite und Masken;
                         Schild: Zeichenflächen und Inhalt lesen, PDF je Zeichenfläche und Ebene mit temporärer Ebene; Textil: MockUp als Grundlage, Stofffarbe,
                         Anker, Zuordnen mit Skalierung und Ausrichtung, Motive, DTF/Stick- und Namen-PDF, Ebene „Infos“, Streifen mit Faktor je Exemplar;
                         Nutzen: Auswahl messen, Druckbogen-Quellen „auswahl“ und „fertig“ (Gitter-Streifen, MB-Schilder), Etikett-Vorlage messen)
config/
  schema.json            XMP-Namespace, Schemaversion, Rollen, Felder der Rolle druckbogen, Tag-Namen (einzige Quelle)
  auftragsarten/*.json   acht Auftragsarten
  mapping.json           App department/type → Auftragsart
  medien.json            Rollenbreiten, Randabzug Plott 25, Druckmaße, Schwelle Rollenwahl, Passermarken, Alias
  serien.json            Oracal-Bibliothek → Farbschlüssel und Preisserie
  farbfelder/*.ase       ORACAL 651, 751 C, 951, 970 glossy, 970 matt (Kopien; Illustrators Verknüpfungen bleiben, wie sie sind)
  werkzeuge.json         Skript-Buttons: datei (in skripte/) und label
  nutzen.json            Nutzen, Bögl (Kunde, Kundenordner, Medium), Gitterscheiben, MB-Nummern (Konstanten, Vorlagen)
  rechner.beispiel.json  Vorlage für die Datei je Rechner
  produkte.csv           Offset-Produktliste (pflegt Markus)
  schild_materialien.csv Schild-Materialien (pflegt Markus)
  textil.json            Textil: MockUp-Ordner, Marken, Rand, Höhenhinweise, Kinderformel, Namen-Bogen, Streifen
  textil_stufen.csv, textil_modelle.csv, textil_farben.csv  Textil-Stammdaten (Kopien aus Infos/Stammdaten, pflegt Markus)
  mockups/               MockUps <modell>.ai (legt Markus nach Überarbeitung ab; bis dahin leer mit .gitkeep, Textil im Dialog gesperrt)
  vorlagen/*.ait         Schild, UV-Schild, Offset (freies Format), Etikett (Gitterscheiben), Bögl Nummern Masterdatei (MB-Nummern)
  vorlagen/offset/       Offset-Vorlagen je Produkt und Ausrichtung, Dateinamen aus produkte.csv vorlage_hoch/vorlage_quer (Dateien von Markus)
  vorlagen/rollup/       RollUp_850.ait, RollUp_1000.ait (Dateien von Markus)
skripte/                 05-Logopaket.jsx, 04-Visitenkarten Copyshop.jsx (unveränderte Kopien, per $.evalFile gestartet)
tests/*.test.js          node --test
tests/illustrator/       Gesamtlauf in Illustrator (Wächter, Abschnitte 3.1–3.9, JSX-Helfer), Ergebnis unter tests/out/gesamtlauf/
Infos/Skripte_alt/       Kopien der alten Skripte (01-Druckbreite, 06-releaseClippingMasks, 01-Nutzen_Generator, 01-Nutzen_Speichern, 03-Gitterscheiben, 03-MB Nummern), Referenz, nicht geladen
Infos/                   Referenz; einzige Ausnahme: Infos/Stammdaten/preisliste.csv ist die Entwicklungsquelle der Preise
```

Plattformunterschiede stehen nur in `rechner.json`; `process.platform` wird nur in `konfiguration.js` (Pfadauflösung, Ort der rechner.json) und in `aktivitaet.js` (Aktivitätserkennung der Grafikzeit, Ausnahme zu R 7.2 [A-8]) benutzt.

## Panel (SPEZ_03_Oberflaeche §3, MOCKUP_THEMA6_Panel_2)

- Start: lädt `rechner.json`, `schema.json`, die acht Auftragsarten, das Mapping, `medien.json` (inkl. Block `passermarken`), `serien.json` mit den fünf ASE-Dateien, `werkzeuge.json`, `produkte.csv` und prüft sie; dazu die Preisliste (allgemeine Prüfungen, jede Serie mit Standardbreite in `medien.json`). Jeder Fehler → ein Popup mit Datei und Grund, die Buttons bleiben gesperrt; Fehler in `produkte.csv`, `schild_materialien.csv` bzw. `textil.json`/`textil_*.csv` (Popup mit Datei, Zeile und Grund) sperren nur die Art Offset, Schild bzw. Textil im Dialog; Fehler in `nutzen.json` (Popup mit Datei und Grund) sperren nur Nutzen, Gitterscheiben und MB-Nummern; fehlt in `serien.json` das Feld `standard` oder ist es kein `schluessel` der Liste, ein Popup mit Datei und Grund, die Serie im Fenster „Objekt“ ist dann nicht vorgewählt. Danach JSX-Kern laden und `IP.init(schema)` (Tag-Namen und Namespace kommen nur aus `schema.json`).
- 320 × 172 (Inhalt 152 px; Innenabstand 4 / 5 / 3 px, Zeilenabstand 3 px), sechs Zeilen, Buttons 22 px hoch:
  1. **Kunde** · Auftragsart (ohne Maßstab) bzw. Bogenzeile · rechts „Grafik N min“ (Σ `grafikzeit.eintraege`, ganzzahlig) mit Feld „+m“ (Grafikzeit, unten).
  2. Objektzeile: Name der Auswahl (fett), rechts Folie mit Chip und „×n“; „Keine Auswahl“ gedimmt; „Objekt in einer Unterebene“ gedimmt, wenn die Auswahl nicht aus obersten Objekten besteht; mehrere: „n Objekte“, Folie nur, wenn alle gleich.
  3. **add** (Auswahl nicht oder nicht vollständig zugeordnet) bzw. **edit** → Fenster „Objekt“ · **berechnen** → `auftrag.berechnen()`, öffnet bzw. aktualisiert „Zusammenfassung“, Hinweise als ein Popup · **Schilder** (Schild) · **Farbe** · **Modell** (Textil). add ist ohne Auswahl gesperrt und dann nicht orange. Orange: add, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst berechnen.
  4. Linie; **Summa** (Schneidedaten), **Druck** (Druckbögen aufbauen) · **Export** (orange nur, wenn aktiv) · **Auftrag** (Schrift orange, Dialog `.anlegen`); Export und Auftrag immer sichtbar.
  5. Preiszeile aus dem Datensatz im XMP (VK): „Material <netto> <brutto>“ links (= nur Aufkleber), „inkl. Mont. <netto> <brutto>“ rechts, netto gerundet, brutto fett; Textil nur rechts „Preis <netto> <brutto>“; leer ohne Datensatz. Kein Mindestbetrag-Hinweis im Panel.
  6. Linie; **Breite** · **Masken** · **Nutzen**, drei gleich breite Buttons, keiner orange; die Zeile ist in jedem Zustand vollständig, ihre Buttons werden nur gesperrt.
- Zustände (§3.2): was es im Zustand nicht gibt, ist ausgeblendet, die übrigen Buttons der Zeile teilen sich die Breite; gesperrt bleibt nur, was im selben Zustand gleich wieder gilt (add/edit ohne Auswahl, Nutzen ohne Auswahl, Werkzeugzeile ohne Dokument bzw. bei Druckbogen vorn, Breite bei Fahrzeugbeschriftung bzw. mit Auftrag). Zeilen bleiben stehen, auch leer (Höhe fest).

| Zustand | Zeile 3 | Zeile 4 | Zeile 5 | Breite · Masken · Nutzen |
|---|---|---|---|---|
| kein Dokument | leer | Export (gesperrt) · Auftrag | leer | alle gesperrt |
| Fremddokument | leer | Export (gesperrt) · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| flach (Lasergravur, Sonstiges, Banner/Roll-up), Offset | leer | Export · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| Fahrzeugbeschriftung | add/edit · berechnen | Summa · Druck · Export · Auftrag | zwei Preise | gesperrt · aktiv · mit Auswahl |
| Beschriftung | add/edit · berechnen | Summa · Druck · Export · Auftrag | zwei Preise | aktiv · aktiv · mit Auswahl |
| Schild | add/edit · Schilder | Summa · Druck · Export · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| Textil | add/edit · berechnen · Farbe · Modell | Summa · Export · Auftrag | ein Preis rechts | aktiv · aktiv · mit Auswahl |
| Druckbogen vorn, Nutzen-Bogen vorn | leer | Export · Auftrag | leer | alle gesperrt |

  Summa und Druck bei Schild und Textil nach `werkzeuge` der Auftragsart. Druckbogen vorn: Zeile 1 „Kunde · Druckbogen <Medium> <Laminat> <Breite> · n/m“ (`bogen.nr`/`bogen.gesamt`); Nutzen-Bogen vorn ebenso mit „<Kunde> · Nutzen <Produkt> · n/m“, „Max Bögl · Gitterscheiben · n/m“ bzw. „Max Bögl · Nummern · n/m“, bei Bögen ohne Arbeitsdatei ohne Grafikzeile.
- **Flyout-Menü** (≡ im Reiter des Panels, `setPanelFlyoutMenu`, Klick über `com.adobe.csxs.events.flyoutMenuClicked`): **Logo**, **VK-CC** (Texte aus `werkzeuge.json` `label`), Trennlinie, **Gitterscheiben**, **MB-Nummern**. Freigabe wie bisher die Buttons (Logo/VK-CC nach SPEZ_03_Werkzeuge §2, fehlendes Skript immer gesperrt; Gitterscheiben/MB-Nummern außer bei Druckbogen vorn und ohne gültige `nutzen.json`), gesperrte Einträge grau, aktualisiert im bestehenden Abruf (`updatePanelMenuItem`); beim Klick nach dem Neulesen erneut geprüft.
- Schild (Profil `schild`): Zeile 1 mit Grafikzeit, Objektzeile und add/edit wie bei Beschriftung (UV-Objekte mit Ebenenname statt Folie), **Schilder** → Fenster „Schilder“. Die Freigaben hängen am Profil, nicht an `kalkulation`.
- Textil (Profil `textil`): Zeile 2 rechts statt Folie „<Position> · <Verfahren>“, bei Flex/Flock mit den Flexfarben, Marke „×<Σ Menge>“; **add/edit** → Fenster „Motiv“ · **berechnen** · **Farbe** (Chip und Name der Textilfarbe, ohne Farbe grau) → Fenster „Textilfarbe“ · **Modell** → Fenster „Modell“; Preis aus dem letzten Datensatz, ohne Flex-/Flock-Motive leer.
- Export: Profil „flach“ über den Exportkern wie in Stufe 1; Profil „schild“ unten unter „Schild“, Profil „textil“ unter „Textil“; kalkulierte Arbeitsdatei oder Druckbogen vorn: Druckbögen des letzten Aufbaus (unten).
- Aktualisierung nur bei Maus ins Panel, nach eigener Aktion und nach CSEvent aus „Objekt“, „Zusammenfassung“, „Breite“ und „Schilder“; keine Dauerabfragen, kein Abruf bei Fenster-Fokus, weil ein Fokus-Abruf während des PDF-Imports den Inhalt im falschen Dokument landen ließ (Befund Stufe 43). Hell/Dunkel über `ThemeColorChanged`.
- Fehler als Popup, keine Erfolgsmeldungen.

## Fenster „Objekt“ (Zuordnen, SPEZ_02 §6, SPEZ_03_Oberflaeche §5, MOCKUP_THEMA6_Zuordnen_2 A)

ModalDialog 480 × 440 (eine Höhe für den größten Plott-Zustand, Inhalt oben ausgerichtet), geöffnet über add/edit im Panel und per Doppelklick in „Zusammenfassung“ (über das Panel). Übergabe Panel → Fenster über eine Datei im temporären Ordner, Rückmeldung per CSEvent.

- Zeile 1: **Art** als Segment-Buttons Digitaldruck | Plott (Schild: die Arten des Verfahrens), rechts **Anzahl** (ganze Zahl ≥ 1, Feld 56 px; bei UV ohne). Vorauswahl: Art nach Tag, sonst Sandbox → Digitaldruck, sonst nach Ebene; Medium/Laminat aus XMP `vorauswahl` (ohne Eintrag 3551 matt); Serie aus `vorauswahl.serie`, ohne gemerkte Serie aus `serien.json` `standard` (751C; fehlt oder unbekannt → ohne Vorwahl); die Farbe einer markierten Zeile mit Zuordnung hat Vorrang.
- **Plott**: „Farben im Objekt“ – je Füllfarbe der Auswahl eine Zeile (Chip, Name, „✓ <Schlüssel>“ bei erkannter Oracal-Farbe oder bekannter `farbzuordnung`, sonst „→ zuordnen“); die markierte Zeile bekommt die nächste Wahl, danach springt die Markierung zur nächsten offenen Zeile. Zeile „Farb-Nr.“ (Feld 64 × 28 px, Schrift 15 px, zentriert, Fokus beim Öffnen) filtert die Kacheln (Teiltreffer der Nummer; ohne Serie alle Serien; genau ein Treffer + Enter übernimmt), rechts davon die Serien 651 · 751C · 951 · 970G · 970M; darunter das Kachelraster aus den ASE (LAB → sRGB, 24 Spalten, Kachel 16 px); der Schlüssel (z. B. „751C-070“) steht an der gewählten Kachel und beim Überfahren einer Kachel. OK erst, wenn alle Zeilen zugeordnet sind. Konturen, Bilder und Verläufe sperren Plott.
- **Digitaldruck**: Medium (Kürzel aus der Preisliste, Reihenfolge wie dort), Laminat matt | glänzend (3676 nur glänzend).
- **Komplexität** K0–K3 nur bei Plott und Druck mit Cutkontur (Tooltip aus `komplexitaet()`); **Aufschläge** aus `aufschlaege()` (Tooltip mit Wert), bei Druck zusätzlich Tape mit drei Zuständen, Klick schaltet weiter: „Tape auto“ (kein Wert in `IP_Attribute`, der Vorschlag aus dem letzten Berechnen gilt) → „Tape“ (`tape`, manuell an) → „kein Tape“ (`kein_tape`, manuell aus); der Tooltip nennt den Vorschlag, unterschiedliche Zustände sind gestrichelt.
- **Mehrfachauswahl**: ein Dialog, gleiche Werte für alle; unterschiedliche Werte gestrichelt bzw. leer, geändert nur bei neuer Wahl; gemischte Art → Art ungewählt, Farb-/Medienbereich aus.
- **Schild** (SPEZ_03_Schild §8.1): nur die Arten der Ebenen des Verfahrens (Folie: Digitaldruck, Plott; UV-Druck: Plott, UV-Vorn, UV-Hinten). UV-Vorn/UV-Hinten ohne Folie, Laminat, Komplexität, Aufschläge, Tape und Anzahl; bei Schild gibt es keinen Tape-Button, OK schreibt keinen Tape-Zustand (Sicke und Wölbung bleiben); die Art ergibt sich aus der Ebene, OK vergibt `IP_Id` und legt das Objekt auf die Ebene der Rolle; ein Objekt auf einer UV-Ebene mit `IP_Id` gilt als zugeordnet. Digitaldruck/Plott wie oben, Medien aus `medien.json` (ohne Plott-Serien), Komplexitätsstufen, Aufschläge und Tape-Schwellen aus der Preisliste ohne Auftragsart (fehlerhaft: ohne diese, still); Komplexität wird gesetzt und geführt, wirkt aber auf nichts. Ragt ein Objekt über mehrere Zeichenflächen: Fuß „Objekt ragt über mehrere Zeichenflächen“, OK gesperrt.
- **OK**: Varianten-Erkennung, `IP_Id` vergeben, falls fehlend, Tags schreiben, bei Plott umfärben (Farbfeld anlegen/wiederverwenden, Originalfarben im Tag `IP_Originalfarbe` am Pfad bzw. Textrahmen, bei Text je Zeichen), bei Digitaldruck und UV Originalfarben zurückholen; Objekte positionsgleich auf die Ebene der Rolle; `vorauswahl`/`farbzuordnung` ins XMP; CSEvent an Panel und „Zusammenfassung“. **Enter** = OK, **Esc** = Abbrechen; der Fuß zeigt die erste offene Warnung, OK ist dann gesperrt.

## Fenster „Zusammenfassung“ (SPEZ_02 §9, MockUp C3; Textil SPEZ_03_Oberflaeche §7)

Modeless 700 × 520, skalierbar (min. 480 × 240); ersetzt „Objekte“ und „Details“. Liest beim Öffnen und nach CSEvent aus Panel und „Objekt“; Daten aus dem Datensatz im XMP plus aktueller Objektliste (`IP.objekteLesen` ohne Messen).

1. **Objekte**: Objekt (Farbstreifen Plott/Druck, Name; Varianten eingerückt unter dem Original mit „· Variante“), Anzahl, Folie, Attribute (nur Abweichungen: K1–K3, Sicke, Wölbung, Tape), Teile, m² (Stückfläche × Anzahl), Betrag, inkl. M. – Werte aus dem letzten Datensatz, sonst „–“; darunter „Ohne Zuordnung (n) – wird nicht berechnet“ mit Ebene. Scrollt ab etwa 12 Zeilen, Folien und Summen bleiben sichtbar. Klick wählt in Illustrator aus (Cmd: dazu/weg, Shift: Bereich), Doppelklick öffnet „Objekt“ über das Panel.
2. **Folien**: Folie, Rolle, Bögen, lfm, m² Verbrauch, EK €.
3. **Summen**: Material; Produktion (min); Montage (min, davon je Auftrag); „nur Aufkleber“ und „inkl. Montage“ gerundet mit brutto „inkl. MwSt. n %“, je darunter „Mindest-VK (<Satz> €/h)“ netto/brutto; Hinweis „Mindestbetrag Produkt/Montage greift“ an der Preiszeile, bei der er greift.
4. **Grafik** abgesetzt: „Grafik N min (a auto, m manuell) · <Satz> €/h“ und Betrag.
5. Fuß: **berechnen** (wie im Panel), **PDF**, **Schließen** (auch Esc).

**PDF** `<Kunde>_Zusammenfassung.pdf` (jsPDF): Kopf (Kunde, Auftragsart, Datum, Maßstab), Objekttabelle und Folien wie im Fenster, Warnungen des Laufs – ohne Summen, Preise, EK und Grafik. Vorher wird automatisch berechnet; Ablage über den Exportkern in den Auftragsordner (Nummerierung `_02` bei Wiederholung), Eintrag in `exporte[]`.

## Werkzeuge (SPEZ_03)

Breite und Masken in der Werkzeugzeile (Zeile 6), Logo und VK-CC im Flyout-Menü des Panels. Vor jeder Aktion die Grafikzeit-Übernahme wie bei jeder eigenen Aktion, danach der übliche Abruf. Freigabe im bestehenden Abruf, nicht zutreffende Buttons bzw. Menüeinträge gesperrt:

| Button | kein Dokument | Fremddokument | Panel-Datei ohne Auftrag | mit Auftrag | Druckbogen vorn |
|---|---|---|---|---|---|
| Breite | gesperrt | aktiv | aktiv, außer Fahrzeugbeschriftung | gesperrt | gesperrt |
| Masken | gesperrt | aktiv | aktiv | aktiv | gesperrt |
| Logo | gesperrt | aktiv | aktiv | nur Sonstiges | gesperrt |
| VK-CC | gesperrt | aktiv | aktiv | nur Sonstiges | gesperrt |

Fremddokument = ohne Panel-XMP; mit Auftrag = `auftrag.orderId` oder `auftrag.productId` gesetzt.

- **Breite** (aus `01-Druckbreite.jsx`): `IP.breiteMessen` prüft Dokument und Auswahl („Kein Dokument geöffnet.“, „Du hast vergessen, etwas auszuwählen! Trottel!“, Popup) und misst die sichtbare Breite (Schnittmaskengruppe = Maskenpfad, Gruppen rekursiv, ausgeblendete Objekte und Ebenen ausgenommen). Fenster „Breite“ (`.breite`): „Zielbreite in mm?“ (vorbelegt mit der gemessenen Breite, zwei Nachkommastellen, Komma) und „Umlaufende Zugabe in mm?“ (2), Abbrechen · OK, Enter = OK, Esc = Abbrechen; Eingabe wie `parseStrictMmNumber` (Komma als Dezimaltrennzeichen, Punkt nur als Tausender), Eingabefehler mit den Texten des Skripts im Fuß, OK gesperrt. OK → `IP.breiteSetzen`: Auswahl gruppieren (mehr als ein Objekt oder keine Gruppe), proportional auf die Zielbreite skalieren (Anker Mitte, Linienbreiten und Muster mit), aktive Zeichenfläche = neues sichtbares Maß + Zugabe je Seite; scheitert Messen oder Zeichenfläche, wird die Skalierung zurückgenommen (Texte des Skripts als Popup). Zielbreite = Dokumentmaß. Keine Erfolgsmeldung, kein XMP, keine Tags.
- **Masken** (aus `06-releaseClippingMasks.jsx`): `IP.maskenLoesen` – ohne Dokument „Kein geöffnetes Dokument gefunden.“; alles abwählen, rekursiv rückwärts durch alle Objekte des Dokuments, gesperrte oder ausgeblendete Gruppen übersprungen, gelöst nur mit echtem Clip-Pfad (PathItem bzw. PathItem im CompoundPath mit `clipping`), gesperrte Ebenen unberührt. Keine Statistik; Ausnahmen des Laufs als ein Popup.
- **Logo**, **VK-CC**: `config/werkzeuge.json` (`skripte[]` mit `datei` und `label`), Pfad `<Extension>/skripte/<datei>`; Start per `$.evalFile` im try/catch, Fehler als Popup `FEHLER: <message> (Zeile n)`. Fehlt ein Skript: Popup beim Start, Menüeintrag gesperrt. Die Skripte bleiben unverändert.

## Schild (SPEZ_03_Schild)

Ein Schild ist eine Zeichenfläche der Arbeitsdatei mit Inhalt (oberste sichtbare Objekte) auf einer Produktionsebene (Plott, Digitaldruck, UV-Vorn, UV-Hinten); Nummer `NN` = Reihenfolge der Zeichenfläche, Anzeige „Schild NN“. Eine Arbeitsdatei hat ein Verfahren und ein Material für alle Schilder; ein Wechsel geht nur über ein neues Anlegen mit der Arbeitsdatei als Quelle. Keine Schildkalkulation, keine Stückzahl (Stufe 3).

- **Konfiguration**: `config/schild_materialien.csv` (`schluessel;bezeichnung;kuerzel;staerke;acryl`, Stärke in mm mit Komma oder Punkt, `acryl` `ja`/`nein`); Startprüfung wie `produkte.csv` (Kopfzeile mit allen fünf Spalten, `schluessel` eindeutig und nicht leer, `bezeichnung` und `kuerzel` nicht leer, `staerke` > 0, `acryl` aus `ja`/`nein`), Fehler → Popup mit Datei, Zeile und Grund, nur Schild im Dialog gesperrt. `schild.json`: `materialien` (Pfad der CSV), `verfahren` (`folie` → `Schild.ait`, 5 mm Anschnitt; `uv` → `UV-Schild.ait`, 2 mm; Anschnitt nur aus der .ait), `werkzeuge` Summa, Druck; `druck` wie Beschriftung (Entscheidung 31.10.); `bohrungen.standard` (4 Ecken, 20/20 mm, Ø 5 mm) und `bohrungen.markierung` (Ø 2 mm, 100 % C); `export { profil schild, preset pam x4, anschnitt dokument, techniken [digitaldruck → druck, uv-vorn, uv-hinten], laser { name laser, max_mm [300, 600], kontur_pt 0,25, umriss_cmyk 100 % M, loch_cmyk 100 % C } }`. Startprüfung: `bohrungen.standard` vollständig mit Werten > 0, `export.laser` vollständig, `materialien` lesbar.
- **Anlegen**: Verfahren „Folie“ / „UV-Druck“, darunter Auswahlliste „Material“ (`bezeichnung`, CSV-Reihenfolge, keine Vorauswahl); „Let's go“ gesperrt ohne Verfahren oder Material. Wahl-Objekt `schild { verfahren, material }`. Vorlage des Verfahrens; mit Quelle Zeichenflächen wie in der Quelle, Inhalt je Zeichenfläche auf die Sandbox; Arbeitsdatei Schild als Quelle: gleiches Verfahren → gleichnamige Ebenen, sonst Sandbox; Bohrungen der Quelle werden nicht übernommen.
- **XMP** `schild { verfahren, material { schluessel, bezeichnung, kuerzel, staerke, acryl }, schilder [{ rect, name, nr, breite_mm, hoehe_mm, bohrungen }] }`: Material beim Anlegen aus der CSV festgeschrieben; `schilder[]` ↔ Zeichenfläche zuerst über das Rechteck (pt, 0,01), sonst über den Namen; ohne Eintrag gilt `bohrungen.standard`; `nr` und Endmaß (Zeichenfläche, Realmaß) bei OK im Fenster „Schilder“ und bei jedem Export neu. Schilddaten für die App-Kalkulation (Verfahren, Material, Endmaß, Bohrungen je Schild).
- **Bohrungen**: `ecken` (4; `abstand_x_mm` von links/rechts, `abstand_y_mm` von oben/unten), `mitte_oben_unten` (2, waagrecht mittig), `mitte_links_rechts` (2, senkrecht mittig), `keine`; `durchmesser_mm` für alle Bohrungen eines Schildes. Prüfung bei OK: Werte > 0, Abstand ≥ halber Durchmesser, keine Überschneidung (2 × Abstand + Durchmesser ≤ Seite) → sonst Popup „Schild NN: Bohrungen passen nicht auf das Schild“, Fenster bleibt offen. Lochmitten aus `schild.js` für Druck-PDF und Laserdatei.
- **Fenster „Schilder“** (`.schilder`, ModalDialog 560 × 400, SPEZ_03_Oberflaeche §8): Kopf Verfahren · Material; je Schild eine Karte (Zebra, scrollt) mit Skizze links (Schild maßstäblich höchstens 100 × 76 px, je Bohrung ein Punkt an der Lochmitte aus `schild.lochmitten`, folgt jeder Eingabe, bei leeren oder ungültigen Werten keine Punkte) und rechts „Schild NN“, „B × H mm“, Anordnung („4 Ecken“, „2 mittig oben/unten“, „2 mittig links/rechts“, „keine“) und nur die nötigen Felder „Abstand waagrecht“, „Abstand senkrecht“, „Durchmesser“ (mm); Vorbelegung aus dem XMP, sonst Standard. OK schreibt `schilder[]`, Abbrechen verwirft; Enter = OK, Esc = Abbrechen.
- **Schildregeln** (vor Summa, Druck und Export; Fehler sperren, Warnungen gesammelt als ein Popup): Fehler „„<Objekt>“ ragt über mehrere Zeichenflächen“, „Schild NN: UV und Plott zusammen“, „Schild: Verfahren oder Material fehlt“; Warnungen „Schild NN: UV-Hinten auf <Material>“ (nicht Acryl), „Schild NN: UV-Vorn bzw. UV-Hinten größer als A2 (B × H mm)“ (`uv_max_mm`, beide Ausrichtungen). Plott und Druck mit Cutkontur auf einem Schild sind zulässig.
- **Summa**: Plott-Objekte aller Schilder wie Beschriftung. **Druck**: nur Digitaldruck-Objekte mit Cutkontur über Druckbögen wie Beschriftung (keine Lochmarkierungen). Lesen und Messen ohne Preisprüfungen; Serie bzw. Medium müssen nur in `serien.json` bzw. `medien.json` bekannt sein.
- **Export** (`export_schild.js`): Schildregeln → `schilder[]` aktualisieren → je Schild und Technik eine PDF über den Exportkern (Auftragsordner, Nummerierung `_02` …), Preset „pam x4“, nur diese Zeichenfläche, nur die Ebene der Technik (übrige ausgeblendet, danach wiederhergestellt), ohne Bearbeitungsdaten und PDF-Ebenen, Anschnitt aus dem Dokument: Folie `druck` (Digitaldruck ohne Cutkontur, Objekte mit Cutkontur ausgeblendet, Lochmarkierungen Ø 2 mm 100 % C ohne Kontur, bei „keine“ ohne); UV `uv-vorn`, `uv-hinten` je vorhandener Technik (nicht gespiegelt, kein Weiß, keine Lochmarkierungen); **Laserdatei** `laser` bei Acryl und Schild bis 300 × 600 bzw. 600 × 300 mm (Grenze eingeschlossen, beide Verfahren): Umriss der Zeichenfläche 100 % M, je Bohrung ein Kreis 100 % C, Kontur 0,25 pt, keine Füllungen, alle übrigen Ebenen ausgeblendet. Temporäre Elemente auf einer eigenen Ebene nur für die jeweilige PDF. Liegt ein Druckbogen-Aufbau vor, exportiert derselbe Klick dessen Druckbögen wie bei Beschriftung.
- **Dateinamen** `<Kunde>_<technik>_NN_<Kürzel>-<Stärke>.pdf` (Stärke mit Komma bei Dezimalwerten), z. B. `Mueller_druck_01_Dib-3.pdf`, `Mueller_uv-vorn_02_PMMA-5.pdf`, `Mueller_laser_02_PMMA-5.pdf`; nur im Auftragsordner, kein Sammelordner.

## Textil (SPEZ_03_Textil)

Eine Arbeitsdatei = Kopie des MockUps eines Modells (`Korrekturabzug_<ID>.ai`, ID = Text der Ebene „ID“; dieselbe ID ein zweites Mal im Ordner `_02` …); mehrere Modelle eines Auftrags = mehrere Arbeitsdateien im selben Auftragsordner. Ebenen aus dem MockUp (Anker, ID, Stofffarbe, Textil, Infos, Design); Panel-Ebene „Design“ (Rolle `textil`), Maßstab 1:1, Zeichenfläche 1 = Korrekturabzug (A4). Supabase/SDK, Preise für DTF, Stick, Namen und das Textil selbst, Sammelbögen DTF und die MockUps selbst sind nicht enthalten.

- **Konfiguration**: `config/textil.json` (`mockup_ordner`, `marken`, `rand_mm` 2, `hoehen_hinweis_mm`, `kinder_faktor` 1,5, `namen` 560 × 1000 mm, Abstand/Zeilenabstand 10; `streifen` Daten bis 470 mm, Zeichenfläche 480 mm, Länge bis 1500 mm, Rand 5, Abstand 10, Rollenbreite 500 für den Verbrauch). `textil_stufen.csv` (`position;standard_mm;stufen_mm`), `textil_modelle.csv` (`id;modell;dateimass_mm;realmass_mm;bezeichnung`, Realmaß = Herstellerangabe, darf fehlen), `textil_farben.csv` (`id;farbe;hex;c;m;y;k;groessen`). Startprüfung: Dateien lesbar, Kopfzeilen vollständig, Werte gültig (Maße > 0, c/m/y/k 0–100, `id`/`modell`/`farbe` nicht leer), alle Felder von `textil.json` mit Zahlen > 0, `daten_breite_max_mm` ≤ `zeichenflaeche_breite_mm` − 2 × `rand_mm`; Fehler → Popup mit Datei, Zeile und Grund, nur Textil im Dialog gesperrt. `textil.json` der Auftragsart: `kalkulation` true, `preis` textil, `kalkuliert_verfahren` [Flex, Flock], `textil` (Pfad), `export { profil textil, preset pam x4, sammelordner dtf_bestellen }`, `werkzeuge` [summa], `dateien.arbeitsdatei` „Korrekturabzug“, `summa.preset`; Startprüfung `kalkuliert_verfahren` nicht leer, `export.sammelordner` ein Pfadfeld von `rechner.json`.
- **MockUps** `config/mockups/<modell>.ai` (Dateiname = Spalte `modell`): wählbar ist ein Modell nur mit Datei; ohne eine einzige Datei ist Textil im Dialog gesperrt (Tooltip = erwarteter Ordner). Marke = Präfix von `modell` vor dem ersten „_“, nur Marken aus `marken`.
- **Anlegen**: Reihe Marken-Buttons, darunter die Modelle der Marke (Text `bezeichnung`, leer `modell`), dann das Farbraster des Modells (Kacheln in CSV-Reihenfolge mit `hex` und Name; ohne Einträge Freitextfeld „Farbe“); Marken- oder Modellwechsel setzt die Farbwahl zurück; „Let's go“ erst mit Modell und — bei Farbliste — Farbe. Wahl-Objekt `textil { modell, farbe: { name, cmyk | null } | null }`. Quelle wie gebaut, keine Maßstabsabfrage. JSX-Grundlage `mockup`: MockUp öffnen, ID prüfen (sonst ohne Speichern schließen, Popup `MockUp „<Datei>“: ID „<ist>“ statt „<soll>“`), Quelle als Block mittig auf Zeichenfläche 1 auf „Design“ (unskaliert; Arbeitsdatei Textil als Quelle: nur ihre Ebene „Design“), Stofffarbe umfärben bei CMYK, XMP, speichern; Auftragsordner `JJJJ-MM-TT_Textil`, aktive Ebene „Design“. Das MockUp selbst wird nie gespeichert.
- **XMP** `textil { modell { id, modell, bezeichnung, marke, faktor = realmass_mm / dateimass_mm | null }, farbe { name, cmyk } | null }`, beim Anlegen aus der CSV festgeschrieben.
- **Tags**: `IP_Id`, `IP_Position`, `IP_Verfahren` (DTF · Flex · Flock · Stick), `IP_Stufen` (Druckgrößen `{ mass_mm, bezug, menge, groessen, blockout, zeigen, koerpergroesse_cm }`, `koerpergroesse_cm` nur bei „Kinder“, sonst `null`), bei Flex/Flock `IP_Folie` (Serie), `IP_Farbe` (`{ <colorKey>: <Flexfarbe> }`), `IP_Komplexitaet`; `IP_Original` bei Varianten. `IP_Anzahl`, `IP_Laminat`, `IP_Attribute` werden nicht geschrieben. Farbschlüssel = `<Serie>-<Flexfarbe>`.
- **Fenster „Motiv“** (`.motiv`, 640 × 470, SPEZ_03_Oberflaeche §6): Silhouetten Vorn/Hinten hell mit Kontur (Tokens `--silhouette`, `--silhouette-kontur`), rechts Verfahren 2 × 2, bei Flex/Flock Serie ohne Überschrift (Tooltip „Serie“) und Komplexität, unten „Ohne Position“ nebeneinander; „Farben im Objekt“ (Chip, Name, Feld „Flexfarbe“ nebeneinander) nur bei Flex/Flock über den Druckgrößen, bei DTF und Stick ohne Platz; Druckgrößen mit Zebra, nehmen die übrige Höhe und scrollen. Genau ein oberstes Objekt bzw. eine Gruppe ausgewählt, sonst Popup „Bitte gruppieren: …“. Positionen als Pillen auf Vorn/Hinten, „Ohne Position“ mit Sponsor und Namen, Positionen ohne Anker im MockUp ausgegraut; Verfahren DTF · Flex · Flock · Stick (Namen nur DTF); Flex/Flock: Serie aus der Preisliste (eine Serie → vorbelegt und nur angezeigt), je Füllfarbe „Flexfarbe“ (Pflicht), Komplexität K0–K3, gesperrt bei Konturen, Bildern, Verläufen, Transparenz; Druckgrößen zeigen · Maß (Maße der Position, „frei“, „Kinder“ mit Körpergröße, beim Öffnen wieder als „Kinder“) · Bezug · Menge · Textilgrößen · blockout (nicht bei Stick) · ×; Summenzeile; Höhenhinweis als Popup. OK: Varianten-Erkennung, Tags, Objekt auf „Design“, skaliert auf Realmaß der zeigen-Druckgröße / Faktor, am Anker ausgerichtet (Name auf `_Oben` → Oberkante, sonst Mitte; ohne Anker an seiner Stelle). Modell ohne `realmass_mm` (Faktor `null`): Zuordnen ohne Skalierung, Tags und Ankerausrichtung wie sonst, kein Popup; Export und Streifen skalieren unabhängig davon absolut auf `mass_mm`.
- **Fenster „Textilfarbe“** (`.textilfarbe`, 420 × 300): Farbraster mit 5 gleich breiten Spalten (Fläche 40 px, Name einzeilig mit Ellipse, Tooltip voller Name, scrollt) bzw. Freitext, aktuelle Farbe vorgewählt; OK schreibt `textil.farbe` und färbt bei CMYK alle gefüllten Pfade der Ebene „Stofffarbe“ um (Konturen bleiben; ohne Ebene nur der Name). **Fenster „Modell“** (`.modell`, 720 × 320): drei Spalten Marke · Modell · Farbe (110 px · 130 px · Rest, Farbraster 4 Spalten, Fläche 26 px; ohne Wahl leer, Überschriften stehen); OK legt eine weitere Arbeitsdatei im Auftragsordner der vorderen an (ohne Quelle, mit `kunde`, `auftrag`, `ablage`), sie wird aktiv.
- **Lesen und Messen** (berechnen, Summa; nur Flex/Flock): Text in Pfade, Einzelteile wie Plott, je Füllfarbe eine Teilegruppe; gemessen im MockUp-Maß, je Druckgröße mit f = `mass_mm` / `mass_mm(zeigen)` × Faktor des Modells auf Realmaß umgerechnet (Schnittlänge × f, Fläche × f², Teile gleich), dasselbe f für die Streifen; nur bei Modell ohne Realmaß Ersatzweg f = `mass_mm` / Ist-Maß des Motivs im Dokument (sichtbare Grenzen, Bezug Breite bzw. Höhe). Mehrfarbig: Passermarken je Druckgröße, je Farbe ein Block. Warnungen: Objekte auf „Design“ ohne Zuordnung, Konturen; Abbruch: Füllfarbe ohne Flexfarbe, Exemplar bzw. Block passt in keiner Lage in 470 × 1490 mm, Serie nicht in der Preisliste; bei berechnen zusätzlich Serie ohne Preis, Preisliste fehlerhaft.
- **Summa**: je Farbschlüssel alle Exemplare zusammen genestet (Einheit Exemplar bzw. Block, Nutzbreite 470, Länge ≤ 1500 → weitere Streifen), je Streifen ein Hilfsdokument 480 × Länge, Inhalt mittig, je Exemplar eine Gruppe; `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf`, Preset `summa.preset`, `ersetzen`, nur Auftragsordner.
- **Kalkulation** (PREISLOGIK §13, `kalkulation_textil.js`): ein Preis inkl. Pressen in „inkl. Montage“ (VK und Mindest-VK), „nur Aufkleber“ null; Rüsten/Datei je Farbschlüssel nach Fläche verteilt, Entgittern, Trennen, Komplexität, Pressen (1 je Exemplar, 2 bei blockout), Material je Serie, Mindestbetrag 5,40 € je Exemplar, Falten je Textil (Textilzahl = größte Mengensumme einer Position), Rundung 0,10 €; Verbrauch = Streifenlänge × 500 mm (EK, Materialbedarf). Datensatz `auftragsart` textil mit `objekte[]` je Motiv und Druckgröße (DTF/Stick mit `null`-Beträgen), `folien[]` je Farbschlüssel mit `streifen`, `auftrag { falten_min, textilzahl, … }`, `textil { modell, farbe }`.
- **Zusammenfassung**: Motiv, Position, Verfahren (Flex/Flock mit Serie und Flexfarben), Druckgrößen, K, Teile, Betrag; „Ohne Zuordnung (n)“; Folien (Farbschlüssel, Streifen, lfm, m² Verbrauch, EK); Summen Material, Produktion, Pressen, Falten, Preis und Mindest-VK mit Hinweis „Mindestbetrag je Motiv greift (n Exemplare)“; Doppelklick öffnet „Motiv“. PDF mit Kopf Kunde, Textil, Modell, Textilfarbe, Datum.
- **Export** (`export_textil.js`, nur die vordere Arbeitsdatei): speichern → Prüfungen (Motiv ohne Druckgröße, Druckgröße ohne Menge, Namen-Gruppe leer, Namen zu breit bzw. zu hoch, Ebene „Infos“) → Ebene „Infos“ füllen (Farbe, Druck, Datum, Motivzeilen) → DTF und Stick je Motiv und Druckgröße `<Menge>x_<Kunde>_<Position>_<Maß>[_blockout][_<ID>].pdf` (absolut auf das Maß skaliert, Zeichenfläche = sichtbare Grenzen + 2 mm) → Namen im Blocksatz auf Bögen bis 560 × 1000 mm → `<Kunde>_Korrekturabzug[_<ID>].pdf` (Zeichenfläche 1) → Exportkern; `_<ID>` bei mehr als einem Korrekturabzug im Auftragsordner (lokal ∪ Server); DTF-Dateien und Namen-Bögen zusätzlich in `server.dtf_bestellen`, Stick nur Auftragsordner, Flex/Flock nur über Summa.
- **Festlegungen CC** (`FESTLEGUNGEN.md` Abschnitt „Textil“, Punkte 1–35): bestätigt 31.10. (SPEZ_03_Textil §14) mit den Korrekturen zu Punkt 1 (Faktor nach §9.1), 13 (Zuordnen ohne Realmaß) und 18 (`koerpergroesse_cm`); Punkte 17, 22, 32, 33 ersetzt durch SPEZ_03_Oberflaeche §3, §6, §7.
- **Zusammenfassung Textil** (SPEZ_03_Oberflaeche §7): Spalten Motiv · Position · Verfahren · Maß mm · Menge · Textilgrößen · (ohne Kopf: „blockout“, „zeigen“ bzw. beides mit „ · “) · K · Teile · Betrag, eine Zeile je Druckgröße; Motiv, Position, Verfahren, K, Teile, Betrag nur in der ersten Zeile des Motivs; Zebra, Auswahl und Doppelklick je Motiv. PDF mit denselben Spalten ohne Betrag, Kopf „Textil · <Marke> <Bezeichnung> · <Textilfarbe>“.

## Nutzen, Gitterscheiben, MB-Nummern (SPEZ_03_Nutzen)

Nutzen in der Werkzeugzeile des Panels, Gitterscheiben und MB-Nummern im Flyout-Menü. Gemeinsamer Kern: je Funktion ein Raster-Planer (Node, Logik aus dem alten Projekt, Konstanten aus `config/nutzen.json`) liefert Bögen im Format des Druck-Nestings; Dokument, Symbole und Instanzen, Bogen-XMP, Info-Ebene, Export mit eigenen OPOS-Marken und Ablage laufen über den Druckbogen-Kern. Nutzen-Bögen sind Druckbögen (`rolle: "druckbogen"`) mit `bogen.art` `nutzen` | `gitter` | `mb`, dazu `bogen.produkt` (Nutzen) und `bogen.auflage` (Gitter: Drucke je Bogen, sonst 1); die Rolle `nutzenbogen` entfällt. Bogenlänge ≤ 2500 mm, darüber weitere Bögen desselben Aufbaus. Symbol je Quelle, Instanz je Exemplar, Umwandeln erst beim Export. Prüfungen des Kerns (Abweichung von der Planung, Cutkontur über der Außenkante, Abstand, OPOS-Rand, Cutkonturen-Zahl) als ein Popup, keine Erfolgsmeldung.

- **Freigabe**: Nutzen bei vorderem Dokument mit Auswahl, Gitterscheiben und MB-Nummern immer; alle drei gesperrt bei Druckbogen vorn und bei fehlerhafter `nutzen.json`. Button und Menüeinträge prüfen nach dem Neulesen erneut, vorher die Grafikzeit-Übernahme.
- **Nutzen** (§5): Einstieg A = Beschriftung-Arbeitsdatei mit genau einem ausgewählten obersten Digitaldruck-Objekt (Medium `IP_Folie`, Laminat `IP_Laminat`, Stückzahl `IP_Anzahl`, Kunde aus dem XMP; vorher speichern, ungespeichert → Abbruch); Einstieg B = jedes andere Dokument mit Auswahl (Kunde, Stückzahl, Medium, Laminat im Dialog). Messung der Auswahl im Kern (sichtbare Begrenzung, Cutkontur [R 3.1], Anschnitt; ohne Cutkontur Rückfrage), Realmaß = Dokumentmaß × Maßstab aus dem XMP (ohne XMP 1). Fenster „Nutzen“ (840 × 380, SPEZ_03_Oberflaeche §11): Schritt „Nutzen“ (ohne Box „Motiv (gemessen)“; Kunde, Stückzahl, Medium, Laminat bzw. bei A als Text, Produkt; Linie; Bogenformat A4 · A3 · ohne, Modus, Abstand Motive, Abstand Bögen 20 fest), Schritt „Vorschau“ (Vorgabe, eine Zeile je Layout mit hervorgehobener Wahl, Detailtext), „Aufbauen“. Nutzbreite = Rollenbreite − 2 × Kantenhalter − OPOS-Rand − 2 × Anschnitt. A4/A3 mit der Füll-Logik des alten Projekts, „ohne“ mit Spalten über die Nutzbreite und exakt teilbelegter letzter Zeile. Ein Symbol (Quelle `ref` bzw. `auswahl`), Instanz „<Produkt> <k>“ mit `IP_Herkunft` (A). A schreibt `aufbau` (mit `art`, `produkt`) in die Arbeitsdatei; B, Gitter und MB erzeugen Bögen mit `bogen.arbeitsdatei: null`.
- **Gitterscheiben** (§6): Fenster „WEA-Etiketten“ (560 × 260, SPEZ_03_Oberflaeche §12.1–§12.2; Schritt 1 Liste mit Kopf und Zebra, Schritt 2 mit Etikett-Vorschau 180 × 72 px als Sinnbild, Schritt 3 Varianten als Tabelle mit Detailbox): Kundendateien per Dateidialog (Start im Bögl-Kundenordner), Stückzahl aus dem Präfix `<Zahl>x_`; Typbezeichnung je Datei mit Gedächtnis `typzuordnung.txt` im Bögl-Kundenordner (Server nicht erreichbar: nur der Vorschlag); Vorlage `config/vorlagen/Etikett.ait` messen, Varianten Einzelbogen/Bogenfolge (ohne „über 2,5 m“, Längengrenze 2500 − 44,353), zulässige Breite 1345 mm. Je Kundendatei ein Symbol (Streifen mit Typ-Etikett und Etiketten, Texte eingepasst und in Pfade), Instanz je Streifen-Platz, quer um 90° gedreht.
- **MB-Nummern** (§7): Fenster „Bögl Nummern“ (460 × 230, SPEZ_03_Oberflaeche §12.3): zehn Felder in 5 Spalten × 2 Zeilen, vorbelegt aus `auftrag.txt` im Bögl-Kundenordner, ohne Hinweis zum 5er-Raster; darunter das Ergebnis beim Tippen („Material ges.: …“, „… Stück Überproduktion …“ wie die Info-Ebene, `nutzenbogen.mbErgebnis`); Blöcke (5 Spalten, höchstens zwei Nummern je Block, 5er-Aufrundung), Masterdatei `config/vorlagen/Bögl Nummern Masterdatei.ait`; ein Symbol je Nummer, Instanz je Schild; Zeilen werden auf Bögen verteilt.
- **Export** (§2.5, §5.6, §6.5, §7.4): bei vorderem Bogen ohne Arbeitsdatei alle offenen Bögen derselben `bogen.aufbau`-Id; Exportkern mit dem XMP des ersten Bogens, ohne Arbeitsdatei-Kopie, `ablage` und `exporte[]` in alle Bögen (vor dem Speichern der `.ai`). Nutzen: `<Kunde>_<Produkt>_<Medium>-<Laminat>-<Breite>_NN_druck.pdf`, `…_cut.pdf`, `….ai`; Einstieg B Kundenordner über den Ordnerdialog, Auftragsordner `JJJJ-MM-TT_<Produkt>`. Gitter/MB: Kundenordner fest `M/01_Max Bögl`, Auftragsordner `JJJJ-MM_Gitterscheiben` bzw. `JJJJ-MM_Nummern` (fremder Ordner gleichen Namens → „ 2“, „ 3“ …), Dateien `Nutzen NN_druck.pdf`, `Nutzen NN_cut.pdf`, `Nutzen NN.ai`; Server nicht erreichbar: Mac lokal geparkt, MKs PC Abbruch.
- **Grafikzeit**: Bögen (alle `bogen.art`) werden nicht gezählt, wie Druckbögen (SPEZ_02 Fassung 8 §12).

## Grafikzeit (SPEZ_02 §12)

- **Hintergrund-Extension** `.hintergrund` (Custom, startet mit Illustrator, ohne Oberfläche, keine `evalScript`-Abfragen): aktives Dokument aus `documentAfterActivate`/`-Deactivate`/`-Save` (Pfad aus den Ereignisdaten); die Rolle liest `dokument_xmp.js` aus dem XMP der gespeicherten Datei (ip:Dokument, Namespace 2.0, Schema 1; stückweise bis zum ersten IP-Paket, je Pfad nach Änderungszeit/Größe zwischengespeichert). Ungespeicherte Dokumente: kein Zählen.
- **Gezählt** wird jedes gespeicherte Dokument mit Panel-XMP, alle Auftragsarten, außer Druckbögen (`rolle: "druckbogen"`, alle `bogen.art`): Arbeit in Druckbögen zählt nicht, keine Gutschrift an die Arbeitsdatei (SPEZ_02 Fassung 8 §12). Alle 5 s „Illustrator vorn“ und „Sekunden seit letzter Eingabe“; aktiv, wenn vorn und Eingabe < 30 s; Zeitstempel-Differenzen, Lücken höchstens 15 s (`grafikzeit.Zaehler`). Einträge in den Puffer alle 60 s, bei Dokumentwechsel und beim Beenden.
- **Aktivitätserkennung** `aktivitaet.js` (`vorn()`, `leerlaufSekunden()`; Fehler → nicht aktiv): macOS `lsappinfo front` / `lsappinfo info -only bundleid` (`com.adobe.illustrator`) und `ioreg … HIDIdleTime`; Windows ein dauerhaft laufender PowerShell-Prozess je Sitzung (`GetForegroundWindow` → Prozessname `Illustrator`, `GetLastInputInfo`), Anfrage und Antwort je eine Zeile über stdin/stdout.
- **Puffer** `grafikzeit_puffer.json` im Rechnerordner (Ordner der `rechner.json`): `{ "<Pfad Arbeitsdatei>": [ { "id", "von", "bis", "sekunden" } ] }`; Hintergrund-Extension und Panel lesen–ändern–schreiben atomar (Temp-Datei + Umbenennen); das Panel entfernt genau die übernommenen Ids.
- **Übernahme ins XMP** durch das Panel bei Maus ins Panel und vor jeder eigenen Aktion (Zuordnen, berechnen, Summa, Druck, Export, „+m“) und durch „berechnen“ im Fenster „Zusammenfassung“ (vor dem Rechnen): für die vordere Arbeitsdatei, bei Export mit vorderem Druckbogen für dessen Arbeitsdatei (`bogen.arbeitsdatei`); nur, wenn Puffereinträge vorliegen (sonst kein XMP-Schreiben). Je Puffereintrag `{ von, bis, minuten (Sekunden/60 auf 0,1), manuell: false, benutzer: null, uebertragen: false }` in `grafikzeit.eintraege`.
- **„+m“**: ganze Minuten, auch negativ; Enter → `{ von = bis = jetzt, minuten, manuell: true, benutzer: null, uebertragen: false }`; 0 oder keine Zahl: nichts.
- **Anzeige** „Grafik N min“ = Σ aller Einträge, ganzzahlig; bei Druckbogen vorn keine Grafikzeile. Der Block `grafik` im Kalkulationsdatensatz summiert die Einträge (`min_auto`, `min_manuell`); keine Verrechnung.

## Konfiguration je Rechner (`rechner.json`)

Ort: macOS `~/Library/Application Support/PAM-Werkzeuge/rechner.json`, Windows `%APPDATA%\PAM-Werkzeuge\rechner.json`. Nicht im Repo. `~` und `%VAR%` werden aufgelöst. Geprüft beim Start: Datei vorhanden, gültiges JSON, alle fünf Pfadfelder vorhanden. Die Server-Erreichbarkeit wird erst bei Bedarf geprüft.

macOS (MacBook):

```json
{
  "rechner": "MacBook",
  "server": {
    "kunden": "/Volumes/Server A-Z/_03_Kunden A-Z",
    "dtf_bestellen": "/Volumes/Server A-Z/_02_Produktion/= DTF bestellen =",
    "wmd_bestellen": "/Volumes/Server A-Z/_02_Produktion/= wmd bestellen ="
  },
  "lokal": {
    "arbeitsdateien": "~/Desktop",
    "ausgang": "~/Desktop"
  }
}
```

Windows (MKs PC):

```json
{
  "rechner": "MK-PC",
  "server": {
    "kunden": "Y:\\_03_Kunden A-Z",
    "dtf_bestellen": "Y:\\_02_Produktion\\= DTF bestellen =",
    "wmd_bestellen": "Y:\\_02_Produktion\\= wmd bestellen ="
  },
  "lokal": {
    "arbeitsdateien": "server",
    "ausgang": "%LOCALAPPDATA%\\PAM-Werkzeuge\\Ausgang"
  }
}
```
- `server.kunden`: Wurzel des A–Z-Baums; Kundenordner stehen im XMP relativ dazu (`M/Mustermann`).
- `server.dtf_bestellen`, `server.wmd_bestellen`: Sammelordner für die zusätzlichen Kopien (Textil-DTF, Offset-Daten).
- `lokal.arbeitsdateien`: Pfad = lokaler Ort der Arbeitsdateien (`<Pfad>/<Kunde>/<Auftragsordner>/Arbeitsdatei.ai`); `"server"` = direkt im Server-Auftragsordner.
- `lokal.ausgang`: dort schreibt der Export zuerst. Mac: Schreibtisch = Parkplatz bei Fehlschlag. Windows: technischer Zwischenordner; bei Fehlschlag Popup, die Datei bleibt dort.

## Einrichtung

macOS (Entwicklung): Verknüpfung `~/Library/Application Support/Adobe/CEP/extensions/de.pamnm.illupanels` → Projektordner, `PlayerDebugMode` 1 für CSXS 12. Illustrator lädt damit direkt aus dem Projektordner; das alte Panel ist nicht mehr geladen. Versionen im Manifest nur aus Ziffern und Punkten (`3.4.0`); mit Bindestrich lehnt CEP das ganze Manifest ab (`~/Library/Logs/CSXS/CEP12-ILST.log`: „Wrong symbol '-' in version“) und keine Extension erscheint.

Windows (Beschreibung, in Stufe 1 nicht ausgeführt): nur Git.
1. Repo klonen, z. B. `git clone https://github.com/arbeitsdenkmal/IlluPanel.git "%USERPROFILE%\tools\Illustrator Panel"`; Updates per `git pull`.
2. Junction anlegen (Eingabeaufforderung):
   `mklink /J "%APPDATA%\Adobe\CEP\extensions\de.pamnm.illupanels" "%USERPROFILE%\tools\Illustrator Panel"`
3. PlayerDebugMode setzen:
   `reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f`
4. `%APPDATA%\PAM-Werkzeuge\rechner.json` mit der Windows-Variante anlegen, Illustrator neu starten.

## Datenschicht

**Dokumentebene (XMP):** Namespace `http://ns.pam-nm.de/illupanels/2.0/`, Präfix `ip:`, eine Eigenschaft `ip:Dokument` mit JSON-Text. Nur der JSX-Kern berührt XMP (`IP.xmpLesen`, `IP.xmpSchreiben`); Node liest und schreibt das Objekt über `dokument.xmpZugriff(host)` → `xmpLesen()` / `xmpSchreiben(obj)`, sofort bei jeder Änderung. Der alte Namespace `…/1.0/` wird weder gelesen noch geschrieben. Schema 1:

```json
{ "schema": 1, "panel": "3.0.0", "erstellt": "…Z", "rolle": "arbeitsdatei", "auftragsart": "sonstiges", "massstab": 1, "kunde": "Mustermann",
  "auftrag": { "orderId": null, "productId": null },
  "ablage": { "kundenordner": "M/Mustermann", "auftragsordner": "2026-10-30_Sonstiges" },
  "quelle": { "art": "geoeffnet | datei | leer", "pfad": "…" },
  "grafikzeit": { "eintraege": [] }, "vorauswahl": {}, "farbzuordnung": {}, "kalkulation": null, "aufbau": null, "offset": null, "banner_rollup": null, "schild": null, "textil": null,
  "exporte": [ { "zeit": "…Z", "ordner": "M/Mustermann/2026-10-30_Sonstiges", "dateien": [ { "name": "Mustermann_druck.pdf", "uebertragen": true } ], "uebertragen": true } ] }
```

Unbekannte Felder bleiben beim Ändern und Schreiben erhalten. `aufbau` = letzter Druckbogen-Aufbau `{ id, zeit, boegen: [{ medium, laminat, breite_mm, nr }] }`. `exporte[].ordner` ist relativ zu `server.kunden`, `null` ohne Server-Ordner. Bekannte Felder ab Stufe 2 (`vorauswahl` {}, `farbzuordnung` {}, `kalkulation` null, `aufbau` null, `offset` null, `banner_rollup` null, `schild` null) ergänzt `parsen()` mit Standardwert, wenn sie in einem älteren Dokument fehlen. Art-spezifische Bereiche (SPEZ_03_Konfigurationen §8), beim Anlegen geschrieben, beim Export gelesen: `offset { produkt, bezeichnung, ausrichtung, seiten }` (freies Format: `produkt`, `bezeichnung`, `ausrichtung` null; die Bezeichnung bleibt bei späterer Änderung der CSV), `banner_rollup { variante }` (`"banner"` oder Roll-up-id), `schild { verfahren, material, schilder }` (unter „Schild“). `kalkulation` = letzter Kalkulationsdatensatz (unten), `farbzuordnung` = colorKey → Folienschlüssel. Druckbogen-Dokumente (`rolle: "druckbogen"`, Maßstab 1, `auftrag` und `ablage` aus der Arbeitsdatei) tragen zusätzlich `bogen { aufbau, medium, laminat, breite_mm, nr, gesamt, arbeitsdatei }` (in `schema.json` unter `rollenfelder`); `nr`/`gesamt` zählen je Medium + Laminat + Rolle, `arbeitsdatei` ist der Pfad der Arbeitsdatei.

**Objektebene (Tags):** `IP_Id`, `IP_Folie`, `IP_Laminat`, `IP_Anzahl`, `IP_Komplexitaet`, `IP_Attribute`, `IP_Herkunft`, `IP_Original`, `IP_Position`, `IP_Verfahren`, `IP_Stufen`, `IP_Farbe`, `IP_Originalfarbe`, `IP_Druckrichtung` – Namen nur in `config/schema.json` („tags“: Schlüssel → Name). JSX `IP.tagsLesen(item)` → `{schluessel: wert|null}`, `IP.tagsSchreiben(item, obj)` (null/"" entfernt); Node `tags.tagsPruefen(schema, obj)` prüft Schlüssel und Textwerte.

Bedeutung (SPEZ_02 §3.1): `IP_Id` Schlüssel des Objekts (Text); `IP_Folie` Plott-Farbschlüssel `751C-031` bzw. Druckmedium `3551`; `IP_Laminat` `matt`/`glaenzend` (nur Druck); `IP_Anzahl` ganze Zahl ≥ 1, fehlt = 1; `IP_Komplexitaet` `0`–`3`; `IP_Attribute` kommagetrennt aus `sicke`, `woelbung`, `tape` (Tape manuell an), `kein_tape` (Tape manuell aus), ohne beides gilt der Vorschlag; `IP_Original` Id des Originals bei Varianten; `IP_Herkunft` (nur auf Druckbögen) `IP_Id` des Objekts, dessen Symbolinstanz das ist; `IP_Druckrichtung` (nur auf Druckbögen) Druckrichtungsdreieck, Wert `1`; `IP_Originalfarbe` gesicherte Originalfarbe eines beim Zuordnen als Plott umgefärbten Pfads bzw. Textrahmens (JSON wie bisher). Objektname frei, ohne Namen Anzeige „Objekt n“ (laufende Nummer der berechneten Stücke in Ebenenreihenfolge, nicht gespeichert).

## Auftragsarten

| Datei | Name | Reihenf. | Kalk. | Ebenen | Maßstab | Zeichenfläche | Quelle → | Export |
|---|---|---|---|---|---|---|---|---|
| fahrzeugbeschriftung | Fahrzeugbeschriftung | 1 | ja | Sandbox, Fahrzeugkontur (gesperrt), Plott, Digitaldruck | 1:30 | neu 210 × 297; mit Fahrzeugvorlage: vorlage | Sandbox | produktion |
| beschriftung | Beschriftung | 2 | ja | Sandbox, Cut, Print, Foto | 1:1 | neu 1000 × 1000 | Sandbox | produktion |
| schild | Schild | 3 | nein | Sandbox, Plott, Digitaldruck, UV-Vorn, UV-Hinten (je Verfahren) | 1:1 | vorlage | Sandbox | schild |
| banner_rollup | Banner/Roll-up | 4 | nein | – | 1:1 | Banner: abfrage; Roll-up: Vorlage; mit Auftrag: app | bleibt | flach `druck` |
| lasergravur | Lasergravur | 5 | nein | – | 1:1 | fest 600 × 300 | bleibt | flach `laser` |
| offset | Offset-Daten | 6 | nein | – | 1:1 | produktvorlage | gleichnamige Ebenen | offset `druck` |
| textil | Textil | 7 | ja (Flex/Flock) | Design | 1:1 | mockup | Design | textil |
| sonstiges | Sonstiges | 8 | nein | – | 1:1 | abfrage (vorbelegt aus der Quelle, ohne Quelle 210 × 297) | bleibt | flach `druck` |

Pflichtfelder je Datei: `id`, `name`, `reihenfolge`, `kalkulation`, `ebenen[] {name, rolle, gesperrt}`, `massstab.standard` (1 | 30), `zeichenflaeche {art, breite_mm?, hoehe_mm?, fahrzeugvorlage?, mit_auftrag?}`, `quelle.sandbox` (Ebenenname | null), `export {profil, preset, dateiname}`. Optional `komplexitaet`, `verfahren`; unverändert aus den Stammdaten übernommen `vorlage`, `druck`, `bohrungen`, `export.laser`, `nesting`, `laminate`, `werkzeuge`, `arten`, `aktiveEbene`, `dateien`, `materialien`, `uv_max_mm`, `hilfslinien`, `summa`, `preis`, `export.techniken`, `export.anschnitt`. Prüfung beim Start: alle acht Dateien lesbar, Pflichtfelder, Ebenen- und Rollennamen eindeutig, `quelle.sandbox` ist eine Ebene, Export-Profil bekannt (`flach`, `offset`, `produktion`, `schild`, `textil`), jede Zielart im Mapping vorhanden; Banner/Roll-up `rollup[] {id, name, breite_mm, hoehe_mm, vorlage}` (id eindeutig, nicht „banner“, Maße > 0) und `banner.name`.

Offset (`offset.json`): `produkte` (`config/produkte.csv`), `vorlagen` (`config/vorlagen/offset`), `frei {name, vorlage}` (`freies Format`, `Offset.ait`), `hilfslinien.ebenen` („Hilfslinien“, „Sicherheitsabstand“; Liste mit mindestens einem Namen, Startprüfung), `zeichenflaechen_abstand_mm` 10, `export {profil offset, preset wmd, dateiname druck, anschnitt dokument, sammelordner wmd_bestellen}`. Das Preset steht nur hier, nicht in der CSV.

`config/produkte.csv` (`;`-getrennt, SPEZ_03_Konfigurationen Fassung 3 §3.1): `schluessel;bezeichnung;breite_mm;hoehe_mm;zeichenflaechen;vorlage_hoch;vorlage_quer;app_typ`. `vorlage_hoch`/`vorlage_quer` = nur Dateiname in `config/vorlagen/offset/`, leer = diese Ausrichtung gibt es nicht; `breite_mm`/`hoehe_mm` = Zeichenfläche 1 der hoch-Vorlage (offenes Format), quer gedreht, ohne hoch-Vorlage gilt das Maß für quer; `zeichenflaechen` `1`, `2` oder `1/2` (wählbar); `app_typ` leer bis Stufe 3. Elf Produkte: Falzflyer DIN lang (nur hoch), Einbruchfalz DIN A4–A7, A4–A7, Visitenkarte 85 × 55 und 90 × 50. Startprüfung: Datei lesbar, Kopfzeile mit allen acht Spalten, `schluessel` eindeutig und nicht leer, `bezeichnung` nicht leer, Maße > 0, `zeichenflaechen` aus den erlaubten Werten, mindestens eine von `vorlage_hoch`/`vorlage_quer` gefüllt, gefüllte Felder ohne Pfadtrenner mit Endung `.ait`. `Infos/Stammdaten/produkte.csv` bleibt als Referenz unverändert.

Vorlagen: Offset `config/vorlagen/offset/` + Dateiname aus `vorlage_hoch` bzw. `vorlage_quer` der CSV-Zeile (z. B. `A4_hoch.ait`, `Einbruchfalz auf A5_quer.ait`, `Visitenkarte_55x85.ait`; mm, CMYK; Zeichenflächen = Endformat offen in der Ausrichtung der Datei, 1 bei `zeichenflaechen` `1`, sonst 2; Zeichenfläche 1 Vorderseite/außen, 2 Rückseite/innen; Dokument-Anschnitt; Hilfslinien, wo das Produkt welche braucht, auf den Hilfslinien-Ebenen — mit Falz „Hilfslinien“, ohne Falz „Sicherheitsabstand“ —, oberste, gesperrt, nicht druckend; Vorlagen ohne Hilfslinien-Ebene sind zulässig, z. B. Visitenkarte 85 × 55; sonst kein Inhalt). Roll-up `config/vorlagen/rollup/RollUp_850.ait` bzw. `RollUp_1000.ait` (eine Zeichenfläche 850 bzw. 1000 × 2000 mm, Dokument-Anschnitt unten 200 mm, sonst 0; Hilfslinien-Ebenen erlaubt, nicht verlangt, Regeln wie Offset). `banner_rollup.json` führt dafür `hilfslinien.ebenen` („Hilfslinien“, „Sicherheitsabstand“). `Offset.ait` (freies Format) bleibt, wie sie ist.

## Anlegen „ohne Auftrag“ (Dialog „Auftrag“)

ModalDialog 560 × 480 (SPEZ_03_Oberflaeche §4): links „Auftragsart“ als senkrechte Liste (Buttons 26 px, linksbündig), rechts „Kundenname“, Quelle als drei gleich breite Segment-Buttons, Linie und die Felder der Art (Verfahren, Ausrichtung, Banner/Roll-up und Maßstab als Segment-Buttons; Maßzeile Breite × Höhe mm · Anzahl Zeichenflächen mit kleinen Beschriftungen; Textil Marke in einer Reihe, Modell in 3 Spalten, Farbraster 6 Spalten mit Fläche 22 px, höchstens 150 px hoch); bei Lasergravur ohne Linie. Fuß rechts „Let's go“.

- Auftragsarten: Fahrzeugbeschriftung, Beschriftung, Schild, Banner/Roll-up, Lasergravur, Offset-Daten, Textil, Sonstiges (Reihenfolge aus der Konfiguration). Kundenname. Quelle: geöffnete Datei / Datei öffnen / leer (Standard: geöffnete Datei, ohne Dokument „leer“).
- Artabhängig: Fahrzeugbeschriftung Häkchen „Fahrzeugvorlage“ (nur Quelle mit Inhalt ohne Panel-XMP); Schild Folie / UV-Druck und Material (Pflicht, unter „Schild“); Sonstiges Breite, Höhe, Anzahl Zeichenflächen; bei einer .ai-Quelle ohne Panel-XMP Maßstab 1:1 (Standard) / 1:30.
  - Offset: Auswahlliste der Produkte (`bezeichnung`, CSV-Reihenfolge), zuletzt „freies Format“; Produkt mit beiden Vorlagen (beide Spalten gefüllt, beide Dateien vorhanden): Wahl „hoch“ / „quer“; Produkt mit `1/2`: „Anzahl Zeichenflächen“ 1 oder 2; freies Format: Breite, Höhe, Anzahl Zeichenflächen (1 oder 2). Vorlagen werden beim Öffnen des Dialogs geprüft: fehlt eine Ausrichtung (Spalte leer oder Datei fehlt), wird nur die vorhandene angeboten, ohne Wahl hoch/quer; fehlen beide, ist der Eintrag gesperrt (Tooltip = erwartete Pfade). XMP `offset.ausrichtung` = Ausrichtung der verwendeten Spalte. „Let's go“ gesperrt ohne Produkt bzw. beim freien Format ohne Maße.
  - Banner/Roll-up: „Banner“ · „Roll-up 850 × 2000“ · „Roll-up 1000 × 2000“ (Texte aus `banner.name`, `rollup[].name`), keine Vorauswahl; Banner mit Breite, Höhe, Anzahl Zeichenflächen ohne Vorbelegung; Roll-up ohne Maßabfrage; fehlende Vorlage → Option gesperrt, Tooltip = Pfad.
- Vorbelegung (gesetzt bei Wahl der Art, Wechsel der Quelle und Wechsel der Maßstabsabfrage — letzteres Entscheidung 31.10. —, danach frei änderbar), Realmaß = Dokumentmaß × Maßstab der Quelle (XMP bzw. Maßstabsabfrage): Sonstiges Breite × Höhe von Zeichenfläche 1 der Quelle und Anzahl ihrer Zeichenflächen, leer 210 × 297, 1. Offset Ausrichtung „quer“, wenn Zeichenfläche 1 der Quelle breiter als hoch ist, sonst „hoch“; Anzahl 2 ab zwei Zeichenflächen der Quelle, sonst 1; freies Format zusätzlich Breite × Höhe von Zeichenfläche 1; leer hoch, 1, Maße leer.
- Wahl-Objekt `e.wahl` (Austauschstelle Stufe 3): `offset { produkt | null, ausrichtung, seiten, breite_mm, hoehe_mm (nur freies Format) }`, `banner_rollup { variante, breite_mm, hoehe_mm, anzahl (nur banner) }`, `sonstiges { breite_mm, hoehe_mm, anzahl }`, `lasergravur {}`, `schild { verfahren, material }`; im Weg „ohne Auftrag“ aus den Dialogfeldern, `jsxSpec` liest nur das Wahl-Objekt. Fahrzeugbeschriftung, Beschriftung wie gebaut.
- Ablauf: Kundenordner sicherstellen (wie Export Schritt 1; Mac ohne Server: ohne Abfrage weiter) → Auftragsordner `JJJJ-MM-TT_<Auftragsart>` → Arbeitsdatei erzeugen → XMP → speichern als `Arbeitsdatei.ai` in `<arbeitsdateien>/<Kunde>/<Auftragsordner>/` bzw. bei `"server"` im Server-Auftragsordner. Belegt (lokal: Arbeitsdatei vorhanden; Server: Ordner vorhanden) → `_02`, `_03`.
- Grundlage je Art:
  - neu (Beschriftung, Fahrzeug ohne Vorlage): neues Dokument in mm, Ebenen nach Konfiguration, Quellinhalt als Block mittig auf Zeichenfläche 1 auf die Sandbox.
  - Fahrzeugvorlage: die Quelle wird zur Arbeitsdatei, ihre Ebenen liegen in „Fahrzeugkontur“; nicht skaliert.
  - vorlage (Schild): Dokument aus `Schild.ait` bzw. `UV-Schild.ait` mit den Ebenen des Verfahrens; mit Quelle Zeichenflächen wie in der Quelle (nebeneinander, 10 mm), Inhalt je Zeichenfläche auf die Sandbox (Arbeitsdatei Schild mit gleichem Verfahren: gleichnamige Ebenen); ohne Quelle die Zeichenfläche der Vorlage.
  - Lasergravur, Sonstiges, Banner: Kopie der Quelle mit unveränderten Ebenen (leer: neues Dokument); Zeichenflächen immer nach Konfiguration (600 × 300 bzw. Abfrage), mehrere nebeneinander mit 10 mm Abstand, die erste mittig auf der bisherigen Zeichenfläche 1.
  - produktvorlage (Offset, Roll-up): Vorlage öffnen (Offset `offset.vorlagen` + `vorlage_hoch` bzw. `vorlage_quer` bzw. `Offset.ait`, Roll-up nach `rollup[].vorlage`) und prüfen — Zeichenfläche 1 weicht um mehr als 0,1 mm vom Sollmaß ab oder die Zahl der Zeichenflächen stimmt nicht → Vorlage ohne Speichern zu, Popup „Vorlage <Datei>: <Grund>“, nichts angelegt (freies Format ohne Prüfung). Offset `1/2` mit Anzahl 1: Zeichenfläche 2 weg; freies Format: Zeichenflächen auf Breite × Höhe, 1 oder 2 nebeneinander mit 10 mm, Dokument-Anschnitt der Vorlage bleibt. Mit Quelle: Ebenen der Quelle als gleichnamige Ebenen (Reihenfolge wie in der Quelle, eine Ebene mit einem Namen aus `hilfslinien.ebenen` der Quelle nie); Offset: Inhalt von Quell-Zeichenfläche n zentriert auf Vorlagen-Zeichenfläche n, weitere Quell-Zeichenflächen behalten ihren Versatz zu Quell-Zeichenfläche 1 (daneben), danach Hinweis „<n> Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage“; Roll-up: der gesamte Inhalt als ein Block 1:1 mittig auf die Zeichenfläche. Bei beiden: oberste Quell-Ebenen mit einem Namen aus `hilfslinien.ebenen` werden nicht übernommen, leere Ebenen der Vorlage außer den Hilfslinien-Ebenen entfernt; die Hilfslinien-Ebenen der Vorlage (alle Ebenen mit einem Namen aus der Liste) oberste in ihrer Reihenfolge aus der Vorlage, gesperrt, nicht druckend. Leer: Ebenen der Vorlage unverändert. Auftragsordner `JJJJ-MM-TT_Offset-Daten` bzw. `JJJJ-MM-TT_Banner-Roll-up`.
- Quelle: geöffnete Datei → Duplikat bzw. Dateikopie (gespeicherte .ai), das Original bleibt unverändert offen; Datei öffnen → wird im Dialog geöffnet und danach ohne Speichern geschlossen oder per „Speichern unter“ zur Arbeitsdatei, die Datei selbst bleibt unverändert.
- Gleiche Auftragsart (Panel-XMP) und gleicher Maßstab → Inhalt in die gleichnamigen Ebenen (ohne Ebenen der Rolle „vorlage“); sonst Sandbox. Maßstabswechsel: skaliert um Quelle/Ziel (Konturen und Effekte mit), Ergebnis auf der Sandbox; bei Arten ohne Sandbox wird der ganze Inhalt um die Mitte von Zeichenfläche 1 skaliert.
- Textil: siehe „Textil“ (Marke → Modell → Farbe, Grundlage `mockup`, keine Maßstabsabfrage). Der Zweig „Auftrag“ (Produktliste über das SDK) folgt in Stufe 3.

## Exportkern (`panel/lib/export.js`)

`exportieren(auftrag, umgebung)` mit `auftrag = { xmp, dateien: [{ name, speichern(lokalerPfad), ersetzen }], dtf: [name …], wmd: [name …] }` → `{ ok, ordner, dateien[], geparkt[], fehler[], meldung, xmp }`. `ersetzen: true` (Produktionsdateien aus dem Panel: Schneidedaten, Druckbögen): gleicher Name ohne Hochzählen, eine bestehende Datei lokal und auf dem Server wird ersetzt (Transfer weiter über `.teil` und Umbenennen); Zusammenfassung.pdf und Arbeitsdatei-Kopien bleiben nummeriert.

1. Kundenordner: aus dem XMP; sonst Server prüfen (`fs.access`, 3 s). Erreichbar → Ordnerdialog ab `server.kunden`, gültig nur `<Buchstabe>/<Kunde>` (sonst Popup und erneut, Abbruch beendet ohne Popup). Nicht erreichbar: `"server"` → Popup, Abbruch; sonst ohne Kundenordner weiter (Dateien bleiben lokal).
2. Auftragsordner auf dem Server anlegen; ist er von einem anderen Auftrag belegt, `_02`, `_03` und ins XMP. Eigener Ordner = die Arbeitsdatei liegt darin oder ein Export dieses Dokuments ging dorthin.
3. Lokal: `<ausgang>/<Kunde>/<Auftragsordner>/`.
4. Namen fortlaufend ohne Überschreiben, erste freie Nummer gegen lokalen und Server-Ordner (außer `ersetzen`).
5. `speichern()` je Datei, danach Existenz und Größe > 0; Fehler → Popup, Abbruch vor dem Transfer.
6. Transfer: Kopie als `.<name>.teil`, Größenvergleich, Umbenennen, dann lokal löschen. Fehler: `.teil` weg, Datei bleibt lokal (geparkt).
7. Sammelordner: `dtf` → zusätzliche Kopie nach `server.dtf_bestellen` (bzw. nach dem Feld `auftrag.sammelordner` = `export.sammelordner` der Auftragsart), `wmd` → nach `server.wmd_bestellen`; gleiches Verfahren (eine Routine, Ziel als Parameter), Nummerierung gegen den Sammelordner; Fehler nur für die Kopie.
8. Arbeitsdatei (nur bei lokalem `arbeitsdateien`, alle Dateien übertragen): wird gespeichert und als Kopie in den Server-Auftragsordner gelegt, fortlaufend nummeriert (`Arbeitsdatei.ai`, `Arbeitsdatei_02.ai` …).
9. XMP: Eintrag in `exporte[]` – wird vor Schritt 8 geschrieben, damit die Server-Kopie ihn enthält.
10. Popup nur bei Fehlern bzw. lokal liegenden Dateien. Leere lokale Ausgangsordner werden entfernt.

**Profil „flach“:** Lasergravur `<Kunde>_laser.pdf`, Sonstiges und Banner/Roll-up `<Kunde>_druck.pdf` (Kunde mit umgeschriebenen Umlauten); Preset der Auftragsart („pam x4“), alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen; danach ist das Dokument wieder die Arbeitsdatei. Roll-up (`banner_rollup.variante` im XMP) mit Anschnitt aus dem Dokument, Banner ohne Anschnittangabe.

**Profil „offset“ (`export_offset.js`):** `<Kunde>_<Bezeichnung>_druck.pdf` (Bezeichnung aus dem XMP, umgeschrieben wie der Kundenname), freies Format `<Kunde>_druck.pdf`; Preset „wmd“ aus der Konfiguration, alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen, Anschnitt aus dem Dokument; Ablage in den Auftragsordner und als Kopie in `server.wmd_bestellen`, Arbeitsdatei-Kopie wie gebaut.

**`IP.pdfSpeichern`:** optional `spec.anschnitt` — `"dokument"` setzt `bleedLink = true` (mit Preset übernimmt der Skript-Export den Dokument-Anschnitt sonst nicht); keine Rundung, kein eigener Anschnittwert; ohne Angabe wie gebaut. `IP.dokumentInfo` liefert zusätzlich `zeichenflaechen: [{ breite_mm, hoehe_mm }]` (Dokumentmaß in der Reihenfolge der Zeichenflächen).

**Panel-Zustände:** eine Arbeitsdatei mit Profil `offset` verhält sich wie eine mit Profil `flach` (Zeile 1 mit Grafikzeit, „Export“ und „Auftrag“ aktiv, übrige Buttons gesperrt); die Freigabe der Werkzeugzeile bleibt unberührt.

## Preisquelle (`panel/lib/preisquelle.js`, `preisquelle_csv.js`)

`preisquelle(adapter, { medien })` → `laden(auftragsart)` → `{ ok, version, stand, quelle, zeilen[], fehler[] }` (auftragsart = `preis` der Auftragsart, `fahrzeug` | `beschriftung` | `textil`; Textil: Serien mit `verfahren` flex/flock, `ek_m2`/`vk_m2` dürfen leer sein, Zeitschlüssel je flex/flock oder alle, Pflichtparameter `textil.mindest`, `textil.rundung`), danach `z(name, verfahren)` (Auftragsart vor `alle`, Verfahren vor `alle`), `serie(schluessel)` → `{ verfahren, ek_m2, vk_m2, tape_vk_m2 }`, `parameter(name)`, `aufschlaege()` → `[{ schluessel, bezeichnung, prozent | minuten }]`, `komplexitaet()` → `[{ stufe, prozent, bezeichnung }]`. Der Adapter liefert nur Zeilen; Prüfung und Auflösung liegen in `preisquelle.js`, Stufe 3 tauscht nur den Adapter.

Entwicklungsquelle: `preisquelle_csv.erstellen(ext, { medien })` liest `Infos/Stammdaten/preisliste.csv` im Erweiterungsordner bei jedem `laden()` neu (UTF-8, Semikolon, Dezimalkomma/-punkt, BOM erlaubt); `version` null, `stand` = Änderungszeit, `quelle` "csv". Kein wählbarer Pfad.

Prüfungen: Spalten der Kopfzeile, `gilt_fuer`, Zahlen ≥ 0, doppelte Einträge (typ, schluessel, gilt_fuer, verfahren), Pflichtparameter (`stundensatz.vk`, `stundensatz.produktion`, `stundensatz.grafik`, `mindest.produkt`, `mindest.montage`, `rundung`, `mwst`, `tape.min_schnittdichte`, `tape.min_teiledichte`), `aufschlag` mit genau `prozent` oder `minuten`, `tape_vk_m2` nur bei Druck, Komplexitätsstufen ab 0 aufsteigend, jede Serie mit Standardbreite in `medien.json`; mit Auftragsart zusätzlich alle Zeitschlüssel für Plott und Druck und die Auftragsschlüssel. Andere Zeilentypen (z. B. `platte`) werden ignoriert.

## Lesen und Messen (JSX `IP.objekteLesen`, `panel/lib/teile.js`)

- `IP.objekteLesen({ rollen: {Ebene: Rolle}, messen })`: oberste, nicht ausgeblendete Objekte der Ebenen mit Rolle `plott`, `digitaldruck`, `sandbox` in Ebenenreihenfolge, je Objekt `ref {ebene, index}`, Tags, Name, Ebene, Begrenzung geometrisch (`gb`) und sichtbar (`vb`), Blätter (Pfad, `gb`/`vb`, Länge und Teile, Farbschlüssel der Füllung, Kontur/Bild/Verlauf/Cutkontur-Flags). Gemessen wird nur bei zugeordneten Objekten (`IP_Folie`) auf Plott/Druck: Text in Pfade im Hilfsdokument; Druck ohne Cutkontur zusätzlich der Motivumriss (Hilfsdokument: Text in Pfade, Konturen in Flächen, Vereinigen, nur Außenringe; mit Pixelbild/Schnittmaske die sichtbare Begrenzung). Das Hilfsdokument wird ohne Speichern geschlossen; am Dokument ändert sich nichts.
- Cutkontur [R 3.1]: Pfad mit Vollton C0 M100 Y0 K0 (Toleranz 0,5) in Kontur oder Füllung, Name egal.
- `IP.objektTagsSchreiben([{ ref, id, tags }])`: schreibt nur Tags; prüft die bisherige `IP_Id`, gesperrte Ebenen/Objekte werden dafür kurz entsperrt.
- `IP.auswahlLesen({ rollen, blaetter })`: ausgewählte oberste Objekte der obersten Ebenen wie `objekteLesen`, ohne Messung (Blätter mit Füllfarben, Vorschau-RGB und Flags nur mit `blaetter`). `IP.objekteZuordnen({ ziele, art, farben, zielEbene })`: umfärben bzw. zurückfärben, Tags schreiben, positionsgleich auf die Zielebene. `IP.objekteAuswaehlen([{ ref, id }])`: Auswahl über `IP_Id` bzw. Ebene/Index.
- Stück = oberstes Objekt auf Plott/Digitaldruck mit `IP_Folie`; Verfahren aus der Rolle der Ebene. Plott: je Farbschlüssel eine Teilegruppe, Farbe aus dem Farbfeldnamen der Füllung (`NNN (<Zusatz>)`, Zähler toleriert) über `serien.json`, sonst über `farbzuordnung` (colorKey exakt). Druck: Messung an der Cutkontur, sonst am Motivumriss (1 Teil); Medium über `alias`, Laminat aus `medien.json` bzw. der Auftragsart.
- Flächen im Realmaß (Maßstab aus dem XMP): `flaeche_m2` = Begrenzung des Stücks (Druck: Außenkante), `flaeche_je_folie` = Begrenzung der Teile je Folie. Nesting-Maß Druck: ohne Cutkontur Außenkante + 10 + 3 mm je Seite, mit Cutkontur Außenkante ∪ (Cutkontur + 3 mm).
- Tape (Druck): Vorschlag bei Schnittdichte ≥ `tape.min_schnittdichte` oder Teiledichte ≥ `tape.min_teiledichte` (bezogen auf die Begrenzung der Messung); `kein_tape` in `IP_Attribute` schaltet Tape aus (schlägt den Vorschlag), `tape` schaltet es an, sonst gilt der Vorschlag. Plott wird immer getapt (Zeitanteil), `tape` im Datensatz bleibt dort false.
- Komplexität `IP_Komplexitaet` wirkt bei Plott immer, bei Druck nur mit Cutkontur; sonst Stufe 0.
- Prüfungen: Warnungen (es wird gerechnet) – Objekte auf der Sandbox, ohne Zuordnung, Konflikt Zuordnung ↔ Ebene/Farbe/Medium (nicht gerechnet), Kontur/Bild/Verlauf auf Plott-Objekten, an Lücken geteilte Teile, unbekannte Attribute/Komplexitätsstufe, unbekannte Ebenen. Abbruch – Teil länger als 5680 mm, Plott-Teil passt in keiner Lage in die Nutzbreite und lässt sich nicht teilen, Druckobjekt passt auf keine vorrätige Rolle, Farbe ohne Serie, Serie/Medium ohne Preis, Serie ohne Standardbreite, Tape ohne `tape_vk_m2`, ungültige Anzahl, Preisquelle fehlerhaft. Gleichartige Warnungen werden zu einer Zeile zusammengefasst (`hinweisZeilen`).
- Für jedes gemessene Digitaldruck-Objekt liefert `IP.objekteLesen` die Form (`signatur`, Punkte) für den Geometrievergleich der Varianten (`herkunft.js`).
- Varianten-Erkennung (`teile.variantenErkennen`, bei Zuordnen vor dem Schreiben der Tags, bei Berechnen, Summa und Druck): Vergleich nur der `IP_Id`-Texte aller gelesenen Objekte in Ebenenreihenfolge; das erste behält die Id, jedes weitere bekommt eine neue `IP_Id` (zeitbasiert + Zufall) und `IP_Original` = bisherige Id; geschrieben über `IP.objektTagsSchreiben`.

## Nesting und Rollenwahl (`nesting.js`, `rollen.js`, `kalkulation.nestingAlle`)

MaxRects mit 90°-Drehung, 20 mm Abstand, 10 mm Rand, deterministisch. Jedes Teil wird `IP_Anzahl`-mal als Exemplar genestet (Ergebnis je Exemplar `id`, `exemplar`). Mehrfarbiges Plott-Stück (Teile in ≥ 2 Farbschlüsseln): je Farbe ein Block aus den Teilen der Farbe und beiden Passermarken, Lage zueinander fest, 90° drehbar, je Exemplar ein Block, nie geteilt (passt er in keiner Lage → Abbruch). Kalkulation, Summa und Druck nutzen dasselbe Ergebnis (`nestingAlle`, für Summa nur Plott, für Druck nur Druck). Plott je Farbschlüssel: Bogenhöhe = Nutzbreite = Standardbreite − `randabzug.plott` (751C 1235), Länge ≤ 5700. Druck je Medium + Laminat: mit jeder vorrätigen Breite nesten; Standardbreite, außer sie passt nicht oder eine andere spart ≥ `schwelle_prozent` Verbrauch; Grafik quer ≤ Rollenbreite − 30 − 44,353, Bogen ≤ 2500 mm, Einzelobjekt bis 5700 mm auf eigenem Bogen. Verbrauch je Folie = Σ Zeichenflächenlänge × volle Rollenbreite (nur EK und Materialbedarf).

## Passermarken (`passermarken.js`, SPEZ_02 §10.1)

Quadrat, Kantenlänge aus `medien.json` `passermarken.stufen_mm` (30/20/15/10/5): größte Stufe ≤ `anteil` (0,1) × kürzere Seite des Gruppenumrisses (Realmaß), mindestens 5 mm. Zwei Marken innerhalb des Umrisses, eine links, eine rechts, mit ≥ `abstand_mm` (5) zu allen Teilen aller Farben; Kandidaten auf einem Raster (Schrittweite = Kantenlänge/2), gewählt wird das Paar mit der kleinsten Summe der Blockflächen je Farbe, bei Gleichstand das erste in Rasterreihenfolge. Ohne Lücke in einer Hälfte: Marke außerhalb, 5 mm neben dem Umriss, senkrecht mittig. Marken zählen nicht zu Teilen, Schnittlänge und Zeiten; der Block wirkt nur über das Nesting auf Verbrauch/EK.

## Kalkulation (`kalkulation.js`)

PREISLOGIK v6 §4: Minuten einmal, Beträge zweimal (VK mit `stundensatz.vk`, Mindest-VK mit `stundensatz.produktion`). Anzahl: Material, Flächenzeit, Entgittern, Trennen, Montage und Tape-Material je Exemplar × Anzahl; Rüsten und Tape-Zeit je Folie nach Fläche auf alle Exemplare verteilt; `reinigen_rest` mit Σ Fläche × Anzahl. Je Preis: Mindestbetrag Produkt/Montage, Aufrunden auf `rundung`, Brutto = gerundet × (1 + mwst/100) auf Cent. Komplexität nur auf die Produktionszeit. Grafik nur dokumentiert.

## Kalkulationsdatensatz (XMP `kalkulation`, SPEZ_02 §8.4)

Felder und Struktur exakt nach §8.4: `schema` 1, `zeit`, `panel`, `preislogik` 6, `preisliste { quelle, version (null), stand }`, `auftragsart`, `massstab`, `kunde`, `stundensaetze { vk, mindest, grafik }`, `mwst`, `rundung`, `objekte[]`, `folien[]`, `auftrag`, `preise { vk, mindest, mindestbetrag_greift }`, `materialbedarf[]`, `grafik { min_auto, min_manuell, stundensatz, betrag }`, `warnungen[]`. Je Objekt gelten `flaeche_m2`, `flaeche_je_folie`, `teile`, `schnitt_m` für ein Exemplar, `minuten` und `betraege` für alle Exemplare. `preise.*.netto` = nach Mindestbeträgen, vor dem Runden; `mindestbetrag_greift` je Preisart `{ vk: { produkt, montage }, mindest: { produkt, montage } }`. `grafik` summiert `grafikzeit.eintraege` (auto/manuell). Minuten und Beträge auf 2, Flächen und Verbrauch auf 4 Nachkommastellen.

`auftrag.berechnen(host, konfiguration)` (Button „berechnen“ in Panel und „Zusammenfassung“, vor dem PDF): XMP lesen (Arbeitsdatei mit kalkulierter Auftragsart) → Preisquelle laden → `IP.objekteLesen` → Varianten-Erkennung → Prüfen → Nesting → Kalkulation → Datensatz ins XMP → `{ datensatz, warnungen, fehler }`. Bei Fehlern kein Datensatz.

## Summa (Schneidedaten, `auftrag.summa`, SPEZ_02 §10)

Arbeitsdatei speichern (ungespeichert → Abbruch) → Prüfungen → Varianten-Erkennung → Nesting je Farbschlüssel (Nutzbreite − 25, Exemplare nach Anzahl, Blöcke bei mehrfarbigen Stücken) → über den Exportkern (Profil produktion, `ersetzen`) je Bogen ein Schneidedokument 1:1 (`IP.schneidebogenSpeichern`: Zeichenfläche = Umriss + 10 mm je Seite, Text in Pfade, Schnittmasken aufgelöst, Pfade ohne Füllungs-/Konturänderung), PDF/X-4 `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf`, Dokument geschlossen, Arbeitsdatei unverändert; je Exemplar eine Gruppe „<Anzeigename> <k>“, bei Blöcken mit den beiden Passermarken der Farbe. Ist-Lage gegen Planung (Hinweis ab 0,1 mm), ältere Bögen mit höherer Nummer bleiben liegen und werden genannt; ein Eintrag in `exporte[]`. Hinweise und Warnungen als ein Popup.

## Druck (Druckbögen aufbauen, `auftrag.druck`, SPEZ_02 §11.1)

Arbeitsdatei speichern (ungespeichert → Abbruch) → Prüfungen → Varianten-Erkennung → Nesting je Medium + Laminat + Rolle (Rollenwahl wie die Kalkulation) → je Bogen ein Dokument (`IP.druckbogenAufbauen`: CMYK, mm, Ebenen Druck / Cut / Info, Bogen-XMP) → `aufbau` ins XMP der Arbeitsdatei → erster Bogen nach vorn. Je `IP_Id` ein Symbol (Objekt 1:1 inkl. Cutkontur, Farbfeld vorher auf „Cutkontur“ vereinheitlicht; Name = Anzeigename, bei Doppelung „ (2)“); jedes Exemplar eine Instanz „<Name> <k>“ mit `IP_Herkunft`; geometrisch gleiche Variante als Instanz des Original-Symbols mit ihrer Transformation, sonst eigenes Symbol. Info-Ebene (nicht druckend, gesperrt) wie bisher: Kunde, Medium, Laminat, Bogen n von m (ggf. Sonderlänge), Rolle, Format, Objekte, Länge, Erstellt. Hinweise (Abweichung von der Planung ab 0,1 mm, Cutkontur ragt über die Außenkante, Abstand/OPOS-Rand, Cutkonturen-Zahl) als ein Popup. Offene Bögen eines früheren Aufbaus bleiben offen.

## Export der Druckbögen (`auftrag.exportDruckboegen`, SPEZ_02 §11.2, §11.4)

Bei vorderem Druckbogen oder vorderer kalkulierter Arbeitsdatei: alle offenen Bögen des letzten Aufbaus dieser Arbeitsdatei (Abgleich `bogen.arbeitsdatei` ↔ Pfad, `bogen.aufbau` ↔ `aufbau.id`); Arbeitsdatei muss offen sein und wird vorher gespeichert; Bögen früherer Aufbauten werden gemeldet und übergangen; keine offen → „Keine offenen Druckbögen“. Sammelprüfung ohne Änderung (Cutkontur je Objekt im Symbol oder in „Cut <Name>“, Marken planen: Breite ≤ Rolle − 2 × 15) – alle Befunde in einem Popup, nichts exportiert. Sonst je Bogen Instanzen umwandeln, Cutkonturen auf Ebene Cut (Gruppe „Cut <Name>“), Farbfeld „Cutkontur“ vereinheitlichen, eigene OPOS-Marken, dann über den Exportkern (`ersetzen`) `<Kunde>_<Medium>-<Laminat>-<Breite>_<NN>_druck.pdf` (Druck + Regmark), `…_<NN>_cut.pdf` (Cut + Regmark), `…_<NN>.ai` (alle Ebenen); gespeicherte Bögen werden geschlossen, ein Eintrag in `exporte[]` der Arbeitsdatei.

**OPOS-Marken** (`opos.js`, Regel `Infos/OPOS_ANALYSE.md` §4, P = 400 mm): Bezug = sichtbare Begrenzung aller sichtbaren Objekte der Ebenen Druck und Cut (Schnittmaske: Maskenpfad, Dreieck nicht); Ebene „Regmark“ oberste, gesperrt, Farbfeld „Regmark“ Vollton K 100; „Mark“ 3 × 3 mm, 9 mm neben dem Bezug, je Seite n mit n − 1 = max(1, ⌊l / 300⌋, ⌈(l + 21) / 400⌉); „OPOS XY Line“ unten bzw. zusätzlich „OPOS XY2 Line“ oben (offener 3-mm-Pfad); ab Zeichenflächenlänge 1000 mm XY2 und Druckrichtungsdreieck 8 × 6 mm (Spitze nach unten, Tag `IP_Druckrichtung`, auf Ebene Druck). Zeichenfläche: Soll = Bezug + 22,1765 mm je Seite, nur erweitern; Info-Zeilen „Format“ und „Länge“ folgen. Eine vorhandene Regmark-Ebene wird geleert und neu gezeichnet.

## Meldungstexte (sachlich formuliert, zur Prüfung)

- Konfiguration: `<Datei>` + Grund: „Datei fehlt“, „nicht lesbar (…)“, „kein gültiges JSON (…)“, „Feld … fehlt“, „Umgebungsvariable … nicht gesetzt“, „Ebenenname doppelt: …“, „Rolle doppelt: …“, „Export-Profil „…“ unbekannt“, „…: Auftragsart „…“ unbekannt“, „Tag-Name doppelt: …“.
- Export: „Server nicht erreichbar: …“; „Kein gültiger Kundenordner: … Gültig ist nur ein Ordner <Buchstabe>/<Kunde> in …“; „Kundenordner fehlt auf dem Server: …“; „Auftragsordner nicht angelegt: …“; „Datei nicht geschrieben: …“; „Nicht auf den Server übertragen, lokal abgelegt: …“; „<Datei>: Übertragung fehlgeschlagen (…)“; „DTF-Sammelordner nicht erreichbar, keine DTF-Kopie: …“; „<Datei>: DTF-Kopie fehlgeschlagen (…)“; „Arbeitsdatei nicht auf den Server kopiert (…)“; „Arbeitsdatei ist nicht gespeichert“.
- Konfiguration Stufe 2: „Feld randabzug.plott fehlt“, „Feld druck.… fehlt“, „serien[n]: Feld … fehlt“, Preisliste mit ihren Prüfmeldungen.
- Berechnen: „Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.“; „Für die Auftragsart „…“ gibt es keine Kalkulation“; „Preisliste ungültig: • …“; Prüfmeldungen und Sammelzeilen aus dem alten Panel (z. B. „n Objekte auf der Sandbox (werden nicht berechnet)“, „n Objekte ohne Zuordnung“, „n Konflikte (werden nicht berechnet)“); neu: „… hat eine ungültige Folie (…) – wird nicht berechnet“, „…: Anzahl „…“ ungültig – ganze Zahl ≥ 1 erforderlich“.
- Schild: „Schild: Verfahren oder Material fehlt“; „„<Objekt>“ ragt über mehrere Zeichenflächen“; „Schild NN: UV und Plott zusammen“; „Schild NN: UV-Hinten auf <Material>“; „Schild NN: UV-Vorn bzw. UV-Hinten größer als A2 (B × H mm)“; „Schild NN: Bohrungen passen nicht auf das Schild“; Fenster „Objekt“: „Objekt ragt über mehrere Zeichenflächen“.
- Anlegen: „Kundenname fehlt“; „<Art>: Verfahren wählen“; „Breite und Höhe angeben“; „Anzahl Zeichenflächen angeben“; „Kein Kundenordner – Arbeitsdatei kann nicht auf dem Server angelegt werden“; „Vorlage nicht gefunden: …“; „Kein Dokument geöffnet“; „Vorlage <Datei>: <Grund>“; Hinweis „<n> Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage“.

## Gesamtlauf (tests/illustrator)

Befehl (aus dem Projektordner): `./tests/illustrator/gesamtlauf.sh` (ein Durchgang unter `caffeinate`: Schritt 0 Wächterprobe, dann 3.1–3.9). `--nur <Kennungen>` für einzelne Abschnitte (`0`, `1`–`9`, `2e` Druckbogen-Export, `2p` Plott mit Prozessfarben, `4b` Breite-Vorbelegung und Zugabe-Fehler); `--nachlauf` = 0, 2e, 2p, 4b, 5–9. Jeder Abschnitt ist einzeln lauffähig (eigene Testdaten, eigener Node-Prozess); unbekannte Option oder unbekannter Abschnitt = Abbruch. Ergebnis je Prüfschritt (ok / Fehler / hängt / übersprungen) in `tests/out/gesamtlauf/ergebnis.jsonl`, Übersicht `zusammenfassung.md`, Protokolle je Abschnitt `<kennung>_<name>.log`, Wächter `waechter.log`, mitgeschriebene Meldungen `meldungen.jsonl`, Hänger-Screenshots `tests/out/haenger/`, Fenster-Screenshots (3.9) `tests/out/screenshots/`.

Voraussetzungen: Illustrator 2026 läuft (der Lauf startet es nicht) und lädt das Panel aus dem Projektordner (Verknüpfung, PlayerDebugMode); nach Manifest-Änderungen Illustrator neu starten und `~/Library/Caches/CSXS` leeren. `.debug` im Projektordner (Remote-Debugging-Ports, Testschalter). Kein Dokument offen (sonst Abbruch ohne Änderung); ist das Panel zu, öffnet der Wächter es über die Hintergrund-Extension. Musterdateien unter `einstellungen.json` `musterdateien` (`~/tools/folienkalkulation`, nur gelesen, Arbeitskopien in `tests/out/vorlagen/`), Node ≥ 22 (WebSocket), Python 3 mit pypdf.

Zwei Kanäle: Dokumentzugriffe per osascript `do javascript` mit dem Helfer `tests/illustrator/helfer.jsx` (ohne JSX-Kern), das Panel und die Fenster per Remote-Debugging nur für die Oberfläche. Ein blockiertes Panel nimmt so die Dokumentprüfungen nicht mit. Vor jedem Abschnitt, Anlegen, Panel-Klick und Export holt der Lauf Illustrator nach vorn (voller App-Pfad); eine Auswahl wird wiederholt, bis Illustrator sie meldet.

Wächter (`gesamtlauf.mjs`, Zeitgrenzen in `einstellungen.json`):
- sichert `rechner.json` und `grafikzeit_puffer.json` aus `~/Library/Application Support/PAM-Werkzeuge/` und schreibt ein Test-`rechner.json` mit allen Zielen unter `tests/out/` (`server/Kunden A-Z` mit A–Z und `M/01_Max Bögl`, `server/dtf_bestellen`, `server/wmd_bestellen`, `lokal/arbeitsdateien`, `lokal/ausgang`); am Ende und bei jedem Abbruch (auch SIGINT/SIGTERM, Ausnahme) die Originale zurück, Panel und Hintergrund neu geladen;
- `app.userInteractionLevel` = DONTDISPLAYALERTS während des Laufs, am Ende und bei jedem Abbruch der Ausgangswert (sofern Illustrator antwortet);
- Testschalter `de.pamnm.illupanels.test.json` im temporären Ordner (nur mit `.debug` wirksam, `panel/gemeinsam.js`): Dialoge werden nicht ausgelöst — `alert` (Popup) und `confirm` (Rückfrage) werden mitgeschrieben bzw. beantwortet, Datei- und Ordnerwahl (`dateiWaehlen`, `ordnerWaehlen`, CEP-Dateidialog der WEA-Etiketten) aus der Datei beantwortet, Skripte aus `werkzeuge.json` nicht ausgeführt, nur mitgeschrieben; am Ende entfernt;
- Zeitgrenzen: 120 s je Aktion, 10 s je Verbindung zu Panel/Fenster, 900 s je Abschnitt, 3600 s für den ganzen Lauf. Hänger: Screenshot, Abschnittsprozess beenden, „hängt“, Lauf beenden und melden — kein Wegklicken per System Events, kein Neustart. Antwortet Illustrator danach, werden die Testdokumente geschlossen;
- Schritt 0 Wächterprobe: ein Schritt, der nicht zurückkehrt, ohne Illustrator zu blockieren; der Wächter muss ihn innerhalb von 120 s erkennen, danach müssen Illustrator und Panel antworten — sonst kein weiterer Abschnitt;
- nach jedem Abschnitt alle Testdokumente ohne Speichern schließen (gespeichert unter `tests/out/` oder ungespeichert).

Ausgenommen: Logo und VK-CC (Skripte mit eigenem ScriptUI-Dialog) laufen nicht mit; dass sie aus dem Flyout-Menü starten, ist im ersten Lauf (31.10.) belegt.

## Tests

`node --test tests/*.test.js` (System-Node, ohne Illustrator): Konfiguration (acht Arten, Mapping, Schema, `werkzeuge.json`, `produkte.csv` gültig und mit einer fehlerhaften Zeile, `schild_materialien.csv` gültig, bewusst fehlerhafte Dateien), `rechner.json` Mac und Windows, XMP-JSON, Nummerierung gegen zwei Ordner, Exportkern mit Temp-Ordnern (Erfolg, `ersetzen`, Transfer schlägt fehl → geparkt ohne `.teil`, DTF-Kopie); Preisquelle mit der echten CSV und einer fehlerhaften Kopie, Kalkulation „Streifen“ (PREISLOGIK §11) als 2 Stücke und als 1 Stück mit Anzahl 2, Nesting mit Anzahl und Plott-Nutzbreite, Varianten-Erkennung, Datensatz-Struktur über `berechnen()` mit Host-Attrappe; Passermarken an drei Rechteckfällen (Lücke, keine Lücke, kleine Gruppe), Nesting mit Block, OPOS-Regel gegen die 40 Fälle aus `Infos/OPOS_ANALYSE.md`; Grafikzeit: `Zaehler` mit simulierten Ticks, Pufferübernahme (Einträge entfernen, Minutenrundung) mit Temp-Ordner; Schild: Lochmitten je Anordnung, Laserregel an der Grenze 300 × 600 in beiden Lagen; Textil: `textil.json` und die drei Textil-CSVs gültig (in der Konfigurationsprüfung), `kalkulation_textil` (Mindestbetrag je Exemplar, blockout = 2 Pressvorgänge, Textilzahl, Rundung 0,10, `nur_aufkleber` null), Streifenaufteilung an der Grenze 1500 mm; Nutzen: Nutzen-Planer (A4 gegen die Werte des alten Projekts, „ohne“ mit zwei Bögen), Gitter-Planung (zwei Jobs, Einzelbogen und Folge), MB-Blöcke (gemischter Block). Ausprobieren in Illustrator macht Markus nach einem Neustart von Illustrator.
