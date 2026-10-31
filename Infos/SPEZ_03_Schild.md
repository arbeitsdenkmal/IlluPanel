# Spezifikation „Schild“ (Thema 3 der SDK-unabhängigen Reste)

Stand: 31.10.2026, Fassung 2 (gebaut 3.4.0; Festlegungen CC bestätigt §12). Grundlage: Register 2.8, 1.8, 1.13 (Stand 31.10., mit den Änderungen aus diesem Thema), `claude/SPEZ_01_Fundament.md` §5–§8, `claude/SPEZ_02_Kalkulation_Produktion.md` Fassung 7 (§5 Lesen/Messen, §6 Zuordnen, §10 Summa, §11 Druckbögen), `claude/SPEZ_03_Konfigurationen.md` (Wahl-Objekt §2.1, `IP.pdfSpeichern` mit Dokument-Anschnitt §7), gebauter Stand 3.2.0 bzw. 3.3.0 (Thema 2), altes Projekt `~/tools/folienkalkulation` (`createSchild`, `schildRegeln`, `materialZuordnen`, `schildName`, `sonderExport`, CHANGELOG Stufen 14, 28, 33) als Nachschlagewerk. Alle offenen Fragen und Ableitungen sind mit Markus geklärt (31.10.).

**Oberfläche (Thema 6, 31.10.):** Platzierung, Gestaltung und Fenstergrößen regelt `claude/SPEZ_03_Oberflaeche.md`; die hier als vorläufig bezeichneten Stellen sind dort ersetzt (§16). Funktion und Texte bleiben, soweit dort nichts anderes steht.

## 1. Umfang

- **Schild Folie und UV-Druck** vollständig nutzbar: Anlegen mit Verfahren und Material, Zuordnen, Bohrungen je Schild, Schildregeln, Export je Schild und Technik.
- **Laserdatei** für PMMA bis 600 × 300 mm, automatisch beim Export.
- **Lochmarkierungen** in der Druck-PDF bei Verfahren Folie.
- **Plott** auf Schild über Summa, **Druck mit Cutkontur** über die Druckbögen — beides wie Beschriftung.
- **Schilddaten** im XMP (Verfahren, Material, Endmaß, Bohrungen je Schild) als Grundlage für die Schildkalkulation der App [R 1.13]; in Stufe 3 geht derselbe Datensatz nach Supabase.
- **Austauschstelle Stufe 3**: Verfahren und Material laufen als Wahl-Objekt ins Anlegen (§2.3).
- Darstellung im Panel, im Dialog und im Fenster „Schilder“: SPEZ_03_Oberflaeche §3, §4, §8.

Nicht enthalten: Schildpreis im Panel [R 1.13], Stückzahl der Schilder (kommt in Stufe 3 von der App, bis dahin keine), Supabase/SDK, Spiegeln von UV-Hinten und Weißkanal (macht der RIP), Tischbelegung UV (RIP), Sammelordner (Schild-Dateien nur im Auftragsordner).

## 2. Grundlagen

### 2.1 Schild = Zeichenfläche

- Ein Schild ist eine Zeichenfläche der Arbeitsdatei mit Inhalt auf einer Produktionsebene (Plott, Digitaldruck, UV-Vorn, UV-Hinten). Zeichenflächen ohne solchen Inhalt sind kein Schild (keine Dateien, kein Eintrag in den Schilddaten).
- Gleiche Schilder = eine Zeichenfläche; die Stückzahl kommt in Stufe 3 aus der App, das Panel führt bis dahin keine.
- Nummer `NN` = Reihenfolge der Zeichenfläche im Dokument (01, 02 …); Anzeige „Schild NN“.

### 2.2 Eine Arbeitsdatei = ein Verfahren, ein Material

