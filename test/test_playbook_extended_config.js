const assert = require("assert");
const {
  buildScheduleResourceTarget,
  buildScheduleResourceProperties,
  buildScheduleResource,
  buildScheduleResourcesFromEventConfigs,
} = require("../dist/playbook_extended_config.js");
const {
  STATES_EXECUTION_ROLE_ARN,
  AWS_EVENT_RULE_RESOURCE_TYPE,
} = require("../dist/constants.js");

const testPlaybookName = "TestPlaybook";
const testInput = '{ "hello": "world" }';
const testDescription = "Hello world";

const testScheduleConfigNoInput = {
  rate: "rate(1 minute)",
  description: "hello world",
  enabled: true,
};

const testScheduleConfigWithInput = {
  ...testScheduleConfigNoInput,
  ...{ input: testInput },
};

const expectedScheduleTargetObjectNoInput = {
  Arn: {
    Ref: testPlaybookName,
  },
  Id: testPlaybookName,
  RoleArn: STATES_EXECUTION_ROLE_ARN,
};

const expectedScheduleTargetObjectWithInput = {
  ...expectedScheduleTargetObjectNoInput,
  ...{ Input: testInput },
};

const expectedScheduleTargetNoInput = [expectedScheduleTargetObjectNoInput];
const expectedScheduleTargetWithInput = [expectedScheduleTargetObjectWithInput];

const expectedScheduleResourcePropertiesNoInput = {
  Description: testScheduleConfigNoInput.description,
  ScheduleExpression: testScheduleConfigNoInput.rate,
  State: testScheduleConfigNoInput.enabled ? "ENABLED" : "DISABLED",
  Targets: expectedScheduleTargetNoInput,
};

const expectedScheduleResourcePropertiesWithInput = {
  ...expectedScheduleResourcePropertiesNoInput,
  ...{ Targets: expectedScheduleTargetWithInput },
};

const expectedScheduleResourceWithInput = {
  Type: AWS_EVENT_RULE_RESOURCE_TYPE,
  Properties: expectedScheduleResourcePropertiesWithInput,
};

const expectedScheduleResourceNoInput = {
  Type: AWS_EVENT_RULE_RESOURCE_TYPE,
  Properties: expectedScheduleResourcePropertiesNoInput,
};

const testPlaybookEventConfigs = [
  { schedule: testScheduleConfigWithInput },
  { schedule: testScheduleConfigNoInput },
];

const expectedScheduleResourcesFromEventConfig = {
  Resources: {
    [`${testPlaybookName}EventRule0`]: expectedScheduleResourceWithInput,
    [`${testPlaybookName}EventRule1`]: expectedScheduleResourceNoInput,
  },
};

describe("playbook_events", () => {
  describe("#buildScheduleResourceTarget", () => {
    it("Should return expected ScheduleResourceTarget for valid config with `input` key", () => {
      const builtTarget = buildScheduleResourceTarget(
        testPlaybookName,
        testInput
      );
      assert.deepStrictEqual(expectedScheduleTargetWithInput, builtTarget);
    });

    it("Should return expected ScheduleResourceTarget for valid config with no `input` key", () => {
      const builtTarget = buildScheduleResourceTarget(
        testPlaybookName,
        undefined
      );
      assert.deepStrictEqual(expectedScheduleTargetNoInput, builtTarget);
    });
  });

  describe("#buildScheduleResourceProperties", () => {
    it("Should builed expected ScheduleResourceProperties with valid config that has `input` key", () => {
      const builtProperties = buildScheduleResourceProperties(
        testPlaybookName,
        testScheduleConfigWithInput
      );

      assert.deepStrictEqual(
        expectedScheduleResourcePropertiesWithInput,
        builtProperties
      );
    });

    it("Should builed expected ScheduleResourceProperties with valid config that doesn't have `input` key", () => {
      const builtProperties = buildScheduleResourceProperties(
        testPlaybookName,
        testScheduleConfigNoInput
      );

      assert.deepStrictEqual(
        expectedScheduleResourcePropertiesNoInput,
        builtProperties
      );
    });
  });

  describe("#buildScheduleResource", () => {
    it("Should return expected ScheduleResource", () => {
      const builtResource = buildScheduleResource(
        testPlaybookName,
        testScheduleConfigWithInput
      );
      assert.deepStrictEqual(builtResource, expectedScheduleResourceWithInput);
    });
  });

  describe("#buildScheduleResourcesFromEventConfigs", () => {
    it("Should return expected Resources mapped to their Names", () => {
      const builtResourceMap = buildScheduleResourcesFromEventConfigs(
        testPlaybookName,
        testPlaybookEventConfigs,
        STATES_EXECUTION_ROLE_ARN
      );

      assert.deepStrictEqual(
        expectedScheduleResourcesFromEventConfig,
        builtResourceMap
      );
    });
  });
});
