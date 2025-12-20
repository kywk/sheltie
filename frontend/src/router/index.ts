import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/components/HomePage.vue')
        },
        {
            path: '/workspace/:id',
            name: 'workspace',
            component: () => import('@/components/WorkspaceView.vue')
        },
        {
            path: '/present/:id',
            name: 'presentation',
            component: () => import('@/components/PresentationView.vue')
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('@/components/AdminPanel.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
})

export default router
