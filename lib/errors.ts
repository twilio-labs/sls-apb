export class PlaybookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookValidationError";
    Object.setPrototypeOf(this, PlaybookValidationError.prototype);
  }
}

export class PlaybookExtendedConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookExtendedConfigValidationError";
    Object.setPrototypeOf(
      this,
      PlaybookExtendedConfigValidationError.prototype
    );
  }
}
