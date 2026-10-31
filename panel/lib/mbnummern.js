/* MB-Nummern (SPEZ_03_Nutzen §7): Planung aus dem alten Projekt (panel/lib/mbnummern.js, Stufe 24/25 = 03-MB Nummern.jsx v1.3, Zeilen 294–359 und
 * 362–386: blockHoehe, bildeBloecke, höchste Blöcke zuerst, Blöcke je Zeile, Nutzenmaß) mit den Konstanten aus config/nutzen.json „mb“. Geändert (§7.2):
 * nutzbar = Rollenbreite − 2 × kantenhalter_mm − OPOS-Rand; über die Längengrenze hinaus weitere Bögen (Zeilen werden verteilt, eine Zeile nie geteilt);
 * auftrag.txt als Pfad (Bögl-Kundenordner); leseAuftrag mit fs, Logik gleich. Sortierungen mit dem ursprünglichen Index als zweitem Schlüssel. */
"use strict";
const fs = require("fs");
const A = require("./ablage");

function r1(x) { return Math.round(x * 10) / 10; }

// auftrag.txt, eine Zeile je Nummer:   nummer3=20 (nr 1 … nummern)
function leseAuftragText(text, nummern) {
    var vorgabe = {};
    var zeilen = String(text).split(/\r\n|\r|\n/);
    for (var i = 0; i < zeilen.length; i++) {
        var z = String(zeilen[i]);
        var p = z.indexOf("=");
        if (p < 1) continue;
        var schluessel = z.substring(0, p).replace(/\s/g, "").toLowerCase();
        if (schluessel.indexOf("nummer") !== 0) continue;
        var nr = parseInt(schluessel.substring(6), 10);
        var wert = parseInt(String(z.substring(p + 1)).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(nr) && nr >= 1 && nr <= nummern && !isNaN(wert) && wert >= 0) {
            vorgabe[nr] = wert;
        }
    }
    return vorgabe;
}
/** auftrag.txt im Bögl-Kundenordner; nicht erreichbar (ms), fehlend oder unlesbar -> {} (Felder 0) */
async function leseAuftrag(datei, nummern, ms) {
    if (!(await A.erreichbar(datei, ms))) return {};
    try { return leseAuftragText(fs.readFileSync(datei, "utf8"), nummern); } catch (_) { return {}; }
}

// Felder lesen wie btOk.onClick des Skripts (nur Ziffern, sonst 0) -> { mengen, summe }; auch für das Ergebnis beim Tippen (SPEZ_03_Oberflaeche §12.3)
function mengenLesen(felder, nummern) {
    var mengen = {}, summe = 0;
    for (var nr = 1; nr <= nummern; nr++) {
        var t = String(felder[nr]).replace(/[^0-9]/g, "");
        var n = parseInt(t, 10);
        if (isNaN(n) || n < 0) n = 0;
        mengen[nr] = n;
        summe += n;
    }
    return { mengen: mengen, summe: summe };
}
// Dialog „Aufbauen“ (btOk.onClick des Skripts, gleiche Prüfungen und Texte) -> { fehler } | { mengen }; vorlage absolut, vorlageRel wie in nutzen.json
function mengenPruefen(vorlage, vorlageRel, felder, nummern) {
    if (!vorlage || !fs.existsSync(vorlage)) return { fehler: "Vorlage fehlt: " + vorlageRel };
    var m = mengenLesen(felder, nummern);
    if (m.summe === 0) return { fehler: "Keine Stückzahl eingetragen." };
    return { mengen: m.mengen };
}

/**
 * Planung. mb: nutzen.json „mb“; u: { nutzbar (Rollenbreite − 2 × kantenhalter_mm − OPOS-Rand), max_hoehe (druck.max_laenge_mm − OPOS-Rand) }.
 * -> { bloecke, zeilen, boegen: [{ zeilen, nutzenB, nutzenH }], proZeile, nutzbar, blockHoehe } | { fehler }
 */
