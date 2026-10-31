# Spezifikation „Nutzen, Gitterscheiben, MB-Nummern“ (Thema 5 der SDK-unabhängigen Reste)

Stand: 31.10.2026, Fassung 2 (gebaut 3.6.0; Festlegungen CC bestätigt §11, Punkt 6 korrigiert). Grundlage: Register 3.9, 3.4, 3.6, 3.7, 5.2, 5.7, 5.9, 6.16, 6.17 (Stand 31.10., mit den Änderungen aus diesem Thema), `claude/SPEZ_01_Fundament.md` §5 und §7, `claude/SPEZ_02_Kalkulation_Produktion.md` Fassung 7 (§3 Tags und Bogen-XMP, §7 Nesting, §11 Druckbögen und Export, §11.4 OPOS-Marken, §12 Grafikzeit, §13 Panel), `claude/SPEZ_03_Werkzeuge.md` (Zustände, Muster der Übernahme), gebauter Stand 3.5.0, altes Projekt `~/tools/folienkalkulation` (Skriptkopien `01-Nutzen_Generator.jsx` v3, `01-Nutzen_Speichern.jsx`, `03-Gitterscheiben.jsx` v2.9, `03-MB Nummern.jsx` v1.3; Panel-Fassung Stufe 24–27: `panel/lib/nutzen.js`, `gitter.js`, `gitter_leser.js`, `mbnummern.js`, `teilc.js`, JSX `IP.nutzenMessen`, `nutzenAufbauen`, `gitterVorlageMessen`, `gitterBogenBauen`, `mbAufbauen`; README „Nutzen, Gitter, MB-Nr“) als Nachschlagewerk; `Infos/PRODUKTIONSREGELN.md` §5–§7; `MBMuster/`. Alle offenen Fragen und Ableitungen sind mit Markus geklärt (31.10., drei Runden).

**Oberfläche (Thema 6, 31.10.):** Platzierung, Gestaltung und Fenstergrößen regelt `claude/SPEZ_03_Oberflaeche.md`; die hier als vorläufig bezeichneten Stellen sind dort ersetzt (§16). Funktion und Texte bleiben, soweit dort nichts anderes steht.

## 1. Umfang

- **Nutzen** (bisher Nutzen-Generator) als Panel-Funktion mit zwei Einstiegen: aus einer Beschriftung-Arbeitsdatei mit zugeordnetem Digitaldruck-Objekt (Medium, Laminat, Stückzahl aus der Zuordnung) oder aus jedem beliebigen Dokument mit Auswahl (Angaben im Dialog). Neues Bogenformat „ohne“ (Bogen = Materialbreite × benötigte Höhe) neben A4 und A3.
- **Gitterscheiben** (WEA-Etiketten) und **MB-Nummern** (Bögl Nummern) als Panel-Funktionen ohne Arbeitsdatei; Kunde fest Max Bögl, Ablage fest (§6.5, §7.4).
- **Gemeinsamer Kern** [R 3.9]: je Funktion ein Raster-Planer (reine Node-Funktion, aus dem alten Projekt übernommen) liefert Bögen im Format des Druck-Nestings; Dokument, Symbole, Bogen-XMP, Export mit eigenen OPOS-Marken, Dateien und Ablage laufen über den gebauten Druckbogen-Kern (SPEZ_02 §11). Ein Nutzen-Bogen ist ein Druckbogen mit anderer Platzierung.
- **Stückzahl statt Kopien** [R 3.4, 6.16]: Symbol je Quelle, Instanz je Exemplar, Umwandeln erst beim Export — bei allen drei Funktionen.
- Darstellung im Panel und in den Fenstern: SPEZ_03_Oberflaeche §3, §11, §12.

Nicht enthalten: Kalkulation der drei Funktionen (rechnet die App), Schnittmarken für das Trennen der Bögen (Markus: nein), OPOS-Barcode [R 3.10], auftragsübergreifendes Nesting [R 6.17], Supabase/SDK, die Option „über 2,5 m“ der Gitterscheiben (entfällt, Kerngrenze 2500 mm gilt), der Start von OPOS.app und das Skript `01-Nutzen_Speichern.jsx` (Marken und Speichern macht Export).

## 2. Grundlagen

### 2.1 Begriffe

- **Nutzen-Bogen**: Dokument mit Rolle `druckbogen` und `bogen.art` `nutzen` | `gitter` | `mb` (§4). Ebenen Druck / Cut / Info, CMYK, mm, Zeichenfläche = Umriss der Teile + 22,1765 mm je Seite wie Druckbögen; `nutzenbogen` entfällt als Rolle (§4.3).
- **Exemplar**: eine Instanz der Quelle auf dem Bogen (ein Aufkleber, ein Streifen, ein Nummernschild).
- **Aufbau**: alle Bögen eines Laufs (eine Id), wie SPEZ_02 §3.2.
- **Einstieg A / B** (nur Nutzen): A = vorderes Dokument ist eine Beschriftung-Arbeitsdatei und genau ein zugeordnetes Digitaldruck-Objekt ist ausgewählt; B = jedes andere Dokument mit Auswahl (Fremddokument, Panel-Datei anderer Art, Arbeitsdatei ohne passende Auswahl).

### 2.2 Gemeinsamer Kern

