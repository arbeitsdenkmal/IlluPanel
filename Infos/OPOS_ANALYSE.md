# OPOS-Marken des Summa-GoSign-Plugins (XY und XY2) – Untersuchung Stufe 22

Stand 23.10.2026. Reine Untersuchung: kein Produktivcode geändert, OPOS.app, Plugin und Skripte von Markus unverändert, Plugin-Voreinstellungen nur gelesen. Testdokumente unter `tests/out/opos/`, Testhelfer und Rohdaten unter `tests/opos/` (`opos_helfer.jsx`, `menue.applescript`, `opos.mjs`, `regel.js`, `daten/*.json`). Keine Screenshots.

## 1. Bestandsaufnahme

**Plugin:** `/Applications/Adobe Illustrator 2026/Plug-ins.localized/SUMMAGoSign.aip`, Info.plist: `CFBundleIdentifier` com.softeamitalia.plugins.SUMMAGoSign, **Version 1.1.0.17** („SUMMAGoSign version 1 . 1 . 0 . 17, Copyright SofTeam s.r.l.“), gebaut mit Xcode 16 / macOS-SDK 15.0, Datum der Dateien 23.10.2024. Menü in Illustrator: *Datei > Summa GoSign >* New from Template, Add OPOS XY Regmarks, Add OPOS XY2 Regmarks, Add OPOS CAM Regmarks, Publish to PDF (die Add-Befehle sind ohne Auswahl gesperrt).

**Voreinstellungen (nur gelesen):**
- `~/Library/Preferences/com.softeamitalia.MacSignAI.plist`: `CommParams` true, `CommType` 3, `CutterType` 5, `IP_Addr` 192.168.0.0, `USBClass` 1 – Verbindung zum Schneidplotter, keine Markenmaße.
- Die Schlüssel **Prefs00–Prefs06** liegen in zwei Dateien mit irreführenden Namen (Änderungsdatum 13.10.2022):
  - `~/Library/Preferences/com.apple.csai.plugins.plist` → `SOFTEAM_OPOS` / `10.0.0`: Prefs00 29425663, Prefs01 −50266113, Prefs02 745389895,31 (= 15.08.2024 04:44 UTC als Mac-Zeit), Prefs03/05/06 je 7 Byte `31 32 33 41 42 43 00` („123ABC“), Prefs04 749649599,81 (= 03.10.2024 11:59 UTC).
  - `~/Library/Preferences/com.apple.softweb.prefs.plist` → `MacSign` / `10.0.0`: Prefs00 29425663, Prefs01 318832639, Prefs02 745389293,54 (15.08.2024 04:34 UTC), Prefs03/05/06 „123ABC“, Prefs04 748255592,43 (17.09.2024 08:46 UTC).
  - Deutung (nicht belegt): Lizenz- bzw. Aktivierungsdaten mit Zeitstempeln, keine Geometrie. Die Domäne `com.summaitalia.GoSignAI`, die das Plugin per `CFPreferences` liest, existiert nicht (auch nicht ByHost); in den Einstellungen von Illustrator 30 (`Adobe Illustrator Prefs` u. a.) steht nichts zum Plugin. **Befund:** Markenmaße sind nirgends einstellbar gespeichert – sie stecken im Plugin; der Menübefehl zeigt keinen Dialog.

**Auslöseweg von OPOS.app** (`Contents/Resources/Scripts/main.scpt`, mit `osadecompile` gelesen, nicht verändert): AppleScript über *System Events* (Bedienungshilfen). Es holt Illustrator nach vorn, sucht in allen Top-Menüs einen Eintrag mit „Summa GoSign“/„GoSign“/„SUMMA“, darin zuerst exakt „Add OPOS XY Regmarks“ (und Varianten), sonst unscharf „OPOS“/„Regmark“/„Registration“, klickt den ersten aktiven, wartet 0,3 s und klickt in einem Fenster mit „GoSign/Summa/OPOS/Registration/Regmark“ im Titel einen Knopf wie „OK“. **XY2 wird von OPOS.app nie ausgelöst** (nur XY). Der Testhelfer `tests/opos/menue.applescript` nutzt denselben Weg, aber mit genau einem Menüeintrag (XY bzw. XY2) und ohne Knöpfe zu klicken; XY2 ließ sich damit automatisch auslösen. In keinem Lauf erschien ein Dialog.