function planung(mengen, mb, u) {
    var OBJ = mb.schild_mm, ABSTAND = mb.abstand_mm, TEILUNG = OBJ + ABSTAND, SPALTEN = mb.spalten;
    var BLOCK_B = SPALTEN * TEILUNG - ABSTAND, BLOCK_ABSTAND = mb.block_abstand_mm;
    // ---------- 03-MB Nummern.jsx, Zeilen 294–359 ----------
    function blockHoehe(block) {
        // Zwei Nummern in einem Block sitzen oben und unten buendig im
        // vollen 5-Reihen-Raster - die Leerreihen liegen dazwischen.
        // Dadurch haben alle gemischten Bloecke dieselbe Hoehe und die
        // Schnittlinien laufen durch.
        if (block.length > 1) return SPALTEN * TEILUNG - ABSTAND;
        return block[0].reihen * TEILUNG - ABSTAND;
    }

    function bildeBloecke(mengen) {
        var reihen = {};
        for (var nr = 1; nr <= mb.nummern; nr++) {
            if (mengen[nr] > 0) reihen[nr] = Math.ceil(mengen[nr] / SPALTEN);
        }

        function offenGroesste(ausser, maxwert) {
            var best = null;
            for (var k in reihen) {
                if (!reihen.hasOwnProperty(k)) continue;
                if (reihen[k] <= 0) continue;
                if (String(k) === String(ausser)) continue;
                if (maxwert > 0 && reihen[k] > maxwert) continue;
                if (best === null || reihen[k] > reihen[best]) best = k;
            }
            return best;
        }
        function irgendwasOffen() {
            for (var k in reihen) {
                if (reihen.hasOwnProperty(k) && reihen[k] > 0) return true;
            }
            return false;
        }

        var bloecke = [];
        while (irgendwasOffen()) {
            var n = offenGroesste(null, 0);
            if (n === null) break;

            if (reihen[n] >= SPALTEN) {
                bloecke.push([{ nr: n, reihen: SPALTEN }]);
                reihen[n] -= SPALTEN;
                continue;
            }

            var a = reihen[n];
            reihen[n] = 0;
            var platz = SPALTEN - 1 - a;

            var zweite = null;
            if (platz > 0) {
                zweite = offenGroesste(n, platz);
                if (zweite === null) zweite = offenGroesste(n, 0);
            }

            if (zweite !== null) {
                var b = reihen[zweite];
                if (b > platz) b = platz;
                reihen[zweite] -= b;
                bloecke.push([{ nr: n, reihen: a }, { nr: zweite, reihen: b }]);
            } else {
                bloecke.push([{ nr: n, reihen: a }]);
            }
        }
        return bloecke;
    }

    // ---------- Zeile 360–361 ----------
    var bloecke = bildeBloecke(mengen);
    if (bloecke.length === 0) return { fehler: "Nichts zu bauen." };
    // ---------- Zeilen 362–386 ----------

    // hoechste Bloecke zuerst, damit in einer Zeile aehnliche zusammenstehen
    // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
    for (var bIdx = 0; bIdx < bloecke.length; bIdx++) bloecke[bIdx].idx = bIdx;
    bloecke.sort(function (x, y) { var dh = blockHoehe(y) - blockHoehe(x); return (dh !== 0) ? dh : x.idx - y.idx; });

    var nutzbar = u.nutzbar;
    var proZeile = Math.floor((nutzbar + BLOCK_ABSTAND) / (BLOCK_B + BLOCK_ABSTAND));
    if (proZeile < 1) proZeile = 1;

    var zeilen = [];
    for (var bi = 0; bi < bloecke.length; bi += proZeile) {
        zeilen.push(bloecke.slice(bi, bi + proZeile));
    }
    // ---------- Ende der übernommenen Zeilen ----------

    // Zeilen auf Bögen verteilen (§7.2): eine Zeile nie geteilt; Nutzenmaß je Bogen wie im Skript
    var zeilenH = function (z) { var m = 0; for (var i = 0; i < z.length; i++) m = Math.max(m, blockHoehe(z[i])); return m; };
    var boegen = [], akt = null;
    for (var zi = 0; zi < zeilen.length; zi++) {
        var h = zeilenH(zeilen[zi]);
        if (akt && akt.nutzenH + BLOCK_ABSTAND + h > u.max_hoehe + 0.01) akt = null;
        if (!akt) { akt = { zeilen: [], nutzenH: -BLOCK_ABSTAND, nutzenB: 0 }; boegen.push(akt); }
        akt.zeilen.push(zeilen[zi]);
        akt.nutzenH += BLOCK_ABSTAND + h;
        akt.nutzenB = Math.max(akt.nutzenB, zeilen[zi].length * (BLOCK_B + BLOCK_ABSTAND) - BLOCK_ABSTAND);
    }
    return { bloecke: bloecke, zeilen: zeilen, boegen: boegen, proZeile: proZeile, nutzbar: nutzbar, blockHoehe: blockHoehe,
        teilung: TEILUNG, blockB: BLOCK_B, blockAbstand: BLOCK_ABSTAND };
}

/**
 * Schilder eines Bogens (Kernformat ohne OPOS-Rand): je Schild { nr, x_mm, y_mm } als linke obere Ecke relativ zum Nutzen; erste Nummer eines Blocks oben
 * bündig, zweite unten bündig (wie der Aufbau im Skript).
 */
function schilder(pl, bogen, mb) {
    var r = [], y = 0, SP = mb.spalten, T = pl.teilung;
    for (var z = 0; z < bogen.zeilen.length; z++) {
        var zeile = bogen.zeilen[z], zh = 0, x = 0;
        for (var b = 0; b < zeile.length; b++) {
            var block = zeile[b];
            for (var t = 0; t < block.length; t++) {
                var teil = block[t], start = (t === 0) ? 0 : (SP - teil.reihen);
                for (var rr = 0; rr < teil.reihen; rr++) for (var cc = 0; cc < SP; cc++) r.push({ nr: Number(teil.nr), x_mm: x + cc * T, y_mm: y + (start + rr) * T });
            }
            zh = Math.max(zh, pl.blockHoehe(block));
            x += pl.blockB + pl.blockAbstand;
        }
        y += zh + pl.blockAbstand;
    }
    return r;
}

module.exports = { r1, leseAuftragText, leseAuftrag, mengenLesen, mengenPruefen, planung, schilder };
