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

  // Mow
  const deposit = await sdk.silo.createDeposit(sdk.tokens.BEAN_CRV3_LP);

  const t1 = sdk.tokens.BEAN_CRV3_LP;
  const t2 = sdk.tokens.CRV3;
  deposit.addToken(t1, t1.amount(3));
  deposit.addToken(t2, t2.amount(3));

  const est = await deposit.estimate();

  console.log(est);
  await stop();
}
