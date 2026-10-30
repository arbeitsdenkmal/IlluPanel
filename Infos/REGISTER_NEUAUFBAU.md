# Entscheidungsregister Neuaufbau Illustrator Panels

Stand: 30.10.2026 (Kopie des Projektdokuments `claude/REGISTER_NEUAUFBAU.md`). Dieses Register ersetzt für die Neuplanung alle älteren Stände; bei Widerspruch zu anderen Dokumenten gilt das Register.

**Nachtrag 30.10. abends — Brians SDK-Entscheidung:** Alles, was die Datenbank berührt, baut Brian als importierbare, dokumentierte Bibliotheken (SDK). Das Panel nutzt ausschließlich diese Bibliotheken; CC baut keine eigenen Datenbankwege. Projektordner heißt `~/tools/Illustrator Panel` (7.3). `SPEZ_01_Fundament.md` ist die Spezifikation der ersten Baustufe; ihr Umfang berührt Supabase nicht.

Legende: **MIT** = wird übernommen · **WEG** = entfällt · **ENTSCHIEDEN** = in der Neuplanung festgelegt

## 1. Preislogik

| Nr | Punkt | Status |
|---|---|---|
| 1.1 | Zwei Preise „nur Aufkleber“ / „inkl. Montage“, je netto und brutto | MIT |
| 1.2 | VK aus Minuten × `stundensatz.vk` (155 €/h); Mindest-VK mit `stundensatz.produktion` (84 €/h) | MIT |
| 1.3 | Preis bestätigen / bis Mindest-VK senken im Panel | **WEG** — Panel hinterlegt beide Preise in Supabase, finale Preisentscheidung in der App |
| 1.4 | Material = Stückfläche (Endmaß) × `vk_m2`; `vk_m2` = `ek_m2` × 1,9; Nesting-Verbrauch nur für EK | MIT |
| 1.5 | Ein Preis je Folienserie, keine Einträge je Farbe | MIT |
| 1.6 | Laminat reine Produktionsinfo, kein Preis | MIT |
| 1.7 | Zeitschlüssel je Verfahren (ruesten, datei_cut, tape_m2, produktion_m2 Plott 0, schnitt_m 0,12, trennen, stueck 5, montage_m2 0,8, reinigen_m2 1,65, montage_teil, datei_rip, auftrag_montage 2) | MIT |
| 1.8 | Sicke 50 %, Wölbung 36 min/m²; Komplexität K0–K3 manuell auf Produktionszeit | MIT — Komplexität ist Tag am Objekt und wirkt auf dessen Produktionszeit. Sichtbar und setzbar nur, wo tatsächlich geschnitten wird: Plott immer, Druck nur mit Cutkontur, Textil Flex/Flock ja; reiner Druck ohne Cut, UV, Laser nie |
| 1.9 | Tape-Vorschlag ab 40 m Schnitt/m² bzw. 50 Teile/m², Material über `tape_vk_m2` | MIT |
| 1.10 | Mindestbeträge Produkt 35 €, Montage 30 €, ohne Grafik | MIT |
| 1.11 | Nettopreise je einzeln auf 5 € aufgerundet | MIT |
| 1.12 | Grafikzeit automatisch + manuelle Minuten, nur dokumentiert, nicht eingerechnet | MIT — Dokumentation über Supabase |
| 1.13 | Schildkalkulation im Panel | **WEG** — Schildlogik liegt bei Brian/App |
| 1.14 | MwSt 19 % aus der Preisquelle | MIT — Brutto auf Cent gerundet, nicht auf 5 € |
| 1.15 | Zahlenwerte vorläufig; Kalibrierung über 10–20 dokumentierte Jobs, danach halbjährliche Runden | MIT |

## 2. Auftragsarten und Anlegen

