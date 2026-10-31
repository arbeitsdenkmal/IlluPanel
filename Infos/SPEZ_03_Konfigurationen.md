# Spezifikation „Konfigurationen“ — Offset-Daten, Banner/Roll-up, Sonstiges, Lasergravur (Thema 2 der SDK-unabhängigen Reste)

Stand: 31.10.2026, Fassung 4 (Hilfslinien-Ebenen als Liste „Hilfslinien“ und „Sicherheitsabstand“ — §3.1, §3.2, §3.3, §4.1–§4.3, §12; Markus 31.10. abends, Befund Gesamtlauf). Fassung 3 (Vorlagen-Dateinamen frei über `produkte.csv` bzw. `banner_rollup.json`, neues Produkt Einbruchfalz DIN A7 — §3.1, §3.2, §3.3, §4.1, §11; Markus 31.10. abends). Fassung 2 (gebaut 3.3.0; Festlegungen CC bestätigt §10, Punkt 15 geändert; Rückfragen CC in §2.2, §3.3 und §4 eingearbeitet). Grundlage: Register 2.9, 2.10, Mapping (Stand 31.10., mit den Änderungen aus diesem Thema), `claude/SPEZ_01_Fundament.md` §6–§8, gebauter Stand 3.2.0 (Anlegen-Dialog, Exportkern, Profil „flach“), altes Projekt `~/tools/folienkalkulation` (`config/produkte.csv`, `createOffset`, Offset-Export) als Nachschlagewerk. Alle offenen Fragen und Ableitungen sind mit Markus geklärt (31.10.).

**Oberfläche (Thema 6, 31.10.):** Platzierung, Gestaltung und Fenstergrößen regelt `claude/SPEZ_03_Oberflaeche.md`; die hier als vorläufig bezeichneten Stellen sind dort ersetzt (§16). Funktion und Texte bleiben, soweit dort nichts anderes steht.

## 1. Umfang

- **Offset-Daten** werden anlegbar und exportierbar: Produktliste aus `config/produkte.csv`, je Produkt und Ausrichtung eine Vorlage (.ait) von Markus, Dateiname je Vorlage in der CSV, „freies Format“ auf `Offset.ait`, Export Preset „wmd“ mit Dokument-Anschnitt in den Auftragsordner und zusätzlich in den Sammelordner „= wmd bestellen =“.
- **Banner/Roll-up**: Wahl Banner (Maßabfrage, wie gebaut) oder eine der zwei Roll-up-Größen aus je einer Vorlage mit 200 mm Dokument-Anschnitt unten.
- **Sonstiges**: Vorbelegung der Maßabfrage aus der Quelle, ohne Quelle A4 hoch (Register 2.10 geändert).
- **Lasergravur**: unverändert wie gebaut (fest 600 × 300, Inhalt 1:1 wie im Dokument angelegt, Export `<Kunde>_laser.pdf`).
- **Austauschstelle für Stufe 3**: alles, was im Weg „ohne Auftrag“ im Dialog gewählt wird, läuft als ein Wahl-Objekt in das Anlegen (§2.1); Stufe 3 erzeugt dasselbe Objekt aus dem App-Produkt, sonst ändert sich nichts.
- Darstellung im Dialog: SPEZ_03_Oberflaeche §4.

Nicht enthalten: Supabase/SDK, Textil im Anlegen-Dialog, Schild (Thema 3), Hohlsaum/Ösen oder sonstige Konfektion bei Banner, Hilfslinien vom Panel (Hilfslinien kommen ausschließlich aus der .ait).

## 2. Gemeinsame Grundlagen

### 2.1 Wahl-Objekt (Austauschstelle Stufe 3)

`panel/lib/anlegen.js` bekommt die artabhängige Wahl als ein Objekt `e.wahl` statt als einzelne Dialogfelder:

```
offset:        { produkt: "<schluessel>" | null (freies Format), ausrichtung: "hoch" | "quer", seiten: 1 | 2,
                 breite_mm, hoehe_mm (nur freies Format) }
banner_rollup: { variante: "banner" | "<rollup-id>", breite_mm, hoehe_mm, anzahl (nur banner) }
sonstiges:     { breite_mm, hoehe_mm, anzahl }
lasergravur:   {}
```

