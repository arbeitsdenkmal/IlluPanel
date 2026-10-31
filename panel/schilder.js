/* Fenster „Schilder“ (Extension de.pamnm.illupanels.schilder, ModalDialog, SPEZ_03_Schild §6.2): Bohrungen je Schild.
 * Kopf Verfahren · Material aus dem XMP (nur Anzeige); eine Zeile je Zeichenfläche mit Inhalt auf einer Produktionsebene: „Schild NN“, Maß, Anordnung und
 * nur die Felder, die die Anordnung braucht. Vorbelegung aus schild.schilder im XMP (Zuordnung über Rechteck, sonst Name), sonst bohrungen.standard.
 * OK prüft (§6.1) und schreibt schild.schilder mit Nummer und Endmaß (§5), Abbrechen verwirft; Enter = OK, Esc = Abbrechen.
 * Rückmeldung per CSEvent EVENT_SCHILDER_FERTIG. Darstellung SPEZ_03_Oberflaeche §8: je Schild eine Karte; die Skizze zeigt das Schild maßstäblich (höchstens
 * 100 × 76 px) und je Bohrung einen Punkt an der Lochmitte aus schild.lochmitten (wie Druck-PDF und Laserdatei), folgt jeder Eingabe; bei leeren oder
 * ungültigen Werten keine Punkte. */
