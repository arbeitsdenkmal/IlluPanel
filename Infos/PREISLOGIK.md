# Preislogik Kalkulations-Panel – Fahrzeugbeschriftung & Beschriftung

Stand: 25.10.2026, Version 6; Nachtrag 31.10.2026: Abschnitt 13 Textil Flex/Flock (Thema 4). Ersetzt Version 5 vollständig. Verantwortlich für Inhalt und Werte: Preis-Chat. Zugehörige Preisliste: `preisliste.csv`. Ergänzend: `PREISLOGIK_Schild.md` (Auftragsart Schild, unverändert). Werte vorläufig, Kalibrierung über weitere dokumentierte Aufträge.

Gekennzeichnet: **[M]** = Angabe/Entscheidung Markus, **[A]** = Ableitung Preis-Chat (von Markus nicht ausdrücklich festgelegt; Einspruch jederzeit möglich).

Weiter gültig aus Version 5: Bezeichnung der Serien nur als Kürzel, kein Freigabehinweis, Rollenbreiten und Randabzüge in `config/medien.json`, Tape-Vorschlag mit eigener Schwelle, Messung im Druck an der Cutkontur, sonst am Motivumriss, Material auf das Endmaß (Stückfläche), Verbrauch nur für EK, Rollenwahl, Schneidedaten und Protokoll, zwei Preise, getrennte Mindestbeträge, Komplexität, Rüsten/Datei/Tape je Folie, `datei_rip` je Auftrag.

## 1. Geltungsbereich

- Zwei Listenpreise netto: „nur Aufkleber“ und „inkl. Montage“, darunter je ein **Mindest-VK**. [M]
- Nur Auftragsarten Fahrzeugbeschriftung und Beschriftung, sonst Kalkulation deaktiviert mit Hinweis.
- Nicht enthalten: Schilder (siehe `PREISLOGIK_Schild.md`), Entschriften, Anfahrt, Kundenrabatte.

## 2. Änderungen gegenüber Version 5

Grundlage: Messprotokolle von sechs sauber angelegten Aufträgen (25.10.2026, siehe 11) mit Ist-Zeiten und Zielpreisen von Markus.

1. **Der Wert der Arbeit steckt im Stundensatz, nicht mehr im m²-Preis.** Neuer Parameter `stundensatz.vk` 155 €/h für Produktion und Montage. Material `vk_m2` = `ek_m2` × 1,9. Grund: Mit dem hohen m²-Preis aus V5 (751C 65 €/m²) waren vollflächige Motive mit wenig Arbeit um 150 % zu teuer (zwei Streifen 2 × 2,06 × 0,47 m: 155 € statt 60 €). [M] Richtung und Ergebnis bestätigt, Werte [A] (Ausgleichsrechnung)
2. **Mindest-VK:** dieselbe Rechnung mit `stundensatz.produktion` 84 €/h statt `stundensatz.vk`. Spielraum für die Mitarbeiter, kalkulatorisch abgesichert (Kostenstundensatz ca. 73 €/h). [M]
3. **Entgittern Plott über die Schnittlänge statt über die Fläche:** `produktion_m2` Plott 0 (bisher 5), `schnitt_m` Plott 0,12 min/m (bisher 0). Für Schriftzüge und Logos bleibt die Zeit gleich (Knetsch), vollflächige Motive haben kaum Entgitterzeit. [A]
4. **Montage an Ist-Zeiten angepasst:** `auftrag_montage` 2 min (bisher 20), `stueck` 5 min (bisher 3,2), `montage_m2` 0,8 + `reinigen_m2` 1,65 min (bisher 1,4 + 3). Zwei Streifen ergeben 17 min, Ist 15 min inkl. Reinigung [M]. Werte [A]
5. **Wölbung als Minuten je m² statt Prozentaufschlag:** Zeile `aufschlag;woelbung` mit `minuten` 36 (je m² Stückfläche) statt `prozent` 120 (auf die Montage des Stücks). [M] „Faktor Wölbung massiv erhöhen“, Umsetzung je m² und Wert [A] (BacNext 166 min, Ist 180)
6. Sicke bleibt Prozentaufschlag (50 %). Komplexität unverändert.
7. **Nachtrag 25.10.2026 – Grafik nicht im Preis:** Grafikminuten und Grafikbetrag werden nur dokumentiert (Panel, Messprotokoll, Details, PDF), nicht eingerechnet – weder im VK noch im Mindest-VK. Die Kalibrierung (11.2) war schon ohne Grafik gerechnet, die Preise der Kalibrierung bleiben unverändert. [M]

