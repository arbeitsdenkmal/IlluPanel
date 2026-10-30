# Übergabe an das neue Projekt

Stand 29.10.2026. Herkunft: Claude-Projekt „Illustrator Panel“ (Illustrator Panels, Stand Stufe 45).

Kennzeichnung: **[M]** = Entscheidung oder Angabe Markus · **[B]** = Entscheidung Markus mit Brian · **[E]** = Empfehlung bzw. Einschätzung Claude, nicht ausdrücklich entschieden.

## 1. Worum es geht

Aus dem Entwurf in Illustrator Kalkulation und Produktionsdaten erzeugen und bei jedem Auftrag abrechenbare Zeit erfassen. Das System wird mit Supabase als Basis neu gedacht. Das bisherige Panel ist Referenz für den Funktionsumfang (`Funktionsbaum.html`), nicht für den technischen Aufbau.

## 2. Grundsatzentscheidungen

- **Supabase ist die gemeinsame Basis** von App und Illustrator-Werkzeug. Alle Daten der App, auch Folienpreise und Stundensätze, liegen dort; das Illustrator-Werkzeug liest dort und meldet dorthin zurück. [B, 29.10.2026]
- **Kein Parkplatz** („Push to Illustrator“ / „Catch from App“): Die Produkte liegen ohnehin in Supabase. [B]
- **Produkt als Stückliste:** Jedes zugeordnete Objekt ist eine Position in Supabase (Folie bzw. Medium, Laminat, Attribute, Fläche, Schnittlänge, Teile, Umriss). Die .ai ist die Zeichnung dazu. App, Produktion und Nachkalkulation sehen dieselbe Stückliste. [M]
- **Eine Rechenmaschine:** genau eine Preisfunktion für alle Auftragsarten, die Illustrator-Werkzeug und App gleich nutzen. Der Bediener sieht und bestätigt den Preis weiter in Illustrator. [M]
- **Versionierte Preise:** Preislisten mit „gültig ab“; jede Kalkulation wird mit ihrem Preislistenstand gespeichert. [M]
- **Live statt Abruf:** Illustrator-Werkzeug und App hängen per Realtime an denselben Daten. [M]
- **Produktionsdaten außerhalb von Illustrator, mit Zwischenschritt:** Illustrator liefert je Objekt eine bereinigte Geometrie; ein Produktionsdienst übernimmt Nesting, OPOS-Marken und Bogenaufbau, erzeugt PDF/X-4 und legt die Bögen in den Hotfolder des RIP. [M]
- **Auftragsübergreifendes Nesting** (Sammelbögen aus allen offenen Produkten je Folie bzw. Medium): von Markus als „nett“ eingestuft, nicht Kern. [M]

## 3. Bewusst nicht

- Status je Druck- bzw. Plottbogen (Laufzettel, Scan): unnötig. [M]
- Kundenfreigabe online: kann die App bereits. [M]
- Offline-Kopie der Datenbank auf dem Laptop: nicht gewollt. [M]
- Selbstkalibrierung aus Ist-Zeiten: entfällt. Stattdessen **halbjährliche Kalibrierungsrunden**: Markus liefert 10–20 Musterdateien mit Zeiten je Verarbeitungsschritt, Claude wertet aus, die Werte werden bei Bedarf nachjustiert. [M]
- Die Preiswerte in `PREISLOGIK.md`, `PREISLOGIK_Schild.md` und `Stammdaten/preisliste.csv` sind vorläufig, noch nicht justiert. [M]

## 4. Einschätzungen aus dem Gespräch [E]

- Basis in Illustrator: CEP. UXP ist für Illustrator weiterhin nicht für eigene Plug-ins freigegeben (Illustrator nutzt UXP nur intern für Adobes eigene Bedienfelder). Das Werkzeug in Illustrator als dünner Client: wenig ExtendScript, keine Geschäftslogik, keine Konfiguration außer dem Illustrator-Spezifischen.
- Schwere PDF-Verarbeitung des Produktionsdienstes läuft nicht in Supabase selbst, sondern auf einem eigenen Rechner als Dienst.
- Das Datenmodell teilen sich Illustrator-Werkzeug und App; es muss mit Brian festgelegt werden, bevor gebaut wird.
- Bindeglied zwischen Datei und Daten ist die Produkt-ID der App in der Arbeitsdatei; eine Schnellauskunft ohne App-Produkt wird später zugeordnet.
- Vibecoding: Stückliste, Rechenmaschine, versionierte Preise und Realtime gut machbar; der Produktionsdienst ist der schwerste Teil (Sonderfälle in Kundendateien, Fehler kosten Material).

