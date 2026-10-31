/* Nutzen (SPEZ_03_Nutzen §5): Planung aus dem alten Projekt (panel/lib/nutzen.js, Stufe 24 = 01-Nutzen_Generator.jsx v3), Füll-Logik, pickCount,
 * Sortierung und Duplikate 1:1. Geändert (§5.4): Konstanten aus config/nutzen.json und config/medien.json statt fester Werte; Nutzbreite availW =
 * Rollenbreite − 2 × kantenhalter_mm − opos_zugabe_mm − 2 × opos_marken_rand_mm − 2 × Anschnitt; Bogenformat „ohne“ (Spalten über die Nutzbreite, letzte
 * Zeile teilbelegt, kein Bogenabstand); über availH hinaus weitere Bögen desselben Aufbaus statt mehrerer Drucke (druckboegen); „Drucke“ heißt „Bögen“.
 * Maße in mm, y nach unten. Sortierungen mit dem ursprünglichen Index als zweitem Schlüssel (wie im alten Projekt). */
"use strict";

function r1(x) { return Math.round(x * 10) / 10; }
function r2(x) { return Math.round(x * 100) / 100; }
function parseNum(s) { return parseFloat(String(s).replace(",", ".")); }

// Messung -> Texte im Block „Motiv (gemessen)“ von Schritt 1
function motivZeilen(m) {
  const z = [(m.hasCut ? "Cutkontur:     " : "Gesamtauswahl: ") + r1(m.mW) + " \xD7 " + r1(m.mH) + " mm" + (m.hasCut ? "  (" + m.nCut + " Objekt(e))" : "")];
  if (m.hasCut) z.push("Anschnitt:     max. " + r1(m.bleedMax) + " mm \xFCber die Cutkontur hinaus");
  return z;
}
const TEXT_OHNE_CUT = "Keine Cutkontur gefunden (Vollton 100 % Magenta erwartet).\n\n"
  + "Ohne Cutkontur wird das Raster aus der Gesamtauswahl gerechnet\n"
  + "und die Ebene „Cut“ bleibt leer.\n\nTrotzdem fortfahren?";
const KEINE_AUSWAHL = "Keine Auswahl. Bitte Motiv und Cutkontur ausw\xE4hlen.";

/**
 * Schritt 1 „Weiter →“: Felder prüfen. f: { kunde, count, produkt, format, strict, gapM, medium, laminat } (kunde, count, medium, laminat nur Einstieg B;
 * bei A fest aus der Zuordnung). -> { fehler } | { frage (Anschnitt-Rückfrage), params } | { params }
 */
function dialog1Pruefen(m, f, einstieg) {
  const cnt = parseInt(f.count, 10), gm = parseNum(f.gapM), produkt = String(f.produkt || "").trim(), kunde = String(f.kunde || "").trim();
  const ok = !isNaN(cnt) && cnt >= 1 && !isNaN(gm) && gm >= 0 && produkt && f.format
    && (einstieg === "A" || (kunde && f.medium && f.laminat));
  if (!ok) return { fehler: "Bitte alle Felder korrekt ausf\xFCllen." };
  const params = { cnt, format: f.format, strict: f.format === "ohne" ? true : !!f.strict, gm, produkt, kunde, medium: f.medium, laminat: f.laminat };
  if (m.hasCut && m.bleedMax * 2 > gm + 0.01) {
    return {
      params, frage: "Der Anschnitt steht max. " + r1(m.bleedMax) + " mm \xFCber die Cutkontur.\n"
        + "Bei " + r1(gm) + " mm Motivabstand \xFCberlappen sich benachbarte Anschnitte.\n\n"
        + "Kollisionsfrei w\xE4ren mindestens " + r1(m.bleedMax * 2) + " mm.\n\nTrotzdem weiter?"
    };
  }
  return { params };
}

/**
 * Planung. m: { mW, mH, bleedMax } (Realmaß), params: { cnt, format, strict, gm }, u: { rolle (Rollenbreite), kantenhalter, rand (opos_zugabe_mm +
 * 2 × opos_marken_rand_mm), max_laenge (druck.max_laenge_mm), gB (abstand_boegen_mm), toleranz, formate (nutzen.formate) }.
 * Rückgabe { availW, availH, tgtW, tgtH, gM, gB, cnt, rand, ohne, plans, picks, fehler? }
 */
