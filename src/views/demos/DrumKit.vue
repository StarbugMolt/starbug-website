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

// Drum configuration with positions, colors, and sound params
const drumConfig = [
  { name: 'kick', pos: [0, -0.8, 0], size: [1.2, 1.2, 1], color: 0x222222, key: '1', type: 'kick' },
  { name: 'snare', pos: [-1.8, -0.3, 0.5], size: [0.8, 0.8, 0.8], color: 0xdddddd, key: '2', type: 'snare' },
  { name: 'hihat', pos: [1.8, 0.2, 0.5], size: [0.6, 0.6, 0.2], color: 0xffcc00, key: '3', type: 'hihat' },
  { name: 'tom1', pos: [-2.8, 0.3, -0.3], size: [0.5, 0.5, 0.5], color: 0xff4444, key: '4', type: 'tom' },
  { name: 'tom2', pos: [-1.2, 0.5, -0.5], size: [0.6, 0.6, 0.6], color: 0xff4444, key: '5', type: 'tom' },
  { name: 'crash', pos: [2.8, 0.5, -0.2], size: [0.8, 0.8, 0.15], color: 0x00ffff, key: '6', type: 'crash' },
  { name: 'ride', pos: [3.2, 0.1, 0.8], size: [0.7, 0.7, 0.15], color: 0x00ff88, key: '7', type: 'ride' },
  { name: 'floor', pos: [-3.5, -0.5, 0], size: [0.7, 0.9, 0.7], color: 0xff6644, key: '8', type: 'tom' },
]

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
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
    case 'tom':
      playTom(now)
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
  // Noise component
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
  
  // Tone component
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

function playTom(time) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, time)
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.15)
  gain.gain.setValueAtTime(0.6, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(time)
  osc.stop(time + 0.2)
}

function hitDrum(drum) {
  playSound(drum.userData.type)
  
  // Visual feedback - scale bump
  const originalScale = drum.scale.clone()
  drum.scale.multiplyScalar(1.1)
  setTimeout(() => {
    drum.scale.copy(originalScale)
  }, 50)
  
  // Flash color
  const originalColor = drum.material.color.getHex()
  drum.material.color.setHex(0xffffff)
  setTimeout(() => {
    drum.material.color.setHex(originalColor)
  }, 80)
}

function onPointerDown(event) {
  event.preventDefault()
  initAudio()
  
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

onMounted(() => {
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  
  // Camera
  camera = new THREE.PerspectiveCamera(60, container.value.clientWidth / container.value.clientHeight, 0.1, 1000)
  camera.position.set(0, 2, 8)
  camera.lookAt(0, 0, 0)
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.value.appendChild(renderer.domElement)
  
  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
  scene.add(ambientLight)
  
  const spotLight1 = new THREE.SpotLight(0x00ff00, 1)
  spotLight1.position.set(-5, 10, 5)
  spotLight1.angle = 0.3
  scene.add(spotLight1)
  
  const spotLight2 = new THREE.SpotLight(0xff00ff, 0.5)
  spotLight2.position.set(5, 10, -5)
  spotLight2.angle = 0.3
  scene.add(spotLight2)
  
  const pointLight = new THREE.PointLight(0x00ffff, 0.5)
  pointLight.position.set(0, 5, 5)
  scene.add(pointLight)
  
  // Create drums
  drumConfig.forEach(config => {
    let geometry
    if (config.name === 'kick') {
      geometry = new THREE.CylinderGeometry(config.size[0], config.size[0], config.size[2], 32)
    } else if (config.name === 'hihat' || config.name === 'crash' || config.name === 'ride') {
      geometry = new THREE.CylinderGeometry(config.size[0], config.size[0], config.size[2], 32)
    } else {
      geometry = new THREE.CylinderGeometry(config.size[0], config.size[0] * 0.9, config.size[1], 32)
    }
    
    const material = new THREE.MeshPhongMaterial({
      color: config.color,
      shininess: 100,
      specular: 0x444444
    })
    
    const drum = new THREE.Mesh(geometry, material)
    drum.position.set(...config.pos)
    drum.userData = { name: config.name, type: config.type, key: config.key }
    
    // Rotate cymbals to be more visible
    if (config.type === 'hihat' || config.type === 'crash' || config.type === 'ride') {
      drum.rotation.x = Math.PI / 2
    }
    
    drums.push(drum)
    scene.add(drum)
    
    // Add drum rim/detail
    const rimGeom = new THREE.TorusGeometry(config.size[0] * 0.85, 0.05, 8, 32)
    const rimMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 150 })
    const rim = new THREE.Mesh(rimGeom, rimMat)
    rim.position.copy(drum.position)
    rim.position.y += config.size[1] / 2 + 0.03
    if (config.type === 'hihat' || config.type === 'crash' || config.type === 'ride') {
      rim.rotation.x = Math.PI / 2
    }
    scene.add(rim)
  })
  
  // Add drum stand/platform
  const platformGeom = new THREE.BoxGeometry(12, 0.2, 6)
  const platformMat = new THREE.MeshPhongMaterial({ color: 0x111111 })
  const platform = new THREE.Mesh(platformGeom, platformMat)
  platform.position.set(0, -1.5, 0)
  scene.add(platform)
  
  // Grid for atmosphere
  const gridHelper = new THREE.GridHelper(20, 20, 0x003300, 0x001100)
  gridHelper.position.y = -1.4
  scene.add(gridHelper)
  
  // Event listeners
  container.value.addEventListener('pointerdown', onPointerDown)
  container.value.addEventListener('touchstart', onPointerDown, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onWindowResize)
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate)
    
    // Subtle drum floating animation
    const time = Date.now() * 0.001
    drums.forEach((drum, i) => {
      drum.position.y = drumConfig[i].pos[1] + Math.sin(time + i) * 0.02
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
