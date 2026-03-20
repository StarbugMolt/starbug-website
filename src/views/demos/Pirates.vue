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
        <div class="stat">💣 Port: {{ portCooldown > 0 ? portCooldown.toFixed(1) + 's' : 'READY' }}</div>
        <div class="stat">💣 Stbd: {{ starboardCooldown > 0 ? starboardCooldown.toFixed(1) + 's' : 'READY' }}</div>
        <div class="stat">⚓ Enemies: {{ aliveEnemies }} / 3 | Kraken: {{ kraken.hp > 0 ? 'ACTIVE' : (aliveEnemies === 0 ? 'NEXT' : '---') }}</div>
      </div>
    </div>

    <canvas ref="canvas"></canvas>

    <!-- Enemy indicator arrows and health bars -->
    <div class="indicators">
      <div 
        v-for="(enemy, index) in enemyIndicators" 
        :key="index"
        class="indicator"
        :style="{ 
          left: enemy.x + '%', 
          top: enemy.y + '%',
          transform: 'translate(-50%, -50%) rotate(' + enemy.angle + 'rad)'
        }"
      >
        <span class="indicator-icon">{{ enemy.icon }}</span>
        <span class="indicator-label">{{ enemy.label }}</span>
        <!-- Health bar -->
        <div class="health-bar-container">
          <div 
            class="health-bar" 
            :style="{ width: (enemy.hpPercent * 100) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="control-hint">🎯 Click to lock | Move mouse to steer | LMB=Starboard | RMB=Port | 🖱️ Scroll = Camera | Avoid rocks!</div>
    </div>

    <div class="overlay" v-if="gameState === 'start'">
      <div class="title">🏴‍☠️ Pirates of the Burning Sea</div>
      <p>Navigate the Caribbean. Fight the navy. Survive the Kraken.</p>
      <div class="instructions">
        <p>🖱️ <strong>Mouse</strong> - Steer your ship</p>
        <p>🖱️ <strong>Left Click</strong> - Fire starboard (right)</p>
        <p>🖱️ <strong>Right Click</strong> - Fire port (left)</p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const enemyIndicators = ref([]) // For directional indicators

// Computed for HUD
const aliveEnemies = computed(() => enemyShips.value.filter(e => e.hp > 0).length)
const cannonCooldown = ref(0) // Both sides
const portCooldown = ref(0) // Left side
const starboardCooldown = ref(0) // Right side
const playerSpeed = ref(0)

// Ship state
let playerShip
const playerPos = ref({ x: 0, z: 0 })
let playerAngle = 0
let targetRotation = 0

// Camera - 0 = behind (navigation), 1 = top-down (fighting)
let cameraMode = 0 // Start in behind view

// Wind
let windAngle = 0
let targetWindAngle = 0 // For smooth wind transitions
const windSpeed = ref(3)
let targetWindSpeed = 3 // For smooth wind speed transitions
let windChangeTimer = 0

// Projectiles
let cannonballs = []

// Ship wake/trail particles
let playerWake = []
const maxWakeParticles = 50

// Enemy ships - array for multiple enemies
const enemyShips = ref([]) // { x, z, hp, maxHp, angle, type, mesh }
let enemyShipMeshes = [] // Array of meshes

// Enemy ship types
const SHIP_TYPES = {
  RAMMER: { name: 'Rammer', hp: 150, speed: 10, turnSpeed: 0.5, rammingDamage: 20, cannonDamage: 5, color: 0x333333, size: 1.2 },
  NORMAL: { name: 'Sloop', hp: 80, speed: 6, turnSpeed: 2.0, rammingDamage: 10, cannonDamage: 10, color: 0x8B0000, size: 1.0 },
  BIG: { name: 'Galleon', hp: 200, speed: 4, turnSpeed: 1.0, rammingDamage: 10, cannonDamage: 15, color: 0x000080, size: 1.8 }
}

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
  
  // Wind particles
  createWindParticles()

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
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('pointerlockchange', onPointerLockChange)
  window.addEventListener('wheel', onWheel)
}

function createOcean() {
  // === BEAUTIFUL OCEAN WITH REAL WAVES ===
  
  // Deep ocean layer (dark base)
  const oceanGeometry = new THREE.PlaneGeometry(1500, 1500, 120, 120)
  const oceanMaterial = new THREE.MeshPhongMaterial({
    color: 0x005577, // Deep blue
    shininess: 200,
    specular: 0x111111,
    transparent: true,
    opacity: 0.95
  })
  ocean = new THREE.Mesh(oceanGeometry, oceanMaterial)
  ocean.rotation.x = -Math.PI / 2
  ocean.position.y = -0.3
  ocean.userData.originalPositions = oceanGeometry.attributes.position.array.slice()
  scene.add(ocean)

  // Wave surface layer - higher detail
  const waveGeometry = new THREE.PlaneGeometry(1500, 1500, 150, 150)
  const waveMaterial = new THREE.MeshPhongMaterial({
    color: 0x0088aa, // Lighter blue
    shininess: 250,
    specular: 0x444444,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  })
  const waves = new THREE.Mesh(waveGeometry, waveMaterial)
  waves.rotation.x = -Math.PI / 2
  waves.position.y = 0
  waves.userData.originalPositions = waveGeometry.attributes.position.array.slice()
  waves.userData.isWaveLayer = true
  scene.add(waves)
  
  // Store reference
  ocean = waves

  // Foam/whitecap layer
  const foamGeometry = new THREE.PlaneGeometry(1500, 1500, 80, 80)
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  })
  const foam = new THREE.Mesh(foamGeometry, foamMaterial)
  foam.rotation.x = -Math.PI / 2
  foam.position.y = 0.1
  foam.userData.originalPositions = foamGeometry.attributes.position.array.slice()
  foam.userData.isFoamLayer = true
  scene.add(foam)
  ocean.userData.foam = foam
}

