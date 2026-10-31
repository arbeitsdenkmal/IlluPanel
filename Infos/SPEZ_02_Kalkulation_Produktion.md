# Spezifikation Stufe 2 „Zuordnen, Kalkulation, Schneidedaten, Druckbögen“ — PAM-Werkzeuge

Stand: 31.10.2026, Fassung 8 (Arbeit in Druckbögen zählt nicht als Grafikzeit — §12, §18 Nr. 14 und 19, §19 Nr. 11 aufgehoben; Markus 31.10. abends). Fassung 7 (Festlegungen CC aus 2d und Fehlerauftrag 2b bestätigt — §17.1 Punkte 45–46, §17.3; Zuordnung ungespeicherter Druckbögen in §12; Versionsschema in §14). Fassung 6 (Festlegungen CC aus 2c bestätigt — §17.2; NN je Medium + Laminat + Rolle in §11.2; B-18 Windows-Prozess in §12/§18; Tape-Satz von §10 nach §5). Fassung 5 (Zusammenführung: Fassung 4 des 2c/2d-Chats plus Korrekturen 2b — `bogen.gesamt`, `IP_Originalfarbe`, `kein_tape`, Panel add/Unterebene, §17.1). Fassung 4 (Teilstufen 2c und 2d spezifiziert: Passermarken, Summa, Druck, Export, Grafikzeit — Abschnitte 7, 10, 11, 12, 14 geändert, 18 und 19 neu). Fassung 3: Ableitungen geklärt, MockUps freigegeben, Festlegungen CC aus 2a bestätigt (Abschnitte 15–17). Grundlage: `claude/REGISTER_NEUAUFBAU.md` (Register), `claude/PREISLOGIK.md` v6 mit den Änderungen im Register, `claude/SPEZ_01_Fundament.md` (gebaut, 3.0.1), Antworten Markus vom 30.10. (Fragen 1–12 plus Nachfragen; 2c/2d: Fragen 1–12 und Ableitungen 1–17, Abschnitte 18–19), `Infos/PRODUKTIONSREGELN.md`, `Infos/OPOS_ANALYSE.md`. Nur für Fahrzeugbeschriftung und Beschriftung. SDK-unabhängig: alles, was später aus Supabase kommt oder dorthin geht, läuft in Stufe 2 über die Preisquellen-Schnittstelle (lesen) und das XMP der Arbeitsdatei (schreiben).

Kennzeichnung: **[R x.y]** Registerpunkt · **[P §n]** PREISLOGIK · **[M]** Antwort Markus 30.10. · **[A-n]** Ableitung Claude, geklärt mit Markus 30.10., Abschnitt 15 · **[B-n]** Ableitung Claude zu 2c/2d, geklärt mit Markus 30.10., Abschnitt 18 · **[PM n]** Antwort Markus zu Passermarken, Abschnitt 19.

## 1. Umfang

Enthalten:
1. Konfiguration: `config/medien.json`, `config/serien.json`, `config/farbfelder/*.ase`; Preisquellen-Schnittstelle mit Entwicklungsquelle `Infos/Stammdaten/preisliste.csv` [R 6.4]
2. Datenschicht-Erweiterung: `IP_Id` als Schlüssel, Varianten-Erkennung, `IP_Anzahl`, XMP-Felder `vorauswahl`, `farbzuordnung`, `kalkulation`, `grafikzeit`
3. Lesen und Messen der Objekte (Prüfungen, Teile, Schnittlänge, Flächen, Cutkontur, Motivumriss)
4. Zuordnen-Dialog (Fenster „Objekt“) für Plott und Digitaldruck
5. Nesting und Rollenwahl (gemeinsam für Kalkulation, Schneidedaten, Druckbögen), Passermarken-Blöcke bei mehrfarbigem Plott
6. Kalkulation nach PREISLOGIK v6 mit Anzahl-Multiplikator, Kalkulationsdatensatz ins XMP
7. Fenster „Zusammenfassung“ (nicht modal; ersetzt „Objekte“ und „Details“ [M]) [R 4.5]
8. Produktionsdatenblatt `<Kunde>_Zusammenfassung.pdf` (Inhalt des Fensters ohne Preise) [M]
9. Plott-Schneidedaten (Summa) mit Passermarken über den Exportkern
10. Druckbögen aufbauen (Druck) und exportieren (Export mit eigenen OPOS-Marken) über den Exportkern
11. Grafikzeit: Hintergrund-Extension, Feld „+ min“, Einträge ins XMP [M 1, R 2.12, R 4.8]
12. Panel-Erweiterung: Objektzeile, Buttons, Preiszeilen

Nicht enthalten [M 12]: Supabase/SDK (Produktliste, Login, Rückmeldung, Preisliste aus Supabase), Breite/Masken [R 4.3], Nutzen/Gitter/MB-Nr [R 3.9], Schild (Zuordnen, Schneidedaten), Textil Flex/Flock [R 2.2], Skript-Buttons, Bereitstellung nach `/Applications/interne Tools`, Passermarken für Plott auf Druck [PM 9]. Entfallen gegenüber dem alten Panel: Fenster „Kopie“ [M 4], getrennte Fenster „Objekte“/„Details“ und Button „list“ [M], Messprotokoll-JSON und Grafikzeit-JSON [R 5.8], Kalkulations-PDF mit Preisen [M 2], Preis bestätigen/senken [R 1.3], Maßstabsfeld im Panel [M 6], Einstellungen-Fenster (Preislistenpfad; Quelle ist fest, Abschnitt 4), Schalter `opos_marken` [M 10], Hinweis „Veraltete Datei aus früherem Lauf“ [B-9], Abbruchgrund „doppelte Objektnamen“ [B-13].

## 2. UI-Teile und MockUps

MockUps `Infos/mockups/MOCKUP_STUFE2.html` (3. Fassung), von Markus am 30.10. freigegeben: Panel A5, Zustände A7, Zuordnen B3/B4, Fenster „Zusammenfassung“ C3. Die MockUps sind für Aufbau, Reihenfolge und Texte verbindlich; Maße in CSS-px wie dort. Button-Texte: „add“/„edit“, „berechnen“, „Summa“, „Druck“, „Export“, „Auftrag“, „PDF“, „Schließen“, „Abbrechen“, „OK“. Änderung A5 gegenüber dem MockUp [M]: Preiszeile mit „Material …“ linksbündig und „inkl. Mont. …“ rechtsbündig. 2c und 2d bringen nichts Sichtbares hinzu (Buttons Summa/Druck/Export und „+m“ sind in 2b angelegt); kein weiteres MockUp.

## 3. Datenschicht (Erweiterung von SPEZ_01 §5)

### 3.1 Objektebene

| Tag | Stufe 2 |
|---|---|
| `IP_Id` | Schlüssel des Objekts; vergeben beim Zuordnen (zeitbasiert + Zufall, Text). Alle Bezüge (Kalkulationsdatensatz, Symbole, Varianten, „Objekte“) laufen über die Id, nicht über den Namen |
| `IP_Folie` | Plott `751C-031`, Druck Medium `3551` (Schlüssel aus `serien.json` bzw. Preisliste) |
| `IP_Laminat` | `matt` / `glaenzend`, nur Druck |
| `IP_Anzahl` | ganze Zahl ≥ 1, Standard `1` [R 3.4] |
| `IP_Komplexitaet` | `0`–`3`, nur wo geschnitten wird [R 1.8] |
| `IP_Attribute` | kommagetrennt aus `sicke`, `woelbung`, `tape` (Tape manuell an), `kein_tape` (Tape manuell aus); ohne beides gilt der Vorschlag („auto“) |
| `IP_Original` | `IP_Id` des Originals bei Varianten |
| `IP_Herkunft` | nur auf Druckbögen: `IP_Id` des Objekts, dessen Symbolinstanz das ist |
| `IP_Druckrichtung` | nur auf Druckbögen: Druckrichtungsdreieck (Wert `1`), kein Motiv |
| `IP_Originalfarbe` | gesicherte Originalfarbe am Pfad/Textrahmen beim Plott-Umfärben (Schlüssel `originalfarbe` in `schema.json`); ersetzt die frühere Doppelnutzung von `IP_Original` |

