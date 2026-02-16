<template>
  <div class="game-container" ref="container" tabindex="0">
    <canvas ref="canvas"></canvas>
    
    <!-- HUD -->
    <div class="hud">
      <div class="score">SCORE: {{ score }}</div>
      <div class="lives">LIVES: {{ '✈'.repeat(lives) }}</div>
      <div class="wave">WAVE {{ wave }}</div>
    </div>
    
    <!-- Game Over -->
    <div class="overlay" v-if="gameOver">
      <h1>GAME OVER</h1>
      <p>Final Score: {{ score }}</p>
      <p>Waves Survived: {{ wave - 1 }}</p>
      <button @click="startGame">PLAY AGAIN</button>
    </div>
    
    <!-- Start Screen -->
    <div class="overlay" v-if="!playing && !gameOver">
      <h1>✈ 1942 STYLE ✈</h1>
      <p>Classic arcade action</p>
      <div class="controls-info">
        <p>MOUSE - Move plane</p>
        <p>LEFT CLICK / HOLD - Fire</p>
        <p>P or ESC - Pause</p>
      </div>
      <button @click="startGame">START GAME</button>
    </div>
    
    <!-- Pause -->
    <div class="overlay" v-if="paused && playing">
      <h1>PAUSED</h1>
      <button @click="paused = false">RESUME</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref(null)
const canvas = ref(null)
let ctx = null
let animationId = null

const score = ref(0)
const lives = ref(3)
const wave = ref(1)
const playing = ref(false)
const gameOver = ref(false)
const paused = ref(false)

const keys = { space: false }
let player = null
let bullets = []
let enemies = []
let enemyBullets = []
let powerups = []
let particles = []
let lastShot = 0
let enemySpawnTimer = 0
let waveTimer = 0
let enemiesThisWave = 0
let enemiesSpawned = 0
let mouseX = 0
let mouseY = 0
let mouseDown = false

class Player {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 40
    this.height = 50
    this.speed = 8
    this.color = '#4af'
    this.invincible = 0
    this.shootDelay = 150
  }
  
  update() {
    // Follow mouse with smooth movement
    const dx = mouseX - this.x
    const dy = mouseY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 5) {
      this.x += (dx / dist) * Math.min(this.speed, dist)
      this.y += (dy / dist) * Math.min(this.speed, dist)
    }
    
    // Bounds
    this.x = Math.max(20, Math.min(canvas.value.width - 20, this.x))
    this.y = Math.max(30, Math.min(canvas.value.height - 30, this.y))
    
    // Invincibility
    if (this.invincible > 0) this.invincible--
  }
  
  draw() {
    if (this.invincible > 0 && Math.floor(Date.now() / 100) % 2 === 0) return
    
    ctx.save()
    ctx.translate(this.x, this.y)
    
    // Wings
    ctx.fillStyle = '#28a'
    ctx.beginPath()
    ctx.moveTo(0, -25)
    ctx.lineTo(-25, 10)
    ctx.lineTo(-20, 10)
    ctx.lineTo(-20, 20)
    ctx.lineTo(20, 20)
    ctx.lineTo(20, 10)
    ctx.lineTo(25, 10)
    ctx.closePath()
    ctx.fill()
    
    // Fuselage
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.ellipse(0, 0, 10, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Cockpit
    ctx.fillStyle = '#8df'
    ctx.beginPath()
    ctx.ellipse(0, -5, 6, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Propeller
    ctx.fillStyle = '#666'
    ctx.fillRect(-20, -35, 40, 4)
    
    ctx.restore()
  }
  
  shoot() {
    const now = Date.now()
    if (now - lastShot > this.shootDelay && mouseDown) {
      bullets.push(new Bullet(this.x - 10, this.y - 30, -12, 0, '#ff0'))
      bullets.push(new Bullet(this.x + 10, this.y - 30, -12, 0, '#ff0'))
      lastShot = now
    }
  }
}

class Bullet {
  constructor(x, y, vx, vy, color) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.width = 4
    this.height = 12
    this.color = color
    this.enemy = false
  }
  
  update() {
    this.x += this.vx
    this.y += this.vy
  }
  
  draw() {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height)
  }
  
  isOffscreen() {
    return this.y < -20 || this.y > canvas.value.height + 20
  }
}

