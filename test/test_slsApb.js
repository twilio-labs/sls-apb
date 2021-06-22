const SlsApb = require("../dist/index.js");
const assert = require("assert");
const { minimalSlsObjWithOneScheduledPlaybook } = require("./mocks");

// // describe("#SlsApb", () => {
// //   it("Should instantiate new SlsApb object and render appropriate Resources without raising an error", () => {
// //     const slsApb = new SlsApb(minimalSlsObjWithOneScheduledPlaybook, {});
// //     slsApb.compileScheduledEvents();
// //   });
// // });
//
// const runServerless = require("@serverless/test/run-serverless");
// const serverlessDir = "./test/mock-service";
//
// describe("Some suite", () => {
//   it("Some test that involves creation of serverless instance", async () => {
//     const { serverless, stdoutData, cfTemplate } = await runServerless(
//       serverlessDir,
//       {
//         noService: true,
//         command: "print",
//         // Options, see below documentation
//       }
//     );
//
//     console.log(stdoutData);
//     console.log(cfTemplate);
//   });
// });
