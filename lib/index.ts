'use strict';

import fse from 'fs-extra';
import { apb } from './apb';

class SlsApb {
  sls: any
  options: any
  apb_config: any

  constructor(serverless, options) {
    this.sls = serverless;
    this.options = options;
    this.apb_config = this.getApbConfig()

    let playbooks: string[] = this.sls.service.custom.playbooks

    if (!playbooks) {
      this.sls.cli.log('Warning: No playbooks listed for deployment. List playbooks under serverless.yml `custom.playbooks` section to deploy them')
    } else {
      if (this.sls.service.resources === undefined) {
        this.sls.service.resources = []
      }

      playbooks.forEach((playbook_dir) => {
        // Create the path to the playbook.json file
        let playbook_path = `./playbooks/${playbook_dir}/playbook.json`
        this.sls.cli.log(`Rendering State Machine for ${playbook_path}...`)

        // Read playbook.json file, use APB to render the State Machine then add it to the resources list
        try {
          let stateMachine = fse.readJsonSync(playbook_path)
          let renderedPlaybook = new apb(stateMachine, this.apb_config)

          //temporarily store the resource
          let temp = this.sls.service.resources
          //initiate resources as an empty list
          this.sls.service.resources = []
          if (temp != null && temp instanceof Array) {
            this.sls.service.resources.push(...temp, renderedPlaybook.StateMachineYaml)
          } else {
            this.sls.service.resources.push(temp, renderedPlaybook.StateMachineYaml)
          }
          // Add the rendered State Machine and the stored resource to the resources list
          // this.sls.cli.log(JSON.stringify(this.sls.service.resources))
        } catch (err) {
          throw new Error(`Failed to render State Machine for ${playbook_path}: ${err}`)
        }

      })

    }
  }

  getApbConfig() {
    const config = this.sls.service.custom.sls_apb || {};
    config.logging = Boolean(config.logging);

    if (!config.logging) {
      this.sls.cli.log("StepFunctions logging not enabled. To ship playbook logs, set custom.sls_apb.logging = true in serverless.yml");
    }
    return config;
  }

}

export = SlsApb