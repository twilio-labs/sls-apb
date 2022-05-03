"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.ajv = void 0;
var ajv_1 = __importDefault(require("ajv"));
var errors_1 = require("./errors");
exports.ajv = new ajv_1.default({ allErrors: true });
// takes some data and an Ajv validator then performs validation
// throws error if validation fails
function validate(data, validator) {
    var valid = validator(data);
    if (!valid) {
        throw new errors_1.PlaybookExtendedConfigValidationError("".concat(exports.ajv.errorsText(validator.errors)));
    }
    return true;
}
exports.validate = validate;
