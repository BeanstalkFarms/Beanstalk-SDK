import { FarmFromMode, FarmToMode, TokenValue, Test, Clipboard, DataSource, Token, Workflow, ERC20Token } from "@beanstalk/sdk";
import { ERC20 } from "@beanstalk/sdk/dist/types/constants/generated";
import { ethers } from "ethers";
import { sdk, test, account } from "../setup";
import { logBalances } from "./log";

/**
 * Running this example (November 2022)
 *
 * 1. Turn on a local Anvil node, ideally with --fork-block-number set to a recent block.
 * 2. Deploy Beanstalk V2.1 (includes Pipeline, Roots, etc.):
 *
 *    ```
 *    const { deployV2_1 } = require("./utils/mocks")
 *    task('beanstalkV2_1', async function () {
 *      await deployV2_1()
 *    })
 *    ```
 *
 *    then:
 *
 *    `npx hardhat beanstalkV2_1 --network localhost`
 *
 * 3. Make sure the SDK is built: `yarn sdk:build` from root of this monorepo.
 * 4. `cd ./packages/examples`
 * 5. `yarn x ./src/root/from-circulating.ts`
 *
 */
export async function roots_via_swap(inputToken: Token, amount: TokenValue) {
  // await sdk.contracts.depot.farm([
  //   sdk.contracts.depot.interface.encodeFunction
  // ], { value: sdk.tokens.ETH.amount(1).toBigNumber() })
}

(async () => {
  //await (await (sdk.tokens.USDC as ERC20Token).approve(sdk.contracts.beanstalk.address, sdk.tokens.USDC.amount(101).toBigNumber())).wait();
  const tokenIn = sdk.tokens.ETH;
  const amountIn = tokenIn.amount(1);

  // await test.setDAIBalance(account, amountIn);
  // await sdk.tokens.DAI.approve(sdk.contracts.beanstalk.address, tokenIn.amount(500).toBigNumber()).then((r) => r.wait());
  // await sdk.tokens.DAI.approve(sdk.contracts.depot.address, tokenIn.amount(500).toBigNumber()).then((r) => r.wait());
  // await test.setDAIBalance(account, amountIn);

  console.log(`Approved and set initial balance to ${amountIn.toHuman()} ${tokenIn.symbol}.`);

  await roots_via_swap(tokenIn, amountIn);
})();
