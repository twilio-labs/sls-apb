# Expected Input

yaml

```
playbooks:
  - unscheduled_playbook
  - scheduled_playbook:
      events:
        - schedule:
            rate: rate(1 minute)
            enabled: true
            input: {}
        - schedule:
            rate: rate(2 minute)
            enabled: true
            input: {}
```

json

```
{
  "playbooks": [
    "unscheduled_playbook",
    {
      "scheduled_playbook": {
        "events": [
          {
            "schedule": {
              "rate": "rate(1 minute)",
              "enabled": true,
              "input": {
              }
            }
          },
          {
            "schedule": {
              "rate": "rate(2 minute)",
              "enabled": true,
              "input": {
              }
            }
          }
        ]
      }
    }
  ]
}
```

Expected Output Resource

```
EventRuleTestSchedule:
  Type: AWS::Events::Rule
  Properties:
    Description: Execute EventsRuleTestSchedule
    ScheduleExpression: rate(1 minute)
    State: ENABLED
    Targets:
      -
        Arn:
          Ref: EventRuleTest
        Id: EventRuleTest
        RoleArn: ${{cf:socless-${{self:provider.stage}}.StatesExecutionRoleArn}}
        Input: {}
```
