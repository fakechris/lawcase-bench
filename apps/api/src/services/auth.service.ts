import nodemailer from 'nodemailer';

import { UserModel, RoleModel, RefreshTokenModel, TokenBlacklistModel } from '../models/auth.js';
import {
  User,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  AuthResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
} from '../types/auth.js';
import { JwtUtils, PasswordUtils, TokenUtils } from '../utils/jwt.js';
import { TwoFactorUtils } from '../utils/twoFactor.js';

export class AuthService {
  private static emailTransporter: nodemailer.Transporter | null = null;

  private static getEmailTransporter(): nodemailer.Transporter {
    if (!this.emailTransporter) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.emailTransporter;
  }

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    // Validate password
    const passwordValidation = PasswordUtils.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await UserModel.findByUsername(data.username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const hashedPassword = await PasswordUtils.hashPassword(data.password);

    // Get default role (User role)
    const defaultRole = await RoleModel.findByName('User');
    if (!defaultRole) {
      throw new Error('Default role not found');
    }

    // Create user
    const user = await UserModel.create({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: true,
      isVerified: false,
      twoFactorEnabled: false,
      roleId: defaultRole.id,
    });

    // Generate tokens
    const accessToken = JwtUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
    });

    const refreshToken = TokenUtils.generateSecureToken();

    // Store refresh token
    await RefreshTokenModel.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false,
    });

    // Send verification email
    await this.sendVerificationEmail(user);

    // Return user without sensitive data
    const { password: _password, twoFactorSecret: _twoFactorSecret, ...userResponse } = user;

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    };
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await UserModel.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!data.twoFactorCode) {
        throw new Error('Two-factor authentication code required');
      }

      if (!user.twoFactorSecret) {
        throw new Error('Two-factor authentication not properly set up');
      }

      const is2FAValid = TwoFactorUtils.verifyToken(user.twoFactorSecret, data.twoFactorCode);
      if (!is2FAValid) {
        throw new Error('Invalid two-factor authentication code');
      }
    }

    // Generate tokens
    const accessToken = JwtUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
    });

    const refreshToken = TokenUtils.generateSecureToken();

    // Store refresh token
    await RefreshTokenModel.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false,
    });

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Return user without sensitive data
    const { password: _password, twoFactorSecret: _twoFactorSecret, ...userResponse } = user;

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    };
  }

  static async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    // Find refresh token
    const refreshToken = await RefreshTokenModel.findByToken(data.refreshToken);
    if (!refreshToken || refreshToken.isRevoked) {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (refreshToken.expiresAt < new Date()) {
      throw new Error('Refresh token expired');
    }

    // Get user
    const user = await UserModel.findById(refreshToken.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = JwtUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
    });

    // Generate new refresh token
    const newRefreshToken = TokenUtils.generateSecureToken();

    // Revoke old refresh token
    await RefreshTokenModel.revokeToken(data.refreshToken);

    // Store new refresh token
    await RefreshTokenModel.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false,
    });

    // Return user without sensitive data
    const { password: _password, twoFactorSecret: _twoFactorSecret, ...userResponse } = user;

    return {
      user: userResponse,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    };
  }

  static async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Blacklist access token
      const decoded = JwtUtils.decodeToken(accessToken);
      if (decoded) {
        await TokenBlacklistModel.create({
          token: accessToken,
          expiresAt: new Date(decoded.exp * 1000),
          reason: 'logout',
        });
      }
    } catch (error) {
      console.error('Error blacklisting access token:', error);
    }

    // Revoke refresh token
    try {
      await RefreshTokenModel.revokeToken(refreshToken);
    } catch (error) {
      console.error('Error revoking refresh token:', error);
    }
  }

  static async setupTwoFactor(userId: string, password: string): Promise<TwoFactorSetupResponse> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Generate 2FA setup
    const twoFactorSetup = await TwoFactorUtils.setupTwoFactor(user.email);

    return twoFactorSetup;
  }

  static async enableTwoFactor(userId: string, data: TwoFactorEnableRequest): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Verify 2FA code
    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication not set up');
    }

    const is2FAValid = TwoFactorUtils.verifyToken(user.twoFactorSecret, data.twoFactorCode);
    if (!is2FAValid) {
      throw new Error('Invalid two-factor authentication code');
    }

    // Enable 2FA
    await UserModel.update(userId, {
      twoFactorEnabled: true,
    });
  }

  static async disableTwoFactor(userId: string, password: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Disable 2FA
    await UserModel.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: [],
    });
  }

  static async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    const user = await UserModel.findByEmail(data.email);
    if (!user) {
      throw new Error('If this email exists, a reset link will be sent');
    }

    // Generate reset token
    const resetToken = TokenUtils.generateSecureToken();

    // Store reset token (this would typically be in a PasswordReset model)
    // For now, we'll simulate this

    // Send reset email
    await this.sendPasswordResetEmail(user, resetToken);
  }

  static async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<void> {
    // Validate password
    const passwordValidation = PasswordUtils.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Find user by reset token (this would typically query PasswordReset model)
    // For now, we'll simulate this logic

    throw new Error('Password reset functionality not fully implemented');
  }

  private static async sendVerificationEmail(user: User): Promise<void> {
    const verificationToken = TokenUtils.generateSecureToken();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@lawcasebench.com',
      to: user.email,
      subject: 'Verify your email address',
      html: `
        <h2>Welcome to LawCase Bench!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    try {
      await this.getEmailTransporter().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  }

  private static async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@lawcasebench.com',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your LawCase Bench account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    try {
      await this.getEmailTransporter().sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }
}
