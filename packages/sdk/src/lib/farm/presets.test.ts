import { TestUtils } from "src/utils.tests";
import { setupConnection } from "../../utils.tests/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { FarmFromMode } from "./types";
import { Work } from "./Work";

let sdk : BeanstalkSDK;
let test : TestUtils;
let account : string;

beforeAll(async () => {
  const { provider, signer, account: _account } = await setupConnection();
  account = _account;
  sdk = new BeanstalkSDK({
    provider,
    signer,
    subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
  });
  test = new TestUtils(sdk);
});

describe('Facet: Pipeline', () => {
  let farm : Work;
  let snapshot : number;
  beforeAll(async () => {
  })
  beforeEach(async () => { 
    snapshot = await test.snapshot()
    farm = sdk.farm.create();
    await test.sendBean(account, sdk.tokens.BEAN.amount(100))
  });
  afterEach(async () => {
    await test.revert(snapshot);
  });
  
  describe('loadPipeline', () => {
    it('loads without permit', async () => {
      // Setup
      const amount = sdk.tokens.BEAN.amount(100);
      farm.add(
        sdk.farm.presets.loadPipeline(
          sdk.tokens.BEAN,
          amount.toBlockchain(),
          FarmFromMode.EXTERNAL,
        )
      );

      // Estimate
      await farm.estimate(amount.toBigNumber());
      const encoded = farm.stepResults[0].encode();
      expect(farm.stepResults.length).toBe(1);
      expect(encoded.slice(0, 10)).toBe(
        sdk.contracts.beanstalk.interface.getSighash('transferToken')
      );

      // Execute
      await farm.execute(amount.toBigNumber(), 0.1).then(r => r.wait());
      
      const pipelineBalance = await sdk.tokens.getBalance(sdk.tokens.BEAN, sdk.contracts.pipeline.address);
      expect(pipelineBalance.total.eq(amount)).toBe(true);
      expect(pipelineBalance.total.toHuman()).toBe('100');
    });

    it('loads with permit, single token', async () => {
      // Setup
      const amount = sdk.tokens.BEAN.amount("100")
      const permit = await sdk.permit.sign(
        account,
        sdk.tokens.permitERC2612(
          account, // owner
          sdk.contracts.pipeline.address, // spender
          sdk.tokens.BEAN, // token
          amount.toBlockchain(), // amount
        )
      );
      farm.add(
        sdk.farm.presets.loadPipeline(
          sdk.tokens.BEAN,
          amount.toBlockchain(),
          FarmFromMode.EXTERNAL,
          permit
        )
      );

      // Estimate
      await farm.estimate(amount.toBigNumber());
      const encoded0 = farm.stepResults[0].encode();
      const encoded1 = farm.stepResults[1].encode();
      expect(farm.stepResults.length).toBe(2);
      expect(encoded0.slice(0, 10)).toBe(
        sdk.contracts.beanstalk.interface.getSighash('permitERC20')
      );
      expect(encoded1.slice(0, 10)).toBe(
        sdk.contracts.beanstalk.interface.getSighash('transferToken')
      )

      // Execute
      await farm.execute(amount.toBigNumber(), 0.1).then(r => r.wait());
      
      const pipelineBalance = await sdk.tokens.getBalance(sdk.tokens.BEAN, sdk.contracts.pipeline.address);
      expect(pipelineBalance.total.eq(amount)).toBe(true);
      expect(pipelineBalance.total.toHuman()).toBe('100');
    });

    // TODO: multiple tokens
  });
});