Im Weg „ohne Auftrag“ baut `anlegen.js` (Dialogseite) das Objekt aus den Feldern; `jsxSpec` liest nur noch das Wahl-Objekt. Stufe 3 ergänzt eine Funktion, die das Objekt aus dem App-Produkt bildet (Offset über `app_typ` in `produkte.csv`, Roll-up über die App-Maße gegen `rollup[]`, Banner über die App-Maße, `zeichenflaeche.mit_auftrag.art: "app"` bleibt). Für die übrigen Arten (Fahrzeugbeschriftung, Beschriftung, Schild) bleibt der Aufruf wie gebaut.

### 2.2 Quelle und Vorbelegung

- **Quelle mit Inhalt** = „geöffnete Datei“ oder „Datei öffnen“; **leer** = Quelle „leer“.
- `IP.dokumentInfo` liefert zusätzlich `zeichenflaechen: [{ breite_mm, hoehe_mm }]` (Dokumentmaß, Reihenfolge der Zeichenflächen). Vorbelegungen aus der Quelle rechnen in Realmaß: Dokumentmaß × Maßstab der Quelle (aus ihrem XMP bzw. aus der Maßstabsabfrage).
- Vorbelegung wird gesetzt, wenn die Art gewählt, die Quelle gewechselt oder die Maßstabsabfrage umgeschaltet wird (dann auch über Handeingaben hinweg); sonst sind die Felder frei änderbar.
- Maßstab: alle vier Arten 1:1; eine Quelle mit anderem Maßstab wird wie gebaut skaliert (SPEZ_01 §8, Register 2.5).
- Grundsatz unverändert: keine fremde Datei wird verändert oder verschoben; Vorlagen werden nur geöffnet und unter neuem Namen als Arbeitsdatei gespeichert.

### 2.3 Panel-Zustände

Eine Arbeitsdatei mit Profil `offset` verhält sich im Panel wie eine mit Profil `flach`: Zeile 1 mit Grafikzeit, „Export“ und „Auftrag“ aktiv, übrige Buttons gesperrt (SPEZ_02 §13). Die Freigabe der Werkzeugzeile aus Thema 1 (SPEZ_03_Werkzeuge §2) bleibt unberührt.

## 3. Offset-Daten

### 3.1 Konfiguration

`config/auftragsarten/offset.json`:

```json
{
  "id": "offset", "name": "Offset-Daten", "reihenfolge": 6, "kalkulation": false, "ebenen": [],
  "massstab": { "standard": 1 },
  "zeichenflaeche": { "art": "produktvorlage" },
  "quelle": { "sandbox": null },
  "produkte": "config/produkte.csv",
  "vorlagen": "config/vorlagen/offset",
  "frei": { "name": "freies Format", "vorlage": "config/vorlagen/Offset.ait" },
  "hilfslinien": { "ebenen": ["Hilfslinien", "Sicherheitsabstand"] },
  "zeichenflaechen_abstand_mm": 10,
  "export": { "profil": "offset", "preset": "wmd", "dateiname": "druck", "anschnitt": "dokument", "sammelordner": "wmd_bestellen" },
  "dateien": { "arbeitsdatei": "Arbeitsdatei.ai" },
  "werkzeuge": [], "arten": []
}
```

- Das Preset steht nur hier (Konfiguration des Panels), nicht in der CSV.
- `hilfslinien.kontur_pt` und `vorlage.datei` entfallen (das Panel zeichnet keine Linien; Vorlagen je Produkt).
- **Geändert Fassung 4:** `hilfslinien.ebenen` (Liste) ersetzt `hilfslinien.ebene`. Hilfslinien-Ebenen sind alle Ebenen einer Vorlage mit einem Namen aus der Liste: Vorlagen mit Falz haben „Hilfslinien“, Vorlagen ohne Falz nur „Sicherheitsabstand“ (Markus 31.10. abends). Überall, wo bisher „Hilfslinien“ bzw. `hilfslinien.ebene` steht, gilt die Liste.

