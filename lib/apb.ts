import { StepFunction, State } from "./stepFunction";
import {
  HelperState,
  PlaybookDefinition,
  SoclessTaskStepParameters,
} from "./socless_psuedo_states";
import {
  PARSE_SELF_NAME,
  DEFAULT_RETRY,
  DECORATOR_FLAGS,
  PLAYBOOK_FORMATTER_STEP_NAME,
  PLAYBOOK_DIRECT_INVOCATION_CHECK_STEP_NAME,
  SOCLESS_CORE_LAMBDA_NAME_FOR_RUNNING_PLAYBOOK_SETUP,
  PLAYBOOK_SETUP_STEP_NAME,
  STATES_EXECUTION_ROLE_ARN,
} from "./constants";
import { PlaybookValidationError } from "./errors";

const parse_self_pattern = new RegExp(
  `(\\"${PARSE_SELF_NAME}\\()(.*)(\\)\\")`,
  "g"
);

export class apb {
  apb_config: any;
  DecoratorFlags: any;
  States: Record<string, State>;
  StateMachine?: StepFunction;
  Decorators: Record<string, any>;
  PlaybookName: string;
  StateMachineYaml: Object;

  constructor(definition: PlaybookDefinition, apb_config = {}) {
    this.validateTopLevelKeys(definition);
    this.apb_config = apb_config;
    this.DecoratorFlags = {
      hasTaskFailureHandler: false,
      ...DECORATOR_FLAGS,
    };

    const {
      Playbook,
      States,
      Decorators,
      StartAt,
      Comment,
      ...topLevel
    } = definition;
    this.Decorators = Decorators || {};
    this.PlaybookName = Playbook;
    this.States = States;

    // Check for TaskFailureHandler Decorator and modify this.States accordingly
    if (this.Decorators) {
      if (this.taskErrorHandlerExists()) {
        this.DecoratorFlags.hasTaskFailureHandler = true;
        Object.assign(
          this.States,
          this.genTaskFailureHandlerStates(this.Decorators.TaskFailureHandler)
        );
      } else {
        this.DecoratorFlags.hasTaskFailureHandler = false;
      }
    }

    const starting_step = this.generate_playbook_setup_steps(StartAt);

    // build resolved state machine from socless states
    this.StateMachine = {
      ...topLevel,
      Comment,
      StartAt: PLAYBOOK_DIRECT_INVOCATION_CHECK_STEP_NAME,
      States: {
        ...starting_step,
        ...this.transformStates(),
      },
    };

    // build finalized yaml output
    this.StateMachineYaml = {
      Resources: {
        [this.PlaybookName]: {
          Type: "AWS::StepFunctions::StateMachine",
          Properties: {
            RoleArn: STATES_EXECUTION_ROLE_ARN,
            StateMachineName: this.PlaybookName,
            DefinitionString: {
              "Fn::Sub": JSON.stringify(this.StateMachine, null, 4).replace(
                parse_self_pattern,
                "$2"
              ),
            },
            ...this.buildLoggingConfiguration(),
          },
        },
      },
      Outputs: {
        [this.PlaybookName]: {
          Description: Comment,
          Value: {
            Ref: this.PlaybookName,
          },
        },
      },
    };
  }

  validateTopLevelKeys(definition: PlaybookDefinition) {
    const REQUIRED_FIELDS = ["Playbook", "Comment", "StartAt", "States"];
    REQUIRED_FIELDS.forEach((key) => {
      if (!definition[key])
        throw new PlaybookValidationError(
          `Playbook definition does not have the required top-level key, '${key}'`
        );
    });
  }

  //* BOOLEAN CHECKS & Validators /////////////////////////////////////////////////////

  isDefaultRetryDisabled(stateName: string) {
    if (this.Decorators.DisableDefaultRetry) {
      const disable = this.Decorators.DisableDefaultRetry;
      return (
        disable.all || (disable.tasks && disable.tasks.includes(stateName))
      );
    } else {
      return false;
    }
  }

  validateTaskFailureHandlerDecorator(config: any) {
    if (config.Type === "Task" || config.Type === "Parallel") {
      return true;
    } else {
      throw new Error(
        "Decorator.TaskFailureHandler configured incorrectly. Must be a Task or Parallel state"
      );
    }
  }

  taskErrorHandlerExists() {
    return (
      this.Decorators.TaskFailureHandler &&
      this.validateTaskFailureHandlerDecorator(
        this.Decorators.TaskFailureHandler
      )
    );
  }

