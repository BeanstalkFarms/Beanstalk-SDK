import { sdk, account } from "./setup";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  const arg = process.argv[3];
  if (arg) {
    await getBal(arg);
  } else {
    await Promise.all(["ETH", "WETH", "BEAN", "USDT", "USDC", "DAI", "CRV3", "ROOT"].map(getBal));
  }
}

async function getBal(t: string) {
  const token = sdk.tokens[t];
  if (!token) throw new Error(`No token found: ${t}`);
  const bal = await sdk.tokens.getBalance(token, account);
  console.log(token.symbol);
  console.log(`\tinternal: ${bal.internal.toHuman()}`);
  console.log(`\texternal: ${bal.external.toHuman()}`);
  console.log(`\ttotal: ${bal.total.toHuman()}`);
}