- Ein App-Produkt „Schild“ hat genau ein Material; unterschiedliche Materialien sind unterschiedliche Produkte. Gemischte Aufträge (UV und Folie) bekommen je Verfahren eine eigene Arbeitsdatei.
- Verfahren und Material werden beim Anlegen gewählt und gelten für alle Schilder der Arbeitsdatei. Ein Wechsel geht nur über ein neues Anlegen mit der Arbeitsdatei als Quelle (§4).

### 2.3 Wahl-Objekt (Erweiterung SPEZ_03_Konfigurationen §2.1)

```
schild: { verfahren: "folie" | "uv", material: "<schluessel aus schild_materialien.csv>" }
```

Im Weg „ohne Auftrag“ baut `anlegen.js` (Dialogseite) das Objekt aus den Feldern; `jsxSpec` liest nur das Wahl-Objekt (bisher `e.verfahren`). Stufe 3 bildet es aus dem App-Produkt: Verfahren aus dem Typ (SIGN_FOIL → `folie`, SIGN_UV → `uv`), Material aus dem Produkt (Feld klärt Stufe 3 mit Brian).

## 3. Konfiguration

### 3.1 `config/schild_materialien.csv` (neu, pflegt Markus)

```
schluessel;bezeichnung;kuerzel;staerke;acryl
dibond-3;Dibond 3 mm;Dib;3;nein
forex-3;Forex 3 mm;PVC;3;nein
forex-5;Forex 5 mm;PVC;5;nein
forex-10;Forex 10 mm;PVC;10;nein
acryl-3;Acryl 3 mm;PMMA;3;ja
acryl-5;Acryl 5 mm;PMMA;5;ja
acryl-8;Acryl 8 mm;PMMA;8;ja
acryl-10;Acryl 10 mm;PMMA;10;ja
```

- `staerke` in mm, Dezimalkomma oder -punkt erlaubt; `acryl` `ja`/`nein`.
- Startprüfung wie `produkte.csv`: Datei lesbar, Kopfzeile mit allen fünf Spalten, `schluessel` eindeutig und nicht leer, `bezeichnung` und `kuerzel` nicht leer, `staerke` > 0, `acryl` aus `ja`/`nein`. Fehler → Popup mit Datei, Zeile und Grund; die Art Schild ist dann im Dialog gesperrt, alle anderen Arten bleiben nutzbar.

### 3.2 `config/auftragsarten/schild.json` (geändert)

- `materialien[]` entfällt, dafür `"materialien": "config/schild_materialien.csv"`.
- `verfahren` unverändert: `folie` → `Schild.ait` (5 mm Dokument-Anschnitt), Ebenen Sandbox, Plott, Digitaldruck; `uv` → `UV-Schild.ait` (2 mm), Ebenen Sandbox, Plott, UV-Vorn, UV-Hinten. Der Anschnitt kommt ausschließlich aus der .ait.
- `vorlage` (oberste Ebene) entfällt; die Vorlage kommt je Verfahren.
- `werkzeuge`: `["summa", "druck"]` (bisher nur Summa).
- `export`:

```json
"export": {
  "profil": "schild", "preset": "pam x4", "dateiname": null, "anschnitt": "dokument",
  "techniken": [
    { "rolle": "digitaldruck", "name": "druck" },
    { "rolle": "uv-vorn",      "name": "uv-vorn" },
    { "rolle": "uv-hinten",    "name": "uv-hinten" }
  ],
  "laser": { "name": "laser", "max_mm": [300, 600], "kontur_pt": 0.25,
             "umriss_cmyk": [0, 100, 0, 0], "loch_cmyk": [100, 0, 0, 0] }
}
```

  Die bisherigen Angaben `anschnitt: "vorlage"` und `vorlage: UV-Schild.ait` je Technik (Hilfsdokument) entfallen.
- Neu `bohrungen`:

```json
"bohrungen": {
  "standard": { "anordnung": "ecken", "abstand_x_mm": 20, "abstand_y_mm": 20, "durchmesser_mm": 5 },
  "markierung": { "durchmesser_mm": 2, "cmyk": [100, 0, 0, 0] }
}
```