`config/produkte.csv` (Markus pflegt sie, die Produktliste im Panel bildet ausschließlich diese Datei ab). **Geändert Fassung 3:** die Spalte `ausrichtung` entfällt, dafür nennen `vorlage_hoch` und `vorlage_quer` die Dateinamen der Vorlagen. Bestand (Vorlagen liegen, Markus 31.10. abends):

```
schluessel;bezeichnung;breite_mm;hoehe_mm;zeichenflaechen;vorlage_hoch;vorlage_quer;app_typ
falzflyer-din-lang;Falzflyer DIN lang;297;210;2;Falzflyer_din lang_hoch.ait;;
einbruchfalz-a4;Einbruchfalz DIN A4;420;297;2;Einbruchfalz auf A4_hoch.ait;Einbruchfalz auf A4_quer.ait;
einbruchfalz-a5;Einbruchfalz DIN A5;297;210;2;Einbruchfalz auf A5_hoch.ait;Einbruchfalz auf A5_quer.ait;
einbruchfalz-a6;Einbruchfalz DIN A6;210;148;2;Einbruchfalz auf A6_hoch.ait;Einbruchfalz auf A6_quer.ait;
einbruchfalz-a7;Einbruchfalz DIN A7;148;105;2;Einbruchfalz auf A7_hoch.ait;Einbruchfalz auf A7_quer.ait;
a4;A4;210;297;1/2;A4_hoch.ait;A4_quer.ait;
a5;A5;148;210;1/2;A5_hoch.ait;A5_quer.ait;
a6;A6;105;148;1/2;A6_hoch.ait;A6_quer.ait;
a7;A7;74;105;1/2;A7_hoch.ait;A7_quer.ait;
visitenkarte-85x55;Visitenkarte 85 × 55;55;85;1/2;Visitenkarte_55x85.ait;Visitenkarte_85x55.ait;
visitenkarte-90x50;Visitenkarte 90 × 50;50;90;1/2;Visitenkarte_50x90.ait;Visitenkarte_90x50.ait;
```

- `breite_mm`/`hoehe_mm` = Maß von Zeichenfläche 1 der hoch-Vorlage (offenes Format); die quer-Vorlage hat das gedrehte Maß. Ohne hoch-Vorlage gilt das Maß für die quer-Vorlage.
- `zeichenflaechen`: `1`, `2` oder `1/2` (wählbar). `vorlage_hoch`/`vorlage_quer`: Dateiname in `config/vorlagen/offset/` (nur Name, kein Pfad, Endung `.ait`), leer = diese Ausrichtung gibt es nicht. `app_typ`: bleibt leer bis Stufe 3.
- Neu im Bestand: `einbruchfalz-a7` (Endformat A7, offen 148 × 105; Markus 31.10. abends).
- Die Spalten `falz_mm`, `anschnitt_mm`, `sicherheit_mm`, `preset` des alten Projekts entfallen.
- Startprüfung (wie die übrigen Konfigurationsdateien): Datei lesbar, Kopfzeile mit allen acht Spalten, `schluessel` eindeutig und nicht leer, `bezeichnung` nicht leer, Maße > 0, `zeichenflaechen` aus den erlaubten Werten, mindestens eine der Spalten `vorlage_hoch`/`vorlage_quer` gefüllt, gefüllte Vorlagen-Felder ohne Pfadtrenner und mit Endung `.ait`. Fehler → Popup mit Datei, Zeile und Grund; die Art Offset ist dann im Dialog gesperrt, alle anderen Arten bleiben nutzbar. Ob die Dateien existieren, prüft der Dialog (§3.2).

### 3.2 Vorlagen

**Geändert Fassung 3:** Dateinamen frei nach `produkte.csv` (`vorlage_hoch`, `vorlage_quer`), Ordner `config/vorlagen/offset/`. Das Schema `<schluessel>_<ausrichtung>.ait` entfällt. Markus hat alle 21 Vorlagen des Bestands angelegt.

