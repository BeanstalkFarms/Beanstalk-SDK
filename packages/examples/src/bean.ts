import { DataSource } from "@beanstalk/sdk";
import chalk from "chalk";
import { table } from "table";

import { sdk, account as _account } from "./setup";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);

  const chopRate = await sdk.bean.getChopRate(sdk.tokens.UNRIPE_BEAN);
  console.log(chopRate);
}
