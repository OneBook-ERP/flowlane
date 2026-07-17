import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'

const routes = [{ path: '/', name: 'Home', component: HomePage }]

export const router = createRouter({
  history: createWebHistory('/flowlane'),
  routes,
})