## 2. Testreihe

Je Fall ein neues Dokument (mm), Ebene „Druck“, ein Rechteck als Auswahl, Zeichenfläche = Auswahl + 2 × 22,1765 mm (wie Druckbogen), einmal XY, einmal XY2; Zusatzfälle je einmal XY. Nachmessungen auf Wunsch von Markus, je einmal XY, nur für die Markenzahl: Breite 600, Längen 1200, 1500, 1800, 2000, 2200, 3000, 3500, 4500, 5000 mm, danach 310, 350, 375, 450, 500, 590, 899, 1199 mm.

**Ablauf der Läufe:** Ein erster Lauf war ungültig – mein Testhelfer hatte die Rechtecke unterhalb der Zeichenfläche gezeichnet (neue Dokumente haben ihren Ursprung nicht an der Zeichenflächenecke), beim 5700-mm-Fall außerhalb der Arbeitsfläche, mit falschen Begrenzungen (Hinweis Markus). Helfer korrigiert (Lage relativ zu `artboardRect`, Abbruch bei mehr als 0,01 mm Abweichung der Auswahl vom Soll), Rohdaten gelöscht, Reihe einmal neu: 23/23 Läufe, danach 9 + 8 Nachmessungen. Vorher ein Probelauf mit 200 × 300 (Helferfehler: Zustand ging zwischen zwei Aufrufen verloren). Sporadische Fehler: keine.

Koordinaten in mm relativ zur **sichtbaren** Begrenzung der Auswahl: x nach rechts ab linker Kante, y nach unten ab Oberkante; b = Breite quer, l = Länge in Einzugsrichtung (im Dokument senkrecht).

