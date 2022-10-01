import { BeanstalkConfig, Provider, Signer } from '../types';
import { BigNumber as BNJS } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { enumFromValue } from '../utils';
import { addresses, ChainId } from '../constants';
import { Contracts } from './contracts';
import { Tokens } from './tokens';
import { Swap } from './swap';

// import { ChainID } from './constants';

export class BeanstalkSDK {
  public DEBUG: boolean;
  public signer?: Signer;
  public provider: Provider;
  public providerOrSigner: Signer | Provider;
  public chainId: ChainId;
  public contracts: Contracts;
  public addresses: typeof addresses;
  public tokens: Tokens;
  public swap: Swap;

  constructor(config: BeanstalkConfig) {
    this.handleConfig(config);

    // FIXME
    // @ts-ignore
    this.chainId = enumFromValue(config.provider?.network?.chainId ?? 1, ChainId);

    this.addresses = addresses;
    this.contracts = new Contracts(this);
    this.tokens = new Tokens(this);
    this.swap = new Swap(this);
  }


  handleConfig(config: BeanstalkConfig) {
    if (!config.provider && !config.signer) throw new Error('Config must contain a provider or signer');
    this.signer = config.signer;
    this.provider = config.signer?.provider ?? config.provider!;
    this.providerOrSigner = config.signer ? config.signer : config.provider!;
    this.DEBUG = config.DEBUG ?? false;
  }


  debug(...args: any[]) {
    if (!this.DEBUG) return;
    console.debug(...args);
  }
}
