export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidEnumValueError extends Error {
  constructor(enumType: Record<string, string>, value: string) {
    super(`Invalid enum value: '${value}' for enum [${Object.values(enumType).join(', ')}]`);
    this.name = 'InvalidEnumValue';
  }
}

export class InvalidTokenError extends Error {
  constructor(token: string) {
    super(token + 'not found');
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class ExternalServiceError extends Error {
  constructor(serviceName: string) {
    super(`Error while calling external service: ${serviceName}`);
    this.name = 'ExternalServiceError';
  }
}

export class RefreshError extends Error {
  public originalError?: Error;

    constructor(message: string, originalError: Error) {
        super(message);
        this.originalError = originalError;
        this.name = 'RefreshError';

        Object.setPrototypeOf(this, RefreshError.prototype);
    }
}

export class DiagramNotFoundError extends Error {
  constructor(id: string) {
    super('Diagram not found with ID' + id);
    this.name = 'DiagramNotFound';

    Object.setPrototypeOf(this, DiagramNotFoundError.prototype);
  }
}

export class ContentControlsNotFoundError extends Error {
  constructor() {
    super('No diagrams found in document');
    this.name = 'ContentControlsNotFound';

    Object.setPrototypeOf(this, ContentControlsNotFoundError.prototype);
  }
}
