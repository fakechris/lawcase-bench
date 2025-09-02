import { Request, Response } from 'express';

import { AuthenticatedRequest } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  TwoFactorEnableRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
} from '../types/auth.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const data: RegisterRequest = req.body;
      const result = await AuthService.register(data);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully. Please check your email for verification.',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginRequest = req.body;
      const result = await AuthService.login(data);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const data: RefreshTokenRequest = req.body;
      const result = await AuthService.refreshToken(data);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.substring(7); // Remove 'Bearer ' prefix

      if (!accessToken || !refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Access token and refresh token are required',
        });
        return;
      }

      await AuthService.logout(accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: req.user,
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve profile',
      });
    }
  }

  static async setupTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password is required',
        });
        return;
      }

      const result = await AuthService.setupTwoFactor(req.user.id, password);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Two-factor authentication setup initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Two-factor setup failed',
      });
    }
  }

  static async enableTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const data: TwoFactorEnableRequest = req.body;
      await AuthService.enableTwoFactor(req.user.id, data);

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to enable two-factor authentication',
      });
    }
  }

  static async disableTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password is required',
        });
        return;
      }

      await AuthService.disableTwoFactor(req.user.id, password);

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to disable two-factor authentication',
      });
    }
  }

  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const data: PasswordResetRequest = req.body;
      await AuthService.requestPasswordReset(data);

      res.status(200).json({
        success: true,
        message: 'If this email exists, a reset link will be sent',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset request failed',
      });
    }
  }

  static async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const data: PasswordResetConfirmRequest = req.body;
      await AuthService.confirmPasswordReset(data);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(400).json({
          success: false,
          error: 'All password fields are required',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          error: 'New passwords do not match',
        });
        return;
      }

      // Import here to avoid circular dependency
      const { PasswordUtils } = await import('../utils/jwt.js');
      const { UserModel } = await import('../models/auth.js');

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const isCurrentPasswordValid = await PasswordUtils.comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      const passwordValidation = PasswordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        });
        return;
      }

      const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);
      await UserModel.update(user.id, { password: hashedNewPassword });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      });
    }
  }
}
