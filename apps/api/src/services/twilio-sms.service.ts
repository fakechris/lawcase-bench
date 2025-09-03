import twilio from 'twilio';

import { ServiceConfigManager } from '../config/service-config.js';
import { ServiceConfig, ServiceResponse } from '../types/services.js';
import {
  SMSServiceInterface,
  SMSOptions,
  SMSResponse,
  BulkSMSOptions,
  BulkSMSResponse,
  SMSStatus,
  SMSFilter,
  PhoneValidationResponse,
  SMSStats,
  StatsFilter,
} from '../types/sms.js';

import { BaseService } from './base.service.js';

interface TwilioMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: string;
  dateCreated: Date;
  numSegments?: string;
  price?: string;
  priceUnit?: string;
  errorCode?: number;
  errorMessage?: string;
  carrier?: {
    name: string;
    type: string;
    mcc: string;
    mnc: string;
  };
}

interface TwilioLookup {
  phoneNumber: string;
  valid: boolean;
  countryCode: string;
  lineTypeIntelligence?: {
    type: string;
    carrier_name: string;
    location: string;
  };
}

export class TwilioSMSService extends BaseService implements SMSServiceInterface {
  private client: twilio.Twilio;
  private configManager: ServiceConfigManager;

  constructor(config?: ServiceConfig) {
    const serviceConfig = config || ServiceConfigManager.getInstance().getConfig('sms');
    super(serviceConfig);
    this.configManager = ServiceConfigManager.getInstance();

    this.client = twilio(this.config.apiKey, this.config.apiSecret, {
      accountSid: this.config.accountSid || this.config.apiKey,
    });
  }

  async testConnection(): Promise<ServiceResponse<boolean>> {
    const response = await this.executeWithRetry(async () => {
      const accountSid = this.config.apiKey || this.config.accountSid;
      if (!accountSid) {
        throw new Error('Twilio Account SID is required');
      }
      const account = await this.client.api.v2010.accounts(accountSid).fetch();
      return account.status === 'active';
    }, 'testConnection');

    if (response.success && response.data) {
      return response;
    }

    throw new Error(response.error?.message || 'Failed to test connection');
  }

  async sendSMS(to: string, message: string, options?: SMSOptions): Promise<SMSResponse> {
    return this.executeWithRetryOrThrow(async () => {
      this.validateConfig();

      const smsParams: Record<string, unknown> = {
        to,
        body: message,
        from: options?.from || options?.senderId,
        statusCallback: options?.callbackUrl,
        validityPeriod: options?.validityPeriod,
      };

      if (options?.priority === 'high') {
        smsParams.priority = 'high';
      }

      if (options?.scheduleTime) {
        smsParams.scheduleTime = options.scheduleTime.toISOString();
      }

      const sms = await this.client.messages.create(smsParams);

      return {
        messageId: sms.sid,
        to: sms.to,
        from: sms.from,
        status: sms.status as SMSResponse['status'],
        message: sms.body,
        segments: parseInt(sms.numSegments?.toString() || '0', 10),
        cost: sms.price ? parseFloat(sms.price) : undefined,
        currency: sms.priceUnit,
        sentAt: new Date(sms.dateCreated),
        errorCode: sms.errorCode?.toString(),
        errorMessage: sms.errorMessage,
      };
    }, 'sendSMS');
  }

