import { PrismaClient } from '@prisma/client';

import { User, Role, Permission, RefreshToken, TokenBlacklist } from '../types/auth.js';

const prisma = new PrismaClient();

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const role = user.user_roles[0]?.role;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.status === 'ACTIVE',
      isVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled || false,
      twoFactorSecret: user.two_factor_secret || undefined,
      backupCodes: user.backup_codes || [],
      lastLoginAt: user.last_login_at || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roleId: user.user_roles[0]?.role_id || '',
      role: role
        ? {
            id: role.id,
            name: role.name,
            description: role.description || '',
            permissions: role.role_permissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.created_at,
              updatedAt: rp.permission.updated_at,
            })),
            createdAt: role.created_at,
            updatedAt: role.updated_at,
          }
        : undefined,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const role = user.user_roles[0]?.role;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.status === 'ACTIVE',
      isVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled || false,
      twoFactorSecret: user.two_factor_secret || undefined,
      backupCodes: user.backup_codes || [],
      lastLoginAt: user.last_login_at || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roleId: user.user_roles[0]?.role_id || '',
      role: role
        ? {
            id: role.id,
            name: role.name,
            description: role.description || '',
            permissions: role.role_permissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.created_at,
              updatedAt: rp.permission.updated_at,
            })),
            createdAt: role.created_at,
            updatedAt: role.updated_at,
          }
        : undefined,
    };
  }

  static async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const role = user.user_roles[0]?.role;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.status === 'ACTIVE',
      isVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled || false,
      twoFactorSecret: user.two_factor_secret || undefined,
      backupCodes: user.backup_codes || [],
      lastLoginAt: user.last_login_at || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roleId: user.user_roles[0]?.role_id || '',
      role: role
        ? {
            id: role.id,
            name: role.name,
            description: role.description || '',
            permissions: role.role_permissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.created_at,
              updatedAt: rp.permission.updated_at,
            })),
            createdAt: role.created_at,
            updatedAt: role.updated_at,
          }
        : undefined,
    };
  }

  static async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'role'>): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password_hash: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        status: data.isActive ? 'ACTIVE' : 'INACTIVE',
        email_verified: data.isVerified,
        two_factor_enabled: data.twoFactorEnabled || false,
        two_factor_secret: data.twoFactorSecret,
        backup_codes: data.backupCodes || [],
      },
    });

    // Create user-role relationship
    if (data.roleId) {
      await prisma.user_Role.create({
        data: {
          user_id: user.id,
          role_id: data.roleId,
        },
      });
    }

    // Fetch the complete user with role
    return this.findById(user.id) as Promise<User>;
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const updateData: any = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined) updateData.password_hash = data.password;
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.isActive !== undefined) updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
    if (data.isVerified !== undefined) updateData.email_verified = data.isVerified;
    if (data.twoFactorEnabled !== undefined) updateData.two_factor_enabled = data.twoFactorEnabled;
    if (data.twoFactorSecret !== undefined) updateData.two_factor_secret = data.twoFactorSecret;
    if (data.backupCodes !== undefined) updateData.backup_codes = data.backupCodes;
    if (data.lastLoginAt !== undefined) updateData.last_login_at = data.lastLoginAt;

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update role relationship if needed
    if (data.roleId) {
      // Delete existing role relationships
      await prisma.user_Role.deleteMany({
        where: { user_id: id },
      });

      // Create new role relationship
      await prisma.user_Role.create({
        data: {
          user_id: id,
          role_id: data.roleId,
        },
      });
    }

    // Fetch the complete user with role
    return this.findById(id);
  }

  static async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}

export class RoleModel {
  static async findById(id: string): Promise<Role | null> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: role.role_permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.created_at,
        updatedAt: rp.permission.updated_at,
      })),
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };
  }

  static async findByName(name: string): Promise<Role | null> {
    const role = await prisma.role.findUnique({
      where: { name },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: role.role_permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.created_at,
        updatedAt: rp.permission.updated_at,
      })),
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };
  }

  static async findAll(): Promise<Role[]> {
    const roles = await prisma.role.findMany({
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: role.role_permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.created_at,
        updatedAt: rp.permission.updated_at,
      })),
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    }));
  }

  static async create(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: [],
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };
  }
}

export class PermissionModel {
  static async findById(id: string): Promise<Permission | null> {
    return prisma.permission.findUnique({
      where: { id },
    });
  }

  static async findByName(name: string): Promise<Permission | null> {
    return prisma.permission.findUnique({
      where: { name },
    });
  }

  static async findAll(): Promise<Permission[]> {
    return prisma.permission.findMany();
  }

  static async create(
    data: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Permission> {
    return prisma.permission.create({
      data,
    });
  }
}

export class RefreshTokenModel {
  static async create(data: Omit<RefreshToken, 'id' | 'createdAt' | 'user'>): Promise<RefreshToken> {
    const token = await prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        isRevoked: data.isRevoked,
      },
      include: {
        user: {
          include: {
            user_roles: {
              include: {
                role: {
                  include: {
                    role_permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const user = token.user;
    const role = user.user_roles[0]?.role;

    return {
      id: token.id,
      token: token.token,
      userId: token.userId,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
      createdAt: token.created_at,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || '',
        password: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.status === 'ACTIVE',
        isVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled || false,
        twoFactorSecret: user.two_factor_secret || undefined,
        backupCodes: user.backup_codes || [],
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleId: user.user_roles[0]?.role_id || '',
      },
    };
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            user_roles: {
              include: {
                role: {
                  include: {
                    role_permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refreshToken) return null;

    const user = refreshToken.user;
    const role = user.user_roles[0]?.role;

    return {
      id: refreshToken.id,
      token: refreshToken.token,
      userId: refreshToken.userId,
      expiresAt: refreshToken.expiresAt,
      isRevoked: refreshToken.isRevoked,
      createdAt: refreshToken.created_at,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || '',
        password: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.status === 'ACTIVE',
        isVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled || false,
        twoFactorSecret: user.two_factor_secret || undefined,
        backupCodes: user.backup_codes || [],
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleId: user.user_roles[0]?.role_id || '',
      },
    };
  }

  static async revokeToken(token: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  static async deleteExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

export class TokenBlacklistModel {
  static async create(data: Omit<TokenBlacklist, 'id' | 'createdAt' | 'user'>): Promise<TokenBlacklist> {
    return prisma.tokenBlacklist.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        reason: data.reason,
      },
    });
  }

  static async findByToken(token: string): Promise<TokenBlacklist | null> {
    return prisma.tokenBlacklist.findUnique({
      where: { token },
    });
  }

  static async isBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await prisma.tokenBlacklist.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
    return !!blacklisted;
  }

  static async deleteExpiredTokens(): Promise<void> {
    await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}