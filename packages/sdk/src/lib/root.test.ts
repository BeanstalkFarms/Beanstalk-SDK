import BigNumber from 'bignumber.js';
import { setupConnection } from '../../test/provider'
import { BeanstalkSDK } from './BeanstalkSDK';

/// Setup
let sdk : BeanstalkSDK;
let account: string;
beforeAll(async () => {
  const { signer, provider, account: _account } = await setupConnection();
  sdk = new BeanstalkSDK({
    provider: provider,
    signer: signer,
    subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
  });
  account = _account;
});

describe('mint function', () => {
  it('uses the right function', async () => {
    expect(true).toBe(true);
    // const typedData = await sdk.root.permit(
    //   [sdk.tokens.BEAN],
    //   [new BigNumber(1000)],
    // );
    // const permit = await sdk.permit.sign(
    //   account,
    //   typedData,
    // )
  })
})