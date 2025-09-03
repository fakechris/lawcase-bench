import { ServiceResponse, ServiceMetrics } from './services.js';

export interface EmailServiceInterface {
  sendEmail(
    to: string | string[],
    subject: string,
    content: EmailContent,
    options?: EmailOptions
  ): Promise<EmailResponse>;
  sendTemplate(
    to: string | string[],
    templateId: string,
    templateData: Record<string, any>,
    options?: EmailOptions
  ): Promise<EmailResponse>;
  sendBulkEmail(
    recipients: EmailRecipient[],
    content: EmailContent,
    options?: BulkEmailOptions
  ): Promise<BulkEmailResponse>;
  getEmailStatus(messageId: string): Promise<EmailStatus>;
  listEmails(filter?: EmailFilter): Promise<EmailStatus[]>;
  scheduleEmail(
    to: string | string[],
    subject: string,
    content: EmailContent,
    sendAt: Date,
    options?: EmailOptions
  ): Promise<EmailResponse>;
  cancelScheduledEmail(messageId: string): Promise<void>;
  validateEmail(email: string): Promise<EmailValidationResponse>;
  getEmailStats(filter?: StatsFilter): Promise<EmailStats>;
  testConnection(): Promise<ServiceResponse<boolean>>;
  isAvailable(): boolean;
  getMetrics(): ServiceMetrics;
  resetMetrics(): void;
  createTemplate(template: EmailTemplate): Promise<EmailTemplate>;
  updateTemplate(templateId: string, template: Partial<EmailTemplate>): Promise<EmailTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(filter?: TemplateFilter): Promise<EmailTemplate[]>;
}

export interface EmailContent {
  html?: string;
  text?: string;
  amp?: string;
}

export interface EmailOptions {
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tracking?: {
    opens?: boolean;
    clicks?: boolean;
    unsubscribe?: boolean;
  };
  priority?: 'low' | 'normal' | 'high';
  category?: string;
  campaignId?: string;
  sendAt?: Date;
  customArgs?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  substitutions?: Record<string, any>;
  customArgs?: Record<string, any>;
}

export interface BulkEmailOptions extends EmailOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  throttleRate?: number; // emails per second
  customArgs?: Record<string, any>;
}

export interface EmailResponse {
  messageId: string;
  to: string[];
  from: string;
  subject: string;
  status:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'complained'
    | 'unsubscribed'
    | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  cost?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface EmailStatus extends EmailResponse {
  attempts: number;
  lastAttempt?: Date;
  ip?: string;
  useragent?: string;
  url?: string;
  reason?: string;
  bounceType?: 'hard' | 'soft' | 'blocked';
  spamReport?: boolean;
}

export interface EmailFilter {
  from?: string;
  to?: string;
  status?: string;
  subject?: string;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  campaignId?: string;
  limit?: number;
  offset?: number;
}

export interface BulkEmailResponse {
  batchId: string;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  messages: EmailResponse[];
  cost?: number;
  currency?: string;
}

export interface EmailValidationResponse {
  email: string;
  isValid: boolean;
  score: number;
  reason?: string;
  suggestion?: string;
  isDisposable?: boolean;
  isRoleAccount?: boolean;
  isFreeProvider?: boolean;
  domain?: string;
  mxRecord?: string;
  smtpCheck?: boolean;
}

export interface StatsFilter {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  campaignId?: string;
}

export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  averageCost?: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  topCampaigns: Array<{
    campaign: string;
    count: number;
  }>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  amp?: string;
  variables: TemplateVariable[];
  category?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface TemplateFilter {
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
