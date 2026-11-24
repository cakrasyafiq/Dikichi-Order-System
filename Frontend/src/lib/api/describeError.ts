import { ERROR_MESSAGES, FALLBACK_ERROR_MESSAGE } from '@/constants/messages';
import { ApiError, isClientFault } from './errors';

export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK_ERROR_MESSAGE;
  // WHY: client-side codes (rate limit, network) have friendlier text than the raw 4xx message.
  const known = ERROR_MESSAGES[error.code];
  if (known) return known;
  // WHY: 4xx messages are written for users by the backend; 5xx details stay out of the UI.
  return isClientFault(error) ? error.message : FALLBACK_ERROR_MESSAGE;
}
