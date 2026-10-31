/* Gitterscheiben (SPEZ_03_Nutzen §6): Planung aus dem alten Projekt (panel/lib/gitter.js, Stufe 24 = 03-Gitterscheiben.jsx v2.9, Zeilen 1617–1621 und
 * 1698–2001) mit den Konstanten aus config/nutzen.json „gitter“. Geändert (§6.3): Nutzbreite = gitter.zulaessig_mm − OPOS-Rand (1345 − 44,353 = 1300,647);
 * Längengrenze = druck.max_laenge_mm − OPOS-Rand; die Option „über 2,5 m“ entfällt (planeFolge(jobs, 0) und alle Kandidaten mit ueber); kein Arbeitsordner,
 * keine einstellungen.txt; Gedächtnis der Typbezeichnung im Bögl-Kundenordner (Pfad als Parameter, lesen–ändern–schreiben über Temp-Datei).
 * Jobs: { datei: { name, pfad }, anzahl, daten (gitter_leser.werteAus), typOben, typUnten }. Sortierungen mit dem ursprünglichen Index als zweitem Schlüssel. */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require("./ablage");

function r1(x) { return Math.round(x * 10) / 10; }
function r2(x) { return Math.round(x * 100) / 100; }

/**
 * Planung. g: nutzen.json „gitter“; u: { rand (OPOS-Rand gesamt), max_laenge (druck.max_laenge_mm) }; etW, etH: Cutkontur des Etiketts in der Vorlage (mm).
 * Setzt job.laenge wie der Ablauf des Skripts. -> { varianten, gap, bandHoehe, kapLaengs, nutzbreite }
 */
