"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScheduleResourceName = exports.buildScheduleResourcesFromEventConfigs = exports.buildScheduleResourceOutput = exports.buildScheduleResource = exports.buildScheduleResourceProperties = exports.buildScheduleResourceTarget = exports.ScheduleResourceState = void 0;
var apb_1 = require("apb");
var errors_1 = require("./errors");
var ScheduleResourceState;
(function (ScheduleResourceState) {
    ScheduleResourceState["ENABLED"] = "ENABLED";
    ScheduleResourceState["DISABLED"] = "DISABLED";
})(ScheduleResourceState = exports.ScheduleResourceState || (exports.ScheduleResourceState = {}));
function buildScheduleResourceTarget(playbookName, input) {
    var targetConfig = {
        Arn: {
            Ref: playbookName,
        },
        Id: playbookName,
        RoleArn: apb_1.STATES_EXECUTION_ROLE_ARN,
    };
    // TODO: Do a check here to ensure that `input` is valid Json
    if (input) {
        try {
            JSON.parse(input);
        }
        catch (err) {
            throw new errors_1.PlaybookExtendedConfigValidationError("\"input\" provided to schedule for ".concat(playbookName, " is not a valid JSONinfied string. Provided input is ").concat(input));
        }
        targetConfig.Input = input;
    }
    return [targetConfig];
}
exports.buildScheduleResourceTarget = buildScheduleResourceTarget;
function buildScheduleResourceProperties(playbookName, scheduleConfig) {
    return {
        Description: scheduleConfig.description,
        ScheduleExpression: scheduleConfig.rate,
        State: scheduleConfig.enabled ? ScheduleResourceState.ENABLED : ScheduleResourceState.DISABLED,
        Targets: buildScheduleResourceTarget(playbookName, scheduleConfig.input),
    };
}
exports.buildScheduleResourceProperties = buildScheduleResourceProperties;
function buildScheduleResource(playbookName, scheduleConfig) {
    return {
        Type: apb_1.AWS_EVENT_RULE_RESOURCE_TYPE,
        Properties: buildScheduleResourceProperties(playbookName, scheduleConfig),
    };
}
exports.buildScheduleResource = buildScheduleResource;
function buildScheduleResourceOutput(scheduleResourceName, scheduleConfig) {
    return {
        Description: scheduleConfig.description,
        Value: {
            Ref: scheduleResourceName,
        },
    };
}
exports.buildScheduleResourceOutput = buildScheduleResourceOutput;
function buildScheduleResourcesFromEventConfigs(playbookName, scheduleConfigs, roleArn) {
    var formatted = {
        Resources: {},
        Outputs: {},
    };
    scheduleConfigs.forEach(function (config, index) {
        var resourceName = buildScheduleResourceName(playbookName, index);
        var resource = buildScheduleResource(playbookName, config.schedule);
        resource.Properties.Targets[0].RoleArn = roleArn;
        formatted.Resources[resourceName] = resource;
        formatted.Outputs[resourceName] = buildScheduleResourceOutput(resourceName, config.schedule);
    });
    return formatted;
}
exports.buildScheduleResourcesFromEventConfigs = buildScheduleResourcesFromEventConfigs;
function buildScheduleResourceName(playbookName, sequenceId) {
    return "".concat(playbookName, "EventRule").concat(sequenceId);
}
exports.buildScheduleResourceName = buildScheduleResourceName;
