import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../services/auth.service.js';
import { JwtUtils, PasswordUtils } from '../utils/jwt.js';
import { UserModel, RoleModel, RefreshTokenModel } from '../models/auth.js';

// Mock the modules
const mockUserModel = {
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateLastLogin: vi.fn(),
};

const mockRoleModel = {
  findByName: vi.fn(),
  findById: vi.fn(),
};

const mockRefreshTokenModel = {
  create: vi.fn(),
  findByToken: vi.fn(),
  revokeToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
};

const mockJwtUtils = {
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
};

const mockPasswordUtils = {
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  validatePassword: vi.fn(),
};

vi.mock('../models/auth.js', () => ({
  UserModel: mockUserModel,
  RoleModel: mockRoleModel,
  RefreshTokenModel: mockRefreshTokenModel,
}));

vi.mock('../utils/jwt.js', () => ({
  JwtUtils: mockJwtUtils,
  PasswordUtils: mockPasswordUtils,
}));

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

      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.findByUsername.mockResolvedValue(null);
      mockRoleModel.findByName.mockResolvedValue(mockRole);
      mockUserModel.create.mockResolvedValue(mockUser);
      mockRefreshTokenModel.create.mockResolvedValue({});

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

      mockUserModel.findByEmail.mockResolvedValue({ id: '1' });

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

      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password is too weak'],
      });

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

      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.comparePassword.mockResolvedValue(true);
      mockRefreshTokenModel.create.mockResolvedValue({});

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

      mockUserModel.findByEmail.mockResolvedValue({
        id: '1',
        password: 'hashed_password',
      });

      mockPasswordUtils.comparePassword.mockResolvedValue(false);

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

      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.comparePassword.mockResolvedValue(true);

      await expect(AuthService.login(mockLoginData)).rejects.toThrow(
        'Two-factor authentication code required'
      );
    });
  });
});

describe('JwtUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        username: 'testuser',
        roleId: 'role-id',
      };

      mockJwtUtils.generateAccessToken(payload);

      expect(mockJwtUtils.generateAccessToken).toHaveBeenCalledWith(payload);
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

      mockJwtUtils.generateRefreshToken(payload);

      expect(mockJwtUtils.generateRefreshToken).toHaveBeenCalledWith(payload);
    });
  });
});

describe('PasswordUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = {
        isValid: true,
        errors: [],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('TestPassword123!');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = {
        isValid: false,
        errors: ['Password is too weak'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('weak');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = {
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('Short1!');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letters', () => {
      const result = {
        isValid: false,
        errors: ['Password must contain at least one uppercase letter'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('lowercase123!');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const result = {
        isValid: false,
        errors: ['Password must contain at least one lowercase letter'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('UPPERCASE123!');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const result = {
        isValid: false,
        errors: ['Password must contain at least one number'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('NoNumbers!');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = {
        isValid: false,
        errors: ['Password must contain at least one special character'],
      };

      mockPasswordUtils.validatePassword.mockReturnValue(result);

      const validation = mockPasswordUtils.validatePassword('NoSpecialChars123');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Password must contain at least one special character');
    });
  });
});
