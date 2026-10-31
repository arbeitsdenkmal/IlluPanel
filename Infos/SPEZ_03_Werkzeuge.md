# Spezifikation „Werkzeuge“ — Breite, Masken, Skript-Buttons (Thema 1 der SDK-unabhängigen Reste)

Stand: 31.10.2026, gebaut (3.2.0), Festlegungen bestätigt (§8). Grundlage: Register 4.3 (geändert 31.10.), KONTEXT.md (altes Panel, `config/werkzeuge.json`), die Skripte `Infos/Skripte_alt/01-Druckbreite.jsx` und `06-releaseClippingMasks.jsx`, die Kopien in `skripte/`. Alle offenen Fragen sind mit Markus geklärt (31.10.); Alex ist kein Teil mehr (Register 4.3, offener Punkt 7).

**Oberfläche (Thema 6, 31.10.):** Platzierung, Gestaltung und Fenstergrößen regelt `claude/SPEZ_03_Oberflaeche.md`; die hier als vorläufig bezeichneten Stellen sind dort ersetzt (§16). Funktion und Texte bleiben, soweit dort nichts anderes steht.

## 1. Umfang

- **Breite** und **Masken** werden Panel-Funktionen (JSX-Kern + Panel), Verhalten wie die Skripte.
- **Logo** und **VK-CC** bleiben Skripte; die Buttons starten per `$.evalFile` die Kopien `skripte/05-Logopaket.jsx` und `skripte/04-Visitenkarten Copyshop.jsx` im Repo (liegen bereits dort, unverändert übernommen, keine Verbesserungen beauftragt). Kein Zugriff mehr auf den Skripte-Ordner von Illustrator [R 7.2: kein Plattformpfad im Code].
- **Alex** entfällt im Panel (eigenes Vorhaben außerhalb von Illustrator).
- Platzierung und Gestaltung: SPEZ_03_Oberflaeche §3 (Breite und Masken in der Werkzeugzeile, Logo und VK-CC im Flyout-Menü).

## 2. Zustände und Sichtbarkeit

Begriffe: **Fremddokument** = vorderes Dokument ohne Panel-XMP; **Panel-Datei ohne Auftrag** = Panel-XMP mit `auftrag.orderId` und `auftrag.productId` = `null` (so entsteht derzeit jede Datei aus dem Anlegen-Dialog; der Zweig mit Auftrag kommt erst in Stufe 3); **mit Auftrag** = eine der beiden IDs gesetzt; **Druckbogen vorn** = `rolle: "druckbogen"`.

| Button | kein Dokument | Fremddokument | Panel-Datei ohne Auftrag | mit Auftrag | Druckbogen vorn |
|---|---|---|---|---|---|
| Breite | gesperrt | aktiv | aktiv, außer Fahrzeugbeschriftung | gesperrt | gesperrt |
| Masken | gesperrt | aktiv | aktiv | aktiv | gesperrt |
| Logo | gesperrt | aktiv | aktiv | nur Sonstiges | gesperrt |
| VK-CC | gesperrt | aktiv | aktiv | nur Sonstiges | gesperrt |

Darstellung nach SPEZ_03_Oberflaeche §3: die Werkzeugzeile bleibt vollständig, Breite und Masken werden nur gesperrt; Logo und VK-CC sind Einträge im Flyout-Menü, gesperrt = grauer Eintrag. Die Freigabe läuft über den bestehenden Abruf (`dokumentAktualisieren`), keine eigene Abfrage [R 4.7].

## 3. Breite

Übernahme von `01-Druckbreite.jsx`, aufgeteilt in Kern und Panel.