function planung(jobs, etW, etH, g, u) {
    var TEILUNG_ETIKETT = g.teilung_etikett_mm, TEILUNG_STREIFEN = g.teilung_streifen_mm;
    var NUTZBREITE = g.zulaessig_mm - u.rand, OPOS_RAND_H = u.rand, MAX_BAHNLAENGE = u.max_laenge - u.rand;
    var konf = { breite: NUTZBREITE, drehung: 90 };

    // ---------- 03-Gitterscheiben.jsx, Zeilen 1617–1621 ----------
    function streifenLaenge(anzahl, hatTyp, etHoehe) {
        // Das Typ-Etikett ist ein ganz normales Etikett am Streifenanfang.
        var n = anzahl + (hatTyp ? 1 : 0);
        return n * TEILUNG_ETIKETT - (TEILUNG_ETIKETT - etHoehe);
    }
    // ---------- Zeilen 1698–2001 ----------
    var GAP = TEILUNG_STREIFEN - 90;   // 20 mm, wird nach dem Messen korrigiert

    function kapLaengs() {
        var k = Math.floor((konf.breite + GAP) / TEILUNG_STREIFEN);
        return (k < 1) ? 1 : k;
    }

    function bandHoehe(band) {
        if (band.lage === "laengs") {
            var m = 0;
            for (var i = 0; i < band.streifen.length; i++) {
                if (band.streifen[i].laenge > m) m = band.streifen[i].laenge;
            }
            return m;
        }
        return band.streifen.length * TEILUNG_STREIFEN - GAP;
    }

    function bandBreite(band) {
        if (band.lage === "laengs") {
            return band.streifen.length * TEILUNG_STREIFEN - GAP;
        }
        var m = 0;
        for (var i = 0; i < band.streifen.length; i++) {
            if (band.streifen[i].laenge > m) m = band.streifen[i].laenge;
        }
        return m;
    }

    function baueLayout(streifen) {
        var kapL = kapLaengs();
        var zwang = [], kurz = [], i, j;

        for (i = 0; i < streifen.length; i++) {
            if (streifen[i].laenge > konf.breite + 0.01) zwang.push(streifen[i]);
            else kurz.push(streifen[i]);
        }
        // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var kIdx = 0; kIdx < kurz.length; kIdx++) kurz[kIdx].idx = kIdx;
        kurz.sort(function (a, b) { return (b.laenge !== a.laenge) ? b.laenge - a.laenge : a.idx - b.idx; });

        // 1. Zwangs-Laengsbaender
        var baender = [];
        for (i = 0; i < zwang.length; i += kapL) {
            baender.push({ lage: "laengs", streifen: zwang.slice(i, i + kapL) });
        }

        // 2. freie Plaetze mit den laengsten kurzen fuellen
        var pos = 0;
        for (i = 0; i < baender.length; i++) {
            while (baender[i].streifen.length < kapL && pos < kurz.length) {
                baender[i].streifen.push(kurz[pos]);
                pos++;
            }
        }
        var rest0 = kurz.slice(pos);

        // 3. wie viele zusaetzliche Laengsbaender lohnen sich?
        //    Das letzte darf teilbelegt sein.
        var best = null;
        var maxzus = (rest0.length > 0) ? Math.ceil(rest0.length / kapL) : 0;

        for (var z = 0; z <= maxzus; z++) {
            var rest = rest0.slice(0);
            var alle = [];
            for (i = 0; i < baender.length; i++) alle.push(baender[i]);
            for (j = 0; j < z; j++) {
                alle.push({ lage: "laengs", streifen: rest.slice(0, kapL) });
                rest = rest.slice(kapL);
            }
            if (rest.length > 0) {
                alle.push({ lage: "quer", streifen: rest });
            }
            if (alle.length === 0) continue;

            var hoehe = 0, breite = 0, ok = true;
            for (i = 0; i < alle.length; i++) {
                hoehe += bandHoehe(alle[i]);
                var bw = bandBreite(alle[i]);
                if (bw > breite) breite = bw;
                if (bw > konf.breite + 0.01) ok = false;
            }
            hoehe += GAP * (alle.length - 1);
            if (!ok) continue;

            if (best === null || hoehe < best.hoehe) {
                best = { hoehe: hoehe, breite: breite, baender: alle };
            }
        }
        return best;
    }

    // ================================================================
    // VARIANTEN RECHNEN
    // ================================================================
    // Zwei Wege werden verglichen und zur Auswahl gestellt:
    //
    //   Einzelbogen  ein Layout, d-mal gedruckt. Wenig Handling, dafuer
    //                Ueberproduktion, sobald die Mengen nicht glatt
    //                durch d teilbar sind.
    //   Bogenfolge   mehrere verschiedene Bogen mit eigener Auflage.
    //                Exakte Mengen, dafuer mehrere Dokumente.
    // ================================================================

    function planeEinzelVarianten(jobs) {
        var mengeMax = 0, i, j;
        for (i = 0; i < jobs.length; i++) {
            if (jobs[i].anzahl > mengeMax) mengeMax = jobs[i].anzahl;
        }
        if (mengeMax < 1) return [];

        var alle = [];
        for (var d = 1; d <= mengeMax; d++) {
            var plaetze = [], streifen = [];
            for (i = 0; i < jobs.length; i++) {
                var p = Math.ceil(jobs[i].anzahl / d);
                if (p < 1) p = 1;
                plaetze.push(p);
                for (j = 0; j < p; j++) {
                    streifen.push({ job: jobs[i], laenge: jobs[i].laenge });
                }
            }

            var lay = baueLayout(streifen);
            if (lay === null) continue;

            var zuviel = 0;
            for (i = 0; i < jobs.length; i++) {
                zuviel += plaetze[i] * d - jobs[i].anzahl;
            }

            alle.push({
                typ: "einzel",
                boegen: [{ baender: lay.baender, hoehe: lay.hoehe,
                           breite: lay.breite, auflage: d, plaetze: plaetze }],
                dokumente: 1,
                drucke: d,
                bahn: d * (lay.hoehe + OPOS_RAND_H),
                zuviel: zuviel,
                maxHoehe: lay.hoehe,
                ueber: (lay.hoehe > MAX_BAHNLAENGE) ? 1 : 0
            });
        }
        if (alle.length === 0) return [];

        // Kandidaten auswaehlen: die materialguenstigsten innerhalb der
        // Laengengrenze, dazu die beste ohne Ueberproduktion (die beste
        // ausserhalb der Grenze entfaellt, SPEZ_03_Nutzen §6.3).
        // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var aIdx = 0; aIdx < alle.length; aIdx++) alle[aIdx].idx = aIdx;
        alle.sort(function (a, b) {
            if (a.bahn !== b.bahn) return a.bahn - b.bahn;
            if (a.zuviel !== b.zuviel) return a.zuviel - b.zuviel;
            return a.idx - b.idx;
        });

        var gewaehlt = [];
        function nimm(v) {
            if (!v) return;
            for (var k = 0; k < gewaehlt.length; k++) {
                if (gewaehlt[k] === v) return;
            }
            gewaehlt.push(v);
        }

        var inGrenze = 0;
        for (i = 0; i < alle.length && inGrenze < 3; i++) {
            if (!alle[i].ueber) { nimm(alle[i]); inGrenze++; }
        }
        for (i = 0; i < alle.length; i++) {
            if (!alle[i].ueber && alle[i].zuviel === 0) { nimm(alle[i]); break; }
        }
        return gewaehlt;
    }

    function planeFolge(jobs, grenze) {
        var kapL = kapLaengs();
        var kapQ = (grenze > 0)
            ? Math.floor((grenze + GAP) / TEILUNG_STREIFEN)
            : 999999;
        if (kapQ < 1) kapQ = 1;

        var zwang = [], kurz = [], i, j;
        for (i = 0; i < jobs.length; i++) {
            for (j = 0; j < jobs[i].anzahl; j++) {
                var st = { job: jobs[i], laenge: jobs[i].laenge };
                if (jobs[i].laenge > konf.breite + 0.01) zwang.push(st);
                else kurz.push(st);
            }
        }
        // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var kIdx = 0; kIdx < kurz.length; kIdx++) kurz[kIdx].idx = kIdx;
        kurz.sort(function (a, b) { return (b.laenge !== a.laenge) ? b.laenge - a.laenge : a.idx - b.idx; });

        var boegen = [];

        // 1. Zwangs-Laengsboegen, freie Plaetze mit kurzen auffuellen
        var pos = 0;
        while (zwang.length > 0) {
            var band = zwang.splice(0, kapL);
            while (band.length < kapL && pos < kurz.length) {
                band.push(kurz[pos]);
                pos++;
            }
            var b1 = { lage: "laengs", streifen: band };
            boegen.push({ baender: [b1], hoehe: bandHoehe(b1),
                          breite: bandBreite(b1), auflage: 1 });
        }
        var rest = kurz.slice(pos);

        // 2. Rest quer, gleichmaessig auf so wenige Boegen wie noetig
        if (rest.length > 0) {
            var anzQ = Math.ceil(rest.length / kapQ);
            if (anzQ < 1) anzQ = 1;
            var basis = Math.floor(rest.length / anzQ);
            var ueberhang = rest.length - basis * anzQ;
            var pos2 = 0;
            for (var qi = 0; qi < anzQ; qi++) {
                var n = basis + ((qi < ueberhang) ? 1 : 0);
                var teil = rest.slice(pos2, pos2 + n);
                pos2 += n;
                if (teil.length === 0) continue;
                var b2 = { lage: "quer", streifen: teil };
                boegen.push({ baender: [b2], hoehe: bandHoehe(b2),
                              breite: bandBreite(b2), auflage: 1 });
            }
        }

        if (boegen.length === 0) return null;

        // 3. identische Boegen zusammenfassen
        function signatur(bg) {
            var s = "";
            for (var x = 0; x < bg.baender.length; x++) {
                s += bg.baender[x].lage + ":";
                var zaehl = {};
                for (var y = 0; y < bg.baender[x].streifen.length; y++) {
                    var nm = bg.baender[x].streifen[y].job.datei.name;
                    zaehl[nm] = (zaehl[nm] || 0) + 1;
                }
                var keys = [];
                for (var k in zaehl) { if (zaehl.hasOwnProperty(k)) keys.push(k); }
                keys.sort();
                for (var z = 0; z < keys.length; z++) {
                    s += keys[z] + "=" + zaehl[keys[z]] + ";";
                }
                s += "|";
            }
            return s;
        }

        var zusammen = [];
        for (i = 0; i < boegen.length; i++) {
            var sig = signatur(boegen[i]);
            var gefunden = null;
            for (j = 0; j < zusammen.length; j++) {
                if (zusammen[j].sig === sig) { gefunden = zusammen[j]; break; }
            }
            if (gefunden) {
                gefunden.bogen.auflage++;
            } else {
                zusammen.push({ sig: sig, bogen: boegen[i] });
            }
        }

        var fertig = [], bahn = 0, maxH = 0, drucke = 0, ueber = 0;
        for (i = 0; i < zusammen.length; i++) {
            var bg = zusammen[i].bogen;
            fertig.push(bg);
            bahn += bg.auflage * (bg.hoehe + OPOS_RAND_H);
            drucke += bg.auflage;
            if (bg.hoehe > maxH) maxH = bg.hoehe;
            if (bg.hoehe > MAX_BAHNLAENGE) ueber = 1;
        }

        return { typ: "folge", boegen: fertig, dokumente: fertig.length,
                 drucke: drucke, bahn: bahn, zuviel: 0,
                 maxHoehe: maxH, ueber: ueber };
    }

    function planeVarianten(jobs) {
        var v = planeEinzelVarianten(jobs);

        function ergaenze(f) {
            if (!f || f.ueber) return; // Kandidaten mit ueber entfallen (§6.3)
            for (var i = 0; i < v.length; i++) {
                if (v[i].dokumente === f.dokumente && v[i].bahn === f.bahn) return;
            }
            v.push(f);
        }

        // innerhalb der Laengengrenze (planeFolge(jobs, 0) entfaellt, §6.3)
        ergaenze(planeFolge(jobs, MAX_BAHNLAENGE));
        // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var vIdx = 0; vIdx < v.length; vIdx++) v[vIdx].idx = vIdx;
        v.sort(function (a, b) {
            if (a.ueber !== b.ueber) return a.ueber - b.ueber;
            if (a.bahn !== b.bahn) return a.bahn - b.bahn;
            if (a.dokumente !== b.dokumente) return a.dokumente - b.dokumente;
            return a.idx - b.idx;
        });
        return v;
    }
    // ---------- Ende der übernommenen Zeilen; weiter wie im Ablauf (Zeilen 2445–2452) ----------
    GAP = TEILUNG_STREIFEN - etW;

    for (var gi = 0; gi < jobs.length; gi++) {
        var hatT = !!(jobs[gi].typOben || jobs[gi].typUnten);
        jobs[gi].laenge = streifenLaenge(jobs[gi].daten.zeilen.length, hatT, etH);
    }

    var varianten = planeVarianten(jobs);
    return { varianten: varianten, gap: GAP, bandHoehe: bandHoehe, kapLaengs: kapLaengs, nutzbreite: NUTZBREITE, teilungStreifen: TEILUNG_STREIFEN, teilungEtikett: TEILUNG_ETIKETT };
}