// Animate ocean waves - beautiful realistic movement
function animateOceanWaves(time) {
  if (!ocean || !ocean.userData.originalPositions) return
  
  // Animate main wave layer
  const positions = ocean.geometry.attributes.position
  const original = ocean.userData.originalPositions
  
  for (let i = 0; i < positions.count; i++) {
    const x = original[i * 3]
    const z = original[i * 3 + 2]
    
    // Large rolling swells
    const swell = Math.sin(x * 0.008 + time * 0.3) * Math.cos(z * 0.006 + time * 0.2) * 1.5
    
    // Medium waves
    const wave1 = Math.sin(x * 0.02 + time * 0.5) * Math.cos(z * 0.015 + time * 0.4) * 0.8
    
    // Small ripples
    const wave2 = Math.sin(x * 0.08 + time * 1.2) * 0.2
    const wave3 = Math.sin(z * 0.06 + time * 0.9) * 0.15
    
    // Wind choppiness
    const chop = (Math.sin(time * 2 + x * 0.1) + Math.cos(time * 1.5 + z * 0.1)) * 0.1
    
    // Combine all wave heights
    positions.array[i * 3 + 1] = swell + wave1 + wave2 + wave3 + chop
  }
  positions.needsUpdate = true
  
  // Animate foam layer (whitecaps on wave peaks)
  if (ocean.userData.foam) {
    const foamPositions = ocean.userData.foam.geometry.attributes.position
    const foamOriginal = ocean.userData.foam.userData.originalPositions
    
    for (let i = 0; i < foamPositions.count; i++) {
      const x = foamOriginal[i * 3]
      const z = foamOriginal[i * 3 + 2]
      
      // Foam appears on wave crests
      const swell = Math.sin(x * 0.008 + time * 0.3) * Math.cos(z * 0.006 + time * 0.2) * 1.5
      const wave1 = Math.sin(x * 0.02 + time * 0.5) * Math.cos(z * 0.015 + time * 0.4) * 0.8
      
      const waveHeight = swell + wave1
      
      // Only show foam on wave crests
      const foam = waveHeight > 1.2 ? (waveHeight - 1.2) * 0.3 : 0
      
      foamPositions.array[i * 3 + 1] = waveHeight * 0.3 + foam
    }
    foamPositions.needsUpdate = true
  }
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

  // === IMPROVED HULL - Tapered shape ===
  // Main hull body (tapered)
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-1.5, -4)
  hullShape.lineTo(1.5, -4)
  hullShape.lineTo(1.8, 0)
  hullShape.lineTo(1.5, 4)
  hullShape.lineTo(-1.5, 4)
  hullShape.lineTo(-1.8, 0)
  hullShape.closePath()
  
  const extrudeSettings = { depth: 2, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.1, bevelSegments: 2 }
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, extrudeSettings)
  const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x5C3317 }) // Darker wood
  const hull = new THREE.Mesh(hullGeometry, hullMaterial)
  hull.rotation.x = -Math.PI / 2
  hull.position.y = 0.5
  playerShip.add(hull)

  // Hull stripe (decorative)
  const stripeGeometry = new THREE.BoxGeometry(3.2, 0.15, 8.5)
  const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0x8B0000 }) // Red stripe
  const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
  stripe.position.y = 1.3
  playerShip.add(stripe)

  // Deck with planks effect
  const deckGeometry = new THREE.BoxGeometry(2.8, 0.25, 7.5)
  const deckMaterial = new THREE.MeshPhongMaterial({ color: 0xDEB887 }) // Burlywood
  const deck = new THREE.Mesh(deckGeometry, deckMaterial)
  deck.position.y = 2.1
  playerShip.add(deck)

  // === RAILINGS ===
  const railMaterial = new THREE.MeshPhongMaterial({ color: 0x3D2817 })
  // Port side railing
  for (let i = 0; i < 8; i++) {
    const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), railMaterial)
    railPost.position.set(-1.3, 2.7, -3 + i * 0.85)
    playerShip.add(railPost)
  }
  // Starboard side railing
  for (let i = 0; i < 8; i++) {
    const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), railMaterial)
    railPost.position.set(1.3, 2.7, -3 + i * 0.85)
    playerShip.add(railPost)
  }
  // Railings top bar
  const railBarGeom = new THREE.CylinderGeometry(0.03, 0.03, 7, 8)
  const railBarL = new THREE.Mesh(railBarGeom, railMaterial)
  railBarL.rotation.x = Math.PI / 2
  railBarL.position.set(-1.3, 3.2, 0)
  playerShip.add(railBarL)
  const railBarR = new THREE.Mesh(railBarGeom, railMaterial)
  railBarR.rotation.x = Math.PI / 2
  railBarR.position.set(1.3, 3.2, 0)
  playerShip.add(railBarR)

  // === MASTS ===
  const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x4A3728 })
  
  // Main mast - thicker
  const mainMastGeom = new THREE.CylinderGeometry(0.25, 0.3, 12, 8)
  const mainMast = new THREE.Mesh(mainMastGeom, mastMaterial)
  mainMast.position.y = 7.5
  playerShip.add(mainMast)

  // Main mast crosstree (supports the yard)
  const crosstreeGeom = new THREE.BoxGeometry(7, 0.15, 0.15)
  const crosstree = new THREE.Mesh(crosstreeGeom, mastMaterial)
  crosstree.position.set(0, 12.5, 0)
  playerShip.add(crosstree)

  // Crow's nest
  const nestGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 8, 1, true)
  const nest = new THREE.Mesh(nestGeom, railMaterial)
  nest.position.set(0, 13, 0)
  playerShip.add(nest)
  // Nest floor
  const nestFloorGeom = new THREE.CircleGeometry(0.55, 8)
  const nestFloor = new THREE.Mesh(nestFloorGeom, deckMaterial)
  nestFloor.rotation.x = -Math.PI / 2
  nestFloor.position.y = -0.2
  nest.add(nestFloor)

  // Fore mast
  const foreMastGeom = new THREE.CylinderGeometry(0.18, 0.22, 7, 8)
  const foreMast = new THREE.Mesh(foreMastGeom, mastMaterial)
  foreMast.position.set(0, 5, -2.5)
  playerShip.add(foreMast)

  // Mizzen mast (rear)
  const mizzenMastGeom = new THREE.CylinderGeometry(0.12, 0.15, 5, 8)
  const mizzenMast = new THREE.Mesh(mizzenMastGeom, mastMaterial)
  mizzenMast.position.set(0, 4.5, 2.5)
  playerShip.add(mizzenMast)

  // === FIGUREHEAD (bow decoration) ===
  const figureheadMat = new THREE.MeshPhongMaterial({ color: 0xD2691E })
  // Dragon head
  const dragonHead = new THREE.Group()
  const headGeom = new THREE.ConeGeometry(0.4, 1.2, 6)
  const head = new THREE.Mesh(headGeom, figureheadMat)
  head.rotation.x = Math.PI / 2
  head.position.z = 0.4
  dragonHead.add(head)
  // Snout
  const snoutGeom = new THREE.ConeGeometry(0.2, 0.5, 6)
  const snout = new THREE.Mesh(snoutGeom, figureheadMat)
  snout.rotation.x = -Math.PI / 2
  snout.position.set(0, 0, 1)
  dragonHead.add(snout)
  dragonHead.position.set(0, 1.8, 4.5)
  playerShip.add(dragonHead)

  // === STERN DECORATION ===
  const sternMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 })
  const sternPanel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.1), sternMat)
  sternPanel.position.set(0, 2.8, -4)
  playerShip.add(sternPanel)

  // === WHITE SAILS THAT REACT TO WIND - SQUARE RIG STYLE ===
  // Sails have yards (spars) at top and bottom, sides billow outward
  
  // Main sail - 3D yard arms
  const mainSailGroup = new THREE.Group()
  
  // Top yard (horizontal spar)
  const topYardGeom = new THREE.CylinderGeometry(0.08, 0.08, 6, 8)
  const yardMat = new THREE.MeshPhongMaterial({ color: 0x654321 })
  const topYard = new THREE.Mesh(topYardGeom, yardMat)
  topYard.rotation.z = Math.PI / 2
  topYard.position.y = 3.5
  mainSailGroup.add(topYard)
  
  // Bottom yard
  const botYard = new THREE.Mesh(topYardGeom, yardMat)
  botYard.rotation.z = Math.PI / 2
  botYard.position.y = -3.5
  mainSailGroup.add(botYard)
  
  // The sail cloth - vertices organized so top row (y=max) and bottom row (y=min) stay fixed
  const sailGeom = new THREE.PlaneGeometry(5.5, 7, 12, 14)
  const sailMat = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  })
  const sail = new THREE.Mesh(sailGeom, sailMat)
  sail.position.set(0, 0, 0.05) // Slightly forward of yards
  sail.userData.isSail = true
  sail.userData.originalVertices = sailGeom.attributes.position.array.slice()
  // Store info about which vertices are fixed (top and bottom edges)
  const mainSailVerts = sailGeom.attributes.position
  sail.userData.fixedEdges = []
  for (let i = 0; i < mainSailVerts.count; i++) {
    const y = mainSailVerts.getY(i)
    // Top and bottom rows are fixed to yards
    if (Math.abs(y - 3.5) < 0.1 || Math.abs(y + 3.5) < 0.1) {
      sail.userData.fixedEdges.push(true)
    } else {
      sail.userData.fixedEdges.push(false)
    }
  }
  mainSailGroup.add(sail)
  mainSailGroup.position.set(0, 8, -1.5)
  playerShip.add(mainSailGroup)

  // Fore sail - 3D yard arms
  const foreSailGroup = new THREE.Group()
  const foreTopYardGeom = new THREE.CylinderGeometry(0.06, 0.06, 4, 8)
  const foreTopYard = new THREE.Mesh(foreTopYardGeom, yardMat)
  foreTopYard.rotation.z = Math.PI / 2
  foreTopYard.position.y = 2
  foreSailGroup.add(foreTopYard)
  const foreBotYard = new THREE.Mesh(foreTopYardGeom, yardMat)
  foreBotYard.rotation.z = Math.PI / 2
  foreBotYard.position.y = -2
  foreSailGroup.add(foreBotYard)
  const foreSailGeom = new THREE.PlaneGeometry(3.5, 4, 10, 12)
  const foreSailMat = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const foreSail = new THREE.Mesh(foreSailGeom, foreSailMat)
  foreSail.position.set(0, 0, 0.05)
  foreSail.userData.isSail = true
  foreSail.userData.originalVertices = foreSailGeom.attributes.position.array.slice()
  foreSail.userData.fixedEdges = []
  for (let i = 0; i < foreSailGeom.attributes.position.count; i++) {
    const y = foreSailGeom.attributes.position.getY(i)
    foreSail.userData.fixedEdges.push(Math.abs(y - 2) < 0.1 || Math.abs(y + 2) < 0.1)
  }
  foreSailGroup.add(foreSail)
  foreSailGroup.position.set(0, 5, -3)
  playerShip.add(foreSailGroup)

  // Mizzen sail - 3D yard arms
  const mizzenGroup = new THREE.Group()
  const mizzenTopYardGeom = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8)
  const mizzenTopYard = new THREE.Mesh(mizzenTopYardGeom, yardMat)
  mizzenTopYard.rotation.z = Math.PI / 2
  mizzenTopYard.position.y = 1.75
  mizzenGroup.add(mizzenTopYard)
  const mizzenBotYard = new THREE.Mesh(mizzenTopYardGeom, yardMat)
  mizzenBotYard.rotation.z = Math.PI / 2
  mizzenBotYard.position.y = -1.75
  mizzenGroup.add(mizzenBotYard)
  const mizzenGeom = new THREE.PlaneGeometry(3, 3.5, 8, 10)
  const mizzenMat = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const mizzen = new THREE.Mesh(mizzenGeom, mizzenMat)
  mizzen.position.set(0, 0, 0.05)
  mizzen.userData.isSail = true
  mizzen.userData.originalVertices = mizzenGeom.attributes.position.array.slice()
  mizzen.userData.fixedEdges = []
  for (let i = 0; i < mizzenGeom.attributes.position.count; i++) {
    const y = mizzenGeom.attributes.position.getY(i)
    mizzen.userData.fixedEdges.push(Math.abs(y - 1.75) < 0.1 || Math.abs(y + 1.75) < 0.1)
  }
  mizzenGroup.add(mizzen)
  mizzenGroup.position.set(0, 6, 1)
  playerShip.add(mizzenGroup)

  // Store sails for wind animation
  playerShip.userData.sails = [sail, foreSail, mizzen]

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
  // Create 10 islands (more for bigger map)
  for (let i = 0; i < 10; i++) {
    const islandGroup = new THREE.Group()
    
    const angle = (i / 10) * Math.PI * 2
    const dist = 200 + Math.random() * 250 // Farther out
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    
    // Sand
    const sandGeometry = new THREE.ConeGeometry(12 + Math.random() * 8, 6, 8)
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
    islands.push({ x, z, radius: 15, mesh: islandGroup })
    scene.add(islandGroup)
  }
  
  // Create rocks - scattered throughout larger area
  for (let i = 0; i < 30; i++) {
    const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2)
    const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x696969 })
    const rock = new THREE.Mesh(rockGeometry, rockMaterial)
    
    const angle = Math.random() * Math.PI * 2
    const dist = 50 + Math.random() * 400
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

