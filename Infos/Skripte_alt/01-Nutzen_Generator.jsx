#target illustrator
(function () {

    // ================================================================
    // NUTZEN GENERATOR  v3  -  Stickerbogen Produktion
    // ================================================================
    // Fuell-Logik statt Formatsuche:
    //
    //   Motivmass  = Bounding-Box der CUTKONTUR (Vollton 100 % Magenta).
    //                Anschnitt darf ueberlappen, platziert wird auf die
    //                Cutkante.
    //   Bogenraster= ergibt sich aus dem Zielformat. Spalten/Zeilen so,
    //                dass das AUSSENMASS (Raster + 20 mm) das Zielformat
    //                trifft - "exakt oder kleiner" rundet ab, "+/- 25 %"
    //                nimmt den naeheren der beiden Werte.
    //   Nutzen     = so viele Boegen nebeneinander wie auf die Bahn
    //                passen, dann motivzeilenweise fuellen bis die
    //                Stueckzahl erreicht ist. Ab der zweiten Motivzeile
    //                wird die letzte Reihe voll gemacht, die Ueber-
    //                produktion wird ausgewiesen. Bei nur einer Reihe
    //                bleibt es teilbelegt (exakte Stueckzahl).
    //   Schnitt    = 20 mm zwischen den Boegen, mittig auf der 10-mm-
    //                Markierung des Schneidetischs. Randboegen buendig.
    //   Auswahl    = Motivorientierung x Bogenorientierung, sortiert
    //                nach Bahnlaenge, dann Anzahl Boegen.
    // ================================================================

    if (app.documents.length === 0) { alert("Kein Dokument ge\xF6ffnet."); return; }
    var srcDoc = app.activeDocument;
    if (!srcDoc.selection || srcDoc.selection.length === 0) {
        alert("Keine Auswahl. Bitte Motiv und Cutkontur ausw\xE4hlen."); return;
    }

    // ----------------------------------------------------------------
    // Konstanten
    // ----------------------------------------------------------------
    var OPOS_RAND_W = 60;    // mm seitlich gesamt (OPOS-Marken)
    var OPOS_RAND_H = 50;    // mm oben+unten gesamt (OPOS-Marken)
    var MAX_HOEHE   = 2000;  // mm maximale Nutzenhoehe pro Druck
    var GAP_BOGEN   = 20;    // mm fix - Schneidetisch, 10-mm-Markierung
    var TOL_WEICH   = 0.25;  // +/- 25 % im Modus "ca. Zielformat"

    // ----------------------------------------------------------------
    // Helfer
    // ----------------------------------------------------------------
    var MM_PT = 72 / 25.4;
    function toPt(mm) { return mm * MM_PT; }
    function toMm(pt) { return pt / MM_PT; }
    function r1(x)    { return Math.round(x * 10) / 10; }
    function r2(x)    { return Math.round(x * 100) / 100; }
    function parseNum(s) { return parseFloat(String(s).replace(",", ".")); }

    function unionB(a, b) {
        if (!b) return a;
        if (!a) return [b[0], b[1], b[2], b[3]];
        return [Math.min(a[0], b[0]), Math.max(a[1], b[1]),
                Math.max(a[2], b[2]), Math.min(a[3], b[3])];
    }

    // ----------------------------------------------------------------
    // Cutkontur erkennen  -  Vollton C0 M100 Y0 K0
    // ----------------------------------------------------------------
    function near(a, b) { return Math.abs(a - b) < 0.5; }

    function isSpotM100(color) {
        if (!color || color.typename !== "SpotColor") return false;
        var c;
        try { c = color.spot.color; } catch (_) { return false; }
        if (!c || c.typename !== "CMYKColor") return false;
        return near(c.cyan, 0) && near(c.magenta, 100) &&
               near(c.yellow, 0) && near(c.black, 0);
    }

    function isCutPath(item) {
        try { if (item.stroked && isSpotM100(item.strokeColor)) return true; } catch (_) {}
        try { if (item.filled  && isSpotM100(item.fillColor))   return true; } catch (_) {}
        return false;
    }

    // CompoundPathItem hat KEINE eigene stroked/filled-Property.
    function isCutItem(item) {
        if (item.typename === "CompoundPathItem") {
            try {
                if (item.pathItems.length > 0) return isCutPath(item.pathItems[0]);
            } catch (_) {}
            return false;
        }
        return isCutPath(item);
    }

    // ----------------------------------------------------------------
    // Bounds  -  Schnittmasken-aware, auch verschachtelt
    // ----------------------------------------------------------------
    function visualBounds(item) {
        if (item.typename === "GroupItem") {
            var i, cp;
            if (item.clipped) {
                for (i = 0; i < item.pathItems.length; i++) {
                    if (item.pathItems[i].clipping) return item.pathItems[i].geometricBounds;
                }
                for (i = 0; i < item.compoundPathItems.length; i++) {
                    cp = item.compoundPathItems[i];
                    try {
                        if (cp.pathItems.length > 0 && cp.pathItems[0].clipping)
                            return cp.geometricBounds;
                    } catch (_) {}
                }
            }
            var b = null;
            try {
                for (i = 0; i < item.pageItems.length; i++)
                    b = unionB(b, visualBounds(item.pageItems[i]));
            } catch (_) {}
            if (b) return b;
        }
        return item.geometricBounds;
    }

    function scanCuts(item, acc) {
        if (item.typename === "GroupItem") {
            try {
                for (var i = 0; i < item.pageItems.length; i++) scanCuts(item.pageItems[i], acc);
            } catch (_) {}
            return;
        }
        if (isCutItem(item)) {
            acc.b = unionB(acc.b, item.geometricBounds);
            acc.n++;
        }
    }

    // ----------------------------------------------------------------
    // Motiv messen
    // ----------------------------------------------------------------
    var origSel = srcDoc.selection;
    var allB = null;
    var cutAcc = { b: null, n: 0 };
    for (var si = 0; si < origSel.length; si++) {
        allB = unionB(allB, visualBounds(origSel[si]));
        scanCuts(origSel[si], cutAcc);
    }
    if (!allB) { alert("Auswahl konnte nicht gemessen werden."); return; }

    var hasCut = !!cutAcc.b;
    if (!hasCut) {
        if (!confirm("Keine Cutkontur gefunden (Vollton 100 % Magenta erwartet).\n\n"
            + "Ohne Cutkontur wird das Raster aus der Gesamtauswahl gerechnet\n"
            + "und die Ebene \u201ECut\u201C bleibt leer.\n\nTrotzdem fortfahren?")) return;
    }
    var refB = hasCut ? cutAcc.b : allB;

    // Anschnitt-Ueberstand pro Seite (mm), Referenz fuer die Platzierung
    var off0 = {
        l: toMm(refB[0] - allB[0]),
        t: toMm(allB[1] - refB[1]),
        r: toMm(allB[2] - refB[2]),
        b: toMm(refB[3] - allB[3])
    };
    var bleedMax = Math.max(off0.l, off0.t, off0.r, off0.b);

    var mW_mm = toMm(refB[2] - refB[0]);
    var mH_mm = toMm(refB[1] - refB[3]);
    if (mW_mm <= 0 || mH_mm <= 0) { alert("Ung\xFCltige Motivgr\xF6\xDFe."); return; }

    function rotOff(o) { return { l: o.b, t: o.l, r: o.t, b: o.r }; }   // -90 Grad

    // ================================================================
    // DIALOG 1  -  Parameter
    // ================================================================
    var d1 = new Window("dialog", "Nutzen-Generator");
    d1.orientation = "column";
    d1.alignChildren = ["fill", "top"];
    d1.margins = 18;
    d1.spacing = 10;

    function inputRow(parent, label, defaultVal) {
        var g = parent.add("group");
        g.orientation = "row";
        g.alignChildren = ["left", "center"];
        g.spacing = 10;
        var st = g.add("statictext", undefined, label);
        st.preferredSize = [190, 22];
        var et = g.add("edittext", undefined, String(defaultVal));
        et.preferredSize = [90, 22];
        return et;
    }
    function textRow(parent, label, value) {
        var g = parent.add("group");
        g.orientation = "row";
        g.alignChildren = ["left", "center"];
        g.spacing = 10;
        var st = g.add("statictext", undefined, label);
        st.preferredSize = [190, 22];
        var sv = g.add("statictext", undefined, value);
        sv.preferredSize = [220, 22];
        return sv;
    }

    var pMotiv = d1.add("panel", undefined, "Motiv (gemessen)");
    pMotiv.orientation = "column";
    pMotiv.alignChildren = ["left", "top"];
    pMotiv.margins = [14, 20, 14, 14];
    pMotiv.spacing = 4;
    pMotiv.add("statictext", undefined,
        (hasCut ? "Cutkontur:     " : "Gesamtauswahl: ")
        + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm"
        + (hasCut ? "  (" + cutAcc.n + " Objekt(e))" : ""));
    if (hasCut) {
        pMotiv.add("statictext", undefined,
            "Anschnitt:     max. " + r1(bleedMax) + " mm \xFCber die Cutkontur hinaus");
    }

    var pProd = d1.add("panel", undefined, "Produktion");
    pProd.orientation = "column";
    pProd.alignChildren = ["fill", "top"];
    pProd.margins = [14, 20, 14, 14];
    pProd.spacing = 8;
    var eCount = inputRow(pProd, "Ben\xF6tigte St\xFCckzahl:", "100");
    var eMedia = inputRow(pProd, "Medienbreite (mm):", "1370");

    var pFmt = d1.add("panel", undefined, "Bogenformat (Au\xDFenma\xDF nach dem Schnitt)");
    pFmt.orientation = "column";
    pFmt.alignChildren = ["left", "top"];
    pFmt.margins = [14, 20, 14, 14];
    pFmt.spacing = 8;

    var gFmt1 = pFmt.add("group");
    gFmt1.orientation = "row";
    gFmt1.spacing = 24;
    var rbA4 = gFmt1.add("radiobutton", undefined, "A4  (210 \xD7 297)"); rbA4.value = true;
    var rbA3 = gFmt1.add("radiobutton", undefined, "A3  (297 \xD7 420)");

    var gFmt2 = pFmt.add("group");
    gFmt2.orientation = "column";
    gFmt2.alignChildren = ["left", "top"];
    gFmt2.spacing = 4;
    var rbStrict = gFmt2.add("radiobutton", undefined,
        "exakt oder kleiner   \u2013 Lagerung beim Kunden");
    rbStrict.value = true;
    var rbSoft = gFmt2.add("radiobutton", undefined,
        "ca. \xB1 25 %              \u2013 nur Handling");

    var pGaps = d1.add("panel", undefined, "Abst\xE4nde");
    pGaps.orientation = "column";
    pGaps.alignChildren = ["fill", "top"];
    pGaps.margins = [14, 20, 14, 14];
    pGaps.spacing = 8;
    var eGapM = inputRow(pGaps, "Abstand Motive (mm):", "4");
    textRow(pGaps, "Abstand B\xF6gen (mm):", String(GAP_BOGEN) + "   (fix \u2013 Schneidetisch)");

    var g1Btns = d1.add("group");
    g1Btns.alignment = "right";
    g1Btns.spacing = 8;
    var btnCancel1 = g1Btns.add("button", undefined, "Abbrechen", { name: "cancel" });
    btnCancel1.preferredSize = [100, 26];
    var btn1 = g1Btns.add("button", undefined, "Weiter \u2192", { name: "ok" });
    btn1.preferredSize = [100, 26];
    btn1.active = true;

    var params = null;
    btn1.onClick = function () {
        var cnt = parseInt(eCount.text, 10);
        var med = parseNum(eMedia.text);
        var gm  = parseNum(eGapM.text);
        if (isNaN(cnt) || cnt < 1 || isNaN(med) || med <= 0 || isNaN(gm) || gm < 0) {
            alert("Bitte alle Felder korrekt ausf\xFCllen."); return;
        }
        if (hasCut && bleedMax * 2 > gm + 0.01) {
            if (!confirm("Der Anschnitt steht max. " + r1(bleedMax) + " mm \xFCber die Cutkontur.\n"
                + "Bei " + r1(gm) + " mm Motivabstand \xFCberlappen sich benachbarte Anschnitte.\n\n"
                + "Kollisionsfrei w\xE4ren mindestens " + r1(bleedMax * 2) + " mm.\n\nTrotzdem weiter?")) return;
        }
        params = { cnt: cnt, med: med, a3: rbA3.value, strict: rbStrict.value, gm: gm };
        d1.close(1);
    };
    if (d1.show() !== 1) return;

    // ================================================================
    // PLANUNG  -  Fuell-Logik
    // ================================================================
    var availW = params.med - OPOS_RAND_W;
    var availH = MAX_HOEHE  - OPOS_RAND_H;
    var gM     = params.gm;
    var gB     = GAP_BOGEN;
    var cnt    = params.cnt;
    var tgtW   = params.a3 ? 297 : 210;
    var tgtH   = params.a3 ? 420 : 297;

    // Spalten- bzw. Zeilenzahl im Bogen aus dem Zielformat ableiten.
    // Aussenmass = Raster + gB.  strict: abrunden.  weich: naeherer Wert.
    function pickCount(tgt, step) {
        var f = Math.floor((tgt - gB + gM) / step);
        if (f < 1) return params.strict ? 0 : 1;
        if (params.strict) return f;
        var c  = f + 1;
        var oF = f * step - gM + gB;
        var oC = c * step - gM + gB;
        if (oC <= tgt * (1 + TOL_WEICH) && Math.abs(oC - tgt) < Math.abs(oF - tgt)) return c;
        return f;
    }

    var plans = [];
    (function buildPlans() {
        var rMArr = [false, true], bQArr = [false, true];
        for (var a = 0; a < rMArr.length; a++) {
            for (var b = 0; b < bQArr.length; b++) {
                var rotM  = rMArr[a];
                var bQuer = bQArr[b];

                var effMW = rotM ? mH_mm : mW_mm;
                var effMH = rotM ? mW_mm : mH_mm;
                var stepX = effMW + gM;
                var stepY = effMH + gM;

                var bTgtW = bQuer ? tgtH : tgtW;
                var bTgtH = bQuer ? tgtW : tgtH;

                var bCols = pickCount(bTgtW, stepX);
                var bRows = pickCount(bTgtH, stepY);
                if (bCols < 1 || bRows < 1) continue;

                var bw = bCols * stepX - gM;      // Bogen-Innenraster (Cutkante bis Cutkante)
                var bh = bRows * stepY - gM;
                var outW = bw + gB, outH = bh + gB;   // Aussenmass nach dem Schnitt

                var perRow = Math.floor((availW + gB) / (bw + gB));
                var maxBZ  = Math.floor((availH + gB) / (bh + gB));
                if (perRow < 1 || maxBZ < 1) continue;

                var plz = perRow * bCols;                  // Plaetze je Motivzeile
                var Tz  = Math.ceil(cnt / plz);            // benoetigte Motivzeilen
                var BZ  = Math.ceil(Tz / bRows);           // Bogenzeilen gesamt
                var p   = Math.ceil(BZ / maxBZ);           // Drucke

                function heightOf(nBZ, nTz) {
                    var full = nBZ - 1;
                    var restRows = nTz - full * bRows;
                    return full * (bh + gB) + (restRows * stepY - gM);
                }

                // Ab der zweiten Motivzeile wird die letzte Reihe voll gemacht -
                // die Ueberproduktion wird ausgewiesen. Bei nur einer Reihe
                // bleibt es teilbelegt (exakte Stueckzahl).
                var fillLast = (Tz > 1);

                var buildTz, buildBZ, nH, len, pieces, lastTz, lastBZ;
                if (p === 1) {
                    buildTz = Tz; buildBZ = BZ;
                    nH = heightOf(BZ, Tz);
                    len = nH + OPOS_RAND_H;
                    pieces = fillLast ? Tz * plz : cnt;
                    lastTz = Tz; lastBZ = BZ;
                } else {
                    // volle Drucke: maxBZ Bogenzeilen komplett gefuellt
                    // letzter Druck: Rest, auf volle Motivzeilen aufgerundet
                    var TzFull = maxBZ * bRows;
                    buildTz = TzFull; buildBZ = maxBZ;
                    lastBZ  = BZ - (p - 1) * maxBZ;
                    lastTz  = Tz - (p - 1) * TzFull;
                    var hFull = maxBZ * (bh + gB) - gB;
                    var hLast = heightOf(lastBZ, lastTz);
                    nH  = hFull;
                    len = (p - 1) * (hFull + OPOS_RAND_H) + (hLast + OPOS_RAND_H);
                    pieces = ((p - 1) * TzFull + lastTz) * plz;
                }

                // Breite: bei mehr als einer Motivzeile ist die erste voll
                var nW;
                if (buildTz > 1 || cnt >= plz) {
                    nW = perRow * (bw + gB) - gB;
                } else {
                    var jmax = cnt - 1;
                    nW = Math.floor(jmax / bCols) * (bw + gB) + (jmax % bCols) * stepX + effMW;
                }

                // Boegen gesamt (ueber alle Drucke). Bei aufgefuellter letzter
                // Reihe ist jede Motivzeile voll -> in jeder Bogenzeile perRow.
                var boegen = fillLast ? (BZ * perRow) : Math.ceil(cnt / bCols);
                // Belegung der letzten Motivzeile (nur relevant ohne Auffuellen)
                var restM = fillLast ? plz : cnt;

                plans.push({
                    rotM: rotM, bQuer: bQuer,
                    effMW: effMW, effMH: effMH, stepX: stepX, stepY: stepY,
                    bCols: bCols, bRows: bRows, bw: bw, bh: bh,
                    outW: outW, outH: outH,
                    perRow: perRow, plz: plz, maxBZ: maxBZ,
                    Tz: Tz, BZ: BZ, prints: p,
                    buildTz: buildTz, buildBZ: buildBZ,
                    lastTz: lastTz, lastBZ: lastBZ,
                    buildCount: (p === 1) ? pieces : buildTz * plz,
                    fillLast: fillLast, restM: restM,
                    nW: nW, nH: nH, len: len,
                    boegen: boegen, pieces: pieces, over: pieces - cnt
                });
            }
        }
    })();

    if (plans.length === 0) {
        alert("Kein Layout berechenbar.\n\n"
            + "Motiv " + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm passt mit "
            + r1(gM) + " mm Abstand in kein\n"
            + "Bogenau\xDFenma\xDF von " + tgtW + " \xD7 " + tgtH + " mm.\n\n"
            + "Gr\xF6\xDFeres Zielformat w\xE4hlen oder auf \xB1 25 % stellen.");
        return;
    }

    plans.sort(function (x, y) {
        if (x.len !== y.len)       return x.len - y.len;
        if (x.boegen !== y.boegen) return x.boegen - y.boegen;
        if (x.prints !== y.prints) return x.prints - y.prints;
        return x.over - y.over;
    });

    // Duplikate entfernen (bei quadratischen Motiven sind Varianten identisch)
    var picks = [];
    for (var pi = 0; pi < plans.length; pi++) {
        var dup = false;
        for (var pj = 0; pj < picks.length; pj++) {
            if (picks[pj].bCols === plans[pi].bCols && picks[pj].bRows === plans[pi].bRows &&
                picks[pj].perRow === plans[pi].perRow && picks[pj].buildTz === plans[pi].buildTz &&
                Math.abs(picks[pj].nW - plans[pi].nW) < 0.01) { dup = true; break; }
        }
        if (!dup) picks.push(plans[pi]);
    }

    // ================================================================
    // DIALOG 2  -  Vorschau & Auswahl
    // ================================================================
    var fmtLbl = params.a3 ? "A3" : "A4";

    function planLine(x) {
        var s = r2(x.len / 1000) + " m  |  Bogen " + r1(x.outW) + "\xD7" + r1(x.outH)
              + " mm (" + x.bCols + "\xD7" + x.bRows + ")"
              + "  |  " + x.perRow + " B\xF6gen/Reihe"
              + "  |  " + x.boegen + " B\xF6gen gesamt"
              + "  |  " + x.prints + "\xD7 drucken";
        if (x.over > 0) s += "  |  " + x.over + " zu viel";
        if (x.rotM)  s += "  |  Motiv 90\xB0";
        if (x.bQuer) s += "  |  Bogen quer";
        return s;
    }

    var d2 = new Window("dialog", "Nutzen-Generator \u2013 Vorschau");
    d2.orientation = "column";
    d2.alignChildren = ["fill", "top"];
    d2.margins = 18;
    d2.spacing = 10;

    var pInfo = d2.add("panel", undefined, "Vorgabe");
    pInfo.orientation = "column";
    pInfo.alignChildren = ["left", "top"];
    pInfo.margins = [14, 20, 14, 14];
    pInfo.spacing = 4;
    pInfo.add("statictext", undefined,
        "Motiv (Cutkontur): " + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm"
        + "   |   " + cnt + " Stk."
        + "   |   Medium " + params.med + " mm");
    pInfo.add("statictext", undefined,
        "Zielformat: " + fmtLbl + " " + tgtW + " \xD7 " + tgtH + " mm ("
        + (params.strict ? "exakt oder kleiner" : "\xB1 25 %") + ")"
        + "   |   Abst\xE4nde: Motive " + r1(gM) + " mm, B\xF6gen " + gB + " mm");

    var pSel = d2.add("panel", undefined, "Layout w\xE4hlen");
    pSel.orientation = "column";
    pSel.alignChildren = ["left", "top"];
    pSel.margins = [14, 20, 14, 14];
    pSel.spacing = 8;

    var rbs = [];
    for (var pk = 0; pk < picks.length; pk++) {
        var rb = pSel.add("radiobutton", undefined, planLine(picks[pk]));
        if (pk === 0) rb.value = true;
        rbs.push(rb);
    }

    var stDetail = pSel.add("statictext", undefined, "", { multiline: true });
    stDetail.preferredSize = [620, 60];

    function currentPick() {
        for (var i = 0; i < rbs.length; i++) if (rbs[i].value) return picks[i];
        return picks[0];
    }
    function refreshDetail() {
        var x = currentPick();
        var t = "Nutzen: " + r1(x.nW) + " \xD7 " + r1(x.nH) + " mm"
              + "   |   Zeichenfl\xE4che: " + r1(x.nW + OPOS_RAND_W) + " \xD7 " + r1(x.nH + OPOS_RAND_H) + " mm"
              + "   |   " + x.buildCount + " Motive im Nutzen";
        t += "\nF\xFCllung: " + x.plz + " Pl\xE4tze je Motivzeile ("
           + x.perRow + " B\xF6gen \xD7 " + x.bCols + "), " + x.Tz + " Motivzeile(n) in "
           + x.BZ + " Bogenzeile(n).";
        if (x.prints > 1) {
            t += "\n" + x.prints + " Drucke: " + (x.prints - 1) + "\xD7 voll ("
               + x.buildBZ + " Bogenzeilen) + 1\xD7 mit " + x.lastBZ + " Bogenzeile(n) / "
               + x.lastTz + " Motivzeile(n) \u2013 Rest im letzten Druck l\xF6schen.";
        } else if (x.fillLast) {
            t += "\nLetzte Motivzeile voll aufgef\xFCllt: " + x.pieces + " statt " + cnt
               + " Stk. \u2013 " + x.over + " \xDCberproduktion.";
        } else {
            t += "\nEine Motivzeile, " + x.restM + " von " + x.plz
               + " Pl\xE4tzen belegt \u2013 exakt " + cnt + " Stk.";
        }
        stDetail.text = t;
    }
    for (var ri = 0; ri < rbs.length; ri++) rbs[ri].onClick = refreshDetail;
    refreshDetail();

    var g2Btns = d2.add("group");
    g2Btns.alignment = "right";
    g2Btns.spacing = 8;
    var btnCancel2 = g2Btns.add("button", undefined, "Abbrechen", { name: "cancel" });
    btnCancel2.preferredSize = [100, 26];
    var btn2 = g2Btns.add("button", undefined, "Aufbauen", { name: "ok" });
    btn2.preferredSize = [110, 26];
    btn2.active = true;

    var sel = picks[0];
    btn2.onClick = function () { sel = currentPick(); d2.close(1); };
    if (d2.show() !== 1) return;

    // ================================================================
    // AUFBAUEN
    // ================================================================
    var mOff = sel.rotM ? rotOff(off0) : off0;   // Anschnitt-Offsets nach Motivrotation
    var warnings = [];

    try {
        // ---- Auswahl in die Zwischenablage ---------------------------
        // duplicate() arbeitet in Illustrator nicht ueber Dokumentgrenzen,
        // deshalb ist die Zwischenablage der Weg. Kopiert wird VOR dem
        // Anlegen des Zieldokuments, solange die Quellauswahl noch steht.
        srcDoc.activate();
        srcDoc.selection = origSel;
        app.redraw();
        app.executeMenuCommand("copy");

        // ---- Neues Dokument ------------------------------------------
        var docPreset          = new DocumentPreset();
        docPreset.colorMode    = DocumentColorSpace.CMYK;
        docPreset.units        = RulerUnits.Millimeters;
        docPreset.width        = toPt(210);
        docPreset.height       = toPt(297);
        docPreset.numArtboards = 1;

        var startupStr = "Print";
        try {
            var pl = app.startupPresetsList;
            if (pl && pl.indexOf("Print") === -1) startupStr = (pl.length ? pl[0] : "");
        } catch (_) {}

        var doc = app.documents.addDocument(startupStr, docPreset, false);
        doc.activate();
        var ly1 = doc.layers[0];
        doc.activeLayer = ly1;

        // ---- Einfuegen -----------------------------------------------
        app.executeMenuCommand("paste");
        var pasted = doc.selection;
        if (!pasted || pasted.length === 0)
            throw new Error("Einf\xFCgen fehlgeschlagen \u2013 Zwischenablage leer.");

        var srcGrp = ly1.groupItems.add();
        var tmpArr = [];
        for (var qi = 0; qi < pasted.length; qi++) tmpArr.push(pasted[qi]);
        for (var qj = tmpArr.length - 1; qj >= 0; qj--)
            tmpArr[qj].move(srcGrp, ElementPlacement.PLACEATBEGINNING);

        // ---- Transfer pruefen ----------------------------------------
        var cutPerMotif = { b: null, n: 0 };
        scanCuts(srcGrp, cutPerMotif);

        if (hasCut && cutPerMotif.n === 0) {
            throw new Error(
                "Die Cutkontur hat den Kopiervorgang nicht \xFCberstanden.\n\n"
              + "Die Volltonfarbe ist beim Einf\xFCgen verlorengegangen. In den\n"
              + "Illustrator-Voreinstellungen unter \u201eDateien verarbeiten & Zwischenablage\u201c\n"
              + "muss AICB aktiv und auf \u201ePfade beibehalten\u201c gestellt sein\n"
              + "(nicht \u201eErscheinungsbild und \xDCberdrucken beibehalten\u201c).");
        }
        // Masskontrolle: hat der Transfer die Geometrie veraendert?
        if (hasCut && cutPerMotif.b) {
            var tW = toMm(cutPerMotif.b[2] - cutPerMotif.b[0]);
            var tH = toMm(cutPerMotif.b[1] - cutPerMotif.b[3]);
            if (Math.abs(tW - mW_mm) > 0.2 || Math.abs(tH - mH_mm) > 0.2) {
                warnings.push("Motivma\xDF nach dem Kopieren " + r1(tW) + " \xD7 " + r1(tH)
                    + " mm statt " + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm.");
            }
            if (cutPerMotif.n !== cutAcc.n) {
                warnings.push("Cutkontur-Objekte nach dem Kopieren: " + cutPerMotif.n
                    + " statt " + cutAcc.n + ".");
            }
        }

        // ---- Motiv-Symbol --------------------------------------------
        var motifSym = doc.symbols.add(srcGrp);      // konsumiert srcGrp
        motifSym.name = "_nutzen_motif";

        var stepXpt = toPt(sel.stepX);
        var stepYpt = toPt(sel.stepY);
        var bStepXpt = toPt(sel.bw + gB);
        var bStepYpt = toPt(sel.bh + gB);

        // Ein Motiv an die Cut-Position (xMm, yMm) setzen; yMm nach unten positiv
        function placeMotif(container, xMm, yMm) {
            var inst = doc.symbolItems.add(motifSym);
            if (sel.rotM) inst.rotate(-90);
            var ib   = inst.geometricBounds;
            var cutL = ib[0] + toPt(mOff.l);
            var cutT = ib[1] - toPt(mOff.t);
            inst.translate(toPt(xMm) - cutL, -toPt(yMm) - cutT);
            if (container) inst.move(container, ElementPlacement.PLACEATBEGINNING);
            return inst;
        }

        // ---- Vollen Bogen als Symbol ---------------------------------
        var bogenGrp = ly1.groupItems.add();
        for (var mr = 0; mr < sel.bRows; mr++) {
            for (var mc = 0; mc < sel.bCols; mc++) {
                placeMotif(bogenGrp, mc * sel.stepX, mr * sel.stepY);
            }
        }
        if (bogenGrp.pageItems.length !== sel.bCols * sel.bRows)
            warnings.push("Bogen: " + bogenGrp.pageItems.length + " statt "
                + (sel.bCols * sel.bRows) + " Motive.");

        var bogenSym = doc.symbols.add(bogenGrp);    // konsumiert bogenGrp
        bogenSym.name = "_nutzen_bogen";

        function placeBogen(container, bx, by) {
            var inst = doc.symbolItems.add(bogenSym);
            var ib   = inst.geometricBounds;
            var cutL = ib[0] + toPt(mOff.l);
            var cutT = ib[1] - toPt(mOff.t);
            inst.translate(bx * bStepXpt - cutL, -by * bStepYpt - cutT);
            inst.move(container, ElementPlacement.PLACEATBEGINNING);
            return inst;
        }

        // ---- Nutzen fuellen ------------------------------------------
        // Volle Bogenzeilen 0 .. buildBZ-2 komplett, letzte Bogenzeile
        // motivweise bis buildCount.
        var nutzenGrp = ly1.groupItems.add();
        var vollBZ    = sel.buildBZ - 1;
        var gesetzt   = 0;

        for (var by = 0; by < vollBZ; by++) {
            for (var bx = 0; bx < sel.perRow; bx++) placeBogen(nutzenGrp, bx, by);
        }
        gesetzt = vollBZ * sel.bRows * sel.plz;

        // letzte Bogenzeile: ist sie komplett voll, als Boegen setzen,
        // sonst motivweise (angebrochene Boegen bleiben teilbelegt)
        var restCount = sel.buildCount - gesetzt;
        var yBase     = vollBZ * (sel.bh + gB);
        if (restCount === sel.bRows * sel.plz) {
            for (var bx2 = 0; bx2 < sel.perRow; bx2++) placeBogen(nutzenGrp, bx2, vollBZ);
        } else {
            for (var k = 0; k < restCount; k++) {
                var zLocal = Math.floor(k / sel.plz);
                var j      = k % sel.plz;
                var bxI    = Math.floor(j / sel.bCols);
                var cxI    = j % sel.bCols;
                placeMotif(nutzenGrp,
                    bxI * (sel.bw + gB) + cxI * sel.stepX,
                    yBase + zLocal * sel.stepY);
            }
        }

        // ---- Geometrie pruefen (vor breakLink) -----------------------
        var nbChk = nutzenGrp.geometricBounds;
        var realW = toMm(nbChk[2] - nbChk[0]) - mOff.l - mOff.r;
        var realH = toMm(nbChk[1] - nbChk[3]) - mOff.t - mOff.b;
        if (Math.abs(realW - sel.nW) > 0.5)
            warnings.push("Nutzenbreite gemessen " + r1(realW) + " mm, berechnet " + r1(sel.nW) + " mm.");
        if (Math.abs(realH - sel.nH) > 0.5)
            warnings.push("Nutzenh\xF6he gemessen " + r1(realH) + " mm, berechnet " + r1(sel.nH) + " mm.");
        if (sel.nW + OPOS_RAND_W > params.med + 0.01)
            warnings.push("Nutzen " + r1(sel.nW + OPOS_RAND_W) + " mm breiter als das Medium ("
                + params.med + " mm).");

        // ---- Symbol-Links aufloesen ----------------------------------
        (function breakLinks(grp) {
            if (grp.symbolItems) {
                for (var i = grp.symbolItems.length - 1; i >= 0; i--) {
                    try { grp.symbolItems[i].breakLink(); } catch (_) {}
                }
            }
            if (grp.groupItems) {
                for (var j2 = 0; j2 < grp.groupItems.length; j2++) breakLinks(grp.groupItems[j2]);
            }
        })(nutzenGrp);

        try { bogenSym.remove(); } catch (_) {}
        try { motifSym.remove(); } catch (_) {}

        for (var ci = ly1.pageItems.length - 1; ci >= 0; ci--) {
            if (ly1.pageItems[ci] !== nutzenGrp) {
                try { ly1.pageItems[ci].remove(); } catch (_) {}
            }
        }

        // ---- Zeichenflaeche ------------------------------------------
        var artW = toPt(sel.nW + OPOS_RAND_W);
        var artH = toPt(sel.nH + OPOS_RAND_H);
        var abI  = doc.artboards.getActiveArtboardIndex();
        doc.artboards[abI].artboardRect = [0, artH, artW, 0];

        var abR  = doc.artboards[abI].artboardRect;
        var abW  = abR[2] - abR[0];
        var abHt = abR[1] - abR[3];
        var nb   = nutzenGrp.geometricBounds;
        var cutLeft = nb[0] + toPt(mOff.l);
        var cutTop  = nb[1] - toPt(mOff.t);
        nutzenGrp.translate(
            abR[0] + (abW  - toPt(sel.nW)) / 2 - cutLeft,
            abR[1] - (abHt - toPt(sel.nH)) / 2 - cutTop
        );

        // ---- Ebene "Cut" ---------------------------------------------
        var lyCut = doc.layers.add();
        lyCut.name = "Cut";
        var cutGrp = lyCut.groupItems.add();
        cutGrp.name = "Cutkonturen";

        (function collectCuts(container) {
            var i;
            for (i = container.pathItems.length - 1; i >= 0; i--) {
                if (isCutItem(container.pathItems[i]))
                    container.pathItems[i].move(cutGrp, ElementPlacement.PLACEATBEGINNING);
            }
            for (i = container.compoundPathItems.length - 1; i >= 0; i--) {
                if (isCutItem(container.compoundPathItems[i]))
                    container.compoundPathItems[i].move(cutGrp, ElementPlacement.PLACEATBEGINNING);
            }
            for (i = container.groupItems.length - 1; i >= 0; i--) collectCuts(container.groupItems[i]);
        })(nutzenGrp);

        ly1.name = "Druck";

        var sollCut = sel.buildCount * cutPerMotif.n;
        var istCut  = cutGrp.pageItems.length;
        if (cutPerMotif.n === 0) {
            warnings.push("Keine Cutkontur im Motiv \u2013 Ebene \u201ECut\u201C ist leer.");
        } else if (istCut !== sollCut) {
            warnings.push("Cutkonturen: " + istCut + " statt " + sollCut + ".");
        }

        // ---- Ebene "Info" --------------------------------------------
        var lyInfo = doc.layers.add();
        lyInfo.name      = "Info";
        lyInfo.printable = false;

        var sep = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
        var infoLines = [
            "=== NUTZEN-INFO ===",
            "Motiv (Cutkontur): " + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm"
                + (sel.rotM ? "  \u2013 90\xB0 gedreht" : ""),
            "Anschnitt:         max. " + r1(bleedMax) + " mm",
            sep,
            "Bogen:             " + sel.bCols + " \xD7 " + sel.bRows + " Motive = "
                + r1(sel.bw) + " \xD7 " + r1(sel.bh) + " mm Raster"
                + (sel.bQuer ? "  \u2013 quer" : ""),
            "Bogen-Au\xDFenma\xDF:    " + r1(sel.outW) + " \xD7 " + r1(sel.outH) + " mm  (~" + fmtLbl + ")",
            "Schnitt:           mittig zwischen den B\xF6gen, " + (gB / 2) + " mm je Seite",
            sep,
            "Nutzen:            " + r1(sel.nW) + " \xD7 " + r1(sel.nH) + " mm",
            "F\xFCllung:           " + sel.perRow + " B\xF6gen \xD7 " + sel.bCols + " = "
                + sel.plz + " Pl\xE4tze je Motivzeile",
            "                   " + sel.Tz + " Motivzeile(n) in " + sel.BZ + " Bogenzeile(n)",
            "Motive im Nutzen:  " + sel.buildCount,
            "B\xF6gen gesamt:      " + sel.boegen,
            "Ben\xF6tigt:          " + cnt + " Stk.",
            sep
        ];
        if (sel.prints > 1) {
            infoLines.push("Drucke:            " + sel.prints + "\xD7");
            infoLines.push("                   " + (sel.prints - 1) + "\xD7 voll ("
                + sel.buildBZ + " Bogenzeilen)");
            infoLines.push("                   1\xD7 mit " + sel.lastBZ + " Bogenzeile(n) / "
                + sel.lastTz + " Motivzeile(n)");
            infoLines.push("                   \u2192 im letzten Druck den Rest unten l\xF6schen");
        } else {
            infoLines.push("Drucke:            1\xD7");
            infoLines.push("Letzte Motivzeile: " + (sel.fillLast
                ? "voll aufgef\xFCllt"
                : sel.restM + " von " + sel.plz + " Pl\xE4tzen belegt"));
        }
        infoLines.push("Produziert:        " + sel.pieces + " Stk."
            + (sel.over > 0 ? "  \u2192  " + sel.over + " Stk. \xDCberproduktion" : "  \u2192  exakt"));
        infoLines.push("Materiall\xE4nge:     " + r2(sel.len / 1000) + " m (inkl. OPOS-Rand)");
        infoLines.push(sep);
        infoLines.push("Medienbreite:      " + params.med + " mm");
        infoLines.push("Abst\xE4nde:          Motive " + r1(gM) + " mm | B\xF6gen " + gB + " mm");
        infoLines.push("Erstellt:          " + new Date().toLocaleString());

        // Infotext UNTERHALB der Zeichenflaeche - nie innerhalb.
        var tf = lyInfo.textFrames.add();
        tf.contents = infoLines.join("\n");
        tf.position = [abR[0] + toPt(5), abR[3] - toPt(8)];
        lyInfo.locked = true;

        if (warnings.length > 0) {
            alert("Nutzen aufgebaut, aber die Pr\xFCfung meldet:\n\n\u2022 "
                + warnings.join("\n\u2022 ")
                + "\n\nBitte vor dem Druck kontrollieren.");
        }

        // ---- Auswahl setzen & OPOS starten ---------------------------
        // OPOS richtet die Marken an der AUSWAHL aus, deshalb wird sie
        // explizit auf Druck + Cut gesetzt. "Alles auswaehlen" nimmt den
        // Infotext mit - die Ebenensperre haelt ihn nicht zuverlaessig
        // heraus, und der Text liegt unterhalb der Zeichenflaeche.
        doc.activeLayer = ly1;
        app.redraw();

        var selArr = [nutzenGrp];
        if (cutGrp.pageItems.length > 0) selArr.push(cutGrp);
        var selOk = false;
        try {
            doc.selection = null;
            doc.selection = selArr;
            selOk = (doc.selection && doc.selection.length === selArr.length);
        } catch (_) { selOk = false; }

        if (!selOk) {
            // Fallback: alles auswaehlen, Infotext gezielt abwaehlen
            try {
                doc.selection = null;
                app.executeMenuCommand("selectall");
                lyInfo.locked = false;
                tf.selected = false;
                lyInfo.locked = true;
            } catch (_) {}
        }

        // Kontrolle: nichts aus der Info-Ebene darf in der Auswahl sein
        try {
            var bad = 0;
            for (var sc = 0; sc < doc.selection.length; sc++) {
                if (doc.selection[sc].layer === lyInfo) bad++;
            }
            if (bad > 0) {
                alert("Achtung: " + bad + " Objekt(e) der Info-Ebene sind noch\n"
                    + "ausgew\xE4hlt. Vor dem OPOS-Lauf abw\xE4hlen, sonst sitzen\n"
                    + "die Marken falsch.");
            }
        } catch (_) {}
        app.redraw();

        try {
            system.callSystem('/usr/bin/open "/Applications/OPOS.app"');
        } catch (e1) {
            try { system.callSystem('/usr/bin/open -a "OPOS"'); }
            catch (e2) {
                try {
                    var oposFolder = new Folder('/Applications/OPOS.app');
                    if (oposFolder.exists) oposFolder.execute();
                } catch (e3) {}
            }
        }

    } catch (err) {
        alert("Fehler: " + (err.message || err));
    }

})();
