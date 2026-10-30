# Spezifikation Stufe 2 „Zuordnen, Kalkulation, Schneidedaten, Druckbögen“ — PAM-Werkzeuge

Stand: 30.10.2026, Fassung 2 (Ableitungen 1–9 im Chat geklärt, Abschnitt 15). Grundlage: `claude/REGISTER_NEUAUFBAU.md` (Register), `claude/PREISLOGIK.md` v6 mit den Änderungen im Register, `claude/SPEZ_01_Fundament.md` (gebaut, 3.0.1), Antworten Markus vom 30.10. (Fragen 1–12 plus Nachfragen), `Infos/PRODUKTIONSREGELN.md`, `Infos/OPOS_ANALYSE.md`. Nur für Fahrzeugbeschriftung und Beschriftung. SDK-unabhängig: alles, was später aus Supabase kommt oder dorthin geht, läuft in Stufe 2 über die Preisquellen-Schnittstelle (lesen) und das XMP der Arbeitsdatei (schreiben).

Kennzeichnung: **[R x.y]** Registerpunkt · **[P §n]** PREISLOGIK · **[M]** Antwort Markus 30.10. · **[A-n]** Ableitung Claude, geklärt mit Markus 30.10., Abschnitt 15.

## 1. Umfang

Enthalten:
1. Konfiguration: `config/medien.json`, `config/serien.json`, `config/farbfelder/*.ase`; Preisquellen-Schnittstelle mit Entwicklungsquelle `Infos/Stammdaten/preisliste.csv` [R 6.4]
2. Datenschicht-Erweiterung: `IP_Id` als Schlüssel, Varianten-Erkennung, `IP_Anzahl`, XMP-Felder `vorauswahl`, `farbzuordnung`, `kalkulation`, `grafikzeit`
3. Lesen und Messen der Objekte (Prüfungen, Teile, Schnittlänge, Flächen, Cutkontur, Motivumriss)
4. Zuordnen-Dialog (Fenster „Objekt“) für Plott und Digitaldruck
5. Nesting und Rollenwahl (gemeinsam für Kalkulation, Schneidedaten, Druckbögen)
6. Kalkulation nach PREISLOGIK v6 mit Anzahl-Multiplikator, Kalkulationsdatensatz ins XMP
7. Fenster „Objekte“ und „Details“ (nicht modal) [R 4.5]
8. Produktionsdatenblatt `<Kunde>_Info.pdf` (Stückliste, ohne Preise) [M]
9. Plott-Schneidedaten (Summa) über den Exportkern
10. Druckbögen aufbauen (Druck) und exportieren (Export mit eigenen OPOS-Marken) über den Exportkern
11. Grafikzeit: Hintergrund-Extension, Feld „+ min“, Einträge ins XMP [M 1, R 2.12, R 4.8]
12. Panel-Erweiterung: Objektzeile, Buttons, Preiszeilen

Nicht enthalten [M 12]: Supabase/SDK (Produktliste, Login, Rückmeldung, Preisliste aus Supabase), Breite/Masken [R 4.3], Nutzen/Gitter/MB-Nr [R 3.9], Schild (Zuordnen, Schneidedaten), Textil Flex/Flock [R 2.2], Skript-Buttons, Bereitstellung nach `/Applications/interne Tools`. Entfallen gegenüber dem alten Panel: Fenster „Kopie“ [M 4], Messprotokoll-JSON und Grafikzeit-JSON [R 5.8], Kalkulations-PDF mit Preisen [M 2], Preis bestätigen/senken [R 1.3], Maßstabsfeld im Panel [M 6], Einstellungen-Fenster (Preislistenpfad; Quelle ist fest, Abschnitt 4).

## 2. UI-Teile und MockUps

Vor dem Bau der UI-Teile legt Claude (nicht CC) MockUps mit den echten Inhalten aus Code und Konfiguration vor [M 11, R 7.10]: Panel (Objektzeile, Buttons, Preiszeilen, Zustände mit/ohne Auftrag, mit/ohne Auswahl), Fenster „Objekt“ (Zuordnen), „Objekte“, „Details“. Die Kritik am bisherigen Zuordnen-Dialog klärt Markus in dieser Phase [R 4.6]. Button-Texte werden im MockUp aus den vorhandenen Texten gewählt (bisher: „Auftrag“, „Export“, „Summa“, „Druck“, „add/edit“, „list“, „calc“, „pdf“); nichts Neues ohne Markus.

