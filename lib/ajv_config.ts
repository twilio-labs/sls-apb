import Ajv from "ajv";
import { PlaybookConfigValidationError } from "./errors";

export const ajv = new Ajv({ allErrors: true });

// takes some data and an Ajv validator then performs validation
// throws error if validation fails
export function validate(data: any, validator: any): boolean {
  const valid = validator(data);
  if (!valid) {
    throw new PlaybookConfigValidationError(
      `${ajv.errorsText(validator.errors)}`
    );
  }
  return true;
}
