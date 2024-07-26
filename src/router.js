import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import ScriptCreation from '@/components/ScriptCreation.vue'
import VideoSelection from '@/components/VideoSelection.vue'
import FileExplorer from '@/components/FileExplorer.vue'
import Home from '@/components/Home.vue'

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
]

const router = createRouter({
  history: process.env.IS_ELECTRON ? createWebHashHistory() : createWebHistory(),
  routes
})

export default router
