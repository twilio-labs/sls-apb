export const PARSE_SELF_NAME = "apb_render_nonstring_value";
export const DEFAULT_RETRY = Object.freeze({
    "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
    "IntervalSeconds": 2,
    "MaxAttempts": 6,
    "BackoffRate": 2
})
export const DECORATOR_FLAGS = Object.freeze({
        TaskFailureHandlerName: '_Handle_Task_Failure',
        TaskFailureHandlerStartLabel: '_Task_Failed',
        TaskFailureHandlerEndLabel: '_End_With_Failure'
    })