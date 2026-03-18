<template>
  <div class="game-container" ref="container">
    <div class="hud">
      <div class="hud-left">
        <div class="stat">🏴‍☠️ HP: {{ hp }}/100</div>
        <div class="stat">💰 Gold: {{ gold }}</div>
        <div class="stat">💨 Wind: {{ windDirection }} {{ windSpeed.toFixed(1) }} kn</div>
      </div>
      <div class="hud-center">
        <div class="message" v-if="message">{{ message }}</div>
      </div>
      <div class="hud-right">
        <div class="stat">💣 Cannon: {{ cannonCooldown > 0 ? cannonCooldown.toFixed(1) + 's' : 'READY' }}</div>
        <div class="stat">⚓ Target: {{ enemyShip.hp > 0 ? 'Enemy Ship' : (kraken.hp > 0 ? 'KRAKEN' : 'Victory!') }}</div>
      </div>
    </div>

    <canvas ref="canvas"></canvas>

    <div class="controls">
      <div class="control-hint">🖱️ Mouse to steer | Click to fire cannon | Avoid rocks & kraken!</div>
    </div>

    <div class="overlay" v-if="gameState === 'start'">
      <div class="title">🏴‍☠️ Pirates of the Burning Sea</div>
      <p>Navigate the Caribbean. Fight the navy. Survive the Kraken.</p>
      <div class="instructions">
        <p>🖱️ <strong>Mouse</strong> - Steer your ship</p>
        <p>🖱️ <strong>Click</strong> - Fire cannons</p>
        <p>💨 <strong>Wind</strong> - Sail with the wind for speed, against it for control</p>
        <p>🪨 <strong>Avoid</strong> - Islands, rocks, and the Kraken</p>
        <p>⚔️ <strong>Defeat</strong> - The enemy ship, then face the Kraken</p>
      </div>
      <button @click="startGame">⚔️ SET SALE!</button>
    </div>

    <div class="overlay" v-if="gameState === 'gameover'">
      <div class="title">💀 {{ victory ? 'VICTORY!' : 'GAME OVER' }}</div>
      <p v-if="victory">You defeated the enemy and survived the Kraken!</p>
      <p v-else>Your ship rests at the bottom of the sea.</p>
      <p>Gold collected: {{ gold }}</p>
      <button @click="startGame">⚔️ SAIL AGAIN</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const container = ref(null)
const canvas = ref(null)
let scene, camera, renderer
let animationId = null

// Game state
const gameState = ref('start') // start, playing, gameover
const victory = ref(false)
const hp = ref(100)
const gold = ref(0)
const message = ref('')
const cannonCooldown = ref(0)

// Ship state
let playerShip
const playerPos = ref({ x: 0, z: 0 })
let playerAngle = 0
let playerSpeed = 0

// Wind
let windAngle = 0
const windSpeed = ref(3)
let windChangeTimer = 0

// Projectiles
let cannonballs = []

// Enemy ship
const enemyShip = ref({ x: 100, z: -100, hp: 100, angle: 0 })
let enemyShipMesh

// Kraken
const kraken = ref({ x: 0, z: 0, hp: 150, angle: 0, tentacles: [] })
let krakenMesh
let krakenActive = false
let krakenTimer = 0

// Islands and rocks
let islands = []
let rocks = []

// Ocean
let ocean

const showMessage = (msg, duration = 3000) => {
  message.value = msg
  setTimeout(() => {
    if (message.value === msg) message.value = ''
  }, duration)
}

function init() {
  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87CEEB)
  scene.fog = new THREE.Fog(0x87CEEB, 50, 300)

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 30, -40)
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xffffcc, 1)
  sunLight.position.set(50, 100, 50)
  scene.add(sunLight)

  // Ocean
  createOcean()

  // Sky
  createSky()

  // Player ship
  createPlayerShip()

  // Islands
  createIslands()

  // Initial enemy
  spawnEnemyShip()

  // Events
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClick)
}

function createOcean() {
  const oceanGeometry = new THREE.PlaneGeometry(500, 500, 100, 100)
  const oceanMaterial = new THREE.MeshPhongMaterial({
    color: 0x006994,
    shininess: 100,
    transparent: true,
    opacity: 0.9
  })
  ocean = new THREE.Mesh(oceanGeometry, oceanMaterial)
  ocean.rotation.x = -Math.PI / 2
  ocean.position.y = 0
  scene.add(ocean)

  // Add waves
  const waveGeometry = new THREE.PlaneGeometry(500, 500, 50, 50)
  const waveMaterial = new THREE.MeshPhongMaterial({
    color: 0x00aadd,
    transparent: true,
    opacity: 0.3,
    wireframe: true
  })
  const waves = new THREE.Mesh(waveGeometry, waveMaterial)
  waves.rotation.x = -Math.PI / 2
  waves.position.y = 0.5
  scene.add(waves)
}

