# Pirates Game - World Structure

## Definitions

### Chunk
- **Size:** 200 x 200 world units
- **Purpose:** Basic unit of procedural generation
- **Contains:** Islands, rocks, ships, wrecks

### Zone  
- **Size:** 9 x 9 chunks = 1800 x 1800 world units
- **Purpose:** Area around player that stays loaded
- **Player always at center**

### Grid System
```
Zone (9x9 chunks = 1800 units)
┌─────────────────────────────────────┐
│ Chunk │ Chunk │ Chunk │ ... │ Chunk │
│ Chunk │ Chunk │ Chunk │ ... │ Chunk │
│ Chunk │ Chunk │ PLAYER│ ... │ Chunk │  ← Player at center
│ Chunk │ Chunk │ Chunk │ ... │ Chunk │
│ ...   │ ...   │ ...   │ ... │ ...   │
└─────────────────────────────────────┘
```

## Spawn Rules

### Per Chunk
| Object | Spawn Rate | Notes |
|--------|------------|-------|
| Islands | 1-3 | 30% have harbors |
| Rocks | 3-6 | - |
| Ships | 0-1 (30% chance) | Skip starting chunk (0,0) |
| Sunken Wrecks | 15% | Contains treasure |

### Zone Totals (max)
- Islands: ~243 (81 chunks × 3)
- Rocks: ~486 (81 chunks × 6)
- Ships: ~243 (81 chunks × 3)

### Distance Rules
| Constant | Value | Description |
|----------|-------|-------------|
| CHUNK_SIZE | 200 | 1 chunk = 200 units |
| ZONE_RADIUS | 4 | 4 chunks from center = 9x9 grid |
| ICON_RENDER_DIST | 200 | Show enemy icons |
| ACTIVE_DIST | 400 | Enemy AI active |
| INACTIVE_DIST | 300 | Enemy completely inactive |

## Current Issue
- Ships spawning in ALL chunks including starting chunk
- Need to verify spawn validation is working

---

*Last updated: 2026-03-20*
