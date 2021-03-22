module.exports = {
    pb_parallel_and_interaction: {
        "Playbook": "Check_User_Happiness",
        "Comment": "Sample Playbook to Geolocate an IP",
        "StartAt": "New_Interaction_State",
        "States": {
            "New_Interaction_State": {
                "Type": "Interaction",
                "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                "Parameters": {
                    "no_text": "No",
                    "prompt_text": "Are you happy?",
                    "receiver": "Slack_User_For_Response",
                    "target": "$.results.Validate_Username.name",
                    "target_type": "user",
                    "text": "Hi, are you happy?",
                    "yes_text": "Yes"
                },
                "Next": "Slack_User_For_Response",
            },
            "Slack_User_For_Response": {
                "Type": "Task",
                "Parameters": {
                    "no_text": "No",
                    "prompt_text": "Are you happy?",
                    "receiver": "Await_User_Response",
                    "target": "$.results.Validate_Username.name",
                    "target_type": "user",
                    "text": "Hi, are you happy?",
                    "yes_text": "Yes"
                },
                "Catch": [
                    {
                        "ErrorEquals": ["States.ALL"],
                        "Next": "Is_User_Happy"
                    }
                ],
                "Retry": [
                    {
                        "ErrorEquals": ["ConnectionError"],
                        "IntervalSeconds": 30,
                        "MaxAttempts": 2,
                        "BackoffRate": 2
                    }
                ],
                "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                "Next": "Await_User_Response"
            },
            "Await_User_Response": {
                "Type": "Task",
                "Resource": "${{self:custom.core.AwaitMessageResponseActivity}}",
                "Retry": [
                    {
                        "ErrorEquals": ["Lambda.AWSLambdaException", "Lambda.SdkClientException"],
                        "IntervalSeconds": 2,
                        "MaxAttempts": 6,
                        "BackoffRate": 2
                    }
                ],
                "Next": "Is_User_Happy"
            },
            "Is_User_Happy": {
                "Type": "Choice",
                "Choices": [
                    {
                        "Variable": "$.results.result",
                        "StringEquals": "false",
                        "Next": "User_Is_Not_Happy"
                    }
                ],
                "Default": "User_Is_Happy"
            },
            "User_Is_Happy": {
                "Type": "Pass",
                "Next": "Celebrate_With_User"
            },
            "Celebrate_With_User": {
                "Type": "Task",
                "Parameters": {
                    "message_template": "I'm happy too! Yay!",
                    "target": "user",
                    "target_type": "channel"
                },
                "Resource": "${{self:custom.slack.SendMessage}}",
                "Next": "Mark_As_Success"
            },
            "Mark_As_Success": {
                "Type": "Succeed"
            },
            "User_Is_Not_Happy": {
                "Type": "Pass",
                "Next": "Parallel_Cheer_User_Up"
            },
            "Parallel_Cheer_User_Up": {
                "Type": "Parallel",
                "Next": "End_Cheer_Up",
                "Branches": [{
                    "StartAt": "Slack_User_Happiness",
                    "States": {
                        "Slack_User_Happiness": {
                            "Type": "Task",
                            "Parameters": {
                                "message_template": "I'm happy too! Yay!",
                                "target": "user",
                                "target_type": "channel"
                            },
                            "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                            "End": true
                        }
                    }
                },
                {
                    "StartAt": "Order_Pizza_For_User",
                    "States": {
                        "Order_Pizza_For_User": {
                            "Type": "Task",
                            "Parameters": {
                                "type": "bbq with bacon bits",
                                "restaurant": "Five10 Pizza"
                            },
                            "Resource": "${{self:custom.hubgrub.PlaceOrder}}",
                            "Next": "Pour_Coffee_For_User"
                        },
                        "Pour_Coffee_For_User": {
                            "Type": "Task",
                            "Parameters": {
                                "how": "coffee, sugar, cream"
                            },
                            "Resource": "${{self:custom.iotBrewer.PourCoffee}}",
                            "End": true
                        }
                    }
                }
                ]
            },
            "End_Cheer_Up": {
                "Type": "Task",
                "Parameters": {
                    "status": "done"
                },
                "Resource": "${{self.custom.jira.TransitionIssue}}",
                "End": true
            }
        },
        "Decorators": {
            "DisableDefaultRetry": {
                "tasks": ["End_Cheer_Up"],
                "all": false
            }
        }
    },
    expected_output_pb_parallel_and_interaction: {
        "Comment": "Sample Playbook to Geolocate an IP",
        "StartAt": "PLAYBOOK_FORMATTER",
        "States": {
        "Await_User_Response": {
            "Next": "Is_User_Happy",
            "Resource": "${{self:custom.core.AwaitMessageResponseActivity}}",
            "Retry": [
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            },
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.ServiceException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            }
            ],
            "Type": "Task"
        },
        "Celebrate_With_User": {
            "Next": "Mark_As_Success",
            "Parameters": {
            "State_Config": {
                "Name": "Celebrate_With_User",
                "Parameters": {
                "message_template": "I'm happy too! Yay!",
                "target": "user",
                "target_type": "channel"
                }
            },
            "artifacts.$": "$.artifacts",
            "errors.$": "$.errors",
            "execution_id.$": "$.execution_id",
            "results.$": "$.results",
            },
            "Resource": "${{self:custom.slack.SendMessage}}",
            "Retry": [
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            }
            ],
            "Type": "Task"
        },
        "End_Cheer_Up": {
            "End": true,
            "Parameters": {
            "State_Config": {
                "Name": "End_Cheer_Up",
                "Parameters": {
                "status": "done"
                }
            },
            "artifacts.$": "$.artifacts",
            "errors.$": "$.errors",
            "execution_id.$": "$.execution_id",
            "results.$": "$.results",
            },
            "Resource": "${{self.custom.jira.TransitionIssue}}",
            "Type": "Task"
        },
        "Is_User_Happy": {
            "Choices": [
            {
                "Next": "User_Is_Not_Happy",
                "StringEquals": "false",
                "Variable": "$.results.result"
            }
            ],
            "Default": "User_Is_Happy",
            "Type": "Choice"
        },
        "Mark_As_Success": {
            "Type": "Succeed"
        },
        "New_Interaction_State": {
            "Next": "Slack_User_For_Response",
            "Parameters": {
            "FunctionName": "${{self:custom.slack.PromptForConfirmation}}",
            "Payload": {
                "sfn_context.$": "$",
                "task_token.$": "$$.Task.Token"
            }
            },
            "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
            "Retry": [
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            }
            ],
            "Type": "Task"
        },
        "PLAYBOOK_FORMATTER": {
            "Next": "helper_new_interaction_state",
            "Parameters": {
            "artifacts.$": "$.artifacts",
            "errors": {},
            "execution_id.$": "$.execution_id",
            "results": {}
            },
            "Type": "Pass"
        },
        "Parallel_Cheer_User_Up": {
            "Branches": [
            {
                "StartAt": "Slack_User_Happiness",
                "States": {
                "Slack_User_Happiness": {
                    "End": true,
                    "Parameters": {
                    "State_Config": {
                        "Name": "Slack_User_Happiness",
                        "Parameters": {
                        "message_template": "I'm happy too! Yay!",
                        "target": "user",
                        "target_type": "channel"
                        }
                    },
                    "artifacts.$": "$.artifacts",
                    "errors.$": "$.errors",
                    "execution_id.$": "$.execution_id",
                    "results.$": "$.results"
                    },
                    "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                    "Retry": [
                    {
                        "BackoffRate": 2,
                        "ErrorEquals": [
                        "Lambda.ServiceException",
                        "Lambda.AWSLambdaException",
                        "Lambda.SdkClientException"
                        ],
                        "IntervalSeconds": 2,
                        "MaxAttempts": 6
                    }
                    ],
                    "Type": "Task"
                }
                }
            },
            {
                "StartAt": "Order_Pizza_For_User",
                "States": {
                "Order_Pizza_For_User": {
                    "Next": "Pour_Coffee_For_User",
                    "Parameters": {
                    "State_Config": {
                        "Name": "Order_Pizza_For_User",
                        "Parameters": {
                        "restaurant": "Five10 Pizza",
                        "type": "bbq with bacon bits"
                        }
                    },
                    "artifacts.$": "$.artifacts",
                    "errors.$": "$.errors",
                    "execution_id.$": "$.execution_id",
                    "results.$": "$.results"
                    },
                    "Resource": "${{self:custom.hubgrub.PlaceOrder}}",
                    "Retry": [
                    {
                        "BackoffRate": 2,
                        "ErrorEquals": [
                        "Lambda.ServiceException",
                        "Lambda.AWSLambdaException",
                        "Lambda.SdkClientException"
                        ],
                        "IntervalSeconds": 2,
                        "MaxAttempts": 6
                    }
                    ],
                    "Type": "Task"
                },
                "Pour_Coffee_For_User": {
                    "End": true,
                    "Parameters": {
                    "State_Config": {
                        "Name": "Pour_Coffee_For_User",
                        "Parameters": {
                        "how": "coffee, sugar, cream"
                        }
                    },
                    "artifacts.$": "$.artifacts",
                    "errors.$": "$.errors",
                    "execution_id.$": "$.execution_id",
                    "results.$": "$.results"
                    },
                    "Resource": "${{self:custom.iotBrewer.PourCoffee}}",
                    "Retry": [
                    {
                        "BackoffRate": 2,
                        "ErrorEquals": [
                        "Lambda.ServiceException",
                        "Lambda.AWSLambdaException",
                        "Lambda.SdkClientException"
                        ],
                        "IntervalSeconds": 2,
                        "MaxAttempts": 6
                    }
                    ],
                    "Type": "Task"
                }
                }
            }
            ],
            "Next": "merge_parallel_cheer_user_up",
            "Type": "Parallel"
        },
        "Slack_User_For_Response": {
            "Catch": [
            {
                "ErrorEquals": [
                "States.ALL"
                ],
                "Next": "Is_User_Happy"
            }
            ],
            "Next": "Await_User_Response",
            "Parameters": {
            "State_Config": {
                "Name": "Slack_User_For_Response",
                "Parameters": {
                "no_text": "No",
                "prompt_text": "Are you happy?",
                "receiver": "Await_User_Response",
                "target": "$.results.Validate_Username.name",
                "target_type": "user",
                "text": "Hi, are you happy?",
                "yes_text": "Yes"
                }
            },
            "artifacts.$": "$.artifacts",
            "errors.$": "$.errors",
            "execution_id.$": "$.execution_id",
            "results.$": "$.results",
            },
            "Resource": "${{self:custom.slack.PromptForConfirmation}}",
            "Retry": [
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "ConnectionError"
                ],
                "IntervalSeconds": 30,
                "MaxAttempts": 2
            },
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            }
            ],
            "Type": "Task"
        },
        "User_Is_Happy": {
            "Next": "Celebrate_With_User",
            "Type": "Pass"
        },
        "User_Is_Not_Happy": {
            "Next": "Parallel_Cheer_User_Up",
            "Type": "Pass"
        },
        "helper_new_interaction_state": {
            "Next": "New_Interaction_State",
            "Result": {
            "Name": "New_Interaction_State",
            "Parameters": {
                "no_text": "No",
                "prompt_text": "Are you happy?",
                "receiver": "Slack_User_For_Response",
                "target": "$.results.Validate_Username.name",
                "target_type": "user",
                "text": "Hi, are you happy?",
                "yes_text": "Yes"
            }
            },
            "ResultPath": "$.State_Config",
            "Type": "Pass"
        },
        "merge_parallel_cheer_user_up": {
            "Catch": [],
            "Next": "End_Cheer_Up",
            "Resource": "${{self:custom.core.MergeParallelOutput}}",
            "Retry": [
            {
                "BackoffRate": 2,
                "ErrorEquals": [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6
            }
            ],
            "Type": "Task"
        }
        }
    },
    pb_parse_nonstring: {
        "Playbook": "testing_non_string_renderer",
        "Comment": "mock nonstring renderer playbook",
        "StartAt": "Celebrate_With_User",
        "States": {
            "Celebrate_With_User": {
                "Type": "Task",
                "Parameters": {
                    "message_template": "I'm happy too! Yay!",
                    "target": "U123456",
                    "target_type": "slack_id"
                },
                "Resource": "${{self:custom.slack.SendMessage}}",
                "Next": "Wait_24_Hour"
            },
            "Wait_24_Hour" : {
                "Type" : "Wait",
                "Seconds" : "apb_render_nonstring_value(${{self:custom.Wait_24_Hour_Config.${{self:provider.stage}}}})",
                "Next": "End_Cheer_Up"
            },
            "End_Cheer_Up": {
                "Type": "Task",
                "Parameters": {
                    "status": "done"
                },
                "Resource": "${{self.custom.jira.TransitionIssue}}",
                "End": true
            }
        }
    }
}