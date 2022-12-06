import { BeanstalkSDK, ERC20Token, Token, TokenValue } from "@beanstalk/sdk";
import chalk from "chalk";
import { table } from "table";

import { account as _account, impersonate } from "../setup";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);

  // Some of the claiming contract methods don't accept an (account) parameter
  // and work off of msg.sender, so we need to impersonate the passed account.
  const { sdk, stop } = await impersonate(account);
  // sdk.DEBUG = false;

  // await deposit(sdk.tokens.CRV3, sdk.tokens.BEAN_CRV3_LP, 400, account, sdk);
  // await deposit(sdk.tokens.BEAN, sdk.tokens.BEAN_CRV3_LP, 400, account, sdk);
  // await deposit(sdk.tokens.DAI, sdk.tokens.BEAN_CRV3_LP, 400, account, sdk);
  // await deposit(sdk.tokens.USDC, sdk.tokens.BEAN_CRV3_LP, 400, account, sdk);
  await deposit(sdk.tokens.USDT, sdk.tokens.BEAN_CRV3_LP, 400, account, sdk);

  await stop();
}

async function deposit(input: ERC20Token, target: Token, _amount: number, account: string, sdk: BeanstalkSDK) {
  console.log(`Depositing ${_amount} ${input.symbol} to ${target.symbol} silo`);
  const amount = input.amount(_amount);
  await input.approveBeanstalk(amount);

  const deposit = await sdk.silo.buildDeposit(target, account);
  deposit.getGraph();
  deposit.setInputToken(input);

  const tx = await deposit.execute(amount, 0.1);
  await tx.wait();
  console.log("DONE");
}
