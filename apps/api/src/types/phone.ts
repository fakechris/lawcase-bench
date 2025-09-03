export interface PhoneServiceInterface {
  makeCall(to: string, from: string, options?: CallOptions): Promise<CallResponse>;
  endCall(callId: string): Promise<void>;
  getCallInfo(callId: string): Promise<CallInfo>;
  listCalls(filter?: CallFilter): Promise<CallInfo[]>;
  startRecording(callId: string): Promise<RecordingResponse>;
  stopRecording(callId: string): Promise<void>;
  getRecordings(callId: string): Promise<RecordingInfo[]>;
  makeConferenceCall(
    participants: string[],
    options?: ConferenceOptions
  ): Promise<ConferenceResponse>;
}

export interface CallOptions {
  record?: boolean;
  transcribe?: boolean;
  statusCallbackUrl?: string;
  timeout?: number;
  machineDetection?: boolean;
}

export interface CallResponse {
  callId: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  from: string;
  to: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  transcription?: string;
  cost?: number;
}

export interface CallInfo extends CallResponse {
  parentCallId?: string;
  direction: 'inbound' | 'outbound';
  answerTime?: Date;
  hangupCause?: string;
  price?: number;
  currency?: string;
}

export interface CallFilter {
  from?: string;
  to?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface RecordingResponse {
  recordingId: string;
  callId: string;
  status: 'in-progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  url?: string;
  fileSize?: number;
  format?: string;
}

export interface RecordingInfo extends RecordingResponse {
  transcriptionUrl?: string;
  statusCallbackUrl?: string;
  price?: number;
  currency?: string;
}

export interface ConferenceOptions {
  name?: string;
  record?: boolean;
  muted?: boolean;
  beep?: boolean;
  startConferenceOnEnter?: boolean;
  endConferenceOnExit?: boolean;
  waitUrl?: string;
  statusCallbackUrl?: string;
}

export interface ConferenceResponse {
  conferenceId: string;
  name: string;
  status: 'init' | 'in-progress' | 'completed';
  participants: Participant[];
  startTime: Date;
  endTime?: Date;
  recordingUrl?: string;
}

export interface Participant {
  callId: string;
  participantId: string;
  phoneNumber: string;
  status: 'connecting' | 'connected' | 'disconnected';
  muted: boolean;
  hold: boolean;
  startTime: Date;
  endTime?: Date;
}
