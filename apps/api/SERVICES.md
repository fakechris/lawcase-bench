# 第三方服务集成文档

## 概述

本模块为律师事务所CRM系统提供了完整的外部服务集成框架，支持电话、短信、邮件和文件存储等多种第三方服务。系统采用模块化设计，支持多种服务提供商，并提供统一的接口和错误处理机制。

## 架构设计

### 核心组件

1. **BaseService**: 抽象基类，提供通用的服务功能（重试、断路器、指标收集）
2. **ServiceConfigManager**: 配置管理器，处理所有服务的配置
3. **ServiceManager**: 服务管理器，统一管理所有服务实例
4. **WebhookManager**: Webhook管理器，处理外部服务的回调

### 支持的服务

- **电话服务**: Twilio
- **短信服务**: Twilio
- **邮件服务**: SendGrid
- **文件存储**: AWS S3

## 配置说明

### 环境变量配置

所有服务配置通过环境变量管理，参考 `.env.example` 文件。

### 服务启用/禁用

```typescript
// 启用服务
serviceManager.enableService('phone');

// 禁用服务
serviceManager.disableService('phone');
```

## 使用方法

### 1. 电话服务 (Twilio)

```typescript
import { serviceManager } from './services/service-manager.js';

const phoneService = serviceManager.getPhoneService();

// 拨打电话
const call = await phoneService.makeCall(
  '+1234567890', // 目标号码
  '+0987654321', // 来源号码
  {
    record: true,
    transcribe: true,
    statusCallbackUrl: 'https://your-callback-url.com/call-status',
  }
);

// 获取通话信息
const callInfo = await phoneService.getCallInfo(call.callId);

// 结束通话
await phoneService.endCall(call.callId);

// 开始录音
await phoneService.startRecording(call.callId);

// 创建会议电话
const conference = await phoneService.makeConferenceCall(['+1234567890', '+0987654321'], {
  name: '团队会议',
  record: true,
});
```

### 2. 短信服务 (Twilio)

```typescript
import { serviceManager } from './services/service-manager.js';

const smsService = serviceManager.getSMSService();

// 发送短信
const sms = await smsService.sendSMS('+1234567890', '您的验证码是: 123456', {
  from: '+0987654321',
  priority: 'high',
  callbackUrl: 'https://your-callback-url.com/sms-status',
});

// 批量发送短信
const bulkResult = await smsService.sendBulkSMS(['+1234567890', '+0987654321'], '群发消息内容', {
  batchSize: 50,
  delayBetweenBatches: 1000,
});

// 获取短信状态
const status = await smsService.getSMSStatus(sms.messageId);

// 验证电话号码
const validation = await smsService.validatePhoneNumber('+1234567890');
```

### 3. 邮件服务 (SendGrid)

```typescript
import { serviceManager } from './services/service-manager.js';

const emailService = serviceManager.getEmailService();

// 发送邮件
const email = await emailService.sendEmail(
  'recipient@example.com',
  '邮件主题',
  {
    html: '<h1>HTML内容</h1>',
    text: '纯文本内容',
  },
  {
    attachments: [
      {
        filename: 'document.pdf',
        content: Buffer.from('文件内容'),
        contentType: 'application/pdf',
      },
    ],
    tracking: {
      opens: true,
      clicks: true,
      unsubscribe: true,
    },
  }
);

// 使用模板发送邮件
const templateEmail = await emailService.sendTemplate('recipient@example.com', 'template_id', {
  name: '用户名',
  verification_code: '123456',
});

// 批量发送邮件
const bulkEmail = await emailService.sendBulkEmail(
  [
    { email: 'user1@example.com', name: '用户1' },
    { email: 'user2@example.com', name: '用户2' },
  ],
  {
    html: '<h1>群发邮件</h1>',
    text: '群发邮件内容',
  }
);

// 验证邮箱地址
const emailValidation = await emailService.validateEmail('test@example.com');
```

### 4. 文件存储服务 (AWS S3)

