import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../services/auth.service.js';

// Mock the modules
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
  RefreshTokenModel: {
    create: vi.fn(),
    findByToken: vi.fn(),
    revokeToken: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  },
  TokenBlacklistModel: {
    create: vi.fn(),
    isBlacklisted: vi.fn(),
  },
}));

vi.mock('../utils/jwt.js', () => ({
  JwtUtils: {
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyToken: vi.fn(),
    decodeToken: vi.fn(),
  },
  PasswordUtils: {
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
    validatePassword: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  },
  TokenUtils: {
    generateSecureToken: vi.fn(),
  },
  TwoFactorUtils: {
    setupTwoFactor: vi.fn(),
    verifyToken: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(),
    })),
  },
}));

// Import mocked modules after mocking
import { UserModel, RoleModel, RefreshTokenModel, TokenBlacklistModel } from '../models/auth.js';
import { JwtUtils, PasswordUtils, TokenUtils, TwoFactorUtils } from '../utils/jwt.js';

describe('AuthService', () => {
  beforeEach(() => {
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

      const mockUser = {
        id: 'user-id',
        ...registerData,
        password: 'hashed-password',
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
        description: 'Default user role',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      UserModel.findByEmail.mockResolvedValue(null);
      UserModel.findByUsername.mockResolvedValue(null);
      RoleModel.findByName.mockResolvedValue(mockRole);
      PasswordUtils.hashPassword.mockResolvedValue('hashed-password');
      UserModel.create.mockResolvedValue(mockUser);
      TokenUtils.generateSecureToken.mockReturnValue('refresh-token');
      JwtUtils.generateAccessToken.mockReturnValue('access-token');

      // Act
      const result = await AuthService.register(registerData);

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

      UserModel.findByEmail.mockResolvedValue({ id: 'existing-user' });

      // Act & Assert
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
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
        password: 'hashed-password',
        isActive: true,
        isVerified: true,
        twoFactorEnabled: false,
        roleId: 'role-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      PasswordUtils.comparePassword.mockResolvedValue(true);
      JwtUtils.generateAccessToken.mockReturnValue('access-token');
      TokenUtils.generateSecureToken.mockReturnValue('refresh-token');

      // Act
      const result = await AuthService.login(loginData);

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

      UserModel.findByEmail.mockResolvedValue({
        id: 'user-id',
        password: 'hashed-password',
        isActive: true,
      });
      PasswordUtils.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });
  });
});
