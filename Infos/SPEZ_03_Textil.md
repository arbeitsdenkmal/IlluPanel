# Spezifikation „Textil“ (Thema 4 der SDK-unabhängigen Reste)

Stand: 31.10.2026, Fassung 2 (gebaut 3.5.0; Festlegungen CC geprüft §14, drei Korrekturen beauftragt — §2.2, §3.2, §7, §9.1 entsprechend ergänzt). Grundlage: Register 2.2, 2.11, 1.8, 1.10, 1.11, 3.3, 5.3, Mapping TEXTILE (Stand 31.10., mit den Änderungen aus diesem Thema), `claude/PREISLOGIK.md` §13 (neu, Textil Flex/Flock), `claude/SPEZ_01_Fundament.md` §5–§8, `claude/SPEZ_02_Kalkulation_Produktion.md` Fassung 7 (§3 Tags, §5 Lesen/Messen, §7 Nesting, §8 Kalkulation, §9 Zusammenfassung, §10 Summa und Passermarken, §13 Panel), `claude/SPEZ_03_Konfigurationen.md` (Wahl-Objekt §2.1, `IP.pdfSpeichern` §7), `claude/SPEZ_03_Schild.md` (Muster), gebauter Stand 3.4.0, altes Projekt `~/tools/folienkalkulation` (`panel/lib/textil.js`, JSX `createTextil`, `textilStofffarbe`, `textilZuordnen`, `ankerNamen`, `textilMotive`, `textilMotivPdf`, `textilNamenPdf`, `textilFlexPdf`, `textilInfos`, Fenster „Motiv“ 44B mit `MOCKUP_STUFE44.html`, README „Auftragsart Textil“) als Nachschlagewerk. `claude/SPEZIFIKATION_Textil.md` (19.10.) ist durch diese Spezifikation ersetzt. Alle offenen Fragen und Ableitungen sind mit Markus geklärt (31.10., zwei Runden).

**Oberfläche (Thema 6, 31.10.):** Platzierung, Gestaltung und Fenstergrößen regelt `claude/SPEZ_03_Oberflaeche.md`; die hier als vorläufig bezeichneten Stellen sind dort ersetzt (§16). Funktion und Texte bleiben, soweit dort nichts anderes steht.

## 1. Umfang

- **Anlegen Textil** im Weg „ohne Auftrag“ (Notweg [R 2.11]): Marke → Modell → Textilfarbe, Arbeitsdatei = Kopie des MockUps `Korrekturabzug_<ID>.ai`.
- **Textilfarbe ändern** (Fenster) und **Modell hinzufügen** (weitere Arbeitsdatei im selben Auftragsordner).
- **Zuordnen im Fenster „Motiv“** — Optik, Aufteilung und Funktion wie 44B [R 2.11]; neu: Verfahren **Flock**, Serie und Flexfarbe je Füllfarbe bei Flex/Flock, Komplexität bei Flex/Flock [R 1.8], blockout auch bei Flex/Flock.
- **Fenster „Zusammenfassung“** bei Textil (ersetzt das alte Fenster „Motive“), `<Kunde>_Zusammenfassung.pdf`.
- **Export**: DTF und Stick je Motiv und Druckgröße, Namen-Bögen, Korrekturabzug-PDF; DTF-Dateien (auch Namen-Bögen) zusätzlich in den DTF-Sammelordner [R 5.3].
- **Summa**: Flex-/Flock-Streifen je Serie und Farbe, automatisch bis 1500 mm Länge [R 3.3], Passermarken bei mehrfarbigen Motiven wie bei Beschriftung.
- **Kalkulation Flex/Flock** nach PREISLOGIK §13 [R 2.2]: ein Preis, Mindestbetrag 5,40 € je Motiv je Textil, Rundung 0,10 €.
- **XMP-Bereich `textil`** (Modell, Textilfarbe) und Tags der Motive.
- **Austauschstelle Stufe 3**: Modell und Textilfarbe laufen als Wahl-Objekt ins Anlegen (§2.4).
- Darstellung im Panel und in allen Fenstern: SPEZ_03_Oberflaeche §3, §4, §6, §7, §9, §10.

Nicht enthalten: Supabase/SDK (Modell, Textilfarbe, Mengen und Größen aus der App, Kundenfreigabe über den Korrekturabzug [R 6.12]), Preise für DTF, Stick, Namen und das Textil selbst, Sammelbögen DTF (der Zulieferer nestet), Sammelordner für Stick, Spiegeln (macht der Plotter), die MockUps selbst (Markus überarbeitet alle; bis sie in `config/mockups` liegen, ist Textil im Dialog gesperrt, §3.3) und die Anker-Korrekturen in den MockUps, die Skripte „MockUp zu Real“/„Real zu MockUp“ (Altlast, bleiben unangetastet im Skriptordner, kommen nicht ins Panel).

## 2. Grundlagen

### 2.1 Arbeitsdatei = MockUp-Kopie, ein Modell je Arbeitsdatei

- Die Arbeitsdatei ist eine Kopie des MockUps des Modells, gespeichert als `Korrekturabzug_<ID>.ai` (ID = Text der Ebene „ID“ des MockUps); dieselbe ID ein zweites Mal im selben Auftragsordner → `Korrekturabzug_<ID>_02.ai`. Das MockUp selbst wird nie gespeichert.
- Mehrere Modelle in einem Auftrag = mehrere Arbeitsdateien im selben Auftragsordner (§6 „Modell hinzufügen“). Ein Korrekturabzug je Modell.
- Ebenen aus dem MockUp: Anker, ID, Stofffarbe, Textil, Infos, Design. Panel-Ebene ist „Design“ (Rolle `textil`); Quellinhalt landet auf „Design“ (Block mittig auf Zeichenfläche 1, unskaliert, wie im alten Projekt ab Stufe 20). Arbeitsdatei Textil als Quelle: nur die Ebene „Design“ wird übernommen. Maßstab 1:1.
- Zeichenfläche 1 des MockUps ist der Korrekturabzug (A4).

