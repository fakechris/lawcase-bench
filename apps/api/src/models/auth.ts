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
      ...user,
      role: user.role ? {
        ...user.role,
        permissions: user.role.rolePermissions.map(rp => rp.permission),
      } : undefined,
    } as User;
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
      ...user,
      role: user.role ? {
        ...user.role,
        permissions: user.role.rolePermissions.map(rp => rp.permission),
      } : undefined,
    } as User;
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
      ...user,
      role: user.role ? {
        ...user.role,
        permissions: user.role.rolePermissions.map(rp => rp.permission),
      } : undefined,
    } as User;
  }

  static async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'role'>): Promise<User> {
    const user = await prisma.user.create({
      data,
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

    return {
      ...user,
      role: user.role ? {
        ...user.role,
        permissions: user.role.rolePermissions.map(rp => rp.permission),
      } : undefined,
    } as User;
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = await prisma.user.update({
      where: { id },
      data,
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

    return {
      ...user,
      role: user.role ? {
        ...user.role,
        permissions: user.role.rolePermissions.map(rp => rp.permission),
      } : undefined,
    } as User;
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
      ...role,
      permissions: role.rolePermissions.map(rp => rp.permission),
    } as Role;
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
      ...role,
      permissions: role.rolePermissions.map(rp => rp.permission),
    } as Role;
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

    return roles.map(role => ({
      ...role,
      permissions: role.rolePermissions.map(rp => rp.permission),
    })) as Role[];
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
      ...role,
      permissions: role.rolePermissions.map(rp => rp.permission),
    } as Role;
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

  static async create(data: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> {
    return prisma.permission.create({
      data,
    });
  }
}

export class RefreshTokenModel {
  static async create(data: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
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
  static async create(data: Omit<TokenBlacklist, 'id' | 'createdAt'>): Promise<TokenBlacklist> {
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