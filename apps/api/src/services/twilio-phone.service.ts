import twilio from 'twilio';

import { ServiceConfigManager } from '../config/service-config.js';
import {
  PhoneServiceInterface,
  CallOptions,
  CallResponse,
  CallInfo,
  CallFilter,
  RecordingResponse,
  RecordingInfo,
  ConferenceOptions,
  ConferenceResponse,
} from '../types/phone.js';
import { ServiceConfig, ServiceResponse } from '../types/services.js';

import { BaseService } from './base.service.js';

export class TwilioPhoneService extends BaseService implements PhoneServiceInterface {
  private client: twilio.Twilio;
  private configManager: ServiceConfigManager;

  constructor(config?: ServiceConfig) {
    const serviceConfig = config || ServiceConfigManager.getInstance().getConfig('phone');
    super(serviceConfig);
    this.configManager = ServiceConfigManager.getInstance();

    this.client = twilio(this.config.apiKey, this.config.apiSecret, {
      accountSid: this.config.apiKey,
    });
  }

  async testConnection(): Promise<ServiceResponse<boolean>> {
    const response = await this.executeWithRetry(async () => {
      if (!this.config.apiKey) {
        throw new Error('Twilio Account SID is required');
      }
      const account = await this.client.api.v2010.accounts(this.config.apiKey).fetch();
      return account.status === 'active';
    }, 'testConnection');

    if (response.success && response.data) {
      return response;
    }

    throw new Error(response.error?.message || 'Failed to test connection');
  }

  async makeCall(to: string, from: string, options?: CallOptions): Promise<CallResponse> {
    return this.executeWithRetryOrThrow(async () => {
      this.validateConfig();

      const callParams: any = {
        to,
        from,
        url: options?.statusCallbackUrl || 'https://demo.twilio.com/docs/voice.xml',
        method: 'POST',
        statusCallback: options?.statusCallbackUrl,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        timeout: options?.timeout || 30,
        machineDetection: options?.machineDetection ? 'Enable' : 'Disable',
      };

      if (options?.record) {
        callParams.record = true;
        callParams.recordingStatusCallback = options.statusCallbackUrl;
      }

      const call = await this.client.calls.create(callParams);

      return {
        callId: call.sid,
        status: call.status as any,
        from: call.from,
        to: call.to,
        startTime: new Date(call.dateCreated),
        duration: parseInt(call.duration?.toString() || '0', 10),
        cost: call.price ? parseFloat(call.price) : undefined,
      };
    }, 'makeCall');
  }

  async endCall(callId: string): Promise<void> {
    return this.executeWithRetryOrThrow(async () => {
      await this.client.calls(callId).update({ status: 'completed' });
    }, 'endCall');
  }

  async getCallInfo(callId: string): Promise<CallInfo> {
    return this.executeWithRetryOrThrow(async () => {
      const call = await this.client.calls(callId).fetch();
      const recordings = await this.client.recordings.list({ callSid: callId });

      return {
        callId: call.sid,
        status: call.status as any,
        from: call.from,
        to: call.to,
        startTime: new Date(call.dateCreated),
        endTime: call.endTime ? new Date(call.endTime) : undefined,
        duration: parseInt(call.duration?.toString() || '0', 10),
        direction: call.direction as any,
        answerTime: call.startTime ? new Date(call.startTime) : undefined,
        hangupCause: call.status,
        price: call.price ? parseFloat(call.price) : undefined,
        currency: call.priceUnit,
        recordingUrl: recordings.length > 0 ? (recordings[0] as any).url : undefined,
      };
    }, 'getCallInfo');
  }

