import { sdk, account } from "./setup";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const bal = await sdk.tokens.getBalance(sdk.tokens.ROOT, account);
  console.log(`Balance: internal: ${bal.internal.toHuman()}`);
  console.log(`Balance: external: ${bal.external.toHuman()}`);
  console.log(`Balance: total: ${bal.total.toHuman()}`);
}
