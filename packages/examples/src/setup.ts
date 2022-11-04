import { BeanstalkSDK, DataSource, TokenSiloBalance } from "@beanstalk/sdk";
import { ethers } from "ethers";

export const account      = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
export const BF_MULTISIG  = "0x21DE18B6A8f78eDe6D16C50A167f6B222DC08DF7";

export const provider = new ethers.providers.StaticJsonRpcProvider("http://localhost:8545");
export const sdk = new BeanstalkSDK({
  provider,
  signer: provider.getSigner(account),
  subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  source: DataSource.LEDGER
});

// ------------------------------------------

export const logSiloBalance = (address: string, balance: TokenSiloBalance) => {
  console.log(`Address ${address} has ${balance.deposited.amount.toString()} BEAN deposited in the Silo.`);
  balance.deposited.crates.forEach((crate, i) => console.log(`  | ${i}: ${crate.season.toString()} = ${crate.amount.toString()}`))
}

// ------------------------------------------

export const sendDeposit = async () => {
  await provider.send('anvil_impersonateAccount', [BF_MULTISIG]);

  const balance = await sdk.silo.getBalance(sdk.tokens.BEAN, BF_MULTISIG, { source: DataSource.LEDGER });
  const crate   = balance.deposited.crates[balance.deposited.crates.length - 1];
  const season  = crate.season.toString();
  const amount  = crate.amount.toBlockchain();

  logSiloBalance(BF_MULTISIG, balance)
  console.log(`Transferring ${crate.amount.toString()} BEAN to ${account}...`, { season, amount });

  const txn = await sdk.contracts.beanstalk.connect(await provider.getSigner(BF_MULTISIG)).transferDeposit(
    BF_MULTISIG,
    account,
    sdk.tokens.BEAN.address,
    season,
    amount,
  );
  
  await txn.wait();
  console.log(`Transferred!`);

  await provider.send('anvil_stopImpersonatingAccount', [BF_MULTISIG]);
  return crate.amount;
}

export const send_bean = async (_amount: number) => {
  console.log(`Sending ${_amount.toLocaleString()} BEAN from ${BF_MULTISIG} -> ${account}...`)
  
  await provider.send('anvil_impersonateAccount', [BF_MULTISIG]);
  const contract = sdk.tokens.BEAN.getContract().connect(await provider.getSigner(BF_MULTISIG));
  await contract.transfer(account, sdk.tokens.BEAN.amount(_amount).toBlockchain())
  await provider.send('anvil_stopImpersonatingAccount', [BF_MULTISIG]);

  console.log(`Sent!`);
}