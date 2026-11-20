import { createRouter, createWebHistory } from 'vue-router'

// Equivalencias con anki-jack/app/*/page.tsx
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: () => import('@/views/LandingView.vue') },
    { path: '/main', name: 'main', component: () => import('@/views/MainView.vue') },
    { path: '/study', name: 'study', component: () => import('@/views/StudyView.vue') },
    // La sección de conversación ahora es el chat con avatar 3D
    { path: '/conversation', redirect: '/avatar-chat' },
    { path: '/avatar-chat', name: 'avatar-chat', component: () => import('@/views/AvatarChatView.vue') },
    // Chat anterior (solo texto), se mantiene mientras se termina la migración
    { path: '/conversation/classic', name: 'conversation-classic', component: () => import('@/views/ConversationView.vue') },
    { path: '/dict-lens', name: 'dict-lens', component: () => import('@/views/DictLensView.vue') },
    { path: '/draw-kanji', name: 'draw-kanji', component: () => import('@/views/DrawKanjiView.vue') },
    { path: '/table', name: 'table', component: () => import('@/views/TableView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