```typescript
import { serviceManager } from './services/service-manager.js';

const storageService = serviceManager.getFileStorageService();

// 上传文件
const uploadResult = await storageService.uploadFile(
  {
    name: 'document.pdf',
    content: Buffer.from('文件内容'),
    contentType: 'application/pdf',
    metadata: {
      description: '重要文档',
      category: 'legal',
    },
  },
  {
    path: 'documents/legal/',
    publicAccess: true,
    tags: ['legal', 'important'],
  }
);

// 下载文件
const fileBuffer = await storageService.downloadFile(uploadResult.fileId);

// 获取文件信息
const fileInfo = await storageService.getFileInfo(uploadResult.fileId);

// 列出文件
const files = await storageService.listFiles({
  path: 'documents/legal/',
  limit: 100,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

// 创建文件夹
const folder = await storageService.createFolder('documents/new-case/');

// 生成预签名URL
const presignedUrl = await storageService.generatePresignedUrl(
  'upload',
  'documents/new-file.pdf',
  3600 // 1小时有效期
);
```

## Webhook 处理

### 配置Webhook

所有服务都支持Webhook回调，需要在相应的服务提供商后台配置回调URL：

```
https://your-api-domain.com/api/services/webhook/{service}
```

### 支持的Webhook事件

#### Twilio (电话)

- `call.initiated` - 通话发起
- `call.ringing` - 通话响铃
- `call.answered` - 通话接听
- `call.completed` - 通话完成
- `call.failed` - 通话失败
- `recording.completed` - 录音完成

#### Twilio (短信)

- `sms.sent` - 短信已发送
- `sms.delivered` - 短信已送达
- `sms.failed` - 短信发送失败

#### SendGrid (邮件)

- `delivered` - 邮件已送达
- `open` - 邮件已打开
- `click` - 邮件链接已点击
- `bounce` - 邮件被退回
- `spamreport` - 垃圾邮件举报
- `unsubscribe` - 用户取消订阅

#### AWS S3 (文件存储)

- `s3:ObjectCreated:Put` - 文件创建
- `s3:ObjectRemoved:Delete` - 文件删除
- `s3:ObjectAccessed:Get` - 文件访问

## 错误处理和重试机制

### 自动重试

所有服务都内置了自动重试机制：

```typescript
// 重试配置
const retryConfig = {
  maxAttempts: 3, // 最大重试次数
  baseDelay: 1000, // 基础延迟时间
  maxDelay: 30000, // 最大延迟时间
  backoffFactor: 2, // 退避因子
  retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT', 'SERVER_ERROR'],
};
```

### 断路器模式

当服务连续失败达到阈值时，断路器会自动打开，防止继续调用失败的服务：

```typescript
// 断路器配置
const circuitBreakerConfig = {
  failureThreshold: 5, // 失败阈值
  recoveryTimeout: 60000, // 恢复超时时间
  expectedException: Error, // 预期异常类型
};
```

## 指标监控

### 服务指标

每个服务都收集详细的运行指标：

```typescript
const metrics = serviceManager.getServiceMetrics();

// 电话服务指标
console.log(metrics.phone);
// {
//   totalRequests: 100,
//   successfulRequests: 95,
//   failedRequests: 5,
//   averageResponseTime: 1200,
//   errorRate: 0.05,
//   lastUsed: 2024-01-01T10:00:00.000Z
// }
```

### 服务状态

```typescript
const status = serviceManager.getServiceStatus();

console.log(status.phone);
// {
//   enabled: true,
//   available: true,
//   provider: 'twilio'
// }
```

## API 接口

### 服务管理接口

```bash
# 获取服务状态
GET /api/services/status

# 获取服务指标
GET /api/services/metrics

# 重置指标
POST /api/services/metrics/reset

# 重新初始化服务
POST /api/services/reinitialize

# 验证所有服务
GET /api/services/validate
```

### 电话服务接口

```bash
# 拨打电话
POST /api/services/phone/call
{
  "to": "+1234567890",
  "from": "+0987654321",
  "options": {
    "record": true
  }
}

# 获取通话信息
GET /api/services/phone/call/{callId}
```

### 短信服务接口

```bash
# 发送短信
POST /api/services/sms/send
{
  "to": "+1234567890",
  "message": "短信内容",
  "options": {
    "from": "+0987654321"
  }
}

# 获取短信状态
GET /api/services/sms/{messageId}
```

### 邮件服务接口

```bash
# 发送邮件
POST /api/services/email/send
{
  "to": "recipient@example.com",
  "subject": "邮件主题",
  "content": {
    "html": "<h1>HTML内容</h1>",
    "text": "纯文本内容"
  },
  "options": {
    "tracking": {
      "opens": true,
      "clicks": true
    }
  }
}
```

### 文件存储接口