Diese Spezifikation legt Funktion und Daten fest; Anordnung, Größen und Texte der vier UI-Teile folgen aus den MockUps und werden als Nachtrag ergänzt.

## 3. Datenschicht (Erweiterung von SPEZ_01 §5)

### 3.1 Objektebene

| Tag | Stufe 2 |
|---|---|
| `IP_Id` | Schlüssel des Objekts; vergeben beim Zuordnen (zeitbasiert + Zufall, Text). Alle Bezüge (Kalkulationsdatensatz, Symbole, Varianten, „Objekte“) laufen über die Id, nicht über den Namen |
| `IP_Folie` | Plott `751C-031`, Druck Medium `3551` (Schlüssel aus `serien.json` bzw. Preisliste) |
| `IP_Laminat` | `matt` / `glaenzend`, nur Druck |
| `IP_Anzahl` | ganze Zahl ≥ 1, Standard `1` [R 3.4] |
| `IP_Komplexitaet` | `0`–`3`, nur wo geschnitten wird [R 1.8] |
| `IP_Attribute` | kommagetrennt aus `sicke`, `woelbung`, `tape` |
| `IP_Original` | `IP_Id` des Originals bei Varianten |
| `IP_Herkunft` | nur auf Druckbögen: `IP_Id` des Objekts, dessen Symbolinstanz das ist |

**Objektname** [M 3]: frei, keine Pflicht, keine Eindeutigkeit. Anzeige in „Objekte“/„Details“/Info.pdf: Illustrator-Name des Objekts; ohne Namen „Objekt“ + laufende Nummer in Ebenenreihenfolge (nur Anzeige, nicht gespeichert). [A-1]

**Varianten** [M 4, M 5]: Bei Zuordnen, Berechnen, Summa und Druck (dort werden die Tags ohnehin gelesen; nicht bei „Maus ins Panel“, das liest nur die Auswahl) gilt: Vergleich nur der `IP_Id`-Texte, keine Geometrie. tragen mehrere Objekte dieselbe `IP_Id`, behält das in Ebenenreihenfolge erste sie; jedes weitere bekommt eine neue `IP_Id` und `IP_Original` = die bisherige Id (fehlt das Original inzwischen, bleibt `IP_Original` stehen). Alle übrigen Tags bleiben. Identische Exemplare laufen über `IP_Anzahl`, Varianten (gespiegelte Elemente, geänderter Text, andere Größe) über das Duplikat. Keine Spiegel-Option, kein Dialog. Herkunft für Symbole auf dem Druckbogen: ein Symbol je `IP_Id`; eine Variante bekommt ein eigenes Symbol, außer der Geometrievergleich (wie bisher: nur proportional skaliert, gedreht, gespiegelt, verschoben) ergibt Gleichheit mit dem Original — dann Instanz des Original-Symbols mit ihrer Transformation. [A-2]

### 3.2 Dokumentebene (XMP, Schema 1, Felder ergänzt)

```json
{
  "vorauswahl":    { "medium": "3551", "laminat": "matt", "serie": "751C" },
  "farbzuordnung": { "<colorKey>": "751C-031" },
  "grafikzeit":    { "eintraege": [ { "von": "…Z", "bis": "…Z", "minuten": 12, "manuell": false, "benutzer": null, "uebertragen": false } ] },
  "kalkulation":   { … Kalkulationsdatensatz, Abschnitt 8.4 … },
  "aufbau":        { "id": "…", "zeit": "…Z", "boegen": [ { "medium": "3551", "laminat": "matt", "breite_mm": 1370, "nr": 1 } ] }
}
```

