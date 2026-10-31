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
    // pfad (optional): Dokument mit diesem Pfad statt des vorderen (Summa, Druck, Export schreiben in die Arbeitsdatei, auch wenn ein Bogen vorn ist)
    function dokumentNachPfad(pfad) {
        for (var i = 0; i < app.documents.length; i++) if (docPath(app.documents[i]) === pfad) return app.documents[i];
        throw "Dokument nicht geöffnet: " + pfad;
    }
    IP.xmpLesen = wrap(function (pfad) { return ok({ text: xmpTextLesen(pfad ? dokumentNachPfad(pfad) : doc()) }); });
    IP.xmpSchreiben = wrap(function (text, pfad) { xmpTextSchreiben(pfad ? dokumentNachPfad(pfad) : doc(), text); return ok({}); });

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
    // alle offenen Dokumente mit Name, Pfad und ip:Dokument (Export: Arbeitsdatei und Druckbögen finden)
    IP.dokumenteListe = wrap(function () {
        var r = [];
        for (var i = 0; i < app.documents.length; i++) { var d = app.documents[i]; r.push({ name: d.name, pfad: docPath(d), xmp: xmpTextLesen(d), vorn: d === app.activeDocument }); }
        return ok({ dokumente: r });
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
    // Vorschau-RGB einer Farbe (nur für den Farbchip im Fenster „Objekt“, grob ohne Farbmanagement); null = unbekannt
    function vorschau(c) {
        try {
            switch (c.typename) {
                case "CMYKColor": return [r0(2.55 * (100 - c.cyan) * (100 - c.black) / 100), r0(2.55 * (100 - c.magenta) * (100 - c.black) / 100), r0(2.55 * (100 - c.yellow) * (100 - c.black) / 100)];
                case "RGBColor": return [r0(c.red), r0(c.green), r0(c.blue)];
                case "GrayColor": return [r0(2.55 * (100 - c.gray)), r0(2.55 * (100 - c.gray)), r0(2.55 * (100 - c.gray))];
                case "SpotColor":
                    var v = vorschau(c.spot.color), t = c.tint / 100;
                    return v ? [r0(255 - (255 - v[0]) * t), r0(255 - (255 - v[1]) * t), r0(255 - (255 - v[2]) * t)] : null;
            }
        } catch (e) { }
        return null;
    }
    // Farbschlüssel einer Füllung: key (exakt, für farbzuordnung), label, spot (Farbfeldname bei Vollton 100 %), rgb (Vorschau)
    function colorKey(c) {
        if (!c) return null;
        switch (c.typename) {
            case "SpotColor":
                var full = c.tint >= 99.5;
                return { key: "spot:" + c.spot.name + (full ? "" : "@" + r0(c.tint)), label: c.spot.name + (full ? "" : " " + r0(c.tint) + " %"), spot: full ? c.spot.name : null, rgb: vorschau(c) };
            case "CMYKColor": var a = [c.cyan, c.magenta, c.yellow, c.black]; return { key: "cmyk:" + map(a, r0).join(","), label: "CMYK " + map(a, r0).join("/"), rgb: vorschau(c) };
            case "RGBColor": var b = [c.red, c.green, c.blue]; return { key: "rgb:" + map(b, r0).join(","), label: "RGB " + map(b, r0).join("/"), rgb: vorschau(c) };
            case "GrayColor": return { key: "gray:" + r0(c.gray), label: "Grau " + r0(c.gray) + " %", rgb: vorschau(c) };
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
        if (getTag(it, schema().tags.originalfarbe)) info.originalfarbe = true; // beim Zuordnen als Plott umgefärbt, Originalfarbe gesichert
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
    // (Länge und Teile, exakte Textumrisse) und nur bei Druck ohne Cutkontur der Motivumriss. blaetter false: nur Tags, Name, Ebene (ohne Blätter);
    // blaetter true: Blätter auch auf der Sandbox (Fenster „Objekt“).
    function objektInfo(top, L, index, rolle, temp, blaetter) {
        var o = { ref: { ebene: L.name, index: index }, ebene: L.name, rolle: rolle, name: top.name || "", typ: top.typename, tags: tagsLesen(top),
            gb: top.geometricBounds, vb: null, cut: false, blaetter: [] };
        o.id = o.tags.id;
        if (blaetter === false) return o;
        if (rolle === "sandbox" && blaetter !== true) return o; // Sandbox: nur gezählt, nicht gemessen
        var leaves = [];
        collectLeaves(top, [], null, [], leaves);
        for (var i = 0; i < leaves.length; i++) { var li = leafInfo(leaves[i], temp); if (li.cut) o.cut = true; o.blaetter.push(li); }
        o.vb = visualBounds(top);
        if (temp && !o.cut && rolle === "digitaldruck") o.umriss = motivUmriss(top, temp);
        if (temp && rolle === "digitaldruck") o.form = formDaten(leaves); // Geometrievergleich der Varianten (§3.1, herkunft.js)
        return o;
    }
    // Pfadgeometrie (pt, Dokumentkoordinaten): Ankerpunkte mit Griffen [ax, ay, links x, links y, rechts x, rechts y] – aus dem alten Kern
    function pfadDaten(it) {
        var pf = it.typename === "CompoundPathItem" ? it.pathItems : (it.typename === "PathItem" ? [it] : []), out = [];
        for (var i = 0; i < pf.length; i++) {
            var pp = pf[i].pathPoints, pk = [];
            for (var j = 0; j < pp.length; j++) { var q = pp[j]; pk.push([q.anchor[0], q.anchor[1], q.leftDirection[0], q.leftDirection[1], q.rightDirection[0], q.rightDirection[1]]); }
            out.push({ geschlossen: pf[i].closed, punkte: pk });
        }
        return out;
    }
    // Form eines Objekts für den Geometrievergleich (aus dem alten Kern): Signatur (Aufbau) und Punkte in pt. Pfade: Anker und Griffe;
    // Text und Bilder: drei Punkte aus ihrer Matrix (Ursprung, + 100 pt in x, + 100 pt in y), Text zusätzlich der Inhalt in der Signatur.
    function formDaten(leaves) {
        var sig = [], pk = [];
        for (var i = 0; i < leaves.length; i++) {
            var it = leaves[i].item, t = it.typename;
            if (t === "PathItem" || t === "CompoundPathItem") {
                var g = pfadDaten(it), z = [];
                for (var p = 0; p < g.length; p++) {
                    var pp = g[p].punkte; z.push(pp.length + (g[p].geschlossen ? "z" : ""));
                    for (var j = 0; j < pp.length; j++) pk.push([pp[j][0], pp[j][1]], [pp[j][2], pp[j][3]], [pp[j][4], pp[j][5]]);
                }
                sig.push("P" + z.join(","));
            } else if (t === "TextFrame" || t === "PlacedItem" || t === "RasterItem") {
                var m = it.matrix, ox = m.mValueTX, oy = m.mValueTY;
                if (t === "TextFrame") { ox = it.anchor[0]; oy = it.anchor[1]; }
                pk.push([ox, oy], [ox + 100 * m.mValueA, oy + 100 * m.mValueB], [ox + 100 * m.mValueC, oy + 100 * m.mValueD]);
                sig.push(t === "TextFrame" ? "T" + it.contents : t.charAt(0));
            } else {
                var b = it.geometricBounds; pk.push([b[0], b[1]], [b[2], b[3]]); sig.push(t);
            }
        }
        return { signatur: sig.join("|"), punkte: pk };
    }
    // spec {rollen: {Ebenenname: Rolle}, messen: true|false, blaetter: false (nur Tags, Name, Ebene)}: oberste Objekte (ohne ausgeblendete) der Ebenen
    // mit Rolle plott, digitaldruck, sandbox in Ebenenreihenfolge. Gemessen (messen) werden nur zugeordnete Objekte (Tag folie) auf plott/digitaldruck.
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
                    objs.push(objektInfo(it, L, i, rolle, spec.messen && rolle !== "sandbox" && getTag(it, folie) ? temp : null, spec.blaetter === false ? false : undefined));
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

    // ---------- Stufe 2b: Auswahl, Zuordnen (Fenster „Objekt“), Auswählen (Fenster „Zusammenfassung“) ----------
    function indexInLayer(item) {
        var pis = item.parent.pageItems;
        for (var i = 0, n = pis.length; i < n; i++) if (pis[i] === item) return i;
        return -1;
    }
    // ausgewählte oberste Objekte bzw. Gruppen der obersten Ebenen (jedes einmal, in Ebenenreihenfolge); Objekte in Unterebenen zählen nicht,
    // r.unterebene meldet, dass die Auswahl solche enthält
    function auswahlOben(d) {
        var sel = [], out = [], unterebene = false;
        try { if (d.selection && d.selection.length !== undefined && d.selection.typename === undefined) sel = d.selection; } catch (e) { sel = []; } // Textbearbeitung: TextRange
        for (var i = 0; i < sel.length; i++) {
            var t = sel[i];
            try { while (t.parent && t.parent.typename !== "Layer") t = t.parent; } catch (e2) { continue; }
            if (!t.parent || t.parent.parent.typename !== "Document") { unterebene = true; continue; }
            var da = false;
            for (var j = 0; j < out.length; j++) if (out[j] === t) da = true;
            if (!da) out.push(t);
        }
        var r = [];
        for (var li = 0; li < d.layers.length; li++) {
            var je = [];
            for (var k = 0; k < out.length; k++) if (out[k].parent === d.layers[li]) je.push({ it: out[k], L: d.layers[li], i: indexInLayer(out[k]) });
            je.sort(function (a, b) { return a.i - b.i; });
            for (var q = 0; q < je.length; q++) r.push(je[q]);
        }
        r.unterebene = unterebene;
        return r;
    }
    // spec {rollen: {Ebenenname: Rolle}, blaetter: true|false}: Objektinfo der Auswahl ohne Messung (Panel: blaetter false, nur Name und Tags);
    // unterebene: die Auswahl enthält Objekte in Unterebenen
    IP.auswahlLesen = wrap(function (spec) {
        if (app.documents.length === 0) return ok({ objekte: [], unterebene: false });
        var d = app.activeDocument, R = (spec && spec.rollen) || {}, a = auswahlOben(d), objs = [];
        for (var i = 0; i < a.length; i++) {
            var rolle = R.hasOwnProperty(a[i].L.name) ? R[a[i].L.name] : null;
            objs.push(objektInfo(a[i].it, a[i].L, a[i].i, rolle, null, spec && spec.blaetter ? true : false));
        }
        return ok({ objekte: objs, unterebene: a.unterebene });
    });
    // Objekt über IP_Id (oberste Objekte aller obersten Ebenen) bzw. über ref {ebene, index}
    function objektFinden(d, z) {
        var idTag = schema().tags.id;
        if (z.id) {
            for (var li = 0; li < d.layers.length; li++) {
                var pis = d.layers[li].pageItems;
                for (var i = 0, n = pis.length; i < n; i++) if (pis[i].parent === d.layers[li] && getTag(pis[i], idTag) === z.id) return pis[i];
            }
            return null;
        }
        try { return d.layers.getByName(z.ref.ebene).pageItems[z.ref.index]; } catch (e) { return null; }
    }
    // liste [{ref, id}] -> genau diese Objekte auswählen (Klick in „Zusammenfassung“)
    IP.objekteAuswaehlen = wrap(function (liste) {
        var d = doc(), n = 0;
        d.selection = null;
        for (var i = 0; i < liste.length; i++) { var it = objektFinden(d, liste[i]); if (it) { try { it.selected = true; n++; } catch (e) { } } }
        return ok({ ausgewaehlt: n });
    });

    // Oracal-Farbfelder (global, Prozessfarbe), aus dem alten Kern: Illustrator erlaubt per Skript keine LAB-Werte für Farbfelder. Daher vorhandenes
    // Feld mit exakt diesem Namen wiederverwenden, sonst globales Feld anlegen und LAB über Illustrators Farbmanagement in den Dokumentfarbraum umrechnen.
    function farbfeldSicher(d, name, lab) {
        try { return d.spots.getByName(name); } catch (e) { }
        var sp = d.spots.add();
        sp.name = name;
        var rgbDoc = d.documentColorSpace === DocumentColorSpace.RGB;
        var v = app.convertSampleColor(ImageColorSpace.LAB, lab, rgbDoc ? ImageColorSpace.RGB : ImageColorSpace.CMYK, ColorConvertPurpose.defaultpurpose);
        var c;
        if (rgbDoc) { c = new RGBColor(); c.red = v[0]; c.green = v[1]; c.blue = v[2]; }
        else { c = new CMYKColor(); c.cyan = v[0]; c.magenta = v[1]; c.yellow = v[2]; c.black = v[3]; }
        sp.color = c;
        sp.colorType = ColorModel.PROCESS; // global
        return sp;
    }
    function volltonFarbe(d, name) { var c = new SpotColor(); c.spot = d.spots.getByName(name); c.tint = 100; return c; }
    // Originalfarben beim Umfärben sichern (Tag IP_Originalfarbe am Pfad bzw. Textrahmen, bei Text je Zeichen; eine schon gesicherte bleibt)
    // und bei Zuordnung als Digitaldruck zurückholen – wie bisher (dort Tag IP_Original)
    function farbeSichern(c) {
        if (!c) return null;
        switch (c.typename) {
            case "CMYKColor": return { t: "cmyk", v: [c.cyan, c.magenta, c.yellow, c.black] };
            case "RGBColor": return { t: "rgb", v: [c.red, c.green, c.blue] };
            case "GrayColor": return { t: "gray", v: [c.gray] };
            case "LabColor": return { t: "lab", v: [c.l, c.a, c.b] };
            case "SpotColor": return { t: "spot", n: c.spot.name, v: [c.tint] };
        }
        return null;
    }
    function farbeAus(d, s) {
        var c = null;
        if (s.t === "cmyk") { c = new CMYKColor(); c.cyan = s.v[0]; c.magenta = s.v[1]; c.yellow = s.v[2]; c.black = s.v[3]; }
        else if (s.t === "rgb") { c = new RGBColor(); c.red = s.v[0]; c.green = s.v[1]; c.blue = s.v[2]; }
        else if (s.t === "gray") { c = new GrayColor(); c.gray = s.v[0]; }
        else if (s.t === "lab") { c = new LabColor(); c.l = s.v[0]; c.a = s.v[1]; c.b = s.v[2]; }
        else if (s.t === "spot") { c = new SpotColor(); c.spot = d.spots.getByName(s.n); c.tint = s.v[0]; }
        return c;
    }
    function originalLesen(item) { var v = getTag(item, schema().tags.originalfarbe); if (!v) return null; try { return parse(v); } catch (e) { return null; } }
    function umfaerben(item, m, d, count) {
        if (isHidden(item)) return;
        var t = item.typename, tag = schema().tags.originalfarbe;
        if (t === "GroupItem") { for (var i = 0; i < item.pageItems.length; i++) umfaerben(item.pageItems[i], m, d, count); return; }
        if (isClipPath(item) || isCutItem(item)) return;
        if (t === "TextFrame") {
            var o = originalLesen(item) || { z: {} }, neu = false;
            if (!o.z) o.z = {};
            for (var c = 0; c < item.characters.length; c++) {
                var ca = item.characters[c].characterAttributes, k = colorKey(ca.fillColor);
                if (k && m.hasOwnProperty(k.key)) {
                    if (!o.z.hasOwnProperty(String(c))) { var fs = farbeSichern(ca.fillColor); if (fs) { o.z[String(c)] = fs; neu = true; } }
                    ca.fillColor = volltonFarbe(d, m[k.key]); count.n++;
                }
            }
            if (neu) setTag(item, tag, stringify(o));
            return;
        }
        var src = t === "CompoundPathItem" ? item.pathItems[0] : (t === "PathItem" ? item : null);
        if (!src || !src.filled) return;
        var key = colorKey(src.fillColor);
        if (!key || !m.hasOwnProperty(key.key)) return;
        if (!originalLesen(item)) { var f0 = farbeSichern(src.fillColor); if (f0) setTag(item, tag, stringify({ f: f0 })); }
        if (t === "CompoundPathItem") { for (var j = 0; j < item.pathItems.length; j++) item.pathItems[j].fillColor = volltonFarbe(d, m[key.key]); }
        else item.fillColor = volltonFarbe(d, m[key.key]);
        count.n++;
    }
    function wiederherstellen(item, d, count) {
        var t = item.typename;
        if (t === "GroupItem") { for (var i = 0; i < item.pageItems.length; i++) wiederherstellen(item.pageItems[i], d, count); return; }
        var o = originalLesen(item);
        if (!o) return;
        if (t === "TextFrame" && o.z) {
            for (var k in o.z) if (o.z.hasOwnProperty(k)) {
                var ci = Number(k);
                if (ci < item.characters.length) { try { item.characters[ci].characterAttributes.fillColor = farbeAus(d, o.z[k]); count.n++; } catch (e) { } }
            }
        } else if (o.f && (t === "PathItem" || t === "CompoundPathItem")) {
            try {
                if (t === "CompoundPathItem") { for (var j = 0; j < item.pathItems.length; j++) item.pathItems[j].fillColor = farbeAus(d, o.f); }
                else item.fillColor = farbeAus(d, o.f);
                count.n++;
            } catch (e2) { }
        }
        setTag(item, schema().tags.originalfarbe, null);
    }
    // spec {ziele: [{ref, id (IP_Id zur Kontrolle, null = ohne), tags: {schluessel: wert|null}}], art: "plott" | "digitaldruck" | null (unverändert),
    //       farben: {colorKey: {name, lab}} (Plott: umfärben), zielEbene: Name | null}
    // Plott färbt um (Originalfarben gesichert), Digitaldruck holt sie zurück; Tags schreiben; danach positionsgleich auf die Zielebene (Stapelfolge bleibt)
    // und ausgewählt. Gesperrte Objekte werden dafür kurz entsperrt; gesperrte Ebenen brechen ab (wie bisher).
    IP.objekteZuordnen = wrap(function (spec) {
        var d = doc(), items = [], idTag = schema().tags.id;
        for (var a = 0; a < spec.ziele.length; a++) {
            var z = spec.ziele[a], it = null;
            try { it = d.layers.getByName(z.ref.ebene).pageItems[z.ref.index]; } catch (e) { it = null; }
            if (!it || getTag(it, idTag) !== (z.id || null)) throw "Objekt nicht gefunden: " + z.ref.ebene + " / " + z.ref.index;
            items.push(it);
        }
        var target = spec.zielEbene ? d.layers.getByName(spec.zielEbene) : null;
        if (target && target.locked) throw "Zielebene „" + spec.zielEbene + "“ ist gesperrt";
        for (var b = 0; b < items.length; b++) if (items[b].layer.locked) throw "Objekt liegt auf gesperrter Ebene „" + items[b].layer.name + "“";
        var map = {}, count = { n: 0 }, zurueck = { n: 0 };
        for (var fk in spec.farben || {}) if (spec.farben.hasOwnProperty(fk)) { farbfeldSicher(d, spec.farben[fk].name, spec.farben[fk].lab); map[fk] = spec.farben[fk].name; }
        for (var i = 0; i < items.length; i++) {
            var x = items[i], gesperrt = x.locked;
            try {
                x.locked = false;
                if (spec.art === "plott") umfaerben(x, map, d, count);
                else if (spec.art === "digitaldruck") wiederherstellen(x, d, zurueck);
                tagsSchreiben(x, spec.ziele[i].tags);
            } finally { try { x.locked = gesperrt; } catch (e3) { } }
        }
        if (target) {
            var folge = [];
            for (var m0 = 0; m0 < items.length; m0++) { var L0 = items[m0].layer, li0 = 0; for (var y = 0; y < d.layers.length; y++) if (d.layers[y] === L0) li0 = y; folge.push({ it: items[m0], k: li0 * 1e6 + indexInLayer(items[m0]) }); }
            folge.sort(function (p1, p2) { return p2.k - p1.k; });
            for (var m1 = 0; m1 < folge.length; m1++) if (folge[m1].it.layer !== target) folge[m1].it.move(target, ElementPlacement.PLACEATBEGINNING); // move() hält die Position
        }
        d.selection = null;
        for (var e = 0; e < items.length; e++) { try { items[e].selected = true; } catch (e4) { } }
        return ok({ umgefaerbt: count.n, wiederhergestellt: zurueck.n });
    });

    // ---------- Stufe 2c: Produktionsdaten (Summa, Druck, Export) – aus dem alten Kern übernommen ----------
    // Koordinaten aus Node in mm, y nach unten; Zeichenflächen ab ihrer linken oberen Ecke.
    function resolve(d, ref, path) {
        var it = d.layers.getByName(ref.ebene).pageItems[ref.index];
        for (var i = 0; i < path.length; i++) it = it.pageItems[path[i]];
        return it;
    }
    function ohneMeldungen(fn) {
        var ui = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        try { return fn(); } finally { app.userInteractionLevel = ui; }
    }
    function findLayer(d, name) { for (var i = 0; i < d.layers.length; i++) if (String(d.layers[i].name).replace(/^\s+|\s+$/g, "").toLowerCase() === name) return d.layers[i]; return null; }
    function cutsIn(item, out) {
        if (item.typename === "GroupItem") { for (var i = 0; i < item.pageItems.length; i++) cutsIn(item.pageItems[i], out); return out; }
        if (isCutItem(item)) out.push(item);
        return out;
    }
    function unionVB(a, c) { // ExtendScript: verschachteltes „!a ? c : …“ liefert für a = null null statt c – daher mit if
        if (!a) return c;
        if (!c) return a;
        return [Math.min(a[0], c[0]), Math.max(a[1], c[1]), Math.max(a[2], c[2]), Math.min(a[3], c[3])];
    }
    // Farbfeld der Cutkontur (cut {name, cmyk} aus der Auftragsart): genau eines; weitere M100-Volltöne werden darauf umgefärbt (nurItems: nur dort)
    function cutFarbfeld(d, cut) {
        try { return d.spots.getByName(cut.name); } catch (e) { }
        var sp;
        try { app.redraw(); sp = d.spots.add(); } catch (e1) { app.redraw(); try { d.activate(); } catch (e2) { } sp = d.spots.add(); }
        sp.name = cut.name;
        var c = new CMYKColor(); c.cyan = cut.cmyk[0]; c.magenta = cut.cmyk[1]; c.yellow = cut.cmyk[2]; c.black = cut.cmyk[3];
        sp.color = c; sp.colorType = ColorModel.SPOT;
        return sp;
    }
    function cutPfade(items, out) {
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (it.typename === "PathItem") out.push(it);
            else if (it.typename === "CompoundPathItem") { for (var k = 0; k < it.pathItems.length; k++) out.push(it.pathItems[k]); }
            else if (it.typename === "GroupItem") cutPfade(it.pageItems, out);
        }
        return out;
    }
    function cutVereinheitlichen(d, cut, nurItems) {
        var m100 = [], ziel = null, i;
        for (i = 0; i < d.spots.length; i++) if (istCutSpot(d.spots[i])) m100.push(d.spots[i]);
        for (i = 0; i < m100.length && !ziel; i++) if (m100[i].name === cut.name) ziel = m100[i];
        if (!ziel) {
            // ein Feld „Cutkontur“ in anderer Farbe ist keine Cutkontur und gibt den Namen frei
            try { var fremd = d.spots.getByName(cut.name); fremd.name = cut.name + " (andere Farbe)"; } catch (e) { }
            if (m100.length) { ziel = m100[0]; ziel.name = cut.name; } else ziel = cutFarbfeld(d, cut);
        }
        var andere = {}, nAndere = 0;
        for (i = 0; i < m100.length; i++) if (m100[i] !== ziel && m100[i].name !== cut.name) { andere[m100[i].name] = m100[i]; nAndere++; }
        if (!nAndere) return;
        var pfade = nurItems ? cutPfade(nurItems, []) : d.pathItems, n = pfade.length, fehlt = {};
        var umfaerben = function (alt) { var sc = new SpotColor(); sc.spot = ziel; sc.tint = alt.tint; return sc; };
        for (i = 0; i < n; i++) {
            var p = pfade[i], name = "";
            try { if (p.stroked && p.strokeColor.typename === "SpotColor" && andere[name = p.strokeColor.spot.name]) { var w = p.strokeWidth; p.strokeColor = umfaerben(p.strokeColor); p.strokeWidth = w; } } catch (e3) { if (name) fehlt[name] = 1; }
            name = "";
            try { if (p.filled && p.fillColor.typename === "SpotColor" && andere[name = p.fillColor.spot.name]) p.fillColor = umfaerben(p.fillColor); } catch (e4) { if (name) fehlt[name] = 1; }
        }
        if (nurItems) return;
        for (var nm in andere) if (andere.hasOwnProperty(nm) && !fehlt[nm]) { try { andere[nm].remove(); } catch (e5) { } }
    }
    function pdfOptionen(preset) {
        var o = new PDFSaveOptions();
        o.pDFPreset = preset; o.artboardRange = "1"; o.acrobatLayers = false; o.preserveEditability = false;
        try { o.viewAfterSaving = false; } catch (e) { }
        return o;
    }

    // Summa (§10): ein Schneidedokument 1:1 als PDF speichern und schließen; die Arbeitsdatei bleibt unverändert.
    // spec {massstab, preset, datei, breite_mm, hoehe_mm, farbfeld, teile: [{name, ref, blaetter: [{path, clips}], x_mm, y_mm, gedreht,
    //       marken: [{x0, y0, x1, y1}] (Realmaß, Dokumentkoordinaten der Arbeitsdatei) | null}]}; x_mm/y_mm = linke obere Ecke des Teils bzw. Blocks
    IP.schneidebogenSpeichern = wrap(function (spec) {
        var work = doc(), wasSaved = work.saved, teile = [];
        ohneMeldungen(function () {
            var cd = newMmDoc(spec.breite_mm, spec.hoehe_mm);
            try {
                var ab = cd.artboards[0].artboardRect, layer = cd.layers[0];
                var abCx = (ab[0] + ab[2]) / 2, abCy = (ab[1] + ab[3]) / 2, k = PT_MM / spec.massstab;
                for (var t = 0; t < spec.teile.length; t++) {
                    var tp = spec.teile[t], fertig = [], dx = null, dy = null;
                    for (var l = 0; l < tp.blaetter.length; l++) {
                        var bl = tp.blaetter[l], src = resolve(work, tp.ref, bl.path);
                        var dup = src.duplicate(layer, ElementPlacement.PLACEATEND); // direkt in eine Gruppe eines anderen Dokuments geht nicht (MRAP)
                        if (dx === null) { var sg = src.geometricBounds, dg = dup.geometricBounds; dx = sg[0] - dg[0]; dy = sg[1] - dg[1]; }
                        if (dup.typename === "TextFrame") dup = dup.createOutline();
                        // Schnittmasken: sichtbaren Teil per Pathfinder „Schnittmengenfläche“ (Crop); eigene Hilfsgruppe auf Ebenenebene
                        for (var c = bl.clips.length - 1; c >= 0; c--) {
                            var tmp = layer.groupItems.add();
                            dup.move(tmp, ElementPlacement.PLACEATEND);
                            var cp = resolve(work, tp.ref, bl.clips[c]).duplicate(layer, ElementPlacement.PLACEATEND);
                            cp.clipping = false;
                            cp.move(tmp, ElementPlacement.PLACEATBEGINNING);
                            cd.selection = null; tmp.selected = true;
                            app.executeMenuCommand("Live Pathfinder Crop");
                            app.executeMenuCommand("expandStyle");
                            if (cd.selection.length !== 1) throw "Schnittmaske in „" + tp.name + "“ ließ sich nicht auflösen";
                            dup = cd.selection[0];
                            cd.selection = null;
                        }
                        fertig.push(dup);
                    }
                    // Passermarken (§10.1) an ihrer Lage im Realmaß, umgerechnet in die Koordinaten der Duplikate (Versatz des ersten Blatts)
                    for (var m = 0; tp.marken && m < tp.marken.length; m++) {
                        var mk = tp.marken[m];
                        var r = layer.pathItems.rectangle(-mk.y0 * k - dy, mk.x0 * k - dx, (mk.x1 - mk.x0) * k, (mk.y1 - mk.y0) * k);
                        r.name = "Passermarke"; r.stroked = false; r.filled = true;
                        try { r.fillColor = volltonFarbe(cd, spec.farbfeld); } catch (e) { }
                        fertig.push(r);
                    }
                    // Gruppe erst NACH allen Pathfinder-Schritten anlegen: existiert beim Crop schon eine leere Gruppe, verschwindet das Ergebnis
                    // nach dem Verschieben in diese Gruppe aus dem PDF (Befund im alten Projekt)
                    var grp = layer.groupItems.add();
                    grp.name = tp.name;
                    for (var fi = 0; fi < fertig.length; fi++) fertig[fi].move(grp, ElementPlacement.PLACEATEND);
                    var g0 = grp.geometricBounds, pct = spec.massstab * 100;
                    grp.translate(abCx - (g0[0] + g0[2]) / 2, abCy - (g0[1] + g0[3]) / 2);
                    grp.resize(pct, pct, true, true, true, true, pct, Transformation.CENTER);
                    if (tp.gedreht) grp.rotate(90, true, true, true, true, Transformation.CENTER);
                    var g1 = grp.geometricBounds;
                    grp.translate(ab[0] + tp.x_mm * PT_MM - g1[0], ab[1] - tp.y_mm * PT_MM - g1[1]);
                    var g2 = grp.geometricBounds;
                    teile.push({ name: tp.name, x_mm: (g2[0] - ab[0]) / PT_MM, y_mm: (ab[1] - g2[1]) / PT_MM, b_mm: (g2[2] - g2[0]) / PT_MM, h_mm: (g2[1] - g2[3]) / PT_MM });
                }
                cd.selection = null;
                cd.saveAs(new File(spec.datei), pdfOptionen(spec.preset));
            } finally {
                cd.close(SaveOptions.DONOTSAVECHANGES);
                work.activate();
            }
        });
        return ok({ teile: teile, arbeitsdateiUnveraendert: work.saved === wasSaved });
    });

    // Druckbogen eines Aufbaus finden: z {aufbau, medium, laminat, nr} gegen bogen im ip:Dokument; das Dokument wird aktiviert
    // (Umwandeln der Symbole läuft über die Auswahl)
    function bogenVon(d) { try { var o = parse(xmpTextLesen(d)); return o && o.rolle === "druckbogen" && o.bogen ? o.bogen : null; } catch (e) { return null; } }
    function bogenDok(z) {
        for (var i = 0; i < app.documents.length; i++) {
            var b = bogenVon(app.documents[i]);
            if (b && String(b.aufbau) === String(z.aufbau) && b.medium === z.medium && b.laminat === z.laminat && Number(b.nr) === Number(z.nr)) {
                if (app.activeDocument !== app.documents[i]) app.activeDocument = app.documents[i];
                return app.activeDocument;
            }
        }
        throw "Druckbogen " + z.medium + " " + z.laminat + " " + z.nr + " nicht mehr geöffnet";
    }
    IP.bogenAktivieren = wrap(function (z) { var d = bogenDok(z); return ok({ dokument: d.name }); });

    // Druck (§11.1): ein Bogen-Dokument (CMYK, mm; Ebenen Druck / Cut / Info) mit Symbolen je IP_Id, nicht gespeichert.
    // spec {massstab, xmp (Text), cut {name, cmyk}, rand_mm, abstand_mm, breite_mm, laenge_mm, info: [Zeilen ohne „Objekte“, „Länge“, „Erstellt“],
    //       laenge_m, teile: [{name, symbol: {name, ref, cuts}, M, herkunft, x_mm, y_mm, b_mm, h_mm, gedreht, obj_x_mm, obj_y_mm, obj_w_mm, obj_h_mm}]}
    // x/y = Lage im Bogen (mm ab linker oberer Ecke der Zeichenfläche); obj_* = Lage der Objekt-Außenkante
    IP.druckbogenAufbauen = wrap(function (spec) {
        var work = doc(), wasSaved = work.saved, ist = [], pruef = [], pd = null;
        ohneMeldungen(function () {
            pd = newMmDoc(spec.breite_mm, spec.laenge_mm);
            var ab = pd.artboards[0].artboardRect;
            var lyDruck = pd.layers[0]; lyDruck.name = "Druck";
            var lyCut = pd.layers.add(); lyCut.name = "Cut";
            var abCx = (ab[0] + ab[2]) / 2, abCy = (ab[1] + ab[3]) / 2, pct = spec.massstab * 100, symbole = {};
            for (var t = 0; t < spec.teile.length; t++) {
                var tp = spec.teile[t], sym = symbole[tp.symbol.name];
                if (!sym) {
                    // Symbol = Objekt 1:1 inkl. vorhandener Cutkontur, Farbfeld vorher auf „Cutkontur“ vereinheitlicht (Symbolinhalt ist später per Skript
                    // nicht erreichbar)
                    var sd = resolve(work, tp.symbol.ref, []).duplicate(lyDruck, ElementPlacement.PLACEATEND), s0 = sd.geometricBounds;
                    sd.translate(abCx - (s0[0] + s0[2]) / 2, abCy - (s0[1] + s0[3]) / 2);
                    sd.resize(pct, pct, true, true, true, true, pct, Transformation.CENTER);
                    cutVereinheitlichen(pd, spec.cut, [sd]);
                    var cuts = cutsIn(sd, []), cb = null, mb = null, lv = [];
                    for (var c = 0; c < cuts.length; c++) cb = unionVB(cb, cuts[c].geometricBounds);
                    collectLeaves(sd, [], null, [], lv);
                    for (var q = 0; q < lv.length; q++) if (!isCutItem(lv[q].item)) mb = unionVB(mb, inter(lv[q].item.typename === "TextFrame" ? lv[q].item.geometricBounds : lv[q].item.visibleBounds, lv[q].clip));
                    if (cb && mb && (cb[0] < mb[0] - 0.01 || cb[1] > mb[1] + 0.01 || cb[2] > mb[2] + 0.01 || cb[3] < mb[3] - 0.01)) pruef.push("„" + tp.symbol.name + "“: Cutkontur ragt über die Objekt-Außenkante");
                    if (cuts.length !== tp.symbol.cuts) pruef.push("„" + tp.symbol.name + "“: " + cuts.length + " Cutkonturen statt " + tp.symbol.cuts);
                    sym = pd.symbols.add(sd); sym.name = tp.symbol.name;
                    sd.remove();
                    symbole[tp.symbol.name] = sym;
                }
                var inst = lyDruck.symbolItems.add(sym);
                if (tp.M) {
                    var mx = app.getIdentityMatrix();
                    mx.mValueA = tp.M[0]; mx.mValueB = tp.M[1]; mx.mValueC = tp.M[2]; mx.mValueD = tp.M[3];
                    inst.transform(mx, true, true, true, true, true, Transformation.CENTER);
                }
                inst.name = tp.name;
                setTag(inst, schema().tags.herkunft, tp.herkunft);
                if (tp.gedreht) inst.rotate(-90, true, true, true, true, Transformation.CENTER);
                // ausrichten an der Objekt-Außenkante (Motiv inkl. Anschnitt und Cutkontur)
                var vb = visualBounds(inst);
                inst.translate(ab[0] + tp.obj_x_mm * PT_MM - vb[0], ab[1] - tp.obj_y_mm * PT_MM - vb[1]);
                var b2 = visualBounds(inst);
                var m = { name: tp.name, x_mm: (b2[0] - ab[0]) / PT_MM, y_mm: (ab[1] - b2[1]) / PT_MM, w_mm: (b2[2] - b2[0]) / PT_MM, h_mm: (b2[1] - b2[3]) / PT_MM };
                ist.push(m);
                var dv = Math.max(Math.abs(m.x_mm - tp.obj_x_mm), Math.abs(m.y_mm - tp.obj_y_mm), Math.abs(m.w_mm - tp.obj_w_mm), Math.abs(m.h_mm - tp.obj_h_mm));
                if (dv >= 0.1) pruef.push("„" + tp.name + "“ weicht " + (Math.round(dv * 100) / 100) + " mm von der Planung ab");
            }
            cutVereinheitlichen(pd, spec.cut);
            // Abstände und OPOS-Rand prüfen
            for (var i = 0; i < ist.length; i++) {
                var p = ist[i];
                if (p.x_mm < spec.rand_mm - 0.05 || p.y_mm < spec.rand_mm - 0.05 || p.x_mm + p.w_mm > spec.breite_mm - spec.rand_mm + 0.05 || p.y_mm + p.h_mm > spec.laenge_mm - spec.rand_mm + 0.05) pruef.push("„" + p.name + "“ liegt im OPOS-Rand");
                for (var j = i + 1; j < ist.length; j++) {
                    var q2 = ist[j];
                    var gap = Math.max(q2.x_mm - (p.x_mm + p.w_mm), p.x_mm - (q2.x_mm + q2.w_mm), q2.y_mm - (p.y_mm + p.h_mm), p.y_mm - (q2.y_mm + q2.h_mm));
                    if (gap < spec.abstand_mm - 0.05) pruef.push("Abstand „" + p.name + "“/„" + q2.name + "“ nur " + (Math.round(gap * 10) / 10) + " mm");
                }
            }
            // Ebene Info: nicht druckend, gesperrt, Text unterhalb der Zeichenfläche
            var lyInfo = pd.layers.add(); lyInfo.name = "Info"; lyInfo.printable = false;
            var zeilen = spec.info.slice(0);
            zeilen.push("Objekte:");
            for (var z = 0; z < ist.length; z++) zeilen.push("  " + ist[z].name + "  " + (Math.round(ist[z].w_mm * 10) / 10) + " × " + (Math.round(ist[z].h_mm * 10) / 10) + " mm");
            zeilen.push("Länge:     " + spec.laenge_m + " m", "Erstellt:  " + new Date().toLocaleString());
            var tf = lyInfo.textFrames.add(); tf.contents = zeilen.join("\r");
            tf.position = [ab[0] + 5 * PT_MM, ab[3] - 8 * PT_MM];
            lyInfo.locked = true;
            xmpTextSchreiben(pd, spec.xmp);
            pd.selection = null;
        });
        work.activate(); // weitere Bögen beziehen sich wieder auf die Arbeitsdatei
        return ok({ dokument: pd.name, teile: ist, pruefung: pruef, arbeitsdateiUnveraendert: work.saved === wasSaved });
    });

    // Export (§11.2): Symbolinstanz umwandeln – breakLink liefert nichts zurück, die umgewandelten Teile stehen aber in der Auswahl (Befund im alten Projekt)
    function umwandeln(d, si) {
        d.selection = null; si.selected = true;
        si.breakLink();
        var out = [], sel = d.selection;
        for (var i = 0; sel && i < sel.length; i++) out.push(sel[i]);
        d.selection = null;
        return out;
    }
    // Prüfen ohne zu ändern: Kopie der Instanz umwandeln, Cutkontur suchen, Teile wieder entfernen
    function symbolHatCut(d, si) {
        var teile = umwandeln(d, si.duplicate()), r = false;
        for (var i = 0; i < teile.length; i++) if (cutsIn(teile[i], []).length) r = true;
        for (var k = teile.length - 1; k >= 0; k--) teile[k].remove();
        return r;
    }
    function bogenEbenen(d) {
        var e = { druck: findLayer(d, "druck"), cut: findLayer(d, "cut"), info: findLayer(d, "info"), regmark: findLayer(d, "regmark") };
        if (!e.druck || !e.cut) throw "Druckbogen „" + d.name + "“ ohne Ebene Druck oder Cut";
        return e;
    }
    function motive(d, L) { var o = []; for (var i = 0; i < L.pageItems.length; i++) if (L.pageItems[i].parent === L && !getTag(L.pageItems[i], schema().tags.druckrichtung)) o.push(L.pageItems[i]); return o; }
    // Sammelprüfung ohne Änderung: jedes Objekt auf „Druck“ braucht eine Cutkontur (im Symbol, im Objekt oder in „Cut <Name>“); Rückgabe der Namen ohne
    IP.bogenPruefen = wrap(function (z) {
        var d = bogenDok(z), e = bogenEbenen(d), ohneCut = [], gesp = d.saved;
        ohneMeldungen(function () {
            var lk = [e.druck.locked, e.cut.locked]; e.druck.locked = false; e.cut.locked = false;
            try {
                var objs = motive(d, e.druck);
                for (var k = 0; k < objs.length; k++) {
                    var o = objs[k], hat = o.typename === "SymbolItem" ? symbolHatCut(d, o) : cutsIn(o, []).length > 0;
                    if (!hat) { try { hat = cutsIn(e.cut.groupItems.getByName("Cut " + o.name), []).length > 0; } catch (x) { } }
                    if (!hat) ohneCut.push(o.name || o.typename);
                }
            } finally { e.druck.locked = lk[0]; e.cut.locked = lk[1]; try { d.saved = gesp; } catch (x2) { } }
        });
        return ok({ dokument: d.name, ohneCut: ohneCut });
    });
    // Instanzen umwandeln, Cutkonturen auf Ebene Cut (Gruppe „Cut <Name>“, Stapel und Lage unverändert), Farbfeld auf „Cutkontur“ vereinheitlichen [R 3.1]
    IP.bogenVorbereiten = wrap(function (z, cut) {
        var d = bogenDok(z), e = bogenEbenen(d), umgewandelt = 0, verschoben = 0;
        ohneMeldungen(function () {
            var lk = [e.druck.locked, e.cut.locked]; e.druck.locked = false; e.cut.locked = false;
            try {
                var objs = motive(d, e.druck);
                for (var j = 0; j < objs.length; j++) {
                    var it = objs[j], name = it.name, teile = [it];
                    if (it.typename === "SymbolItem") { teile = umwandeln(d, it); umgewandelt++; }
                    var cuts = [];
                    for (var t = 0; t < teile.length; t++) cutsIn(teile[t], cuts);
                    if (!cuts.length) continue;
                    var cg; try { cg = e.cut.groupItems.getByName("Cut " + name); } catch (x) { cg = e.cut.groupItems.add(); cg.name = "Cut " + name; }
                    for (var q = cuts.length - 1; q >= 0; q--) { cuts[q].move(cg, ElementPlacement.PLACEATBEGINNING); verschoben++; }
                }
                cutVereinheitlichen(d, cut);
            } finally { e.druck.locked = lk[0]; e.cut.locked = lk[1]; }
        });
        return ok({ dokument: d.name, umgewandelt: umgewandelt, verschoben: verschoben });
    });
    // OPOS (§11.4): Blätter aller sichtbaren Objekte der Ebenen Druck und Cut (sichtbare Begrenzung, Schnittmaske = Begrenzung des Maskenpfads) in mm,
    // y nach unten; Druckrichtungsdreieck nicht; dazu die Zeichenfläche
    function mmBox(r) { return [r[0] / PT_MM, -r[1] / PT_MM, r[2] / PT_MM, -r[3] / PT_MM]; }
    IP.bogenLesen = wrap(function (z) {
        var d = bogenDok(z), bl = [];
        for (var l = 0; l < d.layers.length; l++) {
            var L = d.layers[l], n = String(L.name).toLowerCase();
            if ((n !== "druck" && n !== "cut") || !L.visible) continue;
            for (var i = 0; i < L.pageItems.length; i++) {
                var it = L.pageItems[i];
                if (it.parent !== L || isHidden(it) || getTag(it, schema().tags.druckrichtung)) continue;
                var lv = []; collectLeaves(it, [], null, [], lv); // überspringt ausgeblendete Objekte und Maskenpfade, clip = Begrenzung des Maskenpfads
                for (var k = 0; k < lv.length; k++) bl.push({ vb: mmBox(lv[k].item.typename === "TextFrame" ? lv[k].item.geometricBounds : lv[k].item.visibleBounds), clip: lv[k].clip ? mmBox(lv[k].clip) : null });
            }
        }
        return ok({ dokument: d.name, blaetter: bl, zf: mmBox(d.artboards[0].artboardRect) });
    });
    function regmarkFarbfeld(d) {
        try { return d.spots.getByName("Regmark"); } catch (e) { }
        var s = d.spots.add(); s.name = "Regmark"; var c = new CMYKColor(); c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = 100; s.color = c; s.colorType = ColorModel.SPOT; return s;
    }
    // plan {zf: [x0, y0, x1, y1] mm, objekte: [{name, art: "rechteck" | "linie", gb, punkte, strich_mm}] (Stapel von oben), dreieck: {punkte} | null,
    // info: {format, laenge}}. Ebene „Regmark“ oberste, danach gesperrt; ihr Inhalt und ein vorhandenes Dreieck werden vorher entfernt
    IP.markenZeichnen = wrap(function (z, plan) {
        var d = bogenDok(z), R = null;
        ohneMeldungen(function () {
            var P = function (xy) { return [xy[0] * PT_MM, -xy[1] * PT_MM]; };
            d.artboards[0].artboardRect = [plan.zf[0] * PT_MM, -plan.zf[1] * PT_MM, plan.zf[2] * PT_MM, -plan.zf[3] * PT_MM];
            R = findLayer(d, "regmark");
            if (!R) { R = d.layers.add(); R.name = "Regmark"; }
            R.locked = false; R.visible = true; R.printable = true;
            while (R.pageItems.length) R.pageItems[0].remove();
            while (R.layers.length) R.layers[0].remove();
            R.zOrder(ZOrderMethod.BRINGTOFRONT);
            var sp = regmarkFarbfeld(d), farbe = function () { var c = new SpotColor(); c.spot = sp; c.tint = 100; return c; };
            for (var i = 0; i < plan.objekte.length; i++) {
                var o = plan.objekte[i], p;
                if (o.art === "linie") {
                    p = R.pathItems.add(); p.setEntirePath([P(o.punkte[0]), P(o.punkte[1])]); p.closed = false;
                    p.filled = false; p.stroked = true; p.strokeColor = farbe(); p.strokeWidth = o.strich_mm * PT_MM; p.strokeCap = StrokeCap.BUTTENDCAP;
                } else {
                    p = R.pathItems.rectangle(-o.gb[1] * PT_MM, o.gb[0] * PT_MM, (o.gb[2] - o.gb[0]) * PT_MM, (o.gb[3] - o.gb[1]) * PT_MM);
                    p.filled = true; p.fillColor = farbe(); p.stroked = false;
                }
                p.name = o.name;
                p.move(R, ElementPlacement.PLACEATEND); // in Listenfolge: erstes Objekt oben
            }
            var D = findLayer(d, "druck"), dl = D.locked; D.locked = false;
            for (var k = D.pageItems.length - 1; k >= 0; k--) if (getTag(D.pageItems[k], schema().tags.druckrichtung)) D.pageItems[k].remove();
            if (plan.dreieck) {
                var t = D.pathItems.add(); t.setEntirePath([P(plan.dreieck.punkte[0]), P(plan.dreieck.punkte[1]), P(plan.dreieck.punkte[2])]); t.closed = true;
                t.filled = true; t.fillColor = farbe(); t.stroked = false;
                setTag(t, schema().tags.druckrichtung, "1"); // ohne Namen, erkannt am Tag
            }
            D.locked = dl;
            R.locked = true;
            // Info-Ebene: Zeilen „Format“ und „Länge“
            var I = findLayer(d, "info");
            if (I && plan.info) {
                var il = I.locked; I.locked = false;
                for (var f = 0; f < I.textFrames.length; f++) {
                    var zl = String(I.textFrames[f].contents).split(/\r|\n/);
                    for (var q = 0; q < zl.length; q++) { if (/^Format:/.test(zl[q])) zl[q] = plan.info.format; else if (/^Länge:/.test(zl[q])) zl[q] = plan.info.laenge; }
                    I.textFrames[f].contents = zl.join("\r");
                    I.textFrames[f].position = [plan.zf[0] * PT_MM + 5 * PT_MM, -plan.zf[3] * PT_MM - 8 * PT_MM]; // unterhalb der Zeichenfläche wie beim Aufbau
                }
                I.locked = il;
            }
            d.selection = null;
        });
        return ok({ dokument: d.name, regmark: R.pageItems.length });
    });
    // spec {ziel, art: "druck" (Ebenen Druck + Regmark) | "cut" (Cut + Regmark) | "ai" (alle Ebenen im Ausgangszustand, danach schließen), datei, preset}
    IP.bogenSpeichern = wrap(function (spec) {
        var d = bogenDok(spec.ziel), e = bogenEbenen(d), states = [];
        if (!e.regmark) throw "Druckbogen „" + d.name + "“ ohne Ebene Regmark";
        for (var li = 0; li < d.layers.length; li++) states.push({ ly: d.layers[li], vis: d.layers[li].visible, lck: d.layers[li].locked });
        function sichtbar(ly, v) { if (!ly) return; try { ly.locked = false; } catch (x) { } try { ly.visible = v; } catch (x2) { } }
        function zurueck() { for (var k = 0; k < states.length; k++) { try { states[k].ly.locked = false; } catch (x) { } try { states[k].ly.visible = states[k].vis; } catch (x2) { } try { states[k].ly.locked = states[k].lck; } catch (x3) { } } }
        ohneMeldungen(function () {
            try {
                if (spec.art === "ai") {
                    var ao = new IllustratorSaveOptions(); try { ao.pdfCompatible = true; } catch (x) { }
                    d.saveAs(new File(spec.datei), ao);
                } else {
                    // acrobatLayers aus: sonst schreibt PDF/X-4 ausgeblendete Ebenen als unsichtbare Ebenen mit ins PDF (Befund im alten Projekt)
                    sichtbar(e.druck, spec.art === "druck"); sichtbar(e.cut, spec.art === "cut"); sichtbar(e.info, false); sichtbar(e.regmark, true);
                    d.saveAs(new File(spec.datei), pdfOptionen(spec.preset));
                }
            } finally { zurueck(); }
        });
        if (spec.art === "ai") d.close(SaveOptions.DONOTSAVECHANGES);
        return ok({ datei: new File(spec.datei).fsName });
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
    // Arbeitsdatei unter ihrem Pfad speichern; pfad (optional): dieses Dokument. save() speichert nur das vordere Dokument (Befund im alten Projekt,
    // Stufe 24) – kurz nach vorn holen, danach das vorherige Dokument wieder
    IP.dokumentSpeichern = wrap(function (pfad) {
        var d = pfad ? dokumentNachPfad(pfad) : doc(), vorn = app.activeDocument;
        if (vorn !== d) app.activeDocument = d;
        try { d.save(); } finally { if (vorn !== d) { try { app.activeDocument = vorn; } catch (e) { } } }
        return ok({ pfad: docPath(d), gespeichert: d.saved });
    });
})();
