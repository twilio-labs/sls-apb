module.exports = {
    basis_playbook_input_json: {
        "artifacts": {},
        "errors": {},
        "parameters": {
            "Slack_User_For_Response": {
                "no_text": "No",
                "prompt_text": "Are you happy?",
                "receiver": "Await_User_Response",
                "target": "$.results.Validate_Username.name",
                "target_type": "user",
                "text": "Hi, are you happy?",
                "yes_text": "Yes"
            },
            "Await_User_Response": {},
            "Celebrate_With_User": {
                "message_template": "I'm happy too! Yay!",
                "target": "user",
                "target_type": "channel"
            },
            "Slack_User_Happiness": {
                "message_template": "I'm happy too! Yay!",
                "target": "user",
                "target_type": "channel"
            },
            "Order_Pizza_For_User": {
                "type": "bbq with bacon bits",
                "restaurant": "Five10 Pizza"
            },
            "Pour_Coffee_For_User": {
                "how": "coffee, sugar, cream"
            },
            "End_Cheer_Up": {
                "status": "done"
            }
        },
        "this": "start",
        "results": {}
    },

    basic_playbook_state_machine_output: {
        "Comment": "Sample Playbook to Geolocate an IP",
        "StartAt": "helper_slack_user_for_response",
        "States": {
            "helper_slack_user_for_response": {
                "Type": "Pass",
                "Result": "Slack_User_For_Response",
                "ResultPath": "$.this",
                "Next": "Slack_User_For_Response"
            },
            "Slack_User_For_Response": {
                "Type": "Task",
                "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                "Next": "helper_await_user_response"
            },
            "helper_await_user_response": {
                "Type": "Pass",
                "Result": "Await_User_Response",
                "ResultPath": "$.this",
                "Next": "Await_User_Response"
            },
            "Await_User_Response": {
                "Type": "Task",
                "Resource": "${{self:custom.core.AwaitMessageResponseActivity}}",
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
                "Next": "helper_celebrate_with_user"
            },
            "helper_celebrate_with_user": {
                "Type": "Pass",
                "Result": "Celebrate_With_User",
                "ResultPath": "$.this",
                "Next": "Celebrate_With_User"
            },
            "Celebrate_With_User": {
                "Type": "Task",
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
                "Next": "merge_parallel_cheer_user_up",
                "Branches": [
                    {
                        "StartAt": "helper_slack_user_happiness",
                        "States": {
                            "helper_slack_user_happiness": {
                                "Type": "Pass",
                                "Result": "Slack_User_Happiness",
                                "ResultPath": "$.this",
                                "Next": "Slack_User_Happiness"
                            },
                            "Slack_User_Happiness": {
                                "Type": "Task",
                                "Resource": "${{self:custom.slack.PromptForConfirmation}}",
                                "End": true
                            }
                        }
                    },
                    {
                        "StartAt": "helper_order_pizza_for_user",
                        "States": {
                            "helper_order_pizza_for_user": {
                                "Type": "Pass",
                                "Result": "Order_Pizza_For_User",
                                "ResultPath": "$.this",
                                "Next": "Order_Pizza_For_User"
                            },
                            "Order_Pizza_For_User": {
                                "Type": "Task",
                                "Resource": "${{self:custom.hubgrub.PlaceOrder}}",
                                "Next": "helper_pour_coffee_for_user"
                            },
                            "helper_pour_coffee_for_user": {
                                "Type": "Pass",
                                "Result": "Pour_Coffee_For_User",
                                "ResultPath": "$.this",
                                "Next": "Pour_Coffee_For_User"
                            },
                            "Pour_Coffee_For_User": {
                                "Type": "Task",
                                "Resource": "${{self:custom.iotBrewer.PourCoffee}}",
                                "End": true
                            }
                        }
                    }
                ]
            },
            "merge_parallel_cheer_user_up": {
                "Type": "Task",
                "Resource": "${{self:custom.core.MergeParallelOutput}}",
                "Next": "helper_end_cheer_up"
            },
            "helper_end_cheer_up": {
                "Type": "Pass",
                "Result": "End_Cheer_Up",
                "ResultPath": "$.this",
                "Next": "End_Cheer_Up"
            },
            "End_Cheer_Up": {
                "Type": "Task",
                "Resource": "${{self.custom.jira.TransitionIssue}}",
                "End": true
            }
        }
    }
}