# Briefing for Brian: Supabase / app extensions for the Illustrator panel "PAM-Werkzeuge"

Date: 30 Oct 2026 · Version 1 · from Markus

This briefing replaces the earlier document ANFORDERUNGEN_App_Panel.md, which is cancelled. Please disregard it entirely.

## 0. Ground rules

- The new Illustrator panel "PAM-Werkzeuge" (repo `arbeitsdenkmal/IlluPanel`) runs on two Macs and one Windows PC. It talks to Supabase directly via supabase-js, the same way the app does. There is no "parking lot" and no push to Illustrator: the panel reads order and product data straight from Supabase.
- **Your data model decides all table, column and function names.** This briefing describes *what* the panel needs to read and write. Wherever a storage location is needed, it is listed as a question to you (Q1 … Q17, collected in section 6).
- **Supabase never stores files.** The panel only reports file locations on the shop server.
- **All prices are decided in the app.** The panel delivers calculated prices. The app adds extra costs (travel, removal, lifting platform, …), and the app user makes the final price decision.
- You don't need to build any of the following: the mapping from department/type to the panel's job type (it lives in the panel), a bill of materials, file storage, or any sign calculation inside the panel.

## 1. What the panel reads from Supabase

### 1.1 Price data: the complete price list, versioned

The panel needs the **complete current price list** in Supabase, maintained in the app. There will be no more price-list file per computer. Every entry has a **valid-from** date. The panel calculates with the currently valid version and records which version it used (see 2.3).

Contents (current values are in appendix A, the current file `preisliste.csv`):

| Group | Contents |
|---|---|
| Hourly rates | `stundensatz.vk` 155 €/h (list price), `stundensatz.produktion` 84 €/h (minimum price; also used by the sign calculation), `stundensatz.grafik` 96 €/h (documentation only, never part of a price) |
| Minimum amounts | product 35 €, mounting 30 €; signs 30 € per order |
| Rounding | vehicle/lettering: net prices rounded **up** to multiples of 5 €; signs: up to 0.50 € |
| VAT | 19 % (gross is rounded to the cent, not to 5 €) |
| Film series | per series: purchase price (EK) per m², sales price (VK) per m², for print films also tape VK per m²; process `plott` or `druck`. One price per series, no entries per colour |
| Time keys | minutes per step (setup, cut file, RIP file, tape, production, weeding per part / per metre, separating, mounting per piece / m² / part, cleaning, mounting per order), each per process |
| Surcharges | Sicke (corrugation) 50 % on mounting time; Wölbung (curvature) 36 min per m². An entry has *either* a percentage *or* minutes, never both |
| Complexity levels | 0 / 25 / 50 / 100 % on production time |
| Tape thresholds | tape suggestion from 40 m cut length per m² or 50 parts per m² |
| Sign data | plates (EK per m², waste %), sign parameters, sign time keys (see section 4) |

Structure today: a flat list with the columns `typ;schluessel;gilt_fuer;bezeichnung;verfahren;ek_m2;vk_m2;tape_vk_m2;minuten;prozent;wert`. Lookup order: the specific job type before `alle` (all), and the specific process before `alle`. Your schema may look different. The panel just needs the same content and the same lookup logic. `bezeichnung` (label) is shown in the panel's price-list view.

Live update: the panel subscribes to the price data via **Realtime**. After each successful fetch it keeps a local fallback copy, so it can still calculate when offline.

**Option (not a requirement):** both sides are JavaScript, so a shared calculation module used by both the panel and the app would be technically possible. Fixed for now is only the shared, versioned price data. Your view on a shared module → Q3.

### 1.2 Order and product data

- **List of open products** with order ID, product ID, customer name (searchable) and department/type. The panel uses this when creating a new working file. Which products count as "open" → Q4.
- **department/type** of each product. The panel derives its job type from these values (vehicle lettering, lettering, sign, banner/roll-up, laser engraving, textile, offset data, other).
- **Banner / roll-up:** product dimensions. Roll-ups come in two fixed sizes that are stored in the app (or still need to be).
- **COPYSHOP products:** the product type (flyer, brochure, business cards, …). The panel picks the matching offset template with it.
- **Customer approval state** of a product (needed for the status logic in section 3).

