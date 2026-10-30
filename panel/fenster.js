/* Gemeinsames für die Fenster „Objekt“ und „Zusammenfassung“ (nach gemeinsam.js geladen): „Abbrechen“ bzw. „Schließen“ und Esc schließen das Fenster. */
(function () {
  "use strict";
  const G = window.PAM;
  const schliessen = () => G.cep.closeExtension();
  ["abbrechen", "schliessen"].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener("click", schliessen); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); schliessen(); } });
  G.schliessen = schliessen;
})();
