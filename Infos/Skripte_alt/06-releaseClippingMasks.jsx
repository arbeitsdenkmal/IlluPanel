// Illustrator-Skript: Schnittmasken robust auflösen (rekursiv, fehlertolerant)
(function () {
    if (app.documents.length === 0) {
        alert("Kein geöffnetes Dokument gefunden.");
        return;
    }

    var doc = app.activeDocument;
    app.executeMenuCommand("deselectall");

    var stats = {
        released: 0,
        skippedLockedHidden: 0,
        skippedNoClipPath: 0,
        errors: 0
    };

    // Prüft, ob eine Gruppe einen echten Clip-Pfad enthält
    function groupHasClipPath(g) {
        try {
            for (var i = 0; i < g.pageItems.length; i++) {
                var it = g.pageItems[i];
                if (it.typename === "PathItem" && it.clipping) return true;
                if (it.typename === "CompoundPathItem") {
                    // In CompoundPaths sitzt das Flag auf dem PathItem
                    for (var p = 0; p < it.pathItems.length; p++) {
                        if (it.pathItems[p].clipping) return true;
                    }
                }
            }
        } catch (_) { /* ignorieren */ }
        return false;
    }

    // Rekursiv durchlaufen
    function processContainer(container) {
        var items = container.pageItems;
        // rückwärts iterieren, falls sich die Struktur ändert
        for (var i = items.length - 1; i >= 0; i--) {
            var it = items[i];

            // Erst Sub-Gruppen bearbeiten
            if (it.typename === "GroupItem") {
                processContainer(it);

                // Dann ggf. Schnittmaske lösen
                try {
                    if (it.locked || it.hidden) {
                        stats.skippedLockedHidden++;
                        continue;
                    }
                    if (it.clipped) {
                        // Nur lösen, wenn tatsächlich ein Clip-Pfad existiert.
                        // Damit vermeiden wir Fehler bei "seltsamen" Gruppen,
                        // in denen das oberste Objekt keine Clipmaske ist.
                        if (groupHasClipPath(it)) {
                            it.clipped = false;
                            stats.released++;
                        } else {
                            stats.skippedNoClipPath++;
                        }
                    }
                } catch (e) {
                    stats.errors++;
                }
            }
        }
    }

    // Start im Dokument
    processContainer(doc);

    var msg = [
        "Schnittmasken-Auflösung abgeschlossen.",
        "Gelöst: " + stats.released,
        "Übersprungen (gesperrt/ausgeblendet): " + stats.skippedLockedHidden,
        "Übersprungen (kein Clip-Pfad gefunden): " + stats.skippedNoClipPath,
        "Fehler: " + stats.errors
    ].join("\n");

    alert(msg);
})();