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
  }
}

export class ExternalServiceError extends Error {
  constructor(serviceName: string) {
    super(`Error while calling external service: ${serviceName}`);
    this.name = 'ExternalServiceError';
  }
}

export class RefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Refresh diagram error';
  }
}

export class DiagramNotFoundError extends Error {
  constructor(id: string) {
    super('Project not found with ID' + id);
    this.name = 'ProjectNotFound';
  }
}
