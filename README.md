# SLS-APB

Serverless Plugin for SOCless Playbook Builder (apb). Automatically renders State Machines from playbook.json files when a socless-playbooks stack is deployed.

It auto-generates the:

- Helper states which Task and Parallel States need to work properly in Socless
- The Yaml config required to upload the State Machine to SOCless via Cloudformation
- Task Failure handlers for all task states that will trigger when a Lambda fails
- Retry logic for all task states that will handle AWS Lambda service exceptions

## Usage

Create your Socless Playbook Definition in a file called playbook.json.

The default retry object assigned to each `Task` looks like this:

```json
{
  "ErrorEquals": [ "Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
  "IntervalSeconds": 2,
  "MaxAttempts": 6,
  "BackoffRate": 2
}
```

To **disable** default retries on certain tasks or all tasks, use the Decorators object DisableDefaultRetry:

```json
"Decorators" : {
   "DisableDefaultRetry" : {
      "tasks" : [ "End_Cheer_Up", "<other_task_name>" ],
   }
}
```

```json
"Decorators" : {
   "DisableDefaultRetry" : {
      "all" : true
   }
}
```

To automatically add a Task Failure Handler to each `Task` state that will trigger when a Lambda raises an unhandled exception, timeout, out of memory, etc :

```json
"Decorators": {
   "TaskFailureHandler": {
      Task that runs when any step in the playbook fails...
   }
}
```

To use serverless unpacking for nonstring values (Int, Boolean, etc) that are also valid JSON, use the `apb_render_nonstring_value()` flag in your `playbook.json`. The example below is referencing an Int type in the serverless.yml custom variables definition:

```json
            "Wait_24_Hour" : {
                "Type" : "Wait",
                "Seconds" : "apb_render_nonstring_value(${{self:custom.Wait_24_Hour_Config.${{self:provider.stage}}}})",
                "Next": "End_Cheer_Up"
            },
```

## Feature Flags
To use cloudwatch logs for SOCless playbooks:
1. Ensure that you are on the most recent version of the Socless core stack which is exporting PlaybooksLogGroup as seen [here]()
2. Add the following to your playbook repo's `serverless.yml`

**serverless.yml:**

```yaml
custom:
  sls_apb:
      logging: true
```