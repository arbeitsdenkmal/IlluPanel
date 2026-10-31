#target illustrator
/*
Varianten:
- EU       = 85 x 55 mm → 4× vertikal
- EU mit   = 91 x 61 mm → 3× vertikal
- Asia     = 90 x 50 mm → 4× vertikal
- Asia mit = 96 x 56 mm → 4× vertikal
*/

(function () {
    if (app.documents.length === 0) return;
    var srcDoc = app.activeDocument;

    // ---------- Dialog "Was?" ----------
    var dlg = new Window('dialog', 'Was?');
    var grp = dlg.add('panel', undefined, 'Variante');
    grp.orientation = 'column';
    grp.alignChildren = 'left';

    var rbEU      = grp.add('radiobutton', undefined, 'EU');
    var rbEUmit   = grp.add('radiobutton', undefined, 'EU mit');
    var rbAsia    = grp.add('radiobutton', undefined, 'Asia');
    var rbAsiamit = grp.add('radiobutton', undefined, 'Asia mit');

    var variant = 'EU'; // Default
    rbEU.value = true;
    rbEU.onClick      = function(){ variant = 'EU'; };
    rbEUmit.onClick   = function(){ variant = 'EU mit'; };
    rbAsia.onClick    = function(){ variant = 'Asia'; };
    rbAsiamit.onClick = function(){ variant = 'Asia mit'; };

    var btns = dlg.add('group'); btns.alignment = 'right';
    btns.add('button', undefined, 'OK',       {name:'ok'});
    btns.add('button', undefined, 'Abbrechen',{name:'cancel'});
    if (dlg.show() !== 1) { try { dlg.close(); } catch(_){} return; }
    try { dlg.close(); } catch(_) {}

    // Mapping: Maße + vertikale Kopien (EU mit = 3, sonst 4)
    var variantMap = {
        'EU':       { wmm:85, hmm:55, vCopies:4 },
        'EU mit':   { wmm:91, hmm:61, vCopies:3 },
        'Asia':     { wmm:90, hmm:50, vCopies:4 },
        'Asia mit': { wmm:96, hmm:56, vCopies:4 }
    };
    var vh = variantMap[variant];
    if (!vh) return;

    // Einheiten/Konstanten
    var MM_TO_PT = 72 / 25.4;
    var RECT_W_PT = vh.wmm * MM_TO_PT;
    var RECT_H_PT = vh.hmm * MM_TO_PT;
    var A4_W_PT   = 210 * MM_TO_PT;
    var A4_H_PT   = 297 * MM_TO_PT;
    var AB_SPACING = 10 * MM_TO_PT;

    var SHIFT_X = RECT_W_PT;
    var SHIFT_Y = RECT_H_PT;
    var VERTICAL_COPIES = vh.vCopies;

    // Helfer
    function overlaps(r1, r2) {
        return (Math.max(r1[0], r2[0]) < Math.min(r1[2], r2[2])) &&
               (Math.max(r1[3], r2[3]) < Math.min(r1[1], r2[1]));
    }
    function findClipPath(pageItem) {
        try {
            if (pageItem.typename === "GroupItem") {
                for (var i = 0; i < pageItem.pathItems.length; i++) {
                    var p = pageItem.pathItems[i];
                    if (p.clipping === true) return p;
                }
                for (var c = 0; c < pageItem.compoundPathItems.length; c++) {
                    var cp = pageItem.compoundPathItems[c];
                    for (var k = 0; k < cp.pathItems.length; k++) {
                        if (cp.pathItems[k].clipping === true) return cp.pathItems[k];
                    }
                    if (cp.pathItems.length > 0) return cp;
                }
                for (var g = 0; g < pageItem.groupItems.length; g++) {
                    var r = findClipPath(pageItem.groupItems[g]);
                    if (r) return r;
                }
            } else if (pageItem.typename === "PathItem" && pageItem.clipping === true) {
                return pageItem;
            }
        } catch (_) {}
        return null;
    }
    function unionBounds(acc, b) {
        if (!b) return acc || null;
        if (!acc) return [b[0], b[1], b[2], b[3]];
        return [ Math.min(acc[0], b[0]), Math.max(acc[1], b[1]), Math.max(acc[2], b[2]), Math.min(acc[3], b[3]) ];
    }
    function approxEqual(a, b, tol) { return Math.abs(a - b) <= tol; }

    // ===== Quelle: je Artboard Schnittgruppe erzeugen =====
    var abCount = srcDoc.artboards.length; if (abCount === 0) return;
    var clipGroups = [];

    for (var abIndex = 0; abIndex < abCount; abIndex++) {
        var abRect = srcDoc.artboards[abIndex].artboardRect; // [L,T,R,B]
        var abCX = (abRect[0] + abRect[2]) / 2, abCY = (abRect[1] + abRect[3]) / 2;

        var rectTop  = abCY + (RECT_H_PT / 2);
        var rectLeft = abCX - (RECT_W_PT / 2);
        // rectangle(top, left, width, height)
        var clip = srcDoc.pathItems.rectangle(rectTop, rectLeft, RECT_W_PT, RECT_H_PT);
        clip.stroked = false; clip.filled = false;
        clip.name = "Clip_"+variant+"_AB" + (abIndex + 1);

        // Größe absichern (falls Ai runde Differenzen macht)
        try {
            var tol = 0.5;
            if (!approxEqual(clip.width, RECT_W_PT, tol) || !approxEqual(clip.height, RECT_H_PT, tol)) {
                clip.resize((RECT_W_PT/clip.width)*100, (RECT_H_PT/clip.height)*100);
            }
        } catch(_){}

        var picks = [], items = srcDoc.pageItems;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (it === clip) continue;
            if (it.locked || it.hidden) continue;
            if (it.layer && (it.layer.locked || !it.layer.visible)) continue;
            if (it.typename === "PathItem" && it.guides) continue;
            var b; try { b = it.geometricBounds; } catch(e){ continue; }
            if (overlaps(b, abRect)) picks.push(it);
        }
        try { clip.zOrder(ZOrderMethod.BRINGTOFRONT); } catch(_){}
        picks.push(clip);

        if (picks.length >= 2) {
            srcDoc.selection = null; srcDoc.selection = picks;
            var made = false; try { app.executeMenuCommand('makeMask'); made = true; } catch(_){}
            if (made && srcDoc.selection && srcDoc.selection.length === 1) {
                var g = srcDoc.selection[0];
                try {
                    if (g && g.typename === "GroupItem" && g.clipped === true) {
                        g.name = "Beschnittgruppe_"+variant+"_AB" + (abIndex + 1);
                        clipGroups.push(g);
                    }
                } catch(_){}
            }
            srcDoc.selection = null;
        }
    }
    if (clipGroups.length === 0) return;

    // Kopieren
    try { srcDoc.selection = clipGroups; app.executeMenuCommand('copy'); }
    catch(_){ srcDoc.selection = null; return; }

// ===== Neues A4-Dokument in Millimeter (ohne globale Prefs) =====
var preset = new DocumentPreset();
preset.colorMode = DocumentColorSpace.CMYK;
preset.units = RulerUnits.Millimeters;      // <-- Anzeigeeinheiten = mm
preset.width  = A4_W_PT;                    // Punkte!
preset.height = A4_H_PT;                    // Punkte!
preset.numArtboards = clipGroups.length;
preset.artboardLayout = DocumentArtboardLayout.GridByRow;
preset.artboardSpacing = AB_SPACING;
preset.artboardRowsOrCols = 1;

// Geeigneten Startup-Preset-Namen wählen (z.B. "Print"), robust mit Fallback:
var startup = "Print";
try {
  var list = app.startupPresetsList;
  if (!list || list.indexOf("Print") === -1) startup = (list && list.length) ? list[0] : "";
} catch (_) {}

var newDoc = app.documents.addDocument(startup, preset, false);
newDoc.activate();

    // Einfügen
    try { app.executeMenuCommand('paste'); } catch(_){ return; }

    function collectPastedGroupsByName(doc, prefix) {
        var out = [], all = doc.groupItems;
        for (var i=0;i<all.length;i++){ var g=all[i];
            if (g.clipped === true && g.name && g.name.indexOf(prefix) === 0) out.push(g);
        }
        out.sort(function(a,b){
            var na=parseInt(a.name.replace(/[^\d]/g,''),10)||0;
            var nb=parseInt(b.name.replace(/[^\d]/g,''),10)||0;
            return na-nb;
        });
        return out;
    }
    var pastedGroups = collectPastedGroupsByName(newDoc, "Beschnittgruppe_"+variant+"_AB");
    if (pastedGroups.length===0 && newDoc.selection && newDoc.selection.length>0){
        for (var s=0;s<newDoc.selection.length;s++){
            var si = newDoc.selection[s];
            if (si.typename==="GroupItem" && si.clipped===true) pastedGroups.push(si);
        }
    }
    var count = Math.min(pastedGroups.length, newDoc.artboards.length);

    // Oben links an Maskenkante ausrichten
    for (var j=0;j<count;j++){
        var abR = newDoc.artboards[j].artboardRect, targetLeft=abR[0], targetTop=abR[1];
        var g = pastedGroups[j];
        try { g.locked=false; g.hidden=false; g.zOrder(ZOrderMethod.BRINGTOFRONT); } catch(_){}
        var gb, mb, clipPath; try { gb = g.geometricBounds; } catch(_){ continue; }
        clipPath = findClipPath(g); if (clipPath){ try{ mb = clipPath.geometricBounds; }catch(_){ mb=null; } }
        if (mb){
            var gl=gb[0], gt=gb[1], ml=mb[0], mt=mb[1];
            try { g.position = [targetLeft - ml + gl, targetTop - mt + gt]; } catch(_){}
        } else {
            var vb=null; try{ vb=g.visibleBounds; }catch(_){}
            if (vb){
                var vgl=gb[0], vgt=gb[1], vbl=vb[0], vbt=vb[1];
                try { g.position = [targetLeft - vbl + vgl, targetTop - vbt + vgt]; } catch(_){}
            } else {
                try { g.position = [targetLeft, targetTop]; } catch(_){}
            }
        }
    }

    // Duplizieren & zentrieren je Artboard
    for (var k=0;k<count;k++){
        try { newDoc.artboards.setActiveArtboardIndex(k); } catch(_){}
        var abBox = newDoc.artboards[k].artboardRect;
        var abCX = (abBox[0]+abBox[2])/2, abCY = (abBox[1]+abBox[3])/2;

        var seed = pastedGroups[k]; if (!seed) continue;
        try { seed.locked=false; seed.hidden=false; } catch(_){}
        var created = [seed];

        // 1× horizontal
        var posSeed = seed.position;
        var dupH = seed.duplicate();
        try { dupH.position = [posSeed[0] + SHIFT_X, posSeed[1]]; } catch(_){}
        created.push(dupH);

        // Vertikal: 3 bei "EU mit", sonst 4 (beide Spalten)
        var rowBase = [seed, dupH];
        for (var r=1; r<=VERTICAL_COPIES; r++){
            for (var rb=0; rb<rowBase.length; rb++){
                var src = rowBase[rb], p = src.position, d = src.duplicate();
                try { d.position = [p[0], p[1] - (SHIFT_Y * r)]; } catch(_){}
                created.push(d);
            }
        }

        // Gruppieren
        var gridGroup = newDoc.groupItems.add();
        gridGroup.name = "AB" + (k+1) + "_Grid_" + variant;
        for (var m=0;m<created.length;m++){ try { created[m].move(gridGroup, ElementPlacement.PLACEATEND); } catch(_){ } }

        // Zentrierung per Masken-Union
        var maskUnion = null;
        for (var gi=0; gi<gridGroup.groupItems.length; gi++){
            var cg = gridGroup.groupItems[gi];
            var mp = findClipPath(cg);
            if (!mp) continue;
            try { maskUnion = unionBounds(maskUnion, mp.geometricBounds); } catch(_){}
        }
        var gB=null; try { gB = gridGroup.geometricBounds; } catch(_){}
        if (gB && maskUnion){
            var Ml=maskUnion[0], Mt=maskUnion[1], Mr=maskUnion[2], Mb=maskUnion[3];
            var Mw=Mr-Ml, Mh=Mt-Mb;
            var Gl=gB[0], Gt=gB[1];
            var offsetX = Gl - Ml, offsetY = Gt - Mt;
            var destMaskLeft = abCX - (Mw/2), destMaskTop = abCY + (Mh/2);
            try { gridGroup.position = [destMaskLeft + offsetX, destMaskTop + offsetY]; } catch(_){}
        } else if (gB){
            var W=gB[2]-gB[0], H=gB[1]-gB[3];
            try { gridGroup.position = [abCX - W/2, abCY + H/2]; } catch(_){}
        }
    }

    try { newDoc.selection = null; } catch(_){}
})();