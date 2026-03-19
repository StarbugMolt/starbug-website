<template>
  <div class="game-container" ref="container">
    <div class="hud">
      <div class="hud-left">
        <div class="stat">🏴‍☠️ HP: {{ hp }}/100</div>
        <div class="stat">💰 Gold: {{ gold }}</div>
        <div class="stat">💨 Wind: {{ windDirection }} {{ windSpeed.toFixed(1) }} kn</div>
        <div class="stat">⚓ Speed: {{ playerSpeed?.toFixed(1) || '0' }} kn</div>
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
      <div class="control-hint">🎯 Click to lock mouse | Move to steer | Click to fire broadsides | Avoid rocks & kraken!</div>
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
const playerSpeed = ref(0)

// Ship state
let playerShip
const playerPos = ref({ x: 0, z: 0 })
let playerAngle = 0

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
  window.addEventListener('pointerlockchange', onPointerLockChange)
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

  // Main mast
  const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10)
  const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 })
  const mast = new THREE.Mesh(mastGeometry, mastMaterial)
  mast.position.y = 7
  playerShip.add(mast)

  // Fore mast (front)
  const foreMastGeometry = new THREE.CylinderGeometry(0.15, 0.15, 6)
  const foreMast = new THREE.Mesh(foreMastGeometry, mastMaterial)
  foreMast.position.set(0, 5, -2.5)
  playerShip.add(foreMast)

  // === WHITE SAILS THAT REACT TO WIND ===
  // Main sail - white, billows with wind
  const sailGeometry = new THREE.PlaneGeometry(5, 7, 10, 14)
  const sailMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  })
  const sail = new THREE.Mesh(sailGeometry, sailMaterial)
  sail.position.set(0, 8, 0)
  sail.rotation.y = Math.PI / 2
  sail.userData.isSail = true
  sail.userData.originalVertices = sailGeometry.attributes.position.array.slice()
  playerShip.add(sail)

  // Fore sail (front jib) - white
  const foreSailGeometry = new THREE.PlaneGeometry(3, 4, 6, 8)
  const foreSailMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  })
  const foreSail = new THREE.Mesh(foreSailGeometry, foreSailMaterial)
  foreSail.position.set(0, 5, -2)
  foreSail.rotation.y = Math.PI / 2
  foreSail.userData.isSail = true
  foreSail.userData.originalVertices = foreSailGeometry.attributes.position.array.slice()
  playerShip.add(foreSail)

  // Mizzen sail (back) - white
  const mizzenGeometry = new THREE.PlaneGeometry(2.5, 3.5, 6, 8)
  const mizzenMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  })
  const mizzen = new THREE.Mesh(mizzenGeometry, mizzenMaterial)
  mizzen.position.set(0, 6, 2.5)
  mizzen.rotation.y = Math.PI / 2
  mizzen.userData.isSail = true
  mizzen.userData.originalVertices = mizzenGeometry.attributes.position.array.slice()
  playerShip.add(mizzen)

  // Store sails for wind animation
  playerShip.userData.sails = [sail, foreSail, mizzen]

  // Pirate flag
  const flagGeometry = new THREE.PlaneGeometry(1.5, 1)
  const flagMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const flag = new THREE.Mesh(flagGeometry, flagMaterial)
  flag.position.set(0, 12, 0)
  flag.rotation.y = Math.PI / 2
  playerShip.add(flag)

  // Cannon ports - left side
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
  
  // Side cannons (port) - 3 cannons
  const sideCannonGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.2)
  const sideCannonMat = new THREE.MeshPhongMaterial({ color: 0x333333 })
  
  for (let i = -1; i <= 1; i++) {
    const cannon = new THREE.Mesh(sideCannonGeom, sideCannonMat)
    cannon.position.set(-1.6, 1.8, i * 2)
    cannon.rotation.z = Math.PI / 2
    playerShip.add(cannon)
  }
  
  // Starboard side cannons - 3 cannons
  for (let i = -1; i <= 1; i++) {
    const cannon = new THREE.Mesh(sideCannonGeom, sideCannonMat)
    cannon.position.set(1.6, 1.8, i * 2)
    cannon.rotation.z = Math.PI / 2
    playerShip.add(cannon)
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
  
  // Main mast
  const mastGeometry = new THREE.CylinderGeometry(0.25, 0.25, 12)
  const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 })
  const mast = new THREE.Mesh(mastGeometry, mastMaterial)
  mast.position.y = 8
  enemyShipMesh.add(mast)
  
  // Fore mast
  const foreMastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 7)
  const foreMast = new THREE.Mesh(foreMastGeometry, mastMaterial)
  foreMast.position.set(0, 6, -3)
  enemyShipMesh.add(foreMast)
  
  // White sails (navy ships have white sails)
  const sailGeometry = new THREE.PlaneGeometry(6, 8, 10, 14)
  const sailMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const sail = new THREE.Mesh(sailGeometry, sailMaterial)
  sail.position.set(0, 9, 0)
  sail.rotation.y = Math.PI / 2
  sail.userData.isSail = true
  sail.userData.originalVertices = sailGeometry.attributes.position.array.slice()
  enemyShipMesh.add(sail)
  
  // Fore sail
  const foreSailGeometry = new THREE.PlaneGeometry(3.5, 4.5, 6, 8)
  const foreSailMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const foreSail = new THREE.Mesh(foreSailGeometry, foreSailMaterial)
  foreSail.position.set(0, 6, -2.5)
  foreSail.rotation.y = Math.PI / 2
  foreSail.userData.isSail = true
  foreSail.userData.originalVertices = foreSailGeometry.attributes.position.array.slice()
  enemyShipMesh.add(foreSail)
  
  // Store sails for animation
  enemyShipMesh.userData.sails = [sail, foreSail]
  
  // Flag - British Union Jack
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
  
  cannonCooldown.value = 1.5
  
  // Fire from BOTH sides - 3 cannons per side (port and starboard)
  const angle = playerAngle
  
  // Fire from 3 positions on each side: front, middle, back
  const sidePositions = [-2, 0, 2] // z-offset positions
  
  for (let side = -1; side <= 1; side += 2) {
    for (const zOffset of sidePositions) {
      const ballGeometry = new THREE.SphereGeometry(0.35, 8, 8)
      const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
      const ball = new THREE.Mesh(ballGeometry, ballMaterial)
      
      // Fire from sides of the ship at different z positions
      const sideOffset = side * 2 // Distance from center to side
      ball.position.set(
        playerPos.value.x + Math.sin(angle) * zOffset + Math.sin(angle + side * Math.PI / 2) * sideOffset,
        2,
        playerPos.value.z + Math.cos(angle) * zOffset + Math.cos(angle + side * Math.PI / 2) * sideOffset
      )
      
      const speed = 40
      // Fire perpendicular to ship (outward from sides)
      cannonballs.push({
        mesh: ball,
        vx: Math.sin(angle + side * Math.PI / 2) * speed,
        vz: Math.cos(angle + side * Math.PI / 2) * speed,
        life: 3
      })
      
      scene.add(ball)
    }
  }
  
  showMessage('💥 BROADSIDE FIRE!', 1000)
}

