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
import { SlsApbVariableResolutionHelper } from "./sls_apb";

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
      "after:deploy:deploy": () => {
        this.sls.cli.log(
          JSON.stringify(
            this.sls.service.provider.compiledCloudFormationTemplate
          )
        );
      },
      "package:compileFunctions": this.compilePlaybookResources.bind(this),
      "package:compileEvents": this.compileScheduledEvents.bind(this),
    };

    // In the Serverless Framework, serverless variables are resolved after plugins are initialized i.e. after all plugin constructors are called.
    // However, during plugin initialization, serverless variables are unresolved. As such, code in the constructor operates on unresolved Serverless variables.
    //
    // The sls-apb plugin occasionally needs to preprocess data that contains unresolved serverless variables, but use that same data later on after the variables
    // within it have been resolved.
    // For example: Playbooks need to be rendered into StateMachine resources before variables are resolved but added to CF after variables are resolved.
    // The _slsApbVariablesResolutionHelper exists to support these use-cases.
    // Any data with serverless variables that needs to be processed pre-variable resolution then accessed post-resolution (via serverless lifecycle hooks) lives here
    // It exists on the serverless.custom object because variables in the custom object are unresolved during plugin initialization, but resolved post-plugin initialization
    const variableResolutionHelper: SlsApbVariableResolutionHelper = {
      renderedPlaybooks: {},
      statesExecutionRole: STATES_EXECUTION_ROLE_ARN,
    };

    this.sls.service.custom._slsApbVariableResolutionHelper = variableResolutionHelper;
    // // add states execution role to custom variables as well so that it
    // // gets resolved
    // this.sls.service.custom._statesExecutionRole = STATES_EXECUTION_ROLE_ARN;

    let playbooks: (string | Record<string, PlaybookEventsConfig>)[] = this.sls
      .service.custom.playbooks;

    this.playbookNameAndExtendedConfig = {};

    if (!playbooks) {
      this.sls.cli.log(
        "Warning: No playbooks listed for deployment. List playbooks under serverless.yml `custom.playbooks` section to deploy them"
      );
    } else {
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

          this.sls.service.custom._slsApbVariableResolutionHelper.renderedPlaybooks.Resources = {
            ...this.sls.service.custom._slsApbVariableResolutionHelper
              .renderedPlaybooks.Resources,
            ...renderedPlaybook.StateMachineYaml.Resources,
          };

          this.sls.service.custom._slsApbVariableResolutionHelper.renderedPlaybooks.Outputs = {
            ...this.sls.service.custom._slsApbVariableResolutionHelper
              .renderedPlaybooks.Outputs,
            ...renderedPlaybook.StateMachineYaml.Outputs,
          };

          if (!!playbookExtendedConfig) {
            this.playbookNameAndExtendedConfig[
              renderedPlaybook.PlaybookName
            ] = playbookExtendedConfig;
          }
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

  compilePlaybookResources() {
    this.sls.service.provider.compiledCloudFormationTemplate.Resources = {
      ...this.sls.service.provider.compiledCloudFormationTemplate.Resources,
      ...this.sls.service.custom._slsApbVariableResolutionHelper
        .renderedPlaybooks.Resources,
    };

    this.sls.service.provider.compiledCloudFormationTemplate.Outputs = {
      ...this.sls.service.provider.compiledCloudFormationTemplate.Outputs,
      ...this.sls.service.custom._slsApbVariableResolutionHelper
        .renderedPlaybooks.Outputs,
    };
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
        this.sls.service.custom._slsApbVariableResolutionHelper
          .statesExecutionRole
      );

      this.sls.service.provider.compiledCloudFormationTemplate.Resources = {
        ...this.sls.service.provider.compiledCloudFormationTemplate.Resources,
        ...compiledResource.Resources,
      };

      this.sls.service.provider.compiledCloudFormationTemplate.Outputs = {
        ...this.sls.service.provider.compiledCloudFormationTemplate.Outputs,
        ...compiledResource.Outputs,
      };
    }
  }
}

export = SlsApb;