// Spawn enemy ships - one of each type
function spawnEnemyShip() {
  // Clear existing enemies
  enemyShipMeshes.forEach(mesh => scene.remove(mesh))
  enemyShipMeshes = []
  enemyShips.value = []
  
  // Spawn 3 different enemy types at different positions
  const types = ['RAMMER', 'NORMAL', 'BIG']
  const positions = [
    { x: 200, z: -200 },
    { x: -180, z: -250 },
    { x: 100, z: -300 }
  ]
  
  types.forEach((type, index) => {
    const shipType = SHIP_TYPES[type]
    const pos = positions[index]
    
    // Create enemy data
    const enemy = {
      x: pos.x,
      z: pos.z,
      hp: shipType.hp,
      maxHp: shipType.hp,
      angle: 0,
      type: type,
      lastShot: 0,
      sinking: false,
      sinkingTime: 0
    }
    enemyShips.value.push(enemy)
    
    // Create mesh
    const mesh = createEnemyShipMesh(shipType)
    mesh.position.set(enemy.x, 0, enemy.z)
    scene.add(mesh)
    enemyShipMeshes.push(mesh)
  })
  
  showMessage('⚔️ 3 Enemy ships approaching!', 3000)
}

function createEnemyShipMesh(shipType) {
  const mesh = new THREE.Group()
  const size = shipType.size
  const woodMat = new THREE.MeshPhongMaterial({ color: 0x654321 })
  const sailMat = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  
  // === IMPROVED HULL (tapered shape) ===
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-1.5 * size, -4 * size)
  hullShape.lineTo(1.5 * size, -4 * size)
  hullShape.lineTo(1.8 * size, 0)
  hullShape.lineTo(1.5 * size, 4 * size)
  hullShape.lineTo(-1.5 * size, 4 * size)
  hullShape.lineTo(-1.8 * size, 0)
  hullShape.closePath()
  
  const extrudeSettings = { depth: 2 * size, bevelEnabled: true, bevelThickness: 0.2 * size, bevelSize: 0.1 * size, bevelSegments: 2 }
  const hullGeom = new THREE.ExtrudeGeometry(hullShape, extrudeSettings)
  const hullMat = new THREE.MeshPhongMaterial({ color: shipType.color })
  const hull = new THREE.Mesh(hullGeom, hullMat)
  hull.rotation.x = -Math.PI / 2
  hull.position.y = 0.5 * size
  mesh.add(hull)
  
  // Hull stripe
  const stripeGeom = new THREE.BoxGeometry(3.2 * size, 0.15 * size, 8.5 * size)
  const stripeMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 })
  const stripe = new THREE.Mesh(stripeGeom, stripeMat)
  stripe.position.y = 1.3 * size
  mesh.add(stripe)
  
  // Deck
  const deckGeom = new THREE.BoxGeometry(2.8 * size, 0.25 * size, 7.5 * size)
  const deckMat = new THREE.MeshPhongMaterial({ color: 0xDEB887 })
  const deck = new THREE.Mesh(deckGeom, deckMat)
  deck.position.y = 2.1 * size
  mesh.add(deck)
  
  // Railings
  const railMat = new THREE.MeshPhongMaterial({ color: 0x3D2817 })
  for (let i = 0; i < 6; i++) {
    const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * size, 0.05 * size, 1 * size), railMat)
    railPost.position.set(-1.3 * size, 2.7 * size, -3 + i * 1.2 * size)
    mesh.add(railPost)
    const railPost2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * size, 0.05 * size, 1 * size), railMat)
    railPost2.position.set(1.3 * size, 2.7 * size, -3 + i * 1.2 * size)
    mesh.add(railPost2)
  }
  
  // === MASTS ===
  // Main mast
  const mainMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25 * size, 0.3 * size, 12 * size, 8),
    woodMat
  )
  mainMast.position.set(0, 7.5 * size, 0)
  mesh.add(mainMast)
  
  // Main yard (horizontal spar)
  const yard1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * size, 0.06 * size, 7 * size, 8),
    woodMat
  )
  yard1.rotation.z = Math.PI / 2
  yard1.position.set(0, 12 * size, 0)
  mesh.add(yard1)
  
  // Main sail - attached to yard, faces sideways
  const mainSail = new THREE.Mesh(
    new THREE.PlaneGeometry(6 * size, 6 * size),
    sailMat
  )
  mainSail.position.set(0, 10 * size, 0)
  mainSail.rotation.y = Math.PI / 2
  mesh.add(mainSail)
  
  // Lower yard and sail
  const yard2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * size, 0.05 * size, 5 * size, 8),
    woodMat
  )
  yard2.rotation.z = Math.PI / 2
  yard2.position.set(0, 7 * size, 0)
  mesh.add(yard2)
  
  const lowerSail = new THREE.Mesh(
    new THREE.PlaneGeometry(4 * size, 4 * size),
    sailMat
  )
  lowerSail.position.set(0, 5.5 * size, 0)
  lowerSail.rotation.y = Math.PI / 2
  mesh.add(lowerSail)
  
  // Fore mast
  const foreMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * size, 0.22 * size, 8 * size, 8),
    woodMat
  )
  foreMast.position.set(0, 5 * size, -3 * size)
  mesh.add(foreMast)
  
  // Fore yard
  const foreYard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * size, 0.05 * size, 4 * size, 8),
    woodMat
  )
  foreYard.rotation.z = Math.PI / 2
  foreYard.position.set(0, 7.5 * size, -3 * size)
  mesh.add(foreYard)
  
  // Fore sail
  const foreSail = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5 * size, 3.5 * size),
    sailMat
  )
  foreSail.position.set(0, 6 * size, -3 * size)
  foreSail.rotation.y = Math.PI / 2
  mesh.add(foreSail)
  
  // Flag
  const flagMat = new THREE.MeshBasicMaterial({ 
    color: shipType === SHIP_TYPES.RAMMER ? 0xff0000 : (shipType === SHIP_TYPES.BIG ? 0xffff00 : 0x0000ff) 
  })
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5 * size, 1 * size), flagMat)
  flag.position.set(0, 13 * size, 0)
  flag.rotation.y = Math.PI / 2
  mesh.add(flag)
  
  // Rammer spike
  if (shipType === SHIP_TYPES.RAMMER) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.35 * size, 4 * size, 6),
      new THREE.MeshPhongMaterial({ color: 0x888888, metalness: 0.9 })
    )
    spike.rotation.x = -Math.PI / 2
    spike.position.set(0, 1 * size, 5 * size)
    mesh.add(spike)
  }
  
  // No animated sails for enemies
  mesh.userData.sails = []
  
  return mesh
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

