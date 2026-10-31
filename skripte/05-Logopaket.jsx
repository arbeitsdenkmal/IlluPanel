#target illustrator
// Logopaket.jsx – print and more
// Erstellt aus der geöffneten CMYK-Logodatei (genau eine Zeichenfläche = Exportgröße inkl. Schutzzone)
// ein Logopaket auf dem Schreibtisch:
//
//   <Kunde>_Logopaket/
//     Logo.ai
//     CMYK/  <Kunde>_Logo_CMYK.pdf   (PDF/X-4)
//            <Kunde>_Logo_CMYK.eps
//     RGB/   <Kunde>_Logo_RGB.pdf    (PDF/X-4)
//            <Kunde>_Logo_RGB.svg
//            PNG/ <Kunde>_Logo_RGB_500px.png, _1500px.png, _3000px.png (lange Kante, transparent)
//
// RGB entsteht durch reines Umschalten des Dokumentfarbmodus, ohne Farbanpassung.
//
// Ablauf in zwei Teilen: Illustrator führt "Dokumentfarbmodus > RGB" aus einem Skript heraus
// asynchron aus. Teil 1 (CMYK) löst deshalb das Umschalten aus und endet; Teil 2 (RGB) wird
// per BridgeTalk nachgelagert gestartet und wartet bei Bedarf, bis das Umschalten fertig ist.

