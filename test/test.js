const assert = require('assert')
const _ = require('lodash')
const apb = require('../lib/apb.js')
const testHelper = require('./helper.js')

let {definition, Input, StateMachine} = testHelper
let t = new apb(definition)


const DecoratorFlags = {
    TaskFailureHandlerName: '_Handle_Task_Failure',
    TaskFailureHandlerStartLabel: '_Task_Failed',
    TaskFailureHandlerEndLabel: '_End_With_Failure'
}

describe('apb', () => {

  describe('#isStateIntegration', () => {
    it('should return "true" for a top-level Task state', () => {
      assert.equal(true, t.isStateIntegration("Slack_User_For_Response"))
    })

    it('should throw "Error" for Task state nested in Parallel state when default input is used', () => {
      assert.throws(()=> {t.isStateIntegration("Slack_User_Happiness")}, Error)
    })

    it('should return "true" for Task state nested in Parallel state when correct branch of Parallel state is used as input', () => {
      assert.equal(true, t.isStateIntegration("Slack_User_Happiness", definition.States.Parallel_Cheer_User_Up.Branches[0].States))
    })

    it('should throw "Error" for Task state nested in Parallel state when incorrect branch of Parallel state is used as input', () => {
      assert.throws(() => {t.isStateIntegration("Slack_User_Happiness", definition.States.Parallel_Cheer_User_Up.Branches[1].States)}, Error)
    })

    it('should throw "Error" when State does not exist in States object', () => {
      assert.throws(() => {t.isStateIntegration("This_State_Does_Not_Exist")}, Error)
    })

    it('should return false for Await state', () => {
      assert.equal(false, t.isStateIntegration("Await_User_Response"))
    })

    it('should return "false" for all other states states', () => {
      let testCases = ["Is_User_Happy", "User_Is_Happy", "Mark_As_Success", "Parallel_Cheer_User_Up"] // Choice, Pass, Succeed Parallel
      _.forEach(testCases, (state) => assert.equal(false, t.isStateIntegration(state)))
    })

  })


  describe('#transformTaskState', () => {

    it('should correctly generate integration task states', () => {
      let expected = {
        helper_slack_user_for_response: {
          "Type": "Pass",
          "Result": {
            "Name": "Slack_User_For_Response",
            "Parameters": {
              "no_text": "No",
              "prompt_text": "Are you happy?",
              "receiver": "Await_User_Response",
              "target": "$.results.Validate_Username.name",
              "target_type": "user",
              "text": "Hi, are you happy?",
              "yes_text": "Yes"
            },
          },
          "ResultPath": "$.State_Config",
          "Next": "Slack_User_For_Response"
        },

        Slack_User_For_Response: {  
          "Type": "Task",
          "Resource": "${{self:custom.slack.PromptForConfirmation}}",
            "Catch": [
              {
                  "ErrorEquals": ["States.ALL"],
                  "Next": "Is_User_Happy"
              }
            ],
          "Retry": [ 
            {
              "ErrorEquals": [ "ConnectionError"],
              "IntervalSeconds": 30, 
              "MaxAttempts": 2, 
              "BackoffRate": 2
            },
            {
              "ErrorEquals": [ "Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
              "IntervalSeconds": 2, 
              "MaxAttempts": 6, 
              "BackoffRate": 2 
            }
          ],
          "Next": "Await_User_Response"
        }
      }

      assert.deepEqual(t.transformTaskState("Slack_User_For_Response", definition.States.Slack_User_For_Response, definition.States, DecoratorFlags), expected)
    })

    it('should correctly generate non-integration task states', () => {
      let expected = {
        Await_User_Response: {
          "Type": "Task",
          "Resource": "${{self:custom.core.AwaitMessageResponseActivity}}",
          "Retry": [ 
            {
              "ErrorEquals": [ "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
              "IntervalSeconds": 2, 
              "MaxAttempts": 6, 
              "BackoffRate": 2 
            },
            {
            "ErrorEquals": [ "Lambda.ServiceException"],
            "IntervalSeconds": 2, 
            "MaxAttempts": 6, 
            "BackoffRate": 2 
            }
          ],
          "Next": "Is_User_Happy"
        }
      }

      assert.deepEqual(t.transformTaskState("Await_User_Response", definition.States.Await_User_Response, definition.States, DecoratorFlags), expected)
    })


    it('should not add retry logic when disabled', () => {
      let expected = {
        "End_Cheer_Up": {
          "End": true,
          "Resource": "${{self.custom.jira.TransitionIssue}}",
          "Type": "Task",
        },
        "helper_end_cheer_up": {
          "Type": "Pass",
          "Result": {
            "Name": "End_Cheer_Up",
            "Parameters": {
            "status": "done"
            }
          },
          "ResultPath": "$.State_Config",
          "Next": "End_Cheer_Up"
        }
      }

      assert.deepEqual(t.transformTaskState("End_Cheer_Up", definition.States.End_Cheer_Up, definition.States, DecoratorFlags), expected)
    })

  })

  describe('#transformInteractionState', () => {
    it('should correctly generate an Interaction task state', () =>  {
      let expected = {
        helper_new_interaction_state: {
          "Type": "Pass",
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
            },
          },
          "ResultPath": "$.State_Config",
          "Next": "New_Interaction_State"
        },
        New_Interaction_State: {
          "Type": "Task",
          "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
          "Parameters": {
            "FunctionName": "${{self:custom.slack.PromptForConfirmation}}",
            "Payload": {
              "sfn_context.$": "$",
              "task_token.$": "$$.Task.Token"
            }
          },
          "Retry": [
            {
              "BackoffRate": 2,
              "ErrorEquals": [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException",
              ],
              "IntervalSeconds": 2,
              "MaxAttempts": 6,
            }
          ],
          "Next": "helper_slack_user_for_response"
        }
      }

      assert.deepEqual(t.transformInteractionState(
          "New_Interaction_State",
          definition.States.New_Interaction_State,
          definition.States,
          DecoratorFlags
          ), expected)
    })

  })

})