- `uv_max_mm` [420, 594], `komplexitaet`, `laminate`, `arten`, `ebenen`, `nesting`, `zeichenflaechen_abstand_mm` unverändert.
- Startprüfung ergänzt: `materialien` zeigt auf eine lesbare Datei, `bohrungen.standard` vollständig mit Werten > 0, `export.laser` vollständig.

## 4. Anlegen

- Dialog bei Art Schild (Darstellung SPEZ_03_Oberflaeche §4): Verfahren „Folie“ / „UV-Druck“ wie gebaut, darunter Auswahlliste „Material“ mit `bezeichnung` in CSV-Reihenfolge, keine Vorauswahl. „Let's go“ gesperrt, solange Verfahren oder Material fehlt.
- Arbeitsdatei wie gebaut: Vorlage des Verfahrens; mit Quelle Zeichenflächen wie in der Quelle (nebeneinander, `zeichenflaechen_abstand_mm`), Inhalt je Zeichenfläche auf die Sandbox; ohne Quelle die Zeichenfläche der Vorlage.
- Arbeitsdatei Schild als Quelle: gleiches Verfahren → Inhalte in die gleichnamigen Ebenen; anderes Verfahren → alles auf die Sandbox. Schilddaten (Bohrungen) der Quelle werden nicht übernommen.
- XMP-Bereich `schild` (§5) beim Anlegen geschrieben, mit festgeschriebenem Material.

## 5. XMP (Ergänzung SPEZ_01 §5.1)

```json
"schild": {
  "verfahren": "uv",
  "material": { "schluessel": "acryl-5", "bezeichnung": "Acryl 5 mm", "kuerzel": "PMMA", "staerke": 5, "acryl": true },
  "schilder": [
    { "rect": [0, 595.28, 841.89, 0], "name": "Zeichenfläche 1", "nr": 1, "breite_mm": 297, "hoehe_mm": 210,
      "bohrungen": { "anordnung": "ecken", "abstand_x_mm": 20, "abstand_y_mm": 20, "durchmesser_mm": 5 } }
  ]
}
```

- Das Material wird beim Anlegen vollständig aus der CSV festgeschrieben; eine spätere Änderung der CSV ändert bestehende Arbeitsdateien nicht.
- `schilder[]`: Zuordnung Eintrag ↔ Zeichenfläche wie im alten Projekt (`materialZuordnen`): zuerst über das Rechteck (pt, 0,01 genau), sonst über den Namen; Umbenennen und Umsortieren ändern die Zuordnung nicht. Eine Zeichenfläche ohne Eintrag gilt mit `bohrungen.standard`.
- `nr`, `breite_mm`, `hoehe_mm` (Endmaß = Zeichenfläche, Realmaß) werden bei OK im Fenster „Schilder“ und bei jedem Export aus dem Dokument neu geschrieben.
- Diese Angaben sind die Schilddaten für die App-Kalkulation (BRIEFING_Brian §4): Verfahren, Material, Endmaß und Bohrungen je Schild; die Stückzahl ergänzt Stufe 3 aus der App.
- `parsen()` ergänzt einen fehlenden Bereich mit `null`; unbekannte Felder bleiben erhalten.

## 6. Bohrungen

### 6.1 Modell

| `anordnung` | Bohrungen | Lage (Lochmitte bis Außenkante der Zeichenfläche) |
|---|---|---|
| `ecken` | 4 | `abstand_x_mm` von links bzw. rechts, `abstand_y_mm` von oben bzw. unten |
| `mitte_oben_unten` | 2 | waagrecht mittig, `abstand_y_mm` von oben bzw. unten |
| `mitte_links_rechts` | 2 | senkrecht mittig, `abstand_x_mm` von links bzw. rechts |
| `keine` | 0 | — |