## 5. Fachliche Vorgaben aus dem bisherigen Projekt

Gelten weiter, soweit Abschnitt 2 und 3 nichts anderes sagen. Produktionsregeln im Einzelnen: `PRODUKTIONSREGELN.md`.

**Preise**
- In Illustrator kalkuliert werden Fahrzeugbeschriftung und Beschriftung. Schilder berechnet die App (`PREISLOGIK_Schild.md`), alle übrigen Preise entstehen in der App. [M]
- Der Bediener sieht optimalen VK und Mindest-VK, bestätigt den Vorschlag oder senkt ihn höchstens bis zum Mindest-VK und entscheidet mit oder ohne Montage. Die App bekommt genau einen Preis (Pauschale, ggf. inkl. Montage), keine Einzelelemente. [M]
- Ein neu berechneter Preis ersetzt den alten in der App nur nach ausdrücklicher Auswahl. Der Preis muss auch nach Auftragsannahme übernehmbar sein. [M]
- Die App ergänzt Nebenkosten (Anfahrt, Entschriften, Hebebühne, Übernachtung …). [M]
- Ein Preis je Folienserie, keine Einträge je Farbe. Laminat ist reine Produktionsinfo ohne eigenen Preis. [M]
- Grafikzeit: automatische Messung plus Feld für manuelle Minuten, keine Stoppuhr. Grafik wird nur dokumentiert, nicht im Preis. Grafikminuten je Produkt, sie gehören dem angemeldeten Mitarbeiter. An Arbeitszeiten gehen nur Grafikminuten an die App. [M]
- Kein Materialbedarf an die App; Folienbestand steht ganz unten auf der Liste. [M]

**Aufträge und Dateien**
- Aufträge entstehen in der Regel zuerst in der App; eine Schnellauskunft in Illustrator ohne App-Auftrag kommt vor (z. B. Preis einer Plottschrift). [M]
- Dateien bleiben auf dem Netzlaufwerk (SMB) bzw. lokal; Supabase bekommt nur den Ablageort. Dateitransport über Supabase/HTTPS ist verworfen. [M]
- Server-Ablage beim Export: Der Dialog öffnet nur `/A-Z/<Buchstabe>`; den Kundenordner wählt bzw. legt der Mensch an (Schreibweisen der Kundennamen weichen ab); das Werkzeug legt `JJJJ-MM-TT_Produkt` an. Textil-DTF: zusätzlich nur die Produktions-PDFs in einen Sammelordner für die Bestellung, den Markus nach dem Bestellen leert. [M]
- Markus arbeitet rund 70 % am Laptop über VPN; Speichern aufs Netzlaufwerk ist dort unzuverlässig. Ohne Serververbindung bleiben die Dateien lokal, er verschiebt sie und verknüpft den Ort selbst in der App. [M]
- Der Export der Produktionsdaten setzt das Produkt in der App auf „production“. [M]
- Exporte aus Nutzen, Gitter und MB-Nr werden einem App-Produkt zugeordnet. [M]
- An bestehenden Dateien wird nie etwas verändert oder verschoben; Quelldateien werden nur kopiert. Aus einer Arbeitsdatei muss ein neuer Auftrag entstehen können. [M]

**Textil**
- Textilmodelle mit Farbwerten liegen in der App; ein Auftrag liefert Textilien, CMYK-Werte der Textilfarben und den Größenlauf. Die App bekommt eine Textil-Bestandsverwaltung. [M]
- Ziel: Auftrag öffnen → MockUps geladen, Textilfarben eingefärbt, Mengen eingetragen; dann nur noch gestalten, zuordnen, exportieren. [M]
- In jedem MockUp stehen die Textilfarben als CMYK-Farbfelder mit dem Farbnamen daneben. [M]