function createSky() {
  // Sun
  const sunGeometry = new THREE.CircleGeometry(10, 32)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const sun = new THREE.Mesh(sunGeometry, sunMaterial)
  sun.position.set(100, 80, -100)
  sun.lookAt(0, 0, 0)
  scene.add(sun)

  // Clouds
  for (let i = 0; i < 20; i++) {
    const cloudGroup = new THREE.Group()
    const cloudSize = Math.random() * 5 + 3
    
    for (let j = 0; j < 5; j++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(cloudSize + Math.random() * 2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      )
      puff.position.set(
        (Math.random() - 0.5) * cloudSize * 2,
        (Math.random() - 0.5) * cloudSize,
        (Math.random() - 0.5) * cloudSize
      )
      cloudGroup.add(puff)
    }
    
    cloudGroup.position.set(
      (Math.random() - 0.5) * 300,
      40 + Math.random() * 20,
      (Math.random() - 0.5) * 300
    )
    scene.add(cloudGroup)
  }
}

function createPlayerShip() {
  playerShip = new THREE.Group()

  // Hull
  const hullGeometry = new THREE.BoxGeometry(3, 2, 8)
  const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 })
  const hull = new THREE.Mesh(hullGeometry, hullMaterial)
  hull.position.y = 1
  playerShip.add(hull)

  // Deck
  const deckGeometry = new THREE.BoxGeometry(2.5, 0.3, 7)
  const deckMaterial = new THREE.MeshPhongMaterial({ color: 0xDEB887 })
  const deck = new THREE.Mesh(deckGeometry, deckMaterial)
  deck.position.y = 2.2
  playerShip.add(deck)

  // Mast
  const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10)
  const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 })
  const mast = new THREE.Mesh(mastGeometry, mastMaterial)
  mast.position.y = 7
  playerShip.add(mast)

  // Sail
  const sailGeometry = new THREE.PlaneGeometry(5, 7)
  const sailMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, side: THREE.DoubleSide })
  const sail = new THREE.Mesh(sailGeometry, sailMaterial)
  sail.position.set(0, 8, 0)
  sail.rotation.y = Math.PI / 2
  playerShip.add(sail)

  // Flag
  const flagGeometry = new THREE.PlaneGeometry(1.5, 1)
  const flagMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const flag = new THREE.Mesh(flagGeometry, flagMaterial)
  flag.position.set(0, 12, 0)
  flag.rotation.y = Math.PI / 2
  playerShip.add(flag)

  // Cannon ports
  for (let i = -1; i <= 1; i++) {
    const portGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3)
    const portMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const portL = new THREE.Mesh(portGeometry, portMaterial)
    portL.position.set(-1.5, 1.5, i * 2)
    portL.rotation.z = Math.PI / 2
    playerShip.add(portL)
    
    const portR = new THREE.Mesh(portGeometry, portMaterial)
    portR.position.set(1.5, 1.5, i * 2)
    portR.rotation.z = Math.PI / 2
    playerShip.add(portR)
  }

  playerShip.position.set(0, 0, 0)
  scene.add(playerShip)
}

function createIslands() {
  // Create 5 islands
  for (let i = 0; i < 5; i++) {
    const islandGroup = new THREE.Group()
    
    const angle = (i / 5) * Math.PI * 2
    const dist = 80 + Math.random() * 60
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    
    // Sand
    const sandGeometry = new THREE.ConeGeometry(8 + Math.random() * 5, 4, 8)
    const sandMaterial = new THREE.MeshPhongMaterial({ color: 0xF4A460 })
    const sand = new THREE.Mesh(sandGeometry, sandMaterial)
    sand.position.y = 1
    islandGroup.add(sand)
    
    // Palm tree
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4)
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 4
    islandGroup.add(trunk)
    
    const leavesGeometry = new THREE.ConeGeometry(2, 3, 8)
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 })
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
    leaves.position.y = 6
    islandGroup.add(leaves)
    
    islandGroup.position.set(x, 0, z)
    islands.push({ x, z, radius: 10, mesh: islandGroup })
    scene.add(islandGroup)
  }
  
  // Create rocks
  for (let i = 0; i < 15; i++) {
    const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2)
    const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x696969 })
    const rock = new THREE.Mesh(rockGeometry, rockMaterial)
    
    const angle = Math.random() * Math.PI * 2
    const dist = 20 + Math.random() * 100
    rock.position.set(
      Math.cos(angle) * dist,
      0.5,
      Math.sin(angle) * dist
    )
    rock.rotation.set(Math.random(), Math.random(), Math.random())
    
    rocks.push({ x: rock.position.x, z: rock.position.z, radius: 2, mesh: rock })
    scene.add(rock)
  }
}