### 2.2 Motiv, Druckgrößen, Exemplare

- **Motiv** = oberstes Objekt bzw. Gruppe auf „Design“ mit `IP_Id` und `IP_Position`. Objektname wie SPEZ_02 §3.1 [M 3]: frei, keine Pflicht; Anzeige ohne Namen „Objekt n“. Die automatische Namensvergabe „<Position> n“ des alten Projekts entfällt.
- **Druckgrößen** je Motiv (1 … n): `{ mass_mm, bezug: "Breite" | "Höhe", menge, groessen, blockout, zeigen, koerpergroesse_cm }`. Genau eine Druckgröße hat `zeigen: true` — in dieser Größe liegt das Motiv im Korrekturabzug. `koerpergroesse_cm` nur bei „Kinder“ (sonst `null`), damit das Fenster „Motiv“ beim nächsten Öffnen wieder „Kinder“ mit der Körpergröße zeigt.
- **Exemplar** = ein Druck einer Druckgröße; `menge` ist die Zahl der Exemplare. `menge` ist das Textil-Gegenstück zu `IP_Anzahl` [R 3.4]; `IP_Anzahl` wird bei Textil nicht geschrieben.
- Das Motiv steht in der Arbeitsdatei im MockUp-Maß: Realmaß der `zeigen`-Druckgröße / Faktor des Modells (Faktor = `realmass_mm / dateimass_mm`, §3.2). Export und Streifen skalieren jedes Exemplar absolut auf `mass_mm` seiner Druckgröße (Bezug Breite bzw. Höhe, Konturen und Effekte mit, wie `skalieren` im alten JSX).

### 2.3 Verfahren

| Verfahren | geschnitten | kalkuliert [R 2.2] | Ausgabe | blockout | Komplexität [R 1.8] |
|---|---|---|---|---|---|
| DTF | nein | nein | PDF je Druckgröße, Auftragsordner + DTF-Sammelordner | ja (Dateiname) | nein |
| Flex | ja | ja | Streifen `_cut.pdf` über Summa | ja (2 Pressvorgänge) | ja |
| Flock | ja | ja | Streifen `_cut.pdf` über Summa | ja (2 Pressvorgänge) | ja |
| Stick | nein | nein | PDF je Druckgröße, nur Auftragsordner | nein | nein |

Position „Namen“ nur DTF (wie bisher), Namen-Bögen gehen in den DTF-Sammelordner.

### 2.4 Wahl-Objekt (Erweiterung SPEZ_03_Konfigurationen §2.1)

```
textil: { modell: "<id aus textil_modelle.csv>", farbe: { name: "<Textilfarbe>", cmyk: [c, m, y, k] | null } | null }
```

Im Weg „ohne Auftrag“ baut `anlegen.js` (Dialogseite) das Objekt aus Marke/Modell/Farbraster; `cmyk` kommt aus `textil_farben.csv`, bei Freitext `null`. `jsxSpec` liest nur das Wahl-Objekt. Stufe 3 bildet es aus dem App-Produkt (Marke/Modell → `id`, Textilfarbe mit Name und CMYK aus der App; Felder klärt Stufe 3 mit Brian); die Farbliste wird dann nicht mehr gebraucht. Dasselbe Objekt verwenden „Modell hinzufügen“ (§6.2) und „Textilfarbe“ (§6.1, nur `farbe`).

## 3. Konfiguration

### 3.1 `config/textil.json` (aus `Infos/Stammdaten/textil.json`, geändert)

```json
{
  "mockup_ordner": "config/mockups",
  "marken": ["B&C", "Promodoro", "Neutral", "Sonstige", "Kundenware"],
  "rand_mm": 2,
  "hoehen_hinweis_mm": { "brust_klein": 120, "ruecken": 380 },
  "kinder_faktor": 1.5,
  "namen": { "max_breite_mm": 560, "max_hoehe_mm": 1000, "abstand_mm": 10, "zeilenabstand_mm": 10 },
  "streifen": { "daten_breite_max_mm": 470, "zeichenflaeche_breite_mm": 480, "laenge_max_mm": 1500, "rand_mm": 5, "abstand_mm": 10, "rollenbreite_mm": 500 }
}
```

- `streifen` ersetzt `flex` und gilt für Flex und Flock; `laenge_max_mm` [R 3.3] und `rollenbreite_mm` (Verbrauch) sind neu. `marken` = Reihenfolge der Marken-Buttons (bisher Konstante `MARKEN` in `textil.js`); Marke eines Modells = Präfix von `modell` vor dem ersten `_`, Modelle ohne Marke aus der Liste erscheinen nicht.
- Startprüfung: Datei lesbar, alle Felder vorhanden, Zahlen > 0, `daten_breite_max_mm` ≤ `zeichenflaeche_breite_mm` − 2 × `rand_mm`.

### 3.2 `config/textil_stufen.csv`, `config/textil_modelle.csv`, `config/textil_farben.csv`

Kopien aus `Infos/Stammdaten/`, pflegt Markus. Spalten und Lesefunktionen wie `textil.js` (`stufenLesen`, `modelleLesen`, `farbenLesen`): `position;standard_mm;stufen_mm` (`|`-getrennt) · `id;modell;dateimass_mm;realmass_mm;bezeichnung` · `id;farbe;hex;c;m;y;k;groessen` (`groessen` nicht ausgewertet).

