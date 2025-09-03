import { ServiceConfigManager } from '../config/service-config.js';
import { EmailServiceInterface } from '../types/email.js';
import { FileStorageServiceInterface } from '../types/file-storage.js';
import { PhoneServiceInterface } from '../types/phone.js';
import { ServiceConfig } from '../types/services.js';
import { SMSServiceInterface } from '../types/sms.js';
import { serviceLogger } from '../utils/logger.js';

import { AWSS3StorageService } from './aws-s3-storage.service.js';
import { SendGridEmailService } from './sendgrid-email.service.js';
import { TwilioPhoneService } from './twilio-phone.service.js';
import { TwilioSMSService } from './twilio-sms.service.js';

export interface ServiceRegistry {
  phone: PhoneServiceInterface;
  sms: SMSServiceInterface;
  email: EmailServiceInterface;
  fileStorage: FileStorageServiceInterface;
}

export class ServiceManager {
  private static instance: ServiceManager;
  private services: Partial<ServiceRegistry> = {};
  private configManager: ServiceConfigManager;

  private constructor() {
    this.configManager = ServiceConfigManager.getInstance();
    this.initializeServices();
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private initializeServices(): void {
    try {
      // Initialize phone service
      if (this.configManager.isServiceEnabled('phone')) {
        const phoneConfig = this.configManager.getConfig('phone');
        this.services.phone = new TwilioPhoneService(phoneConfig);
        serviceLogger.info('Phone service initialized successfully');
      } else {
        serviceLogger.info('Phone service is disabled');
      }

      // Initialize SMS service
      if (this.configManager.isServiceEnabled('sms')) {
        const smsConfig = this.configManager.getConfig('sms');
        this.services.sms = new TwilioSMSService(smsConfig);
        serviceLogger.info('SMS service initialized successfully');
      } else {
        serviceLogger.info('SMS service is disabled');
      }

      // Initialize email service
      if (this.configManager.isServiceEnabled('email')) {
        const emailConfig = this.configManager.getConfig('email');
        this.services.email = new SendGridEmailService(emailConfig);
        serviceLogger.info('Email service initialized successfully');
      } else {
        serviceLogger.info('Email service is disabled');
      }

      // Initialize file storage service
      if (this.configManager.isServiceEnabled('fileStorage')) {
        const fileStorageConfig = this.configManager.getConfig('fileStorage');
        this.services.fileStorage = new AWSS3StorageService(fileStorageConfig);
        serviceLogger.info('File storage service initialized successfully');
      } else {
        serviceLogger.info('File storage service is disabled');
      }
    } catch (error) {
      serviceLogger.error('Error initializing services:', error);
    }
  }

  public getPhoneService(): PhoneServiceInterface | null {
    return this.services.phone || null;
  }

  public getSMSService(): SMSServiceInterface | null {
    return this.services.sms || null;
  }

  public getEmailService(): EmailServiceInterface | null {
    return this.services.email || null;
  }

  public getFileStorageService(): FileStorageServiceInterface | null {
    return this.services.fileStorage || null;
  }

  public getServices(): Partial<ServiceRegistry> {
    return { ...this.services };
  }

  public async testAllServices(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    if (this.services.phone) {
      try {
        const testResult = await this.services.phone.testConnection();
        results.phone = testResult.success;
      } catch (error) {
        serviceLogger.error('Phone service test failed:', error);
        results.phone = false;
      }
    }

    if (this.services.sms) {
      try {
        const testResult = await this.services.sms.testConnection();
        results.sms = testResult.success;
      } catch (error) {
        serviceLogger.error('SMS service test failed:', error);
        results.sms = false;
      }
    }

    if (this.services.email) {
      try {
        const testResult = await this.services.email.testConnection();
        results.email = testResult.success;
      } catch (error) {
        serviceLogger.error('Email service test failed:', error);
        results.email = false;
      }
    }

    if (this.services.fileStorage) {
      try {
        const testResult = await this.services.fileStorage.testConnection();
        results.fileStorage = testResult.success;
      } catch (error) {
        serviceLogger.error('File storage service test failed:', error);
        results.fileStorage = false;
      }
    }

    return results;
  }

  public getServiceStatus(): Record<
    string,
    { enabled: boolean; available: boolean; provider?: string }
  > {
    const status: Record<string, { enabled: boolean; available: boolean; provider?: string }> = {};

    // Phone service
    status.phone = {
      enabled: this.configManager.isServiceEnabled('phone'),
      available: !!this.services.phone && this.services.phone.isAvailable(),
      provider: this.configManager.getConfig('phone').provider,
    };

    // SMS service
    status.sms = {
      enabled: this.configManager.isServiceEnabled('sms'),
      available: !!this.services.sms && this.services.sms.isAvailable(),
      provider: this.configManager.getConfig('sms').provider,
    };

    // Email service
    status.email = {
      enabled: this.configManager.isServiceEnabled('email'),
      available: !!this.services.email && this.services.email.isAvailable(),
      provider: this.configManager.getConfig('email').provider,
    };

    // File storage service
    status.fileStorage = {
      enabled: this.configManager.isServiceEnabled('fileStorage'),
      available: !!this.services.fileStorage && this.services.fileStorage.isAvailable(),
      provider: this.configManager.getConfig('fileStorage').provider,
    };

    return status;
  }

  public getServiceMetrics(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};

    if (this.services.phone) {
      metrics.phone = this.services.phone.getMetrics();
    }

    if (this.services.sms) {
      metrics.sms = this.services.sms.getMetrics();
    }

    if (this.services.email) {
      metrics.email = this.services.email.getMetrics();
    }

    if (this.services.fileStorage) {
      metrics.fileStorage = this.services.fileStorage.getMetrics();
    }

    return metrics;
  }

