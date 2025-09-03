import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ServiceConfigManager } from '../config/service-config.js';
import { ServiceManager } from '../services/service-manager.js';
import { TwilioPhoneService } from '../services/twilio-phone.service.js';
import { TwilioSMSService } from '../services/twilio-sms.service.js';
import { SendGridEmailService } from '../services/sendgrid-email.service.js';
import { AWSS3StorageService } from '../services/aws-s3-storage.service.js';
import {
  WebhookManager,
  TwilioWebhookHandler,
  SendGridWebhookHandler,
  S3WebhookHandler,
} from '../services/webhooks.js';

// Mock environment variables
const mockEnv = {
  PHONE_SERVICE_ENABLED: 'true',
  PHONE_SERVICE_PROVIDER: 'twilio',
  PHONE_SERVICE_API_KEY: 'test_phone_key',
  PHONE_SERVICE_API_SECRET: 'test_phone_secret',

  SMS_SERVICE_ENABLED: 'true',
  SMS_SERVICE_PROVIDER: 'twilio',
  SMS_SERVICE_API_KEY: 'test_sms_key',
  SMS_SERVICE_API_SECRET: 'test_sms_secret',

  EMAIL_SERVICE_ENABLED: 'true',
  EMAIL_SERVICE_PROVIDER: 'sendgrid',
  EMAIL_SERVICE_API_KEY: 'test_email_key',

  FILE_STORAGE_SERVICE_ENABLED: 'true',
  FILE_STORAGE_SERVICE_PROVIDER: 'aws-s3',
  FILE_STORAGE_SERVICE_API_KEY: 'test_aws_key',
  FILE_STORAGE_SERVICE_API_SECRET: 'test_aws_secret',
  AWS_S3_BUCKET_NAME: 'test-bucket',
  AWS_REGION: 'us-east-1',

  TWILIO_WEBHOOK_SECRET: 'test_twilio_webhook_secret',
  SENDGRID_WEBHOOK_SECRET: 'test_sendgrid_webhook_secret',
  S3_WEBHOOK_SECRET: 'test_s3_webhook_secret',

  NODE_ENV: 'test',
};