**Objektname** [M 3]: frei, keine Pflicht, keine Eindeutigkeit. Anzeige in „Zusammenfassung“/PDF/Bogen: Illustrator-Name des Objekts; ohne Namen „Objekt“ + laufende Nummer in Ebenenreihenfolge (nur Anzeige, nicht gespeichert). [A-1]

**Varianten** [M 4, M 5]: Bei Zuordnen, Berechnen, Summa und Druck (dort werden die Tags ohnehin gelesen; nicht bei „Maus ins Panel“, das liest nur die Auswahl) gilt: Vergleich nur der `IP_Id`-Texte, keine Geometrie. Tragen mehrere Objekte dieselbe `IP_Id`, behält das in Ebenenreihenfolge erste sie; jedes weitere bekommt eine neue `IP_Id` und `IP_Original` = die bisherige Id (fehlt das Original inzwischen, bleibt `IP_Original` stehen). Alle übrigen Tags bleiben. Identische Exemplare laufen über `IP_Anzahl`, Varianten (gespiegelte Elemente, geänderter Text, andere Größe) über das Duplikat. Keine Spiegel-Option, kein Dialog. Herkunft für Symbole auf dem Druckbogen: ein Symbol je `IP_Id`; eine Variante bekommt ein eigenes Symbol, außer der Geometrievergleich (`herkunft.js`: nur proportional skaliert, gedreht, gespiegelt, verschoben) ergibt Gleichheit mit dem Original — dann Instanz des Original-Symbols mit ihrer Transformation. [A-2]

### 3.2 Dokumentebene (XMP, Schema 1, Felder ergänzt)

```json
{
  "vorauswahl":    { "medium": "3551", "laminat": "matt", "serie": "751C" },
  "farbzuordnung": { "<colorKey>": "751C-031" },
  "grafikzeit":    { "eintraege": [ { "von": "…Z", "bis": "…Z", "minuten": 12.3, "manuell": false, "benutzer": null, "uebertragen": false } ] },
  "kalkulation":   { … Kalkulationsdatensatz, Abschnitt 8.4 … },
  "aufbau":        { "id": "…", "zeit": "…Z", "boegen": [ { "medium": "3551", "laminat": "matt", "breite_mm": 1370, "nr": 1 } ] }
}
```

- `vorauswahl`: zuletzt gewählte Werte je Auftrag (Preset ohne Eintrag: Medium 3551 matt, Serie 751C — wie bisher).
- `farbzuordnung`: Nicht-Oracal-Farbe → Folienschlüssel je Auftrag (wie bisher, colorKey exakt).
- `grafikzeit.eintraege[]`: Struktur aus SPEZ_01; `minuten` auf 0,1 gerundet [B-16]; `benutzer` in Stufe 2 `null` — kein angemeldeter Benutzer, keine Zwischenlösung über `rechner.json` [M]. [A-3]
- `kalkulation`: letzter Kalkulationsdatensatz, ersetzt bei jedem Berechnen.
- `aufbau`: letzter Druckbogen-Aufbau (Export verarbeitet nur Bögen dieses Aufbaus).

**Druckbogen-Dokumente** (`rolle: "druckbogen"`): eigenes XMP mit `kunde`, `auftragsart`, `massstab: 1`, `auftrag`, `ablage` (Kopie aus der Arbeitsdatei) sowie `bogen: { aufbau, medium, laminat, breite_mm, nr, gesamt, arbeitsdatei: "<Pfad>" }`. `gesamt` = Zahl der Bögen dieses Aufbaus (für „n/m“ im Panel, gesetzt beim Aufbau in 2c; 2b zeigt ohne das Feld nur „n“). Der Pfad dient der Zuordnung beim Export und der Grafikzeit (Abschnitt 12).

## 4. Konfiguration und Preisquelle

- `config/medien.json`: aus `Infos/Stammdaten/medien.json`, geändert: `randabzug.plott` **25** (bisher 40) [R 3.3]; `druck.opos_marken` entfällt (immer eigene Marken; Rückfall — Marken von Hand mit dem Summa-Plugin — läuft am Panel vorbei [M 10]). Übrige Werte unverändert (OPOS-Zugabe 24,353, Markenrand 10, Kantenhalter 15, Reserve Kontur 10, Schwelle 10 %, Breiten, Laminate, Alias). [R 3.7, M 7] Neu: Block `passermarken` (Abschnitt 10.1): `stufen_mm` [30, 20, 15, 10, 5], `anteil` 0,1, `abstand_mm` 5.
- `config/serien.json`: aus `Infos/Stammdaten/serien.json`, unverändert. [M 7]
- `config/farbfelder/*.ase`: Kopien der fünf Oracal-Bibliotheken aus `~/tools/folienkalkulation/config/farbfelder/`; Lesequelle für das Farbraster und für MKs PC. Illustrators Verknüpfungen bleiben, wie sie sind. [M 8, R 7.4]
- Startprüfung (Ergänzung SPEZ_01 §3): `medien.json` (jede Serie der Preisliste mit Standardbreite), `serien.json`, alle fünf ASE lesbar; Fehler → Popup, Buttons gesperrt.

**Preisquellen-Schnittstelle** `panel/lib/preisquelle.js`:

```
laden(auftragsart) → { ok, version, stand, quelle, zeilen[], fehler[] }
z(name, verfahren)        Minutenwert (Auflösung: Auftragsart vor „alle“, Verfahren vor „alle“) [P §8.4]
serie(schluessel)         { verfahren, ek_m2, vk_m2, tape_vk_m2 }
parameter(name)           Zahl (stundensatz.vk, stundensatz.produktion, stundensatz.grafik, mindest.produkt, mindest.montage, rundung, mwst, tape.min_schnittdichte, tape.min_teiledichte)
aufschlaege()             [{ schluessel, prozent | minuten }]
komplexitaet()            [{ stufe, prozent }]
```

- Stufe 2 implementiert `preisquelle_csv.js`: liest `Infos/Stammdaten/preisliste.csv` relativ zum Erweiterungsordner (eine Datei im Repo, keine Kopie je Rechner) [R 6.4]; `version` = `null` (kein Hash, keine Entwicklungsfüllung [M]), `stand` = Änderungszeit der Datei; Prüfungen wie bisher [P §9]; bei jeder Berechnung neu gelesen. Stufe 3 ersetzt nur dieses Modul durch den SDK-Adapter, der die Preislistenversion aus Supabase liefert. [A-4]
- Kein Einstellungen-Fenster, kein wählbarer Pfad.

## 5. Lesen und Messen

Gilt für Berechnen, Summa, Druck; der JSX-Kern liefert die Rohdaten, Node misst und prüft (`panel/lib/teile.js` aus dem alten Projekt übernommen und auf `IP_Id`/`IP_Anzahl` umgestellt).