## 3. Begriffe

- **Folie:** Plott = jede verwendete Farbe, Druck = jede Kombination aus Medium und Laminat. Druck ist immer laminiert. [M]
- **Stück (Objekt):** oberstes Objekt bzw. Gruppe. Entspricht dem, was produziert und am Fahrzeug einzeln angesetzt wird.
- **Einzelteil:** jeder geschlossene bzw. zusammengesetzte Pfad, der einzeln entgittert wird. Punzen zählen nicht als Teil, ihre Länge zählt zur Schnittlänge.
- **Messung im Druck:** an der Cutkontur, falls vorhanden; ohne Cutkontur am Motivumriss, 1 Einzelteil je Stück.
- **fläche_m2(o):** Bounding Box des Stücks im Realmaß, ohne Abstand und ohne Reserve.
- **fläche_m2(o, f):** Bounding Box der Teile des Stücks auf Folie f im Realmaß.
- **fläche_m2(f):** Σ fläche_m2(o, f) aller Stücke auf Folie f.
- **verbrauch_m2(f):** lfm × tatsächlich verwendete Rollenbreite. Nur für EK, Rollenwahl, Schneidedaten, Protokoll.
- **v:** Verfahren (plott oder druck). **z(name, v):** Minutenwert aus der Preisliste.
- **S:** Stundensatz in €/min. Der Rechenweg 4.7–4.8 läuft zweimal: **VK** mit S = `stundensatz.vk` / 60, **Mindest-VK** mit S = `stundensatz.produktion` / 60.

## 4. Rechenweg

Alle Beträge netto. Minuten (4.1–4.6) sind für VK und Mindest-VK gleich.

### 4.1 Je Folie (nach Flächenanteil auf die Stücke verteilt, unverändert)

```
ruesten(f)          = z(ruesten, v) + z(datei_cut, v)                                    [min]
tape_folie(f)       = max(fläche_tape_m2(f), 1) × z(tape_m2, v)                          [min]
```

- `fläche_tape_m2(f)`: Plott = fläche_m2(f); Druck = Σ fläche_m2(o, f) der Stücke mit Attribut „Tape“, sonst 0.

### 4.2 Material je Stück (unverändert)

```
material(o)         = Σ über Folien f von o: fläche_m2(o, f) × vk_m2(Serie von f)
```

### 4.3 Produktion je Stück (unverändert, neue Werte)

```
entgittern(o)       = teile(o) × z(teil, v) + schnitt_m(o) × z(schnitt_m, v)                  [min]
flaechenzeit(o)     = Σ über Folien f von o: fläche_m2(o, f) × z(produktion_m2, v)          [min]
trennen(o)          = z(trennen, v)                                                         [min]
produktion(o)       = (ruesten_anteil(o) + tape_anteil(o) + flaechenzeit(o) + entgittern(o) + trennen(o))
                      × (1 + komplexität(o) / 100)                                           [min]
```

- Plott: `produktion_m2` = 0, Entgittern über `teil` und `schnitt_m`. Druck: `produktion_m2` enthält Entgittern, Laminieren und Handling (6 min/m²).

### 4.4 Produktion je Auftrag (unverändert)

```
datei_rip           = z(datei_rip, druck)        einmal je Auftrag, wenn mindestens ein Druck-Stück vorhanden   [min]
```

### 4.5 Montage je Stück (geändert)

```
montage(o)          = (z(stueck, v) + fläche_m2(o) × (z(montage_m2, v) + z(reinigen_m2, v)) + teile(o) × z(montage_teil, v))
                      × (1 + sicke / 100)
                      + Σ Attribute mit minuten: fläche_m2(o) × minuten(Attribut)            [min]
```