- `durchmesser_mm` gilt für alle Bohrungen eines Schildes. Jede Kombination aus Anordnung, Abstand und Durchmesser ist erlaubt (z. B. 2 mittig, 10 mm, Ø 3 mm).
- Prüfung bei OK: Werte > 0; jede Bohrung liegt vollständig auf dem Schild (Abstand ≥ halber Durchmesser) und die Bohrungen überschneiden sich nicht (bei `ecken`: 2 × Abstand + Durchmesser ≤ Breite bzw. Höhe). Fehler → Popup `Schild NN: Bohrungen passen nicht auf das Schild`, Fenster bleibt offen.
- Die Lochmitten berechnet `panel/lib/schild.js` aus Zeichenfläche und Bohrungsangabe; Druck-PDF (§9.2) und Laserdatei (§9.3) nutzen dieselbe Berechnung.

### 6.2 Fenster „Schilder“

- Neues Fenster `.schilder` (ModalDialog), geöffnet über den Button „Schilder“ im Panel (§7). Kopf: Verfahren · Material (nur Anzeige aus dem XMP).
- Eine Zeile je Zeichenfläche mit Inhalt: „Schild NN“, Maß „B × H mm“, Anordnung (Auswahl „4 Ecken“, „2 mittig oben/unten“, „2 mittig links/rechts“, „keine“), daneben nur die Felder, die die Anordnung braucht: „Abstand waagrecht“, „Abstand senkrecht“ (mm), „Durchmesser“ (mm). Vorbelegung aus dem XMP, sonst `bohrungen.standard`.
- OK schreibt `schilder[]` (§5), Abbrechen verwirft. Enter = OK, Esc = Abbrechen. Darstellung: SPEZ_03_Oberflaeche §8 (Karte je Schild mit Bohrungsskizze, 560 × 400).

## 7. Panel-Zustand (Profil `schild`)

- Zeile 1 mit Grafikzeit wie gebaut.
- Zeile 3: add/edit wie bei Beschriftung; zusätzlich Button „Schilder“. berechnen und die Preiszeile werden bei Schild nicht benötigt und sind ausgeblendet bzw. leer (SPEZ_03_Oberflaeche §3.2).
- Zeile 4: Summa, Druck, Export und Auftrag aktiv. Summa verarbeitet nur Plott-Objekte, Druck nur Digitaldruck-Objekte mit Cutkontur (§8.3).
- Werkzeugzeile aus Thema 1 unberührt.
- Die Freigaben in `main.js` hängen bisher an „kalkuliert“; für Schild gelten sie über das Profil `schild` und `werkzeuge`, nicht über `kalkulation`.

## 8. Zuordnen, Lesen und Messen

### 8.1 Zuordnen (Ergänzung SPEZ_02 §6)

- Bei Schild bietet das Fenster „Objekt“ nur die Arten der Ebenen des Verfahrens: Folie → Digitaldruck, Plott; UV-Druck → Plott, UV-Vorn, UV-Hinten.
- **UV-Vorn / UV-Hinten**: keine Folie, kein Laminat, keine Komplexität, keine Aufschläge, kein Tape, keine Anzahl. Die Art ergibt sich aus der Ebene; OK vergibt `IP_Id` und legt das Objekt positionsgleich auf die Ebene der Rolle. Ein Objekt auf einer UV-Ebene mit `IP_Id` gilt als zugeordnet (Objektzeile zeigt statt der Folie den Ebenennamen).
- **Digitaldruck / Plott**: wie SPEZ_02 §6, bei Schild ohne Tape (SPEZ_03_Oberflaeche §5) (Medium, Laminat, Farben, Anzahl, Aufschläge, Komplexität nach [R 1.8]: Plott immer, Druck nur mit Cutkontur).
- Komplexität wird bei Schild gesetzt und mit den Objektdaten geführt, wirkt im Panel aber auf nichts (keine Kalkulation).
- Ragt die Auswahl über mehrere Zeichenflächen: Fußzeile `Objekt ragt über mehrere Zeichenflächen`, OK gesperrt (Text aus dem alten Projekt).

