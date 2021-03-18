import { StepFunction, State, TaskState, InteractionState } from "./stepFunction";
import { HelperState, PlaybookDefinition } from "./socless_psuedo_states";
import { PARSE_SELF_NAME, DEFAULT_RETRY, DECORATOR_FLAGS } from './constants'
import { PlaybookValidationError } from "./errors";

const parse_self_pattern = new RegExp(`(\\"${PARSE_SELF_NAME}\\()(.*)(\\)\\")`, 'g')

export class apb {

  apb_config: any;
  DecoratorFlags : any;
  States : Record<string, State>;
  StateMachine? : StepFunction
  Decorators : any
  PlaybookName : string
  StateMachineYaml : Object

  constructor(definition: PlaybookDefinition, apb_config = {}) {
    this.validateTopLevelKeys(definition)
    this.DecoratorFlags = {
      hasTaskFailureHandler: false,
      ...DECORATOR_FLAGS}
    this.apb_config = apb_config;

    this.States = {}
    this.PlaybookName = ""

    // this.StateMachine = {}      // Post-SOCless Step Functions State Machine dictionary
    this.StateMachineYaml = {} // Post-SOCless Cloudformation Yaml 

    this.transformStateMachine(definition)
  }

  validateTopLevelKeys(definition: PlaybookDefinition) {
    const REQUIRED_FIELDS = ['Playbook', 'Comment', 'StartAt', 'States']
    REQUIRED_FIELDS.forEach(key => {
      if (!definition[key]) throw new PlaybookValidationError(`Playbook definition does not have the required top-level key, '${key}'`)
    })
  }

  //* BOOLEAN CHECKS & Validators /////////////////////////////////////////////////////

  isStateIntegration(stateName: string, States = this.States) {
    if (States[stateName] === undefined) {
      throw new Error(`State ${stateName} does not exist in the States object`)
    }
    const state_to_check : State | TaskState | InteractionState = States[stateName]
    return ((state_to_check.Type === "Task" || state_to_check.Type === "Interaction") && !!state_to_check['Parameters'])
  }

  isDefaultRetryDisabled(stateName: string) {
    if (this.Decorators.DisableDefaultRetry) {
      const disable = this.Decorators.DisableDefaultRetry
      return disable.all || (disable.tasks && disable.tasks.includes(stateName))
    } else {
      return false
    }
  }

  validateTaskFailureHandlerDecorator(config: any) {
    if (config.Type === "Task" || config.Type === "Parallel") {
      return true
    } else {
      throw new Error("Decorator.TaskFailureHandler configured incorrectly. Must be a Task or Parallel state")
    }
  }

  taskErrorHandlerExists() {
    return this.Decorators.TaskFailureHandler && this.validateTaskFailureHandlerDecorator(this.Decorators.TaskFailureHandler)
  }

  //* STATE GENERATIONS /////////////////////////////////////////////////////

  genIntegrationHelperStateName(originalName: string) {
    return `helper_${originalName.toLowerCase()}`.slice(0, 128)
  }

  genTaskFailureHandlerCatchConfig(stateName: string) {
    return {
      "ErrorEquals": ["States.TaskFailed"],
      "ResultPath": `$.errors.${stateName}`,
      "Next": this.DecoratorFlags.TaskFailureHandlerStartLabel
    }
  }

  genHelperState(stateConfig: any, stateName: string) {
    return {
      Type: "Pass",
      Result: {
        "Name": stateName,
        "Parameters": stateConfig.Parameters
      },
      ResultPath: "$.State_Config",
      Next: stateName
    }
  }

  genTaskFailureHandlerStates(TaskFailureHandler: any) {
    delete TaskFailureHandler.End
    TaskFailureHandler.Next = this.DecoratorFlags.TaskFailureHandlerEndLabel

    return {
      [this.DecoratorFlags.TaskFailureHandlerStartLabel]: {
        "Type": "Pass",
        "Next": this.DecoratorFlags.TaskFailureHandlerName
      },
      [this.DecoratorFlags.TaskFailureHandlerName]: TaskFailureHandler,
      [this.DecoratorFlags.TaskFailureHandlerEndLabel]: {
        "Type": 'Fail'
      }
    }
  }

  resolveStateName(stateName: string, States = this.States) {
    if (this.isStateIntegration(stateName, States)) {
      return this.genIntegrationHelperStateName(stateName)
    } else {
      return stateName
    }
  }

  //* ATTRIBUTE TRANSFORMS /////////////////////////////////////////////////////

  transformCatchConfig(catchConfig: any, States: Record<string, State>) {
    const catches = catchConfig.map(catchState =>
      Object.assign({}, catchState, { Next: this.resolveStateName(catchState.Next, States) })
    )
    return catches
  }

