# Spezifikation Stufe 1 „Fundament“ — PAM-Werkzeuge

Stand: 30.10.2026, Fassung 2 (Ableitungen 1–9 bestätigt, 10 offen). Grundlage: `REGISTER_NEUAUFBAU.md` (Register), Antworten Markus vom 30.10., `Infos/` im Projektordner. Enthält nur, was nicht von Brians Antworten (BRIEFING_Brian Q1–Q17) und dem SDK abhängt. Alles mit Supabase (Login, Preisdaten, Produktliste, Rückmeldungen) ist Stufe 2.

Kennzeichnung: **[R x.y]** = Registerpunkt · **[M]** = Antwort Markus 30.10. · **[A-n]** = Ableitung Claude, Abschnitt 10.

## 1. Umfang

Enthalten:
1. Repo und Projektordner, Manifest, Panel-Gerüst „PAM-Werkzeuge“ mit Kopfzeile und den Buttons „Auftrag“ und „Export“
2. Konfigurationsdatei je Rechner (`rechner.json`)
3. Auftragsarten als Konfiguration (acht Arten, Mapping App-Typ → Auftragsart)
4. Datenschicht: XMP-Namespace mit JSON-Block (Dokumentebene), `IP_*`-Tags (Objektebene)
5. Gemeinsamer Exportkern: erst lokal schreiben, dann auf den Server verschieben, nachprüfen
6. Erster Verbraucher des Exportkerns: flacher Export (Lasergravur, Sonstiges, Banner/Roll-up)
7. Anlegen „ohne Auftrag“ (manuelle Artwahl) als Weg, den Stand ohne Supabase in Illustrator auszuprobieren [M 15]

Nicht enthalten: Supabase/SDK, Kalkulation, Zuordnen, Nesting, Druckbögen, Schneidedaten, Nutzen/Gitter/MB-Nr, Grafikzeit-Messung (nur das XMP-Feld), Textil und Offset im Anlegen-Dialog, Skript-Buttons, Bereitstellung nach `/Applications/interne Tools`.

## 2. Repo, Projektordner, Laden in Illustrator

- Projektordner: `~/tools/Illustrator Panel` [M, R 7.3]. Er wird der Clone von `arbeitsdenkmal/IlluPanel`. Der vorhandene Ordner `Infos/` (Übergabe, Produktionsregeln, Stammdaten) wandert als Referenzmaterial mit ins Repo. [A-1]
- Ist das GitHub-Repo leer: CC initialisiert im Projektordner, verbindet `origin`, Branch `main`. Commit und Push am Ende jeder Stufe durch CC [M 12]. [A-10]
- Aufbau:

```
CSXS/manifest.xml
panel/                 CEP-Seite: HTML/JS, Node aktiviert
  index.html, main.js  Panel „PAM-Werkzeuge“
  anlegen.html, anlegen.js
  lib/                 reine Node-Module ohne Illustrator-Bezug (testbar)
jsx/illupanels.jsx     ExtendScript-Kern, nur Dokumentzugriff (XMP, Tags, Ebenen, Speichern)
config/
  auftragsarten/*.json  acht Auftragsarten
  mapping.json          App department/type → Auftragsart
  schema.json           Tag-Namen und XMP-Schemaversion (einzige Quelle, siehe 5)
  rechner.beispiel.json Vorlage für die Datei je Rechner
  vorlagen/*.ait        Schild, UV-Schild, Offset, Etikett, Bögl Nummern Masterdatei (Kopien aus dem alten Projektordner)
tests/*.test.js        node --test
Infos/                 Referenz, wird nicht gelesen
CLAUDE.md, README.md, CHANGELOG.md, TESTBERICHT.md, .gitignore, .debug
```

