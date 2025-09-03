import sgMail from '@sendgrid/mail';

import { ServiceConfigManager } from '../config/service-config.js';
import {
  EmailServiceInterface,
  EmailContent,
  EmailOptions,
  EmailAttachment,
  EmailRecipient,
  BulkEmailOptions,
  EmailResponse,
  BulkEmailResponse,
  EmailStatus,
  EmailFilter,
  EmailValidationResponse,
  EmailStats,
  StatsFilter,
  EmailTemplate,
  TemplateFilter,
} from '../types/email.js';
import { ServiceConfig, ServiceResponse } from '../types/services.js';

import { BaseService } from './base.service.js';

export class SendGridEmailService extends BaseService implements EmailServiceInterface {
  private configManager: ServiceConfigManager;

  constructor(config?: ServiceConfig) {
    const serviceConfig = config || ServiceConfigManager.getInstance().getConfig('email');
    super(serviceConfig);
    this.configManager = ServiceConfigManager.getInstance();

    sgMail.setApiKey(this.config.apiKey!);
  }

  async testConnection(): Promise<ServiceResponse<boolean>> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      // Send a test email to verify the API key works
      const testEmail = {
        to: 'test@example.com',
        from: 'test@lawcasebench.com',
        subject: 'SendGrid Test',
        text: 'This is a test email to verify SendGrid configuration.',
        mailSettings: {
          sandboxMode: {
            enable: true,
          },
        },
      };

