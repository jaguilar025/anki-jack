import { createRouter, createWebHistory } from 'vue-router'

// Equivalencias con anki-jack/app/*/page.tsx
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: () => import('@/views/LandingView.vue') },
    { path: '/main', name: 'main', component: () => import('@/views/MainView.vue') },
    { path: '/study', name: 'study', component: () => import('@/views/StudyView.vue') },
    { path: '/conversation', name: 'conversation', component: () => import('@/views/ConversationView.vue') },
    { path: '/dict-lens', name: 'dict-lens', component: () => import('@/views/DictLensView.vue') },
    { path: '/draw-kanji', name: 'draw-kanji', component: () => import('@/views/DrawKanjiView.vue') },
    { path: '/table', name: 'table', component: () => import('@/views/TableView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
