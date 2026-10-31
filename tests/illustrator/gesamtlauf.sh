#!/bin/zsh
# Gesamtlauf in Illustrator (Projekt-README, Abschnitt „Gesamtlauf“). Ein Durchgang, kein Lauf wird wiederholt. Rechner bleibt wach (caffeinate).
# Optionen: --nur 0,2e,4b (einzelne Abschnitte) oder --nachlauf (0, 2e, 2p, 4b, 5–9); unbekannte Option = Abbruch.
cd "${0:A:h}/../.." && exec caffeinate -dimsu node tests/illustrator/gesamtlauf.mjs "$@"
