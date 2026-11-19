export class ValidationError extends Error {
  constructor(details) {
    super('Request body is invalid.');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'EmailTakenError';
  }
}

/**
 * One error for every failed login. Unknown email and wrong password must be
 * indistinguishable to the client (PR-11, ADR-0022).
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}