### 1.3 Textile

Per textile product: brand, model, textile colour (colour name **and** CMYK values), quantities and size run. Where colours and models are maintained is your decision → Q5.

## 2. What the panel writes per product

The panel may run offline. In that case writes go into a local queue and are sent later. **Writes can therefore arrive with a delay.**

### 2.1 Prices

For vehicle lettering (VEHICLE_LETTERING) and lettering (STICKER, FOIL_PLOTTER) the panel writes **both price levels**. Each level comes in two variants, net and gross:

| | "sticker only" | "incl. mounting" |
|---|---|---|
| List price (VK) | net, gross | net, gross |
| Minimum price (Mindest-VK) | net, gross | net, gross |

- VK uses 155 €/h. Mindest-VK runs the same calculation with 84 €/h; it is the room employees have for price decisions. Each net price is rounded up to 5 € on its own. Gross is net × 1.19, rounded to the cent.
- The panel never sets a final price. The final decision happens in the app.
- **Announcement:** textile Flex/Flock will also be calculated by effort in the panel later and reported in **the same price fields**. The calculation logic is still being worked out.

### 2.2 Flag "recalculated price"

If the panel recalculates a product that already has prices, it writes the new prices so that the app can recognise them as recalculated. **The app shows a notification and a preview, and the app user decides** whether the existing price is overwritten. How to model this (separate "proposed" fields, a history table, a flag, …) → Q6.

### 2.3 Calculation record (JSONB column on the product)

A structured record per product: films, areas, minutes per step, material consumption, the hourly rates used, and the price-list version used. It serves **documentation and calibration** (prices are recalibrated every six months using 10–20 documented jobs). It is **not** the app's basis for any calculation. The size is a few KB per product. Column → Q7. Keep only the latest record or a history → Q8.

### 2.4 Material consumption (separate field on the product, *not only* inside the JSONB)

Per film:

- Film identifier: for plotter films series plus colour number (e.g. `751C-031`), for print films medium plus laminate
- Consumption in m² = running metres × roll width actually used
- Running metres and roll width

Purpose: stock and ordering. The app has no planned use for it yet, but it should be readable without parsing the JSONB. Structure → Q9.

### 2.5 Graphic minutes

- Graphic minutes **belong to the logged-in employee** (the Supabase auth user), per product. They are automatic minutes plus minutes entered manually.
- They are documentation only and never part of a price. The employee decides in the app per order whether and how working time is billed.
- If a file is not yet assigned to a product, the panel stores the minutes inside the .ai file. Once the file is assigned, the panel transfers the accumulated minutes in one go, so they can arrive in a batch, possibly days later.
- The app already has time tracking. Should graphic minutes go into it → Q10. Single entries or a running total → Q11.

### 2.6 File location

- For every export: **folder path plus file names**. The app links files to products, and it can only do that with the names.
- Exports: production data, proof (Korrekturabzug), and exports from the imposition / grid / MB-number functions (each assigned to a product).
- The location is written **only after the file has been successfully moved to the server** (existence and size checked). The panel always writes locally first and then moves the file. If the move fails, the file stays parked locally and nothing is written.
- Laptop without server connection: the files stay parked locally. The employee moves them manually and links the location in the app himself. The app needs a way to enter a file location manually → Q12.
- The panel runs on macOS and Windows, so the same server folder has a different path on each platform. How the path should be stored → Q13.

## 3. Status flow

- **Exporting production data sets the product to `production`**, unless customer approval is still pending. Production data may be created before approval, but the product only goes into production after approval. That approval logic belongs to the app. How the panel should trigger the status → Q14.
- **Exporting a proof (Korrekturabzug) automatically starts the customer approval in the app.** This is the same approval workflow as MKS-116: awaiting approval, product locked, changes only via a new round. How the panel triggers it → Q15. How the approval gets the PDF when the file is on the shop server and Supabase stores no files → Q16.