- `sicke` = Summe der `prozent` der gesetzten Attribute (`typ aufschlag`), wirkt als Faktor auf die Montage des Stücks. Attribute mit `minuten` statt `prozent` wirken additiv je m² Stückfläche und werden nicht mit dem Prozentaufschlag multipliziert.
- Preisliste: Sicke `prozent` 50, Wölbung `minuten` 36. Eine `aufschlag`-Zeile hat entweder `prozent` oder `minuten`. Die Attributliste im Dialog kommt weiter aus den `aufschlag`-Zeilen.

### 4.6 Tape-Material (nur Druck, unverändert)

```
tape(o)             = fläche_m2(o) × tape_vk_m2(Serie)      wenn Attribut „Tape“ gesetzt
```

### 4.7 Beträge je Stück

```
produkt(o)          = material(o) + produktion(o) × S + tape(o)
montage_betrag(o)   = montage(o) × S
```

### 4.8 Auftrag (je einmal mit S für VK und für Mindest-VK)

```
produkt_summe       = Σ produkt(o) + datei_rip × S
falls produkt_summe < mindest.produkt:   produkt_summe = mindest.produkt

reinigen_rest       = max(0, 1 − Σ fläche_m2(o)) × z(reinigen_m2, alle)
montage_summe       = Σ montage_betrag(o) + (z(auftrag_montage, alle) + reinigen_rest) × S
falls montage_summe < mindest.montage:   montage_summe = mindest.montage

preis_nur_aufkleber = produkt_summe
preis_inkl_montage  = produkt_summe + montage_summe

grafikbetrag        = (grafik_min_auto + grafik_min_manuell) / 60 × stundensatz.grafik     nur Dokumentation, nicht im Preis

jeweils gerundet    = aufrunden(preis, Vielfaches von rundung)
```

- Ergebnis: vier Preise – „nur Aufkleber“, „inkl. Montage“ und je der Mindest-VK dazu. [M]
- Mindestbeträge und Rundung gelten für den Mindest-VK genauso wie für den VK. [A]
- Grafik: Minuten und Betrag (96 €/h) werden nur dokumentiert, nicht eingerechnet (Nachtrag 25.10.2026). [M]
- Mehrwertsteuer wie bisher je Preis (netto/brutto ist im Panel vorhanden).

## 5. Komplexität (unverändert)

- Stufen aus der Preisliste (`typ komplexitaet`, `prozent`), Auswahl je Objekt im Panel, gespeichert als Tag. Standard Stufe 0, kein automatischer Vorschlag.
- Wirkt nur auf die Produktionszeit des Objekts (4.3), nicht auf Material, Montage und `datei_rip`.

## 6. Messprotokoll

`<Kunde>_Kalkulation.json` je Lauf wie Version 5, zusätzlich:

- Je Auftrag: Mindest-VK nur Aufkleber und inkl. Montage (ungerundet, gerundet, brutto) sowie `stundensatz_vk` und `stundensatz_mindest`.
- Je Objekt: Minuten aus Attributen mit `minuten` (Wölbung) getrennt ausgewiesen.

## 7. Freigabe (unverändert)

Kein Freigabehinweis in Panel und PDF, unabhängig von `preise_freigegeben`.

## 8. Preisliste (CSV)

### 8.1 Rahmen (unverändert)

Server-Datei, UTF-8, Semikolon, Dezimalkomma/-punkt, flach, keine Formeln, bei jeder Berechnung neu einlesen und prüfen, lokale Kopie als Fallback, im Panel nur lesend, austauschbares Modul.

### 8.2 Spalten (unverändert)

`typ;schluessel;gilt_fuer;bezeichnung;verfahren;ek_m2;vk_m2;tape_vk_m2;minuten;prozent;wert`. `vk_m2` = VK je m² Stückfläche (Material inkl. Verschnitt), ohne Arbeit.

Bezeichnungen neuer bzw. geänderter Zeilen sind Vorschlag des Preis-Chats; sie erscheinen nur in der Preislisten-Ansicht des Panels.

### 8.3 Parameter

