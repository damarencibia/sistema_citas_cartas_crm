import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { authGuard, roleGuard, workspaceGuard } from './guards';

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(authGuard);
router.beforeEach(roleGuard);
router.beforeEach(workspaceGuard);
