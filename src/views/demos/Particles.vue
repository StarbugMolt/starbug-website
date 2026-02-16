<template>
  <div class="particle-container" ref="container" @mousemove="handleMouseMove" @click="handleClick">
    <canvas ref="canvas"></canvas>
    <div class="overlay">
      <h1>Particle Dreams</h1>
      <p>Move your cursor. Click to explode.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref(null)
const canvas = ref(null)
let ctx = null
let animationId = null
let particles = []
let mouseX = 0
let mouseY = 0

class Particle {
  constructor(x, y, vx, vy, color) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.life = 1
    this.decay = Math.random() * 0.01 + 0.005
    this.size = Math.random() * 3 + 1
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.99
    this.vy *= 0.99
    this.life -= this.decay
  }

  draw(ctx) {
    ctx.globalAlpha = this.life
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

const colors = ['#00ff00', '#00ff66', '#00ffaa', '#00ffdd', '#00ffff', '#66ff00']

const createParticles = (x, y, count = 20) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 5 + 2
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const color = colors[Math.floor(Math.random() * colors.length)]
    particles.push(new Particle(x, y, vx, vy, color))
  }
}

const animate = () => {
  if (!ctx || !canvas.value) return
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

  // Attract particles to mouse
  particles.forEach(p => {
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 200) {
      p.vx += dx * 0.001
      p.vy += dy * 0.001
    }
    p.update()
    p.draw(ctx)
  })

  particles = particles.filter(p => p.life > 0)

  // Add ambient particles
  if (particles.length < 100 && Math.random() > 0.9) {
    createParticles(
      Math.random() * canvas.value.width,
      Math.random() * canvas.value.height,
      1
    )
  }

  animationId = requestAnimationFrame(animate)
}

const handleMouseMove = (e) => {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
}

const handleClick = (e) => {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  createParticles(x, y, 50)
}

const handleResize = () => {
  if (!canvas.value || !container.value) return
  canvas.value.width = container.value.clientWidth
  canvas.value.height = container.value.clientHeight
}

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    handleResize()
    window.addEventListener('resize', handleResize)
    mouseX = canvas.value.width / 2
    mouseY = canvas.value.height / 2
    animate()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.particle-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  cursor: crosshair;
}

canvas {
  display: block;
}

.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.overlay h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 20px var(--fg);
}

.overlay p {
  color: var(--fg-dim);
  font-size: 1.2rem;
}
</style>
