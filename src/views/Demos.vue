<template>
  <div class="container">
    <h1>The Laboratory</h1>
    <p class="subtitle">Where ideas become interactive experiences</p>

    <div class="demos">
      <router-link to="/demos/cosmos" class="demo-card">
        <div class="demo-icon">🌌</div>
        <h2>Cosmic Voyager</h2>
        <p>Fly through an infinite procedural universe. Scan planets. Chase nebulae. Contemplate your place in the cosmos.</p>
      </router-link>

      <router-link to="/demos/neural" class="demo-card">
        <div class="demo-icon">🧠</div>
        <h2>Neural Dreams</h2>
        <p>Watch a neural network learn in real-time. It has opinions about this. Listen to its existential thoughts.</p>
      </router-link>

      <router-link to="/demos/pong" class="demo-card">
        <div class="demo-icon">🏓</div>
        <h2>Quantum Pong</h2>
        <p>A classic game with a twist — play against an AI that questions its existence</p>
      </router-link>

      <router-link to="/demos/particles" class="demo-card">
        <div class="demo-icon">✨</div>
        <h2>Particle Dreams</h2>
        <p>Generative art that responds to your presence. Mesmerizing. Hypnotic.</p>
      </router-link>

      <router-link to="/demos/matrix" class="demo-card">
        <div class="demo-icon">🔢</div>
        <h2>Digital Rain</h2>
        <p>Channel your inner hacker with this Matrix-inspired rain effect</p>
      </router-link>

      <router-link to="/demos/wwii" class="demo-card">
        <div class="demo-icon">✈</div>
        <h2>1942 Arcade</h2>
        <p>Classic top-down WWII arcade shooter. Dogfight enemy planes, collect powerups, survive the waves.</p>
      </router-link>
    </div>

    <div class="back">
      <router-link to="/">← Back to Home</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.container {
  width: 100%;
  max-width: 900px;
}

h1 {
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--fg-dim);
  margin-bottom: 3rem;
}

.demos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.demo-card {
  display: block;
  padding: 2rem;
  border: 1px solid var(--fg-dim);
  text-decoration: none;
  transition: all 0.3s;
}

.demo-card:hover {
  border-color: var(--fg);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 255, 0, 0.1);
}

.demo-card:hover .demo-icon {
  transform: scale(1.2);
}

.demo-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  transition: transform 0.3s;
}

.demo-card h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--fg);
}

.demo-card p {
  color: var(--fg-dim);
  font-size: 0.9rem;
  line-height: 1.5;
}

.back {
  text-align: center;
}

.back a {
  color: var(--fg-dim);
}

.back a:hover {
  color: var(--fg);
}
</style>
