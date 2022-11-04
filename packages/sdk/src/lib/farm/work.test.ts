import { ethers } from "ethers";
import { setupConnection } from "../../../test/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { Farm } from "../farm";

let sdk : BeanstalkSDK;
let account : string;

beforeAll(async () => {
  const { provider, signer, account: _account } = await setupConnection();
  account = _account;
  sdk = new BeanstalkSDK({
    provider,
    signer,
    subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
  });
})

describe('Workflow', () => {
  describe('add', () => {
    it('handles a mixed array', async () => {
      // Setup
      const farm = sdk.farm.create();
      farm.add([
        sdk.farm.presets.bean2usdt(),
        async () => '0xEXAMPLE1',
        async () => '0xEXAMPLE2',
      ]);

      expect(farm.steps.length).toBe(3);
      expect(farm.stepResults.length).toBe(0);

      // Estimation
      await farm.estimate(ethers.BigNumber.from(1000_000000));

      expect(farm.stepResults.length).toBe(3);
      expect(farm.stepResults[1].encode(ethers.BigNumber.from(0)))
        .toBe('0xEXAMPLE1')
      expect(farm.stepResults[2].encode(ethers.BigNumber.from(0)))
        .toBe('0xEXAMPLE2')
    });

    it('throws on invalid input', async () => {
      const farm = sdk.farm.create();
      expect(() => farm.add({} as unknown as () => string)).toThrow('Unknown action type')
    })

    // it('copies')
  });
})