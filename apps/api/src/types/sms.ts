import { ServiceResponse, ServiceMetrics } from './services.js';

export interface SMSServiceInterface {
  sendSMS(to: string, message: string, options?: SMSOptions): Promise<SMSResponse>;
  sendBulkSMS(
    recipients: string[],
    message: string,
    options?: BulkSMSOptions
  ): Promise<BulkSMSResponse>;
  getSMSStatus(messageId: string): Promise<SMSStatus>;
  listSMS(filter?: SMSFilter): Promise<SMSStatus[]>;
  scheduleSMS(
    to: string,
    message: string,
    sendAt: Date,
    options?: SMSOptions
  ): Promise<SMSResponse>;
  cancelScheduledSMS(messageId: string): Promise<void>;
  validatePhoneNumber(phoneNumber: string): Promise<PhoneValidationResponse>;
  getSMSStats(filter?: StatsFilter): Promise<SMSStats>;
  testConnection(): Promise<ServiceResponse<boolean>>;
  isAvailable(): boolean;
  getMetrics(): ServiceMetrics;
  resetMetrics(): void;
}

export interface SMSOptions {
  from?: string;
  senderId?: string;
  priority?: 'normal' | 'high';
  scheduleTime?: Date;
  validityPeriod?: number; // in minutes
  callbackUrl?: string;
  tag?: string;
}

export interface BulkSMSOptions extends SMSOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface SMSResponse {
  messageId: string;
  to: string;
  from: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  message: string;
  segments: number;
  cost?: number;
  currency?: string;
  sentAt: Date;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface SMSStatus extends SMSResponse {
  attempts: number;
  lastAttempt?: Date;
  carrier?: string;
  countryCode?: string;
  messageType?: 'transactional' | 'promotional';
  dlrReceived?: boolean;
}

export interface SMSFilter {
  from?: string;
  to?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface BulkSMSResponse {
  batchId: string;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  messages: SMSResponse[];
  cost?: number;
  currency?: string;
}

export interface PhoneValidationResponse {
  phoneNumber: string;
  isValid: boolean;
  type: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  lineType?: string;
}

export interface StatsFilter {
  startDate?: Date;
  endDate?: Date;
  tag?: string;
  country?: string;
}

export interface SMSStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageCost?: number;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
  topCarriers: Array<{
    carrier: string;
    count: number;
  }>;
  costByCountry: Array<{
    country: string;
    cost: number;
    currency: string;
  }>;
}