1. **Quelle** messen (JSX): Nutzen — Auswahl (Cutkontur, Anschnitt, §5.2); Gitter — Etikett in `Etikett.ait`; MB — Schilder in der Masterdatei.
2. **Planer** (Node, `panel/lib/nutzen.js`, `gitter.js`, `mbnummern.js`; Logik 1:1 aus dem alten Projekt, Konstanten aus `config/nutzen.json`): liefert je Bogen `{ breite_mm, laenge_mm, teile: [{ id, exemplar, x_mm, y_mm, b_mm, h_mm, gedreht }] }` — dasselbe Format wie `nestenDruck` (SPEZ_02 §7). Breite quer, Länge in Einzugsrichtung, Koordinaten der linken oberen Ecke der Cutkante relativ zur Zeichenfläche.
3. **Bogen** (`panel/lib/nutzenbogen.js`, neu; Bogen-XMP, Info-Zeilen und JSX-Spec wie `druckbogen.aufbauPlanen`): je Bogen `IP.druckbogenAufbauen` mit erweiterter Quelle (§2.4); `aufbau` im XMP der Arbeitsdatei (Einstieg A) bzw. nur in den Bögen (B, Gitter, MB); erster Bogen nach vorn.
4. **Export**: `auftrag.exportDruckboegen` wie SPEZ_02 §11.2 (Sammelprüfung, Instanzen umwandeln, Cutkonturen auf Ebene Cut, Farbfeld „Cutkontur“, eigene OPOS-Marken nach §11.4 mit XY2 ab 1000 mm, Dateien druck/cut/ai, `ersetzen`, Bögen schließen) — erweitert um Bögen ohne Arbeitsdatei (§2.5) und um die Ablage der Bögl-Funktionen (§6.5).

Druck-Parameter aller drei Funktionen: `config/medien.json` (`druck.*`, Rollenbreite des Mediums) und `config/auftragsarten/beschriftung.json` `druck` (Cutkontur-Farbfeld, Abstand, Längen 2500 / 5700). Bogenlänge ≤ 2500 mm; wird sie überschritten, entstehen weitere Bögen desselben Aufbaus (bei allen drei Funktionen; ersetzt „mehrere Drucke in einem Dokument, Rest von Hand löschen“).

### 2.3 Zulässige Breite

Zeichenfläche quer ≤ Rollenbreite − 2 × `kantenhalter_mm` (1370 → 1340) wie bei Druckbögen; die Marken-Sammelprüfung des Exports gilt unverändert. **Ausnahme Gitterscheiben**: zulässig `gitter.zulaessig_mm` = 1345 (12 Streifen längs müssen passen; Produktion mit mehr Aufmerksamkeit möglich — Entscheidung Markus 31.10.). Die Prüfung liest den Wert bei `bogen.art: gitter` aus der Konfiguration statt aus der Rolle; nur dort.

### 2.4 Quelle und Symbole (Erweiterung `IP.druckbogenAufbauen`)

`spec.teile[].symbol` bekommt neben `ref` (Objekt in der Arbeitsdatei, wie gebaut) zwei weitere Quellen:
- `auswahl`: die bei Aufruf ausgewählten Objekte des Quelldokuments (Einstieg B) — werden einmal per `duplicate()` in den Bogen übertragen, Farbfeld vereinheitlicht, als Symbol angelegt (wie `nkUebertragen` im alten Kern, ohne Zwischenablage). Das Quelldokument bleibt unverändert.
- `fertig`: eine im Bogen bereits gebaute Gruppe (Gitter-Streifen, MB-Schild aus der Vorlage), die der Kern zum Symbol macht.

Symbole je Funktion: **Nutzen** ein Symbol (Motiv inkl. Cutkontur), Instanz je Exemplar; **MB** ein Symbol je Nummer, Instanz je Schild; **Gitter** ein Symbol je Kundendatei (Streifen mit Typ-Etikett und Etiketten, Texte eingepasst und in Pfade gewandelt), Instanz je Streifen-Platz (quer um 90° gedreht wie bisher). Skalierung: Einstieg A `massstab` aus dem XMP (Beschriftung 1); Einstieg B Dokumentmaß × Maßstab aus dem XMP der Quelle, ohne XMP 1. Prüfungen des Kerns (Abweichung von der Planung, Cutkontur ragt über die Außenkante, Abstand, OPOS-Rand, Cutkonturen-Zahl) gelten unverändert; die Cutkontur zählt je Exemplar.

### 2.5 Bögen ohne Arbeitsdatei

Einstieg B, Gitter und MB erzeugen Bögen mit `bogen.arbeitsdatei: null`. Dafür:
- **Export** bei vorderem Bogen ohne Arbeitsdatei: alle offenen Bögen mit derselben `bogen.aufbau`-Id; keine Arbeitsdatei nötig, kein Speichern einer Arbeitsdatei, kein `aufbau`-Abgleich. Bei vorderem Bogen mit Arbeitsdatei wie gebaut.
- **Exportkern**: `xmp` = XMP des ersten Bogens (Kunde, `ablage`, `auftrag`), `umgebung.arbeitsdatei = null` (keine Arbeitsdatei-Kopie, Schritt 8 entfällt); `exporte[]` wird vor dem Speichern der `.ai` in das XMP jedes Bogens des Aufbaus geschrieben.
- **Grafikzeit**: Bögen ohne Arbeitsdatei werden nicht gezählt (`dokument_xmp.js`: Rolle `druckbogen` ohne `bogen.arbeitsdatei` → ignorieren); Einstieg A wie Druckbögen (Gutschrift an die Arbeitsdatei).

### 2.6 Was bleibt, was ändert sich (Detailprüfung zu Register 3.9)

