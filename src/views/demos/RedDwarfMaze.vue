<template>
  <div class="game-container" ref="container">
    <div class="hud">
      <div class="hud-top">
        <div class="stat">📍 Level: {{ level }}</div>
        <div class="stat">💯 Score: {{ score }}</div>
        <div class="stat">🎒 Items: {{ itemsFound }}/{{ totalItems }}</div>
      </div>
      <div class="hud-bottom">
        <div class="hint" v-if="showHint">Press M for minimap (-500 pts)</div>
        <div class="quip" v-if="quip">{{ quip }}</div>
      </div>
    </div>

    <canvas ref="canvas"></canvas>

    <div class="overlay" v-if="gameState === 'start'">
      <div class="title">🔴 RED DWARF: THE MAZE</div>
      <p>Navigate the corridors of Red Dwarf. Find items. Don't get lost.</p>
      <div class="instructions">
        <p>🎮 <strong>WASD / ZQSD</strong> - Move</p>
        <p>🖱️ <strong>Mouse</strong> - Look around (up/down/left/right)</p>
        <p>🔍 <strong>M</strong> - Toggle minimap (-500 pts)</p>
        <p>🎯 <strong>Find</strong> - Holly's head, Kryten's groinal, Lister's curry, and more!</p>
        <p>🏆 <strong>Goal</strong> - Find all items and reach the exit</p>
      </div>
      <button @click="startGame">🚀 ENTER THE CORRIDORS</button>
    </div>

    <div class="overlay" v-if="gameState === 'win'">
      <div class="title">🎉 ESCAPE COMPLETE!</div>
      <p>You navigated the corridors of Red Dwarf!</p>
      <p>Final Score: {{ score }}</p>
      <p>Items Found: {{ itemsFound }}/{{ totalItems }}</p>
      <button @click="startGame">🔄 PLAY AGAIN</button>
    </div>

    <div class="minimap" v-if="showMinimap">
      <canvas ref="minimapCanvas" width="150" height="150"></canvas>
      <div class="minimap-label">MINIMAP (-500)</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const container = ref(null)
const canvas = ref(null)
const minimapCanvas = ref(null)
let scene, camera, renderer
let animationId = null

// Game state
const gameState = ref('start') // start, playing, win
const level = ref(1)
const score = ref(10000)
const itemsFound = ref(0)
const totalItems = ref(8)
const showMinimap = ref(false)
const showHint = ref(true)
const quip = ref('')

// Player
let playerPos = new THREE.Vector3(2, 1.7, 2)
let playerAngle = 0
let playerPitch = 0 // For looking up/down
const moveSpeed = 5
const keys = { w: false, a: false, s: false, d: false, z: false, q: false }

// Maze
const mazeSize = 25
let maze = []
let walls = []

// Items
let collectibles = []
const collectibleData = [
  { name: "Holly's Head", emoji: '🤖', position: { x: 0, z: 0 }, quip: "Holly: 'I could give you exact coordinates, but I'd have to shoot myself first.'", points: 1000 },
  { name: "Kryten's Groinal", emoji: '🔧', position: { x: 0, z: 0 }, quip: "Kryten: 'Sir, I protest! I am not a piece of hardware!'", points: 800 },
  { name: "Lister's Curry", emoji: '🍛', position: { x: 0, z: 0 }, quip: "Lister: 'Smoke me a kipper, I'll be back for breakfast.'", points: 500 },
  { name: "Zero-G Football VHS", emoji: '📼', position: { x: 0, z: 0 }, quip: "Cat: 'Dude, that was the greatest zero-g football match EVER!'", points: 700 },
  { name: "Rimmer's Hologram", emoji: '👻', position: { x: 0, z: 0 }, quip: "Rimmer: 'Smeghead!' (It's not very effective...)", points: 600 },
  { name: "Cat's Shoes", emoji: '👞', position: { x: 0, z: 0 }, quip: "Cat: 'Those are vintage, man. VINTAGE.'", points: 400 },
  { name: "Vending Machine", emoji: '🥤', position: { x: 0, z: 0 }, quip: "OUT OF ORDER. Just like my life.", points: 300 },
  { name: "The Last Starfighter", emoji: '🎬', position: { x: 0, z: 0 }, quip: "Holly: 'I could give you the winning lottery numbers, but then I'd have to kill myself. Which, technically, I'm already doing.'", points: 900 }
]

// Text sprites
let textSprites = []
let quipTimeout = null

