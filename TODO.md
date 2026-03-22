# Pirates of the Burning Sea — TODO

## Bugs
- [ ] `updateFireEffects()` — currently broken/not working as intended, needs fixing
- [ ] `updateEnemyIndicators()` — arrows jump every 5 frames, needs smooth CSS transition

## Performance
- [ ] Indicator CSS transition to smooth the every-5-frame update jump
- [ ] Consider re-adding ocean waves with GPU shader (not CPU trig math) if performance allows on target hardware
- [ ] Consider re-adding wind particles with GPU Points + shader if performance allows

## Features
- [ ] Harbour shop — all core functionality implemented
- [ ] Upgrade system — sail speed, cannon count, cannon speed, max HP, repair haul
- [ ] Infinite repair cost escalation (+10g per use)

## Known Removed Features (see ARCHIVE comment in Pirates.vue)
- Ocean wave system — removed due to CPU trig per vertex causing lag
- Wind particle system — removed for performance
- Periodic memory sweep (original) — removed due to sync freeze causing lag spikes