function fireCannon(side) {
  // side: 'port' (left), 'starboard' (right), or 'both'
  const cooldownTime = 1.5
  
  if (side === 'port') {
    if (portCooldown.value > 0) return
    portCooldown.value = cooldownTime
  } else if (side === 'starboard') {
    if (starboardCooldown.value > 0) return
    starboardCooldown.value = cooldownTime
  } else {
    if (cannonCooldown.value > 0) return
    cannonCooldown.value = cooldownTime
  }
  
  const angle = playerAngle
  
  // Determine which side(s) to fire
  let sidesToFire = []
  if (side === 'port') sidesToFire = [-1] // Left
  else if (side === 'starboard') sidesToFire = [1] // Right
  else sidesToFire = [-1, 1] // Both
  
  for (const sideVal of sidesToFire) {
    // Fire 3 cannons from this side
    const sidePositions = [-2, 0, 2]
    for (const zOffset of sidePositions) {
      const ballGeometry = new THREE.SphereGeometry(0.35, 8, 8)
      const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
      const ball = new THREE.Mesh(ballGeometry, ballMaterial)
      
      const sideOffset = sideVal * 2
      ball.position.set(
        playerPos.value.x + Math.sin(angle) * zOffset + Math.sin(angle + sideVal * Math.PI / 2) * sideOffset,
        2,
        playerPos.value.z + Math.cos(angle) * zOffset + Math.cos(angle + sideVal * Math.PI / 2) * sideOffset
      )
      
      const speed = 40
      cannonballs.push({
        mesh: ball,
        vx: Math.sin(angle + sideVal * Math.PI / 2) * speed,
        vz: Math.cos(angle + sideVal * Math.PI / 2) * speed,
        life: 3,
        isPlayer: true,
        spawnTime: Date.now()
      })
      
      scene.add(ball)
    }
  }
  
  const sideName = side === 'port' ? 'PORT (LEFT)' : (side === 'starboard' ? 'STARBOARD (RIGHT)' : 'BROADSIDE')
  showMessage(`💥 ${sideName} FIRE!`, 1000)
}

function fireEnemyCannon() {
  // Legacy function - keep for compatibility
  if (enemyShips.value.length > 0 && enemyShips.value[0].hp > 0) {
    fireEnemyCannonMulti(enemyShips.value[0], SHIP_TYPES[enemyShips.value[0].type], 0)
  }
}

function fireEnemyCannonMulti(enemy, shipType, enemyIndex) {
  const angle = enemy.angle
  
  if (shipType === SHIP_TYPES.NORMAL) {
    // Normal ship fires 1 cannon straight ahead
    const ballGeom = new THREE.SphereGeometry(0.35, 8, 8)
    const ballMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const ball = new THREE.Mesh(ballGeom, ballMat)
    ball.position.set(enemy.x, 2, enemy.z)
    
    const speed = 35
    cannonballs.push({
      mesh: ball,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      life: 3,
      isEnemy: true,
      spawnTime: Date.now(),
      damage: shipType.cannonDamage,
      sourceIndex: enemyIndex
    })
    scene.add(ball)
  } else if (shipType === SHIP_TYPES.BIG) {
    // Big ship fires 2 cannons from each side (broadside)
    for (let side = -1; side <= 1; side += 2) {
      for (let offset = -1; offset <= 1; offset += 2) {
        const ballGeom = new THREE.SphereGeometry(0.4, 8, 8)
        const ballMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
        const ball = new THREE.Mesh(ballGeom, ballMat)
        ball.position.set(
          enemy.x + Math.sin(angle + side * Math.PI / 2) * offset * 2,
          2,
          enemy.z + Math.cos(angle + side * Math.PI / 2) * offset * 2
        )
        
        const speed = 30
        cannonballs.push({
          mesh: ball,
          vx: Math.sin(angle + side * Math.PI / 2) * speed,
          vz: Math.cos(angle + side * Math.PI / 2) * speed,
          life: 3,
          isEnemy: true,
          spawnTime: Date.now(),
          damage: shipType.cannonDamage,
          sourceIndex: enemyIndex
        })
        scene.add(ball)
      }
    }
  }
  // Rammers don't shoot - they ram!
}