// Procedural texture generation
function createFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  // Base color - dark metallic
  ctx.fillStyle = '#2a2a30'
  ctx.fillRect(0, 0, 512, 512)
  
  // Metal grate pattern
  const gridSize = 64
  for (let x = 0; x < 512; x += gridSize) {
    for (let y = 0; y < 512; y += gridSize) {
      // Grate holes
      ctx.fillStyle = '#1a1a1f'
      ctx.fillRect(x + 8, y + 8, gridSize - 16, gridSize - 16)
      
      // Grate bars
      ctx.strokeStyle = '#3a3a42'
      ctx.lineWidth = 3
      ctx.strokeRect(x + 4, y + 4, gridSize - 8, gridSize - 8)
      
      // Center cross bar
      ctx.strokeStyle = '#4a4a52'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + gridSize/2, y + 8)
      ctx.lineTo(x + gridSize/2, y + gridSize - 8)
      ctx.moveTo(x + 8, y + gridSize/2)
      ctx.lineTo(x + gridSize - 8, y + gridSize/2)
      ctx.stroke()
      
      // Corner bolts
      ctx.fillStyle = '#5a5a62'
      const boltPositions = [x + 12, y + 12, x + gridSize - 12, y + gridSize - 12]
      for (let bx of boltPositions.slice(0,2)) {
        for (let by of [boltPositions[1], boltPositions[3]]) {
          ctx.beginPath()
          ctx.arc(bx, by, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
  
  // Add some wear/scratches
  ctx.strokeStyle = '#222228'
  ctx.lineWidth = 1
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * 512, Math.random() * 512)
    ctx.lineTo(Math.random() * 512, Math.random() * 512)
    ctx.stroke()
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

function createWallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  // Base - industrial grey-blue
  ctx.fillStyle = '#3a3a48'
  ctx.fillRect(0, 0, 512, 512)
  
  // Panel divisions
  const panelWidth = 128
  ctx.strokeStyle = '#2a2a35'
  ctx.lineWidth = 4
  
  // Vertical lines
  for (let x = panelWidth; x < 512; x += panelWidth) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = panelWidth; y < 512; y += panelWidth) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  
  // Rivets along panel edges
  ctx.fillStyle = '#5a5a68'
  const rivetSpacing = 32
  for (let x = rivetSpacing; x < 512; x += rivetSpacing) {
    for (let y = rivetSpacing; y < 512; y += rivetSpacing) {
      // Only place rivets near panel edges
      if (x < panelWidth || x > panelWidth * 3) {
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        // Rivet highlight
        ctx.fillStyle = '#6a6a78'
        ctx.beginPath()
        ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#5a5a68'
      }
    }
  }
  
  // Add some panel details - warning stripes in corners
  ctx.fillStyle = '#ffaa00'
  ctx.globalAlpha = 0.3
  ctx.fillRect(0, 0, 40, 40)
  ctx.fillRect(472, 0, 40, 40)
  ctx.fillRect(0, 472, 40, 40)
  ctx.fillRect(472, 472, 40, 40)
  ctx.globalAlpha = 1.0
  
  // Vertical cable/pipe running down
  ctx.fillStyle = '#555560'
  ctx.fillRect(100, 0, 15, 512)
  ctx.fillStyle = '#656570'
  ctx.fillRect(102, 0, 5, 512)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  return texture
}

function createCeilingTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  // Base - darker
  ctx.fillStyle = '#1a1a22'
  ctx.fillRect(0, 0, 512, 512)
  
  // Grid pattern
  const gridSize = 128
  ctx.strokeStyle = '#252530'
  ctx.lineWidth = 2
  
  for (let x = gridSize; x < 512; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  
  for (let y = gridSize; y < 512; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  
  // Light fixture circles
  for (let x = gridSize/2; x < 512; x += gridSize) {
    for (let y = gridSize/2; y < 512; y += gridSize) {
      // Fixture base
      ctx.fillStyle = '#2a2a35'
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.fill()
      
      // Light glow area
      ctx.fillStyle = '#ffffcc'
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1.0
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

function generateMaze() {
  // Initialize maze with walls
  maze = []
  for (let z = 0; z < mazeSize; z++) {
    maze[z] = []
    for (let x = 0; x < mazeSize; x++) {
      maze[z][x] = 1 // 1 = wall
    }
  }

  // Recursive backtracker maze generation
  function carve(x, z) {
    maze[z][x] = 0 // 0 = path
    
    const directions = [
      { dx: 0, dz: -2 },
      { dx: 2, dz: 0 },
      { dx: 0, dz: 2 },
      { dx: -2, dz: 0 }
    ].sort(() => Math.random() - 0.5)
    
    for (const dir of directions) {
      const nx = x + dir.dx
      const nz = z + dir.dz
      
      if (nx > 0 && nx < mazeSize - 1 && nz > 0 && nz < mazeSize - 1 && maze[nz][nx] === 1) {
        maze[z + dir.dz / 2][x + dir.dx / 2] = 0
        carve(nx, nz)
      }
    }
  }

  carve(1, 1)

  // Ensure start and exit are open
  maze[1][1] = 0
  maze[mazeSize - 2][mazeSize - 2] = 0
}

function init() {
  // Scene - darker atmosphere for more dramatic lighting
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a25)
  scene.fog = new THREE.Fog(0x1a1a25, 5, 35)

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.copy(playerPos)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x1a1a25)

  // Dim ambient for dramatic lighting
  const ambientLight = new THREE.AmbientLight(0x9090a0, 0.4)
  scene.add(ambientLight)

  // Add ceiling lights throughout the maze
  for (let i = 0; i < 20; i++) {
    const x = (i % 5) * 5 + 2
    const z = Math.floor(i / 5) * 5 + 2
    const light = new THREE.PointLight(0xffffcc, 1.5, 12)
    light.position.set(x, 2.7, z)
    scene.add(light)
    
    // Light fixture visual
    const fixtureGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3)
    const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial)
    fixture.position.set(x, 2.9, z)
    scene.add(fixture)
  }

  // Add wall lights along corridors
  for (let x = 2; x < mazeSize - 2; x += 4) {
    for (let z = 2; z < mazeSize - 2; z += 4) {
      // Check if this is a corridor (not a wall)
      if (maze[z] && maze[z][x] === 0) {
        // Check adjacent cells for walls to place lights on
        const directions = [[1,0], [-1,0], [0,1], [0,-1]]
        for (const [dx, dz] of directions) {
          const wx = x + dx
          const wz = z + dz
          if (wx > 0 && wx < mazeSize - 1 && wz > 0 && wz < mazeSize - 1 && maze[wz] && maze[wz][wx] === 1) {
            // Found a wall adjacent to corridor - place a light
            const wallLight = new THREE.PointLight(0xffaa66, 0.8, 8)
            wallLight.position.set(wx - dx * 0.3, 1.5, wz - dz * 0.3)
            scene.add(wallLight)
            
            // Wall sconce visual
            const sconceGeometry = new THREE.SphereGeometry(0.15, 8, 8)
            const sconceMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa66 })
            const sconce = new THREE.Mesh(sconceGeometry, sconceMaterial)
            sconce.position.set(wx - dx * 0.4, 1.5, wz - dz * 0.4)
            scene.add(sconce)
            
            break // Only one wall light per corridor cell
          }
        }
      }
    }
  }
    const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial)
    fixture.position.set(x, 2.95, z)
    scene.add(fixture)
  }

  // Player light (flashlight) - brighter and further reach
  const playerLight = new THREE.PointLight(0xffffff, 2, 30)
  playerLight.position.set(0, 0, 0)
  camera.add(playerLight)
  scene.add(camera)

  // Generate maze
  generateMaze()
  createMazeGeometry()

  // Add wall lights along corridors (after maze exists)
  for (let x = 2; x < mazeSize - 2; x += 4) {
    for (let z = 2; z < mazeSize - 2; z += 4) {
      // Check if this is a corridor (not a wall)
      if (maze[z] && maze[z][x] === 0) {
        // Check adjacent cells for walls to place lights on
        const directions = [[1,0], [-1,0], [0,1], [0,-1]]
        for (const [dx, dz] of directions) {
          const wx = x + dx
          const wz = z + dz
          if (wx > 0 && wx < mazeSize - 1 && wz > 0 && wz < mazeSize - 1 && maze[wz] && maze[wz][wx] === 1) {
            // Found a wall adjacent to corridor - place a light
            const wallLight = new THREE.PointLight(0xffaa66, 0.8, 8)
            wallLight.position.set(wx - dx * 0.3, 1.5, wz - dz * 0.3)
            scene.add(wallLight)
            
            // Wall sconce visual
            const sconceGeometry = new THREE.SphereGeometry(0.15, 8, 8)
            const sconceMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa66 })
            const sconce = new THREE.Mesh(sconceGeometry, sconceMaterial)
            sconce.position.set(wx - dx * 0.4, 1.5, wz - dz * 0.4)
            scene.add(sconce)
            
            break // Only one wall light per corridor cell
          }
        }
      }
    }
  }

  // Place collectibles
  placeCollectibles()

  // Events
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', () => {
    container.value.requestPointerLock()
  })
}

