# ChiLab Partition System — Parametric Specification

Derived from shop drawings 102219.004.01/.02 (Litowitz Family Offices, sheets CHL01–CHL10)
and the STP part files in `ELEVATOR ENTRY SHOP AND STP FILES/`. All dimensions in inches.

## 1. Stock material library (measured from STP solids)

| # | Profile / plate | Section | Notes |
|---|-----------------|---------|-------|
| S1 | Header tube | 2" × 5", ¼" corner radius, ⅛" wall | Type A ends 83.09" ×2, Type B center jamb 73.57" ×1 |
| S2 | Vertical support | HSS 1" × 3", ⅛" corner radius, 14-ga (0.083") wall | 99.25" long ×8 (A and B differ by hole pattern only) |
| S3 | Horizontal support | tube 1" × 2.5", 14-ga (0.083") wall | 26.447" ×24 (= clear span between verticals) |
| S4 | Mullion angle | ¾" × ¾" × ⅛" steel angle, 45° mitered ends | H 26.447" ×72, V 31.75" ×72 |
| S5 | Glass | ¼" plate (GL-01 boardroom / GL-02 lobby) | sized per pane − glazing clearance |
| S6 | Shear block A | 5" × 2" × ¼" flat bar | 4× 8-32 taps (Ø0.137 tap drill) @ ½" & 1½" from each end, ½" from long edge; ⅛" corner fillets |
| S6p | Passthrough shear block | same as S6 + 13/16" × 1¼" central rectangular slot | receives F&P clip tabs at base/head |
| S7 | Shear block B (terminal) | 2" × 2" × ¼" | 2× 8-32 taps @ ½" & 1½", ½" from edge |
| S8 | T clip base | 6.5" × 2" × 3/16" | 2× Ø5/16" anchor holes @ 5" o.c.; twin 3/16" × 3.25" tab bars 0.83" apart |
| S9 | F clip base | 3.67" × 2" × 3/16" | 2× Ø5/16" holes @ 1" o.c. offset (wall/end condition) |
| S10 | F&T clip tab | 3/16" × 1¼" bar, 3.25" tall, in pairs 13/16" outer spread | ×32, pass through S6p slot into the vertical cavity (14-ga wall → 0.834" clear = slip fit) |
| S11 | Portal surround | ½" steel plate, bronze finish | ¼" reveal beyond brick both sides; depth per survey (13¼" here) |
| F1 | Fastener | 8-32 × ⅜" stainless FH | all shear-block connections |
| F2 | Anchor | Ø¼" (5/16" clearance) | clip bases to floor / header |

## 2. Grid / assembly logic

Elevation = rectangular clear opening (W × H) inside an optional portal (S11).
Verticals bear directly on the 3/16" clip base plate at the slab — no visible gap at
the ground. (Source verticals measured 99.25" in the 102" lobby opening; the remaining
tolerance lives at the head engagement, not the base.)

- **Head condition (rule)**: the 2×5 header (S1) is used ONLY when a pivot door with
  internal closers runs to the top of the grid (no upper windows) — it exists to house
  the closer hardware. Every other condition: head lites continue the grid up to a slim
  1×2.5 top channel anchored to the structure above (boardroom elevations). Verticals
  are clip-captured at top in both modes.
- **Header (S1)** spans full width at top: 2" tall in elevation × 5" deep in plan.
  Slab anchors Ø5/16 through TOP wall at bay centers with Ø⅝ driver-access holes in the
  BOTTOM wall. Clip pilot pairs Ø3/16 on the bottom wall at every vertical station
  (5" o.c. for T-clips, 1" o.c. for F-clips at ends).
- **Verticals (S2)** at panel boundaries: 1" sightline × 3" deep, captured top and bottom
  by F/T clips — no welds, no bolts. Clip bases anchor to floor slab / screw to header
  underside; twin 3/16" tabs enter the open tube ends; Ø¼ set screws 1.6" from each end
  (2 per wall, both 3" walls) pinch the tabs. Rectangular slots (5/16" × 2 1/16") through
  both 3" walls at every rail station pass the shear blocks.
- **Horizontals (S3)** at each rail line, cut to clear span between verticals.
  8-32 clearance holes (Ø0.177) through the TOP wall @ ½" & 1½" from each end;
  Ø⅝ access holes in the BOTTOM wall → screws drop into shear-block taps (CHL08).
- **Shear blocks**: at every vertical/horizontal intersection a block passes through a slot in
  the vertical; horizontals slide over the protruding 2" tongues and are screwed with 8-32×⅜.
  - Interior joint = S6 (5", bridging both sides: 2" + 1" through vertical + 2")
  - Terminal joint at wall/jamb = S7 (2×2, one tongue)
  - Base/head joint in line with a clip = S6p (passthrough slot for clip tab)
- **Mullion angles (S4)**: each glass pane is picture-framed by mitered ¾×¾×⅛ angles on
  BOTH faces (8 angle sticks per pane: 2H+2V per face). Pilot holes ~Ø1/16 @ ≤12.75" o.c.
  Angle pairs sandwich the ¼" glass and screw back to supports.
- **Glass (S5)**: pane = module minus support sightlines; glazing edge clearance ⅛" all around.
- **Base sill channel**: 1×2.5 tube (same as S3) laid at the floor line of every glass bay,
  anchored to slab (Ø5/16 through bottom wall, Ø⅝ access above). The bottom glass row and
  its mullion frames bear on the sill — glass never meets slab directly, and the ground
  line reads with the same 1" sightline as the rails.
- **Rows** (project reference): typ. glass row 2'-6¾" with rail module pattern 12⅞ / 12⅞ / 7"
  hole spacing on verticals; top row can be metal panel (lobby "METAL" spandrels).

## 3. Doors

**Head lites:** a distinct shorter glass band (default 1'-4") runs continuously across the
top of the whole elevation — sidelites AND door bay — with the transom rail unbroken at
the door head. Doors default to meet that rail line. Head-lite row may be metal panel
(source lobby spandrels). Disabling head lites is what enables the 2×5 closer-header case.

**Cohesion rule:** door leaf mid-rails are generated on the partition rail centerlines —
mullion lines always carry across leaves, sidelites, and transoms (per CHL01/CHL10
elevations, where door rails continue the sidelite grid).

Two door families in the source project:

- **Type H — Elevator lobby pair**: 2 leaves 36.00" × 99.13" full-height glass grid,
  concealed OH closers, mag-lock + motion sensor + card reader, 72" brass pulls.
- **Type L — Boardroom pair (×4 total leaves in 2 pairs)**: leaf 3'-0" × 8'-3" (36 × 99),
  3 glass lites each (GL-01), IVES hinges (butt/continuous), brass pulls.

**Clearance rules (from CHL01/CHL09/CHL10 dims):**
- Pair in 6'-1½" (73.5") clear module → 2×36" leaves = 72" → 1.5" total: ⅜" hinge gap ×2 + ¼" meeting gap + ¼"×2 astragal shims (parametrized: hingeGap, meetingGap).
- Head gap: opening 8'-6" lobby → leaf 99.13 ≈ 102 − 5" header + 2.13 engagement; parametrize headGap (default ⅛") and floorClearance (default ¾").
- Door frame jambs are vertical supports (S2) with hinge reinforcement.

## 4. Portal

½" steel plate LINING of the opening (head soffit + 2 jamb plates running the wall
depth), bronze finish, ¼" reveal beyond finished wall both sides. Reads as a thin ½"
edge band in elevation — it is NOT a header-like block. Depth = wall thickness +
2×¼" reveal (survey-driven; 13¼" in source project).

## 5. Known conflicts / cautions found in source

1. **Portal omission** — cycle-1 submittal was rejected for missing the steel portal capture
   (Gensler: "MISSING STEEL PORTAL TO CAPTURE OPENING AND BRICK"). Configurator makes the
   portal an explicit, always-resolved element.
2. **Ceiling services** — verticals may need to shift where conduit/duct enter above
   (CHL02 note). Configurator allows per-bay width overrides and flags asymmetric layouts.
3. **Header B ends** — Ø11/32 holes at 2.75" from ends (jamb-fix condition) differ from
   Type A; unique-part detection must key on hole pattern, not just length.
4. **Access holes** — every blind fastener needs a Ø⅝ access hole in the far tube wall;
   missing these = unbuildable cold connection. Generator adds them automatically.
5. **Mullion miters** — 45° miters must reference the SAME frame rectangle on both faces;
   H and V mullion stick lengths are pane W/H (long-point to long-point).