### 8.2 Schildregeln (Summa, Druck, Export)

`panel/lib/schild.js` aus `schildRegeln` des alten Projekts, angepasst. Geprüft vor Summa, Druck und Export; Fehler sperren, Warnungen erscheinen gesammelt als ein Popup (gleichartige zusammengefasst).

- Fehler: `„<Objekt>“ ragt über mehrere Zeichenflächen` · `Schild NN: UV und Plott zusammen` · fehlender oder unvollständiger XMP-Bereich `schild` → `Schild: Verfahren oder Material fehlt`.
- Warnungen: `Schild NN: UV-Hinten auf <Material>` (Material nicht Acryl) · `Schild NN: UV-Vorn bzw. UV-Hinten größer als A2 (B × H mm)` (`uv_max_mm`, beide Ausrichtungen).
- Entfällt gegenüber dem alten Projekt: „Digitaldruck und Plott zusammen“ (Plott und Druck mit Cutkontur auf einem Schild sind zulässig, ohne Meldung) und „kein Material“ (Material je Arbeitsdatei, Pflicht beim Anlegen).

### 8.3 Summa und Druck

- **Summa**: Plott-Objekte aller Schilder wie Beschriftung (SPEZ_02 §10: Nesting je Farbschlüssel, Passermarken bei mehrfarbig, Schneidedaten).
- **Druck**: nur Digitaldruck-Objekte **mit** Cutkontur, wie Beschriftung (SPEZ_02 §11: Druckbögen, OPOS-Marken, `aufbau` im XMP). Keine Lochmarkierungen auf Druckbögen.
- Digitaldruck-Objekte **ohne** Cutkontur gehen nicht auf Druckbögen, sondern in die Druck-PDF je Schild (§9.2).
- Lesen und Messen nach SPEZ_02 §5; bei Schild (keine Kalkulation) entfallen die Preisprüfungen „Serie/Medium ohne Preis“ und „Preisquelle fehlerhaft“ — Serie bzw. Medium müssen nur in `serien.json` bzw. `medien.json` bekannt sein.

## 9. Export (Profil `schild`)

### 9.1 Ablauf

Neues Modul `panel/lib/export_schild.js` nach dem Muster von `export_flach.js`; der Export-Button ruft es bei Profil `schild` auf.

1. Schildregeln (§8.2); Fehler → Abbruch.
2. `schilder[]` mit Nummer und Endmaß aktualisieren (§5).
3. Je Schild die Dateien nach §9.2–§9.4, je Datei `IP.pdfSpeichern` mit Preset „pam x4“, nur dieser Zeichenfläche (`artboardRange`), nur der Ebene der Technik (übrige ausgeblendet, danach wiederhergestellt), ohne Bearbeitungsdaten, ohne PDF-Ebenen, **Anschnitt aus dem Dokument** (`spec.anschnitt: "dokument"`, SPEZ_03_Konfigurationen §7).
4. Liegt ein Druckbogen-Aufbau vor (`aufbau` im XMP), exportiert derselbe Klick zusätzlich dessen Druckbögen wie bei Beschriftung (SPEZ_02 §11.2).
5. Ablage über den Exportkern nur im Auftragsordner [R 5.2, 5.5, 5.7], kein Sammelordner; Arbeitsdatei-Kopie in den Server-Auftragsordner wie gebaut; `exporte[]` im XMP wie gebaut.

Temporäre Elemente (Lochmarkierungen, Laser-Umriss und -Löcher) liegen auf einer eigenen temporären Ebene, werden nur für die jeweilige PDF erzeugt und danach entfernt; die Arbeitsdatei bleibt unverändert.

### 9.2 Druckdaten

