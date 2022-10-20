import fs from 'fs';
import { expect } from 'chai';
import { DataSource } from '../types';
import { getProvider } from '../../test/provider';

import { BeanstalkSDK } from './BeanstalkSDK';
import { Token } from '../classes/Token';
import { TokenSiloBalance } from './silo';
import { _parseWithdrawalCrates } from './silo.utils';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

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
describe('Utilities', function () {
  it('splits raw withdrawals into withdrawn and claimable', () => {
    const crate1 = { amount: ethers.BigNumber.from(1000 * 1E6) };
    const crate2 = { amount: ethers.BigNumber.from(2000 * 1E6) };
    const crate3 = { amount: ethers.BigNumber.from(3000 * 1E6) };
    const result = _parseWithdrawalCrates(
      sdk.tokens.BEAN,
      {
        '6074': crate1, // => claimable
        '6075': crate2, // => withdrawn
        '6076': crate3, // => withdrawn
      },
      new BigNumber(6074)
    );
    expect(result.claimable.amount).to.be.instanceOf(BigNumber);
    expect(result.withdrawn.amount).to.be.instanceOf(BigNumber);
    expect(result.claimable.amount.toString()).to.be.eq( new BigNumber(1000).toString() );
    expect(result.withdrawn.amount.toString()).to.be.eq( new BigNumber(2000 + 3000).toString() );
    expect(result.claimable.crates.length).to.be.eq(1);
    expect(result.withdrawn.crates.length).to.be.eq(2);
  })
});

///
describe('Function: getBalance', function () {
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
  it('loads an account with deposits (fuzzy)', async () => {
    const balance = await sdk.silo.getBalance(
      sdk.tokens.BEAN,
      account3,
      { source: DataSource.SUBGRAPH }
    );
    expect(balance.deposited.amount.toNumber()).to.be.gt(10_000); // FIXME
    expect(balance.withdrawn.amount.toNumber()).to.be.eq(0);
    expect(balance.claimable.amount.toNumber()).to.be.eq(0);
  });
})

///
describe('Function: getBalances', function() {
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

  it('source: ledger === subgraph', async function () {
    for(let [token, value] of ledger.entries()) {
      expect(subgraph.has(token)).to.be.true;
      try {
        // received              expected
        expect(value).to.deep.eq(subgraph.get(token));
      } catch(e) {
        console.log(`Token: ${token.name}`)
        console.log(`Expected (subgraph):`, subgraph.get(token));
        console.log(`Received (ledger):`, value);
        throw e;
      }
    }
  });
});