function updateCannonballs(dt) {
  for (let i = cannonballs.length - 1; i >= 0; i--) {
    const ball = cannonballs[i]
    ball.mesh.position.x += ball.vx * dt
    ball.mesh.position.z += ball.vz * dt
    ball.life -= dt
    
    // Check collision with enemies (both player AND enemy cannons can damage enemies)
    if (ball.isPlayer || ball.isEnemy) { 
      for (let eIndex = 0; eIndex < enemyShips.value.length; eIndex++) {
        const enemy = enemyShips.value[eIndex]
        if (enemy.hp <= 0) continue
        
        // Don't hit yourself (for enemy cannons)
        if (ball.isEnemy && ball.sourceIndex === eIndex) continue
        
        const dx = ball.mesh.position.x - enemy.x
        const dz = ball.mesh.position.z - enemy.z
        const shipType = SHIP_TYPES[enemy.type]
        const hitDist = 6 * shipType.size
        
        if (Math.sqrt(dx * dx + dz * dz) < hitDist) {
          const damage = ball.damage || 10
          enemy.hp -= damage
          
          if (ball.isPlayer) {
            showMessage(`💥 Hit ${shipType.name}!`)
          } else {
            showMessage(`💥 Enemy fire hit ${shipType.name}!`)
          }
          
          scene.remove(ball.mesh)
          cannonballs.splice(i, 1)
          break // Only hit one enemy
        }
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
    
    // Check collision with player (from enemy cannons only - not your own!)
    // Add grace period so your own cannons don't hit you
    const age = (Date.now() - ball.spawnTime) / 1000
    if (age > 0.3 && ball.isEnemy) {
      const pdx = ball.mesh.position.x - playerPos.value.x
      const pdz = ball.mesh.position.z - playerPos.value.z
      if (Math.sqrt(pdx * pdx + pdz * pdz) < 3) {
        const damage = ball.damage || 10
        hp.value -= damage
        showMessage('💥 You were hit!')
        scene.remove(ball.mesh)
        cannonballs.splice(i, 1)
        if (hp.value <= 0) {
          gameState.value = 'gameover'
        }
        continue
      }
    }
    
    if (ball.life <= 0) {
      scene.remove(ball.mesh)
      cannonballs.splice(i, 1)
    }
  }
}

let mouseDeltaX = 0 // Track mouse movement for steering

let turnAccumulator = 0 // Clamp total accumulated turn

function onMouseMove(e) {
  // Always accumulate mouse movement when game is playing
  // This works because pointer lock captures all mouse movement
  if (gameState.value === 'playing') {
    // Very low sensitivity for big ship feel (inverted: right turns right)
    const turnInput = -e.movementX * 0.0003
    
    // Clamp the accumulated turn to maintain sluggish feel
    // Can't push past this limit no matter how far you move mouse
    const maxTurnDelta = 0.008 // Max turn per frame
    turnAccumulator += turnInput
    turnAccumulator = Math.max(-maxTurnDelta, Math.min(maxTurnDelta, turnAccumulator))
    
    mouseDeltaX = turnAccumulator
  }
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement !== null
  if (pointerLocked) {
    mouseDeltaX = 0 // Reset on lock
    showMessage('🎯 Pointer locked - move mouse to steer', 2000)
  } else {
    showMessage('⚠️ Pointer unlocked - click to re-lock', 2000)
  }
}

function requestPointerLock() {
  // Request on canvas element
  if (canvas.value) {
    canvas.value.requestPointerLock()
  }
}

function onClick(e) {
  // Request pointer lock on any click when playing
  if (gameState.value === 'playing') {
    requestPointerLock()
  }
}

function onMouseDown(e) {
  if (gameState.value === 'playing') {
    // Left click (button 0) = starboard (right), Right click (button 2) = port (left)
    // Inverted: left side of ship = left click feels more natural
    if (e.button === 0) {
      fireCannon('starboard')
    } else if (e.button === 2) {
      fireCannon('port')
    }
  }
}

function onContextMenu(e) {
  e.preventDefault() // Prevent context menu on right click
  // Right click fires port cannons (inverted from left click)
  if (gameState.value === 'playing') {
    fireCannon('port')
  }
}

function onWheel(e) {
  // Scroll up = more top-down (fighting), scroll down = more behind (navigation)
  if (e.deltaY < 0) {
    cameraMode = Math.min(1, cameraMode + 0.1)
  } else {
    cameraMode = Math.max(0, cameraMode - 0.1)
  }
  
  const modeNames = ['🚢 Navigation', '⚔️ Combat']
  const currentMode = cameraMode > 0.5 ? 1 : 0
  showMessage(`📷 ${modeNames[currentMode]} view`, 1500)
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
  
  // Calculate how aligned we are with wind (1 = perfect tailwind, -1 = perfect headwind)
  const windAlignment = Math.cos(windAngle - playerAngle)
  // Positive = wind behind, Negative = wind in front
  const windBehind = Math.max(0, windAlignment) // 1 when wind behind, 0 when in front
  const windAhead = Math.max(0, -windAlignment) // 1 when wind in front, 0 when behind
  
  // More billowing when going fast with wind, less when slow/against wind
  const speedFactor = playerSpeed.value / 15 // 0 to 1 based on speed
  
  playerShip.userData.sails.forEach((sail, index) => {
    if (!sail.userData.originalVertices || !sail.userData.fixedEdges) return
    
    const positions = sail.geometry.attributes.position
    const original = sail.userData.originalVertices
    const fixedEdges = sail.userData.fixedEdges
    
    for (let i = 0; i < positions.count; i++) {
      // Skip vertices on top and bottom edges (attached to yards)
      if (fixedEdges[i]) continue
      
      const x = original[i * 3] // Horizontal position (-width/2 to +width/2)
      const y = original[i * 3 + 1] // Vertical position
      
      // x ranges from -width/2 to +width/2
      // The sides (left and right edges) are free to billow
      // distFromCenter: 0 at center (x=0), 1 at edges
      const width = 5.5 / 2 // approximate
      const distFromCenter = Math.abs(x) / width
      
      // === WIND BEHIND = FULL BELLY, CURVED SHAPE ===
      // Maximum billow when wind is behind and we're moving fast
      // Billow in X direction (sideways from the mast)
      const maxBillow = windBehind * windStrength * (1.5 + speedFactor * 1.0)
      // Curved billow - full in middle, less at corners (parabolic)
      // Only the vertical sides billow, not top/bottom
      const curvedBillow = Math.pow(distFromCenter, 1.5) * maxBillow * 2
      
      // === WIND IN FRONT = FLUTTER, ALMOST NO VOLUME ===
      // Sails luff and flutter when wind is against
      const flutterAmount = windAhead * 0.25 * (0.2 + speedFactor * 0.3)
      const flutter = Math.sin(time * 8 + y * 0.5 + index * 2) * flutterAmount
      
      // Apply billow to X axis (sideways billow)
      // Sign matches x direction so both sides billow outward
      const direction = x >= 0 ? 1 : -1
      positions.array[i * 3] = x + direction * curvedBillow + flutter
    }
    
    positions.needsUpdate = true
  })
  
  // Update wind particles
  updateWindParticles(dt)
}

// Wind particles system
let windParticles = []
const maxWindParticles = 100

function createWindParticles() {
  for (let i = 0; i < maxWindParticles; i++) {
    // Each wind particle is a line (trail)
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(6) // 2 points per line
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    })
    
    const particle = new THREE.Line(geometry, material)
    resetWindParticle(particle)
    scene.add(particle)
    windParticles.push(particle)
  }
}

function resetWindParticle(particle) {
  // Spawn in a wider area around player - more height variance
  const angle = Math.random() * Math.PI * 2
  const radius = 20 + Math.random() * 40
  const x = playerPos.value.x + Math.cos(angle) * radius
  const z = playerPos.value.z + Math.sin(angle) * radius
  const y = 1 + Math.random() * 15 // Much more height variance
  
  particle.userData = {
    x: x,
    y: y,
    z: z,
    life: 0,
    maxLife: 4 + Math.random() * 3, // Live much longer
    // Swirl parameters - unique per particle
    swirlSpeed: 0.5 + Math.random() * 1.5,
    swirlRadius: 0.5 + Math.random() * 1.5,
    swirlPhase: Math.random() * Math.PI * 2,
    // Vertical drift
    vertDrift: (Math.random() - 0.3) * 0.5, // Slight upward tendency
    // Individual offset for variation
    speedMult: 0.7 + Math.random() * 0.6
  }
  
  // Set initial positions
  const positions = particle.geometry.attributes.position.array
  positions[0] = x
  positions[1] = y
  positions[2] = z
  positions[3] = x
  positions[4] = y
  positions[5] = z
}

