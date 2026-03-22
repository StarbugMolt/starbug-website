# Pirates of the Burning Sea — Game Design

## Core Loop
Navigate the Caribbean. Fight enemy ships. Survive.

## Controls
- **Mouse** — Steer ship
- **Left click** — Fire starboard (right side)
- **Right click** — Fire port (left side)
- **A key** — Drop/raise anchor
- **Scroll** — Toggle camera (navigation vs combat view)

## Anchor & Harbour System
- Drop anchor near a **red ring** at a harbour dock (on some islands)
- Game **pauses** when in harbour — safe zone
- **Press A again** to leave harbour

## Harbour Shop Upgrades

| Upgrade | Levels | Effect | Costs |
|---------|--------|--------|-------|
| Faster Sails | 3 | +3 max speed per level | 150/350/600g |
| Broadside Power | 3 | +2 cannons/side per level | 200/450/750g |
| Faster Cannons | 3 | -0.25s cooldown per level | 175/400/700g |
| Max HP | 5 | +10 max HP per level (full heal on purchase) | 150/300/500/750/1000g |
| Repair Haul | ∞ | Restore 10 HP | 100g (+10 per use) |

## Player Stats
- **Base HP:** 100 (upgradeable to 150)
- **Base max speed:** 15 knots (upgradeable)
- **Cannons:** 3/side (upgradeable to 9/side)
- **Cooldown:** 1.5s base (upgradeable to 0.75s)

## Enemy Ships
- **Sloop** (NORMAL): 80 HP, medium speed, fires straight ahead
- **Galleon** (BIG): 200 HP, slow, broadside fire
- **Rammer**: 150 HP, fast, charges directly, deals double collision damage

## Performance Targets
- **30 FPS stable** on mid-range hardware
- No CPU-side trig per frame on vertex arrays
- Throttle spawn/cleanup/indicator updates to every 5-20 frames
- Dispose geometries/materials on object removal (queue if heavy)

## Archived Features (see ARCHIVE comment in Pirates.vue)
- Ocean wave system — removed: too many CPU trig ops per frame
- Wind particle system — removed: too many per-frame updates
- Original periodic memory sweep — removed: caused sync freeze lag spikes
