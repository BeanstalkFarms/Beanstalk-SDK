import { ethers } from 'ethers';
import { BeanstalkSDK } from '../src';

describe('blah', () => {
  it('works', () => {
    const providerUrl = 'ws://localhost:8545';

    const provider = new ethers.providers.WebSocketProvider(providerUrl);

    const bs = new BeanstalkSDK({ provider });
    expect(bs.addresses.BEANSTALK.get()).toEqual('0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5'.toLowerCase())
  });
});
