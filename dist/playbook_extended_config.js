"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScheduleResourceName = exports.buildScheduleResourcesFromEventConfigs = exports.buildScheduleResource = exports.buildScheduleResourceProperties = exports.buildScheduleResourceTarget = exports.ScheduleResourceState = void 0;
var constants_1 = require("./constants");
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
        RoleArn: constants_1.STATES_EXECUTION_ROLE_ARN,
    };
    // TODO: Do a check here to ensure that `input` is valid Json
    if (input) {
        try {
            JSON.parse(input);
        }
        catch (err) {
            throw new errors_1.PlaybookConfigValidationError("\"input\" provided to schedule for " + playbookName + " is not a valid JSONinfied string. Provided input is " + input);
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
        State: scheduleConfig.enabled
            ? ScheduleResourceState.ENABLED
            : ScheduleResourceState.DISABLED,
        Targets: buildScheduleResourceTarget(playbookName, scheduleConfig.input),
    };
}
exports.buildScheduleResourceProperties = buildScheduleResourceProperties;
function buildScheduleResource(playbookName, scheduleConfig) {
    return {
        Type: constants_1.AWS_EVENT_RULE_RESOURCE_TYPE,
        Properties: buildScheduleResourceProperties(playbookName, scheduleConfig),
    };
}
exports.buildScheduleResource = buildScheduleResource;
function buildScheduleResourcesFromEventConfigs(playbookName, scheduleConfigs) {
    var resources = {};
    scheduleConfigs.forEach(function (config, index) {
        var resourceName = buildScheduleResourceName(playbookName, index);
        resources[resourceName] = buildScheduleResource(playbookName, config.schedule);
    });
    return { Resources: resources };
}
exports.buildScheduleResourcesFromEventConfigs = buildScheduleResourcesFromEventConfigs;
function buildScheduleResourceName(playbookName, sequenceId) {
    return playbookName + "EventRule" + sequenceId;
}
exports.buildScheduleResourceName = buildScheduleResourceName;
