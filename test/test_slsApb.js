const SlsApb = require("../dist/index.js");
const assert = require("assert");
const { minimalSlsObjWithOneScheduledPlaybook } = require("./mocks");

describe("#SlsApb", () => {
  it("Should instantiate new SlsApb object and render appropriate Resources without raising an error", () => {
    const slsApb = new SlsApb(minimalSlsObjWithOneScheduledPlaybook, {});
    slsApb.compileScheduledEvents();
  });
});