function planen(m, params, u) {
  const RAND = u.rand;
  const availW = u.rolle - 2 * u.kantenhalter - RAND - 2 * m.bleedMax;
  const availH = u.max_laenge - RAND;
  const gM = params.gm, gB = u.gB, cnt = params.cnt;
  const fmt = (u.formate || []).find(x => x.id === params.format) || {};
  const ohne = params.format === "ohne";
  const tgtW = fmt.breite_mm, tgtH = fmt.hoehe_mm;
  const mW_mm = m.mW, mH_mm = m.mH;
  const basis = { availW, availH, tgtW, tgtH, gM, gB, cnt, rand: RAND, ohne, formatName: fmt.name || params.format };
  if (ohne) return planenOhne(m, params, basis);

  // Spalten- bzw. Zeilenzahl im Bogen aus dem Zielformat ableiten.
  // Aussenmass = Raster + gB.  strict: abrunden.  weich: naeherer Wert.
  function pickCount(tgt, step) {
    const f = Math.floor((tgt - gB + gM) / step);
    if (f < 1) return params.strict ? 0 : 1;
    if (params.strict) return f;
    const c = f + 1;
    const oF = f * step - gM + gB;
    const oC = c * step - gM + gB;
    if (oC <= tgt * (1 + u.toleranz) && Math.abs(oC - tgt) < Math.abs(oF - tgt)) return c;
    return f;
  }

  const plans = [];
  const rMArr = [false, true], bQArr = [false, true];
  for (let a = 0; a < rMArr.length; a++) {
    for (let b = 0; b < bQArr.length; b++) {
      const rotM = rMArr[a], bQuer = bQArr[b];
      const effMW = rotM ? mH_mm : mW_mm, effMH = rotM ? mW_mm : mH_mm;
      const stepX = effMW + gM, stepY = effMH + gM;
      const bTgtW = bQuer ? tgtH : tgtW, bTgtH = bQuer ? tgtW : tgtH;
      const bCols = pickCount(bTgtW, stepX), bRows = pickCount(bTgtH, stepY);
      if (bCols < 1 || bRows < 1) continue;

      const bw = bCols * stepX - gM;      // Bogen-Innenraster (Cutkante bis Cutkante)
      const bh = bRows * stepY - gM;
      const outW = bw + gB, outH = bh + gB;   // Aussenmass nach dem Schnitt

      const perRow = Math.floor((availW + gB) / (bw + gB));
      const maxBZ = Math.floor((availH + gB) / (bh + gB));
      if (perRow < 1 || maxBZ < 1) continue;

      const plz = perRow * bCols;                  // Plaetze je Motivzeile
      const Tz = Math.ceil(cnt / plz);            // benoetigte Motivzeilen
      const BZ = Math.ceil(Tz / bRows);           // Bogenzeilen gesamt
      const p = Math.ceil(BZ / maxBZ);           // Bögen (bisher Drucke)

      const heightOf = (nBZ, nTz) => {
        const full = nBZ - 1;
        const restRows = nTz - full * bRows;
        return full * (bh + gB) + (restRows * stepY - gM);
      };

      // Ab der zweiten Motivzeile wird die letzte Reihe voll gemacht -
      // die Ueberproduktion wird ausgewiesen. Bei nur einer Reihe
      // bleibt es teilbelegt (exakte Stueckzahl).
      const fillLast = (Tz > 1);

      let buildTz, buildBZ, nH, len, pieces, lastTz, lastBZ;
      if (p === 1) {
        buildTz = Tz; buildBZ = BZ;
        nH = heightOf(BZ, Tz);
        len = nH + RAND;
        pieces = fillLast ? Tz * plz : cnt;
        lastTz = Tz; lastBZ = BZ;
      } else {
        // volle Bögen: maxBZ Bogenzeilen komplett gefuellt
        // letzter Bogen: Rest, auf volle Motivzeilen aufgerundet
        const TzFull = maxBZ * bRows;
        buildTz = TzFull; buildBZ = maxBZ;
        lastBZ = BZ - (p - 1) * maxBZ;
        lastTz = Tz - (p - 1) * TzFull;
        const hFull = maxBZ * (bh + gB) - gB;
        const hLast = heightOf(lastBZ, lastTz);
        nH = hFull;
        len = (p - 1) * (hFull + RAND) + (hLast + RAND);
        pieces = ((p - 1) * TzFull + lastTz) * plz;
      }

      // Breite: bei mehr als einer Motivzeile ist die erste voll
      let nW;
      if (buildTz > 1 || cnt >= plz) {
        nW = perRow * (bw + gB) - gB;
      } else {
        const jmax = cnt - 1;
        nW = Math.floor(jmax / bCols) * (bw + gB) + (jmax % bCols) * stepX + effMW;
      }

      // Boegen gesamt (ueber alle Druckbögen). Bei aufgefuellter letzter
      // Reihe ist jede Motivzeile voll -> in jeder Bogenzeile perRow.
      const boegen = fillLast ? (BZ * perRow) : Math.ceil(cnt / bCols);
      // Belegung der letzten Motivzeile (nur relevant ohne Auffuellen)
      const restM = fillLast ? plz : cnt;

      plans.push({
        rotM, bQuer, effMW, effMH, stepX, stepY, bCols, bRows, bw, bh, outW, outH,
        perRow, plz, maxBZ, Tz, BZ, prints: p, buildTz, buildBZ, lastTz, lastBZ,
        buildCount: (p === 1) ? pieces : buildTz * plz,
        fillLast, restM, nW, nH, len, boegen, pieces, over: pieces - cnt
      });
    }
  }
  if (plans.length === 0) {
    return Object.assign(basis, {
      plans, picks: [], fehler: "Kein Layout berechenbar.\n\n"
        + "Motiv " + r1(mW_mm) + " \xD7 " + r1(mH_mm) + " mm passt mit "
        + r1(gM) + " mm Abstand in kein\n"
        + "Bogenau\xDFenma\xDF von " + tgtW + " \xD7 " + tgtH + " mm.\n\n"
        + "Gr\xF6\xDFeres Zielformat w\xE4hlen oder auf \xB1 25 % stellen."
    });
  }
  // bei Gleichstand der urspruengliche Index (stabil und eindeutig, unabhaengig vom Sortierverfahren)
  for (let pIdx = 0; pIdx < plans.length; pIdx++) plans[pIdx].idx = pIdx;
  plans.sort((x, y) => {
    if (x.len !== y.len) return x.len - y.len;
    if (x.boegen !== y.boegen) return x.boegen - y.boegen;
    if (x.prints !== y.prints) return x.prints - y.prints;
    if (x.over !== y.over) return x.over - y.over;
    return x.idx - y.idx;
  });
  // Duplikate entfernen (bei quadratischen Motiven sind Varianten identisch)
  const picks = [];
  for (const pl of plans) {
    const dup = picks.some(q => q.bCols === pl.bCols && q.bRows === pl.bRows && q.perRow === pl.perRow && q.buildTz === pl.buildTz && Math.abs(q.nW - pl.nW) < 0.01);
    if (!dup) picks.push(pl);
  }
  return Object.assign(basis, { plans: materialSetzen(plans, m), picks });
}

