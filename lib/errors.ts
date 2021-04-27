export class PlaybookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookValidationError";
    Object.setPrototypeOf(this, PlaybookValidationError.prototype);
  }
}

export class PlaybookConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookConfigValidationError";
    Object.setPrototypeOf(this, PlaybookConfigValidationError.prototype);
  }
}