(function () {
  "use strict";
  const G = window.PAM;
  const K = G.lib("konfiguration.js");
  const D = G.lib("dokument.js");
  const S = G.lib("schild.js");
  const $ = id => document.getElementById(id);
  const X = D.xmpZugriff(G.host);

  const ANORDNUNG = { ecken: "4 Ecken", mitte_oben_unten: "2 mittig oben/unten", mitte_links_rechts: "2 mittig links/rechts", keine: "keine" };
  const FELD = { abstand_x_mm: "Abstand waagrecht", abstand_y_mm: "Abstand senkrecht", durchmesser_mm: "Durchmesser" };
  let aa = null, zf = [], massstab = 1, inhalt = [], zeilen = [], bereit = false, laeuft = false;

  const mmText = v => (typeof v === "number" && isFinite(v) ? String(Math.round(v * 100) / 100).replace(".", ",") : "");
  const mmLesen = t => { const s = String(t).trim().replace(",", "."); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN; };
  const massText = z => `${mmText(Math.round(z.breite_mm * 10) / 10)} × ${mmText(Math.round(z.hoehe_mm * 10) / 10)} mm`;

  // Skizze: Platte maßstäblich in 100 × 76 px, Punkte an den Lochmitten; nur wenn alle Felder der Anordnung gültige Werte > 0 haben
  function skizzeZeichnen(z) {
    const { breite_mm: b, hoehe_mm: h } = z.mass, k = Math.min(100 / b, 76 / h);
    z.platte.style.width = `${b * k}px`; z.platte.style.height = `${h * k}px`;
    const w = { anordnung: z.anordnung };
    S.FELDER[z.anordnung].forEach(f => { w[f] = mmLesen(z.werte[f]); });
    const gueltig = S.FELDER[z.anordnung].every(f => w[f] > 0);
    z.platte.replaceChildren(...(gueltig ? S.lochmitten(b, h, w) : []).map(p => {
      const s = document.createElement("span");
      s.className = "loch"; s.style.left = `${p.x_mm * k}px`; s.style.top = `${p.y_mm * k}px`;
      return s;
    }));
  }
  // Felder der Anordnung; die Werte aller Felder bleiben beim Wechsel der Anordnung erhalten
  function felderZeichnen(z) {
    z.felder.replaceChildren(...S.FELDER[z.anordnung].map(k => {
      const l = document.createElement("label"), i = document.createElement("input");
      i.type = "text"; i.autocomplete = "off"; i.spellcheck = false; i.value = z.werte[k];
      i.addEventListener("input", () => { z.werte[k] = i.value; skizzeZeichnen(z); });
      l.append(FELD[k], i, "mm");
      return l;
    }));
    skizzeZeichnen(z);
  }
  function zeichnen(eintraege) {
    const st = aa.bohrungen.standard;
    zeilen = [];
    $("zeilen").replaceChildren(...zf.map((z, i) => {
      if (!inhalt[i]) return null;
      const b = S.bohrungenVon(eintraege[i], st), werte = {};
      Object.keys(FELD).forEach(k => { werte[k] = mmText(b[k] !== undefined ? b[k] : st[k]); });
      const neu = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
      const karte = neu("div", "schild"), skizze = neu("div", "skizze"), platte = neu("div", "platte"), rechts = neu("div", "srechts"), kopf = neu("div", "zeile");
      const sel = document.createElement("select"), felder = neu("div", "felder");
      S.ANORDNUNGEN.forEach(a => sel.appendChild(new Option(ANORDNUNG[a], a)));
      sel.value = S.ANORDNUNGEN.includes(b.anordnung) ? b.anordnung : st.anordnung;
      const zeile = { i, anordnung: sel.value, werte, felder, platte, mass: S.mass(z.rect, massstab) };
      sel.addEventListener("change", () => { zeile.anordnung = sel.value; felderZeichnen(zeile); });
      kopf.append(neu("b", "", S.SCHILD(i + 1)), neu("span", "muted", massText(zeile.mass)), neu("span", "fuell"), sel);
      skizze.append(platte); rechts.append(kopf, felder); karte.append(skizze, rechts);
      felderZeichnen(zeile);
      zeilen.push(zeile);
      return karte;
    }).filter(Boolean));
  }

  async function ok() {
    if (!bereit || laeuft) return;
    laeuft = true; $("ok").disabled = true;
    try {
      const bohrungen = [], fehler = [];
      zeilen.forEach(z => {
        const b = { anordnung: z.anordnung };
        S.FELDER[z.anordnung].forEach(k => { b[k] = mmLesen(z.werte[k]); });
        if (!S.bohrungenPassen(z.mass.breite_mm, z.mass.hoehe_mm, b)) fehler.push(`${S.SCHILD(z.i + 1)}: Bohrungen passen nicht auf das Schild`);
        bohrungen[z.i] = b;
      });
      if (fehler.length) { await G.popup(fehler.join("\n")); return; }
      const x = await X.xmpLesen();
      const schilder = S.schilderSchreiben(zf, x.schild.schilder, inhalt, { bohrungen, standard: aa.bohrungen.standard, massstab: x.massstab });
      await X.xmpSchreiben(D.aendern(x, { "schild.schilder": schilder }));
      G.senden(G.EVENT_SCHILDER_FERTIG, G.ID.schilder, {});
      G.schliessen();
    } catch (e) { await G.popup(e.message); }
    finally { laeuft = false; $("ok").disabled = !bereit; }
  }
  $("ok").addEventListener("click", ok);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ok(); } });

  // ----- Start: Konfiguration, Arbeitsdatei Schild, Zeichenflächen und Inhalt -----
  (async () => {
    try {
      let konf;
      try { konf = K.allesLaden(G.EXT); }
      catch (e) { throw new Error(e instanceof K.KonfigFehler ? e.fehler.map(f => `${f.datei}\n${f.grund}`).join("\n\n") : e.message); }
      await G.kernLaden(konf.schema);
      const xmp = await X.xmpLesen();
      aa = xmp && xmp.rolle === "arbeitsdatei" ? konf.arten[xmp.auftragsart] : null;
      if (!aa || aa.export.profil !== "schild") throw new Error("Dokument ist kein Auftrag. Bitte zuerst „Auftrag anlegen“.");
      if (!S.vollstaendig(xmp.schild, aa)) throw new Error("Schild: Verfahren oder Material fehlt");
      const st = await S.stand(G.host, aa, xmp);
      zf = st.zeichenflaechen; massstab = xmp.massstab;
      inhalt = st.regeln.jeZf.map(z => z.inhalt);
      $("kopf").textContent = `${aa.verfahren[xmp.schild.verfahren].bezeichnung} · ${xmp.schild.material.bezeichnung}`;
      zeichnen(S.zuordnen(zf, xmp.schild.schilder));
      bereit = true; $("ok").disabled = false;
    } catch (e) { await G.popup(e.message); G.schliessen(); }
  })();
})();
