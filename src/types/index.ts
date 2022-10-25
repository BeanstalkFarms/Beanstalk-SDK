import { ethers } from 'ethers';

export type Provider = ethers.providers.Provider;

export type Signer = ethers.Signer;

export type BeanstalkConfig = Partial<{
  // Ledger
  provider: Provider;
  signer: Signer;
  rpcUrl: string;
  // Subgraph
  subgraphUrl: string;
  // Defaults
  source: DataSource;
  // Debug
  DEBUG: boolean;
}>;

export type Reconfigurable = Pick<
  BeanstalkConfig,
  "source"
>

// Returns the type of the value of a Map<key, value>
export type MapValueType<A> = A extends Map<any, infer V> ? V : never;
export type StringMap<T> = { [address: string]: T };

// FIXME: add tests to ensure the proper DataSource is used. Setting a value to 0 causes issues rn
export enum DataSource {
  LEDGER   = 1,
  SUBGRAPH = 2, 
}

// export function excludeHead<T extends any[]>(arr: readonly [any, ...T]) {
//   const [_, ...rest] = arr;
//   return rest;
// }