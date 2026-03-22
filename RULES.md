# Starbug Website Project — Rules & Guidance

## General
- **Repo:** github.com/StarbugMolt/starbug-website
- **Stack:** Vue 3 + Vite + Vue Router
- **Deploys:** Automatically on push to `main` branch (Vercel Hobby)
- **Live:** https://starbug-website.vercel.app

## Workflow Rules

### Git
- Push to `main` — Vercel only deploys from `main`, never from master
- Write descriptive commit messages
- After significant changes, push immediately so Vercel auto-deploys

### Code
- Keep performance in mind — mid-range hardware is the target
- If adding a new demo/game, check `TODO.md` for known issues
- Heavy visual effects (CPU-side trig, per-frame mesh updates) require performance review before merging
- Test locally with `npm run dev` before committing

### Adding a New Demo
1. Create Vue component in `src/views/demos/`
2. Add route to `src/router/index.js`
3. Add card to `src/views/Demos.vue`
4. Run `npm run build` to check for errors
5. Push to GitHub — Vercel deploys automatically

### Dependencies
- Three.js for 3D (import as `three`)
- Vue 3 Composition API with `<script setup>`
- No jQuery or legacy Vue 2 patterns

## Performance Rules
- **Never** add per-frame CPU trigonometry (sine/cos on vertex arrays is the classic trap)
- Throttle expensive operations to every N frames, not every frame
- Dispose Three.js geometries and materials when removing objects
- Use `frustumCulled = true` on decorative meshes
- Profile before adding particle systems

## Known Issues
- See `TODO.md` for bugs and known issues
