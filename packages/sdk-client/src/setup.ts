import { ethers } from "ethers";

export const account = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const providerUrl = "ws://localhost:8545";
const provider = new ethers.providers.WebSocketProvider(providerUrl);
export const signer = new ethers.Wallet(privateKey, provider);
