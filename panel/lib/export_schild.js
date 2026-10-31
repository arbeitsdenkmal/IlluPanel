/* Profil „schild“ (SPEZ_03_Schild §9) nach dem Muster von export_flach.js: je Schild (Zeichenfläche mit Inhalt) und Technik eine PDF
 * <Kunde>_<technik>_NN_<Kürzel>-<Stärke>.pdf mit Preset der Auftragsart, nur dieser Zeichenfläche, nur der Ebene der Technik, ohne Bearbeitungsdaten,
 * ohne PDF-Ebenen, Anschnitt aus dem Dokument (JSX IP.pdfSpeichern):
 *   Folie „druck“: Digitaldruck-Objekte ohne Cutkontur (Objekte mit Cutkontur ausgeblendet, die gehen über die Druckbögen), Lochmarkierungen je Lochmitte;
 *   UV „uv-vorn“, „uv-hinten“: je vorhandener Technik, nicht gespiegelt, kein Weiß, keine Lochmarkierungen;
 *   „laser“: bei Acryl und Schild bis laser.max_mm (beide Lagen) Umriss der Zeichenfläche und Löcher als Kontur, alle übrigen Ebenen ausgeblendet.
 * Vorher Schildregeln (Fehler -> Abbruch) und schild.schilder mit Nummer und Endmaß; danach die Druckbögen eines vorliegenden Aufbaus (auftrag.js).
 * Temporäre Elemente liegen auf einer eigenen Ebene nur für die jeweilige PDF; Ort, Nummer (_02 …), Transfer und XMP macht export.js. */
"use strict";
const D = require("./dokument");
const EX = require("./export");
const AU = require("./auftrag");
const S = require("./schild");

/** Dateien für den Exportkern; st = schild.stand, x = XMP mit aktualisierten schilder, arbeitsdatei = Pfad der .ai */
function dateien(aa, x, st, host, arbeitsdatei) {
  const ex = aa.export, l = ex.laser, mk = aa.bohrungen.markierung, k = S.PT_MM / (x.massstab || 1);
  const m = x.schild.material, folie = x.schild.verfahren === "folie";
  const ebene = rolle => (aa.ebenen.find(e => e.rolle === rolle) || {}).name;
  const eintraege = S.zuordnen(st.zeichenflaechen, x.schild.schilder), r = [];
  const pdf = (name, spec) => r.push({ name, speichern: lokal => host("pdfSpeichern", Object.assign({ datei: lokal, preset: ex.preset, anschnitt: ex.anschnitt, arbeitsdatei }, spec)) });
  st.zeichenflaechen.forEach((z, i) => {
    const zi = st.regeln.jeZf[i];
    if (!zi.inhalt) return;
    const nr = i + 1, b = S.bohrungenVon(eintraege[i], aa.bohrungen.standard), loecher = S.lochmittenPt(z.rect, b, x.massstab);
    const hier = st.objekte.filter(o => S.zeichenflaecheVon(o.gb, [z.rect]) === 0);
    const basis = { artboardRange: String(nr) };
    for (const t of ex.techniken) {
      const auf = hier.filter(o => o.rolle === t.rolle);
      if (t.rolle === "digitaldruck") {
        // Folie: nur Objekte ohne Cutkontur; die mit Cutkontur ausgeblendet; Lochmarkierungen (bei „keine“ ohne)
        if (!folie || !auf.some(o => !o.cut)) continue;
        const kreise = loecher.map(p => ({ x: p[0], y: p[1], d: mk.durchmesser_mm * k, fuellung: mk.cmyk }));
        pdf(S.dateiname(x.kunde, t.name, nr, m), Object.assign({ ebene: ebene(t.rolle), ausblenden: auf.filter(o => o.cut).map(o => o.ref), temp: { kreise } }, basis));
      } else if (S.UV.includes(t.rolle)) {
        if (folie || !auf.length) continue;
        pdf(S.dateiname(x.kunde, t.name, nr, m), Object.assign({ ebene: ebene(t.rolle) }, basis));
      }
    }
    // Laser: Umriss der Zeichenfläche (Endformat) und Löcher als Kontur, keine Füllungen; nur die temporäre Ebene sichtbar
    if (S.laserNoetig(m, zi.breite_mm, zi.hoehe_mm, l.max_mm)) {
      const kreise = loecher.map(p => ({ x: p[0], y: p[1], d: b.durchmesser_mm * k, kontur: l.loch_cmyk, staerke: l.kontur_pt }));
      pdf(S.dateiname(x.kunde, l.name, nr, m), Object.assign({ ebene: "", temp: { kreise, rechtecke: [{ rect: z.rect, kontur: l.umriss_cmyk, staerke: l.kontur_pt }] } }, basis));
    }
  });
  return r;
}

/**
 * Export bei vorderer Arbeitsdatei Schild. ui { ordnerWaehlen(start), meldung(text) }. Rückgabe { zeilen } – Meldung des Exportkerns, Zeilen des
 * Druckbogen-Exports, Warnungen der Schildregeln (leer: keine Meldung).
 */
async function exportieren(host, konf, ui) {
  const info = await host("dokumentInfo");
  if (!info.hatDokument || !info.pfad) throw new Error("Arbeitsdatei ist nicht gespeichert");
  const pfad = info.pfad, X = D.xmpZugriff(host);
  const xmp = await X.xmpLesen(), aa = konf.arten[xmp.auftragsart];
  const st = await S.stand(host, aa, xmp);
  if (st.regeln.fehler.length) return { zeilen: st.regeln.fehler.concat(st.regeln.warnungen) };

  // schilder[] mit Nummer und Endmaß aus dem Dokument (§5), Arbeitsdatei speichern
  const x = D.aendern(xmp, { "schild.schilder": S.schilderSchreiben(st.zeichenflaechen, xmp.schild.schilder, st.regeln.jeZf.map(z => z.inhalt),
    { standard: aa.bohrungen.standard, massstab: xmp.massstab }) });
  await X.xmpSchreiben(x);
  await host("dokumentSpeichern", pfad);

  const zeilen = [], liste = dateien(aa, x, st, host, pfad);
  // Druckbögen eines vorliegenden Aufbaus (§9.1 Schritt 4), nur wenn Bögen dieses Aufbaus offen sind; sie kopieren dann die Arbeitsdatei
  const id = x.aufbau && x.aufbau.id, boegen = !!id && (await host("dokumenteListe")).dokumente.some(d => {
    try { const o = D.parsen(d.xmp); return !!o && o.rolle === "druckbogen" && !!o.bogen && o.bogen.arbeitsdatei === pfad && String(o.bogen.aufbau) === String(id); }
    catch (e) { return false; }
  });
  if (liste.length || !boegen) {
    const r = await EX.exportieren({ xmp: D.parsen((await host("xmpLesen", pfad)).text), dateien: liste, dtf: [] }, {
      rechner: konf.rechner, ordnerWaehlen: ui.ordnerWaehlen, meldung: ui.meldung,
      xmpSchreiben: async o => { await host("xmpSchreiben", D.serialisieren(o), pfad); return o; },
      arbeitsdatei: { pfad, speichern: () => host("dokumentSpeichern", pfad), kopie: !boegen }
    });
    if (r.meldung) zeilen.push(r.meldung);
  }
  if (boegen) zeilen.push(...(await AU.exportDruckboegen(host, konf, ui)).zeilen);
  return { zeilen: zeilen.concat(st.regeln.warnungen) };
}

module.exports = { dateien, exportieren };
