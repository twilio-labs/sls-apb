import { STATES_EXECUTION_ROLE_ARN, AWS_EVENT_RULE_RESOURCE_TYPE } from "apb";
import { PlaybookExtendedConfigValidationError } from "./errors";

// Inferfaces for the Extended Playbook Configuration object that's supported in serverless.yml

export interface ExtendedPlaybookConfig {
  [x: string]: PlaybookEventsConfig;
}

export interface PlaybookEventsConfig {
  events: PlaybookSchedule[];
}

export interface PlaybookSchedule {
  schedule: PlaybookScheduleConfig;
}

export interface PlaybookScheduleConfig {
  description: string;
  rate: string;
  enabled: boolean;
  input?: string;
}

// Interfaces for the Cloudformation Resources that are expected to be created from the Extended Playbook Configuration

export interface ScheduleResource {
  Type: typeof AWS_EVENT_RULE_RESOURCE_TYPE;
  Properties: ScheduleResourceProperties;
}

export interface ScheduleResourceProperties {
  Description: string;
  ScheduleExpression: string;
  State: ScheduleResourceState;
  Targets: [ScheduleResourceTarget];
}

export enum ScheduleResourceState {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export interface ScheduleResourceTarget {
  Arn: object;
  Id: string;
  RoleArn: string | { "Fn::Sub": string };
  Input?: string;
}

export interface ScheduleResourceOutput {
  Description: string;
  Value: Record<string, unknown>;
}

export function buildScheduleResourceTarget(
  playbookName: string,
  input: string | undefined
): [ScheduleResourceTarget] {
  const targetConfig: ScheduleResourceTarget = {
    Arn: {
      Ref: playbookName,
    },
    Id: playbookName,
    RoleArn: STATES_EXECUTION_ROLE_ARN,
  };
  // TODO: Do a check here to ensure that `input` is valid Json
  if (input) {
    try {
      JSON.parse(input);
    } catch (err) {
      throw new PlaybookExtendedConfigValidationError(
        `"input" provided to schedule for ${playbookName} is not a valid JSONinfied string. Provided input is ${input}`
      );
    }
    targetConfig.Input = input;
  }

  return [targetConfig];
}

export function buildScheduleResourceProperties(
  playbookName: string,
  scheduleConfig: PlaybookScheduleConfig
): ScheduleResourceProperties {
  return {
    Description: scheduleConfig.description,
    ScheduleExpression: scheduleConfig.rate,
    State: scheduleConfig.enabled ? ScheduleResourceState.ENABLED : ScheduleResourceState.DISABLED,
    Targets: buildScheduleResourceTarget(playbookName, scheduleConfig.input),
  };
}

export function buildScheduleResource(
  playbookName: string,
  scheduleConfig: PlaybookScheduleConfig
): ScheduleResource {
  return {
    Type: AWS_EVENT_RULE_RESOURCE_TYPE,
    Properties: buildScheduleResourceProperties(playbookName, scheduleConfig),
  };
}

export function buildScheduleResourceOutput(
  scheduleResourceName: string,
  scheduleConfig: PlaybookScheduleConfig
): ScheduleResourceOutput {
  return {
    Description: scheduleConfig.description,
    Value: {
      Ref: scheduleResourceName,
    },
  };
}

export function buildScheduleResourcesFromEventConfigs(
  playbookName: string,
  scheduleConfigs: PlaybookSchedule[],
  roleArn: string
): { Resources: Record<string, unknown>; Outputs: {} } {
  const formatted = {
    Resources: {},
    Outputs: {},
  };

  scheduleConfigs.forEach((config, index) => {
    const resourceName = buildScheduleResourceName(playbookName, index);
    const resource = buildScheduleResource(playbookName, config.schedule);
    resource.Properties.Targets[0].RoleArn = roleArn;
    formatted.Resources[resourceName] = resource;
    formatted.Outputs[resourceName] = buildScheduleResourceOutput(resourceName, config.schedule);
  });

  return formatted;
}

export function buildScheduleResourceName(playbookName: string, sequenceId: number): string {
  return `${playbookName}EventRule${sequenceId}`;
}
