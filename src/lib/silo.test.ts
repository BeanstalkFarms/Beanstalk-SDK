import { expect } from 'chai';
import { DataSource } from '../types';

import { BeanstalkSDK } from './BeanstalkSDK';

describe('getBalances', function() {
  let sdk : BeanstalkSDK;
  const account = '0x8d9261369e3bfba715f63303236c324d2e3c44ec';
  beforeAll(() => {
    sdk = new BeanstalkSDK()
  })
  it('source: subgraph === ledger', async function () {
    const [ledger, subgraph] = await Promise.all([
      sdk.silo.getBalances(account, { source: DataSource.LEDGER }),
      sdk.silo.getBalances(account, { source: DataSource.SUBGRAPH }),
    ]);
    expect(ledger).to.be.deep.equal(subgraph);
  });
});