| Fall | Rolle | Verfahren | Auswahl b × l (sichtbar) | Marken je Seite | Abstand | Marken links x / rechts x | erste / letzte Marke y | XY-Linie (x0–x1, y0–y1) | XY2-Linie |
|---|---|---|---|---|---|---|---|---|---|
| A_50x50 | ableitung | XY | 50,00 × 50,00 | 2 | 71,00 | -12,00 / 59,00 | -12,00 / 59,00 | 1,00–49,00, 59,00–62,00 | – |
| A_50x50 | ableitung | XY2 | 50,00 × 50,00 | 2 | 71,00 | -12,00 / 59,00 | -12,00 / 59,00 | 1,00–49,00, 59,00–62,00 | 1,00–49,00, -12,00–-9,00 |
| A_200x300 | ableitung | XY | 200,00 × 300,00 | 2 | 321,00 | -12,00 / 209,00 | -12,00 / 309,00 | 1,00–199,00, 309,00–312,00 | – |
| A_200x300 | ableitung | XY2 | 200,00 × 300,00 | 2 | 321,00 | -12,00 / 209,00 | -12,00 / 309,00 | 1,00–199,00, 309,00–312,00 | 1,00–199,00, -12,00–-9,00 |
| A_600x999 | ableitung | XY | 600,00 × 999,00 | 4 | 340,00 | -12,00 / 609,00 | -12,00 / 1008,00 | 1,00–599,00, 1008,00–1011,00 | – |
| A_600x999 | ableitung | XY2 | 600,00 × 999,00 | 4 | 340,00 | -12,00 / 609,00 | -12,00 / 1008,00 | 1,00–599,00, 1008,00–1011,00 | 1,00–599,00, -12,00–-9,00 |
| A_600x1000 | ableitung | XY | 600,00 × 1000,00 | 4 | 340,33 | -12,00 / 609,00 | -12,00 / 1009,00 | 1,00–599,00, 1009,00–1012,00 | – |
| A_600x1000 | ableitung | XY2 | 600,00 × 1000,00 | 4 | 340,33 | -12,00 / 609,00 | -12,00 / 1009,00 | 1,00–599,00, 1009,00–1012,00 | 1,00–599,00, -12,00–-9,00 |
| A_1000x2500 | ableitung | XY | 1000,00 × 2500,00 | 9 | 315,12 | -12,00 / 1009,00 | -12,00 / 2509,00 | 1,00–999,00, 2509,00–2512,00 | – |
| A_1000x2500 | ableitung | XY2 | 1000,00 × 2500,00 | 9 | 315,12 | -12,00 / 1009,00 | -12,00 / 2509,00 | 1,00–999,00, 2509,00–2512,00 | 1,00–999,00, -12,00–-9,00 |
| A_1295.647x2500 | ableitung | XY | 1295,65 × 2500,00 | 9 | 315,12 | -12,00 / 1304,65 | -12,00 / 2509,00 | 1,00–1294,65, 2509,00–2512,00 | – |
| A_1295.647x2500 | ableitung | XY2 | 1295,65 × 2500,00 | 9 | 315,12 | -12,00 / 1304,65 | -12,00 / 2509,00 | 1,00–1294,65, 2509,00–2512,00 | 1,00–1294,65, -12,00–-9,00 |
| A_1295.647x5700 | ableitung | XY | 1295,65 × 5700,00 | 20 | 301,11 | -12,00 / 1304,65 | -12,00 / 5709,00 | 1,00–1294,65, 5709,00–5712,00 | – |
| A_1295.647x5700 | ableitung | XY2 | 1295,65 × 5700,00 | 20 | 301,11 | -12,00 / 1304,65 | -12,00 / 5709,00 | 1,00–1294,65, 5709,00–5712,00 | 1,00–1294,65, -12,00–-9,00 |
| N_600x310 | Nachmessung | XY | 600,00 × 310,00 | 2 | 331,00 | -12,00 / 609,00 | -12,00 / 319,00 | 1,00–599,00, 319,00–322,00 | – |
| N_600x350 | Nachmessung | XY | 600,00 × 350,00 | 2 | 371,00 | -12,00 / 609,00 | -12,00 / 359,00 | 1,00–599,00, 359,00–362,00 | – |
| N_600x375 | Nachmessung | XY | 600,00 × 375,00 | 2 | 396,00 | -12,00 / 609,00 | -12,00 / 384,00 | 1,00–599,00, 384,00–387,00 | – |
| N_600x450 | Nachmessung | XY | 600,00 × 450,00 | 3 | 235,50 | -12,00 / 609,00 | -12,00 / 459,00 | 1,00–599,00, 459,00–462,00 | – |
| N_600x500 | Nachmessung | XY | 600,00 × 500,00 | 3 | 260,50 | -12,00 / 609,00 | -12,00 / 509,00 | 1,00–599,00, 509,00–512,00 | – |
| N_600x590 | Nachmessung | XY | 600,00 × 590,00 | 3 | 305,50 | -12,00 / 609,00 | -12,00 / 599,00 | 1,00–599,00, 599,00–602,00 | – |
| N_600x899 | Nachmessung | XY | 600,00 × 899,00 | 4 | 306,67 | -12,00 / 609,00 | -12,00 / 908,00 | 1,00–599,00, 908,00–911,00 | – |
| N_600x1199 | Nachmessung | XY | 600,00 × 1199,00 | 5 | 305,00 | -12,00 / 609,00 | -12,00 / 1208,00 | 1,00–599,00, 1208,00–1211,00 | – |
| N_600x1200 | Nachmessung | XY | 600,00 × 1200,00 | 5 | 305,25 | -12,00 / 609,00 | -12,00 / 1209,00 | 1,00–599,00, 1209,00–1212,00 | – |
| N_600x1500 | Nachmessung | XY | 600,00 × 1500,00 | 6 | 304,20 | -12,00 / 609,00 | -12,00 / 1509,00 | 1,00–599,00, 1509,00–1512,00 | – |
| N_600x1800 | Nachmessung | XY | 600,00 × 1800,00 | 7 | 303,50 | -12,00 / 609,00 | -12,00 / 1809,00 | 1,00–599,00, 1809,00–1812,00 | – |
| N_600x2000 | Nachmessung | XY | 600,00 × 2000,00 | 7 | 336,83 | -12,00 / 609,00 | -12,00 / 2009,00 | 1,00–599,00, 2009,00–2012,00 | – |
| N_600x2200 | Nachmessung | XY | 600,00 × 2200,00 | 8 | 317,29 | -12,00 / 609,00 | -12,00 / 2209,00 | 1,00–599,00, 2209,00–2212,00 | – |
| N_600x3000 | Nachmessung | XY | 600,00 × 3000,00 | 11 | 302,10 | -12,00 / 609,00 | -12,00 / 3009,00 | 1,00–599,00, 3009,00–3012,00 | – |
| N_600x3500 | Nachmessung | XY | 600,00 × 3500,00 | 12 | 320,09 | -12,00 / 609,00 | -12,00 / 3509,00 | 1,00–599,00, 3509,00–3512,00 | – |
| N_600x4500 | Nachmessung | XY | 600,00 × 4500,00 | 16 | 301,40 | -12,00 / 609,00 | -12,00 / 4509,00 | 1,00–599,00, 4509,00–4512,00 | – |
| N_600x5000 | Nachmessung | XY | 600,00 × 5000,00 | 17 | 313,81 | -12,00 / 609,00 | -12,00 / 5009,00 | 1,00–599,00, 5009,00–5012,00 | – |
| K_137x413 | kontrolle | XY | 137,00 × 413,00 | 3 | 217,00 | -12,00 / 146,00 | -12,00 / 422,00 | 1,00–136,00, 422,00–425,00 | – |
| K_137x413 | kontrolle | XY2 | 137,00 × 413,00 | 3 | 217,00 | -12,00 / 146,00 | -12,00 / 422,00 | 1,00–136,00, 422,00–425,00 | 1,00–136,00, -12,00–-9,00 |
| K_850x1730 | kontrolle | XY | 850,00 × 1730,00 | 6 | 350,20 | -12,00 / 859,00 | -12,00 / 1739,00 | 1,00–849,00, 1739,00–1742,00 | – |
| K_850x1730 | kontrolle | XY2 | 850,00 × 1730,00 | 6 | 350,20 | -12,00 / 859,00 | -12,00 / 1739,00 | 1,00–849,00, 1739,00–1742,00 | 1,00–849,00, -12,00–-9,00 |
| K_1200x4100 | kontrolle | XY | 1200,00 × 4100,00 | 14 | 317,00 | -12,00 / 1209,00 | -12,00 / 4109,00 | 1,00–1199,00, 4109,00–4112,00 | – |
| K_1200x4100 | kontrolle | XY2 | 1200,00 × 4100,00 | 14 | 317,00 | -12,00 / 1209,00 | -12,00 / 4109,00 | 1,00–1199,00, 4109,00–4112,00 | 1,00–1199,00, -12,00–-9,00 |
| Z_cut | zusatz | XY | 302,00 × 402,00 | 3 | 211,50 | -12,00 / 311,00 | -12,00 / 411,00 | 1,00–301,00, 411,00–414,00 | – |
| Z_grosseZF | zusatz | XY | 300,00 × 400,00 | 3 | 210,50 | -12,00 / 309,00 | -12,00 / 409,00 | 1,00–299,00, 409,00–412,00 | – |
| Z_luecken | zusatz | XY | 300,00 × 400,00 | 3 | 210,50 | -12,00 / 309,00 | -12,00 / 409,00 | 1,00–299,00, 409,00–412,00 | – |