      await sgMail.send(testEmail);
      return true;
    }, 'testConnection');
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    content: EmailContent,
    options?: EmailOptions
  ): Promise<EmailResponse> {
    const response = await this.executeWithRetry(async () => {
      this.validateConfig();

      const recipients = Array.isArray(to) ? to : [to];
      const from = options?.from || 'noreply@lawcasebench.com';

      const mailData: any = {
        to: recipients,
        from,
        subject,
        text: content.text,
        html: content.html,
        replyTo: options?.replyTo,
        cc: options?.cc,
        bcc: options?.bcc,
        attachments: this.processAttachments(options?.attachments),
        headers: options?.headers,
        customArgs: {
          category: options?.category,
          campaign_id: options?.campaignId,
        },
        trackingSettings: {
          clickTracking: {
            enable: options?.tracking?.clicks ?? true,
          },
          openTracking: {
            enable: options?.tracking?.opens ?? true,
          },
          subscriptionTracking: {
            enable: options?.tracking?.unsubscribe ?? true,
          },
        },
        mailSettings: {
          sandboxMode: {
            enable: this.config.environment === 'test',
          },
        },
      };

      if (options?.priority === 'high') {
        mailData.headers = mailData.headers || {};
        mailData.headers['X-Priority'] = '1';
        mailData.headers['X-MSMail-Priority'] = 'High';
      }

      if (options?.sendAt) {
        mailData.sendAt = Math.floor(options.sendAt.getTime() / 1000);
      }

      const response = await sgMail.send(mailData);

      return {
        messageId: response[0]?.headers['x-message-id'] || `msg_${Date.now()}`,
        to: recipients,
        from,
        subject,
        status: 'queued' as const,
        sentAt: new Date(),
      };
    }, 'sendEmail');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to send email');
  }

  async sendTemplate(
    to: string | string[],
    templateId: string,
    templateData: Record<string, any>,
    options?: EmailOptions
  ): Promise<EmailResponse> {
    const response = await this.executeWithRetry(async () => {
      this.validateConfig();

      const recipients = Array.isArray(to) ? to : [to];
      const from = options?.from || 'noreply@lawcasebench.com';

      const mailData: any = {
        to: recipients,
        from,
        templateId,
        dynamicTemplateData: templateData,
        replyTo: options?.replyTo,
        cc: options?.cc,
        bcc: options?.bcc,
        attachments: this.processAttachments(options?.attachments),
        headers: options?.headers,
        customArgs: {
          category: options?.category,
          campaign_id: options?.campaignId,
        },
        trackingSettings: {
          clickTracking: {
            enable: options?.tracking?.clicks ?? true,
          },
          openTracking: {
            enable: options?.tracking?.opens ?? true,
          },
          subscriptionTracking: {
            enable: options?.tracking?.unsubscribe ?? true,
          },
        },
        mailSettings: {
          sandboxMode: {
            enable: this.config.environment === 'test',
          },
        },
      };

      if (options?.priority === 'high') {
        mailData.headers = mailData.headers || {};
        mailData.headers['X-Priority'] = '1';
        mailData.headers['X-MSMail-Priority'] = 'High';
      }

      if (options?.sendAt) {
        mailData.sendAt = Math.floor(options.sendAt.getTime() / 1000);
      }

      const response = await sgMail.send(mailData);

      return {
        messageId: response[0]?.headers['x-message-id'] || `msg_${Date.now()}`,
        to: recipients,
        from,
        subject: 'Template Email',
        status: 'queued' as const,
        sentAt: new Date(),
      };
    }, 'sendTemplate');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to send template email');
  }

  async sendBulkEmail(
    recipients: EmailRecipient[],
    content: EmailContent,
    options?: BulkEmailOptions
  ): Promise<BulkEmailResponse> {
    const response = await this.executeWithRetry(async () => {
      this.validateConfig();

      const batchSize = options?.batchSize || 100;
      const delayBetweenBatches = options?.delayBetweenBatches || 1000;
      const throttleRate = options?.throttleRate || 10; // emails per second

      const batches: EmailRecipient[][] = [];
      for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
      }

      const allResults: EmailResponse[] = [];
      const totalCost = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        // Process batch with throttling
        for (let j = 0; j < batch.length; j++) {
          const recipient = batch[j];

          const emailOptions: EmailOptions = {
            ...options,
            customArgs: {
              ...options?.customArgs,
              ...recipient.customArgs,
            },
          };

          if (recipient.name) {
            emailOptions.from = `${recipient.name} <${options?.from || 'noreply@lawcasebench.com'}>`;
          }

          const result = await this.sendEmail(
            recipient.email,
            content.html ? 'HTML Email' : 'Text Email',
            {
              html: content.html,
              text: content.text,
            },
            emailOptions
          );

          allResults.push(result);

          // Add delay for throttling
          if (j < batch.length - 1 && throttleRate > 0) {
            await this.sleep(1000 / throttleRate);
          }
        }

        // Add delay between batches if not the last batch
        if (i < batches.length - 1 && delayBetweenBatches > 0) {
          await this.sleep(delayBetweenBatches);
        }
      }

      const successfulCount = allResults.filter(
        (r) => r.status === 'delivered' || r.status === 'sent'
      ).length;
      const failedCount = allResults.filter(
        (r) => r.status === 'failed' || r.status === 'bounced'
      ).length;
      const pendingCount = allResults.length - successfulCount - failedCount;

      return {
        batchId: `batch_${Date.now()}`,
        totalRecipients: recipients.length,
        successfulCount,
        failedCount,
        pendingCount,
        messages: allResults,
        cost: totalCost > 0 ? totalCost : undefined,
        currency: 'USD',
      };
    }, 'sendBulkEmail');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to send bulk email');
  }

  async getEmailStatus(messageId: string): Promise<EmailStatus> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid doesn't provide a direct way to get message status by ID
      // This would typically require using the SendGrid Event Webhook
      // For now, we'll return a mock response
      return {
        messageId,
        to: ['unknown@example.com'],
        from: 'noreply@lawcasebench.com',
        subject: 'Unknown Subject',
        status: 'queued' as const,
        sentAt: new Date(),
        attempts: 1,
      };
    }, 'getEmailStatus');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get email status');
  }

  async listEmails(_filter?: EmailFilter): Promise<EmailStatus[]> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid doesn't provide a direct way to list sent emails
      // This would typically require using the SendGrid Event Webhook
      // For now, we'll return an empty array
      return [];
    }, 'listEmails');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to list emails');
  }

  async scheduleEmail(
    to: string | string[],
    subject: string,
    content: EmailContent,
    sendAt: Date,
    options?: EmailOptions
  ): Promise<EmailResponse> {
    return this.sendEmail(to, subject, content, {
      ...options,
      sendAt,
    });
  }

  async cancelScheduledEmail(_messageId: string): Promise<void> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid doesn't provide a direct way to cancel scheduled emails
      // This would typically require using the SendGrid API
      console.warn('Cancel scheduled email not implemented for SendGrid');
    }, 'cancelScheduledEmail');

    if (response.success) {
      return;
    }

    throw new Error(response.error?.message || 'Failed to cancel scheduled email');
  }

  async validateEmail(email: string): Promise<EmailValidationResponse> {
    const response = await this.executeWithRetry(async () => {
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      if (!isValid) {
        return {
          email,
          isValid: false,
          score: 0,
          reason: 'Invalid email format',
        };
      }

      // Extract domain for basic validation
      const domain = email.split('@')[1];
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
      const isFreeProvider = commonDomains.includes(domain.toLowerCase());

      return {
        email,
        isValid: true,
        score: 0.8,
        domain,
        isFreeProvider,
        isRoleAccount:
          email.includes('admin@') || email.includes('info@') || email.includes('support@'),
        smtpCheck: false, // SendGrid doesn't provide SMTP validation
      };
    }, 'validateEmail');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to validate email');
  }

  async getEmailStats(_filter?: StatsFilter): Promise<EmailStats> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid doesn't provide a direct way to get email statistics
      // This would typically require using the SendGrid Statistics API
      // For now, we'll return mock data
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBounced: 0,
        totalComplained: 0,
        totalUnsubscribed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
        topCategories: [],
        topCampaigns: [],
      };
    }, 'getEmailStats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get email stats');
  }

  async createTemplate(template: EmailTemplate): Promise<EmailTemplate> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid template management requires additional API calls
      // This is a simplified implementation
      return {
        ...template,
        id: `template_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }, 'createTemplate');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to create template');
  }

  async updateTemplate(
    templateId: string,
    template: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid template management requires additional API calls
      // This is a simplified implementation
      return {
        id: templateId,
        name: template.name || 'Updated Template',
        subject: template.subject || '',
        html: template.html || '',
        text: template.text,
        variables: template.variables || [],
        category: template.category,
        description: template.description,
        isActive: template.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }, 'updateTemplate');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to update template');
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid template management requires additional API calls
      console.warn(`Delete template ${templateId} not implemented for SendGrid`);
    }, 'deleteTemplate');

    if (response.success) {
      return;
    }

    throw new Error(response.error?.message || 'Failed to delete template');
  }

  async listTemplates(_filter?: TemplateFilter): Promise<EmailTemplate[]> {
    const response = await this.executeWithRetry(async () => {
      // Note: SendGrid template management requires additional API calls
      // This is a simplified implementation
      return [];
    }, 'listTemplates');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to list templates');
  }

  private processAttachments(attachments?: EmailAttachment[]): any[] {
    if (!attachments) return [];

    return attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content.toString('base64'),
      type: attachment.contentType,
      disposition: attachment.disposition || 'attachment',
      contentId: attachment.contentId,
    }));
  }

  protected validateConfig(): void {
    super.validateConfig();

    if (!this.config.apiKey) {
      throw new Error('SendGrid API key is required');
    }
  }
}