  transformRetryConfig(retryConfig: any, stateName: string) {
    const currentStepDefaultRetry = JSON.parse(JSON.stringify(DEFAULT_RETRY)); // deepcopy

    const retries = retryConfig.map(retryState => {
      // remove this error type from the default retry
      currentStepDefaultRetry.ErrorEquals = currentStepDefaultRetry.ErrorEquals.filter(e => {
        return !retryState.ErrorEquals.includes(e)
      })
      // add this retry to the final config
      return Object.assign({}, retryState)
    })

    // add any remaining default retries if enabled
    if (currentStepDefaultRetry.ErrorEquals.length >= 1 && !this.isDefaultRetryDisabled(stateName)) {
      retries.push(currentStepDefaultRetry)
    }

    return retries
  }

  //* STEP TRANSFORMS //////////////////////////////////////////////////

  defaultTransformState(stateName, stateConfig, States) {
    let transformedConfig = Object.assign({}, stateConfig)
    if (!!stateConfig["Next"]) {
      transformedConfig = { ...transformedConfig, Next: this.resolveStateName(stateConfig.Next, States) }
    }
    return { [stateName]: transformedConfig }
  }

  transformChoiceState(stateName, stateConfig, States = this.States) {
    let choices: any[] = []
    stateConfig.Choices.forEach(choice => {
      choices.push(Object.assign({}, choice, { Next: this.resolveStateName(choice.Next, States) }))
    })
    return {
      [stateName]: Object.assign({}, stateConfig, { Choices: choices })
    }
  }

  transformTaskState(stateName: string, stateConfig, States, DecoratorFlags) {
    let output = {}
    let newConfig = Object.assign({}, stateConfig)
    if (!!stateConfig['Next']) {
      Object.assign(newConfig, { Next: this.resolveStateName(stateConfig.Next, States) })
    }

    if (!!stateConfig['Catch']) {
      Object.assign(newConfig, { Catch: this.transformCatchConfig(stateConfig.Catch, States) })
    }

    if (!!stateConfig['Retry']) {
      Object.assign(newConfig, { Retry: this.transformRetryConfig(stateConfig.Retry, stateName) })
    } else if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(newConfig, { "Retry": [DEFAULT_RETRY] })
    }

