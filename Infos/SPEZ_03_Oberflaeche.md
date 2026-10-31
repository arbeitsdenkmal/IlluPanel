# Spezifikation „Oberfläche“ (Thema 6 der SDK-unabhängigen Reste, MockUp-Runde)

Stand: 31.10.2026, Fassung 2 (gebaut 3.7.0; Festlegungen CC bestätigt §18). Grundlage: Register 4.1–4.10, 7.10 (Stand 31.10., mit den Änderungen aus diesem Thema), `claude/SPEZ_02_Kalkulation_Produktion.md` Fassung 7 (§6 Fenster „Objekt“, §9 „Zusammenfassung“, §13 Panel, §16 UI-Festlegungen), `claude/SPEZ_03_Werkzeuge.md`, `SPEZ_03_Konfigurationen.md`, `SPEZ_03_Schild.md`, `SPEZ_03_Textil.md`, `SPEZ_03_Nutzen.md`, gebauter Stand 3.6.0. Alle Entscheidungen hat Markus an den MockUps getroffen (31.10., Panel in drei Varianten, alle Dialoge in zwei bis drei Varianten); offene Fragen und Ableitungen sind geklärt.

**Verbindliche MockUps** (Projektordner `Infos/mockups/`): `MOCKUP_THEMA6_Panel_2.html` (Panel, alle Zustände, Flyout-Menü), `MOCKUP_THEMA6_Auftrag_2.html` (Dialog „Auftrag“, alle Arten), `MOCKUP_THEMA6_Zuordnen_2.html` (Fenster „Objekt“ und „Motiv“), `MOCKUP_THEMA6_Fenster_2.html` (Zusammenfassung Textil mit PDF, Breite, Schilder, Textilfarbe, Modell, Nutzen, WEA-Etiketten, Bögl Nummern). Maße in CSS-px wie dort; Beispielwerte in den MockUps (Kunde „Streifen“, Objektnamen, Mengen, Beträge, Dateinamen, Kopfzeilen) sind keine Vorgabe. Die Fassungen `_1` sind Entscheidungsgrundlage, nicht verbindlich.

## 1. Umfang

- Gestaltung des Panels und aller Fenster nach den verbindlichen MockUps; ersetzt jede „vorläufige Platzierung“ der Themen 1–5 (§12).
- Panel 320 × 172 mit Ausblenden statt Sperren kontextfremder Buttons; Logo, VK-CC, Gitterscheiben, MB-Nummern im Flyout-Menü des Panels.
- Fünf kleine Funktionsänderungen, von Markus entschieden: Serie 751C vorgewählt (§5), kein Tape bei Schild (§5), Bohrungsskizze im Fenster „Schilder“ (§8), Etikett-Vorschau „WEA-Etiketten“ (§12.2), Ergebnis beim Tippen „Bögl Nummern“ (§12.3); außerdem entfällt in „Nutzen“ Schritt 1 die Box „Motiv (gemessen)“ (§11).
- Keine neuen Anzeigetexte außer den in diesem Dokument genannten Übernahmen bestehender Texte.

Nicht enthalten: Anlegen-Zweig „Auftrag“ mit Produktliste (Stufe 3, bekommt dann sein MockUp), Fenster „Zusammenfassung“ außer Textil (C3 bleibt), Funktionen und Texte, die hier nicht genannt sind (bleiben wie gebaut).

## 2. Grundsätze (alle Fenster)