- `realmass_mm` sind Herstellerangaben und verbindlich. **Modell ohne `realmass_mm`** (NEKids, Faktor `null`): Anlegen und Zuordnen möglich — das Motiv wird bei OK nicht skaliert, nur Tags geschrieben und am Anker ausgerichtet; Export und Streifen sind davon unabhängig (absolute Skalierung auf `mass_mm`); nur der Korrekturabzug zeigt dann nicht die Relation zum Textil. Für die Flex-/Flock-Messung gilt in diesem Fall §9.1 Ersatzweg. Kein Popup, kein Abbruch.
- Modell ohne Zeilen in `textil_farben.csv` (Kundenware): Textilfarbe als Freitext, kein Umfärben.
- Startprüfung wie `produkte.csv`: Dateien lesbar, Kopfzeilen vollständig, Werte gültig (Maße > 0, c/m/y/k 0–100, `id`/`modell`/`farbe` nicht leer). Fehler → Popup mit Datei, Zeile und Grund; die Art Textil ist dann im Dialog gesperrt, alle anderen Arten bleiben nutzbar.

### 3.3 `config/mockups/` (MockUps, legt Markus ab)

- Im Repo zunächst leer (`.gitkeep`). Markus überarbeitet alle MockUps und legt sie als `<modell>.ai` ab (Dateiname = Spalte `modell`). Wählbar ist ein Modell nur, wenn seine Datei existiert; ohne eine einzige Datei ist Textil im Dialog gesperrt, Tooltip = erwarteter Ordner.
- Anforderungen an ein MockUp (wie bisher): Zeichenfläche 1 = A4 (Korrekturabzug); Ebenen „Anker“, „ID“, „Stofffarbe“, „Textil“, „Infos“, „Design“; Ebene „ID“ mit genau einem Textfeld = `id`; Ebene „Infos“ mit genau einem Textfeld, das die Zeilen `Model:`, `Farbe:`, `Druck:`, `Datum:` enthält; Ebene „Stofffarbe“ mit den umzufärbenden Pfaden; Ebene „Anker“ mit Pfaden aus genau einem Punkt, Name = Ankername.
- Ankernamen und Ausrichtung (Stand des gebauten Codes, `POSITIONEN` in `textil.js`): `Brust_links`, `Brust_rechts`, `Brust_Mitte` (Mitte auf den Anker), `Brust_Mitte_Oben` (Front), `Rücken_Oben` (Nacken), `Rücken_Mitte` (Rücken); Name auf `_Oben` → Oberkante auf den Anker, horizontal mittig; sonst Mitte auf den Anker. Rücken oben/unten, vorne unten, Ärmel, Sponsor, Namen haben keinen Anker. Fehlt ein Anker, bleibt das Motiv an seiner Stelle (skaliert um die Mitte); im Fenster „Motiv“ sind Positionen mit fehlendem Anker ausgegraut (wie 44B).
- Prüfung beim Anlegen (MockUp ist dann geöffnet): ID-Text ≠ `id` → MockUp ohne Speichern schließen, Popup `MockUp „<Datei>“: ID „<ist>“ statt „<soll>“`, nichts angelegt.

### 3.4 `config/auftragsarten/textil.json` (geändert)

```json
{
  "id": "textil", "name": "Textil", "reihenfolge": 7,
  "kalkulation": true, "preis": "textil", "kalkuliert_verfahren": ["Flex", "Flock"],
  "ebenen": [ { "name": "Design", "rolle": "textil", "gesperrt": false } ],
  "massstab": { "standard": 1 },
  "zeichenflaeche": { "art": "mockup" },
  "quelle": { "sandbox": "Design" },
  "textil": "config/textil.json",
  "export": { "profil": "textil", "preset": "pam x4", "dateiname": null, "sammelordner": "dtf_bestellen" },
  "komplexitaet": { "flex": "immer", "flock": "immer" },
  "werkzeuge": ["summa"],
  "dateien": { "arbeitsdatei": "Korrekturabzug" },
  "summa": { "preset": "[PDF/X-4:2008]" }
}
```

- `kalkulation: true` schaltet berechnen und Preiszeile frei; `kalkuliert_verfahren` begrenzt die Kalkulation auf Flex/Flock. `preis: "textil"` ist der `gilt_fuer`-Schlüssel der Preisliste. `arten` entfällt (Textil ordnet im Fenster „Motiv“ zu, nicht im Fenster „Objekt“). `dateien.arbeitsdatei` ist der Stamm; der Name entsteht als `<Stamm>_<ID>.ai` (§2.1).
- Startprüfung ergänzt: `textil` zeigt auf eine lesbare Datei, `kalkuliert_verfahren` nicht leer, `export.sammelordner` ist ein Pfadfeld von `rechner.json`.

### 3.5 Preisliste (`Infos/Stammdaten/preisliste.csv`, Entwicklungsquelle)

Neue Zeilen nach PREISLOGIK §13.5: Parameter `textil.mindest` 5,40 und `textil.rundung` 0,10 (`gilt_fuer` textil), Serien `PoliTape Turbo` (verfahren `flex`) und `VelCutPro` (verfahren `flock`), Zeitschlüssel `gilt_fuer` textil (`ruesten`, `datei_cut`, `teil`, `schnitt_m`, `trennen`, `pressen`, `falten`). `ek_m2` der beiden Serien trägt Markus ein; bis dahin bricht berechnen mit `Serie/Medium ohne Preis` ab (SPEZ_02 §5), Summa läuft unabhängig davon.

## 4. Anlegen