| Nr | Punkt | Status |
|---|---|---|
| 2.1 | Auftragsarten | **ENTSCHIEDEN:** nach außen getrennt (keine Mischfälle je Datei). Intern gemeinsame Basis: Auftragsart = Konfiguration (Ebenen-Satz, Maßstab, Zeichenflächen-Regel, Kalkulation an/aus, Exportprofil) auf gemeinsamem Gerüst mit gemeinsamem PDF-Exportkern. Acht Arten (inkl. Banner/Roll-up). Die Auftragsart gibt die App vor (department/type über Mapping); nur „ohne Auftrag“ wählt die Art manuell |
| 2.2 | Nur Fahrzeugbeschriftung und Beschriftung kalkuliert | MIT — erweitert: zusätzlich Textil Flex/Flock nach Aufwand (Preislogik-Erweiterung offen) |
| 2.3 | Anlegen-Dialog | **ENTSCHIEDEN:** ein modales Fenster, zwei Schritte. 1) Auftrag: Liste offener Produkte aus Supabase mit Kundensuche; daneben „ohne Auftrag“ mit manueller Artwahl. 2) Quelle: geöffnete Datei (Duplikat, Original bleibt unverändert offen), Datei öffnen (nur Kopie) oder leer. Panel erzeugt Arbeitsdatei mit Ebenen-Gerüst und Maßstab, schreibt Auftrags-/Produkt-ID ins XMP, Quellinhalt auf die Sandbox. Quelldatei nur kopieren, nie verändern. Details Stufe 1: SPEZ_01 §8 |
| 2.4 | Geöffnete Quelle bleibt unverändert offen (Duplikat) | MIT |
| 2.5 | Neuer Auftrag aus Arbeitsdatei möglich | MIT — gleiche Auftragsart → Inhalte in die gleichnamigen Ebenen, alles andere → Sandbox. Maßstab der Quelle aus deren XMP; Dateien ohne XMP: Abfrage (Standard 1:1, umschaltbar 1:30). Bei Wechsel 1:30 ↔ 1:1 skaliert das Panel automatisch, Ergebnis immer auf die Sandbox |
| 2.6 | Fahrzeugbeschriftung: CC-Vision-Vorlage per Häkchen, Ebenen Sandbox/Fahrzeugkontur/Plott/Digitaldruck, 1:30 | MIT als Konfiguration |
| 2.7 | Beschriftung: Sandbox/Cut/Print/Foto, 1:1 | MIT als Konfiguration |
| 2.8 | Schild: Folie/UV-Vorlagen, Material je Zeichenfläche, Bohrungen | MIT als Konfiguration; Komplexität nur bei Cutanteil |
| 2.9 | Offset-Daten | **ENTSCHIEDEN:** je Offset-Produkt eine Vorlage; Panel wählt sie über das App-Produkt; Format, Anschnitt, Hilfslinien aus der Vorlage. Export Preset „wmd“ |
| 2.10 | Lasergravur / Sonstiges | Lasergravur fix 600 × 300; Sonstiges mit Maßabfrage (Größe und Anzahl Zeichenflächen); beide schreiben PDFs über den gemeinsamen Exportkern |
| 2.11 | Textil-MockUp-Workflow | Manueller Weg nur noch Notweg — Marke, Modell, Textilfarbe, ID in der Regel aus Supabase. Aktueller Textil-Dialog MIT |
| 2.12 | Grafikzeit bei allen Auftragsarten | MIT — mit Auftrag direkt nach Supabase; ohne Auftrag ins XMP der .ai; bei späterer Zuordnung überträgt das Panel und markiert im XMP als übertragen |
| 2.13 | Datenspeicher XMP + `IP_*`-Tags | **ENTSCHIEDEN:** Dokumentebene eigener XMP-Namespace mit JSON-Block; Objektebene Illustrator-Tags `IP_*`. Schema: SPEZ_01 §5 |

## 3. Plott, Digitaldruck, Export

| Nr | Punkt | Status |
|---|---|---|
| 3.1 | Cutkontur-Regel (Vollton C0 M100 Y0 K0, Name egal, Vereinheitlichung auf „Cutkontur“, Kundendateien unberührt) | MIT |
| 3.2 | Plott-Farberkennung über Oracal-ASE am Farbfeldnamen, Schlüssel Serie-Farbnummer | MIT |
| 3.3 | Plott-Nesting (MaxRects, 90°, 20 mm Abstand, 10 mm Rand, PDF/X-4 je Farbe/Bogen) | MIT — neu: Höhe max. Rollenbreite − 25; Textil-Flex max. 1500 mm Länge |
| 3.4 | Digitaldruck-Workflow | Exportdateien MIT — Aufbau: Stückzahl statt Kopien (`IP_Anzahl`); Arbeitsdatei hält nur das Original, Kopien entstehen auf dem Druckbogen als Symbol-Instanzen und in der Kalkulation als Multiplikator |
| 3.5 | Automatischer Beschnitt | bleibt verworfen |
| 3.6 | Eigene OPOS-Marken (XY; XY2 mit Druckrichtungsdreieck ab 100 cm); Rückfall Datei → Summa GoSign | MIT |
| 3.7 | Druck-Maße (Reserve 10, Anschnitt 3, OPOS-Zugabe 24,353, Markenrand 10, Kantenhalter 15, quer Rollenbreite − 30, Länge 2500/5700, Rollenwahl 10-%-Schwelle) | MIT |
| 3.8 | Messung an Cutkontur, sonst Motivumriss; Tape-Vorschlag daran | MIT |
| 3.9 | Nutzen, Gitter, MB-Nr als Panel-Funktionen auf gemeinsamem Kern | MIT — Detailprüfung bei der Spezifikation |
| 3.10 | OPOS-Barcode-Workflow zurückgestellt bis neues ONYX-RIP | MIT |

