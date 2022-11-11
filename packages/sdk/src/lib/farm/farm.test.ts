import { FarmWorkflow } from "./farm";
import { workflowTestSuite } from "src/classes/Workflow.test";
import { setupConnection } from "src/utils.tests/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";

/// Setup
let sdk: BeanstalkSDK;
let account: string;
beforeAll(async () => {
  const { signer, provider, account: _account } = await setupConnection();
  sdk = new BeanstalkSDK({
    provider: provider,
    signer: signer,
    subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  });
  account = _account;
});

describe("Workflow", () => {
  let farm: FarmWorkflow;
  beforeEach(() => {
    farm = sdk.farm.create("TestFarm");
  });
  describe("base workflow class", () => {
    it("initializes values to zero", () => {
      expect(farm.generators.length).toBe(0);
      expect(farm.steps.length).toBe(0);
      expect(farm.value.toNumber()).toBe(0);
    });
    it("copies when accessing via getters", () => {
      // @ts-ignore testing private value
      expect(farm.generators).not.toBe(farm._generators);
      // @ts-ignore testing private value
      expect(farm.steps).not.toBe(farm._steps);
    });
    it("freezes when accessing via getters", () => {
      expect(Object.isFrozen(farm.generators)).toBe(true);
      expect(Object.isFrozen(farm.steps)).toBe(true);
      expect(Object.isFrozen(farm.value)).toBe(true);
    });
  });
});
