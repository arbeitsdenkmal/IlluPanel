#target illustrator
(function () {

    // ================================================================
    // NUTZEN SPEICHERN  -  nach dem OPOS-Lauf ausfuehren
    // ================================================================
    // Legt auf dem Schreibtisch den Ordner
    //     KUNDE_JJJJ-MM_PRODUKT
    // an und speichert dort:
    //     Nutzen NN_druck.pdf   (Cut-Ebene aus, Regmark an)
    //     Nutzen NN_cut.pdf     (Druck-Ebene aus, Regmark an)
    //     Arbeitsdaten NN.ai    (alle Ebenen im Ausgangszustand)
    // NN ist die naechste freie Nummer im Zielordner, beginnend bei 01.
    // Beim Hineinspeichern in einen vorhandenen Ordner wird dadurch
    // nichts ueberschrieben, sondern ergaenzt.
    // Die Info-Ebene wird in keinem PDF exportiert.
    // Bricht ab, wenn keine Regmark-Ebene vorhanden ist (OPOS nicht
    // gelaufen) - sonst entstuende eine Druckdatei ohne Marken.
    // ================================================================

    if (app.documents.length === 0) { alert("Kein Dokument ge\xF6ffnet."); return; }
    var doc = app.activeDocument;

    // ----------------------------------------------------------------
    // Ebenen suchen
    // ----------------------------------------------------------------
    function lcName(ly) { return String(ly.name).replace(/^\s+|\s+$/g, "").toLowerCase(); }

    function findLayerExact(n) {
        for (var i = 0; i < doc.layers.length; i++)
            if (lcName(doc.layers[i]) === n) return doc.layers[i];
        return null;
    }
    function findLayerPart(p) {
        for (var i = 0; i < doc.layers.length; i++)
            if (lcName(doc.layers[i]).indexOf(p) !== -1) return doc.layers[i];
        return null;
    }

    var lyDruck = findLayerExact("druck");
    var lyCut   = findLayerExact("cut");
    var lyInfo  = findLayerExact("info");
    var lyReg   = findLayerPart("regmark");
    if (!lyReg) lyReg = findLayerPart("regmarks");

    if (!lyDruck || !lyCut) {
        var miss = [];
        if (!lyDruck) miss.push("Druck");
        if (!lyCut)   miss.push("Cut");
        alert("Ebene(n) nicht gefunden: " + miss.join(", ") + "\n\n"
            + "Dieses Skript erwartet ein Dokument aus dem Nutzen-Generator\n"
            + "mit den Ebenen \u201EDruck\u201C und \u201ECut\u201C.");
        return;
    }

    // ----------------------------------------------------------------
    // Regmark-Pruefung  -  ist OPOS gelaufen?
    // ----------------------------------------------------------------
    if (!lyReg) {
        var wr = new Window("dialog", "Keine Regmark-Ebene");
        wr.orientation = "column";
        wr.alignChildren = ["fill", "top"];
        wr.margins = 16; wr.spacing = 10;
        var tw = wr.add("statictext", undefined,
            "Es gibt keine Ebene mit \u201ERegmark\u201C im Namen.\n\n"
          + "Vermutlich ist OPOS noch nicht gelaufen. Ohne Marken ist die\n"
          + "Druckdatei unbrauchbar - der Fehler f\xE4llt erst beim Schneiden auf.",
            { multiline: true });
        tw.preferredSize = [430, 60];
        var gw = wr.add("group");
        gw.alignment = "right"; gw.spacing = 8;
        var bAbb = gw.add("button", undefined, "Abbrechen", { name: "cancel" });
        bAbb.preferredSize = [110, 26];
        var bWei = gw.add("button", undefined, "Trotzdem speichern");
        bWei.preferredSize = [150, 26];
        var goOn = false;
        bWei.onClick = function () { goOn = true; wr.close(1); };
        bAbb.active = true;
        wr.show();
        if (!goOn) return;
    }

    // ----------------------------------------------------------------
    // PDF-Vorgaben einlesen, X-4 vorauswaehlen
    // ----------------------------------------------------------------
    var presets = [];
    try {
        var pl = app.PDFPresetsList;
        for (var pi = 0; pi < pl.length; pi++) presets.push(pl[pi]);
    } catch (_) {}

    var x4Index = -1;
    for (var qi = 0; qi < presets.length; qi++) {
        var pn = String(presets[qi]).toLowerCase().replace(/[\s_]/g, "");
        if (pn.indexOf("x-4") !== -1 || pn.indexOf("x4") !== -1) { x4Index = qi; break; }
    }

    // ----------------------------------------------------------------
    // DIALOG  -  Kunde, Produkt, Vorgabe
    // ----------------------------------------------------------------
    var d = new Date();
    var mo = d.getMonth() + 1;
    var ym = d.getFullYear() + "-" + (mo < 10 ? "0" : "") + mo;

    var w = new Window("dialog", "Nutzen speichern");
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];
    w.margins = 18; w.spacing = 10;

    function row(parent, label, def) {
        var g = parent.add("group");
        g.orientation = "row";
        g.alignChildren = ["left", "center"];
        g.spacing = 10;
        var st = g.add("statictext", undefined, label);
        st.preferredSize = [110, 22];
        var et = g.add("edittext", undefined, def || "");
        et.preferredSize = [300, 22];
        return et;
    }

    var pA = w.add("panel", undefined, "Auftrag");
    pA.orientation = "column";
    pA.alignChildren = ["fill", "top"];
    pA.margins = [14, 20, 14, 14]; pA.spacing = 8;
    var eKunde = row(pA, "Kundenname:", "");
    var eProd  = row(pA, "Produkt:", "");

    var stPfad = pA.add("statictext", undefined, "", { truncate: "middle" });
    stPfad.preferredSize = [420, 20];

    var pP = w.add("panel", undefined, "PDF-Vorgabe");
    pP.orientation = "column";
    pP.alignChildren = ["fill", "top"];
    pP.margins = [14, 20, 14, 14]; pP.spacing = 6;
    var ddP = pP.add("dropdownlist", undefined, presets);
    ddP.preferredSize = [420, 24];
    if (x4Index >= 0) ddP.selection = x4Index;
    else if (presets.length > 0) ddP.selection = 0;
    if (x4Index < 0) {
        pP.add("statictext", undefined,
            "Keine PDF/X-4-Vorgabe gefunden - bitte passende Vorgabe w\xE4hlen.");
    }

    function clean(s) {
        s = String(s).replace(/^\s+|\s+$/g, "");
        s = s.replace(/[\/\\:\*\?"<>\|]/g, "");
        s = s.replace(/\s+/g, " ");
        return s;
    }
    function folderName() {
        return clean(eKunde.text) + "_" + ym + "_" + clean(eProd.text);
    }
    function refreshPath() {
        var k = clean(eKunde.text), p = clean(eProd.text);
        stPfad.text = (k === "" || p === "")
            ? "Ordner: (Kundenname und Produkt eingeben)"
            : "Ordner: " + folderName();
    }
    eKunde.onChanging = refreshPath;
    eProd.onChanging  = refreshPath;
    refreshPath();

    var gb = w.add("group");
    gb.alignment = "right"; gb.spacing = 8;
    var bC = gb.add("button", undefined, "Abbrechen", { name: "cancel" });
    bC.preferredSize = [100, 26];
    var bO = gb.add("button", undefined, "Speichern", { name: "ok" });
    bO.preferredSize = [110, 26];
    bO.active = true;

    var params = null;
    bO.onClick = function () {
        var k = clean(eKunde.text), p = clean(eProd.text);
        if (k === "" || p === "") { alert("Kundenname und Produkt ausf\xFCllen."); return; }
        if (!ddP.selection) { alert("Bitte eine PDF-Vorgabe w\xE4hlen."); return; }
        params = { folder: folderName(), preset: String(ddP.selection.text) };
        w.close(1);
    };
    if (w.show() !== 1) return;

    // ----------------------------------------------------------------
    // Zielordner  -  bei Kollision nachfragen
    // ----------------------------------------------------------------
    var basePath = Folder.desktop.fsName + "/" + params.folder;
    var target   = new Folder(basePath);

    if (target.exists) {
        var wc = new Window("dialog", "Ordner existiert bereits");
        wc.orientation = "column";
        wc.alignChildren = ["fill", "top"];
        wc.margins = 16; wc.spacing = 10;
        var tc = wc.add("statictext", undefined,
            "Der Ordner \u201E" + params.folder + "\u201C liegt schon auf dem Schreibtisch.\n"
          + "Beim Hineinspeichern wird nichts \u00FCberschrieben \u2013 die neuen\n"
          + "Dateien bekommen die n\u00E4chste freie Nummer.",
            { multiline: true });
        tc.preferredSize = [430, 56];
        var gc = wc.add("group");
        gc.alignment = "right"; gc.spacing = 8;
        var cAbb = gc.add("button", undefined, "Abbrechen", { name: "cancel" });
        cAbb.preferredSize = [100, 26];
        var cNeu = gc.add("button", undefined, "Neuer Ordner (_2)");
        cNeu.preferredSize = [150, 26];
        var cRein = gc.add("button", undefined, "Hineinspeichern");
        cRein.preferredSize = [140, 26];
        var mode = null;
        cNeu.onClick  = function () { mode = "neu";  wc.close(1); };
        cRein.onClick = function () { mode = "rein"; wc.close(1); };
        wc.show();
        if (!mode) return;

        if (mode === "neu") {
            var n = 2;
            while (new Folder(basePath + "_" + n).exists) n++;
            target = new Folder(basePath + "_" + n);
        }
    }

    if (!target.exists && !target.create()) {
        alert("Ordner konnte nicht angelegt werden:\n" + target.fsName);
        return;
    }

    // ----------------------------------------------------------------
    // Ebenenzustand sichern
    // ----------------------------------------------------------------
    var states = [];
    for (var li = 0; li < doc.layers.length; li++) {
        states.push({ ly: doc.layers[li],
                      vis: doc.layers[li].visible,
                      lck: doc.layers[li].locked });
    }
    function setLayer(ly, vis) {
        if (!ly) return;
        try { ly.locked = false; } catch (_) {}
        try { ly.visible = vis; } catch (_) {}
    }
    function restoreLayers() {
        for (var i = 0; i < states.length; i++) {
            try { states[i].ly.locked  = false; } catch (_) {}
            try { states[i].ly.visible = states[i].vis; } catch (_) {}
            try { states[i].ly.locked  = states[i].lck; } catch (_) {}
        }
    }

    // ----------------------------------------------------------------
    // Speichern
    // ----------------------------------------------------------------
    // ----------------------------------------------------------------
    // Naechste freie Nummer im Zielordner
    // ----------------------------------------------------------------
    function zweistellig(n) {
        return (n < 10) ? ("0" + n) : String(n);
    }

    function naechsteNummer(ordner) {
        var n = 1;
        while (n < 1000) {
            var nn = zweistellig(n);
            var belegt =
                new File(ordner.fsName + "/Arbeitsdaten " + nn + ".ai").exists ||
                new File(ordner.fsName + "/Nutzen " + nn + "_druck.pdf").exists ||
                new File(ordner.fsName + "/Nutzen " + nn + "_cut.pdf").exists;
            if (!belegt) return nn;
            n++;
        }
        return zweistellig(n);
    }

    var nummer = naechsteNummer(target);

    var written = [];
    var oldUI = app.userInteractionLevel;

    function savePDF(fileName) {
        var f = new File(target.fsName + "/" + fileName);
        var o = new PDFSaveOptions();
        try { o.pDFPreset = params.preset; } catch (_) {}
        try { o.viewAfterSaving = false; } catch (_) {}
        doc.saveAs(f, o);
        written.push(fileName);
    }

    try {
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        // --- Nutzen_druck: Cut aus, Info aus, Regmark an -------------
        setLayer(lyDruck, true);
        setLayer(lyCut,   false);
        setLayer(lyInfo,  false);
        setLayer(lyReg,   true);
        doc.activeLayer = lyDruck;
        app.redraw();
        savePDF("Nutzen " + nummer + "_druck.pdf");

        // --- Nutzen_cut: Druck aus, Info aus, Regmark an -------------
        setLayer(lyCut,   true);
        setLayer(lyDruck, false);
        setLayer(lyInfo,  false);
        setLayer(lyReg,   true);
        doc.activeLayer = lyCut;
        app.redraw();
        savePDF("Nutzen " + nummer + "_cut.pdf");

        // --- Arbeitsdaten.ai: Ausgangszustand, zuletzt --------------
        // zuletzt, damit das offene Dokument danach mit der .ai
        // verknuepft ist und nicht mit einem der PDFs
        restoreLayers();
        app.redraw();
        var aiName = "Arbeitsdaten " + nummer + ".ai";
        var aiFile = new File(target.fsName + "/" + aiName);
        var aiOpt  = new IllustratorSaveOptions();
        try { aiOpt.pdfCompatible = true; } catch (_) {}
        doc.saveAs(aiFile, aiOpt);
        written.push(aiName);

        app.userInteractionLevel = oldUI;

        alert("Gespeichert in:\n" + target.fsName + "\n\n\u2022 " + written.join("\n\u2022 ")
            + (lyReg ? "" : "\n\nACHTUNG: ohne Regmark-Ebene gespeichert."));

    } catch (err) {
        try { app.userInteractionLevel = oldUI; } catch (_) {}
        restoreLayers();
        alert("Fehler beim Speichern: " + (err.message || err)
            + (written.length ? "\n\nBereits geschrieben:\n\u2022 " + written.join("\n\u2022 ") : ""));
    }

})();
