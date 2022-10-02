import { BeanstalkConfig, Provider, Signer } from '../types';
import {  ethers } from 'ethers';
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

  constructor(config?: BeanstalkConfig) {
    this.handleConfig(config ?? {});

    // FIXME
    // @ts-ignore
    this.chainId = enumFromValue(this.provider?.network?.chainId ?? 1, ChainId);

    this.addresses = addresses;
    this.contracts = new Contracts(this);
    this.tokens = new Tokens(this);
    this.swap = new Swap(this);
  }

  handleConfig(config: BeanstalkConfig) {
    this.signer = config.signer;
    if (!config.provider && !config.signer) {
      console.log('WARNING: No provider or signer specified, using DefaultProvider.');
      this.provider = ethers.getDefaultProvider();
    } else {
      this.provider = config.signer?.provider ?? config.provider!;
    }
    this.providerOrSigner = config.signer ?? config.provider!;
    this.DEBUG = config.DEBUG ?? false;
  }

  debug(...args: any[]) {
    if (!this.DEBUG) return;
    console.debug(...args);
  }
}
