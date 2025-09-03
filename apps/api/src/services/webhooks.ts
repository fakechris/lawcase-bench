import crypto from 'crypto';

import { WebhookPayload } from '../types/services.js';
import { Logger } from '../utils/logger.js';

const webhookLogger = new Logger({ prefix: 'Webhooks' });

export interface WebhookHandler {
  handle(payload: WebhookPayload): Promise<void>;
  validateSignature(payload: string, signature: string, secret: string): boolean;
  secret?: string;
}

export abstract class BaseWebhookHandler implements WebhookHandler {
  protected serviceName: string;
  protected secret: string;

  constructor(serviceName: string, secret: string) {
    this.serviceName = serviceName;
    this.secret = secret;
  }

  abstract handle(payload: WebhookPayload): Promise<void>;

  validateSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  protected logWebhook(payload: WebhookPayload, action: string): void {
    webhookLogger.info(`[${this.serviceName} Webhook] ${action}:`, {
      id: payload.id,
      event: payload.event,
      timestamp: payload.timestamp,
    });
  }

  protected handleError(error: Error & { message?: string }, payload: WebhookPayload): void {
    webhookLogger.error(`[${this.serviceName} Webhook] Error processing webhook:`, {
      error: error.message,
      webhookId: payload.id,
      event: payload.event,
      timestamp: payload.timestamp,
    });
  }
}

export class TwilioWebhookHandler extends BaseWebhookHandler {
  constructor(secret: string) {
    super('Twilio', secret);
  }

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      this.logWebhook(payload, 'Processing');

      switch (payload.event) {
        case 'call.initiated':
          await this.handleCallInitiated(payload);
          break;
        case 'call.ringing':
          await this.handleCallRinging(payload);
          break;
        case 'call.answered':
          await this.handleCallAnswered(payload);
          break;
        case 'call.completed':
          await this.handleCallCompleted(payload);
          break;
        case 'call.failed':
          await this.handleCallFailed(payload);
          break;
        case 'recording.completed':
          await this.handleRecordingCompleted(payload);
          break;
        case 'sms.sent':
          await this.handleSMSSent(payload);
          break;
        case 'sms.delivered':
          await this.handleSMSDelivered(payload);
          break;
        case 'sms.failed':
          await this.handleSMSFailed(payload);
          break;
        default:
          webhookLogger.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error as Error & { message?: string }, payload);
      throw error;
    }
  }

  private async handleCallInitiated(payload: WebhookPayload): Promise<void> {
    // Handle call initiated event
    webhookLogger.info('Call initiated:', payload.data);
  }

  private async handleCallRinging(payload: WebhookPayload): Promise<void> {
    // Handle call ringing event
    webhookLogger.info('Call ringing:', payload.data);
  }

  private async handleCallAnswered(payload: WebhookPayload): Promise<void> {
    // Handle call answered event
    webhookLogger.info('Call answered:', payload.data);
  }

  private async handleCallCompleted(payload: WebhookPayload): Promise<void> {
    // Handle call completed event
    webhookLogger.info('Call completed:', payload.data);
  }

  private async handleCallFailed(payload: WebhookPayload): Promise<void> {
    // Handle call failed event
    webhookLogger.info('Call failed:', payload.data);
  }

  private async handleRecordingCompleted(payload: WebhookPayload): Promise<void> {
    // Handle recording completed event
    webhookLogger.info('Recording completed:', payload.data);
  }

  private async handleSMSSent(payload: WebhookPayload): Promise<void> {
    // Handle SMS sent event
    webhookLogger.info('SMS sent:', payload.data);
  }

  private async handleSMSDelivered(payload: WebhookPayload): Promise<void> {
    // Handle SMS delivered event
    webhookLogger.info('SMS delivered:', payload.data);
  }

  private async handleSMSFailed(payload: WebhookPayload): Promise<void> {
    // Handle SMS failed event
    webhookLogger.info('SMS failed:', payload.data);
  }
}

export class SendGridWebhookHandler extends BaseWebhookHandler {
  constructor(secret: string) {
    super('SendGrid', secret);
  }

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      this.logWebhook(payload, 'Processing');

