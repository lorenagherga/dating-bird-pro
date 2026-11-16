export const JUDGING_WEIGHTS = {
  perFlightMinute: 1,
  perCeilingMinute: 2,
  perStylePoint: 5,
} as const;

export interface FlightJudgingInput {
  durationMinutes: number;
  ceilingMinutes: number;
  stylePoints: number;
  descentPenalty: number;
  penalties: number;
}

export type FlightJudgingError = 'duration' | 'ceiling' | 'style' | 'penalty';

export function validateFlightJudging(input: FlightJudgingInput): FlightJudgingError | null {
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0) return 'duration';
  if (!Number.isFinite(input.ceilingMinutes) || input.ceilingMinutes < 0 || input.ceilingMinutes > input.durationMinutes) {
    return 'ceiling';
  }
  if (!Number.isInteger(input.stylePoints) || input.stylePoints < 1 || input.stylePoints > 10) return 'style';
  if (!Number.isFinite(input.descentPenalty) || input.descentPenalty < 0) return 'penalty';
  if (!Number.isFinite(input.penalties) || input.penalties < 0) return 'penalty';
  return null;
}

export function calculateFlightScore(input: FlightJudgingInput): number {
  const raw =
    input.durationMinutes * JUDGING_WEIGHTS.perFlightMinute +
    input.ceilingMinutes * JUDGING_WEIGHTS.perCeilingMinute +
    input.stylePoints * JUDGING_WEIGHTS.perStylePoint -
    input.descentPenalty -
    input.penalties;
  return Math.max(0, Math.round(raw * 10) / 10);
}
