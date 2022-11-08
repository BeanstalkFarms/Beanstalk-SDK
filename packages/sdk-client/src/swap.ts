import { BeanstalkSDK, FarmFromMode, FarmToMode } from "@beanstalk/sdk";
// import { BeanstalkSDK } from "@sdk";
import { signer } from "./setup";

main()
  .catch((e) => {
    console.log(e);
  })
  .finally(() => process.exit());

async function main() {
  const sdk = new BeanstalkSDK({ signer });

  await run(sdk);
}

async function run(sdk: BeanstalkSDK) {
  const fromToken = sdk.tokens.ETH;
  const toToken = sdk.tokens.CRV3;
  // const toToken = sdk.tokens.DAI;
  const amount = sdk.tokens.ETH.fromHuman(5);
  // const amount = sdk.tokens.BEAN.fromHuman(3);

  // const op = sdk.swap.buildSwap(fromToken, toToken);
  // const op = sdk.swap.buildSwap(fromToken, toToken, FarmFromMode.EXTERNAL, );
  const op = sdk.swap.buildSwap(fromToken, toToken, FarmFromMode.INTERNAL, FarmToMode.EXTERNAL);

  console.log(op.getDisplay());
  console.log(op.getSimplePath());

  const est = await op.estimate(amount);
  console.log("Estimate: ", est.toHuman());

  const tx = await op.execute(amount, 2);
  await tx.wait();
  console.log("Swapped!", tx.hash);
}