  public resetAllMetrics(): void {
    if (this.services.phone) {
      this.services.phone.resetMetrics();
    }

    if (this.services.sms) {
      this.services.sms.resetMetrics();
    }

    if (this.services.email) {
      this.services.email.resetMetrics();
    }

    if (this.services.fileStorage) {
      this.services.fileStorage.resetMetrics();
    }
  }

  public reinitializeServices(): void {
    // Clear existing services
    this.services = {};

    // Reload configuration
    this.configManager.reloadConfigs();

    // Reinitialize services
    this.initializeServices();

    serviceLogger.info('Services reinitialized successfully');
  }

  public enableService(serviceName: keyof ServiceRegistry): void {
    this.configManager.enableService(serviceName);
    this.reinitializeServices();
  }

  public disableService(serviceName: keyof ServiceRegistry): void {
    this.configManager.disableService(serviceName);
    this.reinitializeServices();
  }

  public updateServiceConfig(
    serviceName: keyof ServiceRegistry,
    config: Partial<ServiceConfig>
  ): void {
    this.configManager.updateConfig(serviceName, config);
    this.reinitializeServices();
  }

  public validateAllServices(): { valid: boolean; errors: string[] } {
    const configValidation = this.configManager.validateAllConfigs();
    const errors: string[] = [...configValidation.errors];

    // Test service connections
    if (this.services.phone && this.services.phone.isAvailable()) {
      try {
        const testResult = this.services.phone.testConnection();
        if (!testResult.then) {
          errors.push('Phone service connection test failed');
        }
      } catch (error) {
        errors.push(`Phone service test error: ${error}`);
      }
    }

    if (this.services.sms && this.services.sms.isAvailable()) {
      try {
        const testResult = this.services.sms.testConnection();
        if (!testResult.then) {
          errors.push('SMS service connection test failed');
        }
      } catch (error) {
        errors.push(`SMS service test error: ${error}`);
      }
    }

    if (this.services.email && this.services.email.isAvailable()) {
      try {
        const testResult = this.services.email.testConnection();
        if (!testResult.then) {
          errors.push('Email service connection test failed');
        }
      } catch (error) {
        errors.push(`Email service test error: ${error}`);
      }
    }

    if (this.services.fileStorage && this.services.fileStorage.isAvailable()) {
      try {
        const testResult = this.services.fileStorage.testConnection();
        if (!testResult.then) {
          errors.push('File storage service connection test failed');
        }
      } catch (error) {
        errors.push(`File storage service test error: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const serviceManager = ServiceManager.getInstance();
