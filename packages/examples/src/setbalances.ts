import { sdk, account } from "./setup";
import { Test, Token } from "@beanstalk/sdk";
main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const token = process.argv[3];
  const amount = process.argv[4];
  if (token && !amount) throw new Error("must pass zero or two args (token and amount)");

  let t = new Test.TestUtils(sdk);
  if (!token) {
    console.log("Setting all balances to 500,000");
    await t.setAllBalances(account, "500000");
  } else {
    console.log(`Setting ${token} balance to ${amount}`);
    try {
      const tok = sdk.tokens[token] as Token;
      await t[`set${token}Balance`](account, tok.amount(amount));
    } catch (err) {
      console.log(err);
    }
  }
}