| schluessel | Wert | Verwendung |
| --- | --- | --- |
| stundensatz.vk | 155 | **neu**: VK Fahrzeug/Beschriftung, Produktion und Montage [A] |
| stundensatz.produktion | 84 | Mindest-VK Fahrzeug/Beschriftung [M]; weiter Schild (`PREISLOGIK_Schild.md`) |
| stundensatz.grafik | 96 | nur für den dokumentierten Grafikbetrag, nicht im Preis (Nachtrag 25.10.2026) |
| mindest.produkt / mindest.montage | 35 / 30 | unverändert, für VK und Mindest-VK |
| rundung | 5 | unverändert, für VK und Mindest-VK |

`stundensatz.produktion` bleibt bewusst unter diesem Namen, weil die Schildkalkulation ihn verwendet (Selbstkosten × 1,2). Ein Umbenennen würde Schild ändern.

### 8.4 Zeitschlüssel

| schluessel | Einheit | verfahren | Plott | Druck | Änderung |
| --- | --- | --- | --- | --- | --- |
| ruesten | min je Folie | plott, druck | 3 | 2 | – |
| datei_cut | min je Folie | plott, druck | 3 | 3 | – |
| datei_rip | min je Auftrag mit Druck | druck | – | 5 | – |
| tape_m2 | min je m², mind. 1 m² je Folie | plott, druck | 2 | 2 | – |
| produktion_m2 | min je m² Stückfläche | plott, druck | **0** | 6 | Plott 5 → 0 |
| teil | min je Einzelteil | plott, druck | 0,03 | 0,10 | – |
| schnitt_m | min je Meter Schnitt | plott, druck | **0,12** | 0 | Plott 0 → 0,12 |
| trennen | min je Stück | plott, druck | 0,17 | 0,50 | – |
| stueck | min je Stück (Montage) | plott, druck | **5** | **5** | 3,2 → 5 |
| montage_m2 | min je m² Stückfläche (Verkleben) | plott, druck | **0,8** | **0,8** | 1,4 → 0,8 |
| reinigen_m2 | min je m², mind. 1 m² je Auftrag | plott, druck, alle | **1,65** | **1,65** | 3 → 1,65 |
| montage_teil | min je Einzelteil (Verkleben) | plott, druck | 0,08 | 0,08 | – |
| auftrag_montage | min je Auftrag | alle | **2** | **2** | 20 → 2 |

- Kontrolle und Verpacken stecken weiter in `ruesten` bzw. den Gesamtzeiten.
- Auflösung unverändert: zuerst konkrete Auftragsart, dann `alle`; je Auftragsart zuerst konkretes Verfahren, dann `alle`.
- Aufschläge (`typ aufschlag`): Sicke `prozent` 50 (unverändert); Wölbung **`minuten` 36** je m² Stückfläche statt `prozent` 120. Das Attribut „Wölbung“ am Objekt bleibt unverändert (Tag, Dialog).

### 8.5 Material-VK je Serie

```
vk_m2 = ek_m2 × 1,9          (alle Serien, Plott und Druck)
```

Faktor 1,9 deckt in allen Beispielen den tatsächlichen Verbrauch (höchster Verbrauchsfaktor 1,81). [A]

| Serie | ek_m2 | vk_m2 V5 | vk_m2 V6 |
| --- | --- | --- | --- |
| 651 | 6,08 | 59,03 | 11,55 |
| 751C | 7,61 | 65,00 | 14,46 |
| 951 | 16,55 | 99,87 | 31,45 |
| 970 | 22,33 | 122,41 | 42,43 |
| 3162 | 5,66 | 59,90 | 10,75 |
| 3551 | 8,25 | 70,00 | 15,68 |
| 3951 | 21,03 | 119,84 | 39,96 |
| 3676 | 18,46 | 109,82 | 35,07 |
| UltraTack | 11,01 | 80,76 | 20,92 |
| MonsterTack | 16,65 | 102,76 | 31,64 |

`tape_vk_m2` unverändert. Aufschläge Sicke 50 %, Komplexität 0/25/50/100 % unverändert.

### 8.6 Zuordnung im Dokument (unverändert)