- Textil wird in `DIALOG_ARTEN` aufgenommen. Felder bei Art Textil (Funktion wie 44B; Darstellung SPEZ_03_Oberflaeche §4): Reihe Marken-Buttons aus `textil.json` `marken` (gesperrt, solange kein MockUp vorliegt); nach Wahl der Marke darunter ihre Modelle (Button-Text `bezeichnung`, leer → `modell`; nur Modelle mit MockUp-Datei); nach Wahl des Modells das Farbraster aus `textil_farben.csv` (Kacheln in CSV-Reihenfolge, `hex` mit Name; Modell ohne Einträge → Freitextfeld „Farbe“). Marken- oder Modellwechsel setzt die Farbwahl zurück. „Let's go“ gesperrt, bis ein Modell gewählt ist und — bei Farbliste — eine Farbe; Freitext darf leer sein.
- Quelle wie gebaut (geöffnete Datei, Datei öffnen, leer); keine Maßstabsabfrage (immer 1:1).
- Ablauf (JSX, Grundlage `mockup`, aus `createTextil`): MockUp öffnen, ID prüfen (§3.3), Quelle auf „Design“ (Block mittig Zeichenfläche 1, unskaliert; Arbeitsdatei Textil → nur „Design“), Stofffarbe umfärben bei `cmyk` (§6.1), XMP schreiben (§5), speichern als `Korrekturabzug_<ID>.ai` unter `<arbeitsdateien>/<Kunde>/<auftragsordner>/` bzw. im Server-Auftragsordner (`"server"`), Auftragsordner `JJJJ-MM-TT_Textil`. Aktive Ebene „Design“. Original bleibt unverändert, geöffnete Quelle bleibt offen [R 2.4].

## 5. XMP (Ergänzung SPEZ_01 §5.1)

```json
"textil": {
  "modell": { "id": "E190m", "modell": "B&C_E190_Men", "bezeichnung": "E190", "marke": "B&C", "faktor": 11.789 },
  "farbe": { "name": "Navy", "cmyk": [87, 75, 51, 65] }
}
```

- Beim Anlegen vollständig aus der CSV festgeschrieben (eine spätere CSV-Änderung ändert bestehende Arbeitsdateien nicht); `faktor` = `realmass_mm / dateimass_mm`, `null` ohne Realmaß. `farbe` wird vom Fenster „Textilfarbe“ ersetzt; Freitext → `cmyk: null`.
- Motivdaten liegen nur in den Tags der Objekte (§5.1) und im Kalkulationsdatensatz (§10.3).
- `parsen()` ergänzt einen fehlenden Bereich mit `null`; unbekannte Felder bleiben erhalten.

### 5.1 Tags (Ergänzung SPEZ_02 §3.1)

| Tag | Textil |
|---|---|
| `IP_Id` | wie SPEZ_02 (Schlüssel, Varianten-Erkennung bei Zuordnen, berechnen, Summa, Export) |
| `IP_Position` | Positionsname (`Brust links`, `Brust rechts`, `Brust mittig`, `Front`, `Rücken`, `Rücken oben`, `Rücken unten`, `vorne unten`, `Nacken`, `Ärmel links`, `Ärmel rechts`, `Sponsor`, `Namen`) |
| `IP_Verfahren` | `DTF` · `Flex` · `Flock` · `Stick` |
| `IP_Stufen` | JSON-Array der Druckgrößen (§2.2) |
| `IP_Folie` | nur Flex/Flock: Serienschlüssel aus der Preisliste (`PoliTape Turbo`, `VelCutPro`) |
| `IP_Farbe` | nur Flex/Flock: JSON `{ "<colorKey>": "<Flexfarbe>" }` — je Füllfarbe des Motivs ein Freitextname; `colorKey` wie in `farbzuordnung` (SPEZ_02 §3.2, exakt) |
| `IP_Komplexitaet` | nur Flex/Flock, `0`–`3` [R 1.8] |
| `IP_Original` | wie SPEZ_02 (Varianten) |

`IP_Anzahl`, `IP_Laminat`, `IP_Attribute` werden bei Textil nicht geschrieben. **Farbschlüssel** eines Flex-/Flock-Teils = `<Serie>-<Flexfarbe>`; er ist die Einheit für Rüsten, Streifen und Dateien.

## 6. Textilfarbe und Modell hinzufügen

### 6.1 Fenster „Textilfarbe“ (`.textilfarbe`, ModalDialog 420 × 300; Darstellung SPEZ_03_Oberflaeche §9)

Farbraster der Modell-ID aus `textil_farben.csv`, aktuelle Farbe vorgewählt; ohne Liste Freitextfeld; ein gespeicherter Name ohne Listeneintrag als eigene Kachel ohne Farbfläche. OK schreibt `textil.farbe` ins XMP und färbt bei `cmyk` alle gefüllten Pfade der Ebene „Stofffarbe“ um (auch in Gruppen, zusammengesetzten Pfaden, Unterebenen; Konturen bleiben; Ebene wird dafür kurz entsperrt — `textilStofffarbe`); Freitext färbt nicht um; fehlt die Ebene, wird nur der Name gespeichert. Abbrechen ändert nichts. Enter = OK, Esc = Abbrechen. Danach liest das Panel neu.

### 6.2 Fenster „Modell“ (`.modell`, ModalDialog 720 × 320; Darstellung SPEZ_03_Oberflaeche §10)

Marke/Modell/Farbraster wie im Anlegen (§4). OK legt eine weitere Arbeitsdatei `Korrekturabzug_<ID>.ai` (bzw. `_02`) im selben Auftragsordner an — ohne Quelle, mit `kunde`, `auftrag`, `ablage` der aktiven Arbeitsdatei und eigenem Bereich `textil`; sie wird aktiv. Nur bei vorderer Textil-Arbeitsdatei freigegeben.

