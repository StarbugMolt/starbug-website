<template>
  <div class="wormhole-container">
    <div class="overlay">
      <h1>🌀 WORMHOLE</h1>
      <p>Destination: Unknown</p>
      <div class="controls">
        <span>Mouse to steer • Scroll to warp</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref(null)
let scene, camera, renderer, tube, particles
let mouseX = 0, mouseY = 0
let scrollSpeed = 1
let animationId

onMounted(() => {
  init()
  animate()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('wheel', onWheel)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})

function init() {
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.02)

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 5

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.querySelector('.wormhole-container').appendChild(renderer.domElement)

  // Wormhole tube
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -50),
    new THREE.Vector3(10, 5, -100),
    new THREE.Vector3(-10, -5, -150),
    new THREE.Vector3(5, 10, -200),
    new THREE.Vector3(-5, -10, -250),
    new THREE.Vector3(0, 0, -300)
  ])

  const geometry = new THREE.TubeGeometry(curve, 100, 3, 16, false)
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  })
  tube = new THREE.Mesh(geometry, material)
  scene.add(tube)

  // Particles
  const particleCount = 2000
  const particleGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 8
    const z = -Math.random() * 300

    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = Math.sin(angle) * radius
    positions[i * 3 + 2] = z

    const color = new THREE.Color()
    color.setHSL(0.5 + Math.random() * 0.2, 1, 0.5 + Math.random() * 0.5)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  })

  particles = new THREE.Points(particleGeometry, particleMaterial)
  scene.add(particles)

  // Add some glowing orbs
  for (let i = 0; i < 50; i++) {
    const orbGeom = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8)
    const orbMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
      transparent: true,
      opacity: 0.7
    })
    const orb = new THREE.Mesh(orbGeom, orbMat)
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 6
    orb.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      -Math.random() * 250
    )
    orb.userData.speed = 0.5 + Math.random() * 1.5
    scene.add(orb)
  }
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onWheel(e) {
  scrollSpeed = Math.max(0.2, Math.min(5, scrollSpeed + e.deltaY * 0.001))
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

let time = 0
function animate() {
  animationId = requestAnimationFrame(animate)
  time += 0.01 * scrollSpeed

  camera.position.x += (mouseX * 2 - camera.position.x) * 0.05
  camera.position.y += (mouseY * 2 - camera.position.y) * 0.05
  camera.position.z -= 0.1 * scrollSpeed

  // Reset camera position for infinite loop effect
  if (camera.position.z < -250) {
    camera.position.z = 5
  }

  // Rotate tube
  tube.rotation.z += 0.001 * scrollSpeed

  // Animate particles
  const positions = particles.geometry.attributes.position.array
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] -= 0.5 * scrollSpeed
    if (positions[i + 2] > 10) {
      positions[i + 2] = -290
    }
  }
  particles.geometry.attributes.position.needsUpdate = true

  // Animate orbs
  scene.children.forEach(child => {
    if (child.userData.speed) {
      child.position.z -= child.userData.speed * scrollSpeed
      if (child.position.z > 10) {
        child.position.z = -290
      }
      child.rotation.x += 0.01
      child.rotation.y += 0.01
    }
  })

  renderer.render(scene, camera)
}
</script>

<style scoped>
.wormhole-container {
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  position: relative;
}

.wormhole-container :deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 40px;
}

.overlay h1 {
  font-family: 'Orbitron', 'Courier New', monospace;
  font-size: 3rem;
  color: #0ff;
  text-shadow: 
    0 0 10px #0ff,
    0 0 20px #0ff,
    0 0 40px #0ff,
    0 0 80px #00ffff;
  letter-spacing: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

.overlay p {
  font-family: 'Courier New', monospace;
  color: #39ff14;
  font-size: 1.2rem;
  text-shadow: 0 0 10px #39ff14;
  margin-top: 10px;
}

.controls {
  position: absolute;
  bottom: 30px;
  font-family: 'Courier New', monospace;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
