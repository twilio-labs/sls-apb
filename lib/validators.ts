import { ajv } from "./ajv_config";
// import { JSONSchemaType } from "ajv";
import {
  PlaybookEventsConfig,
  PlaybookSchedule,
  PlaybookScheduleConfig,
} from "./playbook_extended_config";

const playbookScheduleConfigSchema = {
  type: "object",
  properties: {
    description: {
      type: "string",
    },
    rate: {
      type: "string",
    },
    enabled: {
      type: "boolean",
    },
    input: {
      type: "string",
    },
  },
  required: ["description", "rate", "enabled"],
  additionalProperties: false,
};

export const playbookScheduleConfigValidator = ajv.compile<PlaybookScheduleConfig>(
  playbookScheduleConfigSchema
);

const playbookScheduleSchema = {
  type: "object",
  properties: {
    schedule: playbookScheduleConfigSchema,
  },
};

const playbookEventsConfigSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: playbookScheduleSchema,
    },
  },
};

export const playbookEventsConfigValidator = ajv.compile<PlaybookEventsConfig>(
  playbookEventsConfigSchema
);
