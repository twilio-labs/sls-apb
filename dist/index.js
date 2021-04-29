"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var constants_1 = require("./constants");
var SlsApb = /** @class */ (function () {
    function SlsApb(serverless, options) {
        var _this = this;
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
        this.sls.service.custom._statesExecutionRole = constants_1.STATES_EXECUTION_ROLE_ARN;
        var playbooks = this.sls
            .service.custom.playbooks;
        this.playbookNameAndExtendedConfig = {};
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
                var playbook_dir, playbookExtendedConfig;
                if (typeof playbook_config === "string") {
                    playbook_dir = playbook_config;
                    playbookExtendedConfig = null;
                }
                else if (Object.prototype.toString.call(playbook_config) === "[object Object]") {
                    _a = Object.entries(playbook_config)[0], playbook_dir = _a[0], playbookExtendedConfig = _a[1];
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
                    if (!!playbookExtendedConfig) {
                        _this.playbookNameAndExtendedConfig[renderedPlaybook.PlaybookName] = playbookExtendedConfig;
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
    SlsApb.prototype.compileScheduledEvents = function () {
        var compiledResource;
        for (var _i = 0, _a = Object.entries(this.playbookNameAndExtendedConfig); _i < _a.length; _i++) {
            var _b = _a[_i], playbookName = _b[0], extendedConfig = _b[1];
            ajv_config_1.validate(extendedConfig, validators_1.playbookEventsConfigValidator);
            compiledResource = playbook_extended_config_1.buildScheduleResourcesFromEventConfigs(playbookName, extendedConfig.events, this.sls.service.custom._statesExecutionRole);
            this.sls.service.resources.Resources = __assign(__assign({}, this.sls.service.resources.Resources), compiledResource.Resources);
            this.sls.service.resources.Outputs = __assign(__assign({}, this.sls.service.resources.Outputs), compiledResource.Outputs);
        }
    };
    return SlsApb;
}());
module.exports = SlsApb;
