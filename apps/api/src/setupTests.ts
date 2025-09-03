// Test setup file
import 'dotenv/config';
import { vi } from 'vitest';

// Mock external dependencies
vi.mock('nodemailer');
vi.mock('twilio');
vi.mock('@aws-sdk/client-s3');
vi.mock('@aws-sdk/s3-request-presigner');
vi.mock('@sendgrid/mail');

// Mock internal models and utilities
vi.mock('../models/auth.js', () => ({
  UserModel: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateLastLogin: vi.fn(),
    findByUsername: vi.fn(),
  },
  RoleModel: {
    findById: vi.fn(),
    findByName: vi.fn(),
  },
  PermissionModel: {
    findByName: vi.fn(),
    create: vi.fn(),
  },
  RefreshTokenModel: {
    create: vi.fn(),
    findByToken: vi.fn(),
    revoke: vi.fn(),
    deleteByUserId: vi.fn(),
  },
  TokenBlacklistModel: {
    create: vi.fn(),
    isBlacklisted: vi.fn(),
  },
}));

// Mock JWT utilities
vi.mock('../utils/jwt.js', () => ({
  JwtUtils: {
    generateAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(),
  },
  TokenUtils: {
    generateSecureToken: vi.fn(),
  },
  PasswordUtils: {
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
    validatePassword: vi.fn(),
  },
  TwoFactorUtils: {
    generateSecret: vi.fn(),
    generateQRCode: vi.fn(),
    verifyToken: vi.fn(),
  },
}));
