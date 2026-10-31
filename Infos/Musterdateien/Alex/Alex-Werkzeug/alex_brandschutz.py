#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Alex Brandschutzordnungen – Druckwerkzeug

Je PDF: letzte Seite, Rotton aus der Randkontur lesen, Seite auf 190 mm Breite
skaliert mittig auf A4 mit vollflächiger roter Fläche im gleichen Ton, drucken.

Aufruf:   alex_brandschutz.py DATEI_ODER_ORDNER ...
Optionen: --out ORDNER   PDFs dort ablegen statt drucken (zum Testen)
          --no-gui       keine Dialoge, Stückzahl 1 je Datei (nur mit --out sinnvoll)
"""
import os
import sys
import re
import math
import shutil
import tempfile
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # gebündeltes pypdf

from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import (ContentStream, ArrayObject, NameObject,
                           DecodedStreamObject)

# ---------------------------------------------------------------- Einstellungen
PRINTER = "Canon_CC"
LP_OPTIONS = [
    "PageSize=A4",
    "InputSlot=Manual",      # Mehrzweckfach
    "CNDuplex=None",         # einseitig
    "ColorModel=RGB",
    "CNColorMode=color",
    "MediaType=Auto",
    "Collate=True",
]
TARGET_WIDTH_MM = 190.0
A4_W, A4_H = 595.2756, 841.8898      # 210 x 297 mm in pt
MM = 72.0 / 25.4
MIN_COVER = 0.85                      # Randkontur muss >= 85 % der Seite umfassen


# ---------------------------------------------------------------- Farbe lesen
def _mul(a, b):
    """Matrixprodukt a x b für PDF-Matrizen [a b c d e f]."""
    return [
        a[0] * b[0] + a[1] * b[2],
        a[0] * b[1] + a[1] * b[3],
        a[2] * b[0] + a[3] * b[2],
        a[2] * b[1] + a[3] * b[3],
        a[4] * b[0] + a[5] * b[2] + b[4],
        a[4] * b[1] + a[5] * b[3] + b[5],
    ]


def _apply(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def _num(v):
    return float(v)


def find_frame_color(page, reader):
    """
    Sucht das gestrichene Rechteck, das (fast) die ganze Seite umfasst, und
    liefert ('rg'|'k', [komponenten]) seiner Strichfarbe. None, wenn keins.
    """
    mb = page.mediabox
    px0, py0 = float(mb.left), float(mb.bottom)
    pw, ph = float(mb.width), float(mb.height)

    cs = ContentStream(page.get_contents(), reader)
    ctm = [1, 0, 0, 1, 0, 0]
    stack = []
    stroke = None            # ('rg'|'k', [..])
    stroke_cs = "/DeviceRGB"
    pending = []             # Rechtecke des aktuellen Pfads (Seitenkoordinaten)
    best = None

    for operands, op in cs.operations:
        if op == b"q":
            stack.append((ctm, stroke, stroke_cs))
        elif op == b"Q":
            if stack:
                ctm, stroke, stroke_cs = stack.pop()
        elif op == b"cm":
            ctm = _mul([_num(v) for v in operands], ctm)
        elif op == b"RG":
            stroke = ("rg", [_num(v) for v in operands])
        elif op == b"K":
            stroke = ("k", [_num(v) for v in operands])
        elif op == b"G":
            stroke = None                       # Grau ist keine Randfarbe
        elif op == b"CS":
            stroke_cs = str(operands[0])
        elif op in (b"SC", b"SCN"):
            vals = [_num(v) for v in operands if not isinstance(v, NameObject)]
            if stroke_cs == "/DeviceRGB" and len(vals) == 3:
                stroke = ("rg", vals)
            elif stroke_cs == "/DeviceCMYK" and len(vals) == 4:
                stroke = ("k", vals)
            else:
                stroke = None
        elif op == b"re":
            x, y, w, h = [_num(v) for v in operands]
            pts = [_apply(ctm, x, y), _apply(ctm, x + w, y),
                   _apply(ctm, x, y + h), _apply(ctm, x + w, y + h)]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            pending.append((min(xs), min(ys), max(xs), max(ys)))
        elif op in (b"S", b"s", b"B", b"B*", b"b", b"b*"):
            if stroke is not None:
                for (x0, y0, x1, y1) in pending:
                    cw, ch = (x1 - x0) / pw, (y1 - y0) / ph
                    if cw >= MIN_COVER and ch >= MIN_COVER:
                        area = cw * ch
                        if best is None or area > best[0]:
                            best = (area, stroke)
            pending = []
        elif op in (b"n", b"f", b"f*", b"F", b"W", b"W*"):
            if op != b"W" and op != b"W*":
                pending = []
        elif op in (b"m", b"l", b"c", b"v", b"y", b"h"):
            pass                                # freie Pfade werden ignoriert

    if best is None:
        return None
    kind, vals = best[1]
    if kind == "rg" and max(vals) - min(vals) < 0.15:
        return None                             # grau/weiß/schwarz, kein Rot
    return kind, vals


# ---------------------------------------------------------------- Seite bauen
def build_page(src_path, out_path):
    reader = PdfReader(src_path)
    page = reader.pages[-1]
    color = find_frame_color(page, reader)
    if color is None:
        raise ValueError("keine rote Randkontur auf der letzten Seite gefunden")
    kind, vals = color

    mb = page.mediabox
    sx0, sy0, sw, sh = float(mb.left), float(mb.bottom), float(mb.width), float(mb.height)
    rot = int(page.get("/Rotate", 0) or 0) % 360
    if rot in (90, 270):
        sw, sh = sh, sw

    scale = TARGET_WIDTH_MM * MM / sw
    tw, th = sw * scale, sh * scale
    tx, ty = (A4_W - tw) / 2.0, (A4_H - th) / 2.0

    writer = PdfWriter()
    new = writer.add_blank_page(width=A4_W, height=A4_H)

    # Originalseite skaliert und zentriert (Vektoren/Schriften bleiben erhalten)
    t = Transformation().translate(-sx0, -sy0)
    if rot:
        t = t.rotate(-rot)
        if rot == 90:
            t = t.translate(0, sw)
        elif rot == 180:
            t = t.translate(sw, sh)
        elif rot == 270:
            t = t.translate(sh, 0)
    t = t.scale(scale, scale).translate(tx, ty)
    new.merge_transformed_page(page, t)

    # Rote Fläche vollflächig DAHINTER, gleicher Farbraum wie die Kontur
    fmt = " ".join("%.4f" % v for v in vals)
    bg = DecodedStreamObject()
    bg.set_data(("q %s %s 0 0 %.4f %.4f re f Q\n" % (fmt, kind, A4_W, A4_H)).encode("ascii"))
    bg_ref = writer._add_object(bg)
    contents = new.get("/Contents")
    if contents is None:
        arr = ArrayObject([bg_ref])
    elif isinstance(contents.get_object(), ArrayObject):
        arr = ArrayObject([bg_ref] + list(contents.get_object()))
    else:
        arr = ArrayObject([bg_ref, contents.indirect_reference if hasattr(contents, "indirect_reference") and contents.indirect_reference else writer._add_object(contents.get_object())])
    new[NameObject("/Contents")] = arr

    # Seitenrahmen sauber auf A4
    for key in ("/MediaBox", "/CropBox", "/TrimBox"):
        new[NameObject(key)] = ArrayObject([_f(0), _f(0), _f(A4_W), _f(A4_H)])
    if "/Rotate" in new:
        del new["/Rotate"]

    with open(out_path, "wb") as fh:
        writer.write(fh)
    return kind, vals


def _f(v):
    from pypdf.generic import FloatObject
    return FloatObject(v)


# ---------------------------------------------------------------- Dateien sammeln
def collect_pdfs(args):
    files = []
    for a in args:
        if os.path.isdir(a):
            for name in sorted(os.listdir(a)):
                if name.lower().endswith(".pdf") and not name.startswith("."):
                    files.append(os.path.join(a, name))
        elif a.lower().endswith(".pdf") and os.path.isfile(a):
            files.append(a)
    seen, out = set(), []
    for f in files:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out


# ---------------------------------------------------------------- Dialoge
def ask_quantities(ok_items, errors):
    """
    Fenster mit allen Dateien und Stückzahl-Feldern. Liefert dict name->n
    oder None bei Abbruch. 0/leer = nicht drucken.
    """
    import tkinter as tk
    from tkinter import ttk, messagebox, font

    BG, CARD, ZEBRA, LINE = "#f5f5f7", "#ffffff", "#f9f9fb", "#e3e3e8"
    TXT, MUTED, RED = "#1d1d1f", "#6e6e73", "#e3061a"
    WARN_BG, WARN_TX, WARN_LN = "#fff4e5", "#8a4b00", "#f3d9b1"

    root = tk.Tk()
    root.title("Alex Brandschutzordnungen")
    root.configure(bg=BG)
    root.resizable(False, False)
    root.lift()
    root.attributes("-topmost", True)
    root.after(300, lambda: root.attributes("-topmost", False))

    fam = font.nametofont("TkDefaultFont").actual("family")
    f_title = font.Font(family=fam, size=19, weight="bold")
    f_sub = font.Font(family=fam, size=12)
    f_file = font.Font(family=fam, size=13)
    f_small = font.Font(family=fam, size=11)
    f_head = font.Font(family=fam, size=10, weight="bold")
    f_sum = font.Font(family=fam, size=13, weight="bold")
    f_btn = font.Font(family=fam, size=12)
    f_btnb = font.Font(family=fam, size=12, weight="bold")

    st = ttk.Style(root)
    st.theme_use("clam")
    st.configure("TEntry", fieldbackground="#ffffff", bordercolor=LINE,
                 lightcolor=LINE, darkcolor=LINE, padding=4)
    st.configure("Primary.TButton", background=RED, foreground="white",
                 bordercolor=RED, lightcolor=RED, darkcolor=RED,
                 padding=(18, 7), font=f_btnb)
    st.map("Primary.TButton", background=[("active", "#c4000f")])
    st.configure("Flat.TButton", background=BG, foreground=TXT,
                 bordercolor=LINE, padding=(16, 7), font=f_btn)

    outer = tk.Frame(root, bg=BG, padx=28, pady=22)
    outer.grid()

    # Kopf
    head = tk.Frame(outer, bg=BG)
    head.grid(row=0, column=0, sticky="ew")
    tk.Frame(head, bg=RED, width=6, height=44).grid(row=0, column=0, rowspan=2,
                                                     padx=(0, 14), sticky="ns")
    tk.Label(head, text="Alex Brandschutzordnungen", font=f_title,
             bg=BG, fg=TXT).grid(row=0, column=1, sticky="w")
    total_files = len(ok_items) + len(errors)
    sub = "%d Datei%s übergeben · %d druckfertig" % (
        total_files, "" if total_files == 1 else "en", len(ok_items))
    if errors:
        sub += " · %d übersprungen" % len(errors)
    tk.Label(head, text=sub, font=f_sub, bg=BG, fg=MUTED).grid(row=1, column=1, sticky="w")

    # Übersprungene Dateien
    if errors:
        warn = tk.Frame(outer, bg=WARN_BG, padx=14, pady=10,
                        highlightbackground=WARN_LN, highlightthickness=1)
        warn.grid(row=1, column=0, sticky="ew", pady=(18, 0))
        tk.Label(warn, text="Übersprungen – wird nicht gedruckt",
                 font=font.Font(family=fam, size=11, weight="bold"),
                 bg=WARN_BG, fg=WARN_TX).grid(row=0, column=0, sticky="w")
        for i, (n, why) in enumerate(errors, 1):
            tk.Label(warn, text="%s  —  %s" % (n, why), font=f_small,
                     bg=WARN_BG, fg=WARN_TX).grid(row=i, column=0, sticky="w")

    # Liste
    card = tk.Frame(outer, bg=CARD, highlightbackground=LINE, highlightthickness=1)
    card.grid(row=2, column=0, sticky="ew", pady=(18, 0))
    card.columnconfigure(0, weight=1)
    hdr = tk.Frame(card, bg=CARD)
    hdr.grid(row=0, column=0, sticky="ew", padx=16, pady=(10, 6))
    hdr.columnconfigure(0, weight=1)
    tk.Label(hdr, text="DATEI", font=f_head, bg=CARD, fg=MUTED).grid(row=0, column=0, sticky="w")
    tk.Label(hdr, text="STÜCK", font=f_head, bg=CARD, fg=MUTED).grid(row=0, column=1, sticky="e")
    tk.Frame(card, bg=LINE, height=1).grid(row=1, column=0, sticky="ew")

    entries = []
    for i, name in enumerate(ok_items):
        bg = ZEBRA if i % 2 else CARD
        rowf = tk.Frame(card, bg=bg)
        rowf.grid(row=2 + i, column=0, sticky="ew")
        rowf.columnconfigure(0, weight=1)
        stem = os.path.splitext(name)[0]
        short = re.sub(r"^brandschutzordnung[\s_-]*", "", stem, flags=re.I) or stem
        tk.Label(rowf, text=short, font=f_file, bg=bg, fg=TXT,
                 anchor="w").grid(row=0, column=0, sticky="w", padx=16, pady=(8, 0))
        tk.Label(rowf, text=name, font=f_small, bg=bg, fg=MUTED,
                 anchor="w").grid(row=1, column=0, sticky="w", padx=16, pady=(0, 8))
        var = tk.StringVar()
        e = ttk.Entry(rowf, width=6, textvariable=var, justify="right", font=f_file)
        e.grid(row=0, column=1, rowspan=2, padx=16)
        entries.append((name, var, e))

    # Fuß
    foot = tk.Frame(outer, bg=BG)
    foot.grid(row=3, column=0, sticky="ew", pady=(18, 0))
    foot.columnconfigure(0, weight=1)
    sum_var = tk.StringVar(value="0 Seiten")
    tk.Label(foot, textvariable=sum_var, font=f_sum, bg=BG, fg=TXT).grid(row=0, column=0, sticky="w")
    tk.Label(foot, text="%s · A4 · Mehrzweckfach · einseitig · farbig" % PRINTER,
             font=f_small, bg=BG, fg=MUTED).grid(row=1, column=0, sticky="w")

    def recount(*_):
        n = sum(int(v.get().strip()) for _, v, _ in entries if v.get().strip().isdigit())
        sum_var.set("%d Seite%s" % (n, "" if n == 1 else "n"))

    for _, v, _ in entries:
        v.trace_add("write", recount)

    result = {"value": None}

    def submit(*_):
        qty = {}
        for name, var, e in entries:
            s = var.get().strip()
            if s == "":
                n = 0
            elif s.isdigit():
                n = int(s)
            else:
                messagebox.showerror("Ungültige Eingabe",
                                     "„%s“ bei %s ist keine Zahl." % (s, name), parent=root)
                e.focus_set()
                return
            qty[name] = n
        if sum(qty.values()) == 0:
            if not messagebox.askyesno("Nichts zu drucken",
                                       "Alle Stückzahlen sind 0. Beenden?", parent=root):
                return
            result["value"] = None
        else:
            result["value"] = qty
        root.destroy()

    def cancel(*_):
        result["value"] = None
        root.destroy()

    ttk.Button(foot, text="Abbrechen", style="Flat.TButton",
               command=cancel).grid(row=0, column=1, rowspan=2, padx=(0, 10))
    ttk.Button(foot, text="Drucken", style="Primary.TButton",
               command=submit).grid(row=0, column=2, rowspan=2)
    root.bind("<Return>", submit)
    root.bind("<Escape>", cancel)
    root.protocol("WM_DELETE_WINDOW", cancel)

    if entries:
        entries[0][2].focus_set()
    root.update_idletasks()
    x = (root.winfo_screenwidth() - root.winfo_reqwidth()) // 2
    y = (root.winfo_screenheight() - root.winfo_reqheight()) // 3
    root.geometry("+%d+%d" % (x, y))
    root.mainloop()
    return result["value"]


def show_message(title, text, error=False):
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        (messagebox.showerror if error else messagebox.showinfo)(title, text, parent=root)
        root.destroy()
    except Exception:
        print(("FEHLER: " if error else "") + text, file=sys.stderr)


# ---------------------------------------------------------------- Drucken
def print_pdf(path, copies, title):
    cmd = ["lp", "-d", PRINTER, "-n", str(copies), "-t", title]
    for o in LP_OPTIONS:
        cmd += ["-o", o]
    cmd.append(path)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip() or "lp fehlgeschlagen")


# ---------------------------------------------------------------- Hauptablauf
def main(argv):
    out_dir = None
    gui = True
    args = []
    i = 0
    while i < len(argv):
        if argv[i] == "--out" and i + 1 < len(argv):
            out_dir = argv[i + 1]
            i += 2
            continue
        if argv[i] == "--no-gui":
            gui = False
            i += 1
            continue
        args.append(argv[i])
        i += 1

    files = collect_pdfs(args)
    if not files:
        show_message("Alex Brandschutzordnungen",
                     "Keine PDF-Dateien übergeben.", error=True)
        return 1

    tmp = out_dir or tempfile.mkdtemp(prefix="alex-brandschutz-")
    os.makedirs(tmp, exist_ok=True)
    ok, errors = [], []
    try:
        for f in files:
            name = os.path.basename(f)
            out = os.path.join(tmp, os.path.splitext(name)[0] + "_druck.pdf")
            try:
                build_page(f, out)
                ok.append((name, out))
            except Exception as e:  # noqa
                errors.append((name, str(e)))

        if out_dir:
            lines = ["%d Datei(en) nach %s geschrieben." % (len(ok), out_dir)]
            if errors:
                lines.append("")
                lines.append("Übersprungen:")
                lines += ["  %s – %s" % e for e in errors]
            msg = "\n".join(lines)
            if gui:
                show_message("Alex Brandschutzordnungen", msg, error=bool(errors) and not ok)
            else:
                print(msg)
            return 0 if ok else 1

        if not ok:
            show_message("Alex Brandschutzordnungen",
                         "Keine Datei verarbeitbar:\n\n" +
                         "\n".join("%s – %s" % e for e in errors), error=True)
            return 1

        qty = ask_quantities([n for n, _ in ok], errors)
        if qty is None:
            return 0

        printed, pages, print_errors = 0, 0, []
        for name, path in ok:
            n = qty.get(name, 0)
            if n <= 0:
                continue
            try:
                print_pdf(path, n, os.path.splitext(name)[0])
                printed += 1
                pages += n
            except Exception as e:  # noqa
                print_errors.append((name, str(e)))

        lines = ["%d Datei(en), %d Seite(n) an %s gesendet." % (printed, pages, PRINTER)]
        if errors:
            lines += ["", "Nicht verarbeitet:"] + ["  %s – %s" % e for e in errors]
        if print_errors:
            lines += ["", "Druckfehler:"] + ["  %s – %s" % e for e in print_errors]
        show_message("Alex Brandschutzordnungen", "\n".join(lines),
                     error=bool(print_errors))
        return 0 if not print_errors else 1
    finally:
        if not out_dir:
            # lp hat die Datei beim Einreihen kopiert; Temp-Ordner kann weg.
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