// Variantenzeile und Detailtext in Schritt 3 „Variante wählen“ (Zeilen 2459–2516; ohne „– über 2,5 m“)
// Teile der Variantenzeile einzeln für die Tabelle (SPEZ_03_Oberflaeche §12.1): dateien, material (m), zuviel („exakt“ bzw. „n Streifen zu viel“), bogen (mm)
function variantenTeile(v) {
    return {
        dateien: (v.dokumente === 1) ? ("1 Datei, " + v.drucke + "× drucken") : (v.dokumente + " Dateien, " + v.drucke + " Drucke gesamt"),
        material: String(r2(v.bahn / 1000)),
        zuviel: (v.zuviel === 0) ? "exakt" : v.zuviel + " Streifen zu viel",
        bogen: String(r1(v.maxHoehe))
    };
}
function variantenZeile(v) {
    var t = variantenTeile(v), s = t.dateien;
    while (s.length < 26) s += " ";
    s += "   |   " + t.material + " m Material";
    s += "   |   " + t.zuviel;
    s += "   |   längster Bogen " + t.bogen + " mm";
    return s;
}
function detailText(v, bandHoehe) {
    var t = [];
    for (var i = 0; i < v.boegen.length; i++) {
        var bg = v.boegen[i];
        var teile = [];
        for (var j = 0; j < bg.baender.length; j++) {
            var bd = bg.baender[j];
            teile.push((bd.lage === "laengs" ? "längs " : "quer ")
                + bd.streifen.length + " (" + r1(bandHoehe(bd)) + " mm)");
        }
        t.push("Bogen " + (i + 1) + ": " + bg.auflage + "× drucken, "
            + r1(bg.breite) + " × " + r1(bg.hoehe) + " mm  –  "
            + teile.join("  +  "));
    }
    return t.join("\n");
}