| | bleibt | ändert sich |
|---|---|---|
| Nutzen | Messung (Cutkontur, Anschnitt), Füll-Logik, A4/A3 mit „exakt oder kleiner“ / „± 25 %“, Abstand Motive 5 / Bögen 20, Varianten nach Bahnlänge, Vorschau mit Layoutwahl, Info-Zeilen | Einstieg A ohne Abfragen; Bogenformat „ohne“; mehrere Bögen statt mehrere Drucke; Instanzen bis zum Export; Dateinamen und Ablage über den Exportkern; Produkt als Freitext; kein Schreibtisch-Ordner, kein Kunde/Produkt-Dialog beim Export |
| Gitter | Leser PDF/XLSX/TXT/CSV, Präfix „15x_“, Typbezeichnung mit Gedächtnis, Streifen- und Bandlogik, Varianten Einzelbogen/Bogenfolge, Text einpassen, Vorlage `Etikett.ait`, zulässig 1345, Info-Zeilen inkl. „d × DRUCKEN“ | Dateidialog statt `~/Desktop/GitterMaster`; Gedächtnis im Bögl-Kundenordner auf dem Server; Option „über 2,5 m“ entfällt; Symbol je Streifen; Ablage fest (§6.5) |
| MB-Nr | Blockregeln (5 Spalten, höchstens zwei Nummern je Block, 5er-Aufrundung, 20 mm Blockabstand), Mengen-Dialog vorbelegt aus `auftrag.txt`, Masterdatei, Info-Zeilen | `auftrag.txt` im Bögl-Kundenordner; Symbol je Nummer; Ablage fest (§7.4) |
| alle | Ebenen Druck/Cut/Info, Zeichenfläche + 22,1765 je Seite, Cutkontur-Regel, keine Erfolgsmeldung, Prüfmeldungen gesammelt | Rolle `druckbogen` + `bogen.art` statt Kennung „Nutzenbogen“; Marken und Export über den Druckbogen-Kern; Rollenbreite aus `medien.json` statt fester 1370/1345-Konstanten (außer Gitter 1345) |

## 3. Konfiguration

### 3.1 `config/nutzen.json` (neu)

```json
{
  "nutzen": {
    "stueckzahl": 100, "medium": "3551", "laminat": "matt", "produkt": "Aufkleber",
    "abstand_motive_mm": 5, "abstand_boegen_mm": 20, "toleranz": 0.25,
    "formate": [ { "id": "a4", "name": "A4", "breite_mm": 210, "hoehe_mm": 297 },
                 { "id": "a3", "name": "A3", "breite_mm": 297, "hoehe_mm": 420 },
                 { "id": "ohne", "name": "ohne" } ],
    "dateiname": "Nutzen"
  },
  "boegl": {
    "kunde": "Max Bögl", "kundenordner": "M/01_Max Bögl", "medium": "3551", "laminat": "matt",
    "typgedaechtnis": "typzuordnung.txt", "auftrag": "auftrag.txt", "dateiname": "Nutzen"
  },
  "gitter": {
    "ordner": "Gitterscheiben", "vorlage": "config/vorlagen/Etikett.ait",
    "etikett_mm": [90, 36], "teilung_etikett_mm": 40, "teilung_streifen_mm": 110,
    "zulaessig_mm": 1345, "schrift_schritt_pt": 0.5, "schrift_min_pt": 4, "praefix_trenner": "x"
  },
  "mb": {
    "ordner": "Nummern", "vorlage": "config/vorlagen/Bögl Nummern Masterdatei.ait",
    "schild_mm": 35, "abstand_mm": 10, "spalten": 5, "block_abstand_mm": 20, "nummern": 10
  }
}
```

- `boegl.kundenordner` ist relativ zu `server.kunden` (Mac `/Volumes/Server A-Z/_03_Kunden A-Z/M/01_Max Bögl/`, MKs PC `Y:\_03_Kunden A-Z\M\01_Max Bögl`), damit beide Rechner denselben Ordner treffen [R 7.2].
- `nutzen.medium`, `boegl.medium` müssen in `medien.json` stehen; Laminat eines der Laminate der Auftragsart Beschriftung.
- Startprüfung wie die übrigen Konfigurationsdateien: Datei lesbar, alle Felder vorhanden, Zahlen > 0, Medien bekannt, beide Vorlagen vorhanden. Fehler → Popup mit Datei und Grund; nur die drei Buttons gesperrt, das übrige Panel bleibt nutzbar (wie `produkte.csv`).

### 3.2 Vorlagen

`config/vorlagen/Etikett.ait` (Objekte „Cutkontur“, „Ring“, „Nummer“, „Logo“; Cutkontur 90 × 36 mm, Farbfeld „Cutkontur“) und `config/vorlagen/Bögl Nummern Masterdatei.ait` (Gruppen „1“ bis „10“, 35 × 35 mm mit Cutkontur) sind die gültigen Stände (Markus 31.10.). Prüfung beim Öffnen wie bisher (fehlende Objekte → Popup mit Namen, Maßabweichung → Warnung); eine geänderte Vorlage legt Markus in `config/vorlagen/` ab.

### 3.3 `config/schema.json`

`rollen` ohne `nutzenbogen`; `rollenfelder.druckbogen.bogen` ergänzt um `art` (`null` bei normalen Druckbögen), `produkt` (Nutzen), `auflage` (Gitter: Drucke je Bogen, sonst 1).

## 4. XMP (Ergänzung SPEZ_01 §5.1, SPEZ_02 §3.2)

### 4.1 Nutzen-Bogen

