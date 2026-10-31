// Test-Hilfsfunktionen des Gesamtlaufs (tests/illustrator), per osascript in Illustrators Skript-Umgebung geladen (ohne JSX-Kern). Maße in Dokument-mm,
// Lage ab der linken oberen Ecke von Zeichenfläche 1. Öffnen und Speichern nur unter tests/out.
var TH = { stand: $.global.TH_STAND || "" };
(function () {
    var MM = 72 / 25.4;
    var OUT = "/tests/out/";
    function q(t) { return '"' + String(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\u0000-\u001f]/g, function (c) { return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); }) + '"'; }
    function st(v) {
        if (v === null || v === undefined) return "null";
        if (typeof v === "number") return isFinite(v) ? String(v) : "null";
        if (typeof v === "boolean") return String(v);
        if (typeof v === "string") return q(v);
        if (v instanceof Array) { var a = []; for (var i = 0; i < v.length; i++) a.push(st(v[i])); return "[" + a.join(",") + "]"; }
        var o = []; for (var k in v) if (v.hasOwnProperty(k) && typeof v[k] !== "function") o.push(q(k) + ":" + st(v[k]));
        return "{" + o.join(",") + "}";
    }
    function ok(o) { o = o || {}; o.ok = true; return st(o); }
    function wrap(fn) { return function () { try { return fn.apply(null, arguments); } catch (e) { return st({ ok: false, error: String(e) + " (Zeile " + e.line + ")" }); } }; }
    // ungespeichert: Illustrator liefert „/Unbenannt-n“ bzw. „/Untitled“ ohne Datei -> ""
    function pfadVon(d) { try { var f = new File(d.fullName); return f.exists ? f.fsName : ""; } catch (e) { return ""; } }
    function r2(v) { return Math.round(v * 100) / 100; }
    // ungespeicherte Dokumente heißen im Skript alle „Untitled“ (Fenstertitel „Unbenannt-n“): Druckbögen über „bogen:<Schlüssel>“ aus dem XMP
    function bogenSchluessel(d) {
        var t = xmpText(d), x;
        try { x = t ? eval("(" + t + ")") : null; } catch (e) { x = null; }
        return x && x.rolle === "druckbogen" && x.bogen ? [x.bogen.aufbau, x.bogen.art, x.bogen.medium, x.bogen.laminat, x.bogen.breite_mm, x.bogen.nr].join("|") : "";
    }
    function dokVon(name) {
        if (!name) return app.activeDocument;
        var b = String(name).indexOf("bogen:") === 0 ? String(name).substr(6) : null;
        for (var i = 0; i < app.documents.length; i++) { var d = app.documents[i]; if (b !== null ? bogenSchluessel(d) === b : (d.name === name || pfadVon(d) === name)) return d; }
        throw "Dokument nicht offen: " + name;
    }
    function nurOut(p) { if (String(p).indexOf(OUT) < 0) throw "nur unter tests/out: " + p; }
    function tags(it) { var o = {}; try { for (var i = 0; i < it.tags.length; i++) o[it.tags[i].name] = it.tags[i].value; } catch (e) { } return o; }
    function mm(b) { return [r2(b[0] / MM), r2(b[1] / MM), r2(b[2] / MM), r2(b[3] / MM)]; }
    function xmpText(d) {
        if (typeof XMPMeta === "undefined") new ExternalObject("lib:AdobeXMPScript");
        var ns = "http://ns.pam-nm.de/illupanels/2.0/", x = new XMPMeta(d.XMPString), p = x.getProperty(ns, "Dokument");
        return p ? String(p.value) : null;
    }

    TH.dokumente = wrap(function () {
        var r = [];
        for (var i = 0; i < app.documents.length; i++) { var d = app.documents[i]; r.push({ name: d.name, pfad: pfadVon(d), gespeichert: d.saved, vorn: d === app.activeDocument, xmp: xmpText(d), bogen: bogenSchluessel(d) }); }
        return ok({ dokumente: r });
    });
    TH.xmp = wrap(function (name) { if (!app.documents.length) return ok({ text: null }); return ok({ text: xmpText(dokVon(name)) }); });
    // Ebenen (oberste zuerst), Zeichenflächen in mm, aktive Ebene, Anzahl der Objekte je Ebene
    TH.dok = wrap(function (name) {
        if (!app.documents.length) return ok({ hatDokument: false });
        var d = dokVon(name), e = [], z = [];
        for (var i = 0; i < d.layers.length; i++) { var L = d.layers[i]; e.push({ name: L.name, gesperrt: L.locked, sichtbar: L.visible, druckend: L.printable, objekte: L.pageItems.length, unterebenen: L.layers.length }); }
        for (var k = 0; k < d.artboards.length; k++) { var a = d.artboards[k].artboardRect; z.push({ name: d.artboards[k].name, breite: r2((a[2] - a[0]) / MM), hoehe: r2((a[1] - a[3]) / MM), rect: mm(a) }); }
        return ok({ hatDokument: true, name: d.name, pfad: pfadVon(d), gespeichert: d.saved, ebenen: e, zf: z, aktiveEbene: d.activeLayer.name, farbraum: String(d.documentColorSpace), xmp: xmpText(d), auswahl: d.selection ? d.selection.length : 0 });
    });
    // oberste Objekte je Ebene (rekursiv über Unterebenen nur mit tief) mit Name, Typ, Tags, sichtbarer Begrenzung in mm
    TH.objekte = wrap(function (name, ebene) {
        var d = dokVon(name), r = [];
        for (var i = 0; i < d.layers.length; i++) {
            var L = d.layers[i]; if (ebene && L.name !== ebene) continue;
            for (var j = 0; j < L.pageItems.length; j++) { var p = L.pageItems[j]; r.push({ ebene: L.name, name: p.name, typ: p.typename, tags: tags(p), vb: mm(p.visibleBounds), gb: mm(p.geometricBounds), symbol: p.typename === "SymbolItem" ? p.symbol.name : null }); }
        }
        return ok({ objekte: r, symbole: d.symbols.length });
    });
    TH.aktivieren = wrap(function (name) { var d = dokVon(name); app.activeDocument = d; return ok({ name: d.name }); });
    TH.oeffnen = wrap(function (p) { nurOut(p); var d = app.open(new File(p)); return ok({ name: d.name }); });
    TH.schliessen = wrap(function (name) { dokVon(name).close(SaveOptions.DONOTSAVECHANGES); return ok(); });
    TH.speichern = wrap(function () { var d = app.activeDocument; nurOut(pfadVon(d)); d.save(); return ok({ gespeichert: d.saved }); });
    TH.speichernUnter = wrap(function (p) { nurOut(p); app.activeDocument.saveAs(new File(p), new IllustratorSaveOptions()); return ok({ pfad: pfadVon(app.activeDocument) }); });
    // neues CMYK-Dokument b × h mm mit optional weiteren Zeichenflächen (nebeneinander, 10 mm)
    TH.neu = wrap(function (b, h, weitere) {
        var d = app.documents.add(DocumentColorSpace.CMYK, b * MM, h * MM);
        for (var i = 0; weitere && i < weitere.length; i++) { var r = d.artboards[d.artboards.length - 1].artboardRect; d.artboards.add([r[2] + 10 * MM, r[1], r[2] + 10 * MM + weitere[i][0] * MM, r[1] - weitere[i][1] * MM]); }
        return ok({ name: d.name });
    });
    TH.ebeneNeu = wrap(function (name) { var d = app.activeDocument, L = d.layers.add(); L.name = name; return ok(); });
    function farbeVon(d, f) {
        if (!f) return null;
        if (f.cut) f = { cmyk: [0, 100, 0, 0], spot: "Cutkontur" };
        var c = new CMYKColor(); var v = f.cmyk || [0, 0, 0, 100]; c.cyan = v[0]; c.magenta = v[1]; c.yellow = v[2]; c.black = v[3];
        // Prozessfarbe als Farbfeld: global (Spot mit colorType PROCESS) oder nicht global (Farbfeld, Füllung bleibt CMYKColor)
        if (f.prozess && f.global) {
            var g; try { g = d.spots.getByName(f.prozess); } catch (e) { g = d.spots.add(); g.name = f.prozess; g.colorType = ColorModel.PROCESS; g.color = c; }
            var gc = new SpotColor(); gc.spot = g; gc.tint = 100; return gc;
        }
        if (f.prozess) { var sw; try { sw = d.swatches.getByName(f.prozess); } catch (e) { sw = d.swatches.add(); sw.name = f.prozess; sw.color = c; } return sw.color; }
        if (!f.spot) return c;
        var s; try { s = d.spots.getByName(f.spot); } catch (e) { s = d.spots.add(); s.name = f.spot; s.colorType = ColorModel.SPOT; s.color = c; }
        var sc = new SpotColor(); sc.spot = s; sc.tint = 100; return sc;
    }
    // Formen zeichnen: [{ ebene, art: "rechteck"|"kreis"|"text"|"linie", x, y, b, h, fuellung, kontur, konturStaerke, name, gruppe, zf, text, groesse }]
    // fuellung/kontur: { spot: "070 (751 C)", cmyk: [...] } | { cut: true } | { cmyk } | { prozess: Farbfeldname, global: true|false, cmyk }; gruppe: Name einer Gruppe, die alle Formen mit gleichem gruppe-Namen sammelt
    TH.zeichnen = wrap(function (formen) {
        var d = app.activeDocument, gruppen = {}, n = 0;
        for (var i = 0; i < formen.length; i++) {
            var f = formen[i], L = d.layers.getByName(f.ebene), wasL = L.locked; L.locked = false; L.visible = true;
            var ab = d.artboards[f.zf || 0].artboardRect, x = ab[0] + (f.x || 0) * MM, y = ab[1] - (f.y || 0) * MM, it;
            var ziel = L;
            if (f.gruppe) { if (!gruppen[f.gruppe]) { gruppen[f.gruppe] = L.groupItems.add(); gruppen[f.gruppe].name = f.gruppe; } ziel = gruppen[f.gruppe]; }
            if (f.art === "kreis") it = ziel.pathItems.ellipse(y, x, f.b * MM, f.h * MM);
            else if (f.art === "linie") { it = ziel.pathItems.add(); it.setEntirePath([[x, y], [x + f.b * MM, y - (f.h || 0) * MM]]); }
            else if (f.art === "text") { it = ziel.textFrames.add(); it.contents = f.text || "Text"; it.left = x; it.top = y; if (f.groesse) it.textRange.characterAttributes.size = f.groesse; }
            else it = ziel.pathItems.rectangle(y, x, f.b * MM, f.h * MM);
            if (f.art === "text") { if (f.fuellung) it.textRange.characterAttributes.fillColor = farbeVon(d, f.fuellung); }
            else {
                if (f.fuellung) { it.filled = true; it.fillColor = farbeVon(d, f.fuellung); } else it.filled = false;
                if (f.kontur) { it.stroked = true; it.strokeColor = farbeVon(d, f.kontur); it.strokeWidth = f.konturStaerke || 0.5; } else it.stroked = false;
            }
            if (f.name) it.name = f.name;
            L.locked = wasL; n++;
        }
        return ok({ n: n });
    });
    // Bild einbetten (Pixelbild) – für Sperren bei Plott
    TH.bild = wrap(function (ebene, pfad, x, y, name) {
        var d = app.activeDocument, ab = d.artboards[0].artboardRect, p = d.layers.getByName(ebene).placedItems.add();
        p.file = new File(pfad); p.left = ab[0] + x * MM; p.top = ab[1] - y * MM; p.embed();
        var it = d.layers.getByName(ebene).pageItems[0]; if (name) it.name = name; return ok();
    });
    function suchen(d, name) {
        for (var i = 0; i < d.layers.length; i++) { var L = d.layers[i]; for (var j = 0; j < L.pageItems.length; j++) if (L.pageItems[j].name === name) return L.pageItems[j]; }
        throw "Objekt nicht gefunden: " + name;
    }
    TH.auswaehlen = wrap(function (namen) {
        var d = app.activeDocument; d.selection = null;
        var a = []; for (var i = 0; i < namen.length; i++) a.push(suchen(d, namen[i]));
        for (var k = 0; k < a.length; k++) a[k].selected = true;
        return ok({ n: d.selection.length });
    });
    TH.alleAuswaehlen = wrap(function (ebene) {
        var d = app.activeDocument; d.selection = null; var L = d.layers.getByName(ebene);
        for (var j = 0; j < L.pageItems.length; j++) L.pageItems[j].selected = true;
        return ok({ n: d.selection.length });
    });
    TH.auswahlLeer = wrap(function () { if (app.documents.length) app.activeDocument.selection = null; return ok(); });
    TH.tags = wrap(function (name) { return ok({ tags: tags(suchen(app.activeDocument, name)) }); });
    TH.tagSetzen = wrap(function (name, tag, wert) {
        var it = suchen(app.activeDocument, name), t = null;
        for (var i = 0; i < it.tags.length; i++) if (it.tags[i].name === tag) t = it.tags[i];
        if (wert === null) { if (t) t.remove(); return ok(); }
        if (!t) { t = it.tags.add(); t.name = tag; } t.value = String(wert); return ok();
    });
    TH.verschieben = wrap(function (name, dx, dy) { suchen(app.activeDocument, name).translate(dx * MM, -dy * MM); return ok(); });
    TH.aufEbene = wrap(function (name, ebene) { var d = app.activeDocument; suchen(d, name).move(d.layers.getByName(ebene), ElementPlacement.PLACEATBEGINNING); return ok(); });
    TH.loeschen = wrap(function (name) { suchen(app.activeDocument, name).remove(); return ok(); });
    TH.duplizieren = wrap(function (name, neu, dx) { var it = suchen(app.activeDocument, name), k = it.duplicate(it, ElementPlacement.PLACEBEFORE); k.name = neu; k.translate((dx || 0) * MM, 0); return ok(); });
    // Text der Ebene (alle Textrahmen), z. B. Info-Ebene der Druckbögen bzw. „Infos“ bei Textil
    TH.texte = wrap(function (ebene) {
        var d = app.activeDocument, L = d.layers.getByName(ebene), r = [];
        for (var i = 0; i < L.textFrames.length; i++) r.push(String(L.textFrames[i].contents));
        return ok({ texte: r });
    });
    // Farben der Pfade einer Ebene: Name des Farbfelds bzw. Typ (Lochmarkierungen, Laser-Umriss)
    TH.pfadFarben = wrap(function (name, ebene, objekt) {
        var d = dokVon(name), r = [];
        function lauf(it) {
            if (it.typename === "GroupItem") { for (var k = 0; k < it.pageItems.length; k++) lauf(it.pageItems[k]); return; }
            if (it.typename === "CompoundPathItem") { for (var q = 0; q < it.pathItems.length; q++) lauf(it.pathItems[q]); return; }
            if (it.typename !== "PathItem") return;
            function fb(c) { if (!c) return null; if (c.typename === "SpotColor") return "spot:" + c.spot.name; if (c.typename === "CMYKColor") return "cmyk:" + [c.cyan, c.magenta, c.yellow, c.black].join("/"); return c.typename; }
            r.push({ fuellung: it.filled ? fb(it.fillColor) : null, kontur: it.stroked ? fb(it.strokeColor) : null, staerke: it.stroked ? r2(it.strokeWidth) : null, vb: mm(it.visibleBounds) });
        }
        for (var i = 0; i < d.layers.length; i++) { if (ebene && d.layers[i].name !== ebene) continue; for (var j = 0; j < d.layers[i].pageItems.length; j++) { var pj = d.layers[i].pageItems[j]; if (!objekt || (pj.parent === d.layers[i] && pj.name === objekt)) lauf(pj); } }
        return ok({ pfade: r });
    });
    // Schnittmaskengruppe: Inhalt (Rechteck b × h) mit Maskenpfad (halbe Größe) auf ebene
    TH.schnittmaske = wrap(function (ebene, name, x, y, b, h) {
        var d = app.activeDocument, ab = d.artboards[0].artboardRect, L = d.layers.getByName(ebene), g = L.groupItems.add();
        var inhalt = g.pathItems.rectangle(ab[1] - y * MM, ab[0] + x * MM, b * MM, h * MM); inhalt.filled = true; inhalt.fillColor = farbeVon(d, { cmyk: [0, 50, 100, 0] }); inhalt.stroked = false;
        var maske = g.pathItems.rectangle(ab[1] - y * MM, ab[0] + x * MM, b / 2 * MM, h / 2 * MM);
        maske.move(g, ElementPlacement.PLACEATBEGINNING); maske.clipping = true; g.clipped = true; g.name = name;
        return ok();
    });
    // Zahl der Schnittmaskengruppen im Dokument (rekursiv)
    TH.geclippt = wrap(function () {
        var d = app.activeDocument, n = 0;
        for (var i = 0; i < d.groupItems.length; i++) if (d.groupItems[i].clipped) n++;
        return ok({ n: n });
    });
    TH.ebeneSperren = wrap(function (name, an) { app.activeDocument.layers.getByName(name).locked = !!an; return ok(); });
    // ip:Dokument des vorderen Dokuments schreiben (wie xmpTextSchreiben im Kern)
    TH.xmpSetzen = wrap(function (text) {
        if (typeof XMPMeta === "undefined") new ExternalObject("lib:AdobeXMPScript");
        var d = app.activeDocument, x = new XMPMeta(d.XMPString);
        x.setProperty("http://ns.pam-nm.de/illupanels/2.0/", "Dokument", String(text));
        d.XMPString = x.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT);
        return ok();
    });
    TH.uil = wrap(function (wert) {
        var alt = String(app.userInteractionLevel);
        if (wert === "aus") app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        else if (wert) app.userInteractionLevel = UserInteractionLevel[String(wert).replace("UserInteractionLevel.", "")];
        return ok({ alt: alt, neu: String(app.userInteractionLevel) });
    });
})();
