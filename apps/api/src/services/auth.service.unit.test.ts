import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../services/auth.service.js';
import { JwtUtils, PasswordUtils } from '../utils/jwt.js';
import { UserModel, RoleModel, RefreshTokenModel } from '../models/auth.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUserData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: '1',
        ...mockUserData,
        password: 'hashed_password',
        isActive: true,
        isVerified: false,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRole = {
        id: 'role-id',
        name: 'User',
        description: 'Regular user',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      UserModel.findByEmail.mockResolvedValue(null);
      UserModel.findByUsername.mockResolvedValue(null);
      RoleModel.findByName.mockResolvedValue(mockRole);
      UserModel.create.mockResolvedValue(mockUser);
      RefreshTokenModel.create.mockResolvedValue({});

      const result = await AuthService.register(mockUserData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockUserData.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      const mockUserData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      UserModel.findByEmail.mockResolvedValue({ id: '1' });

      await expect(AuthService.register(mockUserData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should validate password requirements', async () => {
      const mockUserData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(AuthService.register(mockUserData)).rejects.toThrow(
        'Password validation failed'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isVerified: false,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      PasswordUtils.comparePassword.mockResolvedValue(true);
      RefreshTokenModel.create.mockResolvedValue({});

      const result = await AuthService.login(mockLoginData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockLoginData.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      UserModel.findByEmail.mockResolvedValue({
        id: '1',
        password: 'hashed_password',
      });

      PasswordUtils.comparePassword.mockResolvedValue(false);

      await expect(AuthService.login(mockLoginData)).rejects.toThrow('Invalid email or password');
    });

    it('should require 2FA code when enabled', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
        isActive: true,
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      PasswordUtils.comparePassword.mockResolvedValue(true);

      await expect(AuthService.login(mockLoginData)).rejects.toThrow(
        'Two-factor authentication code required'
      );
    });
  });
});

describe('JwtUtils', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        username: 'testuser',
        roleId: 'role-id',
      };

      const token = JwtUtils.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid access token', () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        username: 'testuser',
        roleId: 'role-id',
      };

      const token = JwtUtils.generateAccessToken(payload);
      const decoded = JwtUtils.verifyAccessToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.type).toBe('access');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        username: 'testuser',
        roleId: 'role-id',
      };

      const token = JwtUtils.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid refresh token', () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        username: 'testuser',
        roleId: 'role-id',
      };

      const token = JwtUtils.generateRefreshToken(payload);
      const decoded = JwtUtils.verifyRefreshToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.type).toBe('refresh');
    });
  });
});

describe('PasswordUtils', () => {
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = PasswordUtils.validatePassword('TestPassword123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = PasswordUtils.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = PasswordUtils.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letters', () => {
      const result = PasswordUtils.validatePassword('lowercase123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const result = PasswordUtils.validatePassword('UPPERCASE123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const result = PasswordUtils.validatePassword('NoNumbers!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = PasswordUtils.validatePassword('NoSpecialChars123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });
});
