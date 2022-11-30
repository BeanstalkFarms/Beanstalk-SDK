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

  const target = sdk.tokens.BEAN_CRV3_LP;
  const input = sdk.tokens.BEAN_CRV3_LP;
  const amount = input.amount(400);
  await input.approveBeanstalk(amount);

  const deposit = await sdk.silo.buildDeposit(target, account);
  deposit.setInputToken(input);

  const tx = await deposit.execute(amount, 0.1);
  await tx.wait();
  console.log("done");
  await stop();
}
