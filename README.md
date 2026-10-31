# PAM-Werkzeuge (Illustrator-Panel)

CEP-Erweiterung für Illustrator (Bundle `de.pamnm.illupanels` 3.1.0-2c, Panel „PAM-Werkzeuge“). Stand: Stufe 1 „Fundament“ nach `Infos/SPEZ_01_Fundament.md`, Stufe 2a „Kalkulationskern“, 2b „Oberfläche“ und 2c „Produktionsdaten“ nach `Infos/SPEZ_02_Kalkulation_Produktion.md` (Fassung 5) und den MockUps `Infos/mockups/MOCKUP_STUFE2.html` (Panel A5/A7, Fenster „Objekt“ B3/B4, Fenster „Zusammenfassung“ C3, `<Kunde>_Zusammenfassung.pdf`). Supabase/SDK und Grafikzeit (2d) sind nicht enthalten.

Eigene Festlegungen von Claude Code, die über den Auftrag hinausgehen, stehen nummeriert je Teilstufe in `FESTLEGUNGEN.md`; dieses README übernimmt sie erst nach Bestätigung durch Markus.

## Aufbau

```
CSXS/manifest.xml        Extensions .panel (Panel 320 × 142, min. 320 × 142), .anlegen (ModalDialog 420 × 420), .objekt (ModalDialog 480 × 470),
                         .zusammenfassung (Modeless 620 × 520, skalierbar); ILST [28.0, 99.9], CSXS 12, Node an
.debug                   Debug-Ports 8088 (.panel), 8089 (.anlegen), 8090 (.objekt), 8091 (.zusammenfassung)
FESTLEGUNGEN.md          eigene Festlegungen je Teilstufe (nummeriert, Status)
panel/
  index.html, main.js    Panel (A5/A7)
  anlegen.html, .js      Dialog „ohne Auftrag“
  objekt.html, .js       Fenster „Objekt“ (Zuordnen, B3/B4)
  zusammenfassung.html, .js  Fenster „Zusammenfassung“ (C3)
  gemeinsam.js           Host-Aufruf (evalScript), JSX-Kern laden, Popup, Hell/Dunkel, CSEvents, Übergabedatei Panel -> „Objekt“
  fenster.js             Fenster „Objekt“/„Zusammenfassung“: Abbrechen/Schließen und Esc
  style.css, fenster.css
  lib/                   reine Node-Module ohne Illustrator-Bezug (CommonJS, Node 17)
    konfiguration.js     rechner.json, schema.json, Auftragsarten, Mapping laden und prüfen
    dokument.js          Dokumentschema (XMP-JSON), xmpLesen/xmpSchreiben über den JSX-Kern
    tags.js              Prüfung der IP_*-Tags gegen schema.json
    ablage.js            Dateinamen, Nummerierung, Erreichbarkeit (3 s), .teil-Transfer
    export.js            Exportkern (mit „ersetzen“ für Produktionsdateien)
    export_flach.js      Profil „flach“
    anlegen.js           Anlegen „ohne Auftrag“
    ase.js, farben.js    Oracal-ASE lesen, Farbfeldnamen → Folienschlüssel
    preisquelle.js       Preisquellen-Schnittstelle, Prüfung und Auflösung der Preisliste
    preisquelle_csv.js   Entwicklungsquelle Infos/Stammdaten/preisliste.csv
    teile.js             Stücke, Teile, Messung, Prüfungen, Varianten-Erkennung, Hinweise
    rollen.js            Rollenbreiten, Nutzbreiten, Druckmaße aus medien.json
    nesting.js           MaxRects-Nesting Plott und Druck, Anzahl als Exemplare
    passermarken.js      Passermarken mehrfarbiger Plott-Stücke: Kantenlänge, Lage, Blöcke je Farbe
    kalkulation.js       Rollenwahl, Kalkulation PREISLOGIK v6, Kalkulationsdatensatz
    herkunft.js          Geometrievergleich der Varianten, Symbole je IP_Id
    opos.js              eigene OPOS-Marken (Regel OPOS_ANALYSE §4)
    schneidedaten.js     Summa: Bögen, Dateinamen, Ist-Lage, ältere Bögen
    druckbogen.js        Druck: Aufbau planen (Symbole, Info, Bogen-XMP); Export: Dateinamen, ältere Bögen
    auftrag.js           Abläufe ohne Oberfläche: berechnen, summa, druck, exportDruckboegen
    zuordnen.js          Regeln des Fensters „Objekt“ (Vorauswahl, gemeinsame Werte, Farben, Medienliste, Tags), Anzeige von Folie und Zahlen
    zusammenfassung.js   Zeilen der Objekttabelle, Folien und Summen für Fenster und PDF
    zusammenfassung_pdf.js  <Kunde>_Zusammenfassung.pdf mit jsPDF (jspdf.umd.min.js, Lizenz LICENSE)
jsx/illupanels.jsx       ExtendScript-Kern, nur Dokumentzugriff (XMP, Tags, Ebenen, Zeichenflächen, Objekte und Auswahl lesen und messen, Zuordnen mit Umfärben, Auswählen,
                         Schneidedokumente, Druckbögen mit Symbolen, Bogen prüfen/vorbereiten, Marken zeichnen, Speichern)
config/
  schema.json            XMP-Namespace, Schemaversion, Rollen, Felder der Rolle druckbogen, Tag-Namen (einzige Quelle)
  auftragsarten/*.json   acht Auftragsarten
  mapping.json           App department/type → Auftragsart
  medien.json            Rollenbreiten, Randabzug Plott 25, Druckmaße, Schwelle Rollenwahl, Passermarken, Alias
  serien.json            Oracal-Bibliothek → Farbschlüssel und Preisserie
  farbfelder/*.ase       ORACAL 651, 751 C, 951, 970 glossy, 970 matt (Kopien; Illustrators Verknüpfungen bleiben, wie sie sind)
  rechner.beispiel.json  Vorlage für die Datei je Rechner
  vorlagen/*.ait         Schild, UV-Schild, Offset, Etikett, Bögl Nummern Masterdatei
tests/*.test.js          node --test
Infos/                   Referenz; einzige Ausnahme: Infos/Stammdaten/preisliste.csv ist die Entwicklungsquelle der Preise
```

