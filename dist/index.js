"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var fs_extra_1 = __importDefault(require("fs-extra"));
var apb_1 = require("./apb");
var playbook_extended_config_1 = require("./playbook_extended_config");
var ajv_config_1 = require("./ajv_config");
var validators_1 = require("./validators");
var SlsApb = /** @class */ (function () {
    function SlsApb(serverless, options) {
        var _this = this;
        this.sls = serverless;
        this.options = options;
        this.apb_config = this.getApbConfig();
        var playbooks = this.sls
            .service.custom.playbooks;
        if (!playbooks) {
            this.sls.cli.log("Warning: No playbooks listed for deployment. List playbooks under serverless.yml `custom.playbooks` section to deploy them");
        }
        else {
            if (this.sls.service.resources === undefined) {
                this.sls.service.resources = [];
            }
            playbooks.forEach(function (playbook_config) {
                var _a, _b;
                // Determine if playbook_config is simple string or has config object
                var playbook_dir, playbookEventConfigs;
                if (typeof playbook_config === "string") {
                    playbook_dir = playbook_config;
                    playbookEventConfigs = null;
                }
                else if (Object.prototype.toString.call(playbook_config) === "[object Object]") {
                    _a = Object.entries(playbook_config)[0], playbook_dir = _a[0], playbookEventConfigs = _a[1];
                    ajv_config_1.validate(playbookEventConfigs, validators_1.playbookEventsConfigValidator);
                }
                else {
                    throw new Error("Invalid configuration in playbooks object. Only string or object allowed. Given " + playbook_config);
                }
                // Create the path to the playbook.json file
                var playbook_path = _this.buildPlaybookPath(playbook_dir);
                _this.sls.cli.log("Rendering State Machine for " + playbook_path + "...");
                // Read playbook.json file, use APB to render the State Machine then add it to the resources list
                try {
                    var stateMachine = fs_extra_1.default.readJsonSync(playbook_path);
                    var renderedPlaybook = new apb_1.apb(stateMachine, _this.apb_config);
                    //temporarily store the resource
                    var temp = _this.sls.service.resources;
                    //initiate resources as an empty list
                    _this.sls.service.resources = [];
                    if (temp != null && temp instanceof Array) {
                        (_b = _this.sls.service.resources).push.apply(_b, __spreadArray(__spreadArray([], temp), [renderedPlaybook.StateMachineYaml]));
                    }
                    else {
                        _this.sls.service.resources.push(temp, renderedPlaybook.StateMachineYaml);
                    }
                    // If there's a playbookEventConfigs, build it and add it to the resources
                    if (!!playbookEventConfigs) {
                        _this.sls.service.resources.push(playbook_extended_config_1.buildScheduleResourcesFromEventConfigs(renderedPlaybook.PlaybookName, playbookEventConfigs.events));
                    }
                    // Add the rendered State Machine and the stored resource to the resources list
                    //this.sls.cli.log(JSON.stringify(this.sls.service.resources, null, 2));
                }
                catch (err) {
                    throw new Error("Failed to render State Machine for " + playbook_path + ": " + err);
                }
            });
        }
    }
    SlsApb.prototype.getApbConfig = function () {
        var config = this.sls.service.custom.sls_apb || {};
        config.logging = Boolean(config.logging);
        if (!config.logging) {
            this.sls.cli.log("StepFunctions logging not enabled. To ship playbook logs, set custom.sls_apb.logging = true in serverless.yml");
        }
        return config;
    };
    SlsApb.prototype.buildPlaybookPath = function (playbookDir) {
        var playbooksFolder = this.apb_config.playbooksFolder || "./playbooks";
        return playbooksFolder + "/" + playbookDir + "/playbook.json";
    };
    return SlsApb;
}());
module.exports = SlsApb;
