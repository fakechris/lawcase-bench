import crypto from 'crypto';

import { WebhookPayload } from '../types/services.js';

export interface WebhookHandler {
  handle(payload: WebhookPayload): Promise<void>;
  validateSignature(payload: string, signature: string, secret: string): boolean;
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
    console.log(`[${this.serviceName} Webhook] ${action}:`, {
      id: payload.id,
      event: payload.event,
      timestamp: payload.timestamp,
    });
  }

  protected handleError(error: any, payload: WebhookPayload): void {
    console.error(`[${this.serviceName} Webhook] Error processing webhook:`, {
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
          console.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error, payload);
      throw error;
    }
  }

  private async handleCallInitiated(payload: WebhookPayload): Promise<void> {
    // Handle call initiated event
    console.log('Call initiated:', payload.data);
  }

  private async handleCallRinging(payload: WebhookPayload): Promise<void> {
    // Handle call ringing event
    console.log('Call ringing:', payload.data);
  }

  private async handleCallAnswered(payload: WebhookPayload): Promise<void> {
    // Handle call answered event
    console.log('Call answered:', payload.data);
  }

  private async handleCallCompleted(payload: WebhookPayload): Promise<void> {
    // Handle call completed event
    console.log('Call completed:', payload.data);
  }

  private async handleCallFailed(payload: WebhookPayload): Promise<void> {
    // Handle call failed event
    console.log('Call failed:', payload.data);
  }

  private async handleRecordingCompleted(payload: WebhookPayload): Promise<void> {
    // Handle recording completed event
    console.log('Recording completed:', payload.data);
  }

  private async handleSMSSent(payload: WebhookPayload): Promise<void> {
    // Handle SMS sent event
    console.log('SMS sent:', payload.data);
  }

  private async handleSMSDelivered(payload: WebhookPayload): Promise<void> {
    // Handle SMS delivered event
    console.log('SMS delivered:', payload.data);
  }

  private async handleSMSFailed(payload: WebhookPayload): Promise<void> {
    // Handle SMS failed event
    console.log('SMS failed:', payload.data);
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
        case 'dropped':
          await this.handleDropped(payload);
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
          console.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error, payload);
      throw error;
    }
  }

  private async handleDelivered(payload: WebhookPayload): Promise<void> {
    // Handle email delivered event
    console.log('Email delivered:', payload.data);
  }

  private async handleOpen(payload: WebhookPayload): Promise<void> {
    // Handle email open event
    console.log('Email opened:', payload.data);
  }

  private async handleClick(payload: WebhookPayload): Promise<void> {
    // Handle email click event
    console.log('Email clicked:', payload.data);
  }

  private async handleBounce(payload: WebhookPayload): Promise<void> {
    // Handle email bounce event
    console.log('Email bounced:', payload.data);
  }

  private async handleDropped(payload: WebhookPayload): Promise<void> {
    // Handle email dropped event
    console.log('Email dropped:', payload.data);
  }

  private async handleSpamReport(payload: WebhookPayload): Promise<void> {
    // Handle spam report event
    console.log('Spam reported:', payload.data);
  }

  private async handleUnsubscribe(payload: WebhookPayload): Promise<void> {
    // Handle unsubscribe event
    console.log('Unsubscribe:', payload.data);
  }

  private async handleGroupUnsubscribe(payload: WebhookPayload): Promise<void> {
    // Handle group unsubscribe event
    console.log('Group unsubscribe:', payload.data);
  }

  private async handleGroupResubscribe(payload: WebhookPayload): Promise<void> {
    // Handle group resubscribe event
    console.log('Group resubscribe:', payload.data);
  }
}

export class S3WebhookHandler extends BaseWebhookHandler {
  constructor(secret: string) {
    super('AWS S3', secret);
  }

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      this.logWebhook(payload, 'Processing');

      switch (payload.event) {
        case 's3:ObjectCreated:Put':
          await this.handleObjectCreated(payload);
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
        case 's3:ObjectRemoved:Delete':
          await this.handleObjectRemoved(payload);
          break;
        case 's3:ObjectRemoved:DeleteMarkerCreated':
          await this.handleObjectRemoved(payload);
          break;
        case 's3:ObjectAccessed:Get':
          await this.handleObjectAccessed(payload);
          break;
        case 's3:ReducedRedundancyLostObject':
          await this.handleReducedRedundancyLostObject(payload);
          break;
        default:
          console.warn(`[${this.serviceName} Webhook] Unknown event type: ${payload.event}`);
      }
    } catch (error) {
      this.handleError(error, payload);
      throw error;
    }
  }

  private async handleObjectCreated(payload: WebhookPayload): Promise<void> {
    // Handle S3 object created event
    console.log('S3 object created:', payload.data);
  }

  private async handleObjectRemoved(payload: WebhookPayload): Promise<void> {
    // Handle S3 object removed event
    console.log('S3 object removed:', payload.data);
  }

  private async handleObjectAccessed(payload: WebhookPayload): Promise<void> {
    // Handle S3 object accessed event
    console.log('S3 object accessed:', payload.data);
  }

  private async handleReducedRedundancyLostObject(payload: WebhookPayload): Promise<void> {
    // Handle reduced redundancy lost object event
    console.log('Reduced redundancy lost object:', payload.data);
  }
}

export class WebhookManager {
  private handlers: Map<string, WebhookHandler> = new Map();

  constructor() {
    // Initialize handlers with secrets from environment variables
    const twilioSecret = process.env.TWILIO_WEBHOOK_SECRET || '';
    const sendGridSecret = process.env.SENDGRID_WEBHOOK_SECRET || '';
    const s3Secret = process.env.S3_WEBHOOK_SECRET || '';

    if (twilioSecret) {
      this.handlers.set('twilio', new TwilioWebhookHandler(twilioSecret));
    }

    if (sendGridSecret) {
      this.handlers.set('sendgrid', new SendGridWebhookHandler(sendGridSecret));
    }

    if (s3Secret) {
      this.handlers.set('s3', new S3WebhookHandler(s3Secret));
    }
  }

  async handleWebhook(service: string, payload: WebhookPayload, signature?: string): Promise<void> {
    const handler = this.handlers.get(service);
    if (!handler) {
      throw new Error(`No webhook handler found for service: ${service}`);
    }

    // Validate signature if provided
    if (signature && handler.validateSignature) {
      const isValid = handler.validateSignature(
        JSON.stringify(payload),
        signature,
        (handler as any).secret
      );

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
