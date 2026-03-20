# Pirates Demo - Complete Feature Roadmap

## Overview
Infinite procedural open-world pirate game with combat, treasure hunting, and boss fight.

---

## ✅ COMPLETED FEATURES

### Core Gameplay
- [x] Player ship with 3 cannons per side (cone fire)
- [x] Cannon cone angles (10° spread with port/starboard symmetry)
- [x] Anchor mechanics (A key to drop/raise)
- [x] Treasure system (enemies drop treasure, anchor within 10 units for 3 seconds to collect)
- [x] Gold collection and scoring

### Enemy Ships
- [x] 3 enemy types: Rammer, Sloop (Normal), Galleon (Big)
- [x] Enemy AI behaviors (chase, circle, ram)
- [x] Enemy line-of-sight raycasting (won't fire through islands/rocks)
- [x] Enemy collision damage (ships damage each other)
- [x] Enemy obstacle damage (ships take damage from rocks/islands)
- [x] "Stupid" AI: 15% oblivious to obstacles, 20% wrong turn choice
- [x] Sinking animations for destroyed ships

### Kraken Boss
- [x] Spawns at game start at random distant location
- [x] Behavior states: idle (>70 units), approach (35-70), aggressive (<35)
- [x] Animated tentacles with smash attacks
- [x] Speed-based hit chance (slower = more likely to hit)
- [x] Whirlpool effect that pulls player in
- [x] Wind interaction (tailwind helps escape)
- [x] Always loaded in procedural chunks, respawns if too far

### World Generation
- [x] Infinite procedural world (9x9 chunk grid around player)
- [x] Gradual chunk spawning (3x3 → 5x5 → 9x9)
- [x] Islands with 30% having harbor (docks with posts)
- [x] Rocks scattered procedurally
- [x] Random enemy ships per chunk (0-3)
- [x] Sunken ship wrecks (15% chance per chunk) with free treasure

### Spawn Validation
- [x] Ships don't spawn on islands (20+ unit buffer)
- [x] Ships don't spawn on rocks (10+ unit buffer)
- [x] Ships don't spawn on each other (20+ unit buffer)
- [x] Ships stay away from chunk borders (30+ units)
- [x] Initial enemies stay 150+ units from player spawn

### Performance Optimizations
- [x] Distance-based enemy activation (400 units)
- [x] Icon render distance (200 units)
- [x] Kraken visibility culling (300 units)
- [x] Cannonball culling (>300 units)
- [x] Throttled AI updates (every 2nd frame)
- [x] Chunk cleanup for distant objects

### Visuals
- [x] Wind particle system with trails
- [x] Player ship with details
- [x] Enemy ships with health bars
- [x] Camera zoom (mouse wheel)
- [x] Camera modes (behind view / top-down)

### UI/HUD
- [x] Health display
- [x] Gold counter
- [x] Enemy indicators (direction arrows)
- [x] Win/lose screens
- [x] Control instructions

---

## 📋 PERFORMANCE RULES

| Constant | Value | Description |
|----------|-------|-------------|
| ICON_RENDER_DIST | 200 | Show enemy indicator icons |
| INACTIVE_DIST | 300 | Beyond this = completely inactive |
| ACTIVE_DIST | 400 | Beyond this = no AI/physics |
| KRAKEN_RENDER_DIST | 300 | Kraken renders at this distance |
| CANNONBALL_CULL_DIST | 300 | Cannonballs removed beyond this |

---

## 🐛 BUG FIXES LOG

1. **Treasure ring position** - Needed world coordinates instead of local
2. **Treasure not disappearing** - Added proper mesh disposal and early return after collection
3. **Too many ships** - Reduced to 30% chance of 1 ship per chunk
2. **Enemy disappearing instantly** - Now waits for sinking animation
3. **Wind particles disappearing** - Added depthTest: false, renderOrder: 999
4. **Cannon angles inverted** - Fixed symmetry between port/starboard
5. **Kraken tentacles not attached** - Used group rotation
6. **Mass entity explosion** - Gradual chunk spawning (was all 81 at once)
7. **Ships spawning on top of each other** - Position validation added
8. **Kraken spawning on islands/rocks** - Added obstacle checking

---

## 🎮 CONTROLS

| Key | Action |
|-----|--------|
| W | Forward |
| S | Backward |
| A | Drop/Raise Anchor |
| Space | Fire Port Cannons |
| E | Fire Starboard Cannons |
| Mouse | Steer |
| Scroll | Zoom |

---

## 📁 FILES

- `ROADMAP.md` - This file
- `TODO.md` - Feature tracking
- `PERFORMANCE.md` - Optimization constants
- `../../../../TODO.md` - Original game TODO

---

*Last updated: 2026-03-20*