function createMazeGeometry() {
  // Clear existing
  walls.forEach(w => scene.remove(w))
  walls = []

  // Create procedural textures
  const floorTexture = createFloorTexture()
  const wallTexture = createWallTexture()
  const ceilingTexture = createCeilingTexture()

  // Floor - industrial metal grating
  const floorGeometry = new THREE.PlaneGeometry(mazeSize, mazeSize)
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: floorTexture,
    roughness: 0.7,
    metalness: 0.5,
    emissive: 0x111115,
    emissiveIntensity: 0.1
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(mazeSize / 2, 0, mazeSize / 2)
  scene.add(floor)

  // Ceiling
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: ceilingTexture,
    roughness: 0.9,
    metalness: 0.2,
    emissive: 0x111115,
    emissiveIntensity: 0.05
  })
  const ceiling = new THREE.Mesh(floorGeometry.clone(), ceilingMaterial)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(mazeSize / 2, 3, mazeSize / 2)
  scene.add(ceiling)

  // Walls - riveted metal panels
  const wallGeometry = new THREE.BoxGeometry(1, 3, 1)
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    roughness: 0.6,
    metalness: 0.5,
    emissive: 0x111122,
    emissiveIntensity: 0.15
  })

  // Pipe material for industrial look
  const pipeMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.5,
    metalness: 0.6
  })

  for (let z = 0; z < mazeSize; z++) {
    for (let x = 0; x < mazeSize; x++) {
      if (maze[z][x] === 1) {
        // Main wall
        const wall = new THREE.Mesh(wallGeometry, wallMaterial)
        wall.position.set(x + 0.5, 1.5, z + 0.5)
        scene.add(wall)
        walls.push(wall)

        // Add pipes occasionally
        if (Math.random() < 0.3) {
          const pipeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3)
          const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial)
          pipe.position.set(x + 0.5, 1.5, z + 0.5)
          scene.add(pipe)
          walls.push(pipe)
        }
      }
    }
  }

  // Add some industrial details
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * (mazeSize - 2)) + 1
    const z = Math.floor(Math.random() * (mazeSize - 2)) + 1
    if (maze[z][x] === 0) {
      // Warning stripes
      const stripeGeometry = new THREE.PlaneGeometry(0.8, 0.8)
      const stripeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        side: THREE.DoubleSide
      })
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
      stripe.rotation.x = -Math.PI / 2
      stripe.position.set(x + 0.5, 0.01, z + 0.5)
      scene.add(stripe)
    }
  }
}

// ============================================
// 3D COLLECTIBLE PROP CREATORS
// ============================================

