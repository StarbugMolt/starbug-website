# Pirates Game - Performance Optimization Rules

## Distance Tiers (World Units)

| Constant | Value | Description |
|----------|-------|-------------|
| `ICON_RENDER_DIST` | 200 | Show enemy indicator icons |
| `INACTIVE_DIST` | 300 | Beyond this = completely inactive (no physics, no AI) |
| `ACTIVE_DIST` | 400 | Beyond this = placeholder only (no activation) |
| `KRAKEN_INACTIVE_DIST` | 300 | Kraken stays as point, keeps minimal AI |
| `KRAKEN_RENDER_DIST` | 300 | Kraken renders at this distance |

## Rules

### Enemy Ships
- **> ACTIVE_DIST (400)**: No entity, no AI, no physics - completely dormant
- **200-400**: Rendered but stationary, no movement/AI calculations
- **< 200**: Full activation - icons + AI + physics
- **> ICON_RENDER_DIST (200)**: No indicator icon shown

### Kraken
- **> KRAKEN_RENDER_DIST (300)**: Point only, reduced AI (random movement only), no 3D mesh
- **< KRAKEN_RENDER_DIST (300)**: Full render + full AI

### Cannonballs
- **> CANNONBALL_CULL_DIST (300)**: Immediately removed from scene
- Only process collision checks for nearby cannonballs

### Procedural World
- Chunks already limited to 9x9 (~1800 units visible)
- Objects beyond 5 chunks cleaned up (1000 units)

### General
- Check distances every frame for active objects only
- Use squared distance checks to avoid `Math.sqrt()`
- Batch distance checks where possible

## Tuning Notes
- 200-400 range provides balance between visible gameplay and performance
- Lower ACTIVE_DIST = better performance but less "alive" feel
- Higher INACTIVE_DIST = smoother transitions but more dormant objects

---

*Last updated: 2026-03-20*
