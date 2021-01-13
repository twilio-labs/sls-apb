module.exports = {
    parseIntBool_playbook: {
        "Playbook": "parseIntBool",
        "Comment": "mock parseIntBool playbook",
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
                "Seconds" : "apb_parseIntBool(${{self:custom.Wait_24_Hour_Config.${{self:provider.stage}}}})",
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