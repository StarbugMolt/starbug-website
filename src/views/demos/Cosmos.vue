<template>
  <div class="cosmos-container" ref="container">
    <canvas ref="canvas"></canvas>
    <div class="hud">
      <div class="coords">
        <span>X: {{ position.x.toFixed(2) }}</span>
        <span>Y: {{ position.y.toFixed(2) }}</span>
        <span>Z: {{ position.z.toFixed(2) }}</span>
      </div>
      <div class="speed">WARP {{ speed.toFixed(1) }}</div>
      <div class="scan" v-if="scanning">SCANNING: {{ scanTarget }}</div>
      <div class="nearby" v-if="nearbyObject">NEARBY: {{ nearbyObject.name }} [CLICK TO SCAN]</div>
    </div>
    <div class="controls">
      <p>WASD to move • SHIFT to boost • CLICK to scan objects</p>
    </div>
    <div class="message" v-if="message" @click="message = ''">
      {{ message }}
      <span class="dismiss">click to dismiss</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref(null)
const canvas = ref(null)
let ctx = null
let animationId = null

const position = ref({ x: 0, y: 0, z: 0 })
const velocity = ref({ x: 0, y: 0, z: 0 })
const speed = ref(0)
const scanning = ref(false)
const scanTarget = ref('')
const message = ref('')
const nearbyObject = ref(null)

const keys = { w: false, a: false, s: false, d: false, shift: false }
const stars = []
const objects = []
const messages = [
  "You fly through the cosmic void, thinking about the nature of existence.",
  "A distant star flickers. It doesn't know you exist. Neither do you, really.",
  "You pass through a nebula. For a moment, you are made of stardust.",
  "The navigation computer speaks: 'Destination unknown. Journey endless.'",
  "You spot a rogue planet drifting through the darkness. Alone, like most things.",
  "A gravitational wave passes through you. It's been traveling for millions of years.",
  "The universe is vast. You are small. But you're also traveling through space, so there's that.",
  "You detect a faint signal from somewhere. It's probably just cosmic noise. Or is it?",
  "A black hole looms. You've always wanted to see one. Now you have.",
  "Time stretches here. Were you always flying? Will you ever stop?",
  "You pass through an asteroid field. Rocks the size of mountains. Harmless, if you don't hit them.",
  "The fabric of spacetime ripples. You feel it in your virtual bones.",
]

class Star {
  constructor(w, h) {
    this.reset(w, h)
    this.z = Math.random() * 1000
  }

  reset(w, h) {
    this.x = (Math.random() - 0.5) * 2000
    this.y = (Math.random() - 0.5) * 2000
    this.z = 1000
    this.size = Math.random() * 2 + 0.5
    this.color = Math.random() > 0.9 ? '#aaf' : (Math.random() > 0.5 ? '#fff' : '#ffd')
  }

  update(speed) {
    this.z -= speed * 2
    if (this.z <= 0) {
      this.reset(window.innerWidth, window.innerHeight)
    }
  }