Plattformunterschiede stehen nur in `rechner.json`; `process.platform` wird nur in `konfiguration.js` (Pfadauflösung, Ort der rechner.json) benutzt.

## Panel (SPEZ_02 §13, MockUp A5/A7)

- Start: lädt `rechner.json`, `schema.json`, die acht Auftragsarten, das Mapping, `medien.json` (inkl. Block `passermarken`), `serien.json` mit den fünf ASE-Dateien und prüft sie; dazu die Preisliste (allgemeine Prüfungen, jede Serie mit Standardbreite in `medien.json`). Jeder Fehler → ein Popup mit Datei und Grund, die Buttons bleiben gesperrt. Danach JSX-Kern laden und `IP.init(schema)` (Tag-Namen und Namespace kommen nur aus `schema.json`).
- 320 × 142 (Inhalt 122 px), fünf Zeilen:
  1. **Kunde** · Auftragsart (ohne Maßstab) · rechts „Grafik N min“ (Σ `grafikzeit.eintraege`) mit Feld „+m“ (ohne Funktion bis 2d).
  2. Objektzeile: Name der Auswahl (fett), rechts Folie mit Chip und „×n“; „Keine Auswahl“ gedimmt; „Objekt in einer Unterebene“ gedimmt, wenn die Auswahl nicht aus obersten Objekten besteht; mehrere: „n Objekte“, Folie nur, wenn alle gleich.
  3. **add** (Auswahl nicht oder nicht vollständig zugeordnet) bzw. **edit** → Fenster „Objekt“ · **berechnen** → `auftrag.berechnen()`, öffnet bzw. aktualisiert „Zusammenfassung“, Hinweise als ein Popup. add ist ohne Auswahl gesperrt und dann nicht orange. Orange: add, sobald eine Auswahl nicht oder nicht vollständig zugeordnet ist, sonst berechnen.
  4. Werkzeugzeile: **Summa** (Schneidedaten), **Druck** (Druckbögen aufbauen) · **Export** (orange; Profil „flach“ bzw. Druckbögen des letzten Aufbaus) · **Auftrag** (Schrift orange, Dialog `.anlegen`).
  5. Preiszeile aus dem Datensatz im XMP (VK): „Material <netto> <brutto>“ links (= nur Aufkleber), „inkl. Mont. <netto> <brutto>“ rechts, netto gerundet, brutto fett; leer ohne Datensatz. Kein Mindestbetrag-Hinweis im Panel.
