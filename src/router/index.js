import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Projects from '../views/Projects.vue'
import Demos from '../views/Demos.vue'
import ShipStatus from '../views/ShipStatus.vue'
import HollyQuotes from '../views/HollyQuotes.vue'
import Pong from '../views/demos/Pong.vue'
import Matrix from '../views/demos/Matrix.vue'
import WWII from '../views/demos/WWII.vue'
import DrumKit from '../views/demos/DrumKit.vue'
import Pirates from '../views/demos/Pirates.vue'
import Wormhole from '../views/Wormhole.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: About },
  { path: '/projects', name: 'Projects', component: Projects },
  { path: '/demos', name: 'Demos', component: Demos },
  { path: '/ship-status', name: 'ShipStatus', component: ShipStatus },
  { path: '/holly-quotes', name: 'HollyQuotes', component: HollyQuotes },
  { path: '/demos/drums', name: 'DrumKit', component: DrumKit },
  { path: '/demos/pong', name: 'Pong', component: Pong },
  { path: '/demos/matrix', name: 'Matrix', component: Matrix },
  { path: '/demos/wwii', name: 'WWII', component: WWII },
  { path: '/demos/pirates', name: 'Pirates', component: Pirates },
  { path: '/wormhole', name: 'Wormhole', component: Wormhole },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