## 4. Oberfläche und Bedienung

| Nr | Punkt | Status |
|---|---|---|
| 4.1 | Ein Panel | Name „PAM-Werkzeuge“ |
| 4.2 | Panel klein und kompakt, Rest in Pop-ups | MIT |
| 4.3 | Skript-Buttons | Breite und Masken werden Panel-Funktionen; Logo, VK-CC, Alex bleiben Skript-Buttons per `$.evalFile` |
| 4.4 | Meldungsregeln (Fehler als Popup, keine Erfolgsmeldungen, Illustrator-Farben, Orange nur festgelegte Buttons, nur vorgegebene Texte) | MIT als Grundprinzip |
| 4.5 | „Objekte“ und „Details“ als nicht-modale Fenster | MIT |
| 4.6 | Zuordnen-Dialog | MIT im Prinzip — Funktionsweise in der MockUp-Phase |
| 4.7 | Keine Dauerabfragen per evalScript; Aktualisierung bei Maus/Fokus/Aktion | MIT |
| 4.8 | Grafikzeit sichtbar mit Feld „+ min“ | MIT |
| 4.9 | „Auftrag anlegen“ als modales Fenster | wie 2.3 |
| 4.10 | Hell-/Dunkel folgt Illustrator | MIT |

## 5. Speicherorte und Dateiablage

| Nr | Punkt | Status |
|---|---|---|
| 5.1 | Nur-Desktop-Regel | nur noch Rückfallebene, exklusiv macOS |
| 5.2 | Server-Ablage beim Export: Dialog nur `/A-Z/<Buchstabe>`, Kundenordner wählt/legt der Mensch, Panel legt „JJJJ-MM-TT_Produkt“ an | MIT — für beide Plattformen |
| 5.3 | Textil-DTF: Produktions-PDFs zusätzlich als Duplikate in Sammelordner | MIT |
| 5.4 | Laptop ohne Serververbindung: lokal parken, manuell verschieben und in der App verknüpfen | MIT |
| 5.5 | Dateitransport per SMB | **ENTSCHIEDEN:** SMB bleibt; Export schreibt erst lokal fertig, verschiebt dann auf den Server und prüft nach (Existenz/Größe). Fehlschlag → lokal geparkt mit Meldung; Ablageort geht erst nach erfolgreichem Transfer an Supabase. Nie halbe Dateien unter Endnamen auf dem Server. Umsetzung: SPEZ_01 §7 |
| 5.6 | An App/Supabase geht nur der Ablageort, nie die Datei | MIT — Supabase lagert niemals Daten dauerhaft |
| 5.7 | Keine Überschreibungen, fortlaufende Nummern (`_02`, `_03`) | MIT |
| 5.8 | Hilfsdateien (Messprotokoll-/Grafikzeit-JSON) | **WEG** — Daten liegen in der .ai oder in Supabase |
| 5.9 | Dateinamenskonventionen (`<Kunde>_<Medium>-<Laminat>-<Breite>_NN_druck/_cut.pdf` usw.) | MIT |
| 5.10 | Einstellungen | `rechner.json` je Rechner (SPEZ_01 §4); lokale Preiskopien übernimmt Brians SDK |

## 6. Datenflüsse Panel ↔ App/Supabase

