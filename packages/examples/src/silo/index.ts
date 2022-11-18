import { DataSource } from "@beanstalk/sdk";
import chalk from "chalk";
import { table } from "table";

import { sdk, account as _account } from "../setup";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const account = process.argv[3] || _account;
  console.log(`${chalk.bold.whiteBright("Account:")} ${chalk.greenBright(account)}`);

  await showSummary(account);
  await showSiloBalances(account);
}

async function showSummary(account: string) {
  const price = await sdk.getPrice();
  console.log(`${chalk.bold.whiteBright("BEAN price:")} ${chalk.greenBright(price.toHuman())}`);
  const total = "tbd"; // (await sdk.silo.getDeposits(account)).toString();
  const stalk = (await sdk.silo.getStalk(account)).toHuman();
  const seeds = (await sdk.silo.getSeeds(account)).toHuman();
  const earnedBeans = (await sdk.silo.getEarnedBeans(account)).toHuman();
  const earnedStalk = (await sdk.silo.getEarnedStalk(account)).toHuman();
  const plantableSeeds = (await sdk.silo.getPlantableSeeds(account)).toHuman();
  const grownStalk = (await sdk.silo.getGrownStalk(account)).toHuman();
  const revStalk = (await sdk.silo.getRevitalizedStalk(account)).toHuman();
  const revSeeds = (await sdk.silo.getRevitalizedSeeds(account)).toHuman();

  const earned = [
    ["Current Balances", "", "", "", "", ""],
    ["Total Deposits", "", "Stalk", "", "Seeds", ""],
    [total, "", stalk, "", seeds, ""],
    ["Earnings", "", "", "", "", ""],
    ["Earned Beans", "Earned Stalk", "Plantable Seeds", "Grown Stalk", "Revitalized Stalk", "Revitalized Seeds"],
    [earnedBeans, earnedStalk, plantableSeeds, grownStalk, revStalk, revSeeds]
  ];

  console.log(
    table(earned, {
      spanningCells: [
        { col: 0, row: 0, colSpan: 6, alignment: "center" },
        { col: 0, row: 3, colSpan: 6, alignment: "center" },
        { col: 0, row: 1, colSpan: 2 },
        { col: 2, row: 1, colSpan: 2 },
        { col: 4, row: 1, colSpan: 2 },
        { col: 0, row: 2, colSpan: 2 },
        { col: 2, row: 2, colSpan: 2 },
        { col: 4, row: 2, colSpan: 2 }
      ]
    })
  );
}

async function showSiloBalances(account: string) {
  const tokenBalances = await sdk.silo.getBalances(account, { source: DataSource.LEDGER });
  const t: any[] = [];
  t.push(["SILO Balances", "", "", "", ""]);
  t.push(["TOKEN", "TYPE", "AMOUNT", "BDV", "# of CRATES"]);
  for (const [token, balance] of tokenBalances) {
    // console.log(`${token.symbol}`);
    const deposited = {
      amount: balance.deposited.amount.toHuman(),
      bdv: balance.deposited.bdv.toHuman(),
      crates: balance.deposited.crates
    };
    const withdrawn = {
      amount: balance.withdrawn.amount.toHuman(),
      crates: balance.withdrawn.crates
    };
    const claimable = {
      amount: balance.claimable.amount.toHuman(),
      crates: balance.claimable.crates
    };

    t.push([chalk.green(token.symbol), "deposited", deposited.amount, deposited.bdv, deposited.crates.length]);
    t.push(["", "withdrawn", withdrawn.amount, "", withdrawn.crates.length]);
    t.push(["", "claimable", claimable.amount, "", claimable.crates.length]);
  }
  console.log(table(t, { spanningCells: [{ col: 0, row: 0, colSpan: 5, alignment: "center" }] }));
}