  //* STATE GENERATIONS /////////////////////////////////////////////////////

  genIntegrationHelperStateName(originalName: string) {
    return `helper_${originalName.toLowerCase()}`.slice(0, 128);
  }

  genTaskFailureHandlerCatchConfig(stateName: string) {
    return {
      ErrorEquals: ["States.TaskFailed"],
      ResultPath: `$.errors.${stateName}`,
      Next: this.DecoratorFlags.TaskFailureHandlerStartLabel,
    };
  }

  genHelperState(stateConfig: any, stateName: string) {
    return {
      Type: "Pass",
      Result: {
        Name: stateName,
        Parameters: stateConfig.Parameters,
      },
      ResultPath: "$.State_Config",
      Next: stateName,
    };
  }

  genTaskFailureHandlerStates(TaskFailureHandler: any) {
    delete TaskFailureHandler.End;
    TaskFailureHandler.Next = this.DecoratorFlags.TaskFailureHandlerEndLabel;

    return {
      [this.DecoratorFlags.TaskFailureHandlerStartLabel]: {
        Type: "Pass",
        Next: this.DecoratorFlags.TaskFailureHandlerName,
      },
      [this.DecoratorFlags.TaskFailureHandlerName]: TaskFailureHandler,
      [this.DecoratorFlags.TaskFailureHandlerEndLabel]: {
        Type: "Fail",
      },
    };
  }

  resolveStateName(stateName: string, States = this.States) {
    return stateName;
  }

  //* ATTRIBUTE TRANSFORMS /////////////////////////////////////////////////////

  transformCatchConfig(catchConfig: any, States: Record<string, State>) {
    const catches = catchConfig.map((catchState) =>
      Object.assign({}, catchState, {
        Next: this.resolveStateName(catchState.Next, States),
      })
    );
    return catches;
  }

  transformRetryConfig(retryConfig: any, stateName: string) {
    const currentStepDefaultRetry = JSON.parse(JSON.stringify(DEFAULT_RETRY)); // deepcopy

    const retries = retryConfig.map((retryState) => {
      // remove this error type from the default retry
      currentStepDefaultRetry.ErrorEquals = currentStepDefaultRetry.ErrorEquals.filter(
        (e) => {
          return !retryState.ErrorEquals.includes(e);
        }
      );
      // add this retry to the final config
      return Object.assign({}, retryState);
    });

    // add any remaining default retries if enabled
    if (
      currentStepDefaultRetry.ErrorEquals.length >= 1 &&
      !this.isDefaultRetryDisabled(stateName)
    ) {
      retries.push(currentStepDefaultRetry);
    }

    return retries;
  }

  //* STEP TRANSFORMS //////////////////////////////////////////////////

  defaultTransformState(stateName, stateConfig, States) {
    let transformedConfig = Object.assign({}, stateConfig);
    if (!!stateConfig["Next"]) {
      transformedConfig = {
        ...transformedConfig,
        Next: this.resolveStateName(stateConfig.Next, States),
      };
    }
    return { [stateName]: transformedConfig };
  }

  transformChoiceState(stateName, stateConfig, States = this.States) {
    let choices: any[] = [];
    stateConfig.Choices.forEach((choice) => {
      choices.push(
        Object.assign({}, choice, {
          Next: this.resolveStateName(choice.Next, States),
        })
      );
    });
    return {
      [stateName]: Object.assign({}, stateConfig, { Choices: choices }),
    };
  }

  generateParametersForSoclessTask(
    state_name: string,
    handle_state_kwargs: Record<string, any>
  ) {
    const parameters: SoclessTaskStepParameters = {
      "execution_id.$": "$.execution_id",
      "artifacts.$": "$.artifacts",
      "errors.$": "$.errors",
      "results.$": "$.results",
      State_Config: {
        Name: state_name,
        Parameters: handle_state_kwargs,
      },
    };
    return parameters;
  }

  generateParametersForSoclessInteraction(
    state_name: string,
    handle_state_kwargs: Record<string, any>,
    function_name: string
  ) {
    const parameters = {
      FunctionName: function_name,
      Payload: {
        sfn_context: this.generateParametersForSoclessTask(
          state_name,
          handle_state_kwargs
        ),
        "task_token.$": "$$.Task.Token",
      },
    };
    return parameters;
  }