function spawnEnemyShip() {
  if (enemyShipMesh) scene.remove(enemyShipMesh)
  
  enemyShipMesh = new THREE.Group()
  
  // Red hull (British navy)
  const hullGeometry = new THREE.BoxGeometry(3.5, 2.5, 10)
  const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8B0000 })
  const hull = new THREE.Mesh(hullGeometry, hullMaterial)
  hull.position.y = 1.5
  enemyShipMesh.add(hull)
  
  // White sail
  const sailGeometry = new THREE.PlaneGeometry(6, 8)
  const sailMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  const sail = new THREE.Mesh(sailGeometry, sailMaterial)
  sail.position.set(0, 9, 0)
  sail.rotation.y = Math.PI / 2
  enemyShipMesh.add(sail)
  
  // Flag
  const flagGeometry = new THREE.PlaneGeometry(2, 1.5)
  const flagMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
  const flag = new THREE.Mesh(flagGeometry, flagMaterial)
  flag.position.set(0, 14, 0)
  flag.rotation.y = Math.PI / 2
  enemyShipMesh.add(flag)
  
  enemyShipMesh.position.set(enemyShip.value.x, 0, enemyShip.value.z)
  scene.add(enemyShipMesh)
}

function createKraken() {
  if (krakenMesh) scene.remove(krakenMesh)
  
  krakenMesh = new THREE.Group()
  
  // Body
  const bodyGeometry = new THREE.SphereGeometry(8, 16, 16)
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2F4F4F })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.scale.y = 0.5
  body.position.y = 2
  krakenMesh.add(body)
  
  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(1.5, 8, 8)
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const eyeL = new THREE.Mesh(eyeGeometry, eyeMaterial)
  eyeL.position.set(-3, 3, 5)
  krakenMesh.add(eyeL)
  const eyeR = new THREE.Mesh(eyeGeometry, eyeMaterial)
  eyeR.position.set(3, 3, 5)
  krakenMesh.add(eyeR)
  
  // Tentacles
  kraken.value.tentacles = []
  for (let i = 0; i < 8; i++) {
    const tentGeometry = new THREE.CylinderGeometry(0.5, 1.5, 15, 8)
    const tentMaterial = new THREE.MeshPhongMaterial({ color: 0x2F4F4F })
    const tent = new THREE.Mesh(tentGeometry, tentMaterial)
    const angle = (i / 8) * Math.PI * 2
    tent.position.set(Math.cos(angle) * 5, 0, Math.sin(angle) * 5)
    tent.rotation.x = Math.PI / 4
    tent.rotation.z = Math.cos(angle) * 0.5
    krakenMesh.add(tent)
    kraken.value.tentacles.push(tent)
  }
  
  krakenMesh.position.set(0, 0, 0)
  scene.add(krakenMesh)
  krakenActive = true
  kraken.value.hp = 150
  
  showMessage('💀 THE KRAKEN AWAKENS!', 5000)
}

function fireCannon() {
  if (cannonCooldown.value > 0) return
  
  cannonCooldown.value = 2
  
  // Create cannonball
  const ballGeometry = new THREE.SphereGeometry(0.5, 8, 8)
  const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const ball = new THREE.Mesh(ballGeometry, ballMaterial)
  
  const angle = playerAngle
  ball.position.set(
    playerPos.value.x + Math.sin(angle) * 5,
    2,
    playerPos.value.z + Math.cos(angle) * 5
  )
  
  const speed = 30
  cannonballs.push({
    mesh: ball,
    vx: Math.sin(angle) * speed,
    vz: Math.cos(angle) * speed,
    life: 3
  })
  
  scene.add(ball)
}