## 7. Fenster „Motiv“ (`.motiv`, ModalDialog 640 × 470 wie 44B)

Übernahme aus dem alten Projekt (`panel/motiv.html/.js`, `textil_fenster.css`, `MOCKUP_STUFE44.html`), Aufbau, Reihenfolge und Texte wie dort; nur die unten genannten Erweiterungen. Öffnet über add/edit im Panel und per Doppelklick in „Zusammenfassung“; genau ein oberstes Objekt bzw. eine Gruppe ausgewählt, sonst Popup `Bitte gruppieren: Es muss genau ein oberstes Objekt bzw. eine Gruppe ausgewählt sein.`; keine Mehrfachauswahl.

- **Positionen** als Pillen auf den Silhouetten Vorn/Hinten, darunter „Ohne Position“ mit Sponsor und Namen; Positionen mit fehlendem Anker ausgegraut (`IP.ankerNamen`, einmal beim Öffnen). Vorbelegung neues Motiv: erste Position; bestehendes Motiv: gespeicherte Werte.
- **Verfahren**: vier Buttons **DTF · Flex · Flock · Stick** (2 × 2, SPEZ_03_Oberflaeche §6); bei Position „Namen“ nur DTF.
- **Flex/Flock** (Anordnung nach SPEZ_03_Oberflaeche §6: Serie und Komplexität in der rechten Spalte, Farben im Objekt nur bei Flex/Flock, kein reservierter Platz): **Serie** als Auswahl der Preislisten-Serien mit `verfahren` flex bzw. flock — genau eine Serie → vorbelegt und nur angezeigt; **„Farben im Objekt“**: eine Zeile je Füllfarbe des Objekts (Chip, Farbname aus Illustrator, Freitextfeld „Flexfarbe“, Pflicht; Vorbelegung aus `IP_Farbe`, sonst leer); **Komplexität** K0–K3 (Tooltip aus `komplexitaet()`). Sperren wie Plott (SPEZ_02 §6): Konturen, Bilder, Verläufe, Transparenz → Fußzeile nennt den Grund, OK gesperrt. Text ist erlaubt (Pfade erst in den Streifen).
- **Druckgrößen**: Tabelle wie 44B — zeigen · Maß mm (Maße der Position aus `textil_stufen.csv`, „frei“ → Feld mm, „Kinder“ → Breite mm + Körpergröße cm, `kinder_faktor`; die Körpergröße wird in `koerpergroesse_cm` gespeichert und beim Öffnen wieder als „Kinder“ angezeigt) · Bezug Breite/Höhe (Namen nur Breite) · Menge · Textilgrößen · **blockout** (DTF, Flex, Flock; bei Stick ausgeblendet) · ×. Die Spalte „Motive je Streifen“ entfällt. Summenzeile `Gesamt <Σ Menge> Stück in <n> Druckgrößen · <Verfahren> · Anker <anker>` wie bisher. Höhenhinweis (`hoehen_hinweis_mm`) wie bisher als Popup, nichts wird umgestellt.
- **Prüfung** (`dialogProbleme`, erste offene Warnung in der Fußzeile, OK gesperrt): Verfahren wählen · Druckgröße n: Maß fehlt · Druckgröße n: Menge fehlt · Flex/Flock: `Flexfarbe fehlt` je offener Zeile, `Serie fehlt`.
- **OK**: Varianten-Erkennung (SPEZ_02 §3.1), `IP_Id` vergeben falls fehlend, Tags (§5.1) schreiben, Objekt positionsgleich auf „Design“, skalieren auf Realmaß der `zeigen`-Druckgröße / Faktor (Bezug beachten), am Anker ausrichten (§3.3); CSEvent an das Panel, Panel und ein offenes „Zusammenfassung“ lesen neu. Enter = OK, Esc = Abbrechen.
- **Varianten**: Illustrator-Duplikat eines Motivs → bei der nächsten Panel-Aktion neue `IP_Id` und `IP_Original`; edit öffnet „Motiv“ mit den Werten, Positionswechsel richtet neu aus. Das alte Fenster „Kopie“ gibt es nicht mehr [M 4].

## 8. Panel-Zustand (Profil `textil`; Darstellung SPEZ_03_Oberflaeche §3)

- Zeile 1: Kunde · Textil · Grafikzeit mit „+m“ wie gebaut.
- Zeile 2 (Objektzeile): Name der Auswahl, rechts statt Folie `<Position> · <Verfahren>` und bei Flex/Flock die Flexfarben, Marke `×<Σ Menge>`; ohne Zuordnung wie gebaut.
- Zeile 3: **add/edit** (öffnet „Motiv“) · **berechnen** (§10) · **Farbe** (Chip + Name der Textilfarbe, ohne Farbe grau; öffnet §6.1) · **Modell** (öffnet §6.2). add/edit orange nach der Regel aus SPEZ_02 §13, sonst berechnen.
- Zeile 4: **Summa** (§9) aktiv, **Druck** ausgeblendet (SPEZ_03_Oberflaeche §3.2), **Export** (§11), **Auftrag**.
- Zeile 5: ein Preis (netto, brutto fett) aus dem letzten Datensatz; ohne Flex-/Flock-Motive leer. Rechts mit „Preis“ (SPEZ_03_Oberflaeche §3.1).
- Werkzeugzeile: SPEZ_03_Oberflaeche §3.1.

## 9. Lesen, Messen, Streifen (Summa)

### 9.1 Lesen und Messen (Ergänzung SPEZ_02 §5)