- **Stück**: oberstes Objekt bzw. Gruppe auf einer Ebene der Rolle `plott` oder `digitaldruck` mit `IP_Folie`. Sandbox und Vorlage-Ebenen werden nicht gerechnet.
- **Plott**: Einzelteile = geschlossene bzw. zusammengesetzte Pfade (Punzen zählen nur zur Schnittlänge), Text in Pfade, je Farbschlüssel eine Teilegruppe. Farbe aus dem Farbfeldnamen der Füllung (`NNN (<Zusatz>)`, Zähler toleriert) → Schlüssel über `serien.json`; sonst über `farbzuordnung`. Ein Stück mit Teilen in ≥ 2 Farbschlüsseln ist **mehrfarbig** (Abschnitt 10.1); Passermarken zählen nicht zu Teilen und Schnittlänge [B-5].
- **Druck**: Messung an der Cutkontur (Vollton C0 M100 Y0 K0, Toleranz 0,5, Name egal [R 3.1]); ohne Cutkontur Motivumriss im Hilfsdokument (Text in Pfade, Konturen in Flächen, Vereinigen, Außenringe), 1 Teil. Pixelbild/Schnittmaske: sichtbare Begrenzung. [R 3.8] Für den Geometrievergleich der Varianten (Druck) liefert der JSX-Kern je Stück die Form (`signatur`, Punkte wie bisher in `herkunft.js`).
- **Flächen**: `fläche_m2(o)` Bounding Box im Realmaß (Maßstab aus XMP); `fläche_m2(o, f)` je Folie. Nesting-Maß Druck: ohne Cutkontur Außenkante + 10 + 3 mm je Seite, mit Cutkontur Außenkante ∪ (Cutkontur + 3 mm). [R 3.7]
- **Tape-Vorschlag** (Druck): Schnittdichte ≥ `tape.min_schnittdichte` oder Teiledichte ≥ `tape.min_teiledichte`, bezogen auf die Begrenzung der Messung; `kein_tape` in `IP_Attribute` schlägt den Vorschlag, `tape` setzt ihn — gilt in Kalkulation und Messung. [R 1.9]
- **Anzahl**: Messwerte je Stück gelten für ein Exemplar; Nesting und Kalkulation multiplizieren mit `IP_Anzahl`.
- **Prüfungen** (vor Berechnen, Summa, Druck; gleichartige zusammengefasst in einem Popup): Warnungen — Objekte auf der Sandbox, oberste Objekte auf Plott/Druck-Ebenen ohne Zuordnung (nicht gerechnet), Konflikt Zuordnung ↔ Ebene/Farbe (nicht gerechnet), Konturen auf Plott-Objekten, an Lücken geteilte Teile. Abbruch — Teil länger als 5680 mm, Teil bzw. Block passt in keiner Lage in die Nutzbreite, Farbe ohne Serie, Serie/Medium ohne Preis, Preisquelle fehlerhaft. [Produktionsregeln §4; „doppelte Objektnamen“ entfällt, B-13]

## 6. Zuordnen (Fenster „Objekt“, ModalDialog, MockUp B3/B4)

Öffnet über add/edit im Panel und per Doppelklick in „Zusammenfassung“; ein oder mehrere oberste Objekte ausgewählt. Breite 480, Höhe nach Inhalt (ModalDialog: feste Höhe je Zustand im Manifest, Inhalt oben ausgerichtet).

- **Art**: Digitaldruck | Plott (in dieser Reihenfolge) [M]. **Anzahl**: Feld, ganze Zahl ≥ 1, Standard 1; bei Mehrfachauswahl mit unterschiedlichen Werten leer („mixed“).
- **Plott**: Block „Farben im Objekt“ — eine Zeile je Füllfarbe der ausgewählten Objekte (Chip, Name, Status „✓ <Schlüssel>“ bei erkannter Oracal-Farbe oder bekannter `farbzuordnung`, sonst „→ zuordnen“); die markierte Zeile ist die, der die nächste Wahl gilt, nach einer Zuordnung springt die Markierung zur nächsten offenen Zeile. Darunter Serie (651, 751C, 951, 970G, 970M), Feld „Farb-Nr.“ (filtert die Kacheln der gewählten Serie beim Tippen auf Teiltreffer der Nummer; ohne Serie alle Serien; genau ein Treffer + Enter übernimmt) und das Kachelraster der Serie (eine Kachel je ASE-Farbe, Farbe LAB → sRGB, Nummer als Tooltip; Klick ordnet der markierten Zeile zu). OK erst, wenn alle Zeilen zugeordnet sind. Umfärben bei OK (Farbfeld anlegen/wiederverwenden), Originalfarben als Tag am Pfad sichern und bei späterer Druck-Zuordnung zurückholen (wie bisher). Konturen, Bilder, Verläufe sperren Plott.
- **Digitaldruck**: Medium (3162, 3551, 3951, 3676, UltraTack, MonsterTack), Laminat matt | glänzend (3676 nur glänzend).
- **Komplexität** K0–K3 nur bei Plott und bei Druck mit Cutkontur [R 1.8]; Tooltip aus `komplexitaet()` (Bezeichnung, Prozent). **Aufschläge** Sicke, Wölbung (aus `aufschlaege()`, Tooltip mit Wert); bei Druck zusätzlich Tape mit drei Zuständen, Klick schaltet weiter: „Tape auto“ (kein Wert, Vorschlag aus dem letzten Berechnen gilt) → „Tape“ (`tape`, manuell an) → „kein Tape“ (`kein_tape`, manuell aus); Tooltip nennt den Vorschlag.
- **Vorauswahl**: Art nach Tag, sonst Sandbox → Digitaldruck, sonst nach Ebene; Medium/Laminat/Serie aus `vorauswahl`.
- **Mehrfachauswahl** [M]: ein Dialog, gleiche Werte für alle; unterschiedliche Werte gestrichelt/leer („mixed“), ändern nur bei neuer Wahl; gemischte Art → Art ungewählt, Farb-/Medienbereich aus. Jedes Objekt bleibt ein eigenes Stück; Gruppen sind ein Stück mit ggf. mehreren Folien.
- **OK**: Tags schreiben (`IP_Id` vergeben, falls fehlend; Varianten-Erkennung vorher), Objekte positionsgleich auf die Ebene der Rolle, `vorauswahl`/`farbzuordnung` ins XMP; CSEvent an das Panel, Panel und ein offenes „Zusammenfassung“ lesen neu. **Enter** = OK, **Esc** = Abbrechen; Fußzeile zeigt die erste offene Warnung, OK gesperrt.

## 7. Nesting und Rollenwahl

`panel/lib/nesting.js`, `rollen.js` aus dem alten Projekt übernommen. MaxRects, 90°-Drehung, 20 mm Abstand, 10 mm Rand, reproduzierbar. [R 3.3]

- **Plott** je Farbschlüssel: Nutzbreite = Standardbreite − 25 [R 3.3]; Länge ≤ 5700 mm; übergroße Teile an Lücken teilen (Warnung) oder Abbruch. Jedes Stück × Anzahl Exemplare. **Nesting-Einheit**: einfarbiges Stück → seine Einzelteile; mehrfarbiges Stück → je Farbschlüssel ein **Block** aus den Teilen dieser Farbe plus beiden Passermarken (Abschnitt 10.1), Lage zueinander fest, Block darf 90° gedreht werden, je Exemplar ein Block [PM 6, PM 7, B-4]. Ein Block, der in keiner Lage in die Nutzbreite passt, wird nicht geteilt → Abbruch.
- **Druck** je Medium + Laminat: mit jeder vorrätigen Breite nesten; Standardbreite, außer passt nicht oder eine andere spart ≥ 10 % Verbrauch [Produktionsregeln §3]. Grafik quer ≤ Rollenbreite − 30 − 44,353; Bogenlänge ≤ 2500 mm, Einzelobjekt bis 5700 mm auf eigenem Bogen. Zeichenfläche = Außenkante der Teile + 44,353 mm (22,1765 je Seite). Jedes Stück × Anzahl Exemplare.
- **Verbrauch** je Folie = Σ Zeichenflächenlänge × volle Rollenbreite (nur EK, Rollenwahl, Materialbedarf, Schneidedaten). [P §3]
- Kalkulation, Summa und Druck nutzen dasselbe Ergebnis — der Block gilt also auch für Verbrauch/EK in der Kalkulation (Änderung an 2a) [B-5].

## 8. Kalkulation

### 8.1 Rechenweg
PREISLOGIK v6 §4 unverändert, mit zwei Ergänzungen:
- **Anzahl**: Material, Entgittern, Flächenzeit, Trennen, Montage je Stück und Tape-Material werden je Exemplar gerechnet und × `IP_Anzahl` summiert; Rüsten/Tape-Anteil je Folie verteilen sich auf alle Exemplare nach Fläche; `fläche_m2(o)` in `reinigen_rest` und Tape-Dichte zählt × Anzahl. [A-5]
- **Brutto**: gerundeter Nettopreis × (1 + mwst/100), auf Cent gerundet. [R 1.14]

