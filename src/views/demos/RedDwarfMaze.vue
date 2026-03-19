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

    // Create glowing item
    const itemGroup = new THREE.Group()
    
    // Main item (floating box)
    const boxGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const box = new THREE.Mesh(boxGeometry, boxMaterial)
    box.position.y = 1
    itemGroup.add(box)

    // Glow
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.3 
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.y = 1
    itemGroup.add(glow)

    // Point light
    const light = new THREE.PointLight(0x00ff00, 0.5, 3)
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
