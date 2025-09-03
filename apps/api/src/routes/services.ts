import { Router, Request, Response } from 'express';

import { serviceManager } from '../services/service-manager.js';
import { webhookManager } from '../services/webhooks.js';
import { WebhookPayload } from '../types/services.js';
import { serviceLogger } from '../utils/logger.js';

const router = Router();

// Service status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = serviceManager.getServiceStatus();
    const testResults = await serviceManager.testAllServices();

    res.json({
      success: true,
      status,
      testResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serviceLogger.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
    });
  }
});

// Service metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = serviceManager.getServiceMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serviceLogger.error('Error getting service metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service metrics',
    });
  }
});

// Reset metrics endpoint
router.post('/metrics/reset', async (req: Request, res: Response) => {
  try {
    serviceManager.resetAllMetrics();

    res.json({
      success: true,
      message: 'Service metrics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serviceLogger.error('Error resetting service metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset service metrics',
    });
  }
});

// Reinitialize services endpoint
router.post('/reinitialize', async (req: Request, res: Response) => {
  try {
    serviceManager.reinitializeServices();

    res.json({
      success: true,
      message: 'Services reinitialized successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serviceLogger.error('Error reinitializing services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reinitialize services',
    });
  }
});

// Validate all services endpoint
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const validation = serviceManager.validateAllServices();

    res.json({
      success: validation.valid,
      validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serviceLogger.error('Error validating services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate services',
    });
  }
});

// Webhook endpoints
router.post('/webhook/:service', async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const signature =
      (req.headers['x-signature'] as string) || (req.headers['x-twilio-signature'] as string);

    // Parse the webhook payload
    let payload: WebhookPayload;

    if (service === 'twilio') {
      // Twilio sends form data
      payload = {
        id: req.body.CallSid || req.body.MessageSid || `webhook_${Date.now()}`,
        event: req.body.EventType || req.body.MessageStatus || 'unknown',
        data: req.body,
        timestamp: new Date(),
        signature,
      };
    } else {
      // Other services send JSON
      payload = {
        id: req.body.id || `webhook_${Date.now()}`,
        event: req.body.event || req.body.type || 'unknown',
        data: req.body,
        timestamp: new Date(req.body.timestamp) || new Date(),
        signature,
      };
    }

    await webhookManager.handleWebhook(service, payload, signature);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    serviceLogger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

// Phone service endpoints
router.post('/phone/call', async (req: Request, res: Response) => {
  try {
    const phoneService = serviceManager.getPhoneService();
    if (!phoneService) {
      return res.status(503).json({
        success: false,
        error: 'Phone service is not available',
      });
    }

    const { to, from, options } = req.body;

    if (!to || !from) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, from',
      });
    }

    const result = await phoneService.makeCall(to, from, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error making phone call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make phone call',
    });
  }
});

router.get('/phone/call/:callId', async (req: Request, res: Response) => {
  try {
    const phoneService = serviceManager.getPhoneService();
    if (!phoneService) {
      return res.status(503).json({
        success: false,
        error: 'Phone service is not available',
      });
    }

    const { callId } = req.params;
    const result = await phoneService.getCallInfo(callId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error getting call info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call info',
    });
  }
});

// SMS service endpoints
router.post('/sms/send', async (req: Request, res: Response) => {
  try {
    const smsService = serviceManager.getSMSService();
    if (!smsService) {
      return res.status(503).json({
        success: false,
        error: 'SMS service is not available',
      });
    }

    const { to, message, options } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message',
      });
    }

    const result = await smsService.sendSMS(to, message, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error sending SMS:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
    });
  }
});

router.get('/sms/:messageId', async (req: Request, res: Response) => {
  try {
    const smsService = serviceManager.getSMSService();
    if (!smsService) {
      return res.status(503).json({
        success: false,
        error: 'SMS service is not available',
      });
    }

    const { messageId } = req.params;
    const result = await smsService.getSMSStatus(messageId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error getting SMS status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SMS status',
    });
  }
});

// Email service endpoints
router.post('/email/send', async (req: Request, res: Response) => {
  try {
    const emailService = serviceManager.getEmailService();
    if (!emailService) {
      return res.status(503).json({
        success: false,
        error: 'Email service is not available',
      });
    }

    const { to, subject, content, options } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, content',
      });
    }

    const result = await emailService.sendEmail(to, subject, content, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
    });
  }
});

// File storage service endpoints
router.post('/storage/upload', async (req: Request, res: Response) => {
  try {
    const fileStorageService = serviceManager.getFileStorageService();
    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        error: 'File storage service is not available',
      });
    }

    // Note: This would typically use multer middleware for file uploads
    // For now, we'll expect base64 encoded file content
    const { name, content, contentType, options } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, content',
      });
    }

    const fileData = {
      name,
      content: Buffer.from(content, 'base64'),
      contentType,
      size: Buffer.byteLength(content, 'base64'),
    };

    const result = await fileStorageService.uploadFile(fileData, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

router.get('/storage/:fileId', async (req: Request, res: Response) => {
  try {
    const fileStorageService = serviceManager.getFileStorageService();
    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        error: 'File storage service is not available',
      });
    }

    const { fileId } = req.params;
    const result = await fileStorageService.getFileInfo(fileId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    serviceLogger.error('Error getting file info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file info',
    });
  }
});

router.get('/storage/:fileId/download', async (req: Request, res: Response) => {
  try {
    const fileStorageService = serviceManager.getFileStorageService();
    if (!fileStorageService) {
      return res.status(503).json({
        success: false,
        error: 'File storage service is not available',
      });
    }

    const { fileId } = req.params;
    const fileBuffer = await fileStorageService.downloadFile(fileId);

    const fileInfo = await fileStorageService.getFileInfo(fileId);

    res.setHeader('Content-Type', fileInfo.contentType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);

    res.send(fileBuffer);
  } catch (error) {
    serviceLogger.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
    });
  }
});

export default router;
