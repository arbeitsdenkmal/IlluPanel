#target illustrator
(function () {

    // ================================================================
    // WEA-ETIKETTEN  v2.9
    // Zuweisung Betonring / Gitterscheibe  ->  Produktionsnutzen
    // ================================================================
    // Laeuft ohne externe Hilfsprogramme. PDF und XLSX werden vom
    // Skript selbst zerlegt, Text-/CSV-Dateien direkt gelesen.
    //
    // Ablauf:
    //   0. Arbeitsordner ~/Desktop/GitterMaster: Kundendateien liegen
    //      dort direkt, die Vorlage unter "Vorlagen". Die Stueckzahl
    //      kommt aus dem Praefix "15x_" im Dateinamen.
    //   1. Vorlage, Kundendateien (PDF/XLSX/TXT/CSV) und Stueckzahl
    //   2. Typbezeichnung je Datei bestaetigen (mit Gedaechtnis)
    //   3. Varianten rechnen: ein Bogen mit n Drucken gegen eine Folge
    //      mehrerer Boegen, zur Auswahl gestellt
    //   4. Aufbauen, Ebenen Druck/Cut/Info, Auswahl setzen
    //   5. OPOS, dann Nutzen_Speichern.jsx
    //
    // Geometrie (fix):
    //   Etikett            90 x 36 mm (Cutkontur)
    //   Teilung im Streifen    40 mm
    //   Teilung Streifen      110 mm
    //   Streifen bleiben immer am Stueck.
    //
    // Vorlage (.ait) braucht diese Objektnamen:
    //   Cutkontur, Ring, Nummer, Logo
    // ================================================================

    var TEILUNG_ETIKETT = 40;
    var TEILUNG_STREIFEN = 110;
    // Feste nutzbare Bahnbreite ohne OPOS-Rand. Ein querliegender
    // Streifen muss hier hineinpassen: 32 Etiketten (1276 mm) gehen,
    // 33 Etiketten (1316 mm) nicht mehr - mit den Marken waere das
    // breiter als das Material. Laengs bleiben es dadurch 12 Streifen
    // nebeneinander (12 x 110 - 20 = 1300 mm).
    var NUTZBREITE = 1310;
    var OPOS_RAND_W = 60;
    var OPOS_RAND_H = 50;
    var MAX_BAHNLAENGE = 2000;
    var SHRINK_SCHRITT = 0.5;
    var SHRINK_MIN = 4;

    // Fester Arbeitsordner: hier liegen die Kundendateien der aktuellen
    // Bestellung, im Unterordner "Vorlagen" die Etikettenvorlage.
    var ARBEIT = new Folder(Folder.desktop.fsName + "/GitterMaster");
    var VORLAGEN = new Folder(ARBEIT.fsName + "/Vorlagen");
    var VORLAGE_NAME = "Etikett.ait";

    var MM_PT = 72 / 25.4;
    function toPt(mm) { return mm * MM_PT; }
    function toMm(pt) { return pt / MM_PT; }
    function r1(x) { return Math.round(x * 10) / 10; }
    function r2(x) { return Math.round(x * 100) / 100; }

    var warnungen = [];
    function warn(s) { warnungen.push(s); }

    function trimm(s) {
        return String(s).replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
    }
    function normLeer(s) {
        return trimm(String(s).replace(/[\s\u00A0]+/g, " "));
    }
    function kurz(s, n) {
        n = n || 60;
        s = normLeer(s);
        return (s.length <= n) ? s : (s.substring(0, n - 1) + "\u2026");
    }

    var WEA_RE = /\bWEA\s*\d{4,}\b/i;
    var WEA_RE_G = /\bWEA\s*\d{4,}\b/ig;

    // ================================================================
    // QUELLEN LESEN
    // Ergebnis jeweils: Array von Zeilen, Zeile = Array von Zellen
    // ================================================================

    function leseTextdatei(datei) {
        var kodierungen = ["UTF-8", "windows-1252", "macintosh"];
        var inhalt = null;
        for (var k = 0; k < kodierungen.length; k++) {
            try {
                datei.encoding = kodierungen[k];
                if (!datei.open("r")) continue;
                inhalt = datei.read();
                datei.close();
                if (inhalt && inhalt.length) break;
            } catch (e) {
                try { datei.close(); } catch (_) {}
            }
        }
        if (inhalt === null) throw new Error("Datei nicht lesbar: " + datei.name);

        var zeilen = inhalt.split(/\r\n|\r|\n/);
        var rows = [];
        for (var i = 0; i < zeilen.length; i++) {
            var z = zeilen[i];
            var zellen;
            if (z.indexOf("\t") !== -1) zellen = z.split("\t");
            else if (z.indexOf(";") !== -1) zellen = z.split(";");
            else zellen = [z];
            var sauber = [];
            for (var c = 0; c < zellen.length; c++) {
                var v = trimm(zellen[c]);
                if (v !== "") sauber.push(v);
            }
            rows.push(sauber);
        }
        return rows;
    }

    // ================================================================
    // XLSX LESEN
    // Eine .xlsx ist ein ZIP-Archiv. Ohne externe Hilfsprogramme wird
    // hier das Archiv selbst geoeffnet und der Deflate-Strom entpackt.
    // Gelesen werden nur xl/sharedStrings.xml und das erste Blatt.
    // ================================================================

    function BYTE(s, i) { return s.charCodeAt(i) & 0xFF; }
    function U16(s, i) { return BYTE(s, i) | (BYTE(s, i + 1) << 8); }
    function U32(s, i) {
        return BYTE(s, i) + BYTE(s, i + 1) * 256 + BYTE(s, i + 2) * 65536
             + BYTE(s, i + 3) * 16777216;
    }

    function Bitleser(daten, pos) {
        this.d = daten; this.p = pos; this.b = 0; this.n = 0;
    }
    Bitleser.prototype.bits = function (anzahl) {
        while (this.n < anzahl) {
            this.b |= BYTE(this.d, this.p++) << this.n;
            this.n += 8;
        }
        var v = this.b & ((1 << anzahl) - 1);
        this.b >>>= anzahl;
        this.n -= anzahl;
        return v;
    };
    Bitleser.prototype.ausrichten = function () { this.b = 0; this.n = 0; };

    function Huffman(laengen) {
        var maxBits = 0, i;
        for (i = 0; i < laengen.length; i++) {
            if (laengen[i] > maxBits) maxBits = laengen[i];
        }
        var anzahl = [];
        for (i = 0; i <= maxBits; i++) anzahl[i] = 0;
        for (i = 0; i < laengen.length; i++) anzahl[laengen[i]]++;
        anzahl[0] = 0;

        var offsets = [0, 0];
        for (i = 1; i <= maxBits; i++) offsets[i + 1] = offsets[i] + anzahl[i];

        var sortiert = [];
        for (i = 0; i < laengen.length; i++) {
            if (laengen[i]) sortiert[offsets[laengen[i]]++] = i;
        }
        this.anzahl = anzahl;
        this.symbole = sortiert;
        this.maxBits = maxBits;
    }

    function dekodiere(bl, huff) {
        var code = 0, erste = 0, index = 0;
        for (var laenge = 1; laenge <= huff.maxBits; laenge++) {
            code |= bl.bits(1);
            var zahl = huff.anzahl[laenge];
            if (code - erste < zahl) return huff.symbole[index + (code - erste)];
            index += zahl;
            erste = (erste + zahl) << 1;
            code <<= 1;
        }
        throw new Error("Deflate: ungueltiger Huffman-Code");
    }

    var LAENGE_BASIS = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,
                        67,83,99,115,131,163,195,227,258];
    var LAENGE_EXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var DIST_BASIS = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,
                      1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    var DIST_EXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,
                      12,12,13,13];
    var CL_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

    var fixLit = null, fixDist = null;
    function festeBaeume() {
        if (fixLit) return;
        var l = [], i;
        for (i = 0; i < 144; i++) l[i] = 8;
        for (i = 144; i < 256; i++) l[i] = 9;
        for (i = 256; i < 280; i++) l[i] = 7;
        for (i = 280; i < 288; i++) l[i] = 8;
        fixLit = new Huffman(l);
        var d = [];
        for (i = 0; i < 30; i++) d[i] = 5;
        fixDist = new Huffman(d);
    }

    function inflate(daten, pos, erwartet) {
        var bl = new Bitleser(daten, pos);
        var out = [];
        var fertig = false;

        while (!fertig) {
            var letzter = bl.bits(1);
            var typ = bl.bits(2);

            if (typ === 0) {
                bl.ausrichten();
                var len = U16(daten, bl.p);
                bl.p += 4;
                for (var s = 0; s < len; s++) out.push(daten.charAt(bl.p++));
            } else {
                var lit, dist;
                if (typ === 1) {
                    festeBaeume();
                    lit = fixLit; dist = fixDist;
                } else if (typ === 2) {
                    var hlit = bl.bits(5) + 257;
                    var hdist = bl.bits(5) + 1;
                    var hclen = bl.bits(4) + 4;
                    var cl = [], c;
                    for (c = 0; c < 19; c++) cl[c] = 0;
                    for (c = 0; c < hclen; c++) cl[CL_ORDER[c]] = bl.bits(3);
                    var clBaum = new Huffman(cl);

                    var laengen = [];
                    var i2 = 0;
                    while (i2 < hlit + hdist) {
                        var sym = dekodiere(bl, clBaum);
                        if (sym < 16) {
                            laengen[i2++] = sym;
                        } else if (sym === 16) {
                            var vorher = laengen[i2 - 1];
                            var w = 3 + bl.bits(2);
                            while (w--) laengen[i2++] = vorher;
                        } else if (sym === 17) {
                            var w2 = 3 + bl.bits(3);
                            while (w2--) laengen[i2++] = 0;
                        } else {
                            var w3 = 11 + bl.bits(7);
                            while (w3--) laengen[i2++] = 0;
                        }
                    }
                    lit = new Huffman(laengen.slice(0, hlit));
                    dist = new Huffman(laengen.slice(hlit, hlit + hdist));
                } else {
                    throw new Error("Deflate: unbekannter Blocktyp");
                }

                while (true) {
                    var sym2 = dekodiere(bl, lit);
                    if (sym2 < 256) {
                        out.push(String.fromCharCode(sym2));
                    } else if (sym2 === 256) {
                        break;
                    } else {
                        sym2 -= 257;
                        var laenge = LAENGE_BASIS[sym2] + bl.bits(LAENGE_EXTRA[sym2]);
                        var dsym = dekodiere(bl, dist);
                        var abstand = DIST_BASIS[dsym] + bl.bits(DIST_EXTRA[dsym]);
                        var start = out.length - abstand;
                        for (var k = 0; k < laenge; k++) out.push(out[start + k]);
                    }
                }
            }
            if (letzter) fertig = true;
            if (erwartet && out.length >= erwartet) fertig = true;
        }
        return out.join("");
    }

    function zipEintraege(daten) {
        var eocd = -1;
        var min = Math.max(0, daten.length - 66000);
        for (var i = daten.length - 22; i >= min; i--) {
            if (BYTE(daten, i) === 0x50 && BYTE(daten, i + 1) === 0x4B
                && BYTE(daten, i + 2) === 0x05 && BYTE(daten, i + 3) === 0x06) {
                eocd = i; break;
            }
        }
        if (eocd < 0) throw new Error("Kein ZIP-Verzeichnis gefunden.");

        var anzahl = U16(daten, eocd + 10);
        var start = U32(daten, eocd + 16);

        var liste = [];
        var p = start;
        for (var e = 0; e < anzahl; e++) {
            if (U32(daten, p) !== 0x02014b50) break;
            var methode = U16(daten, p + 10);
            var origGr = U32(daten, p + 24);
            var nameLen = U16(daten, p + 28);
            var extraLen = U16(daten, p + 30);
            var kommLen = U16(daten, p + 32);
            var lokal = U32(daten, p + 42);
            var name = daten.substr(p + 46, nameLen);
            liste.push({ name: name, methode: methode,
                         origGr: origGr, lokal: lokal });
            p += 46 + nameLen + extraLen + kommLen;
        }
        return liste;
    }

    function zipLies(daten, eintrag) {
        var p = eintrag.lokal;
        if (U32(daten, p) !== 0x04034b50) throw new Error("ZIP: Header defekt.");
        var nameLen = U16(daten, p + 26);
        var extraLen = U16(daten, p + 28);
        var start = p + 30 + nameLen + extraLen;

        if (eintrag.methode === 0) return daten.substr(start, eintrag.origGr);
        if (eintrag.methode === 8) return inflate(daten, start, eintrag.origGr);
        throw new Error("ZIP: Kompression " + eintrag.methode
                        + " wird nicht unterstuetzt.");
    }

    function xmlEntities(s) {
        return s.replace(/&#x([0-9a-fA-F]+);/g, function (m, h) {
                    return String.fromCharCode(parseInt(h, 16));
                })
                .replace(/&#(\d+);/g, function (m, d) {
                    return String.fromCharCode(parseInt(d, 10));
                })
                .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
                .replace(/&amp;/g, "&");
    }

    function utf8Dekodieren(s) {
        var out = [], i = 0;
        while (i < s.length) {
            var c = s.charCodeAt(i) & 0xFF;
            if (c < 0x80) { out.push(String.fromCharCode(c)); i++; }
            else if (c < 0xE0 && i + 1 < s.length) {
                out.push(String.fromCharCode(((c & 0x1F) << 6)
                        | (s.charCodeAt(i + 1) & 0x3F)));
                i += 2;
            } else if (c < 0xF0 && i + 2 < s.length) {
                out.push(String.fromCharCode(((c & 0x0F) << 12)
                        | ((s.charCodeAt(i + 1) & 0x3F) << 6)
                        | (s.charCodeAt(i + 2) & 0x3F)));
                i += 3;
            } else { out.push(String.fromCharCode(c)); i++; }
        }
        return out.join("");
    }

    function sharedStrings(xml) {
        var out = [];
        var p = 0;
        while (true) {
            var auf = xml.indexOf("<si", p);
            if (auf < 0) break;
            var nach = xml.charAt(auf + 3);
            if (nach !== " " && nach !== ">" && nach !== "/") { p = auf + 3; continue; }
            var zu = xml.indexOf(">", auf);
            if (zu < 0) break;
            if (xml.charAt(zu - 1) === "/") { out.push(""); p = zu + 1; continue; }
            var ende = xml.indexOf("</si>", zu);
            if (ende < 0) break;
            out.push(xmlEntities(alleTexte(xml.substring(zu + 1, ende))));
            p = ende + 5;
        }
        return out;
    }

    function spaltenIndex(ref) {
        var n = 0;
        for (var i = 0; i < ref.length; i++) {
            var ch = ref.charAt(i).toUpperCase();
            if (ch >= "A" && ch <= "Z") n = n * 26 + (ch.charCodeAt(0) - 64);
            else break;
        }
        return n - 1;
    }

    function attrWert(kopf, name) {
        // Deterministisch statt per Regex: ExtendScript wertet
        // Alternationen mit non-greedy Gruppen anders aus als erwartet.
        var suche = " " + name + "=\"";
        var p = kopf.indexOf(suche);
        if (p < 0) return "";
        p += suche.length;
        var q = kopf.indexOf("\"", p);
        if (q < 0) return "";
        return kopf.substring(p, q);
    }

    function tagInhalt(s, tag) {
        // Inhalt des ersten <tag ...>...</tag>
        var auf = s.indexOf("<" + tag);
        if (auf < 0) return null;
        var zu = s.indexOf(">", auf);
        if (zu < 0) return null;
        if (s.charAt(zu - 1) === "/") return "";
        var ende = s.indexOf("</" + tag + ">", zu);
        if (ende < 0) return null;
        return s.substring(zu + 1, ende);
    }

    function alleTexte(s) {
        // Inhalt aller <t>-Elemente aneinandergehaengt
        var out = "";
        var p = 0;
        while (true) {
            var auf = s.indexOf("<t", p);
            if (auf < 0) break;
            var nach = s.charAt(auf + 2);
            if (nach !== " " && nach !== ">" && nach !== "/") { p = auf + 2; continue; }
            var zu = s.indexOf(">", auf);
            if (zu < 0) break;
            if (s.charAt(zu - 1) === "/") { p = zu + 1; continue; }
            var ende = s.indexOf("</t>", zu);
            if (ende < 0) break;
            out += s.substring(zu + 1, ende);
            p = ende + 4;
        }
        return out;
    }

    function zellenAusZeile(inhalt, shared) {
        var zellen = [];
        var p = 0;
        while (true) {
            var cs = inhalt.indexOf("<c", p);
            if (cs < 0) break;
            var nach = inhalt.charAt(cs + 2);
            if (nach !== " " && nach !== ">" && nach !== "/") { p = cs + 2; continue; }

            var ck = inhalt.indexOf(">", cs);
            if (ck < 0) break;
            var kopf = inhalt.substring(cs, ck);
            var leer = (inhalt.charAt(ck - 1) === "/");

            var body = "", ende;
            if (leer) {
                ende = ck + 1;
            } else {
                ende = inhalt.indexOf("</c>", ck);
                if (ende < 0) break;
                body = inhalt.substring(ck + 1, ende);
                ende += 4;
            }
            p = ende;

            var ref = attrWert(kopf, "r");
            var typ = attrWert(kopf, "t");
            var idx = ref ? spaltenIndex(ref) : zellen.length;
            if (idx < 0) idx = zellen.length;

            var wert = "";
            if (typ === "inlineStr") {
                wert = xmlEntities(alleTexte(body));
            } else if (typ === "str") {
                var vs = tagInhalt(body, "v");
                wert = (vs === null) ? "" : xmlEntities(vs);
            } else {
                var v = tagInhalt(body, "v");
                wert = (v === null) ? "" : xmlEntities(v);
                if (typ === "s" && wert !== "") {
                    var si = parseInt(wert, 10);
                    wert = (!isNaN(si) && si >= 0 && si < shared.length)
                         ? shared[si] : "";
                }
            }

            wert = normLeer(wert);
            if (wert !== "") zellen[idx] = wert;
        }

        var kompakt = [];
        for (var z = 0; z < zellen.length; z++) {
            if (zellen[z] !== undefined && zellen[z] !== "") kompakt.push(zellen[z]);
        }
        return kompakt;
    }

    function blattZeilen(xml, shared) {
        var zeilen = [];
        var pos = xml.indexOf("<sheetData");
        if (pos < 0) pos = 0;
        while (true) {
            var rs = xml.indexOf("<row", pos);
            if (rs < 0) break;
            var nachR = xml.charAt(rs + 4);
            if (nachR !== " " && nachR !== ">" && nachR !== "/") { pos = rs + 4; continue; }
            var rk = xml.indexOf(">", rs);
            if (rk < 0) break;

            var inhalt = "", re;
            if (xml.charAt(rk - 1) === "/") {
                re = rk + 1;
            } else {
                re = xml.indexOf("</row>", rk);
                if (re < 0) break;
                inhalt = xml.substring(rk + 1, re);
                re += 6;
            }
            pos = re;
            zeilen.push(zellenAusZeile(inhalt, shared));
        }
        return zeilen;
    }

    function leseXLSX(datei) {
        var roh = null;
        try {
            datei.encoding = "BINARY";
            if (!datei.open("r")) throw new Error("Datei nicht lesbar.");
            roh = datei.read();
            datei.close();
        } catch (e) {
            try { datei.close(); } catch (_) {}
            throw new Error("Arbeitsmappe nicht lesbar: " + (e.message || e));
        }
        if (!roh || roh.length < 100) {
            throw new Error("Arbeitsmappe ist leer oder beschaedigt: " + datei.name);
        }

        var eintraege = zipEintraege(roh);
        var sharedE = null, blattE = null, blattName = null;
        for (var i = 0; i < eintraege.length; i++) {
            var n = eintraege[i].name;
            if (n === "xl/sharedStrings.xml") sharedE = eintraege[i];
            if (n.indexOf("xl/worksheets/sheet") === 0
                && n.substr(n.length - 4) === ".xml") {
                if (blattName === null || n < blattName) {
                    blattName = n; blattE = eintraege[i];
                }
            }
        }
        if (!blattE) throw new Error("Kein Tabellenblatt in " + datei.name);

        var shared = [];
        if (sharedE) {
            shared = sharedStrings(utf8Dekodieren(zipLies(roh, sharedE)));
        }
        return blattZeilen(utf8Dekodieren(zipLies(roh, blattE)), shared);
    }

    // ================================================================
    // PDF LESEN
    // Illustrator gibt beim Oeffnen eines PDF nur die rohen Zeichen-
    // codes der Subset-Schrift zurueck, kein lesbares Wort. Deshalb
    // wird das PDF hier selbst zerlegt: Objekte suchen, Seite finden,
    // ToUnicode-Tabellen der Schriften lesen, Inhaltsstrom entpacken
    // (mit demselben Inflate wie bei XLSX) und die Textoperatoren mit
    // ihren Positionen auswerten.
    // ================================================================

    function pdfBYTE(s, i) { return s.charCodeAt(i) & 0xFF; }

    // ---------------------------------------------------------------
    // Objekte im PDF finden:  "<n> 0 obj" ... "endobj"
    // ---------------------------------------------------------------
    function pdfObjekte(roh) {
        var objekte = {};
        var p = 0;
        while (true) {
            var q = roh.indexOf(" obj", p);
            if (q < 0) break;

            // rueckwaerts: "<num> <gen>"
            var r = q;
            var i = r - 1;
            while (i >= 0 && roh.charAt(i) >= "0" && roh.charAt(i) <= "9") i--;
            var genStart = i + 1;
            if (genStart >= r) { p = q + 4; continue; }
            while (i >= 0 && (roh.charAt(i) === " " || roh.charAt(i) === "\r"
                   || roh.charAt(i) === "\n")) i--;
            var numEnde = i + 1;
            while (i >= 0 && roh.charAt(i) >= "0" && roh.charAt(i) <= "9") i--;
            var numStart = i + 1;
            if (numStart >= numEnde) { p = q + 4; continue; }

            var num = roh.substring(numStart, numEnde);
            var ende = roh.indexOf("endobj", q);
            if (ende < 0) ende = roh.length;
            objekte[num] = { start: q + 4, ende: ende };
            p = ende;
        }
        return objekte;
    }

    function pdfObjInhalt(roh, objekte, num) {
        var o = objekte[String(num)];
        if (!o) return null;
        return roh.substring(o.start, o.ende);
    }

    // Stream eines Objekts entpacken
    function pdfStream(roh, objekte, num, inflateFn) {
        var o = objekte[String(num)];
        if (!o) return null;
        var abschnitt = roh.substring(o.start, o.ende);
        var s = abschnitt.indexOf("stream");
        if (s < 0) return null;

        var kopf = abschnitt.substring(0, s);
        var d = s + 6;
        if (abschnitt.charAt(d) === "\r") d++;
        if (abschnitt.charAt(d) === "\n") d++;

        var e = abschnitt.indexOf("endstream", d);
        if (e < 0) e = abschnitt.length;
        var daten = abschnitt.substring(d, e);

        if (kopf.indexOf("FlateDecode") >= 0) {
            // zlib-Kopf (2 Byte) ueberspringen
            var voll = daten;
            try {
                return inflateFn(voll, 2, 0);
            } catch (err) {
                return null;
            }
        }
        return daten;
    }

    // ---------------------------------------------------------------
    // ToUnicode-CMap auswerten
    // ---------------------------------------------------------------
    function hexZuZahl(h) { return parseInt(h, 16); }

    function hexZuText(h) {
        // UTF-16BE in Hex -> Text
        var out = "";
        for (var i = 0; i + 3 < h.length + 1; i += 4) {
            var stueck = h.substring(i, i + 4);
            if (stueck.length < 4) break;
            out += String.fromCharCode(parseInt(stueck, 16));
        }
        return out;
    }

    function naechstesHex(s, von) {
        var a = s.indexOf("<", von);
        if (a < 0) return null;
        var b = s.indexOf(">", a);
        if (b < 0) return null;
        return { hex: s.substring(a + 1, b), ende: b + 1 };
    }

    function cmapLesen(text) {
        var tabelle = {};
        if (!text) return tabelle;

        // bfchar
        var p = 0;
        while (true) {
            var a = text.indexOf("beginbfchar", p);
            if (a < 0) break;
            var e = text.indexOf("endbfchar", a);
            if (e < 0) break;
            var block = text.substring(a + 11, e);
            var q = 0;
            while (true) {
                var h1 = naechstesHex(block, q);
                if (!h1) break;
                var h2 = naechstesHex(block, h1.ende);
                if (!h2) break;
                tabelle[hexZuZahl(h1.hex)] = hexZuText(h2.hex);
                q = h2.ende;
            }
            p = e + 9;
        }

        // bfrange
        p = 0;
        while (true) {
            var a2 = text.indexOf("beginbfrange", p);
            if (a2 < 0) break;
            var e2 = text.indexOf("endbfrange", a2);
            if (e2 < 0) break;
            var block2 = text.substring(a2 + 12, e2);
            var q2 = 0;
            while (true) {
                var v = naechstesHex(block2, q2);
                if (!v) break;
                var b = naechstesHex(block2, v.ende);
                if (!b) break;

                // danach entweder <hex> oder [ <hex> <hex> ... ]
                var rest = block2.substring(b.ende);
                var eckig = rest.indexOf("[");
                var spitz = rest.indexOf("<");
                var von = hexZuZahl(v.hex), bis = hexZuZahl(b.hex);

                if (eckig >= 0 && (spitz < 0 || eckig < spitz)) {
                    var zu = rest.indexOf("]");
                    if (zu < 0) break;
                    var liste = rest.substring(eckig + 1, zu);
                    var lq = 0, code = von;
                    while (code <= bis) {
                        var lh = naechstesHex(liste, lq);
                        if (!lh) break;
                        tabelle[code] = hexZuText(lh.hex);
                        lq = lh.ende;
                        code++;
                    }
                    q2 = b.ende + zu + 1;
                } else {
                    var z = naechstesHex(block2, b.ende);
                    if (!z) break;
                    var basis = hexZuZahl(z.hex);
                    for (var c = von; c <= bis; c++) {
                        tabelle[c] = String.fromCharCode(basis + (c - von));
                    }
                    q2 = z.ende;
                }
            }
            p = e2 + 10;
        }

        return tabelle;
    }

    // ---------------------------------------------------------------
    // Seiteninhalt auswerten
    // ---------------------------------------------------------------
    function zahlAus(s) {
        var v = parseFloat(s);
        return isNaN(v) ? 0 : v;
    }

    var SPALTEN_VERSATZ = 250;   // 1/1000 Texteinheiten

    function pdfTextStuecke(inhalt, fonts) {
        // Liefert [{x, y, groesse, text}]
        var stuecke = [];
        var tm = [1, 0, 0, 1, 0, 0];
        var tlm = [1, 0, 0, 1, 0, 0];
        var leading = 0;
        var fontGroesse = 10;
        var aktuelleMap = null;

        var i = 0;
        var laenge = inhalt.length;
        var stack = [];

        function istWS(c) {
            return c === " " || c === "\r" || c === "\n" || c === "\t";
        }

        function multipliziere(a, b) {
            return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
                    a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
                    a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]];
        }

        function dekodiereString(s) {
            var out = "";
            for (var k = 0; k < s.length; k++) {
                var code = s.charCodeAt(k) & 0xFF;
                if (aktuelleMap && aktuelleMap[code] !== undefined) {
                    out += aktuelleMap[code];
                } else {
                    out += String.fromCharCode(code);
                }
            }
            return out;
        }

        function ausgeben(txt) {
            if (txt === "") return;
            stuecke.push({ x: tm[4], y: tm[5],
                           groesse: Math.abs(fontGroesse * tm[3]) || Math.abs(fontGroesse),
                           text: txt });
        }

        while (i < laenge) {
            var c = inhalt.charAt(i);

            if (c === "(") {
                // Literal-String
                var s = "";
                var tiefe = 1;
                i++;
                while (i < laenge) {
                    var ch = inhalt.charAt(i);
                    if (ch === "\\") {
                        var n = inhalt.charAt(i + 1);
                        if (n === "n") { s += "\n"; i += 2; }
                        else if (n === "r") { s += "\r"; i += 2; }
                        else if (n === "t") { s += "\t"; i += 2; }
                        else if (n === "b") { s += "\b"; i += 2; }
                        else if (n === "f") { s += "\f"; i += 2; }
                        else if (n >= "0" && n <= "7") {
                            var okt = "";
                            var j = i + 1;
                            while (j < laenge && okt.length < 3
                                   && inhalt.charAt(j) >= "0" && inhalt.charAt(j) <= "7") {
                                okt += inhalt.charAt(j); j++;
                            }
                            s += String.fromCharCode(parseInt(okt, 8));
                            i = j;
                        } else { s += n; i += 2; }
                    } else if (ch === "(") { tiefe++; s += ch; i++; }
                    else if (ch === ")") {
                        tiefe--;
                        if (tiefe === 0) { i++; break; }
                        s += ch; i++;
                    } else { s += ch; i++; }
                }
                stack.push({ typ: "str", wert: s });
                continue;
            }

            if (c === "<" && inhalt.charAt(i + 1) !== "<") {
                var ende = inhalt.indexOf(">", i);
                if (ende < 0) break;
                var hex = inhalt.substring(i + 1, ende);
                var sh = "";
                for (var h = 0; h + 1 < hex.length; h += 2) {
                    sh += String.fromCharCode(parseInt(hex.substr(h, 2), 16));
                }
                stack.push({ typ: "str", wert: sh });
                i = ende + 1;
                continue;
            }

            if (c === "[") { stack.push({ typ: "arrAuf" }); i++; continue; }
            if (c === "]") {
                // Array einsammeln - Strings UND Versatzzahlen, denn ein
                // grosser Versatz trennt im Original zwei Tabellenspalten.
                var teile = [];
                while (stack.length) {
                    var top = stack.pop();
                    if (top.typ === "arrAuf") break;
                    if (top.typ === "str" || top.typ === "num") teile.unshift(top);
                }
                stack.push({ typ: "arr", wert: teile });
                i++;
                continue;
            }

            if (c === "/") {
                var j2 = i + 1;
                while (j2 < laenge && !istWS(inhalt.charAt(j2))
                       && "/[]<>(){}".indexOf(inhalt.charAt(j2)) < 0) j2++;
                stack.push({ typ: "name", wert: inhalt.substring(i + 1, j2) });
                i = j2;
                continue;
            }

            if ((c >= "0" && c <= "9") || c === "-" || c === "+" || c === ".") {
                var j3 = i;
                while (j3 < laenge && "0123456789.-+eE".indexOf(inhalt.charAt(j3)) >= 0) j3++;
                stack.push({ typ: "num", wert: zahlAus(inhalt.substring(i, j3)) });
                i = j3;
                continue;
            }

            if (istWS(c)) { i++; continue; }

            // Operator
            var j4 = i;
            while (j4 < laenge && !istWS(inhalt.charAt(j4))
                   && "/[]<>(){}".indexOf(inhalt.charAt(j4)) < 0) j4++;
            var op = inhalt.substring(i, j4);
            i = j4;
            if (op === "") { i++; continue; }

            if (op === "BT") {
                tm = [1, 0, 0, 1, 0, 0];
                tlm = [1, 0, 0, 1, 0, 0];
            } else if (op === "Tf") {
                var gr = stack.pop();
                var nm = stack.pop();
                fontGroesse = (gr && gr.typ === "num") ? gr.wert : 10;
                if (nm && nm.typ === "name" && fonts[nm.wert] !== undefined) {
                    aktuelleMap = fonts[nm.wert];
                } else {
                    aktuelleMap = null;
                }
            } else if (op === "Tm") {
                var f = stack.pop(), e5 = stack.pop(), d5 = stack.pop();
                var c5 = stack.pop(), b5 = stack.pop(), a5 = stack.pop();
                tm = [a5 ? a5.wert : 1, b5 ? b5.wert : 0, c5 ? c5.wert : 0,
                      d5 ? d5.wert : 1, e5 ? e5.wert : 0, f ? f.wert : 0];
                tlm = [tm[0], tm[1], tm[2], tm[3], tm[4], tm[5]];
            } else if (op === "Td") {
                var ty = stack.pop(), tx = stack.pop();
                tlm = multipliziere([1, 0, 0, 1, tx ? tx.wert : 0, ty ? ty.wert : 0], tlm);
                tm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5]];
            } else if (op === "TD") {
                var ty2 = stack.pop(), tx2 = stack.pop();
                leading = -(ty2 ? ty2.wert : 0);
                tlm = multipliziere([1, 0, 0, 1, tx2 ? tx2.wert : 0, ty2 ? ty2.wert : 0], tlm);
                tm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5]];
            } else if (op === "TL") {
                var tl = stack.pop();
                leading = tl ? tl.wert : 0;
            } else if (op === "T*") {
                tlm = multipliziere([1, 0, 0, 1, 0, -leading], tlm);
                tm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5]];
            } else if (op === "Tj" || op === "'" || op === '"') {
                if (op !== "Tj") {
                    tlm = multipliziere([1, 0, 0, 1, 0, -leading], tlm);
                    tm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5]];
                }
                var st = stack.pop();
                if (st && st.typ === "str") ausgeben(dekodiereString(st.wert));
                stack = [];
            } else if (op === "TJ") {
                var ar = stack.pop();
                if (ar && ar.typ === "arr") {
                    var zusammen = "";
                    for (var z = 0; z < ar.wert.length; z++) {
                        var el = ar.wert[z];
                        if (el.typ === "str") {
                            zusammen += dekodiereString(el.wert);
                        } else if (el.wert <= -SPALTEN_VERSATZ) {
                            // grosse Luecke = eigene Spalte
                            zusammen += "\t";
                        }
                    }
                    ausgeben(zusammen);
                }
                stack = [];
            } else {
                stack = [];
            }
        }

        return stuecke;
    }

    function pdfRefNach(text, schluessel) {
        // "/Contents 5 0 R" -> "5";  liefert null wenn keine Referenz
        var p = text.indexOf(schluessel);
        if (p < 0) return null;
        var i = p + schluessel.length;
        while (i < text.length && " \r\n\t".indexOf(text.charAt(i)) >= 0) i++;
        var a = i;
        while (i < text.length && text.charAt(i) >= "0" && text.charAt(i) <= "9") i++;
        if (i === a) return null;
        var num = text.substring(a, i);
        while (i < text.length && " \r\n\t".indexOf(text.charAt(i)) >= 0) i++;
        while (i < text.length && text.charAt(i) >= "0" && text.charAt(i) <= "9") i++;
        while (i < text.length && " \r\n\t".indexOf(text.charAt(i)) >= 0) i++;
        if (text.charAt(i) !== "R") return null;
        return num;
    }

    function pdfRefListe(text, schluessel) {
        // "/Contents [5 0 R 6 0 R]" -> ["5","6"]; sonst einzelne Referenz
        var p = text.indexOf(schluessel);
        if (p < 0) return [];
        var i = p + schluessel.length;
        while (i < text.length && " \r\n\t".indexOf(text.charAt(i)) >= 0) i++;
        if (text.charAt(i) !== "[") {
            var einzeln = pdfRefNach(text, schluessel);
            return einzeln ? [einzeln] : [];
        }
        var zu = text.indexOf("]", i);
        if (zu < 0) return [];
        var inhalt = text.substring(i + 1, zu);
        var out = [];
        var q = 0;
        while (q < inhalt.length) {
            while (q < inhalt.length && (inhalt.charAt(q) < "0" || inhalt.charAt(q) > "9")) q++;
            var a2 = q;
            while (q < inhalt.length && inhalt.charAt(q) >= "0" && inhalt.charAt(q) <= "9") q++;
            if (q > a2) {
                out.push(inhalt.substring(a2, q));
                // Generation und R ueberspringen
                while (q < inhalt.length && inhalt.charAt(q) !== "R") q++;
                q++;
            }
        }
        return out;
    }

    function pdfFontTabellen(roh, objekte, ressourcen) {
        // /Font << /R7 9 0 R /R9 10 0 R >>  ->  { R7: cmap, R9: cmap }
        var tabellen = {};
        var fp = ressourcen.indexOf("/Font");
        if (fp < 0) return tabellen;

        var dict = ressourcen;
        var ref = pdfRefNach(ressourcen, "/Font");
        if (ref) {
            var d = pdfObjInhalt(roh, objekte, ref);
            if (d) dict = d;
        } else {
            var auf = ressourcen.indexOf("<<", fp);
            if (auf < 0) return tabellen;
            var tiefe = 0, i = auf, ende = -1;
            while (i < ressourcen.length - 1) {
                if (ressourcen.charAt(i) === "<" && ressourcen.charAt(i + 1) === "<") {
                    tiefe++; i += 2; continue;
                }
                if (ressourcen.charAt(i) === ">" && ressourcen.charAt(i + 1) === ">") {
                    tiefe--; i += 2;
                    if (tiefe === 0) { ende = i; break; }
                    continue;
                }
                i++;
            }
            dict = (ende > 0) ? ressourcen.substring(auf, ende) : ressourcen.substring(fp);
        }

        var p = 0;
        while (true) {
            var sl = dict.indexOf("/", p);
            if (sl < 0) break;
            var j = sl + 1;
            while (j < dict.length && " \r\n\t/[]<>".indexOf(dict.charAt(j)) < 0) j++;
            var name = dict.substring(sl + 1, j);
            var fref = pdfRefNach(dict.substring(sl), "/" + name);
            if (name !== "" && fref) {
                var fobj = pdfObjInhalt(roh, objekte, fref);
                if (fobj) {
                    var tu = pdfRefNach(fobj, "/ToUnicode");
                    if (tu) {
                        var cm = pdfStream(roh, objekte, tu, inflate);
                        if (cm) tabellen[name] = cmapLesen(cm);
                    }
                }
            }
            p = j;
        }
        return tabellen;
    }

    function lesePDF(datei) {
        var roh = null;
        try {
            datei.encoding = "BINARY";
            if (!datei.open("r")) throw new Error("Datei nicht lesbar.");
            roh = datei.read();
            datei.close();
        } catch (e) {
            try { datei.close(); } catch (_) {}
            throw new Error("PDF nicht lesbar: " + (e.message || e));
        }
        if (!roh || roh.length < 100) {
            throw new Error("PDF ist leer oder beschaedigt: " + datei.name);
        }

        var objekte = pdfObjekte(roh);

        // erste Seite suchen
        var seite = null;
        for (var num in objekte) {
            if (!objekte.hasOwnProperty(num)) continue;
            var inh = pdfObjInhalt(roh, objekte, num);
            if (!inh) continue;
            if (inh.indexOf("/Type") >= 0 && inh.indexOf("/Page") >= 0
                && inh.indexOf("/Contents") >= 0 && inh.indexOf("/Pages") < 0) {
                seite = inh;
                break;
            }
        }
        if (seite === null) {
            throw new Error("Im PDF wurde keine Seite gefunden: " + datei.name);
        }

        // Ressourcen und Schriften
        var ressourcen = seite;
        var rref = pdfRefNach(seite, "/Resources");
        if (rref) {
            var r = pdfObjInhalt(roh, objekte, rref);
            if (r) ressourcen = r;
        }
        var fonts = pdfFontTabellen(roh, objekte, ressourcen);

        // Inhaltsstroeme
        var refs = pdfRefListe(seite, "/Contents");
        var inhalt = "";
        for (var ci = 0; ci < refs.length; ci++) {
            var st = pdfStream(roh, objekte, refs[ci], inflate);
            if (st) inhalt += st + "\n";
        }
        if (inhalt === "") {
            throw new Error("Der Seiteninhalt des PDF konnte nicht entpackt werden:\n"
                            + datei.name);
        }

        var stuecke = pdfTextStuecke(inhalt, fonts);
        if (stuecke.length === 0) {
            throw new Error(
                "Im PDF wurde kein Text gefunden.\n\n"
              + "Entweder ist es ein Scan, oder die Schrift liegt in Pfaden vor.\n"
              + "Dann muss die Datei beim Kunden neu angefordert werden.");
        }

        // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var sIdx = 0; sIdx < stuecke.length; sIdx++) stuecke[sIdx].idx = sIdx;
        stuecke.sort(function (a, b) {
            if (Math.abs(a.y - b.y) > 0.01) return b.y - a.y;
            if (a.x !== b.x) return a.x - b.x;
            return a.idx - b.idx;
        });

        var zeilen = [];
        for (var s2 = 0; s2 < stuecke.length; s2++) {
            var fr = stuecke[s2];
            var tol = Math.max(fr.groesse * 0.5, 1.5);
            if (zeilen.length && Math.abs(zeilen[zeilen.length - 1].y - fr.y) <= tol) {
                zeilen[zeilen.length - 1].teile.push(fr);
            } else {
                zeilen.push({ y: fr.y, teile: [fr] });
            }
        }

        var rows = [];
        for (var z = 0; z < zeilen.length; z++) {
            var teile = zeilen[z].teile;
            teile.sort(function (a, b) { return (a.x !== b.x) ? a.x - b.x : a.idx - b.idx; }); // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
            var roheZeile = "";
            for (var t = 0; t < teile.length; t++) {
                if (t > 0) roheZeile += "\t";
                roheZeile += teile[t].text;
            }
            var stuecke2 = roheZeile.split("\t");
            var zellen = [];
            for (var u = 0; u < stuecke2.length; u++) {
                var w = normLeer(stuecke2[u]);
                if (w !== "") zellen.push(w);
            }
            if (zellen.length) rows.push(zellen);
        }
        return rows;
    }

    function leseQuelle(datei) {
        var name = String(datei.name).toLowerCase();
        if (name.match(/\.pdf$/)) return lesePDF(datei);
        if (name.match(/\.(txt|csv|tsv)$/)) return leseTextdatei(datei);
        if (name.match(/\.(xlsx|xlsm|xltx)$/)) return leseXLSX(datei);
        if (name.match(/\.xls$/)) {
            throw new Error(
                "Das alte Excel-Format (.xls) kann nicht gelesen werden.\n\n"
              + "In Excel oeffnen und als .xlsx sichern.\n\n"
              + "Datei: " + datei.name);
        }
        throw new Error("Unbekanntes Format: " + datei.name);
    }

    // ================================================================
    // AUSWERTEN
    // ================================================================
    function werteAus(rows, dateiname) {
        var kopf = [];
        var daten = [];

        for (var i = 0; i < rows.length; i++) {
            var zellen = rows[i];
            if (!zellen || zellen.length === 0) continue;
            var joined = normLeer(zellen.join(" "));
            if (joined === "") continue;

            WEA_RE_G.lastIndex = 0;
            var treffer = joined.match(WEA_RE_G);

            if (!treffer) {
                if (daten.length === 0) kopf.push(zellen);
                else warn(dateiname + ": Zeile nach dem Datenblock ignoriert \u2013 "
                          + kurz(joined));
                continue;
            }

            if (treffer.length > 1) {
                warn(dateiname + ": Zeile mit " + treffer.length
                     + " WEA-Nummern, nur die erste verwendet \u2013 " + kurz(joined));
            }

            var wea = String(treffer[0]).replace(/\s+/g, "").toUpperCase();

            var klar = [];
            for (var c = 0; c < zellen.length; c++) {
                if (!WEA_RE.test(zellen[c])) klar.push(zellen[c]);
            }

            var ring;
            if (klar.length === 1) {
                ring = klar[0];
            } else if (klar.length > 1) {
                ring = klar.join(" ");
                warn(dateiname + ": mehrere Textspalten zusammengefasst zu \u201E"
                     + ring + "\u201C");
            } else {
                ring = trimm(joined.replace(WEA_RE_G, ""));
            }
            ring = normLeer(ring).replace(/^[\s:\-]+|[\s:\-]+$/g, "");

            if (ring === "") {
                warn(dateiname + ": Zeile ohne Ringbezeichnung (" + wea + ")");
            }

            daten.push({ ring: ring, wea: wea });
        }

        if (daten.length === 0) {
            throw new Error("In " + dateiname + " wurde keine Zeile mit einer "
                            + "WEA-Nummer gefunden.");
        }

        var typ = typVorschlag(kopf);

        return {
            kopfzeilen: kopf,
            typOben: typ.oben,
            typUnten: typ.unten,
            zeilen: daten
        };
    }

    function typVorschlag(kopf) {
        // Beschreibende Kopfzeilen und Spaltenueberschriften fliegen raus,
        // uebrig bleibt die Typbezeichnung. Alles ab dem letzten "Serie"
        // kommt in die untere Zeile - bei zwei Serienangaben wandert die
        // erste damit mit nach oben.
        var muell = /(zuweisung|assignment|betonring|concrete\s*ring|gitterscheibe|lattice\s*wall|grid\s*disc)/i;
        var spalte = /^(ring|nummer|pos\.?|nr\.?|stk\.?|anzahl)$/i;

        var teile = [];
        for (var i = 0; i < kopf.length; i++) {
            for (var j = 0; j < kopf[i].length; j++) {
                var z = normLeer(kopf[i][j]).replace(/^[\s\/\-]+|[\s\/\-]+$/g, "");
                if (z === "" || muell.test(z) || spalte.test(z)) continue;
                var schon = false;
                for (var k = 0; k < teile.length; k++) {
                    if (teile[k] === z) { schon = true; break; }
                }
                if (!schon) teile.push(z);
            }
        }

        var text = normLeer(teile.join(" "));
        if (text === "") return { oben: "", unten: "" };

        var pos = text.toLowerCase().lastIndexOf("serie");
        if (pos < 0) return { oben: text, unten: "" };

        return {
            oben: trimm(text.substring(0, pos)).replace(/[\s\/\-]+$/, ""),
            unten: trimm(text.substring(pos))
        };
    }

    // ================================================================
    // EINSTELLUNGEN
    // ================================================================
    var einstellOrdner = new Folder(Folder.userData.fsName + "/WEA_Etiketten");
    if (!einstellOrdner.exists) einstellOrdner.create();
    var einstellDatei = new File(einstellOrdner.fsName + "/einstellungen.txt");
    var typDatei = new File(einstellOrdner.fsName + "/typzuordnung.txt");

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
    var typCache = leseKV(typDatei);

    // ================================================================
    // HILFEN
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
        // Rueckwaerts, weil createOutline den Textrahmen ersetzt und
        // damit die Indizes im Container verschiebt.
        var tfs = sammleTextrahmen(container, []);
        var n = 0;
        for (var k = tfs.length - 1; k >= 0; k--) {
            try { tfs[k].createOutline(); n++; } catch (_) {}
        }
        return n;
    }

    // ================================================================
    // DIALOG 1  -  Jobliste
    // ================================================================
    var d1 = new Window("dialog", "WEA-Etiketten");
    d1.orientation = "column";
    d1.alignChildren = ["fill", "top"];
    d1.margins = 18; d1.spacing = 10;

    // ---- Vorlage ---------------------------------------------------
    var pV = d1.add("panel", undefined, "Etikettenvorlage");
    pV.orientation = "row";
    pV.alignChildren = ["left", "center"];
    pV.margins = [14, 20, 14, 14]; pV.spacing = 8;
    var vorgabeVorlage = einst.vorlage || "";
    var standardVorlage = new File(VORLAGEN.fsName + "/" + VORLAGE_NAME);
    if (standardVorlage.exists) vorgabeVorlage = standardVorlage.fsName;

    var etVorlage = pV.add("edittext", undefined, vorgabeVorlage,
                           { readonly: true });
    etVorlage.preferredSize = [500, 22];
    var btVorlage = pV.add("button", undefined, "W\u00E4hlen");
    btVorlage.preferredSize = [90, 22];
    btVorlage.onClick = function () {
        var f = File.openDialog("Etikettenvorlage w\u00E4hlen (.ait oder .ai)");
        if (f) etVorlage.text = f.fsName;
    };

    // ---- Kundendateien ---------------------------------------------
    var pJ = d1.add("panel", undefined,
        "Kundendateien und St\u00FCckzahl  (PDF, XLSX, TXT, CSV)");
    pJ.orientation = "column";
    pJ.alignChildren = ["fill", "top"];
    pJ.margins = [14, 20, 14, 14]; pJ.spacing = 8;

    var gKopf = pJ.add("group");
    gKopf.orientation = "row";
    gKopf.alignChildren = ["left", "center"];
    gKopf.spacing = 8;
    var stK1 = gKopf.add("statictext", undefined, "Datei");
    stK1.preferredSize = [420, 18];
    var stK2 = gKopf.add("statictext", undefined, "Anzahl");
    stK2.preferredSize = [55, 18];

    var gListe = pJ.add("group");
    gListe.orientation = "column";
    gListe.alignChildren = ["left", "top"];
    gListe.spacing = 4;

    var gAdd = pJ.add("group");
    gAdd.orientation = "row";
    gAdd.alignChildren = ["left", "center"];
    gAdd.spacing = 8;
    var btAdd = gAdd.add("button", undefined, "Dateien hinzuf\u00FCgen \u2026");
    btAdd.preferredSize = [170, 24];

    var dateiListe = [];

    function werteUebernehmen() {
        for (var i = 0; i < dateiListe.length; i++) {
            if (dateiListe[i].feld) {
                var n = parseInt(dateiListe[i].feld.text, 10);
                if (!isNaN(n) && n > 0) dateiListe[i].anzahl = n;
            }
        }
    }

    function zeichneNeu(mitLayout) {
        while (gListe.children.length > 0) {
            gListe.remove(gListe.children[0]);
        }
        if (dateiListe.length === 0) {
            var leer = gListe.add("statictext", undefined,
                "Noch keine Datei gew\u00E4hlt.");
            leer.preferredSize = [500, 20];
        }
        for (var i = 0; i < dateiListe.length; i++) {
            (function (idx) {
                var z = gListe.add("group");
                z.orientation = "row";
                z.alignChildren = ["left", "center"];
                z.spacing = 8;

                var st = z.add("statictext", undefined,
                    dateiListe[idx].datei.name, { truncate: "middle" });
                st.preferredSize = [420, 22];

                var et = z.add("edittext", undefined,
                    String(dateiListe[idx].anzahl));
                et.preferredSize = [55, 22];
                dateiListe[idx].feld = et;

                var bt = z.add("button", undefined, "Entfernen");
                bt.preferredSize = [90, 22];
                bt.onClick = function () {
                    werteUebernehmen();
                    dateiListe.splice(idx, 1);
                    zeichneNeu(true);
                };
            })(i);
        }
        if (mitLayout) {
            // Erst wenn alle Bedienelemente stehen - sonst rechnet
            // ScriptUI die Fensterhoehe zu klein.
            try {
                d1.layout.layout(true);
                d1.layout.resize();
            } catch (_) {}
        }
    }

    function mengeAusName(name) {
        // "15x_WEA0103486_..." -> 15
        var n = String(name);
        var i = 0;
        while (i < n.length && n.charAt(i) >= "0" && n.charAt(i) <= "9") i++;
        if (i === 0) return 1;
        var rest = n.charAt(i);
        if (rest !== "x" && rest !== "X") return 1;
        var zahl = parseInt(n.substring(0, i), 10);
        return (!isNaN(zahl) && zahl > 0) ? zahl : 1;
    }

    function ladeArbeitsordner() {
        // Alles, was im Arbeitsordner liegt und eine Kundendatei sein
        // kann, mit der Menge aus dem Dateinamen uebernehmen.
        if (!ARBEIT.exists) return 0;
        var gefunden = 0;
        var inhalt = ARBEIT.getFiles();
        var namen = [];
        for (var i = 0; i < inhalt.length; i++) {
            if (!(inhalt[i] instanceof File)) continue;
            var nm = String(inhalt[i].name).toLowerCase();
            if (!nm.match(/\.(pdf|xlsx|xlsm|xltx|txt|csv|tsv)$/)) continue;
            if (nm.indexOf("auftrag") === 0) continue;
            namen.push(inhalt[i]);
        }
        namen.sort(function (a, b) {
            return (String(a.name) < String(b.name)) ? -1
                 : ((String(a.name) > String(b.name)) ? 1 : 0);
        });
        for (var j = 0; j < namen.length; j++) {
            dateiListe.push({ datei: namen[j],
                              anzahl: mengeAusName(namen[j].name),
                              feld: null });
            gefunden++;
        }
        return gefunden;
    }

    btAdd.onClick = function () {
        werteUebernehmen();
        var fs = File.openDialog("Kundendateien w\u00E4hlen", undefined, true);
        if (!fs) return;
        if (!(fs instanceof Array)) fs = [fs];
        for (var i = 0; i < fs.length; i++) {
            dateiListe.push({ datei: fs[i],
                              anzahl: mengeAusName(fs[i].name),
                              feld: null });
        }
        zeichneNeu(true);
    };

    ladeArbeitsordner();
    zeichneNeu(false);

    // ---- Buttons ---------------------------------------------------
    var gBtn = d1.add("group");
    gBtn.alignment = "right"; gBtn.spacing = 8;
    var btAbb = gBtn.add("button", undefined, "Abbrechen", { name: "cancel" });
    btAbb.preferredSize = [100, 26];
    var btOk = gBtn.add("button", undefined, "Weiter", { name: "ok" });
    btOk.preferredSize = [110, 26];
    btOk.active = true;

    var konf = null;
    btOk.onClick = function () {
        werteUebernehmen();
        if (dateiListe.length === 0) { alert("Keine Kundendatei gew\u00E4hlt."); return; }
        var vf = new File(etVorlage.text);
        if (!etVorlage.text || !vf.exists) { alert("Etikettenvorlage nicht gefunden."); return; }
        for (var i = 0; i < dateiListe.length; i++) {
            if (!(dateiListe[i].anzahl > 0)) {
                alert("St\u00FCckzahl bei " + dateiListe[i].datei.name + " pr\u00FCfen.");
                return;
            }
        }
        konf = { vorlage: vf, breite: NUTZBREITE, drehung: 90 };
        d1.close(1);
    };
    if (d1.show() !== 1) return;

    einst.vorlage = konf.vorlage.fsName;
    schreibeKV(einstellDatei, einst);

    // ================================================================
    // DATEIEN EINLESEN
    // ================================================================
    var jobs = [];
    for (var ji = 0; ji < dateiListe.length; ji++) {
        try {
            var rows = leseQuelle(dateiListe[ji].datei);
            var dat = werteAus(rows, dateiListe[ji].datei.name);
            jobs.push({
                datei: dateiListe[ji].datei,
                anzahl: dateiListe[ji].anzahl,
                daten: dat
            });
        } catch (e) {
            alert("Fehler beim Einlesen:\n\n" + (e.message || e));
            return;
        }
    }

    // ================================================================
    // DIALOG 2  -  Typbezeichnung bestaetigen
    // ================================================================
    for (var jt = 0; jt < jobs.length; jt++) {
        var job = jobs[jt];

        var kopfZeilen = [];
        for (var ki = 0; ki < job.daten.kopfzeilen.length; ki++) {
            kopfZeilen.push(job.daten.kopfzeilen[ki].join("  |  "));
        }
        var kopfText = kopfZeilen.join("\n");
        var schluessel = normLeer(kopfText);

        var vorOben = job.daten.typOben || "";
        var vorUnten = job.daten.typUnten || "";
        if (typCache[schluessel]) {
            var teile2 = typCache[schluessel].split("\u001F");
            vorOben = teile2[0] || "";
            vorUnten = teile2[1] || "";
        }

        var d2 = new Window("dialog", "Typbezeichnung \u2013 " + job.datei.name);
        d2.orientation = "column";
        d2.alignChildren = ["fill", "top"];
        d2.margins = 18; d2.spacing = 10;

        var pQ = d2.add("panel", undefined, "So steht es in der Datei");
        pQ.orientation = "column";
        pQ.alignChildren = ["fill", "top"];
        pQ.margins = [14, 20, 14, 14];
        var stQ = pQ.add("edittext", undefined,
            kopfText || "(keine Kopfzeilen gefunden)",
            { multiline: true, readonly: true, scrolling: true });
        stQ.preferredSize = [470, 78];

        var pZ = d2.add("panel", undefined, "So wird es auf den Bogen gesetzt");
        pZ.orientation = "column";
        pZ.alignChildren = ["fill", "top"];
        pZ.margins = [14, 20, 14, 14]; pZ.spacing = 8;

        var gZ1 = pZ.add("group");
        gZ1.orientation = "row"; gZ1.spacing = 10;
        var stZ1 = gZ1.add("statictext", undefined, "Obere Zeile:");
        stZ1.preferredSize = [90, 22];
        var etOben = gZ1.add("edittext", undefined, vorOben);
        etOben.preferredSize = [360, 22];

        var gZ2 = pZ.add("group");
        gZ2.orientation = "row"; gZ2.spacing = 10;
        var stZ2 = gZ2.add("statictext", undefined, "Untere Zeile:");
        stZ2.preferredSize = [90, 22];
        var etUnten = gZ2.add("edittext", undefined, vorUnten);
        etUnten.preferredSize = [360, 22];

        pZ.add("statictext", undefined,
            job.daten.zeilen.length + " Etiketten je Streifen, "
            + job.anzahl + " mal ben\u00F6tigt.");

        var gB2 = d2.add("group");
        gB2.alignment = "right"; gB2.spacing = 8;
        var bA2 = gB2.add("button", undefined, "Abbrechen", { name: "cancel" });
        bA2.preferredSize = [100, 26];
        var bO2 = gB2.add("button", undefined, "\u00DCbernehmen", { name: "ok" });
        bO2.preferredSize = [120, 26];
        bO2.active = true;

        var erg = null;
        bO2.onClick = function () {
            erg = { oben: etOben.text, unten: etUnten.text };
            d2.close(1);
        };
        if (d2.show() !== 1) return;

        job.typOben = erg.oben;
        job.typUnten = erg.unten;
        typCache[schluessel] = erg.oben + "\u001F" + erg.unten;
    }
    schreibeKV(typDatei, typCache);

    // ================================================================
    // VORLAGE OEFFNEN UND MESSEN
    // ================================================================
    function streifenLaenge(anzahl, hatTyp, etHoehe) {
        // Das Typ-Etikett ist ein ganz normales Etikett am Streifenanfang.
        var n = anzahl + (hatTyp ? 1 : 0);
        return n * TEILUNG_ETIKETT - (TEILUNG_ETIKETT - etHoehe);
    }

    var vDoc = null, zDoc = null;
    var altUI = app.userInteractionLevel;

    try {
        vDoc = app.open(konf.vorlage);
    } catch (e) {
        alert("Vorlage konnte nicht ge\u00F6ffnet werden:\n" + (e.message || e));
        return;
    }

    var vCut = ersterTreffer(vDoc, "Cutkontur");
    var vRing = ersterTreffer(vDoc, "Ring");
    var vNummer = ersterTreffer(vDoc, "Nummer");

    var fehlt = [];
    if (!vCut) fehlt.push("Cutkontur");
    if (!vRing) fehlt.push("Ring");
    if (!vNummer) fehlt.push("Nummer");
    if (fehlt.length) {
        alert("In der Vorlage fehlen Objekte mit diesen Namen:\n\n\u2022 "
            + fehlt.join("\n\u2022 ")
            + "\n\nDie Namen werden im Ebenenbedienfeld vergeben.");
        try { vDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
        return;
    }

    var cb = vCut.geometricBounds;
    var etW = toMm(cb[2] - cb[0]);
    var etH = toMm(cb[1] - cb[3]);
    if (Math.abs(etW - 90) > 0.5 || Math.abs(etH - 36) > 0.5) {
        warn("Etikett in der Vorlage " + r1(etW) + " x " + r1(etH)
            + " mm statt 90 x 36 mm \u2013 Raster passt dann nicht.");
    }

    function textGroesse(tf) {
        try { return tf.textRange.characterAttributes.size; } catch (_) { return 30; }
    }
    var sollRing = textGroesse(vRing);
    var sollNummer = textGroesse(vNummer);
    var ringBreite = vRing.geometricBounds[2] - vRing.geometricBounds[0];
    var nummerBreite = vNummer.geometricBounds[2] - vNummer.geometricBounds[0];

    vDoc.activate();
    app.executeMenuCommand("selectall");
    app.redraw();
    var kopiertAnzahl = vDoc.selection.length;
    app.executeMenuCommand("copy");
    try { vDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}

    if (kopiertAnzahl === 0) {
        alert("Die Vorlage enth\u00E4lt keine Objekte.");
        return;
    }

    // ================================================================
    // PLANUNG
    // ================================================================
    // Der Bogen ist 1330 mm breit und besteht aus waagerechten Baendern.
    // Die Bahnlaenge ist die Summe der Bandhoehen plus 20 mm je Uebergang
    // und die einzige Kostengroesse; der Bogen wird d-mal gedruckt.
    //
    //   Laengsband  bis zu 12 Streifen nebeneinander,
    //               Hoehe = laengster Streifen darin
    //   Querstapel  110 mm je Streifen, Breite = laengster darin,
    //               nur moeglich wenn dieser in die Bahnbreite passt
    //
    // Streifen, die fuer quer zu lang sind, fuellen zuerst Laengsbaender.
    // Freie Plaetze darin nehmen kurze Streifen kostenlos mit, weil die
    // Bandhoehe vom laengsten bestimmt wird. Fuer den Rest wird gerechnet,
    // wie viele weitere Laengsbaender sich lohnen - ein Streifen kostet
    // quer 110 mm, im eigenen Laengsband anteilig dessen Laenge.
    // Das Ganze laeuft ueber alle Druckanzahlen, gewertet wird
    // d x Bahnlaenge.
    // ================================================================

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
        // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
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

    function summeMengen(jobs) {
        var s = 0;
        for (var i = 0; i < jobs.length; i++) s += jobs[i].anzahl;
        return s;
    }

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
        // Laengengrenze, dazu die beste ohne Ueberproduktion und die
        // beste ausserhalb der Grenze als bewusste Option.
        // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
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
        for (i = 0; i < alle.length; i++) {
            if (alle[i].ueber) { nimm(alle[i]); break; }
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
        // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
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
            if (!f) return;
            for (var i = 0; i < v.length; i++) {
                if (v[i].dokumente === f.dokumente && v[i].bahn === f.bahn) return;
            }
            v.push(f);
        }

        // innerhalb der Laengengrenze, und zusaetzlich ohne Grenze -
        // letztere braucht weniger Dokumente, dafuer lange Boegen
        ergaenze(planeFolge(jobs, MAX_BAHNLAENGE));
        ergaenze(planeFolge(jobs, 0));
        // Stufe 24: bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
        for (var vIdx = 0; vIdx < v.length; vIdx++) v[vIdx].idx = vIdx;
        v.sort(function (a, b) {
            if (a.ueber !== b.ueber) return a.ueber - b.ueber;
            if (a.bahn !== b.bahn) return a.bahn - b.bahn;
            if (a.dokumente !== b.dokumente) return a.dokumente - b.dokumente;
            return a.idx - b.idx;
        });
        return v;
    }

    // ================================================================
    // BOGEN BAUEN
    // ================================================================
    var altUI2 = app.userInteractionLevel;
    var gebauteDokumente = [];

    function neuesDokument() {
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
        doc.layers[0].name = "Druck";
        doc.activeLayer = doc.layers[0];
        return doc;
    }

    function holeMaster(doc) {
        var ly = doc.layers[0];
        doc.activeLayer = ly;
        app.executeMenuCommand("paste");
        var eingefuegt = doc.selection;
        if (!eingefuegt || eingefuegt.length === 0) {
            throw new Error("Einf\u00FCgen fehlgeschlagen \u2013 Zwischenablage leer.");
        }
        var master = ly.groupItems.add();
        master.name = "_master";
        var tmp = [], mi;
        for (mi = 0; mi < eingefuegt.length; mi++) tmp.push(eingefuegt[mi]);
        for (mi = tmp.length - 1; mi >= 0; mi--) {
            tmp[mi].move(master, ElementPlacement.PLACEATBEGINNING);
        }

        var mCut = ersterTreffer(master, "Cutkontur");
        if (!mCut || !ersterTreffer(master, "Ring")
            || !ersterTreffer(master, "Nummer")) {
            throw new Error(
                "Nach dem Einf\u00FCgen fehlen die benannten Objekte.\n\n"
              + "In den Illustrator-Voreinstellungen unter \u201EDateien verarbeiten &\n"
              + "Zwischenablage\u201C muss AICB aktiv und auf \u201EPfade beibehalten\u201C\n"
              + "gestellt sein.");
        }

        // Kontrolle: hat der Transfer ueber die Zwischenablage die
        // Geometrie veraendert?
        var mb = mCut.geometricBounds;
        var tatW = toMm(mb[2] - mb[0]);
        var tatH = toMm(mb[1] - mb[3]);
        if (Math.abs(tatW - etW) > 0.2 || Math.abs(tatH - etH) > 0.2) {
            warn("Etikettenma\u00DF nach dem Kopieren " + r1(tatW) + " x "
                + r1(tatH) + " mm statt " + r1(etW) + " x " + r1(etH) + " mm.");
        }
        return master;
    }

    function holeCutSpot(doc) {
        try {
            for (var si = 0; si < doc.spots.length; si++) {
                if (String(doc.spots[si].name).toLowerCase() === "cutcontour") {
                    return doc.spots[si];
                }
            }
            var spot = doc.spots.add();
            spot.name = "CutContour";
            spot.colorType = ColorModel.SPOT;
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 100; cmyk.yellow = 0; cmyk.black = 0;
            spot.color = cmyk;
            return spot;
        } catch (e) {
            warn("Vollton CutContour konnte nicht angelegt werden: " + (e.message || e));
            return null;
        }
    }

    // Werkzeugsatz fuer ein Dokument
    function macheWerkzeuge(doc, master, cutSpot) {
        var ly = doc.layers[0];
        var messHilfe = null;
        var messCache = {};
        var protokoll = [];

        function setzeCutFarbe(pfad) {
            if (!cutSpot) return;
            try {
                var sc = new SpotColor();
                sc.spot = cutSpot;
                sc.tint = 100;
                pfad.filled = false;
                pfad.stroked = true;
                pfad.strokeColor = sc;
                pfad.strokeWidth = 0.25;
            } catch (_) {}
        }

        // Flaechentext meldet keine Ueberlaufbreite, deshalb wird an
        // einem eigenen Punkttext gemessen. Die Breite waechst linear
        // mit der Schriftgroesse, eine Messung je Text und Groesse
        // reicht also; Ergebnisse werden gemerkt.
        function messeTextBreite(text, font, groesse) {
            var schluessel = text + "" + groesse;
            if (messCache[schluessel] !== undefined) return messCache[schluessel];
            var breite = -1;
            try {
                if (messHilfe === null) {
                    messHilfe = ly.textFrames.add();
                    messHilfe.name = "_messhilfe";
                }
                messHilfe.contents = text;
                try { messHilfe.textRange.characterAttributes.textFont = font; }
                catch (_) {}
                messHilfe.textRange.characterAttributes.size = groesse;
                var b = messHilfe.geometricBounds;
                breite = b[2] - b[0];
            } catch (e) {
                breite = -1;
            }
            messCache[schluessel] = breite;
            return breite;
        }

        function passeEin(tf, sollGroesse, rahmenBreite, text) {
            var groesse = sollGroesse;
            var font = null;
            try { font = tf.textRange.characterAttributes.textFont; } catch (_) {}
            try { tf.textRange.characterAttributes.size = groesse; }
            catch (_) { return groesse; }

            var gemessen = messeTextBreite(text, font, sollGroesse);
            if (gemessen <= 0 || gemessen <= rahmenBreite) return groesse;

            var faktor = rahmenBreite / gemessen;
            groesse = Math.floor((sollGroesse * faktor) / SHRINK_SCHRITT) * SHRINK_SCHRITT;
            if (groesse < SHRINK_MIN) groesse = SHRINK_MIN;

            var runden = 0;
            while (runden < 40 && groesse > SHRINK_MIN
                   && messeTextBreite(text, font, groesse) > rahmenBreite) {
                groesse -= SHRINK_SCHRITT;
                runden++;
            }
            try { tf.textRange.characterAttributes.size = groesse; } catch (_) {}
            return groesse;
        }

        function baueEtikett(oben, unten, container) {
            var g = master.duplicate(container, ElementPlacement.PLACEATEND);
            g.name = "";
            var tRing = ersterTreffer(g, "Ring");
            var tNummer = ersterTreffer(g, "Nummer");
            var tCut = ersterTreffer(g, "Cutkontur");

            if (tRing) {
                tRing.contents = oben;
                var gr = passeEin(tRing, sollRing, ringBreite, oben);
                if (gr < sollRing - 0.01) {
                    protokoll.push(oben + "  auf " + r1(gr) + " pt");
                }
            }
            if (tNummer) {
                tNummer.contents = unten;
                var gn = passeEin(tNummer, sollNummer, nummerBreite, unten);
                if (gn < sollNummer - 0.01) {
                    protokoll.push(unten + "  auf " + r1(gn) + " pt");
                }
            }
            if (tCut) setzeCutFarbe(tCut);
            return g;
        }

        function raeumeAuf() {
            try { if (messHilfe) messHilfe.remove(); } catch (_) {}
            messHilfe = null;
        }

        return { layer: ly, baueEtikett: baueEtikett, raeumeAuf: raeumeAuf,
                 protokoll: protokoll };
    }

    function setzePosition(item, xMm, yMm) {
        var b = item.geometricBounds;
        item.translate(toPt(xMm) - b[0], -toPt(yMm) - b[1]);
    }

    function baueStreifen(wz, job, container) {
        var grp = container.groupItems.add();
        var zeilenD = job.daten.zeilen;
        var versatz = 0;

        if (job.typOben || job.typUnten) {
            var t = wz.baueEtikett(job.typOben || "", job.typUnten || "", grp);
            setzePosition(t, 0, 0);
            versatz = 1;
        }
        for (var e = 0; e < zeilenD.length; e++) {
            var it = wz.baueEtikett(zeilenD[e].ring, zeilenD[e].wea, grp);
            setzePosition(it, 0, (versatz + e) * TEILUNG_ETIKETT);
        }
        return grp;
    }

    // ================================================================
    // EIN BOGEN BAUEN
    // ================================================================
    function streifenJeJob(bogen) {
        var zaehl = [];
        for (var i = 0; i < jobs.length; i++) zaehl.push(0);
        for (var b = 0; b < bogen.baender.length; b++) {
            for (var s = 0; s < bogen.baender[b].streifen.length; s++) {
                var job = bogen.baender[b].streifen[s].job;
                for (var j = 0; j < jobs.length; j++) {
                    if (jobs[j] === job) { zaehl[j]++; break; }
                }
            }
        }
        return zaehl;
    }

    function baueBogen(bogen, nr, gesamt, variante) {
        var doc = neuesDokument();
        var master = holeMaster(doc);
        var cutSpot = holeCutSpot(doc);
        var wz = macheWerkzeuge(doc, master, cutSpot);
        var lyDruck = wz.layer;

        var nutzen = lyDruck.groupItems.add();
        nutzen.name = "Nutzen";

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var y = 0;
        var etikettenGesamt = 0;

        for (var bi = 0; bi < bogen.baender.length; bi++) {
            var band = bogen.baender[bi];
            var hoehe = bandHoehe(band);

            for (var si = 0; si < band.streifen.length; si++) {
                var job = band.streifen[si].job;
                var grp = baueStreifen(wz, job, nutzen);

                if (band.lage === "laengs") {
                    setzePosition(grp, si * TEILUNG_STREIFEN, y);
                } else {
                    try { grp.rotate(konf.drehung); } catch (_) {}
                    setzePosition(grp, 0, y + si * TEILUNG_STREIFEN);
                }

                etikettenGesamt += job.daten.zeilen.length
                    + ((job.typOben || job.typUnten) ? 1 : 0);
            }
            y += hoehe + GAP;
        }

        try { master.remove(); } catch (_) {}
        wz.raeumeAuf();

        // ---- Schriften in Pfade ---------------------------------------
        var gewandelt = inPfadeWandeln(nutzen);
        var restText = sammleTextrahmen(nutzen, []).length;
        if (restText > 0) {
            warn("Bogen " + nr + ": " + restText
                + " Textobjekt(e) konnten nicht in Pfade gewandelt werden.");
        }

        var nb = nutzen.geometricBounds;
        var istB = toMm(nb[2] - nb[0]);
        var istL = toMm(nb[1] - nb[3]);
        if (Math.abs(istB - bogen.breite) > 1.5) {
            warn("Bogen " + nr + ": Breite gemessen " + r1(istB)
                + " mm, berechnet " + r1(bogen.breite) + " mm.");
        }
        if (Math.abs(istL - bogen.hoehe) > 1.5) {
            warn("Bogen " + nr + ": L\u00E4nge gemessen " + r1(istL)
                + " mm, berechnet " + r1(bogen.hoehe) + " mm.");
        }
        var bogenB = istB, bogenL = istL;

        if (bogenB > konf.breite + 0.01) {
            warn("Bogen " + nr + ": " + r1(bogenB) + " mm breit, nutzbar sind "
                + r1(konf.breite) + " mm.");
        }

        // ---- Zeichenflaeche ------------------------------------------
        var artW = toPt(bogenB + OPOS_RAND_W);
        var artH = toPt(bogenL + OPOS_RAND_H);
        doc.artboards[0].artboardRect = [0, artH, artW, 0];
        var ab = doc.artboards[0].artboardRect;

        var nb2 = nutzen.geometricBounds;
        nutzen.translate(
            ab[0] + (artW - toPt(bogenB)) / 2 - nb2[0],
            ab[1] - (artH - toPt(bogenL)) / 2 - nb2[1]
        );

        // ---- Ebene Cut -----------------------------------------------
        var lyCut = doc.layers.add();
        lyCut.name = "Cut";
        var cutGrp = lyCut.groupItems.add();
        cutGrp.name = "Cutkonturen";

        var cutTreffer = findeNach(nutzen, "Cutkontur", []);
        for (var ci = cutTreffer.length - 1; ci >= 0; ci--) {
            try { cutTreffer[ci].move(cutGrp, ElementPlacement.PLACEATBEGINNING); }
            catch (_) {}
        }
        if (cutGrp.pageItems.length !== etikettenGesamt) {
            warn("Bogen " + nr + ": " + cutGrp.pageItems.length
                + " Cutkonturen statt " + etikettenGesamt + ".");
        }

        // ---- Ebene Info ----------------------------------------------
        var lyInfo = doc.layers.add();
        lyInfo.name = "Info";
        lyInfo.printable = false;

        var zaehl = streifenJeJob(bogen);
        var sep = "--------------------------------------";
        var info = ["=== WEA-ETIKETTEN ===",
                    "Bogen:          " + nr + " von " + gesamt,
                    "",
                    ">>> " + bogen.auflage + " x DRUCKEN <<<",
                    "",
                    "Nutzen:         " + r1(bogenB) + " x " + r1(bogenL) + " mm",
                    "Zeichenfl\u00E4che:  " + r1(bogenB + OPOS_RAND_W) + " x "
                        + r1(bogenL + OPOS_RAND_H) + " mm",
                    "Etiketten:      " + etikettenGesamt + " je Druck",
                    "Schrift:        " + gewandelt + " Textobjekte in Pfade",
                    sep];

        for (var ii = 0; ii < jobs.length; ii++) {
            if (zaehl[ii] === 0) continue;
            info.push("Datei:          " + jobs[ii].datei.name);
            info.push("  Typ:          \u201E" + (jobs[ii].typOben || "-")
                + "\u201C / \u201E" + (jobs[ii].typUnten || "-") + "\u201C");
            info.push("  Streifen:     " + jobs[ii].daten.zeilen.length
                + " Etiketten, " + r1(jobs[ii].laenge) + " mm lang");
            info.push("  auf Bogen:    " + zaehl[ii] + " x  =  "
                + (zaehl[ii] * bogen.auflage) + " St\u00FCck");
        }

        info.push(sep);
        for (var bj = 0; bj < bogen.baender.length; bj++) {
            var bd = bogen.baender[bj];
            info.push("Band " + (bj + 1) + ":         "
                + (bd.lage === "laengs" ? "l\u00E4ngs" : "quer ") + "  "
                + bd.streifen.length + " Streifen, "
                + r1(bandHoehe(bd)) + " mm hoch");
        }

        info.push(sep);
        info.push("Variante:       " + (variante.typ === "einzel"
            ? "ein Bogen, " + variante.drucke + " Drucke"
            : "Folge aus " + variante.dokumente + " B\u00F6gen"));
        info.push("Material ges.:  rund " + r2(variante.bahn / 1000) + " m Bahn");
        if (variante.zuviel > 0) {
            info.push("\u00DCberproduktion: " + variante.zuviel + " Streifen");
        }
        info.push(sep);
        info.push("Teilung:        " + TEILUNG_ETIKETT + " mm im Streifen, "
            + TEILUNG_STREIFEN + " mm zwischen Streifen");
        info.push("Bahnbreite:     " + r1(konf.breite) + " mm nutzbar");
        info.push("Vorlage:        " + konf.vorlage.name);

        if (wz.protokoll.length) {
            info.push(sep);
            info.push("Verkleinert:");
            var gezeigt = {};
            for (var spi = 0; spi < wz.protokoll.length; spi++) {
                var zeileS = wz.protokoll[spi];
                if (gezeigt[zeileS]) continue;
                gezeigt[zeileS] = true;
                info.push("                " + zeileS);
            }
        }
        info.push(sep);
        info.push("Erstellt:       " + new Date().toLocaleString());

        var tfInfo = lyInfo.textFrames.add();
        tfInfo.contents = info.join("\n");
        tfInfo.position = [ab[0] + toPt(5), ab[3] - toPt(8)];
        lyInfo.locked = true;

        app.userInteractionLevel = altUI2;

        // ---- Auswahl setzen ------------------------------------------
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

        return { doc: doc, breite: bogenB, laenge: bogenL,
                 auflage: bogen.auflage };
    }

    // ================================================================
    // ABLAUF
    // ================================================================
    try {
        // ---- Streifenlaengen, Varianten rechnen ---------------------
        GAP = TEILUNG_STREIFEN - etW;

        for (var gi = 0; gi < jobs.length; gi++) {
            var hatT = !!(jobs[gi].typOben || jobs[gi].typUnten);
            jobs[gi].laenge = streifenLaenge(jobs[gi].daten.zeilen.length, hatT, etH);
        }

        var varianten = planeVarianten(jobs);
        if (varianten.length === 0) {
            alert("Es konnte kein Layout berechnet werden.");
            return;
        }

        // ---- DIALOG: Variante waehlen -------------------------------
        function variantenZeile(v) {
            var s = (v.dokumente === 1)
                ? ("1 Datei, " + v.drucke + "\u00D7 drucken")
                : (v.dokumente + " Dateien, " + v.drucke
                   + " Drucke gesamt");
            while (s.length < 26) s += " ";
            s += "   |   " + r2(v.bahn / 1000) + " m Material";
            s += "   |   " + (v.zuviel === 0
                ? "exakt"
                : v.zuviel + " Streifen zu viel");
            s += "   |   l\u00E4ngster Bogen " + r1(v.maxHoehe) + " mm";
            if (v.ueber) s += "   \u2013 \u00FCber 2 m";
            return s;
        }

        var dv = new Window("dialog", "WEA-Etiketten \u2013 Variante w\u00E4hlen");
        dv.orientation = "column";
        dv.alignChildren = ["fill", "top"];
        dv.margins = 18; dv.spacing = 10;

        var pW = dv.add("panel", undefined, "Variante");
        pW.orientation = "column";
        pW.alignChildren = ["left", "top"];
        pW.margins = [14, 20, 14, 14]; pW.spacing = 6;

        var rbs = [];
        for (var vi = 0; vi < varianten.length; vi++) {
            var rb = pW.add("radiobutton", undefined, variantenZeile(varianten[vi]));
            if (vi === 0) rb.value = true;
            rbs.push(rb);
        }

        var stDetail = pW.add("statictext", undefined, "", { multiline: true });
        stDetail.preferredSize = [640, 76];

        function aktuelleVariante() {
            for (var i = 0; i < rbs.length; i++) {
                if (rbs[i].value) return varianten[i];
            }
            return varianten[0];
        }
        function zeigeDetail() {
            var v = aktuelleVariante();
            var t = [];
            for (var i = 0; i < v.boegen.length; i++) {
                var bg = v.boegen[i];
                var teile = [];
                for (var j = 0; j < bg.baender.length; j++) {
                    var bd = bg.baender[j];
                    teile.push((bd.lage === "laengs" ? "l\u00E4ngs " : "quer ")
                        + bd.streifen.length + " (" + r1(bandHoehe(bd)) + " mm)");
                }
                t.push("Bogen " + (i + 1) + ": " + bg.auflage + "\u00D7 drucken, "
                    + r1(bg.breite) + " \u00D7 " + r1(bg.hoehe) + " mm  \u2013  "
                    + teile.join("  +  "));
            }
            stDetail.text = t.join("\n");
        }
        for (var ri = 0; ri < rbs.length; ri++) rbs[ri].onClick = zeigeDetail;
        zeigeDetail();

        var gV = dv.add("group");
        gV.alignment = "right"; gV.spacing = 8;
        var bVA = gV.add("button", undefined, "Abbrechen", { name: "cancel" });
        bVA.preferredSize = [100, 26];
        var bVO = gV.add("button", undefined, "Aufbauen", { name: "ok" });
        bVO.preferredSize = [110, 26];
        bVO.active = true;

        var gewaehlt = null;
        bVO.onClick = function () { gewaehlt = aktuelleVariante(); dv.close(1); };
        if (dv.show() !== 1) return;

        // ---- Bauen ---------------------------------------------------
        var ergebnisse = [];
        for (var bi2 = 0; bi2 < gewaehlt.boegen.length; bi2++) {
            ergebnisse.push(baueBogen(gewaehlt.boegen[bi2], bi2 + 1,
                                      gewaehlt.boegen.length, gewaehlt));
        }

        var text = "";
        for (var ri2 = 0; ri2 < ergebnisse.length; ri2++) {
            var e2 = ergebnisse[ri2];
            text += "Bogen " + (ri2 + 1) + ": " + r1(e2.breite) + " \u00D7 "
                 + r1(e2.laenge) + " mm, " + e2.auflage + "\u00D7 drucken\n";
        }
        text += "\nMaterial rund " + r2(gewaehlt.bahn / 1000) + " m";
        if (gewaehlt.zuviel > 0) {
            text += ", " + gewaehlt.zuviel + " Streifen \u00DCberproduktion";
        }
        text += ".";
        if (ergebnisse.length > 1) {
            text += "\n\nF\u00FCr jedes Dokument einzeln OPOS und das\n"
                  + "Speichern-Skript laufen lassen.";
        }
        if (warnungen.length > 0) {
            text += "\n\nPr\u00FCfung meldet:\n\u2022 " + warnungen.join("\n\u2022 ");
        }
        alert(text);

        if (ergebnisse.length === 1) {
            try {
                var oposApp = new Folder("/Applications/OPOS.app");
                if (oposApp.exists) oposApp.execute();
            } catch (_) {}
        }

    } catch (err) {
        try { app.userInteractionLevel = altUI2; } catch (_) {}
        alert("Fehler: " + (err.message || err));
    }

})();