// Load texture from URL
function loadTexture(url) {
  const loader = new THREE.TextureLoader()
  return loader.load(url)
}

function createHollyHead() {
  const group = new THREE.Group()
  
  // Create Holly's face as a plane with texture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  
  // Black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 256, 256)
  
  // Draw face (simplified Norman Lovett)
  ctx.fillStyle = '#e8d4b8' // skin tone
  ctx.beginPath()
  ctx.ellipse(128, 130, 70, 85, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Hair (receding)
  ctx.fillStyle = '#6a5a4a'
  ctx.beginPath()
  ctx.ellipse(128, 80, 72, 40, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  
  // Eyes
  ctx.fillStyle = '#c0d0e0' // blue-grey
  ctx.beginPath()
  ctx.ellipse(100, 120, 15, 10, 0, 0, Math.PI * 2)
  ctx.ellipse(156, 120, 15, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Pupils
  ctx.fillStyle = '#303030'
  ctx.beginPath()
  ctx.arc(100, 120, 6, 0, Math.PI * 2)
  ctx.arc(156, 120, 6, 0, Math.PI * 2)
  ctx.fill()
  
  // Nose
  ctx.fillStyle = '#d8c4a8'
  ctx.beginPath()
  ctx.moveTo(128, 125)
  ctx.lineTo(120, 150)
  ctx.lineTo(136, 150)
  ctx.closePath()
  ctx.fill()
  
  // Mouth (slightly open)
  ctx.fillStyle = '#202020'
  ctx.beginPath()
  ctx.ellipse(128, 170, 20, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(128, 168, 15, 6, 0, 0, Math.PI)
  ctx.fill()
  
  // Wrinkles / features
  ctx.strokeStyle = '#c0b0a0'
  ctx.lineWidth = 2
  // Crow's feet
  ctx.beginPath()
  ctx.moveTo(75, 115)
  ctx.lineTo(85, 118)
  ctx.moveTo(75, 122)
  ctx.lineTo(85, 122)
  ctx.moveTo(181, 115)
  ctx.lineTo(171, 118)
  ctx.moveTo(181, 122)
  ctx.lineTo(171, 122)
  ctx.stroke()
  
  // Forehead lines
  ctx.beginPath()
  ctx.moveTo(100, 95)
  ctx.lineTo(156, 95)
  ctx.moveTo(105, 85)
  ctx.lineTo(151, 85)
  ctx.stroke()
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  // Screen/frame
  const screenGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1)
  const screenMaterial = new THREE.MeshStandardMaterial({ 
    map: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.3
  })
  const screen = new THREE.Mesh(screenGeometry, screenMaterial)
  screen.rotation.y = Math.PI
  group.add(screen)
  
  // Frame/stand
  const frameGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.05)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.8, roughness: 0.3 })
  const frame = new THREE.Mesh(frameGeometry, frameMaterial)
  frame.position.z = -0.03
  group.add(frame)
  
  // Glowing edge
  const edgeGeometry = new THREE.EdgesGeometry(screenGeometry)
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
  edges.position.z = 0.06
  group.add(edges)
  
  return group
}

function createKryten() {
  const group = new THREE.Group()
  
  // Head (elongated egg shape)
  const headGeometry = new THREE.SphereGeometry(0.35, 16, 16)
  headGeometry.scale(1, 1.3, 0.9)
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xc0c0c8, 
    metalness: 0.9, 
    roughness: 0.2 
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 0.3
  group.add(head)
  
  // Face plate (metallic face)
  const faceGeometry = new THREE.SphereGeometry(0.3, 16, 16)
  faceGeometry.scale(1, 1.1, 0.5)
  const faceMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xa0a0a8, 
    metalness: 0.95, 
    roughness: 0.1 
  })
  const face = new THREE.Mesh(faceGeometry, faceMaterial)
  face.position.set(0, 0.25, 0.2)
  group.add(face)
  
  // Eyes (glowing red)
  const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8)
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.12, 0.35, 0.32)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.12, 0.35, 0.32)
  group.add(rightEye)
  
  // Eye glow
  const eyeLight = new THREE.PointLight(0xff0000, 0.5, 2)
  eyeLight.position.set(0, 0.35, 0.4)
  group.add(eyeLight)
  
  // Antenna
  const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8)
  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
  antenna.position.set(0.15, 0.7, 0)
  antenna.rotation.z = -0.3
  group.add(antenna)
  
  // Antenna tip (red)
  const tipGeometry = new THREE.SphereGeometry(0.04, 8, 8)
  const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const tip = new THREE.Mesh(tipGeometry, tipMaterial)
  tip.position.set(0.22, 0.82, 0)
  group.add(tip)
  
  // Red markings on head
  const markingGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.01)
  const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xff3030 })
  const marking1 = new THREE.Mesh(markingGeometry, markingMaterial)
  marking1.position.set(0, 0.55, 0.3)
  group.add(marking1)
  
  // Collar/suit indication
  const collarGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.3)
  const collarMaterial = new THREE.MeshStandardMaterial({ color: 0x303040, metalness: 0.3 })
  const collar = new THREE.Mesh(collarGeometry, collarMaterial)
  collar.position.y = -0.1
  group.add(collar)
  
  return group
}