(function () {

    var PNG_SIZES = [500, 1500, 3000];   // Pixel an der langen Kante
    var STEP = "";

    if ($.global.__LOGOPAKET) {
        var p = $.global.__LOGOPAKET;
        $.global.__LOGOPAKET = null;
        runPhase2(p);
    } else {
        runPhase1();
    }


    // =====================================================================
    // Teil 1: Prüfen, Ordner, Logo.ai, CMYK-Exporte, Umschalten auslösen
    // =====================================================================
    function runPhase1() {
        if (app.documents.length === 0) {
            alert("Keine Datei geöffnet.");
            return;
        }
        var doc = app.activeDocument;

        if (doc.documentColorSpace !== DocumentColorSpace.CMYK) {
            alert("Die Datei ist nicht im CMYK-Modus. Abbruch.");
            return;
        }
        if (doc.artboards.length !== 1) {
            alert("Die Datei hat " + doc.artboards.length + " Zeichenflächen, erwartet wird genau eine. Abbruch.");
            return;
        }
        if (doc.textFrames.length > 0) {
            if (!confirm("Die Datei enthält " + doc.textFrames.length +
                         " Textobjekt(e), die nicht in Pfade umgewandelt sind.\n\nTrotzdem fortfahren?")) {
                return;
            }
        }
        if (!findPdfX4Preset()) {
            alert("Keine PDF/X-4-Vorgabe in Illustrator gefunden. Abbruch.");
            return;
        }

        var kunde = askCustomer();
        if (kunde === null) return;

        var ctx = makeCtx(Folder.desktop.fsName + "/" + kunde + "_Logopaket", kunde + "_Logo");

        if (ctx.root.exists) {
            if (!confirm("Der Ordner \"" + kunde + "_Logopaket\" existiert bereits auf dem Schreibtisch.\n\n" +
                         "Vorhandene Dateien überschreiben?")) {
                return;
            }
        }
        var dirs = [ctx.root, ctx.cmykDir, ctx.rgbDir, ctx.pngDir, ctx.tmpDir];
        for (var d = 0; d < dirs.length; d++) {
            if (!dirs[d].exists && !dirs[d].create()) {
                alert("Ordner konnte nicht angelegt werden:\n" + dirs[d].fsName);
                return;
            }
        }

        var aiSaved = false;
        var oldUIL = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        try {
            STEP = "Logo.ai speichern";
            doc.saveAs(ctx.aiFile, aiOptions());
            aiSaved = true;

            STEP = "CMYK-PDF";
            doc.saveAs(new File(ctx.cmykDir.fsName + "/" + ctx.name + "_CMYK.pdf"), pdfOptions(findPdfX4Preset()));

            STEP = "CMYK-EPS";
            saveEPS(doc, ctx.tmpDir, new File(ctx.cmykDir.fsName + "/" + ctx.name + "_CMYK.eps"));

            // Logo.ai frisch öffnen und Umschalten auslösen
            STEP = "Umschalten auf RGB";
            doc.close(SaveOptions.DONOTSAVECHANGES);
            doc = app.open(ctx.aiFile);
            doc.activate();
            app.redraw();
            app.executeMenuCommand("doc-color-rgb");

            // Illustrator schaltet asynchron um: ab hier das Dokument nicht mehr anfassen,
            // Skript beenden und Teil 2 nachgelagert starten
            app.userInteractionLevel = oldUIL;
            schedulePhase2(ctx, 1);

        } catch (e) {
            fail(e, ctx, aiSaved, oldUIL);
        }
    }


    // =====================================================================
    // Teil 2: läuft nach Skriptende von Teil 1, Dokument ist jetzt RGB
    // =====================================================================
    function runPhase2(p) {
        var ctx = makeCtx(p.base, p.name);
        var attempt = p.attempt || 1;
        var oldUIL = app.userInteractionLevel;
        STEP = "Umschalten auf RGB (Teil 2, Versuch " + attempt + ")";
        try {
            // Umschalten evtl. noch nicht fertig -> kurz warten und erneut ansetzen
            if (!rgbReady()) {
                if (attempt < 10) {
                    $.sleep(500);
                    schedulePhase2(ctx, attempt + 1);
                    return;
                }
                if (app.documents.length === 0) throw new Error("Kein Dokument mehr geöffnet.");
                throw new Error("Farbmodus wurde auch nach Skriptende nicht auf RGB umgeschaltet.\n" +
                                "Aktives Dokument: " + app.activeDocument.name);
            }
            var doc = app.activeDocument;

            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
            exportRGB(doc, ctx);
            finish(doc, ctx, oldUIL);
        } catch (e) {
            fail(e, ctx, true, oldUIL);
        }
    }


    // =====================================================================
    // Gemeinsame Abläufe
    // =====================================================================
    function makeCtx(base, name) {
        return {
            base:    base,
            name:    name,
            root:    new Folder(base),
            cmykDir: new Folder(base + "/CMYK"),
            rgbDir:  new Folder(base + "/RGB"),
            pngDir:  new Folder(base + "/RGB/PNG"),
            tmpDir:  new Folder(base + "/_tmp"),
            aiFile:  new File(base + "/Logo.ai")
        };
    }

    function exportRGB(doc, ctx) {
        var ab = doc.artboards[0].artboardRect;           // [links, oben, rechts, unten]
        var landscape = (ab[2] - ab[0]) >= (ab[1] - ab[3]);

        STEP = "RGB-PDF";
        doc.saveAs(new File(ctx.rgbDir.fsName + "/" + ctx.name + "_RGB.pdf"), pdfOptions(findPdfX4Preset()));

        STEP = "SVG";
        exportScreens(doc, ExportForScreensType.SE_SVG, svgOptions(), ctx.tmpDir,
                      new File(ctx.rgbDir.fsName + "/" + ctx.name + "_RGB.svg"), /\.svg$/i);

        for (var i = 0; i < PNG_SIZES.length; i++) {
            STEP = "PNG " + PNG_SIZES[i] + " px";
            exportScreens(doc, ExportForScreensType.SE_PNG24, pngOptions(PNG_SIZES[i], landscape), ctx.tmpDir,
                          new File(ctx.pngDir.fsName + "/" + ctx.name + "_RGB_" + PNG_SIZES[i] + "px.png"), /\.png$/i);
        }
    }

    // RGB-Zustand verwerfen, aufräumen, Logo.ai (CMYK) wieder öffnen
    function finish(doc, ctx, oldUIL) {
        STEP = "Abschluss";
        doc.close(SaveOptions.DONOTSAVECHANGES);
        removeFolder(ctx.tmpDir);
        app.open(ctx.aiFile);
        app.userInteractionLevel = oldUIL;
        alert("Logopaket erstellt:\n" + ctx.root.fsName);
    }

    function fail(e, ctx, aiSaved, oldUIL) {
        app.userInteractionLevel = oldUIL;
        if (aiSaved) {
            // Offenes Dokument ist evtl. schon RGB bzw. zeigt auf eine Exportdatei – verwerfen, Logo.ai öffnen
            try { app.activeDocument.close(SaveOptions.DONOTSAVECHANGES); } catch (x) {}
            try { removeFolder(ctx.tmpDir); } catch (x) {}
            try { app.open(ctx.aiFile); } catch (x) {}
        }
        alert("Fehler bei: " + STEP + "\n\n" + e.message + (e.line ? "\n(Skriptzeile " + e.line + ")" : ""));
    }

    function rgbReady() {
        try {
            if (app.documents.length === 0) return false;
            var doc = app.activeDocument;
            if (doc.name !== "Logo.ai") return false;
            return isRGB(doc);
        } catch (e) {
            return false;
        }
    }

    function schedulePhase2(ctx, attempt) {
        var me = new File($.fileName);
        var bt = new BridgeTalk();
        bt.target = BridgeTalk.appSpecifier;
        bt.body = "$.global.__LOGOPAKET = { base: decodeURIComponent('" + enc(ctx.base) + "'), " +
                  "name: decodeURIComponent('" + enc(ctx.name) + "'), attempt: " + attempt + " };" +
                  "$.evalFile(new File(decodeURIComponent('" + enc(me.fsName) + "')));";
        bt.onError = function (m) {
            alert("Teil 2 (RGB) konnte nicht gestartet werden:\n" + m.body);
        };
        bt.send();
    }

    function enc(s) {
        return encodeURIComponent(s).replace(/'/g, "%27");
    }

    // Echter Farbmodus: documentColorSpace allein ist nach dem Menübefehl nicht verlässlich.
    // Testobjekt mit CMYK-Fläche anlegen – im RGB-Dokument liest Illustrator sie als RGBColor zurück.
    function isRGB(doc) {
        if (doc.documentColorSpace === DocumentColorSpace.RGB) return true;
        var lay = doc.layers.add();
        var r = lay.pathItems.rectangle(0, 0, 1, 1);
        var c = new CMYKColor();
        c.cyan = 100; c.magenta = 0; c.yellow = 0; c.black = 0;
        r.stroked = false;
        r.filled = true;
        r.fillColor = c;
        var t = r.fillColor.typename;
        lay.remove();
        return t === "RGBColor";
    }


    // =====================================================================
    // Hilfsfunktionen
    // =====================================================================
    function askCustomer() {
        var w = new Window("dialog", "Logopaket erstellen");
        w.orientation = "column";
        w.alignChildren = "fill";
        w.add("statictext", undefined, "Kundenname:");
        var et = w.add("edittext", undefined, "");
        et.characters = 32;
        et.active = true;
        var g = w.add("group");
        g.alignment = "right";
        g.add("button", undefined, "Abbrechen", { name: "cancel" });
        var ok = g.add("button", undefined, "OK", { name: "ok" });
        ok.onClick = function () {
            if (!cleanName(et.text)) {
                alert("Bitte einen Kundennamen eingeben.");
                return;
            }
            w.close(1);
        };
        if (w.show() !== 1) return null;
        return cleanName(et.text);
    }

    // Umlaute ersetzen, unzulässige Zeichen entfernen, Leerzeichen -> _
    function cleanName(s) {
        s = String(s).replace(/^\s+|\s+$/g, "");
        s = s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
             .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");
        s = s.replace(/[\\\/:\*\?"<>\|']/g, "");
        s = s.replace(/\s+/g, "_");
        return s;
    }

    function findPdfX4Preset() {
        var list = app.PDFPresetsList, alt = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i] === "[PDF/X-4:2008]") return list[i];
            if (!alt && /PDF\/X-4/i.test(list[i])) alt = list[i];
        }
        return alt;
    }

    function aiOptions() {
        var o = new IllustratorSaveOptions();
        o.pdfCompatible = true;
        o.embedICCProfile = true;
        o.compressed = true;
        return o;
    }

    function pdfOptions(preset) {
        var o = new PDFSaveOptions();
        o.pDFPreset = preset;
        o.colorConversionID = ColorConversion.None;   // keine Farbkonvertierung beim PDF-Export
        o.preserveEditability = false;
        o.viewAfterSaving = false;
        o.artboardRange = "1";
        return o;
    }

    // EPS mit Zeichenfläche als Begrenzung; Illustrator benennt dabei selbst, daher Umweg über _tmp
    function saveEPS(doc, tmpDir, target) {
        emptyFolder(tmpDir);
        var o = new EPSSaveOptions();
        o.cmykPostScript = true;
        o.embedAllFonts = true;
        o.embedLinkedFiles = true;
        o.includeDocumentThumbnails = true;
        o.preview = EPSPreview.TRANSPARENTCOLORTIFF;
        o.saveMultipleArtboards = true;
        o.artboardRange = "1";
        doc.saveAs(new File(tmpDir.fsName + "/lp.eps"), o);

        var files = findFiles(tmpDir, /\.eps$/i), f = null;
        if (files.length === 1) {
            f = files[0];
        } else {
            for (var i = 0; i < files.length; i++) {
                if (decodeURI(files[i].name) !== "lp.eps") { f = files[i]; break; }
            }
        }
        if (!f) throw new Error("EPS-Datei nicht gefunden.");
        copyTo(f, target);
    }

    function svgOptions() {
        var o = new ExportForScreensOptionsWebOptimizedSVG();
        o.coordinatePrecision = 3;
        o.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
        o.fontType = SVGFontType.OUTLINEFONT;
        o.rasterImageLocation = RasterImageLocation.EMBED;
        o.svgId = SVGIdType.SVGIDMINIMAL;
        o.svgMinify = false;
        o.svgResponsive = false;
        return o;
    }

    function pngOptions(px, landscape) {
        var o = new ExportForScreensOptionsPNG24();
        o.antiAliasing = AntiAliasingMethod.ARTOPTIMIZED;
        o.backgroundBlack = false;
        o.interlaced = false;
        o.transparentBackground = true;
        o.scaleType = landscape ? ExportForScreensScaleType.SCALEBYWIDTH
                                : ExportForScreensScaleType.SCALEBYHEIGHT;
        o.scaleTypeValue = px;
        return o;
    }

    // "Exportieren für Bildschirme" in _tmp, Ergebnis suchen und unter Zielnamen ablegen
    function exportScreens(doc, type, opts, tmpDir, target, extRe) {
        emptyFolder(tmpDir);
        var item = new ExportForScreensItemToExport();
        item.artboards = "1";
        item.document = false;
        doc.exportForScreens(tmpDir, type, opts, item, "lp_");
        var files = findFiles(tmpDir, extRe);
        if (files.length < 1) throw new Error("Exportdatei nicht gefunden.");
        copyTo(files[0], target);
    }

    function copyTo(src, target) {
        if (target.exists) target.remove();
        if (!src.copy(target.fsName)) throw new Error("Kopieren fehlgeschlagen: " + target.fsName);
    }

    function findFiles(folder, re) {
        var out = [], items = folder.getFiles();
        for (var i = 0; i < items.length; i++) {
            if (items[i] instanceof Folder) {
                out = out.concat(findFiles(items[i], re));
            } else if (re.test(decodeURI(items[i].name))) {
                out.push(items[i]);
            }
        }
        return out;
    }

    function emptyFolder(folder) {
        if (!folder.exists) return;
        var items = folder.getFiles();
        for (var i = 0; i < items.length; i++) {
            if (items[i] instanceof Folder) {
                emptyFolder(items[i]);
                items[i].remove();
            } else {
                items[i].remove();
            }
        }
    }

    function removeFolder(folder) {
        emptyFolder(folder);
        folder.remove();
    }

})();