## 3. Was das Plugin anlegt (alle Fälle gleich)

- **Ebene „Regmark“**, neu, **oberste** Ebene, **gesperrt**, sichtbar, druckend, ohne Unterebenen. Gibt es sie noch nicht, legt das Plugin sie an.
- **Farbfeld „Regmark“**, neu, Vollton (`ColorModel.SPOT`), CMYK 0/0/0/100.
- Nur Pfade (`PathItem`, geschlossen, 4 Punkte, Rechtecke), **nicht gruppiert**, direkt in der Ebene, Füllung Vollton „Regmark“ 100 %, **keine Kontur**. Namen: „Mark“, „OPOS XY Line“, „OPOS XY2 Line“.
- **Stapel** von oben: „OPOS XY2 Line“ (nur XY2), „OPOS XY Line“, die Marken der linken Spalte von oben nach unten, dann die der rechten.
- **Unverändert:** Zeichenfläche, Auswahl (bleibt das ausgewählte Objekt), übrige Ebenen, XMP. Kein Dialog.
- Die von mir zuerst gemeldeten falschen `geometricBounds` der Plugin-Pfade waren eine Folge des ungültigen ersten Laufs; im gültigen Lauf stimmen Begrenzung und Ankerpunkte überein.

## 4. Abgeleitete Regel (`tests/opos/regel.js`)

Bezug ist die **sichtbare Begrenzung der ganzen Auswahl** (b × l). Maße in mm.