- **Folie** — `druck`: je Schild mit Digitaldruck-Objekten ohne Cutkontur; Objekte mit Cutkontur ausgeblendet (die gehen über die Druckbögen). Lochmarkierungen: je Lochmitte ein Kreis Ø `markierung.durchmesser_mm` (2 mm), Füllung `markierung.cmyk` (100 % C), keine Kontur; bei `anordnung: keine` keine Markierungen.
- **UV** — `uv-vorn`, `uv-hinten`: je Schild und vorhandener Technik, nicht gespiegelt, kein Weiß (beides macht der RIP), keine Lochmarkierungen.

### 9.3 Laserdatei

- Entsteht, wenn das Material `acryl` ist und das Schild in eine der beiden Lagen von `laser.max_mm` passt (Breite ≤ 300 und Höhe ≤ 600 oder Breite ≤ 600 und Höhe ≤ 300, Grenze eingeschlossen) — bei beiden Verfahren, automatisch mit dem Export der Druckdaten. Sonst keine Laserdatei.
- Inhalt: Umriss der Zeichenfläche (Endformat, ohne Anschnitt) als Kontur `laser.umriss_cmyk` (100 % M), je Bohrung ein Kreis mit `durchmesser_mm` als Kontur `laser.loch_cmyk` (100 % C); Konturstärke `laser.kontur_pt` (0,25 pt), keine Füllungen, alle übrigen Ebenen ausgeblendet.
- PDF wie §9.1 Schritt 3 inklusive Dokument-Anschnitt der Arbeitsdatei.

### 9.4 Dateinamen

`<Kunde>_<technik>_NN_<Kürzel>-<Stärke>.pdf` [R 5.9] mit `technik` aus `techniken[].name` bzw. `laser.name`, Stärke mit Komma bei Dezimalwerten (wie `schildName` im alten Projekt), Kunde umgeschrieben wie bisher. Beispiele: `Mueller_druck_01_Dib-3.pdf`, `Mueller_uv-vorn_02_PMMA-5.pdf`, `Mueller_laser_02_PMMA-5.pdf`. Nummerierung ohne Überschreiben (`_02` …) über den Exportkern [R 5.7].

## 10. Stufe 3 (nur Austauschstellen, nicht Teil dieses Themas)

- Wahl-Objekt `schild` aus dem App-Produkt (§2.3).
- Stückzahl je Schild aus der App in `schilder[]`.
- Schilddaten (§5) über das SDK an das Produkt in Supabase; Schildpreis rechnet die App [R 1.13].

## 11. Repo, Doku, Tests

- Neu: `config/schild_materialien.csv`, `panel/lib/schild.js` (Zuordnung Eintrag ↔ Zeichenfläche, Schildregeln, Lochmitten, Laserregel, Dateinamen), `panel/lib/export_schild.js`, `panel/schilder.html/.js`, Extension `.schilder` im Manifest.
- Geändert: `config/auftragsarten/schild.json`, `panel/lib/konfiguration.js` (CSV, `bohrungen`, `export.laser`), `panel/lib/anlegen.js`, `panel/anlegen.html/.js` (Material, Wahl-Objekt), `panel/lib/dokument.js` (Bereich `schild`), `panel/main.js` (Zustand Profil `schild`, Button „Schilder“, Export), `panel/objekt.js`, `panel/lib/zuordnen.js` (Arten je Verfahren, UV), `panel/lib/teile.js` (Preisprüfungen nur bei Kalkulation), JSX-Kern (Zeichenflächen mit Rechteck und Name, temporäre Ebene mit Kreisen/Umriss, `pdfSpeichern` mit `artboardRange` und nur einer Ebene). Version 3.4.0.
- Tests [R 7.9]: `node --test tests/*.test.js`. Neu nur: `schild_materialien.csv` gültig (in der bestehenden Konfigurationsprüfung) und ein Test für `schild.js` (Lochmitten je Anordnung, Laserregel an der Grenze 300 × 600 in beiden Lagen). Schlägt ein bestehender Test nur wegen der beauftragten Änderung fehl, wird nur diese Erwartung angepasst. Keine Illustrator-Läufe; Probe durch Markus.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Schild“. Kein Commit, kein Push, außer der Auftrag nennt es.