/**
 * Streifen-Plätze eines Bogens der Variante (Bänder -> Kernformat ohne OPOS-Rand): je Streifen { job (Index), x_mm, y_mm, b_mm, h_mm, quer } als linke obere
 * Cutkante relativ zum Nutzen; längs unverdreht, quer um 90° gedreht (wie baueBogen im Skript: Bänder untereinander, Abstand GAP).
 */
function plaetze(jobs, pl, bogen, etW) {
    var r = [], y = 0, TS = pl.teilungStreifen;
    for (var bi = 0; bi < bogen.baender.length; bi++) {
        var band = bogen.baender[bi], hoehe = pl.bandHoehe(band);
        for (var si = 0; si < band.streifen.length; si++) {
            var j = jobs.indexOf(band.streifen[si].job), L = jobs[j].laenge;
            if (band.lage === "laengs") r.push({ job: j, x_mm: si * TS, y_mm: y, b_mm: etW, h_mm: L, quer: false });
            else r.push({ job: j, x_mm: 0, y_mm: y + si * TS, b_mm: L, h_mm: etW, quer: true });
        }
        y += hoehe + pl.gap;
    }
    return r;
}

// ---------- Kundendateien, Typbezeichnung (Schritte 1 und 2) ----------
// Zeilen 1432–1442 des Skripts; trenner = gitter.praefix_trenner ("x": „15x_WEA0103486_…“ -> 15)
function mengeAusName(name, trenner) {
    var n = String(name), t = String(trenner || "x").toLowerCase();
    var i = 0;
    while (i < n.length && n.charAt(i) >= "0" && n.charAt(i) <= "9") i++;
    if (i === 0) return 1;
    var rest = n.charAt(i);
    if (rest.toLowerCase() !== t) return 1;
    var zahl = parseInt(n.substring(0, i), 10);
    return (!isNaN(zahl) && zahl > 0) ? zahl : 1;
}
// Dateitypen des Dateidialogs (§6.1)
const TYPEN = ["pdf", "xlsx", "xlsm", "xltx", "txt", "csv", "tsv"];
// Gedächtnis (§6.2): Kopfzeilen-Schlüssel TAB oben \u001F unten je Zeile, UTF-8 (wie leseKV/schreibeKV des Skripts)
function leseKV(datei) {
    var o = {};
    if (!fs.existsSync(datei)) return o;
    try {
        var zeilen = fs.readFileSync(datei, "utf8").split(/\r\n|\r|\n/);
        for (var i = 0; i < zeilen.length; i++) { var z = zeilen[i], p = z.indexOf("\t"); if (p > 0) o[z.substring(0, p)] = z.substring(p + 1); }
    } catch (_) { }
    return o;
}
/** Gedächtnis lesen: Server (Ordner der Datei) nicht erreichbar in ms -> null (nur Vorschlag aus den Kopfzeilen, nichts geschrieben) */
async function gedaechtnisLesen(datei, ms) {
    if (!(await A.erreichbar(path.dirname(datei), ms))) return null;
    return leseKV(datei);
}
/** lesen–ändern–schreiben: aktuelle Datei lesen, neue Einträge darüber, Temp-Datei + Umbenennen (writeln des Skripts schrieb CR) */
async function gedaechtnisSchreiben(datei, neu, ms) {
    if (!(await A.erreichbar(path.dirname(datei), ms))) return false;
    var o = Object.assign(leseKV(datei), neu), t = "";
    for (var k in o) if (o.hasOwnProperty(k)) t += k + "\t" + o[k] + "\r";
    var tmp = path.join(path.dirname(datei), "." + path.basename(datei) + ".teil");
    try { fs.writeFileSync(tmp, t, "utf8"); fs.renameSync(tmp, datei); return true; }
    catch (e) { try { fs.unlinkSync(tmp); } catch (_) { } return false; }
}
// Schritt 2 je Datei (Zeilen 1541–1554): Kopfzeilen, Schlüssel fürs Gedächtnis, Vorschlag oben/unten
function typDialog(job, typCache) {
    var kopfZeilen = [];
    for (var ki = 0; ki < job.daten.kopfzeilen.length; ki++) kopfZeilen.push(job.daten.kopfzeilen[ki].join("  |  "));
    var kopfText = kopfZeilen.join("\n");
    var schluessel = normLeerG(kopfText);
    var vorOben = job.daten.typOben || "", vorUnten = job.daten.typUnten || "";
    if (typCache && typCache[schluessel]) { var teile2 = typCache[schluessel].split("\u001F"); vorOben = teile2[0] || ""; vorUnten = teile2[1] || ""; }
    return { titel: "Typbezeichnung – " + job.datei.name, kopfText: kopfText || "(keine Kopfzeilen gefunden)", schluessel: schluessel,
        oben: vorOben, unten: vorUnten, hinweis: job.daten.zeilen.length + " Etiketten je Streifen, " + job.anzahl + " mal benötigt." };
}
function normLeerG(s) { return String(s).replace(/[\s ]+/g, " ").replace(/^[\s ]+|[\s ]+$/g, ""); }
const vorlageFehlt = rel => "Vorlage fehlt: " + rel;
// Schritt 1 „Weiter“ (Zeilen 1497–1510): Prüfungen und Texte des Skripts -> { fehler } | {}; vorlage absolut, vorlageRel wie in nutzen.json
function dialog1Pruefen(liste, vorlage, vorlageRel) {
    if (liste.length === 0) return { fehler: "Keine Kundendatei gewählt." };
    if (!vorlage || !fs.existsSync(vorlage)) return { fehler: vorlageFehlt(vorlageRel) };
    for (var i = 0; i < liste.length; i++) if (!(liste[i].anzahl > 0)) return { fehler: "Stückzahl bei " + liste[i].datei.name + " prüfen." };
    return {};
}
// Prüfmeldungen am Ende gesammelt (nur bei Meldungen, ohne Zusammenfassung)
function pruefText(w) { return w.length ? "Prüfung meldet:\n• " + w.join("\n• ") : ""; }

module.exports = { r1, r2, planung, variantenTeile, variantenZeile, detailText, plaetze, mengeAusName, TYPEN, leseKV, gedaechtnisLesen, gedaechtnisSchreiben, typDialog, normLeerG,
  vorlageFehlt, dialog1Pruefen, pruefText };