- **Auslöser**: Button „Breite“. Vorher die übliche Grafikzeit-Übernahme wie bei jeder eigenen Aktion (SPEZ_02 §12).
- **Vorprüfung (Kern)**: ohne Dokument → `Kein Dokument geöffnet.`; ohne Auswahl → `Du hast vergessen, etwas auszuwählen! Trottel!` (Texte aus dem Skript). Beide als Fehler-Popup, kein Fenster.
- **Messen (Kern)**: sichtbares Maß der Auswahl wie `getEffectiveGeometricBounds` im Skript — Schnittmaskengruppe = Maskenpfad, Gruppen rekursiv, ausgeblendete Objekte und Ebenen ausgenommen. Liefert die aktuelle Breite in mm (zwei Nachkommastellen, Komma).
- **Fenster „Breite“** (ModalDialog `.breite`, eine Höhe, Inhalt wie MOCKUP_STUFE3_Werkzeuge.html unten): zwei Felder „Zielbreite in mm?“ (vorbelegt mit der gemessenen Breite) und „Umlaufende Zugabe in mm?“ (vorbelegt `2`), Buttons „Abbrechen“ und „OK“; Enter = OK, Esc = Abbrechen. Übergabe Panel → Fenster und zurück wie bei „Objekt“ (Datei im temporären Ordner, CSEvent).
- **Eingabe**: Parser wie `parseStrictMmNumber` (Komma als Dezimaltrennzeichen, Punkt nur als Tausender, drei Nachkommastellen gerundet). Fehlertexte aus dem Skript: `Ungültige Eingabe für Breite. Bitte eine gültige Zahl: Dezimaltrennzeichen nur Komma, Punkt nur als Tausender.`, `Ungültige Eingabe für Breite. Bitte eine Zahl > 0 angeben.`, `Ungültige Eingabe für Zugabe. …` (analog), `… Bitte eine Zahl ≥ 0 angeben.` Fehler im Fenster-Fuß wie bei „Objekt“ (OK gesperrt), nicht als Popup.
- **Ausführung (Kern)** nach OK: Auswahl gruppieren, falls mehr als ein Objekt oder keine Gruppe; proportional auf die Zielbreite skalieren (Anker Mitte des gemessenen Rechtecks, Linienbreiten und Muster mit); danach aktive Zeichenfläche = neues sichtbares Maß + Zugabe je Seite. Schlägt das Messen nach dem Skalieren oder das Setzen der Zeichenfläche fehl: Skalierung zurücknehmen, Fehler-Popup mit den Texten aus dem Skript.
- **Maßstab**: Zielbreite ist das Dokumentmaß. Da Fahrzeugbeschriftung (1:30) ausgeschlossen ist, gibt es keine Umrechnung.
- Keine Erfolgsmeldung [R 4.4]. Kein XMP-Eintrag, keine Tags.

## 4. Masken

Übernahme von `06-releaseClippingMasks.jsx` in den Kern.

- **Auslöser**: Button „Masken“, vorher Grafikzeit-Übernahme.
- **Ausführung (Kern)**: `deselectall`, dann rekursiv durch alle `pageItems` des Dokuments (rückwärts): gesperrte oder ausgeblendete Gruppen übersprungen, `clipped`-Gruppen nur gelöst, wenn ein echter Clip-Pfad (PathItem oder PathItem im CompoundPath mit `clipping`) vorhanden ist. Gesperrte Ebenen bleiben unberührt.
- **Meldungen**: ohne Dokument `Kein geöffnetes Dokument gefunden.` (Text aus dem Skript). Die Statistik am Ende entfällt [R 4.4]; Fehler während des Laufs (Ausnahmen) werden gesammelt und als ein Popup gemeldet, sonst keine Meldung.
- Gilt für das ganze Dokument, nicht nur die Auswahl (wie bisher).

## 5. Skript-Buttons Logo und VK-CC

- `config/werkzeuge.json` neu im Neubau, nur noch:

```json
{
  "skripte": [
    { "datei": "05-Logopaket.jsx", "label": "Logo" },
    { "datei": "04-Visitenkarten Copyshop.jsx", "label": "VK-CC" }
  ]
}
```

  Pfad = `<Extension>/skripte/<datei>`; Prüfung beim Start wie die übrigen Konfigurationsdateien (lesbar, `skripte[]` mit `datei` und `label`, Datei vorhanden; Fehler → Popup, Button gesperrt mit Pfad als Tooltip wie bisher).
- Start: `$.evalFile(new File(pfad))` im try/catch, Fehler als Popup `FEHLER: <message> (Zeile n)` wie im alten `main.js`. Vorher Grafikzeit-Übernahme. Danach der übliche Abruf.
- Die Skripte selbst bleiben unverändert (Logo braucht genau eine Zeichenfläche und prüft das selbst; VK-CC fragt die Variante im eigenen Dialog ab).

## 6. Panel — vorläufige Platzierung (ersetzt durch SPEZ_03_Oberflaeche §3)

Sechste Zeile unter der Werkzeugzeile (gleiche Optik `.z.wz`, Linie oben): **Breite · Masken · Logo · VK-CC**, vier gleich breite Buttons, keiner orange. Panel 320 × 168 (Inhalt 148 px), MinSize gleich; Manifest entsprechend. Alle fünf bisherigen Zeilen unverändert. Diese Zeile ist Baugerüst: sie wird in der MockUp-Runde ersetzt, es wird nichts daran gestaltet.