Anforderungen an jede Offset-Vorlage:
1. Dokument in mm, CMYK.
2. Zeichenflächen = Endformat offen in der Ausrichtung der Datei; Anzahl 1 bei `zeichenflaechen` `1`, sonst 2. Zeichenfläche 1 = Vorderseite bzw. außen, Zeichenfläche 2 = Rückseite bzw. innen.
3. Anschnitt als Dokument-Anschnitt (Datei → Dokument einrichten); das Panel liest und rundet nichts.
4. Hilfslinien, wo das Produkt welche braucht, auf den Hilfslinien-Ebenen (§3.1): mit Falz „Hilfslinien“, ohne Falz „Sicherheitsabstand“; oberste Ebenen, gesperrt, nicht druckend. Vorlagen ohne Hilfslinien-Ebene sind zulässig (z. B. Visitenkarte 85 × 55, Markus 31.10. abends). Markus legt die Vorlagen an; das Panel prüft das nicht.
5. Sonst kein Inhalt; weitere leere Ebenen entfernt das Panel beim Anlegen.

`Offset.ait` (freies Format) bleibt wie sie ist (eine Zeichenfläche, 3 mm Dokument-Anschnitt, ohne Hilfslinien).

Prüfung:
- **Beim Öffnen des Dialogs**: je Produkt und gefüllter Vorlagen-Spalte, ob die Datei existiert. Fehlt eine Ausrichtung (Spalte leer oder Datei fehlt), wird nur die vorhandene angeboten; fehlen beide, ist der Produkteintrag gesperrt, Tooltip = erwartete Pfade.
- **Beim Anlegen** (die Vorlage ist dann geöffnet): Zeichenfläche 1 weicht um mehr als 0,1 mm vom Sollmaß ab oder die Zahl der Zeichenflächen stimmt nicht → Vorlage ohne Speichern schließen, Popup `Vorlage <Datei>: <Grund>`, nichts angelegt. Vorher lässt sich das nicht prüfen, ohne jede Vorlage in Illustrator zu öffnen.

### 3.3 Anlegen

- Offset wird in `DIALOG_ARTEN` aufgenommen (Textil bleibt draußen).
- **Felder** (nur bei Art Offset; Darstellung SPEZ_03_Oberflaeche §4): Auswahlliste der Produkte mit `bezeichnung` in CSV-Reihenfolge, als letzter Eintrag „freies Format“. Darunter:
  - Produkt mit beiden verfügbaren Vorlagen: Wahl „hoch“ / „quer“; sonst keine Wahl (die vorhandene Ausrichtung gilt).
  - Produkt mit `1/2`: das vorhandene Feld „Anzahl Zeichenflächen“, erlaubt 1 oder 2; bei `1` oder `2` kein Feld.
  - „freies Format“: die vorhandenen Felder Breite, Höhe, „Anzahl Zeichenflächen“ (1 oder 2).
- **Vorbelegung**: Quelle mit Inhalt — Ausrichtung „quer“, wenn Zeichenfläche 1 der Quelle breiter als hoch ist, sonst „hoch“; Anzahl 2, wenn die Quelle mindestens zwei Zeichenflächen hat, sonst 1; freies Format zusätzlich Breite × Höhe von Zeichenfläche 1 der Quelle. Leer — hoch, 1, Breite/Höhe leer. „Let's go“ gesperrt, solange kein Produkt gewählt ist bzw. beim freien Format Maße fehlen.
- **Arbeitsdatei** (JSX, neue Grundlage `produktvorlage`):
  1. Vorlage öffnen (Produkt: Datei aus `vorlage_hoch` bzw. `vorlage_quer` der gewählten Ausrichtung; freies Format: `Offset.ait`), prüfen (3.2).
  2. Produkt mit `1/2` und Anzahl 1: Zeichenfläche 2 entfernen. Freies Format: Zeichenflächen auf Breite × Höhe, Anzahl 1 oder 2 nebeneinander mit `zeichenflaechen_abstand_mm`; der Dokument-Anschnitt der Vorlage bleibt.
  3. Quelle mit Inhalt: Ebenen der Quelle werden als gleichnamige Ebenen unter den Hilfslinien-Ebenen übernommen (Reihenfolge wie in der Quelle); oberste Quell-Ebenen mit einem Namen aus `hilfslinien.ebenen` werden nicht übernommen (wie Festlegung 14). Inhalt von Quell-Zeichenfläche n kommt zentriert auf Vorlagen-Zeichenfläche n. Hat die Quelle mehr Zeichenflächen als die Vorlage, behält der Inhalt jeder weiteren Quell-Zeichenfläche seinen Versatz zu Quell-Zeichenfläche 1, bezogen auf die Lage, die Quell-Zeichenfläche 1 nach dem Zentrieren hat — er liegt also daneben, nie übereinander; danach ein Hinweis-Popup `<n> Zeichenfläche(n) der Quelle liegen außerhalb der Vorlage`. Hat die Quelle weniger, bleiben die übrigen Zeichenflächen leer.
  4. Nur bei Quelle mit Inhalt: leere Ebenen der Vorlage außer den Hilfslinien-Ebenen entfernen. Bei „leer“ bleiben die Ebenen der Vorlage unverändert. Die Hilfslinien-Ebenen bleiben in beiden Fällen oben, gesperrt, nicht druckend, in ihrer Reihenfolge aus der Vorlage.
  5. XMP schreiben (§8), speichern als `Arbeitsdatei.ai` wie gebaut (Ort, Auftragsordner `JJJJ-MM-TT_Offset-Daten`).