function createHollyHopDrive() {
  const group = new THREE.Group()
  
  // Main box (red)
  const boxGeometry = new THREE.BoxGeometry(0.4, 0.25, 0.2)
  const boxMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcc2222, 
    metalness: 0.3, 
    roughness: 0.6 
  })
  const box = new THREE.Mesh(boxGeometry, boxMaterial)
  group.add(box)
  
  // Button "START" (green)
  const startGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16)
  startGeometry.rotateX(Math.PI / 2)
  const startMaterial = new THREE.MeshStandardMaterial({ color: 0x22cc22, emissive: 0x00aa00, emissiveIntensity: 0.5 })
  const startBtn = new THREE.Mesh(startGeometry, startMaterial)
  startBtn.position.set(-0.1, 0.05, 0.11)
  group.add(startBtn)
  
  // Button "STOP" (red)
  const stopMaterial = new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0x550000, emissiveIntensity: 0.5 })
  const stopBtn = new THREE.Mesh(startGeometry.clone(), stopMaterial)
  stopBtn.position.set(0.1, 0.05, 0.11)
  group.add(stopBtn)
  
  // Label plates
  const labelGeometry = new THREE.PlaneGeometry(0.12, 0.04)
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 64
  labelCanvas.height = 20
  const ctx = labelCanvas.getContext('2d')
  ctx.fillStyle = '#222222'
  ctx.fillRect(0, 0, 64, 20)
  ctx.fillStyle = '#00ff00'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('START', 32, 14)
  const startLabelTexture = new THREE.CanvasTexture(labelCanvas)
  
  const startLabelMaterial = new THREE.MeshBasicMaterial({ map: startLabelTexture })
  const startLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), startLabelMaterial)
  startLabel.position.set(-0.1, 0.08, 0.11)
  group.add(startLabel)
  
  // STOP label
  const stopCanvas = document.createElement('canvas')
  stopCanvas.width = 64
  stopCanvas.height = 20
  const ctx2 = stopCanvas.getContext('2d')
  ctx2.fillStyle = '#222222'
  ctx2.fillRect(0, 0, 64, 20)
  ctx2.fillStyle = '#ff4444'
  ctx2.font = 'bold 10px monospace'
  ctx2.textAlign = 'center'
  ctx2.fillText('STOP', 32, 14)
  const stopLabelTexture = new THREE.CanvasTexture(stopCanvas)
  
  const stopLabelMaterial = new THREE.MeshBasicMaterial({ map: stopLabelTexture })
  const stopLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), stopLabelMaterial)
  stopLabel.position.set(0.1, 0.08, 0.11)
  group.add(stopLabel)
  
  // Glowing wires on top
  const wireGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8)
  const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const wire1 = new THREE.Mesh(wireGeometry, wireMaterial)
  wire1.position.set(-0.08, 0.2, 0)
  group.add(wire1)
  const wire2 = new THREE.Mesh(wireGeometry, wireMaterial)
  wire2.position.set(0.08, 0.2, 0)
  group.add(wire2)
  
  return group
}

function createCurry() {
  const group = new THREE.Group()
  
  // Bowl
  const bowlGeometry = new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const bowlMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })
  const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial)
  bowl.rotation.x = Math.PI
  group.add(bowl)
  
  // Curry (orange/brown)
  const curryGeometry = new THREE.CircleGeometry(0.22, 16)
  const curryMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcc6600, 
    roughness: 0.9,
    emissive: 0x331100,
    emissiveIntensity: 0.2
  })
  const curry = new THREE.Mesh(curryGeometry, curryMaterial)
  curry.rotation.x = -Math.PI / 2
  curry.position.y = 0.1
  group.add(curry)
  
  // Rice (white mounds)
  const riceGeometry = new THREE.SphereGeometry(0.08, 8, 8)
  const riceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
  for (let i = 0; i < 3; i++) {
    const rice = new THREE.Mesh(riceGeometry, riceMaterial)
    rice.position.set((Math.random() - 0.5) * 0.2, 0.12, (Math.random() - 0.5) * 0.2)
    rice.scale.y = 0.6
    group.add(rice)
  }
  
  // Steam particles (will be added as simple spheres)
  const steamGeometry = new THREE.SphereGeometry(0.03, 4, 4)
  const steamMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
  for (let i = 0; i < 5; i++) {
    const steam = new THREE.Mesh(steamGeometry, steamMaterial)
    steam.position.set((Math.random() - 0.5) * 0.15, 0.2 + i * 0.08, (Math.random() - 0.5) * 0.15)
    steam.userData.floatSpeed = 0.5 + Math.random() * 0.5
    steam.userData.floatOffset = Math.random() * Math.PI * 2
    group.add(steam)
  }
  
  return group
}

function createVendingMachine() {
  const group = new THREE.Group()
  
  // Main body
  const bodyGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.3)
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x444455, 
    metalness: 0.5, 
    roughness: 0.5 
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.5
  group.add(body)
  
  // Screen (red "OUT OF ORDER")
  const screenCanvas = document.createElement('canvas')
  screenCanvas.width = 128
  screenCanvas.height = 64
  const ctx = screenCanvas.getContext('2d')
  ctx.fillStyle = '#220000'
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = '#ff0000'
  ctx.font = 'bold 12px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('OUT OF', 64, 25)
  ctx.fillText('ORDER', 64, 45)
  const screenTexture = new THREE.CanvasTexture(screenCanvas)
  
  const screenGeometry = new THREE.PlaneGeometry(0.4, 0.25)
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture })
  const screen = new THREE.Mesh(screenGeometry, screenMaterial)
  screen.position.set(0, 0.7, 0.16)
  group.add(screen)
  
  // Screen glow
  const screenLight = new THREE.PointLight(0xff0000, 0.5, 2)
  screenLight.position.set(0, 0.7, 0.3)
  group.add(screenLight)
  
  // Glass panel
  const glassGeometry = new THREE.PlaneGeometry(0.45, 0.5)
  const glassMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x88ccff, 
    transparent: true, 
    opacity: 0.3,
    metalness: 0.9,
    roughness: 0.1
  })
  const glass = new THREE.Mesh(glassGeometry, glassMaterial)
  glass.position.set(0, 0.45, 0.16)
  group.add(glass)
  
  return group
}