- Gilt für berechnen und Summa; nur Motive mit `IP_Verfahren` Flex oder Flock. Je Motiv wie Plott: Text in Pfade, Einzelteile = geschlossene bzw. zusammengesetzte Pfade (Punzen zur Schnittlänge), je Füllfarbe eine Teilegruppe; Farbschlüssel = `<Serie>-<Flexfarbe>` aus `IP_Folie` und `IP_Farbe`. Füllfarbe ohne Eintrag in `IP_Farbe` → Abbruch `„<Motiv>“: Füllfarbe ohne Flexfarbe`.
- Gemessen wird einmal im MockUp-Maß; je Druckgröße wird mit `f = mass_mm(Druckgröße) / mass_mm(zeigen)` × Faktor des Modells auf Realmaß umgerechnet: Schnittlänge × f, Flächen × f², Teilezahl gleich. Jede Druckgröße liefert `menge` Exemplare. **Ersatzweg nur bei Modell ohne Realmaß** (Faktor `null`, §3.2): `f = mass_mm(Druckgröße) / Ist-Maß des Motivs im Dokument` (sichtbare Grenzen, Bezug Breite bzw. Höhe).
- Mehrfarbiges Motiv (≥ 2 Farbschlüssel): Passermarken nach SPEZ_02 §10.1 je Druckgröße (Markengröße und Lage aus dem Umriss im Realmaß der Druckgröße), je Farbe ein Block mit beiden Marken; Marken zählen nicht zu Teilen und Schnittlänge [B-5].
- Prüfungen (ein Popup, gleichartige zusammengefasst): Warnungen — oberste Objekte auf „Design“ ohne Zuordnung (nicht gerechnet), Konturen auf Flex-/Flock-Motiven; Abbruch — Exemplar bzw. Block passt in keiner Lage in `daten_breite_max_mm` × (`laenge_max_mm` − 2 × `rand_mm`), Serie nicht in der Preisliste, bei berechnen zusätzlich Serie ohne Preis und Preisquelle fehlerhaft.

### 9.2 Streifen je Farbschlüssel

- Je Farbschlüssel alle Flex-/Flock-Exemplare aller Motive und Druckgrößen zusammen. Nesting mit dem Kern aus SPEZ_02 §7 (MaxRects, 90°-Drehung, reproduzierbar), Nutzbreite `daten_breite_max_mm` (470), Abstand `abstand_mm`, Rand `rand_mm`; **Nesting-Einheit ist das ganze Exemplar** (einfarbig) bzw. der Block je Farbe (mehrfarbig) — nie Einzelteile, ein Transfer wird am Stück gepresst. Streifenlänge ≤ `laenge_max_mm` (1500) → weitere Streifen.
- Je Streifen ein Hilfsdokument 1:1: Zeichenfläche `zeichenflaeche_breite_mm` (480) × (Inhalt + 2 × `rand_mm`), Inhalt mittig, nicht gespiegelt; Pfade ohne Füllungs-/Konturänderung (Text in Pfade, Schnittmasken aufgelöst); je Exemplar eine Gruppe `<Anzeigename> <k>` (bei Blöcken mit den Passermarken) [B-10].
- **Verbrauch** je Farbschlüssel = Σ Streifenlänge × `rollenbreite_mm` (500) — nur EK, Materialbedarf, Datensatz.
- **Datei** `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf` (NN = Streifen je Farbschlüssel, Serie und Farbe umgeschrieben wie der Kundenname [R 5.9]), Preset `summa.preset`, `ersetzen: true` wie Schneidedaten (SPEZ_02 §11.3), nur Auftragsordner. Ablauf wie SPEZ_02 §10: Arbeitsdatei speichern (ungespeichert → Abbruch) → Prüfungen → Varianten-Erkennung → Nesting → Hilfsdokumente → PDF → schließen → ein Eintrag in `exporte[]`; ältere Streifen mit höherer Nummer bleiben liegen und werden genannt [B-8].

## 10. Kalkulation Flex/Flock

### 10.1 Rechenweg

PREISLOGIK §13. Kurz: je Farbschlüssel Rüsten + Datei; je Exemplar Entgittern (Teile, Schnittlänge) + Trennen, × (1 + Komplexität/100), Material = Stückfläche × `vk_m2` der Serie, Pressen = Pressvorgänge × `pressen` (1 je Exemplar, 2 bei blockout), Mindestbetrag `textil.mindest` (5,40 €) je Exemplar; je Auftrag Falten = Textilzahl × `falten`; ein Preis, aufgerundet auf `textil.rundung` (0,10 €), brutto auf Cent [R 1.14]; VK und Mindest-VK mit `stundensatz.vk` bzw. `stundensatz.produktion`. Textilzahl = größte Mengensumme einer Position über die Flex-/Flock-Motive. DTF, Stick, Namen und das Textil selbst gehen nicht ein.

### 10.2 Auslöser und Anzeige

Button berechnen: Prüfungen (§9.1) → Streifen (§9.2) → Kalkulation → Datensatz ins XMP → Fenster „Zusammenfassung“ öffnen/aktualisieren → Hinweise als ein Popup. Ohne Flex-/Flock-Motive: Datensatz mit leeren Preisen, Zusammenfassung zeigt nur die Motive.

### 10.3 Kalkulationsdatensatz (XMP `kalkulation`, Ergänzung SPEZ_02 §8.4)

