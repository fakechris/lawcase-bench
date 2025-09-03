import dotenv from 'dotenv';

import { ServiceConfig } from '../types/services.js';
import { serviceLogger } from '../utils/logger.js';

dotenv.config();

export interface ServiceConfigMap {
  phone: ServiceConfig;
  sms: ServiceConfig;
  email: ServiceConfig;
  fileStorage: ServiceConfig;
}

export class ServiceConfigManager {
  private static instance: ServiceConfigManager;
  private configs: ServiceConfigMap;

  private constructor() {
    this.configs = this.loadConfigs();
  }

  public static getInstance(): ServiceConfigManager {
    if (!ServiceConfigManager.instance) {
      ServiceConfigManager.instance = new ServiceConfigManager();
    }
    return ServiceConfigManager.instance;
  }

  private loadConfigs(): ServiceConfigMap {
    return {
      phone: {
        name: 'phone',
        provider: process.env.PHONE_SERVICE_PROVIDER || 'twilio',
        enabled: process.env.PHONE_SERVICE_ENABLED === 'true',
        apiKey: process.env.PHONE_SERVICE_API_KEY,
        apiSecret: process.env.PHONE_SERVICE_API_SECRET,
        baseUrl: process.env.PHONE_SERVICE_BASE_URL,
        timeout: parseInt(process.env.PHONE_SERVICE_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.PHONE_SERVICE_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.PHONE_SERVICE_RETRY_DELAY || '1000'),
        webhookSecret: process.env.PHONE_SERVICE_WEBHOOK_SECRET,
        environment:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      },
      sms: {
        name: 'sms',
        provider: process.env.SMS_SERVICE_PROVIDER || 'twilio',
        enabled: process.env.SMS_SERVICE_ENABLED === 'true',
        apiKey: process.env.SMS_SERVICE_API_KEY,
        apiSecret: process.env.SMS_SERVICE_API_SECRET,
        baseUrl: process.env.SMS_SERVICE_BASE_URL,
        timeout: parseInt(process.env.SMS_SERVICE_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.SMS_SERVICE_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.SMS_SERVICE_RETRY_DELAY || '1000'),
        webhookSecret: process.env.SMS_SERVICE_WEBHOOK_SECRET,
        environment:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      },
      email: {
        name: 'email',
        provider: process.env.EMAIL_SERVICE_PROVIDER || 'sendgrid',
        enabled: process.env.EMAIL_SERVICE_ENABLED === 'true',
        apiKey: process.env.EMAIL_SERVICE_API_KEY,
        apiSecret: process.env.EMAIL_SERVICE_API_SECRET,
        baseUrl: process.env.EMAIL_SERVICE_BASE_URL,
        timeout: parseInt(process.env.EMAIL_SERVICE_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.EMAIL_SERVICE_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.EMAIL_SERVICE_RETRY_DELAY || '1000'),
        webhookSecret: process.env.EMAIL_SERVICE_WEBHOOK_SECRET,
        environment:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      },
      fileStorage: {
        name: 'fileStorage',
        provider: process.env.FILE_STORAGE_SERVICE_PROVIDER || 'aws-s3',
        enabled: process.env.FILE_STORAGE_SERVICE_ENABLED === 'true',
        apiKey: process.env.FILE_STORAGE_SERVICE_API_KEY,
        apiSecret: process.env.FILE_STORAGE_SERVICE_API_SECRET,
        baseUrl: process.env.FILE_STORAGE_SERVICE_BASE_URL,
        timeout: parseInt(process.env.FILE_STORAGE_SERVICE_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.FILE_STORAGE_SERVICE_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.FILE_STORAGE_SERVICE_RETRY_DELAY || '1000'),
        webhookSecret: process.env.FILE_STORAGE_SERVICE_WEBHOOK_SECRET,
        environment:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      },
    };
  }

  public getConfig(serviceName: keyof ServiceConfigMap): ServiceConfig {
    const config = this.configs[serviceName];
    if (!config) {
      throw new Error(`Service configuration not found for: ${serviceName}`);
    }
    return { ...config }; // Return a copy to prevent mutation
  }

  public getAllConfigs(): ServiceConfigMap {
    return { ...this.configs };
  }

  public updateConfig(serviceName: keyof ServiceConfigMap, updates: Partial<ServiceConfig>): void {
    if (!this.configs[serviceName]) {
      throw new Error(`Service configuration not found for: ${serviceName}`);
    }
    this.configs[serviceName] = { ...this.configs[serviceName], ...updates };
  }

  public enableService(serviceName: keyof ServiceConfigMap): void {
    this.updateConfig(serviceName, { enabled: true });
  }

  public disableService(serviceName: keyof ServiceConfigMap): void {
    this.updateConfig(serviceName, { enabled: false });
  }

  public isServiceEnabled(serviceName: keyof ServiceConfigMap): boolean {
    return this.configs[serviceName]?.enabled || false;
  }

  public validateConfig(serviceName: keyof ServiceConfigMap): boolean {
    const config = this.configs[serviceName];
    if (!config) return false;

    // Basic validation
    if (!config.enabled) return true; // Disabled services are considered valid

    const requiredFields = this.getRequiredFields(serviceName);
    for (const field of requiredFields) {
      if (!config[field as keyof ServiceConfig]) {
        serviceLogger.error(`Missing required field '${field}' for service: ${serviceName}`);
        return false;
      }
    }

    return true;
  }

  public validateAllConfigs(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const serviceNames = Object.keys(this.configs) as (keyof ServiceConfigMap)[];

    for (const serviceName of serviceNames) {
      if (!this.validateConfig(serviceName)) {
        errors.push(`Invalid configuration for service: ${serviceName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getRequiredFields(serviceName: keyof ServiceConfigMap): string[] {
    const baseFields = ['name', 'provider', 'enabled'];

    switch (serviceName) {
      case 'phone':
        return [...baseFields, 'apiKey', 'apiSecret'];
      case 'sms':
        return [...baseFields, 'apiKey', 'apiSecret'];
      case 'email':
        return [...baseFields, 'apiKey'];
      case 'fileStorage':
        return [...baseFields, 'apiKey', 'apiSecret'];
      default:
        return baseFields;
    }
  }

  public getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  public isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  public isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  public isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  public reloadConfigs(): void {
    dotenv.config({ override: true });
    this.configs = this.loadConfigs();
  }

  public exportConfigs(): string {
    return JSON.stringify(this.configs, null, 2);
  }

  public importConfigs(configJson: string): void {
    try {
      const importedConfigs = JSON.parse(configJson);
      this.configs = { ...this.configs, ...importedConfigs };
    } catch (error) {
      throw new Error(`Failed to import configurations: ${error}`);
    }
  }
}