- `vorauswahl`: zuletzt gewählte Werte je Auftrag (Preset ohne Eintrag: Medium 3551 matt, Serie 751C — wie bisher).
- `farbzuordnung`: Nicht-Oracal-Farbe → Folienschlüssel je Auftrag (wie bisher, colorKey exakt).
- `grafikzeit.eintraege[]`: Struktur aus SPEZ_01; `benutzer` in Stufe 2 `null` — kein angemeldeter Benutzer, keine Zwischenlösung über `rechner.json` [M]. [A-3]
- `kalkulation`: letzter Kalkulationsdatensatz, ersetzt bei jedem Berechnen.
- `aufbau`: letzter Druckbogen-Aufbau (Export verarbeitet nur Bögen dieses Aufbaus).

**Druckbogen-Dokumente** (`rolle: "druckbogen"`): eigenes XMP mit `kunde`, `auftragsart`, `massstab: 1`, `auftrag`, `ablage` (Kopie aus der Arbeitsdatei) sowie `bogen: { aufbau, medium, laminat, breite_mm, nr, arbeitsdatei: "<Pfad>" }`. Der Pfad dient nur der Zuordnung beim Export.

## 4. Konfiguration und Preisquelle

- `config/medien.json`: aus `Infos/Stammdaten/medien.json`, geändert: `randabzug.plott` **25** (bisher 40) [R 3.3]; `druck.opos_marken` entfällt (immer eigene Marken; Rückfall läuft am Panel vorbei [M 10]). Übrige Werte unverändert (OPOS-Zugabe 24,353, Markenrand 10, Kantenhalter 15, Reserve Kontur 10, Schwelle 10 %, Breiten, Laminate, Alias). [R 3.7, M 7]
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
- **Plott**: Einzelteile = geschlossene bzw. zusammengesetzte Pfade (Punzen zählen nur zur Schnittlänge), Text in Pfade, je Farbschlüssel eine Teilegruppe. Farbe aus dem Farbfeldnamen der Füllung (`NNN (<Zusatz>)`, Zähler toleriert) → Schlüssel über `serien.json`; sonst über `farbzuordnung`.
- **Druck**: Messung an der Cutkontur (Vollton C0 M100 Y0 K0, Toleranz 0,5, Name egal [R 3.1]); ohne Cutkontur Motivumriss im Hilfsdokument (Text in Pfade, Konturen in Flächen, Vereinigen, Außenringe), 1 Teil. Pixelbild/Schnittmaske: sichtbare Begrenzung. [R 3.8]
- **Flächen**: `fläche_m2(o)` Bounding Box im Realmaß (Maßstab aus XMP); `fläche_m2(o, f)` je Folie. Nesting-Maß Druck: ohne Cutkontur Außenkante + 10 + 3 mm je Seite, mit Cutkontur Außenkante ∪ (Cutkontur + 3 mm). [R 3.7]
- **Tape-Vorschlag** (Druck): Schnittdichte ≥ `tape.min_schnittdichte` oder Teiledichte ≥ `tape.min_teiledichte`, bezogen auf die Begrenzung der Messung. [R 1.9]
- **Anzahl**: Messwerte je Stück gelten für ein Exemplar; Nesting und Kalkulation multiplizieren mit `IP_Anzahl`.
- **Prüfungen** (vor Berechnen, Summa, Druck; gleichartige zusammengefasst in einem Popup): Warnungen — Objekte auf der Sandbox, oberste Objekte auf Plott/Druck-Ebenen ohne Zuordnung (nicht gerechnet), Konflikt Zuordnung ↔ Ebene/Farbe (nicht gerechnet), Konturen auf Plott-Objekten, an Lücken geteilte Teile. Abbruch — Teil länger als 5680 mm, Teil passt in keiner Lage in die Nutzbreite, Farbe ohne Serie, Serie/Medium ohne Preis, Preisquelle fehlerhaft. [Produktionsregeln §4]

## 6. Zuordnen (Fenster „Objekt“, ModalDialog)

Funktion wie bisher, Gestaltung nach MockUp. Öffnet über den Panel-Button und per Doppelklick in „Objekte“; ein oder mehrere oberste Objekte ausgewählt.