| Nr | Punkt | Status |
|---|---|---|
| 6.1 | Supabase als gemeinsame Basis | MIT — über Brians SDK (6.8) |
| 6.2 | Aufträge entstehen in der Regel zuerst in der App; Schnellauskunft ohne Auftrag kommt vor | MIT |
| 6.3 | Kein „Parkplatz“/Push to Illustrator | MIT |
| 6.4 | Alle Preise zentral in der App; komplette Preisliste versioniert in Supabase | MIT |
| 6.5 | Panel liefert beide Preise (VK + Mindest-VK, je netto/brutto, je „nur Aufkleber“/„inkl. Montage“) | MIT |
| 6.6 | Neu berechneter Preis erkennbar schreiben; App-Benutzer entscheidet | ENTSCHIEDEN |
| 6.7 | Aus Supabase kommt die komplette Preisliste | MIT |
| 6.8 | Zugriffsweg | **GEÄNDERT (Brian): alle Datenbankzugriffe über Brians SDK.** Login mit bestehenden Mitarbeiter-App-Konten; Grafikminuten gehören dem angemeldeten Benutzer. Offline: SDK hält lokale Kopien. Offen: Schreib-Warteschlange im SDK, Lauffähigkeit in CEP (Node 17, CommonJS). Tests nur gegen lokale Supabase-Instanz |
| 6.9 | Grafikminuten an die App, gehören dem angemeldeten Mitarbeiter | MIT |
| 6.10 | Materialbedarf an die App (je Folie Schlüssel, m², lfm, Rollenbreite) | MIT |
| 6.11 | Export setzt Produkt auf „production“ (außer Kundenfreigabe steht aus) | MIT |
| 6.12 | Korrekturabzug-Export startet Kundenfreigabe; Schildberechnung baut Brian | MIT |
| 6.13 | Stückliste | **WEG** — stattdessen Kalkulationsdatensatz als JSONB am Produkt |
| 6.14 | Gemeinsame versionierte Preisdatenbasis; gemeinsames JS-Rechenmodul Option bei Brian | MIT |
| 6.15 | Realtime | Teil von Brians SDK |
| 6.16 | Produktionsdaten außerhalb von Illustrator | **NEIN** — Produktionsdaten entstehen in Illustrator |
| 6.17 | Auftragsübergreifendes Nesting | ZURÜCKGESTELLT |
| 6.18 | Bewusst ohne: Status je Bogen, Online-Kundenfreigabe im Panel, Offline-Kopie der Datenbank, Selbstkalibrierung | MIT |

## 7. Plattform, Entwicklung, Betrieb

| Nr | Punkt | Status |
|---|---|---|
| 7.1 | Einsatzrechner MacBook, MacMini, MKs Windows-PC; kein Plotter angeschlossen | MIT |
| 7.2 | Windows-Weg | **ENTSCHIEDEN:** eine Codebasis im GitHub-Repo für beide Plattformen; alle Plattformunterschiede in `rechner.json` je Rechner; im übrigen Code existiert Windows/Mac nicht. MKs PC: Updates per Clone/Pull |
| 7.3 | Entwicklung im Projektordner | Projektordner `~/tools/Illustrator Panel` = Clone von `arbeitsdenkmal/IlluPanel`. Während der Entwicklung lädt Illustrator direkt aus dem Projektordner; `bereitstellen.sh` und `/Applications/interne Tools` erst am Ende |
| 7.4 | Original-Skripte tabu, nur Projektkopien änderbar; ASE und .jsx bleiben am Ort | MIT |
| 7.5 | Preisliste als Kopie je Rechner | **WEG** |
| 7.6 | CC-Vision-Vorlagen je Auftrag einzeln laden, keine Sammlung, kein Cache | ENTSCHIEDEN |
| 7.7 | Claude auf MKs PC nur für einmalige Implementierung | MIT |
| 7.8 | Doku | während der Entwicklung nur für Claude/CC im Repo — README aktueller Architektur- und Funktionsstand, CHANGELOG knapp, Testbericht minimal. Anleitungen einmalig ganz am Ende |
| 7.9 | Testregeln | so viel wie nötig, so wenig wie möglich |
| 7.10 | MockUps vor UI-Umbauten; Bereitstellung nach Prüfung durch Markus | MIT — Ausnahme Stufe 1: Anlegen „ohne Auftrag“ ohne MockUp |
| 7.11 | Altes Panel parallel | **WEG** — ab Stufe 1 lädt Illustrator nur das neue Panel |

## Mapping App-Produkttyp → Auftragsart

| App department/type | Auftragsart im Panel |
|---|---|
| LFP / VEHICLE_LETTERING | Fahrzeugbeschriftung |
| LFP / STICKER, FOIL_PLOTTER | Beschriftung |
| LFP / SIGN_UV, SIGN_FOIL | Schild |
| LFP / BANNER, ROLLUP | Banner/Roll-up: nicht kalkuliert, immer flache Druckdatei, Zeichenfläche aus den App-Maßen |
| LFP / OTHER_LFP | Sonstiges |
| LASER_ENGRAVING (alle), STAMP | Lasergravur |
| TEXTILE (alle) | Textil |
| COPYSHOP | Offset-Daten |
| OTHER | Sonstiges — Datei optional |

Das Mapping lebt im Panel (`config/mapping.json`).
