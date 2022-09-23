import { ethers } from 'ethers';

export type Provider = ethers.providers.BaseProvider;

export type BeanstalkConfig = {
  provider: Provider;
};