describe('Service Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let serviceManager: ServiceManager;
  let configManager: ServiceConfigManager;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };

    // Reset singletons
    (ServiceConfigManager as any).instance = null;
    (ServiceManager as any).instance = null;

    configManager = ServiceConfigManager.getInstance();
    serviceManager = ServiceManager.getInstance();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('ServiceConfigManager', () => {
    it('should load configurations correctly', () => {
      const phoneConfig = configManager.getConfig('phone');
      expect(phoneConfig.name).toBe('phone');
      expect(phoneConfig.provider).toBe('twilio');
      expect(phoneConfig.enabled).toBe(true);
      expect(phoneConfig.apiKey).toBe('test_phone_key');
      expect(phoneConfig.apiSecret).toBe('test_phone_secret');
    });

    it('should validate configurations', () => {
      const validation = configManager.validateAllConfigs();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect environment correctly', () => {
      expect(configManager.isTest()).toBe(true);
      expect(configManager.isDevelopment()).toBe(false);
      expect(configManager.isProduction()).toBe(false);
    });

    it('should enable and disable services', () => {
      configManager.disableService('phone');
      expect(configManager.isServiceEnabled('phone')).toBe(false);

      configManager.enableService('phone');
      expect(configManager.isServiceEnabled('phone')).toBe(true);
    });
  });

  describe('ServiceManager', () => {
    it('should initialize all services', () => {
      const services = serviceManager.getServices();
      expect(services.phone).toBeDefined();
      expect(services.sms).toBeDefined();
      expect(services.email).toBeDefined();
      expect(services.fileStorage).toBeDefined();
    });

    it('should get service instances', () => {
      const phoneService = serviceManager.getPhoneService();
      const smsService = serviceManager.getSMSService();
      const emailService = serviceManager.getEmailService();
      const fileStorageService = serviceManager.getFileStorageService();

      expect(phoneService).toBeInstanceOf(TwilioPhoneService);
      expect(smsService).toBeInstanceOf(TwilioSMSService);
      expect(emailService).toBeInstanceOf(SendGridEmailService);
      expect(fileStorageService).toBeInstanceOf(AWSS3StorageService);
    });

    it('should provide service status', () => {
      const status = serviceManager.getServiceStatus();

      expect(status.phone).toEqual({
        enabled: true,
        available: true,
        provider: 'twilio',
      });

      expect(status.sms).toEqual({
        enabled: true,
        available: true,
        provider: 'twilio',
      });

      expect(status.email).toEqual({
        enabled: true,
        available: true,
        provider: 'sendgrid',
      });

      expect(status.fileStorage).toEqual({
        enabled: true,
        available: true,
        provider: 'aws-s3',
      });
    });

    it('should provide service metrics', () => {
      const metrics = serviceManager.getServiceMetrics();

      expect(metrics.phone).toBeDefined();
      expect(metrics.sms).toBeDefined();
      expect(metrics.email).toBeDefined();
      expect(metrics.fileStorage).toBeDefined();
    });

    it('should reset metrics', () => {
      serviceManager.resetAllMetrics();

      const metrics = serviceManager.getServiceMetrics();

      expect(metrics.phone.totalRequests).toBe(0);
      expect(metrics.sms.totalRequests).toBe(0);
      expect(metrics.email.totalRequests).toBe(0);
      expect(metrics.fileStorage.totalRequests).toBe(0);
    });
  });

  describe('TwilioPhoneService', () => {
    let phoneService: TwilioPhoneService;

    beforeEach(() => {
      phoneService = new TwilioPhoneService(configManager.getConfig('phone'));
    });

    it('should create service instance', () => {
      expect(phoneService).toBeInstanceOf(TwilioPhoneService);
      expect(phoneService.getMetrics()).toBeDefined();
      expect(phoneService.isAvailable()).toBe(true);
    });

    it('should validate configuration', () => {
      expect(() => phoneService.validateConfig()).not.toThrow();
    });

    it('should handle configuration validation errors', () => {
      const invalidConfig = { ...configManager.getConfig('phone'), apiKey: undefined };
      const invalidService = new TwilioPhoneService(invalidConfig);

      expect(() => invalidService.validateConfig()).toThrow('Twilio Account SID is required');
    });
  });

  describe('TwilioSMSService', () => {
    let smsService: TwilioSMSService;

    beforeEach(() => {
      smsService = new TwilioSMSService(configManager.getConfig('sms'));
    });

    it('should create service instance', () => {
      expect(smsService).toBeInstanceOf(TwilioSMSService);
      expect(smsService.getMetrics()).toBeDefined();
      expect(smsService.isAvailable()).toBe(true);
    });

    it('should validate configuration', () => {
      expect(() => smsService.validateConfig()).not.toThrow();
    });

    it('should handle configuration validation errors', () => {
      const invalidConfig = { ...configManager.getConfig('sms'), apiKey: undefined };
      const invalidService = new TwilioSMSService(invalidConfig);

      expect(() => invalidService.validateConfig()).toThrow('Twilio Account SID is required');
    });
  });

  describe('SendGridEmailService', () => {
    let emailService: SendGridEmailService;

    beforeEach(() => {
      emailService = new SendGridEmailService(configManager.getConfig('email'));
    });

    it('should create service instance', () => {
      expect(emailService).toBeInstanceOf(SendGridEmailService);
      expect(emailService.getMetrics()).toBeDefined();
      expect(emailService.isAvailable()).toBe(true);
    });

    it('should validate configuration', () => {
      expect(() => emailService.validateConfig()).not.toThrow();
    });

    it('should handle configuration validation errors', () => {
      const invalidConfig = { ...configManager.getConfig('email'), apiKey: undefined };
      const invalidService = new SendGridEmailService(invalidConfig);

      expect(() => invalidService.validateConfig()).toThrow(
        'Service email requires either apiKey or apiSecret'
      );
    });
  });

  describe('AWSS3StorageService', () => {
    let storageService: AWSS3StorageService;

    beforeEach(() => {
      storageService = new AWSS3StorageService(configManager.getConfig('fileStorage'));
    });

    it('should create service instance', () => {
      expect(storageService).toBeInstanceOf(AWSS3StorageService);
      expect(storageService.getMetrics()).toBeDefined();
      expect(storageService.isAvailable()).toBe(true);
    });

    it('should validate configuration', () => {
      expect(() => storageService.validateConfig()).not.toThrow();
    });

    it('should handle configuration validation errors', () => {
      const invalidConfig = { ...configManager.getConfig('fileStorage'), apiKey: undefined };
      const invalidService = new AWSS3StorageService(invalidConfig);

      expect(() => invalidService.validateConfig()).toThrow('AWS Access Key ID is required');
    });
  });

  describe('WebhookManager', () => {
    let webhookManager: WebhookManager;

    beforeEach(() => {
      webhookManager = new WebhookManager();
    });

    it('should initialize webhook handlers', () => {
      const handlers = webhookManager.getHandlers();
      expect(handlers).toContain('twilio');
      expect(handlers).toContain('sendgrid');
      expect(handlers).toContain('s3');
    });

    it('should add and remove handlers', () => {
      const mockHandler = {
        handle: vi.fn(),
        validateSignature: vi.fn(),
      };

      webhookManager.addHandler('test', mockHandler);
      expect(webhookManager.getHandlers()).toContain('test');

      webhookManager.removeHandler('test');
      expect(webhookManager.getHandlers()).not.toContain('test');
    });
  });

  describe('TwilioWebhookHandler', () => {
    let webhookHandler: TwilioWebhookHandler;

    beforeEach(() => {
      webhookHandler = new TwilioWebhookHandler('test_secret');
    });

    it('should validate webhook signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = webhookHandler['validateSignature'](payload, 'a'.repeat(64), 'test_secret');
      expect(signature).toBe(false);
    });

    it('should handle webhook events', async () => {
      const payload = {
        id: 'test_id',
        event: 'call.initiated',
        data: { CallSid: 'test_call_sid' },
        timestamp: new Date(),
      };

      await expect(webhookHandler.handle(payload)).resolves.not.toThrow();
    });
  });

  describe('SendGridWebhookHandler', () => {
    let webhookHandler: SendGridWebhookHandler;

    beforeEach(() => {
      webhookHandler = new SendGridWebhookHandler('test_secret');
    });

    it('should validate webhook signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = webhookHandler['validateSignature'](payload, 'a'.repeat(64), 'test_secret');
      expect(signature).toBe(false);
    });

    it('should handle webhook events', async () => {
      const payload = {
        id: 'test_id',
        event: 'delivered',
        data: { message_id: 'test_message_id' },
        timestamp: new Date(),
      };

      await expect(webhookHandler.handle(payload)).resolves.not.toThrow();
    });
  });

  describe('S3WebhookHandler', () => {
    let webhookHandler: S3WebhookHandler;

    beforeEach(() => {
      webhookHandler = new S3WebhookHandler('test_secret');
    });

    it('should validate webhook signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = webhookHandler['validateSignature'](payload, 'a'.repeat(64), 'test_secret');
      expect(signature).toBe(false);
    });

    it('should handle webhook events', async () => {
      const payload = {
        id: 'test_id',
        event: 's3:ObjectCreated:Put',
        data: { key: 'test_file.txt' },
        timestamp: new Date(),
      };

      await expect(webhookHandler.handle(payload)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // Set invalid environment variables
      process.env.PHONE_SERVICE_API_KEY = '';

      // Reinitialize service manager
      (ServiceConfigManager as any).instance = null;
      (ServiceManager as any).instance = null;

      const newConfigManager = ServiceConfigManager.getInstance();
      const newServiceManager = ServiceManager.getInstance();

      expect(newConfigManager.isServiceEnabled('phone')).toBe(true);
      expect(newServiceManager.getPhoneService()).toBeDefined();
    });

    it('should handle disabled services', () => {
      configManager.disableService('email');

      const status = serviceManager.getServiceStatus();
      expect(status.email.enabled).toBe(false);
    });
  });

  describe('Service Reinitialization', () => {
    it('should reinitialize services when configuration changes', () => {
      const initialMetrics = serviceManager.getServiceMetrics();

      // Update configuration
      configManager.updateConfig('phone', { timeout: 60000 });
      serviceManager.reinitializeServices();

      const newMetrics = serviceManager.getServiceMetrics();
      expect(newMetrics.phone).toBeDefined();
    });

    it('should maintain service availability after reinitialization', () => {
      serviceManager.reinitializeServices();

      const status = serviceManager.getServiceStatus();
      expect(status.phone.available).toBe(true);
      expect(status.sms.available).toBe(true);
      expect(status.email.available).toBe(true);
      expect(status.fileStorage.available).toBe(true);
    });
  });
});