**Umgebung**
- Rechner mit Illustrator: Markus' MacBook und MacMini, MKs PC (Windows). An keinem ist ein Plotter angeschlossen. [M]
- Die App gibt es bisher nur für Windows, eine Mac-Variante kommt. Brian hat keinen Mac und kein Apple-Developer-Konto. [M]
- OPOS: eigene Marken (Regel in `OPOS_ANALYSE.md`), Schneidtest am Summa S3 steht aus; Rückfall von Hand über Datei → Summa GoSign. XY2 statt XY ab 1000 mm Bogenlänge, XY2 mit Druckrichtungsmarkierung. OPOS-Barcode erst mit dem neuen ONYX-RIP. [M]
- Claude bekommt keine echten API-Schlüssel der Produktivsysteme; Tests durch Claude nur über separate Testaccounts. [M]

## 6. Arbeitsregeln (Markus)

- Erst klären, dann bauen. Offene Fragen gesammelt stellen, eine Frage pro Punkt, keine Fragen, deren Antwort sich aus einer anderen ergibt.
- Struktur, Gestaltung und Methodik schlägt Claude selbst vor; Markus nur nach Fakten aus dem Betrieb fragen.
- Keine Annahmen, keine eigenen Festlegungen. Eigene Ableitungen kennzeichnen, nicht stillschweigend einbauen.
- Keine Namen oder Anzeigetexte erfinden (Folien heißen nur 3551, 3162, 651 usw., ohne Hersteller- oder Zusatztext).
- Oberfläche: Fehler als Popup, Erfolgsmeldungen gar nicht; Farben im Illustrator-Standard, Orange nur für ausdrücklich festgelegte Buttons; keine ungefragten Info- oder Hinweiszeilen, keine Badges.
- UI-Umbauten: vor dem Bau MockUps vorlegen, gebaut aus den echten Inhalten; nichts erfinden, nichts zum „Mitprüfen“.
- Tests schlank: nur, was für die Änderung wirklich nötig ist; keine neuen oder umgebauten Tests ungefragt; nicht mehr Zeit in Tests als in die Arbeit.
- Aufträge an Claude Code nur, wenn Markus es ausdrücklich sagt. Sauberes Ergebnis vor schnellem.

## 7. Inhalt dieses Ordners

| Datei | Inhalt |
|---|---|
| `UEBERGABE.md` | diese Datei |
| `PRODUKTIONSREGELN.md` | fachliche Regeln für Schneide- und Druckdaten, Nutzen, Gitter, MB-Nr, Auftragsarten, Export (Stand Stufe 45) |
| `PREISLOGIK.md` | Preislogik Fahrzeugbeschriftung und Beschriftung, Version 6 (vorläufige Werte) |
| `PREISLOGIK_Schild.md` | Preislogik Schild, Version 1 (vorläufige Werte) |
| `SPEZIFIKATION_Textil.md` | Textil-Spezifikation vom 19.10.2026; §5 und §8 sind überholt (Zuordnen heute im Fenster „Motiv“ mit Positionen am Shirt, Begriff „Druckgröße“) |
| `OPOS_ANALYSE.md` | Untersuchung der Summa-OPOS-Marken XY/XY2, Grundlage der eigenen Marken |
| `Funktionsbaum.html` | alle Funktionen des bisherigen Panels: Buttons, Fenster, Einstellungen, Ergebnisse, Datenquellen |
| `Stammdaten/` | heutige Konfiguration als Ausgangsdaten für Supabase: `preisliste.csv`, `medien.json` (Rollenbreiten, OPOS-Werte), `serien.json` (Oracal-Bibliothek → Serie), `produkte.csv` (Offset), `textil.json`, `textil_stufen.csv`, `textil_modelle.csv`, `textil_farben.csv`, `auftragsarten/*.json` (Ebenen, Maßstab, Werkzeuge, Export-Presets) |

Nicht kopiert (Illustrator-Dateien, bleiben im Projektordner `~/tools/folienkalkulation/config/`): `mockups/` (Textil-MockUps), `vorlagen/` (Offset, Schild, UV-Schild, Etikett, Bögl Nummern Masterdatei), `farbfelder/*.ase` (Oracal-Bibliotheken).