- **Marken:** Quadrate 3 × 3 in zwei Spalten, links bei x = −12 … −9, rechts bei x = b + 9 … b + 12 (9 mm Abstand zur Auswahl).
- **Markenzahl je Seite:** n − 1 = max(1, ⌊l / 300⌋, ⌈(l + 21) / P⌉) mit **P = 400 mm** (Annahme). In Worten: ein Raster von 300 mm, und der Abstand zweier Marken (l + 21) / (n − 1) darf P nicht überschreiten – sonst eine Marke mehr. P ist aus den Daten nur eingegrenzt: **396 ≤ P ≤ 406,66 mm** (375 mm mit 2 Marken je Seite, Abstand 396 – erlaubt; 1199 mm mit 4 Marken, Abstand 406,67 – abgelehnt). Ob das Raster mit l oder mit l + 21 rechnet, ist nur in Verbindung mit P unterscheidbar: mit l + 21 passt kein P zu allen Fällen einschließlich der Kontrollfälle, mit l passt jedes P im genannten Bereich.
- **Lage längs:** erste Marke y = −12 … −9, letzte y = l + 9 … l + 12, dazwischen gleichmäßig; Abstand p = (l + 21) / (n − 1), Marke i bei y = −12 + i · p (i = 0 … n − 1). Links und rechts dieselben y.
- **„OPOS XY Line“:** x = 1 … b − 1, y = l + 9 … l + 12 (unterer Rand der Auswahl im Dokument, gleiche Zeile wie die letzten Marken, 10 mm Abstand zu ihnen).
- **XY2:** zusätzlich „OPOS XY2 Line“ x = 1 … b − 1, y = −12 … −9 (oberer Rand, in der Zeile der ersten Marken); alles andere wie XY.
- **Breite:** wirkt nur auf die x-Lage der rechten Spalte und die Linienlänge; n hängt nur von l ab (b = 50 … 1295,647 geprüft).

## 5. Prüfung gegen alle Fälle (Toleranz 0,01 mm)

`node tests/opos/regel.js`: **40/40 Fälle ohne Abweichung** – Lage, Größe, Name, Ebene, Farbe, Kontur, Stapel und Markenzahl, einschließlich der Kontrollfälle (137 × 413, 850 × 1730, 1200 × 4100, je XY und XY2) und der Zusatzfälle (400 bzw. 402 mm sichtbar).

**Verlauf (nicht wegerklärt):** Die erste Fassung der Regel aus den 7 Ableitungsfällen (n − 1 = ⌊l / 300⌋) hatte 5 Abweichungen bei der Markenzahl: K_137x413 XY und XY2, Z_luecken, Z_grosseZF (l = 400) und Z_cut (l = 402 sichtbar), jeweils 3 statt 2 Marken je Seite. Die Nachmessung 1200 … 5000 mm bestätigte das Raster, die Nachmessung 310 … 1199 mm zeigte zwei weitere Abweichungen derselben Art (899 mm: 4 statt 3, 1199 mm: 5 statt 4) und grenzte den Höchstabstand P ein. Die angepasste Regel (Abschnitt 4) ist aus Ableitungsfällen und Nachmessungen gewonnen; die Kontrollfälle wurden dafür nicht verwendet und stimmen.

## 6. Bezugsbasis

- **Auswahl, sichtbare Begrenzung:** Fall „Cutkontur“ (Gruppe aus Motiv mit 2-mm-Kontur und Cutkontur 5 mm innen): Marken und Linie liegen genau 1 mm weiter außen als bei der geometrischen Begrenzung, also an der sichtbaren Begrenzung (inkl. halber Konturbreite). Die Cutkontur spielt keine eigene Rolle (liegt innen).
- **Mehrere Objekte mit Lücken:** gleiches Ergebnis wie ein Rechteck derselben Gesamtbegrenzung – das Plugin nimmt die Begrenzung der ganzen Auswahl, nicht die Einzelobjekte.
- **Zeichenfläche:** egal – bei 300 mm größerer Zeichenfläche liegen die Marken unverändert an der Auswahl.

## 7. Abgleich mit `config/medien.json`

- Die Marken liegen 12 mm außerhalb der Auswahl je Seite, quer und längs: Außenmaß = Auswahl + **24,000 mm** (2 × 12). `opos_zugabe_mm` ist **24,353** – 0,353 mm (0,1765 je Seite) mehr als das Plugin braucht.
- Bei Zeichenfläche = Auswahl + 44,353 bleiben von der Außenkante der Marken bis zum Zeichenflächenrand **10,1765 mm** je Seite; `opos_marken_rand_mm` ist **10**. Summe unverändert: 2 × (12 + 10,1765) = 44,353 mm. Die Zeichenfläche passt also; nur die Aufteilung in Zugabe und Rand ist nicht die des Plugins (Ursache der 24,353 nicht ermittelt).

