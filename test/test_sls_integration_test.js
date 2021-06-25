// Test that the sls-apb plugin successfully integrates with the serverless framework
// using the runServerless utility https://github.com/serverless/test/blob/master/docs/run-serverless.md#run-serverless

const SlsApb = require("../dist/index.js");
const assert = require("assert");
const runServerless = require("@serverless/test/run-serverless");
const serverlessDir = `./node_modules/serverless`;

const expectedCfTemplate = require("./generated_outputs/sls_integration_test_cf_output.json");

describe("Sls APB Integration test", () => {
  it("Sls APB correctly generates appropriate resources when called by the Serverless Framework", async () => {
    const { serverless, stdoutData, cfTemplate } = await runServerless(
      serverlessDir,
      {
        cwd: "./test/mocks",
        command: "package",
        options: {
          region: "us-west-1",
          stage: "sandbox",
        },
      }
    );
    assert.deepStrictEqual(cfTemplate, expectedCfTemplate);
  });
});
