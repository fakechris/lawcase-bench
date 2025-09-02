# 认证授权系统

## 概述

本系统实现了完整的用户认证和基于角色的权限控制（RBAC）功能，包括JWT认证、双因子认证（2FA）、密码安全等特性。

## 技术特性

### 🔐 认证功能
- **用户注册/登录/登出**
- **JWT + Refresh Token机制**
  - Access Token: 15分钟有效期
  - Refresh Token: 7天有效期
  - Token黑名单机制
- **双因子认证（2FA）**
  - TOTP（基于时间的一次性密码）
  - QR码生成
  - 备用码支持
- **密码安全**
  - bcrypt加密（12轮salt）
  - 密码强度验证
  - 密码重置流程

### 👥 角色权限系统
- **预定义角色**
  - Admin: 系统管理员
  - Manager: 办公室经理
  - Lawyer: 律师
  - Sales: 销售人员
  - Finance: 财务人员
  - Marketer: 市场人员
- **权限管理**
  - CRUD操作权限
  - 资源级权限控制
  - 中间件权限验证

## API端点

### 公开端点
```bash
POST /api/auth/register          # 用户注册
POST /api/auth/login             # 用户登录
POST /api/auth/refresh           # 刷新令牌
POST /api/auth/password/reset-request    # 请求密码重置
POST /api/auth/password/reset-confirm   # 确认密码重置
```

### 认证端点
```bash
POST /api/auth/logout            # 用户登出
GET  /api/auth/profile           # 获取用户信息
POST /api/auth/change-password   # 修改密码
POST /api/auth/2fa/setup         # 设置2FA
POST /api/auth/2fa/enable        # 启用2FA
POST /api/auth/2fa/disable       # 禁用2FA
```

## 快速开始

### 1. 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和邮件设置
```

### 2. 数据库设置
```bash
# 生成Prisma客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# 运行数据库种子
npm run db:seed

# 或一次性设置
npm run db:setup
```

### 3. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 使用示例

### 用户注册
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 用户登录
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "TestPassword123!"
  }'
```

### 刷新令牌
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

### 设置2FA
```bash
curl -X POST http://localhost:3001/api/auth/2fa/setup \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "TestPassword123!"
  }'
```

## 中间件使用

### 认证中间件
```typescript
import { AuthMiddleware } from '../middleware/auth.js';

// 需要认证的路由
router.get('/protected', AuthMiddleware.authenticate, (req, res) => {
  res.json({ message: 'Protected route' });
});
```

### 权限中间件
```typescript
// 需要特定权限
router.get('/admin', 
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('system:admin'),
  (req, res) => {
    res.json({ message: 'Admin route' });
  }
);

// 需要特定角色
router.get('/manager', 
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('Manager'),
  (req, res) => {
    res.json({ message: 'Manager route' });
  }
);

// 需要任一角色
router.get('/staff', 
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAnyRole(['Lawyer', 'Sales', 'Finance']),
  (req, res) => {
    res.json({ message: 'Staff route' });
  }
);
```

## 安全特性

### 密码安全
- 最小8位，最大128位
- 必须包含大小写字母、数字、特殊字符
- bcrypt加密（12轮salt）

### JWT安全
- HS256算法
- Token黑名单机制
- 自动过期处理

### 2FA安全
- TOTP算法
- 30秒时间窗口
- 备用码支持

### 请求安全
- Helmet安全头
- CORS配置
- 输入验证
- 错误处理

## 数据库模型

### 用户表 (users)
```sql
- id: UUID (主键)
- email: VARCHAR (唯一)
- username: VARCHAR (唯一)
- password: VARCHAR (bcrypt加密)
- firstName: VARCHAR
- lastName: VARCHAR
- isActive: BOOLEAN (默认true)
- isVerified: BOOLEAN (默认false)
- twoFactorEnabled: BOOLEAN (默认false)
- twoFactorSecret: VARCHAR (可选)
- backupCodes: TEXT[] (备用码数组)
- lastLoginAt: TIMESTAMP
- roleId: UUID (外键)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### 角色表 (roles)
```sql
- id: UUID (主键)
- name: VARCHAR (唯一)
- description: TEXT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### 权限表 (permissions)
```sql
- id: UUID (主键)
- name: VARCHAR (唯一)
- resource: VARCHAR
- action: VARCHAR
- description: TEXT
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

## 测试

运行测试：
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成测试覆盖率报告
npm run test:coverage
```

## 部署注意事项

### 环境变量
```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT密钥（生产环境必须使用强密钥）
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 安全建议
1. 使用强密码和JWT密钥
2. 配置HTTPS
3. 启用CORS限制
4. 定期更新依赖
5. 监控异常登录
6. 实施速率限制

## 故障排除

### 常见问题
1. **数据库连接失败**: 检查DATABASE_URL配置
2. **JWT验证失败**: 检查JWT密钥配置
3. **邮件发送失败**: 检查SMTP配置
4. **2FA验证失败**: 检查系统时间同步

### 日志查看
```bash
# 查看应用日志
npm run dev

# 查看数据库日志
npm run db:studio
```

## 贡献指南

1. 遵循代码风格指南
2. 编写测试用例
3. 更新文档
4. 提交前运行lint和测试
5. 使用语义化提交消息

## 许可证

本项目采用MIT许可证。