## 4. Sign calculation for the app

The panel does **not** calculate sign prices. It only creates the production files. Sign prices are calculated in the app. All values below are provisional. They are in the price list (appendix A) and will be calibrated with real jobs.

### 4.1 Scope

- Materials: Dibond 3 (`Dib-3`), PVC 3/5/10 (`PVC-3`, `PVC-5`, `PVC-10`), acrylic 3/5/8/10 (`PMMA-3` … `PMMA-10`).
- One net price per order. No mounting (signs are normally production only).
- Not included: fixing material, graphics (documented only), travel.

### 4.2 Principles

1. No flat fees. Setup and file handling are included as time.
2. Times are **total times from real jobs** (without unattended machine time), not sums of single steps.
3. Material is always charged for the **final size**, with waste priced in. Every sign is cut from a full plate.
4. One markup on cost price, plus a UV print sales price per m².

### 4.3 Process per sign

- **UV direct print** up to A2 (+20 %, see 4.5). PVC and Dibond without white, acrylic with white.
- **Digital print, laminated and mounted** above A2 + 20 %: 3551 with laminate, mounted onto the plate. Acrylic: 3551 transparent plus full-surface 751C white, mounted **once only**.
- **Acrylic cutting:** if both edges are within 300 × 600 mm, it is laser-cut (unattended, no edge rework). Larger pieces are sawn, and the edges need rework.

### 4.4 Formulas

All amounts are net. `S` = `stundensatz.produktion` / 60 (84 €/h → 1.40 €/min). `n` = number of signs, `A` = price area per sign in m² (4.5), `U` = perimeter per sign in m (real size).

**Time [min]**

```
UV:              T = 7 (per order) + 1 × n
                   + 10 (once per order, if at least one acrylic sign is laser-cut)
                   + Σ sawn acrylic signs: 5 × U
                   + Σ drill holes × 2

Digital print,   T = 18 (per order) + Σ signs: 12 × A
laminated:         + Σ acrylic signs: 5 × U
                   + Σ drill holes × 2
```

**Material at purchase price [€]**

```
plate     = n × A × ek_m2(plate) × (1 + waste% / 100)        waste: PVC/Dibond 15 %, acrylic 30 %
ink_uv    = n × A × (2.59 without white | 6.91 with white)   UV only
film_dd   = n × A × 8.25 × 1.3                               digital print only (3551 incl. laminate and ink)
          + acrylic: n × A × 7.61 × 1.3                      (751C white)
```

**Price [€]**

```
cost      = T × S + plate + ink_uv + film_dd
price     = cost × 1.2 + UV area × uv_vk_m2                  uv_vk_m2 = 85 €/m² without white, 140 €/m² with white
if price < 30:  price = 30                                   minimum per order
price     = round up to 0.50 €
```

**Mixed orders:** if an order contains both UV and digital-print signs, both fixed parts (7 and 18 min) are charged once each.

### 4.5 Price area (DIN rule)

- Up to 20 % above a DIN format (A5, A4, A3, A2), the area of that format is used; above that, the next larger format. The comparison is by area.
- Smaller than A5 → A5 area.
- Above A2 + 20 % → actual area (artboard in real size), digital print laminated.

### 4.6 Worked example: 1 × PMMA 5 (acrylic 5 mm), A2, UV with white

| Step | Calculation | € |
|---|---|---|
| Price area | A2 = 0.420 × 0.594 = 0.2495 m² | |
| Cutting | 420 mm > 300 mm → saw + edge rework; U = 2 × (0.420 + 0.594) = 2.028 m | |
| Time | 7 + 1 × 1 + 5 × 2.028 = 18.14 min | |
| Labour | 18.14 × 1.40 | 25.40 |
| Plate | 0.2495 × 64.75 × 1.30 | 21.00 |
| UV ink (white) | 0.2495 × 6.91 | 1.72 |
| **Cost price** | | **48.12** |
| × 1.2 | | 57.74 |
| UV sales price (white) | 0.2495 × 140 | 34.93 |
| Price | 57.74 + 34.93 | 92.67 |
| Minimum 30 € | not reached | |
| **Rounded up to 0.50** | | **93.00 net** (110.67 gross) |

