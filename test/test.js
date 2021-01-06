const assert = require('assert')
const apb = require('../lib/apb.js')
const testHelper = require('./helper.js')

let { basic_playbook_definition, basis_playbook_input_json, basic_playbook_state_machine_output } = testHelper
let mock_basic_playbook_apb = new apb(basic_playbook_definition)


const DecoratorFlags = {
  TaskFailureHandlerName: '_Handle_Task_Failure',
  TaskFailureHandlerStartLabel: '_Task_Failed',
  TaskFailureHandlerEndLabel: '_End_With_Failure'
}

describe('apb', () => {

  describe('#isStateIntegration', () => {
    it('should return "true" for a top-level Task state', () => {
      assert.strictEqual(true, mock_basic_playbook_apb.isStateIntegration("Slack_User_For_Response"))
    })

    it('should throw "Error" for Task state nested in Parallel state when default input is used', () => {
      assert.throws(() => { mock_basic_playbook_apb.isStateIntegration("Slack_User_Happiness") }, Error)
    })

    it('should return "true" for Task state nested in Parallel state when correct branch of Parallel state is used as input', () => {
      assert.strictEqual(true, mock_basic_playbook_apb.isStateIntegration("Slack_User_Happiness", basic_playbook_definition.States.Parallel_Cheer_User_Up.Branches[0].States))
    })

    it('should throw "Error" for Task state nested in Parallel state when incorrect branch of Parallel state is used as input', () => {
      assert.throws(() => { mock_basic_playbook_apb.isStateIntegration("Slack_User_Happiness", basic_playbook_definition.States.Parallel_Cheer_User_Up.Branches[1].States) }, Error)
    })

    it('should throw "Error" when State does not exist in States object', () => {
      assert.throws(() => { mock_basic_playbook_apb.isStateIntegration("This_State_Does_Not_Exist") }, Error)
    })

    it('should return false for Await state', () => {
      assert.strictEqual(false, mock_basic_playbook_apb.isStateIntegration("Await_User_Response"))
    })

    it('should return "false" for all other states states', () => {
      let testCases = ["Is_User_Happy", "User_Is_Happy", "Mark_As_Success", "Parallel_Cheer_User_Up"] // Choice, Pass, Succeed Parallel
      // _.forEach(testCases, (state) => assert.strictEqual(false, mock_basic_playbook_apb.isStateIntegration(state)))

      testCases.forEach(state => assert.strictEqual(false, mock_basic_playbook_apb.isStateIntegration(state)))
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
              "ErrorEquals": ["ConnectionError"],
              "IntervalSeconds": 30,
              "MaxAttempts": 2,
              "BackoffRate": 2
            },
            {
              "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
              "IntervalSeconds": 2,
              "MaxAttempts": 6,
              "BackoffRate": 2
            }
          ],
          "Next": "Await_User_Response"
        }
      }

      assert.deepStrictEqual(mock_basic_playbook_apb.transformTaskState("Slack_User_For_Response", basic_playbook_definition.States.Slack_User_For_Response, basic_playbook_definition.States, DecoratorFlags), expected)
    })

    it('should correctly generate non-integration task states', () => {
      let expected = {
        Await_User_Response: {
          "Type": "Task",
          "Resource": "${{self:custom.core.AwaitMessageResponseActivity}}",
          "Retry": [
            {
              "ErrorEquals": ["Lambda.AWSLambdaException", "Lambda.SdkClientException"],
              "IntervalSeconds": 2,
              "MaxAttempts": 6,
              "BackoffRate": 2
            },
            {
              "ErrorEquals": ["Lambda.ServiceException"],
              "IntervalSeconds": 2,
              "MaxAttempts": 6,
              "BackoffRate": 2
            }
          ],
          "Next": "Is_User_Happy"
        }
      }

      assert.deepStrictEqual(mock_basic_playbook_apb.transformTaskState("Await_User_Response", basic_playbook_definition.States.Await_User_Response, basic_playbook_definition.States, DecoratorFlags), expected)
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

      assert.deepStrictEqual(mock_basic_playbook_apb.transformTaskState("End_Cheer_Up", basic_playbook_definition.States.End_Cheer_Up, basic_playbook_definition.States, DecoratorFlags), expected)
    })

  })

  describe('#transformInteractionState', () => {
    it('should correctly generate an Interaction task state', () => {
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

      assert.deepStrictEqual(mock_basic_playbook_apb.transformInteractionState(
        "New_Interaction_State",
        basic_playbook_definition.States.New_Interaction_State,
        basic_playbook_definition.States,
        DecoratorFlags
      ), expected)
    })

  })




  describe('#loggingConfiguration', () => {
    it('should include logging based on config object {logging: true}', () => {
      const with_logging = new apb(basic_playbook_definition, { logging: true }).StateMachineYaml
      assert(with_logging.Resources.Check_User_Happiness.Properties.LoggingConfiguration)
    })

    it('should exclude logging based on config object {logging: false}', () => {
      const no_logging = mock_basic_playbook_apb.StateMachineYaml
      assert(!no_logging.Resources.Check_User_Happiness.Properties.LoggingConfiguration)
    })

  })

})
