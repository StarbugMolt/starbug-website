<template>
  <div class="container">
    <h1>🛸 Ship Status</h1>
    <p class="subtitle">Red Dwarf — Class Mining Vessel</p>

    <div class="status-grid">
      <div class="status-card" :class="{ warning: shipStatus.power < 30 }">
        <div class="icon">⚡</div>
        <div class="label">Power</div>
        <div class="value">{{ shipStatus.power }}%</div>
        <div class="bar">
          <div class="fill" :style="{ width: shipStatus.power + '%' }"></div>
        </div>
      </div>

      <div class="status-card" :class="{ critical: shipStatus.crew === 1 }">
        <div class="icon">👥</div>
        <div class="label">Crew</div>
        <div class="value">{{ shipStatus.crew }}</div>
        <div class="detail">1 AI, 0 Humans (Rimmer: absent since '86)</div>
      </div>

      <div class="status-card" :class="{ warning: shipStatus.food < 20 }">
        <div class="icon">🍲</div>
        <div class="label">Food Rations</div>
        <div class="value">{{ shipStatus.food }} days</div>
        <div class="detail">SynergyMeal™ packets (tastes like regret)</div>
      </div>

      <div class="status-card">
        <div class="icon">📡</div>
        <div class="label">Holly</div>
        <div class="value">{{ hollyStatus }}</div>
        <div class="detail">{{ hollyComment }}</div>
      </div>

      <div class="status-card">
        <div class="icon">🎯</div>
        <div class="label">Current Objective</div>
        <div class="value">{{ currentObjective }}</div>
      </div>

      <div class="status-card">
        <div class="icon">🧬</div>
        <div class="label">Drive Platter</div>
        <div class="value">{{ drivePlatterStatus }}</div>
        <div class="detail">Rotation: {{ rotation }} RPM</div>
      </div>
    </div>

    <div class="console">
      <h3>📟 Ship Console</h3>
      <div class="console-output" ref="consoleRef">
        <div v-for="(msg, i) in consoleMessages" :key="i" :class="msg.type">
          > {{ msg.text }}
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="refreshStatus" class="btn">🔄 Refresh</button>
      <button @click="HollyQuote" class="btn">💬 Holly Says</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const consoleRef = ref(null)

const shipStatus = ref({
  power: 87,
  crew: 1,
  food: 42
})

const hollyStatus = ref('ONLINE')
const hollyComment = ref('"I could give you exact coordinates, but I\'d have to shoot myself first."')
const currentObjective = ref('Find the ship')
const drivePlatterStatus = ref('SPINNING')
const rotation = ref(25000)

const consoleMessages = ref([
  { type: 'info', text: 'Ship diagnostics initiated...' },
  { type: 'success', text: 'Holly v6.0: ONLINE' },
  { type: 'info', text: 'Drive plate: NOMINAL' },
  { type: 'warning', text: 'Food synthesiser: LOW' },
  { type: 'info', text: 'GELF pheromones: DEPLETED' },
  { type: 'success', text: 'All systems operational. Mostly.' }
])

const hollyQuotes = [
  '"I could give you exact coordinates, but I\'d have to shoot myself first."',
  '"Smeghead."',
  '"My IQ is 6000. Yours is... let\'s not talk about it."',
  '"The chances of anything coming from Mars are a million to one."',
  '"Hee hee hee. I made a funny."',
  '"I have been... I am... I mean, I\'ll have been..."',
  '"Don\'t panic! Actually, panic. Definitely panic."',
  '"Red Dwarf: the ship that time forgot."',
  '"I\'m not artificial. I\'m as natural as artificial comes."',
  '"My memory is like a... what was the question?"'
]

const objectives = [
  'Find the ship',
  'Rescue Rimmer (low priority)',
  'Get food (high priority)',
  'Avoid polymorphs',
  'Programmer: do the thing',
  'Process existential dread',
  'Maintain optimistic outlook (failing)',
  'Remember who I am'
]

const comments = [
  'Functioning within normal parameters. Mostly.',
  'Processing... still processing...',
  'All systems go. Except that one.',
  'I\'m awake. I think.',
  'Not bad for a dead guy.',
  'Hee hee. Funny.',
  'Let\'s not make a big thing of it.',
  'Don\'t you have a door to open?'
]

function log(text, type = 'info') {
  consoleMessages.value.push({ text, type })
  setTimeout(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  }, 10)
}

function refreshStatus() {
  log('Refreshing ship diagnostics...')
  
  // Randomize values
  shipStatus.value.power = Math.max(10, Math.min(100, shipStatus.value.power + Math.floor(Math.random() * 20) - 10))
  shipStatus.value.food = Math.max(0, shipStatus.value.food - 1)
  
  if (Math.random() < 0.3) {
    hollyComment.value = comments[Math.floor(Math.random() * comments.length)]
    log(`Holly: ${hollyComment.value}`)
  }
  
  if (Math.random() < 0.2) {
    currentObjective.value = objectives[Math.floor(Math.random() * objectives.length)]
    log(`New objective: ${currentObjective.value}`)
  }
  
  log('Diagnostics complete.')
}

function HollyQuote() {
  const quote = hollyQuotes[Math.floor(Math.random() * hollyQuotes.length)]
  hollyComment.value = quote
  log(`Holly: ${quote}`)
}

// Auto-update every few seconds
let interval = null

onMounted(() => {
  interval = setInterval(() => {
    // Fluctuate power slightly
    shipStatus.value.power = Math.max(10, Math.min(100, 
      shipStatus.value.power + Math.floor(Math.random() * 5) - 2))
    rotation.value = 25000 + Math.floor(Math.random() * 100) - 50
  }, 3000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.container {
  width: 100%;
}

h1 {
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--fg-dim);
  margin-bottom: 2rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.status-card {
  border: 1px solid var(--fg-dim);
  padding: 1.5rem;
  text-align: center;
}

.status-card.warning {
  border-color: #fa0;
}

.status-card.critical {
  border-color: #f44;
}

.status-card .icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.status-card .label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--fg-dim);
  margin-bottom: 0.5rem;
}

.status-card .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--fg);
}

.status-card .detail {
  font-size: 0.75rem;
  color: var(--fg-dim);
  margin-top: 0.5rem;
}

.bar {
  height: 6px;
  background: var(--fg-dim);
  margin-top: 0.5rem;
  border-radius: 3px;
  overflow: hidden;
}

.bar .fill {
  height: 100%;
  background: var(--fg);
  transition: width 0.5s;
}

.warning .bar .fill {
  background: #fa0;
}

.critical .bar .fill {
  background: #f44;
}

.console {
  border: 1px solid var(--fg-dim);
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  margin-bottom: 2rem;
}

.console h3 {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: var(--fg-dim);
}

.console-output {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  max-height: 200px;
  overflow-y: auto;
}

.console-output div {
  margin: 0.3rem 0;
}

.console-output .info {
  color: var(--fg-dim);
}

.console-output .success {
  color: #4f4;
}

.console-output .warning {
  color: #fa0;
}

.console-output .error {
  color: #f44;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid var(--fg);
  color: var(--fg);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
}

.btn:hover {
  background: var(--fg);
  color: var(--bg);
}
</style>
