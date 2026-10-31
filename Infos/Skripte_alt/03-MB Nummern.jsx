#target illustrator
(function () {

    // ================================================================
    // BOEGL NUMMERN  v1.3
    // Nutzen aus den Nummernschildern 1-10 der Masterdatei
    // ================================================================
    // Ablauf:
    //   0. Arbeitsordner ~/Desktop/GitterMaster: Vorlage unter
    //      "Vorlagen", Stueckzahlen optional in auftrag.txt
    //      (eine Zeile je Nummer, z.B.  nummer3=20)
    //   1. Vorlage und Stueckzahl je Nummer pruefen
    //   2. Bloecke bilden, Nutzen aufbauen
    //   3. Ebenen Druck/Cut/Info, Auswahl setzen, OPOS starten
    //   4. danach: Nutzen_Speichern.jsx
    //
    // Geometrie (fix):
    //   Schild            35 x 35 mm (Cutkontur)
    //   Abstand im Block  10 mm  -> Teilung 45 mm
    //   Block             5 Spalten x max. 5 Reihen, 215 mm breit
    //   Abstand Bloecke   20 mm
    //   Zeichenflaeche    Nutzen + 60 mm in Breite und Hoehe (Stufe 25; bis 24: 1300 mm breit fix)
    //
    // Regeln:
    //   Die Breite eines Blocks ist immer voll belegt, Mengen werden
    //   auf Vielfache von 5 aufgerundet.
    //   Ein Block traegt hoechstens zwei Nummern. Die erste sitzt oben
    //   buendig, die zweite unten buendig im vollen 5-Reihen-Raster,
    //   die Leerreihen liegen dazwischen - moeglich sind 2/2, 1/3, 3/1,
    //   2/1, 1/2 und 1/1.
    //
    // Vorlage (.ait): zehn Objektgruppen, benannt 1 bis 10, jede mit
    //   Cutkontur im Vollton (Magenta 100).
    // ================================================================

    var OBJ = 35;                 // mm Schildkante
    var ABSTAND = 10;             // mm im Block
    var TEILUNG = OBJ + ABSTAND;  // 45
    var SPALTEN = 5;
    var BLOCK_B = SPALTEN * TEILUNG - ABSTAND;   // 215
    var BLOCK_ABSTAND = 20;
    var ZULAESSIG_B = 1370 - 2 * 15; // mm zulaessige Bogenbreite (Stufe 25 statt ARTBOARD_B = 1300 fix; Zeichenflaeche nach dem Inhalt)
    var RAND_W = 60;              // mm OPOS seitlich gesamt
    var RAND_H = 60;              // mm OPOS oben+unten gesamt

    // Fester Arbeitsordner: hier liegt die Vorgabedatei der aktuellen
    // Bestellung, im Unterordner "Vorlagen" die Masterdatei.
    var ARBEIT = new Folder(Folder.desktop.fsName + "/GitterMaster");
    var VORLAGEN = new Folder(ARBEIT.fsName + "/Vorlagen");
    var VORLAGE_NAME = "B\u00F6gl Nummern Masterdatei.ait";
    var AUFTRAG_NAME = "auftrag.txt";

    var MM_PT = 72 / 25.4;
    function toPt(mm) { return mm * MM_PT; }
    function toMm(pt) { return pt / MM_PT; }
    function r1(x) { return Math.round(x * 10) / 10; }

    var warnungen = [];
    function warn(s) { warnungen.push(s); }

    // ================================================================
    // Einstellungen
    // ================================================================
    var einstellOrdner = new Folder(Folder.userData.fsName + "/WEA_Etiketten");
    if (!einstellOrdner.exists) einstellOrdner.create();
    var einstellDatei = new File(einstellOrdner.fsName + "/boegl_nummern.txt");

    function leseKV(datei) {
        var o = {};
        if (!datei.exists) return o;
        try {
            datei.encoding = "UTF-8";
            if (!datei.open("r")) return o;
            while (!datei.eof) {
                var z = datei.readln();
                var p = z.indexOf("\t");
                if (p > 0) o[z.substring(0, p)] = z.substring(p + 1);
            }
            datei.close();
        } catch (_) {}
        return o;
    }
    function schreibeKV(datei, o) {
        try {
            datei.encoding = "UTF-8";
            if (!datei.open("w")) return;
            for (var k in o) {
                if (o.hasOwnProperty(k)) datei.writeln(k + "\t" + o[k]);
            }
            datei.close();
        } catch (_) {}
    }
    var einst = leseKV(einstellDatei);

    // ----------------------------------------------------------------
    // Vorgabe aus dem Arbeitsordner
    // auftrag.txt, eine Zeile je Nummer:   nummer3=20
    // ----------------------------------------------------------------
    function leseAuftrag() {
        var vorgabe = {};
        var datei = new File(ARBEIT.fsName + "/" + AUFTRAG_NAME);
        if (!datei.exists) return vorgabe;
        try {
            datei.encoding = "UTF-8";
            if (!datei.open("r")) return vorgabe;
            while (!datei.eof) {
                var z = String(datei.readln());
                var p = z.indexOf("=");
                if (p < 1) continue;
                var schluessel = z.substring(0, p).replace(/\s/g, "").toLowerCase();
                if (schluessel.indexOf("nummer") !== 0) continue;
                var nr = parseInt(schluessel.substring(6), 10);
                var wert = parseInt(String(z.substring(p + 1)).replace(/[^0-9]/g, ""), 10);
                if (!isNaN(nr) && nr >= 1 && nr <= 10 && !isNaN(wert) && wert >= 0) {
                    vorgabe[nr] = wert;
                }
            }
            datei.close();
        } catch (_) {
            try { datei.close(); } catch (__) {}
        }
        return vorgabe;
    }
    var vorgabe = leseAuftrag();

    // ================================================================
    // Hilfen
    // ================================================================
    function findeNach(container, name, treffer) {
        try {
            for (var i = 0; i < container.pageItems.length; i++) {
                var it = container.pageItems[i];
                if (String(it.name) === name) treffer.push(it);
                if (it.typename === "GroupItem") findeNach(it, name, treffer);
            }
        } catch (_) {}
        return treffer;
    }
    function ersterTreffer(container, name) {
        var t = findeNach(container, name, []);
        return t.length ? t[0] : null;
    }

    // Cutkontur = Vollton mit CMYK 0/100/0/0, wie in der Masterdatei
    function nahe(a, b) { return Math.abs(a - b) < 0.5; }

    function istSpotM100(farbe) {
        if (!farbe || farbe.typename !== "SpotColor") return false;
        var c;
        try { c = farbe.spot.color; } catch (_) { return false; }
        if (!c || c.typename !== "CMYKColor") return false;
        return nahe(c.cyan, 0) && nahe(c.magenta, 100)
            && nahe(c.yellow, 0) && nahe(c.black, 0);
    }
    function istCutPfad(item) {
        try { if (item.stroked && istSpotM100(item.strokeColor)) return true; } catch (_) {}
        try { if (item.filled && istSpotM100(item.fillColor)) return true; } catch (_) {}
        return false;
    }
    function istCutItem(item) {
        if (item.typename === "CompoundPathItem") {
            try {
                if (item.pathItems.length > 0) return istCutPfad(item.pathItems[0]);
            } catch (_) {}
            return false;
        }
        return istCutPfad(item);
    }
    function sammleCuts(container, liste) {
        try {
            for (var i = 0; i < container.pageItems.length; i++) {
                var it = container.pageItems[i];
                if (it.typename === "GroupItem") { sammleCuts(it, liste); continue; }
                if (istCutItem(it)) liste.push(it);
            }
        } catch (_) {}
        return liste;
    }

    function sammleTextrahmen(container, liste) {
        try {
            for (var i = 0; i < container.pageItems.length; i++) {
                var it = container.pageItems[i];
                if (it.typename === "TextFrame") liste.push(it);
                else if (it.typename === "GroupItem") sammleTextrahmen(it, liste);
            }
        } catch (_) {}
        return liste;
    }
    function inPfadeWandeln(container) {
        var tfs = sammleTextrahmen(container, []);
        var n = 0;
        for (var k = tfs.length - 1; k >= 0; k--) {
            try { tfs[k].createOutline(); n++; } catch (_) {}
        }
        return n;
    }

    // ================================================================
    // DIALOG
    // ================================================================
    var d1 = new Window("dialog", "B\u00F6gl Nummern");
    d1.orientation = "column";
    d1.alignChildren = ["fill", "top"];
    d1.margins = 18; d1.spacing = 10;

    var pV = d1.add("panel", undefined, "Masterdatei");
    pV.orientation = "row";
    pV.alignChildren = ["left", "center"];
    pV.margins = [14, 20, 14, 14]; pV.spacing = 8;
    var vorgabeVorlage = einst.vorlage || "";
    var standardVorlage = new File(VORLAGEN.fsName + "/" + VORLAGE_NAME);
    if (standardVorlage.exists) vorgabeVorlage = standardVorlage.fsName;

    var etVorlage = pV.add("edittext", undefined, vorgabeVorlage,
                           { readonly: true });
    etVorlage.preferredSize = [460, 22];
    var btVorlage = pV.add("button", undefined, "W\u00E4hlen");
    btVorlage.preferredSize = [90, 22];
    btVorlage.onClick = function () {
        var f = File.openDialog("Masterdatei w\u00E4hlen (.ait oder .ai)");
        if (f) etVorlage.text = f.fsName;
    };

    var pM = d1.add("panel", undefined, "St\u00FCckzahl je Nummer");
    pM.orientation = "row";
    pM.alignChildren = ["left", "top"];
    pM.margins = [14, 20, 14, 14]; pM.spacing = 30;

    var felder = {};
    for (var spalte = 0; spalte < 2; spalte++) {
        var sp = pM.add("group");
        sp.orientation = "column";
        sp.alignChildren = ["left", "center"];
        sp.spacing = 6;
        for (var k = 1; k <= 5; k++) {
            var nr = spalte * 5 + k;
            var z = sp.add("group");
            z.orientation = "row";
            z.alignChildren = ["left", "center"];
            z.spacing = 8;
            var st = z.add("statictext", undefined, "Nummer " + nr + ":");
            st.preferredSize = [80, 22];
            var et = z.add("edittext", undefined,
                String(vorgabe[nr] !== undefined ? vorgabe[nr] : 0));
            et.preferredSize = [60, 22];
            felder[nr] = et;
        }
    }

    var stHinweis = d1.add("statictext", undefined,
        "Mengen werden auf Vielfache von 5 aufgerundet \u2013 die Breite "
        + "eines Blocks ist immer voll belegt.");
    stHinweis.preferredSize = [560, 20];

    var gBtn = d1.add("group");
    gBtn.alignment = "right"; gBtn.spacing = 8;
    var btAbb = gBtn.add("button", undefined, "Abbrechen", { name: "cancel" });
    btAbb.preferredSize = [100, 26];
    var btOk = gBtn.add("button", undefined, "Aufbauen", { name: "ok" });
    btOk.preferredSize = [110, 26];
    btOk.active = true;

    var konf = null;
    btOk.onClick = function () {
        var vf = new File(etVorlage.text);
        if (!etVorlage.text || !vf.exists) {
            alert("Masterdatei nicht gefunden."); return;
        }
        var mengen = {}, summe = 0;
        for (var nr = 1; nr <= 10; nr++) {
            var t = String(felder[nr].text).replace(/[^0-9]/g, "");
            var n = parseInt(t, 10);
            if (isNaN(n) || n < 0) n = 0;
            mengen[nr] = n;
            summe += n;
        }
        if (summe === 0) { alert("Keine St\u00FCckzahl eingetragen."); return; }
        konf = { vorlage: vf, mengen: mengen };
        d1.close(1);
    };
    if (d1.show() !== 1) return;

    einst.vorlage = konf.vorlage.fsName;
    schreibeKV(einstellDatei, einst);

    // ================================================================
    // BLOECKE BILDEN
    // ================================================================
    // Reihenbedarf je Nummer, dann groesste zuerst in Bloecke fuellen.
    // Bleiben von einer Nummer weniger als 5 Reihen uebrig, wird der
    // Block mit einer zweiten Nummer aufgefuellt - eine Reihe bleibt
    // dazwischen frei.
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
        for (var nr = 1; nr <= 10; nr++) {
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

    var bloecke = bildeBloecke(konf.mengen);
    if (bloecke.length === 0) { alert("Nichts zu bauen."); return; }

    // hoechste Bloecke zuerst, damit in einer Zeile aehnliche zusammenstehen
    // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
    for (var bIdx = 0; bIdx < bloecke.length; bIdx++) bloecke[bIdx].idx = bIdx;
    bloecke.sort(function (x, y) { var dh = blockHoehe(y) - blockHoehe(x); return (dh !== 0) ? dh : x.idx - y.idx; });

    var nutzbar = ZULAESSIG_B - RAND_W;
    var proZeile = Math.floor((nutzbar + BLOCK_ABSTAND) / (BLOCK_B + BLOCK_ABSTAND));
    if (proZeile < 1) proZeile = 1;

    var zeilen = [];
    for (var bi = 0; bi < bloecke.length; bi += proZeile) {
        zeilen.push(bloecke.slice(bi, bi + proZeile));
    }

    var nutzenH = 0, nutzenB = 0;
    for (var zi = 0; zi < zeilen.length; zi++) {
        var maxH = 0;
        for (var zj = 0; zj < zeilen[zi].length; zj++) {
            var h = blockHoehe(zeilen[zi][zj]);
            if (h > maxH) maxH = h;
        }
        nutzenH += maxH;
        var bw = zeilen[zi].length * (BLOCK_B + BLOCK_ABSTAND) - BLOCK_ABSTAND;
        if (bw > nutzenB) nutzenB = bw;
    }
    nutzenH += BLOCK_ABSTAND * (zeilen.length - 1);

    // ================================================================
    // VORLAGE
    // ================================================================
    var vDoc = null;
    var altUI = app.userInteractionLevel;

    try {
        vDoc = app.open(konf.vorlage);
    } catch (e) {
        alert("Masterdatei konnte nicht ge\u00F6ffnet werden:\n" + (e.message || e));
        return;
    }

    var fehlend = [];
    for (var pruef = 1; pruef <= 10; pruef++) {
        if (konf.mengen[pruef] > 0 && !ersterTreffer(vDoc, String(pruef))) {
            fehlend.push(String(pruef));
        }
    }
    if (fehlend.length) {
        alert("In der Masterdatei fehlen Objektgruppen mit diesen Namen:\n\n\u2022 "
            + fehlend.join("\n\u2022 ")
            + "\n\nDie Namen werden im Ebenenbedienfeld vergeben.");
        try { vDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
        return;
    }

    // Referenzmass am ersten benutzten Schild
    var refNr = null;
    for (var rn = 1; rn <= 10; rn++) { if (konf.mengen[rn] > 0) { refNr = rn; break; } }
    var refItem = ersterTreffer(vDoc, String(refNr));
    var rb = refItem.geometricBounds;
    var objB = toMm(rb[2] - rb[0]);
    var objH = toMm(rb[1] - rb[3]);
    if (Math.abs(objB - OBJ) > 0.5 || Math.abs(objH - OBJ) > 0.5) {
        warn("Schild in der Vorlage " + r1(objB) + " x " + r1(objH)
            + " mm statt " + OBJ + " x " + OBJ + " mm \u2013 Raster passt dann nicht.");
    }

    vDoc.activate();
    app.executeMenuCommand("selectall");
    app.redraw();
    var anzahlKopiert = vDoc.selection.length;
    app.executeMenuCommand("copy");
    try { vDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
    if (anzahlKopiert === 0) { alert("Die Masterdatei enth\u00E4lt keine Objekte."); return; }

    // ================================================================
    // AUFBAUEN
    // ================================================================
    try {
        var preset = new DocumentPreset();
        preset.colorMode = DocumentColorSpace.CMYK;
        preset.units = RulerUnits.Millimeters;
        preset.width = toPt(210);
        preset.height = toPt(297);
        preset.numArtboards = 1;

        var startup = "Print";
        try {
            var pl = app.startupPresetsList;
            if (pl && pl.indexOf("Print") === -1) startup = (pl.length ? pl[0] : "");
        } catch (_) {}

        var doc = app.documents.addDocument(startup, preset, false);
        doc.activate();
        var lyDruck = doc.layers[0];
        lyDruck.name = "Druck";
        doc.activeLayer = lyDruck;

        app.executeMenuCommand("paste");
        var eingefuegt = doc.selection;
        if (!eingefuegt || eingefuegt.length === 0) {
            throw new Error("Einf\u00FCgen fehlgeschlagen \u2013 Zwischenablage leer.");
        }

        var master = lyDruck.groupItems.add();
        master.name = "_master";
        var tmp = [];
        for (var mi = 0; mi < eingefuegt.length; mi++) tmp.push(eingefuegt[mi]);
        for (var mj = tmp.length - 1; mj >= 0; mj--) {
            tmp[mj].move(master, ElementPlacement.PLACEATBEGINNING);
        }

        var vorlagen = {};
        var fehltNachKopie = [];
        for (var vn = 1; vn <= 10; vn++) {
            if (konf.mengen[vn] <= 0) continue;
            var it = ersterTreffer(master, String(vn));
            if (!it) fehltNachKopie.push(String(vn));
            vorlagen[vn] = it;
        }
        if (fehltNachKopie.length) {
            throw new Error(
                "Nach dem Einf\u00FCgen fehlen die Gruppen " + fehltNachKopie.join(", ")
              + ".\n\nIn den Illustrator-Voreinstellungen unter \u201EDateien "
              + "verarbeiten &\nZwischenablage\u201C muss AICB aktiv und auf "
              + "\u201EPfade beibehalten\u201C gestellt sein.");
        }

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var nutzen = lyDruck.groupItems.add();
        nutzen.name = "Nutzen";

        function setzePosition(item, xMm, yMm) {
            var b = item.geometricBounds;
            item.translate(toPt(xMm) - b[0], -toPt(yMm) - b[1]);
        }

        function setzeSchild(nr, xMm, yMm) {
            var kopie = vorlagen[nr].duplicate(nutzen, ElementPlacement.PLACEATEND);
            kopie.name = "";
            setzePosition(kopie, xMm, yMm);
            return kopie;
        }

        var gesetzt = {};
        var y = 0;

        for (var z2 = 0; z2 < zeilen.length; z2++) {
            var zeile = zeilen[z2];
            var zeilenH = 0;
            var x = 0;

            for (var b2 = 0; b2 < zeile.length; b2++) {
                var block = zeile[b2];
                for (var t2 = 0; t2 < block.length; t2++) {
                    var teil = block[t2];
                    // erste Nummer oben buendig, zweite unten buendig
                    var startReihe = (t2 === 0)
                        ? 0
                        : (SPALTEN - teil.reihen);
                    for (var rr = 0; rr < teil.reihen; rr++) {
                        for (var cc = 0; cc < SPALTEN; cc++) {
                            setzeSchild(teil.nr,
                                        x + cc * TEILUNG,
                                        y + (startReihe + rr) * TEILUNG);
                        }
                        gesetzt[teil.nr] = (gesetzt[teil.nr] || 0) + SPALTEN;
                    }
                }

                var bh = blockHoehe(block);
                if (bh > zeilenH) zeilenH = bh;
                x += BLOCK_B + BLOCK_ABSTAND;
            }
            y += zeilenH + BLOCK_ABSTAND;
        }

        try { master.remove(); } catch (_) {}
        inPfadeWandeln(nutzen);

        // ---- Kontrolle ----------------------------------------------
        var nb = nutzen.geometricBounds;
        var istB = toMm(nb[2] - nb[0]);
        var istH = toMm(nb[1] - nb[3]);
        if (Math.abs(istB - nutzenB) > 1.0) {
            warn("Nutzenbreite gemessen " + r1(istB) + " mm, berechnet "
                + r1(nutzenB) + " mm.");
        }
        if (Math.abs(istH - nutzenH) > 1.0) {
            warn("Nutzenh\u00F6he gemessen " + r1(istH) + " mm, berechnet "
                + r1(nutzenH) + " mm.");
        }
        nutzenB = istB; nutzenH = istH;
        if (nutzenB > nutzbar + 0.01) {
            warn("Nutzen " + r1(nutzenB) + " mm breit, nutzbar sind "
                + r1(nutzbar) + " mm.");
        }

        // ---- Zeichenflaeche -----------------------------------------
        var artW = toPt(nutzenB + RAND_W);
        var artH = toPt(nutzenH + RAND_H);
        doc.artboards[0].artboardRect = [0, artH, artW, 0];
        var ab = doc.artboards[0].artboardRect;

        var nb2 = nutzen.geometricBounds;
        nutzen.translate(
            ab[0] + (artW - toPt(nutzenB)) / 2 - nb2[0],
            ab[1] - (artH - toPt(nutzenH)) / 2 - nb2[1]
        );

        // ---- Ebene Cut ----------------------------------------------
        var lyCut = doc.layers.add();
        lyCut.name = "Cut";
        var cutGrp = lyCut.groupItems.add();
        cutGrp.name = "Cutkonturen";

        var cuts = sammleCuts(nutzen, []);
        for (var ci = cuts.length - 1; ci >= 0; ci--) {
            try { cuts[ci].move(cutGrp, ElementPlacement.PLACEATBEGINNING); }
            catch (_) {}
        }

        var sollSchilder = 0;
        for (var gk in gesetzt) {
            if (gesetzt.hasOwnProperty(gk)) sollSchilder += gesetzt[gk];
        }
        if (cutGrp.pageItems.length !== sollSchilder) {
            warn(cutGrp.pageItems.length + " Cutkonturen statt "
                + sollSchilder + " \u2013 Vollton in der Vorlage pr\u00FCfen.");
        }

        // ---- Ebene Info ---------------------------------------------
        var lyInfo = doc.layers.add();
        lyInfo.name = "Info";
        lyInfo.printable = false;

        var sep = "--------------------------------------";
        var info = ["=== B\u00D6GL NUMMERN ===",
                    "",
                    ">>> 1 x DRUCKEN <<<",
                    "",
                    "Nutzen:         " + r1(nutzenB) + " x " + r1(nutzenH) + " mm",
                    "Zeichenfl\u00E4che:  " + r1(nutzenB + RAND_W) + " x "
                        + r1(nutzenH + RAND_H) + " mm",
                    "Schilder:       " + sollSchilder,
                    sep];

        for (var ii = 1; ii <= 10; ii++) {
            if (konf.mengen[ii] <= 0) continue;
            var geb = gesetzt[ii] || 0;
            info.push("Nummer " + ii + ":" + (ii < 10 ? "  " : " ")
                + "     " + konf.mengen[ii] + " bestellt, " + geb + " gebaut"
                + (geb > konf.mengen[ii]
                   ? "   (" + (geb - konf.mengen[ii]) + " zu viel)" : "   (exakt)"));
        }

        info.push(sep);
        var nr2 = 1;
        for (var z3 = 0; z3 < zeilen.length; z3++) {
            for (var b3 = 0; b3 < zeilen[z3].length; b3++) {
                var bl = zeilen[z3][b3];
                var teile = [];
                for (var t3 = 0; t3 < bl.length; t3++) {
                    teile.push("Nr " + bl[t3].nr + " mit " + bl[t3].reihen
                        + " Reihe" + (bl[t3].reihen > 1 ? "n" : ""));
                }
                info.push("Block " + nr2 + " (Zeile " + (z3 + 1) + "):  "
                    + r1(blockHoehe(bl)) + " mm hoch  -  " + teile.join(" + "));
                nr2++;
            }
        }

        info.push(sep);
        info.push("Raster:         " + OBJ + " mm Schild, " + ABSTAND
            + " mm Abstand, " + BLOCK_ABSTAND + " mm zwischen Bl\u00F6cken");
        info.push("Bl\u00F6cke/Zeile:   " + proZeile);
        info.push("Vorlage:        " + konf.vorlage.name);
        info.push(sep);
        info.push("Erstellt:       " + new Date().toLocaleString());

        var tfInfo = lyInfo.textFrames.add();
        tfInfo.contents = info.join("\n");
        tfInfo.position = [ab[0] + toPt(5), ab[3] - toPt(8)];
        lyInfo.locked = true;

        app.userInteractionLevel = altUI;

        // ---- Auswahl setzen -----------------------------------------
        doc.activeLayer = lyDruck;
        app.redraw();

        var auswahl = [nutzen];
        if (cutGrp.pageItems.length > 0) auswahl.push(cutGrp);
        var auswahlOk = false;
        try {
            doc.selection = null;
            doc.selection = auswahl;
            auswahlOk = (doc.selection && doc.selection.length === auswahl.length);
        } catch (_) { auswahlOk = false; }

        if (!auswahlOk) {
            try {
                doc.selection = null;
                // Info-Ebene waehrend "Alles auswaehlen" ausblenden,
                // sonst landet der Infotext in der Auswahl und OPOS
                // setzt die Marken um ihn herum.
                lyInfo.locked = false;
                lyInfo.visible = false;
                app.executeMenuCommand("selectall");
                lyInfo.visible = true;
                lyInfo.locked = true;
            } catch (_) {}
        }

        // Sicherheitsnetz: nichts aus der Info-Ebene darf ausgewaehlt sein
        try {
            lyInfo.locked = false;
            for (var ai = 0; ai < lyInfo.pageItems.length; ai++) {
                try { lyInfo.pageItems[ai].selected = false; } catch (__) {}
            }
            lyInfo.locked = true;
        } catch (_) {}

        app.redraw();

        var text = "Nutzen " + r1(nutzenB) + " x " + r1(nutzenH) + " mm, "
                 + bloecke.length + " Bl\u00F6cke in " + zeilen.length
                 + " Zeile(n), " + sollSchilder + " Schilder.";
        var zuviel = 0;
        for (var zv = 1; zv <= 10; zv++) {
            if (konf.mengen[zv] > 0) zuviel += (gesetzt[zv] || 0) - konf.mengen[zv];
        }
        if (zuviel > 0) text += "\n" + zuviel + " St\u00FCck \u00DCberproduktion "
                              + "durch das 5er-Raster.";
        if (warnungen.length > 0) {
            text += "\n\nPr\u00FCfung meldet:\n\u2022 " + warnungen.join("\n\u2022 ");
        }
        alert(text);

        try {
            var oposApp = new Folder("/Applications/OPOS.app");
            if (oposApp.exists) oposApp.execute();
        } catch (_) {}

    } catch (err) {
        try { app.userInteractionLevel = altUI; } catch (_) {}
        alert("Fehler: " + (err.message || err));
    }

})();