## 7. Repo, Doku, Tests

- Neu: `skripte/` (liegt vor), `config/werkzeuge.json`, `panel/breite.html/.js`, Manifest-Erweiterung `.breite` (ModalDialog), Kernfunktionen Messen/Skalieren/Masken im JSX-Kern. Version 3.2.0 (Ableitung Claude, Manifest numerisch).
- `Infos/Skripte_alt/` ist nur Referenz, wird nicht geladen.
- Tests [R 7.9]: `node --test tests/*.test.js`; `werkzeuge.json` nur in die bestehende Konfigurationsprüfung aufnehmen, wenn diese die Dateien einzeln prüft; sonst keine neuen Tests. Keine Illustrator-Läufe. Probe durch Markus danach.
- Doku: README (Stand), CHANGELOG (knapp), TESTBERICHT (minimal), FESTLEGUNGEN.md Abschnitt „Werkzeuge“. Kein Commit, kein Push (Auftrag nennt keinen).

## 8. Festlegungen CC — bestätigt 31.10. (FESTLEGUNGEN.md „Werkzeuge“ 1–16)

1. Messen läuft vor dem Fenster über die ungruppierte Auswahl (Vereinigung der sichtbaren Maße); nach OK wird gruppiert und wie im Skript an der Gruppe neu gemessen, bevor skaliert wird.
2. Die gemessene Breite steht im Feld wie im Skript (`fmtMm`): auf zwei Nachkommastellen gerundet, ohne Nullen am Ende (523,4 statt 523,40).
3. Der Parser übernimmt `parseStrictMmNumber` unverändert: Ergebnis auf zwei Nachkommastellen, die dritte rundet, weitere werden ignoriert.
4. Eingabefehler werden beim Tippen geprüft; der Fuß zeigt den ersten Fehler (Breite vor Zugabe), der volle Text steht im Tooltip.
5. Scheitert die Ausführung nach OK, erscheint der Fehler als Popup und das Fenster schließt; das Panel liest danach in jedem Fall neu.
6. Fenster „Breite“: ModalDialog 320 × 120, Debug-Port 8093, Übergabedatei `de.pamnm.illupanels.breite.json` im temporären Ordner, CSEvent `de.pamnm.illupanels.breiteFertig`; `gemeinsam.js` erzeugt beide Übergabedateien über dieselbe Funktion.
7. Das Fenster lädt nur `schema.json` (für den JSX-Kern), nicht die ganze Konfiguration.
8. Masken: Gruppen auf gesperrten Ebenen (auch über eine gesperrte Elternebene) werden samt Inhalt übersprungen, ohne Fehler.
9. Masken: das Popup listet die Ausnahmemeldungen, je Meldung eine Zeile, gleiche Meldungen nur einmal, ohne Überschrift.
10. Skript-Fehler: Popup mit dem Text aus dem try/catch unverändert (`FEHLER: <message> (Zeile n)`), ohne Label davor; vor dem Start die Prüfung „Skript nicht gefunden: <Pfad>“.
11. `werkzeuge.json`: Fehler der Datei selbst (fehlt, kein JSON, `skripte` fehlt, Eintrag ohne `datei`/`label`) sperren das ganze Panel wie die übrigen Konfigurationsdateien; ein fehlendes Skript erzeugt ein Popup „<Pfad> / Datei fehlt“ und sperrt nur seinen Button. Grundtexte: „Feld skripte fehlt“, „skripte[n]: datei und label nötig“.
12. Tooltip der Skript-Buttons: Dateiname ohne `.jsx`, bei fehlender Datei „Nicht gefunden: <Pfad>“.
13. Zustände: ein Dokument mit unlesbarem Panel-XMP oder unbekannter Auftragsart gilt als Fremddokument; die Rollen `nutzenbogen` und `hilfsdokument` werden wie Arbeitsdateien nach `auftrag` beurteilt.
14. Sechste Zeile: Buttons 18 px hoch statt 22 px (168 px reichen sonst nicht); alle fünf bisherigen Zeilen unverändert. Ersetzt durch SPEZ_03_Oberflaeche §3.1 (eine Zeile Breite · Masken · Nutzen, 22 px).
15. Jeder Button prüft beim Klick nach dem Neulesen die Freigabe erneut und tut nichts, wenn sie inzwischen nicht mehr gilt.
16. Version 3.2.0 in Manifest (alle Extensions) und `dokument.PANEL_VERSION`.