Check values for your implementation (net per order):

| Order | Price |
|---|---|
| 1 × PVC 3 A4, UV | 30.00 (minimum) |
| 1 × PVC 3 A2, UV | 40.00 |
| 5 × Dib 3 A5, UV | 40.00 |
| 5 × PVC 3 A4, UV | 53.00 |
| 1 × PMMA 5 A2, UV with white | 93.00 |
| 1 × Dib 3, 1 m², digital print laminated | 102.00 |
| 1 × Dib 3, 750 × 3000 mm, digital print laminated (banner board) | 191.00 |

### 4.7 Sign matrix

**UV direct print, A5–A2.** Each value is the **net price for the whole order** of 1 / 2 / 3 / 5 / 10 signs of the same size and material, without drill holes. Acrylic A5–A3 is laser-cut, acrylic A2 is sawn.

| Material | A5 (1/2/3/5/10) | A4 (1/2/3/5/10) | A3 (1/2/3/5/10) | A2 (1/2/3/5/10) |
|---|---|---|---|---|
| Dib-3 | 30.00 / 30.00 / 30.00 / 40.00 / 68.00 | 30.00 / 31.00 / 40.50 / 60.00 / 107.50 | 30.00 / 47.00 / 64.50 / 99.50 / 186.50 | 45.00 / 78.50 / 111.50 / 178.00 / 344.50 |
| PVC-3 | 30.00 / 30.00 / 30.00 / 37.00 / 61.50 | 30.00 / 30.00 / 36.50 / 53.00 / 94.50 | 30.00 / 41.50 / 56.50 / 86.00 / 160.00 | 40.00 / 68.00 / 96.00 / 151.50 / 291.00 |
| PVC-5 | 30.00 / 30.00 / 30.00 / 38.50 / 64.50 | 30.00 / 30.00 / 38.50 / 56.50 / 101.00 | 30.00 / 44.00 / 60.50 / 92.50 / 173.00 | 42.50 / 73.00 / 103.50 / 164.50 / 317.00 |
| PVC-10 | 30.00 / 30.00 / 30.00 / 42.00 / 72.00 | 30.00 / 33.00 / 43.00 / 64.00 / 116.00 | 31.00 / 50.00 / 69.50 / 107.50 / 203.00 | 48.50 / 85.00 / 121.50 / 194.50 / 377.50 |
| PMMA-3 | 37.00 / 45.00 / 53.50 / 69.50 / 110.50 | 43.50 / 58.00 / 73.00 / 102.50 / 176.00 | 56.50 / 84.50 / 112.00 / 167.50 / 306.00 | 83.00 / 153.50 / 224.50 / 366.00 / 720.50 |
| PMMA-5 | 38.00 / 47.50 / 57.00 / 76.00 / 123.00 | 46.00 / 63.50 / 80.50 / 115.00 / 201.00 | 61.50 / 94.50 / 127.00 / 192.50 / 356.50 | 93.00 / 174.00 / 254.50 / 416.50 / 821.00 |
| PMMA-8 | 40.00 / 51.50 / 62.50 / 85.50 / 142.00 | 50.00 / 71.00 / 92.00 / 134.00 / 239.00 | 69.00 / 109.50 / 150.00 / 230.50 / 432.00 | 108.00 / 204.00 / 300.00 / 492.00 / 972.50 |
| PMMA-10 | 41.50 / 54.00 / 66.50 / 91.50 / 154.50 | 52.50 / 76.00 / 99.50 / 146.50 / 264.00 | 74.00 / 119.50 / 165.00 / 255.50 / 482.50 | 118.00 / 224.00 / 330.50 / 542.50 / 1073.00 |

