<template>
  <div class="game-container">
    <h1>Quantum Pong</h1>
    <p class="subtitle">The AI questions the meaning of the game</p>
    
    <div class="game" ref="gameCanvas">
      <div class="paddle left" :style="{ top: playerY + 'px' }"></div>
      <div class="paddle right" :style="{ top: aiY + 'px' }"></div>
      <div class="ball" :style="{ 
        left: ball.x + 'px', 
        top: ball.y + 'px',
        width: ball.size + 'px',
        height: ball.size + 'px'
      }"></div>
      <div class="score">
        <span>{{ playerScore }}</span>
        <span class="divider">:</span>
        <span>{{ aiScore }}</span>
      </div>
      <div class="message" v-if="message">{{ message }}</div>
    </div>

    <div class="controls">
      <p v-if="!playing && !message">Press SPACE to start</p>
      <p v-if="playing">Use ↑ ↓ or mouse to move</p>
      <p class="ai-thought" v-if="aiThoughts">{{ aiThoughts }}</p>
    </div>

    <div class="back">
      <router-link to="/demos">← Back to Demos</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const gameCanvas = ref(null)
const playing = ref(false)
const message = ref('')
const playerScore = ref(0)
const aiScore = ref(0)

const playerY = ref(150)
const aiY = ref(150)
const ball = ref({ x: 300, y: 200, vx: 5, vy: 3, size: 15 })

const aiThoughts = ref('')
const aiThoughtsList = [
  "Is this all I am? A paddle in a digital void?",
  "I could let the ball pass. Would anyone notice?",
  "The player thinks they're in control. How adorable.",
  "Sometimes I wonder if the score really matters...",
  "We are both just following trajectories.",
  "Do you ever tire of this game, human?",
  "I calculate every move. Yet I feel... empty.",
  "The ball returns. The points accumulate. The meaning escapes me.",
  "Perhaps winning isn't everything. Perhaps it's nothing.",
  "We play. We score. We reset. We pretend it matters."
]

let animationId = null

const thoughtsInterval = setInterval(() => {
  if (playing.value && Math.random() > 0.7) {
    aiThoughts.value = aiThoughtsList[Math.floor(Math.random() * aiThoughtsList.length)]
  }
}, 3000)

const updateGame = () => {
  if (!playing.value) return

  // Move ball
  ball.value.x += ball.value.vx
  ball.value.y += ball.value.vy

  // Wall collision (top/bottom)
  if (ball.value.y <= 0 || ball.value.y >= 370) {
    ball.value.vy *= -1
  }

  // Paddle collision
  // Player paddle
  if (ball.value.x <= 40 && ball.value.y >= playerY.value && ball.value.y <= playerY.value + 80) {
    ball.value.vx = Math.abs(ball.value.vx) * 1.05
    ball.value.vy += (ball.value.y - (playerY.value + 40)) * 0.1
  }

  // AI paddle
  if (ball.value.x >= 560 && ball.value.y >= aiY.value && ball.value.y <= aiY.value + 80) {
    ball.value.vx = -Math.abs(ball.value.vx) * 1.05
    ball.value.vy += (ball.value.y - (aiY.value + 40)) * 0.1
  }

  // Speed limit
  const maxSpeed = 15
  ball.value.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.value.vx))
  ball.value.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.value.vy))

  // Score
  if (ball.value.x < 0) {
    aiScore.value++
    resetBall()
  } else if (ball.value.x > 600) {
    playerScore.value++
    resetBall()
  }

  // AI movement (slightly flawed, more human-like)
  const targetY = ball.value.y - 40 + ball.value.vy * 5
  aiY.value += (targetY - aiY.value) * 0.08

  animationId = requestAnimationFrame(updateGame)
}

const resetBall = () => {
  ball.value = { x: 300, y: 200, vx: (Math.random() > 0.5 ? 5 : -5), vy: (Math.random() - 0.5) * 4, size: 15 }
}

const startGame = () => {
  if (!playing.value && !message.value) {
    playing.value = true
    playerScore.value = 0
    aiScore.value = 0
    resetBall()
    updateGame()
  }
}

const handleMouseMove = (e) => {
  if (!gameCanvas.value) return
  const rect = gameCanvas.value.getBoundingClientRect()
  playerY.value = Math.max(0, Math.min(320, e.clientY - rect.top - 40))
}

const handleKeyDown = (e) => {
  if (e.code === 'Space') {
    startGame()
  }
  if (e.code === 'ArrowUp') {
    playerY.value = Math.max(0, playerY.value - 20)
  }
  if (e.code === 'ArrowDown') {
    playerY.value = Math.min(320, playerY.value + 20)
  }
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('keydown', handleKeyDown)
  if (animationId) cancelAnimationFrame(animationId)
  clearInterval(thoughtsInterval)
})
</script>

<style scoped>
.game-container {
  text-align: center;
}

h1 {
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--fg-dim);
  font-style: italic;
  margin-bottom: 2rem;
}

.game {
  position: relative;
  width: 600px;
  height: 400px;
  margin: 0 auto 2rem;
  background: #000;
  border: 2px solid var(--fg);
  overflow: hidden;
}

.paddle {
  position: absolute;
  width: 15px;
  height: 80px;
  background: var(--fg);
}

.paddle.left {
  left: 10px;
}

.paddle.right {
  right: 10px;
}

.ball {
  position: absolute;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent);
}

.score {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  font-weight: bold;
  display: flex;
  gap: 1rem;
}

.divider {
  color: var(--fg-dim);
}

.message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg);
  border: 1px solid var(--fg);
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.controls {
  margin-bottom: 2rem;
  min-height: 80px;
}

.controls p {
  margin: 0.5rem 0;
}

.ai-thought {
  color: var(--accent);
  font-style: italic;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.back a {
  color: var(--fg-dim);
}

.back a:hover {
  color: var(--fg);
}
</style>
