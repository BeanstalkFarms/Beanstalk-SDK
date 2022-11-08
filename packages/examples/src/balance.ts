import { sdk, account } from "./setup";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const bal = await sdk.tokens.getBalance(sdk.tokens.BEAN, account);
  console.log(`BEAN: internal: ${bal.internal.toHuman()}`);
  console.log(`BEAN: external: ${bal.external.toHuman()}`);
  console.log(`BEAN: total: ${bal.total.toHuman()}`);

  const op = sdk.swap.buildSwap(sdk.tokens.BEAN, sdk.tokens.BEAN, account);
}
