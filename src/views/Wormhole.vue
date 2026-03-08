<template>
  <div class="wormhole-container">
    <div class="overlay">
      <h1>🌀 WORMHOLE</h1>
      <p>Destination: <span class="destination">{{ destination }}</span></p>
      <div class="controls">
        <span>Mouse to steer • Scroll to warp</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const destination = ref('UNKNOWN')
const destinations = ['ANDROMEDA', 'SECTOR 7', 'DEEP SPACE', 'THE VOID', 'KEPLER-442', 'OUTER RIM', 'UNKNOWN']

let scene, camera, renderer, tube
let particles, starStreaks
let curve
let mouseX = 0, mouseY = 0
let scrollSpeed = 1
let tubeRadius = 4
let cameraT = 0
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
  scene.fog = new THREE.FogExp2(0x000000, 0.015)

  camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000)
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.querySelector('.wormhole-container').appendChild(renderer.domElement)

  // Create a longer, looping wormhole path
  curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(2, 1, -30),
    new THREE.Vector3(-2, -1, -60),
    new THREE.Vector3(3, -2, -90),
    new THREE.Vector3(-3, 2, -120),
    new THREE.Vector3(1, 3, -150),
    new THREE.Vector3(-1, -3, -180),
    new THREE.Vector3(2, 2, -210),
    new THREE.Vector3(-2, -2, -240),
    new THREE.Vector3(0, 0, -270),
    new THREE.Vector3(2, 1, -300),
    new THREE.Vector3(-2, -1, -330),
    new THREE.Vector3(3, -2, -360),
    new THREE.Vector3(-3, 2, -390),
    new THREE.Vector3(1, 3, -420),
    new THREE.Vector3(-1, -3, -450),
    new THREE.Vector3(2, 2, -480),
    new THREE.Vector3(-2, -2, -510),
    new THREE.Vector3(0, 0, -540),
    new THREE.Vector3(2, 1, -570),
    new THREE.Vector3(-2, -1, -600),
  ], true) // Closed loop

  // Create multiple tube segments for the visual
  const tubeGeometry = new THREE.TubeGeometry(curve, 400, tubeRadius, 24, true)
  const tubeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  })
  tube = new THREE.Mesh(tubeGeometry, tubeMaterial)
  scene.add(tube)

  // Inner glow ring
  const ringGeometry = new THREE.TubeGeometry(curve, 400, tubeRadius - 0.3, 24, true)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  scene.add(ring)

  // Stars/particles inside the wormhole
  const starCount = 1500
  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  const starSizes = new Float32Array(starCount)
  const starAngles = new Float32Array(starCount)
  const starRadii = new Float32Array(starCount)
  const starT = new Float32Array(starCount)

  for (let i = 0; i < starCount; i++) {
    starAngles[i] = Math.random() * Math.PI * 2
    starRadii[i] = Math.random() * (tubeRadius - 0.5)
    starT[i] = Math.random() * 1 // Position along curve (0-1)
    
    const x = Math.cos(starAngles[i]) * starRadii[i]
    const y = Math.sin(starAngles[i]) * starRadii[i]
    const z = 0
    
    starPositions[i * 3] = x
    starPositions[i * 3 + 1] = y
    starPositions[i * 3 + 2] = z
    
    const color = new THREE.Color()
    color.setHSL(0.5 + Math.random() * 0.3, 0.8, 0.6 + Math.random() * 0.4)
    starColors[i * 3] = color.r
    starColors[i * 3 + 1] = color.g
    starColors[i * 3 + 2] = color.b
    
    starSizes[i] = Math.random() * 2 + 1
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))

  // Custom shader for warp effect
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      scrollSpeed: { value: 1 },
      warpIntensity: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vSize;
      uniform float scrollSpeed;
      uniform float warpIntensity;
      
      void main() {
        vColor = color;
        vSize = size;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Stretch based on speed
        float stretch = 1.0 + scrollSpeed * warpIntensity;
        gl_PointSize = size * (300.0 / -mvPosition.z) * stretch;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vSize;
      uniform float scrollSpeed;
      uniform float warpIntensity;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        
        // Make points elongated (streaks) when at warp
        float stretch = 1.0 + scrollSpeed * warpIntensity * 3.0;
        center.y *= stretch;
        
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Add glow
        float glow = exp(-dist * 3.0) * 0.5;
        
        gl_FragColor = vec4(vColor + glow, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  particles = new THREE.Points(starGeometry, starMaterial)
  particles.userData = { angles: starAngles, radii: starRadii, t: starT }
  scene.add(particles)

  // Warp streaks (lines that appear at high speed)
  const streakCount = 200
  const streakGeometry = new THREE.BufferGeometry()
  const streakPositions = new Float32Array(streakCount * 6) // 2 points per line
  const streakColors = new Float32Array(streakCount * 6)
  
  for (let i = 0; i < streakCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * (tubeRadius - 1)
    const t = Math.random()
    const point = curve.getPoint(t)
    const pointAhead = curve.getPoint((t + 0.02) % 1)
    
    const x = Math.cos(angle) * radius + point.x
    const y = Math.sin(angle) * radius + point.y
    const z = point.z
    
    const x2 = Math.cos(angle) * radius + pointAhead.x
    const y2 = Math.sin(angle) * radius + pointAhead.y
    const z2 = pointAhead.z
    
    streakPositions[i * 6] = x
    streakPositions[i * 6 + 1] = y
    streakPositions[i * 6 + 2] = z
    streakPositions[i * 6 + 3] = x2
    streakPositions[i * 6 + 4] = y2
    streakPositions[i * 6 + 5] = z2
    
    const color = new THREE.Color()
    color.setHSL(0.6 + Math.random() * 0.2, 1, 0.7)
    streakColors[i * 6] = color.r
    streakColors[i * 6 + 1] = color.g
    streakColors[i * 6 + 2] = color.b
    streakColors[i * 6 + 3] = color.r
    streakColors[i * 6 + 4] = color.g
    streakColors[i * 6 + 5] = color.b
  }
  
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3))
  streakGeometry.setAttribute('color', new THREE.BufferAttribute(streakColors, 3))
  
  const streakMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  })
  
  starStreaks = new THREE.LineSegments(streakGeometry, streakMaterial)
  scene.add(starStreaks)

  // Random destination change
  setInterval(() => {
    destination.value = destinations[Math.floor(Math.random() * destinations.length)]
  }, 8000)
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onWheel(e) {
  scrollSpeed = Math.max(0.3, Math.min(8, scrollSpeed + e.deltaY * 0.002))
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  // Move camera along the curve
  cameraT += 0.0005 * scrollSpeed
  if (cameraT > 1) cameraT -= 1
  
  // Get position and tangent on curve
  const camPos = curve.getPoint(cameraT)
  const camTangent = curve.getTangent(cameraT)
  
  // Add mouse steering offset (stay inside tube)
  const offsetX = mouseX * (tubeRadius - 1) * 0.6
  const offsetY = mouseY * (tubeRadius - 1) * 0.6
  
  // Calculate perpendicular vectors for the offset
  const up = new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(camTangent, up).normalize()
  const localUp = new THREE.Vector3().crossVectors(right, camTangent).normalize()
  
  camera.position.copy(camPos)
  camera.position.add(right.multiplyScalar(offsetX))
  camera.position.add(localUp.multiplyScalar(offsetY))
  
  // Look forward along the curve
  const lookAtPoint = curve.getPoint((cameraT + 0.02) % 1)
  camera.lookAt(lookAtPoint)
  
  // Add slight roll based on steering
  camera.rotation.z = -mouseX * 0.2

  // Update particles
  const positions = particles.geometry.attributes.position.array
  const colors = particles.geometry.attributes.color.array
  const sizes = particles.geometry.attributes.size.array
  const { angles, radii, t } = particles.userData
  
  const warpIntensity = Math.min(1, (scrollSpeed - 1) / 4)
  
  for (let i = 0; i < t.length; i++) {
    // Move stars along the tube
    t[i] += 0.001 * scrollSpeed
    if (t[i] > 1) t[i] -= 1
    
    // Slowly rotate angle
    angles[i] += 0.002 * scrollSpeed
    
    // Get position on curve
    const point = curve.getPoint(t[i])
    const tangent = curve.getTangent(t[i])
    
    // Calculate perpendicular
    const up = new THREE.Vector3(0, 1, 0)
    const r = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const u = new THREE.Vector3().crossVectors(r, tangent).normalize()
    
    // Add some wobble
    const wobble = Math.sin(t[i] * 20 + i) * 0.3
    
    positions[i * 3] = Math.cos(angles[i]) * (radii[i] + wobble) + point.x + r.x * wobble
    positions[i * 3 + 1] = Math.sin(angles[i]) * (radii[i] + wobble) + point.y + u.y * wobble
    positions[i * 3 + 2] = point.z
    
    // Color shift at warp speed
    if (warpIntensity > 0.3) {
      const shift = warpIntensity * 0.3
      colors[i * 3] = Math.min(1, colors[i * 3] + shift)
      colors[i * 3 + 2] = Math.max(0, colors[i * 3 + 2] - shift * 0.5)
    }
    
    // Size pulses
    sizes[i] = (Math.sin(t[i] * 50 + i * 0.1) * 0.5 + 1.5) * (1 + warpIntensity)
  }
  
  particles.geometry.attributes.position.needsUpdate = true
  particles.geometry.attributes.color.needsUpdate = true
  particles.geometry.attributes.size.needsUpdate = true
  
  // Update shader uniforms
  particles.material.uniforms.scrollSpeed.value = scrollSpeed
  particles.material.uniforms.warpIntensity.value = warpIntensity
  particles.material.uniforms.time.value += 0.01
  
  // Show/hide warp streaks based on speed
  starStreaks.material.opacity = warpIntensity * 0.8
  
  // Rotate tube slightly for effect
  tube.rotation.z += 0.0005 * scrollSpeed

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

.destination {
  color: #ff00ff;
  text-shadow: 0 0 10px #ff00ff;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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
