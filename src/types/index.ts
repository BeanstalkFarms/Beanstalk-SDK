import { ethers } from 'ethers';

export type Provider = ethers.providers.Provider;

export type Signer = ethers.Signer;

export type BeanstalkConfig = {
  provider?: Provider;
  signer?: Signer;
  rpcUrl?: string;
  DEBUG?: boolean;
};

// Returns the type of the value of a Map<key, value>
export type MapValueType<A> = A extends Map<any, infer V> ? V : never;
export type StringMap<T> = { [address: string]: T };