```json
{ "rolle": "druckbogen", "auftragsart": "beschriftung", "massstab": 1, "kunde": "Mustermann",
  "auftrag": { "orderId": null, "productId": null },
  "ablage": { "kundenordner": "M/Mustermann" | null, "auftragsordner": "2026-10-31_Aufkleber" },
  "bogen": { "aufbau": "…", "art": "nutzen", "produkt": "Aufkleber", "medium": "3551", "laminat": "matt", "breite_mm": 1370,
             "nr": 1, "gesamt": 2, "auflage": 1, "arbeitsdatei": "<Pfad>" | null },
  "exporte": [] }
```

- Einstieg A: `kunde`, `auftrag`, `ablage`, `arbeitsdatei` aus der Arbeitsdatei wie bei Druckbögen; `aufbau` in der Arbeitsdatei (Einträge zusätzlich mit `art`, `produkt`).
- Einstieg B: `kunde` aus dem Dialog, `ablage.kundenordner` `null` (Export fragt über den Ordnerdialog wie Exportkern Schritt 1), `auftragsordner` = `JJJJ-MM-TT_<Produkt>` [R 5.2]; `auftrag` null; `arbeitsdatei` null.
- Gitter / MB: `kunde` = `boegl.kunde`, `kundenordner` = `boegl.kundenordner`, `auftragsordner` nach §6.5; `auftragsart: "beschriftung"` (Parametersatz), `produkt` null; `auflage` bei Gitter aus der Variante.

### 4.2 Arbeitsdatei (Einstieg A)

`aufbau.boegen[]` zusätzlich `art: "nutzen"`, `produkt`. Ein Nutzen-Aufbau ersetzt wie ein Druck-Aufbau den vorherigen `aufbau`; Export verarbeitet die Bögen des letzten Aufbaus.

### 4.3 Rolle `nutzenbogen`

Entfällt aus `schema.json` und aus den Zuständen (SPEZ_03_Werkzeuge §8 Nr. 13 bezieht sich dann nur noch auf `hilfsdokument`). Alte Nutzen-Bögen mit der Kennung des alten Panels werden nicht erkannt (keine echten Daten, Register-Grundsatz).

## 5. Nutzen

### 5.1 Auslöser und Einstiege

Button „Nutzen“ (§8). Vorher Grafikzeit-Übernahme wie bei jeder eigenen Aktion. Kern prüft: Dokument vorhanden, Auswahl nicht leer (`Keine Auswahl. Bitte Motiv und Cutkontur auswählen.`); Druckbogen vorn → gesperrt.
- **Einstieg A** (Beschriftung-Arbeitsdatei, genau ein ausgewähltes oberstes Objekt mit `IP_Folie` eines Druckmediums): Medium = `IP_Folie`, Laminat = `IP_Laminat`, Stückzahl = `IP_Anzahl`, Kunde aus dem XMP. Vorher Arbeitsdatei speichern (ungespeichert → Abbruch) [B-7].
- **Einstieg B** (alles andere): Quelle = Auswahl; Medium, Laminat, Stückzahl, Kunde, Produkt im Dialog.

Ein Nutzen enthält genau ein Motiv (Markus); die Auswahl gilt als ein Motiv, auch wenn sie aus mehreren Objekten besteht.

### 5.2 Messung (JSX, aus `IP.nutzenMessen`)

Sichtbare Begrenzung der Auswahl (Schnittmasken = Maskenpfad), Cutkontur nach [R 3.1] (Vollton C0 M100 Y0 K0, Name egal; alle Cutkonturen der Auswahl vereinigt). Mit Cutkontur: Motivmaß = Cutkontur, Anschnitt = Überstand der Begrenzung je Seite. Ohne Cutkontur: Rückfrage `Keine Cutkontur gefunden (Vollton 100 % Magenta erwartet). Ohne Cutkontur wird das Raster aus der Gesamtauswahl gerechnet und die Ebene „Cut“ bleibt leer. Trotzdem fortfahren?` (Text wie bisher); dann Motivmaß = Begrenzung, Anschnitt 0. Maße im Realmaß (§2.4).

### 5.3 Fenster „Nutzen“ (ModalDialog `.nutzen`, zwei Schritte in einem Fenster)

**Schritt 1 „Nutzen“** — der Block „Motiv (gemessen)“ entfällt (Thema 6, SPEZ_03_Oberflaeche §11); die Messung bleibt Grundlage der Planung. Felder:
- nur Einstieg B: **Kunde** (Text, Pflicht), **Stückzahl** (ganze Zahl ≥ 1, Vorbelegung `nutzen.stueckzahl`), **Medium** (Liste wie Fenster „Objekt“ bei Beschriftung → Digitaldruck, Vorbelegung `nutzen.medium`), **Laminat** (matt | glänzend nach `medien.json`, Vorbelegung `nutzen.laminat`);
- beide Einstiege: **Produkt** (Text, Pflicht, Vorbelegung `nutzen.produkt`), **Bogenformat** A4 · A3 · ohne (Vorbelegung A4), **Modus** „exakt oder kleiner – Lagerung beim Kunden“ / „ca. ± 25 % – nur Handling“ (Vorbelegung exakt; bei „ohne“ ausgeblendet), **Abstand Motive (mm)** (Vorbelegung 5), Anzeige „Abstand Bögen: 20 (fix – Schneidetisch)“ (bei „ohne“ ausgeblendet).
- Prüfungen wie bisher (`Bitte alle Felder korrekt ausfüllen.`; Anschnitt-Rückfrage, wenn 2 × Anschnitt > Abstand Motive); Einstieg A zeigt Medium, Laminat, Stückzahl und Kunde nur als Text.
- Buttons „Abbrechen“ · „Weiter →“; Enter = Weiter, Esc = Abbrechen.

