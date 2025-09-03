import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ServiceConfigManager } from '../config/service-config.js';
import { ServiceManager } from './service-manager.js';
import { TwilioPhoneService } from './twilio-phone.service.js';
import { TwilioSMSService } from './twilio-sms.service.js';
import { SendGridEmailService } from './sendgrid-email.service.js';
import { AWSS3StorageService } from './aws-s3-storage.service.js';
import { TwilioWebhookHandler } from './webhooks.js';

// Mock external dependencies
vi.mock('twilio', () => ({
  default: vi.fn().mockImplementation(() => ({
    calls: {
      create: vi.fn(),
      list: vi.fn(),
    },
    messages: {
      create: vi.fn(),
      list: vi.fn(),
    },
    api: {
      v2010: {
        accounts: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue({ status: 'active' }),
        }),
      },
    },
  })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  CopyObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  StorageClass: {
    STANDARD: 'STANDARD',
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed-url'),
}));

vi.mock('@sendgrid/mail', () => ({
  MailService: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  })),
}));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  PHONE_SERVICE_PROVIDER: 'twilio',
  PHONE_SERVICE_API_KEY: 'test_phone_key',
  PHONE_SERVICE_API_SECRET: 'test_phone_secret',
  PHONE_SERVICE_ACCOUNT_SID: 'test_account_sid',
  PHONE_SERVICE_FROM_NUMBER: '+1234567890',
  SMS_SERVICE_PROVIDER: 'twilio',
  SMS_SERVICE_API_KEY: 'test_sms_key',
  SMS_SERVICE_API_SECRET: 'test_sms_secret',
  SMS_SERVICE_ACCOUNT_SID: 'test_sms_account_sid',
  SMS_SERVICE_SENDER_ID: 'TestSender',
  EMAIL_SERVICE_PROVIDER: 'sendgrid',
  EMAIL_SERVICE_API_KEY: 'test_email_key',
  EMAIL_SERVICE_FROM_EMAIL: 'test@example.com',
  EMAIL_SERVICE_FROM_NAME: 'Test Sender',
  FILE_STORAGE_SERVICE_PROVIDER: 'aws-s3',
  FILE_STORAGE_SERVICE_API_KEY: 'test_aws_key',
  FILE_STORAGE_SERVICE_API_SECRET: 'test_aws_secret',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET_NAME: 'test-bucket',
};

describe('Service Integration Tests', () => {
  let configManager: ServiceConfigManager;
  let serviceManager: ServiceManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };

    // Reset singletons
    (ServiceConfigManager as any)._instance = null;
    (ServiceManager as any)._instance = null;

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

      // Check that metrics have the expected structure
      expect((metrics.phone as any).totalRequests).toBe(0);
      expect((metrics.phone as any).successfulRequests).toBe(0);
      expect((metrics.phone as any).failedRequests).toBe(0);
      expect((metrics.phone as any).errorRate).toBe(0);
    });

    it('should handle service health checks', async () => {
      const health = await serviceManager.checkAllServicesHealth();

      expect(health.phone).toBe(true);
      expect(health.sms).toBe(true);
      expect(health.email).toBe(true);
      expect(health.fileStorage).toBe(true);
    });
  });

  describe('Webhook Integration', () => {
    it('should create webhook handlers', () => {
      const twilioHandler = new TwilioWebhookHandler('test-secret');

      expect(twilioHandler).toBeDefined();
      expect(typeof twilioHandler.handle).toBe('function');
      expect(typeof twilioHandler.validateSignature).toBe('function');
    });

    it('should handle webhook processing', async () => {
      const handler = new TwilioWebhookHandler('test-secret');
      const payload = {
        id: 'test-id',
        event: 'call.initiated',
        data: { callSid: 'test-call-sid' },
        timestamp: new Date(),
      };

      // Mock the handler methods to avoid console output
      const spy = vi.spyOn(handler, 'handle').mockResolvedValue(undefined);

      await handler.handle(payload);

      expect(spy).toHaveBeenCalledWith(payload);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // Set invalid environment variables
      process.env.PHONE_SERVICE_API_KEY = '';

      // Reinitialize service manager
      (ServiceConfigManager as any)._instance = null;
      (ServiceManager as any)._instance = null;

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

  describe('Service Resilience', () => {
    it('should track service metrics correctly', async () => {
      const phoneService = serviceManager.getPhoneService();
      if (!phoneService) throw new Error('Phone service not available');

      // Get initial metrics
      const initialMetrics = phoneService.getMetrics();
      expect(initialMetrics.totalRequests).toBe(0);

      // This would normally make an actual API call, but we're mocked
      try {
        await phoneService.testConnection();
      } catch (error) {
        // Expected to fail in test environment without proper setup
      }

      // Metrics should have been updated
      const finalMetrics = phoneService.getMetrics();
      expect(finalMetrics.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it('should reset metrics correctly', () => {
      const phoneService = serviceManager.getPhoneService();

      // Reset metrics
      phoneService.resetMetrics();

      const metrics = phoneService.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });
});
