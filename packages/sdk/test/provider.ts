import { ethers } from 'ethers';

export const getProvider = () => new ethers.providers.StaticJsonRpcProvider(
  `http://127.0.0.1:8545`,
  {
    name: 'foundry',
    chainId: 1337,
  }
);

// private key + account mapping
// these keys are provided by hardhat/anvil
const ACCOUNTS = [
  ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266']
] as const;

export const setupConnection = async () => {
  const [privateKey, account] = ACCOUNTS[0];
  const provider = getProvider();
  const signer = new ethers.Wallet(privateKey, provider)
  return { 
    provider,
    signer,
    account
  };
}