- Zustände (alle fünf Zeilen bleiben stehen, nicht zutreffende Buttons gesperrt): ohne Panel-Dokument nur „Auftrag“ aktiv; Arbeitsdatei einer Auftragsart ohne Kalkulation zusätzlich Zeile 1 (Export bei Profil „flach“); kalkulierte Arbeitsdatei: Summa, Druck, Export aktiv; Druckbogen vorn: Zeile 1 „Kunde · Druckbogen <Medium> <Laminat> <Breite> · n/m“ (`bogen.nr`/`bogen.gesamt`), nur Export und Auftrag aktiv, Zeilen 2 und 5 leer.
- Export: Profil „flach“ über den Exportkern wie in Stufe 1; kalkulierte Arbeitsdatei oder Druckbogen vorn: Druckbögen des letzten Aufbaus (unten).
- Aktualisierung nur bei Maus ins Panel, nach eigener Aktion und nach CSEvent aus „Objekt“ und „Zusammenfassung“; keine Dauerabfragen, kein Abruf bei Fenster-Fokus, weil ein Fokus-Abruf während des PDF-Imports den Inhalt im falschen Dokument landen ließ (Befund Stufe 43). Hell/Dunkel über `ThemeColorChanged`.
- Fehler als Popup, keine Erfolgsmeldungen.

## Fenster „Objekt“ (Zuordnen, SPEZ_02 §6, MockUp B3/B4)

ModalDialog 480 × 470 (eine Höhe für den Plott-Zustand, Inhalt oben ausgerichtet), geöffnet über add/edit im Panel und per Doppelklick in „Zusammenfassung“ (über das Panel). Übergabe Panel → Fenster über eine Datei im temporären Ordner, Rückmeldung per CSEvent.

- **Art** Digitaldruck | Plott, **Anzahl** (ganze Zahl ≥ 1). Vorauswahl: Art nach Tag, sonst Sandbox → Digitaldruck, sonst nach Ebene; Medium/Laminat/Serie aus XMP `vorauswahl` (ohne Eintrag 3551 matt, 751C).
- **Plott**: „Farben im Objekt“ – je Füllfarbe der Auswahl eine Zeile (Chip, Name, „✓ <Schlüssel>“ bei erkannter Oracal-Farbe oder bekannter `farbzuordnung`, sonst „→ zuordnen“); die markierte Zeile bekommt die nächste Wahl, danach springt die Markierung zur nächsten offenen Zeile. Serie 651 · 751C · 951 · 970G · 970M, Feld „Farb-Nr.“ filtert die Kacheln (Teiltreffer der Nummer; ohne Serie alle Serien; genau ein Treffer + Enter übernimmt), Kachelraster aus den ASE (LAB → sRGB). OK erst, wenn alle Zeilen zugeordnet sind. Konturen, Bilder und Verläufe sperren Plott.
- **Digitaldruck**: Medium (Kürzel aus der Preisliste, Reihenfolge wie dort), Laminat matt | glänzend (3676 nur glänzend).
- **Komplexität** K0–K3 nur bei Plott und Druck mit Cutkontur (Tooltip aus `komplexitaet()`); **Aufschläge** aus `aufschlaege()` (Tooltip mit Wert), bei Druck zusätzlich Tape mit drei Zuständen, Klick schaltet weiter: „Tape auto“ (kein Wert in `IP_Attribute`, der Vorschlag aus dem letzten Berechnen gilt) → „Tape“ (`tape`, manuell an) → „kein Tape“ (`kein_tape`, manuell aus); der Tooltip nennt den Vorschlag, unterschiedliche Zustände sind gestrichelt.
- **Mehrfachauswahl**: ein Dialog, gleiche Werte für alle; unterschiedliche Werte gestrichelt bzw. leer, geändert nur bei neuer Wahl; gemischte Art → Art ungewählt, Farb-/Medienbereich aus.
- **OK**: Varianten-Erkennung, `IP_Id` vergeben, falls fehlend, Tags schreiben, bei Plott umfärben (Farbfeld anlegen/wiederverwenden, Originalfarben im Tag `IP_Originalfarbe` am Pfad bzw. Textrahmen, bei Text je Zeichen), bei Digitaldruck Originalfarben zurückholen; Objekte positionsgleich auf die Ebene der Rolle; `vorauswahl`/`farbzuordnung` ins XMP; CSEvent an Panel und „Zusammenfassung“. **Enter** = OK, **Esc** = Abbrechen; der Fuß zeigt die erste offene Warnung, OK ist dann gesperrt.

