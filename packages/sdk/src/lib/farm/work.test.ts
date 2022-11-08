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
      farm.add([sdk.farm.presets.bean2usdt(), async () => "0xEXAMPLE1", async () => "0xEXAMPLE2"]);

      expect(farm.steps.length).toBe(3);
      expect(farm.stepResults.length).toBe(0);

      // Estimation
      await farm.estimate(ethers.BigNumber.from(1000_000000));

      expect(farm.stepResults.length).toBe(3);
      expect(farm.stepResults[1].encode(ethers.BigNumber.from(0))).toBe("0xEXAMPLE1");
      expect(farm.stepResults[2].encode(ethers.BigNumber.from(0))).toBe("0xEXAMPLE2");
    });

    it("recurses through nested arrays of actions", async () => {
      // Setup
      const farm = sdk.farm.create();
      farm.add([
        sdk.farm.presets.bean2usdt(),
        async () => "0xEXAMPLE1",
        [async () => "0xEXAMPLE2", async () => "0xEXAMPLE3", [async () => "0xEXAMPLE4"], async () => "0xEXAMPLE5"],
      ]);

      expect(farm.steps.length).toBe(6);
      expect(farm.stepResults.length).toBe(0);

      // Estimation
      await farm.estimate(ethers.BigNumber.from(1000_000000));

      expect(farm.stepResults.length).toBe(6);
      expect(farm.stepResults[1].encode(ethers.BigNumber.from(0))).toBe("0xEXAMPLE1");
      expect(farm.stepResults[2].encode(ethers.BigNumber.from(0))).toBe("0xEXAMPLE2");
      expect(farm.stepResults[5].encode(ethers.BigNumber.from(0))).toBe("0xEXAMPLE5");
    });

    it("throws on invalid input", async () => {
      const farm = sdk.farm.create();
      expect(() => farm.add({} as unknown as () => string)).toThrow("Unknown action type");
    });
  });
});
