export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  backupCodes?: string[];
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roleId: string;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  user?: User;
}

export interface TokenBlacklist {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  reason: string;
  createdAt: Date;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TwoFactorEnableRequest {
  password: string;
  twoFactorCode: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: Omit<User, 'password' | 'twoFactorSecret'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  roleId: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}