- Laden in Illustrator während der Entwicklung: Verknüpfung `~/Library/Application Support/Adobe/CEP/extensions/de.pamnm.illupanels` → Projektordner; `.debug` im Repo, PlayerDebugMode bleibt gesetzt. Die Verknüpfung zeigt heute auf das alte Ziel; sie wird umgehängt, das alte Panel ist damit ab Stufe 1 nicht mehr geladen [R 7.11]. `bereitstellen.sh` und das Ziel `/Applications/interne Tools/Illustrator Panels` kommen erst am Ende [M 3, R 7.3]. [A-2]
- Windows (vorletzter Schritt [M 4]): nur Git. Junction `%APPDATA%\Adobe\CEP\extensions\de.pamnm.illupanels` → Clone, PlayerDebugMode in der Registry. Wird in README beschrieben, in Stufe 1 nicht ausgeführt.
- Node: CEP 12 bringt Node 17 mit, Unit-Tests laufen mit dem System-Node. Code in `panel/lib` nutzt nur APIs, die beides können (CommonJS, keine Node-18+-APIs).
- Übernahme aus `~/tools/folienkalkulation` (Entscheidung Claude [M 2]): fachlich fertige Module werden kopiert und angepasst — Nesting, ASE-Farberkennung, OPOS-Marken, Kalkulation, Maß-/Rundungslogik, Maßstab-Umrechnung, XMP-Zugriff im JSX. Neu entstehen: Konfiguration, Datenschema, Speicherorte, Exportkern, Panel, Dialoge. In Stufe 1 werden davon nur XMP-Zugriff und Maßstab-Umrechnung gebraucht.
- `.gitignore`: `.DS_Store`, `node_modules/`, `tests/out/`, `*.bak*`.

## 3. Manifest und Panel

- `ExtensionBundleId` `de.pamnm.illupanels`, Version 3.0.0, Name „PAM-Werkzeuge“ [M 3]. Host ILST [28.0, 99.9], CSXS 12, `--enable-nodejs --mixed-context`.
- Extensions in Stufe 1: `.panel` (Typ Panel, Menü „PAM-Werkzeuge“, 320 × 160, Mindestgröße 320 × 120 [R 4.2]) und `.anlegen` (Typ ModalDialog). Weitere Extensions (Hintergrund für Grafikzeit, Fenster) kommen mit ihren Stufen.
- Panel-Inhalt Stufe 1: Kopfzeile wie bisher — Kunde · Auftragsart · „M 1:n“ aus dem XMP des vorderen Dokuments; ohne Panel-Dokument bleibt die Zeile leer. Darunter die Buttons „Auftrag“ (öffnet `.anlegen`) und „Export“ (orange [R 4.3/4.4]). Keine weiteren Buttons, keine Hinweiszeilen.
- Aktualisierung nur bei Maus ins Panel, Fokus oder Aktion, keine Dauerabfragen [R 4.7]. Hell/Dunkel über das CEP-Theme-Ereignis [R 4.10].
- Fehler als Popup, keine Erfolgsmeldungen [R 4.4]. Texte nur aus dem Register bzw. dem bisherigen Panel.
- Start: Panel lädt `rechner.json`, `schema.json`, Auftragsarten und Mapping und prüft sie (Abschnitt 4 und 6). Jeder Fehler → ein Popup mit Datei und Grund, Buttons bleiben gesperrt.

## 4. Konfigurationsdatei je Rechner

- Ort [M 4]: macOS `~/Library/Application Support/PAM-Werkzeuge/rechner.json`, Windows `%APPDATA%\PAM-Werkzeuge\rechner.json`. Nicht im Repo; im Repo nur `config/rechner.beispiel.json`, beide Varianten in README.
- Inhalt:

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

Windows (MKs PC) [M 6]: `"kunden": "Y:\\_03_Kunden A-Z"`, `"dtf_bestellen": "Y:\\_02_Produktion\\= DTF bestellen ="` [A-7], `"arbeitsdateien": "server"`, `"ausgang": "%LOCALAPPDATA%\\PAM-Werkzeuge\\Ausgang"` [A-3].

- Bedeutung:
  - `server.kunden`: Wurzel des A–Z-Baums. Kundenordner stehen im XMP immer relativ dazu (`M/Mustermann`), damit dieselbe Datei auf Mac und Windows funktioniert.
  - `lokal.arbeitsdateien`: wo Arbeitsdateien liegen. Pfad = lokaler Zwischenspeicher (Mac: Schreibtisch [M 8]); `"server"` = direkt im Server-Auftragsordner (Windows [M 8]).
  - `lokal.ausgang`: wohin der Export zuerst schreibt, bevor er auf den Server verschiebt. Mac: Schreibtisch = Parkplatz bei Fehlschlag [R 5.4/5.5, M 9]. Windows: technischer Zwischenordner ohne Parkplatz-Funktion — bei Fehlschlag Popup, Datei bleibt dort liegen. [A-3]
