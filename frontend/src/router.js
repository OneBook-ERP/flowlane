import { createRouter, createWebHistory } from 'vue-router'

// Flowlane SPA routes (base /flowlane). Phase 1 ships Home + ClientWorkspace;
// the map Editor is a Phase-1 STUB — the Wizard/Table/Diagram tabs land in
// Phases 2-4 but the route + name are fixed now so navigation targets are stable.
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/c/:client',
    name: 'ClientWorkspace',
    component: () => import('@/pages/ClientWorkspace.vue'),
    props: true,
  },
  {
    path: '/m/:map',
    name: 'Editor',
    component: () => import('@/pages/MapEditor.vue'),
    props: true,
  },
]

export const router = createRouter({
  history: createWebHistory('/flowlane'),
  routes,
})
