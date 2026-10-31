// Panel und Hintergrund-Extension neu laden (rechner.json wird nur beim Start gelesen); wartet, bis das Panel bereit ist.
import { ev, evStill, offen, bis, warte, trennen } from "./basis.mjs";

if (await offen("hintergrund")) await evStill("hintergrund", "location.reload(); true");
if (await offen("panel")) {
  await evStill("panel", "location.reload(); true");
  trennen();
  await warte(1500);
  const ok = await bis(async () => ev("panel", `!!window.PAM && !document.getElementById("btnAuftrag").disabled`), 40000, 500);
  console.log(ok ? "Panel neu geladen" : "Panel nach dem Neuladen nicht bereit");
}
trennen();
process.exit(0);