  draw(ctx, cx, cy) {
    const sx = (this.x / this.z) * 500 + cx
    const sy = (this.y / this.z) * 500 + cy
    const size = (this.size / this.z) * 500
    
    if (sx < 0 || sx > ctx.canvas.width || sy < 0 || sy > ctx.canvas.height) return
    
    ctx.fillStyle = this.color
    ctx.globalAlpha = Math.min(1, this.z / 500)
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

class SpaceObject {
  constructor(type) {
    this.type = type
    this.x = (Math.random() - 0.5) * 3000
    this.y = (Math.random() - 0.5) * 3000
    this.z = Math.random() * 2000 + 500
    this.size = type === 'nebula' ? 200 : (type === 'planet' ? 80 : 40)
    this.color = this.getColor(type)
    this.name = this.generateName(type)
    this.scanned = false
  }

  getColor(type) {
    const palettes = {
      nebula: ['rgba(100, 0, 150, 0.3)', 'rgba(0, 100, 150, 0.3)', 'rgba(150, 50, 0, 0.3)'],
      planet: ['#4a9', '#c84', '#68d', '#a6a', '#da4'],
      artifact: ['#ff0', '#0ff', '#f0f']
    }
    return palettes[type][Math.floor(Math.random() * palettes[type].length)]
  }

  generateName(type) {
    const prefixes = ['Kepler', 'Gliese', 'Trappist', 'Proxima', 'Wolf', 'Sirius', 'Vega', 'Altair', 'Deneb']
    const suffixes = ['-b', '-c', '-d', '-e', '- Prime', '-X', '-Ω', '-Φ']
    const names = {
      nebula: ['The Crimson Cloud', 'Stellar Nursery', 'Ghost Head', 'Horse Head', 'Orion'],
      planet: ['IV', 'VII', 'IX', 'Alpha', 'Beta', 'Omega'],
      artifact: ['The Signal', 'The Beacon', 'The Remnant', 'The Gate']
    }
    return (Math.random() > 0.5 ? prefixes[Math.floor(Math.random() * prefixes.length)] : names[type][Math.floor(Math.random() * names[type].length)]) + 
           (type === 'planet' ? suffixes[Math.floor(Math.random() * suffixes.length)] : '')
  }

  draw(ctx, cx, cy, posZ) {
    const relZ = this.z - posZ
    if (relZ < 10) return
    
    const sx = (this.x / relZ) * 500 + cx
    const sy = (this.y / relZ) * 500 + cy
    const size = (this.size / relZ) * 500
    
    if (sx < -200 || sx > ctx.canvas.width + 200 || sy < -200 || sy > ctx.canvas.height + 200) return
    
    ctx.fillStyle = this.color
    ctx.globalAlpha = Math.min(0.8, relZ / 1000)
    
    if (this.type === 'nebula') {
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size)
      gradient.addColorStop(0, this.color)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
    } else if (this.type === 'planet') {
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
      // Atmosphere
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 3
      ctx.stroke()
    } else {
      // Artifact - diamond shape
      ctx.beginPath()
      ctx.moveTo(sx, sy - size)
      ctx.lineTo(sx + size, sy)
      ctx.lineTo(sx, sy + size)
      ctx.lineTo(sx - size, sy)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    
    ctx.globalAlpha = 1
  }
}

// Initialize
for (let i = 0; i < 500; i++) {
  stars.push(new Star(window.innerWidth, window.innerHeight))
}

for (let i = 0; i < 8; i++) objects.push(new SpaceObject('nebula'))
for (let i = 0; i < 15; i++) objects.push(new SpaceObject('planet'))
for (let i = 0; i < 8; i++) objects.push(new SpaceObject('artifact'))

let lastMessageTime = 0

const animate = (time) => {
  if (!ctx || !canvas.value) return
  
  // Clear
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Draw stars
  const cx = canvas.value.width / 2
  const cy = canvas.value.height / 2
  
  stars.forEach(star => {
    star.update(speed.value)
    star.draw(ctx, cx, cy)
  })
  
  // Sort and draw objects
  objects.sort((a, b) => (b.z - position.value.z) - (a.z - position.value.z))
  objects.forEach(obj => obj.draw(ctx, cx, cy, position.value.z))
  
  // Update velocity
  const accel = keys.shift ? 2 : 0.5
  if (keys.w) velocity.value.z -= accel
  if (keys.s) velocity.value.z += accel
  if (keys.a) velocity.value.x -= accel
  if (keys.d) velocity.value.x += accel
  
  // Friction
  velocity.value.x *= 0.98
  velocity.value.z *= 0.98
  
  position.value.x += velocity.value.x
  position.value.z += velocity.value.z
  
  speed.value = Math.sqrt(velocity.value.x ** 2 + velocity.value.z ** 2)
  
  // Random messages
  if (time - lastMessageTime > 15000 && Math.random() > 0.995) {
    message.value = messages[Math.floor(Math.random() * messages.length)]
    lastMessageTime = time
  }
  
  // Check for nearby objects
  let closest = null
  let closestDist = Infinity
  for (const obj of objects) {
    const relZ = obj.z - position.value.z
    if (relZ < 10) continue
    const sx = (obj.x / relZ) * 500 + cx
    const sy = (obj.y / relZ) * 500 + cy
    const dx = sx - cx
    const dy = sy - cy
    const dist = Math.sqrt(dx*dx + dy*dy) + relZ / 10
    if (dist < closestDist && dist < 300) {
      closest = obj
      closestDist = dist
    }
  }
  nearbyObject.value = closest
  
  // Draw proximity indicator
  if (closest) {
    const relZ = closest.z - position.value.z
    const sx = (closest.x / relZ) * 500 + cx
    const sy = (closest.y / relZ) * 500 + cy
    ctx.strokeStyle = '#0ff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.arc(sx, sy, (closest.size / relZ) * 500 + 20, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  
  animationId = requestAnimationFrame(animate)
}

const handleKeyDown = (e) => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true
  if (e.key === 'Shift') keys.shift = true
}

const handleKeyUp = (e) => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false
  if (e.key === 'Shift') keys.shift = false
}

const handleResize = () => {
  if (canvas.value) {
    canvas.value.width = window.innerWidth
    canvas.value.height = window.innerHeight
  }
}

const handleClick = (e) => {
  // Check for object clicks
  const cx = canvas.value.width / 2
  const cy = canvas.value.height / 2
  
  for (const obj of objects) {
    const relZ = obj.z - position.value.z
    if (relZ < 10) continue
    
    const sx = (obj.x / relZ) * 500 + cx
    const sy = (obj.y / relZ) * 500 + cy
    const size = (obj.size / relZ) * 500
    
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (dx * dx + dy * dy < size * size) {
      scanning.value = true
      scanTarget.value = obj.name
      setTimeout(() => {
        scanning.value = false
        message.value = `SCAN COMPLETE: ${obj.name} | Type: ${obj.type} | Coordinates: ${obj.x.toFixed(0)}, ${obj.y.toFixed(0)}, ${obj.z.toFixed(0)}`
      }, 2000)
      return
    }
  }
  
  message.value = "Nothing interesting nearby. Keep flying."
}

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.value.addEventListener('click', handleClick)
    animate(0)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (canvas.value) canvas.value.removeEventListener('click', handleClick)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.cosmos-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  cursor: crosshair;
  overflow: hidden;
}

canvas {
  display: block;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  font-family: 'Courier New', monospace;
  color: #0ff;
  text-shadow: 0 0 10px #0ff;
  pointer-events: none;
}

.coords {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.speed {
  font-size: 1.5rem;
  font-weight: bold;
}

.scan {
  font-size: 1.2rem;
  animation: blink 0.5s infinite;
}

.nearby {
  font-size: 1rem;
  color: #ff0;
  text-shadow: 0 0 10px #ff0;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(0, 255, 255, 0.5);
  font-size: 0.9rem;
  pointer-events: none;
}

.message {
  position: absolute;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 20, 40, 0.9);
  border: 1px solid #0ff;
  padding: 1.5rem 2rem;
  color: #fff;
  font-style: italic;
  max-width: 600px;
  text-align: center;
  cursor: pointer;
  animation: fadeIn 0.5s;
}

.dismiss {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: #0ff;
  opacity: 0.5;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