**Schritt 2 „Vorschau“** — Block „Vorgabe“ (Motiv, Stückzahl, Medium + Laminat + Rolle, Zielformat/Modus, Abstände) und Block „Layout wählen“ mit einer Zeile je Variante (Text `planZeile` wie bisher: Bahnlänge m, Bogenmaß und Raster, Bögen je Reihe, Bögen gesamt, Bögen/Drucke, „zu viel“, „Motiv 90°“, „Bogen quer“; bei „ohne“ ohne Bogenangaben) und Detailtext (`detailText` wie bisher, „Drucke“ heißt „Bögen“). Buttons „Abbrechen“ · „Aufbauen“; Enter = Aufbauen. Kein Layout berechenbar → Popup mit dem bisherigen Text, Fenster schließt.

### 5.4 Planung (`panel/lib/nutzen.js`, Füll-Logik 1:1 aus dem alten Projekt)

- Nutzbreite `availW` = Rollenbreite des Mediums (`medien.json`, Standardbreite; Rollenwahl entfällt, immer Standardbreite) − 2 × `kantenhalter_mm` − `opos_zugabe_mm` − 2 × `opos_marken_rand_mm` − 2 × Anschnitt. Der Anschnitt bleibt abgezogen: die OPOS-Marken beziehen sich auf die sichtbare Begrenzung einschließlich Anschnitt, sonst lehnt die Marken-Sammelprüfung den Bogen ab (Code-Befund; korrigiert Ableitung 21 aus dem Chat).
- Nutzbare Länge `availH` = `max_laenge_mm` (2500) − 44,353.
- **A4 / A3**: `pickCount`, Bogenraster, Bögen je Reihe, Motivzeilen, Bogenzeilen, Füllregel (ab der zweiten Motivzeile letzte Reihe voll, Überproduktion ausgewiesen; eine Motivzeile teilbelegt und exakt), vier Varianten (Motiv 0/90° × Bogen hoch/quer), Sortierung nach Bahnlänge, Bögen, Bogenzahl, Überproduktion, Duplikate entfernt — unverändert. Über `availH` hinaus: **je Druck ein Bogen** desselben Aufbaus; volle Bögen mit `maxBZ` Bogenzeilen, der letzte Bogen mit dem Rest (letzte Motivzeile nach der Füllregel), Nummer = Bogen im Aufbau.
- **ohne**: Spalten = ⌊(availW + gM) / stepX⌋, Zeilen bis zur Stückzahl, letzte Zeile teilbelegt (exakte Stückzahl, keine Füllregel — es gibt keine Bogenkante), kein Bogenabstand; zwei Varianten (Motiv 0/90°), Sortierung nach Bahnlänge; über `availH` hinaus weitere Bögen, letzter kürzer und exakt. Nutzenbreite = belegte Breite (Spalten × stepX − gM bzw. bei einer Zeile die belegten Plätze).
- Ergebnis je Bogen im Kernformat (§2.2 Nr. 2): Cut-Position je Exemplar = Bogenraster (bzw. Spalte/Zeile) + 22,1765 mm + Anschnitt links/oben; `breite_mm` = Nutzenbreite + 44,353 + 2 × Anschnitt quer, `laenge_mm` analog.

### 5.5 Aufbau

Je Bogen `IP.druckbogenAufbauen` mit Quelle `ref` (A) bzw. `auswahl` (B), ein Symbol, Instanz je Exemplar (Name `<Produkt> <k>`, `IP_Herkunft` = `IP_Id` des Objekts bei A, bei B leer), Drehung 90° bei `rotM`. Info-Ebene: Zeilen aus `infoZeilen` des alten Projekts (Motiv, Anschnitt, Bogen/Raster, Außenmaß, Schnitt, Nutzen, Füllung, Motive im Bogen, Bögen gesamt, Benötigt, Bogen n von m, Produziert/Überproduktion, Materiallänge, Medium + Laminat + Rolle, Abstände, Erstellt); bei „ohne“ ohne Bogenzeilen. `aufbau` nach §4. Warnungen des Kerns als ein Popup („Nutzen aufgebaut, aber die Prüfung meldet: …“ entfällt; Popup nur mit Befunden, keine Erfolgsmeldung).

### 5.6 Export

Wie SPEZ_02 §11.2, mit Dateinamen `<Kunde>_<Produkt>_<Medium>-<Laminat>-<Breite>_NN_druck.pdf`, `…_NN_cut.pdf`, `…_NN.ai` (Produkt umgeschrieben wie der Kundenname, NN = Bogen im Aufbau), `ersetzen: true` [R 5.9, SPEZ_02 §11.3]. Einstieg A: Auslöser Export bei vorderer Arbeitsdatei oder vorderem Bogen, Ablage im Auftragsordner der Arbeitsdatei. Einstieg B: Auslöser Export bei vorderem Bogen (§2.5), Kundenordner über den Ordnerdialog, Auftragsordner `JJJJ-MM-TT_<Produkt>` (belegt → `_02` wie Exportkern Schritt 2), danach `ablage` in alle Bögen des Aufbaus geschrieben. Ältere Bögen mit höherer Nummer bleiben liegen und werden genannt.

## 6. Gitterscheiben

### 6.1 Eingang