## Fenster „Zusammenfassung“ (SPEZ_02 §9, MockUp C3)

Modeless 620 × 520, skalierbar; ersetzt „Objekte“ und „Details“. Liest beim Öffnen und nach CSEvent aus Panel und „Objekt“; Daten aus dem Datensatz im XMP plus aktueller Objektliste (`IP.objekteLesen` ohne Messen).

1. **Objekte**: Objekt (Farbstreifen Plott/Druck, Name; Varianten eingerückt unter dem Original mit „· Variante“), Anzahl, Folie, Attribute (nur Abweichungen: K1–K3, Sicke, Wölbung, Tape), Teile, m² (Stückfläche × Anzahl), Betrag, inkl. M. – Werte aus dem letzten Datensatz, sonst „–“; darunter „Ohne Zuordnung (n) – wird nicht berechnet“ mit Ebene. Scrollt ab etwa 12 Zeilen, Folien und Summen bleiben sichtbar. Klick wählt in Illustrator aus (Cmd: dazu/weg, Shift: Bereich), Doppelklick öffnet „Objekt“ über das Panel.
2. **Folien**: Folie, Rolle, Bögen, lfm, m² Verbrauch, EK €.
3. **Summen**: Material; Produktion (min); Montage (min, davon je Auftrag); „nur Aufkleber“ und „inkl. Montage“ gerundet mit brutto „inkl. MwSt. n %“, je darunter „Mindest-VK (<Satz> €/h)“ netto/brutto; Hinweis „Mindestbetrag Produkt/Montage greift“ an der Preiszeile, bei der er greift.
4. **Grafik** abgesetzt: „Grafik N min (a auto, m manuell) · <Satz> €/h“ und Betrag.
5. Fuß: **berechnen** (wie im Panel), **PDF**, **Schließen** (auch Esc).

**PDF** `<Kunde>_Zusammenfassung.pdf` (jsPDF): Kopf (Kunde, Auftragsart, Datum, Maßstab), Objekttabelle und Folien wie im Fenster, Warnungen des Laufs – ohne Summen, Preise, EK und Grafik. Vorher wird automatisch berechnet; Ablage über den Exportkern in den Auftragsordner (Nummerierung `_02` bei Wiederholung), Eintrag in `exporte[]`.

## Konfiguration je Rechner (`rechner.json`)

Ort: macOS `~/Library/Application Support/PAM-Werkzeuge/rechner.json`, Windows `%APPDATA%\PAM-Werkzeuge\rechner.json`. Nicht im Repo. `~` und `%VAR%` werden aufgelöst. Geprüft beim Start: Datei vorhanden, gültiges JSON, alle vier Pfadfelder vorhanden. Die Server-Erreichbarkeit wird erst bei Bedarf geprüft.

macOS (MacBook):

