// PAM-Werkzeuge – JSX-Kern (nur Dokumentzugriff: XMP, Tags, Ebenen, Zeichenflächen, Objekte lesen und messen, Speichern)
// Rechnen, Konfiguration, Dateisystem und Ablauf liegen im Panel (Node, panel/lib).
// Alle öffentlichen Funktionen geben einen JSON-String zurück: {ok:true,...} oder {ok:false,error:"..."}.
// Vor allem anderen ruft das Panel IP.init(<config/schema.json als Text>) – Namespace und Tag-Namen kommen nur von dort.
#target illustrator

var IP = {};

(function () {
    var S = null; // {ns, praefix, eigenschaft, tags: {schluessel: "IP_…"}}
    var PT_MM = 72 / 25.4;

    // ---------- JSON (ExtendScript hat kein JSON) ----------
    function q(s) {
        return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
            .replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
            .replace(/[\u0000-\u001f]/g, function (c) { return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); }) + '"';
    }
    function stringify(v) {
        if (v === null || v === undefined) return "null";
        var t = typeof v;
        if (t === "number") return isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : "null";
        if (t === "boolean") return v ? "true" : "false";
        if (t === "string") return q(v);
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) a.push(stringify(v[i]));
            return "[" + a.join(",") + "]";
        }
        var o = [];
        for (var k in v) if (v.hasOwnProperty(k) && typeof v[k] !== "function") o.push(q(k) + ":" + stringify(v[k]));
        return "{" + o.join(",") + "}";
    }
    function parse(s) { return eval("(" + s + ")"); } // Eingaben kommen nur vom eigenen Panel

    function ok(o) { o = o || {}; o.ok = true; return stringify(o); }
    function fail(e) { return stringify({ ok: false, error: String(e && e.message ? e.message : e) + (e && e.line ? " (JSX-Zeile " + e.line + ")" : "") }); }
    function wrap(fn) {
        return function () {
            try { return fn.apply(null, arguments); } catch (e) { return fail(e); }
        };
    }
    function schema() { if (!S) throw "JSX-Kern: Schema nicht übergeben (IP.init)"; return S; }
    function doc() {
        if (app.documents.length === 0) throw "Kein Dokument geöffnet";
        return app.activeDocument;
    }
    function docPath(d) { try { return d.fullName.fsName; } catch (e) { return ""; } }

    // ---------- Start: Schema aus config/schema.json ----------
    IP.init = wrap(function (schemaText) {
        var s = parse(schemaText);
        S = { ns: s.xmp.namespace, praefix: s.xmp.praefix, eigenschaft: s.xmp.eigenschaft, tags: s.tags };
        return ok({ ns: S.ns });
    });

    // ---------- XMP: eine Eigenschaft ip:Dokument mit JSON-Text ----------
    function xmpLib() {
        if (typeof XMPMeta === "undefined") new ExternalObject("lib:AdobeXMPScript");
        try { XMPMeta.registerNamespace(schema().ns, schema().praefix); } catch (e) { }
    }
    function xmpTextLesen(d) {
        xmpLib();
        var x = new XMPMeta(d.XMPString), p = x.getProperty(schema().ns, schema().eigenschaft);
        return p ? String(p.value) : null;
    }
    function xmpTextSchreiben(d, text) {
        xmpLib();
        var x = new XMPMeta(d.XMPString);
        x.setProperty(schema().ns, schema().eigenschaft, String(text));
        d.XMPString = x.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT);
    }
    IP.xmpLesen = wrap(function () { return ok({ text: xmpTextLesen(doc()) }); });
    IP.xmpSchreiben = wrap(function (text) { xmpTextSchreiben(doc(), text); return ok({}); });

    // ---------- Tags IP_* am PageItem, Werte als Text; Namen aus dem Schema ----------
    function getTag(item, name) {
        try { for (var i = 0; i < item.tags.length; i++) if (item.tags[i].name === name) return item.tags[i].value; } catch (e) { }
        return null;
    }
    function setTag(item, name, value) {
        for (var i = item.tags.length - 1; i >= 0; i--) if (item.tags[i].name === name) item.tags[i].remove();
        if (value === null || value === undefined || value === "") return;
        var t = item.tags.add();
        t.name = name;
        t.value = String(value);
    }
    // {schluessel: wert|null} für alle Tags des Schemas
    function tagsLesen(item) {
        var t = schema().tags, r = {};
        for (var k in t) if (t.hasOwnProperty(k)) r[k] = getTag(item, t[k]);
        return r;
    }
    // nur die Schlüssel in obj; null/"" entfernt den Tag; unbekannter Schlüssel -> Fehler (Node prüft vorher mit panel/lib/tags.js)
    function tagsSchreiben(item, obj) {
        var t = schema().tags;
        for (var k in obj) if (obj.hasOwnProperty(k)) {
            if (!t.hasOwnProperty(k)) throw "Tag „" + k + "“ nicht im Schema";
            setTag(item, t[k], obj[k]);
        }
    }
    IP.tagsLesen = tagsLesen;
    IP.tagsSchreiben = tagsSchreiben;

    // ---------- Dokumentinfo (Kopfzeile, Dialog) ----------
    function infoVon(d) {
        return { hatDokument: true, name: d.name, pfad: docPath(d), gespeichert: d.saved, xmp: xmpTextLesen(d), leer: d.pageItems.length === 0 };
    }
    IP.dokumentInfo = wrap(function () {
        if (app.documents.length === 0) return ok({ hatDokument: false });
        return ok(infoVon(app.activeDocument));
    });

    // ---------- Dateiwahl im Dialog „Auftrag“ ----------
    function dokumentFinden(name, pfad) { for (var i = 0; i < app.documents.length; i++) { var d = app.documents[i]; if (d.name === name && docPath(d) === pfad) return d; } return null; }
    IP.dateiWaehlen = wrap(function () { var f = File.openDialog(); return ok({ pfad: f ? f.fsName : null }); });
    // Datei in Illustrator öffnen (ist sie schon offen, wird sie nur aktiviert); selbstGeoeffnet: der Dialog schließt sie bei Abbruch wieder
    IP.dateiOeffnen = wrap(function (pfad) {
        var f = new File(pfad), schon = null;
        for (var i = 0; i < app.documents.length; i++) if (docPath(app.documents[i]) === f.fsName) schon = app.documents[i];
        var d = schon || app.open(f);
        d.activate();
        return ok({ info: infoVon(d), selbstGeoeffnet: !schon });
    });
    // spec {schliessen: {name, pfad} | null (nur die vom Dialog geöffnete Datei, ohne Speichern), vorher: {name, pfad} | null (wieder aktivieren)}
    IP.dateiZurueck = wrap(function (spec) {
        if (spec.schliessen) { var c = dokumentFinden(spec.schliessen.name, spec.schliessen.pfad); if (c) c.close(SaveOptions.DONOTSAVECHANGES); }
        if (spec.vorher) { var v = dokumentFinden(spec.vorher.name, spec.vorher.pfad); if (v) v.activate(); }
        return ok({ info: app.documents.length ? infoVon(app.activeDocument) : { hatDokument: false } });
    });
    // Ordnerdialog mit Startordner (Kundenordner wählen bzw. im Dialog anlegen); Abbruch -> pfad null
    IP.ordnerWaehlen = wrap(function (start) {
        var f = new Folder(start), g = f.exists ? f.selectDlg("") : Folder.selectDialog("");
        return ok({ pfad: g ? g.fsName : null });
    });

    // ---------- Geometrie ----------
    function rectMitte(r) { return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]; }
    function inRect(p, r) { return p[0] >= r[0] && p[0] <= r[2] && p[1] <= r[1] && p[1] >= r[3]; }
    function abRects(d) { var r = []; for (var i = 0; i < d.artboards.length; i++) r.push(d.artboards[i].artboardRect); return r; }
    function newMmDoc(wMm, hMm) {
        var p = new DocumentPreset();
        p.units = RulerUnits.Millimeters;
        p.width = wMm * PT_MM;
        p.height = hMm * PT_MM;
        var name = "Druck", L = app.startupPresetsList; // Name der Vorgabe ist sprachabhängig
        for (var i = 0; i < L.length; i++) if (L[i] === "Print" || L[i] === "Druck") name = L[i];
        return app.documents.addDocument(name, p);
    }
    // Neues Dokument aus einer Vorlage (.ait; Dokument-Anschnitt kommt aus der Vorlage); rects null = Zeichenflächen der Vorlage
    function ausVorlage(vorlage, rects) {
        var f = new File(vorlage);
        if (!f.exists) throw "Vorlage nicht gefunden: " + f.fsName;
        var nd = app.open(f);
        if (rects && rects.length) {
            nd.artboards[0].artboardRect = rects[0];
            for (var i = nd.artboards.length - 1; i > 0; i--) nd.artboards[i].remove();
            for (var k = 1; k < rects.length; k++) nd.artboards.add(rects[k]);
        }
        return nd;
    }
    // Zeichenflächen nach zf {breite_mm, hoehe_mm, anzahl, abstand_mm}: nebeneinander, die erste mittig auf der bisherigen Zeichenfläche 1
    function zeichenflaechenSetzen(d, zf) {
        var m = rectMitte(d.artboards[0].artboardRect), w = zf.breite_mm * PT_MM, h = zf.hoehe_mm * PT_MM, ab = (zf.abstand_mm || 0) * PT_MM, n = zf.anzahl || 1, r = [];
        for (var i = 0; i < n; i++) { var l = m[0] - w / 2 + i * (w + ab), t = m[1] + h / 2; r.push([l, t, l + w, t - h]); }
        d.artboards[0].artboardRect = r[0];
        for (var x = d.artboards.length - 1; x > 0; x--) d.artboards[x].remove();
        for (var k = 1; k < r.length; k++) d.artboards.add(r[k]);
    }
    // Zeichenflächen wie in der Quelle, nebeneinander mit Abstand ab 0/0 (Schild mit Quelle)
    function rectsWieQuelle(src, abstand_mm) {
        var sr = abRects(src), x = 0, r = [];
        for (var a = 0; a < sr.length; a++) { var w = sr[a][2] - sr[a][0], h = sr[a][1] - sr[a][3]; r.push([x, 0, x + w, -h]); x += w + abstand_mm * PT_MM; }
        return r;
    }

    // ---------- Maßstab-Umrechnung: skalieren um pct mit Konturen und Effekten (wie bisher: resize mit scaleLineWeight) ----------
    // ziel: Mittelpunkt, den das Objekt danach haben soll (pt im Dokument des Objekts)
    function skalierenNach(it, pct, ziel) {
        if (pct !== 100) {
            var alt = app.preferences.getBooleanPreference("scaleLineWeight");
            app.preferences.setBooleanPreference("scaleLineWeight", true);
            try { it.resize(pct, pct, true, true, true, true, pct, Transformation.CENTER); } finally { app.preferences.setBooleanPreference("scaleLineWeight", alt); }
        }
        var c = rectMitte(it.geometricBounds);
        it.translate(ziel[0] - c[0], ziel[1] - c[1]);
    }
    // Lage zum Bezugspunkt a (Quelle) skaliert um f auf Bezugspunkt b (Ziel) übertragen
    function abgebildet(p, a, b, f) { return [b[0] + (p[0] - a[0]) * f, b[1] + (p[1] - a[1]) * f]; }

    // ---------- Quelle unverändert lassen ----------
    function zustandMerken(d) {
        var e = [];
        function rek(layers) { for (var i = 0; i < layers.length; i++) { e.push({ L: layers[i], gesperrt: layers[i].locked, sichtbar: layers[i].visible }); rek(layers[i].layers); } }
        rek(d.layers);
        return { d: d, ebenen: e, gespeichert: d.saved };
    }
    function zustandZurueck(z) {
        if (!z) return;
        for (var i = z.ebenen.length - 1; i >= 0; i--) { var x = z.ebenen[i]; try { x.L.locked = false; x.L.visible = x.sichtbar; x.L.locked = x.gesperrt; } catch (e) { } }
        try { z.d.saved = z.gespeichert; } catch (e2) { }
    }

    // ---------- Inhalt übertragen (aus dem alten Kern) ----------
    // Objekte einer Ebene, danach die ihrer Unterebenen (direkt, ohne Unterebene); Ebenen dafür entsperrt und sichtbar
    function sammeln(L, items) {
        L.locked = false; L.visible = true;
        for (var i = L.pageItems.length - 1; i >= 0; i--) { var it = L.pageItems[i]; if (it.parent === L) items.push(it); }
        for (var s = L.layers.length - 1; s >= 0; s--) sammeln(L.layers[s], items);
    }
    // wahl(name der obersten Ebene) -> Zielebene oder null
    function sammelnZiel(src, wahl) {
        var paare = [];
        for (var l = src.layers.length - 1; l >= 0; l--) {
            var ziel = wahl(src.layers[l].name), items = [];
            if (!ziel) continue;
            sammeln(src.layers[l], items);
            for (var i = 0; i < items.length; i++) paare.push({ it: items[i], L: ziel });
        }
        return paare;
    }
    // gleiche Auftragsart (und kein Maßstabswechsel): gleichnamige Ebene; sonst die Sandbox; spec.ohne: Ebenen der Quelle, die nicht übernommen werden
    function wahlVon(spec, made, sb) {
        return function (name) {
            for (var i = 0; spec.ohne && i < spec.ohne.length; i++) if (spec.ohne[i] === name) return null;
            return spec.gleich && made.hasOwnProperty(name) ? made[name] : sb;
        };
    }
    function entsperrt(L, liste) {
        for (var z = 0; z < liste.length; z++) if (liste[z].L === L) return;
        liste.push({ L: L, gesperrt: L.locked }); L.locked = false;
    }
    // Inhalt als Block (Lage zueinander bleibt) mittig auf Zeichenfläche 1, skaliert um pct
    function aufZielebenen(src, d, paare, pct) {
        var u = null, n = 0, ziele = [];
        for (var q = 0; q < paare.length; q++) { var g = paare[q].it.geometricBounds; u = u ? [Math.min(u[0], g[0]), Math.max(u[1], g[1]), Math.max(u[2], g[2]), Math.min(u[3], g[3])] : g.slice(); }
        if (!u) return 0;
        var a = rectMitte(u), b = rectMitte(d.artboards[0].artboardRect);
        try {
            for (var k = 0; k < paare.length; k++) {
                entsperrt(paare[k].L, ziele);
                var c0 = rectMitte(paare[k].it.geometricBounds), dup = paare[k].it.duplicate(paare[k].L, ElementPlacement.PLACEATBEGINNING);
                skalierenNach(dup, pct, abgebildet(c0, a, b, pct / 100)); n++;
            }
        } finally { for (var w = 0; w < ziele.length; w++) ziele[w].L.locked = ziele[w].gesperrt; }
        return n;
    }
    // Inhalt je Zeichenfläche n -> n (Mitte auf Mitte; außerhalb oder überzählig -> Zeichenfläche 1), skaliert um pct (Schild)
    function jeZeichenflaeche(src, d, paare, pct) {
        var srcR = abRects(src), dstR = abRects(d), ziele = [], n = 0;
        try {
            for (var k = 0; k < paare.length; k++) {
                var it = paare[k].it, c0 = rectMitte(it.geometricBounds), z = -1;
                for (var i = 0; i < srcR.length; i++) if (inRect(c0, srcR[i])) { z = i; break; }
                if (z < 0 || z >= dstR.length) z = 0;
                entsperrt(paare[k].L, ziele);
                var dup = it.duplicate(paare[k].L, ElementPlacement.PLACEATBEGINNING);
                skalierenNach(dup, pct, abgebildet(c0, rectMitte(srcR[z]), rectMitte(dstR[z]), pct / 100)); n++;
            }
        } finally { for (var w = 0; w < ziele.length; w++) ziele[w].L.locked = ziele[w].gesperrt; }
        return n;
    }
    // ganzes Dokument an Ort und Stelle skalieren (Arten ohne Sandbox), Bezug Mitte von Zeichenfläche 1
    function dokumentSkalieren(d, pct) {
        if (pct === 100) return;
        var o = rectMitte(d.artboards[0].artboardRect), z = zustandMerken(d), items = [];
        try {
            for (var l = 0; l < d.layers.length; l++) sammelnAlle(d.layers[l], items);
            for (var i = 0; i < items.length; i++) skalierenNach(items[i], pct, abgebildet(rectMitte(items[i].geometricBounds), o, o, pct / 100));
        } finally { zustandZurueck(z); }
    }
    function sammelnAlle(L, items) {
        L.locked = false; L.visible = true;
        for (var i = 0; i < L.pageItems.length; i++) { var it = L.pageItems[i]; if (it.parent === L) items.push(it); }
        for (var s = 0; s < L.layers.length; s++) sammelnAlle(L.layers[s], items);
    }
    // Ebene ebenenweise übernehmen (Name, Reihenfolge, Sperrung, Sichtbarkeit wie im Original; Unterebenen rekursiv), Lage 1:1
    function ebeneUebernehmen(srcL, dstLayers, srcR, dstR) {
        var L = dstLayers.add(); L.name = srcL.name;
        var lock = srcL.locked, vis = srcL.visible, pr = srcL.printable;
        srcL.locked = false; srcL.visible = true;
        for (var s = srcL.layers.length - 1; s >= 0; s--) ebeneUebernehmen(srcL.layers[s], L.layers, srcR, dstR);
        for (var i = srcL.pageItems.length - 1; i >= 0; i--) {
            var it = srcL.pageItems[i]; if (it.parent !== srcL) continue;
            var n = -1, c0 = rectMitte(it.geometricBounds);
            for (var k = 0; k < srcR.length; k++) if (inRect(c0, srcR[k])) { n = k; break; }
            if (n < 0 || n >= dstR.length) n = 0;
            var dup = it.duplicate(L, ElementPlacement.PLACEATBEGINNING);
            skalierenNach(dup, 100, abgebildet(c0, rectMitte(srcR[n]), rectMitte(dstR[n]), 1));
        }
        L.visible = vis; L.locked = lock; try { L.printable = pr; } catch (e) { }
        return L;
    }
    function leereEbenenWeg(nd, alt) { for (var i = 0; i < alt.length; i++) { try { if (alt[i].pageItems.length === 0 && alt[i].layers.length === 0 && nd.layers.length > 1) alt[i].remove(); } catch (e) { } } }
    // Duplikat der offenen Quelle: gleiche Zeichenflächen, Farbmodus, Ebenen (Name, Reihenfolge, Sperrung, Sichtbarkeit, Unterebenen), Inhalt 1:1
    function dokumentDuplikat(src) {
        var r = abRects(src), nd = app.documents.add(src.documentColorSpace, r[0][2] - r[0][0], r[0][1] - r[0][3]), alt = [];
        nd.artboards[0].artboardRect = r[0];
        for (var i = 1; i < r.length; i++) nd.artboards.add(r[i]);
        for (var n = 0; n < r.length; n++) { try { nd.artboards[n].name = src.artboards[n].name; } catch (e) { } }
        for (var q = 0; q < nd.layers.length; q++) alt.push(nd.layers[q]);
        var dstR = abRects(nd);
        for (var l = src.layers.length - 1; l >= 0; l--) ebeneUebernehmen(src.layers[l], nd.layers, r, dstR);
        leereEbenenWeg(nd, alt);
        return nd;
    }
    // Grundlage aus der Quelle: Dateikopie (spec.kopie, von Node angelegt), die vom Dialog geöffnete Datei selbst (wird per saveAs zur Kopie)
    // oder ein Duplikat (Quelle bleibt unverändert offen)
    function grundlageVon(src, spec) {
        if (spec.kopie) return app.open(new File(spec.kopie));
        return spec.selbstGeoeffnet ? src : dokumentDuplikat(src);
    }
    // Ebenen nach spec.ebenen (von oben nach unten) anlegen bzw. vorhandene gleichnamige nehmen; Reihenfolge herstellen
    function ebenenAnlegen(d, ebenen, made) {
        for (var i = 0; i < ebenen.length; i++) { var n = ebenen[i].name; if (!made[n]) { var L = d.layers.add(); L.name = n; made[n] = L; } }
        for (var j = ebenen.length - 1; j >= 0; j--) made[ebenen[j].name].zOrder(ZOrderMethod.BRINGTOFRONT);
    }
    function ebenenSperren(ebenen, made) { for (var k = 0; k < ebenen.length; k++) made[ebenen[k].name].locked = !!ebenen[k].gesperrt; }
    function layerNames(d) { var a = []; for (var i = 0; i < d.layers.length; i++) a.push(d.layers[i].name); return a; }

    // ---------- Arbeitsdatei anlegen (SPEZ_01 §8, Zweig „ohne Auftrag“) ----------
    // spec: {grundlage: "neu" | "vorlage" | "fahrzeugvorlage" | "duplikat", quelle: "offen" | "datei" | "leer", selbstGeoeffnet, kopie,
    //        breite_mm, hoehe_mm (neu), vorlageDatei, zfAusQuelle, abstand_mm (vorlage), zf {breite_mm, hoehe_mm, anzahl, abstand_mm} (duplikat),
    //        ebenen [{name, gesperrt}] von oben, vorlageEbene (fahrzeugvorlage), sandbox, gleich, ohne [], pct, aktiveEbene, xmp (JSON-Text), datei}
    // Die Quelle wird nie verändert: Duplikat bzw. Dateikopie; eine vom Dialog geöffnete Datei wird ohne Speichern geschlossen oder per saveAs zur Arbeitsdatei.
    IP.arbeitsdateiAnlegen = wrap(function (spec) {
        var src = spec.quelle !== "leer" && app.documents.length ? app.activeDocument : null, d = null;
        var zs = src && !spec.selbstGeoeffnet ? zustandMerken(src) : null, ui = app.userInteractionLevel, made = {}, n = 0;
        if (spec.quelle !== "leer" && !src) throw "Kein Dokument geöffnet";
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        try {
            if (spec.grundlage === "fahrzeugvorlage") {
                // die Quelle wird zur Arbeitsdatei; ihre Ebenen liegen danach in der Vorlage-Ebene (mehrere als Unterebenen)
                d = grundlageVon(src, spec);
                var alt = [];
                for (var a0 = 0; a0 < d.layers.length; a0++) alt.push({ L: d.layers[a0], gesperrt: d.layers[a0].locked, sichtbar: d.layers[a0].visible });
                for (var a1 = 0; a1 < alt.length; a1++) { alt[a1].L.locked = false; alt[a1].L.visible = true; } // ausgeblendete Ebenen lassen sich nicht verschieben
                var K = d.layers.add(); K.name = spec.vorlageEbene;
                while (d.layers.length > 1) d.layers[d.layers.length - 1].move(K, ElementPlacement.INSIDE); // von unten: Reihenfolge bleibt
                for (var a2 = 0; a2 < alt.length; a2++) { alt[a2].L.locked = alt[a2].gesperrt; alt[a2].L.visible = alt[a2].sichtbar; }
                made[spec.vorlageEbene] = K;
                ebenenAnlegen(d, spec.ebenen, made);
                ebenenSperren(spec.ebenen, made);
            } else if (spec.grundlage === "duplikat") {
                // Arten ohne Sandbox: Inhalt bleibt wie er ist (Ebenen unverändert), nur Maßstab und Zeichenflächen nach Konfiguration
                d = src ? grundlageVon(src, spec) : newMmDoc(spec.zf.breite_mm, spec.zf.hoehe_mm);
                dokumentSkalieren(d, spec.pct);
                zeichenflaechenSetzen(d, spec.zf);
                n = d.pageItems.length;
            } else {
                if (spec.grundlage === "vorlage") {
                    d = ausVorlage(spec.vorlageDatei, spec.zfAusQuelle && src ? rectsWieQuelle(src, spec.abstand_mm) : null);
                    var leer = [];
                    for (var v = 0; v < d.layers.length; v++) leer.push(d.layers[v]);
                    ebenenAnlegen(d, spec.ebenen, made);
                    leereEbenenWeg(d, leer);
                } else {
                    d = newMmDoc(spec.breite_mm, spec.hoehe_mm);
                    for (var x = d.layers.length - 1; x > 0; x--) { d.layers[x].locked = false; d.layers[x].remove(); }
                    d.layers[0].name = spec.ebenen[spec.ebenen.length - 1].name; // unterste Ebene
                    made[d.layers[0].name] = d.layers[0];
                    ebenenAnlegen(d, spec.ebenen, made);
                }
                if (src) {
                    var sb = made[spec.sandbox];
                    if (!sb) throw "Ebene für den Quellinhalt fehlt: " + spec.sandbox;
                    var paare = sammelnZiel(src, wahlVon(spec, made, sb));
                    n = spec.grundlage === "vorlage" ? jeZeichenflaeche(src, d, paare, spec.pct) : aufZielebenen(src, d, paare, spec.pct);
                }
                ebenenSperren(spec.ebenen, made);
            }
            if (src && d !== src && spec.selbstGeoeffnet) src.close(SaveOptions.DONOTSAVECHANGES); // nur die im Dialog geöffnete Datei
            d.activate();
            if (spec.aktiveEbene && made[spec.aktiveEbene]) { try { d.activeLayer = made[spec.aktiveEbene]; } catch (e) { } }
            xmpTextSchreiben(d, spec.xmp);
            var file = new File(spec.datei);
            d.saveAs(file, new IllustratorSaveOptions());
            return ok({ datei: file.fsName, ebenen: layerNames(d), zeichenflaechen: d.artboards.length, uebernommen: n });
        } catch (e) {
            if (d && d !== src) { try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (x2) { } } // Node entfernt eine Dateikopie
            throw e;
        } finally { zustandZurueck(zs); app.userInteractionLevel = ui; }
    });

    // ---------- Stufe 2: Objekte lesen und messen (SPEZ_02 §5) – aus dem alten Kern übernommen ----------
    // Am Dokument ändert sich nichts; gemessen wird in einem Hilfsdokument, das danach ohne Speichern geschlossen wird.
    function r0(v) { return Math.round(v); }
    function map(a, f) { var o = []; for (var i = 0; i < a.length; i++) o.push(f(a[i])); return o; }
    // Farbschlüssel einer Füllung: key (exakt, für farbzuordnung), label, spot (Farbfeldname bei Vollton 100 %)
    function colorKey(c) {
        if (!c) return null;
        switch (c.typename) {
            case "SpotColor":
                var full = c.tint >= 99.5;
                return { key: "spot:" + c.spot.name + (full ? "" : "@" + r0(c.tint)), label: c.spot.name + (full ? "" : " " + r0(c.tint) + " %"), spot: full ? c.spot.name : null };
            case "CMYKColor": var a = [c.cyan, c.magenta, c.yellow, c.black]; return { key: "cmyk:" + map(a, r0).join(","), label: "CMYK " + map(a, r0).join("/") };
            case "RGBColor": var b = [c.red, c.green, c.blue]; return { key: "rgb:" + map(b, r0).join(","), label: "RGB " + map(b, r0).join("/") };
            case "GrayColor": return { key: "gray:" + r0(c.gray), label: "Grau " + r0(c.gray) + " %" };
            case "LabColor": return { key: "lab:" + map([c.l, c.a, c.b], r0).join(","), label: "Lab" };
            case "GradientColor": return { key: "gradient", label: "Verlauf", gradient: true };
            case "PatternColor": return { key: "pattern", label: "Muster", gradient: true };
            case "NoColor": return null;
        }
        return { key: "other:" + c.typename, label: c.typename };
    }
    function isHidden(it) { try { return it.hidden === true; } catch (e) { return false; } }
    function isClipPath(it) {
        if (it.typename === "PathItem") return it.clipping;
        if (it.typename === "CompoundPathItem") return it.pathItems.length > 0 && it.pathItems[0].clipping;
        return false;
    }
    function clipPathOf(group) {
        for (var i = 0; i < group.pageItems.length; i++) if (isClipPath(group.pageItems[i])) return { item: group.pageItems[i], index: i };
        return null;
    }
    function inter(a, b) {
        if (!a) return b; if (!b) return a;
        var r = [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3])];
        return (r[0] < r[2] && r[3] < r[1]) ? r : null;
    }
    // Text: Füllfarben je Zeichen (Beschriftungen sind kurz)
    function textColors(tf) {
        var seen = {}, out = [], n = Math.min(tf.characters.length, 2000);
        for (var i = 0; i < n; i++) {
            var k = colorKey(tf.characters[i].characterAttributes.fillColor);
            if (k && !seen[k.key]) { seen[k.key] = 1; out.push(k); }
        }
        return out;
    }
    // Läuft rekursiv durch ein oberstes Objekt; path = Indexkette ab dem obersten Objekt
    function collectLeaves(item, path, clip, clips, out) {
        if (isHidden(item)) return;
        var t = item.typename;
        if (t === "GroupItem") {
            var c = clip, cl = clips;
            if (item.clipped) {
                var cp = clipPathOf(item);
                if (cp) { c = inter(clip, cp.item.geometricBounds); cl = clips.concat([path.concat([cp.index])]); if (!c) return; }
            }
            for (var i = 0, n = item.pageItems.length; i < n; i++) collectLeaves(item.pageItems[i], path.concat([i]), c, cl, out);
            return;
        }
        if (isClipPath(item) || (t === "PathItem" && item.guides)) return;
        out.push({ item: item, path: path, clip: clip, clips: clips });
    }
    // Cutkontur [R 3.1]: Vollton C0 M100 Y0 K0 (Toleranz 0,5), Name egal, in Kontur oder Füllung; CompoundPathItem -> erster Pfad
    function near(a, b) { return Math.abs(a - b) < 0.5; }
    function istCutSpot(sp) {
        try {
            if (sp.colorType !== ColorModel.SPOT) return false;
            var k = sp.color;
            return k.typename === "CMYKColor" && near(k.cyan, 0) && near(k.magenta, 100) && near(k.yellow, 0) && near(k.black, 0);
        } catch (e) { return false; }
    }
    function isCutColor(c) {
        if (!c || c.typename !== "SpotColor") return false;
        try { return istCutSpot(c.spot); } catch (e) { return false; }
    }
    function isCutPath(p) {
        try { if (p.stroked && isCutColor(p.strokeColor)) return true; } catch (e) { }
        try { if (p.filled && isCutColor(p.fillColor)) return true; } catch (e) { }
        return false;
    }
    function isCutItem(it) {
        if (it.typename === "CompoundPathItem") { try { return it.pathItems.length > 0 && isCutPath(it.pathItems[0]); } catch (e) { return false; } }
        if (it.typename === "PathItem") return isCutPath(it);
        return false;
    }
    // Schnittlänge (pt, alle Teilpfade inkl. Punzen) und Einzelteile (geschlossener bzw. zusammengesetzter Pfad = 1; Punzen zählen nicht)
    function schnitt(it) {
        var t = it.typename, r = { laenge: 0, teile: 0 };
        if (t === "GroupItem") { for (var i = 0; i < it.pageItems.length; i++) { var x = schnitt(it.pageItems[i]); r.laenge += x.laenge; r.teile += x.teile; } return r; }
        if (t === "CompoundPathItem") { for (var j = 0; j < it.pathItems.length; j++) r.laenge += it.pathItems[j].length; r.teile = it.pathItems.length ? 1 : 0; return r; }
        if (t === "PathItem") { r.laenge = it.length; r.teile = it.closed ? 1 : 0; return r; }
        return r;
    }
    // Hilfsdokument (Rolle „hilfsdokument“ nur im Speicher, nie gespeichert): Text in Pfade, Motivumriss
    function hilfsdokument(temp) {
        if (!temp.doc) {
            var cur = app.activeDocument;
            temp.doc = app.documents.add(DocumentColorSpace.CMYK, 1000, 1000);
            cur.activate();
        }
        return temp.doc;
    }
    function closeTemp(temp) {
        if (!temp.doc) return;
        var cur = app.activeDocument;
        temp.doc.close(SaveOptions.DONOTSAVECHANGES);
        temp.doc = null;
        try { cur.activate(); } catch (e) { }
    }
    // Tatsächliche Umrisse von Text: Kopie ins Hilfsdokument, dort in Pfade umwandeln
    function textOutlineBounds(tf, temp) {
        hilfsdokument(temp);
        var dup = tf.duplicate(temp.doc.layers[0], ElementPlacement.PLACEATEND);
        var a = tf.geometricBounds, b = dup.geometricBounds, dx = a[0] - b[0], dy = a[1] - b[1];
        var o = dup.createOutline(), g = o.geometricBounds, sm = schnitt(o);
        o.remove();
        return { bounds: [g[0] + dx, g[1] + dy, g[2] + dx, g[3] + dy], laenge: sm.laenge, teile: sm.teile };
    }
    // Blatt: Begrenzung geometrisch (gb) und sichtbar (vb), Länge und Teile (nur mit temp), Farbfelder der Füllung, Flags
    function leafInfo(lf, temp) {
        var it = lf.item, t = it.typename, info = { path: lf.path, typ: t, clips: lf.clips };
        var src = it;
        if (t === "CompoundPathItem") src = it.pathItems.length ? it.pathItems[0] : null;
        if (t === "TextFrame") {
            info.farben = textColors(it);
            info.text = true;
            var tm = temp ? textOutlineBounds(it, temp) : null;
            info.gb = inter(tm ? tm.bounds : it.geometricBounds, lf.clip);
            if (tm) { info.laenge_pt = tm.laenge; info.teile = tm.teile; }
            info.vb = info.gb;
            return info;
        }
        info.gb = inter(it.geometricBounds, lf.clip);
        info.vb = inter(it.visibleBounds, lf.clip);
        if (temp) { var sm = schnitt(it); info.laenge_pt = sm.laenge; info.teile = sm.teile; }
        if (isCutItem(it)) { info.cut = true; info.farben = []; return info; } // Cutkontur: weder Motiv noch Plottfarbe
        if (t === "RasterItem" || t === "PlacedItem") { info.bild = true; info.farben = []; return info; }
        if (t === "MeshItem") { info.verlauf = true; info.farben = []; return info; }
        if (!src || src.typename !== "PathItem") { info.sonstiges = true; info.farben = []; return info; }
        info.farben = [];
        if (src.filled) { var k = colorKey(src.fillColor); if (k) { if (k.gradient) info.verlauf = true; else info.farben.push(k); } }
        info.kontur = src.stroked && src.strokeColor.typename !== "NoColor";
        return info;
    }
    function visualBounds(item) {
        var lv = [], b = null; collectLeaves(item, [], null, [], lv);
        for (var i = 0; i < lv.length; i++) {
            var it = lv[i].item, v = inter(it.typename === "TextFrame" ? it.geometricBounds : it.visibleBounds, lv[i].clip);
            if (v) b = b ? [Math.min(b[0], v[0]), Math.max(b[1], v[1]), Math.max(b[2], v[2]), Math.min(b[3], v[3])] : v;
        }
        return b;
    }
    // Motivumriss [R 3.8]: Druckobjekt ohne Cutkontur. Kopie im Hilfsdokument, Text in Pfade, Konturen in Flächen, Vereinigen; nur Außenringe
    // (in keinem anderen Ring enthalten) zählen. Mit Pixelbild oder Schnittmaske: sichtbare Begrenzung (Rechteck).
    function bildOderMaske(item) {
        var t = item.typename;
        if (t === "RasterItem" || t === "PlacedItem") return true;
        if (t === "GroupItem") {
            if (item.clipped) return true;
            for (var i = 0; i < item.pageItems.length; i++) if (bildOderMaske(item.pageItems[i])) return true;
        }
        return false;
    }
    function alleVom(item, typ, out) {
        if (item.typename === typ) { out.push(item); return out; }
        if (item.typename === "GroupItem") for (var i = 0; i < item.pageItems.length; i++) alleVom(item.pageItems[i], typ, out);
        return out;
    }
    function einzelpfade(item, out) {
        if (item.typename === "PathItem") out.push(item);
        else if (item.typename === "CompoundPathItem") for (var j = 0; j < item.pathItems.length; j++) out.push(item.pathItems[j]);
        else if (item.typename === "GroupItem") for (var i = 0; i < item.pageItems.length; i++) einzelpfade(item.pageItems[i], out);
        return out;
    }
    function punktInRing(x, y, pk) {
        var innen = false;
        for (var i = 0, j = pk.length - 1; i < pk.length; j = i++) {
            var xi = pk[i][0], yi = pk[i][1], xj = pk[j][0], yj = pk[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) innen = !innen;
        }
        return innen;
    }
    function motivUmriss(top, temp) {
        if (bildOderMaske(top)) {
            var vb = visualBounds(top);
            return { gb: vb, laenge_pt: 2 * ((vb[2] - vb[0]) + (vb[1] - vb[3])), rechteck: true };
        }
        var hd = hilfsdokument(temp), cur = app.activeDocument, erg = null, ui = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS; // Menübefehle ohne Rückfrage
        hd.activate();
        try {
            var dup = top.duplicate(hd.layers[0], ElementPlacement.PLACEATEND);
            var a = top.geometricBounds, b = dup.geometricBounds, dx = a[0] - b[0], dy = a[1] - b[1];
            if (dup.typename === "TextFrame") dup = dup.createOutline();
            var tf = alleVom(dup, "TextFrame", []);
            for (var i = 0; i < tf.length; i++) tf[i].createOutline();
            hd.selection = null;
            var pf = einzelpfade(dup, []), st = 0;
            for (var k = 0; k < pf.length; k++) { try { if (pf[k].stroked && pf[k].strokeColor.typename !== "NoColor" && pf[k].strokeWidth > 0) { pf[k].selected = true; st++; } } catch (e) { } }
            if (st) app.executeMenuCommand("OffsetPath v22"); // Konturen in Flächen („Kontur in Fläche umwandeln“; v23 öffnet einen Dialog)
            hd.selection = null;
            for (var q = 0; q < hd.layers[0].pageItems.length; q++) hd.layers[0].pageItems[q].selected = true;
            app.executeMenuCommand("group");
            app.executeMenuCommand("Live Pathfinder Add");
            app.executeMenuCommand("expandStyle");
            var ringe = [], alle = [];
            for (var r = 0; r < hd.layers[0].pageItems.length; r++) einzelpfade(hd.layers[0].pageItems[r], alle);
            for (var m = 0; m < alle.length; m++) { var pp = alle[m].pathPoints, pk = []; for (var n = 0; n < pp.length; n++) pk.push(pp[n].anchor); if (pk.length) ringe.push({ p: alle[m], pk: pk }); }
            var laenge = 0, gb = null, aussen = 0;
            for (var u = 0; u < ringe.length; u++) {
                var drin = false;
                for (var v = 0; v < ringe.length && !drin; v++) if (v !== u && punktInRing(ringe[u].pk[0][0], ringe[u].pk[0][1], ringe[v].pk)) drin = true;
                if (drin) continue;
                aussen++; laenge += ringe[u].p.length;
                var g = ringe[u].p.geometricBounds;
                gb = gb ? [Math.min(gb[0], g[0]), Math.max(gb[1], g[1]), Math.max(gb[2], g[2]), Math.min(gb[3], g[3])] : [g[0], g[1], g[2], g[3]];
            }
            if (gb) erg = { gb: [gb[0] + dx, gb[1] + dy, gb[2] + dx, gb[3] + dy], laenge_pt: laenge, ringe: aussen };
        } finally {
            hd.selection = null;
            while (hd.layers[0].pageItems.length) hd.layers[0].pageItems[0].remove();
            try { cur.activate(); } catch (e) { }
            app.userInteractionLevel = ui;
        }
        return erg;
    }
    // Oberstes Objekt: Id, Tags, Name, Ebene, Begrenzung (gb geometrisch, vb sichtbar), Blätter, Cutkontur; gemessen wird nur mit temp
    // (Länge und Teile, exakte Textumrisse) und nur bei Druck ohne Cutkontur der Motivumriss.
    function objektInfo(top, L, index, rolle, temp) {
        var o = { ref: { ebene: L.name, index: index }, ebene: L.name, rolle: rolle, name: top.name || "", typ: top.typename, tags: tagsLesen(top),
            gb: top.geometricBounds, vb: null, cut: false, blaetter: [] };
        o.id = o.tags.id;
        if (rolle === "sandbox") return o; // Sandbox: nur gezählt, nicht gemessen
        var leaves = [];
        collectLeaves(top, [], null, [], leaves);
        for (var i = 0; i < leaves.length; i++) { var li = leafInfo(leaves[i], temp); if (li.cut) o.cut = true; o.blaetter.push(li); }
        o.vb = visualBounds(top);
        if (temp && !o.cut && rolle === "digitaldruck") o.umriss = motivUmriss(top, temp);
        return o;
    }
    // spec {rollen: {Ebenenname: Rolle}, messen: true|false}: oberste Objekte (ohne ausgeblendete) der Ebenen mit Rolle plott, digitaldruck, sandbox
    // in Ebenenreihenfolge. Gemessen (messen) werden nur zugeordnete Objekte (Tag folie) auf plott/digitaldruck.
    IP.objekteLesen = wrap(function (spec) {
        var d = doc(), temp = {}, objs = [], ebenen = [], R = spec.rollen || {}, folie = schema().tags.folie;
        try {
            for (var li = 0; li < d.layers.length; li++) {
                var L = d.layers[li], rolle = R.hasOwnProperty(L.name) ? R[L.name] : null;
                ebenen.push({ name: L.name, rolle: rolle, sichtbar: L.visible, gesperrt: L.locked, unterebenen: L.layers.length });
                if (rolle !== "plott" && rolle !== "digitaldruck" && rolle !== "sandbox") continue;
                for (var i = 0, n = L.pageItems.length; i < n; i++) {
                    var it = L.pageItems[i];
                    if (it.parent !== L || isHidden(it)) continue;
                    objs.push(objektInfo(it, L, i, rolle, spec.messen && rolle !== "sandbox" && getTag(it, folie) ? temp : null));
                }
            }
        } finally { closeTemp(temp); }
        return ok({ dokument: d.name, pfad: docPath(d), ebenen: ebenen, objekte: objs });
    });
    // liste [{ref: {ebene, index}, id (bisherige IP_Id zur Kontrolle, null = ohne), tags: {schluessel: wert|null}}]: nur Tags schreiben;
    // gesperrte Ebenen und Objekte werden dafür kurz entsperrt
    IP.objektTagsSchreiben = wrap(function (liste) {
        var d = doc(), n = 0, idTag = schema().tags.id;
        for (var i = 0; i < liste.length; i++) {
            var z = liste[i], L = null, it = null;
            try { L = d.layers.getByName(z.ref.ebene); it = L.pageItems[z.ref.index]; } catch (e) { it = null; }
            if (!it || (z.id !== undefined && getTag(it, idTag) !== z.id)) throw "Objekt nicht gefunden: " + z.ref.ebene + " / " + z.ref.index;
            var lg = L.locked, ig = it.locked;
            try { L.locked = false; it.locked = false; tagsSchreiben(it, z.tags); n++; }
            finally { try { it.locked = ig; } catch (e1) { } L.locked = lg; }
        }
        return ok({ geschrieben: n });
    });

    // ---------- Speichern ----------
    // Profil „flach“: PDF aller Zeichenflächen mit dem Preset, ohne Bearbeitungsdaten, ohne PDF-Ebenen; danach ist das Dokument wieder
    // die Arbeitsdatei (gespeichert unter spec.arbeitsdatei). spec {datei, preset, arbeitsdatei}
    IP.pdfSpeichern = wrap(function (spec) {
        var d = doc(), ui = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        try {
            var o = new PDFSaveOptions();
            o.pDFPreset = spec.preset;
            o.artboardRange = "";
            o.trimMarks = false; o.registrationMarks = false; o.colorBars = false; o.pageInformation = false;
            o.preserveEditability = false; o.acrobatLayers = false;
            try { o.viewAfterSaving = false; } catch (e) { }
            d.saveAs(new File(spec.datei), o);
        } finally {
            try { if (spec.arbeitsdatei) d.saveAs(new File(spec.arbeitsdatei), new IllustratorSaveOptions()); } finally { app.userInteractionLevel = ui; }
        }
        return ok({ datei: new File(spec.datei).fsName, dokument: docPath(d) });
    });
    // Arbeitsdatei unter ihrem Pfad speichern
    IP.dokumentSpeichern = wrap(function () { var d = doc(); d.save(); return ok({ pfad: docPath(d) }); });
})();
