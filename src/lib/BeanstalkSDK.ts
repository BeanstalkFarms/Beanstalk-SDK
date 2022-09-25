import { BeanstalkConfig, Provider, Signer } from '../types';
import { BigNumber as BNJS } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { enumFromValue } from '../utils';
import { addresses, Chain } from '../constants';
import { Contracts } from './contracts';
import { Tokens } from './tokens';
import { Swap } from './swap';

// import { ChainID } from './constants';

export class BeanstalkSDK {
  public DEBUG: boolean;
  public signer?: Signer;
  public provider: Provider;
  public providerOrSigner: Signer | Provider;
  public chain: Chain;
  public contracts: Contracts;
  public addresses: typeof addresses;
  public tokens: Tokens;
  public swap: Swap;

  constructor(config: BeanstalkConfig) {
    this.handleConfig(config);

    // FIXME
    // @ts-ignore
    this.chain = enumFromValue(config.provider?.network?.chainId ?? 1, Chain);

    this.addresses = addresses;
    this.contracts = new Contracts(this);
    this.tokens = new Tokens(this);
    this.swap = new Swap(this);

    // console.log('Curve on Main: ', this.addresses.BEANSTALK.get(Chain.MAINNET));
    // console.log('Curve on chainId: ', this.addresses.CURVE.get(this.chainId));
    // console.log('Bean on default: ', this.addresses.BEANSTALK.get());
  }

  async tests() {
    // import { BigNumber as BNJS } from 'ethers';
    // import { BigNumber } from "@ethersproject/bignumber";

    let a = BNJS.from('123');

    // this method returns a BigNumber
    let b = await this.provider.getBalance('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
    let c = BigNumber.from('123');

    // sanity check
    console.log(a instanceof BNJS); // true
    console.log(a instanceof BigNumber); // true

    // wtf
    console.log(b instanceof BNJS); // false -- wtf?
    console.log(b instanceof BigNumber); // false -- wtf?

    // Cross check different imports
    console.log(c instanceof BNJS); // true
  }

  handleConfig(config: BeanstalkConfig) {
    if (!config.provider && !config.signer) throw new Error('Config must contain a provider or signer');
    this.signer = config.signer;
    this.provider = config.signer?.provider ?? config.provider!;
    this.providerOrSigner = config.signer ? config.signer : config.provider!;
    this.DEBUG = config.DEBUG ?? false;
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

  debug(...args: any[]) {
    if (!this.DEBUG) return;
    console.debug(...args);
  }
}
