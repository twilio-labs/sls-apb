"use strict";

import fse from "fs-extra";
import { apb } from "./apb";
import { ApbConfig } from "./sls_apb";
import {
  PlaybookEventsConfig,
  buildScheduleResourcesFromEventConfigs,
} from "./playbook_extended_config";
import { validate } from "./ajv_config";
import { playbookEventsConfigValidator } from "./validators";
import { STATES_EXECUTION_ROLE_ARN } from "./constants";

class SlsApb {
  sls: any;
  options: any;
  apb_config: ApbConfig;
  hooks: object;
  playbookNameAndExtendedConfig: Record<string, PlaybookEventsConfig>;

  constructor(serverless, options) {
    this.sls = serverless;
    this.options = options;
    this.apb_config = this.getApbConfig();

    this.hooks = {
      // Compile scheduled events after the constructor
      // during the package:compileEvents lifecycle event
      // because by then, serverless variables will be correctly
      // resolved
      "package:compileEvents": this.compileScheduledEvents.bind(this),
    };
    // add states execution role to custom variables as well so that it
    // gets resolved
    this.sls.service.custom._statesExecutionRole = STATES_EXECUTION_ROLE_ARN;

    let playbooks: (string | Record<string, PlaybookEventsConfig>)[] = this.sls
      .service.custom.playbooks;

    this.playbookNameAndExtendedConfig = {};

    if (!playbooks) {
      this.sls.cli.log(
        "Warning: No playbooks listed for deployment. List playbooks under serverless.yml `custom.playbooks` section to deploy them"
      );
    } else {
      if (this.sls.service.resources === undefined) {
        this.sls.service.resources = [];
      }

      playbooks.forEach((playbook_config) => {
        // Determine if playbook_config is simple string or has config object
        let playbook_dir, playbookExtendedConfig;

        if (typeof playbook_config === "string") {
          playbook_dir = playbook_config;
          playbookExtendedConfig = null;
        } else if (
          Object.prototype.toString.call(playbook_config) === "[object Object]"
        ) {
          [playbook_dir, playbookExtendedConfig] = Object.entries(
            playbook_config
          )[0];
        } else {
          throw new Error(
            `Invalid configuration in playbooks object. Only string or object allowed. Given ${playbook_config}`
          );
        }

        // Create the path to the playbook.json file
        let playbook_path = this.buildPlaybookPath(playbook_dir);
        this.sls.cli.log(`Rendering State Machine for ${playbook_path}...`);

        // Read playbook.json file, use APB to render the State Machine then add it to the resources list
        try {
          let stateMachine = fse.readJsonSync(playbook_path);
          let renderedPlaybook = new apb(stateMachine, this.apb_config);

          //temporarily store the resource
          let temp = this.sls.service.resources;
          //initiate resources as an empty list
          this.sls.service.resources = [];
          if (temp != null && temp instanceof Array) {
            this.sls.service.resources.push(
              ...temp,
              renderedPlaybook.StateMachineYaml
            );
          } else {
            this.sls.service.resources.push(
              temp,
              renderedPlaybook.StateMachineYaml
            );
          }

          if (!!playbookExtendedConfig) {
            this.playbookNameAndExtendedConfig[
              renderedPlaybook.PlaybookName
            ] = playbookExtendedConfig;
          }

          // Add the rendered State Machine and the stored resource to the resources list
          //this.sls.cli.log(JSON.stringify(this.sls.service.resources, null, 2));
        } catch (err) {
          throw new Error(
            `Failed to render State Machine for ${playbook_path}: ${err}`
          );
        }
      });
    }
  }

  getApbConfig(): ApbConfig {
    const config = this.sls.service.custom.sls_apb || {};
    config.logging = Boolean(config.logging);

    if (!config.logging) {
      this.sls.cli.log(
        "StepFunctions logging not enabled. To ship playbook logs, set custom.sls_apb.logging = true in serverless.yml"
      );
    }
    return config;
  }

  buildPlaybookPath(playbookDir): string {
    const playbooksFolder = this.apb_config.playbooksFolder || "./playbooks";
    return `${playbooksFolder}/${playbookDir}/playbook.json`;
  }

  compileScheduledEvents() {
    let compiledResource;
    for (const [playbookName, extendedConfig] of Object.entries(
      this.playbookNameAndExtendedConfig
    )) {
      validate(extendedConfig, playbookEventsConfigValidator);

      compiledResource = buildScheduleResourcesFromEventConfigs(
        playbookName,
        extendedConfig.events,
        this.sls.service.custom._statesExecutionRole
      );

      this.sls.service.resources.Resources = {
        ...this.sls.service.resources.Resources,
        ...compiledResource.Resources,
      };
      this.sls.service.resources.Outputs = {
        ...this.sls.service.resources.Outputs,
        ...compiledResource.Outputs,
      };
    }
  }
}

export = SlsApb;
