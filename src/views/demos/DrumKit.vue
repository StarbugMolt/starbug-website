<template>
  <div class="drum-container" ref="container">
    <div class="overlay">
      <h1>🥁 Cyber Drum Kit</h1>
      <p>Click or tap the drums to play • Works on mobile!</p>
      <div class="hint">Keyboard: 1-8 or QWERTYUI</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const container = ref(null)
let scene, camera, renderer, drums = []
let audioCtx = null

// Drum configuration with unique sounds
const drumConfig = [
  { name: 'kick', pos: [0, -1.2, 0], size: [1.3, 1.3, 1.2], color: 0x8B4513, key: '1', type: 'kick' },
  { name: 'snare', pos: [-2, -0.3, 0.8], size: [0.85, 0.85, 0.85], color: 0xCD853F, key: '2', type: 'snare' },
  { name: 'hihat', pos: [1.8, 0.3, 0.6], size: [0.55, 0.55, 0.15], color: 0xFFD700, key: '3', type: 'hihat' },
  { name: 'tom1', pos: [-3, 0.4, -0.2], size: [0.5, 0.45, 0.5], color: 0x8B4513, key: '4', type: 'tom1' },
  { name: 'tom2', pos: [-1.3, 0.6, -0.4], size: [0.6, 0.55, 0.6], color: 0x8B4513, key: '5', type: 'tom2' },
  { name: 'crash', pos: [2.8, 0.7, -0.1], size: [0.9, 0.9, 0.12], color: 0xFFD700, key: '6', type: 'crash' },
  { name: 'ride', pos: [3.2, 0.3, 0.9], size: [0.75, 0.75, 0.12], color: 0xFFD700, key: '7', type: 'ride' },
  { name: 'floor', pos: [-3.8, -0.7, 0.2], size: [0.75, 0.95, 0.75], color: 0x8B4513, key: '8', type: 'floor' },
]

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('Audio context resumed')
    })
  }
}

function playSound(type) {
  initAudio()
  const now = audioCtx.currentTime
  
  switch(type) {
    case 'kick':
      playKick(now)
      break
    case 'snare':
      playSnare(now)
      break
    case 'hihat':
      playHihat(now)
      break
    case 'crash':
      playCrash(now)
      break
    case 'ride':
      playRide(now)
      break
    case 'tom1':
      playTomHigh(now)
      break
    case 'tom2':
      playTomMid(now)
      break
    case 'floor':
      playTomLow(now)
      break
  }
}

function playKick(time) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.15)
  gain.gain.setValueAtTime(1, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.3)
}

function playSnare(time) {
  const bufferSize = audioCtx.sampleRate * 0.2
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const noise = audioCtx.createBufferSource()
  noise.buffer = buffer
  const noiseGain = audioCtx.createGain()
  noiseGain.gain.setValueAtTime(0.5, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
  const noiseFilter = audioCtx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1000
  noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination)
  noise.start(time)
  noise.stop(time + 0.2)
  
  const osc = audioCtx.createOscillator()
  const oscGain = audioCtx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, time)
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.05)
  oscGain.gain.setValueAtTime(0.7, time)
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
  osc.connect(oscGain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.1)
}

function playHihat(time) {
  const bufferSize = audioCtx.sampleRate * 0.1
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const noise = audioCtx.createBufferSource()
  noise.buffer = buffer
  const gain = audioCtx.createGain()
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  gain.gain.setValueAtTime(0.3, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
  noise.connect(filter).connect(gain).connect(audioCtx.destination)
  noise.start(time)
  noise.stop(time + 0.1)
}

function playCrash(time) {
  const bufferSize = audioCtx.sampleRate * 0.8
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const noise = audioCtx.createBufferSource()
  noise.buffer = buffer
  const gain = audioCtx.createGain()
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 3000
  gain.gain.setValueAtTime(0.4, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7)
  noise.connect(filter).connect(gain).connect(audioCtx.destination)
  noise.start(time)
  noise.stop(time + 0.8)
}

function playRide(time) {
  const bufferSize = audioCtx.sampleRate * 0.5
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const noise = audioCtx.createBufferSource()
  noise.buffer = buffer
  const gain = audioCtx.createGain()
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 5000
  gain.gain.setValueAtTime(0.25, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
  noise.connect(filter).connect(gain).connect(audioCtx.destination)
  noise.start(time)
  noise.stop(time + 0.5)
}

function playTomHigh(time) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, time)
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.12)
  gain.gain.setValueAtTime(0.5, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.15)
}

function playTomMid(time) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(220, time)
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.15)
  gain.gain.setValueAtTime(0.55, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.18)
}

function playTomLow(time) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(60, time + 0.2)
  gain.gain.setValueAtTime(0.6, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.25)
}

