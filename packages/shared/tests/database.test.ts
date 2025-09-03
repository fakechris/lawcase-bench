import { PrismaClient, User_Role } from '@prisma/client';
import { cleanupDatabase, prisma } from './test-helper';

describe('Database Models', () => {
  beforeAll(async () => {
    // 确保数据库连接正常
    await prisma.$connect();
  });

  afterAll(async () => {
    // 断开数据库连接
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 每次测试前清理数据库
    await cleanupDatabase();
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User',
          status: 'ACTIVE',
        },
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.status).toBe('ACTIVE');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          username: 'user1',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'One',
          status: 'ACTIVE',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate@example.com',
            username: 'user2',
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: 'Two',
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      await prisma.user.create({
        data: {
          email: 'user1@example.com',
          username: 'duplicateuser',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'One',
          status: 'ACTIVE',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'user2@example.com',
            username: 'duplicateuser',
            password_hash: 'hashedpassword',
            first_name: 'User',
            last_name: 'Two',
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow();
    });

    it('should support two-factor authentication fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: '2fa@example.com',
          username: '2fauser',
          password_hash: 'hashedpassword',
          first_name: '2FA',
          last_name: 'User',
          status: 'ACTIVE',
          two_factor_enabled: true,
          two_factor_secret: 'JBSWY3DPEHPK3PXP',
          backup_codes: ['123456', '789012'],
        },
      });

      expect(user.two_factor_enabled).toBe(true);
      expect(user.two_factor_secret).toBe('JBSWY3DPEHPK3PXP');
      expect(user.backup_codes).toEqual(['123456', '789012']);
    });
  });

  describe('Role Model', () => {
    it('should create a role with required fields', async () => {
      const role = await prisma.role.create({
        data: {
          name: 'TEST_ROLE',
          description: 'Test Role',
        },
      });

      expect(role).toBeDefined();
      expect(role.id).toBeDefined();
      expect(role.name).toBe('TEST_ROLE');
      expect(role.description).toBe('Test Role');
      expect(role.createdAt).toBeDefined();
      expect(role.updatedAt).toBeDefined();
    });

    it('should enforce unique role name constraint', async () => {
      await prisma.role.create({
        data: {
          name: 'DUPLICATE_ROLE',
          description: 'First Role',
        },
      });

      await expect(
        prisma.role.create({
          data: {
            name: 'DUPLICATE_ROLE',
            description: 'Second Role',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Permission Model', () => {
    it('should create a permission with required fields', async () => {
      const permission = await prisma.permission.create({
        data: {
          name: 'test.permission',
          resource: 'test',
          action: 'read',
          description: 'Test permission',
        },
      });

      expect(permission).toBeDefined();
      expect(permission.id).toBeDefined();
      expect(permission.name).toBe('test.permission');
      expect(permission.resource).toBe('test');
      expect(permission.action).toBe('read');
      expect(permission.description).toBe('Test permission');
      expect(permission.createdAt).toBeDefined();
      expect(permission.updatedAt).toBeDefined();
    });

    it('should enforce unique permission name constraint', async () => {
      await prisma.permission.create({
        data: {
          name: 'duplicate.permission',
          resource: 'test',
          action: 'read',
          description: 'First permission',
        },
      });

      await expect(
        prisma.permission.create({
          data: {
            name: 'duplicate.permission',
            resource: 'test',
            action: 'write',
            description: 'Second permission',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('User-Role Relationship', () => {
    it('should establish user-role many-to-many relationship', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'roleuser@example.com',
          username: 'roleuser',
          password_hash: 'hashedpassword',
          first_name: 'Role',
          last_name: 'User',
          status: 'ACTIVE',
        },
      });

      const role = await prisma.role.create({
        data: {
          name: 'TEST_ROLE_USER',
          description: 'Test Role for User',
        },
      });

      // 创建用户-角色关联
      const userRole = await prisma.user_Role.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      expect(userRole).toBeDefined();
      expect(userRole.userId).toBe(user.id);
      expect(userRole.roleId).toBe(role.id);

      // 验证关系
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: { user_roles: { include: { role: true } } },
      });

      expect(userWithRoles?.user_roles).toHaveLength(1);
      expect(userWithRoles?.user_roles[0].role.name).toBe('TEST_ROLE_USER');
    });

    it('should prevent duplicate user-role assignments', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'duplicateuser@example.com',
          username: 'duplicateuser',
          password_hash: 'hashedpassword',
          first_name: 'Duplicate',
          last_name: 'User',
          status: 'ACTIVE',
        },
      });

      const role = await prisma.role.create({
        data: {
          name: 'DUPLICATE_ROLE',
          description: 'Test Role',
        },
      });

      // 创建第一个用户-角色关联
      await prisma.user_Role.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // 尝试创建重复的关联
      await expect(
        prisma.user_Role.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Role-Permission Relationship', () => {
    it('should establish role-permission many-to-many relationship', async () => {
      const role = await prisma.role.create({
        data: {
          name: 'PERMISSION_ROLE',
          description: 'Role with permissions',
        },
      });

      const permission = await prisma.permission.create({
        data: {
          name: 'test.permission.read',
          resource: 'test',
          action: 'read',
          description: 'Test read permission',
        },
      });

      // 创建角色-权限关联
      const rolePermission = await prisma.rolePermission.create({
        data: {
          role_id: role.id,
          permission_id: permission.id,
        },
      });

      expect(rolePermission).toBeDefined();
      expect(rolePermission.role_id).toBe(role.id);
      expect(rolePermission.permission_id).toBe(permission.id);

      // 验证关系
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      });

      expect(roleWithPermissions?.rolePermissions).toHaveLength(1);
      expect(roleWithPermissions?.rolePermissions[0].permission.name).toBe('test.permission.read');
    });

    it('should prevent duplicate role-permission assignments', async () => {
      const role = await prisma.role.create({
        data: {
          name: 'DUPLICATE_PERMISSION_ROLE',
          description: 'Role for duplicate permission test',
        },
      });

      const permission = await prisma.permission.create({
        data: {
          name: 'duplicate.permission',
          resource: 'test',
          action: 'write',
          description: 'Test write permission',
        },
      });

      // 创建第一个角色-权限关联
      await prisma.rolePermission.create({
        data: {
          role_id: role.id,
          permission_id: permission.id,
        },
      });

      // 尝试创建重复的关联
      await expect(
        prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: permission.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('RefreshToken Model', () => {
    it('should create a refresh token', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'tokenuser@example.com',
          username: 'tokenuser',
          password_hash: 'hashedpassword',
          first_name: 'Token',
          last_name: 'User',
          status: 'ACTIVE',
        },
      });

      const refreshToken = await prisma.refreshToken.create({
        data: {
          token: 'test-refresh-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      expect(refreshToken).toBeDefined();
      expect(refreshToken.token).toBe('test-refresh-token');
      expect(refreshToken.userId).toBe(user.id);
      expect(refreshToken.isRevoked).toBe(false);
    });

    it('should enforce unique refresh token constraint', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'tokenuser2@example.com',
          username: 'tokenuser2',
          password_hash: 'hashedpassword',
          first_name: 'Token2',
          last_name: 'User2',
          status: 'ACTIVE',
        },
      });

      await prisma.refreshToken.create({
        data: {
          token: 'duplicate-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await expect(
        prisma.refreshToken.create({
          data: {
            token: 'duplicate-token',
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('TokenBlacklist Model', () => {
    it('should create a blacklisted token', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'blacklistuser@example.com',
          username: 'blacklistuser',
          password_hash: 'hashedpassword',
          first_name: 'Blacklist',
          last_name: 'User',
          status: 'ACTIVE',
        },
      });

      const blacklistedToken = await prisma.tokenBlacklist.create({
        data: {
          token: 'blacklisted-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          reason: 'User logout',
        },
      });

      expect(blacklistedToken).toBeDefined();
      expect(blacklistedToken.token).toBe('blacklisted-token');
      expect(blacklistedToken.userId).toBe(user.id);
      expect(blacklistedToken.reason).toBe('User logout');
    });

    it('should enforce unique blacklisted token constraint', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'blacklistuser2@example.com',
          username: 'blacklistuser2',
          password_hash: 'hashedpassword',
          first_name: 'Blacklist2',
          last_name: 'User2',
          status: 'ACTIVE',
        },
      });

      await prisma.tokenBlacklist.create({
        data: {
          token: 'duplicate-blacklisted-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          reason: 'Test reason',
        },
      });

      await expect(
        prisma.tokenBlacklist.create({
          data: {
            token: 'duplicate-blacklisted-token',
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            reason: 'Another reason',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Database Constraints and Indexes', () => {
    it('should enforce foreign key constraints', async () => {
      // 尝试创建具有无效外键的刷新令牌
      await expect(
        prisma.refreshToken.create({
          data: {
            token: 'test-token',
            userId: 'invalid-user-id',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce not null constraints', async () => {
      // 尝试创建缺少必需字段的用户
      await expect(
        prisma.user.create({
          data: {
            email: 'nulltest@example.com',
            password_hash: 'hash123',
            first_name: 'Test',
            last_name: 'User',
            // 缺少 username
          },
        })
      ).rejects.toThrow();
    });
  });
});
