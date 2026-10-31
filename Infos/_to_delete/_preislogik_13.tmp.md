
## 13. Textil Flex/Flock (Nachtrag 31.10.2026, Thema 4)

Gilt für die Auftragsart Textil, nur für Motive mit Verfahren Flex oder Flock [M]. DTF, Stick, Namen-Bögen und das Textil selbst werden nicht kalkuliert [M]. Spezifikation: `SPEZ_03_Textil.md` §9–§10. Zahlenwerte vorläufig, Kalibrierung Thema 6.

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
2. Kalibrierung der Plott-Werte für Flex/Flock und der Pressminute über dokumentierte Textilaufträge (Thema 6).