Ergebnis: VK und Mindest-VK, je „nur Aufkleber“ und „inkl. Montage“, netto gerundet (5 €) und brutto. Grafik nur dokumentiert [P §2.7]. Komplexität nur auf Produktionszeit [P §5]. Passermarken: kein Einfluss auf Teile, Schnittlänge, Zeiten; nur über das Block-Nesting auf Verbrauch/EK [B-5].

### 8.2 Auslöser
Button Berechnen: Prüfungen (§5) → Nesting (§7) → Kalkulation → Datensatz ins XMP → Fenster „Zusammenfassung“ öffnen/aktualisieren → Hinweise als ein Popup. Grafikminuten aus `grafikzeit.eintraege` (auto + manuell) in den Block `grafik`.

### 8.3 Anzeige
Panel (A5): eine Preiszeile, links „Material <netto> <brutto>“ (= „nur Aufkleber“), rechts „inkl. Mont. <netto> <brutto>“, brutto fett; kein Hinweis „Mindestbetrag …“ im Panel (nur in der Zusammenfassung) [M]. Fenster „Zusammenfassung“: Abschnitt 9.

### 8.4 Kalkulationsdatensatz (XMP `kalkulation`, identisch mit dem späteren JSONB [R 6.13])

```json
{
  "schema": 1, "zeit": "…Z", "panel": "3.1.0", "preislogik": 6,
  "preisliste": { "quelle": "csv", "version": null, "stand": "…Z" },
  "auftragsart": "fahrzeugbeschriftung", "massstab": 30, "kunde": "…",
  "stundensaetze": { "vk": 155, "mindest": 84, "grafik": 96 }, "mwst": 19, "rundung": 5,
  "objekte": [ {
    "id": "…", "name": "…", "original": null, "anzahl": 2, "verfahren": "plott",
    "folien": ["751C-031"], "laminat": null, "flaeche_m2": 0.42, "flaeche_je_folie": { "751C-031": 0.42 },
    "teile": 17, "schnitt_m": 6.3, "komplexitaet": 0, "attribute": ["sicke"], "tape": false,
    "minuten": { "ruesten_anteil": 1.2, "tape_anteil": 0.4, "flaechenzeit": 0, "entgittern": 1.27, "trennen": 0.17, "produktion": 3.04, "montage": 7.9, "montage_attribute": 0 },
    "betraege": { "material": 6.07, "tape": 0, "produkt_vk": 13.9, "montage_vk": 20.4, "produkt_mindest": 10.3, "montage_mindest": 11.1 }
  } ],
  "folien": [ { "schluessel": "751C-031", "serie": "751C", "verfahren": "plott", "laminat": null, "rollenbreite_mm": 1260, "nutzbreite_mm": 1235, "boegen": 1, "lfm": 0.62, "verbrauch_m2": 0.78, "flaeche_m2": 0.84, "teile": 34, "ek": 4.75 } ],
  "auftrag": { "datei_rip_min": 0, "auftrag_montage_min": 2, "reinigen_rest_min": 0.26, "produktion_min": 6.1, "montage_min": 18.1 },
  "preise": {
    "vk":      { "nur_aufkleber": { "netto": 28.9, "gerundet": 35, "brutto": 41.65 }, "inkl_montage": { "netto": 69.3, "gerundet": 70, "brutto": 83.30 } },
    "mindest": { "nur_aufkleber": { "netto": 20.6, "gerundet": 35, "brutto": 41.65 }, "inkl_montage": { "netto": 46.0, "gerundet": 65, "brutto": 77.35 } },
    "mindestbetrag_greift": { "vk": { "produkt": true, "montage": false }, "mindest": { "produkt": true, "montage": true } }
  },
  "materialbedarf": [ { "schluessel": "751C-031", "verbrauch_m2": 0.78, "lfm": 0.62, "rollenbreite_mm": 1260 } ],
  "grafik": { "min_auto": 0, "min_manuell": 0, "stundensatz": 96, "betrag": 0 },
  "warnungen": [ "2 Objekte auf der Sandbox" ]
}
```

Zahlen im Beispiel sind Platzhalter für die Struktur. `materialbedarf` nach [R 6.10]. Betragsfelder je Objekt enthalten VK und Mindest-VK, damit die App beides zeigen kann. `mindestbetrag_greift` je Preisart (`vk`, `mindest`) — Änderung gegenüber 2a (dort nur VK).

## 9. Fenster „Zusammenfassung“ und `<Kunde>_Zusammenfassung.pdf` (MockUp C3)

Modeless-Extension, ersetzt „Objekte“ und „Details“ [M]; öffnet nach „berechnen“ im Panel, liest beim Öffnen und nach Panel-Aktionen (Zuordnen, berechnen). Breite 620, Höhe nach Inhalt; Objekttabelle scrollt ab etwa 12 Zeilen, Folien und Summen bleiben sichtbar. Keine Information doppelt [M]: Beträge je Objekt nur in der Objekttabelle, Material/Minuten/Preise nur in den Summen.

1. **Objekte** (Tabelle): Objekt (Farbstreifen Plott/Druck, Name; Varianten eingerückt unter dem Original mit „· Variante“), Anzahl, Folie (Chip + Schlüssel bzw. Medium + Laminat), Attribute (nur Abweichungen: K1–K3, Sicke, Wölbung, Tape), Teile, m² (Stückfläche × Anzahl), Betrag, inkl. M. — Werte aus dem letzten Datensatz, sonst „–“. Darunter Gruppe „Ohne Zuordnung (n) – wird nicht berechnet“ (Warnfarbe) mit Ebene. Klick wählt in Illustrator aus (Cmd/Shift wie bisher), Doppelklick öffnet „Objekt“.
2. **Folien**: Folie, Rolle (mm), Bögen, lfm, m² Verbrauch, EK €.
3. **Summen**: Material; Produktion (min); Montage (min, davon je Auftrag); „nur Aufkleber“ netto gerundet fett + brutto „inkl. MwSt. n %“; darunter „Mindest-VK (<Satz> €/h)“ netto/brutto; „inkl. Montage“ ebenso (Betrag orange); Hinweis „Mindestbetrag Produkt/Montage greift“ als Hinweiszeile an der Preiszeile, bei der er greift (VK oder Mindest-VK).
4. **Grafik** abgesetzt: „Grafik N min (a auto, m manuell) · <Satz> €/h“ und Betrag.
5. Fuß: **berechnen** (rechnet neu, aktualisiert), **PDF**, **Schließen** (auch Esc).

**PDF** `<Kunde>_Zusammenfassung.pdf` [M]: Inhalt der Abschnitte 1, 2 und Kopf (Kunde, Auftragsart, Datum, Maßstab) plus Warnungen des Laufs — ohne Summen, Preise, EK und Grafik. Erzeugt mit jsPDF aus dem letzten Datensatz (vorher automatisch berechnen), über den Exportkern in den Auftragsordner, Nummerierung `_02` bei Wiederholung [R 5.7].

## 10. Plott-Schneidedaten (Summa) — Teilstufe 2c

Ablauf über den Exportkern (Profil `produktion`, Abschnitt 11.3): Arbeitsdatei speichern (ungespeichert → Abbruch mit Popup) [B-7] → Prüfungen (§5) → Varianten-Erkennung (§3.1) → Nesting je Farbschlüssel (§7, Nutzbreite −25, Exemplare nach Anzahl, Blöcke bei mehrfarbigen Stücken) → je Bogen ein Hilfsdokument 1:1, Zeichenfläche = Umriss + 10 mm je Seite, Pfade ohne Füllungs-/Konturänderung wie bisher (Text in Pfade, Schnittmasken aufgelöst) → PDF/X-4 `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf` (NN = Bogen) [R 5.9] → Hilfsdokumente schließen, Arbeitsdatei bleibt unverändert, Ist-Lage gegen Planung prüfen (Hinweis ab 0,1 mm) → ein Eintrag in `exporte[]`. Hinweise und Warnungen als ein Popup.

