import { expect } from 'chai';
import { DataSource } from '../types';
import { getProvider } from '../../test/provider';

import { BeanstalkSDK } from './BeanstalkSDK';
import { Token } from '../classes/Token';
import { TokenSiloBalance } from './silo';

/// Utilities
const timer = async (fn: Promise<any>, label: string) => {
  console.time(label);
  const r = await fn;
  console.timeEnd(label);
  return r;
}

/// Constants
const account1 = '0x9a00beffa3fc064104b71f6b7ea93babdc44d9da'; // whale
const account2 = '0x0'; // zero addy

/// Setup
let sdk : BeanstalkSDK;
beforeAll(() => {
  sdk = new BeanstalkSDK({
    provider: getProvider(),
    subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
  });
});

///
describe('getBalance', function () {
  it('returns an empty object', async () => {
    const balance = await sdk.silo.getBalance(
      sdk.tokens.BEAN,
      account2,
      { source: DataSource.SUBGRAPH }
    );
    expect(balance.deposited.amount.toNumber()).to.be.eq(0);
    expect(balance.withdrawn.amount.toNumber()).to.be.eq(0);
    expect(balance.claimable.amount.toNumber()).to.be.eq(0);
  });
})

///
describe('getBalances', function() {
  let ledger : Map<Token, TokenSiloBalance>;
  let subgraph : Map<Token, TokenSiloBalance>;

  // Pulled an account with some large positions for testing
  // @todo pick several accounts and loop
  beforeAll(async () => {
    [ledger, subgraph] = await Promise.all([
      timer(sdk.silo.getBalances(account1, { source: DataSource.LEDGER }), "Ledger result time"),
      timer(sdk.silo.getBalances(account1, { source: DataSource.SUBGRAPH }), "Subgraph result time"),
    ]);
  })

  it('source: subgraph === ledger', async function () {
    for(let [token, value] of ledger.entries()) {
      expect(subgraph.has(token)).to.be.true;
      expect(value).to.deep.eq(subgraph.get(token))
    }
  });
});