```bash
# 上传文件
POST /api/services/storage/upload
{
  "name": "document.pdf",
  "content": "base64编码的文件内容",
  "contentType": "application/pdf",
  "options": {
    "path": "documents/",
    "publicAccess": true
  }
}

# 获取文件信息
GET /api/services/storage/{fileId}

# 下载文件
GET /api/services/storage/{fileId}/download
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行服务集成测试
npm run test:unit

# 运行覆盖率测试
npm run test:coverage
```

### 测试配置

测试环境使用模拟的配置值，不需要真实的API密钥。

## 最佳实践

### 1. 错误处理

```typescript
try {
  const result = await service.makeCall(to, from, options);
  // 处理成功结果
} catch (error) {
  // 处理错误
  console.error('通话失败:', error);

  // 检查服务可用性
  const status = serviceManager.getServiceStatus();
  if (!status.phone.available) {
    // 服务不可用时的处理逻辑
  }
}
```

### 2. 批量操作

```typescript
// 批量发送短信
const batchSize = 50;
const recipients = ['+1234567890', '+0987654321' /* ... */];

for (let i = 0; i < recipients.length; i += batchSize) {
  const batch = recipients.slice(i, i + batchSize);
  await smsService.sendBulkSMS(batch, message);

  // 批次间延迟，避免触发速率限制
  if (i + batchSize < recipients.length) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```

### 3. 配置管理

```typescript
// 动态更新配置
serviceManager.updateServiceConfig('phone', {
  timeout: 60000,
  retryAttempts: 5,
});

// 实时检查服务状态
const status = serviceManager.getServiceStatus();
if (!status.phone.available) {
  // 切换到备用服务或显示错误消息
}
```

### 4. 监控和告警

```typescript
// 定期检查服务指标
setInterval(() => {
  const metrics = serviceManager.getServiceMetrics();

  // 检查错误率
  if (metrics.phone.errorRate > 0.1) {
    console.warn('电话服务错误率过高:', metrics.phone.errorRate);
    // 发送告警通知
  }

  // 检查响应时间
  if (metrics.phone.averageResponseTime > 5000) {
    console.warn('电话服务响应时间过长:', metrics.phone.averageResponseTime);
  }
}, 60000); // 每分钟检查一次
```

## 故障排除

### 常见问题

1. **服务无法初始化**
   - 检查环境变量配置
   - 验证API密钥是否正确
   - 确认网络连接正常

2. **API调用失败**
   - 检查服务配额限制
   - 验证请求参数格式
   - 查看错误日志详情

3. **Webhook不工作**
   - 确认回调URL可访问
   - 验证webhook密钥配置
   - 检查防火墙设置

### 调试模式

```typescript
// 启用详细日志
process.env.DEBUG = 'services:*';

// 获取详细的错误信息
try {
  await service.makeCall(to, from, options);
} catch (error) {
  console.error('详细错误信息:', {
    code: error.code,
    message: error.message,
    stack: error.stack,
    response: error.response?.data,
  });
}
```

## 扩展开发

### 添加新的服务提供商

1. 创建新的服务类，继承自 `BaseService`
2. 实现相应的服务接口
3. 更新配置管理器
4. 添加相应的类型定义

### 示例：添加新的邮件服务提供商

```typescript
import { BaseService } from './base.service.js';
import { EmailServiceInterface } from '../types/email.js';

export class CustomEmailService extends BaseService implements EmailServiceInterface {
  async sendEmail(
    to: string,
    subject: string,
    content: EmailContent,
    options?: EmailOptions
  ): Promise<EmailResponse> {
    // 实现自定义邮件服务逻辑
  }

  async testConnection(): Promise<ServiceResponse<boolean>> {
    // 实现连接测试逻辑
  }

  // 其他必要方法的实现...
}
```

## 安全考虑

### 1. API密钥管理

- 使用环境变量存储敏感信息
- 定期轮换API密钥
- 使用最小权限原则

### 2. Webhook安全

- 验证webhook签名
- 使用HTTPS协议
- 限制访问来源IP

### 3. 数据安全

- 加密敏感数据
- 使用安全的文件存储
- 实施访问控制

## 性能优化

### 1. 连接池管理

- 重用HTTP连接
- 配置适当的连接池大小
- 实现连接超时处理

### 2. 缓存策略

- 缓存频繁访问的数据
- 实现缓存失效机制
- 使用内存缓存或Redis

### 3. 批量操作

- 合并多个请求
- 使用异步并发处理
- 实现速率限制

## 版本兼容性

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Express >= 4.18.0

## 许可证

本项目采用 MIT 许可证。
