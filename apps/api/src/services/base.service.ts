import { v4 as uuidv4 } from 'uuid';

import {
  ServiceConfig,
  ServiceResponse,
  RetryConfig,
  CircuitBreakerConfig,
  ServiceMetrics,
} from '../types/services.js';

export abstract class BaseService {
  protected config: ServiceConfig;
  protected retryConfig: RetryConfig;
  protected circuitBreakerConfig: CircuitBreakerConfig;
  protected metrics: ServiceMetrics;
  protected circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  protected failureCount = 0;
  protected lastFailureTime = 0;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.retryConfig = {
      maxAttempts: config.retryAttempts || 3,
      baseDelay: config.retryDelay || 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT', 'SERVER_ERROR'],
    };
    this.circuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      expectedException: Error,
    };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();
    let attempts = 0;
    let lastError: any;

    for (attempts = 0; attempts < this.retryConfig.maxAttempts; attempts++) {
      try {
        // Check circuit breaker
        if (this.circuitState === 'OPEN') {
          if (Date.now() - this.lastFailureTime < this.circuitBreakerConfig.recoveryTimeout) {
            return {
              success: false,
              error: {
                code: 'CIRCUIT_BREAKER_OPEN',
                message: 'Service temporarily unavailable due to high failure rate',
              },
              metadata: {
                requestId,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                attempts,
              },
            };
          } else {
            this.circuitState = 'HALF_OPEN';
          }
        }

        const result = await operation();
        const duration = Date.now() - startTime;

        // Update metrics
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.metrics.averageResponseTime =
          (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) /
          this.metrics.totalRequests;
        this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
        this.metrics.lastUsed = new Date();

        // Reset circuit breaker on success
        if (this.circuitState === 'HALF_OPEN') {
          this.circuitState = 'CLOSED';
          this.failureCount = 0;
        }

        return {
          success: true,
          data: result,
          metadata: {
            requestId,
            timestamp: new Date(),
            duration,
            attempts: attempts + 1,
          },
        };
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        attempts++;

        // Update metrics
        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
        this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;

        // Update circuit breaker
        this.failureCount++;
        if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
          this.circuitState = 'OPEN';
          this.lastFailureTime = Date.now();
        }

        // Log error
        this.logError(operationName, error, attempts);

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempts === this.retryConfig.maxAttempts) {
          return {
            success: false,
            error: {
              code: this.getErrorCode(error),
              message: this.getErrorMessage(error),
              details: this.getErrorDetails(error),
            },
            metadata: {
              requestId,
              timestamp: new Date(),
              duration,
              attempts,
            },
          };
        }

        // Wait before retry
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempts - 1),
          this.retryConfig.maxDelay
        );
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: {
        code: this.getErrorCode(lastError),
        message: this.getErrorMessage(lastError),
        details: this.getErrorDetails(lastError),
      },
      metadata: {
        requestId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        attempts,
      },
    };
  }

  protected async executeWithRetryOrThrow<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, operationName);
    if (!result.success) {
      const error = new Error(result.error?.message || 'Operation failed');
      (error as any).code = result.error?.code;
      (error as any).details = result.error?.details;
      throw error;
    }
    return result.data as T;
  }

  protected isRetryableError(error: any): boolean {
    const errorCode = this.getErrorCode(error);
    return this.retryConfig.retryableErrors.includes(errorCode);
  }

  protected getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.response?.status) {
      const status = error.response.status;
      if (status >= 500) return 'SERVER_ERROR';
      if (status === 429) return 'RATE_LIMIT';
      if (status >= 400) return 'CLIENT_ERROR';
    }
    if (error.message?.includes('timeout')) return 'TIMEOUT';
    if (error.message?.includes('network')) return 'NETWORK_ERROR';
    return 'UNKNOWN_ERROR';
  }

  protected getErrorMessage(error: any): string {
    return error.message || 'An unknown error occurred';
  }

  protected getErrorDetails(error: any): any {
    return {
      stack: error.stack,
      response: error.response?.data,
      config: error.config,
    };
  }

  protected logError(operation: string, error: any, attempt: number): void {
    console.error(`[${this.config.name}] Error in ${operation} (attempt ${attempt}):`, {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected validateConfig(): void {
    if (!this.config.enabled) {
      throw new Error(`Service ${this.config.name} is disabled`);
    }

    if (!this.config.apiKey && !this.config.apiSecret) {
      throw new Error(`Service ${this.config.name} requires either apiKey or apiSecret`);
    }
  }

  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  public getCircuitState(): string {
    return this.circuitState;
  }

  public isAvailable(): boolean {
    return this.circuitState !== 'OPEN';
  }

  abstract testConnection(): Promise<ServiceResponse<boolean>>;
}
