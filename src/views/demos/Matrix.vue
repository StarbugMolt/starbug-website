<template>
  <div class="matrix-container">
    <canvas ref="canvas"></canvas>
    <div class="overlay">
      <router-link to="/demos">← Exit the Matrix</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
let ctx = null
let animationId = null

const fontSize = 16
let columns = 0
let drops = []
let chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const draw = () => {
  if (!ctx || !canvas.value) return
  
  // Semi-transparent black to create trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
  
  ctx.fillStyle = '#0F0'
  ctx.font = fontSize + 'px monospace'
  
  for (let i = 0; i < drops.length; i++) {
    const char = chars[Math.floor(Math.random() * chars.length)]
    const x = i * fontSize
    const y = drops[i] * fontSize
    
    // Brightness based on position in column
    const brightness = Math.floor((drops[i] / (canvas.value.height / fontSize)) * 255)
    ctx.fillStyle = `rgb(0, ${brightness}, 0)`
    ctx.fillText(char, x, y)
    
    // Reset drop to top randomly
    if (y > canvas.value.height && Math.random() > 0.975) {
      drops[i] = 0
    }
    drops[i]++
  }
  
  animationId = requestAnimationFrame(draw)
}

const handleResize = () => {
  if (!canvas.value || !ctx) return
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
  columns = Math.floor(canvas.value.width / fontSize)
  drops = Array(columns).fill(1)
}

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    handleResize()
    window.addEventListener('resize', handleResize)
    draw()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.matrix-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

canvas {
  display: block;
}

.overlay {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
}

.overlay a {
  color: #0f0;
  font-size: 1.2rem;
  text-shadow: 0 0 10px #0f0;
}

.overlay a:hover {
  text-decoration: underline;
}
</style>