- **Felder**: Art (Plott / Digitaldruck); bei Plott Serie + Farbraster, Feld „Farbnummer“ + Enter; bei Digitaldruck Medium (Kürzel) und Laminat (3676 nur glänzend); **Anzahl** (neu, Standard 1, ganze Zahl ≥ 1); Komplexität K0–K3 nur bei Plott (bei Druck nur, wenn das Objekt eine Cutkontur hat [R 1.8]); Sicke, Wölbung (aus `aufschlaege()`); Tape nur Druck („auto“ = Vorschlag aus dem letzten Berechnen, Klick setzt manuell). Kein Namensfeld [M 3].
- **Vorauswahl**: Art nach Tag, sonst Sandbox → Digitaldruck, sonst nach Ebene; Medium/Laminat/Serie aus `vorauswahl`; Nicht-Oracal-Farben aus `farbzuordnung`.
- **Plott-Umfärben**: Nicht-Oracal-Füllungen auf das gewählte Farbfeld umfärben (Farbfeld anlegen/wiederverwenden), Originalfarben als Tag am Pfad sichern und bei späterer Druck-Zuordnung zurückholen (wie bisher). Konturen, Bilder, Verläufe sperren Plott.
- **Mehrfachauswahl**: ein Dialog, gleiche Werte für alle; unterschiedliche Werte leer/„mixed“, ändern nur bei neuer Wahl; gemischte Art → Art ungewählt, Farb-/Medienbereich aus.
- **OK**: Tags schreiben (`IP_Id` neu vergeben, falls fehlend), Objekte positionsgleich auf die Ebene der Rolle verschieben, `vorauswahl`/`farbzuordnung` ins XMP. Rückmeldung an das Panel per CSEvent; Panel und ein offenes „Objekte“ lesen neu.
- **Enter** = OK, **Esc** = Abbrechen; Warnungen wie bisher nur die erste, OK gesperrt.

## 7. Nesting und Rollenwahl

`panel/lib/nesting.js`, `rollen.js` aus dem alten Projekt übernommen. MaxRects, 90°-Drehung, 20 mm Abstand, 10 mm Rand, reproduzierbar. [R 3.3]

- **Plott** je Farbschlüssel: Nutzbreite = Standardbreite − 25 [R 3.3]; Länge ≤ 5700 mm; übergroße Teile an Lücken teilen (Warnung) oder Abbruch. Jedes Stück × Anzahl Exemplare.
- **Druck** je Medium + Laminat: mit jeder vorrätigen Breite nesten; Standardbreite, außer passt nicht oder eine andere spart ≥ 10 % Verbrauch [Produktionsregeln §3]. Grafik quer ≤ Rollenbreite − 30 − 44,353; Bogenlänge ≤ 2500 mm, Einzelobjekt bis 5700 mm auf eigenem Bogen. Zeichenfläche = Außenkante der Teile + 44,353 mm (22,1765 je Seite). Jedes Stück × Anzahl Exemplare.
- **Verbrauch** je Folie = Σ Zeichenflächenlänge × volle Rollenbreite (nur EK, Rollenwahl, Materialbedarf, Schneidedaten). [P §3]
- Kalkulation, Summa und Druck nutzen dasselbe Ergebnis.

## 8. Kalkulation

### 8.1 Rechenweg
PREISLOGIK v6 §4 unverändert, mit zwei Ergänzungen:
- **Anzahl**: Material, Entgittern, Flächenzeit, Trennen, Montage je Stück und Tape-Material werden je Exemplar gerechnet und × `IP_Anzahl` summiert; Rüsten/Tape-Anteil je Folie verteilen sich auf alle Exemplare nach Fläche; `fläche_m2(o)` in `reinigen_rest` und Tape-Dichte zählt × Anzahl. [A-5]
- **Brutto**: gerundeter Nettopreis × (1 + mwst/100), auf Cent gerundet. [R 1.14]

Ergebnis: VK und Mindest-VK, je „nur Aufkleber“ und „inkl. Montage“, netto gerundet (5 €) und brutto. Grafik nur dokumentiert [P §2.7]. Komplexität nur auf Produktionszeit [P §5].

### 8.2 Auslöser
Button Berechnen: Prüfungen (§5) → Nesting (§7) → Kalkulation → Datensatz ins XMP → Fenster „Details“ öffnen/aktualisieren → Hinweise als ein Popup. Grafikminuten aus `grafikzeit.eintraege` (auto + manuell) in den Block `grafik`.