```json
{
  "rechner": "MacBook",
  "server": {
    "kunden": "/Volumes/Server A-Z/_03_Kunden A-Z",
    "dtf_bestellen": "/Volumes/Server A-Z/_02_Produktion/= DTF bestellen ="
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
    "dtf_bestellen": "Y:\\_02_Produktion\\= DTF bestellen ="
  },
  "lokal": {
    "arbeitsdateien": "server",
    "ausgang": "%LOCALAPPDATA%\\PAM-Werkzeuge\\Ausgang"
  }
}
```
- `server.kunden`: Wurzel des A–Z-Baums; Kundenordner stehen im XMP relativ dazu (`M/Mustermann`).
- `lokal.arbeitsdateien`: Pfad = lokaler Ort der Arbeitsdateien (`<Pfad>/<Kunde>/<Auftragsordner>/Arbeitsdatei.ai`); `"server"` = direkt im Server-Auftragsordner.
- `lokal.ausgang`: dort schreibt der Export zuerst. Mac: Schreibtisch = Parkplatz bei Fehlschlag. Windows: technischer Zwischenordner; bei Fehlschlag Popup, die Datei bleibt dort.

## Einrichtung

macOS (Entwicklung): Verknüpfung `~/Library/Application Support/Adobe/CEP/extensions/de.pamnm.illupanels` → Projektordner, `PlayerDebugMode` 1 für CSXS 12. Illustrator lädt damit direkt aus dem Projektordner; das alte Panel ist nicht mehr geladen.

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
  "grafikzeit": { "eintraege": [] }, "vorauswahl": {}, "farbzuordnung": {}, "kalkulation": null, "aufbau": null,
  "exporte": [ { "zeit": "…Z", "ordner": "M/Mustermann/2026-10-30_Sonstiges", "dateien": [ { "name": "Mustermann_druck.pdf", "uebertragen": true } ], "uebertragen": true } ] }
