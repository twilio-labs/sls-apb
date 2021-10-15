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
