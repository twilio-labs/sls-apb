const assert = require("assert");
const { validate } = require("../dist/ajv_config.js");
const { playbookScheduleConfigValidator } = require("../dist/validators.js");
const { PlaybookExtendedConfigValidationError } = require("../dist/errors.js");

const validScheduleConfig = {
  description: "Hello there",
  rate: "rate(1 minute)",
  enabled: true,
};

const invalidScheduleConfig = {
  description: 1,
  rate: 1,
  enabled: "string",
  input: true,
};

describe("#validatePlaybookScheduleConfig", () => {
  it("#Should succeed with valid config", () => {
    validate(validScheduleConfig, playbookScheduleConfigValidator);
  });

  it("#Should raise PlaybookExtendedConfigValidationError with invalid scheduleConfig", () => {
    assert.throws(
      () => validate(invalidScheduleConfig, playbookScheduleConfigValidator),
      PlaybookExtendedConfigValidationError
    );
  });
});