- Gleiche Auftragsart als Quelle (Offset-Arbeitsdatei): derselbe Weg; die Hilfslinien kommen aus der neuen Vorlage.

### 3.4 Export (Profil `offset`)

- Neues Modul `panel/lib/export_offset.js` nach dem Muster von `export_flach.js`; der Export-Button ruft es bei Profil `offset` auf.
- Datei: `<Kunde>_<Bezeichnung>_druck.pdf` (Bezeichnung aus dem XMP, umgeschrieben mit derselben Funktion wie der Kundenname); freies Format `<Kunde>_druck.pdf`. Nummerierung wie bisher ohne Überschreiben [R 5.7].
- Speichern über `IP.pdfSpeichern` mit Preset aus der Konfiguration („wmd“), alle Zeichenflächen, ohne Bearbeitungsdaten, ohne PDF-Ebenen, **Anschnitt aus dem Dokument**: `spec.anschnitt: "dokument"` setzt `bleedLink = true` (Grund: mit einem Preset übernimmt der Skript-Export den Dokument-Anschnitt sonst nicht, Befund im alten Projekt Stufe 14). Keine Rundung, kein eigener Anschnittwert.
- Ablage über den Exportkern in den Auftragsordner und zusätzlich als Kopie in `server.wmd_bestellen` (§7). Die Arbeitsdatei-Kopie in den Server-Auftragsordner wie gebaut.

## 4. Banner/Roll-up

### 4.1 Konfiguration

`config/auftragsarten/banner_rollup.json` wird ergänzt um (**geändert Fassung 3:** Vorlagen-Dateinamen nach Markus):

```json
"rollup": [
  { "id": "rollup_850",  "name": "Roll-up 850 × 2000",  "breite_mm": 850,  "hoehe_mm": 2000, "vorlage": "config/vorlagen/rollup/RollUp_850.ait" },
  { "id": "rollup_1000", "name": "Roll-up 1000 × 2000", "breite_mm": 1000, "hoehe_mm": 2000, "vorlage": "config/vorlagen/rollup/RollUp_1000.ait" }
],
"banner": { "name": "Banner" },
"hilfslinien": { "ebenen": ["Hilfslinien", "Sicherheitsabstand"] }
```

`zeichenflaeche` (`abfrage`, `mit_auftrag.art: "app"`) und `export` (`flach`, „pam x4“, `druck`) bleiben. Startprüfung: `rollup[]` mit `id` (eindeutig, nicht „banner“), `name`, Maße > 0, `vorlage`.

### 4.2 Vorlagen

