# LawCase Bench - 律师事务所CRM系统

[![CI Pipeline](https://github.com/fakechris/lawcase-bench/actions/workflows/ci.yml/badge.svg)](https://github.com/fakechris/lawcase-bench/actions/workflows/ci.yml)
[![Docker Build](https://github.com/fakechris/lawcase-bench/actions/workflows/docker.yml/badge.svg)](https://github.com/fakechris/lawcase-bench/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.15.0-blue.svg)](https://pnpm.io/)

一个现代化的律师事务所客户关系管理（CRM）系统，基于 Next.js + Node.js + TypeScript 构建。

## 🌟 功能特性

- 🏢 **客户管理** - 完整的客户信息管理和跟踪
- 📋 **案件管理** - 案件进度跟踪和文档管理
- 📅 **日程安排** - 律师日程和案件重要日期管理
- 💰 **财务管理** - 费用跟踪和账单管理
- 📊 **报表分析** - 业务数据统计和分析
- 🔐 **权限管理** - 基于角色的访问控制
- 🌐 **响应式设计** - 支持桌面端和移动端
- 🚀 **高性能** - 现代化技术栈，优秀的性能表现

## 🛠️ 技术栈

### 前端

- **框架**: Next.js 14 + React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Context + Zustand
- **表单**: React Hook Form + Zod
- **测试**: Jest + Testing Library

### 后端

- **框架**: Node.js + Express
- **语言**: TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **缓存**: Redis
- **认证**: JWT + bcrypt
- **验证**: Zod
- **测试**: Jest + Supertest

### 开发工具

- **包管理**: pnpm
- **代码质量**: ESLint + Prettier
- **类型检查**: TypeScript
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15.0
- Redis >= 7.0

### 安装依赖

```bash
# 安装 pnpm
npm install -g pnpm

# 克隆项目
git clone https://github.com/fakechris/lawcase-bench.git
cd lawcase-bench

# 安装依赖
pnpm install
```

### 环境配置

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 配置环境变量：

```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/lawcase_bench

# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 应用配置
PORT=3001
NODE_ENV=development
```

### 数据库设置

```bash
# 使用 Docker 启动数据库
docker-compose up -d postgres redis

# 运行数据库迁移
pnpm --filter lawcase-bench-api db:migrate

# 生成 Prisma 客户端
pnpm --filter lawcase-bench-api db:generate
```

### 启动开发服务器

```bash
# 启动所有服务
pnpm dev

# 或者分别启动
pnpm dev:web    # 前端 (http://localhost:3000)
pnpm dev:api    # 后端 (http://localhost:3001)
```

### 使用 Docker

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up

# 生产环境
docker-compose up
```

## 📁 项目结构

```
lawcase-bench/
├── apps/
│   ├── web/              # Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/      # App Router 页面
│   │   │   ├── components/ # React 组件
│   │   │   ├── lib/      # 工具函数
│   │   │   └── types/    # TypeScript 类型
│   │   └── package.json
│   └── api/              # Node.js 后端 API
│       ├── src/
│       │   ├── controllers/ # 控制器
│       │   ├── middleware/  # 中间件
│       │   ├── routes/     # 路由
│       │   ├── services/   # 业务逻辑
│       │   └── utils/      # 工具函数
│       └── package.json
├── packages/
│   └── shared/           # 共享代码库
│       ├── src/
│       │   ├── types/    # 共享类型
│       │   ├── utils/    # 共享工具
│       │   └── constants/ # 常量定义
│       └── package.json
├── database/             # 数据库脚本
├── docker/               # Docker 配置
├── .github/              # GitHub Actions
└── docs/                 # 项目文档
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 查看测试覆盖率
pnpm test:coverage
```

## 🏗️ 构建

```bash
# 构建所有应用
pnpm build

# 构建特定应用
pnpm --filter lawcase-bench-web build
pnpm --filter lawcase-bench-api build
```

## 🚀 部署

### 使用 Docker

```bash
# 构建镜像
docker build -t lawcase-bench .

# 运行容器
docker run -p 3000:3000 -p 3001:3001 lawcase-bench
```

### 使用 Docker Compose

```bash
# 生产环境
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 📚 开发指南

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 的代码规范
- 编写单元测试和集成测试
- 使用 Git Hooks 进行代码检查

### 提交规范

使用 Conventional Commits 规范：

```bash
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或依赖管理
```

### 分支策略

- `main`: 主分支，生产环境
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Express.js](https://expressjs.com/) - Node.js 框架
- [Prisma](https://prisma.io/) - 现代 ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [pnpm](https://pnpm.io/) - 包管理器

## 📞 联系我们

- 📧 Email: support@lawcasebench.com
- 🌐 Website: https://lawcasebench.com
- 🐛 Issues: [GitHub Issues](https://github.com/fakechris/lawcase-bench/issues)

---

⭐ 如果这个项目对您有帮助，请考虑给我们一个 star！
