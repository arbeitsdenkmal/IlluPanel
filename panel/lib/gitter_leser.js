/* Gitterscheiben (SPEZ_03_Nutzen §6.1): aus dem alten Projekt (panel/lib/gitter_leser.js) unverändert übernommen.
 * Stufe 24, Teil C1 des alten Projekts: Leser für PDF, XLSX, TXT/CSV und die Auswertung (werteAus, typVorschlag) aus 03-Gitterscheiben.jsx v2.9.
 * Zeilen 61–1243 des Skripts WÖRTLICH übernommen (Logik unverändert, keine fremde Bibliothek). Neu ist nur der Dateizugriff: ein
 * Datei-Objekt mit der Schnittstelle des ExtendScript-File (name, encoding, open, read, close) über fs. „BINARY“ liefert wie ExtendScript
 * je Byte ein Zeichen (latin1); Textkodierungen über TextDecoder (UTF-8, windows-1252, macintosh).
 *   einlesen(pfad) -> { daten: werteAus(leseQuelle(datei), name), warnungen }
 * Sortierungen (Nachtrag Markus, Stufe 24): bei Gleichstand der ursprüngliche Index als zweiter Schlüssel – in der Skriptkopie im
 * Projektordner und hier mit demselben Text, damit Alt = Neu unabhängig vom Sortierverfahren gilt (ExtendScript sortiert nicht stabil). */
"use strict";
const fs = require("fs");
const path = require("path");

function Datei(pfad) {
  this.pfad = pfad; this.name = path.basename(pfad); this.encoding = "UTF-8"; this._puffer = null;
}
Datei.prototype.open = function (modus) {
  if (modus !== "r") return false;
  try { this._puffer = fs.readFileSync(this.pfad); return true; } catch (e) { return false; }
};
Datei.prototype.read = function () {
  const b = this._puffer;
  if (b === null) return "";
  if (String(this.encoding).toUpperCase() === "BINARY") return b.toString("latin1");
  const enc = String(this.encoding).toLowerCase();
  return new TextDecoder(enc === "macintosh" ? "macintosh" : enc).decode(b);
};
Datei.prototype.close = function () { this._puffer = null; return true; };

let warnungen = [];
function warn(s) { warnungen.push(s); }

// ---------- ab hier 03-Gitterscheiben.jsx, Zeilen 61–1243 (Stand vor dem Sortier-Nachtrag), unverändert bis auf die Sortierungen ----------
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
// ---------- Ende der übernommenen Zeilen ----------

function einlesen(pfad) {
  warnungen = [];
  const datei = new Datei(pfad);
  const daten = werteAus(leseQuelle(datei), datei.name);
  return { daten, warnungen: warnungen.slice(0) };
}
module.exports = { einlesen, Datei, trimm, normLeer, kurz, leseQuelle, werteAus, typVorschlag, inflate, zipEintraege };
