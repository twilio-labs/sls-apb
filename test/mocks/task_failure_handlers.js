module.exports = {
    single_task_failure_handler_playbook: {
        "Playbook": "Test_TFH",
        "Comment": "mock tfh playbook",
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
                                "target": "U123456",
                                "target_type": "slack_id"
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
            "TaskFailureHandler": {
                "Type": "Task",
                "Parameters": {
                    "message_template": "Sorry, unable to complete this workflow! :(",
                    "target": "socless_errors",
                    "target_type": "channel"
                },
                "Resource": "${{self:custom.slack.SendMessage}}",
            },
        }
    }
}