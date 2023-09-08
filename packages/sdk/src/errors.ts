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