function createCatShoes() {
  const group = new THREE.Group()
  
  const shoeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x6633aa, 
    roughness: 0.4,
    metalness: 0.3
  })
  
  // Left shoe
  const shoeGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.25)
  const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial)
  leftShoe.position.set(-0.1, 0.04, 0)
  leftShoe.rotation.y = 0.2
  group.add(leftShoe)
  
  // Right shoe
  const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial)
  rightShoe.position.set(0.1, 0.04, 0)
  rightShoe.rotation.y = -0.2
  group.add(rightShoe)
  
  // Shine highlights
  const shineMaterial = new THREE.MeshBasicMaterial({ color: 0x9966ff })
  const shine1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.15), shineMaterial)
  shine1.position.set(-0.1, 0.05, 0.05)
  group.add(shine1)
  const shine2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.15), shineMaterial)
  shine2.position.set(0.1, 0.05, 0.05)
  group.add(shine2)
  
  return group
}

function createVHS() {
  const group = new THREE.Group()
  
  // Cassette body
  const bodyGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)
  
  // Label
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 128
  labelCanvas.height = 64
  const ctx = labelCanvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ZERO-G', 64, 25)
  ctx.fillText('FOOTBALL', 64, 40)
  ctx.fillStyle = '#ff0000'
  ctx.font = 'bold 6px sans-serif'
  ctx.fillText('SP', 20, 55)
  ctx.fillText('120 MIN', 108, 55)
  const labelTexture = new THREE.CanvasTexture(labelCanvas)
  
  const labelGeometry = new THREE.PlaneGeometry(0.25, 0.04)
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture })
  const label = new THREE.Mesh(labelGeometry, labelMaterial)
  label.position.y = 0.026
  label.rotation.x = -Math.PI / 2
  group.add(label)
  
  // Spools
  const spoolGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16)
  const spoolMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 })
  const leftSpool = new THREE.Mesh(spoolGeometry, spoolMaterial)
  leftSpool.position.set(-0.08, 0.03, 0)
  leftSpool.rotation.x = Math.PI / 2
  group.add(leftSpool)
  const rightSpool = new THREE.Mesh(spoolGeometry, spoolMaterial)
  rightSpool.position.set(0.08, 0.03, 0)
  rightSpool.rotation.x = Math.PI / 2
  group.add(rightSpool)
  
  return group
}

function createHologram() {
  const group = new THREE.Group()
  
  // Rimmer-style hologram body
  const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8)
  const bodyMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x4444ff, 
    transparent: true, 
    opacity: 0.6 
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.12, 16, 16)
  const head = new THREE.Mesh(headGeometry, bodyMaterial)
  head.position.y = 0.35
  group.add(head)
  
  // Eyes (glowing)
  const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8)
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.04, 0.38, 0.1)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.04, 0.38, 0.1)
  group.add(rightEye)
  
  // Glow light
  const hologramLight = new THREE.PointLight(0x4444ff, 1, 3)
  hologramLight.position.y = 0.2
  group.add(hologramLight)
  
  return group
}

function createStarbug() {
  const group = new THREE.Group()
  
  // Main body (elongated)
  const bodyGeometry = new THREE.BoxGeometry(0.4, 0.2, 1.2)
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x88aacc, 
    metalness: 0.7, 
    roughness: 0.3 
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)
  
  // Cockpit (dome)
  const cockpitGeometry = new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const cockpitMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x33ccff, 
    transparent: true, 
    opacity: 0.7,
    metalness: 0.9,
    roughness: 0.1
  })
  const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial)
  cockpit.position.set(0, 0.1, 0.4)
  group.add(cockpit)
  
  // Wings
  const wingGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.4)
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x668899, metalness: 0.6 })
  const wings = new THREE.Mesh(wingGeometry, wingMaterial)
  wings.position.set(0, 0, -0.2)
  group.add(wings)
  
  // Engines (glowing)
  const engineGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8)
  const engineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial)
  leftEngine.rotation.x = Math.PI / 2
  leftEngine.position.set(-0.25, 0, -0.5)
  group.add(leftEngine)
  const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial)
  rightEngine.rotation.x = Math.PI / 2
  rightEngine.position.set(0.25, 0, -0.5)
  group.add(rightEngine)
  
  // Engine glow
  const engineLight1 = new THREE.PointLight(0x00ff00, 1, 3)
  engineLight1.position.set(-0.25, 0, -0.6)
  group.add(engineLight1)
  const engineLight2 = new THREE.PointLight(0x00ff00, 1, 3)
  engineLight2.position.set(0.25, 0, -0.6)
  group.add(engineLight2)
  
  return group
}

