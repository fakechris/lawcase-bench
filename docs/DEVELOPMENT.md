# 开发文档

## 目录

- [环境设置](#环境设置)
- [项目架构](#项目架构)
- [开发流程](#开发流程)
- [测试指南](#测试指南)
- [部署指南](#部署指南)
- [故障排除](#故障排除)

## 环境设置

### 前置要求

确保您的开发环境满足以下要求：

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0
- **Docker**: >= 20.0.0
- **Git**: >= 2.0.0

### 安装步骤

1. **安装 Node.js 和 pnpm**

```bash
# 使用 nvm 安装 Node.js
nvm install 18
nvm use 18

# 安装 pnpm
npm install -g pnpm
```

2. **克隆项目**

```bash
git clone https://github.com/fakechris/lawcase-bench.git
cd lawcase-bench
```

3. **安装依赖**

```bash
pnpm install
```

4. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lawcase_bench

# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 应用配置
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
```

5. **启动数据库**

```bash
# 使用 Docker 启动数据库
docker-compose up -d postgres redis

# 或者使用本地安装的数据库
# 确保 PostgreSQL 和 Redis 服务正在运行
```

6. **初始化数据库**

```bash
# 生成 Prisma 客户端
pnpm --filter lawcase-bench-api db:generate

# 运行数据库迁移
pnpm --filter lawcase-bench-api db:migrate
```

7. **启动开发服务器**

```bash
# 启动所有服务
pnpm dev

# 或者分别启动
pnpm dev:web    # 前端 (http://localhost:3000)
pnpm dev:api    # 后端 (http://localhost:3001)
```

## 项目架构

### Monorepo 结构

项目采用 pnpm workspace 进行 Monorepo 管理：

```
lawcase-bench/
├── apps/
│   ├── web/          # Next.js 前端应用
│   └── api/          # Node.js 后端 API
├── packages/
│   └── shared/       # 共享代码库
├── database/         # 数据库脚本
├── docker/           # Docker 配置
└── docs/             # 项目文档
```

### 前端架构 (Next.js)

```
apps/web/
├── src/
│   ├── app/                    # App Router
│   │   ├── (auth)/            # 认证相关页面
│   │   ├── dashboard/         # 仪表板页面
│   │   ├── clients/           # 客户管理页面
│   │   ├── cases/             # 案件管理页面
│   │   └── settings/          # 设置页面
│   ├── components/             # React 组件
│   │   ├── ui/                # UI 基础组件
│   │   ├── forms/             # 表单组件
│   │   └── layout/            # 布局组件
│   ├── lib/                   # 工具函数
│   │   ├── utils/             # 通用工具
│   │   ├── api/               # API 客户端
│   │   └── validations/       # 验证规则
│   └── types/                 # TypeScript 类型
├── public/                    # 静态资源
└── tailwind.config.js         # Tailwind 配置
```

### 后端架构 (Express)

```
apps/api/
├── src/
│   ├── controllers/           # 控制器
│   │   ├── auth.controller.ts
│   │   ├── client.controller.ts
│   │   └── case.controller.ts
│   ├── middleware/            # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/                # 路由
│   │   ├── auth.routes.ts
│   │   ├── client.routes.ts
│   │   └── case.routes.ts
│   ├── services/              # 业务逻辑
│   │   ├── auth.service.ts
│   │   ├── client.service.ts
│   │   └── case.service.ts
│   ├── utils/                 # 工具函数
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── jwt.ts
│   └── types/                 # TypeScript 类型
├── prisma/                    # Prisma 配置
└── tests/                     # 测试文件
```

### 共享代码库

```
packages/shared/
├── src/
│   ├── types/                 # 共享类型
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   └── case.ts
│   ├── utils/                 # 共享工具
│   │   ├── validation.ts
│   │   └── formatting.ts
│   └── constants/             # 常量定义
│       ├── auth.ts
│       └── pagination.ts
```

## 开发流程

### 1. 创建新功能

1. **创建功能分支**

```bash
git checkout -b feature/feature-name
```

2. **开发功能**

```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 检查代码质量
pnpm lint
pnpm format:check
```

3. **提交代码**

```bash
# 添加文件
git add .

# 提交代码（遵循 Conventional Commits）
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/feature-name
```

4. **创建 Pull Request**

- 在 GitHub 上创建 PR
- 确保 CI 检查通过
- 请求代码审查

### 2. 数据库变更

1. **创建迁移文件**

```bash
pnpm --filter lawcase-bench-api db:migrate:dev --name migration_name
```

2. **编辑迁移文件**

在 `packages/shared/prisma/migrations/` 目录下编辑生成的迁移文件。

3. **应用迁移**

```bash
pnpm --filter lawcase-bench-api db:migrate
```

4. **更新 Prisma 客户端**

```bash
pnpm --filter lawcase-bench-api db:generate
```

### 3. 添加新依赖

1. **安装依赖**

```bash
# 安装到特定应用
pnpm --filter lawcase-bench-web add package-name
pnpm --filter lawcase-bench-api add package-name

# 安装到共享库
pnpm --filter lawcase-bench-shared add package-name

# 安装开发依赖
pnpm --filter lawcase-bench-web add -D package-name
```

2. **更新类型定义**

```bash
pnpm --filter lawcase-bench-web add -D @types/package-name
```

## 测试指南

### 单元测试

```bash
# 运行所有单元测试
pnpm test:unit

# 运行特定应用的单元测试
pnpm --filter lawcase-bench-web test:unit
pnpm --filter lawcase-bench-api test:unit

# 监听模式
pnpm --filter lawcase-bench-api test:unit:watch
```

### 集成测试

```bash
# 运行所有集成测试
pnpm test:integration

# 运行特定应用的集成测试
pnpm --filter lawcase-bench-api test:integration
```

### 端到端测试

```bash
# 运行 E2E 测试
pnpm test:e2e
```

### 测试覆盖率

```bash
# 生成覆盖率报告
pnpm test:coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

## 部署指南

### 本地部署

1. **使用 Docker Compose**

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up

# 生产环境
docker-compose up -d
```

2. **手动部署**

```bash
# 构建应用
pnpm build

# 启动服务
pnpm --filter lawcase-bench-api start
pnpm --filter lawcase-bench-web start
```

### 生产环境部署

1. **构建 Docker 镜像**

```bash
# 构建镜像
docker build -t lawcase-bench .

# 推送到镜像仓库
docker tag lawcase-bench ghcr.io/fakechris/lawcase-bench:latest
docker push ghcr.io/fakechris/lawcase-bench:latest
```

2. **使用 Docker Compose 部署**

```bash
# 在生产服务器上
git clone https://github.com/fakechris/lawcase-bench.git
cd lawcase-bench

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动服务
docker-compose up -d
```

3. **使用 Kubernetes 部署**

```bash
# 应用 Kubernetes 配置
kubectl apply -f k8s/
```

## 故障排除

### 常见问题

1. **依赖安装失败**

```bash
# 清理缓存
pnpm store prune

# 重新安装
rm -rf node_modules
pnpm install
```

2. **数据库连接失败**

```bash
# 检查数据库服务状态
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

3. **端口占用**

```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

4. **TypeScript 错误**

```bash
# 清理 TypeScript 缓存
rm -rf .next
rm -rf dist

# 重新构建
pnpm build
```

### 调试技巧

1. **启用调试模式**

```bash
# 设置调试环境变量
export DEBUG=lawcase-bench:*

# 启动应用
pnpm dev
```

2. **查看日志**

```bash
# 查看应用日志
docker-compose logs -f web
docker-compose logs -f api

# 查看数据库日志
docker-compose logs -f postgres
```

3. **数据库调试**

```bash
# 使用 Prisma Studio
pnpm --filter lawcase-bench-api db:studio

# 连接到数据库
psql $DATABASE_URL
```

## 性能优化

### 前端优化

1. **代码分割**

```javascript
// 使用动态导入
const Component = dynamic(() => import('./Component'), {
  loading: () => <Loading />,
});
```

2. **图片优化**

```javascript
// 使用 Next.js Image 组件
import Image from 'next/image';

<Image src="/image.jpg" alt="Description" width={500} height={300} />;
```

3. **缓存策略**

```javascript
// 使用 SWR 进行数据获取
import useSWR from 'swr';

const { data, error } = useSWR('/api/data', fetcher);
```

### 后端优化

1. **数据库优化**

```typescript
// 使用索引
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())

  @@index([email])
}
```

2. **缓存优化**

```typescript
// 使用 Redis 缓存
import { redis } from './lib/redis';

const cachedData = await redis.get('key');
if (!cachedData) {
  const data = await fetchData();
  await redis.set('key', JSON.stringify(data), 'EX', 3600);
}
```

3. **API 优化**

```typescript
// 使用分页
app.get('/api/clients', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const clients = await prisma.client.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json(clients);
});
```

## 安全最佳实践

### 认证和授权

1. **使用 JWT**

```typescript
import { sign, verify } from 'jsonwebtoken';

// 生成 JWT
const token = sign(payload, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});

// 验证 JWT
const decoded = verify(token, process.env.JWT_SECRET);
```

2. **密码哈希**

```typescript
import bcrypt from 'bcrypt';

// 哈希密码
const hashedPassword = await bcrypt.hash(password, 10);

// 验证密码
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 数据验证

1. **使用 Zod 验证**

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const validatedData = createUserSchema.parse(req.body);
```

### 安全头部

```typescript
// 使用 Helmet
import helmet from 'helmet';

app.use(helmet());
```

## 监控和日志

### 应用监控

1. **使用 Winston 日志**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

2. **错误监控**

```typescript
// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### 性能监控

```typescript
// 使用 APM 工具
import apm from 'elastic-apm-node';

apm.start({
  serviceName: 'lawcase-bench-api',
  serverUrl: process.env.APM_SERVER_URL,
});
```

---

这份开发文档涵盖了项目的各个方面。如果您有任何问题或需要进一步的说明，请随时联系开发团队。
