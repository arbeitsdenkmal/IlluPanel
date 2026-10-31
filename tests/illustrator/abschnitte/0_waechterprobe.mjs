// Schritt 0 Wächterprobe: ein Schritt, der nicht zurückkehrt, ohne Illustrator zu blockieren (kein JSX). Der Wächter muss ihn innerhalb der Zeitgrenze
// erkennen, den Prozess beenden und einen Screenshot machen; danach müssen Illustrator und Panel antworten. Das Ergebnis protokolliert der Wächter.
import { schritt, aktion } from "../lib/basis.mjs";

await schritt("Wächterprobe: Schritt kehrt nicht zurück", async () => {
  aktion("wartet ohne Ende");
  await new Promise(() => setInterval(() => {}, 1000)); // der Timer hält den Prozess am Leben (ein leeres Versprechen allein beendet Node sofort)
});
process.exit(0);