- Farben, Schrift und Formen aus `style.css` bzw. `fenster.css` und dem Illustrator-Theme; Hell/Dunkel folgt Illustrator [R 4.10]. Neue Farben nur als Tokens mit Hell- und Dunkelwert (Silhouette §6, Bohrungsskizze §8, Etikett §12.2).
- Orange nur: Button „Export“ (gefüllt, nur wenn aktiv), Schrift „Auftrag“, die Hauptschaltfläche im Fuß eines Fensters (OK, Weiter →, Übernehmen, Aufbauen, Let's go) und die Orange-Regel add/berechnen (SPEZ_02 §13); gewählte Segment-Buttons wie gebaut (Klasse `an`) [R 4.3, 4.4].
- Meldungen [R 4.4]: Fehler als Popup, Hinweise des Fensters in der Fußzeile (erste offene Warnung, OK gesperrt), keine Erfolgsmeldungen, keine Hinweiszeilen oder Badges außer den genannten.
- Modale Fenster haben eine feste Größe aus dem Manifest (§14); der Inhalt ist oben ausgerichtet, was nicht passt, scrollt innerhalb des genannten Bereichs.
- Überschriften (Klasse `lbl` bzw. kleine Beschriftung über einem Feld) nur aus vorhandenen Texten; Gruppen ohne vorhandenen Text stehen ohne Überschrift.
- Segment-Buttons statt Radiobuttons überall, wo es um eine Wahl aus zwei bis vier festen Werten geht (§4); Tastatur: Enter = Hauptschaltfläche, Esc = Abbrechen wie gebaut.

## 3. Panel „PAM-Werkzeuge“ (MOCKUP_THEMA6_Panel_2)

### 3.1 Aufbau

Panel 320 × 172 (Inhalt 152 px; Innenabstand 4 / 5 / 3 px, Zeilenabstand 3 px), MinSize gleich. Sechs Zeilen, Buttons 22 px hoch:

1. Kopf: Kunde · Auftragsart bzw. Bogenzeile, rechts Grafik mit „+m“ (wie gebaut).
2. Objektzeile (wie gebaut).
3. add/edit · berechnen · Schilder · Farbe · Modell (je nach Zustand, §3.2).
4. Linie; Summa · Druck · Export · Auftrag.
5. Preiszeile: „Material …“ links, „inkl. Mont. …“ rechts; bei Textil nur rechts „Preis <netto> **<brutto>**“ (Text „Preis“ aus der Textil-Zusammenfassung).
6. Linie; **Breite · Masken · Nutzen**, drei gleich breite Buttons, keiner orange. Diese Zeile ist in jedem Zustand vollständig; ihre Buttons werden nur gesperrt, nie ausgeblendet.

Die bisherigen Zeilen 6 (Breite · Masken · Logo · VK-CC, 18 px) und 7 (Nutzen · Gitter · MB-Nr) entfallen.

### 3.2 Zustände: ausblenden statt sperren

Regel: was es im Zustand nicht gibt, ist **ausgeblendet**; die übrigen Buttons der Zeile teilen sich die Breite. **Gesperrt** bleibt nur, was im selben Zustand gleich wieder gilt (add/edit ohne Auswahl, Nutzen ohne Auswahl, Werkzeugzeile ohne Dokument bzw. bei Druckbogen vorn, Breite bei Fahrzeugbeschriftung bzw. mit Auftrag). Zeilen bleiben stehen, auch wenn sie leer sind (Höhe fest). „Export“ und „Auftrag“ sind immer sichtbar; Export gesperrt sieht aus wie jeder gesperrte Button (nicht orange).

| Zustand | Zeile 3 | Zeile 4 | Zeile 5 | Zeile 6 Breite · Masken · Nutzen |
|---|---|---|---|---|
| kein Dokument | leer | Export (gesperrt) · Auftrag | leer | alle gesperrt |
| Fremddokument | leer | Export (gesperrt) · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| flach (Lasergravur, Sonstiges, Banner/Roll-up), Offset | leer | Export · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| Fahrzeugbeschriftung | add/edit · berechnen | Summa · Druck · Export · Auftrag | zwei Preise | gesperrt · aktiv · mit Auswahl |
| Beschriftung | add/edit · berechnen | Summa · Druck · Export · Auftrag | zwei Preise | aktiv · aktiv · mit Auswahl |
| Schild | add/edit · Schilder | Summa · Druck · Export · Auftrag | leer | aktiv · aktiv · mit Auswahl |
| Textil | add/edit · berechnen · Farbe · Modell | Summa · Export · Auftrag | ein Preis rechts | aktiv · aktiv · mit Auswahl |
| Druckbogen vorn, Nutzen-Bogen vorn | leer | Export · Auftrag | leer | alle gesperrt |

- „mit Auswahl“ = Nutzen aktiv bei Auswahl, sonst gesperrt (SPEZ_03_Nutzen §8). Mit Auftrag (Stufe 3) gilt für Breite, Logo, VK-CC SPEZ_03_Werkzeuge §2 (Breite gesperrt; Logo, VK-CC nur Sonstiges).
- Fehlerhafte `config/nutzen.json`: Nutzen gesperrt, Gitterscheiben und MB-Nummern im Menü gesperrt (wie gebaut).
- Objektzeile, Kopfzeile, Orange-Regel add/berechnen, Grafikzeit, „+m“ und Abruf [R 4.7] wie gebaut; „berechnen“ bei Schild entfällt mit dem Button.

### 3.3 Flyout-Menü

- Illustrators Panel-Menü (≡ rechts im Reiter), gesetzt über `window.__adobe_cep__` (`setPanelFlyoutMenu`); Klick über das Ereignis `com.adobe.csxs.events.flyoutMenuClicked`. Kein zusätzlicher Button im Panel.
- Einträge in dieser Reihenfolge: **Logo**, **VK-CC**, Trennlinie, **Gitterscheiben**, **MB-Nummern**. Logo und VK-CC: Texte aus `werkzeuge.json` `label`; Gitterscheiben und MB-Nummern: Texte von Markus (ersetzen „Gitter“ und „MB-Nr“).
- Freigabe wie bisher die Buttons (Logo/VK-CC nach SPEZ_03_Werkzeuge §2, fehlendes Skript immer gesperrt; Gitterscheiben/MB-Nummern außer bei Druckbogen vorn und ohne gültige `nutzen.json`); gesperrte Einträge grau (`Enabled="false"`), aktualisiert im bestehenden Abruf (`updatePanelMenuItem`), keine eigene Abfrage [R 4.7]. Beim Klick prüft das Panel nach dem Neulesen die Freigabe erneut (Werkzeuge Nr. 15).
- Die Funktionen dahinter unverändert (Skripte per `$.evalFile`, Fenster „WEA-Etiketten“, „Bögl Nummern“).

## 4. Dialog „Auftrag anlegen“ (MOCKUP_THEMA6_Auftrag_2)

ModalDialog 560 × 480, Titel „Auftrag anlegen“ (wie gebaut).

- **Links** (Breite 164 px, Linie rechts): Überschrift „Auftragsart“, darunter die Arten als senkrechte Liste (Reihenfolge `reihenfolge`, Buttons 26 px hoch, Text linksbündig, gewählte Art `an`); Sperren und Tooltips wie gebaut.
- **Rechts**: „Kundenname“ (Feld über die ganze Breite) · Quelle als drei gleich breite Segment-Buttons „geöffnete Datei“ · „Datei öffnen“ · „leer“ (Funktion wie die Radiobuttons, „Datei öffnen“ öffnet bei jedem Klick den Dateidialog) · Linie · Felder der Art:
  - Fahrzeugbeschriftung: Häkchen „Fahrzeugvorlage“ (wie gebaut), darunter ggf. Maßstab.
  - Beschriftung, Lasergravur, Sonstiges, Banner/Roll-up mit Quelle ohne Panel-XMP: Maßstab „1:1“ · „1:30“ als Segment-Buttons in Inhaltsbreite (nicht gestreckt).
  - Schild: „Folie“ · „UV-Druck“ (gleich breit), darunter „Material“ mit Auswahlliste über die ganze Breite.
  - Banner/Roll-up: „Banner“ · „Roll-up 850 × 2000“ · „Roll-up 1000 × 2000“ in Inhaltsbreite; bei Banner darunter die Maßzeile.
  - Offset-Daten: Produktliste über die ganze Breite (ohne Überschrift, wie gebaut), darunter „hoch“ · „quer“ (gleich breit) und „Anzahl Zeichenflächen“ nach den Regeln aus SPEZ_03_Konfigurationen §3.3.
  - Sonstiges, Banner, freies Format: Maßzeile „Breite“ (80 px) × „Höhe“ (80 px) „mm“ · „Anzahl Zeichenflächen“ (60 px), Beschriftungen klein über den Feldern.
  - Textil: „Marke“ (Buttons in einer Reihe, gesperrt ohne MockUp), „Modell“ (Raster 3 gleich breite Spalten), „Farbe“ (Farbraster 6 gleich breite Spalten, Farbfläche 22 px, Name darunter einzeilig mit Ellipse und vollem Namen als Tooltip, Raster höchstens 150 px hoch, scrollt); Freitext „Farbe“ wie gebaut.
  - Lasergravur ohne weitere Felder (keine Linie).
- **Fuß**: rechts „Let's go“ (orange), Freigabe wie gebaut.
- Funktion, Vorbelegungen, Prüfungen und Wahl-Objekt unverändert (SPEZ_03_Konfigurationen §2, Schild §4, Textil §4).

## 5. Fenster „Objekt“ — Zuordnen (MOCKUP_THEMA6_Zuordnen_2, A) [R 4.6]

ModalDialog 480 × 440, Inhalt oben ausgerichtet. Die Funktionsweise aus Register 4.6 ist damit entschieden: Aufbau wie unten, Serie + Farbraster, Farb-Nr., Vorauswahl, Merken (`vorauswahl`, `farbzuordnung`), Mehrfachauswahl (gestrichelt) und Attribute im Dialog wie gebaut (SPEZ_02 §6, FESTLEGUNGEN 2b).

- **Zeile 1**: Art als Segment-Buttons links (Digitaldruck · Plott bzw. bei Schild die Arten des Verfahrens), rechts „Anzahl“ mit Feld 56 px (rechtsbündig). Bei UV-Vorn/UV-Hinten ohne Anzahl.
- **Digitaldruck**: darunter Raster mit Überschriften 84 px: „Medium“ (Segment-Buttons, umbrechen), „Laminat“; Linie; „Aufschläge“ (Sicke, Wölbung, Tape bei kalkulierten Arten).
- **Plott**: Linie; „Farben im Objekt“ (Liste wie gebaut); Zeile **„Farb-Nr.“** mit Feld 64 × 28 px, Schrift 15 px, zentriert — rechts davon die Serien-Buttons (Reihenfolge `serien.json`); darunter das Kachelraster (24 Spalten, Kachel 16 px, Abstand 3 px); Linie; „Komplexität“ K0–K3, „Aufschläge“.
- **Farb-Nr. bei Mouseover**: beim Überfahren einer Kachel erscheint deren Schlüssel (z. B. „751C-070“) in derselben Marke wie an der gewählten Kachel; Tooltip wie gebaut.
- **Fokus**: im Plott beim Öffnen auf „Farb-Nr.“ (wie gebaut).
- **Serie vorgewählt 751C** (Markus 31.10.): ohne gemerkte Serie (`vorauswahl.serie`) ist die Serie aus `serien.json` Feld `standard` vorgewählt; neuer Eintrag `"standard": "751C"` (muss ein `schluessel` der Liste sein; Startprüfung: fehlt oder unbekannt → Popup mit Datei und Grund, dann ohne Vorwahl wie bisher). Eine gemerkte Serie hat Vorrang; Farbe einer markierten Zeile mit Zuordnung ebenfalls (wie gebaut).
- **Schild ohne Tape** (Markus 31.10., ersetzt SPEZ_03_Schild §12.16): bei Profil `schild` gibt es den Tape-Button nicht; OK schreibt bei Schild keinen Tape-Zustand (`tape`, `kein_tape` in `IP_Attribute` bleiben, wie sie sind). Sicke und Wölbung bleiben.
- Fuß, Warnungen, OK-Logik, Texte wie gebaut.

## 6. Fenster „Motiv“ — Textil (MOCKUP_THEMA6_Zuordnen_2, B)

ModalDialog 640 × 470 (unverändert). Aufbau 44B bleibt; geändert:

- **Silhouetten** Vorn/Hinten heller mit Kontur: Füllung Token `--silhouette` (dunkel #6a6a6a, hell #d4d4d4), Kontur `--silhouette-kontur` (dunkel #8a8a8a, hell #9a9a9a), 1,5 px. Pillen, Lage und Texte wie gebaut.
- **Rechte Spalte** (Linie links, Abstand 4 px): „Verfahren“ mit den vier Buttons im Raster **2 × 2** (DTF · Flex / Flock · Stick); bei Flex/Flock darunter die Serie als Auswahl über die Spaltenbreite **ohne Überschrift** (Tooltip „Serie“; genau eine Serie → nur Anzeige wie gebaut) und „Komplexität“ K0–K3; unten „Ohne Position“ mit Sponsor und Namen **nebeneinander**.
- **Farben im Objekt** nur bei Flex/Flock, zwischen Silhouetten und Druckgrößen: Überschrift „Farben im Objekt“, je Füllfarbe Chip (14 px), Farbname (70 px), Feld „Flexfarbe“ (150 px), nebeneinander mit Umbruch. Bei DTF und Stick gibt es den Block nicht und keinen reservierten Platz (ersetzt „sonst unsichtbar mit Platz“, SPEZ_03_Textil §7 und Festlegung Textil 17).
- **Druckgrößen**: Tabelle wie gebaut mit Zebrastreifen je zweiter Zeile; der Bereich nimmt die übrige Höhe und scrollt; „+ Druckgröße“ in der Titelzeile, Summenzeile wie gebaut.
- Funktion, Prüfungen, Texte unverändert.

## 7. Fenster „Zusammenfassung“ bei Textil (MOCKUP_THEMA6_Fenster_2, 1)

Fenstergröße für alle Arten Modeless 700 × 520 (bisher 620), MinSize 480 × 240. Aufbau C3 bleibt; bei Textil (ersetzt Festlegungen Textil 32 und 33):

- **Objekttabelle**: Spalten Motiv · Position · Verfahren · **Maß mm** · **Menge** · **Textilgrößen** · (ohne Kopf: „zeigen“, „blockout“ bzw. beides mit „ · “) · K · Teile · Betrag. **Eine Zeile je Druckgröße**; Motiv, Position, Verfahren, K, Teile, Betrag nur in der ersten Zeile des Motivs. Kopftexte „Maß mm“, „Menge“, „Textilgrößen“ aus dem Fenster „Motiv“; Maß ohne „mm“ in der Zelle.
- Alle Zeilen eines Motivs gehören zusammen: Zebra je Motiv, Klick auf eine davon wählt das Motiv (alle Zeilen markiert), Doppelklick öffnet „Motiv“. „Ohne Zuordnung (n)“, Folien, Summen, Hinweis, Grafik wie gebaut.
- **PDF** `<Kunde>_Zusammenfassung.pdf`: Kopf wie gebaut (Kunde fett, „Textil · <Marke> <Bezeichnung> · <Textilfarbe>“, „Datum: TT.MM.JJJJ“), Objekte mit denselben Spalten ohne Betrag, Folien ohne EK, Warnungen.

## 8. Fenster „Schilder“ (MOCKUP_THEMA6_Fenster_2, 3)

ModalDialog 560 × 400. Kopf „<Verfahren> · <Material>“ (gedimmt, wie gebaut). Je Schild eine **Karte** (Hintergrund Zebra, Innenabstand 6 px, Abstand 9 px), Inhalt scrollt:

- **Links Skizze** (Feld 120 × 84 px): das Schild maßstäblich, höchstens 100 × 76 px, Fläche Token `--platte` (dunkel #8c8c8c, hell #c8c8c8) mit Rand 1 px; je Bohrung ein Punkt 6 px (Farbe `--loch`, dunkel #222, hell #222) an der Lochmitte aus `schild.js` (dieselbe Berechnung wie Druck-PDF und Laserdatei). Die Skizze folgt jeder Eingabe; bei leeren oder ungültigen Werten keine Punkte. Der Punkt zeigt die Lage, nicht den Durchmesser.
- **Rechts** Zeile 1: „Schild NN“ fett, Maß „B × H mm“ gedimmt, rechts die Auswahl der Anordnung; Zeile 2: nur die Felder der Anordnung („Abstand waagrecht“, „Abstand senkrecht“, „Durchmesser“, je Feld 52 px, „mm“).
- Funktion, Prüfung bei OK und Texte wie gebaut (SPEZ_03_Schild §6).

## 9. Fenster „Textilfarbe“ (MOCKUP_THEMA6_Fenster_2, 4)

ModalDialog 420 × 300. Kopf „<Marke> <Bezeichnung>“ (gedimmt, wie gebaut); Farbraster mit **5 gleich breiten Spalten**, Farbfläche 40 px hoch, Name darunter einzeilig mit Ellipse (Tooltip voller Name), gewählte Farbe `an`; der Bereich scrollt. Freitext und Funktion wie gebaut.

## 10. Fenster „Modell“ (MOCKUP_THEMA6_Fenster_2, 5)

ModalDialog 720 × 320. **Drei Spalten** 110 px · 130 px · Rest (Abstand 12 px, Linie zwischen den Spalten): „Marke“ (Buttons untereinander, volle Breite, Text linksbündig, gesperrt ohne MockUp) · „Modell“ (Modelle der gewählten Marke untereinander) · „Farbe“ (Farbraster 4 gleich breite Spalten, Fläche 26 px, Name darunter, scrollt). Ohne gewählte Marke bzw. ohne Modell bleiben die Spalten leer, Überschriften stehen. Funktion (Rücksetzen bei Wechsel, Freitext, OK) wie gebaut.

Die gemeinsame Komponente `textil_wahl.js` bekommt dafür die Darstellungen „untereinander“ (Dialog „Auftrag“, §4) und „Spalten“ (dieses Fenster) sowie für das Farbraster die Spaltenzahl und Flächenhöhe als Parameter (Auftrag 6 / 22 px, Textilfarbe 5 / 40 px, Modell 4 / 26 px).

## 11. Fenster „Nutzen“ (MOCKUP_THEMA6_Fenster_2, 6)

ModalDialog 840 × 380 (beide Schritte).

- **Schritt 1 „Nutzen“**: die Box „Motiv (gemessen)“ entfällt (Markus 31.10.); das Fenster beginnt mit den Feldern (Überschriften 84 px): Kunde (260 px) · Stückzahl (70 px) · Medium (Segment-Buttons) · Laminat · Produkt (260 px); Linie; Bogenformat (A4 · A3 · ohne) · Modus (zwei Buttons untereinander, in Inhaltsbreite; bei „ohne“ ausgeblendet) · Abstand Motive (mm) (70 px) · „Abstand Bögen: 20 (fix – Schneidetisch)“ (bei „ohne“ ausgeblendet). Einstieg A: Kunde, Stückzahl, Medium, Laminat als Text an derselben Stelle. Die Rückfragen „Keine Cutkontur gefunden …“ und Anschnitt bleiben Popups; die Messung selbst bleibt (Grundlage der Planung und der Vorgabe in Schritt 2).
- **Schritt 2 „Vorschau“** wie gebaut: Box „Vorgabe“, „Layout wählen“ mit einer Zeile je Variante (gewählte Zeile hervorgehoben wie `farbe.an`), Detailbox. Texte wie gebaut.

## 12. Fenster der Bögl-Funktionen

### 12.1 „WEA-Etiketten“ Schritt 1 und 3 (MOCKUP_THEMA6_Fenster_2, 7)

ModalDialog 560 × 260 (alle drei Schritte).

- **Schritt 1**: Überschrift wie gebaut, Liste mit Kopf (Datei · Anzahl · leer), Zebra, je Zeile Feld Anzahl (60 px) und „Entfernen“; darunter „Dateien hinzufügen …“.
- **Schritt 3** („WEA-Etiketten – Variante wählen“): Varianten als **Tabelle** — Radio · Dateien/Drucke („1 Datei, 3× drucken“ bzw. „2 Dateien, 2 Drucke gesamt“) · Material in m · „n Streifen zu viel“ bzw. „exakt“ · längster Bogen in mm. Kopf nur „m Material“ und „längster Bogen mm“ (aus den Texten der Variantenzeile); Werte wie `variantenZeile` (dafür liefert `gitter.js` die Teile der Zeile einzeln). Gewählte Zeile hervorgehoben, Zebra; darunter die Detailbox wie gebaut.

### 12.2 „WEA-Etiketten“ Schritt 2 mit Etikett-Vorschau

Titel „Typbezeichnung – <Datei>“ (wie gebaut). „So steht es in der Datei“ (3 Zeilen, nur Anzeige); Linie; links „Obere Zeile“ / „Untere Zeile“, rechts die **Vorschau** des Etiketts 180 × 72 px (90 × 36 mm, 2 px/mm): Fläche Token `--etikett` (#f2f2f2 in beiden Themen), Rand 2 px Magenta (Cutkontur, `--cutkontur` #ec008c), obere Zeile 15 px fett, untere 13 px, beide zentriert, Schrift des Panels. Die Vorschau folgt jeder Eingabe; sie ist ein Sinnbild (keine Schrift der Vorlage, kein Einpassen). Darunter der Hinweis „<n> Etiketten je Streifen, <m> mal benötigt.“ wie gebaut.

### 12.3 „Bögl Nummern“ (MOCKUP_THEMA6_Fenster_2, 8)

ModalDialog 460 × 230.

- Überschrift „Stückzahl je Nummer“; zehn Felder in **5 Spalten × 2 Zeilen** (Nummer 1–5, 6–10), Beschriftung „Nummer n:“ über dem Feld, Feld 72 px rechtsbündig. Vorbelegung aus `auftrag.txt` wie gebaut.
- Der Hinweis „Mengen werden auf Vielfache von 5 aufgerundet – die Breite eines Blocks ist immer voll belegt.“ entfällt im Fenster (Markus 31.10.).
- **Ergebnis beim Tippen**: Box unter den Feldern mit den Zeilen der Info-Ebene „Material ges.:  rund <x> m Bahn“ und — wenn > 0 — „<n> Stück Überproduktion durch das 5er-Raster.“, gerechnet bei jeder Eingabe mit `mbnummern.planung` und derselben Rechnung wie die Info-Ebene (`nutzenbogen.mbInfo`: gebaut je Nummer, Material = Σ Zeichenflächenlängen des Aufbaus). Ohne gültige Stückzahl bleibt die Box leer. Prüfungen bei „Aufbauen“ wie gebaut.

## 13. Fenster „Breite“

Unverändert (Thema 1, MOCKUP_STUFE3_Werkzeuge): ModalDialog 320 × 120.

## 14. Manifest-Größen

| Extension | Typ | Size (B × H) | MinSize |
|---|---|---|---|
| `.panel` | Panel | 320 × 172 | 320 × 172 |
| `.anlegen` | ModalDialog | 560 × 480 | — |
| `.objekt` | ModalDialog | 480 × 440 | — |
| `.zusammenfassung` | Modeless | 700 × 520 | 480 × 240 |
| `.breite` | ModalDialog | 320 × 120 | — |
| `.schilder` | ModalDialog | 560 × 400 | — |
| `.motiv` | ModalDialog | 640 × 470 | — |
| `.textilfarbe` | ModalDialog | 420 × 300 | — |
| `.modell` | ModalDialog | 720 × 320 | — |
| `.nutzen` | ModalDialog | 840 × 380 | — |
| `.gitter` | ModalDialog | 560 × 260 | — |
| `.mbnr` | ModalDialog | 460 × 230 | — |

Höhen = Inhaltshöhe des größten Falls aus den MockUps (Objekt: ORACAL 951 mit 145 Kacheln; Auftrag: Textil); `.hintergrund` unverändert.

## 15. Änderungen gegenüber dem Bau 3.6.0 (Übersicht)

| Teil | ändert sich |
|---|---|
| Panel | 320 × 194 → 320 × 172; Zeilen 6/7 → eine Zeile Breite · Masken · Nutzen (22 px); ausblenden statt sperren (§3.2); Export gesperrt nicht orange; Flyout-Menü statt Logo/VK-CC/Gitter/MB-Nr-Buttons; Textil-Preis mit „Preis“ |
| Auftrag anlegen | 420 × 420 → 560 × 480; Arten links als Liste; Segment-Buttons statt Radiobuttons; Überschriften; Textil-Raster 6 Spalten |
| Objekt | 480 × 470 → 480 × 440; Art und Anzahl in einer Zeile; Farb-Nr. groß vor der Serie; Mouseover-Nummer; Serie-Standard 751C (`serien.json` `standard`); kein Tape bei Schild |
| Motiv | Silhouette heller; Verfahren 2 × 2; Serie/Komplexität in der rechten Spalte; Farben im Objekt nur bei Flex/Flock ohne Platzhalter; Zebra |
| Zusammenfassung | 620 → 700 breit; Textil eine Zeile je Druckgröße, PDF entsprechend |
| Schilder | 560 × 360 → 560 × 400; Karte je Schild mit Bohrungsskizze |
| Textilfarbe | gleich breite Spalten (5) |
| Modell | 480 × 380 → 720 × 320; drei Spalten |
| Nutzen | 860 × 500 → 840 × 380; Schritt 1 ohne Box „Motiv (gemessen)“ |
| WEA-Etiketten | 860 × 480 → 560 × 260; Etikett-Vorschau; Varianten als Tabelle |
| Bögl Nummern | 620 × 420 → 460 × 230; 5 × 2 Felder; Hinweis entfällt; Ergebnis beim Tippen |
| Breite | unverändert |

## 16. Ersetzte vorläufige Stellen

Mit dieser Spezifikation sind ersetzt: SPEZ_02 §13 (Zustände „alle Zeilen stehen, nicht Zutreffendes gesperrt“, FESTLEGUNGEN 2b Nr. 5); SPEZ_03_Werkzeuge §1 (Platzierung), §2 (gesperrt oder ausgeblendet), §6, Festlegung 14; SPEZ_03_Konfigurationen §1, §3.3 und §4.3 (Platzierung im Dialog); SPEZ_03_Schild §1, §4, §6.2, §7, §12.11 (Fenstergröße), §12.16; SPEZ_03_Textil §1, §4, §6.1, §6.2, §7 (Flex/Flock-Block), §8, §10.4 (Zeilen und PDF), §14 Punkte 17, 22, 32, 33; SPEZ_03_Nutzen §1, §5.3 (Box „Motiv (gemessen)“), §6.1–§6.3 (Darstellung), §7.1 (Anordnung, Hinweis), §8, §11 Punkte 1 und 20 (Panelgröße, Fenstergrößen). Funktion und Texte dieser Abschnitte bleiben, soweit hier nichts anderes steht.

## 17. Repo, Doku, Tests

- Geändert: `CSXS/manifest.xml` (§14), `panel/index.html`, `panel/style.css`, `panel/main.js` (§3: Zeilen, Ausblenden, Flyout-Menü), `panel/anlegen.html/.js` (§4), `panel/objekt.html/.js` (§5), `panel/motiv.html/.js` (§6), `panel/zusammenfassung.html/.js`, `panel/lib/zusammenfassung.js`, `zusammenfassung_pdf.js` (§7), `panel/schilder.html/.js` (§8), `panel/textilfarbe.*`, `panel/modell.*`, `panel/lib/textil_wahl.js` (§9, §10), `panel/nutzen.html/.js` (§11), `panel/gitter.html/.js`, `panel/lib/gitter.js` (Teile der Variantenzeile, §12.1), `panel/mbnr.html/.js` (§12.3), `panel/fenster.css`, `config/serien.json` (`standard`), `panel/lib/konfiguration.js` (Prüfung `standard`), `panel/lib/zuordnen.js` (Vorwahl Serie). Version 3.7.0 (Manifest alle Extensions, `dokument.PANEL_VERSION`).
- Tests [R 7.9]: `node --test tests/*.test.js`. Keine neuen Tests; schlägt ein bestehender Test nur wegen einer beauftragten Änderung fehl (Button-Texte, Zeilen, Fenstergrößen, `serien.json`), wird nur diese Erwartung angepasst. Keine Illustrator-Läufe; Probe durch Markus.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Oberfläche“. Kein Commit, kein Push, außer der Auftrag nennt es.

## 18. Festlegungen CC — bestätigt 31.10.

FESTLEGUNGEN.md Abschnitt „Oberfläche“, Punkte 1–29 (Stand 3.7.0): bestätigt ohne Änderung.

- **18.1** Version 3.7.0 im Bundle, allen 13 Extensions und `dokument.PANEL_VERSION`.
- **18.2** Startprüfung `serien.json` „standard“ mit den Grundtexten „Feld standard fehlt“ und „standard „<Wert>“ unbekannt“; Popup nach den übrigen Start-Popups, sperrt nichts.
- **18.3** Das feste Preset 751C in `zuordnen.PRESET` entfällt; ohne gemerkte Serie kommt sie nur aus `standard`, bei fehlerhaftem `standard` keine Vorwahl.
- **18.4** Flyout-Menü: Ids `skript<n>`, `gitter`, `mbnr`, Trennlinie `<MenuItem Label="---"/>`; ohne geladene Konfiguration alle Einträge gesperrt.
- **18.5** `updatePanelMenuItem` nur für Einträge mit geänderter Freigabe.
- **18.6** Klickdaten des Flyout-Menüs als Objekt, JSON- oder XML-Text mit `menuId` gelesen.
- **18.7** Tooltip „Nicht gefunden: <Pfad>“ entfällt (Menüeinträge ohne Tooltip); Start-Popup bei fehlendem Skript bleibt.
- **18.8** Panel-Zeile 3 Mindesthöhe 22 px.
- **18.9** „Objekt“: Schlüssel beim Überfahren per CSS `:hover` in der Marke der gewählten Kachel; Rahmen 1 px in `--fg`.
- **18.10** „Auftrag anlegen“ nutzt `fenster.css`; Wahl über die Klasse `an` statt `aria-pressed`.
- **18.11** Segment-Buttons im Dialog „Auftrag“ merken den Wert je Gruppe; Klick auf den gewählten Button löst nichts aus, außer „Datei öffnen“.
- **18.12** Linie über den Feldern der Art entfällt, wenn kein Feld sichtbar ist.
- **18.13** `textil_wahl` „untereinander“ zeigt Modell und Farbe erst nach Wahl von Marke bzw. Modell; „spalten“ lässt die Spalten mit Überschrift stehen.
- **18.14** `textil_wahl` Überschriften: Dialog „Auftrag“ klein (`cap`), „Modell“ als `lbl`, „Textilfarbe“ ohne „Farbe“.
- **18.15** `textil_wahl`: `gross` entfällt zugunsten `spalten` und `flaeche`; gewählte Elemente mit Klasse `an`.
- **18.16** „Motiv“: 4 px sind der Zeilenabstand der rechten Spalte, Abstand zur Linie 12 px.
- **18.17** „Motiv“: „Farben im Objekt“ höchstens zwei Reihen (56 px), scrollt darüber.
- **18.18** Zusammenfassung Textil: Motiv ohne Druckgröße mit einer Zeile mit leeren Druckgrößen-Spalten.
- **18.19** PDF Textil: Spalten Motiv 15, Position 47, Verfahren 71, Maß mm 116 (rechts), Menge 129 (rechts), Textilgrößen 132, blockout/zeigen 162, K 187 (rechts), Teile 195 mm (rechts).
- **18.20** `zusammenfassung.druckgroesseText` ersetzt durch `druckgroesseZeile`.
- **18.21** „Schilder“: Punkte nur, wenn alle Felder der Anordnung eine Zahl > 0 haben; Punkte außerhalb des Schilds nicht abgeschnitten.
- **18.22** „Schilder“: Rand der Platte in `--line`.
- **18.23** Boxen in „Nutzen“, „WEA-Etiketten“, „Bögl Nummern“ mit Hintergrund `--kopf-bg`, monospace 11 px; Layoutzeilen in „Vorschau“ monospace.
- **18.24** „Nutzen“ Schritt 1: Überschriftenspalte 84 px, „Abstand Motive (mm)“ bricht um.
- **18.25** „WEA-Etiketten“ Schritt 1: Liste scrollt im Rahmen, Kopf steht; „Noch keine Datei gewählt.“ (Text aus dem alten Projekt) als Zeile.
- **18.26** „WEA-Etiketten“ Schritt 2: Etikett-Schrift #111 auf `--etikett`, zu lange Zeilen mit Ellipse.
- **18.27** „WEA-Etiketten“ Schritt 3: Klick auf die Zeile wählt die Variante; gewählte Zeile `--farbe-an`, Zebra auf den übrigen.
- **18.28** „Bögl Nummern“: `mbnummern.mengenLesen` liest die Felder, `nutzenbogen.mbErgebnis` erzeugt die beiden Zeilen für Info-Ebene und Fenster; `mbnummern.HINWEIS` entfällt.
- **18.29** „Bögl Nummern“: Ergebnisbox auch leer sichtbar (Mindesthöhe 40 px); bei Planungsfehler leer.