function placeCollectibles() {
  // Clear existing
  collectibles.forEach(c => scene.remove(c.mesh))
  collectibles = []
  textSprites.forEach(t => scene.remove(t))
  textSprites = []

  // Place items in maze (avoid start position)
  const usedPositions = new Set()
  usedPositions.add('1,1')
  usedPositions.add(`${mazeSize - 2},${mazeSize - 2}`)

  collectibleData.forEach((item, i) => {
    let x, z
    do {
      x = Math.floor(Math.random() * (mazeSize - 2)) + 1
      z = Math.floor(Math.random() * (mazeSize - 2)) + 1
    } while (maze[z][x] === 1 || usedPositions.has(`${x},${z}`) || (x < 3 && z < 3))

    usedPositions.add(`${x},${z}`)
    item.position = { x: x + 0.5, z: z + 0.5 }

    // Create 3D prop based on item name
    const itemGroup = new THREE.Group()
    
    let propCreator = null
    let propColor = 0x00ff00
    
    if (item.name.includes("Holly")) {
      propCreator = createHollyHead
      propColor = 0x00ff00
    } else if (item.name.includes("Kryten")) {
      propCreator = createKryten
      propColor = 0xff0000
    } else if (item.name.includes("Curry")) {
      propCreator = createCurry
      propColor = 0xff6600
    } else if (item.name.includes("VHS")) {
      propCreator = createVHS
      propColor = 0x3333ff
    } else if (item.name.includes("Rimmer")) {
      propCreator = createHologram
      propColor = 0x4444ff
    } else if (item.name.includes("Cat")) {
      propCreator = createCatShoes
      propColor = 0x9933ff
    } else if (item.name.includes("Vending")) {
      propCreator = createVendingMachine
      propColor = 0xff0000
    } else if (item.name.includes("Starfighter")) {
      propCreator = createHollyHopDrive
      propColor = 0xff0000
    }
    
    // Create the prop
    if (propCreator) {
      const prop = propCreator()
      prop.position.y = 0.8
      itemGroup.add(prop)
    } else {
      // Fallback to glowing box
      const boxGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
      const boxMaterial = new THREE.MeshBasicMaterial({ color: propColor })
      const box = new THREE.Mesh(boxGeometry, boxMaterial)
      box.position.y = 1
      itemGroup.add(box)
    }

    // Glow (always)
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: propColor, 
      transparent: true, 
      opacity: 0.2 
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.y = 1
    itemGroup.add(glow)

    // Point light
    const light = new THREE.PointLight(propColor, 0.5, 3)
    light.position.y = 1
    itemGroup.add(light)

    itemGroup.position.set(x + 0.5, 0, z + 0.5)
    
    collectibles.push({
      ...item,
      mesh: itemGroup,
      found: false,
      index: i
    })
    
    scene.add(itemGroup)
  })

  // Exit marker
  const exitGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32)
  const exitMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const exitMarker = new THREE.Mesh(exitGeometry, exitMaterial)
  exitMarker.position.set(mazeSize - 1.5, 0.05, mazeSize - 1.5)
  scene.add(exitMarker)

  // Exit glow
  const exitLight = new THREE.PointLight(0xff00ff, 1, 5)
  exitLight.position.set(mazeSize - 1.5, 1, mazeSize - 1.5)
  scene.add(exitLight)
}

function showQuip(text) {
  quip.value = text
  if (quipTimeout) clearTimeout(quipTimeout)
  quipTimeout = setTimeout(() => {
    quip.value = ''
  }, 4000)
}

function checkCollisions(newX, newZ) {
  const margin = 0.3
  const px = Math.floor(newX)
  const pz = Math.floor(newZ)

  // Check surrounding cells
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cz = pz + dz
      const cx = px + dx
      if (cz >= 0 && cz < mazeSize && cx >= 0 && cx < mazeSize) {
        if (maze[cz][cx] === 1) {
          // Collision with wall
          const wallX = cx + 0.5
          const wallZ = cz + 0.5
          const distX = Math.abs(newX - wallX)
          const distZ = Math.abs(newZ - wallZ)
          
          if (distX < 0.7 && distZ < 0.7) {
            return true
          }
        }
      }
    }
  }
  return false
}

function checkCollectibles() {
  collectibles.forEach(item => {
    if (item.found) return
    
    const dx = playerPos.x - item.position.x
    const dz = playerPos.z - item.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < 1) {
      item.found = true
      itemsFound.value++
      score.value += item.points
      scene.remove(item.mesh)
      showQuip(item.quip)
    }
  })
}

function checkExit() {
  const exitX = mazeSize - 1.5
  const exitZ = mazeSize - 1.5
  const dx = playerPos.x - exitX
  const dz = playerPos.z - exitZ
  const dist = Math.sqrt(dx * dx + dz * dz)
  
  if (dist < 1.5 && itemsFound.value >= totalItems.value / 2) {
    gameState.value = 'win'
    document.exitPointerLock()
  } else if (dist < 1.5 && itemsFound.value < totalItems.value / 2) {
    showQuip("Holly: 'You need to find more items before exiting, sir.'")
  }
}

