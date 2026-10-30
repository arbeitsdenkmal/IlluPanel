# Preislogik Schilder (Auftragsart „Schild“)

Stand: 24.10.2026, Version 1, Nachtrag 25.10.2026 (Grafik nicht im Preis, 4.3). Verantwortlich: Preis-Chat. Ergänzt `PREISLOGIK.md` (Version 4, Fahrzeug/Beschriftung). Grundlage für den Build-Chat; der Auftrag an CC entsteht erst zusammen mit den noch offenen Teilen (Kollegenpreis, Überarbeitung Fahrzeug/Beschriftung, siehe 9).

Gekennzeichnet: **[M]** = Angabe/Entscheidung Markus, **[A]** = Ableitung Preis-Chat (von Markus nicht ausdrücklich festgelegt, aber dem Ergebnis zugestimmt bzw. noch zu bestätigen).

## 1. Geltungsbereich

- Auftragsart Schild: bisher „nicht kalkuliert, nur Zeit“ → künftig Kalkulation im Objektmanager.
- Materialien wie im Panel: Dibond 3 (Dib), Forex 3/5/10 (PVC), Acryl 3/5/8/10 (PMMA). **[M]**
- Ein Preis netto je Auftrag; keine Montage (Schilder werden in der Regel nur produziert). **[M]**
- Nicht enthalten: Befestigungsmaterial, Grafik (Minuten und Betrag werden nur dokumentiert), Anfahrt.

## 2. Grundsätze

1. **Keine Pauschalen in der Kalkulation.** Die bisherigen 20 € (UV) bzw. 15 € (Druck/Plott) „Datei und Maschineneinrichtung“ entfallen; Rüsten und Dateihandling stecken als Zeit in der Kalkulation. Die Pauschalen verwendet nur noch die Buchhaltung für Kundendaten, an denen nichts bearbeitet wird (außerhalb des Panels). **[M]**
2. **Zeiten sind Gesamtzeiten aus echten Abläufen** (ohne unbeaufsichtigte Maschinenlaufzeit), nicht die Summe von Einzelschritten. Die Einzelschritt-Addition lag bei kleinen Aufträgen um mehr als das Doppelte zu hoch. **[M]** Gesamtzeiten, Aufteilung **[A]**
3. **Material immer auf das Endmaß**, Verschnitt eingepreist (wie bei der Folie). Kein Vorratsstapel, jedes Schild wird aus der Platte gesägt. **[M]**
4. **Ein Aufschlag auf die Selbstkosten** plus ein **UV-Druck-VK je m²** (UV-Direktdruck wird wie die Druckfolien über einen VK je m² gerechnet). **[A]**, Ergebnis von Markus bestätigt („richtige Richtung“, Beispiele ok)

## 3. Verfahren je Schild

- **UV (UJF6042):** Direktdruck bis A2 (+20 %, siehe 6). PVC und Dibond ohne Weiß, Acryl mit Weiß. **[M]**
- **Digitaldruck kaschiert:** über A2. 3551 mit Laminat, kaschiert. Acryl: 3551 transparent plus vollflächig 751C weiß, **nur einmal kaschiert**. **[M]**
- Acryl bis 300 × 600 mm (beide Kanten innerhalb): Laserzuschnitt, unbeaufsichtigt, keine Kantennacharbeit. Darüber Säge + Kantennacharbeit. **[M]**

## 4. Rechenweg

Alle Beträge netto. `S` = `stundensatz.produktion` / 60 (84 €/h). `n` = Anzahl Schilder, `A` = Preisfläche je Schild in m² (siehe 6), `U` = Umfang je Schild in m (Realmaß).

### 4.1 Zeit [min]

