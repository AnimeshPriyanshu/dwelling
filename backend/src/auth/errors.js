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