function updateMinimap() {
  if (!showMinimap.value || !minimapCanvas.value) return
  
  const ctx = minimapCanvas.value.getContext('2d')
  const cellSize = 150 / mazeSize
  
  // Clear
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 150, 150)
  
  // Draw maze
  for (let z = 0; z < mazeSize; z++) {
    for (let x = 0; x < mazeSize; x++) {
      if (maze[z][x] === 1) {
        ctx.fillStyle = '#444'
        ctx.fillRect(x * cellSize, z * cellSize, cellSize, cellSize)
      }
    }
  }
  
  // Draw items
  collectibles.forEach(item => {
    if (!item.found) {
      ctx.fillStyle = '#0f0'
      ctx.beginPath()
      ctx.arc(item.position.x * cellSize, item.position.z * cellSize, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  
  // Draw player
  ctx.fillStyle = '#f0f'
  ctx.beginPath()
  ctx.arc(playerPos.x * cellSize, playerPos.z * cellSize, 4, 0, Math.PI * 2)
  ctx.fill()
  
  // Draw exit
  ctx.fillStyle = '#ff0'
  ctx.fillRect((mazeSize - 2) * cellSize, (mazeSize - 2) * cellSize, cellSize, cellSize)
}

let lastTime = 0
function update(time) {
  if (gameState.value !== 'playing') return

  const dt = Math.min((time - lastTime) / 1000, 0.1)
  lastTime = time

  // Movement
  let moveX = 0
  let moveZ = 0

  if (keys.w) moveZ -= 1
  if (keys.s) moveZ += 1
  if (keys.a) moveX -= 1
  if (keys.d) moveX += 1

  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    moveX /= len
    moveZ /= len

    // Rotate by NEGATIVE camera angle (to move in direction we're looking)
    const angle = -playerAngle
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    const dx = moveX * cos - moveZ * sin
    const dz = moveX * sin + moveZ * cos

    const newX = playerPos.x + dx * moveSpeed * dt
    const newZ = playerPos.z + dz * moveSpeed * dt

    // Check collisions separately for each axis
    if (!checkCollisions(newX, playerPos.z)) {
      playerPos.x = newX
    }
    if (!checkCollisions(playerPos.x, newZ)) {
      playerPos.z = newZ
    }
  }

  // Update camera
  camera.position.copy(playerPos)
  camera.rotation.order = 'YXZ' // Important for separate yaw/pitch
  camera.rotation.y = playerAngle
  camera.rotation.x = playerPitch

  // Check collectibles
  checkCollectibles()
  
  // Check exit
  checkExit()
  
  // Update minimap
  updateMinimap()
}

function animate(time) {
  animationId = requestAnimationFrame(animate)
  update(time)
  renderer.render(scene, camera)
}

function startGame() {
  gameState.value = 'playing'
  score.value = 10000
  itemsFound.value = 0
  playerPos.set(2, 1.7, 2)
  playerAngle = 0
  playerPitch = 0
  
  generateMaze()
  createMazeGeometry()
  placeCollectibles()
  
  showHint.value = true
  setTimeout(() => {
    showHint.value = false
  }, 10000)
  
  // Request pointer lock
  if (container.value) {
    container.value.requestPointerLock()
  }
}

function onKeyDown(e) {
  // Use e.code for physical key position (works for both QWERTY and AZERTY)
  const code = e.code
  // WASD on QWERTY = ZQSD on AZERTY (same physical keys)
  if (code === 'KeyW' || code === 'KeyZ') keys.w = true
  if (code === 'KeyA' || code === 'KeyQ') keys.a = true
  if (code === 'KeyS') keys.s = true
  if (code === 'KeyD') keys.d = true
  
  if (e.key.toLowerCase() === 'm' && gameState.value === 'playing') {
    showMinimap.value = !showMinimap.value
    if (showMinimap.value) {
      score.value = Math.max(0, score.value - 500)
      showQuip("Holly: 'Using minimap detected. Score penalty applied.'")
    }
  }
}

function onKeyUp(e) {
  const code = e.code
  if (code === 'KeyW' || code === 'KeyZ') keys.w = false
  if (code === 'KeyA' || code === 'KeyQ') keys.a = false
  if (code === 'KeyS') keys.s = false
  if (code === 'KeyD') keys.d = false
}

function onMouseMove(e) {
  if (document.pointerLockElement === container.value && gameState.value === 'playing') {
    playerAngle -= e.movementX * 0.002
    // Add vertical look (pitch) - clamped to avoid flipping
    playerPitch -= e.movementY * 0.002
    playerPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, playerPitch))
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  init()
  animate(0)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
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
  padding: 1rem;
  color: #0f0;
  font-family: 'Courier New', monospace;
  z-index: 10;
  text-shadow: 0 0 10px #0f0;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
}

.hud-bottom {
  margin-top: 0.5rem;
  text-align: center;
}

.hint {
  color: #ff0;
  font-size: 0.9rem;
}

.quip {
  color: #0ff;
  font-size: 1rem;
  animation: fadeIn 0.5s ease;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.5rem;
  border-radius: 4px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  z-index: 20;
  font-family: 'Courier New', monospace;
}

.title {
  font-size: 2.5rem;
  color: #f00;
  text-shadow: 0 0 20px #f00, 0 0 40px #f00;
  margin-bottom: 1rem;
}

.overlay p {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.instructions {
  background: rgba(255, 255, 255, 0.1);
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
  font-size: 1.3rem;
  background: #f00;
  color: #fff;
  border: 2px solid #0f0;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
}

.overlay button:hover {
  background: #a00;
  transform: scale(1.05);
}

.minimap {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  border: 2px solid #0f0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 15;
}

.minimap canvas {
  width: 150px;
  height: 150px;
}

.minimap-label {
  color: #f00;
  font-size: 0.7rem;
  text-align: center;
  padding: 0.2rem;
  font-family: 'Courier New', monospace;
}
</style>