**UV:**
```
T_uv = 7 (je Auftrag) + 1 × n
     + 10 (je Auftrag, einmal, wenn mind. ein Acrylschild gelasert wird: Laser-Rüsten 5 + Laser-Datei 5)
     + Σ Acryl-Schilder mit Säge: 5 × U        (Kantennacharbeit 5 min/lfm)
     + Σ Bohrungen × 2
```
**Digitaldruck kaschiert:**
```
T_dd = 18 (je Auftrag) + Σ Schilder: 12 × A
     + Σ Acryl-Schilder: 5 × U
     + Σ Bohrungen × 2
```
Herkunft [M]: Gesamtzeiten 1 × PVC A5 UV 8 min, 1 × PVC A2 UV 8 min, 5 × PVC A4 UV 12 min, 1 × Alu 1 m² kaschiert 30 min, 1 × Bande Alu 0,75 × 3 m kaschiert 45 min. Aufteilung in fest/je Stück/je m² [A]. Laser-Rüsten 5, Laser-Datei 5, Kanten 5 min/lfm, Bohrung 2 min/Loch [M].

### 4.2 Material zu EK [€]

```
platte    = n × A × ek_m2(Platte) × (1 + verschnitt(Platte) / 100)
tinte_uv  = n × A × (2,59 ohne Weiß | 6,91 mit Weiß)           (nur UV)
folie_dd  = n × A × 8,25 × 1,3                                   (nur Digitaldruck: 3551 inkl. Laminat und Tinte, Folienverschnitt 1,3 wie PREISLOGIK §11)
          + Acryl: n × A × 7,61 × 1,3                            (751C weiß)
```
Verschnitt Platte: 15 % PVC/Dibond, 30 % Acryl. **[A]** (aus den Plattenmaßen; bei Acryl 1000 × 2050 deutlich mehr Rest). Tinte UJF: Schätzwerte, noch nicht an Maschinendaten geprüft. **[M]**

### 4.3 Preis

```
selbstkosten = T × S + platte + tinte_uv + folie_dd
preis        = selbstkosten × 1,2  +  UV-Fläche × uv_vk_m2
               uv_vk_m2 = 85 €/m² ohne Weiß, 140 €/m² mit Weiß (Acryl)
falls preis < 30:  preis = 30           (Mindestbetrag je Auftrag, ohne Grafik)
preis_gerundet = aufrunden auf 0,50 €
```
- Aufschlag 1,2 **[A]**, abgestimmt an der Bande (fair laut Markus) und an „5 × Alu A5 knapp 40 €“ **[M]**. UV-VK 85 €/m² **[A]** aus dieser Vorgabe. UV-VK mit Weiß 140 €/m² **[A]**, so gesetzt, dass Acryl auf dem von Markus als „ok“ bestätigten Niveau bleibt.
- Mindestbetrag 30 € **[M]**. Rundung 0,50 € **[A]**, in der Matrix verwendet, nicht ausdrücklich bestätigt.
- Grafik: Minuten und Betrag (`stundensatz.grafik`) werden nur dokumentiert (Panel, Messprotokoll, Details, PDF), nicht im Preis (Nachtrag 25.10.2026). Matrix und Rechenbeispiele waren schon ohne Grafik gerechnet und bleiben unverändert. [M]

## 5. Mischaufträge

Enthält ein Auftrag UV- und Digitaldruck-Schilder, fallen beide Festanteile (7 und 18 min) je einmal an. **[A]**

## 6. Preisfläche und DIN-Regel

- Bis 20 % über einem DIN-Format (A5, A4, A3, A2) gilt die Fläche des kleineren Formats, darüber die des nächstgrößeren. **[M]** Vergleich über die Fläche **[A]**.
- Kleiner als A5 → Fläche A5 **[A]** (A6 wird praktisch nicht verkauft **[M]**).
- Über A2 + 20 % → tatsächliche Fläche (Zeichenfläche im Realmaß); Verfahren Digitaldruck kaschiert.
- Grundlage je Schild ist die Zeichenfläche (je Schild eine Zeichenfläche, Material je Zeichenfläche, wie Stufe 14).

## 7. Preisliste (CSV) – Vorschlag für neue Zeilen

