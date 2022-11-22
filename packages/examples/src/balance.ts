import { sdk, account as _account } from "./setup";
import { table } from "table";
import chalk from "chalk";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);
  let res = [[chalk.bold("Token"), chalk.bold("Internal"), chalk.bold("External"), chalk.bold("Total")]];
  if (account) {
    res.push(await getBal(account));
  } else {
    const bals = await Promise.all(
      ["ETH", "WETH", "BEAN", "USDT", "USDC", "DAI", "CRV3", "UNRIPE_BEAN", "UNRIPE_BEAN_CRV3", "ROOT"].map(getBal)
    );
    res.push(...bals);
  }
  console.log(table(res));
}

async function getBal(t: string) {
  const token = sdk.tokens[t];
  if (!token) throw new Error(`No token found: ${t}`);

  try {
    const bal = await sdk.tokens.getBalance(token, account);
    return [
      chalk.grey(token.symbol),
      chalk.green(bal.internal.toHuman()),
      chalk.green(bal.external.toHuman()),
      chalk.greenBright(bal.total.toHuman())
    ];
  } catch (e) {
    return [chalk.red(token.symbol), " -- ", " -- ", " -- "];
  }
}
