import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import ScriptCreation from '@/components/ScriptCreation.vue'
import VideoSelection from '@/components/VideoSelection.vue'
import FileExplorer from '@/components/FileExplorer.vue'
import Drag from './components/Drag.vue'
import Home from '@/components/Home.vue'
import SiteBrowser from './components/SiteBrowser.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/fileExplorer',
    name: 'FileExplorer',
    component: FileExplorer
  },
  {
    path: '/scriptCreation/:videoId',
    name: 'scriptCreation',
    component: ScriptCreation,
    props: true
  },
  {
    path: '/videoSelection',
    name: 'videoSelection',
    component: VideoSelection
  },
  {
    path: '/drag',
    name: 'Drag',
    component: Drag
  },
  {
    path: '/siteBrowser',
    name: 'SiteBrowser',
    component: SiteBrowser
  },
]

const router = createRouter({
  history: process.env.IS_ELECTRON ? createWebHashHistory() : createWebHistory(),
  routes
})

export default router