Fenster „WEA-Etiketten“ (ModalDialog `.gitter`, drei Schritte in einem Fenster): Liste der Kundendateien (Name, Feld Anzahl, „Entfernen“), Button „Dateien hinzufügen …“ → Dateidialog mit Mehrfachauswahl, Start im Bögl-Kundenordner (`server.kunden/boegl.kundenordner`; nicht erreichbar → Start im Standardordner des Dialogs), Typen pdf, xlsx, xlsm, xltx, txt, csv, tsv. Stückzahl aus dem Präfix `<Zahl>x_` des Dateinamens (`mengeAusName`), sonst 1, im Feld änderbar. Die Liste startet leer (kein Arbeitsordner mehr). „Weiter“: Prüfungen wie bisher (`Keine Kundendatei gewählt.`, `Stückzahl bei <Datei> prüfen.`, `Vorlage fehlt: config/vorlagen/Etikett.ait`), dann Einlesen mit `gitter_leser.js` (1:1 übernommen; Fehler → Popup `Fehler beim Einlesen: …`, Fenster schließt).

### 6.2 Typbezeichnung

Schritt 2 je Kundendatei (blättert im selben Fenster): Kopfzeilen „So steht es in der Datei“ (nur Anzeige), Felder „Obere Zeile“ / „Untere Zeile“ (`typVorschlag` aus den Kopfzeilen bzw. Eintrag des Gedächtnisses), Hinweis `<n> Etiketten je Streifen, <m> mal benötigt.`; „Übernehmen“ / „Abbrechen“.

**Gedächtnis**: `typzuordnung.txt` im Bögl-Kundenordner auf dem Server (`server.kunden/boegl.kundenordner/boegl.typgedaechtnis`), Format wie bisher (Kopfzeilen-Schlüssel TAB oben `\u001F` unten, UTF-8), gemeinsam für alle Rechner; gelesen beim Öffnen von Schritt 2, geschrieben nach dem letzten „Übernehmen“ (lesen–ändern–schreiben, Temp-Datei + Umbenennen). Server nicht erreichbar (3 s): nur der Vorschlag aus den Kopfzeilen, nichts geschrieben, kein Hinweis. Die alte Datei unter `~/Library/Application Support/WEA_Etiketten` wird nicht mehr gelesen.

### 6.3 Vorlage und Planung

Nach Schritt 2: `IP.gitterVorlageMessen` (Etikett messen, Schriftgrößen und Rahmenbreiten von „Ring“ und „Nummer“, Warnung bei Abweichung von 90 × 36). Planung `gitter.planung` 1:1 (Streifenlänge, Bänder längs/quer, `baueLayout`, `planeEinzelVarianten`, `planeFolge`) mit: Nutzbreite = `gitter.zulaessig_mm` − 44,353 = 1300,647; Längengrenze = `max_laenge_mm` (2500) − 44,353; `planeFolge(jobs, 0)` und die Kandidaten mit `ueber` entfallen (Option „über 2,5 m“ weg); Varianten wie bisher sortiert. Schritt 3 „Variante wählen“: eine Zeile je Variante (`variantenZeile` ohne „– über 2,5 m“), Detailtext je Bogen, „Aufbauen“.

### 6.4 Aufbau

Je Bogen der Variante `IP.druckbogenAufbauen` mit Quelle `fertig`: der Kern baut im Bogen je Kundendatei einmal den Streifen (Vorlage per `duplicate()`, je Etikett Texte „Ring“/„Nummer“ gesetzt, eingepasst in `gitter.schrift_schritt_pt`-Schritten bis `schrift_min_pt`, Cutkontur-Farbfeld „Cutkontur“, Text in Pfade; Protokoll der Verkleinerungen für die Info-Ebene), macht ihn zum Symbol `<Dateiname>` und setzt je Streifen-Platz eine Instanz (längs unverdreht, quer um 90°). Positionen aus dem Planer (Bänder → Kernformat, §2.2 Nr. 2). Info-Ebene wie bisher („=== WEA-ETIKETTEN ===“, Bogen n von m, „>>> d x DRUCKEN <<<“, Nutzen, Zeichenfläche, Etiketten je Druck, je Datei Typ/Streifen/auf Bogen, Bänder, Variante, Material gesamt, Überproduktion, Teilung, Bahnbreite, Vorlage, Verkleinert, Erstellt). Prüfmeldungen gesammelt als ein Popup („Prüfung meldet: • …“), sonst keine Meldung.

### 6.5 Export und Ablage (Bögl-Funktionen)

Auslöser Export bei vorderem Gitter-Bogen → alle offenen Bögen des Aufbaus (§2.5). Ablage (Entscheidung Markus 31.10., Ausnahme zu Register 5.2 und 5.7):
- Kundenordner fest `boegl.kundenordner`; Auftragsordner `JJJJ-MM_<gitter.ordner>` (z. B. `2026-10_Gitterscheiben`). Existiert er und gehört nicht zu diesem Aufbau (kein `exporte[]`-Eintrag eines Bogens dieses Aufbaus zeigt dorthin): ` 2`, ` 3` … (Leerzeichen, einstellig, solange möglich, danach zweistellig). Ein erneuter Export desselben Aufbaus trifft denselben Ordner und ersetzt (`ersetzen: true`).
- Dateien `<boegl.dateiname> NN_druck.pdf`, `<boegl.dateiname> NN_cut.pdf`, `<boegl.dateiname> NN.ai` (`Nutzen 01_druck.pdf` …), NN = Bogen im Aufbau.
- Exportkern sonst wie gebaut (lokal schreiben, Transfer, `.teil`, geparkt bei Fehlschlag, `exporte[]` in den Bögen). Server nicht erreichbar: Mac → Dateien bleiben lokal unter `<ausgang>/Max Bögl/<Auftragsordner>/` mit Meldung; MKs PC (`arbeitsdateien: "server"`) → Abbruch mit Popup wie Exportkern Schritt 1.