function fireEnemyCannon() {
  if (enemyShip.value.hp <= 0) return
  
  const angle = enemyShip.value.angle
  
  // Fire from both sides
  for (let side = -1; side <= 1; side += 2) {
    const ballGeometry = new THREE.SphereGeometry(0.35, 8, 8)
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const ball = new THREE.Mesh(ballGeometry, ballMaterial)
    
    const sideOffset = side * 2
    ball.position.set(
      enemyShip.value.x + Math.sin(angle) * sideOffset,
      2,
      enemyShip.value.z + Math.cos(angle) * sideOffset
    )
    
    const speed = 30
    cannonballs.push({
      mesh: ball,
      vx: Math.sin(angle + side * Math.PI / 2) * speed,
      vz: Math.cos(angle + side * Math.PI / 2) * speed,
      life: 3,
      isEnemy: true
    })
    
    scene.add(ball)
  }
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
    
    // Check collision with player (from both player and enemy cannons)
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
let pointerLocked = false

function onMouseMove(e) {
  if (pointerLocked) {
    // Use movementX for continuous rotation when pointer is locked
    mouseX += e.movementX * 0.005
    mouseX = Math.max(-1, Math.min(1, mouseX))
  } else {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1
  }
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === container.value
  if (pointerLocked) {
    showMessage('🎯 Pointer locked - move mouse to steer', 2000)
  }
}

function requestPointerLock() {
  if (container.value && !pointerLocked) {
    container.value.requestPointerLock()
  }
}

function onClick() {
  if (gameState.value === 'playing') {
    // Request pointer lock on first click if not locked
    if (!pointerLocked && container.value) {
      requestPointerLock()
    }
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

// Animate sails based on wind
function animateSails(dt) {
  if (!playerShip || !playerShip.userData.sails) return
  
  const time = Date.now() * 0.001
  const windStrength = windSpeed.value / 6 // Normalize 0-1
  
  playerShip.userData.sails.forEach((sail, index) => {
    if (!sail.userData.originalVertices) return
    
    const positions = sail.geometry.attributes.position
    const original = sail.userData.originalVertices
    
    for (let i = 0; i < positions.count; i++) {
      const x = original[i * 3]
      const y = original[i * 3 + 1]
      
      // Billowing effect - center of sail bulges out more
      const bulge = Math.abs(x) / 2.5 * windStrength
      const wave = Math.sin(time * 3 + y * 0.5 + index) * 0.3 * windStrength
      
      positions.array[i * 3 + 2] = bulge + wave
    }
    
    positions.needsUpdate = true
  })
}

// Check if a position would collide with obstacles
function checkObstacleCollision(x, z, radius) {
  // Check islands
  for (const island of islands) {
    const dx = x - island.x
    const dz = z - island.z
    if (Math.sqrt(dx * dx + dz * dz) < island.radius + radius) {
      return true
    }
  }
  
  // Check rocks
  for (const rock of rocks) {
    const dx = x - rock.x
    const dz = z - rock.z
    if (Math.sqrt(dx * dx + dz * dz) < rock.radius + radius) {
      return true
    }
  }
  
  return false
}

function update(dt) {
  if (gameState.value !== 'playing') return
  
  // Update wind
  windChangeTimer -= dt
  if (windChangeTimer <= 0) {
    windAngle += (Math.random() - 0.5) * 0.5
    windSpeed.value = 2 + Math.random() * 4
    windChangeTimer = 5 + Math.random() * 5
    showMessage(`💨 Wind shifted to ${getWindDirection()}!`, 2000)
  }
  
  // Animate sails
  animateSails(dt)
  
  // Player movement
  const targetAngle = mouseX * Math.PI * 0.8
  playerAngle += (targetAngle - playerAngle) * 2 * dt
  
  // Wind effect on speed - MUCH more noticeable now!
  const windDir = Math.cos(windAngle - playerAngle)
  // With wind behind: fast (up to 20). Against wind: slow (down to 3)
  const windBonus = windDir * windSpeed.value * 3
  playerSpeed.value = Math.max(3, 12 + windBonus)
  
  // Show wind speed indicator in HUD
  const speedPercent = Math.round((playerSpeed.value / 20) * 100)
  
  playerPos.value.x += Math.sin(playerAngle) * playerSpeed.value * dt
  playerPos.value.z += Math.cos(playerAngle) * playerSpeed.value * dt
  
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
  
  // Enemy ship AI - with obstacle avoidance and intelligence
  if (enemyShip.value.hp > 0) {
    // Calculate direction to player
    const dx = playerPos.value.x - enemyShip.value.x
    const dz = playerPos.value.z - enemyShip.value.z
    const distToPlayer = Math.sqrt(dx * dx + dz * dz)
    const targetAngle = Math.atan2(dx, dz)
    
    // Check for obstacles ahead
    const lookAheadX = enemyShip.value.x + Math.sin(enemyShip.value.angle) * 15
    const lookAheadZ = enemyShip.value.z + Math.cos(enemyShip.value.angle) * 15
    const obstacleAhead = checkObstacleCollision(lookAheadX, lookAheadZ, 5)
    
    let moveAngle = targetAngle
    
    // If obstacle ahead, try to steer around it
    if (obstacleAhead) {
      // Turn left or right to avoid
      const leftCheck = checkObstacleCollision(
        enemyShip.value.x + Math.sin(enemyShip.value.angle + 0.5) * 10,
        enemyShip.value.z + Math.cos(enemyShip.value.angle + 0.5) * 10,
        5
      )
      const rightCheck = checkObstacleCollision(
        enemyShip.value.x + Math.sin(enemyShip.value.angle - 0.5) * 10,
        enemyShip.value.z + Math.cos(enemyShip.value.angle - 0.5) * 10,
        5
      )
      
      if (!leftCheck && rightCheck) {
        moveAngle = enemyShip.value.angle + 0.8 * dt // Turn left
      } else if (!rightCheck && leftCheck) {
        moveAngle = enemyShip.value.angle - 0.8 * dt // Turn right
      } else if (!leftCheck && !rightCheck) {
        // Both clear, pick random
        moveAngle = enemyShip.value.angle + (Math.random() > 0.5 ? 0.8 : -0.8) * dt
      } else {
        // Full reverse
        moveAngle = enemyShip.value.angle + Math.PI
      }
    }
    
    // Smoothly turn toward target
    enemyShip.value.angle += (moveAngle - enemyShip.value.angle) * dt * 2
    
    // Move at variable speed
    const enemySpeed = obstacleAhead ? 3 : 6
    enemyShip.value.x += Math.sin(enemyShip.value.angle) * enemySpeed * dt
    enemyShip.value.z += Math.cos(enemyShip.value.angle) * enemySpeed * dt
    
    // Keep in bounds
    const maxDist = 140
    if (Math.sqrt(enemyShip.value.x ** 2 + enemyShip.value.z ** 2) > maxDist) {
      const angle = Math.atan2(enemyShip.value.x, enemyShip.value.z)
      enemyShip.value.x = Math.sin(angle) * maxDist
      enemyShip.value.z = Math.cos(angle) * maxDist
    }
    
    // Update mesh
    enemyShipMesh.position.x = enemyShip.value.x
    enemyShipMesh.position.z = enemyShip.value.z
    enemyShipMesh.rotation.y = enemyShip.value.angle
    
    // Animate enemy sails
    if (enemyShipMesh.userData.sails) {
      const time = Date.now() * 0.001
      enemyShipMesh.userData.sails.forEach((sail, index) => {
        if (!sail.userData.originalVertices) return
        const positions = sail.geometry.attributes.position
        const original = sail.userData.originalVertices
        const windStrength = windSpeed.value / 6
        for (let i = 0; i < positions.count; i++) {
          const x = original[i * 3]
          const y = original[i * 3 + 1]
          const bulge = Math.abs(x) / 3 * windStrength
          const wave = Math.sin(time * 2.5 + y * 0.5 + index) * 0.25 * windStrength
          positions.array[i * 3 + 2] = bulge + wave
        }
        positions.needsUpdate = true
      })
    }
    
    // Collision with player
    const edx = playerPos.value.x - enemyShip.value.x
    const edz = playerPos.value.z - enemyShip.value.z
    const enemyDist = Math.sqrt(edx * edx + edz * edz)
    
    if (enemyDist < 6) {
      hp.value -= 10 * dt
      // Bounce back
      enemyShip.value.x -= Math.sin(enemyShip.value.angle) * 2
      enemyShip.value.z -= Math.cos(enemyShip.value.angle) * 2
      enemyShip.value.hp -= 5 // Enemy also takes damage from collision
      showMessage('⚔️ Collision with enemy!')
    }
    
    // Enemy fires back occasionally
    if (Math.random() < 0.02 && distToPlayer < 30) {
      fireEnemyCannon()
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
  // Exit pointer lock if active
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
  pointerLocked = false
  mouseX = 0
  
  // Reset
  hp.value = 100
  gold.value = 0
  cannonCooldown.value = 0
  playerPos.value = { x: 0, z: 0 }
  playerAngle = 0
  playerSpeed.value = 0
  
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
  window.removeEventListener('pointerlockchange', onPointerLockChange)
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
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
