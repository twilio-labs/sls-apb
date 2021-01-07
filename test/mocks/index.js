// import mock data from sibling files
const interaction_and_parallel = require('./interaction_and_parallel')
const task_failure_handlers = require('./task_failure_handlers')
const _unused = require('./_unused')

// re-export for easy usage in tests
module.exports = {
    ...interaction_and_parallel,
    ...task_failure_handlers,
    ..._unused
}