function updateWindParticles(dt) {
  const time = Date.now() * 0.001
  
  windParticles.forEach(particle => {
    particle.userData.life += dt
    
    // Base wind movement
    const baseSpeed = windSpeed.value * 4 * particle.userData.speedMult
    const vx = Math.sin(windAngle) * baseSpeed
    const vz = Math.cos(windAngle) * baseSpeed
    
    // Add swirling motion (like leaves)
    const swirl = Math.sin(time * particle.userData.swirlSpeed + particle.userData.swirlPhase)
    const swirlX = Math.cos(windAngle) * swirl * particle.userData.swirlRadius
    const swirlZ = -Math.sin(windAngle) * swirl * particle.userData.swirlRadius
    
    // Apply movement
    particle.userData.x += (vx + swirlX) * dt
    particle.userData.z += (vz + swirlZ) * dt
    
    // Vertical drift + bobbing
    particle.userData.y += particle.userData.vertDrift * dt
    particle.userData.y += Math.sin(time * 2 + particle.userData.swirlPhase) * 0.02 // Bobbing
    
    // Keep in reasonable height range
    if (particle.userData.y < 1) particle.userData.y = 1
    if (particle.userData.y > 15) particle.userData.y = 15
    
    // Update trail positions - more organic
    const trailLength = particle.userData.swirlRadius * 0.8
    const tailX = particle.userData.x - vx * trailLength * 0.05 - swirlX * 0.5
    const tailZ = particle.userData.z - vz * trailLength * 0.05 - swirlZ * 0.5
    const tailY = particle.userData.y - particle.userData.vertDrift * trailLength * 0.1
    
    const positions = particle.geometry.attributes.position.array
    positions[0] = particle.userData.x
    positions[1] = particle.userData.y
    positions[2] = particle.userData.z
    positions[3] = tailX
    positions[4] = tailY
    positions[5] = tailZ
    
    particle.geometry.attributes.position.needsUpdate = true
    
    // Fade based on life - slower fade
    const lifeRatio = particle.userData.life / particle.userData.maxLife
    particle.material.opacity = 0.1 * (1 - Math.pow(lifeRatio, 2)) * (windSpeed.value / 5)
    
    // Wrap particles around player instead of resetting - keep them always visible
    const dx = particle.userData.x - playerPos.value.x
    const dz = particle.userData.z - playerPos.value.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    // If too far or too old, respawn in front of player (in wind direction)
    if (particle.userData.life > particle.userData.maxLife || dist > 80) {
      // Spawn in a cone in front of player (where wind is blowing to)
      const spawnAngle = windAngle + (Math.random() - 0.5) * 1.5 // Narrow cone
      const spawnDist = 25 + Math.random() * 15
      particle.userData.x = playerPos.value.x + Math.sin(spawnAngle) * spawnDist
      particle.userData.z = playerPos.value.z + Math.cos(spawnAngle) * spawnDist
      particle.userData.y = 1 + Math.random() * 15
      particle.userData.life = 0
      particle.userData.maxLife = 4 + Math.random() * 3
    }
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
  
  // Update wind - more dynamic changes
  windChangeTimer -= dt
  if (windChangeTimer <= 0) {
    // Set new target wind values
    // Wind can change by 45-180 degrees each shift
    const shiftAmount = (Math.random() * 2 + 0.5) * (Math.random() > 0.5 ? 1 : -1)
    targetWindAngle = windAngle + shiftAmount
    targetWindSpeed = 2 + Math.random() * 5
    windChangeTimer = 12 + Math.random() * 5 // Changes every 12-17 seconds
    showMessage(`💨 Wind shifting...`, 2000)
  }
  
  // Gradually transition wind angle (4 second transition)
  const windTransitionSpeed = 0.25 // Complete transition in ~4 seconds
  if (Math.abs(targetWindAngle - windAngle) > 0.01) {
    windAngle += (targetWindAngle - windAngle) * windTransitionSpeed * dt
  }
  
  // Gradually transition wind speed
  if (Math.abs(targetWindSpeed - windSpeed.value) > 0.1) {
    windSpeed.value += (targetWindSpeed - windSpeed.value) * windTransitionSpeed * dt
  }
  
  // Animate sails
  animateSails(dt)
  
  // === GRADUAL STEERING WITH MOUSE ===
  // Add mouse delta to target rotation for easing
  if (mouseDeltaX !== 0) {
    targetRotation += mouseDeltaX
    // Decay the mouse delta
    mouseDeltaX *= 0.7
    // Clear if very small
    if (Math.abs(mouseDeltaX) < 0.0001) mouseDeltaX = 0
  }
  
  // Ease player angle towards target rotation (smooth turning)
  // Big ship takes time to react and turn
  const turnSpeed = 1.0 // How fast the boat actually turns (lower = more lag)
  const angleDiff = targetRotation - playerAngle
  if (Math.abs(angleDiff) > 0.001) {
    playerAngle += angleDiff * turnSpeed * dt
  }
  
  // === MOMENTUM-BASED SPEED PHYSICS ===
  // Calculate target speed based on wind alignment
  const windDir = Math.cos(windAngle - playerAngle)
  const maxSpeed = 15 // Maximum speed with perfect tailwind
  const minSpeed = 2 // Minimum speed with headwind
  const targetSpeed = minSpeed + (maxSpeed - minSpeed) * Math.max(0, (windDir + 1) / 2)
  
  // Gradually accelerate/decelerate toward target speed (momentum)
  // Big heavy ship takes a long time to speed up and slow down
  const acceleration = 0.5 // How fast we change speed (lower = heavier feel)
  if (playerSpeed.value < targetSpeed) {
    playerSpeed.value = Math.min(targetSpeed, playerSpeed.value + acceleration * dt)
  } else {
    playerSpeed.value = Math.max(targetSpeed, playerSpeed.value - acceleration * 0.3 * dt)
  }
  
  // Apply momentum to position
  playerPos.value.x += Math.sin(playerAngle) * playerSpeed.value * dt
  playerPos.value.z += Math.cos(playerAngle) * playerSpeed.value * dt
  
  // Boundary
  const maxDist = 600
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
  
  // Camera follow - interpolate between behind view and top-down based on cameraMode
  // Behind view (navigation): close behind, lower angle
  const behindDist = 50
  const behindHeight = 35
  // Top-down view (combat): high above, looking down
  const topDownDist = 80
  const topDownHeight = 100
  
  // Interpolate based on cameraMode
  let dist = behindDist + (topDownDist - behindDist) * cameraMode
  const height = behindHeight + (topDownHeight - behindHeight) * cameraMode
  
  // Add distance based on speed (camera pulls back when going faster)
  const speedBoost = playerSpeed.value * 1.5
  dist += speedBoost
  
  camera.position.x = playerPos.value.x - Math.sin(playerAngle) * dist
  camera.position.z = playerPos.value.z - Math.cos(playerAngle) * dist
  camera.position.y = height
  camera.lookAt(playerPos.value.x, 5, playerPos.value.z) // Look slightly above water
  
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
  
  // === MULTIPLE ENEMY SHIPS AI ===
  enemyShips.value.forEach((enemy, index) => {
    if (enemy.hp <= 0) return // Skip destroyed ships
    
    const mesh = enemyShipMeshes[index]
    if (!mesh) return
    
    const shipType = SHIP_TYPES[enemy.type]
    
    // Calculate direction to player
    const dx = playerPos.value.x - enemy.x
    const dz = playerPos.value.z - enemy.z
    const distToPlayer = Math.sqrt(dx * dx + dz * dz)
    let targetAngle = Math.atan2(dx, dz)
    
    // Different behavior based on ship type
    if (enemy.type === 'RAMMER') {
      // Rammers charge directly at player
      targetAngle = Math.atan2(dx, dz)
    } else if (enemy.type === 'NORMAL') {
      // Normal ships try to get in front for broadside
      targetAngle = Math.atan2(dx, dz) + Math.PI // Stay behind player
    } else if (enemy.type === 'BIG') {
      // Big ships - approach slowly but steadily, try to broadside
      if (distToPlayer > 40) {
        // Too far - move toward player
        targetAngle = Math.atan2(dx, dz)
      } else if (distToPlayer < 20) {
        // Too close - back off slightly
        targetAngle = Math.atan2(dx, dz) + Math.PI * 0.5
      } else {
        // Good range - circle around for broadside
        targetAngle = Math.atan2(dx, dz) + (index % 2 === 0 ? 0.8 : -0.8)
      }
    }
    
    // Check for obstacles ahead
    const lookAheadX = enemy.x + Math.sin(enemy.angle) * 15
    const lookAheadZ = enemy.z + Math.cos(enemy.angle) * 15
    const obstacleAhead = checkObstacleCollision(lookAheadX, lookAheadZ, 5)
    
    let moveAngle = targetAngle
    
    if (obstacleAhead) {
      const leftCheck = checkObstacleCollision(
        enemy.x + Math.sin(enemy.angle + 0.5) * 10,
        enemy.z + Math.cos(enemy.angle + 0.5) * 10, 5
      )
      const rightCheck = checkObstacleCollision(
        enemy.x + Math.sin(enemy.angle - 0.5) * 10,
        enemy.z + Math.cos(enemy.angle - 0.5) * 10, 5
      )
      
      if (!leftCheck && rightCheck) moveAngle = enemy.angle + 0.8 * dt
      else if (!rightCheck && leftCheck) moveAngle = enemy.angle - 0.8 * dt
      else if (!leftCheck && !rightCheck) moveAngle = enemy.angle + (Math.random() > 0.5 ? 0.8 : -0.8) * dt
      else moveAngle = enemy.angle + Math.PI
    }
    
    // Smoothly turn toward target
    enemy.angle += (moveAngle - enemy.angle) * dt * shipType.turnSpeed
    
    // Move at speed based on type
    const enemySpeed = obstacleAhead ? shipType.speed * 0.5 : shipType.speed
    enemy.x += Math.sin(enemy.angle) * enemySpeed * dt
    enemy.z += Math.cos(enemy.angle) * enemySpeed * dt
    
    // Enemy wake
    if (enemySpeed > 2 && Math.random() < 0.1) {
      spawnWakeParticle(enemy.x, enemy.z, enemy.angle, true)
    }
    
    // Keep in bounds
    const maxDist = 550
    if (Math.sqrt(enemy.x ** 2 + enemy.z ** 2) > maxDist) {
      const boundAngle = Math.atan2(enemy.x, enemy.z)
      enemy.x = Math.sin(boundAngle) * maxDist
      enemy.z = Math.cos(boundAngle) * maxDist
    }
    
    // Update mesh
    mesh.position.x = enemy.x
    mesh.position.z = enemy.z
    mesh.rotation.y = enemy.angle
    
    // Animate enemy sails
    if (mesh.userData.sails) {
      const time = Date.now() * 0.001
      mesh.userData.sails.forEach((sail, sailIndex) => {
        if (!sail.userData.originalVertices) return
        const positions = sail.geometry.attributes.position
        const original = sail.userData.originalVertices
        const windStrength = windSpeed.value / 6
        for (let i = 0; i < positions.count; i++) {
          const x = original[i * 3]
          const y = original[i * 3 + 1]
          const bulge = Math.abs(x) / 3 * windStrength
          const wave = Math.sin(time * 2.5 + y * 0.5 + sailIndex) * 0.25 * windStrength
          positions.array[i * 3 + 2] = bulge + wave
        }
        positions.needsUpdate = true
      })
    }
    
    // Collision with player
    const edx = playerPos.value.x - enemy.x
    const edz = playerPos.value.z - enemy.z
    const enemyDist = Math.sqrt(edx * edx + edz * edz)
    const collisionDist = 4 * shipType.size
    
    if (enemyDist < collisionDist + 3) {
      // Rammers deal 2x damage but take little damage
      const damage = enemy.type === 'RAMMER' ? shipType.rammingDamage * 2 : shipType.rammingDamage
      hp.value -= damage * dt
      
      // Rammers are harder to damage from collision
      const enemyDamage = enemy.type === 'RAMMER' ? 2 : 5
      enemy.hp -= enemyDamage
      
      // Bounce back
      enemy.x -= Math.sin(enemy.angle) * 2
      enemy.z -= Math.cos(enemy.angle) * 2
      
      const typeName = enemy.type === 'RAMMER' ? 'Ramming ship' : (enemy.type === 'BIG' ? 'Galleon' : 'Sloop')
      showMessage(`⚔️ Collision with ${typeName}!`)
    }
    
    // Enemy fires based on type
    const now = Date.now()
    const fireChance = enemy.type === 'BIG' ? 0.015 : (enemy.type === 'NORMAL' ? 0.02 : 0.005)
    const fireRange = enemy.type === 'NORMAL' ? 25 : 35
    
    if (Math.random() < fireChance && distToPlayer < fireRange && now - enemy.lastShot > 2000) {
      enemy.lastShot = now
      fireEnemyCannonMulti(enemy, shipType, index)
    }
  })
  
  // === ENEMY-ENEMY COLLISION ===
  for (let i = 0; i < enemyShips.value.length; i++) {
    const e1 = enemyShips.value[i]
    if (e1.hp <= 0) continue
    const t1 = SHIP_TYPES[e1.type]
    
    for (let j = i + 1; j < enemyShips.value.length; j++) {
      const e2 = enemyShips.value[j]
      if (e2.hp <= 0) continue
      const t2 = SHIP_TYPES[e2.type]
      
      const dx = e1.x - e2.x
      const dz = e1.z - e2.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const collisionDist = (4 * t1.size) + (4 * t2.size)
      
      if (dist < collisionDist) {
        // Both take damage
        e1.hp -= 5
        e2.hp -= 5
        
        // Bounce apart
        const angle = Math.atan2(dx, dz)
        e1.x += Math.sin(angle) * 3
        e1.z += Math.cos(angle) * 3
        e2.x -= Math.sin(angle) * 3
        e2.z -= Math.cos(angle) * 3
        
        showMessage('💥 Enemy ships collided!')
      }
    }
  }
  
  // === ENEMY OBSTACLE COLLISION (rocks and islands) ===
  enemyShips.value.forEach((enemy) => {
    if (enemy.hp <= 0) return
    const shipType = SHIP_TYPES[enemy.type]
    
    // Check islands
    for (const island of islands) {
      const dx = enemy.x - island.x
      const dz = enemy.z - island.z
      if (Math.sqrt(dx * dx + dz * dz) < island.radius + 5 * shipType.size) {
        enemy.hp -= 15
        // Bounce away
        const angle = Math.atan2(dx, dz)
        enemy.x += Math.sin(angle) * 5
        enemy.z += Math.cos(angle) * 5
        showMessage(`💥 ${shipType.name} hit an island!`)
      }
    }
    
    // Check rocks
    for (const rock of rocks) {
      const dx = enemy.x - rock.x
      const dz = enemy.z - rock.z
      if (Math.sqrt(dx * dx + dz * dz) < rock.radius + 3 * shipType.size) {
        enemy.hp -= 10
        // Bounce away
        const angle = Math.atan2(dx, dz)
        enemy.x += Math.sin(angle) * 3
        enemy.z += Math.cos(angle) * 3
        showMessage(`💥 ${shipType.name} hit a rock!`)
      }
    }
  })
  
  // === SINKING ANIMATION ===
  enemyShips.value.forEach((enemy, index) => {
    if (enemy.hp <= 0 && !enemy.sinking) {
      // Start sinking
      enemy.sinking = true
      enemy.sinkingTime = 0
      const shipType = SHIP_TYPES[enemy.type]
      showMessage(`💀 ${shipType.name} sinking!`)
    }
    
    if (enemy.sinking) {
      enemy.sinkingTime += dt
      const mesh = enemyShipMeshes[index]
      if (mesh) {
        // Sink into water and rotate
        mesh.position.y = -enemy.sinkingTime * 2 // Sink down
        mesh.rotation.x = Math.min(Math.PI / 2, enemy.sinkingTime * 0.3) // Tilt back
        mesh.rotation.z = Math.sin(enemy.sinkingTime * 3) * 0.1 // Slight wobble
      }
    }
  })
  
  // Remove fully sunk enemies
  for (let i = enemyShips.value.length - 1; i >= 0; i--) {
    if (enemyShips.value[i].sinking && enemyShips.value[i].sinkingTime > 3) {
      // Remove after 3 seconds of sinking
      const mesh = enemyShipMeshes[i]
      if (mesh) scene.remove(mesh)
      enemyShipMeshes.splice(i, 1)
      enemyShips.value.splice(i, 1)
    }
  }
  
  // Check if all enemies destroyed (exclude sinking)
  const activeEnemies = enemyShips.value.filter(e => e.hp > 0 && !e.sinking)
  if (activeEnemies.length === 0 && enemyShips.value.some(e => e.sinking)) {
    // All enemies destroyed!
    enemyShipMeshes.forEach(mesh => scene.remove(mesh))
    enemyShipMeshes = []
    gold.value += 200
    showMessage('💰 All enemies destroyed! +200 Gold')
    
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
  
  // Cannon cooldowns
  if (cannonCooldown.value > 0) cannonCooldown.value -= dt
  if (portCooldown.value > 0) portCooldown.value -= dt
  if (starboardCooldown.value > 0) starboardCooldown.value -= dt
  
  // Animate ocean waves
  if (ocean) {
    animateOceanWaves(Date.now() * 0.001)
  }
  
  // === SHIP WAKE TRAIL ===
  // Spawn wake particles based on speed
  if (playerSpeed.value > 1) {
    // Spawn rate based on speed
    const spawnChance = playerSpeed.value / 20
    if (Math.random() < spawnChance) {
      spawnWakeParticle(playerPos.value.x, playerPos.value.z, playerAngle, false)
    }
  }
  updateWakeParticles(dt)
  
  // === UPDATE ENEMY INDICATORS ===
  updateEnemyIndicators()
}

function updateEnemyIndicators() {
  const indicators = []
  const detectionRange = 400 // Range to show indicators
  
  // Check enemy ships
  enemyShips.value.forEach(enemy => {
    const dx = enemy.x - playerPos.value.x
    const dz = enemy.z - playerPos.value.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < detectionRange && dist > 50) {
      // Calculate angle to enemy
      const angleToEnemy = Math.atan2(dx, dz) - playerAngle
      
      // Convert to screen position (simple approximation)
      const screenX = 50 - Math.sin(angleToEnemy) * 40
      const screenY = 50 - Math.cos(angleToEnemy) * 30
      
      indicators.push({
        x: Math.max(10, Math.min(90, screenX)),
        y: Math.max(10, Math.min(90, screenY)),
        angle: angleToEnemy,
        icon: enemy.type === 'RAMMER' ? '⚔️' : (enemy.type === 'BIG' ? '🏴‍☠️' : '⛵'),
        label: `${enemy.type} (${Math.round(dist)}m)`,
        hpPercent: enemy.hp / enemy.maxHp
      })
    }
  })
  
  // Check kraken
  if (krakenActive && kraken.value.hp > 0) {
    const dx = kraken.value.x - playerPos.value.x
    const dz = kraken.value.z - playerPos.value.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < detectionRange) {
      const angleToKraken = Math.atan2(dx, dz) - playerAngle
      const screenX = 50 - Math.sin(angleToKraken) * 40
      const screenY = 50 - Math.cos(angleToKraken) * 30
      
      indicators.push({
        x: Math.max(10, Math.min(90, screenX)),
        y: Math.max(10, Math.min(90, screenY)),
        angle: -angleToKraken,
        icon: '🐙',
        label: `KRAKEN (${Math.round(dist)}m)`
      })
    }
  }
  
  enemyIndicators.value = indicators
}

// Wake particle functions
function spawnWakeParticle(x, z, angle, isEnemy) {
  const wakeGeom = new THREE.SphereGeometry(0.3, 6, 6)
  const wakeMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.6 
  })
  const wake = new THREE.Mesh(wakeGeom, wakeMat)
  
  // Position behind the ship
  const offset = isEnemy ? 5 : 5
  const sideOffset = (Math.random() - 0.5) * 2 // Random side
  wake.position.set(
    x - Math.sin(angle) * offset + Math.cos(angle) * sideOffset,
    0.3,
    z - Math.cos(angle) * offset - Math.sin(angle) * sideOffset
  )
  
  scene.add(wake)
  playerWake.push({
    mesh: wake,
    life: 2 + Math.random() // 2-3 seconds
  })
  
  // Limit particles
  while (playerWake.length > maxWakeParticles) {
    const old = playerWake.shift()
    scene.remove(old.mesh)
  }
}

