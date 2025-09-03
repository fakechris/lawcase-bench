import { PrismaClient } from '@prisma/client';

import { PermissionModel } from '../src/models/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create permissions
  const permissions = [
    { name: 'users:read', resource: 'users', action: 'read', description: 'Read user data' },
    {
      name: 'users:write',
      resource: 'users',
      action: 'write',
      description: 'Create and update users',
    },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'Read role data' },
    {
      name: 'roles:write',
      resource: 'roles',
      action: 'write',
      description: 'Create and update roles',
    },
    { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
    { name: 'cases:read', resource: 'cases', action: 'read', description: 'Read case data' },
    {
      name: 'cases:write',
      resource: 'cases',
      action: 'write',
      description: 'Create and update cases',
    },
    { name: 'cases:delete', resource: 'cases', action: 'delete', description: 'Delete cases' },
    { name: 'clients:read', resource: 'clients', action: 'read', description: 'Read client data' },
    {
      name: 'clients:write',
      resource: 'clients',
      action: 'write',
      description: 'Create and update clients',
    },
    {
      name: 'clients:delete',
      resource: 'clients',
      action: 'delete',
      description: 'Delete clients',
    },
    {
      name: 'documents:read',
      resource: 'documents',
      action: 'read',
      description: 'Read document data',
    },
    {
      name: 'documents:write',
      resource: 'documents',
      action: 'write',
      description: 'Create and update documents',
    },
    {
      name: 'documents:delete',
      resource: 'documents',
      action: 'delete',
      description: 'Delete documents',
    },
    { name: 'billing:read', resource: 'billing', action: 'read', description: 'Read billing data' },
    {
      name: 'billing:write',
      resource: 'billing',
      action: 'write',
      description: 'Create and update billing',
    },
    {
      name: 'billing:delete',
      resource: 'billing',
      action: 'delete',
      description: 'Delete billing',
    },
    { name: 'reports:read', resource: 'reports', action: 'read', description: 'Read reports' },
    {
      name: 'reports:write',
      resource: 'reports',
      action: 'write',
      description: 'Create and update reports',
    },
    {
      name: 'system:admin',
      resource: 'system',
      action: 'admin',
      description: 'System administration',
    },
  ];

  for (const permissionData of permissions) {
    await prisma.permission.create({
      data: permissionData,
    });
  }

  // Create roles with permissions
  const roles = [
    {
      name: 'Admin',
      description: 'System administrator with full access',
      permissions: permissions.map((p) => p.name),
    },
    {
      name: 'Manager',
      description: 'Office manager with broad access',
      permissions: [
        'users:read',
        'users:write',
        'roles:read',
        'cases:read',
        'cases:write',
        'cases:delete',
        'clients:read',
        'clients:write',
        'clients:delete',
        'documents:read',
        'documents:write',
        'documents:delete',
        'billing:read',
        'billing:write',
        'reports:read',
        'reports:write',
      ],
    },
    {
      name: 'Lawyer',
      description: 'Lawyer with case and client access',
      permissions: [
        'cases:read',
        'cases:write',
        'clients:read',
        'clients:write',
        'documents:read',
        'documents:write',
        'billing:read',
        'reports:read',
      ],
    },
    {
      name: 'Sales',
      description: 'Sales representative with client access',
      permissions: [
        'clients:read',
        'clients:write',
        'cases:read',
        'documents:read',
        'billing:read',
        'reports:read',
      ],
    },
    {
      name: 'Finance',
      description: 'Finance staff with billing access',
      permissions: ['billing:read', 'billing:write', 'clients:read', 'cases:read', 'reports:read'],
    },
    {
      name: 'Marketer',
      description: 'Marketing staff with limited access',
      permissions: ['clients:read', 'cases:read', 'documents:read', 'reports:read'],
    },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.create({
      data: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    // Assign permissions to role
    for (const permissionName of roleData.permissions) {
      const permission = await PermissionModel.findByName(permissionName);
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: permission.id,
          },
        });
      }
    }
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
