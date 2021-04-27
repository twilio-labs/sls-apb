// This file contains some mock serverless objects that can be passed to SlsApb
module.exports = {
  minimalSlsObjWithOneScheduledPlaybook: {
    cli: {
      log: console.log,
    },
    service: {
      custom: {
        sls_apb: {
          logging: true,
          playbooksFolder: "./test/mocks/extended_playbook_config/playbooks",
        },
        playbooks: [
          "unscheduled_playbook",
          {
            scheduled_playbook: {
              events: [
                {
                  schedule: {
                    rate: "rate(1 minute)",
                    description: "First schedule",
                    enabled: true,
                  },
                },
                {
                  schedule: {
                    rate: "rate(5 minute)",
                    description: "Second Schdule",
                    enabled: false,
                    input: { hello: "world" },
                  },
                },
              ],
            },
          },
        ],
      },
      resources: [],
    },
  },
};