Gleiche Struktur mit diesen Abweichungen: `auftragsart: "textil"`, `massstab: 1`; `objekte[]` je Motiv und Druckgröße ein Eintrag — zusätzlich `position`, `verfahren`, `druckgroesse: { nr, mass_mm, bezug, groessen, blockout, zeigen }`, `anzahl` = `menge`, `farben: { "<colorKey>": "<Flexfarbe>" }`, `minuten.pressen`, `betraege` nur für Flex/Flock (DTF/Stick/Namen stehen mit `null`-Beträgen drin, damit die Zusammenfassung alle Motive zeigt); `folien[]` je Farbschlüssel mit `serie`, `farbe`, `streifen`, `lfm`, `verbrauch_m2` (Rollenbreite 500), `ek`; `auftrag` mit `falten_min` und `textilzahl` statt `datei_rip_min`/`auftrag_montage_min`/`reinigen_rest_min`; `preise.vk.nur_aufkleber` und `preise.mindest.nur_aufkleber` `null`, der Preis steht in `inkl_montage`; `mindestbetrag_greift` je Exemplar in `objekte[].betraege.mindest_greift`; `rundung: 0.1`; `textil: { modell, farbe }` aus dem XMP-Bereich. `materialbedarf` wie [R 6.10].

### 10.4 Fenster „Zusammenfassung“ bei Textil

Dasselbe Fenster (SPEZ_02 §9), Spalten für Textil: Objekte — Motiv (Name), Position, Verfahren (bei Flex/Flock mit Serie und Flexfarben), Druckgrößen (`<Maß> mm · <Menge> Stk · <Textilgrößen>`, `zeigen` markiert, blockout), K, Teile, Betrag (nur Flex/Flock); darunter „Ohne Zuordnung (n)“ (oberste Objekte auf „Design“ ohne `IP_Position`). Folien — Farbschlüssel, Streifen, lfm, m² Verbrauch, EK. Summen — Material, Produktion (min), Pressen (min, Pressvorgänge), Falten (min, Textilzahl), Preis netto gerundet fett + brutto, darunter Mindest-VK; Hinweis `Mindestbetrag je Motiv greift (n Exemplare)`. Grafik wie gebaut. Klick wählt aus, Doppelklick öffnet „Motiv“. **PDF** `<Kunde>_Zusammenfassung.pdf`: Objekte, Folien, Kopf (Kunde, Textil, Modell, Textilfarbe, Datum) und Warnungen — ohne Summen, Preise, EK, Grafik. Darstellung der Objektzeilen in Fenster und PDF: SPEZ_03_Oberflaeche §7 (eine Zeile je Druckgröße, Spalten Maß mm, Menge, Textilgrößen).

## 11. Export (Profil `textil`)

Neues Modul `panel/lib/export_textil.js` nach dem Muster von `export_schild.js`; der Export-Button ruft es bei Profil `textil` auf. Nur die vordere Arbeitsdatei (ein Korrekturabzug).

1. Arbeitsdatei speichern (ungespeichert → Abbruch) [B-7].
2. Prüfungen (ein Fehler-Popup mit allen Befunden, kein Export, nichts geändert): Motiv ohne Druckgröße · Druckgröße ohne Menge · Namen-Gruppe leer · breitester Name breiter als `max_breite_mm` − 2 × `rand_mm` oder ein Name höher als der Bogen · Ebene „Infos“ fehlt, hat nicht genau ein Textfeld oder eine der Zeilen `Farbe:`, `Druck:`, `Datum:` fehlt (`textilInfos` mit `nurPruefen`). Flex-/Flock-Motive werden nicht geprüft und nicht exportiert (Summa).
3. Ebene „Infos“ füllen: `Farbe:` = Textilfarbe, `Druck:` = verwendete Verfahren (Komma, Reihenfolge DTF, Flex, Flock, Stick), `Datum:` = heute; `Model:` bleibt; frühere Motivzeilen nach `Datum:` entfernt, dann je Motiv `<Position>: <Maß> mm (<Textilgrößen>) · …` (`infosZeilen`).
4. **DTF und Stick**: je Motiv und Druckgröße `<Menge>x_<Kunde>_<Position>_<Maß>[_blockout][_<ID>].pdf` — Hilfsdokument, Exemplar skaliert auf `mass_mm` (Bezug), Zeichenfläche = sichtbare Grenzen + `rand_mm` (2) umlaufend, Preset „pam x4“, Transparenz erhalten (`textilMotivPdf`).
5. **Namen** (Position „Namen“, DTF): Faktor aus dem breitesten Namen auf `mass_mm`, Blocksatz nach `namenBlock`/`namenBoegen` (alle Zeilen gleich breit, Mindestabstand und Zeilenabstand aus `namen`, kleinste Fläche, dann kleinste größte Lücke, Zeile mit einem Namen linksbündig), Bogen ≤ 560 × 1000 mm, weitere Bögen `_02` (`textilNamenPdf`); Dateiname wie 4 mit `Menge` = Zahl der Namen.
6. **Korrekturabzug**: Zeichenfläche 1 als `<Kunde>_Korrekturabzug[_<ID>].pdf`, Preset „pam x4“, danach Arbeitsdatei gespeichert.
7. `_<ID>` in den Dateinamen, sobald im Auftragsordner (lokal ∪ Server) mehr als eine `Korrekturabzug_*.ai` liegt.
8. Ablage über den Exportkern in den Auftragsordner, nummeriert ohne Überschreiben [R 5.7]; `dtf: [...]` = alle DTF-Dateien einschließlich Namen-Bögen → Kopie nach `server.dtf_bestellen` (Nummerierung gegen den Sammelordner, Fehler gilt nur für die Kopie) [R 5.3]; Stick nur Auftragsordner. Arbeitsdatei-Kopie in den Server-Auftragsordner wie gebaut; ein Eintrag in `exporte[]`; Popup nur bei Fehlern bzw. geparkten Dateien.

## 12. Stufe 3 (nur Austauschstellen, nicht Teil dieses Themas)

