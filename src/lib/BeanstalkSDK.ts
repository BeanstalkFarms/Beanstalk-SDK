import { BeanstalkConfig, Provider } from '../types';

import { enumFromValue } from '../utils';
import { ADDRESSES, Chain } from '../constants';
import { Contracts } from './Contracts';

// import { ChainID } from './constants';

export class BeanstalkSDK {
  public provider: Provider;
  public chain: Chain;
  public contracts: Contracts;
  public addresses: typeof ADDRESSES;
  // addresses: Address

  constructor(config: BeanstalkConfig) {
    this.handleConfig(config);
    this.provider = config.provider;
    this.chain = enumFromValue(config.provider?.network?.chainId ?? 1, Chain);
    this.addresses = ADDRESSES

    console.log('Curve on Main: ', this.addresses.BEANSTALK.get(Chain.MAINNET));
    // console.log('Curve on chainId: ', this.addresses.CURVE.get(this.chainId));
    // console.log('Bean on default: ', this.addresses.BEANSTALK.get());

    this.contracts = new Contracts(this);
  }

  handleConfig(config: BeanstalkConfig) {
    if (!config.provider) throw new Error('Provider not found in configuration');
  }

  async getAllBalances(account: string) {
    const [
      balanceOfEarnedBeans,
      balanceOfEarnedSeeds,
      balanceOfEarnedStalk,
      balanceOfGrownStalk,
      balanceOfPlenty,
      balanceOfRainRoots,
      balanceOfSeeds,
      balanceOfSop,
      balanceOfStalk,
    ] = await Promise.allSettled([
      this.contracts.beanstalk.balanceOfEarnedBeans(account),
      this.contracts.beanstalk.balanceOfEarnedSeeds(account),
      this.contracts.beanstalk.balanceOfEarnedStalk(account),
      this.contracts.beanstalk.balanceOfGrownStalk(account),
      this.contracts.beanstalk.balanceOfPlenty(account),
      this.contracts.beanstalk.balanceOfRainRoots(account),
      this.contracts.beanstalk.balanceOfSeeds(account),
      this.contracts.beanstalk.balanceOfSop(account),
      this.contracts.beanstalk.balanceOfStalk(account),
    ]);

    return {
      balanceOfEarnedBeans: balanceOfEarnedBeans.status === 'fulfilled' ? balanceOfEarnedBeans.value : balanceOfEarnedBeans.reason,
      balanceOfEarnedSeeds: balanceOfEarnedSeeds.status === 'fulfilled' ? balanceOfEarnedSeeds.value : balanceOfEarnedSeeds.reason,
      balanceOfEarnedStalk: balanceOfEarnedStalk.status === 'fulfilled' ? balanceOfEarnedStalk.value : balanceOfEarnedStalk.reason,
      balanceOfGrownStalk: balanceOfGrownStalk.status === 'fulfilled' ? balanceOfGrownStalk.value : balanceOfGrownStalk.reason,
      balanceOfPlenty: balanceOfPlenty.status === 'fulfilled' ? balanceOfPlenty.value : balanceOfPlenty.reason,
      balanceOfRainRoots: balanceOfRainRoots.status === 'fulfilled' ? balanceOfRainRoots.value : balanceOfRainRoots.reason,
      balanceOfSeeds: balanceOfSeeds.status === 'fulfilled' ? balanceOfSeeds.value : balanceOfSeeds.reason,
      balanceOfSop: balanceOfSop.status === 'fulfilled' ? balanceOfSop.value : balanceOfSop.reason,
      balanceOfStalk: balanceOfStalk.status === 'fulfilled' ? balanceOfStalk.value : balanceOfStalk.reason,
    };
  }
}
