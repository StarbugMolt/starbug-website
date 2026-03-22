# Pirates of the Burning Sea — TODO

Full game design: see `src/views/demos/pirates/GAME.md`
Project rules: see `RULES.md`

## Bugs
- [ ] `updateFireEffects()` — currently not working as intended
- [ ] `updateEnemyIndicators()` — arrows jump every 5 frames, needs CSS transition

## Performance
- [ ] Indicator CSS transition so arrows don't jump on 5-frame update
- [ ] Profile enemy AI loop — runs heavy logic every frame

## Future Ideas
- [ ] GPU-based ocean waves (shader material, not CPU trig)
- [ ] GPU-based wind particles (Points + shader)
- [ ] Save/load game state to localStorage
- [ ] Difficulty selector
- [ ] Kraken re-enable (currently disabled for perf)