  transformTaskState(stateName: string, stateConfig, States, DecoratorFlags) {
    let output = {};
    let newConfig = Object.assign({}, stateConfig);
    if (!!newConfig["Next"]) {
      Object.assign(newConfig, {
        Next: this.resolveStateName(newConfig.Next, States),
      });
    }

    if (!!newConfig["Catch"]) {
      Object.assign(newConfig, {
        Catch: this.transformCatchConfig(newConfig.Catch, States),
      });
    }

    if (!!newConfig["Retry"]) {
      Object.assign(newConfig, {
        Retry: this.transformRetryConfig(newConfig.Retry, stateName),
      });
    } else if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(newConfig, { Retry: [DEFAULT_RETRY] });
    }

    if (
      DecoratorFlags.hasTaskFailureHandler === true &&
      stateName !== this.DecoratorFlags.TaskFailureHandlerName
    ) {
      let currentCatchConfig = newConfig.Catch || [];
      let handlerCatchConfig = [
        this.genTaskFailureHandlerCatchConfig(stateName),
      ];
      newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig];
    }

    const handle_state_parameters = newConfig.Parameters;
    if (handle_state_parameters) {
      newConfig.Parameters = this.generateParametersForSoclessTask(
        stateName,
        handle_state_parameters
      );
    }

    Object.assign(output, { [stateName]: newConfig });
    return output;
  }

  transformInteractionState(stateName, stateConfig, States, DecoratorFlags) {
    let output = {};
    let newConfig = Object.assign({}, stateConfig);

    if (!!stateConfig["Next"]) {
      Object.assign(newConfig, {
        Next: this.resolveStateName(stateConfig.Next, States),
      });
    }

    if (!!stateConfig["Catch"]) {
      Object.assign(newConfig, {
        Catch: this.transformCatchConfig(stateConfig.Catch, States),
      });
    }

    if (!!stateConfig["Retry"]) {
      Object.assign(newConfig, {
        Retry: this.transformRetryConfig(stateConfig.Retry, stateName),
      });
    } else if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(newConfig, { Retry: [DEFAULT_RETRY] });
    }

    if (
      DecoratorFlags.hasTaskFailureHandler === true &&
      stateName !== this.DecoratorFlags.TaskFailureHandlerName
    ) {
      let currentCatchConfig = newConfig.Catch || [];
      let handlerCatchConfig = [
        this.genTaskFailureHandlerCatchConfig(stateName),
      ];
      newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig];
    }

    newConfig.Parameters = this.generateParametersForSoclessInteraction(
      stateName,
      newConfig.Parameters,
      newConfig.Resource
    );
    newConfig.Resource = "arn:aws:states:::lambda:invoke.waitForTaskToken";
    newConfig.Type = "Task";

    Object.assign(output, { [stateName]: newConfig });
    return output;
  }

  transformParallelState(stateName, stateConfig, States, DecoratorFlags) {
    let Output = {};
    let { Branches, End, ...topLevel } = stateConfig;
    let helperStateName = `merge_${stateName.toLowerCase()}`.slice(0, 128);
    let helperState: HelperState = {
      Type: "Task",
      Resource: "${{self:custom.core.MergeParallelOutput}}",
      Catch: [],
    };

    if (
      DecoratorFlags.hasTaskFailureHandler === true &&
      stateName !== this.DecoratorFlags.TaskFailureHandlerName
    ) {
      // add catch for top level
      let currentCatchConfig = topLevel.Catch || [];
      let handlerCatchConfig = [
        this.genTaskFailureHandlerCatchConfig(stateName),
      ];
      topLevel.Catch = [...currentCatchConfig, ...handlerCatchConfig];

      // add catch and retries for merge output task
      helperState.Catch = [
        this.genTaskFailureHandlerCatchConfig(helperStateName),
      ];
    }

    if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(helperState, { Retry: [DEFAULT_RETRY] });
    }

    if (End === undefined) {
      Object.assign(helperState, {
        Next: this.resolveStateName(stateConfig.Next, States),
      });
    } else {
      Object.assign(helperState, { End: true });
    }

    Object.assign(Output, topLevel, { Next: helperStateName });

    const newBranches = Branches.map((branch) => {
      return {
        StartAt: this.resolveStateName(branch.StartAt, branch.States),
        States: this.transformStates(
          (States = branch.States),
          (DecoratorFlags = {})
        ),
      };
    });

    Object.assign(Output, { Branches: newBranches });
    return {
      [stateName]: Output,
      [helperStateName]: helperState,
    };
  }

  transformStates(States = this.States, DecoratorFlags = this.DecoratorFlags) {
    let output = {};
    Object.entries(States).forEach(([stateName, stateConfig]) => {
      switch (stateConfig.Type) {
        case "Choice":
          Object.assign(
            output,
            this.transformChoiceState(stateName, stateConfig, States)
          );
          break;
        case "Task":
          Object.assign(
            output,
            this.transformTaskState(
              stateName,
              stateConfig,
              States,
              DecoratorFlags
            )
          );
          break;
        case "Interaction":
          Object.assign(
            output,
            this.transformInteractionState(
              stateName,
              stateConfig,
              States,
              DecoratorFlags
            )
          );
          break;
        case "Parallel":
          Object.assign(
            output,
            this.transformParallelState(
              stateName,
              stateConfig,
              States,
              DecoratorFlags
            )
          );
          break;
        case "Pass":
        case "Wait":
        case "Succeed":
        case "Fail":
          Object.assign(
            output,
            this.defaultTransformState(stateName, stateConfig, States)
          );
          break;
        default:
          console.log(`Unknown Type: ${stateConfig.Type}`);
          break;
      }
    });
    return output;
  }

  buildLoggingConfiguration() {
    const logs_enabled = {
      LoggingConfiguration: {
        Destinations: [
          {
            CloudWatchLogsLogGroup: {
              LogGroupArn:
                "${{cf:socless-${{self:provider.stage}}.PlaybooksLogGroup}}",
            },
          },
        ],
        IncludeExecutionData: false,
        Level: "ALL",
      },
    };

    const logs_disabled = {};

    return this.apb_config.logging ? logs_enabled : logs_disabled;
  }

  generate_playbook_formatter_step(start_at_step_name: string) {
    const initial_step = {
      [PLAYBOOK_FORMATTER_STEP_NAME]: {
        Type: "Pass",
        Parameters: {
          "execution_id.$": "$.execution_id",
          "artifacts.$": "$.artifacts",
          results: {},
          errors: {},
        },
        Next: this.resolveStateName(start_at_step_name),
      },
    };

    return initial_step;
  }

  generate_playbook_setup_steps(start_at_step_name: string) {
    // Choice state checks if `artifacts` and `execution_id` exist in playbook input.
    // if yes, continue to regular playbook steps
    // if no, run lambda that sets up SOCless global state for this playbook, then continue to regular playbook
    const check_if_playbook_was_direct_executed = {
      [PLAYBOOK_DIRECT_INVOCATION_CHECK_STEP_NAME]: {
        Type: "Choice",
        Choices: [
          {
            And: [
              {
                Variable: "$.artifacts",
                IsPresent: true,
              },
              {
                Variable: "$.execution_id",
                IsPresent: true,
              },
              {
                Variable: "$.errors",
                IsPresent: false,
              },
              {
                Variable: "$.results",
                IsPresent: false,
              },
            ],
            Next: PLAYBOOK_FORMATTER_STEP_NAME,
          },
          {
            And: [
              {
                Variable: "$.artifacts",
                IsPresent: true,
              },
              {
                Variable: "$.execution_id",
                IsPresent: true,
              },
              {
                Variable: "$.errors",
                IsPresent: true,
              },
              {
                Variable: "$.results",
                IsPresent: true,
              },
            ],
            Next: start_at_step_name,
          },
        ],
        Default: PLAYBOOK_SETUP_STEP_NAME,
      },
    };

    const PLAYBOOK_SETUP_STEP = {
      [PLAYBOOK_SETUP_STEP_NAME]: {
        Type: "Task",
        Resource:
          "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:" +
          SOCLESS_CORE_LAMBDA_NAME_FOR_RUNNING_PLAYBOOK_SETUP,
        Parameters: {
          "execution_id.$": "$$.Execution.Name",
          "playbook_name.$": "$$.StateMachine.Name",
          "playbook_event_details.$": "$$.Execution.Input",
        },
        Next: start_at_step_name,
      },
    };

    const setup_steps = {
      ...check_if_playbook_was_direct_executed,
      ...PLAYBOOK_SETUP_STEP,
      ...this.generate_playbook_formatter_step(start_at_step_name),
    };

    return setup_steps;
  }
}