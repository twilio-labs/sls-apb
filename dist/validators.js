"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbookEventsConfigValidator = exports.playbookScheduleConfigValidator = void 0;
var ajv_config_1 = require("./ajv_config");
var playbookScheduleConfigSchema = {
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
exports.playbookScheduleConfigValidator = ajv_config_1.ajv.compile(playbookScheduleConfigSchema);
var playbookScheduleSchema = {
    type: "object",
    properties: {
        schedule: playbookScheduleConfigSchema,
    },
};
var playbookEventsConfigSchema = {
    type: "object",
    properties: {
        events: {
            type: "array",
            items: playbookScheduleSchema,
        },
    },
};
exports.playbookEventsConfigValidator = ajv_config_1.ajv.compile(playbookEventsConfigSchema);
