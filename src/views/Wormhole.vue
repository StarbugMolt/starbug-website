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
let starsOutside, starsNear, warpStreaks
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
  scene.fog = new THREE.FogExp2(0x000000, 0.008)

  camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 2000)
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.querySelector('.wormhole-container').appendChild(renderer.domElement)

  // Create a looping wormhole path
  curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(5, 2, -50),
    new THREE.Vector3(-5, -2, -100),
    new THREE.Vector3(8, -3, -150),
    new THREE.Vector3(-8, 3, -200),
    new THREE.Vector3(3, 5, -250),
    new THREE.Vector3(-3, -5, -300),
    new THREE.Vector3(5, 5, -350),
    new THREE.Vector3(-5, -5, -400),
    new THREE.Vector3(0, 0, -450),
  ], true)

  // Wormhole ring (the portal effect) - visible as we look through it
  const tubeGeometry = new THREE.TubeGeometry(curve, 300, tubeRadius, 32, true)
  const tubeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide
  })
  tube = new THREE.Mesh(tubeGeometry, tubeMaterial)
  scene.add(tube)

  // Inner glow ring
  const innerRingGeom = new THREE.TubeGeometry(curve, 300, tubeRadius - 0.5, 32, true)
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide
  })
  const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
  scene.add(innerRing)

  // ===== STARS OUTSIDE THE WORMHOLE (the main visual) =====
  const starCount = 3000
  const starGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const starData = [] // Store extra data for animation

  for (let i = 0; i < starCount; i++) {
    // Stars are OUTSIDE the wormhole - in the universe beyond
    const angle = Math.random() * Math.PI * 2
    const radius = tubeRadius + 2 + Math.random() * 200 // Outside the tube
    const t = Math.random() // Position along curve
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t)
    
    // Calculate perpendicular vectors
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const localUp = new THREE.Vector3().crossVectors(right, tangent).normalize()
    
    // Position outside the tube
    const x = point.x + right.x * Math.cos(angle) * radius + localUp.x * Math.sin(angle) * radius
    const y = point.y + right.y * Math.cos(angle) * radius + localUp.y * Math.sin(angle) * radius
    const z = point.z + right.z * Math.cos(angle) * radius + localUp.z * Math.sin(angle) * radius
    
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    
    // Random star colors (blue-ish white)
    const color = new THREE.Color()
    const temp = Math.random()
    if (temp < 0.7) {
      color.setHSL(0.6, 0.3, 0.8 + Math.random() * 0.2) // White/blue
    } else if (temp < 0.9) {
      color.setHSL(0.1, 0.8, 0.6) // Orange
    } else {
      color.setHSL(0.8, 0.8, 0.7) // Blue
    }
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    
    sizes[i] = Math.random() * 0.2 + 0.1 // Very tiny points
    
    starData.push({
      angle,
      radius,
      t,
      speed: 0.5 + Math.random() * 1.5,
      baseRadius: radius
    })
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  // Shader for stars with glow
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
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
        
        // Stars get bigger at warp
        float stretch = 1.0 + scrollSpeed * warpIntensity * 2.0;
        gl_PointSize = size * (30.0 / -mvPosition.z);
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
        float dist = length(center);
        
        // Star glow
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        float glow = exp(-dist * 4.0);
        
        // Add streak effect at warp
        if (warpIntensity > 0.3) {
          float streak = 1.0 - abs(center.y) * 3.0;
          streak = max(0.0, streak);
          alpha = max(alpha, streak * warpIntensity * 0.5);
        }
        
        vec3 finalColor = vColor + glow * 0.3;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  starsOutside = new THREE.Points(starGeometry, starMaterial)
  starsOutside.userData = { stars: starData }
  scene.add(starsOutside)

  // ===== NEAR STARS (passing close by) =====
  const nearCount = 30
  const nearGeometry = new THREE.BufferGeometry()
  const nearPositions = new Float32Array(nearCount * 3)
  const nearColors = new Float32Array(nearCount * 3)
  const nearData = []

  for (let i = 0; i < nearCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = tubeRadius * 0.5 + Math.random() * 0.8 // Just outside camera
    const t = Math.random()
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t)
    
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const localUp = new THREE.Vector3().crossVectors(right, tangent).normalize()
    
    nearPositions[i * 3] = point.x + right.x * Math.cos(angle) * radius + localUp.x * Math.sin(angle) * radius
    nearPositions[i * 3 + 1] = point.y + right.y * Math.cos(angle) * radius + localUp.y * Math.sin(angle) * radius
    nearPositions[i * 3 + 2] = point.z + right.z * Math.cos(angle) * radius + localUp.z * Math.sin(angle) * radius
    
    const color = new THREE.Color()
    color.setHSL(0.5 + Math.random() * 0.2, 1, 0.7 + Math.random() * 0.3)
    nearColors[i * 3] = color.r
    nearColors[i * 3 + 1] = color.g
    nearColors[i * 3 + 2] = color.b
    
    nearData.push({ angle, radius, t, speed: 2 + Math.random() * 3 })
  }

  nearGeometry.setAttribute('position', new THREE.BufferAttribute(nearPositions, 3))
  nearGeometry.setAttribute('color', new THREE.BufferAttribute(nearColors, 3))

  const nearMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  })

  starsNear = new THREE.Points(nearGeometry, nearMaterial)
  starsNear.userData = { stars: nearData }
  scene.add(starsNear)

  // ===== WARP STREAKS (lines at high speed) =====
  const streakCount = 150
  const streakGeom = new THREE.BufferGeometry()
  const streakPos = new Float32Array(streakCount * 6)
  const streakCol = new Float32Array(streakCount * 6)
  const streakData = []

  for (let i = 0; i < streakCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = tubeRadius + Math.random() * 50
    const t = Math.random()
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t)
    
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const localUp = new THREE.Vector3().crossVectors(right, tangent).normalize()
    
    const length = 5 + Math.random() * 20
    
    streakPos[i * 6] = point.x + right.x * Math.cos(angle) * radius + localUp.x * Math.sin(angle) * radius
    streakPos[i * 6 + 1] = point.y + right.y * Math.cos(angle) * radius + localUp.y * Math.sin(angle) * radius
    streakPos[i * 6 + 2] = point.z + right.z * Math.cos(angle) * radius + localUp.z * Math.sin(angle) * radius
    streakPos[i * 6 + 3] = streakPos[i * 6]
    streakPos[i * 6 + 4] = streakPos[i * 6 + 1]
    streakPos[i * 6 + 5] = streakPos[i * 6 + 2] + length
    
    const color = new THREE.Color()
    color.setHSL(0.5 + Math.random() * 0.3, 1, 0.8)
    streakCol[i * 6] = color.r
    streakCol[i * 6 + 1] = color.g
    streakCol[i * 6 + 2] = color.b
    streakCol[i * 6 + 3] = color.r * 0.3
    streakCol[i * 6 + 4] = color.g * 0.3
    streakCol[i * 6 + 5] = color.b * 0.3
    
    streakData.push({ angle, radius, t, length })
  }

  streakGeom.setAttribute('position', new THREE.BufferAttribute(streakPos, 3))
  streakGeom.setAttribute('color', new THREE.BufferAttribute(streakCol, 3))

  const streakMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  })

  warpStreaks = new THREE.LineSegments(streakGeom, streakMat)
  warpStreaks.userData = { streaks: streakData }
  scene.add(warpStreaks)

  // Change destination periodically
  setInterval(() => {
    destination.value = destinations[Math.floor(Math.random() * destinations.length)]
  }, 8000)
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onWheel(e) {
  scrollSpeed = Math.max(0.3, Math.min(10, scrollSpeed + e.deltaY * 0.003))
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const warpIntensity = Math.min(1, (scrollSpeed - 1) / 5)

  // Move camera along the curve
  cameraT += 0.0004 * scrollSpeed
  if (cameraT > 1) cameraT -= 1
  
  // Get position on curve
  const camPos = curve.getPoint(cameraT)
  const camTangent = curve.getTangent(cameraT)
  
  // Mouse offset
  const offsetX = mouseX * 1.5
  const offsetY = mouseY * 1.5
  
  const up = new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(camTangent, up).normalize()
  const localUp = new THREE.Vector3().crossVectors(right, camTangent).normalize()
  
  camera.position.copy(camPos)
  camera.position.add(right.multiplyScalar(offsetX))
  camera.position.add(localUp.multiplyScalar(offsetY))
  
  // Look forward along curve
  const lookAtPoint = curve.getPoint((cameraT + 0.015) % 1)
  camera.lookAt(lookAtPoint)
  camera.rotation.z = -mouseX * 0.15

  // Update OUTSIDE stars
  const starPositions = starsOutside.geometry.attributes.position.array
  const starColors = starsOutside.geometry.attributes.color.array
  const { stars } = starsOutside.userData
  
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i]
    
    // Move along curve toward camera (stars come toward us)
    s.t -= 0.0003 * s.speed * scrollSpeed
    if (s.t < 0) s.t += 1
    
    // Slight wobble
    const wobble = Math.sin(s.t * 30 + i) * 0.5
    
    const point = curve.getPoint(s.t)
    const tangent = curve.getTangent(s.t)
    const r = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const u = new THREE.Vector3().crossVectors(r, tangent).normalize()
    
    const r2 = s.baseRadius + wobble + warpIntensity * 5
    
    starPositions[i * 3] = point.x + r.x * Math.cos(s.angle) * r2 + u.x * Math.sin(s.angle) * r2
    starPositions[i * 3 + 1] = point.y + r.y * Math.cos(s.angle) * r2 + u.y * Math.sin(s.angle) * r2
    starPositions[i * 3 + 2] = point.z + r.z * Math.cos(s.angle) * r2 + u.z * Math.sin(s.angle) * r2
    
    // Color shift at warp
    if (warpIntensity > 0.4) {
      const shift = warpIntensity * 0.4
      starColors[i * 3] = Math.min(1, starColors[i * 3] + shift)
    }
  }
  
  starsOutside.geometry.attributes.position.needsUpdate = true
  starsOutside.geometry.attributes.color.needsUpdate = true
  starsOutside.material.uniforms.scrollSpeed.value = scrollSpeed
  starsOutside.material.uniforms.warpIntensity.value = warpIntensity

  // Update near stars
  const nearPos = starsNear.geometry.attributes.position.array
  const nearStars = starsNear.userData.stars
  
  for (let i = 0; i < nearStars.length; i++) {
    const s = nearStars[i]
    
    s.t -= 0.001 * s.speed * scrollSpeed
    if (s.t < 0) s.t += 1
    
    const point = curve.getPoint(s.t)
    const tangent = curve.getTangent(s.t)
    const r = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const u = new THREE.Vector3().crossVectors(r, tangent).normalize()
    
    nearPos[i * 3] = point.x + r.x * Math.cos(s.angle) * s.radius + u.x * Math.sin(s.angle) * s.radius
    nearPos[i * 3 + 1] = point.y + r.y * Math.cos(s.angle) * s.radius + u.y * Math.sin(s.angle) * s.radius
    nearPos[i * 3 + 2] = point.z + r.z * Math.cos(s.angle) * s.radius + u.z * Math.sin(s.angle) * s.radius
  }
  
  starsNear.geometry.attributes.position.needsUpdate = true
  starsNear.material.opacity = 0.3 + warpIntensity * 0.2
  starsNear.material.size = 0.8 + warpIntensity

  // Update warp streaks
  warpStreaks.material.opacity = warpIntensity * 0.7
  
  if (warpIntensity > 0.2) {
    const streakPos = warpStreaks.geometry.attributes.position.array
    const streakCols = warpStreaks.geometry.attributes.color.array
    const streaks = warpStreaks.userData.streaks
    
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i]
      
      s.t -= 0.0005 * scrollSpeed
      if (s.t < 0) s.t += 1
      
      const point = curve.getPoint(s.t)
      const tangent = curve.getTangent(s.t)
      const r = new THREE.Vector3().crossVectors(tangent, up).normalize()
      const u = new THREE.Vector3().crossVectors(r, tangent).normalize()
      
      const len = s.length * (1 + warpIntensity * 3)
      
      streakPos[i * 6] = point.x + r.x * Math.cos(s.angle) * s.radius + u.x * Math.sin(s.angle) * s.radius
      streakPos[i * 6 + 1] = point.y + r.y * Math.cos(s.angle) * s.radius + u.y * Math.sin(s.angle) * s.radius
      streakPos[i * 6 + 2] = point.z + r.z * Math.cos(s.angle) * s.radius + u.z * Math.sin(s.angle) * s.radius
      streakPos[i * 6 + 3] = streakPos[i * 6]
      streakPos[i * 6 + 4] = streakPos[i * 6 + 1]
      streakPos[i * 6 + 5] = streakPos[i * 6 + 2] - len
    }
    
    warpStreaks.geometry.attributes.position.needsUpdate = true
  }

  // Subtle tube rotation
  tube.rotation.z += 0.0003 * scrollSpeed

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
