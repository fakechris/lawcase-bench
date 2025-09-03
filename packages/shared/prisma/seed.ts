import { PrismaClient } from '@prisma/client';
import {
  UserStatus,
  LeadStatus,
  LeadSource,
  CustomerStatus,
  CustomerType,
  CaseStatus,
  CaseType,
  CasePriority,
  ContractStatus,
  ContractType,
  PaymentStatus,
  PaymentMethod,
  DocumentType,
  DocumentStatus,
  CommunicationType,
  CommunicationStatus,
} from '@prisma/client';

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
      { name: 'customers.read', description: '查看客户', resource: 'customers', action: 'read' },
      { name: 'customers.create', description: '创建客户', resource: 'customers', action: 'create' },
      { name: 'customers.update', description: '更新客户', resource: 'customers', action: 'update' },
      { name: 'customers.delete', description: '删除客户', resource: 'customers', action: 'delete' },
      { name: 'cases.read', description: '查看案件', resource: 'cases', action: 'read' },
      { name: 'cases.create', description: '创建案件', resource: 'cases', action: 'create' },
      { name: 'cases.update', description: '更新案件', resource: 'cases', action: 'update' },
      { name: 'cases.delete', description: '删除案件', resource: 'cases', action: 'delete' },
      { name: 'contracts.read', description: '查看合同', resource: 'contracts', action: 'read' },
      { name: 'contracts.create', description: '创建合同', resource: 'contracts', action: 'create' },
      { name: 'contracts.update', description: '更新合同', resource: 'contracts', action: 'update' },
      { name: 'contracts.delete', description: '删除合同', resource: 'contracts', action: 'delete' },
      { name: 'payments.read', description: '查看付款', resource: 'payments', action: 'read' },
      { name: 'payments.create', description: '创建付款', resource: 'payments', action: 'create' },
      { name: 'payments.update', description: '更新付款', resource: 'payments', action: 'update' },
      { name: 'payments.delete', description: '删除付款', resource: 'payments', action: 'delete' },
      { name: 'documents.read', description: '查看文档', resource: 'documents', action: 'read' },
      { name: 'documents.create', description: '创建文档', resource: 'documents', action: 'create' },
      { name: 'documents.update', description: '更新文档', resource: 'documents', action: 'update' },
      { name: 'documents.delete', description: '删除文档', resource: 'documents', action: 'delete' },
      { name: 'communications.read', description: '查看沟通记录', resource: 'communications', action: 'read' },
      { name: 'communications.create', description: '创建沟通记录', resource: 'communications', action: 'create' },
      { name: 'communications.update', description: '更新沟通记录', resource: 'communications', action: 'update' },
      { name: 'communications.delete', description: '删除沟通记录', resource: 'communications', action: 'delete' },
      { name: 'admin.all', description: '管理员所有权限', resource: 'admin', action: 'all' },
    ],
    skipDuplicates: true,
  });

  console.log('权限创建完成');

  // 创建角色
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: '系统管理员',
    },
  });

  const lawyerRole = await prisma.role.upsert({
    where: { name: 'LAWYER' },
    update: {},
    create: {
      name: 'LAWYER',
      description: '律师',
    },
  });

  const assistantRole = await prisma.role.upsert({
    where: { name: 'ASSISTANT' },
    update: {},
    create: {
      name: 'ASSISTANT',
      description: '助理',
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: 'ACCOUNTANT' },
    update: {},
    create: {
      name: 'ACCOUNTANT',
      description: '会计',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      description: '经理',
    },
  });

  console.log('角色创建完成');

  // 为角色分配权限
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }

  // 为律师分配权限
  const lawyerPermissions = allPermissions.filter(
    (p) =>
      p.name.includes('customers') ||
      p.name.includes('cases') ||
      p.name.includes('contracts') ||
      p.name.includes('documents') ||
      p.name.includes('communications')
  );

  for (const permission of lawyerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: lawyerRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: lawyerRole.id,
        permission_id: permission.id,
      },
    });
  }

  console.log('角色权限分配完成');

  // 创建用户
  const hashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi'; // password: "password"

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lawcase.com' },
    update: {},
    create: {
      email: 'admin@lawcase.com',
      username: 'admin',
      password_hash: hashedPassword,
      first_name: '系统',
      last_name: '管理员',
      phone: '13800138000',
      status: UserStatus.ACTIVE,
      email_verified: true,
    },
  });

  const lawyerUser = await prisma.user.upsert({
    where: { email: 'lawyer@lawcase.com' },
    update: {},
    create: {
      email: 'lawyer@lawcase.com',
      username: 'lawyer',
      password_hash: hashedPassword,
      first_name: '张',
      last_name: '律师',
      phone: '13800138001',
      status: UserStatus.ACTIVE,
      email_verified: true,
    },
  });

  const assistantUser = await prisma.user.upsert({
    where: { email: 'assistant@lawcase.com' },
    update: {},
    create: {
      email: 'assistant@lawcase.com',
      username: 'assistant',
      password_hash: hashedPassword,
      first_name: '李',
      last_name: '助理',
      phone: '13800138002',
      status: UserStatus.ACTIVE,
      email_verified: true,
    },
  });

  console.log('用户创建完成');

  // 为用户分配角色
  await prisma.user_Role.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });

  await prisma.user_Role.upsert({
    where: {
      user_id_role_id: {
        user_id: lawyerUser.id,
        role_id: lawyerRole.id,
      },
    },
    update: {},
    create: {
      user_id: lawyerUser.id,
      role_id: lawyerRole.id,
    },
  });

  await prisma.user_Role.upsert({
    where: {
      user_id_role_id: {
        user_id: assistantUser.id,
        role_id: assistantRole.id,
      },
    },
    update: {},
    create: {
      user_id: assistantUser.id,
      role_id: assistantRole.id,
    },
  });

  console.log('用户角色分配完成');

  // 创建客户
  const customer1 = await prisma.customer.upsert({
    where: { id: 'customer1' },
    update: {},
    create: {
      id: 'customer1',
      name: '王小明',
      email: 'wang@example.com',
      phone: '13900139001',
      address: '北京市朝阳区某某街道123号',
      type: CustomerType.INDIVIDUAL,
      status: CustomerStatus.ACTIVE,
      notes: '个人客户，咨询离婚案件',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 'customer2' },
    update: {},
    create: {
      id: 'customer2',
      name: '北京科技有限公司',
      email: 'company@example.com',
      phone: '010-12345678',
      address: '北京市海淀区某某大厦10层',
      type: CustomerType.COMPANY,
      company_name: '北京科技有限公司',
      tax_id: '91110108XXXXXXXXXX',
      status: CustomerStatus.ACTIVE,
      notes: '企业客户，需要合同审查服务',
    },
  });

  console.log('客户创建完成');

  // 创建线索
  const lead1 = await prisma.lead.upsert({
    where: { id: 'lead1' },
    update: {},
    create: {
      id: 'lead1',
      customer_id: customer1.id,
      title: '离婚案件咨询',
      description: '客户咨询离婚相关法律问题，涉及财产分割和子女抚养权',
      status: LeadStatus.CONTACTED,
      source: LeadSource.WEBSITE,
      value: 50000,
      currency: 'CNY',
      probability: 70,
      expected_close_date: new Date('2024-12-31'),
      assigned_to: lawyerUser.id,
      created_by: adminUser.id,
    },
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: 'lead2' },
    update: {},
    create: {
      id: 'lead2',
      customer_id: customer2.id,
      title: '企业合同审查',
      description: '需要审查与供应商的合同，确保法律条款合规',
      status: LeadStatus.QUALIFIED,
      source: LeadSource.REFERRAL,
      value: 30000,
      currency: 'CNY',
      probability: 80,
      expected_close_date: new Date('2024-11-30'),
      assigned_to: lawyerUser.id,
      created_by: adminUser.id,
    },
  });

  console.log('线索创建完成');

  // 创建案件
  const case1 = await prisma.case.upsert({
    where: { case_number: 'CASE-2024-001' },
    update: {},
    create: {
      case_number: 'CASE-2024-001',
      title: '王小明离婚案',
      description: '离婚诉讼案件，涉及财产分割和子女抚养权',
      customer_id: customer1.id,
      lead_id: lead1.id,
      type: CaseType.FAMILY,
      status: CaseStatus.OPEN,
      priority: CasePriority.HIGH,
      assigned_to: lawyerUser.id,
      created_by: adminUser.id,
      start_date: new Date('2024-01-15'),
      estimated_value: 50000,
      currency: 'CNY',
      location: '北京市朝阳区人民法院',
      notes: '客户希望尽快解决离婚问题',
    },
  });

  const case2 = await prisma.case.upsert({
    where: { case_number: 'CASE-2024-002' },
    update: {},
    create: {
      case_number: 'CASE-2024-002',
      title: '北京科技有限公司合同审查',
      description: '审查与供应商的采购合同',
      customer_id: customer2.id,
      lead_id: lead2.id,
      type: CaseType.CORPORATE,
      status: CaseStatus.IN_PROGRESS,
      priority: CasePriority.MEDIUM,
      assigned_to: lawyerUser.id,
      created_by: adminUser.id,
      start_date: new Date('2024-02-01'),
      estimated_value: 30000,
      currency: 'CNY',
      notes: '需要在本月内完成审查',
    },
  });

  console.log('案件创建完成');

  // 创建合同
  const contract1 = await prisma.contract.upsert({
    where: { contract_number: 'CONTRACT-2024-001' },
    update: {},
    create: {
      contract_number: 'CONTRACT-2024-001',
      title: '离婚案件委托合同',
      description: '王小明离婚案件委托代理合同',
      customer_id: customer1.id,
      case_id: case1.id,
      type: ContractType.FIXED_FEE,
      status: ContractStatus.ACTIVE,
      amount: 50000,
      currency: 'CNY',
      start_date: new Date('2024-01-15'),
      terms: '固定费用50000元，包含所有法律服务',
      created_by: adminUser.id,
    },
  });

  const contract2 = await prisma.contract.upsert({
    where: { contract_number: 'CONTRACT-2024-002' },
    update: {},
    create: {
      contract_number: 'CONTRACT-2024-002',
      title: '合同审查服务合同',
      description: '北京科技有限公司合同审查服务合同',
      customer_id: customer2.id,
      case_id: case2.id,
      type: ContractType.HOURLY,
      status: ContractStatus.ACTIVE,
      amount: 30000,
      currency: 'CNY',
      start_date: new Date('2024-02-01'),
      terms: '按小时计费，每小时1000元，预计30小时',
      created_by: adminUser.id,
    },
  });

  console.log('合同创建完成');

  // 创建付款
  const payment1 = await prisma.payment.upsert({
    where: { payment_number: 'PAYMENT-2024-001' },
    update: {},
    create: {
      payment_number: 'PAYMENT-2024-001',
      customer_id: customer1.id,
      contract_id: contract1.id,
      case_id: case1.id,
      amount: 25000,
      currency: 'CNY',
      status: PaymentStatus.PAID,
      method: PaymentMethod.BANK_TRANSFER,
      due_date: new Date('2024-01-20'),
      paid_date: new Date('2024-01-18'),
      description: '离婚案件首期付款',
      created_by: adminUser.id,
    },
  });

  const payment2 = await prisma.payment.upsert({
    where: { payment_number: 'PAYMENT-2024-002' },
    update: {},
    create: {
      payment_number: 'PAYMENT-2024-002',
      customer_id: customer2.id,
      contract_id: contract2.id,
      case_id: case2.id,
      amount: 15000,
      currency: 'CNY',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.BANK_TRANSFER,
      due_date: new Date('2024-02-15'),
      description: '合同审查服务首期付款',
      created_by: adminUser.id,
    },
  });

  console.log('付款创建完成');

  // 创建沟通记录
  const communication1 = await prisma.communication.upsert({
    where: { id: 'comm1' },
    update: {},
    create: {
      id: 'comm1',
      type: CommunicationType.MEETING,
      status: CommunicationStatus.COMPLETED,
      subject: '初次咨询会议',
      content: '与客户讨论离婚案件的基本情况，了解客户需求',
      direction: 'INBOUND',
      customer_id: customer1.id,
      case_id: case1.id,
      completed_at: new Date('2024-01-10'),
      duration: 60,
      participants: [lawyerUser.id, assistantUser.id],
      notes: '客户情绪稳定，对案件有基本了解',
      created_by: lawyerUser.id,
    },
  });

  const communication2 = await prisma.communication.upsert({
    where: { id: 'comm2' },
    update: {},
    create: {
      id: 'comm2',
      type: CommunicationType.PHONE,
      status: CommunicationStatus.COMPLETED,
      subject: '合同审查进度跟进',
      content: '与公司法务沟通合同审查的具体要求和时间安排',
      direction: 'OUTBOUND',
      customer_id: customer2.id,
      case_id: case2.id,
      completed_at: new Date('2024-02-05'),
      duration: 30,
      participants: [lawyerUser.id],
      notes: '客户希望在本月底前完成审查',
      created_by: lawyerUser.id,
    },
  });

  console.log('沟通记录创建完成');

  // 创建文档
  const document1 = await prisma.document.upsert({
    where: { id: 'doc1' },
    update: {},
    create: {
      id: 'doc1',
      title: '离婚起诉状',
      filename: 'divorce_complaint.pdf',
      file_path: '/documents/divorce_complaint.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      type: DocumentType.COURT_FILING,
      status: DocumentStatus.FINAL,
      customer_id: customer1.id,
      case_id: case1.id,
      description: '离婚案件起诉状初稿',
      tags: ['起诉状', '离婚', '诉讼'],
      created_by: lawyerUser.id,
    },
  });

  const document2 = await prisma.document.upsert({
    where: { id: 'doc2' },
    update: {},
    create: {
      id: 'doc2',
      title: '合同审查报告',
      filename: 'contract_review_report.docx',
      file_path: '/documents/contract_review_report.docx',
      file_size: 512000,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      type: DocumentType.REPORT,
      status: DocumentStatus.DRAFT,
      customer_id: customer2.id,
      case_id: case2.id,
      description: '供应商合同审查报告',
      tags: ['合同审查', '报告', '企业'],
      created_by: lawyerUser.id,
    },
  });

  console.log('文档创建完成');

  console.log('种子数据创建完成！');
  console.log('默认用户账户：');
  console.log('管理员: admin@lawcase.com / password');
  console.log('律师: lawyer@lawcase.com / password');
  console.log('助理: assistant@lawcase.com / password');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
