const assert = require('assert')
const { parse } = require('path')
const { apb } = require('../dist/apb.js')
const { PARSE_SELF_NAME, DECORATOR_FLAGS } = require('../dist/constants')
const { PlaybookValidationError } = require('../dist/errors.js')
const {
  pb_parallel_and_interaction,
  pb_task_failure_handler,
  pb_parse_nonstring,
  socless_slack_integration_test_playbook,
  expected_state_machine_socless_slack_integration_test_playbook,
  pb_with_missing_top_level_keys,
  expected_output_pb_parallel_and_interaction
} = require('./mocks')



const apb_with_parallel_and_interactions = new apb(pb_parallel_and_interaction)

describe('apb', () => {
  describe('#build_full_playbook_correctly', () => {
    it('socless_slack_integration_test should return expected state machine', () => {
      const apb_with_socless_slack_integration_test = new apb(socless_slack_integration_test_playbook)
      assert.deepStrictEqual(expected_state_machine_socless_slack_integration_test_playbook, apb_with_socless_slack_integration_test.StateMachine)
    })

    it('pb_parallel_and_interaction should return expected state machine', () => {
      assert.deepStrictEqual(apb_with_parallel_and_interactions.StateMachine, expected_output_pb_parallel_and_interaction)
    })
  })

  describe('#validate_definition', () => {
    it('validateTopLevelKeys should throw when keys missing', () => {
      assert.throws(() => { new apb(pb_with_missing_top_level_keys) }, Error)
    })
  })


  describe('#transformTaskState', () => {

    it('should correctly generate integration task states', () => {
      let expected = {

        Slack_User_For_Response: {
          "Type": "Task",
          "Resource": "${{self:custom.slack.PromptForConfirmation}}",
          Parameters: {
            "artifacts.$": "$.artifacts",
            "errors.$": "$.errors",
            "execution_id.$": "$.execution_id",
            "results.$": "$.results",
            State_Config: {
              Name: "Slack_User_For_Response",
              Parameters: {
                no_text: "No",
                prompt_text: "Are you happy?",
                receiver: "Await_User_Response",
                target: "$.results.Validate_Username.name",
                target_type: "user",
                text: "Hi, are you happy?",
                yes_text: "Yes"
              }
            }
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
          Parameters: {
            "artifacts.$": "$.artifacts",
            "errors.$": "$.errors",
            "execution_id.$": "$.execution_id",
            "results.$": "$.results",
            State_Config: {
              Name: "End_Cheer_Up",
              Parameters: {
                status: "done"
              }
            }
          },
          "Type": "Task",
        }
      }

      assert.deepStrictEqual(apb_with_parallel_and_interactions.transformTaskState("End_Cheer_Up", pb_parallel_and_interaction.States.End_Cheer_Up, pb_parallel_and_interaction.States, DECORATOR_FLAGS), expected)
    })

  })

  describe('#transformInteractionState', () => {
    it('should correctly generate an Interaction task state', () => {
      let expected = {
        New_Interaction_State: {
          "Type": "Task",
          "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
          "Parameters": {
            FunctionName: '${{self:custom.slack.PromptForConfirmation}}',
            Payload: {
              'task_token.$': '$$.Task.Token',
              sfn_context: {
                'artifacts.$': '$.artifacts',
                'errors.$': '$.errors',
                'execution_id.$': '$.execution_id',
                'results.$': '$.results',
                State_Config: {
                  Name: 'New_Interaction_State',
                  Parameters: {
                    no_text: 'No',
                    prompt_text: 'Are you happy?',
                    receiver: 'Slack_User_For_Response',
                    target: '$.results.Validate_Username.name',
                    target_type: 'user',
                    text: 'Hi, are you happy?',
                    yes_text: 'Yes'
                  }
                }
              }
            
          },
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
          "Next": "Slack_User_For_Response"
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

    it('should remove the apb_render_nonstring_value flag', () => {
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