  async listCalls(filter?: CallFilter): Promise<CallInfo[]> {
    return this.executeWithRetryOrThrow(async () => {
      const params: any = {
        limit: filter?.limit || 50,
        pageSize: Math.min(filter?.limit || 50, 1000),
      };

      if (filter?.from) params.from = filter.from;
      if (filter?.to) params.to = filter.to;
      if (filter?.status) params.status = filter.status;
      if (filter?.startTime) params.startTime = new Date(filter.startTime);
      if (filter?.endTime) params.endTime = new Date(filter.endTime);

      const calls = await this.client.calls.list(params);

      return await Promise.all(
        calls.map(async (call) => {
          const recordings = await this.client.recordings.list({ callSid: call.sid });
          return {
            callId: call.sid,
            status: call.status as any,
            from: call.from,
            to: call.to,
            startTime: new Date(call.dateCreated),
            endTime: call.endTime ? new Date(call.endTime) : undefined,
            duration: parseInt(call.duration?.toString() || '0', 10),
            direction: call.direction as any,
            answerTime: call.startTime ? new Date(call.startTime) : undefined,
            hangupCause: call.status,
            price: call.price ? parseFloat(call.price) : undefined,
            currency: call.priceUnit,
            recordingUrl: recordings.length > 0 ? (recordings[0] as any).url : undefined,
          };
        })
      );
    }, 'listCalls');
  }

  async startRecording(callId: string): Promise<RecordingResponse> {
    return this.executeWithRetryOrThrow(async () => {
      const recording = await this.client.calls(callId).recordings.create({
        recordingChannels: 'dual',
        recordingStatusCallback: this.config.webhookSecret,
      });

      return {
        recordingId: recording.sid,
        callId: recording.callSid,
        status: recording.status as any,
        startTime: new Date(recording.dateCreated),
        duration: parseInt(recording.duration?.toString() || '0', 10),
        url: (recording as any).url,
        format: (recording as any).contentType?.split('/')[1] || 'mp3',
      };
    }, 'startRecording');
  }

  async stopRecording(_callId: string): Promise<void> {
    // Note: Twilio recordings cannot be stopped once started
    // This method is kept for interface compatibility
    return Promise.resolve();
  }

  async getRecordings(callId: string): Promise<RecordingInfo[]> {
    return this.executeWithRetryOrThrow(async () => {
      const recordings = await this.client.recordings.list({ callSid: callId });

      return recordings.map((recording) => ({
        recordingId: recording.sid,
        callId: recording.callSid,
        status: recording.status as any,
        startTime: new Date(recording.dateCreated),
        endTime: recording.dateUpdated ? new Date(recording.dateUpdated) : undefined,
        duration: parseInt(recording.duration?.toString() || '0', 10),
        url: (recording as any).url,
        fileSize: (recording as any).size,
        format: (recording as any).contentType?.split('/')[1] || 'mp3',
        price: recording.price ? parseFloat(recording.price) : undefined,
        currency: recording.priceUnit,
      }));
    }, 'getRecordings');
  }

  async makeConferenceCall(
    participants: string[],
    options?: ConferenceOptions
  ): Promise<ConferenceResponse> {
    return this.executeWithRetryOrThrow(async () => {
      const conferenceParams: any = {
        friendlyName: options?.name || 'Conference Call',
        record: options?.record || false,
        muted: options?.muted || false,
        beep: options?.beep !== false,
        startConferenceOnEnter: options?.startConferenceOnEnter !== false,
        endConferenceOnExit: options?.endConferenceOnExit !== false,
        waitMethod: 'POST',
        statusCallback: options?.statusCallbackUrl,
        statusCallbackMethod: 'POST',
      };

      const conference = await (this.client.api as any).v2010
        .accounts(this.config.apiKey)
        .conferences.create(conferenceParams);

      const participantPromises = participants.map((participant) =>
        (this.client.api as any).v2010
          .accounts(this.config.apiKey)
          .conferences(conference.sid)
          .participants.create({
            to: participant,
            from: this.config.fromNumber || this.config.apiKey, // This should be a Twilio phone number
            earlyMedia: true,
            endConferenceOnExit: options?.endConferenceOnExit !== false,
          })
      );

      const createdParticipants = await Promise.all(participantPromises);

      return {
        conferenceId: conference.sid,
        name: conference.friendlyName,
        status: conference.status as any,
        participants: createdParticipants.map((p) => ({
          callId: (p as any).callSid,
          participantId: (p as any).sid,
          phoneNumber: (p as any).to,
          status: (p as any).status as any,
          muted: (p as any).muted,
          hold: (p as any).hold,
          startTime: new Date((p as any).dateCreated),
        })),
        startTime: new Date((conference as any).dateCreated),
        recordingUrl: (conference as any).recordingUrl,
      };
    }, 'makeConferenceCall');
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