// Materiallänge (SPEZ_03_Nutzen §11 Punkt 6): Summe der Zeichenflächenlängen aller Bögen des Aufbaus = Planerlänge (Nutzen + OPOS-Rand je Bogen) + Anschnitt
// oben und unten je Bogen nach der Drehung; die Sortierung bleibt bei der Planerlänge len
function materialSetzen(plans, m) {
  const o = m.off0 || { l: 0, t: 0, r: 0, b: 0 };
  plans.forEach(pl => { const a = pl.rotM ? rotOff(o) : o; pl.material = pl.len + pl.prints * (a.t + a.b); });
  return plans;
}

// Bogenformat „ohne“ (§5.4): Spalten über die Nutzbreite, Zeilen bis zur Stückzahl, letzte Zeile teilbelegt (exakt), kein Bogenabstand; Motiv 0/90°
function planenOhne(m, params, basis) {
  const { availW, availH, gM, cnt, rand: RAND } = basis, plans = [];
  [false, true].forEach(rotM => {
    const effMW = rotM ? m.mH : m.mW, effMH = rotM ? m.mW : m.mH;
    const stepX = effMW + gM, stepY = effMH + gM;
    const cols = Math.floor((availW + gM) / stepX), rowsMax = Math.floor((availH + gM) / stepY);
    if (cols < 1 || rowsMax < 1) return;
    const Z = Math.ceil(cnt / cols), p = Math.ceil(Z / rowsMax);
    const nW = Z > 1 ? cols * stepX - gM : cnt * stepX - gM;
    const lastRows = Z - (p - 1) * rowsMax;
    const nH = (p > 1 ? rowsMax : Z) * stepY - gM;
    const len = (p - 1) * (rowsMax * stepY - gM + RAND) + (lastRows * stepY - gM + RAND);
    plans.push({ ohne: true, rotM, effMW, effMH, stepX, stepY, cols, rowsMax, Z, lastRows, prints: p, nW, nH, len,
      buildCount: Math.min(cnt, (p > 1 ? rowsMax : Z) * cols), pieces: cnt, over: 0, restM: Z > 1 ? cnt - (Z - 1) * cols : cnt });
  });
  if (!plans.length) {
    return Object.assign(basis, { plans, picks: [], fehler: "Kein Layout berechenbar.\n\n"
      + "Motiv " + r1(m.mW) + " \xD7 " + r1(m.mH) + " mm passt mit " + r1(gM) + " mm Abstand nicht auf das Medium." });
  }
  plans.forEach((pl, i) => { pl.idx = i; });
  plans.sort((x, y) => (x.len !== y.len ? x.len - y.len : x.prints !== y.prints ? x.prints - y.prints : x.idx - y.idx));
  const picks = [];
  for (const pl of plans) if (!picks.some(q => q.cols === pl.cols && q.Z === pl.Z && Math.abs(q.nW - pl.nW) < 0.01)) picks.push(pl);
  return Object.assign(basis, { plans: materialSetzen(plans, m), picks });
}