## 7. MB-Nummern

### 7.1 Dialog

Fenster „Bögl Nummern“ (ModalDialog `.mbnr`): zehn Felder „Nummer 1:“ … „Nummer 10:“ (5 × 2, SPEZ_03_Oberflaeche §12.3), vorbelegt aus `auftrag.txt` im Bögl-Kundenordner (`server.kunden/boegl.kundenordner/boegl.auftrag`, Zeilen `nummerN=<Menge>`, Leser `leseAuftrag` 1:1; nicht erreichbar oder fehlend → 0), änderbar; der Hinweis `Mengen werden auf Vielfache von 5 aufgerundet – …` entfällt im Fenster, dafür Ergebnis beim Tippen (SPEZ_03_Oberflaeche §12.3); „Abbrechen“ · „Aufbauen“. Prüfungen wie bisher (`Keine Stückzahl eingetragen.`, `Vorlage fehlt: config/vorlagen/Bögl Nummern Masterdatei.ait`).

### 7.2 Planung

`mbnummern.planung` 1:1 (`bildeBloecke`, Blockhöhe, höchste Blöcke zuerst, Blöcke je Zeile, Nutzenmaß) mit nutzbar = Rollenbreite − 2 × `kantenhalter_mm` − 44,353 (1370 → 1295,647); Konstanten aus `config/nutzen.json` `mb`. Über `availH` hinaus weitere Bögen (Zeilen werden auf Bögen verteilt, Zeile nie geteilt).

### 7.3 Aufbau

`IP.druckbogenAufbauen` mit Quelle `fertig`: Masterdatei geöffnet, genutzte Gruppen „1“–„10“ per `duplicate()` in den Bogen, Text in Pfade, je Nummer ein Symbol, Instanz je Schild an der Blockposition (Kernformat). Info-Ebene wie bisher („=== BÖGL NUMMERN ===“, „>>> 1 x DRUCKEN <<<“, Nutzen, Zeichenfläche, Schilder, je Nummer bestellt/gebaut/zu viel, Blöcke je Zeile, Raster, Blöcke/Zeile, Vorlage, „Material ges.: rund … m Bahn“, „n Stück Überproduktion durch das 5er-Raster.“, Erstellt). Prüfmeldungen wie Gitter.

### 7.4 Export

Wie §6.5 mit Auftragsordner `JJJJ-MM_<mb.ordner>` (`2026-10_Nummern`).

## 8. Panel (Darstellung SPEZ_03_Oberflaeche §3)

- ~~Siebte Zeile unter der Werkzeugzeile aus Thema 1 (gleiche Optik, Linie oben): **Nutzen · Gitter · MB-Nr**, drei gleich breite Buttons, keiner orange; Panel 320 × 194 (Inhalt 174 px, Festlegung 1), MinSize gleich; alle sechs bisherigen Zeilen unverändert. Baugerüst bis zur MockUp-Runde.~~ — ersetzt (Thema 6): Nutzen in der Werkzeugzeile Breite · Masken · Nutzen, Gitterscheiben und MB-Nummern im Flyout-Menü, Panel 320 × 172.
- Freigabe im bestehenden Abruf [R 4.7]: **Nutzen** aktiv bei vorderem Dokument mit Auswahl, gesperrt ohne Dokument, ohne Auswahl und bei Druckbogen vorn; **Gitter**, **MB-Nr** immer aktiv außer bei Druckbogen vorn. Jeder Button prüft beim Klick nach dem Neulesen die Freigabe erneut (wie Werkzeuge Nr. 15).
- **Nutzen-Bogen vorn**: Zeile 1 „<Kunde> · Nutzen <Produkt> · n/m“, bei `art` gitter „Max Bögl · Gitterscheiben · n/m“, bei mb „Max Bögl · Nummern · n/m“; nur Export und Auftrag aktiv, Zeilen 2 und 5 leer (wie Druckbogen vorn, SPEZ_02 §13). Bei Bögen ohne Arbeitsdatei keine Grafikzeile.

## 9. Stufe 3 (nur Austauschstellen, nicht Teil dieses Themas)

- Einstieg A mit App-Auftrag: Kunde, `auftrag`, `ablage` aus der Arbeitsdatei wie bei Druckbögen; Ablageort nach Supabase wie Druckbögen.
- Gitter- und MB-Bögen: Anbindung an ein App-Produkt (Bestellung Max Bögl) als eigener Zweig — Mengen aus der App vorbelegt, `auftrag` im Bogen-XMP gefüllt; bis dahin `auftrag` null.
- Kalkulation aller drei Funktionen in der App (Markus 31.10.); das Panel liefert keinen Preis.

## 10. Repo, Doku, Tests