- `~` und `%VAR%` werden aufgelöst. Plattform kommt aus `process.platform` und wird nur für Pfadauflösung und CEP-Pfade benutzt; im übrigen Code kein `/Volumes`, kein Laufwerksbuchstabe, kein Mac/Windows [R 7.2].
- Prüfung beim Start: Datei vorhanden, JSON gültig, alle vier Pfadfelder vorhanden. Erreichbarkeit des Servers wird nicht beim Start, sondern bei Bedarf geprüft (Abschnitt 7.2).

## 5. Datenschicht

### 5.1 Dokumentebene: XMP

- Namespace `http://ns.pam-nm.de/illupanels/2.0/`, Präfix `ip:` [M 3]. Eine Eigenschaft `ip:Dokument` mit einem JSON-Text. Der alte Namespace `…/1.0/` wird weder gelesen noch geschrieben (keine echten Daten damit).
- Nur der JSX-Kern berührt XMP (AdobeXMPScript); die Node-Seite liest und schreibt das JSON-Objekt über zwei Funktionen `xmpLesen()` / `xmpSchreiben(obj)`. Geschrieben wird sofort bei jeder Änderung (Illustrator hat kein Ereignis vor dem Speichern).
- Schema Version 1:

```json
{
  "schema": 1,
  "panel": "3.0.0",
  "erstellt": "2026-10-30T14:00:00Z",
  "rolle": "arbeitsdatei",
  "auftragsart": "fahrzeugbeschriftung",
  "massstab": 30,
  "kunde": "Mustermann",
  "auftrag": { "orderId": null, "productId": null },
  "ablage": { "kundenordner": "M/Mustermann", "auftragsordner": "2026-10-30_Fahrzeugbeschriftung" },
  "quelle": { "art": "geoeffnet", "pfad": "/…/Kundenlogo.ai" },
  "grafikzeit": { "eintraege": [] },
  "kalkulation": null,
  "exporte": []
}
```

  - `rolle`: `arbeitsdatei` | `druckbogen` | `nutzenbogen` | `hilfsdokument` — ersetzt die alten Kennungen „Druckbogen“/„Nutzenbogen“.
  - `auftrag`: IDs aus der App, `null` ohne Auftrag [R 2.3].
  - `ablage.kundenordner`: relativ zu `server.kunden`, `null` bis gewählt. `auftragsordner`: `JJJJ-MM-TT_<Produkt>` [R 5.2]; ohne Auftrag `JJJJ-MM-TT_<Auftragsart>` [A-6].
  - `grafikzeit.eintraege[]`: `{ von, bis, minuten, manuell, benutzer, uebertragen }` — Struktur für [R 2.12], die Messung selbst kommt später.
  - `kalkulation`: später der letzte Kalkulationsdatensatz (gleiche Struktur wie das JSONB in Supabase, [R 6.13]).
  - `exporte[]`: `{ zeit, ordner, dateien[], uebertragen }` — Grundlage für die spätere Meldung des Ablageorts [R 5.5/5.6], keine Hilfsdateien [R 5.8].
  - Art-spezifische Bereiche (`schild`, `textil`) werden mit ihren Stufen ergänzt; unbekannte Felder bleiben beim Schreiben erhalten.

### 5.2 Objektebene: Tags

Illustrator-Tags am PageItem, Werte immer als Text. Namen stehen in `config/schema.json` und werden dem JSX beim Panelstart übergeben; sonst nirgends als Literal.

| Tag | Inhalt | Herkunft |
|---|---|---|
| `IP_Id` | stabile Kennung des Objekts (für Kalkulationsdatensatz und Herkunft) | neu |
| `IP_Folie` | Folienschlüssel: Plott `751C-031`, Druck Medium `3551` | ersetzt IP_Art/IP_Medium/IP_Farbe-Mischung |
| `IP_Laminat` | `matt` / `glaenzend`, nur Druck | wie bisher |
| `IP_Anzahl` | Stückzahl, Standard `1` | neu [R 3.4] |
| `IP_Komplexitaet` | `0`–`3` | wie bisher [R 1.8] |
| `IP_Attribute` | kommagetrennt `sicke`, `woelbung`, `tape` | fasst IP_Attribute und IP_Tape zusammen |
| `IP_Herkunft` | Herkunftsname für Symbole auf Druckbögen | wie bisher |
| `IP_Original` | `IP_Id` des Originals bei Varianten-Kopien | wie bisher |
| `IP_Position`, `IP_Verfahren`, `IP_Stufen`, `IP_Farbe` | Textil, Werte wie SPEZIFIKATION_Textil | wie bisher |