      switch (payload.event) {
        case 'delivered':
          await this.handleDelivered(payload);
          break;
        case 'open':
          await this.handleOpen(payload);
          break;
        case 'click':
          await this.handleClick(payload);
          break;
        case 'bounce':
          await this.handleBounce(payload);
          break;
        case 'spamreport':
          await this.handleSpamReport(payload);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(payload);
          break;
        case 'group_unsubscribe':
          await this.handleGroupUnsubscribe(payload);
          break;
        case 'group_resubscribe':
          await this.handleGroupResubscribe(payload);
          break;
        default:
          webhookLogger.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error as Error & { message?: string }, payload);
      throw error;
    }
  }

  private async handleDelivered(payload: WebhookPayload): Promise<void> {
    // Handle email delivered event
    webhookLogger.info('Email delivered:', payload.data);
  }

  private async handleOpen(payload: WebhookPayload): Promise<void> {
    // Handle email open event
    webhookLogger.info('Email opened:', payload.data);
  }

  private async handleClick(payload: WebhookPayload): Promise<void> {
    // Handle email click event
    webhookLogger.info('Email clicked:', payload.data);
  }

  private async handleBounce(payload: WebhookPayload): Promise<void> {
    // Handle email bounce event
    webhookLogger.info('Email bounced:', payload.data);
  }

  private async handleSpamReport(payload: WebhookPayload): Promise<void> {
    // Handle spam report event
    webhookLogger.info('Spam reported:', payload.data);
  }

  private async handleUnsubscribe(payload: WebhookPayload): Promise<void> {
    // Handle unsubscribe event
    webhookLogger.info('Unsubscribed:', payload.data);
  }

  private async handleGroupUnsubscribe(payload: WebhookPayload): Promise<void> {
    // Handle group unsubscribe event
    webhookLogger.info('Group unsubscribed:', payload.data);
  }

  private async handleGroupResubscribe(payload: WebhookPayload): Promise<void> {
    // Handle group resubscribe event
    webhookLogger.info('Group resubscribed:', payload.data);
  }
}

export class AWSWebhookHandler extends BaseWebhookHandler {
  constructor(secret: string) {
    super('AWS', secret);
  }

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      this.logWebhook(payload, 'Processing');

      switch (payload.event) {
        case 's3:ObjectCreated:Put':
          await this.handleObjectCreated(payload);
          break;
        case 's3:ObjectRemoved:Delete':
          await this.handleObjectDeleted(payload);
          break;
        case 's3:ObjectCreated:Post':
          await this.handleObjectCreated(payload);
          break;
        case 's3:ObjectCreated:Copy':
          await this.handleObjectCreated(payload);
          break;
        case 's3:ObjectCreated:CompleteMultipartUpload':
          await this.handleObjectCreated(payload);
          break;
        default:
          webhookLogger.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error as Error & { message?: string }, payload);
      throw error;
    }
  }

  private async handleObjectCreated(payload: WebhookPayload): Promise<void> {
    // Handle S3 object created event
    webhookLogger.info('S3 object created:', payload.data);
  }

  private async handleObjectDeleted(payload: WebhookPayload): Promise<void> {
    // Handle S3 object deleted event
    webhookLogger.info('S3 object deleted:', payload.data);
  }
}

export class WebhookManager {
  private handlers: Map<string, WebhookHandler> = new Map();

  async handleWebhook(service: string, payload: WebhookPayload, signature?: string): Promise<void> {
    const handler = this.handlers.get(service);

    if (!handler) {
      throw new Error(`No webhook handler registered for service: ${service}`);
    }

    // Validate signature if provided
    if (signature && handler.secret) {
      const isValid = handler.validateSignature(JSON.stringify(payload), signature, handler.secret);

      if (!isValid) {
        throw new Error(`Invalid webhook signature for service: ${service}`);
      }
    }

    await handler.handle(payload);
  }

  addHandler(service: string, handler: WebhookHandler): void {
    this.handlers.set(service, handler);
  }

  removeHandler(service: string): void {
    this.handlers.delete(service);
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const webhookManager = new WebhookManager();

// Alias for backward compatibility
webhookManager.processWebhook = webhookManager.handleWebhook;