```

Unbekannte Felder bleiben beim Ändern und Schreiben erhalten. `aufbau` = letzter Druckbogen-Aufbau `{ id, zeit, boegen: [{ medium, laminat, breite_mm, nr }] }`. `exporte[].ordner` ist relativ zu `server.kunden`, `null` ohne Server-Ordner. Bekannte Felder ab Stufe 2 (`vorauswahl` {}, `farbzuordnung` {}, `kalkulation` null, `aufbau` null) ergänzt `parsen()` mit Standardwert, wenn sie in einem älteren Dokument fehlen. `kalkulation` = letzter Kalkulationsdatensatz (unten), `farbzuordnung` = colorKey → Folienschlüssel. Druckbogen-Dokumente (`rolle: "druckbogen"`, Maßstab 1, `auftrag` und `ablage` aus der Arbeitsdatei) tragen zusätzlich `bogen { aufbau, medium, laminat, breite_mm, nr, gesamt, arbeitsdatei }` (in `schema.json` unter `rollenfelder`); `nr`/`gesamt` zählen je Medium + Laminat + Rolle, `arbeitsdatei` ist der Pfad der Arbeitsdatei.

**Objektebene (Tags):** `IP_Id`, `IP_Folie`, `IP_Laminat`, `IP_Anzahl`, `IP_Komplexitaet`, `IP_Attribute`, `IP_Herkunft`, `IP_Original`, `IP_Position`, `IP_Verfahren`, `IP_Stufen`, `IP_Farbe`, `IP_Originalfarbe`, `IP_Druckrichtung` – Namen nur in `config/schema.json` („tags“: Schlüssel → Name). JSX `IP.tagsLesen(item)` → `{schluessel: wert|null}`, `IP.tagsSchreiben(item, obj)` (null/"" entfernt); Node `tags.tagsPruefen(schema, obj)` prüft Schlüssel und Textwerte.

Bedeutung (SPEZ_02 §3.1): `IP_Id` Schlüssel des Objekts (Text); `IP_Folie` Plott-Farbschlüssel `751C-031` bzw. Druckmedium `3551`; `IP_Laminat` `matt`/`glaenzend` (nur Druck); `IP_Anzahl` ganze Zahl ≥ 1, fehlt = 1; `IP_Komplexitaet` `0`–`3`; `IP_Attribute` kommagetrennt aus `sicke`, `woelbung`, `tape` (Tape manuell an), `kein_tape` (Tape manuell aus), ohne beides gilt der Vorschlag; `IP_Original` Id des Originals bei Varianten; `IP_Herkunft` (nur auf Druckbögen) `IP_Id` des Objekts, dessen Symbolinstanz das ist; `IP_Druckrichtung` (nur auf Druckbögen) Druckrichtungsdreieck, Wert `1`; `IP_Originalfarbe` gesicherte Originalfarbe eines beim Zuordnen als Plott umgefärbten Pfads bzw. Textrahmens (JSON wie bisher). Objektname frei, ohne Namen Anzeige „Objekt n“ (laufende Nummer der berechneten Stücke in Ebenenreihenfolge, nicht gespeichert).

## Auftragsarten

| Datei | Name | Reihenf. | Kalk. | Ebenen | Maßstab | Zeichenfläche | Quelle → | Export |
|---|---|---|---|---|---|---|---|---|
| fahrzeugbeschriftung | Fahrzeugbeschriftung | 1 | ja | Sandbox, Fahrzeugkontur (gesperrt), Plott, Digitaldruck | 1:30 | neu 210 × 297; mit Fahrzeugvorlage: vorlage | Sandbox | produktion |
| beschriftung | Beschriftung | 2 | ja | Sandbox, Cut, Print, Foto | 1:1 | neu 1000 × 1000 | Sandbox | produktion |
| schild | Schild | 3 | nein | Sandbox, Plott, Digitaldruck, UV-Vorn, UV-Hinten (je Verfahren) | 1:1 | vorlage | Sandbox | schild |
| banner_rollup | Banner/Roll-up | 4 | nein | – | 1:1 | abfrage; mit Auftrag: app | bleibt | flach `druck` |
| lasergravur | Lasergravur | 5 | nein | – | 1:1 | fest 600 × 300 | bleibt | flach `laser` |
| offset | Offset-Daten | 6 | nein | – | 1:1 | produktvorlage | bleibt | offset |
| textil | Textil | 7 | nein | Design | 1:1 | mockup | Design | textil |
| sonstiges | Sonstiges | 8 | nein | – | 1:1 | abfrage (vorbelegt 600 × 300) | bleibt | flach `druck` |

Pflichtfelder je Datei: `id`, `name`, `reihenfolge`, `kalkulation`, `ebenen[] {name, rolle, gesperrt}`, `massstab.standard` (1 | 30), `zeichenflaeche {art, breite_mm?, hoehe_mm?, fahrzeugvorlage?, mit_auftrag?}`, `quelle.sandbox` (Ebenenname | null), `export {profil, preset, dateiname}`. Optional `komplexitaet`, `verfahren`; unverändert aus den Stammdaten übernommen `vorlage`, `druck`, `nesting`, `laminate`, `werkzeuge`, `arten`, `aktiveEbene`, `dateien`, `materialien`, `uv_max_mm`, `hilfslinien`, `summa`, `preis`, `export.techniken`, `export.anschnitt`. Prüfung beim Start: alle acht Dateien lesbar, Pflichtfelder, Ebenen- und Rollennamen eindeutig, `quelle.sandbox` ist eine Ebene, Export-Profil bekannt (`flach`, `offset`, `produktion`, `schild`, `textil`), jede Zielart im Mapping vorhanden.

## Anlegen „ohne Auftrag“ (Dialog „Auftrag“)

- Auftragsarten: Fahrzeugbeschriftung, Beschriftung, Schild, Banner/Roll-up, Lasergravur, Sonstiges (Reihenfolge aus der Konfiguration). Kundenname. Quelle: geöffnete Datei / Datei öffnen / leer (Standard: geöffnete Datei, ohne Dokument „leer“).
- Artabhängig: Fahrzeugbeschriftung Häkchen „Fahrzeugvorlage“ (nur Quelle mit Inhalt ohne Panel-XMP); Schild Folie / UV-Druck (Pflicht); Sonstiges und Banner/Roll-up Breite, Höhe, Anzahl Zeichenflächen; bei einer .ai-Quelle ohne Panel-XMP Maßstab 1:1 (Standard) / 1:30.
- Ablauf: Kundenordner sicherstellen (wie Export Schritt 1; Mac ohne Server: ohne Abfrage weiter) → Auftragsordner `JJJJ-MM-TT_<Auftragsart>` → Arbeitsdatei erzeugen → XMP → speichern als `Arbeitsdatei.ai` in `<arbeitsdateien>/<Kunde>/<Auftragsordner>/` bzw. bei `"server"` im Server-Auftragsordner. Belegt (lokal: Arbeitsdatei vorhanden; Server: Ordner vorhanden) → `_02`, `_03`.
- Grundlage je Art:
  - neu (Beschriftung, Fahrzeug ohne Vorlage): neues Dokument in mm, Ebenen nach Konfiguration, Quellinhalt als Block mittig auf Zeichenfläche 1 auf die Sandbox.
  - Fahrzeugvorlage: die Quelle wird zur Arbeitsdatei, ihre Ebenen liegen in „Fahrzeugkontur“; nicht skaliert.
  - vorlage (Schild): Dokument aus `Schild.ait` bzw. `UV-Schild.ait` mit den Ebenen des Verfahrens; mit Quelle Zeichenflächen wie in der Quelle (nebeneinander, 10 mm), Inhalt je Zeichenfläche auf die Sandbox; ohne Quelle die Zeichenfläche der Vorlage.
  - Lasergravur, Sonstiges, Banner/Roll-up: Kopie der Quelle mit unveränderten Ebenen (leer: neues Dokument); Zeichenflächen immer nach Konfiguration (600 × 300 bzw. Abfrage), mehrere nebeneinander mit 10 mm Abstand, die erste mittig auf der bisherigen Zeichenfläche 1.
- Quelle: geöffnete Datei → Duplikat bzw. Dateikopie (gespeicherte .ai), das Original bleibt unverändert offen; Datei öffnen → wird im Dialog geöffnet und danach ohne Speichern geschlossen oder per „Speichern unter“ zur Arbeitsdatei, die Datei selbst bleibt unverändert.
- Gleiche Auftragsart (Panel-XMP) und gleicher Maßstab → Inhalt in die gleichnamigen Ebenen (ohne Ebenen der Rolle „vorlage“); sonst Sandbox. Maßstabswechsel: skaliert um Quelle/Ziel (Konturen und Effekte mit), Ergebnis auf der Sandbox; bei Arten ohne Sandbox wird der ganze Inhalt um die Mitte von Zeichenfläche 1 skaliert.
- Textil und Offset sind im Dialog nicht enthalten; der Zweig „Auftrag“ (Produktliste über das SDK) folgt in Stufe 2.

## Exportkern (`panel/lib/export.js`)

`exportieren(auftrag, umgebung)` mit `auftrag = { xmp, dateien: [{ name, speichern(lokalerPfad), ersetzen }], dtf: [name …] }` → `{ ok, ordner, dateien[], geparkt[], fehler[], meldung, xmp }`. `ersetzen: true` (Produktionsdateien aus dem Panel: Schneidedaten, Druckbögen): gleicher Name ohne Hochzählen, eine bestehende Datei lokal und auf dem Server wird ersetzt (Transfer weiter über `.teil` und Umbenennen); Zusammenfassung.pdf und Arbeitsdatei-Kopien bleiben nummeriert.

1. Kundenordner: aus dem XMP; sonst Server prüfen (`fs.access`, 3 s). Erreichbar → Ordnerdialog ab `server.kunden`, gültig nur `<Buchstabe>/<Kunde>` (sonst Popup und erneut, Abbruch beendet ohne Popup). Nicht erreichbar: `"server"` → Popup, Abbruch; sonst ohne Kundenordner weiter (Dateien bleiben lokal).
2. Auftragsordner auf dem Server anlegen; ist er von einem anderen Auftrag belegt, `_02`, `_03` und ins XMP. Eigener Ordner = die Arbeitsdatei liegt darin oder ein Export dieses Dokuments ging dorthin.
3. Lokal: `<ausgang>/<Kunde>/<Auftragsordner>/`.
4. Namen fortlaufend ohne Überschreiben, erste freie Nummer gegen lokalen und Server-Ordner (außer `ersetzen`).
5. `speichern()` je Datei, danach Existenz und Größe > 0; Fehler → Popup, Abbruch vor dem Transfer.
6. Transfer: Kopie als `.<name>.teil`, Größenvergleich, Umbenennen, dann lokal löschen. Fehler: `.teil` weg, Datei bleibt lokal (geparkt).
7. DTF: zusätzliche Kopie nach `server.dtf_bestellen`, gleiches Verfahren, Nummerierung gegen den Sammelordner; Fehler nur für die DTF-Kopie.
8. Arbeitsdatei (nur bei lokalem `arbeitsdateien`, alle Dateien übertragen): wird gespeichert und als Kopie in den Server-Auftragsordner gelegt, fortlaufend nummeriert (`Arbeitsdatei.ai`, `Arbeitsdatei_02.ai` …).
9. XMP: Eintrag in `exporte[]` – wird vor Schritt 8 geschrieben, damit die Server-Kopie ihn enthält.
10. Popup nur bei Fehlern bzw. lokal liegenden Dateien. Leere lokale Ausgangsordner werden entfernt.

**Profil „flach“:** Lasergravur `<Kunde>_laser.pdf`, Sonstiges und Banner/Roll-up `<Kunde>_druck.pdf` (Kunde mit umgeschriebenen Umlauten); Preset der Auftragsart („pam x4“), alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen; danach ist das Dokument wieder die Arbeitsdatei.

## Preisquelle (`panel/lib/preisquelle.js`, `preisquelle_csv.js`)

`preisquelle(adapter, { medien })` → `laden(auftragsart)` → `{ ok, version, stand, quelle, zeilen[], fehler[] }` (auftragsart = `preis` der Auftragsart, `fahrzeug` | `beschriftung`), danach `z(name, verfahren)` (Auftragsart vor `alle`, Verfahren vor `alle`), `serie(schluessel)` → `{ verfahren, ek_m2, vk_m2, tape_vk_m2 }`, `parameter(name)`, `aufschlaege()` → `[{ schluessel, bezeichnung, prozent | minuten }]`, `komplexitaet()` → `[{ stufe, prozent, bezeichnung }]`. Der Adapter liefert nur Zeilen; Prüfung und Auflösung liegen in `preisquelle.js`, Stufe 3 tauscht nur den Adapter.

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
- Anlegen: „Kundenname fehlt“; „<Art>: Verfahren wählen“; „Breite und Höhe angeben“; „Anzahl Zeichenflächen angeben“; „Kein Kundenordner – Arbeitsdatei kann nicht auf dem Server angelegt werden“; „Vorlage nicht gefunden: …“; „Kein Dokument geöffnet“.

## Tests

`node --test tests/*.test.js` (System-Node, ohne Illustrator): Konfiguration (acht Arten, Mapping, Schema, bewusst fehlerhafte Dateien), `rechner.json` Mac und Windows, XMP-JSON, Nummerierung gegen zwei Ordner, Exportkern mit Temp-Ordnern (Erfolg, `ersetzen`, Transfer schlägt fehl → geparkt ohne `.teil`, DTF-Kopie); Preisquelle mit der echten CSV und einer fehlerhaften Kopie, Kalkulation „Streifen“ (PREISLOGIK §11) als 2 Stücke und als 1 Stück mit Anzahl 2, Nesting mit Anzahl und Plott-Nutzbreite, Varianten-Erkennung, Datensatz-Struktur über `berechnen()` mit Host-Attrappe; Passermarken an drei Rechteckfällen (Lücke, keine Lücke, kleine Gruppe), Nesting mit Block, OPOS-Regel gegen die 40 Fälle aus `Infos/OPOS_ANALYSE.md`. Ausprobieren in Illustrator macht Markus nach einem Neustart von Illustrator.
