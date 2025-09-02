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
      { name: 'test.permission', description: '测试权限' },
      { name: 'users.read', description: '查看用户' },
      { name: 'customers.read', description: '查看客户' },
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

  // 创建客户
  const customer = await prisma.customer.create({
    data: {
      name: '测试客户',
      email: 'customer@example.com',
      phone: '13800138000',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
    },
  });

  // 创建案件
  const case_ = await prisma.case.create({
    data: {
      case_number: 'TEST-001',
      title: '测试案件',
      customer_id: customer.id,
      type: 'CIVIL',
      status: 'OPEN',
      priority: 'MEDIUM',
      created_by: user.id,
    },
  });

  return {
    permissions,
    role,
    user,
    customer,
    case: case_,
  };
}

export { prisma };
