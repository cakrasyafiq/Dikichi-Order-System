export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  NETWORK_ERROR: 'Cannot reach the server. Check your connection and try again.',
  TIMEOUT: 'The server took too long to respond. Please try again.',
  INVALID_RESPONSE: 'The server sent an unexpected response. Please try again.',
  SERVER_ERROR: 'The service is temporarily unavailable. Please try again in a moment.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again in a moment.',
  CATALOG_UNAVAILABLE:
    'The menu service is not responding. Your order was not sent, please try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a minute and try again.',
};

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';
