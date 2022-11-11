import { FarmWorkflow } from "./farm";
// import { workflowTestSuite } from "src/classes/Workflow.test";
import { setupConnection } from "src/utils.tests/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { ethers } from "ethers";

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

  describe("base Workflow class", () => {
    describe("setup", () => {
      it("initializes values to zero", () => {
        expect(farm.generators.length).toBe(0);
        expect(farm.length).toBe(0);
        expect(farm.value.toNumber()).toBe(0);
      });
      it("getters create new instances of private values", () => {
        // @ts-ignore testing private value
        expect(farm.generators).not.toBe(farm._generators);
        // @ts-ignore testing private value
        expect(farm.steps).not.toBe(farm._steps);
      });
      it("getters freeze returned objects", () => {
        expect(Object.isFrozen(farm.generators)).toBe(true);
        expect(Object.isFrozen(farm.value)).toBe(true);
      });
    });

    describe("add StepGenerators", () => {
      it("handles a mixed array", async () => {
        // Setup
        const farm = sdk.farm.create();
        farm.add([
          sdk.farm.presets.bean2usdt(), // instanceof StepClass
          async () => "0xCALLDATA1", // instanceof StepFunction (returns EncodedData)
          async () => ({
            // instanceof StepFunction (returns Step<EncodedData>)
            name: "call3",
            amountOut: ethers.BigNumber.from(0),
            encode: () => "0xCALLDATA2",
            decode: () => undefined,
            decodeResult: () => undefined,
          }),
        ]);
        expect(farm.generators.length).toBe(3);
        expect(farm.length).toBe(3);
        // @ts-ignore testing private value
        expect(farm._steps.length).toBe(0); // haven't yet estimated, so no steps

        // Estimation
        await farm.estimate(ethers.BigNumber.from(1000_000000));
        expect(farm.length).toBe(3);
        // @ts-ignore testing private value
        expect(farm._steps.length).toBe(3); // haven't yet estimated, so no steps
        // @ts-ignore testing private value
        expect(farm._steps[1].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA1");
        // @ts-ignore testing private value
        expect(farm._steps[2].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA2");
      });
      it("recurses through nested arrays of StepGenerators", async () => {
        // Setup
        const farm = sdk.farm.create();
        farm.add([
          sdk.farm.presets.bean2usdt(),
          async () => "0xCALLDATA100000000000000000000000000000000000000",
          [
            async () => "0xCALLDATA200000000000000000000000000000000000000",
            async () => "0xCALLDATA300000000000000000000000000000000000000",
            [async () => "0xCALLDATA400000000000000000000000000000000000000"],
            async () => "0xCALLDATA200000000000000000000000000000000000000",
          ],
        ]);
        expect(farm.generators.length).toBe(6);
        expect(farm.length).toBe(6);

        // Estimation
        await farm.estimate(ethers.BigNumber.from(1000_000000));
        // @ts-ignore testing private value
        expect(farm._steps[1].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA100000000000000000000000000000000000000");
        // @ts-ignore testing private value
        expect(farm._steps[2].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA200000000000000000000000000000000000000");
        // @ts-ignore testing private value
        expect(farm._steps[5].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA200000000000000000000000000000000000000");
      });
      it.todo("works when adding another Workflow");
    });

    describe("copy Workflow", () => {
      let farm1: FarmWorkflow;
      beforeAll(async () => {
        farm1 = sdk.farm.create();
        farm1.add(() => "0xCALLDATA1");
        await farm1.estimate(ethers.BigNumber.from(100));
      });
      it("copies to a new instance with same steps", async () => {
        const farm2 = farm1.copy();
        await farm2.estimate(ethers.BigNumber.from(100));
        expect(farm1).not.toBe(farm2); // diff instances
        expect(farm1.length).toEqual(1);
        expect(farm2.length).toEqual(1);
        // @ts-ignore
        expect(farm1._steps[0].encode()).toEqual(farm2._steps[0].encode());
      });
      it("doesn't copy results", async () => {
        const farm3 = farm1.copy();
        // @ts-ignore
        expect(farm3._steps.length).toBe(0);
      });
    });

    describe("clear", () => {
      it.todo("clears results");
    });
    describe("build step", () => {
      it.todo("builds a Step from StepFunction => EncodedData");
      it.todo("builds a Step from StepFunction => Step<EncodedData>");
      it.todo("builds a Step from StepClass");
      it.todo("builds a Step from Workflow");
    });
    describe("slippage", () => {
      it.todo("converts decimal-based slippage into BigNumber");
    });
    describe("encode", () => {
      it.todo("encodes Steps with slippage");
      it.todo("encodes itself into a single hex string");
    });
    describe("decode", () => {
      it.todo("decodes");
    });
  });
});