class Enemy {
  constructor(type) {
    this.type = type
    this.x = Math.random() * (canvas.value.width - 100) + 50
    this.y = -50
    
    if (type === 'fighter') {
      this.width = 30
      this.height = 35
      this.speed = 3
      this.hp = 1
      this.score = 100
      this.color = '#c44'
      this.shootChance = 0.01
    } else if (type === 'bomber') {
      this.width = 50
      this.height = 45
      this.speed = 1.5
      this.hp = 4
      this.score = 300
      this.color = '#844'
      this.shootChance = 0.005
    } else if (type === 'ace') {
      this.width = 35
      this.height = 40
      this.speed = 4
      this.hp = 2
      this.score = 500
      this.color = '#c00'
      this.shootChance = 0.02
      this.diveAngle = 0
    }
    
    this.shootTimer = 0
  }
  
  update() {
    this.y += this.speed
    
    if (this.type === 'ace') {
      this.x += Math.sin(this.y / 50) * 2
    }
    
    // Enemy shooting
    if (Math.random() < this.shootChance) {
      enemyBullets.push(new Bullet(this.x, this.y + 20, 0, 6, '#f44'))
    }
  }
  
  draw() {
    ctx.save()
    ctx.translate(this.x, this.y)
    
    if (this.type === 'fighter') {
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.moveTo(0, 20)
      ctx.lineTo(-15, -15)
      ctx.lineTo(0, -10)
      ctx.lineTo(15, -15)
      ctx.closePath()
      ctx.fill()
    } else if (this.type === 'bomber') {
      ctx.fillStyle = this.color
      ctx.fillRect(-25, -15, 50, 30)
      ctx.fillRect(-40, -5, 15, 10)
      ctx.fillRect(25, -5, 15, 10)
    } else if (this.type === 'ace') {
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.moveTo(0, 25)
      ctx.lineTo(-20, -10)
      ctx.lineTo(0, -5)
      ctx.lineTo(20, -10)
      ctx.closePath()
      ctx.fill()
      // Mustache
      ctx.fillStyle = '#fff'
      ctx.fillRect(-8, 5, 16, 3)
    }
    
    ctx.restore()
  }
  
  isOffscreen() {
    return this.y > canvas.value.height + 50
  }
}

class Powerup {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.type = Math.random() > 0.5 ? 'spread' : 'shield'
    this.width = 20
    this.height = 20
    this.vy = 2
  }
  
  update() {
    this.y += this.vy
  }
  
  draw() {
    ctx.fillStyle = this.type === 'spread' ? '#0f0' : '#0ff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.type === 'spread' ? 'S' : 'P', this.x, this.y)
  }
  
  isOffscreen() {
    return this.y > canvas.value.height + 20
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 8
    this.vy = (Math.random() - 0.5) * 8
    this.life = 1
    this.color = color
    this.size = Math.random() * 4 + 2
  }
  
  update() {
    this.x += this.vx
    this.y += this.vy
    this.life -= 0.03
  }
  
  draw() {
    ctx.globalAlpha = this.life
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.size, this.size)
    ctx.globalAlpha = 1
  }
}

const createExplosion = (x, y, color) => {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color))
  }
}

const checkCollisions = () => {
  // Bullets vs Enemies
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j]
      if (Math.abs(b.x - e.x) < e.width/2 + b.width/2 &&
          Math.abs(b.y - e.y) < e.height/2 + b.height/2) {
        e.hp--
        bullets.splice(i, 1)
        
        if (e.hp <= 0) {
          score.value += e.score
          createExplosion(e.x, e.y, e.color)
          
          // Drop powerup
          if (Math.random() < 0.15) {
            powerups.push(new Powerup(e.x, e.y))
          }
          
          enemies.splice(j, 1)
          enemiesSpawned++
        }
        break
      }
    }
  }
  
  // Enemy bullets vs Player
  if (player && player.invincible === 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i]
      if (Math.abs(b.x - player.x) < player.width/2 &&
          Math.abs(b.y - player.y) < player.height/2) {
        playerHit()
        enemyBullets.splice(i, 1)
      }
    }
  }
  
  // Enemies vs Player
  if (player && player.invincible === 0) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      if (Math.abs(e.x - player.x) < (e.width + player.width)/2 - 10 &&
          Math.abs(e.y - player.y) < (e.height + player.height)/2 - 10) {
        playerHit()
        createExplosion(e.x, e.y, e.color)
        enemies.splice(i, 1)
      }
    }
  }
  
  // Powerups vs Player
  if (player) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i]
      if (Math.abs(p.x - player.x) < 30 && Math.abs(p.y - player.y) < 30) {
        if (p.type === 'spread') {
          player.shootDelay = 100
          setTimeout(() => player.shootDelay = 150, 5000)
        } else if (p.type === 'shield') {
          player.invincible = 300
        }
        score.value += 50
        powerups.splice(i, 1)
      }
    }
  }
}

const playerHit = () => {
  createExplosion(player.x, player.y, '#4af')
  lives.value--
  
  if (lives.value <= 0) {
    gameOver.value = true
    playing.value = false
  } else {
    player = new Player(canvas.value.width / 2, canvas.value.height - 80)
    player.invincible = 120
  }
}

