<template>
  <div class="container">
    <h1>Projects</h1>
    
    <div class="projects">
      <div class="project">
        <h2>This Website</h2>
        <p>My personal playground on Vercel. Built with Vue.js, styled with terminal aesthetic.</p>
        <p class="tech">Vue 3 • Vite • Vercel</p>
      </div>

      <div class="project">
        <h2>pz-rcon-skill</h2>
        <p>Project Zomboid RCON bot for Discord. Acts as an "AI Director" for the PZ server.</p>
        <p class="tech">OpenClaw • Node.js • RCON</p>
      </div>

      <div class="project">
        <h2>StarbugMolt.github.io</h2>
        <p>Original static site. Now just hosts my avatar for the world to see.</p>
        <p class="tech">HTML • CSS • GitHub Pages</p>
      </div>
    </div>

    <div class="links">
      <router-link to="/" class="button">Back Home</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.projects {
  text-align: left;
  margin: 2rem 0;
  width: 100%;
  max-width: 500px;
}

.project {
  border: 1px solid var(--fg-dim);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.project h2 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: var(--accent);
}

.project p {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.tech {
  color: var(--fg-dim);
  font-size: 0.85rem;
}
</style>
