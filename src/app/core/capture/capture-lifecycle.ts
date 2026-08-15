import type { CaptureSource, SupportedCaptureMode } from './capture-contract';

export type CaptureLifecycleStatus =
  'completed' | 'duplicate' | 'failed' | 'skipped' | 'unsupported';

export interface CaptureLifecycleEvent {
  occurredAt: string;
  reason?: string;
  source?: CaptureSource;
  status: CaptureLifecycleStatus;
  supportedMode?: SupportedCaptureMode;
}
