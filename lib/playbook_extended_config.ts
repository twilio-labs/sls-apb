import {
  STATES_EXECUTION_ROLE_ARN,
  AWS_EVENT_RULE_RESOURCE_TYPE,
} from "./constants";

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
  input?: object;
}

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
  RoleArn: typeof STATES_EXECUTION_ROLE_ARN;
  Input?: object;
}

export function buildScheduleResourceTarget(
  playbookName: string,
  input: object | undefined
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
    State: scheduleConfig.enabled
      ? ScheduleResourceState.ENABLED
      : ScheduleResourceState.DISABLED,
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

export function buildScheduleResourcesFromEventConfigs(
  playbookName: string,
  scheduleConfigs: PlaybookSchedule[]
) {
  const resources = {};
  scheduleConfigs.forEach((config, index) => {
    const resourceName = buildScheduleResourceName(playbookName, index);
    resources[resourceName] = buildScheduleResource(
      playbookName,
      config.schedule
    );
  });

  return { Resources: resources };
}

export function buildScheduleResourceName(
  playbookName: string,
  sequenceId: number
): string {
  return `${playbookName}EventRule${sequenceId}`;
}