`config/vorlagen/rollup/RollUp_850.ait` und `RollUp_1000.ait` von Markus (liegen, 31.10. abends): mm, CMYK, eine Zeichenfläche 850 × 2000 bzw. 1000 × 2000 mm, Dokument-Anschnitt oben/links/rechts 0, unten 200 mm, sonst kein Inhalt (Hilfslinien-Ebenen wie bei Offset erlaubt, nicht verlangt; sind sie da, gelten für sie dieselben Regeln wie bei Offset, §3.3 Schritte 3 und 4). Fehlende Datei → Option im Dialog gesperrt, Tooltip = Pfad; Prüfung beim Anlegen wie 3.2 (Zeichenfläche ± 0,1 mm, genau eine).

### 4.3 Anlegen

- Wahl (nur bei Art Banner/Roll-up; Darstellung SPEZ_03_Oberflaeche §4): „Banner“ · „Roll-up 850 × 2000“ · „Roll-up 1000 × 2000“ (Texte aus `banner.name` bzw. `rollup[].name`), keine Vorauswahl; „Let's go“ gesperrt ohne Wahl.
- **Banner**: wie gebaut — Maßabfrage Breite, Höhe, Anzahl Zeichenflächen ohne Vorbelegung; Kopie der Quelle mit unveränderten Ebenen bzw. neues Dokument, Zeichenflächen nach Abfrage.
- **Roll-up**: die Zeichenfläche kommt immer aus der gewählten Vorlage, keine Maßabfrage. Quelle mit Inhalt: Ebenen der Quelle als gleichnamige Ebenen übernommen, außer obersten Ebenen mit einem Namen aus `hilfslinien.ebenen` (wie Offset); der gesamte Inhalt (alle Zeichenflächen) als ein Block 1:1 mittig auf die Zeichenfläche der Vorlage; leere Ebenen der Vorlage außer den Hilfslinien-Ebenen entfernt; Hilfslinien-Ebenen der Vorlage bleiben oben, gesperrt, nicht druckend. Leer: nur die Vorlage, Ebenen unverändert. XMP (§8), speichern wie gebaut.

### 4.4 Export

Profil `flach`, Preset „pam x4“, Datei `<Kunde>_druck.pdf` wie gebaut. Roll-up mit Anschnitt aus dem Dokument (`anschnitt: "dokument"`, `bleedLink = true`, wie 3.4); Banner wie gebaut ohne Anschnittangabe. `export_flach.js` liest dafür `banner_rollup.variante` aus dem XMP.

## 5. Sonstiges

- `config/auftragsarten/sonstiges.json`: `zeichenflaeche.breite_mm` 210, `hoehe_mm` 297 (Vorbelegung ohne Quelle, A4 hoch; bisher 600 × 300).
- Vorbelegung der Maßabfrage: Quelle mit Inhalt → Breite × Höhe von Zeichenfläche 1 der Quelle (Realmaß, §2.2) und Anzahl = Zahl ihrer Zeichenflächen; leer → 210 × 297, Anzahl 1.
- Anlegen und Export sonst wie gebaut (Kopie der Quelle mit unveränderten Ebenen, Zeichenflächen nach Abfrage, `<Kunde>_druck.pdf`, „pam x4“).

## 6. Lasergravur

Keine Änderung: Zeichenfläche fest 600 × 300, mit Quelle Kopie mit unveränderten Ebenen und Inhalt 1:1 wie im Dokument angelegt (das Panel verschiebt nichts), Export `<Kunde>_laser.pdf`, „pam x4“, kein Sammelordner. Im Code nur die Umstellung auf das Wahl-Objekt (§2.1).

## 7. Exportkern und `rechner.json`

- `rechner.json`: neues Pflichtfeld `server.wmd_bestellen`. macOS `/Volumes/Server A-Z/_02_Produktion/= wmd bestellen =`, MKs PC `Y:\\_02_Produktion\\= wmd bestellen =`. CC ergänzt das Feld in `config/rechner.beispiel.json`, in README (beide Varianten) und in der vorhandenen `rechner.json` dieses Rechners (`~/Library/Application Support/PAM-Werkzeuge/rechner.json`, nur diese eine Zeile); Startprüfung wie die übrigen Pfadfelder.
- Exportkern: `auftrag.wmd: [name…]` analog zu `auftrag.dtf`; dieselbe Routine wie Schritt 7 in SPEZ_01 §7.2 (`.teil`-Verfahren, Nummerierung gegen den Sammelordner, Fehler gilt nur für die Kopie), Ziel `server.wmd_bestellen`. Die DTF-Logik wird dafür nur auf ein Ziel als Parameter umgestellt, nicht umgebaut.
- `IP.pdfSpeichern`: optionales `spec.anschnitt` (`"dokument"` → `bleedLink = true`); ohne Angabe Verhalten wie gebaut.

