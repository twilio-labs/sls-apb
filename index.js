'use strict';

const fse = require('fs-extra');
const _ = require('lodash');
const apb = require('./lib/apb');

class SlsApb {
  constructor(serverless, options) {
    this.sls = serverless;
    this.options = options;

    let playbooks = this.sls.service.custom.playbooks

    if (!playbooks) {
      this.sls.cli.log('Warning: No playbooks listed for deployment. List playbooks under `customs.playbooks` section to deploy them')
    } else {

      if (this.sls.service.resources === undefined) {
        this.sls.service.resources = []
      }

      _.forEach(playbooks, (playbook_dir) => {
        // Create the path to the playbook.json file
        let playbook_path = `./playbooks/${playbook_dir}/playbook.json`
        this.sls.cli.log(`Rendering State Machine for ${playbook_path}...`)

        // Read playbook.json file, use APB to render the State Machine then add it to the resources list
        try {
          let stateMachine = fse.readJsonSync(playbook_path)
          let renderedPlaybook = new apb(stateMachine)
          // Add the rendered State Machine to the resources list
          this.sls.service.resources.push(renderedPlaybook.StateMachineYaml)
        } catch (err) {
          throw new Error(`Failed to render State Machine for ${playbook_path}: ${err.message}`)
        }

      })

    }
  }

}

module.exports = SlsApb;
