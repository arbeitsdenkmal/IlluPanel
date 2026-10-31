/* Aktivitätserkennung der Grafikzeit (SPEZ_02 §12): „Illustrator vorn“ und „Sekunden seit letzter Eingabe“. Genau eine Plattformweiche
 * (Ausnahme zu R 7.2) [A-8]: macOS lsappinfo / ioreg je Abfrage; Windows ein dauerhaft laufender PowerShell-Prozess je Illustrator-Sitzung, der auf
 * jede Zeile in stdin eine Zeile „<Prozessname>\t<Leerlauf ms>“ liefert (GetForegroundWindow, GetLastInputInfo) [B-17, B-18].
 * Schnittstelle vorn() -> bool, leerlaufSekunden() -> Zahl (beide async); Fehler -> nicht aktiv (false bzw. Infinity). */
"use strict";
const { execFile, spawn } = require("child_process");

const ZEITLIMIT_MS = 3000;

// ----- macOS -----
function mac() {
  const ILLUSTRATOR = "com.adobe.illustrator";
  const ausfuehren = (cmd, args) => new Promise(r => execFile(cmd, args, { timeout: ZEITLIMIT_MS }, (e, out) => r(e ? "" : String(out))));
  return {
    async vorn() {
      const asn = (await ausfuehren("lsappinfo", ["front"])).trim();
      if (!asn) return false;
      return (await ausfuehren("lsappinfo", ["info", "-only", "bundleid", asn])).includes(`"${ILLUSTRATOR}"`);
    },
    async leerlaufSekunden() {
      const m = /"HIDIdleTime"\s*=\s*(\d+)/.exec(await ausfuehren("ioreg", ["-c", "IOHIDSystem", "-d", "4", "-r", "-k", "HIDIdleTime"]));
      return m ? Number(m[1]) / 1e9 : Infinity;
    },
    beenden() { }
  };
}

// ----- Windows: ein PowerShell-Prozess, Anfrage = eine Zeile in stdin, Antwort = eine Zeile in stdout -----
const PS_SKRIPT = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PamAktivitaet {
  [StructLayout(LayoutKind.Sequential)] struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO lii);
  public static string Abfrage() {
    string name = "";
    try {
      uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid);
      if (pid != 0) name = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
    } catch (Exception) { }
    string leer = "";
    LASTINPUTINFO lii = new LASTINPUTINFO(); lii.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
    if (GetLastInputInfo(ref lii)) leer = unchecked((uint)Environment.TickCount - lii.dwTime).ToString();
    return name + "\\t" + leer;
  }
}
'@
while ($null -ne ($zeile = [Console]::In.ReadLine())) { [Console]::Out.WriteLine([PamAktivitaet]::Abfrage()); [Console]::Out.Flush() }
`;
function windows() {
  let ps = null, rest = "";
  const warten = []; // offene Anfragen in Reihenfolge: { fertig }
  function starten() {
    const encoded = Buffer.from(PS_SKRIPT, "utf16le").toString("base64");
    const p = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", d => {
      rest += d;
      let i;
      while ((i = rest.indexOf("\n")) >= 0) {
        const zeile = rest.slice(0, i).replace(/\r$/, ""); rest = rest.slice(i + 1);
        const w = warten.shift(); if (w) w.fertig(zeile);
      }
    });
    const ende = () => { if (ps === p) { ps = null; rest = ""; } while (warten.length) warten.shift().fertig(null); };
    p.on("exit", ende); p.on("error", ende);
    p.stdin.on("error", () => { });
    return p;
  }
  // eine Abfrage für beide Werte; vorn() und leerlaufSekunden() im selben Takt teilen sich die laufende Anfrage
  let laufend = null;
  function abfrage() {
    if (laufend) return laufend;
    laufend = new Promise(resolve => {
      const fertig = zeile => {
        clearTimeout(uhr); laufend = null;
        const [name, leer] = zeile === null ? [] : zeile.split("\t");
        resolve({ vorn: name === "Illustrator", leerlauf: leer !== undefined && /^\d+$/.test(leer) ? Number(leer) / 1000 : Infinity });
      };
      const w = { fertig };
      // Zeitlimit: die späte Antwort wird verworfen, die Reihenfolge der Antworten bleibt
      const uhr = setTimeout(() => { w.fertig = () => { }; fertig(null); }, ZEITLIMIT_MS);
      try {
        if (!ps) ps = starten();
        warten.push(w);
        ps.stdin.write("?\n");
      } catch (e) { const i = warten.indexOf(w); if (i >= 0) warten.splice(i, 1); fertig(null); }
    });
    return laufend;
  }
  return {
    async vorn() { return (await abfrage()).vorn; },
    async leerlaufSekunden() { return (await abfrage()).leerlauf; },
    beenden() { if (ps) { try { ps.stdin.end(); ps.kill(); } catch (e) { } ps = null; } }
  };
}

module.exports = process.platform === "win32" ? windows() : mac();
