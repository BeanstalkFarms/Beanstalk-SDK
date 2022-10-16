import { BeanstalkConfig, DataSource, Provider, Reconfigurable, Signer } from '../types';
import { ethers } from 'ethers';
import { enumFromValue } from '../utils';
import { addresses, ChainId } from '../constants';
import { Tokens } from './tokens';
import { Contracts } from './contracts';
import { Swap } from './swap';
import Farm from './farm';

import { EventManager } from './events/EventManager';
import { Silo } from './silo';
import { Sun } from './sun';

// import { ChainID } from './constants';

export class BeanstalkSDK {
  public DEBUG: boolean;
  public signer?: Signer;
  public provider: Provider;
  public providerOrSigner: Signer | Provider;
  public source: DataSource;

  public readonly chainId: ChainId;
  public readonly contracts: Contracts;
  public readonly addresses: typeof addresses;
  public readonly tokens: Tokens;
  public readonly swap: Swap;
  public readonly farm: Farm;
  public readonly events: EventManager;
  public readonly silo: Silo;
  public readonly sun: Sun;

  constructor(config?: BeanstalkConfig) {
    this.handleConfig(config);
    // FIXME
    // @ts-ignore
    this.chainId = enumFromValue(this.provider?.network?.chainId ?? 1, ChainId);

    this.addresses = addresses;
    this.contracts = new Contracts(this);
    this.tokens = new Tokens(this);
    this.farm = new Farm(this);
    this.swap = new Swap(this);
    this.silo = new Silo(this);
    this.events = new EventManager(this);
    this.sun = new Sun(this);
  }

  handleConfig(config: BeanstalkConfig = {}) {
    if (config.rpcUrl) {
      config.provider = this.getProviderFromUrl(config.rpcUrl);
    }

    this.signer = config.signer;
    if (!config.provider && !config.signer) {
      console.log('WARNING: No provider or signer specified, using DefaultProvider.');
      this.provider = ethers.getDefaultProvider();
    } else {
      this.provider = config.signer?.provider ?? config.provider!;
    }
    this.providerOrSigner = config.signer ?? config.provider!;
    this.DEBUG = config.DEBUG ?? false;

    this.source = DataSource.LEDGER; // FIXME
  }

  debug(...args: any[]) {
    if (!this.DEBUG) return;
    console.debug(...args);
  }

  getProviderFromUrl(url: string): Provider {
    if (url.startsWith('ws')) {
      return new ethers.providers.WebSocketProvider(url);
    }
    if (url.startsWith('http')) {
      return new ethers.providers.JsonRpcProvider();
    }

    throw new Error('rpcUrl is invalid');
  }

  async getAccount() : Promise<string> {
    if (!this.signer) throw new Error('Cannot get account without a signer');
    const account = await this.signer.getAddress();
    if (!account) throw new Error('Failed to get account from signer');
    return account;
  }

  deriveSource<T extends { source?: DataSource }>(config?: T) : DataSource {
    return config?.source || this.source;
  } 

  deriveConfig<T extends BeanstalkConfig>(key: keyof Reconfigurable, _config?: T) : BeanstalkConfig[typeof key] {
    return _config?.[key] || this[key];
  }
}