- **Gruppen im Schneidedokument**: je Exemplar eine Gruppe `<Anzeigename> <k>` (k = Exemplar, 1 … Anzahl) [B-10]; bei Blöcken enthält die Gruppe die Teile der Farbe und die beiden Passermarken.
- **Wiederholung** (gleicher Auftrag, neuer Lauf): die Dateien ersetzen die bisherigen gleichen Namens — Ausnahme zu R 5.7 nur für Produktionsdateien aus dem Panel (Abschnitt 11.3) [B-8]. Ältere Bögen mit höherer Nummer bleiben liegen und werden im Popup genannt.

### 10.1 Passermarken (mehrfarbiger Plott) [PM 1–9, B-1 bis B-6]

- **Einheit**: Stück (oberste Gruppe auf einer Plott-Ebene) mit Teilen in ≥ 2 Farbschlüsseln. Einfarbige Stücke bekommen keine Marken. Nur Plott-auf-Plott; Plott auf Druck nicht in Stufe 2 [PM 9].
- **Marke**: Quadrat, geschlossener Pfad wie ein Teil, Name „Passermarke“, Füllung wie die Teile der jeweiligen Farbe (im Schneidedokument ohne Bedeutung). **Kantenlänge** in Stufen 30 / 20 / 15 / 10 / 5 mm (`passermarken.stufen_mm`): größte Stufe ≤ `anteil` (0,1) × kürzere Seite des Gruppenumrisses (Realmaß), mindestens 5 mm [PM 3, B-2].
- **Lage**: zwei Marken innerhalb des Gruppenumrisses, eine in der linken, eine in der rechten Hälfte, in Lücken mit ≥ `abstand_mm` (5) Abstand zu allen Teilen aller Farben [PM 4, PM 5]. Kandidaten auf einem Raster (Schrittweite = Kantenlänge/2) über den Umriss; gewählt wird das Paar mit der kleinsten Summe der Blockflächen je Farbe (Block = Begrenzung Teile der Farbe ∪ beide Marken), bei Gleichstand das in Rasterreihenfolge erste [B-3]. Gibt es keine Lücke in einer Hälfte: Marke außerhalb, 5 mm links bzw. rechts vom Umriss, senkrecht mittig. Reproduzierbar, in `panel/lib/passermarken.js` (reine Funktionen, Eingabe: Teile je Farbe als Rechtecke/Umrisse in mm, Ausgabe: beide Marken relativ zum Gruppenumriss und je Farbe der Block).
- **Block** je Farbe = Teile dieser Farbe + beide Marken, Lage zueinander fest; Nesting-Einheit nach §7; auf verschiedenen Farbbögen darf der Block unterschiedlich gedreht liegen [PM 7]; je Exemplar ein Block mit denselben Marken.
- **Dateien**: Marken stehen je Farbe in der `_cut`-Datei dieser Farbe innerhalb der Exemplargruppe [PM 8]. Keine eigene Datei.
- **Kalkulation**: Marken zählen nicht zu Teilen, Schnittlänge und Zeiten; der Block wirkt nur über das Nesting auf Verbrauch/EK [B-5].
- **Zusammenfassung/PDF**: keine Änderung (Marken sind keine Objekte).

## 11. Druckbögen (Druck, Export) — Teilstufe 2c

### 11.1 Druck (Aufbau)

Arbeitsdatei speichern (ungespeichert → Abbruch) [B-7] → Prüfungen → Varianten-Erkennung → Nesting je Medium + Laminat + Rolle (§7, dieselbe Rollenwahl wie die Kalkulation) → je Bogen ein Dokument (CMYK, mm; Ebenen Druck / Cut / Info; XMP §3.2 mit `bogen.arbeitsdatei` = Pfad der Arbeitsdatei) → neuer `aufbau` ins XMP der Arbeitsdatei (Id = Zeitstempel, Liste der Bögen) → der erste Bogen kommt nach vorn. Hinweise (Abweichung von der Planung ab 0,1 mm, Cutkontur ragt über die Außenkante, Abstand/OPOS-Rand unterschritten, Cutkonturen-Zahl) als ein Popup.

- **Symbole**: je `IP_Id` ein Symbol (Inhalt = Objekt 1:1 inkl. vorhandener Cutkontur, Farbfeld vorher auf „Cutkontur“ vereinheitlicht); Symbolname = Anzeigename des Objekts, bei Doppelung mit Zusatz „ (2)“, „ (3)“ [B-10]. Jedes Exemplar (Anzahl) eine Instanz `<Name> <k>`; geometrisch gleiche Variante (§3.1, `herkunft.js`) als Instanz des Original-Symbols mit ihrer Transformation, andere Variante eigenes Symbol unter ihrem Namen [R 3.4, A-2]. Instanzen tragen `IP_Herkunft` = `IP_Id` des Objekts. Objekte ohne Cutkontur bleiben so; Beschnitt und Cutkontur macht der Mensch im Bogen bzw. einmal im Symbol [R 3.5].
- **Info-Ebene** (nicht druckend, gesperrt, Text unterhalb der Zeichenfläche) wie bisher: „=== DRUCKBOGEN ===“, Kunde, Medium, Laminat, Bogen n von m (ggf. „Sonderlänge“), Rolle, Format (inkl. OPOS-Rand), Objekte mit Maßen, Länge in m, Erstellt [B-11].
- **Offene Bögen eines früheren Aufbaus** bleiben offen; der Export meldet sie („stammt aus einem früheren Aufbau – nicht gespeichert“) und übergeht sie.

### 11.2 Export

Auslöser: Button Export bei vorderem Druckbogen **oder** bei vorderer Arbeitsdatei einer kalkulierten Art (Fahrzeugbeschriftung, Beschriftung) — beides exportiert alle offenen Bögen des letzten Aufbaus dieser Arbeitsdatei; keine offen → Popup „Keine offenen Druckbögen“ [B-7, Nachfrage]. Die Arbeitsdatei muss geöffnet sein (Abgleich Bogen-XMP `bogen.arbeitsdatei` ↔ Pfad des offenen Dokuments), sonst Abbruch mit Popup; sie wird vor dem Export gespeichert [M]. Flache Arten (Lasergravur, Sonstiges, Banner/Roll-up) exportieren wie in Stufe 1 die Arbeitsdatei selbst (Profil `flach`); der Button erkennt am XMP, welcher Fall vorliegt.

Ablauf: **Sammelprüfung** über alle Bögen des Aufbaus ohne Änderung — Cutkontur je Objekt (im Symbol oder in „Cut <Name>“), danach je Bogen Marken planen (Breite nach dem Setzen der Marken ≤ Rollenbreite − 2 × 15) — alle Befunde in einem Fehler-Popup, nichts exportiert. Sonst je Bogen: Instanzen umwandeln, Cutkonturen auf Ebene Cut (Gruppe „Cut <Name>“), Farbfeld vereinheitlichen auf „Cutkontur“ [R 3.1], eigene OPOS-Marken (11.4), dann über den Exportkern `<Kunde>_<Medium>-<Laminat>-<Breite>_<NN>_druck.pdf` (Ebenen Druck + Regmark), `…_<NN>_cut.pdf` (Ebenen Cut + Regmark), `…_<NN>.ai` (alle Ebenen, Ausgangszustand) — NN = laufende Nummer je Medium + Laminat + Rolle innerhalb des Aufbaus (ebenso „n von m“ und `bogen.gesamt`; Rückfrage CC 31.10.), Laminat als Schlüssel (`matt`/`glaenzend`), Breite = gewählte Rolle [R 5.9]. Gespeicherte Bögen werden geschlossen; ein Eintrag in `exporte[]` der Arbeitsdatei mit allen Dateien; Popup nur bei Fehlern bzw. geparkten Dateien (Exportkern).

### 11.3 Exportkern-Erweiterung (Profil `produktion`)

- `exportieren()` bekommt je Datei zusätzlich `ersetzen: true` (Produktionsdateien aus dem Panel: Druckbögen, Schneidedaten): kein Hochzählen, gleicher Name; bestehende Datei lokal und auf dem Server wird ersetzt (Transfer weiterhin über `.<name>.teil` und Umbenennen, nie halbe Dateien) [B-8, Ausnahme zu R 5.7 — bestätigt Markus 30.10.]. Zusammenfassung.pdf und Arbeitsdatei-Kopien bleiben nummeriert.
- `speichern(lokalerPfad)` je Datei wird vom JSX-Kern bedient (Schneidedokument bzw. Druckbogen speichern); die drei Dateien eines Bogens sind drei Einträge.
- Arbeitsdatei-Schritt (Exportkern Nr. 8) gilt unverändert; die Arbeitsdatei wird bei Summa/Export vor Beginn gespeichert [B-7].
- Kein Schalter `plugin` [M 10]; der Rückfall (Marken von Hand mit dem Summa-Plugin, Speichern von Hand) läuft am Panel vorbei.

