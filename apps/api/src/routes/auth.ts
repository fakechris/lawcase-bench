import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller.js';
import { AuthMiddleware, ValidationMiddleware } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', ValidationMiddleware.validateRegister, AuthController.register);
router.post('/login', ValidationMiddleware.validateLogin, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/password/reset-request', AuthController.requestPasswordReset);
router.post('/password/reset-confirm', AuthController.confirmPasswordReset);

// Protected routes
router.post('/logout', AuthMiddleware.authenticate, AuthController.logout);
router.get('/profile', AuthMiddleware.authenticate, AuthController.getProfile);
router.post('/change-password', AuthMiddleware.authenticate, AuthController.changePassword);

// Two-factor authentication routes
router.post('/2fa/setup', AuthMiddleware.authenticate, AuthController.setupTwoFactor);
router.post('/2fa/enable', AuthMiddleware.authenticate, AuthController.enableTwoFactor);
router.post('/2fa/disable', AuthMiddleware.authenticate, AuthController.disableTwoFactor);

export default router;