function updateCannonballs(dt) {
  for (let i = cannonballs.length - 1; i >= 0; i--) {
    const ball = cannonballs[i]
    ball.mesh.position.x += ball.vx * dt
    ball.mesh.position.z += ball.vz * dt
    ball.life -= dt
    
    // Check collision with enemy
    if (enemyShip.value.hp > 0) {
      const dx = ball.mesh.position.x - enemyShip.value.x
      const dz = ball.mesh.position.z - enemyShip.value.z
      if (Math.sqrt(dx * dx + dz * dz) < 8) {
        enemyShip.value.hp -= 10
        showMessage('💥 Hit enemy ship!')
        scene.remove(ball.mesh)
        cannonballs.splice(i, 1)
        continue
      }
    }
    
    // Check collision with kraken
    if (krakenActive && kraken.value.hp > 0) {
      const dx = ball.mesh.position.x - kraken.value.x
      const dz = ball.mesh.position.z - kraken.value.z
      if (Math.sqrt(dx * dx + dz * dz) < 10) {
        kraken.value.hp -= 5
        showMessage('💥 Hit the Kraken!')
        if (kraken.value.hp <= 0) {
          victory.value = true
          gameState.value = 'gameover'
        }
        scene.remove(ball.mesh)
        cannonballs.splice(i, 1)
        continue
      }
    }
    
    // Check collision with player
    const pdx = ball.mesh.position.x - playerPos.value.x
    const pdz = ball.mesh.position.z - playerPos.value.z
    if (Math.sqrt(pdx * pdx + pdz * pdz) < 3) {
      hp.value -= 10
      showMessage('💥 You were hit!')
      scene.remove(ball.mesh)
      cannonballs.splice(i, 1)
      if (hp.value <= 0) {
        gameState.value = 'gameover'
      }
      continue
    }
    
    if (ball.life <= 0) {
      scene.remove(ball.mesh)
      cannonballs.splice(i, 1)
    }
  }
}

let mouseX = 0

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
}