## 8. XMP (Ergänzung SPEZ_01 §5.1)

Art-spezifische Bereiche, beim Anlegen geschrieben, beim Export gelesen:

```json
"offset":        { "produkt": "einbruchfalz-a5", "bezeichnung": "Einbruchfalz DIN A5", "ausrichtung": "quer", "seiten": 2 },
"banner_rollup": { "variante": "rollup_850" }
```

- Freies Format: `produkt` und `bezeichnung` `null`, `ausrichtung` `null`, `seiten` 1 oder 2.
- Banner: `variante: "banner"`.
- Die Bezeichnung wird beim Anlegen festgeschrieben; eine spätere Änderung der CSV ändert den Dateinamen bestehender Arbeitsdateien nicht.
- `parsen()` ergänzt fehlende Bereiche mit `null`; unbekannte Felder bleiben erhalten (wie gebaut).

## 9. Repo, Doku, Tests

- Neu: `config/produkte.csv`, `config/vorlagen/offset/` und `config/vorlagen/rollup/` (die .ait liefert Markus), `panel/lib/export_offset.js`. Geändert: `config/auftragsarten/offset.json`, `banner_rollup.json`, `sonstiges.json`, `config/rechner.beispiel.json`, `panel/lib/konfiguration.js` (CSV und `rollup[]` prüfen, Pflichtfeld `wmd_bestellen`), `panel/lib/anlegen.js`, `panel/anlegen.html/.js`, `panel/lib/export.js`, `panel/lib/export_flach.js`, `panel/lib/dokument.js` (Bereiche §8), `panel/main.js` (Export bei Profil `offset`), JSX-Kern (`dokumentInfo` mit Zeichenflächen, Grundlage `produktvorlage`, Roll-up-Grundlage, `pdfSpeichern` mit Anschnitt). `Infos/Stammdaten/produkte.csv` bleibt als Referenz unverändert. Version 3.3.0.
- Tests [R 7.9]: `node --test tests/*.test.js`. Neu nur: `produkte.csv` gültig (Erstbestand) und eine fehlerhafte Zeile in der bestehenden Konfigurationsprüfung. Schlägt ein bestehender Test nur wegen der beauftragten Änderung fehl (z. B. Vorbelegung Sonstiges, Pflichtfeld `wmd_bestellen` in Testdaten), wird nur diese Erwartung angepasst. Keine Illustrator-Läufe. Probe durch Markus, sobald die Vorlagen vorliegen.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Konfigurationen“. Kein Commit, kein Push, außer der Auftrag nennt es.

## 10. Festlegungen CC — bestätigt 31.10.

FESTLEGUNGEN.md Abschnitt „Konfigurationen“, Punkte 1–23 (Stand 3.3.0, Arbeitskopie): bestätigt mit einer Änderung.