## 12. Festlegungen CC (bestätigt durch Markus 31.10.)

Aus `FESTLEGUNGEN.md` Abschnitt „Schild“ (Bau 3.4.0), unverändert übernommen.

- **12.0** (Rückfrage CC, entschieden 31.10.): `schild.json` bekommt den Block `druck` wie Beschriftung (Startprüfung verlangt ihn); Schild lädt die Preisliste ohne Auftragsart (nur allgemeine Prüfungen, Einträge „alle“) für Komplexitätsstufen, Aufschläge und Tape-Schwellen, ist sie fehlerhaft, läuft Schild still ohne diese weiter.
- **12.1** Medien für Digitaldruck bei Schild kommen aus `medien.json` ohne die Plott-Serien aus `serien.json`, Reihenfolge wie dort.
- **12.2** Fehlt `materialien` in `schild.json` oder ist die CSV nicht lesbar, gilt das wie ein CSV-Fehler („Feld materialien fehlt“, „Datei fehlt“): nur Schild gesperrt, nicht das ganze Panel (wie Offset, Konfigurationen Punkt 5).
- **12.3** Grundtexte der Material-Prüfung: „kuerzel fehlt“, „staerke muss > 0 sein“, „acryl „…“ unbekannt (ja oder nein)“, sonst wie `produkte.csv`; beide CSV-Prüfungen laufen über eine gemeinsame Funktion `csvAusText`.
- **12.4** Die Startprüfung verlangt zusätzlich `bohrungen.markierung` (Durchmesser > 0, CMYK) und `export.techniken` (rolle, name); Texte „Feld bohrungen.standard unvollständig (…)“, „Feld bohrungen.markierung unvollständig (…)“, „Feld export.techniken fehlt (…)“, „Feld export.laser unvollständig (…)“, „Feld druck unvollständig (…)“.
- **12.5** Anlegen: unbekanntes Material → „Material „…“ fehlt in schild_materialien.csv“; `schilder` ist nach dem Anlegen leer (`[]`).
- **12.6** Eine Schild-Quelle ohne Bereich `schild` (älteres Dokument) gilt als anderes Verfahren: alles auf die Sandbox.
- **12.7** Inhalt eines Schildes sind die obersten sichtbaren Objekte der Produktionsebenen, zugeordnet oder nicht, mit ihrer sichtbaren Begrenzung; Objekte außerhalb jeder Zeichenfläche zählen nicht (wie im alten Projekt).
- **12.8** Ein unbenanntes Objekt heißt in „ragt über mehrere Zeichenflächen“ wie in den Prüfungen von `teile.js`: „unbenanntes Objekt (<Typ>) ragt über mehrere Zeichenflächen“.
- **12.9** Gleichartige Warnungen der Schildregeln (gleicher Text nach „Schild NN: “) stehen in einer Zeile „Schild 01, 02: …“.
- **12.10** `schilder[]`: Endmaß auf 0,01 mm, Rechteck auf 0,01 pt gerundet; gespeichert werden nur die Felder der Anordnung (`keine`: nur `anordnung`); weitere Felder eines bisherigen Eintrags bleiben erhalten (Stufe 3).
- **12.11** Fenster „Schilder“: ModalDialog 560 × 360 (jetzt 560 × 400, SPEZ_03_Oberflaeche §14), Debug-Port 8094, CSEvent `de.pamnm.illupanels.schilderFertig`; Maß „B × H mm“ auf 0,1 mm mit Komma; Eingabe mit Komma oder Punkt; beim Wechsel der Anordnung bleiben die eingegebenen Werte stehen; leere oder ungültige Werte gelten als „Bohrungen passen nicht auf das Schild“; alle betroffenen Schilder stehen in einem Popup, je Zeile eines.
- **12.12** Fenster „Schilder“ ohne Schild (keine Zeichenfläche mit Inhalt) zeigt nur den Kopf, OK schreibt eine leere Liste; ohne vollständigen Bereich `schild` Popup „Schild: Verfahren oder Material fehlt“, das Fenster schließt.
- **12.13** Panel: Button „Schilder“ nur bei Profil `schild` sichtbar; „berechnen“ ist bei Schild nie orange; UV-Objekte zeigen kein „×n“.
- **12.14** Fenster „Objekt“: eine Vorauswahl, die das Verfahren nicht hat (z. B. Sandbox → Digitaldruck bei UV-Druck), gilt als keine („Art wählen“); „ragt über mehrere Zeichenflächen“ wird je Objekt der Auswahl an der sichtbaren Begrenzung geprüft (wie im alten Projekt).
- **12.15** OK mit UV-Vorn/UV-Hinten entfernt `IP_Folie`, `IP_Laminat`, `IP_Anzahl`, `IP_Komplexitaet`, `IP_Attribute` und holt Originalfarben eines als Plott umgefärbten Objekts zurück wie Digitaldruck.
- **12.16** ~~Der Tape-Tooltip „Tape: erst nach „berechnen““ bleibt bei Schild bis zur MockUp-Runde unverändert, obwohl Schild nicht berechnet; ohne Tape-Schwellen gibt es keinen Tape-Vorschlag.~~ — ersetzt (Thema 6, Markus 31.10.): bei Schild gibt es keinen Tape-Button (SPEZ_03_Oberflaeche §5).
- **12.17** Summa und Druck: die Schildregeln laufen vor dem Lesen und Messen; ihre Warnungen stehen am Ende des Popups.
- **12.18** Export-Popup: Meldung des Exportkerns, Zeilen des Druckbogen-Exports, Warnungen der Schildregeln.
- **12.19** Druckbögen exportiert der Schild-Export nur, wenn Bögen des letzten Aufbaus offen sind, sonst still (kein „Keine offenen Druckbögen“); dann kopiert nur der Druckbogen-Export die Arbeitsdatei auf den Server (neu im Exportkern `arbeitsdatei.kopie: false`), damit es eine Kopie je Klick gibt.
- **12.20** Ohne Schild-Dateien und ohne offene Bögen läuft der Exportkern ohne Dateien (Arbeitsdatei-Kopie, Eintrag in `exporte[]`), ohne Meldung.
- **12.21** Export: nach dem Schreiben von `schilder[]` wird die Arbeitsdatei gespeichert; die Druck-PDF (Folie) entsteht nur, wenn auf dem Schild mindestens ein Digitaldruck-Objekt ohne Cutkontur liegt; die Laserdatei entsteht auch bei Anordnung „keine“ (nur Umriss).
- **12.22** Temporäre Elemente liegen auf einer obersten Ebene „IP_temp“ mit CMYK-Farben ohne Farbfelder; die Ebene wird vor dem Zurückspeichern der Arbeitsdatei entfernt.
- **12.23** `IP.dokumentInfo` liefert je Zeichenfläche zusätzlich Name und Rechteck (pt); das Fenster „Objekt“ nutzt das für die Zeichenflächen-Prüfung.
- **12.24** Ist ein Druckbogen einer Schild-Arbeitsdatei vorn, exportiert „Export“ wie bei Beschriftung nur die Druckbögen.
- **12.25** Die Regel „Schild: Verfahren oder Material fehlt“ verlangt ein Verfahren der Auftragsart und ein Material mit Kürzel und Stärke > 0.
- **12.26** Im Dateinamen wird der Kunde wie bisher umgeschrieben (`ablage.dateiname`), Kürzel und Stärke bleiben unverändert.
- **12.27** `dokument.neu()` schreibt `schild` immer (`null` für die übrigen Arten); Version 3.4.0 in Manifest (alle Extensions) und `dokument.PANEL_VERSION`.
