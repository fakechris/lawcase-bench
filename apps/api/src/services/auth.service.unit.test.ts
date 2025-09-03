import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from './auth.service.js';
import { UserModel } from '../models/auth.js';
import { RoleModel } from '../models/auth.js';
import { PasswordUtils } from '../utils/password.js';
import { JwtUtils } from '../utils/jwt.js';
import { TokenUtils } from '../utils/token.js';

// Mock all dependencies
vi.mock('../models/auth.js', () => ({
  UserModel: {
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateLastLogin: vi.fn(),
  },
  RoleModel: {
    findByName: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../utils/password.js', () => ({
  PasswordUtils: {
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
  },
}));

vi.mock('../utils/jwt.js', () => ({
  JwtUtils: {
    generateAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    decodeAccessToken: vi.fn(),
  },
}));

vi.mock('../utils/token.js', () => ({
  TokenUtils: {
    generateSecureToken: vi.fn(),
    verifyToken: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockRole = {
        id: 'role-id',
        name: 'user',
        description: 'Regular user role',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: registerData.email,
        username: registerData.username,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        isActive: true,
        isVerified: false,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (UserModel.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (RoleModel.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(mockRole);
      (PasswordUtils.hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-password');
      (UserModel.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (TokenUtils.generateSecureToken as ReturnType<typeof vi.fn>).mockReturnValue('refresh-token');
      (JwtUtils.generateAccessToken as ReturnType<typeof vi.fn>).mockReturnValue('access-token');

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        isVerified: mockUser.isVerified,
        twoFactorEnabled: mockUser.twoFactorEnabled,
        roleId: mockUser.roleId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'existing-user',
      });

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw error if username already exists', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (UserModel.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'existing-user',
      });

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this username already exists'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-id',
        email: loginData.email,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (PasswordUtils.comparePassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (JwtUtils.generateAccessToken as ReturnType<typeof vi.fn>).mockReturnValue('access-token');
      (TokenUtils.generateSecureToken as ReturnType<typeof vi.fn>).mockReturnValue('refresh-token');

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        isVerified: mockUser.isVerified,
        twoFactorEnabled: mockUser.twoFactorEnabled,
        roleId: mockUser.roleId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-id',
        password: 'hashed-password',
        isActive: true,
      });
      (PasswordUtils.comparePassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      (UserModel.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-id',
        password: 'hashed-password',
        isActive: false,
      });
      (PasswordUtils.comparePassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('User account is inactive');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-id';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TokenUtils.verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId });
      (UserModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (JwtUtils.generateAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        'new-access-token'
      );

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';

      (TokenUtils.verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';

      // Act
      await authService.logout(refreshToken);

      // Assert
      expect(TokenUtils.verifyToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Arrange
      const token = 'valid-verification-token';
      const userId = 'user-id';

      (JwtUtils.verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId });
      (UserModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        isVerified: false,
      });
      (UserModel.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        isVerified: true,
      });

      // Act
      const result = await authService.verifyEmail(token);

      // Assert
      expect(result).toBe(true);
      expect(UserModel.update).toHaveBeenCalledWith(userId, { isVerified: true });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const userId = 'user-id';
      const currentPassword = 'old-password';
      const newPassword = 'new-password123!';

      const mockUser = {
        id: userId,
        password: 'hashed-old-password',
        isActive: true,
      };

      (UserModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (PasswordUtils.comparePassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (PasswordUtils.hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue(
        'hashed-new-password'
      );
      (UserModel.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        password: 'hashed-new-password',
      });

      // Act
      const result = await authService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('enableTwoFactor', () => {
    it('should enable two-factor authentication successfully', async () => {
      // Arrange
      const userId = 'user-id';
      const secret = 'test-secret';
      const backupCodes = ['code1', 'code2'];

      (UserModel.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes,
      });

      // Act
      const result = await authService.enableTwoFactor(userId, secret, backupCodes);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable two-factor authentication successfully', async () => {
      // Arrange
      const userId = 'user-id';

      (UserModel.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      });

      // Act
      const result = await authService.disableTwoFactor(userId);

      // Assert
      expect(result).toBe(true);
    });
  });
});
