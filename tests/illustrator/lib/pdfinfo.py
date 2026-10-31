#!/usr/bin/env python3
# PDF-Kennzahlen für den Gesamtlauf: Seitenzahl, Boxen je Seite in mm (MediaBox, TrimBox, BleedBox), Text der ersten Seite gekürzt.
import json, sys
from pypdf import PdfReader

MM = 25.4 / 72
def box(b):
    if b is None:
        return None
    return [round(float(b.width) * MM, 2), round(float(b.height) * MM, 2)]

r = PdfReader(sys.argv[1])
seiten = []
for p in r.pages:
    trim = p.trimbox if "/TrimBox" in p else None
    bleed = p.bleedbox if "/BleedBox" in p else None
    seiten.append({"media": box(p.mediabox), "trim": box(trim), "bleed": box(bleed)})
text = ""
try:
    text = (r.pages[0].extract_text() or "")[:2000]
except Exception:
    pass
print(json.dumps({"seiten": len(r.pages), "boxen": seiten, "text": text}))