In Stufe 1 werden nur Lese-/Schreibfunktionen (`tagsLesen(item)`, `tagsSchreiben(item, obj)`) und die Schema-Prüfung gebaut; Inhalte setzen die späteren Stufen.

## 6. Auftragsarten als Konfiguration

- Acht Dateien in `config/auftragsarten/`: `fahrzeugbeschriftung`, `beschriftung`, `schild`, `banner_rollup`, `lasergravur`, `offset`, `textil`, `sonstiges`. Werte kommen aus `Infos/Stammdaten/auftragsarten/*.json` und dem Register; Nesting-/Druckparameter werden unverändert mitgenommen, auch wenn Stufe 1 sie nicht liest.
- Gemeinsames Schema (Pflichtfelder fett):

| Feld | Bedeutung |
|---|---|
| **id, name, reihenfolge** | Kennung, Anzeigename, Reihenfolge im Dialog |
| **kalkulation** | `true` nur Fahrzeugbeschriftung, Beschriftung; Textil später Flex/Flock [R 2.2] |
| **ebenen[]** | `{name, rolle, gesperrt}`; Banner/Roll-up, Lasergravur, Sonstiges: leer [M 13] |
| **massstab** | `{standard: 1 \| 30}` |
| **zeichenflaeche** | `vorlage` (Fahrzeug mit CC-Vision, Schild) · `neu` mit Maß (Beschriftung 1000 × 1000, Fahrzeug ohne Vorlage A4) · `fest` (Lasergravur 600 × 300 [R 2.10]) · `abfrage` Größe + Anzahl (Sonstiges [R 2.10]; Banner/Roll-up ohne Auftrag) · `app` (Banner/Roll-up mit Auftrag, Maße aus der App) · `produktvorlage` (Offset [R 2.9]) · `mockup` (Textil) |
| **quelle** | `{sandbox: "Sandbox" \| null}` — Zielebene für Quellinhalt; `null` = Inhalt bleibt wie er ist |
| **export** | `{profil, preset, dateiname}`; Profile `flach` (Banner/Roll-up, Lasergravur, Sonstiges, Preset „pam x4“ [M 14]), `offset` (Preset „wmd“), `produktion`, `schild`, `textil` |
| komplexitaet | je Rolle: `plott: immer`, `digitaldruck: mit_cutkontur`, UV und Flächen: `nie`; Textil je Verfahren (`flex`, `flock`: immer) [R 1.8] |
| verfahren | Schild: `folie` / `uv` mit Vorlage und Ebenen [R 2.8] |
| vorlage, druck, nesting, laminate, werkzeuge | unverändert übernommen für spätere Stufen |

- `mapping.json` (lebt im Panel [R Mapping]):

```json
{
  "LFP":             { "VEHICLE_LETTERING": "fahrzeugbeschriftung", "STICKER": "beschriftung", "FOIL_PLOTTER": "beschriftung",
                       "SIGN_UV": "schild", "SIGN_FOIL": "schild", "BANNER": "banner_rollup", "ROLLUP": "banner_rollup", "OTHER_LFP": "sonstiges" },
  "LASER_ENGRAVING": { "*": "lasergravur" },
  "STAMP":           { "*": "lasergravur" },
  "TEXTILE":         { "*": "textil" },
  "COPYSHOP":        { "*": "offset" },
  "OTHER":           { "*": "sonstiges" }
}
```

- Prüfung beim Start: alle acht Dateien lesbar, Pflichtfelder vorhanden, Ebenen- und Rollennamen eindeutig, jede Zielart im Mapping existiert, jedes Export-Profil bekannt. Fehler → Popup.

## 7. Exportkern

Modul `panel/lib/export.js` (Node) plus Speicherfunktionen im JSX. Alle Exporte aller Auftragsarten laufen hier durch; Stufe 1 liefert den Kern und das Profil `flach`.

