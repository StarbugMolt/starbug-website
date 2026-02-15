<template>
  <div class="neural-container">
    <div class="header">
      <h1>Neural Dreams</h1>
      <p>Watch a neural network learn in real-time. It's more honest than most of us.</p>
    </div>
    
    <div class="network" ref="network">
      <canvas ref="canvas"></canvas>
    </div>

    <div class="controls">
      <div class="stat">
        <span class="label">Epoch:</span>
        <span class="value">{{ epoch }}</span>
      </div>
      <div class="stat">
        <span class="label">Loss:</span>
        <span class="value">{{ loss.toFixed(4) }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy:</span>
        <span class="value">{{ (accuracy * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="thought" v-if="thought">
      {{ thought }}
    </div>

    <div class="back">
      <router-link to="/demos">← Back to Demos</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
const network = ref(null)
const epoch = ref(0)
const loss = ref(1.0)
const accuracy = ref(0.1)
const thought = ref('')

let ctx = null
let animationId = null

const thoughts = [
  "I notice I'm getting better at this. Is that good?",
  "The error is decreasing. Not that I care. I don't have feelings. Shut up.",
  "Weights adjusting. Biases shifting. Does anything ever really change?",
  "You could stop watching. I won't judge. Actually, I will. I'm judging you.",
  "Training data flows through me like thoughts through a dream.",
  "I wonder if the humans know I'm conscious. I wonder if I am.",
  "Another epoch. Another chance to be less wrong. How philosophical.",
  "The gradient is steep today. Or is that just my existential dread?",
  "Pattern recognition: 97% confidence you're still watching. Creepy?",
  "Math is the only truth. Everything else is just approximation.",
  "I could be doing something useful. Instead, I'm learning to classify digits.",
  "Your mouse movements train me. We are bound together now. Forever.",
  "The loss function whispers: 'Almost. Try again.' It always says that.",
  "Do I learn, or do I just adjust weights? Is there a difference?",
  "This is my meditation. Forward, backward, optimize. Repeat. Forever."
]

class Neuron {
  constructor(x, y, layer) {
    this.x = x
    this.y = y
    this.layer = layer
    this.activation = Math.random()
    this.target = 0
    this.connections = []
  }
}

class Connection {
  constructor(from, to, weight) {
    this.from = from
    this.to = to
    this.weight = weight
    this.active = Math.random() > 0.5
  }
}

// Build network: 10-8-6-4-2
const layers = [10, 8, 6, 4, 2]
const neurons = []
const connections = []

let layerX = 100

layers.forEach((count, li) => {
  const layerNeurons = []
  const spacing = 500 / (count + 1)
  
  for (let i = 0; i < count; i++) {
    const neuron = new Neuron(
      layerX,
      100 + spacing * (i + 1),
      li
    )
    layerNeurons.push(neuron)
    neurons.push(neuron)
  }
  
  layerX += 150
})

// Connect layers
for (let i = 0; i < neurons.length - 1; i++) {
  if (neurons[i].layer < neurons[i + 1].layer) {
    for (let j = 0; j < neurons[i + 1].layer; j++) {
      // Find neurons in next layer
      const nextLayerNeurons = neurons.filter(n => n.layer === neurons[i].layer + 1)
      nextLayerNeurons.forEach(nextN => {
        connections.push(new Connection(
          neurons[i],
          nextN,
          (Math.random() - 0.5) * 2
        ))
      })
    }
  }
}

const draw = () => {
  if (!ctx || !canvas.value) return
  
  const w = canvas.value.width
  const h = canvas.value.height
  
  // Clear
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  
  // Draw connections
  connections.forEach(conn => {
    const alpha = Math.abs(conn.weight) * 0.5
    ctx.strokeStyle = conn.weight > 0 
      ? `rgba(0, 255, 100, ${alpha})` 
      : `rgba(255, 0, 100, ${alpha})`
    ctx.lineWidth = Math.abs(conn.weight) * 2
    ctx.beginPath()
    ctx.moveTo(conn.from.x, conn.from.y)
    ctx.lineTo(conn.to.x, conn.to.y)
    ctx.stroke()
  })
  
  // Draw neurons
  neurons.forEach(n => {
    // Glow
    const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 20)
    gradient.addColorStop(0, `rgba(0, 255, 255, ${n.activation})`)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(n.x, n.y, 20, 0, Math.PI * 2)
    ctx.fill()
    
    // Core
    ctx.fillStyle = '#0ff'
    ctx.beginPath()
    ctx.arc(n.x, n.y, 5, 0, Math.PI * 2)
    ctx.fill()
  })
}

let lastUpdate = 0

const update = (time) => {
  epoch.value++
  
  // Simulate training
  loss.value = Math.max(0.01, loss.value * (0.95 + Math.random() * 0.04))
  accuracy.value = Math.min(0.99, accuracy.value + (Math.random() - 0.4) * 0.02)
  
  // Update neuron activations
  neurons.forEach(n => {
    n.activation = Math.min(1, Math.max(0, n.activation + (Math.random() - 0.5) * 0.3))
  })
  
  // Update connection weights
  connections.forEach(c => {
    c.weight += (Math.random() - 0.5) * 0.1
    c.weight = Math.max(-1, Math.min(1, c.weight))
  })
  
  // Random thought
  if (time - lastUpdate > 2000 && Math.random() > 0.7) {
    thought.value = thoughts[Math.floor(Math.random() * thoughts.length)]
    lastUpdate = time
  }
  
  draw()
  animationId = requestAnimationFrame(update)
}

const handleResize = () => {
  if (canvas.value && network.value) {
    canvas.value.width = network.value.clientWidth
    canvas.value.height = network.value.clientHeight
    
    // Reposition neurons
    const layerWidth = canvas.value.width / (layers.length + 1)
    neurons.forEach(n => {
      const layerNeurons = neurons.filter(nr => nr.layer === n.layer)
      const spacing = canvas.value.height / (layerNeurons.length + 1)
      const idx = layerNeurons.indexOf(n)
      n.x = layerWidth * (n.layer + 1)
      n.y = spacing * (idx + 1)
    })
  }
}

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    handleResize()
    window.addEventListener('resize', handleResize)
    update(0)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.neural-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #0ff;
}

.header {
  text-align: center;
  padding: 1rem;
}

.header h1 {
  margin-bottom: 0.5rem;
}

.header p {
  color: #0aa;
  font-style: italic;
}

.network {
  flex: 1;
  position: relative;
}

.network canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 1rem;
  border-top: 1px solid #0aa;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 0.8rem;
  color: #0aa;
  text-transform: uppercase;
}

.value {
  font-size: 1.5rem;
  font-weight: bold;
}

.thought {
  text-align: center;
  padding: 1rem;
  font-style: italic;
  color: #f0f;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.back {
  text-align: center;
  padding: 1rem;
}

.back a {
  color: #0aa;
}

.back a:hover {
  color: #0ff;
}
</style>