  async sendBulkSMS(
    recipients: string[],
    message: string,
    options?: BulkSMSOptions
  ): Promise<BulkSMSResponse> {
    return this.executeWithRetryOrThrow(async () => {
      this.validateConfig();

      const batchSize = options?.batchSize || 50;
      const delayBetweenBatches = options?.delayBetweenBatches || 1000;

      const batches: string[][] = [];
      for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
      }

      const allMessages: SMSResponse[] = [];
      let successfulCount = 0;
      let failedCount = 0;

      for (const batch of batches) {
        const promises = batch.map((recipient) =>
          this.sendSMS(recipient, message, options).catch((error) => {
            failedCount++;
            return {
              messageId: '',
              to: recipient,
              from: options?.from || options?.senderId || '',
              status: 'failed' as const,
              message,
              segments: 0,
              errorCode: error.code?.toString(),
              errorMessage: error.message,
              sentAt: new Date(),
            };
          })
        );

        const results = await Promise.all(promises);
        allMessages.push(...results);
        successfulCount += results.filter((r) => r.status !== 'failed').length;

        if (batch !== batches[batches.length - 1]) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      const totalCost = allMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0);

      return {
        batchId: `bulk-${Date.now()}`,
        totalRecipients: recipients.length,
        successfulCount,
        failedCount,
        pendingCount: 0,
        messages: allMessages,
        cost: totalCost > 0 ? totalCost : undefined,
        currency: 'USD',
      };
    }, 'sendBulkSMS');
  }

  async getSMSStatus(messageId: string): Promise<SMSStatus> {
    return this.executeWithRetryOrThrow(async () => {
      const message = (await this.client.messages(messageId).fetch()) as TwilioMessage;

      return {
        messageId: message.sid,
        to: message.to,
        from: message.from,
        status: message.status as SMSResponse['status'],
        message: message.body,
        segments: parseInt(message.numSegments?.toString() || '0', 10),
        cost: message.price ? parseFloat(message.price) : undefined,
        currency: message.priceUnit,
        sentAt: new Date(message.dateCreated),
        attempts: 1,
        carrier: message.carrier?.name,
        countryCode: message.to?.split('-')[0],
        messageType: 'transactional',
        dlrReceived: message.status === 'delivered',
      };
    }, 'getSMSStatus');
  }

  async listSMS(filter?: SMSFilter): Promise<SMSStatus[]> {
    return this.executeWithRetryOrThrow(async () => {
      const params: Record<string, unknown> = {
        limit: filter?.limit || 50,
        pageSize: Math.min(filter?.limit || 50, 1000),
      };

      if (filter?.from) params.from = filter.from;
      if (filter?.to) params.to = filter.to;
      if (filter?.status) params.status = filter.status;
      if (filter?.startDate) params.dateSentAfter = new Date(filter.startDate);
      if (filter?.endDate) params.dateSentBefore = new Date(filter.endDate);

      const messages = (await this.client.messages.list(params)) as TwilioMessage[];

      return messages.map((message) => ({
        messageId: message.sid,
        to: message.to,
        from: message.from,
        status: message.status as SMSResponse['status'],
        message: message.body,
        segments: parseInt(message.numSegments?.toString() || '0', 10),
        cost: message.price ? parseFloat(message.price) : undefined,
        currency: message.priceUnit,
        sentAt: new Date(message.dateCreated),
        attempts: 1,
        carrier: message.carrier?.name,
        countryCode: message.to?.split('-')[0],
        messageType: 'transactional',
        dlrReceived: message.status === 'delivered',
      }));
    }, 'listSMS');
  }

  async scheduleSMS(
    to: string,
    message: string,
    sendAt: Date,
    options?: SMSOptions
  ): Promise<SMSResponse> {
    return this.executeWithRetryOrThrow(async () => {
      this.validateConfig();

      const smsParams: Record<string, unknown> = {
        to,
        body: message,
        from: options?.from || options?.senderId,
        scheduleType: 'fixed',
        sendAt: sendAt.toISOString(),
        statusCallback: options?.callbackUrl,
        validityPeriod: options?.validityPeriod,
      };

      if (options?.priority === 'high') {
        smsParams.priority = 'high';
      }

      const sms = await this.client.messages.create(smsParams);

      return {
        messageId: sms.sid,
        to: sms.to,
        from: sms.from,
        status: sms.status as SMSResponse['status'],
        message: sms.body,
        segments: parseInt(sms.numSegments?.toString() || '0', 10),
        cost: sms.price ? parseFloat(sms.price) : undefined,
        currency: sms.priceUnit,
        sentAt: new Date(sms.dateCreated),
        errorCode: sms.errorCode?.toString(),
        errorMessage: sms.errorMessage,
      };
    }, 'scheduleSMS');
  }

  async cancelScheduledSMS(messageId: string): Promise<void> {
    return this.executeWithRetryOrThrow(async () => {
      await this.client.messages(messageId).update({ status: 'canceled' });
    }, 'cancelScheduledSMS');
  }

  async validatePhoneNumber(phoneNumber: string): Promise<PhoneValidationResponse> {
    return this.executeWithRetryOrThrow(async () => {
      try {
        const lookup = (await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch({
          fields: 'line_type_intelligence',
        })) as TwilioLookup;

        return {
          phoneNumber: lookup.phoneNumber,
          isValid: lookup.valid,
          type: (lookup.lineTypeIntelligence?.type as PhoneValidationResponse['type']) || 'unknown',
          carrier: lookup.lineTypeIntelligence?.carrier_name,
          country: lookup.countryCode,
          countryCode: lookup.countryCode,
          location: lookup.lineTypeIntelligence?.location,
          lineType: lookup.lineTypeIntelligence?.type,
        };
      } catch (error) {
        return {
          phoneNumber,
          isValid: false,
          type: 'unknown',
        };
      }
    }, 'validatePhoneNumber');
  }

  async getSMSStats(filter?: StatsFilter): Promise<SMSStats> {
    return this.executeWithRetryOrThrow(async () => {
      const params: Record<string, unknown> = {
        limit: 1000,
      };

      if (filter?.startDate) params.dateSentAfter = new Date(filter.startDate);
      if (filter?.endDate) params.dateSentBefore = new Date(filter.endDate);

      const messages = (await this.client.messages.list(params)) as TwilioMessage[];

      const totalSent = messages.length;
      const totalDelivered = messages.filter((m) => m.status === 'delivered').length;
      const totalFailed = messages.filter(
        (m) => m.status === 'failed' || m.status === 'undelivered'
      ).length;
      const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;

      // Calculate total cost
      const totalCost = messages.reduce((sum, m) => sum + parseFloat(m.price || '0'), 0);
      const averageCost = totalSent > 0 ? totalCost / totalSent : 0;

      // Group by country
      const countryStats = new Map<string, number>();
      const carrierStats = new Map<string, number>();
      const costByCountry = new Map<string, number>();

      messages.forEach((message) => {
        const country = message.to?.split('-')[0] || 'unknown';
        const carrier = message.carrier?.name || 'unknown';
        const cost = parseFloat(message.price || '0');

        countryStats.set(country, (countryStats.get(country) || 0) + 1);
        carrierStats.set(carrier, (carrierStats.get(carrier) || 0) + 1);
        costByCountry.set(country, (costByCountry.get(country) || 0) + cost);
      });

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        averageCost: averageCost > 0 ? averageCost : undefined,
        topCountries: Array.from(countryStats.entries())
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topCarriers: Array.from(carrierStats.entries())
          .map(([carrier, count]) => ({ carrier, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        costByCountry: Array.from(costByCountry.entries())
          .map(([country, cost]) => ({ country, cost, currency: 'USD' }))
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 10),
      };
    }, 'getSMSStats');
  }

  protected validateConfig(): void {
    super.validateConfig();

    if (!this.config.apiKey) {
      throw new Error('Twilio Account SID is required');
    }

    if (!this.config.apiSecret) {
      throw new Error('Twilio Auth Token is required');
    }
  }
}
