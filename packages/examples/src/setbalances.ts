import { sdk, account, chain } from "./setup";

main().catch((e) => {
  console.log("FAILED:");
  console.log(e);
});

async function main() {
  await chain.setAllBalances(account, "500000");
}
