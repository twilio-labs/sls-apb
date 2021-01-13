const assert = require('assert')
const { parse } = require('path')
const apb = require('../lib/apb.js')
const { PARSE_SELF_NAME, DECORATOR_FLAGS } = require('../lib/constants')
const {
  pb_parallel_and_interaction,
  pb_task_failure_handler,
  pb_parse_nonstring
} = require('./mocks')



const apb_with_parallel_and_interactions = new apb(pb_parallel_and_interaction)

describe('apb', () => {

  describe('#isStateIntegration', () => {
    it('should return "true" for a top-level Task state', () => {
      assert.strictEqual(true, apb_with_parallel_and_interactions.isStateIntegration("Slack_User_For_Response"))
    })

    it('should throw "Error" for Task state nested in Parallel state when default input is used', () => {
      assert.throws(() => { apb_with_parallel_and_interactions.isStateIntegration("Slack_User_Happiness") }, Error)
    })

    it('should return "true" for Task state nested in Parallel state when correct branch of Parallel state is used as input', () => {
      assert.strictEqual(true, apb_with_parallel_and_interactions.isStateIntegration("Slack_User_Happiness", pb_parallel_and_interaction.States.Parallel_Cheer_User_Up.Branches[0].States))
    })

    it('should throw "Error" for Task state nested in Parallel state when incorrect branch of Parallel state is used as input', () => {
      assert.throws(() => { apb_with_parallel_and_interactions.isStateIntegration("Slack_User_Happiness", pb_parallel_and_interaction.States.Parallel_Cheer_User_Up.Branches[1].States) }, Error)
    })

    it('should throw "Error" when State does not exist in States object', () => {
      assert.throws(() => { apb_with_parallel_and_interactions.isStateIntegration("This_State_Does_Not_Exist") }, Error)
    })

    it('should return false for Await state', () => {
      assert.strictEqual(false, apb_with_parallel_and_interactions.isStateIntegration("Await_User_Response"))
    })

    it('should return "false" for all other states states', () => {
      let testCases = ["Is_User_Happy", "User_Is_Happy", "Mark_As_Success", "Parallel_Cheer_User_Up"] // Choice, Pass, Succeed Parallel

      testCases.forEach(state => assert.strictEqual(false, apb_with_parallel_and_interactions.isStateIntegration(state)))
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

      assert.deepStrictEqual(apb_with_parallel_and_interactions.transformTaskState("Slack_User_For_Response", pb_parallel_and_interaction.States.Slack_User_For_Response, pb_parallel_and_interaction.States, DECORATOR_FLAGS), expected)
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

      assert.deepStrictEqual(apb_with_parallel_and_interactions.transformTaskState("Await_User_Response", pb_parallel_and_interaction.States.Await_User_Response, pb_parallel_and_interaction.States, DECORATOR_FLAGS), expected)
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

      assert.deepStrictEqual(apb_with_parallel_and_interactions.transformTaskState("End_Cheer_Up", pb_parallel_and_interaction.States.End_Cheer_Up, pb_parallel_and_interaction.States, DECORATOR_FLAGS), expected)
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

      assert.deepStrictEqual(apb_with_parallel_and_interactions.transformInteractionState(
        "New_Interaction_State",
        pb_parallel_and_interaction.States.New_Interaction_State,
        pb_parallel_and_interaction.States,
        DECORATOR_FLAGS
      ), expected)
    })

  })

  describe('#loggingConfiguration', () => {
    it('should include logging based on config object {logging: true}', () => {
      const with_logging = new apb(pb_parallel_and_interaction, { logging: true }).StateMachineYaml
      assert(with_logging.Resources.Check_User_Happiness.Properties.LoggingConfiguration)
    })

    it('should exclude logging based on config object {logging: false}', () => {
      const no_logging = apb_with_parallel_and_interactions.StateMachineYaml
      assert(!no_logging.Resources.Check_User_Happiness.Properties.LoggingConfiguration)
    })

  })

  describe('#TaskFailureHandler', () => {

    it('should add TaskFailureHandler to catch state when decorator present', () => {
      const apb_with_single_tfh = new apb(pb_task_failure_handler);

      // create array of Next step names for all catches on Celebrate_With_User
      const catches = apb_with_single_tfh.StateMachine.States.Celebrate_With_User.Catch;
      const next_steps = catches.map(catch_obj => catch_obj.Next)

      assert(next_steps.includes(DECORATOR_FLAGS.TaskFailureHandlerStartLabel))
    })

  })

  describe(`#${PARSE_SELF_NAME}`, () => {

    it(`should contain ${PARSE_SELF_NAME} before parsing`, () => {
      assert(JSON.stringify(pb_parse_nonstring).search(PARSE_SELF_NAME) >= 0)
    })

    it('should remove the render_nonstring_value flag', () => {
      const apb_with_render_nonstring_flag = new apb(pb_parse_nonstring);

      const state_machine_name = Object.keys(apb_with_render_nonstring_flag.StateMachineYaml.Resources)[0]
      const definition = apb_with_render_nonstring_flag.StateMachineYaml.Resources[state_machine_name].Properties.DefinitionString["Fn::Sub"]
      
      assert(definition.search(PARSE_SELF_NAME) < 0)
    })

    it('should not produce valid json (serverless will unpack value)', () => {
      const apb_with_render_nonstring_flag = new apb(pb_parse_nonstring);

      const state_machine_name = Object.keys(apb_with_render_nonstring_flag.StateMachineYaml.Resources)[0]
      const definition = apb_with_render_nonstring_flag.StateMachineYaml.Resources[state_machine_name].Properties.DefinitionString["Fn::Sub"]
      
      assert.throws(() => {
        JSON.parse(definition)
      })
    })

    it('should produce valid json when flag is not used', () => {
      const state_machine_name = Object.keys(apb_with_parallel_and_interactions.StateMachineYaml.Resources)[0]
      const definition = apb_with_parallel_and_interactions.StateMachineYaml.Resources[state_machine_name].Properties.DefinitionString["Fn::Sub"]
      
      assert.doesNotThrow(() => {
        JSON.parse(definition)
      })
    })
    
  })

})
