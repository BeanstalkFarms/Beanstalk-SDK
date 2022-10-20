import { getProvider } from '../../test/provider';

import { BeanstalkSDK } from './BeanstalkSDK';
import { _parseWithdrawalCrates } from './silo.utils';

/// Utilities
const RUN_TIMER = false;
const timer = async (fn: Promise<any>, label: string) => {
  if (RUN_TIMER) console.time(label);
  const r = await fn;
  if (RUN_TIMER) console.timeEnd(label);
  return r;
}

/// Constants
const account1 = '0x9a00beffa3fc064104b71f6b7ea93babdc44d9da'; // whale
const account2 = '0x0'; // zero addy
const account3 = '0x21DE18B6A8f78eDe6D16C50A167f6B222DC08DF7'; // BF Multisig

/// Setup
let sdk : BeanstalkSDK;
beforeAll(() => {
  sdk = new BeanstalkSDK({
    provider: getProvider(),
    subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
  });
});

///
describe('Function: getBalances', function () {
  it('throws without account or signer', async () => {
    await expect(sdk.tokens.getBalances()).rejects.toThrow();
  });
  it('throws if a provided address is not a valid address', async () => {
    await expect(sdk.tokens.getBalances(account1, ['foo'])).rejects.toThrow();
  })
  it('throws if a provided address is not a token', async () => {
    // beanstalk.getAllBalances will revert if any of the requested tokens aren't actually tokens
    await expect(sdk.tokens.getBalances(account1, [account1])).rejects.toThrow('call revert exception');
  })
  it('accepts string for _tokens', async () => {
    const BEAN = sdk.tokens.BEAN.address;
    const result = await sdk.tokens.getBalances(account1, [BEAN]);
    expect(result.has(sdk.tokens.BEAN)).toBe(true);
  })
  it('accepts Token instance for _tokens', async () => {
    const result = await sdk.tokens.getBalances(account1, [sdk.tokens.BEAN]);
    expect(result.has(sdk.tokens.BEAN)).toBe(true);
  })
  it('returns a balance struct for each provided token', async () => {
    const result = await sdk.tokens.getBalances(
      account1,
      [sdk.tokens.BEAN, sdk.tokens.DAI]
    );
    expect(result.has(sdk.tokens.BEAN)).toBe(true);
    expect(result.has(sdk.tokens.DAI)).toBe(true);
    expect(result.has(sdk.tokens.BEAN_CRV3_LP)).toBe(false);
  });
});