**Digital print laminated, above A2.** Each value is the net price for 1 sign, with the price per m² in brackets. For acrylic, the edge length is based on 1000 × 1000 mm (1 m²) and 1000 × 2000 mm (2 m²). 4 m² of acrylic exceeds the acrylic sheet (1000 × 2050 mm).

| Material | 1 m² | 2 m² | 4 m² |
|---|---|---|---|
| Dib-3 | 102.00 (102.00/m²) | 173.50 (86.75/m²) | 316.00 (79.00/m²) |
| PVC-3 | 80.50 (80.50/m²) | 130.50 (65.25/m²) | 231.00 (57.75/m²) |
| PVC-5 | 91.00 (91.00/m²) | 151.00 (75.50/m²) | 272.00 (68.00/m²) |
| PVC-10 | 115.00 (115.00/m²) | 199.50 (99.75/m²) | 369.00 (92.25/m²) |
| PMMA-3 | 169.50 (169.50/m²) | 292.00 (146.00/m²) | n/a |
| PMMA-5 | 210.00 (210.00/m²) | 372.50 (186.25/m²) | n/a |
| PMMA-8 | 270.50 (270.50/m²) | 494.00 (247.00/m²) | n/a |
| PMMA-10 | 311.00 (311.00/m²) | 575.00 (287.50/m²) | n/a |

### 4.8 Still open (coming later)

1. **Several laminated signs in one order:** the time per additional piece has not been measured. For now it is 12 min/m² per piece.
2. **Drill holes:** included in the formula at 2 min per hole. The app needs an input per sign; Markus will define the label.
3. **Double-sided UV** (front and back on one sign): not yet calculated. The price list already contains `schild.faktor_beidseitig` 1.5, but how it is used is not defined.
4. **Plotted film on a sign** (e.g. plotted lettering on acrylic): not yet calculated.
5. **UV ink costs** (2.59 / 6.91 €/m²) are estimates and have not yet been checked against machine data.

## 5. Authentication and access

- The panel uses **supabase-js** with the **public anon key**, the same key the app uses. There is no service key in the panel.
- Login uses the **existing employee app accounts** (Supabase Auth, email/password). The session is stored on the computer. Whoever is logged in owns the graphic minutes.
- **All rights go through RLS.** The panel needs, for authenticated employees:
  - read access: price data (all versions), open orders and products incl. customer name and department/type, approval state, textile data
  - write access on products: prices, the recalculated-price flag, the calculation record (JSONB), material consumption, file locations, the status change to `production`, and the start of customer approval
  - insert access for graphic minutes, **only for the user's own account** (auth user = logged-in employee)
  - no write access to the price data (it is maintained in the app)
- **Realtime** must be enabled for the price data, and RLS applies there as well.
- **Tests:** panel tests run only against a **local Supabase instance** (using the configuration in your app repo), never against production.
- Which policies already exist and what you need to add → Q17.

## 6. Questions for you

1. Where and in what structure do you store the price list (appendix A) in your data model?
2. How do you implement versioning (valid-from) for the price data, and how does the panel find the currently valid version?
3. Would a shared JS calculation module for the panel and the app make sense to you, or should each side keep its own calculation on the shared price data?
4. Which product statuses count as "open" for the panel's product list?
5. Where are textile models and colours (name + CMYK) maintained, and where are quantities and size runs per product stored?
6. How do you want to model "recalculated price" (separate proposed fields, history, flag, …)?
7. Which column on the product holds the calculation record (JSONB)?
8. Should only the latest calculation record be kept per product, or a history?
9. In what structure should material consumption per film be stored (own table or own field on the product)?
10. Should graphic minutes go into the app's existing time tracking?
11. Should graphic minutes be stored as single entries or as a running total per employee and product?
12. Can an app user already enter or link a file location to a product manually (needed for laptop exports that were parked locally)?
13. How should file paths be stored so that they work from macOS and Windows (relative to the server share, or absolute per platform)?
14. How should the panel trigger the status change to `production`: write it directly and let the app block it while approval is pending, or report "production data exported" and let the app set the status?
15. How should the panel start the customer approval after a proof export (status write, RPC, edge function, …)?
16. How does the approval workflow get the proof PDF when the file is on the shop server and Supabase stores no files?
17. Which RLS policies already cover the access listed in section 5, and which do you need to add?

