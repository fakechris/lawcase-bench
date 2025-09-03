import { PrismaClient } from '@prisma/client';

import { User, Role, Permission, RefreshToken, TokenBlacklist } from '../types/auth.js';

const prisma = new PrismaClient();

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret || undefined,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleId: user.roleId,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description || '',
            permissions: user.role.rolePermissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.createdAt,
              updatedAt: rp.permission.updatedAt,
            })),
            createdAt: user.role.createdAt,
            updatedAt: user.role.updatedAt,
          }
        : undefined,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret || undefined,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleId: user.roleId,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description || '',
            permissions: user.role.rolePermissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.createdAt,
              updatedAt: rp.permission.updatedAt,
            })),
            createdAt: user.role.createdAt,
            updatedAt: user.role.updatedAt,
          }
        : undefined,
    };
  }

  static async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username || '',
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret || undefined,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleId: user.roleId,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description || '',
            permissions: user.role.rolePermissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              description: rp.permission.description,
              createdAt: rp.permission.createdAt,
              updatedAt: rp.permission.updatedAt,
            })),
            createdAt: user.role.createdAt,
            updatedAt: user.role.updatedAt,
          }
        : undefined,
    };
  }

  static async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'role'>): Promise<User> {
    const userData = {
      email: data.email,
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: data.isActive,
      isVerified: data.isVerified,
    };

    const user = await prisma.user.create({
      data: {
        ...userData,
        roleId: data.roleId,
      },
    });

    // Fetch the complete user with role
    return this.findById(user.id) as Promise<User>;
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const updateData: any = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        roleId: data.roleId,
      },
    });

    // Fetch the complete user with role
    return this.findById(id);
  }

  static async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
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
        rolePermissions: {
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
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static async findByName(name: string): Promise<Role | null> {
    const role = await prisma.role.findUnique({
      where: { name },
      include: {
        rolePermissions: {
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
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static async findAll(): Promise<Role[]> {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
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
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  static async create(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const role = await prisma.role.create({
      data,
      include: {
        rolePermissions: {
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
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || '',
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
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
    return prisma.refreshToken.create({
      data,
      include: {
        user: true,
      },
    });
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });
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
      data,
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
