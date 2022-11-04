import { ethers } from "ethers";
import { setupConnection } from "../../../test/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { Farm } from "../farm";
import { FarmFromMode } from "./types";
import { Work } from "./Work";

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
});

describe('Facet: Pipeline', () => {
  let farm : Work; // fixme
  beforeEach(() => { farm = sdk.farm.create(); });
  
  describe('loadPipeline', () => {
    it('loads without permit', async () => {
      // Setup
      farm.add(
        sdk.farm.presets.loadPipeline(
          sdk.tokens.BEAN,
          sdk.tokens.BEAN.stringify(1000),
          FarmFromMode.EXTERNAL,
        )
      );

      // Estimate
      await farm.estimate();
      const encoded = farm.stepResults[0].encode();

      expect(farm.stepResults.length).toBe(1);
      expect(encoded.slice(0, 10)).toBe(
        sdk.contracts.beanstalk.interface.getSighash('transferToken')
      );
    });

    it('loads with permit, single token', async () => {
      // Setup
      const permit = await sdk.permit.sign(
        account,
        sdk.tokens.permitERC2612(
          account, // owner
          sdk.contracts.pipeline.address, // spender
          sdk.tokens.BEAN, // token
          sdk.tokens.BEAN.stringify(1000), // amount
        )
      );
      farm.add(
        sdk.farm.presets.loadPipeline(
          sdk.tokens.BEAN,
          sdk.tokens.BEAN.stringify(1000),
          FarmFromMode.EXTERNAL,
          permit
        )
      );

      // Estimate
      

      // todo: finish expectations here
    });
    // todo: multiple tokens
  });
})