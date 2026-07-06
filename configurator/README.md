# ChiLab Partition System Configurator

Parametric steel + glass partition configurator built from the Litowitz Family Offices
shop set (102219.004) and its STP part files. Weldwork-style options UI, live 3D viewer,
cold-connection rule engine, and full fabrication outputs.

## Run

```bash
cd configurator
python3 -m http.server 8741
# open http://localhost:8741
```

No build step. Three.js is vendored in `vendor/` (import map maps `three`).

## What it does

- **Layout tab** — clear opening (ft/in inputs + sliders), ½" plate portal surround,
  vertical bay count / custom widths, horizontal row count / custom heights, metal or
  glass top row. Auto layout rounds to 1/16" shop increments. Every glass bay gets a
  1" base sill channel at the floor (slab-anchored) so the grid reads complete at the ground.
- **Head rule** — the 2×5 header generates only for pivot doors with internal closers
  running to the top; otherwise head lites continue the grid to a 1×2.5 top channel.
- **Doors tab** — none / single / pair, leaf size, glass-grid or solid style,
  butt (IVES) / continuous / pivot hinges, hinge/meeting/head/floor gaps (source defaults
  ⅜" / ¼" / ⅛" / ¾"), pulls, OH closers, mag lock.
- **Finishes tab** — steel finish swatches (source spec: oil-rubbed bronze), ¼" glass type.
- **Quote + Files tab** — budget estimate breakdown, stock linear-ft totals with 10% waste
  and 24' stick counts, unique-part list, and exports.
- **Isolated part view** — a scrollable parts list (step through every unique part) plus
  a **Shop drawing** toggle: an orthographic multi-view (elevation, plan, to-scale end
  section, iso, title block) with full dimensions and hole/slot distances from the outer
  edges, exportable as SVG.
- **Viewer** — light mode by default (dark toggle), orbit, assembled/exploded modes,
  hide-glass, animated door-swing simulation, click any part for its hole schedule and
  per-part GLB download.
- **System check** — live conflict flags: bay/row min-max, glass area (tempered limits),
  door leaf egress width, hinge loading, header splices, unfillable door bays, portal
  depth vs survey.

## Outputs

| Output | Contents |
|---|---|
| `partition-assembly.glb` | full assembly, real-world meters, named nodes |
| `partition-parts-library.glb` | one of each unique part laid out in a row, qty in node name |
| `P#… .glb` (per part) | single unique part at origin |
| `partition-bom.csv` | per-part cut list with hole/slot coordinates + stock totals |
| Cut sheet (print) | steel cut list, hole schedule (face/x/y/Ø/op), glass schedule, stock order |
| Quote package (print) | configuration summary, flags, estimate, cut sheet |

All GLB parts carry **real hole and slot geometry** (tubes are modeled as four wall
plates so every drilled wall is a true cutout; plates are extruded profiles with holes).
Repeated parts are deduped by a signature of profile + length + hole pattern; any part
with unique features gets its own ID and export.

## Files

- `engine.js` — pure parametric engine: config → parts, poses, conflicts, BOM, estimate.
  `STOCK` / `PLATE` / `RATES` tables at the top are the tuning knobs.
- `geometry.js` — Three.js solid builders (tube-with-holes, plates, mitered mullion
  angles, door leaves).
- `app.js` — UI, viewer, exports.
- `SYSTEM.md` — the measured system specification and assembly logic derivation.

## Basis of design

Measured from the STP files: header 2×5 tube, verticals HSS 1×3 × 99¼", horizontals
1×2.5 × 26.447", mullion angles ¾×¾×⅛ mitered, shear blocks 5×2×¼ (8-32 taps at
½"/1½" from ends), T/F clip bases + 3/16" tabs, 8-32×⅜" SS fasteners, ½" plate portal.
See `SYSTEM.md` for the full connection logic and the conflicts found in the source set.