### 11.4 OPOS-Marken (`panel/lib/opos.js`, übernommen)

Regel OPOS_ANALYSE §4 mit P = 400 mm [R 3.6]: Bezugsrechteck = sichtbare Begrenzung aller sichtbaren Objekte der Ebenen Druck und Cut (Schnittmasken: Maskenpfad; Dreieck nicht). Ebene „Regmark“ oberste, gesperrt; Farbfeld „Regmark“ Vollton K 100; „Mark“ 3 × 3 mm, 9 mm neben dem Bezug, je Seite n mit n − 1 = max(1, ⌊l / 300⌋, ⌈(l + 21) / 400⌉); „OPOS XY Line“ (vorne = im Dokument unten) bzw. zusätzlich „OPOS XY2 Line“ (oben) als offener 3-mm-Pfad. **XY2 ab Zeichenflächenlänge ≥ 1000 mm** in Einzugsrichtung, dann Druckrichtungsdreieck 8 × 6 mm, Spitze nach unten, waagrecht mittig, senkrecht mittig zwischen XY-Linie und Zeichenflächenrand, auf Ebene Druck mit Tag `IP_Druckrichtung` (nur in der `_druck.pdf`) [B-12]. Zeichenfläche: Soll = Bezug + 22,1765 mm je Seite, kleinere Seiten erweitern, nie verkleinern; Info-Zeilen „Format“ und „Länge“ folgen. Vorhandene Regmark-Ebene wird geleert und neu gezeichnet.

## 12. Grafikzeit — Teilstufe 2d [M 1]