- Neu: `config/nutzen.json`; `panel/lib/nutzen.js` (Planer, Texte, Info-Zeilen; aus dem alten Projekt, Konstanten aus `nutzen.json`, Modus „ohne“, Bögen statt Drucke), `panel/lib/gitter.js` und `panel/lib/gitter_leser.js` (aus dem alten Projekt; Arbeitsordner, `einstellungen.txt` und Option „über 2,5 m“ entfallen; Gedächtnis-Pfad als Parameter), `panel/lib/mbnummern.js` (aus dem alten Projekt; Konstanten aus `nutzen.json`, `auftrag.txt`-Pfad als Parameter), `panel/lib/nutzenbogen.js` (Bogen-XMP, Info, JSX-Spec, Dateinamen, Bögl-Ordnerregel, Umrechnung Planer → Kernformat), `panel/nutzen.html/.js`, `panel/gitter.html/.js`, `panel/mbnr.html/.js`, Extensions `.nutzen`, `.gitter`, `.mbnr` (ModalDialog) im Manifest, Debug-Ports fortlaufend.
- Geändert: `config/schema.json` (§3.3), `panel/lib/konfiguration.js` (`nutzen.json` prüfen), `panel/lib/dokument.js` (`bogen.art`, `produkt`, `auflage`), `panel/lib/auftrag.js` (`exportDruckboegen` für Bögen ohne Arbeitsdatei, zulässige Breite bei `art: gitter`, Dateinamen über `nutzenbogen.js`), `panel/lib/druckbogen.js` (Dateinamen mit Produkt), `panel/lib/export.js` (`umgebung.arbeitsdatei: null`, Bögl-Ordnerregel), `panel/lib/dokument_xmp.js` (Bögen ohne Arbeitsdatei nicht zählen), `panel/main.js` (Zeile 7, Zustände, Export), JSX-Kern (`druckbogenAufbauen` mit Quellen `auswahl` und `fertig`, Streifen bauen mit Textersatz und Einpassen aus `gitterBogenBauen`, Masterdatei-Gruppen aus `mbAufbauen`, `nutzenMessen`, `gitterVorlageMessen`). Version 3.6.0 (Manifest alle Extensions, `dokument.PANEL_VERSION`).
- `Infos/Skripte_alt/` bekommt Kopien der vier Skripte als Referenz; die Originale bleiben unverändert [R 7.4].
- Tests [R 7.9]: `node --test tests/*.test.js`. Neu nur eine Datei `tests/nutzen.test.js` mit drei Fällen: Nutzen-Planer (ein A4-Fall gegen die Werte des alten Projekts, ein Fall „ohne“), Gitter-Planung ein Fall (zwei Jobs, Einzelbogen und Folge), MB-Blöcke ein Fall (zwei Nummern, gemischter Block). Keine Illustrator-Läufe; Test unter Realbedingungen danach durch Markus.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Nutzen“. Kein Commit, kein Push, außer der Auftrag nennt es.

## 11. Festlegungen CC — bestätigt 31.10.

FESTLEGUNGEN.md Abschnitt „Nutzen“, Punkte 1–23 (Stand 3.6.0, Arbeitskopie): bestätigt mit einer Korrektur.

- **Punkt 1** (Panel 320 × 194, Inhalt 174 px, siebte Zeile in der Optik der sechsten): bestätigt (Markus auf Rückfrage CC); ersetzt 320 × 186 in §8.
- **Punkt 2** (Layoutzeile „n Bögen“ statt „n× drucken“, auch bei n = 1): bestätigt; ergänzt §5.3.
- **Punkt 6 geändert:** Materiallänge in Vorschau und Info = Summe der Zeichenflächenlängen des Aufbaus (inklusive Anschnitt, wie die Bogenlänge in §5.4), nicht mehr der Wert des alten Planers ohne Anschnitt. Korrekturauftrag 31.10.
- Übrige Punkte bestätigt ohne Änderung: 3 (Messung mit der sichtbaren Begrenzung des Kerns), 4 (Anschnitt je Seite nach Drehung, Zeichenfläche = Begrenzung + 22,1765 je Seite), 5 (Abstandsprüfung des Kerns mit Abstand Motive − Anschnitt, Streifen-Lücke bzw. `mb.abstand_mm`), 7 (Format „ohne“: Varianten, Duplikate, Texte), 8–9 (Info-Ebene und Vorgabe Nutzen: Medium/Laminat/Rolle als drei Zeilen, Zeilen bei „ohne“), 10 (mehrere Bögen A4/A3, Detailtext ohne „Rest löschen“), 11 (Symbol- und Instanznamen: `<Produkt>`, `<Dateiname>`, `Nummer <n>`, je `<k>`), 12 (Maßstab A/B, Medium über Alias, Stückzahl ohne gültiges `IP_Anzahl` 1), 13 (Pflichtfelder, Medienliste aus der Preisliste wie Fenster „Objekt“), 14 (Gitter-Info ohne „Schrift“-Zeile, Hinweis bei nicht gewandeltem Text, Kernmeldungen mit „Bogen n: “), 15–16 (MB-Info je Aufbau/Bogen, Zeilenverteilung auf Bögen), 17 (Vorab-Eintrag `exporte[]` mit `uebertragen: false` in den gespeicherten Bögen), 18 (Bögl-Ordner „eigen“ über `exporte[]` der offenen Bögen, Parkordner `<ausgang>/Max Boegl/<Auftragsordner>`), 19 (`dokumentInfo.auswahl` für die Freigabe), 20 (Fenstergrößen vorläufig 860 × 500 / 860 × 480 / 620 × 420, Debug-Ports 8098–8100, CSEvent `de.pamnm.illupanels.nutzenFertig`), 21 (Cutkontur-Prüfung je Symbol), 22 (Aufbau ohne vorderes Dokument), 23 (`gitter.etikett_mm` im Warntext).
- Punkte 1 und 20 (Panel- und Fenstergrößen) sind durch SPEZ_03_Oberflaeche §14 ersetzt (Thema 6).
