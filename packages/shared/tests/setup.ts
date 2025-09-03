import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Skip database tests for now
beforeAll(() => {
  console.log('Skipping database connection for unit tests');
});

// 设置测试超时时间
jest.setTimeout(30000);
