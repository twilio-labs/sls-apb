'use strict';
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_extra_1 = __importDefault(require("fs-extra"));
var apb_1 = require("./apb");
var SlsApb = /** @class */ (function () {
    function SlsApb(serverless, options) {
        var _this = this;
        this.sls = serverless;
        this.options = options;
        this.apb_config = this.getApbConfig();
        var playbooks = this.sls.service.custom.playbooks;
        if (!playbooks) {
            this.sls.cli.log('Warning: No playbooks listed for deployment. List playbooks under serverless.yml `custom.playbooks` section to deploy them');
        }
        else {
            if (this.sls.service.resources === undefined) {
                this.sls.service.resources = [];
            }
            playbooks.forEach(function (playbook_dir) {
                var _a;
                // Create the path to the playbook.json file
                var playbook_path = "./playbooks/" + playbook_dir + "/playbook.json";
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
                        (_a = _this.sls.service.resources).push.apply(_a, __spreadArray(__spreadArray([], temp), [renderedPlaybook.StateMachineYaml]));
                    }
                    else {
                        _this.sls.service.resources.push(temp, renderedPlaybook.StateMachineYaml);
                    }
                    // Add the rendered State Machine and the stored resource to the resources list
                    // this.sls.cli.log(JSON.stringify(this.sls.service.resources))
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
    return SlsApb;
}());
exports.default = SlsApb;
