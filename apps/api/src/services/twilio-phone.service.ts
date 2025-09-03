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

// Twilio API response interfaces
interface TwilioCall {
  sid: string;
  parentCallSid?: string;
  dateCreated: Date;
  dateUpdated: Date;
  accountSid: string;
  to: string;
  from: string;
  phoneNumberSid?: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  price?: string;
  priceUnit?: string;
  direction: string;
  answeredBy?: string;
  annotation?: unknown;
  callerName?: string;
  forwardingFrom?: string;
  groupSid?: string;
  queueTime?: string;
  trunkSid?: string;
}

interface TwilioRecording {
  sid: string;
  accountSid: string;
  callSid: string;
  dateCreated: Date;
  dateUpdated: Date;
  duration: string;
  status: string;
  url: string;
  size?: number;
  contentType?: string;
}

interface TwilioConference {
  sid: string;
  friendlyName: string;
  accountSid: string;
  dateCreated: Date;
  dateUpdated: Date;
  status: string;
  recordingUrl?: string;
}

interface TwilioParticipant {
  sid: string;
  callSid: string;
  conferenceSid: string;
  dateCreated: Date;
  dateUpdated: Date;
  to: string;
  from: string;
  status: string;
  muted: boolean;
  hold: boolean;
  startConferenceOnEnter: boolean;
  endConferenceOnExit: boolean;
}

interface TwilioApi {
  v2010: {
    accounts: (accountSid: string) => {
      calls: {
        create: (params: unknown) => Promise<TwilioCall>;
        list: (filter: unknown) => Promise<TwilioCall[]>;
        get: (sid: string) => { remove: () => Promise<void> };
      };
      conferences: {
        create: (params: unknown) => Promise<TwilioConference>;
      };
    };
  };
}

export class TwilioPhoneService extends BaseService implements PhoneServiceInterface {
  private client: twilio.Twilio & { api: TwilioApi };
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

      const callParams: Record<string, unknown> = {
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
        status: call.status as CallResponse['status'],
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
        status: call.status as CallResponse['status'],
        from: call.from,
        to: call.to,
        startTime: new Date(call.dateCreated),
        endTime: call.endTime ? new Date(call.endTime) : undefined,
        duration: parseInt(call.duration?.toString() || '0', 10),
        direction: call.direction as CallInfo['direction'],
        answerTime: call.startTime ? new Date(call.startTime) : undefined,
        hangupCause: call.status,
        price: call.price ? parseFloat(call.price) : undefined,
        currency: call.priceUnit,
        recordingUrl: recordings.length > 0 ? (recordings[0] as TwilioRecording).url : undefined,
      };
    }, 'getCallInfo');
  }

  async listCalls(filter?: CallFilter): Promise<CallInfo[]> {
    return this.executeWithRetryOrThrow(async () => {
      const params: Record<string, unknown> = {
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
            status: call.status as CallResponse['status'],
            from: call.from,
            to: call.to,
            startTime: new Date(call.dateCreated),
            endTime: call.endTime ? new Date(call.endTime) : undefined,
            duration: parseInt(call.duration?.toString() || '0', 10),
            direction: call.direction as CallInfo['direction'],
            answerTime: call.startTime ? new Date(call.startTime) : undefined,
            hangupCause: call.status,
            price: call.price ? parseFloat(call.price) : undefined,
            currency: call.priceUnit,
            recordingUrl:
              recordings.length > 0 ? (recordings[0] as TwilioRecording).url : undefined,
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
        status: recording.status as RecordingResponse['status'],
        startTime: new Date(recording.dateCreated),
        duration: parseInt(recording.duration?.toString() || '0', 10),
        url: (recording as TwilioRecording).url,
        format: (recording as TwilioRecording).contentType?.split('/')[1] || 'mp3',
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
        status: recording.status as RecordingResponse['status'],
        startTime: new Date(recording.dateCreated),
        endTime: recording.dateUpdated ? new Date(recording.dateUpdated) : undefined,
        duration: parseInt(recording.duration?.toString() || '0', 10),
        url: (recording as TwilioRecording).url,
        fileSize: (recording as TwilioRecording).size,
        format: (recording as TwilioRecording).contentType?.split('/')[1] || 'mp3',
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
      const conferenceParams: Record<string, unknown> = {
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

      const conference = await (this.client.api as TwilioApi).v2010
        .accounts(this.config.apiKey)
        .conferences.create(conferenceParams);

      const participantPromises = participants.map((participant) =>
        (this.client.api as TwilioApi).v2010
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
        status: conference.status as ConferenceResponse['status'],
        participants: createdParticipants.map((p) => ({
          callId: (p as TwilioParticipant).callSid,
          participantId: (p as TwilioParticipant).sid,
          phoneNumber: (p as TwilioParticipant).to,
          status: (p as TwilioParticipant).status as
            | 'queued'
            | 'ringing'
            | 'in-progress'
            | 'completed',
          muted: (p as TwilioParticipant).muted,
          hold: (p as TwilioParticipant).hold,
          startTime: new Date((p as TwilioParticipant).dateCreated),
        })),
        startTime: new Date((conference as TwilioConference).dateCreated),
        recordingUrl: (conference as TwilioConference).recordingUrl,
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