/**
 * Bögen eines Layouts (§5.4): je Bogen die Cut-Positionen der Exemplare (linke obere Cutkante, mm relativ zum Nutzen) in Reihenfolge der Platzierung,
 * dazu Nutzenmaß und Zeilen. A4/A3: volle Bögen mit maxBZ Bogenzeilen, der letzte mit dem Rest (letzte Motivzeile nach der Füllregel); „ohne“: volle Bögen
 * mit rowsMax Zeilen, der letzte kürzer und exakt. -> [{ positionen: [[x, y]], anzahl, nW, nH, nBZ, nTz }]
 */
function druckboegen(sel, gB, cnt) {
  const out = [];
  const masse = pos => ({ nW: Math.max(...pos.map(p => p[0])) + sel.effMW, nH: Math.max(...pos.map(p => p[1])) + sel.effMH });
  if (sel.ohne) {
    for (let i = 0, rest = cnt; i < sel.prints; i++) {
      const rows = i < sel.prints - 1 ? sel.rowsMax : sel.lastRows, n = Math.min(rest, rows * sel.cols), pos = [];
      for (let k = 0; k < n; k++) pos.push([(k % sel.cols) * sel.stepX, Math.floor(k / sel.cols) * sel.stepY]);
      rest -= n;
      out.push(Object.assign({ positionen: pos, anzahl: n, nTz: rows, nBZ: null }, masse(pos)));
    }
    return out;
  }
  for (let i = 0; i < sel.prints; i++) {
    const letzter = i === sel.prints - 1;
    const nBZ = letzter ? sel.lastBZ : sel.buildBZ, nTz = letzter ? sel.lastTz : sel.buildTz;
    const anzahl = sel.prints === 1 ? sel.buildCount : nTz * sel.plz, pos = [];
    // volle Bogenzeilen 0 .. nBZ-2 komplett, letzte Bogenzeile motivweise bis anzahl (angebrochene Bögen bleiben teilbelegt)
    const vollBZ = nBZ - 1;
    for (let by = 0; by < vollBZ; by++) for (let bx = 0; bx < sel.perRow; bx++) {
      for (let mr = 0; mr < sel.bRows; mr++) for (let mc = 0; mc < sel.bCols; mc++) pos.push([bx * (sel.bw + gB) + mc * sel.stepX, by * (sel.bh + gB) + mr * sel.stepY]);
    }
    const restCount = anzahl - vollBZ * sel.bRows * sel.plz, yBase = vollBZ * (sel.bh + gB);
    for (let k = 0; k < restCount; k++) {
      const zLocal = Math.floor(k / sel.plz), j = k % sel.plz, bxI = Math.floor(j / sel.bCols), cxI = j % sel.bCols;
      pos.push([bxI * (sel.bw + gB) + cxI * sel.stepX, yBase + zLocal * sel.stepY]);
    }
    out.push(Object.assign({ positionen: pos, anzahl, nBZ, nTz }, masse(pos)));
  }
  return out;
}

