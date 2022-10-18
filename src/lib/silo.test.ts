import fs from 'fs';
import { expect } from 'chai';
import { DataSource } from '../types';
import { getProvider } from '../../test/provider';

import { BeanstalkSDK } from './BeanstalkSDK';
import { Token } from '../classes/Token';
import { TokenSiloBalance } from './silo';

const timer = async (fn: Promise<any>, label: string) => {
  console.time(label);
  const r = await fn;
  console.timeEnd(label);
  return r;
}

describe('getBalances', function() {
  let sdk : BeanstalkSDK;
  let ledger : Map<Token, TokenSiloBalance>;
  let subgraph : Map<Token, TokenSiloBalance>;
  // Pulled an account with some large positions for testing
  // @todo pick several accounts and loop
  const account = '0x9a00beffa3fc064104b71f6b7ea93babdc44d9da'; 
  beforeAll(async () => {
    sdk = new BeanstalkSDK({
      provider: getProvider(),
      subgraphUrl: 'https://graph.node.bean.money/subgraphs/name/beanstalk-testing'
    });
    [ledger, subgraph] = await Promise.all([
      timer(sdk.silo.getBalances(account, { source: DataSource.LEDGER }), "Ledger result time: "),
      timer(sdk.silo.getBalances(account, { source: DataSource.SUBGRAPH }), "Subgraph result time: "),
    ]);
  })
  it('source: subgraph === ledger', async function () {
    for(let [token, value] of ledger.entries()) {
      expect(subgraph.has(token)).to.be.true;
      expect(value).to.deep.eq(subgraph.get(token))
    }
  });
});