function hitDrum(drum) {
  playSound(drum.userData.type)
  
  const originalScale = drum.scale.clone()
  drum.scale.multiplyScalar(1.08)
  setTimeout(() => {
    drum.scale.copy(originalScale)
  }, 50)
  
  const originalColor = drum.material.color.getHex()
  drum.material.color.setHex(0xffffff)
  setTimeout(() => {
    drum.material.color.setHex(originalColor)
  }, 80)
}

function onPointerDown(event) {
  event.preventDefault()
  
  // Force create and resume audio on every click
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  
  const mouse = new THREE.Vector2()
  const rect = container.value.getBoundingClientRect()
  
  if (event.touches) {
    mouse.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1
  } else {
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }
  
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)
  
  const intersects = raycaster.intersectObjects(drums)
  if (intersects.length > 0) {
    hitDrum(intersects[0].object)
  }
}

function onKeyDown(event) {
  const keyMap = {
    '1': 'kick', 'q': 'kick',
    '2': 'snare', 'w': 'snare',
    '3': 'hihat', 'e': 'hihat',
    '4': 'tom1', 'r': 'tom1',
    '5': 'tom2', 't': 'tom2',
    '6': 'crash', 'y': 'crash',
    '7': 'ride', 'u': 'ride',
    '8': 'floor', 'i': 'floor',
  }
  
  const key = event.key.toLowerCase()
  if (keyMap[key]) {
    const drum = drums.find(d => d.userData.name === keyMap[key])
    if (drum) {
      hitDrum(drum)
    }
  }
}

function onWindowResize() {
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

function createWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(0, 0, 512, 512)
  
  for (let i = 0; i < 50; i++) {
    ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.3})`
    ctx.lineWidth = 1 + Math.random() * 3
    ctx.beginPath()
    const y = Math.random() * 512
    ctx.moveTo(0, y)
    for (let x = 0; x < 512; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.02) * 5 + Math.random() * 3)
    }
    ctx.stroke()
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function createCymbalTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, '#FFD700')
  gradient.addColorStop(0.3, '#FFA500')
  gradient.addColorStop(0.7, '#CD853F')
  gradient.addColorStop(1, '#8B4513')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  
  for (let r = 20; r < 140; r += 8) {
    ctx.strokeStyle = `rgba(139, 69, 19, ${0.3 + (r / 200)})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(128, 128, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  
  return new THREE.CanvasTexture(canvas)
}

function createSnareTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = '#CD853F'
  ctx.fillRect(0, 0, 256, 256)
  
  ctx.strokeStyle = '#888888'
  ctx.lineWidth = 2
  for (let y = 20; y < 236; y += 12) {
    ctx.beginPath()
    ctx.moveTo(10, y)
    ctx.lineTo(246, y)
    ctx.stroke()
  }
  
  ctx.strokeStyle = '#666666'
  for (let i = -20; i < 276; i += 20) {
    ctx.beginPath()
    ctx.moveTo(i, 10)
    ctx.lineTo(i + 20, 246)
    ctx.stroke()
  }
  
  return new THREE.CanvasTexture(canvas)
}

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)
  
  camera = new THREE.PerspectiveCamera(50, container.value.clientWidth / container.value.clientHeight, 0.1, 1000)
  camera.position.set(0, 3, 10)
  camera.lookAt(0, -0.5, 0)
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
  mainLight.position.set(5, 10, 7)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  scene.add(mainLight)
  
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.5)
  fillLight.position.set(-5, 5, -5)
  scene.add(fillLight)
  
  const spotLight = new THREE.SpotLight(0xffffff, 0.8)
  spotLight.position.set(0, 12, 0)
  spotLight.angle = Math.PI / 4
  spotLight.penumbra = 0.5
  scene.add(spotLight)
  
  const woodTexture = createWoodTexture()
  const cymbalTexture = createCymbalTexture()
  const snareTexture = createSnareTexture()
  
  const drumGroups = [] // Store groups for animation
  
  drumConfig.forEach(config => {
    const group = new THREE.Group()
    group.position.set(...config.pos)
    group.userData = { name: config.name, type: config.type, key: config.key }
    
    if (config.name === 'kick') {
      const geometry = new THREE.CylinderGeometry(config.size[0], config.size[0], config.size[2], 32)
      const material = new THREE.MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.6,
        metalness: 0.1
      })
      const drum = new THREE.Mesh(geometry, material)
      drum.castShadow = true
      drum.receiveShadow = true
      group.add(drum)
      
      // Kick head - attached to group
      const headGeom = new THREE.CircleGeometry(config.size[0] * 0.9, 32)
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      const head = new THREE.Mesh(headGeom, headMat)
      head.rotation.x = -Math.PI / 2
      head.position.y = config.size[2] / 2 + 0.01
      group.add(head)
      
    } else if (config.type === 'hihat' || config.type === 'crash' || config.type === 'ride') {
      const geometry = new THREE.CylinderGeometry(config.size[0], config.size[0], config.size[2], 32)
      const material = new THREE.MeshStandardMaterial({ 
        map: cymbalTexture,
        roughness: 0.3,
        metalness: 0.8,
        color: config.color
      })
      const drum = new THREE.Mesh(geometry, material)
      drum.rotation.x = Math.PI / 2
      drum.castShadow = true
      group.add(drum)
      
      // Cymbal stand
      const standGeom = new THREE.CylinderGeometry(0.03, 0.03, 3, 8)
      const standMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
      const stand = new THREE.Mesh(standGeom, standMat)
      stand.position.y = -1.5
      scene.add(stand)
      
    } else if (config.name === 'snare') {
      const geometry = new THREE.CylinderGeometry(config.size[0], config.size[0] * 0.85, config.size[1], 32)
      const material = new THREE.MeshStandardMaterial({ 
        map: snareTexture,
        roughness: 0.5,
        metalness: 0.2
      })
      const drum = new THREE.Mesh(geometry, material)
      drum.castShadow = true
      group.add(drum)
      
      // Snare head
      const headGeom = new THREE.CircleGeometry(config.size[0] * 0.88, 32)
      const headMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 })
      const head = new THREE.Mesh(headGeom, headMat)
      head.rotation.x = -Math.PI / 2
      head.position.y = config.size[1] / 2 + 0.02
      group.add(head)
      
      // Rim
      const rimGeom = new THREE.TorusGeometry(config.size[0] * 0.92, 0.04, 8, 32)
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2 })
      const rim = new THREE.Mesh(rimGeom, rimMat)
      rim.position.y = config.size[1] / 2 + 0.03
      rim.rotation.x = Math.PI / 2
      group.add(rim)
      
    } else {
      // Toms
      const geometry = new THREE.CylinderGeometry(config.size[0], config.size[0] * 0.85, config.size[1], 32)
      const material = new THREE.MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.6,
        metalness: 0.1
      })
      const drum = new THREE.Mesh(geometry, material)
      drum.castShadow = true
      group.add(drum)
      
      // Tom head
      const headGeom = new THREE.CircleGeometry(config.size[0] * 0.88, 32)
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      const head = new THREE.Mesh(headGeom, headMat)
      head.rotation.x = -Math.PI / 2
      head.position.y = config.size[1] / 2 + 0.02
      group.add(head)
      
      // Rim
      const rimGeom = new THREE.TorusGeometry(config.size[0] * 0.92, 0.04, 8, 32)
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2 })
      const rim = new THREE.Mesh(rimGeom, rimMat)
      rim.position.y = config.size[1] / 2 + 0.03
      rim.rotation.x = Math.PI / 2
      group.add(rim)
      
      // Mount
      const mountGeom = new THREE.BoxGeometry(0.1, 0.8, 0.1)
      const mountMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 })
      const mount = new THREE.Mesh(mountGeom, mountMat)
      mount.position.set(0, -0.5, -0.3)
      scene.add(mount)
    }
    
    drums.push(group)
    scene.add(group)
    drumGroups.push(group)
  })
  
  // Platform
  const platformGeom = new THREE.BoxGeometry(14, 0.3, 8)
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
  const platform = new THREE.Mesh(platformGeom, platformMat)
  platform.position.set(0, -1.65, 0)
  platform.receiveShadow = true
  scene.add(platform)
  
  // Floor
  const floorGeom = new THREE.PlaneGeometry(30, 30)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  const floor = new THREE.Mesh(floorGeom, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.8
  floor.receiveShadow = true
  scene.add(floor)
  
  container.value.addEventListener('pointerdown', onPointerDown)
  container.value.addEventListener('touchstart', onPointerDown, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onWindowResize)
  
  function animate() {
    requestAnimationFrame(animate)
    
    const time = Date.now() * 0.001
    drumGroups.forEach((group, i) => {
      group.position.y = drumConfig[i].pos[1] + Math.sin(time + i) * 0.015
    })
    
    renderer.render(scene, camera)
  }
  animate()
})

onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('pointerdown', onPointerDown)
    container.value.removeEventListener('touchstart', onPointerDown)
  }
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onWindowResize)
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.drum-container {
  width: 100%;
  height: calc(100vh - 120px);
  position: relative;
  cursor: crosshair;
  background: #1a1a1a;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  text-align: center;
  pointer-events: none;
  z-index: 10;
}

.overlay h1 {
  margin: 0;
  font-size: 2rem;
  text-shadow: 0 0 20px var(--fg);
}

.overlay p {
  margin: 0.5rem 0 0;
  color: var(--fg-dim);
  font-size: 1rem;
}

.hint {
  margin-top: 0.5rem;
  color: var(--fg-dim);
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>
