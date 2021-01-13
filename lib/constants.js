module.exports = Object.freeze({
    PARSE_SELF_NAME : "render_nonstring_value",
    DEFAULT_RETRY : {
        "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
        "IntervalSeconds": 2,
        "MaxAttempts": 6,
        "BackoffRate": 2
    },
    DECORATOR_FLAGS : {
        TaskFailureHandlerName: '_Handle_Task_Failure',
        TaskFailureHandlerStartLabel: '_Task_Failed',
        TaskFailureHandlerEndLabel: '_End_With_Failure'
    }
});
