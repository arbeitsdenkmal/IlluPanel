# Spezifikation Textil – Korrekturabzug und Bestelldaten

Stand: 19.10.2026, Grundlage für Stufe 15. Ersetzt die Skripte „MockUp zu Real“ (M2R) und „Real zu MockUp“ (R2M) im Panel. Die Skripte selbst bleiben unverändert im Skriptordner.
Kennzeichnung: **[V]** = Festlegung von Claude, mit dem Auftrag an CC übernommen, von Markus noch nicht ausdrücklich bestätigt.

## 1. Grundprinzip
- Führend ist das **echte Maß in mm** je Motiv und Stufe. Das MockUp ist nur die Ansicht davon.
- Die Druckgröße wird **nicht** aus dem Textil gerechnet, sondern je Position aus einer Standardtabelle gewählt oder frei eingegeben. Belegt durch rund 160 Bestelldateien: Brust klein fast immer 90–95 mm bei allen Größen; das Modell spielt keine Rolle (Sigert: Polo und Jacke gleich).
- Mehrere Größenstufen je Motiv sind möglich: je nach Größenlauf meist 1–2, manchmal 3–4. Manche Kunden verlangen eine Anpassung je Textilgröße.
- Keine Kalkulation, nur Zeiterfassung (wie Schild/Sonstiges).

## 2. Auftragsart „Textil“
- Neue Auftragsart, Typ wie Schild: nur Zeit, Grafikzeit und „+ Minuten“.
- **Anlegen:** Kunde eingeben, MockUp aus dem Ordner MockUps wählen. Das Panel speichert eine Kopie als Korrekturabzug im Kundenordner; das Original wird nie bearbeitet.
- **Ein Korrekturabzug je Modell** (Markus). Weitere Modelle kommen in denselben Kundenordner. [V] Dateiname `Korrekturabzug_<ID>.ai`.

## 3. MockUp-Vorlagen
- Einheitliche Ebenen: Anker, ID, Stofffarbe, Textil, Infos, Design.
- **Anker:** ein Pfad mit genau einem Punkt auf der Ebene „Anker“; der Objektname ist die Position, ohne Breite: `Brust_links`, `Brust_rechts`, `Brust_mitte`, `Front` (bisher `Brust_mitte_oben_220`), `Ruecken`, `Nacken`, `Aermel_links`, `Aermel_rechts`. Fehlt ein Anker, wird das Motiv frei platziert.
- Ausrichtung: Brust, Ärmel und Nacken mit der Mitte auf den Anker; Rücken und Front mit der Oberkante, horizontal zentriert.
- **Faktortabelle** nur für die Darstellung: `config/textil_modelle.csv` mit `id;modell;dateimass_mm;realmass_mm`. Das MockUp zeigt immer Größe L. Faktor = Realmaß / Dateimaß. Realmaß = halbe Brustweite L laut Maßtabelle des Herstellers, eine Größe je Modell nachgemessen.
- **Anker in den MockUp-Dateien passt Markus selbst an (später).**
  - Ladies Roundneck: zweimal `Brust_mitte_oben_220`, kein `Brust_mitte`.
  - Zip Jacket: `Brust_mitte` und `Brust_mitte_oben` liegen übereinander.
  - King Hooded, King Zipped, Polo, Sweatshirt: Ebenen Anker, Infos, Stofffarbe fehlen.
  - Meterstab: trägt T-Shirt-Anker und ID E190m (kein Textil).
- `skalierungen.csv` entfällt.

## 4. Positionen und Standardstufen (bestätigt 19.10.)

| Position | Standard | weitere Stufen |
|---|---|---|
| Brust klein (links/rechts/mittig) | 90 | 75 · 100 · 120 |
| Front (Brust groß) | 280 | 240 · 260 |
| Rücken | 280 | 220 · 250 · 300 · 320 |
| Ärmel | 75 | 50 |
| Nacken | 90 | 150 |
| Sponsor | 50 | 40 · 65 |
| Rücken oben/unten, vorne unten | frei | – |
| Kinder | 1,5 × Körpergröße in cm = Breite in mm, auf 10 gerundet (Versuch) | – |

- Bezug ist die **Breite**. Nur bei wirklich hohen Motiven die Höhe.
- Hinweis-Popup bei auffälliger Höhe: Brust klein > 120 mm, Rücken > 380 mm.

## 5. Motiv zuordnen
Position, Verfahren (DTF, Flex, Stick), Stufen (Maß, Bezug Breite/Höhe, Menge, Textilgrößen, blockout nur DTF), Flex-Farbe als Freitext. [V] Je Motiv eine Stufe für die Ansicht im Korrekturabzug (vorbelegt: Standard).

## 6. Ausgabe
- **DTF und Stick:** je Motiv und Stufe eine PDF, „pam x4“, 1:1, Zeichenfläche umlaufend 2 mm größer, Transparenz erhalten. Dateiname `<Menge>x_<Kunde>_<Position>_<Maß>[_blockout].pdf` (bestätigt), [V] bei mehreren Modellen im Kundenordner zusätzlich `_<ID>`.
- **Namen:** alle Namen in einer Datei, höchstens 560 × 1000 mm. Blocksatz: alle Zeilen gleich breit, links und rechts bündig, Namen so verteilt, dass die Zeilen möglichst voll sind, Namen nicht skaliert. Mindestabstand zwischen den Namen 10 mm, Zeilenabstand 10 mm (Markus). [V] Das Maß der Stufe gilt für den breitesten Namen, alle Namen werden mit demselben Faktor skaliert. [V] Zeile mit nur einem Namen: linksbündig.
- **Flex:** über Summa. Daten bis 470 mm Breite, Zeichenfläche 480 mm, 5–10 mm Abstand zwischen den Motiven, Anzahl je Streifen legt der Anwender fest, gespiegelt wird am Plotter, Farbname im Dateinamen. [V] Dateiname `<Streifen>x_<Kunde>_<Position>_<Maß>_<Farbe>_cut.pdf`, Streifen = aufgerundet Menge / Motive je Streifen.
- Keine Sammelbögen; der Zulieferer nestet selbst.

## 7. Korrekturabzug
Infos füllen (Model, Farbe, Druck, Datum), [V] je Motiv eine Zeile mit Position und Stufen (Maß, Textilgrößen), Export A4-PDF. [V] Dateiname `<Kunde>_Korrekturabzug[_<ID>].pdf`.

## 8. Panel
Summa und Export bei Textil aktiv, Druck und OPOS gesperrt. Raster und M2R/R2M bleiben vorerst unverändert. Die Skripte `02-MockUp zu Real.jsx` und `02-Real zu MockUp.jsx` bleiben unverändert.

## 9. Offen
1. Anker in den MockUp-Dateien (Markus, später).
2. Realmaße L je Modell.
3. Die mit [V] markierten Punkte.
