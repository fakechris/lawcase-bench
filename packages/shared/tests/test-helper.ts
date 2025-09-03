import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 清理数据库的辅助函数
export async function cleanupDatabase() {
  // 删除所有数据，但保留表结构
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log('清理数据库时出错:', error);
  }
}

// 创建测试数据的辅助函数
export async function createTestData() {
  // 创建权限
  const permissions = await prisma.permission.createMany({
    data: [
      { name: 'test.permission', description: '测试权限', resource: 'test', action: 'permission' },
      { name: 'users.read', description: '查看用户', resource: 'users', action: 'read' },
      { name: 'users.create', description: '创建用户', resource: 'users', action: 'create' },
      { name: 'users.update', description: '更新用户', resource: 'users', action: 'update' },
      { name: 'users.delete', description: '删除用户', resource: 'users', action: 'delete' },
      { name: 'roles.read', description: '查看角色', resource: 'roles', action: 'read' },
      { name: 'roles.create', description: '创建角色', resource: 'roles', action: 'create' },
      { name: 'roles.update', description: '更新角色', resource: 'roles', action: 'update' },
      { name: 'roles.delete', description: '删除角色', resource: 'roles', action: 'delete' },
    ],
  });

  // 创建角色
  const role = await prisma.role.create({
    data: {
      name: 'TEST_ROLE',
      description: '测试角色',
    },
  });

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', // password: "password"
      first_name: '测试',
      last_name: '用户',
      status: 'ACTIVE',
      email_verified: true,
    },
  });

  // 创建用户-角色关联
  await prisma.user_Role.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  // 为角色分配权限
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.create({
      data: {
        role_id: role.id,
        permission_id: permission.id,
      },
    });
  }

  return {
    permissions,
    role,
    user,
  };
}

export { prisma };
