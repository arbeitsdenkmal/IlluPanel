# Start: Werkzeug „Alex Brandschutzordnungen“ (eigenes Projekt)

Stand 31.10.2026. Ausgelagert aus dem Projekt „Illustrator Panel“ (Register 4.3). Dieses Dokument ist der Einstieg für einen neuen Chat; es enthält alles, was dort bekannt ist.

## Aufgabe

Alex (ein befreundeter Kunde) schickt in unregelmäßigen Abständen 10–12 PDF-Dateien „Brandschutzordnung“ (A4 hoch, jeweils 3 Seiten). Für den Druck ist **nur die letzte Seite** jeder Datei relevant; Alex kann aus seinem Programm nicht einseitig exportieren. Je Datei wird immer dasselbe gemacht und anschließend in der von Alex gewünschten Stückzahl gedruckt. Es wird nichts gespeichert, nichts kalkuliert, nichts abgerechnet.

Gewünschtes Ergebnis je Datei: die letzte Seite proportional auf **190 mm Breite** skaliert, **mittig** auf einer A4-Seite, dahinter eine **rote Fläche 210 × 297 mm** — im Rotton des Randes der Originalseite. Zwischen Alex’ Seite und der roten Fläche darf kein Übergang sichtbar sein. Der Rotton variiert von Lieferung zu Lieferung (Ursache bei Alex, wird nicht verfolgt), deshalb muss er aus der Datei gelesen werden, nicht fest hinterlegt.

## Befund aus den Musterdateien

Zwei Muster liegen neben dieser Datei: `Brandschutzordnung-Berching.pdf`, `Brandschutzordnung-Eichstätt.pdf`.

- 3 Seiten, A4 (594,96 × 841,92 pt), MediaBox = TrimBox, kein Anschnitt.
- Seite 3 ist die Druckseite: weiße Fläche mit Text und Piktogrammen (Bilder eingebettet), außen eine **rote Vektorkontur bis an die Seitenkante** (im Content-Stream als Rechteck mit Stroke, Farbe `0.8902 0.0235 0.0745 rg` = RGB 227/6/19 in beiden Mustern).
- Weitere Farben auf der Seite: Weiß, Schwarz, Dunkelgrau 0.1294/0.1451/0.1608. Eine Schrift (Montserrat) ist eingebettet.

## Bisheriger Weg (Illustrator-Skript, fehlerhaft, wird nicht weiterverfolgt)

`04-Alex Brandschutzordnungen.jsx`: PDF in Illustrator öffnen, je Zeichenfläche alles mit einer Maske 209,5 × 296,5 mm gruppieren, auf 190 mm skalieren, zentrieren, rote Fläche C0/M93/Y86/K0 dahinter. Fehler: die rote Fläche entstand im Vordergrund, der Rotton war fest. Die Maske ist nicht mehr gewünscht.

## Vorschlag für den Neubau (noch nicht entschieden)

Ein Werkzeug außerhalb von Illustrator, das einen Ordner mit PDFs in einem Durchgang verarbeitet:

1. Je Datei die letzte Seite nehmen.
2. Rotton aus der Randkontur der Seite lesen (Farbe des gestrichenen Rechtecks, das die Seitenkante berührt).
3. Neue A4-Seite: rote Fläche vollflächig in diesem Ton, darüber die Originalseite als Form-XObject auf 190 mm Breite skaliert und mittig gesetzt.
4. Ausgabe: je Datei eine druckfertige einseitige PDF; optional eine Sammel-PDF, in der jede Seite so oft enthalten ist, wie sie gedruckt werden soll (dann geht der Druck in einem Rutsch).

Technisch machbar mit einer PDF-Bibliothek (z. B. pikepdf/pypdf in Python oder pdf-lib in Node); Vektoren und Schriften bleiben erhalten, nichts wird gerastert. Die Farbe steht in der PDF als RGB; bei der Übernahme in die rote Fläche denselben Farbraum verwenden, damit beide Rottöne identisch ausgegeben werden.

## Offene Fragen für den neuen Chat

1. Auf welchem Rechner und wie soll das Werkzeug gestartet werden (Ordner-Drop, Terminal, Automator/Kurzbefehl)?
2. Woher kommt die Stückzahl je Datei (E-Mail von Alex, Dateiname, manuelle Eingabe)?
3. Soll das Werkzeug direkt drucken oder nur die PDFs erzeugen?
4. Was passiert mit Dateien, bei denen keine rote Randkontur gefunden wird (Abbruch mit Meldung, Vorgabefarbe, Rückfrage)?
