import type { ethers } from 'ethers';

export type Provider = ethers.providers.Provider;

export type Signer = ethers.Signer;

export type BeanstalkConfig = {
  provider?: Provider;
  signer?: Signer;
  rpcUrl?: string;
  DEBUG?: boolean;
};