Werte für den Build-Chat; Spaltenaufbau wie `preisliste.csv`. Neue `typ`-Werte (`platte`) und neue Schlüssel sind Vorschlag des Preis-Chats; Namen/Bezeichnungen bitte mit Markus bestätigen, falls sie im Panel sichtbar werden.

```csv
typ;schluessel;gilt_fuer;bezeichnung;verfahren;ek_m2;vk_m2;tape_vk_m2;minuten;prozent;wert
platte;Dib-3;schild;Dib 3;;27,79;;;;15;
platte;PVC-3;schild;PVC 3;;12,37;;;;15;
platte;PVC-5;schild;PVC 5;;19,81;;;;15;
platte;PVC-10;schild;PVC 10;;37,37;;;;15;
platte;PMMA-3;schild;PMMA 3;;38,86;;;;30;
platte;PMMA-5;schild;PMMA 5;;64,75;;;;30;
platte;PMMA-8;schild;PMMA 8;;103,61;;;;30;
platte;PMMA-10;schild;PMMA 10;;129,51;;;;30;
parameter;schild.aufschlag;schild;Aufschlag auf Selbstkosten Schild;;;;;;;1,2
parameter;schild.mindest;schild;Mindestbetrag Schild je Auftrag;;;;;;;30
parameter;schild.rundung;schild;Rundung Schild (immer aufrunden);;;;;;;0,5
parameter;schild.uv_vk_m2;schild;UV-Druck VK je m² ohne Weiß;;;;;;;85
parameter;schild.uv_vk_m2_weiss;schild;UV-Druck VK je m² mit Weiß;;;;;;;140
parameter;schild.tinte_uv_m2;schild;Tinte UJF je m² ohne Weiß (EK);;;;;;;2,59
parameter;schild.tinte_uv_m2_weiss;schild;Tinte UJF je m² mit Weiß (EK);;;;;;;6,91
zeit;auftrag;schild;Schild UV je Auftrag;uv;;;;7;;
zeit;stueck;schild;Schild UV je Stück;uv;;;;1;;
zeit;auftrag;schild;Schild Digitaldruck kaschiert je Auftrag;druck;;;;18;;
zeit;m2;schild;Schild Digitaldruck kaschiert je m²;druck;;;;12;;
zeit;laser_auftrag;schild;Acryl Laser Rüsten + Datei je Auftrag;alle;;;;10;;
zeit;kante_m;schild;Acryl Kantennacharbeit je Laufmeter (Säge);alle;;;;5;;
zeit;bohrung;schild;Bohrung je Loch;alle;;;;2;;
```
- `ek_m2` Platte = EK je Platte / Plattenfläche: PVC 1560 × 3050 (58,86 / 94,26 / 177,81 €), Dibond 1500 × 3050 (127,14 €), Acryl 1000 × 2050 (79,66 / 132,74 / 212,40 / 265,50 €). **[M]**
- `prozent` bei `platte` = Verschnittzuschlag in %.
- Folien 3551 und 751C: EK aus den bestehenden Serienzeilen (`ek_m2`), Faktor 1,3.
- Verfahren `uv` ist neu (bisher nur plott, druck, alle).

## 8. Rechenbeispiele (nur Dokumentation, kein Prüfkriterium)

| Auftrag | Preis netto |
| --- | --- |
| 1 × PVC 3 A4, UV | 30,00 (Mindestbetrag) |
| 1 × PVC 3 A2, UV | 40,00 |
| 5 × Dib 3 A5, UV | 40,00 |
| 5 × PVC 3 A4, UV | 53,00 |
| 1 × PMMA 5 A2, UV mit Weiß | 93,00 |
| 1 × Dib 3, 1 m², kaschiert | 102,00 |
| 1 × Dib 3, 750 × 3000, kaschiert (Bande) | 191,00 |

Preismatrix A5–A2 je Stück (1/2/3/5/10 Stück) und m²-Preise über A2: im Preis-Chat vom 24.10.2026 erstellt; ergibt sich vollständig aus 4–6.

