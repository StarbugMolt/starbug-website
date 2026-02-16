import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Projects from '../views/Projects.vue'
import Demos from '../views/Demos.vue'
import Pong from '../views/demos/Pong.vue'
import Particles from '../views/demos/Particles.vue'
import Matrix from '../views/demos/Matrix.vue'
import Cosmos from '../views/demos/Cosmos.vue'
import Neural from '../views/demos/Neural.vue'
import WWII from '../views/demos/WWII.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About },
  { path: '/projects', name: 'Projects', component: Projects },
  { path: '/demos', name: 'Demos', component: Demos },
  { path: '/demos/pong', name: 'Pong', component: Pong },
  { path: '/demos/particles', name: 'Particles', component: Particles },
  { path: '/demos/matrix', name: 'Matrix', component: Matrix },
  { path: '/demos/cosmos', name: 'Cosmos', component: Cosmos },
  { path: '/demos/neural', name: 'Neural', component: Neural },
  { path: '/demos/wwii', name: 'WWII', component: WWII },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
