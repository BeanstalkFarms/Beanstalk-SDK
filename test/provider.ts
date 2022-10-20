import { ethers } from 'ethers';

export const getProvider = () => new ethers.providers.StaticJsonRpcProvider(
  `http://127.0.0.1:8545`,
  {
    name: 'foundry',
    chainId: 1337,
  }
);