## Appendix A: current price list (`preisliste.csv`)

Values are provisional and will be calibrated with real jobs. Note: `preise_freigegeben` currently has no function. `schild.faktor_beidseitig` belongs to the still-open double-sided UV case (4.8).

```csv
typ;schluessel;gilt_fuer;bezeichnung;verfahren;ek_m2;vk_m2;tape_vk_m2;minuten;prozent;wert
parameter;stundensatz.vk;alle;Stundensatz VK Produktion und Montage;;;;;;;155
parameter;stundensatz.produktion;alle;Stundensatz Produktion und Montage (Mindest-VK);;;;;;;84
parameter;stundensatz.grafik;alle;Stundensatz Grafik;;;;;;;96
parameter;mindest.produkt;alle;Mindestbetrag Produkt (ohne Montage, ohne Grafik);;;;;;;35
parameter;mindest.montage;alle;Mindestbetrag Montage;;;;;;;30
parameter;rundung;alle;Rundung (immer aufrunden);;;;;;;5
parameter;preise_freigegeben;alle;Preise freigegeben;;;;;;;0
parameter;mwst;alle;Mehrwertsteuer (%);;;;;;;19
parameter;tape.min_schnittdichte;alle;Tape-Vorschlag ab Schnittdichte Cutkontur (m/m²);;;;;;;40
parameter;tape.min_teiledichte;alle;Tape-Vorschlag ab Teiledichte Cutkontur (Teile/m²);;;;;;;50
serie;651;alle;651;plott;6,08;11,55;;;;
serie;751C;alle;751C;plott;7,61;14,46;;;;
serie;951;alle;951;plott;16,55;31,45;;;;
serie;970;alle;970;plott;22,33;42,43;;;;
serie;3162;alle;3162;druck;5,66;10,75;3,79;;;
serie;3551;alle;3551;druck;8,25;15,68;3,79;;;
serie;3951;alle;3951;druck;21,03;39,96;6,25;;;
serie;3676;alle;3676;druck;18,46;35,07;3,79;;;
serie;UltraTack;alle;UltraTack;druck;11,01;20,92;3,79;;;
serie;MonsterTack;alle;MonsterTack;druck;16,65;31,64;3,79;;;
zeit;ruesten;alle;Rüsten je Folie;plott;;;;3,00;;
zeit;ruesten;alle;Rüsten je Folie;druck;;;;2,00;;
zeit;datei_cut;alle;Datei Cut je Folie;plott;;;;3,00;;
zeit;datei_cut;alle;Datei Cut je Folie;druck;;;;3,00;;
zeit;datei_rip;alle;Datei RIP je Auftrag;druck;;;;5,00;;
zeit;tape_m2;alle;Application Tape je m² (mind. 1 m² je Folie);plott;;;;2,00;;
zeit;tape_m2;alle;Application Tape je m² (mind. 1 m² je Folie);druck;;;;2,00;;
zeit;produktion_m2;alle;Produktion je m² Stückfläche;plott;;;;0,00;;
zeit;produktion_m2;alle;Produktion je m² Stückfläche;druck;;;;6,00;;
zeit;teil;alle;Entgittern je Einzelteil;plott;;;;0,03;;
zeit;teil;alle;Entgittern je Einzelteil;druck;;;;0,10;;
zeit;schnitt_m;alle;Entgittern je Meter Schnitt;plott;;;;0,12;;
zeit;schnitt_m;alle;Entgittern je Meter Schnitt;druck;;;;0,00;;
zeit;trennen;alle;Trennen je Stück;plott;;;;0,17;;
zeit;trennen;alle;Trennen je Stück;druck;;;;0,50;;
zeit;auftrag_montage;alle;Montage je Auftrag;alle;;;;2,00;;
zeit;stueck;alle;Montage je Stück (Einmessen, Ansetzen);plott;;;;5,00;;
zeit;stueck;alle;Montage je Stück (Einmessen, Ansetzen);druck;;;;5,00;;
zeit;montage_m2;alle;Verkleben je m² Stückfläche;plott;;;;0,80;;
zeit;montage_m2;alle;Verkleben je m² Stückfläche;druck;;;;0,80;;
zeit;reinigen_m2;alle;Reinigen je m² Stückfläche (mind. 1 m² je Auftrag);plott;;;;1,65;;
zeit;reinigen_m2;alle;Reinigen je m² Stückfläche (mind. 1 m² je Auftrag);druck;;;;1,65;;
zeit;reinigen_m2;alle;Reinigen je m² Stückfläche (mind. 1 m² je Auftrag);alle;;;;1,65;;
zeit;montage_teil;alle;Verkleben je Einzelteil;plott;;;;0,08;;
zeit;montage_teil;alle;Verkleben je Einzelteil;druck;;;;0,08;;
aufschlag;sicke;alle;Sicke (auf Montage des Stücks);;;;;;50;
aufschlag;woelbung;alle;Wölbung (Montage je m² Stückfläche);;;;;36,00;;
komplexitaet;stufe0;alle;normal;;;;;;0;
komplexitaet;stufe1;alle;erschwert;;;;;;25;
komplexitaet;stufe2;alle;stark erschwert;;;;;;50;
komplexitaet;stufe3;alle;extrem;;;;;;100;
platte;Dib-3;schild;Dib 3;;27,79;;;;15;
platte;PVC-3;schild;PVC 3;;12,37;;;;15;
platte;PVC-5;schild;PVC 5;;19,81;;;;15;
platte;PVC-10;schild;PVC 10;;37,37;;;;15;
platte;PMMA-3;schild;PMMA 3;;38,86;;;;30;
platte;PMMA-5;schild;PMMA 5;;64,75;;;;30;
platte;PMMA-8;schild;PMMA 8;;103,61;;;;30;
platte;PMMA-10;schild;PMMA 10;;129,51;;;;30;
parameter;schild.aufschlag;schild;Aufschlag auf Selbstkosten Schild;;;;;;;1,2
parameter;schild.mindest;schild;Mindestbetrag Schild je Auftrag;;;;;;;30
parameter;schild.rundung;schild;Rundung Schild (immer aufrunden);;;;;;;0,5
parameter;schild.uv_vk_m2;schild;UV-Druck VK je m² ohne Weiß;;;;;;;85
parameter;schild.uv_vk_m2_weiss;schild;UV-Druck VK je m² mit Weiß;;;;;;;140
parameter;schild.tinte_uv_m2;schild;Tinte UJF je m² ohne Weiß (EK);;;;;;;2,59
parameter;schild.tinte_uv_m2_weiss;schild;Tinte UJF je m² mit Weiß (EK);;;;;;;6,91
parameter;schild.folie_verschnitt;schild;Folienverschnitt kaschierte Schilder;;;;;;;1,3
parameter;schild.faktor_beidseitig;schild;Faktor UV beidseitig;;;;;;;1,5
zeit;auftrag;schild;Schild UV je Auftrag;uv;;;;7;;
zeit;stueck;schild;Schild UV je Stück;uv;;;;1;;
zeit;auftrag;schild;Schild Digitaldruck kaschiert je Auftrag;druck;;;;18;;
zeit;m2;schild;Schild Digitaldruck kaschiert je m²;druck;;;;12;;
zeit;laser_auftrag;schild;Acryl Laser Rüsten + Datei je Auftrag;alle;;;;10;;
zeit;kante_m;schild;Acryl Kantennacharbeit je Laufmeter (Säge);alle;;;;5;;
zeit;bohrung;schild;Bohrung je Loch;alle;;;;2;;
```