## 8. Platz für die Druckrichtungsmarkierung (XY2, nur geprüft, nicht gezeichnet)

Vorgabe Markus: gefülltes Dreieck, Spitze in Einzugsrichtung, mittig im Rand vor der vorderen Linie.

- **Welche Linie „vorne“ ist,** zeigen die Daten nicht: „OPOS XY Line“ liegt am unteren Rand der Auswahl im Dokument (y = l + 9 … l + 12), „OPOS XY2 Line“ am oberen (y = −12 … −9). Welche Kante der Plotter zuerst einzieht, bitte bestätigen (offen, siehe 9). Beide Ränder sind gleich groß, der Befund gilt für beide.
- **Freier Streifen zwischen Linie und Zeichenflächenrand:** 10,1765 mm hoch (Linie endet 12 mm vor der Auswahl, Zeichenfläche 22,1765 mm), über die ganze Breite frei: die Marken der ersten bzw. letzten Zeile liegen auf derselben Höhe wie die Linie (−12 … −9 bzw. l + 9 … l + 12), nicht im Streifen.
- **Mitte:** x = b / 2; die Linie reicht von x = 1 bis b − 1, die nächsten Marken sind waagrecht 10 mm von den Linienenden entfernt (x = −9 bzw. b + 9) – bei mittiger Lage weit weg.
- **Abstände bei mittiger Lage im Streifen:** Ein Dreieck der Höhe h hat zur Linie und zum Zeichenflächenrand je (10,1765 − h) / 2, z. B. h = 6 mm → je 2,09 mm; h = 8 mm → je 1,09 mm. Kantenhalter (15 mm je Seite) betreffen nur die Querrichtung, nicht diesen Streifen.

## 9. Offene Punkte

1. **Höchstabstand P** nur eingegrenzt (396 … 406,66 mm, angesetzt 400). Längen, bei denen P den Ausschlag gibt (z. B. 380 … 385 mm oder 1180 … 1199 mm), würden ihn genauer bestimmen; für eigene Marken ist das unerheblich, solange sie dieselbe Zahl ergeben – für einen Nachbau 1:1 müsste P exakt feststehen.
2. **Welche Linie „vorne“ liegt** (Einzugsrichtung des Plotters) – entscheidet, wo das Dreieck hinkommt.
3. **Herkunft von 24,353 / 10 mm** in `medien.json` gegenüber 24 / 10,1765 mm beim Plugin.
4. Nicht geprüft: „Add OPOS CAM Regmarks“, ein Druckbogen mit mehreren Ebenen/Symbolen, eine schon vorhandene Ebene bzw. ein schon vorhandenes Farbfeld „Regmark“, Auswahl mit Schnittmaske oder Bild.

## 10. Für später (nicht umgesetzt) – überholt durch Stufe 23

**Stufe 23:** Eigene Marken nach dieser Regel sind umgesetzt (`panel/lib/opos.js`, Schalter `opos_marken` in `config/medien.json`; Linien als 3-mm-Pfad statt Rechteck, Druckrichtungsmarkierung, Zeichenfläche automatisch erweitert; siehe README „OPOS“ und TESTBERICHT Stufe 23). Die Schneidtest-Bögen liegen unter `tests/out/opos/schneidtest/`.


- XY2 statt XY ab Bogenlänge 1000 mm in Einzugsrichtung (Vorgabe Markus). Nach den Daten ändert XY2 nur die zusätzliche Linie am anderen Rand; Marken und Zeichenfläche bleiben gleich, die Zeichenflächenregel (+ 44,353 mm) reicht auch für XY2.
- Ziel: Marken selbst zeichnen statt Plugin/OPOS.app – mit der Regel aus Abschnitt 4 ohne Plugin möglich (P siehe 9.1): eine Ebene „Regmark“ (oberste, gesperrt), Farbfeld „Regmark“ (Vollton K 100), ungruppierte Rechteckpfade mit denselben Namen. Abschluss mit echtem Schneidtest in CoCut (Plugin-Marken gegen eigene Marken, gleicher Druck).
