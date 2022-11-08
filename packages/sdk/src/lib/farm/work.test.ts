import { ethers } from "ethers";
import { setupConnection } from "../../utils.tests/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";

let sdk: BeanstalkSDK;
let account: string;

beforeAll(async () => {
  const { provider, signer, account: _account } = await setupConnection();
  account = _account;
  sdk = new BeanstalkSDK({
    provider,
    signer,
    subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  });
});

describe("Workflow", () => {
  describe("add", () => {
    it("handles a mixed array", async () => {
      // Setup
      const farm = sdk.farm.create();
      farm.add([sdk.farm.presets.bean2usdt(), async () => "0xCALLDATA1", async () => "0xCALLDATA2"]);

      expect(farm.steps.length).toBe(3);
      expect(farm.stepResults.length).toBe(0);

      // Estimation
      await farm.estimate(ethers.BigNumber.from(1000_000000));

      expect(farm.stepResults.length).toBe(3);
      expect(farm.stepResults[1].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA1");
      expect(farm.stepResults[2].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA2");
    });

    it("recurses through nested arrays of actions", async () => {
      // Setup
      const farm = sdk.farm.create();
      farm.add([
        sdk.farm.presets.bean2usdt(),
        async () => "0xCALLDATA1",
        [async () => "0xCALLDATA2", async () => "0xCALLDATA3", [async () => "0xCALLDATA4"], async () => "0xCALLDATA5"],
      ]);

      expect(farm.steps.length).toBe(6);
      expect(farm.stepResults.length).toBe(0);

      // Estimation
      await farm.estimate(ethers.BigNumber.from(1000_000000));

      expect(farm.stepResults.length).toBe(6);
      expect(farm.stepResults[1].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA1");
      expect(farm.stepResults[2].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA2");
      expect(farm.stepResults[5].encode(ethers.BigNumber.from(0))).toBe("0xCALLDATA5");
    });

    it("throws on invalid input", async () => {
      const farm = sdk.farm.create();
      expect(() => farm.add({} as unknown as () => string)).toThrow("Unknown action type");
    });
  });

  describe("copy", () => {
    it("copies to a new instance with same steps", async () => {
      const farm1 = sdk.farm.create();
      farm1.add(() => "0xCALLDATA1");
      const farm2 = farm1.copy();

      expect(farm1).not.toBe(farm2); // diff instances
      expect(farm1.steps.length).toEqual(1);
      expect(farm2.steps.length).toEqual(1);

      await Promise.all([farm1.estimate(ethers.BigNumber.from(100)), farm2.estimate(ethers.BigNumber.from(100))]);

      expect(farm1.stepResults[0].encode()).toEqual(farm2.stepResults[0].encode());
    });
  });

  describe("run", () => {
    it.skip("runs a BaseAction", async () => {});
    it.skip("runs a Function that returns a string", async () => {});
    it.skip("runs a Function that returns an ActionResult", async () => {});
  });

  describe("slippage", () => {
    it.skip("converts decimal-based slippage into BigNumber", () => {});
  });

  describe("encode", () => {
    it.skip("encodes steps with slippage", async () => {});
  });
});
