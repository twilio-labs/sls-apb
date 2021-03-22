"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECORATOR_FLAGS = exports.DEFAULT_RETRY = exports.PARSE_SELF_NAME = void 0;
exports.PARSE_SELF_NAME = "apb_render_nonstring_value";
exports.DEFAULT_RETRY = Object.freeze({
    "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
    "IntervalSeconds": 2,
    "MaxAttempts": 6,
    "BackoffRate": 2
});
exports.DECORATOR_FLAGS = Object.freeze({
    TaskFailureHandlerName: '_Handle_Task_Failure',
    TaskFailureHandlerStartLabel: '_Task_Failed',
    TaskFailureHandlerEndLabel: '_End_With_Failure'
});
