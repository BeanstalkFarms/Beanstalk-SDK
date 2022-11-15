import { sdk, account } from "./setup";
import { Test } from "@beanstalk/sdk";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  let t = new Test.TestUtils(sdk);
  await t.setAllBalances(account, "0");
  await t.setDAIBalance(account, sdk.tokens.DAI.amount("0"));
}
