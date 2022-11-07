import { BeanstalkSDK, FarmFromMode, FarmToMode, Token } from "@beanstalk/sdk";
// import { BeanstalkSDK } from "@sdk";
import { signer } from "./setup";

main()
  .catch((e) => {
    console.log(e);
  })
  .finally(() => process.exit());

async function main() {
  const sdk = new BeanstalkSDK({ signer });

  // await swap(sdk, sdk.tokens.USDT, sdk.tokens.USDT, "500", FarmFromMode.INTERNAL, FarmToMode.EXTERNAL);
  await swap(sdk, sdk.tokens.ETH, sdk.tokens.BEAN, "10");
}

async function run(sdk: BeanstalkSDK) {
  const fromToken = sdk.tokens.USDT;
  const toToken = sdk.tokens.DAI;
  // const toToken = sdk.tokens.DAI;
  const amount = sdk.tokens.USDT.fromHuman(3000);
  // const amount = sdk.tokens.BEAN.fromHuman(3);

  const op = await sdk.swap.buildSwap(fromToken, toToken);

  console.log(op.getDisplay());
  console.log(op.getSimplePath());

  const est = await op.estimate(amount);
  console.log("Estimate: ", est.toHuman());

  const tx = await op.execute(amount, 2);
  await tx.wait();
  console.log("Swapped!", tx.hash);
}

async function swap(
  sdk: BeanstalkSDK,
  fromToken: Token,
  toToken: Token,
  _amount: string,
  fromMode: FarmFromMode = FarmFromMode.EXTERNAL,
  toMode: FarmToMode = FarmToMode.EXTERNAL
) {
  const amount = fromToken.fromHuman(_amount);
  const op = await sdk.swap.buildSwap(fromToken, toToken, fromMode, toMode);
  console.log(op.getDisplay());
  const est = await op.estimate(amount);
  console.log(`Estimated: ${est.toHuman()}`);
  const tx = await (await op.execute(amount, 1)).wait();
  console.log(`Success: ${tx.transactionHash}`);
}
