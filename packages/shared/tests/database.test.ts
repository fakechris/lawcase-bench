import {
  PrismaClient,
  UserRole,
  UserStatus,
  CustomerType,
  CustomerStatus,
  CaseType,
  CaseStatus,
  CasePriority,
  LeadStatus,
  LeadSource,
  ContractStatus,
  ContractType,
  PaymentStatus,
  PaymentMethod,
  CommunicationType,
  CommunicationStatus,
  DocumentType,
  DocumentStatus,
  RefundStatus,
} from '@prisma/client';
import { cleanupDatabase, createTestData, prisma } from './test-helper';

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
          status: UserStatus.ACTIVE,
        },
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          username: 'user1',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'One',
          status: UserStatus.ACTIVE,
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
            status: UserStatus.ACTIVE,
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
          status: UserStatus.ACTIVE,
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
            status: UserStatus.ACTIVE,
          },
        })
      ).rejects.toThrow();
    });

    it('should support soft delete', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'softdelete@example.com',
          username: 'softdelete',
          password_hash: 'hashedpassword',
          first_name: 'Soft',
          last_name: 'Delete',
          status: UserStatus.ACTIVE,
        },
      });

      // 软删除用户
      await prisma.user.update({
        where: { id: user.id },
        data: { deleted_at: new Date() },
      });

      // 查询应该不返回已删除的用户
      const foundUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(foundUser).toBeNull();
    });
  });

  describe('Customer Model', () => {
    it('should create a customer with required fields', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          type: CustomerType.INDIVIDUAL,
          status: CustomerStatus.ACTIVE,
        },
      });

      expect(customer).toBeDefined();
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('Test Customer');
      expect(customer.type).toBe(CustomerType.INDIVIDUAL);
      expect(customer.status).toBe(CustomerStatus.ACTIVE);
      expect(customer.created_at).toBeDefined();
      expect(customer.updated_at).toBeDefined();
    });

    it('should create a company customer', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Company',
          type: CustomerType.COMPANY,
          company_name: 'Test Company Ltd',
          tax_id: '123456789',
          status: CustomerStatus.ACTIVE,
        },
      });

      expect(customer).toBeDefined();
      expect(customer.name).toBe('Test Company');
      expect(customer.type).toBe(CustomerType.COMPANY);
      expect(customer.company_name).toBe('Test Company Ltd');
      expect(customer.tax_id).toBe('123456789');
    });

    it('should support soft delete', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Soft Delete Customer',
          type: CustomerType.INDIVIDUAL,
          status: CustomerStatus.ACTIVE,
        },
      });

      // 软删除客户
      await prisma.customer.update({
        where: { id: customer.id },
        data: { deleted_at: new Date() },
      });

      // 查询应该不返回已删除的客户
      const foundCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
      });

      expect(foundCustomer).toBeNull();
    });
  });

  describe('Case Model', () => {
    let user: any;
    let customer: any;

    beforeEach(async () => {
      const testData = await createTestData();
      user = testData.user;
      customer = testData.customer;
    });

    it('should create a case with required fields', async () => {
      const case_ = await prisma.case.create({
        data: {
          case_number: 'CASE-001',
          title: 'Test Case',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      expect(case_).toBeDefined();
      expect(case_.id).toBeDefined();
      expect(case_.case_number).toBe('CASE-001');
      expect(case_.title).toBe('Test Case');
      expect(case_.customer_id).toBe(customer.id);
      expect(case_.type).toBe(CaseType.CIVIL);
      expect(case_.status).toBe(CaseStatus.OPEN);
      expect(case_.priority).toBe(CasePriority.MEDIUM);
      expect(case_.created_by).toBe(user.id);
    });

    it('should enforce unique case number constraint', async () => {
      await prisma.case.create({
        data: {
          case_number: 'DUPLICATE-001',
          title: 'First Case',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      await expect(
        prisma.case.create({
          data: {
            case_number: 'DUPLICATE-001',
            title: 'Second Case',
            customer_id: customer.id,
            type: CaseType.CIVIL,
            status: CaseStatus.OPEN,
            priority: CasePriority.MEDIUM,
            created_by: user.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should support soft delete', async () => {
      const case_ = await prisma.case.create({
        data: {
          case_number: 'SOFT-DELETE-001',
          title: 'Soft Delete Case',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      // 软删除案件
      await prisma.case.update({
        where: { id: case_.id },
        data: { deleted_at: new Date() },
      });

      // 查询应该不返回已删除的案件
      const foundCase = await prisma.case.findUnique({
        where: { id: case_.id },
      });

      expect(foundCase).toBeNull();
    });
  });

  describe('Lead Model', () => {
    let user: any;
    let customer: any;

    beforeEach(async () => {
      const testData = await createTestData();
      user = testData.user;
      customer = testData.customer;
    });

    it('should create a lead with required fields', async () => {
      const lead = await prisma.lead.create({
        data: {
          title: 'Test Lead',
          status: LeadStatus.NEW,
          source: LeadSource.WEBSITE,
          created_by: user.id,
        },
      });

      expect(lead).toBeDefined();
      expect(lead.id).toBeDefined();
      expect(lead.title).toBe('Test Lead');
      expect(lead.status).toBe(LeadStatus.NEW);
      expect(lead.source).toBe(LeadSource.WEBSITE);
      expect(lead.created_by).toBe(user.id);
    });

    it('should create a lead with customer association', async () => {
      const lead = await prisma.lead.create({
        data: {
          title: 'Customer Lead',
          customer_id: customer.id,
          status: LeadStatus.CONTACTED,
          source: LeadSource.REFERRAL,
          value: 10000,
          currency: 'CNY',
          probability: 80,
          created_by: user.id,
        },
      });

      expect(lead).toBeDefined();
      expect(lead.customer_id).toBe(customer.id);
      expect(lead.value).toBe(10000);
      expect(lead.probability).toBe(80);
    });

    it('should support soft delete', async () => {
      const lead = await prisma.lead.create({
        data: {
          title: 'Soft Delete Lead',
          status: LeadStatus.NEW,
          source: LeadSource.WEBSITE,
          created_by: user.id,
        },
      });

      // 软删除线索
      await prisma.lead.update({
        where: { id: lead.id },
        data: { deleted_at: new Date() },
      });

      // 查询应该不返回已删除的线索
      const foundLead = await prisma.lead.findUnique({
        where: { id: lead.id },
      });

      expect(foundLead).toBeNull();
    });
  });

  describe('Contract Model', () => {
    let user: any;
    let customer: any;
    let case_: any;

    beforeEach(async () => {
      const testData = await createTestData();
      user = testData.user;
      customer = testData.customer;
      case_ = testData.case;
    });

    it('should create a contract with required fields', async () => {
      const contract = await prisma.contract.create({
        data: {
          contract_number: 'CONTRACT-001',
          title: 'Test Contract',
          customer_id: customer.id,
          type: ContractType.FIXED_FEE,
          status: ContractStatus.DRAFT,
          amount: 5000,
          created_by: user.id,
        },
      });

      expect(contract).toBeDefined();
      expect(contract.id).toBeDefined();
      expect(contract.contract_number).toBe('CONTRACT-001');
      expect(contract.title).toBe('Test Contract');
      expect(contract.customer_id).toBe(customer.id);
      expect(contract.type).toBe(ContractType.FIXED_FEE);
      expect(contract.status).toBe(ContractStatus.DRAFT);
      expect(contract.amount).toBe(5000);
      expect(contract.created_by).toBe(user.id);
    });

    it('should create a contract with case association', async () => {
      const contract = await prisma.contract.create({
        data: {
          contract_number: 'CONTRACT-002',
          title: 'Case Contract',
          customer_id: customer.id,
          case_id: case_.id,
          type: ContractType.HOURLY,
          status: ContractStatus.ACTIVE,
          amount: 10000,
          start_date: new Date(),
          created_by: user.id,
        },
      });

      expect(contract).toBeDefined();
      expect(contract.case_id).toBe(case_.id);
      expect(contract.start_date).toBeDefined();
    });

    it('should enforce unique contract number constraint', async () => {
      await prisma.contract.create({
        data: {
          contract_number: 'DUPLICATE-CONTRACT',
          title: 'First Contract',
          customer_id: customer.id,
          type: ContractType.FIXED_FEE,
          status: ContractStatus.DRAFT,
          amount: 5000,
          created_by: user.id,
        },
      });

      await expect(
        prisma.contract.create({
          data: {
            contract_number: 'DUPLICATE-CONTRACT',
            title: 'Second Contract',
            customer_id: customer.id,
            type: ContractType.FIXED_FEE,
            status: ContractStatus.DRAFT,
            amount: 5000,
            created_by: user.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Payment Model', () => {
    let user: any;
    let customer: any;
    let contract: any;
    let case_: any;

    beforeEach(async () => {
      const testData = await createTestData();
      user = testData.user;
      customer = testData.customer;
      case_ = testData.case;

      contract = await prisma.contract.create({
        data: {
          contract_number: 'CONTRACT-TEST',
          title: 'Test Contract',
          customer_id: customer.id,
          case_id: case_.id,
          type: ContractType.FIXED_FEE,
          status: ContractStatus.ACTIVE,
          amount: 5000,
          created_by: user.id,
        },
      });
    });

    it('should create a payment with required fields', async () => {
      const payment = await prisma.payment.create({
        data: {
          payment_number: 'PAYMENT-001',
          customer_id: customer.id,
          amount: 1000,
          currency: 'CNY',
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          created_by: user.id,
        },
      });

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.payment_number).toBe('PAYMENT-001');
      expect(payment.customer_id).toBe(customer.id);
      expect(payment.amount).toBe(1000);
      expect(payment.currency).toBe('CNY');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.method).toBe(PaymentMethod.BANK_TRANSFER);
      expect(payment.created_by).toBe(user.id);
    });

    it('should create a payment with contract and case association', async () => {
      const payment = await prisma.payment.create({
        data: {
          payment_number: 'PAYMENT-002',
          customer_id: customer.id,
          contract_id: contract.id,
          case_id: case_.id,
          amount: 2000,
          currency: 'CNY',
          status: PaymentStatus.PAID,
          method: PaymentMethod.BANK_TRANSFER,
          due_date: new Date(),
          paid_date: new Date(),
          created_by: user.id,
        },
      });

      expect(payment).toBeDefined();
      expect(payment.contract_id).toBe(contract.id);
      expect(payment.case_id).toBe(case_.id);
      expect(payment.due_date).toBeDefined();
      expect(payment.paid_date).toBeDefined();
    });

    it('should enforce unique payment number constraint', async () => {
      await prisma.payment.create({
        data: {
          payment_number: 'DUPLICATE-PAYMENT',
          customer_id: customer.id,
          amount: 1000,
          currency: 'CNY',
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          created_by: user.id,
        },
      });

      await expect(
        prisma.payment.create({
          data: {
            payment_number: 'DUPLICATE-PAYMENT',
            customer_id: customer.id,
            amount: 1000,
            currency: 'CNY',
            status: PaymentStatus.PENDING,
            method: PaymentMethod.BANK_TRANSFER,
            created_by: user.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Relationships', () => {
    it('should establish user-role many-to-many relationship', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'roleuser@example.com',
          username: 'roleuser',
          password_hash: 'hashedpassword',
          first_name: 'Role',
          last_name: 'User',
          status: UserStatus.ACTIVE,
        },
      });

      const role = await prisma.role.create({
        data: {
          name: 'TEST_ROLE_USER',
          description: 'Test Role for User',
        },
      });

      // 创建用户-角色关联
      await prisma.user_Role.create({
        data: {
          user_id: user.id,
          role_id: role.id,
        },
      });

      // 验证关系
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: { user_roles: { include: { role: true } } },
      });

      expect(userWithRoles?.user_roles).toHaveLength(1);
      expect(userWithRoles?.user_roles[0].role.name).toBe('TEST_ROLE_USER');
    });

    it('should establish customer-case one-to-many relationship', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'relationuser@example.com',
          username: 'relationuser',
          password_hash: 'hashedpassword',
          first_name: 'Relation',
          last_name: 'User',
          status: UserStatus.ACTIVE,
        },
      });

      const customer = await prisma.customer.create({
        data: {
          name: 'Relation Customer',
          type: CustomerType.INDIVIDUAL,
          status: CustomerStatus.ACTIVE,
        },
      });

      // 创建多个案件
      await prisma.case.create({
        data: {
          case_number: 'CASE-RELATION-1',
          title: 'Relation Case 1',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      await prisma.case.create({
        data: {
          case_number: 'CASE-RELATION-2',
          title: 'Relation Case 2',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      // 验证关系
      const customerWithCases = await prisma.customer.findUnique({
        where: { id: customer.id },
        include: { cases: true },
      });

      expect(customerWithCases?.cases).toHaveLength(2);
    });

    it('should establish case-contract one-to-many relationship', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'contractuser@example.com',
          username: 'contractuser',
          password_hash: 'hashedpassword',
          first_name: 'Contract',
          last_name: 'User',
          status: UserStatus.ACTIVE,
        },
      });

      const customer = await prisma.customer.create({
        data: {
          name: 'Contract Customer',
          type: CustomerType.INDIVIDUAL,
          status: CustomerStatus.ACTIVE,
        },
      });

      const case_ = await prisma.case.create({
        data: {
          case_number: 'CASE-CONTRACT',
          title: 'Contract Case',
          customer_id: customer.id,
          type: CaseType.CIVIL,
          status: CaseStatus.OPEN,
          priority: CasePriority.MEDIUM,
          created_by: user.id,
        },
      });

      // 创建多个合同
      await prisma.contract.create({
        data: {
          contract_number: 'CONTRACT-RELATION-1',
          title: 'Relation Contract 1',
          customer_id: customer.id,
          case_id: case_.id,
          type: ContractType.FIXED_FEE,
          status: ContractStatus.ACTIVE,
          amount: 5000,
          created_by: user.id,
        },
      });

      await prisma.contract.create({
        data: {
          contract_number: 'CONTRACT-RELATION-2',
          title: 'Relation Contract 2',
          customer_id: customer.id,
          case_id: case_.id,
          type: ContractType.FIXED_FEE,
          status: ContractStatus.ACTIVE,
          amount: 3000,
          created_by: user.id,
        },
      });

      // 验证关系
      const caseWithContracts = await prisma.case.findUnique({
        where: { id: case_.id },
        include: { contracts: true },
      });

      expect(caseWithContracts?.contracts).toHaveLength(2);
    });
  });

  describe('Database Constraints and Indexes', () => {
    it('should enforce foreign key constraints', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'constraintuser@example.com',
          username: 'constraintuser',
          password_hash: 'hashedpassword',
          first_name: 'Constraint',
          last_name: 'User',
          status: UserStatus.ACTIVE,
        },
      });

      // 尝试创建具有无效外键的案件
      await expect(
        prisma.case.create({
          data: {
            case_number: 'CASE-CONSTRAINT',
            title: 'Constraint Case',
            customer_id: 'invalid-customer-id',
            type: CaseType.CIVIL,
            status: CaseStatus.OPEN,
            priority: CasePriority.MEDIUM,
            created_by: user.id,
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
            // 缺少 username, password_hash, first_name, last_name
          },
        })
      ).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'enumuser@example.com',
          username: 'enumuser',
          password_hash: 'hashedpassword',
          first_name: 'Enum',
          last_name: 'User',
          status: UserStatus.ACTIVE,
        },
      });

      // 尝试使用无效的枚举值
      await expect(
        prisma.user.create({
          data: {
            email: 'enumuser2@example.com',
            username: 'enumuser2',
            password_hash: 'hashedpassword',
            first_name: 'Enum2',
            last_name: 'User2',
            status: 'INVALID_STATUS' as any, // 强制转换无效值
          },
        })
      ).rejects.toThrow();
    });
  });
});
