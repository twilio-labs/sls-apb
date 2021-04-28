export const PARSE_SELF_NAME = "apb_render_nonstring_value";
export const DEFAULT_RETRY = Object.freeze({
  ErrorEquals: [
    "Lambda.ServiceException",
    "Lambda.AWSLambdaException",
    "Lambda.SdkClientException",
  ],
  IntervalSeconds: 2,
  MaxAttempts: 6,
  BackoffRate: 2,
});
export const DECORATOR_FLAGS = Object.freeze({
  TaskFailureHandlerName: "_Handle_Task_Failure",
  TaskFailureHandlerStartLabel: "_Task_Failed",
  TaskFailureHandlerEndLabel: "_End_With_Failure",
});

export const PLAYBOOK_FORMATTER_STEP_NAME = "PLAYBOOK_FORMATTER";
export const PLAYBOOK_DIRECT_INVOCATION_CHECK_STEP_NAME =
  "Was_Playbook_Direct_Executed";
export const PLAYBOOK_SETUP_STEP_NAME = "Setup_Socless_Global_State";
export const SOCLESS_CORE_LAMBDA_NAME_FOR_RUNNING_PLAYBOOK_SETUP =
  "_socless_setup_global_state_for_direct_invoked_playbook";
export const STATES_EXECUTION_ROLE_ARN =
  "${{cf:socless-${{self:provider.stage}}.StatesExecutionRoleArn}}";

export const AWS_EVENT_RULE_RESOURCE_TYPE = "AWS::Events::Rule";