    if (DecoratorFlags.hasTaskFailureHandler === true && stateName !== this.DecoratorFlags.TaskFailureHandlerName) {
      let currentCatchConfig = newConfig.Catch || []
      let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)]
      newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig]
    }

    if (this.isStateIntegration(stateName, States)) {
      // Generate helper state
      const helperState = this.genHelperState(stateConfig, stateName)
      let helperStateName = this.genIntegrationHelperStateName(stateName)
      Object.assign(output, { [helperStateName]: helperState })
    }

    delete newConfig['Parameters']
    Object.assign(output, { [stateName]: newConfig })
    return output
  }

  transformInteractionState(stateName, stateConfig, States, DecoratorFlags) {
    let output = {}
    let newConfig = Object.assign({}, stateConfig)

    if (!!stateConfig['Next']) {
      Object.assign(newConfig, { Next: this.resolveStateName(stateConfig.Next, States) })
    }

    if (!!stateConfig['Catch']) {
      Object.assign(newConfig, { Catch: this.transformCatchConfig(stateConfig.Catch, States) })
    }

    if (!!stateConfig['Retry']) {
      Object.assign(newConfig, { Retry: this.transformRetryConfig(stateConfig.Retry, stateName) })
    } else if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(newConfig, { "Retry": [DEFAULT_RETRY] })
    }

    if (DecoratorFlags.hasTaskFailureHandler === true && stateName !== this.DecoratorFlags.TaskFailureHandlerName) {
      let currentCatchConfig = newConfig.Catch || []
      let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)]
      newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig]
    }

    if (this.isStateIntegration(stateName, States)) {
      // Generate helper state and set Invoke lambda resource
      const helperState = this.genHelperState(stateConfig, stateName)
      let helperStateName = this.genIntegrationHelperStateName(stateName)
      Object.assign(output, { [helperStateName]: helperState })
    }

    // Convert Interaction to Task
    newConfig.Parameters = {
      FunctionName: newConfig.Resource,
      Payload: {
        "sfn_context.$": "$",
        "task_token.$": "$$.Task.Token"
      }
    }
    newConfig.Resource = "arn:aws:states:::lambda:invoke.waitForTaskToken"
    newConfig.Type = "Task"

    Object.assign(output, { [stateName]: newConfig })
    return output
  }

  transformParallelState(stateName, stateConfig, States, DecoratorFlags) {
    let Output = {}
    let { Branches, End, ...topLevel } = stateConfig
    let helperStateName = `merge_${stateName.toLowerCase()}`.slice(0, 128)
    let helperState: HelperState = {
      Type: "Task",
      Resource: "${{self:custom.core.MergeParallelOutput}}",
      Catch: []
    }

    if (DecoratorFlags.hasTaskFailureHandler === true && stateName !== this.DecoratorFlags.TaskFailureHandlerName) {
      // add catch for top level
      let currentCatchConfig = topLevel.Catch || []
      let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)]
      topLevel.Catch = [...currentCatchConfig, ...handlerCatchConfig]

      // add catch and retries for merge output task
      helperState.Catch = [this.genTaskFailureHandlerCatchConfig(helperStateName)]
    }

    if (!this.isDefaultRetryDisabled(stateName)) {
      Object.assign(helperState, { "Retry": [DEFAULT_RETRY] })
    }

    if (End === undefined) {
      Object.assign(helperState, { Next: this.resolveStateName(stateConfig.Next, States) })
    } else {
      Object.assign(helperState, { End: true })
    }


    Object.assign(Output, topLevel, { Next: helperStateName })

    const newBranches = Branches.map(branch => {
      return {
        StartAt: this.resolveStateName(branch.StartAt, branch.States),
        States: this.transformStates(States = branch.States, DecoratorFlags = {})
      }
    })

    Object.assign(Output, { Branches: newBranches })
    return {
      [stateName]: Output,
      [helperStateName]: helperState
    }
  }


  transformStates(States = this.States, DecoratorFlags = this.DecoratorFlags) {
    let output = {}
    Object.entries(States).forEach(([stateName, stateConfig]) => {
      switch (stateConfig.Type) {
        case "Choice": Object.assign(output, this.transformChoiceState(stateName, stateConfig, States))
          break;
        case "Task": Object.assign(output, this.transformTaskState(stateName, stateConfig, States, DecoratorFlags))
          break;
        case "Interaction": Object.assign(output, this.transformInteractionState(stateName, stateConfig, States, DecoratorFlags))
          break;
        case "Parallel": Object.assign(output, this.transformParallelState(stateName, stateConfig, States, DecoratorFlags))
          break;
        case "Pass":
        case "Wait":
        case "Succeed":
        case "Fail": Object.assign(output, this.defaultTransformState(stateName, stateConfig, States))
          break
        default: console.log(`Unknown Type: ${stateConfig.Type}`)
          break;
      }
    })
    return output
  }

  buildLoggingConfiguration() {
    const logs_enabled = {
      LoggingConfiguration: {
        Destinations: [
          {
            CloudWatchLogsLogGroup: {
              LogGroupArn: "${{cf:socless-${{self:provider.stage}}.PlaybooksLogGroup}}"
            }
          }
        ],
        IncludeExecutionData: false,
        Level: "ALL"
      }
    }

    const logs_disabled = {};

    return this.apb_config.logging ? logs_enabled : logs_disabled;
  }

  transformStateMachine(definition: PlaybookDefinition) {
    let { Playbook, States, Decorators, ...topLevel } = definition

    this.Decorators = Decorators || {}

    if (this.Decorators) {
      // Check for TaskFailureHandler Decorator and modify 'States' accordingly
      if (this.taskErrorHandlerExists()) {
        this.DecoratorFlags.hasTaskFailureHandler = true
        Object.assign(States, this.genTaskFailureHandlerStates(this.Decorators.TaskFailureHandler))
      } else {
        this.DecoratorFlags.hasTaskFailureHandler = false
      }
    }

    this.States = States
    this.PlaybookName = Playbook
    this.StateMachine = {
      ...topLevel,
      States: this.transformStates(),
      StartAt: this.resolveStateName(topLevel.StartAt)
    }
    // Object.assign(this.StateMachine, topLevel, { States: this.transformStates(), StartAt: this.resolveStateName(topLevel.StartAt) })

    this.StateMachineYaml = {
      Resources: {
        [this.PlaybookName]: {
          Type: "AWS::StepFunctions::StateMachine",
          Properties: {
            RoleArn: "${{cf:socless-${{self:provider.stage}}.StatesExecutionRoleArn}}",
            StateMachineName: this.PlaybookName,
            DefinitionString: {
              "Fn::Sub": JSON.stringify(this.StateMachine, null, 4).replace(parse_self_pattern, "$2")
            },
            ...this.buildLoggingConfiguration()
          }
        }
      },
      Outputs: {
        [this.PlaybookName]: {
          Description: topLevel.Comment,
          Value: {
            Ref: this.PlaybookName
          }
        }
      }
    }
  }
}