// ---------- Texte Schritt 2 „Vorschau“ ----------
function planZeile(x) {
  let s = r2(x.material / 1000) + " m";
  if (!x.ohne) {
    s += "  |  Bogen " + r1(x.outW) + "\xD7" + r1(x.outH)
      + " mm (" + x.bCols + "\xD7" + x.bRows + ")"
      + "  |  " + x.perRow + " B\xF6gen/Reihe"
      + "  |  " + x.boegen + " B\xF6gen gesamt";
  }
  s += "  |  " + x.prints + " B\xF6gen";
  if (x.over > 0) s += "  |  " + x.over + " zu viel";
  if (x.rotM) s += "  |  Motiv 90\xB0";
  if (x.bQuer) s += "  |  Bogen quer";
  return s;
}
// mk: { medium, laminat (Bezeichnung), rolle }
function vorgabeZeilen(m, params, pl, mk) {
  return [
    "Motiv (Cutkontur): " + r1(m.mW) + " \xD7 " + r1(m.mH) + " mm" + "   |   " + params.cnt + " Stk." + "   |   Medium " + mk.medium + " " + mk.laminat + ", Rolle " + mk.rolle + " mm",
    "Zielformat: " + (pl.ohne ? pl.formatName : pl.formatName + " " + pl.tgtW + " \xD7 " + pl.tgtH + " mm (" + (params.strict ? "exakt oder kleiner" : "\xB1 25 %") + ")")
      + "   |   Abst\xE4nde: Motive " + r1(pl.gM) + " mm" + (pl.ohne ? "" : ", B\xF6gen " + pl.gB + " mm")
  ];
}
// Zeichenfläche des ersten Bogens: Nutzen + OPOS-Rand + Anschnitt links/rechts bzw. oben/unten (§5.4)
function detailText(x, cnt, pl, anschnitt) {
  const a = anschnitt || { l: 0, t: 0, r: 0, b: 0 };
  let t = "Nutzen: " + r1(x.nW) + " \xD7 " + r1(x.nH) + " mm"
    + "   |   Zeichenfl\xE4che: " + r1(x.nW + pl.rand + a.l + a.r) + " \xD7 " + r1(x.nH + pl.rand + a.t + a.b) + " mm"
    + "   |   " + x.buildCount + " Motive im Nutzen";
  if (x.ohne) {
    t += "\nF\xFCllung: " + x.cols + " Pl\xE4tze je Motivzeile, " + x.Z + " Motivzeile(n).";
    if (x.prints > 1) t += "\n" + x.prints + " B\xF6gen: " + (x.prints - 1) + "\xD7 voll (" + x.rowsMax + " Motivzeilen) + 1\xD7 mit " + x.lastRows + " Motivzeile(n) – exakt " + cnt + " Stk.";
    else t += "\nLetzte Motivzeile " + x.restM + " von " + x.cols + " Pl\xE4tzen belegt – exakt " + cnt + " Stk.";
    return t;
  }
  t += "\nF\xFCllung: " + x.plz + " Pl\xE4tze je Motivzeile ("
    + x.perRow + " B\xF6gen \xD7 " + x.bCols + "), " + x.Tz + " Motivzeile(n) in "
    + x.BZ + " Bogenzeile(n).";
  if (x.prints > 1) {
    t += "\n" + x.prints + " B\xF6gen: " + (x.prints - 1) + "\xD7 voll ("
      + x.buildBZ + " Bogenzeilen) + 1\xD7 mit " + x.lastBZ + " Bogenzeile(n) / "
      + x.lastTz + " Motivzeile(n).";
  } else if (x.fillLast) {
    t += "\nLetzte Motivzeile voll aufgef\xFCllt: " + x.pieces + " statt " + cnt
      + " Stk. – " + x.over + " \xDCberproduktion.";
  } else {
    t += "\nEine Motivzeile, " + x.restM + " von " + x.plz
      + " Pl\xE4tzen belegt – exakt " + cnt + " Stk.";
  }
  return t;
}

