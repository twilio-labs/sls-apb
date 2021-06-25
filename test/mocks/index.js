// import mock data from sibling files
const general_playbooks = require("./playbooks/general");
const task_failure_handlers = require("./playbooks/task_failure_handlers");
const full_playbooks = require("./playbooks/full_playbooks");
const error_playbooks = require("./playbooks/error_playbooks");

// re-export for easy usage in tests
module.exports = {
  ...general_playbooks,
  ...task_failure_handlers,
  ...full_playbooks,
  ...error_playbooks,
};
