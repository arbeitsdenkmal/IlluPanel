/** 
 * Gruppieren + auf gewünschte Breite (mm) proportional skalieren
 * Danach: aktive Zeichenfläche auf Objektmaß + umlaufende Zugabe (mm) setzen
 * DE-Komma wird akzeptiert (z.B. "210,0")
 */

#target illustrator

(function main() {
    if (app.documents.length === 0) {
        alert("Kein Dokument geöffnet.");
        return;
    }
    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Du hast vergessen, etwas auszuwählen! Trottel!");
        return;
    }

    // --- Auswahl gruppieren ---
    var sel = doc.selection;
    if (sel.length > 1 || sel[0].typename !== "GroupItem") {
        try {
            app.executeMenuCommand('group');
        } catch (e) {
            alert("Gruppieren fehlgeschlagen: " + e);
            return;
        }
    }

    if (!doc.selection || doc.selection.length === 0 || doc.selection[0].typename !== "GroupItem") {
        alert("Konnte keine Gruppe ermitteln.");
        return;
    }

    var grp = doc.selection[0];

    function isVisibleForBounds(item) {
        if (item.hidden === true) {
            return false;
        }
        try {
            var lyr = item.layer;
            while (lyr && lyr.typename === "Layer") {
                if (lyr.visible === false) {
                    return false;
                }
                lyr = lyr.parent;
            }
        } catch (e) {
            return true;
        }
        return true;
    }

    /**
     * Sichtbares geometrisches Maß: Bei Schnittmasken-Gruppen zählt nur die Clipping-Path-Form,
     * nicht der vollständige Inhalt dahinter. Sonst wie bisher geometricBounds (bzw. rekursive
     * Vereinigung bei Gruppen mit eingebetteten Schnittmasken).
     */
    function findClippingPathBounds(clippedGroup) {
        var items = clippedGroup.pageItems;
        var i, it;
        var clipItem = null;
        for (i = 0; i < items.length; i++) {
            it = items[i];
            if (!isVisibleForBounds(it)) {
                continue;
            }
            try {
                if (it.clipping === true) {
                    if (clipItem !== null) {
                        return null;
                    }
                    clipItem = it;
                }
            } catch (ignore) {}
        }
        if (clipItem === null) {
            return null;
        }
        return clipItem.geometricBounds;
    }

    function getEffectiveGeometricBounds(item) {
        if (item.typename === "GroupItem") {
            if (!isVisibleForBounds(item)) {
                return null;
            }
            if (item.clipped) {
                var clipB = findClippingPathBounds(item);
                if (clipB === null) {
                    return null;
                }
                return clipB;
            }
            if (item.pageItems.length === 0) {
                return item.geometricBounds;
            }
            var l = 1e100, t = -1e100, r = -1e100, b = 1e100;
            var i, cb;
            var found = false;
            for (i = 0; i < item.pageItems.length; i++) {
                if (!isVisibleForBounds(item.pageItems[i])) {
                    continue;
                }
                cb = getEffectiveGeometricBounds(item.pageItems[i]);
                if (cb === null) {
                    continue;
                }
                found = true;
                if (cb[0] < l) l = cb[0];
                if (cb[1] > t) t = cb[1];
                if (cb[2] > r) r = cb[2];
                if (cb[3] < b) b = cb[3];
            }
            if (!found) {
                return null;
            }
            return [l, t, r, b];
        }
        if (!isVisibleForBounds(item)) {
            return null;
        }
        return item.geometricBounds;
    }

    // --- Aktuelle Breite (Referenz: sichtbares Maß bei Schnittmasken) ---
    var gb = getEffectiveGeometricBounds(grp); // [left, top, right, bottom]
    if (gb === null) {
        alert("Die Referenzmaße für die sichtbare Fläche konnten nicht ermittelt werden. Abbruch.");
        return;
    }
    var currentWidthPt = gb[2] - gb[0];
    if (currentWidthPt <= 0) {
        alert("Aktuelle Breite ist ungültig oder 0. Abbruch.");
        return;
    }

    // Hilfsfunktionen mm <-> pt
    var MM_TO_PT = 72 / 25.4;
    var PT_TO_MM = 25.4 / 72;
    function ptToMm(pt) { return pt * PT_TO_MM; }
    function mmToPt(mm) { return mm * MM_TO_PT; }
    function fmtMm(valMm) { return (Math.round(valMm * 100) / 100).toString().replace(".", ","); }

    function parseStrictMmNumber(str) {
        var t = String(str).replace(/^\s+|\s+$/g, "");
        if (t === "") {
            return NaN;
        }
        var sign = 1;
        if (t.charAt(0) === "-") {
            sign = -1;
            t = t.substring(1).replace(/^\s+|\s+$/g, "");
        } else if (t.charAt(0) === "+") {
            t = t.substring(1).replace(/^\s+|\s+$/g, "");
        }
        if (t === "") {
            return NaN;
        }
        var commaCount = 0;
        var i;
        for (i = 0; i < t.length; i++) {
            if (t.charAt(i) === ",") {
                commaCount++;
            }
        }
        if (commaCount > 1) {
            return NaN;
        }
        var intVal;
        var fracStr = null;
        if (commaCount === 1) {
            var ci = t.indexOf(",");
            var before = t.substring(0, ci);
            var after = t.substring(ci + 1);
            if (after === "" || !/^\d+$/.test(after)) {
                return NaN;
            }
            if (before === "") {
                return NaN;
            }
            if (!/^(\d{1,3}(\.\d{3})+|\d+)$/.test(before)) {
                return NaN;
            }
            intVal = parseInt(before.replace(/\./g, ""), 10);
            if (isNaN(intVal)) {
                return NaN;
            }
            fracStr = after;
        } else {
            if (!/^(\d{1,3}(\.\d{3})+|\d+)$/.test(t)) {
                return NaN;
            }
            var normalizedInt = t.replace(/\./g, "");
            if (!/^\d+$/.test(normalizedInt)) {
                return NaN;
            }
            intVal = parseInt(normalizedInt, 10);
            if (isNaN(intVal)) {
                return NaN;
            }
        }
        var mm;
        if (fracStr === null) {
            mm = intVal;
        } else {
            var flen = fracStr.length;
            var cents;
            if (flen === 1) {
                cents = intVal * 100 + parseInt(fracStr.charAt(0), 10) * 10;
            } else if (flen === 2) {
                cents = intVal * 100 + parseInt(fracStr, 10);
            } else {
                var baseCents = intVal * 100 + parseInt(fracStr.substring(0, 2), 10);
                var d3 = parseInt(fracStr.charAt(2), 10);
                if (d3 >= 5) {
                    baseCents += 1;
                }
                cents = baseCents;
            }
            mm = cents / 100;
        }
        return sign * mm;
    }

    // --- Dialog: Zielbreite in mm ---
    var currentWidthMm = ptToMm(currentWidthPt);
    var defaultWidthStr = fmtMm(currentWidthMm);

    var inputWidth = prompt("Zielbreite in mm?", defaultWidthStr);
    if (inputWidth === null) return;

    var targetMm = parseStrictMmNumber(inputWidth);
    if (isNaN(targetMm)) {
        alert("Ungültige Eingabe für Breite. Bitte eine gültige Zahl: Dezimaltrennzeichen nur Komma, Punkt nur als Tausender.");
        return;
    }
    if (targetMm <= 0) {
        alert("Ungültige Eingabe für Breite. Bitte eine Zahl > 0 angeben.");
        return;
    }

    // --- Dialog: umlaufende Zugabe in mm (Preset 2 mm, darf 0 sein) ---
    var inputPad = prompt("Umlaufende Zugabe in mm?", "2");
    if (inputPad === null) return;

    var padMm = parseStrictMmNumber(inputPad);
    if (isNaN(padMm)) {
        alert("Ungültige Eingabe für Zugabe. Bitte eine gültige Zahl: Dezimaltrennzeichen nur Komma, Punkt nur als Tausender.");
        return;
    }
    if (padMm < 0) {
        alert("Ungültige Eingabe für Zugabe. Bitte eine Zahl ≥ 0 angeben.");
        return;
    }

    var targetPt = mmToPt(targetMm);
    var scalePct = (targetPt / currentWidthPt) * 100;

    var ax = (gb[0] + gb[2]) / 2;
    var ay = (gb[1] + gb[3]) / 2;
    var invScalePct = 10000 / scalePct;

    // --- Proportional skalieren (Anker = Mittelpunkt von gb; inkl. Linienbreiten & Muster) ---
    // Vor-/Rück-Transform: minimale Gleitkomma-Abweichung möglich; keine Korrektur vorgesehen.
    try {
        var mtx = app.getScaleMatrix(scalePct, scalePct, ax, ay);
        grp.transform(mtx, true, true, true, true, true);
    } catch (e2) {
        alert("Skalierung fehlgeschlagen: " + e2);
        return;
    }

    // --- Neue Größe für Artboard ermitteln (gleiche Referenz wie bei der Breitenberechnung) ---
    var gbNew = getEffectiveGeometricBounds(grp); // [L, T, R, B]
    if (gbNew === null) {
        try {
            var mtxInvGb = app.getScaleMatrix(invScalePct, invScalePct, ax, ay);
            grp.transform(mtxInvGb, true, true, true, true, true);
        } catch (eRb) {
            alert("Die automatische Rücknahme der Skalierung ist fehlgeschlagen: " + eRb + ". Das Dokument kann in einem teilweise inkonsistenten Zustand sein; die Skalierung kann noch aktiv sein. Bitte bei Bedarf in Illustrator manuell Rückgängig verwenden.");
            return;
        }
        alert("Die Maße nach der Skalierung konnten nicht ermittelt werden. Die Skalierung wurde zurückgenommen.");
        return;
    }
    var padPt = mmToPt(padMm);

    var rect = [
        gbNew[0] - padPt, // left
        gbNew[1] + padPt, // top
        gbNew[2] + padPt, // right
        gbNew[3] - padPt  // bottom
    ];

    try {
        var abIdx = doc.artboards.getActiveArtboardIndex();
        doc.artboards[abIdx].artboardRect = rect;
    } catch (e3) {
        try {
            var mtxInv = app.getScaleMatrix(invScalePct, invScalePct, ax, ay);
            grp.transform(mtxInv, true, true, true, true, true);
        } catch (e4) {
            alert("Zeichenfläche konnte nicht angepasst werden: " + e3 + ". Die automatische Rücknahme der Skalierung ist fehlgeschlagen: " + e4 + ". Das Dokument kann in einem teilweise inkonsistenten Zustand sein; die Skalierung kann noch aktiv sein. Bitte bei Bedarf in Illustrator manuell Rückgängig verwenden.");
            return;
        }
        alert("Zeichenfläche konnte nicht angepasst werden: " + e3 + ". Die Skalierung wurde zurückgenommen.");
        return;
    }
})();
