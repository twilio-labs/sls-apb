// import mock data from sibling files
const general_playbooks = require('./playbooks/general')
const task_failure_handlers = require('./playbooks/task_failure_handlers')
const _unused = require('./_unused')

// re-export for easy usage in tests
module.exports = {
    ...general_playbooks,
    ...task_failure_handlers,
    ..._unused
}