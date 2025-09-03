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
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
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
  data: any;
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
  expectedException?: any;
}

export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed?: Date;
  errorRate: number;
}