- Wahl-Objekt `textil` aus dem App-Produkt (§2.4); Mengen und Textilgrößen je Druckgröße aus der App vorbelegt.
- Export des Korrekturabzugs startet die Kundenfreigabe in der App [R 6.12].
- Preise und Kalkulationsdatensatz (§10.3) über das SDK an das Produkt [R 6.5, 6.13]; Materialbedarf [R 6.10].

## 13. Repo, Doku, Tests

- Neu: `config/textil.json`, `config/textil_stufen.csv`, `config/textil_modelle.csv`, `config/textil_farben.csv`, `config/mockups/.gitkeep`, `panel/lib/textil.js` (aus dem alten Projekt: CSV-Lesen, Positionen, Anker-Modus, Faktor, Maße je Position, Kinderformel, Höhenhinweis, Dateinamen, Namen-Blocksatz, Infos-Zeilen, Export-Prüfungen; `flexStreifen`/`streifenAnzahl`/`MARKEN`/Namensvergabe entfallen), `panel/lib/export_textil.js`, `panel/lib/kalkulation_textil.js` (§10, Preisquelle `gilt_fuer` textil), `panel/motiv.html/.js`, `panel/textilfarbe.html/.js`, `panel/modell.html/.js`, Extensions `.motiv`, `.textilfarbe`, `.modell` (ModalDialog) im Manifest.
- Geändert: `config/auftragsarten/textil.json`, `panel/lib/konfiguration.js` (Textil-Dateien, `kalkuliert_verfahren`, `export.sammelordner`), `panel/lib/anlegen.js`, `panel/anlegen.html/.js` (Textil, Wahl-Objekt), `panel/lib/dokument.js` (Bereich `textil`), `panel/lib/teile.js` (Flex/Flock: Farbschlüssel aus Tags, Skalierung je Druckgröße), `panel/lib/nesting.js` (Einheit Exemplar/Block, Längengrenze), `panel/lib/passermarken.js` (Aufruf je Druckgröße), `panel/lib/schneidedaten.js` (Streifen, Dateiname), `panel/lib/preisquelle.js` (Serien mit verfahren flex/flock, Parameter `textil.*`), `panel/lib/zusammenfassung.js`, `zusammenfassung_pdf.js` (Textil-Spalten), `panel/main.js` (Zustand Profil `textil`, Buttons Farbe/Modell, berechnen, Summa, Export), `panel/lib/export.js` (Sammelordner aus `export.sammelordner`), JSX-Kern (Grundlage `mockup` aus `createTextil`, `textilStofffarbe`, `ankerNamen`, `textilZuordnen` mit Tags aus `schema.json`, `textilMotive` mit Füllfarben, `textilMotivPdf`, `textilNamenPdf`, `textilInfos`, Streifen-Hilfsdokument). Version 3.5.0.
- Tests [R 7.9]: `node --test tests/*.test.js`. Neu nur: die drei Textil-CSVs und `textil.json` gültig (in der bestehenden Konfigurationsprüfung), ein Test `kalkulation_textil` (Mindestbetrag je Exemplar, blockout = 2 Pressvorgänge, Textilzahl, Rundung 0,10, `nur_aufkleber` null) und ein Test Streifenaufteilung an der Grenze 1500 mm. Schlägt ein bestehender Test nur wegen der beauftragten Änderung fehl, wird nur diese Erwartung angepasst. Keine Illustrator-Läufe; Probe durch Markus, sobald MockUps in `config/mockups` liegen.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Textil“. Kein Commit, kein Push, außer der Auftrag nennt es.

## 14. Festlegungen CC — geprüft 31.10.

FESTLEGUNGEN.md Abschnitt „Textil“, Punkte 1–35 (Stand 3.5.0, Arbeitskopie): bestätigt mit drei Korrekturen (Korrekturauftrag 31.10.).

- **Punkt 1 abgelehnt:** Umrechnungsfaktor je Druckgröße wie §9.1 aus `mass_mm / mass_mm(zeigen)` × Modellfaktor, nicht aus dem Ist-Maß; der Ist-Maß-Weg bleibt nur als Ersatzweg für Modelle ohne Realmaß.
- **Punkt 13 geändert:** „Motiv“ bricht bei fehlendem Realmaß nicht ab — Zuordnen ohne Skalierung (§3.2); der übrige Punkt (fehlerhafte Textil-Konfiguration, keine Textil-Arbeitsdatei, fehlerhafte Preisliste → DTF/Stick möglich, Flex/Flock ohne Serie) bestätigt.
- **Punkt 18 geändert:** Körpergröße wird als siebtes Feld `koerpergroesse_cm` in `IP_Stufen` gespeichert (§2.2, §7); blockout bei Stick immer false bestätigt.
- Neue Meldungs- und Sperrtexte (Punkte 4, 5, 10, 14, 15, 24, 34): freigegeben.
- Punkte 17, 22, 32, 33 (Lage Flex/Flock-Block, Preis rechts ohne Beschriftung, Darstellung Zusammenfassung und PDF): entschieden in Thema 6 — SPEZ_03_Oberflaeche §6 (17), §3.1 (22: rechts mit „Preis“), §7 (32, 33: eine Zeile je Druckgröße).
- Übrige Punkte bestätigt ohne Änderung: 2 (`textil_wahl.js`), 3, 6, 7 (Preisquelle: leere `ek_m2`/`vk_m2` bei flex/flock zulässig, Pflichtschlüssel beim Laden für textil), 8 (lokaler Auftragsordner belegt, sobald eine `Korrekturabzug_*.ai` darin liegt), 9, 11, 12, 16, 19, 20 (Debug-Ports 8095–8097), 21, 23, 25 (Summa bei fehlerhafter Preisliste ohne Serienprüfung), 26, 27, 28, 29, 30, 31, 35.
