import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 创建权限
  const permissions = await prisma.permission.createMany({
    data: [
      { name: 'users.read', description: '查看用户', resource: 'users', action: 'read' },
      { name: 'users.create', description: '创建用户', resource: 'users', action: 'create' },
      { name: 'users.update', description: '更新用户', resource: 'users', action: 'update' },
      { name: 'users.delete', description: '删除用户', resource: 'users', action: 'delete' },
      { name: 'roles.read', description: '查看角色', resource: 'roles', action: 'read' },
      { name: 'roles.create', description: '创建角色', resource: 'roles', action: 'create' },
      { name: 'roles.update', description: '更新角色', resource: 'roles', action: 'update' },
      { name: 'roles.delete', description: '删除角色', resource: 'roles', action: 'delete' },
      {
        name: 'permissions.read',
        description: '查看权限',
        resource: 'permissions',
        action: 'read',
      },
      {
        name: 'permissions.assign',
        description: '分配权限',
        resource: 'permissions',
        action: 'assign',
      },
    ],
  });

  console.log(`创建了 ${permissions.count} 个权限`);

  // 创建角色
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: '系统管理员',
    },
  });

  const lawyerRole = await prisma.role.create({
    data: {
      name: 'LAWYER',
      description: '律师',
    },
  });

  const assistantRole = await prisma.role.create({
    data: {
      name: 'ASSISTANT',
      description: '助理',
    },
  });

  console.log('创建了 3 个角色');

  // 为角色分配权限
  const allPermissions = await prisma.permission.findMany();

  // 管理员拥有所有权限
  for (const permission of allPermissions) {
    await prisma.rolePermission.create({
      data: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }

  // 律师拥有部分权限
  const lawyerPermissions = allPermissions.filter(
    (p) =>
      p.name.startsWith('users.') ||
      p.name.startsWith('roles.') ||
      p.name.startsWith('permissions.')
  );

  for (const permission of lawyerPermissions) {
    await prisma.rolePermission.create({
      data: {
        role_id: lawyerRole.id,
        permission_id: permission.id,
      },
    });
  }

  // 助理只有查看权限
  const readonlyPermissions = allPermissions.filter((p) => p.name.endsWith('.read'));

  for (const permission of readonlyPermissions) {
    await prisma.rolePermission.create({
      data: {
        role_id: assistantRole.id,
        permission_id: permission.id,
      },
    });
  }

  console.log('为角色分配了权限');

  // 创建管理员用户
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@lawcasebench.com',
      username: 'admin',
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: '系统',
      last_name: '管理员',
      status: 'ACTIVE',
      email_verified: true,
    },
  });

  // 为管理员分配角色
  await prisma.user_Role.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('创建了管理员用户');

  console.log('种子数据创建完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