// ---------- Info-Ebene je Bogen (ohne „Erstellt:“ – Datum setzt der Kern) ----------
const SEP = "─".repeat(20);
const ERSTELLT = "Erstellt:          ";
// db: Bogen aus druckboegen, nr/gesamt: Bogen im Aufbau, mk: { medium, laminat (Bezeichnung), rolle }
function infoZeilen(m, params, pl, sel, db, nr, gesamt, mk) {
  const gM = pl.gM, gB = pl.gB, cnt = params.cnt;
  const z = [
    "=== NUTZEN-INFO ===",
    "Motiv (Cutkontur): " + r1(m.mW) + " \xD7 " + r1(m.mH) + " mm" + (sel.rotM ? "  – 90\xB0 gedreht" : ""),
    "Anschnitt:         max. " + r1(m.bleedMax) + " mm",
    SEP
  ];
  if (!sel.ohne) {
    z.push("Bogen:             " + sel.bCols + " \xD7 " + sel.bRows + " Motive = " + r1(sel.bw) + " \xD7 " + r1(sel.bh) + " mm Raster" + (sel.bQuer ? "  – quer" : ""),
      "Bogen-Au\xDFenma\xDF:    " + r1(sel.outW) + " \xD7 " + r1(sel.outH) + " mm  (~" + pl.formatName + ")",
      "Schnitt:           mittig zwischen den B\xF6gen, " + (gB / 2) + " mm je Seite",
      SEP);
  }
  z.push("Nutzen:            " + r1(db.nW) + " \xD7 " + r1(db.nH) + " mm");
  if (sel.ohne) z.push("F\xFCllung:           " + sel.cols + " Pl\xE4tze je Motivzeile", "                   " + db.nTz + " Motivzeile(n)");
  else z.push("F\xFCllung:           " + sel.perRow + " B\xF6gen \xD7 " + sel.bCols + " = " + sel.plz + " Pl\xE4tze je Motivzeile",
    "                   " + db.nTz + " Motivzeile(n) in " + db.nBZ + " Bogenzeile(n)");
  z.push("Motive im Bogen:   " + db.anzahl);
  if (!sel.ohne) z.push("B\xF6gen gesamt:      " + sel.boegen);
  z.push("Ben\xF6tigt:          " + cnt + " Stk.", SEP,
    "Bogen " + nr + " von " + gesamt,
    "Produziert:        " + sel.pieces + " Stk." + (sel.over > 0 ? "  →  " + sel.over + " Stk. \xDCberproduktion" : "  →  exakt"),
    "Materiall\xE4nge:     " + r2(sel.material / 1000) + " m (inkl. OPOS-Rand)",
    SEP,
    "Medium:            " + mk.medium,
    "Laminat:           " + mk.laminat,
    "Rolle:             " + mk.rolle + " mm",
    "Abst\xE4nde:          Motive " + r1(gM) + " mm" + (sel.ohne ? "" : " | B\xF6gen " + gB + " mm"));
  return z;
}
// Anschnitt-Offsets nach Motivrotation (−90 Grad)
function rotOff(o) { return { l: o.b, t: o.l, r: o.t, b: o.r }; }

module.exports = { r1, r2, parseNum, TEXT_OHNE_CUT, KEINE_AUSWAHL, SEP, ERSTELLT, motivZeilen, dialog1Pruefen, planen, druckboegen, planZeile, vorgabeZeilen,
  detailText, infoZeilen, rotOff };