Plott: `651-NNN`, `751C-NNN`, `951-NNN`, `970G-NNN`, `970M-NNN` → Serie. Druck: Medium → Serie gleichen Namens.

## 9. Prüfungen und Fehler

Wie Version 5 (Popup, kein Ergebnis). Zusätzlich Pflicht: `stundensatz.vk`. Eine `aufschlag`-Zeile mit `prozent` und `minuten` zugleich oder mit keinem von beiden ist ein Fehler.

## 10. Anzeige

### 10.1 Panel

- Wie Version 5 (je Folie, je Objekt, Auftragszeile, Hinweise „Mindestbetrag … greift“, Warnungen).
- **Preise:** „nur Aufkleber“ und „inkl. Montage“ wie bisher, jeweils darunter klein „Mindest-VK“ mit dem gerundeten Mindest-VK. Netto/brutto folgt der bestehenden Umschaltung. [M] Text „Mindest-VK“ [M]
- Die Beträge je Objekt in Panel und Details bleiben VK-Werte.
- Details: Grafik (Minuten, Betrag) als eigener Block, räumlich von Summen und Preisen getrennt (Nachtrag 25.10.2026). [M]

### 10.2 PDF (nur intern, ohne EK)

Wie Version 5, zusätzlich unter beiden Preisen der Mindest-VK wie im Panel (netto/brutto wie dort). [M]
Grafik (Minuten, Betrag) als eigener Block, räumlich von den Preisen abgesetzt, ohne Zusatztext (Nachtrag 25.10.2026). [M]

## 11. Herleitung der Werte (Dokumentation, kein Prüfkriterium)

### 11.1 Ausgangsdaten (Messprotokolle 25.10.2026, sauber angelegt)

Ziel = von Markus abgerechneter bzw. als richtig bewerteter Preis netto, **ohne Anfahrt** (Ralmont und Europoles je 50 € An- und Abfahrt abgezogen [M]). Ist-Zeiten Angaben Markus.

| Auftrag | Verfahren | Fläche m² | Stücke / Teile | Ist P / M min | Ziel nur Aufkleber / inkl. Montage |
| --- | --- | --- | --- | --- | --- |
| Streifen (hhhhh) | 751C | 1,92 | 2 / 2 | – / 15 | 60 / 80–100 |
| Ralmont | 3551 | 2,00 | 4 / 107 | 30 / 45 | – / 230 |
| Knetsch | 751C, 2 Farben | 2,66 | 7 / 89 | 45 / 75 | – / 270 |
| Masala | 3551 | 2,40 | 17 / 160 | 60 / 120 | – / 350 |
| Europoles (= Fuchs mit EURO POLES) | 3551 | 5,67 | 11 / 39 | 45 / 90 | – / 500 |
| BacNext PKW (Passat) | 3551 | 3,55 | 7 / 141 | 60 / 180 | – / 600 |

- Masala im Messprotokoll ohne Wölbung (Attribut war versehentlich gesetzt [M]).
- Europoles „nur Aufkleber“ 235 € ist richtig [M]; das frühere Ziel 360 € gilt nicht mehr.

### 11.2 Ergebnis mit den Werten aus 8 (VK / Mindest-VK, gerundet, ohne Grafik)

| Auftrag | Modell P / M min | nur Aufkleber | inkl. Montage | Ziel inkl. |
| --- | --- | --- | --- | --- |
| Streifen | 11 / 17 | 60 / 45 | 105 / 75 | 80–100 |
| Ralmont | 37 / 35 | 130 / 85 | 220 / 135 | 230 |
| Knetsch | 35 / 51 | 130 / 90 | 265 / 160 | 270 |
| Masala | 51 / 115 | 175 / 115 | 470 / 275 | 350 |
| Europoles | 55 / 95 | 235 / 170 | 480 / 305 | 500 |
| BacNext PKW | 51 / 166 | 190 / 130 | 620 / 365 | 600 |

