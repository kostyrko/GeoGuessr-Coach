import {
  DAILY_CHALLENGE_FREE_SOURCE,
  type CaptureSource,
  type SupportedCaptureMode,
} from './capture-contract';

export interface SupportedModeDefinition {
  automaticCollection: true;
  mode: SupportedCaptureMode;
  source: CaptureSource;
  supportStatus: 'supported';
}

export interface UnsupportedModeDefinition {
  expectedLifecycleStatus: 'unsupported';
  mode:
    | 'challenge'
    | 'competitive'
    | 'daily-challenge-pro'
    | 'duel'
    | 'replay'
    | 'single-player'
    | 'team';
  reason: string;
  supportStatus: 'unsupported';
}

export const SUPPORTED_MODES: readonly SupportedModeDefinition[] = [
  {
    automaticCollection: true,
    mode: 'daily-challenge-free',
    source: DAILY_CHALLENGE_FREE_SOURCE,
    supportStatus: 'supported',
  },
];

export const UNSUPPORTED_MODES: readonly UnsupportedModeDefinition[] = [
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'single-player',
    reason: 'No completed-result response has been validated for this mode.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'daily-challenge-pro',
    reason: 'The Free leaderboard response does not validate Pro Daily Challenge collection.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'challenge',
    reason: 'Challenge result capture requires its own fixture and timing validation.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'competitive',
    reason: 'Competitive modes require separate fairness and ownership validation.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'duel',
    reason: 'Duel ownership and score semantics are not yet defined.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'team',
    reason: 'Team ownership and score semantics are not yet defined.',
    supportStatus: 'unsupported',
  },
  {
    expectedLifecycleStatus: 'unsupported',
    mode: 'replay',
    reason: 'Replay rounds may bias personal analytics and require a policy decision.',
    supportStatus: 'unsupported',
  },
];
