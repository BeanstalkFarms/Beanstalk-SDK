import { BeanstalkSDK, DataSource, TestUtils } from "@beanstalk/sdk";
import { ethers } from "ethers";

export const provider = new ethers.providers.StaticJsonRpcProvider("http://localhost:8545");
export const { signer, account } = TestUtils.setupConnection(provider);

export const sdk = new BeanstalkSDK({
  provider,
  signer: signer,
  subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  source: DataSource.LEDGER,
  DEBUG: true
});

export const chain = new TestUtils.BlockchainUtils(sdk);
