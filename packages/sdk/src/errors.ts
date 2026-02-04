export class RequiredParameterMissingError extends Error {
  constructor(parameterName: string) {
    super(`Required parameter ${parameterName} is missing`);
  }
}

export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when AI credits limit is exceeded.
 * This corresponds to HTTP 402 status code from the repair API.
 */
export class AICreditsLimitExceededError extends Error {
  constructor(message: string = 'AI credits limit exceeded') {
    super(message);
    this.name = 'AICreditsLimitExceededError';
  }
}
