module.exports = {
    socless_slack_integration_test_playbook : {
        "Playbook": "SoclessSlackIntegrationTest",
        "Comment": "Test all socless-slack lambda functions",
        "StartAt": "Send_Message_To_Channel",
        "States": {
            "Send_Message_To_Channel": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SendMessage.name}}",
                "Parameters": {
                    "target": "$.artifacts.event.details.existing_channel_name",
                    "target_type": "channel",
                    "message_template": "Beginning SoclessSlackIntegrationTest in ${AWS::Region}"
                },
                "Next": "Wait_A"
            },
            "Wait_A": {
                "Type": "Wait",
                "Seconds": 5,
                "Next": "Set_Channel_Topic"
            },
            "Set_Channel_Topic": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SetChannelTopic.name}}",
                "Parameters": {
                    "channel_id": "$.results.Send_Message_To_Channel.slack_id",
                    "topic": "set the channel topic: Our dev/null channel, you should probably mute this. Good for writing automated tests that post to Slack"
                },
                "Next": "Wait_B"
            },
            "Wait_B": {
                "Type": "Wait",
                "Seconds": 5,
                "Next": "Find_User_via_Username"
            },
            "Find_User_via_Username": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.FindUser.name}}",
                "Parameters": {
                    "username": "$.artifacts.event.details.username_target"
                },
                "Next": "Was_User_Found_via_Username"
            },
            "Was_User_Found_via_Username": {
                "Type": "Choice",
                "Choices": [
                    {
                        "Variable": "$.results.result",
                        "StringEquals": "true",
                        "Next": "Find_User_via_Slack_ID"
                    },
                    {
                        "Variable": "$.results.result",
                        "StringEquals": "false",
                        "Next": "FAILED_TEST"
                    }
                ]
            },
            "Find_User_via_Slack_ID": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.FindUser.name}}",
                "Parameters": {
                    "slack_id": "$.results.Find_User_via_Username.id"
                },
                "Next": "Was_User_Found_via_Slack_ID"
            },
            "Was_User_Found_via_Slack_ID": {
                "Type": "Choice",
                "Choices": [
                    {
                        "Variable": "$.results.result",
                        "StringEquals": "true",
                        "Next": "Check_User_In_Channel"
                    },
                    {
                        "Variable": "$.results.result",
                        "StringEquals": "false",
                        "Next": "FAILED_TEST"
                    }
                ]
            },
            "Check_User_In_Channel": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.CheckIfUserInChannel.name}}",
                "Parameters": {
                    "target_channel_id": "$.results.Send_Message_To_Channel.slack_id",
                    "user_id": "$.results.Find_User_via_Slack_ID.id"
                },
                "Next": "Was_User_In_Channel"
            },
            "Was_User_In_Channel": {
                "Type": "Choice",
                "Choices": [
                    {
                        "Variable": "$.results.ok",
                        "BooleanEquals": true,
                        "Next": "Send_Message_DM"
                    },
                    {
                        "Variable": "$.results.result",
                        "BooleanEquals": false,
                        "Next": "FAILED_TEST"
                    }
                ]
            },
            "Send_Message_DM": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SendMessage.name}}",
                "Parameters": {
                    "target": "$.artifacts.event.details.username_target",
                    "target_type": "user",
                    "message_template": "Hello from SoclessSlackIntegrationTest in ${AWS::Region}"
                },
                "Next": "Wait_C"
            },
            "Wait_C": {
                "Type": "Wait",
                "Seconds": 5,
                "Next": "Prompt_For_Confirmation"
            },
            "Prompt_For_Confirmation": {
                "Type": "Interaction",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.PromptForConfirmation.name}}",
                "Parameters": {
                    "prompt_text": "Tesing PromptForConfirmation",
                    "text": "This will timeout in 30 seconds and advance to next step in test",
                    "target": "$.artifacts.event.details.existing_channel_id",
                    "target_type": "slack_id"
                },
                "TimeoutSeconds": 40,
                "Catch": [
                    {
                        "ErrorEquals": [
                            "States.Timeout"
                        ],
                        "ResultPath": "$.errors.Prompt_For_Confirmation",
                        "Next": "Wait_D"
                    }
                ],
                "Next": "Wait_D"
            },
            "Wait_D": {
                "Type": "Wait",
                "Seconds": 5,
                "Next": "Prompt_For_Response"
            },
            "Prompt_For_Response": {
                "Type": "Interaction",
                "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.PromptForResponse.name}}",
                "Parameters": {
                    "message_template": "Testing PromptForConfirmation \n This will timeout in 30 seconds and advance to next step in test",
                    "target": "$.artifacts.event.details.existing_channel_id",
                    "target_type": "slack_id",
                    "response_desc": "mm-dd-yyyy"
                },
                "TimeoutSeconds": 40,
                "Catch": [
                    {
                        "ErrorEquals": [
                            "States.Timeout"
                        ],
                        "ResultPath": "$.errors.Slack_User_For_Return_Date",
                        "Next": "Close_Investigation"
                    }
                ],
                "Next": "Close_Investigation"
            },
            "FAILED_TEST": {
                "Type": "Fail"
            },
            "Close_Investigation": {
                "Type": "Task",
                "Resource": "${{self:custom.core.SetInvestigationStatus}}",
                "Parameters": {
                    "investigation_id": "$.artifacts.event.investigation_id",
                    "status": "closed"
                },
                "End": true
            }
        }
    },
    expected_state_machine_socless_slack_integration_test_playbook: { "Comment" :"Test all socless-slack lambda functions", "StartAt":"Was_Playbook_Direct_Executed","States":{"Was_Playbook_Direct_Executed":{"Type":"Choice","Choices":[{"And":[{"Variable":"$.artifacts","IsPresent":true},{"Variable":"$.execution_id","IsPresent":true},{"Variable":"$.errors","IsPresent":false},{"Variable":"$.results","IsPresent":false}],"Next":"PLAYBOOK_FORMATTER"},{"And":[{"Variable":"$.artifacts","IsPresent":true},{"Variable":"$.execution_id","IsPresent":true},{"Variable":"$.errors","IsPresent":true},{"Variable":"$.results","IsPresent":true}],"Next":"Send_Message_To_Channel"}],"Default":"Setup_Socless_Global_State"},"Setup_Socless_Global_State":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:_socless_setup_global_state_for_direct_invoked_playbook","Parameters":{"execution_id.$":"$$.Execution.Name","playbook_name.$":"$$.StateMachine.Name","playbook_event_details.$":"$$.Execution.Input"},"Next":"Send_Message_To_Channel"},"PLAYBOOK_FORMATTER":{"Type":"Pass","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","results":{},"errors":{}},"Next":"Send_Message_To_Channel"},"Send_Message_To_Channel":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SendMessage.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Send_Message_To_Channel","Parameters":{"target":"$.artifacts.event.details.existing_channel_name","target_type":"channel","message_template":"Beginning SoclessSlackIntegrationTest in ${AWS::Region}"}}},"Next":"Wait_A","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Wait_A":{"Type":"Wait","Seconds":5,"Next":"Set_Channel_Topic"},"Set_Channel_Topic":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SetChannelTopic.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Set_Channel_Topic","Parameters":{"channel_id":"$.results.Send_Message_To_Channel.slack_id","topic":"set the channel topic: Our dev/null channel, you should probably mute this. Good for writing automated tests that post to Slack"}}},"Next":"Wait_B","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Wait_B":{"Type":"Wait","Seconds":5,"Next":"Find_User_via_Username"},"Find_User_via_Username":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.FindUser.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Find_User_via_Username","Parameters":{"username":"$.artifacts.event.details.username_target"}}},"Next":"Was_User_Found_via_Username","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Was_User_Found_via_Username":{"Type":"Choice","Choices":[{"Variable":"$.results.result","StringEquals":"true","Next":"Find_User_via_Slack_ID"},{"Variable":"$.results.result","StringEquals":"false","Next":"FAILED_TEST"}]},"Find_User_via_Slack_ID":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.FindUser.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Find_User_via_Slack_ID","Parameters":{"slack_id":"$.results.Find_User_via_Username.id"}}},"Next":"Was_User_Found_via_Slack_ID","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Was_User_Found_via_Slack_ID":{"Type":"Choice","Choices":[{"Variable":"$.results.result","StringEquals":"true","Next":"Check_User_In_Channel"},{"Variable":"$.results.result","StringEquals":"false","Next":"FAILED_TEST"}]},"Check_User_In_Channel":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.CheckIfUserInChannel.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Check_User_In_Channel","Parameters":{"target_channel_id":"$.results.Send_Message_To_Channel.slack_id","user_id":"$.results.Find_User_via_Slack_ID.id"}}},"Next":"Was_User_In_Channel","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Was_User_In_Channel":{"Type":"Choice","Choices":[{"Variable":"$.results.ok","BooleanEquals":true,"Next":"Send_Message_DM"},{"Variable":"$.results.result","BooleanEquals":false,"Next":"FAILED_TEST"}]},"Send_Message_DM":{"Type":"Task","Resource":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.SendMessage.name}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Send_Message_DM","Parameters":{"target":"$.artifacts.event.details.username_target","target_type":"user","message_template":"Hello from SoclessSlackIntegrationTest in ${AWS::Region}"}}},"Next":"Wait_C","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Wait_C":{"Type":"Wait","Seconds":5,"Next":"Prompt_For_Confirmation"},"Prompt_For_Confirmation":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke.waitForTaskToken","Parameters":{"FunctionName":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.PromptForConfirmation.name}}","Payload":{"sfn_context":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Prompt_For_Confirmation","Parameters":{"prompt_text":"Tesing PromptForConfirmation","text":"This will timeout in 30 seconds and advance to next step in test","target":"$.artifacts.event.details.existing_channel_id","target_type":"slack_id"}}},"task_token.$":"$$.Task.Token"}},"TimeoutSeconds":40,"Catch":[{"ErrorEquals":["States.Timeout"],"ResultPath":"$.errors.Prompt_For_Confirmation","Next":"Wait_D"}],"Next":"Wait_D","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"Wait_D":{"Type":"Wait","Seconds":5,"Next":"Prompt_For_Response"},"Prompt_For_Response":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke.waitForTaskToken","Parameters":{"FunctionName":"arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${{self:functions.PromptForResponse.name}}","Payload":{"sfn_context":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Prompt_For_Response","Parameters":{"message_template":"Testing PromptForConfirmation \n This will timeout in 30 seconds and advance to next step in test","target":"$.artifacts.event.details.existing_channel_id","target_type":"slack_id","response_desc":"mm-dd-yyyy"}}},"task_token.$":"$$.Task.Token"}},"TimeoutSeconds":40,"Catch":[{"ErrorEquals":["States.Timeout"],"ResultPath":"$.errors.Slack_User_For_Return_Date","Next":"Close_Investigation"}],"Next":"Close_Investigation","Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]},"FAILED_TEST":{"Type":"Fail"},"Close_Investigation":{"Type":"Task","Resource":"${{self:custom.core.SetInvestigationStatus}}","Parameters":{"execution_id.$":"$.execution_id","artifacts.$":"$.artifacts","errors.$":"$.errors","results.$":"$.results","State_Config":{"Name":"Close_Investigation","Parameters":{"investigation_id":"$.artifacts.event.investigation_id","status":"closed"}}},"End":true,"Retry":[{"ErrorEquals":["Lambda.ServiceException","Lambda.AWSLambdaException","Lambda.SdkClientException"],"IntervalSeconds":2,"MaxAttempts":6,"BackoffRate":2}]}}}
}