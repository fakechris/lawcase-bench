import { PrismaClient } from '@prisma/client';

// 全局测试设置
const prisma = new PrismaClient();

beforeAll(async () => {
  // 在所有测试开始前连接数据库
  await prisma.$connect();
  console.log('数据库连接已建立');
});

afterAll(async () => {
  // 在所有测试结束后断开数据库连接
  await prisma.$disconnect();
  console.log('数据库连接已断开');
});

// 设置测试超时时间
jest.setTimeout(30000);

// 全局变量，用于测试中访问
global.prisma = prisma;