- Fünf von sechs Aufträgen innerhalb ±6 % (Streifen inkl. Montage am oberen Rand).
- **Masala ist Ausnahme** [M]: Die Zeiten stimmen (Modell 51/115, Ist 60/120), der Preis von 350 € entspricht rund 105 €/h. Masala liegt zwischen Mindest-VK und VK – genau dafür ist der Mindest-VK da.
- Stundensatz und Faktor aus der Ausgleichsrechnung über die fünf Aufträge ohne Masala (148–155 €/h, 1,9–2,05); 155 €/h und 1,9 gewählt. [A]
- Montagewerte aus der Ausgleichsrechnung gegen die Ist-Zeiten aller sechs Aufträge. [A]

## 12. Offen

1. **Montage Plott-Schrift:** Knetsch Modell 51 min, Ist 75 min. Ob Plott-Einzelteile mehr Montagezeit brauchen (`montage_teil` Plott), zeigen weitere Jobs.
2. **Noch nicht neu gemessen:** Kraus, MGP, Weigl, BacNext Multivan. Dabei prüfen, ob Strichgrafik/lockere Schrift (Kraus) mit V6 passt.
3. **Druck-Produktion je m²:** Widerspruch Bahn (4 min) zu 6 min/m² bleibt offen.
4. Kalibrierung aller Werte über weitere dokumentierte Jobs.

## 13. Textil Flex/Flock (Nachtrag 31.10.2026, Thema 4)

Gilt für die Auftragsart Textil, nur für Motive mit Verfahren Flex oder Flock [M]. DTF, Stick, Namen-Bögen und das Textil selbst werden nicht kalkuliert [M]. Spezifikation: `SPEZ_03_Textil.md` §9–§10. Zahlenwerte vorläufig, Kalibrierung Thema 7.

### 13.1 Grundsätze

- **Ein Preis** inkl. Pressen — „Transfer ohne Pressen“ gibt es nicht, keine Trennung Produkt/Montage. [M] Der Preis steht in den Feldern „inkl. Montage“ (VK und Mindest-VK, netto gerundet und brutto); „nur Aufkleber“ bleibt im Datensatz leer, das Panel zeigt einen Preis. [M]
- **Mindestbetrag 5,40 € netto je Motiv je Textil** (je Exemplar) statt der Mindestbeträge 35/30 €. [M]
- **Rundung auf 0,10 €** aufgerundet statt 5 €; brutto auf Cent. [M]
- Material je Serie/Hersteller: `PoliTape Turbo` (Flex), `VelCutPro` (Flock); `vk_m2` = `ek_m2` × 1,9 wie 8.5. [M] `ek_m2` trägt Markus ein.
- Komplexität K0–K3 je Motiv auf die Produktionszeit (5). Kein Tape, keine Aufschläge Sicke/Wölbung, kein `datei_rip`.

### 13.2 Begriffe

- **Motiv:** oberstes Objekt bzw. Gruppe auf „Design“ mit Position und Verfahren. **Druckgröße:** Maß je Motiv mit Menge. **Exemplar:** ein Druck einer Druckgröße; `menge` Exemplare je Druckgröße (Gegenstück zu `IP_Anzahl`).
- **Farbschlüssel f:** Serie + Flexfarbe (Freitext). Ein mehrfarbiges Motiv hat mehrere Farbschlüssel; je Farbe ein Block mit zwei Passermarken wie Beschriftung [M]; Marken zählen nicht zu Teilen und Schnittlänge.
- **teile(e), schnitt_m(e), fläche_m2(e):** je Exemplar im Realmaß der Druckgröße — einmal im MockUp gemessen, je Druckgröße umgerechnet (Schnittlänge linear, Fläche quadratisch, Teile gleich). fläche_m2(e, f) je Farbschlüssel.
- **Pressvorgänge p(e):** 1 je Exemplar, 2 bei blockout (Vorpressen). [M]
- **Textilzahl T:** größte Mengensumme einer Position über die Flex-/Flock-Motive (10 × Brust + 10 × Rücken = 10 Textilien). [M]
- **S:** Stundensatz in €/min, zweimal gerechnet: VK mit `stundensatz.vk`, Mindest-VK mit `stundensatz.produktion`.

### 13.3 Rechenweg

