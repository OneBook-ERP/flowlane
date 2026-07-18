import { createRouter, createWebHistory } from 'vue-router'

// Flowlane SPA routes (base /flowlane). Route paths/names are FIXED (see
// CONVENTIONS.md) — UI step U2 changed what they render, not the contract:
// `ClientWorkspace` is now the full unified workspace shell (tree rail +
// breadcrumb top bar + inline map editor via `?map=`), and `Editor` is a
// deep-link resolver that redirects a bare `/m/:map` into that shell.
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