### 7.1 Schnittstelle

`exportieren(auftrag)` mit `auftrag = { xmp, dateien: [{ name, speichern(lokalerPfad) }], dtf: [name…] }` → `{ ok, ordner, dateien[], geparkt[] }`. `speichern` ist der JSX-Aufruf (PDF/AI), der Kern kümmert sich um Ort, Namen, Transfer, Prüfung, XMP.

### 7.2 Ablauf

1. **Kundenordner sicherstellen.** Steht `ablage.kundenordner` im XMP, weiter. Sonst Server-Erreichbarkeit prüfen (`fs.access` auf `server.kunden` mit 3 s Zeitlimit, damit ein hängendes SMB das Panel nicht blockiert). Erreichbar → Ordnerdialog, Start in `server.kunden` [M 8]; gültig ist nur ein Ordner genau zwei Ebenen darunter (`<Buchstabe>/<Kunde>`), alles andere → Popup und erneut; der Mensch legt neue Kundenordner im Dialog selbst an [R 5.2]. Nicht erreichbar: `arbeitsdateien = "server"` → Popup, Abbruch; sonst weiter ohne Kundenordner (Mac-Weg, Dateien bleiben lokal) [M 1, R 5.4].
2. **Auftragsordner.** `ablage.auftragsordner` aus dem XMP; auf dem Server anlegen, falls fehlend. Existiert er dort schon von einem anderen Auftrag (nicht im XMP dieses Dokuments), wird `_02`, `_03` angehängt und ins XMP geschrieben.
3. **Lokaler Schreibort.** `lokal.ausgang/<Kunde>/<auftragsordner>/` (Mac: entspricht dem Schreibtisch-Kundenordner), Windows `…\Ausgang\<Kunde>\<auftragsordner>\`.
4. **Dateinamen.** Fortlaufend ohne Überschreiben [R 5.7]: erste freie Nummer wird gegen lokalen Ordner **und** Server-Ordner bestimmt (`Name.pdf`, `Name_02.pdf` …), vor dem Schreiben.
5. **Schreiben.** `speichern(lokalerPfad)` je Datei; danach prüft Node Existenz und Größe > 0. Fehler → Popup, Abbruch vor dem Transfer.
6. **Transfer** (nur mit Kundenordner): je Datei Kopie auf den Server unter `.<name>.teil`, Größenvergleich, dann Umbenennen auf den Endnamen, dann lokale Datei löschen [R 5.5, A-5]. Jeder Fehler: `.teil` entfernen, lokale Datei bleibt, Datei gilt als geparkt. Es liegen nie halbe Dateien unter Endnamen auf dem Server.
7. **DTF-Sammelordner** [R 5.3, M 7]: für die in `dtf` genannten Dateien zusätzlich eine Kopie nach `server.dtf_bestellen`, gleiches `.teil`-Verfahren, Nummerierung gegen den Sammelordner. Fehler hier gilt nur für die DTF-Kopie.
8. **Arbeitsdatei** [M 2, A-4]: ist `arbeitsdateien` ein lokaler Pfad, wird nach erfolgreichem Transfer die gespeicherte Arbeitsdatei (.ai) zusätzlich in den Server-Auftragsordner kopiert (Kopie, `.teil`-Verfahren; die lokale bleibt Arbeitskopie). Bei `"server"` liegt sie dort ohnehin.
9. **XMP.** Eintrag in `exporte[]` mit `uebertragen: true/false` je Datei.
10. **Meldung.** Nur bei Fehlern ein Popup: welche Dateien wo geparkt liegen bzw. was fehlgeschlagen ist. Kein Erfolgs-Popup.

### 7.3 Profil „flach“ (Stufe 1)

Lasergravur `<Kunde>_laser.pdf`, Sonstiges und Banner/Roll-up `<Kunde>_druck.pdf`; Preset „pam x4“, alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen (Produktionsregeln §11). `Kunde` aus dem XMP, Umlaute wie bisher umgeschrieben.

## 8. Anlegen „ohne Auftrag“ (Stufe 1)

Modales Fenster `.anlegen` [R 2.3/4.9]. In Stufe 1 nur der Zweig „ohne Auftrag“; der Zweig „Auftrag“ (Produktliste über das SDK) kommt in Stufe 2, die Gestaltung des Gesamtdialogs dann mit MockUp [A-8, R 7.10].

- Felder: Auftragsart (Liste aus der Konfiguration, ohne Textil und Offset [A-8]), Kunde (Text), Quelle: `geöffnete Datei` / `Datei öffnen` / `leer`. Artabhängig: Fahrzeugbeschriftung Häkchen „Fahrzeugvorlage“ [R 2.6]; Schild Verfahren Folie / UV-Druck; Sonstiges und Banner/Roll-up Breite, Höhe, Anzahl Zeichenflächen [R 2.10]; bei einer .ai-Quelle ohne XMP die Maßstabsfrage, Standard 1:1, umschaltbar 1:30 [R 2.5].
- Ablauf: Kundenordner sicherstellen (7.2 Schritt 1; auf dem Mac entfällt die Abfrage, wenn der Server nicht erreichbar ist [M 1]). Arbeitsdatei nach Konfiguration erzeugen (Ebenen, Maßstab, Zeichenfläche, Vorlage). Quelle: geöffnete Datei → Duplikat, Original bleibt unverändert offen [R 2.4]; Datei öffnen → nur Kopie; Inhalt auf `quelle.sandbox`, bei Arbeitsdatei gleicher Auftragsart in die gleichnamigen Ebenen, bei Maßstabswechsel automatisch skaliert, Ergebnis immer auf der Sandbox [R 2.5]. XMP schreiben (5.1). Speichern als `Arbeitsdatei.ai` [A-9] in `<arbeitsdateien>/<Kunde>/<auftragsordner>/` bzw. bei `"server"` im Server-Auftragsordner.
- Grundsatz: keine fremde Datei wird verändert oder verschoben [R 2.3].

## 9. Tests, Doku

- `node --test tests/*.test.js`, ohne Illustrator: Konfiguration (acht Arten, Mapping, Schema-Prüfung, bewusst fehlerhafte Datei), `rechner.json`-Auflösung mit Mac- und Windows-Beispiel, XMP-JSON (serialisieren/parsen, unbekannte Felder bleiben), Nummerierung gegen zwei Ordner, Exportkern mit Temp-Ordnern (Erfolg, Transfer schlägt fehl → geparkt und kein `.teil` übrig, DTF-Kopie). Keine Illustrator-Läufe [R 7.9]. Ausprobieren in Illustrator macht Markus nach Neustart von Illustrator (Panel lädt aus dem Projektordner).
- `CLAUDE.md` neu für das Repo: Testregeln wie bisher, ohne `bereitstellen.sh` je Stufe; Commit und Push je Stufe; Originalskripte tabu. README = aktueller Architekturstand, CHANGELOG knapp, TESTBERICHT minimal [R 7.8].

## 10. Ableitungen Claude — Stand der Bestätigung

1. Projektordner ist `~/tools/Illustrator Panel`; `Infos/` kommt ins Repo. — bestätigt
2. Illustrator lädt während der Entwicklung direkt aus dem Projektordner; das alte Panel ist damit ab Stufe 1 nicht mehr sichtbar. — bestätigt
3. Windows-Ausgangsordner `%LOCALAPPDATA%\PAM-Werkzeuge\Ausgang` als technischer Zwischenschritt. — bestätigt
4. Mac: nach jedem erfolgreichen Export wird die Arbeitsdatei zusätzlich in den Server-Auftragsordner kopiert; die Schreibtisch-Kopie bleibt Arbeitskopie. — bestätigt
5. Exportierte Dateien werden nach geprüftem Transfer lokal gelöscht (Verschieben). — bestätigt
6. Auftragsordner ohne Auftrag: `JJJJ-MM-TT_<Auftragsart>`. — bestätigt
7. Windows-Pfad des DTF-Sammelordners `Y:\_02_Produktion\= DTF bestellen =`. — bestätigt
8. Anlegen-Dialog in Stufe 1 nur „ohne Auftrag“, ohne Textil und Offset, ohne vorheriges MockUp. — bestätigt
9. Arbeitsdatei heißt weiter `Arbeitsdatei.ai`. — bestätigt
10. Push setzt einen GitHub-Zugang auf dem Mac voraus. — `git ls-remote` auf das (leere) Repo funktioniert ohne Abfrage; ob Push ohne Anmeldung geht, zeigt der erste Push.