- **Punkt 15 geändert:** Roll-up behandelt „Hilfslinien“ wie Offset — eine oberste Quell-Ebene dieses Namens wird nicht übernommen, die Ebene der Vorlage kommt nach oben, gesperrt, nicht druckend (§4.2, §4.3). Grund: Inhalt einer Kunden-Ebene „Hilfslinien“ landete sonst in der nicht druckenden Vorlagen-Ebene und fehlte im Druck.
- Punkt 5 (Startprüfung nur `produkte` von den neuen Feldern in `offset.json`): bestätigt; fehlende übrige Felder fallen beim Anlegen bzw. Export als Fehler-Popup auf.
- Auf Rückfrage entschieden, keine CC-Festlegung: Offset mit „leer“ lässt die Ebenen der Vorlage unverändert (§3.3 Schritt 4); Umschalten der Maßstabsabfrage setzt die Vorbelegung neu (§2.2).
- Übrige Punkte bestätigt ohne Änderung: 1–4 (Fehlerbehandlung und Texte der CSV- und Roll-up-Prüfung, nur Offset gesperrt), 6 (leerer erster Listeneintrag, Tooltip mit allen erwarteten Pfaden), 7 (eine JSX-Grundlage `produktvorlage` mit `platzierung` „zeichenflaeche“/„block“), 8 (Texte der Vorlagenprüfung, `Offset.ait` ungeprüft), 9 (`ausrichtung` `null` beim freien Format), 10 (Rundung 0,01 mm, höchstens 2, „Datei öffnen“ vor der Wahl wie „leer“, Produktwechsel ändert nichts), 11 (Hinweis zählt alle überzähligen Zeichenflächen, nach dem Speichern), 12 (Objekte außerhalb jeder Zeichenfläche gehören zu Zeichenfläche 1), 13 (Skalierung bei anderem Maßstab samt Abstand zur Mitte), 14 (nur oberste Quell-Ebene „Hilfslinien“ ausgelassen), 16 (Block = geometrischer Umriss, Mitte auf Mitte), 17 (oberste Ebene außer „Hilfslinien“ aktiv), 18–19 (Meldungen und `SAMMELORDNER` analog DTF, `wmd` nur bei `export.sammelordner`), 20 (Roll-up an `variante` ≠ „banner“, fehlender Bereich wie Banner), 21 (`offset`/`banner_rollup` immer geschrieben, sonst `null`), 22 (Version 3.3.0), 23 (Probe Thema 1 im TESTBERICHT nachgetragen).

## 11. Änderung Fassung 3 — Vorlagen-Dateinamen (Markus 31.10. abends)

Umfang für CC:

1. `config/produkte.csv` auf den Bestand aus §3.1 umstellen (Spalte `ausrichtung` raus, `vorlage_hoch`/`vorlage_quer` rein, Zeile `einbruchfalz-a7` neu).
2. `panel/lib/konfiguration.js`: Startprüfung nach §3.1 (acht Spalten, mindestens eine Vorlage, nur Dateiname mit `.ait`); Auswertung von `ausrichtung` entfällt.
3. `panel/lib/anlegen.js`, `panel/anlegen.js`: Vorlagenpfad = `vorlagen` + Dateiname aus der CSV statt `<schluessel>_<ausrichtung>.ait`; Existenzprüfung, Ausrichtungswahl und Tooltip nach §3.2/§3.3. XMP-Feld `offset.ausrichtung` bleibt (`hoch`/`quer` nach gewählter Spalte).
4. `config/auftragsarten/banner_rollup.json`: `vorlage` der beiden Roll-ups nach §4.1.
5. Tests: bestehende Erwartungen zur CSV-Prüfung auf die neuen Spalten anpassen, keine neuen Tests.
6. Doku: README, CHANGELOG, TESTBERICHT wie üblich; kein Commit.

## 12. Änderung Fassung 4 — Hilfslinien-Ebenen (Markus 31.10. abends, Befund Gesamtlauf 3.1 Offset A6 hoch)

Umfang für CC:

1. `config/auftragsarten/offset.json` und `banner_rollup.json`: `"hilfslinien": { "ebenen": ["Hilfslinien", "Sicherheitsabstand"] }` statt `"ebene"`.
2. `panel/lib/konfiguration.js`: Startprüfung `hilfslinien.ebenen` (Liste, mindestens ein nicht leerer Name).
3. `panel/lib/anlegen.js` und JSX-Grundlagen `produktvorlage`/Roll-up: überall, wo `hilfslinien.ebene` gilt, die Liste nach §3.3 Schritte 3 und 4 sowie §4.3.
4. Testroutine 3.1 (Gesamtlauf): Erwartung „Ebenen nach Konfiguration“ auf die Liste umstellen; die Vorlagen werden nicht verändert.
5. Tests: bestehende Erwartungen nur anpassen, soweit die Liste es verlangt; keine neuen Tests.
6. Doku: README, CHANGELOG, TESTBERICHT wie üblich; Kopie dieser Fassung in `Infos/` liegt.
