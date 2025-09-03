export interface ServiceConfig {
  name: string;
  provider: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  webhookSecret?: string;
  environment?: 'development' | 'production' | 'test';
  accountSid?: string;
  fromNumber?: string;
  senderId?: string;
}

export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    duration: number;
    attempts: number;
  };
}

export interface WebhookPayload {
  id: string;
  event: string;
  data: unknown;
  timestamp: Date;
  signature?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedException?: unknown;
}

export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed?: Date;
  errorRate: number;
}
