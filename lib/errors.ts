export class PlaybookValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PlaybookValidationError"
    }
}