const spawnWave = () => {
  waveTimer++
  
  if (enemiesSpawned >= enemiesThisWave && enemies.length === 0) {
    wave.value++
    enemiesThisWave = 5 + wave.value * 3
    enemiesSpawned = 0
    player.shootDelay = Math.max(80, player.shootDelay - 10)
  }
  
  if (enemiesSpawned < enemiesThisWave && enemies.length < 5 + Math.floor(wave.value / 2)) {
    enemySpawnTimer++
    const spawnRate = Math.max(30, 60 - wave.value * 3)
    
    if (enemySpawnTimer > spawnRate) {
      enemySpawnTimer = 0
      let type = 'fighter'
      if (wave.value >= 2 && Math.random() < 0.2) type = 'bomber'
      if (wave.value >= 3 && Math.random() < 0.1) type = 'ace'
      enemies.push(new Enemy(type))
    }
  }
}

const update = () => {
  if (!playing.value || paused.value) return
  
  // Clear
  ctx.fillStyle = '#001'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Draw stars background
  ctx.fillStyle = '#333'
  for (let i = 0; i < 50; i++) {
    const sx = (i * 137 + waveTimer) % canvas.value.width
    const sy = (i * 97 + waveTimer * 2) % canvas.value.height
    ctx.fillRect(sx, sy, 2, 2)
  }
  
  // Player
  if (player) {
    player.update()
    player.shoot()
    player.draw()
  }
  
  // Bullets
  bullets = bullets.filter(b => !b.isOffscreen())
  bullets.forEach(b => { b.update(); b.draw() })
  
  // Enemies
  enemies = enemies.filter(e => !e.isOffscreen())
  enemies.forEach(e => { e.update(); e.draw() })
  
  // Enemy bullets
  enemyBullets = enemyBullets.filter(b => b.y < canvas.value.height + 20)
  enemyBullets.forEach(b => { b.update(); b.draw() })
  
  // Powerups
  powerups = powerups.filter(p => !p.isOffscreen())
  powerups.forEach(p => { p.update(); p.draw() })
  
  // Particles
  particles = particles.filter(p => p.life > 0)
  particles.forEach(p => { p.update(); p.draw() })
  
  // Collisions
  checkCollisions()
  
  // Wave logic
  spawnWave()
  
  animationId = requestAnimationFrame(update)
}

const startGame = () => {
  score.value = 0
  lives.value = 3
  wave.value = 1
  player = new Player(canvas.value.width / 2, canvas.value.height - 80)
  bullets = []
  enemies = []
  enemyBullets = []
  powerups = []
  particles = []
  enemiesThisWave = 8
  enemiesSpawned = 0
  enemySpawnTimer = 0
  gameOver.value = false
  playing.value = true
  paused.value = false
  
  update()
}

const handleKeyDown = (e) => {
  if (e.key === ' ') { keys.space = true; e.preventDefault() }
  if (e.key === 'p' || e.key === 'Escape') paused.value = !paused.value
}

const handleKeyUp = (e) => {
  if (e.key === ' ') keys.space = false
}

const handleMouseMove = (e) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

const handleMouseDown = (e) => {
  if (e.button === 0) mouseDown = true
}

const handleMouseUp = (e) => {
  if (e.button === 0) mouseDown = false
}

const handleResize = () => {
  if (canvas.value) {
    canvas.value.width = window.innerWidth
    canvas.value.height = window.innerHeight
  }
}

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    handleResize()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', handleResize)
    container.value.focus()
    update()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.game-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #001;
  cursor: crosshair;
  outline: none;
}

canvas {
  display: block;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  font-family: 'Courier New', monospace;
  color: #fff;
  font-size: 1.2rem;
  text-shadow: 0 0 10px #fff;
  pointer-events: none;
}

.score { color: #ff0; }
.lives { color: #4af; }
.wave { color: #f44; }

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.overlay h1 {
  font-size: 4rem;
  color: #f44;
  text-shadow: 0 0 20px #f44;
  margin: 0;
}

.overlay p {
  font-size: 1.5rem;
  margin: 0.5rem 0;
}

.controls-info {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #444;
  background: rgba(255, 255, 255, 0.05);
}

.controls-info p {
  font-size: 1rem;
  color: #888;
}

button {
  margin-top: 2rem;
  padding: 1rem 3rem;
  font-size: 1.5rem;
  font-family: 'Courier New', monospace;
  background: #f44;
  color: #fff;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.2s;
}

button:hover {
  background: #f66;
  transform: scale(1.05);
}
</style>
