export interface StepFunction {
    StartAt: string;
    States: Record<string, State| any>;
    Playbook?: string;
    Comment?: string;
}

export interface BaseState {
    Type: string;
    Next?: string;
    Catch?: any[];
    Retry?: any[];
    End?: boolean;
}

export interface TaskState extends BaseState {
    Type: "Task";
    Resource: string;
    Parameters?: Record<string, any>
}

interface FailState extends BaseState {
    Type: "Fail";
    Cause?: string;
    Error?: string;
}

interface SucceedState extends BaseState {
    Type: "Succeed";
}

interface PassState extends BaseState {
    Type: "Pass";
}

interface WaitState extends BaseState {
    Type: "Wait";
    Seconds: Number;
}

interface MapState extends BaseState {
    Type: "Map";
    Iterator: StepFunction;
}

interface ChoiceState extends BaseState {
    Type: "Choice";
    Choices?: Operator[];
    Default: string;
}

export interface Operator {
    Variable?: string;
    Next?: string;
    And?: Operator[];
    Or?: Operator[];
    Not?: Operator;
    BooleanEquals?: boolean;
    NumericEquals?: number;
    NumericGreaterThan?: number;
    NumericGreaterThanEquals?: number;
    NumericLessThan?: number;
    NumericLessThanEquals?: number;
    StringEquals?: string;
    StringGreaterThan?: string;
    StringGreaterThanEquals?: string;
    StringLessThan?: string;
    StringLessThanEquals?: string;
    TimestampEquals?: string;
    TimestampGreaterThan?: string;
    TimestampGreaterThanEquals?: string;
    TimestampLessThan?: string;
    TimestampLessThanEquals?: string;
}

interface ParallelState extends BaseState {
    Type: "Parallel";
    Branches: StepFunction[];
}

export interface InteractionState extends BaseState {
    Type: "Interaction";
    Resource: string;
    Parameters: Record<string, any>
}

export type State = TaskState | FailState | SucceedState | MapState | ChoiceState | ParallelState | PassState | InteractionState | WaitState;