- **Hintergrund-Extension** `.hintergrund` (Custom, StartOn, ohne Oberfläche), keine `evalScript`-Abfragen [R 4.7]: aktives Dokument aus den Dokument-Ereignissen (`documentAfterActivate`/`-Deactivate`/`-Save`, Pfad aus den Ereignisdaten); Rolle und Zuordnung aus dem XMP der gespeicherten Datei (Node, lesend, Namespace 2.0, stückweise bis zum ersten IP-Paket, je Pfad nach Änderungszeit/Größe zwischengespeichert — `panel/lib/dokument_xmp.js` aus dem alten Projekt auf Schema 1 umgestellt). Ungespeichertes Dokument: kein Zählen.
- **Gezählt wird** jedes gespeicherte Dokument mit Panel-XMP außer Druckbögen (`rolle: "druckbogen"`, alle `bogen.art`), alle Auftragsarten [M 12]. **Geändert Fassung 8 (Markus 31.10. abends): Arbeit in Druckbögen läuft nicht in die Arbeitszeit** — keine Zählung, keine Gutschrift an die Arbeitsdatei. Schlüssel im Puffer = Pfad der Arbeitsdatei.
- **Zählen**: alle 5 s Abfrage „Illustrator vorn“ und „Sekunden seit letzter Eingabe“; aktiv, wenn vorn und Eingabe < 30 s; Zeitstempel-Differenzen, Lücken ≤ 15 s; Zähllogik `grafikzeit.Zaehler` aus dem alten Projekt (ohne Dateischreiben). Puffer schreiben alle 60 s, bei Dokumentwechsel, beim Beenden [B-14].
- **Aktivitätserkennung** `panel/lib/aktivitaet.js` mit genau einer Plattformweiche (Ausnahme zu R 7.2) [A-8]: macOS `lsappinfo front` / `lsappinfo info -only bundleid` (`com.adobe.illustrator`) und `ioreg … HIDIdleTime`; Windows PowerShell mit `GetForegroundWindow` → Prozessname `Illustrator` und `GetLastInputInfo` [B-17], als ein dauerhaft laufender PowerShell-Prozess je Illustrator-Sitzung, der die beiden Werte auf Anfrage über stdin/stdout liefert (kein Prozessstart alle 5 s) [B-18]. Schnittstelle `vorn()` → bool, `leerlaufSekunden()` → Zahl; Fehler → nicht aktiv.
- **Puffer** `grafikzeit_puffer.json` im Rechnerordner (macOS `~/Library/Application Support/PAM-Werkzeuge/`, Windows `%APPDATA%\PAM-Werkzeuge\`): `{ "<Pfad Arbeitsdatei>": [ { "id": "…", "von": "…Z", "bis": "…Z", "sekunden": 83.2 } ] }`. Beide Seiten lesen–ändern–schreiben atomar (Temp-Datei + Umbenennen); das Panel entfernt genau die übernommenen Ids [B-15]. Technischer Zwischenpuffer, der sich selbst leert — kein Informationsspeicher im Sinn von [R 5.8] [M]; Verlust nur, wenn die .ai auf diesem Rechner nie wieder angefasst wird. [A-9]
- ~~Ungespeicherte Druckbögen [B-19]~~ — entfällt mit Fassung 8: kein `grafikzeit_druckboegen.json`, keine Zuordnung über den Dokumentnamen; ersetzt FESTLEGUNGEN 2d Punkte 20–27.
- **Übernahme ins XMP**: nur das Panel schreibt (JSX), zu den erlaubten Zeitpunkten [R 4.7]: Maus ins Panel, eigene Aktion (Zuordnen, Berechnen, Summa, Druck, Export, „+m“) — und nur, wenn für die vordere Arbeitsdatei Puffereinträge vorliegen (sonst kein XMP-Schreiben, Dokument bleibt ungeändert) [B-15]. Je Puffereintrag ein Eintrag `{ von, bis, minuten (Sekunden/60 auf 0,1 gerundet), manuell: false, benutzer: null, uebertragen: false }` [B-16]. Stufe 3: Übergabe an Brian über das SDK; was mit der Zeit geschieht, ist Sache der App [M 12].
- **Feld „+m“** im Panel: ganze Minuten, auch negativ, Enter → Eintrag `{ von = bis = jetzt, minuten, manuell: true }` [R 4.8, B-16]; 0 oder keine Zahl: nichts.
- **Anzeige** „Grafik N min“ = Σ aller Einträge, ganzzahlig gerundet [B-16]; bei vorderem Druckbogen keine Grafikzeile (§13). Keine Verrechnung [P §2.7].

## 13. Panel (Stufe 2, MockUp A5/A7)

320 × 142 (Inhalt 122 px), Mindesthöhe entsprechend; Aktualisierung nur bei Maus ins Panel und nach eigener Aktion [R 4.7].
- **Zeile 1**: Kunde · Auftragsart (ohne Maßstab [M 6]) · rechts „Grafik N min“ mit Feld „+m“.
- **Zeile 2 (Objektzeile)**: Name der Auswahl (fett), rechts Folie mit Chip und Anzahl-Marke „×n“; „Keine Auswahl“ gedimmt; „Objekt in einer Unterebene“ gedimmt, wenn die Auswahl nicht aus obersten Objekten besteht; bei mehreren Objekten „n Objekte“, Folie nur wenn alle gleich.
- **Zeile 3**: **add** (Auswahl nicht oder nicht vollständig zugeordnet) bzw. **edit** · **berechnen** (rechnet, schreibt den Datensatz, öffnet/aktualisiert „Zusammenfassung“, Hinweise als ein Popup). add ist ohne Auswahl gesperrt und dann nicht orange. Orange: add, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst berechnen.
- **Zeile 4 (Werkzeugzeile, Linie)**: **Summa** · **Druck** · **Export** (orange) · **Auftrag** (Schrift orange). Export bei Arbeitsdatei einer kalkulierten Art: Druckbögen des letzten Aufbaus (11.2).
- **Zeile 5**: „Material <netto> <brutto>“ links, „inkl. Mont. <netto> <brutto>“ rechts (8.3).
- **Zustände**: alle fünf Zeilen bleiben in jedem Zustand stehen, nicht zutreffende Buttons gesperrt (FESTLEGUNGEN 2b Punkt 5); ohne Panel-Dokument nur „Auftrag“ aktiv; Arbeitsdatei anderer Auftragsart (flach): Zeile 1 mit Grafikzeit, Export und Auftrag aktiv; **Druckbogen vorn**: Zeile 1 „Kunde · Druckbogen <Medium> <Laminat> <Breite> · n/m“, nur Export und Auftrag aktiv, Zeilen 2 und 5 leer.

**Thema 6 (31.10.):** Aufbau, Zustände (ausblenden statt sperren) und Größe des Panels regelt `claude/SPEZ_03_Oberflaeche.md` §3; ersetzt die Zustandsregel oben und FESTLEGUNGEN 2b Nr. 5. Fenster „Objekt“: SPEZ_03_Oberflaeche §5; „Zusammenfassung“ 700 breit, Textil-Zeilen §7.

## 14. Aufbau im Repo, Reihenfolge, Tests

Neue/geänderte Dateien: `config/medien.json` (+ `passermarken`), `config/serien.json`, `config/farbfelder/*.ase`; `panel/lib/preisquelle.js`, `preisquelle_csv.js`, `teile.js`, `nesting.js` (Blöcke), `rollen.js`, `kalkulation.js`, `passermarken.js`, `herkunft.js`, `opos.js`, `druckbogen.js` (Aufbau/Export, aus `auftrag.js` übernommen), `schneidedaten.js` (aus `auftrag.js` übernommen), `export.js` (`ersetzen`), `zusammenfassung_pdf.js` (+ jsPDF), `aktivitaet.js`, `grafikzeit.js`, `dokument_xmp.js`; `panel/objekt.html/.js`, `zusammenfassung.html/.js`, `hintergrund.html/.js`, `fenster.js`; Erweiterungen im Manifest `.objekt` (ModalDialog), `.zusammenfassung` (Modeless), `.hintergrund` (Custom, StartOn); JSX-Kern: Objekte lesen/Tags/Umfärben/Verschieben, Hilfsdokument und Messung, Formen für den Geometrievergleich, Schneidedokumente mit Passermarken, Druckbogen mit Symbolen, Bogen lesen/vorbereiten, Marken zeichnen, Bogen speichern (Druck-PDF, Cut-PDF, .ai) und schließen. Version 3.1.0 — Manifest-Versionen rein numerisch (CEP lehnt Suffixe wie `-2a` ab; Befund Nachtrag 2d), Teilstufen nur in CHANGELOG und Commit.

Teilstufen (je ein CC-Auftrag, je Commit):
- **2a** Konfiguration, Preisquelle, Lesen/Messen, Nesting, Kalkulation, Kalkulationsdatensatz, Varianten-Erkennung — gebaut (ae835d2).
- **2b** Zuordnen-Dialog, Panel-Erweiterung, Fenster „Zusammenfassung“, Zusammenfassung.pdf — nach den freigegebenen MockUps (beauftragt).
- **2c** Passermarken, Summa, Druck, Export (Druckbögen, OPOS), Exportkern `ersetzen`, Block-Nesting in 2a.
- **2d** Grafikzeit.

Tests (so viel wie nötig, so wenig wie möglich [R 7.9]): `node --test tests/*.test.js` — 2c: Passermarken (Stufe, Lage, Block) an drei Rechteckfällen, Nesting mit Block, OPOS-Regel gegen OPOS_ANALYSE §5 (bestehende Fälle), Exportkern `ersetzen` mit Temp-Ordnern; 2d: `Zaehler` mit simulierten Ticks, Pufferübernahme (Einträge entfernen, Minutenrundung). Keine Illustrator-Läufe ohne Ansage. Doku je Teilstufe: README (Stand), CHANGELOG, TESTBERICHT, FESTLEGUNGEN.md; Commit und Push durch CC.

## 15. Ableitungen Claude — geklärt mit Markus 30.10.

1. Anzeige namenloser Objekte als „Objekt n“ (nur Anzeige, nicht gespeichert). — ok
2. Varianten-Erkennung nur bei Zuordnen, Berechnen, Summa, Druck (Textvergleich der Ids, keine Geometrie); geometrisch gleiche Variante wird Instanz des Original-Symbols, sonst eigenes Symbol. — ok
3. `grafikzeit.eintraege[].benutzer` in Stufe 2 `null`, keine Zwischenlösung über `rechner.json`. — ok
4. Keine Preislistenversion aus der CSV (kein Hash); Feld `version` bleibt in der Struktur und wird erst vom SDK gefüllt. — ok
5. Anzahl-Verrechnung: alle Stückwerte × Anzahl, Folienanteile nach Fläche über alle Exemplare. — ok
6. Inhalt des Produktionsdatenblatts (Abschnitt 9), Auslöser in „Details“. — ok
7. Dateinummer NN = Bogen im Aufbau. — ok; der Zusatz „Wiederholung → `_02`“ ist durch B-8 ersetzt (Ersetzen statt Nummerieren).
8. Aktivitätserkennung der Grafikzeit mit genau einer Plattformweiche in `panel/lib/aktivitaet.js` (Ausnahme zu R 7.2). — ok
9. Grafikzeit-Puffer je Rechner (Abschnitt 12) statt Verlust ungeschriebener Minuten; mit Auftrag in Stufe 3 ggf. direkt über das SDK. — ok

## 16. UI-Festlegungen aus der MockUp-Phase (Markus, 30.10.)

1. Panel A5: Objektzeile mit Folie und Anzahl; zwei Buttonzeilen; Preise in einer Zeile „Material“ links / „inkl. Mont.“ rechts; kein Mindestbetrag-Hinweis im Panel.
2. Ein Button „berechnen“ rechnet und öffnet die Zusammenfassung; „list“ entfällt.
3. Button-Texte als Kurzformen (add/edit, Summa, Druck, Export, Auftrag, PDF).
4. Zuordnen: Reihenfolge Digitaldruck | Plott; Farbliste des Objekts; Kacheln bleiben, Suchfeld „Farb-Nr.“; Mehrfach-Bearbeiten mit gestrichelter Anzeige bleibt; Anzahl als Feld; kein Namensfeld.
5. Ein Fenster „Zusammenfassung“ statt „Objekte“/„Details“, Objektdarstellung als einzeilige Tabelle, nichts doppelt; Fenstergrößen nach Bedarf.
6. PDF heißt `<Kunde>_Zusammenfassung.pdf`, Inhalt ohne Preise.
7. Passermarken für mehrfarbigen Plott: Regeln in Teilstufe 2c abgefragt (Abschnitt 19).

## 17. Festlegungen CC aus Teilstufe 2a — bestätigt 30.10.

1. Preisquelle als Kern + Adapter (Prüfung/Auflösung in `preisquelle.js`, Adapter liefert Zeilen). — ok
2. `laden()` nimmt das Feld `preis` der Auftragsart (`fahrzeug` | `beschriftung`) für `gilt_fuer`. — ok
3. `preise_freigegeben` als Pflichtparameter. — überflüssig, in 2b streichen
4. Nur sichtbare Objekte lesen, gemessen wird nur Zugeordnetes. — ok
5. Gesperrte Ebenen/Objekte werden zum Tag-Schreiben kurz entsperrt. — ok
6. Plott gilt immer als getapt (Zeitanteil), `tape` im Datensatz bleibt `false`. — ok
7. Komplexität bei Druck ohne Cutkontur → Stufe 0. — ok
8. Zusätzliche Prüfungen (unbekannte Attribute/Stufe/Ebenen als Warnung; Abbruch bei Druckobjekt ohne passende Rolle, Tape ohne `tape_vk_m2`, ungültiger Anzahl). — ok
9. Datensatz: `netto` nach Mindestbetrag vor Rundung; Fläche/Teile je Exemplar, Minuten/Beträge für alle; Rundung 2/4 Nachkommastellen. — ok; `mindestbetrag_greift` in 2b je Preisart (`vk`, `mindest`)
10. Varianten-Erkennung vorerst nur bei Berechnen. — ok, Zuordnen kommt in 2b dazu, Summa und Druck in 2c
11. Neue Meldungstexte („… hat eine ungültige Folie (…) – wird nicht berechnet“, „…: Anzahl „…“ ungültig – ganze Zahl ≥ 1 erforderlich“). — freigegeben

### 17.1 Teilstufe 2b — bestätigt 30.10.

FESTLEGUNGEN.md Abschnitt „2b“, Punkte 1–40: bestätigt, mit drei Änderungen (Korrektur 2b): Punkt 8 — add ohne Auswahl gesperrt und nicht orange, orange erst mit Auswahl; Punkt 13 — dritter Tape-Zustand „kein Tape“ (`kein_tape` in `IP_Attribute`, §3.1/§6); Punkt 26 — Objektzeile zeigt „Objekt in einer Unterebene“, wenn die Auswahl nicht aus obersten Objekten besteht (§13). Punkt 5 (alle fünf Panel-Zeilen bleiben in jedem Zustand stehen) ersetzt in §13 „wie Stufe 1“.

Künftig: eigene Festlegungen von CC, die über den Auftrag hinausgehen, stehen in `FESTLEGUNGEN.md` im Repo (Abschnitt je Teilstufe, nummeriert, je ein Satz), nicht verteilt in README-Absätzen; README übernimmt sie erst nach Bestätigung durch Markus.

### 17.2 Teilstufe 2c — bestätigt 31.10.

FESTLEGUNGEN.md Abschnitt „2c“, Punkte 1–30 (Commit 22f0533): bestätigt ohne Änderung. Hinweise aus der Prüfung: Punkt 2 (Marke ganz in der Hälfte) ist strenger als B-3, unkritisch; Punkt 25 (Cutkontur-Farbfeld aus `druck.cut_farbfeld`/`cut_cmyk` der Auftragsart) nutzt vorhandene Stammdaten; Rückfrage zur Nummerierung je Medium + Laminat + Rolle in §11.2 übernommen.

### 17.3 Teilstufe 2d — bestätigt 31.10.

FESTLEGUNGEN.md Abschnitt „2d“, Punkte 1–27 (Commit 3410b73 plus Nachtrag 2d in der Arbeitskopie): bestätigt; Punkt 9 (auch „berechnen“ in „Zusammenfassung“ übernimmt aus dem Puffer) und Punkt 10 (Export bei vorderem Druckbogen übernimmt für die Arbeitsdatei des Exports) auf Anweisung geändert, Punkt 19 Version `3.1.0`. Punkte 20–27 = Zuordnung ungespeicherter Druckbögen (§12). Fehlerauftrag 2b 31.10. (Zuordnen ohne Wirkung): Abschnitt „2b“ Punkte 45 (OK verwendet die wirksame Art, auch aus der Vorbelegung) und 46 (Tooltip nennt den Sperrgrund für Plott) bestätigt.

## 18. Ableitungen Claude zu 2c/2d — geklärt mit Markus 30.10.

1. Passermarken-Einheit = Stück mit Teilen in ≥ 2 Farbschlüsseln. — ok
2. Marke Quadrat, Stufen 30/20/15/10/5 mm, größte Stufe ≤ 10 % der kürzeren Umrissseite, mindestens 5. — ok
3. Lage: zwei Marken innerhalb des Umrisses (links/rechts), Lücken ≥ 5 mm, kleinste Summe der Blockflächen; ohne Lücke außerhalb 5 mm neben dem Umriss. — ok
4. Block je Farbe = Teile der Farbe + Marken, 90° drehbar, je Exemplar ein Block; einfarbige Stücke weiter als Einzelteile. — ok
5. Block auch in der Kalkulation (gleiches Nesting); Marken zählen nicht zu Teilen/Schnittlänge. — ok
6. Marken in der `_cut`-Datei je Farbe innerhalb der Gruppe. — ok
7. Summa, Druck, Export speichern zuerst die Arbeitsdatei; Export verlangt die Arbeitsdatei offen. — ok; Nachfrage Markus: Export bei vorderer Arbeitsdatei einer kalkulierten Art exportiert die offenen Druckbögen des letzten Aufbaus, keine offen → Popup; Schneidedaten nur über Summa. — ok
8. Nummerierung `_02` bei Wiederholung — **abgelehnt**; stattdessen: neue Druck-/Schneidebögen ersetzen die bisherigen gleichen Namens (Ausnahme zu R 5.7 nur für Produktionsdateien aus dem Panel), ältere Bögen mit höherer Nummer bleiben liegen und werden genannt; Arbeitsdatei-Kopien und Zusammenfassung.pdf bleiben nummeriert. — ok
9. Hinweis „Veraltete Datei aus früherem Lauf“ entfällt. — ok (bleibt in der Form „ältere Bögen mit höherer Nummer“ nach Punkt 8)
10. Symbolname = Anzeigename (bei Doppelung „ (2)“), Instanzen/Gruppen „<Name> <k>“, Varianten eigenes Symbol unter ihrem Namen. — ok
11. Info-Ebene wie bisher (Kunde, Medium, Laminat, Bogen n von m, Rolle, Format, Objekte, Länge, Erstellt). — ok
12. Druckrichtungsdreieck wie `opos.js` (vorne = XY-Linie unten, 8 × 6 mm), P = 400 mm. — ok
13. Abbruchgrund „doppelte Objektnamen“ entfällt. — ok
14. Grafikzeit zählt jedes gespeicherte Panel-Dokument; Druckbogen über `bogen.arbeitsdatei` (aufgehoben Fassung 8: Druckbögen zählen nicht); 5 s Abfrage, Puffer alle 60 s, bei Dokumentwechsel und Beenden. — ok
15. Pufferformat mit Ids, atomares Schreiben, Panel entfernt übernommene Ids; XMP-Schreiben nur bei vorhandenen Einträgen. — ok
16. `minuten` auf 0,1 gerundet; „+m“ mit `von` = `bis` = jetzt; Anzeige ganzzahlig; `benutzer null`, `uebertragen false`. — ok
17. Windows-Zweig PowerShell `GetForegroundWindow`/`GetLastInputInfo`, macOS `lsappinfo`/`ioreg`. — ok
18. Windows: ein dauerhafter PowerShell-Prozess je Sitzung statt Start alle 5 s. — ok (30.10.)
19. Ungespeicherte Druckbögen über eine Zuordnungsdatei Dokumentname → Arbeitsdatei im Rechnerordner gutschreiben, sofern die Ereignisdaten den Namen liefern. — ok (31.10., Namen werden geliefert); aufgehoben Fassung 8

## 19. Antworten Markus zu Passermarken und 2c/2d (30.10.)

1. Auslöser: eine Gruppierung von Objekten mit unterschiedlichen Farbschlüsseln.
2. Form: Quadrat.
3. Größe in Abstufungen; Ziel 30 × 30 mm, Minimum 5 × 5 mm bei kleinen Teilen.
4. Zwei Marken, eher links und eher rechts innerhalb der Gruppierung; die Teile gleicher Farbe sollen nicht unnötig Platz auf dem Nutzen verschwenden.
5. Abstand zum Umriss mindestens 5 mm.
6. Teile gleicher Farbe innerhalb einer Gruppierung dürfen in ihrer Lage zueinander nicht verändert werden.
7. Der Block darf gedreht werden.
8. Marken in der `_cut`-Datei — sie müssen sich am Ende überlagern.
9. Nur bei Gruppierungen unterschiedlicher Plottfarben (nicht Plott auf Druck).
10. Export erfolgt aus der Arbeitsdatei heraus; Arbeitsdatei speichern, bevor der Export beginnt.
11. ~~Arbeit in Druckbögen zählt als Grafikzeit des Auftrags.~~ — aufgehoben 31.10. abends: Arbeit in Druckbögen zählt nicht.
12. Grafikzeit immer zählen, immer an Brian übergeben; was mit der Zeit passiert, ist Sache der App.