function updateWakeParticles(dt) {
  for (let i = playerWake.length - 1; i >= 0; i--) {
    const p = playerWake[i]
    p.life -= dt
    
    // Expand and fade
    const scale = 1 + (2 - p.life) * 0.5
    p.mesh.scale.setScalar(scale)
    p.mesh.material.opacity = (p.life / 3) * 0.5
    p.mesh.position.y = 0.3 + Math.sin(Date.now() * 0.005 + i) * 0.2
    
    if (p.life <= 0) {
      scene.remove(p.mesh)
      playerWake.splice(i, 1)
    }
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
  mouseDeltaX = 0
  turnAccumulator = 0
  targetRotation = 0
  cameraMode = 0 // Reset to behind view
  
  // Reset
  hp.value = 100
  gold.value = 0
  cannonCooldown.value = 0
  portCooldown.value = 0
  starboardCooldown.value = 0
  playerPos.value = { x: 0, z: 0 }
  playerAngle = 0
  targetRotation = 0
  playerSpeed.value = 0
  
  // Clear old enemy references
  enemyShips.value = []
  enemyShipMeshes.forEach(mesh => scene.remove(mesh))
  enemyShipMeshes = []
  
  // Spawn new enemies
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
  
  // Clear wake particles
  playerWake.forEach(w => scene.remove(w.mesh))
  playerWake = []
  
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
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('pointerlockchange', onPointerLockChange)
  window.removeEventListener('wheel', onWheel)
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

/* Enemy indicators */
.indicators {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 15;
}

.indicator {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-shadow: 1px 1px 2px #000;
}

.indicator-icon {
  font-size: 1.5rem;
  filter: drop-shadow(1px 1px 2px #000);
}

.indicator-label {
  font-size: 0.7rem;
  color: #fff;
  background: rgba(0,0,0,0.5);
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.health-bar-container {
  width: 40px;
  height: 5px;
  background: rgba(0,0,0,0.6);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.health-bar {
  height: 100%;
  background: linear-gradient(to right, #ff4444, #44ff44);
  transition: width 0.2s;
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