### 8.3 Anzeige
Panel: beide VK-Preise netto/brutto; Hinweis „Mindestbetrag Produkt/Montage greift“ (orange) wie bisher. „Details“: Folien (Schlüssel, Rolle, Bögen, lfm, m², EK), Objekte (Name, Anzahl, Folie, Material, Produktion min, Montage min, Betrag, inkl. Montage; abweichende Attribute; Variante von …), Summen (VK und Mindest-VK je netto/brutto), Grafik als eigener Block. Endgültige Form nach MockUp.

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
    "mindestbetrag_greift": { "produkt": true, "montage": false }
  },
  "materialbedarf": [ { "schluessel": "751C-031", "verbrauch_m2": 0.78, "lfm": 0.62, "rollenbreite_mm": 1260 } ],
  "grafik": { "min_auto": 0, "min_manuell": 0, "stundensatz": 96, "betrag": 0 },
  "warnungen": [ "2 Objekte auf der Sandbox" ]
}
```

Zahlen im Beispiel sind Platzhalter für die Struktur. `materialbedarf` nach [R 6.10]. Betragsfelder je Objekt enthalten VK und Mindest-VK, damit die App beides zeigen kann.

## 9. Produktionsdatenblatt `<Kunde>_Info.pdf` [M 2]

Stückliste ohne Preise, ohne EK, ohne Grafik; über den Exportkern in den Auftragsordner, Nummerierung `_02` bei Wiederholung [R 5.7]. Erzeugt mit jsPDF aus dem letzten Kalkulationsdatensatz (vorher automatisch Berechnen, wie bisher beim PDF). Inhalt [A-6]:
- Kopf: Kunde, Auftragsart, Datum, Maßstab der Arbeitsdatei.
- Je Objekt: Name, Anzahl, Verfahren, Folie bzw. Medium + Laminat, Maß B × H mm (Realmaß, ein Exemplar), Fläche m², Teile, Schnittlänge m, Komplexität, Sicke/Wölbung/Tape, „Variante von …“.
- Je Folie: Rolle (Breite), Bögen, lfm, m².
- Warnungen des Laufs.
Auslöser: Button in „Details“ (Lage im MockUp).

## 10. Plott-Schneidedaten (Summa)

Wie bisher, über den Exportkern (Profil `produktion`): Prüfungen → Nesting je Farbschlüssel → je Bogen ein Hilfsdokument 1:1, Zeichenfläche = Umriss + 10 mm je Seite, Pfade ohne Füllung/Kontur-Änderung wie bisher, PDF/X-4 → `<Kunde>_<Serie>-<Farbe>_cut_NN.pdf` (NN = Bogen) [R 5.9]. Exemplare nach Anzahl. Arbeitsdatei bleibt unverändert, Hilfsdokumente werden geschlossen. Eintrag in `exporte[]`.

## 11. Druckbögen (Druck, Export)

**Druck**: Prüfungen → Nesting je Medium + Laminat + Rolle → je Bogen ein Dokument (Ebenen Druck / Cut / Info, XMP §3.2), Info-Ebene mit Format, Medium, Laminat, Rolle, Bogen n/m, Verbrauch. Je `IP_Id` ein Symbol (Inhalt = Objekt 1:1 inkl. vorhandener Cutkontur); jedes Exemplar (Anzahl) und jede geometrisch gleiche Variante eine Instanz mit Transformation [R 3.4]. Neuer `aufbau` ins XMP der Arbeitsdatei; der erste Bogen kommt nach vorn. Beschnitt und Cutkontur macht der Mensch im Bogen bzw. einmal im Symbol [R 3.5].

**Export** (Druckbogen vorn): alle offenen Bögen desselben Aufbaus. Sammelprüfung (Cutkontur je Objekt, Breite ≤ Rollenbreite − 30 nach dem Setzen der Marken) → ein Fehler-Popup, nichts exportiert. Sonst je Bogen: Instanzen umwandeln, Cutkonturen auf Ebene Cut, Farbfeld vereinheitlichen auf „Cutkontur“ [R 3.1], eigene OPOS-Marken (Regel OPOS_ANALYSE §4, `panel/lib/opos.js`; XY, ab 1000 mm Länge XY2 mit Druckrichtungsdreieck; Zeichenfläche auf Soll erweitert) [R 3.6], dann über den Exportkern `<Kunde>_<Medium>-<Laminat>-<Breite>_<NN>_druck.pdf`, `…_cut.pdf`, `….ai` (NN = Bogen im Aufbau; bei Wiederholung hängt der Exportkern `_02` an den Grundnamen) [R 5.9, R 5.7, A-7]. Kein Schalter „plugin“ mehr [M 10]. Gespeicherte Bögen werden geschlossen; Eintrag in `exporte[]` der Arbeitsdatei.

Export für Profil `flach` (Stufe 1) bleibt; der Button erkennt am XMP, ob Arbeitsdatei (flach) oder Druckbogen (produktion) vorn ist.

## 12. Grafikzeit [M 1]

- Hintergrund-Extension `.hintergrund` (ohne Oberfläche, startet mit Illustrator), keine `evalScript`-Abfragen [R 4.7]: aktives Dokument aus den Dokument-Ereignissen (Pfad), Auftragsstatus aus dem XMP der gespeicherten Datei (Node, lesend, wie bisher). Zählt mit Zeitstempeln (Lücken ≤ 15 s), wenn Illustrator vorn ist und die letzte Eingabe < 30 s zurückliegt.
- Erkennung „vorn/Eingabe“ ist betriebssystemabhängig: macOS `lsappinfo`/`ioreg`, Windows PowerShell (`GetForegroundWindow`, `GetLastInputInfo`). Gekapselt in einem Modul `panel/lib/aktivitaet.js` mit genau einer Plattformweiche — bewusste Ausnahme zu [R 7.2]. [A-8]
- **Schreiben ins XMP**: nur das Panel schreibt (JSX), zu den erlaubten Zeitpunkten [R 4.7]: Maus ins Panel, eigene Aktion (Zuordnen, Berechnen, Summa, Druck, Export, „+ min“). Die Hintergrund-Extension puffert die noch nicht geschriebenen Minuten je Dokumentpfad in `grafikzeit_puffer.json` im Rechnerordner (macOS `~/Library/Application Support/PAM-Werkzeuge/`, Windows `%APPDATA%\PAM-Werkzeuge\`); beim nächsten Panel-Kontakt mit dieser Datei wandern sie als Eintrag (`von`, `bis`, `minuten`, `manuell: false`) ins XMP, der Puffereintrag wird gelöscht. Technischer Zwischenpuffer, der sich selbst leert — kein Informationsspeicher im Sinn von [R 5.8] [M]. Verlust nur, wenn die .ai auf diesem Rechner nie wieder angefasst wird. Stufe 3: mit Auftrag ggf. direkt über das SDK, wird dort geklärt. [A-9]
- Feld „+ min“ im Panel: ganze Minuten, auch negativ, Enter → Eintrag `manuell: true`. [R 4.8]
- Anzeige „Grafik N min“ = Σ Einträge. Keine Verrechnung [P §2.7].

## 13. Panel (Stufe 2)

Zustände und Funktionen; Gestaltung nach MockUp:
- **Ohne Panel-Dokument**: wie Stufe 1 (Kopfzeile leer, „Auftrag“, „Export“ gesperrt).
- **Arbeitsdatei Fahrzeugbeschriftung/Beschriftung**: Kopfzeile Kunde · Auftragsart (ohne Maßstab [M 6]); Objektzeile (Name der Auswahl, „n Objekte“, „Keine Auswahl“); Grafik N min + „+ min“; Buttons Zuordnen (add/edit je Auswahl), Objekte, Berechnen, Summa, Druck, Export, Auftrag; Preiszeilen VK „nur Aufkleber“/„inkl. Montage“ netto/brutto, Hinweis Mindestbetrag. Orange: Zuordnen, solange Zuordnen der nächste Schritt ist, sonst Berechnen; Export-Button orange; „Auftrag“ Schrift orange [R 4.3].
- **Andere Auftragsart (flach)**: wie Stufe 1 plus Grafikzeit.
- **Druckbogen vorn**: Kopfzeile „Kunde · Druckbogen Medium Laminat Breite n/m“, nur Export und Auftrag aktiv.
- Aktualisierung nur bei Maus ins Panel und nach eigener Aktion [R 4.7]. Fenster „Objekte“/„Details“ als Modeless-Extensions, lesen beim Öffnen und nach Panel-Aktionen; Klick in „Objekte“ wählt in Illustrator aus, Doppelklick öffnet Zuordnen.

## 14. Aufbau im Repo, Reihenfolge, Tests

Neue/geänderte Dateien: `config/medien.json`, `config/serien.json`, `config/farbfelder/*.ase`; `panel/lib/preisquelle.js`, `preisquelle_csv.js`, `teile.js`, `nesting.js`, `rollen.js`, `kalkulation.js`, `herkunft.js`, `opos.js`, `info_pdf.js` (+ jsPDF), `aktivitaet.js`, `grafikzeit.js`; `panel/objekt.html/.js`, `objekte.html/.js`, `details.html/.js`, `hintergrund.html/.js`, `fenster.js`; Erweiterungen im Manifest `.objekt` (ModalDialog), `.objekte`, `.details` (Modeless), `.hintergrund` (Custom, StartOn); JSX-Kern: Objekte lesen/Tags/Umfärben/Verschieben, Hilfsdokument und Messung, Schneidedokumente, Druckbogen mit Symbolen, Marken zeichnen, PDF speichern. Version 3.1.0.

Teilstufen (je ein CC-Auftrag, je Commit):
- **2a** Konfiguration, Preisquelle, Lesen/Messen, Nesting, Kalkulation, Kalkulationsdatensatz, Varianten-Erkennung — reine Node-Module plus JSX-Lesefunktionen, ohne UI.
- **2b** Zuordnen-Dialog, Panel-Erweiterung, Fenster „Objekte“ und „Details“, Info.pdf — nach den MockUps.
- **2c** Summa, Druck, Export (Druckbögen, OPOS).
- **2d** Grafikzeit.

Tests: `node --test tests/*.test.js` für die Node-Module (Preisquelle mit der echten CSV, Kalkulation gegen die sechs Aufträge aus PREISLOGIK §11.2, Nesting mit Anzahl, Varianten-Erkennung, OPOS-Regel gegen OPOS_ANALYSE §5, Kalkulationsdatensatz-Struktur). Keine Illustrator-Läufe ohne Ansage [R 7.9]. Doku je Teilstufe: README (Stand), CHANGELOG, TESTBERICHT; Commit und Push durch CC.

## 15. Ableitungen Claude — geklärt mit Markus 30.10.

1. Anzeige namenloser Objekte als „Objekt n“ (nur Anzeige, nicht gespeichert). — ok
2. Varianten-Erkennung nur bei Zuordnen, Berechnen, Summa, Druck (Textvergleich der Ids, keine Geometrie); geometrisch gleiche Variante wird Instanz des Original-Symbols, sonst eigenes Symbol. — ok
3. `grafikzeit.eintraege[].benutzer` in Stufe 2 `null`, keine Zwischenlösung über `rechner.json`. — ok
4. Keine Preislistenversion aus der CSV (kein Hash); Feld `version` bleibt in der Struktur und wird erst vom SDK gefüllt. — ok
5. Anzahl-Verrechnung: alle Stückwerte × Anzahl, Folienanteile nach Fläche über alle Exemplare. — ok
6. Inhalt des Produktionsdatenblatts (Abschnitt 9), Auslöser in „Details“. — ok
7. Dateinummer NN = Bogen im Aufbau; Wiederholung → `_02` am Grundnamen durch den Exportkern. — ok
8. Aktivitätserkennung der Grafikzeit mit genau einer Plattformweiche in `panel/lib/aktivitaet.js` (Ausnahme zu R 7.2). — ok
9. Grafikzeit-Puffer je Rechner (Abschnitt 12) statt Verlust ungeschriebener Minuten; mit Auftrag in Stufe 3 ggf. direkt über das SDK. — ok
