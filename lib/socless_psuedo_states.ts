import { BaseState, State, StepFunction } from "./stepFunction";

export interface HelperState extends BaseState {
    Resource: string;
}

export interface HelperStateFinalized extends BaseState {
    Type: "Pass";
    Result: {
        Name: string,
        Parameters: Record<string, any>
    },
    ResultPath: "$.State_Config",
    Next: string;
}

export interface PlaybookDefinition {
    Playbook: string;
    States: Record<string, State>;
    Decorators: Record<string, any>;
    StartAt: string;
    Comment?: string;
}

export interface SoclessTaskStepParameters {
    "execution_id.$" : "$.execution_id";
    "artifacts.$" : "$.artifacts";
    "errors.$" : "$.errors";
    "results.$" : "$.results";
    "State_Config" : {
        "Name" : string,
        "Parameters" : Record<string, any>,
    };
}

export interface SoclessInteractionStepParameters {
    FunctionName: string; // AWS Lambda Resource
    Payload: {
        "sfn_context.$" : SoclessTaskStepParameters,
        "task_token.$": "$$.Task.Token",
    };
}