function onClick() {
  if (gameState.value === 'playing') {
    fireCannon()
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function getWindDirection() {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx = Math.round(((windAngle + Math.PI) / (Math.PI * 2)) * 8) % 8
  return dirs[idx]
}

function update(dt) {
  if (gameState.value !== 'playing') return
  
  // Update wind
  windChangeTimer -= dt
  if (windChangeTimer <= 0) {
    windAngle += (Math.random() - 0.5) * 0.5
    windSpeed.value = 2 + Math.random() * 4
    windChangeTimer = 5 + Math.random() * 5
  }
  
  // Player movement
  const targetAngle = mouseX * Math.PI * 0.8
  playerAngle += (targetAngle - playerAngle) * 2 * dt
  
  // Wind effect on speed
  const windDir = Math.cos(windAngle - playerAngle)
  const windBonus = windDir > 0 ? windDir * windSpeed.value * 0.5 : windDir * windSpeed.value * 0.2
  playerSpeed = 8 + windBonus
  
  playerPos.value.x += Math.sin(playerAngle) * playerSpeed * dt
  playerPos.value.z += Math.cos(playerAngle) * playerSpeed * dt
  
  // Boundary
  const maxDist = 150
  if (Math.sqrt(playerPos.value.x ** 2 + playerPos.value.z ** 2) > maxDist) {
    const angle = Math.atan2(playerPos.value.x, playerPos.value.z)
    playerPos.value.x = Math.sin(angle) * maxDist
    playerPos.value.z = Math.cos(angle) * maxDist
    showMessage('⚠️ Approaching edge of map!')
  }
  
  // Update ship mesh
  playerShip.position.x = playerPos.value.x
  playerShip.position.z = playerPos.value.z
  playerShip.rotation.y = playerAngle
  
  // Camera follow
  camera.position.x = playerPos.value.x - Math.sin(playerAngle) * 40
  camera.position.z = playerPos.value.z - Math.cos(playerAngle) * 40
  camera.position.y = 30
  camera.lookAt(playerPos.value.x, 0, playerPos.value.z)
  
  // Island collision
  for (const island of islands) {
    const dx = playerPos.value.x - island.x
    const dz = playerPos.value.z - island.z
    if (Math.sqrt(dx * dx + dz * dz) < island.radius + 3) {
      hp.value -= 20 * dt
      showMessage('🪨 Hit an island!')
    }
  }
  
  // Rock collision
  for (const rock of rocks) {
    const dx = playerPos.value.x - rock.x
    const dz = playerPos.value.z - rock.z
    if (Math.sqrt(dx * dx + dz * dz) < rock.radius + 2) {
      hp.value -= 30 * dt
      showMessage('🪨 Hit a rock!')
    }
  }
  
  if (hp.value <= 0) {
    gameState.value = 'gameover'
  }
  
  // Enemy ship AI
  if (enemyShip.value.hp > 0) {
    // Move toward player
    const dx = playerPos.value.x - enemyShip.value.x
    const dz = playerPos.value.z - enemyShip.value.z
    const targetAngle = Math.atan2(dx, dz)
    enemyShip.value.angle += (targetAngle - enemyShip.value.angle) * dt
    
    enemyShip.value.x += Math.sin(enemyShip.value.angle) * 6 * dt
    enemyShip.value.z += Math.cos(enemyShip.value.angle) * 6 * dt
    
    enemyShipMesh.position.x = enemyShip.value.x
    enemyShipMesh.position.z = enemyShip.value.z
    enemyShipMesh.rotation.y = enemyShip.value.angle
    
    // Collision with player
    const edx = playerPos.value.x - enemyShip.value.x
    const edz = playerPos.value.z - enemyShip.value.z
    if (Math.sqrt(edx * edx + edz * edz) < 6) {
      hp.value -= 10 * dt
      showMessage('⚔️ Rammed by enemy!')
    }
  } else if (enemyShipMesh) {
    // Sunk!
    scene.remove(enemyShipMesh)
    enemyShipMesh = null
    gold.value += 100
    showMessage('💰 Enemy ship sunk! +100 Gold')
    
    // Spawn kraken after delay
    setTimeout(() => {
      if (gameState.value === 'playing') {
        createKraken()
      }
    }, 3000)
  }
  
  // Kraken AI
  if (krakenActive && kraken.value.hp > 0) {
    // Move toward player
    const dx = playerPos.value.x - kraken.value.x
    const dz = playerPos.value.z - kraken.value.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist > 20) {
      kraken.value.x += (dx / dist) * 5 * dt
      kraken.value.z += (dz / dist) * 5 * dt
    }
    
    // Tentacle animation
    const time = Date.now() * 0.001
    kraken.value.tentacles.forEach((tent, i) => {
      tent.rotation.x = Math.PI / 4 + Math.sin(time * 2 + i) * 0.3
    })
    
    krakenMesh.position.x = kraken.value.x
    krakenMesh.position.z = kraken.value.z
    
    // Collision with player
    if (dist < 12) {
      hp.value -= 15 * dt
      showMessage('💀 Kraken attacking!')
    }
  }
  
  // Update cannonballs
  updateCannonballs(dt)
  
  // Cannon cooldown
  if (cannonCooldown.value > 0) {
    cannonCooldown.value -= dt
  }
  
  // Animate ocean waves
  if (ocean) {
    ocean.position.y = Math.sin(Date.now() * 0.001) * 0.5
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)
  
  const dt = 1 / 60
  update(dt)
  
  renderer.render(scene, camera)
}

function startGame() {
  // Reset
  hp.value = 100
  gold.value = 0
  cannonCooldown.value = 0
  playerPos.value = { x: 0, z: 0 }
  playerAngle = 0
  
  enemyShip.value = { x: 100, z: -100, hp: 100, angle: 0 }
  spawnEnemyShip()
  
  if (krakenMesh) {
    scene.remove(krakenMesh)
    krakenMesh = null
  }
  krakenActive = false
  kraken.value = { x: 0, z: 0, hp: 150, angle: 0, tentacles: [] }
  
  // Clear cannonballs
  cannonballs.forEach(b => scene.remove(b.mesh))
  cannonballs = []
  
  victory.value = false
  gameState.value = 'playing'
  showMessage('⚔️ Battle commenced!', 3000)
}

onMounted(() => {
  init()
  animate()
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('click', onClick)
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #006994;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  color: #fff;
  font-family: 'Courier New', monospace;
  z-index: 10;
}

.hud-left, .hud-right {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat {
  font-size: 1rem;
  text-shadow: 1px 1px 2px #000;
}

.message {
  font-size: 1.2rem;
  color: #ffd700;
  text-shadow: 1px 1px 2px #000;
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.controls {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.7);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  z-index: 10;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  z-index: 20;
  font-family: 'Courier New', monospace;
}

.title {
  font-size: 3rem;
  color: #ffd700;
  text-shadow: 2px 2px 4px #000;
  margin-bottom: 1rem;
}

.overlay p {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.instructions {
  background: rgba(255,255,255,0.1);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0 2rem;
}

.instructions p {
  font-size: 1rem;
  margin: 0.5rem 0;
}

.overlay button {
  padding: 1rem 3rem;
  font-size: 1.5rem;
  background: #8B0000;
  color: #fff;
  border: 2px solid #ffd700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
}

.overlay button:hover {
  background: #a00000;
  transform: scale(1.05);
}
</style>