```
ruesten(f)        = z(ruesten, textil) + z(datei_cut, textil)                               [min]  je Farbschlüssel, nach Flächenanteil auf die Exemplare verteilt
entgittern(e)     = teile(e) × z(teil, textil) + schnitt_m(e) × z(schnitt_m, textil)         [min]
produktion(e)     = (ruesten_anteil(e) + entgittern(e) + z(trennen, textil)) × (1 + komplexität / 100)   [min]
pressen(e)        = p(e) × z(pressen, textil)                                                [min]
material(e)       = Σ über f: fläche_m2(e, f) × vk_m2(Serie von f)                            [€]

preis(e)          = max(material(e) + (produktion(e) + pressen(e)) × S, textil.mindest)      [€]  Mindestbetrag je Exemplar
falten            = T × z(falten, textil)                                                    [min] je Auftrag

preis_auftrag     = Σ preis(e) + falten × S
gerundet          = aufrunden(preis_auftrag, Vielfaches von textil.rundung)
brutto            = gerundet × (1 + mwst / 100), auf Cent gerundet
```

- Je einmal mit S für VK und für Mindest-VK; der Mindestbetrag je Exemplar gilt für beide.
- Verbrauch je Farbschlüssel = Σ Streifenlänge × 500 mm Rollenbreite — nur EK, Materialbedarf, Datensatz [M].
- Grafik nur dokumentiert (2.7).

### 13.4 Zeitschlüssel und Parameter

| schluessel | Einheit | Wert | Herkunft |
| --- | --- | --- | --- |
| ruesten | min je Farbschlüssel | 3 | [A] Plott-Wert |
| datei_cut | min je Farbschlüssel | 3 | [A] Plott-Wert |
| teil | min je Einzelteil | 0,03 | [A] Plott-Wert |
| schnitt_m | min je Meter Schnitt | 0,12 | [A] Plott-Wert |
| trennen | min je Exemplar | 0,17 | [A] Plott-Wert |
| pressen | min je Pressvorgang | 1 | [M] Erfahrungswert |
| falten | min je Textil | 0,33 (20 s) | [M] |
| textil.mindest | € netto je Exemplar | 5,40 | [M] |
| textil.rundung | € | 0,10 | [M] |

Kein Verpacken [M]. Vorpressen steckt im zweiten Pressvorgang bei blockout.

### 13.5 Preisliste (CSV, neue Zeilen)

```
parameter;textil.mindest;textil;Mindestbetrag Textil je Motiv je Textil;;;;;;;5,40
parameter;textil.rundung;textil;Rundung Textil (immer aufrunden);;;;;;;0,10
serie;PoliTape Turbo;textil;PoliTape Turbo;flex;;;;;;
serie;VelCutPro;textil;VelCutPro;flock;;;;;;
zeit;ruesten;textil;Rüsten je Farbe;alle;;;;3,00;;
zeit;datei_cut;textil;Datei Cut je Farbe;alle;;;;3,00;;
zeit;teil;textil;Entgittern je Einzelteil;alle;;;;0,03;;
zeit;schnitt_m;textil;Entgittern je Meter Schnitt;alle;;;;0,12;;
zeit;trennen;textil;Trennen je Exemplar;alle;;;;0,17;;
zeit;pressen;textil;Pressen je Pressvorgang;alle;;;;1,00;;
zeit;falten;textil;Falten je Textil;alle;;;;0,33;;
```

- `ek_m2`/`vk_m2` der beiden Serien trägt Markus ein (`vk_m2` = `ek_m2` × 1,9); bis dahin bricht berechnen mit „Serie/Medium ohne Preis“ ab.
- Auflösung wie 8.4: `gilt_fuer` textil vor `alle`; `verfahren` `alle` gilt für Flex und Flock gemeinsam, getrennte Werte je Verfahren sind über eigene Zeilen `flex`/`flock` möglich.
- Komplexitätsstufen (`typ komplexitaet`) und `mwst` gelten unverändert.

### 13.6 Offen

1. `ek_m2` PoliTape Turbo und VelCutPro.
2. Kalibrierung der Plott-Werte für Flex/Flock und der Pressminute über dokumentierte Textilaufträge (Thema 7).