## 9. Offen

1. **Mehrere kaschierte Schilder:** Zeit je weiteres Stück ungemessen; vorerst 12 min/m² je Stück. Messpunkt fehlt (z. B. 3 × Alu 1 m² kaschiert, Gesamtzeit). [M]
2. **Bohrungen:** Eingabe je Schild im Panel nötig; Bezeichnung durch Markus.
3. **Beidseitig UV (UV-Vorn + UV-Hinten auf einem Schild)** und **Plott auf Schild** (z. B. Plottschrift auf Acryl): noch nicht kalkuliert.
4. **Kollegenpreis** (Zuschnitte, Abholung, ohne Entgraten, fester m²-Preis, Kosten ohne Gewinn): wird im Preis-Chat noch festgelegt.
5. **Fahrzeug/Beschriftung:** Überarbeitung der Zeiten in eigenem Chat (Zeitkatalog unten).

## 10. Zeitkatalog Stand 24.10.2026 (Angaben Markus) – Grundlage für die Überarbeitung Fahrzeug/Beschriftung

Nicht Teil der Schildkalkulation (dort gelten die Gesamtzeiten aus 4.1); hier festgehalten, damit nichts verloren geht. Mindestwerte gelten **je Stück**: Ein Wert „je m²“ wird mindestens für 1 m² gerechnet.

| Schritt | Zeit |
| --- | --- |
| Rüsten HP Latex / CJV | 4 min |
| Rüsten UJF | 1 min |
| Rüsten Schneideplotter (inkl. Passermarken einlesen) | 1 min |
| Rüsten Laminator | 3 min |
| Datei RIP | 5 min je Auftrag |
| Datei Cut | 3 min je Auftrag |
| Datei Laser | 5 min je Auftrag |
| Verarbeitungszuschnitt je Folienmaterial (Druck, Print & Cut, Cut) | 2 min |
| Application Tape (inkl. Übertragen) | 2 min/m², mind. 1 m² |
| Druck abnehmen | 20 s je Druckjob |
| Laminieren | 20 s/m², mind. 1 m² |
| Folie kaschieren | 3 min/m², mind. 1 m² |
| Besäumen nach Kaschieren | 10 s je lfm und Kante, mind. 40 s |
| Plattenzuschnitt Säge | 5 min je Schild |
| Entgraten | 30 s/lfm |
| Reinigen Schildmaterial | 1 min/m², mind. 1 m² |
| Schutzfolie abziehen (alle Platten) | 10 s/m², mind. 1 m² |
| Kontrolle Schild | 30 s je Stück |
| Verpacken Schilder | 5 min je Auftrag |
| Kontrolle + Verpacken Folienaufträge | 6 min je Auftrag |
| UJF Einlegen/Abnehmen | 10 s je Schild |
| Bohrung | 2 min je Loch |
| Laser Rüsten | 5 min |
| Acryl Kantennacharbeit | 5 min/lfm |
| Montage: Untergrund reinigen | 3 min/m² |
| Montage: Einmessen | 2 min je Stück |
| Montage je Auftrag (Baustelle einrichten, sichten, aufräumen, Abnahme) | 20 min |

- Entgittern: bleibt vorerst 0,16 min/Einzelteil, 0 je Meter Schnitt; Kalibrierung über Dateien und Ist-Zeiten. [M]
- Verkleben: Vorschlag Preis-Chat, noch nicht bestätigt – je Stück 1,2 min + je m² 1,4 min + je Einzelteil 0,08 min (aus Bahn 5 m² = 10 min, 3 Plottlogos = 10 min, MGP 85 min). [A]
- Pauschalen 15 €/20 € entfallen auch dort; Rüsten/Datei als Zeit. [M]
- Offene Frage für Fahrzeug/Beschriftung: Gilt die Einzelschritt-Addition dort, oder werden wie bei Schildern Gesamtzeiten erhoben? (Bei Schildern lag die Addition deutlich zu hoch.)
