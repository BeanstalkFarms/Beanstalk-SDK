import {
  FarmFromMode,
  FarmToMode,
  TokenValue,
  TokenBalance,
  Test,
  Clipboard,
  DataSource,
  Token,
  Workflow,
  FarmWorkflow
} from "@beanstalk/sdk";
import { BuildContext } from "@beanstalk/sdk/dist/types/classes/Workflow";
import { SignedPermit } from "@beanstalk/sdk/dist/types/lib/permit";
import { BigNumber, ethers } from "ethers";
import { sdk, test, account } from "../setup";

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
export async function roots_via_swap(token: Token, amount: TokenValue): Promise<TokenBalance> {
  // setup
  const account = await sdk.getAccount();
  console.log("Using account:", account);

  // get balance and validate amount
  const balance = await sdk.tokens.getBalance(token);
  console.log(`Account ${account} has balance ${balance.total.toHuman()} ${token.symbol}`);
  if (amount.gt(balance.total)) {
    throw new Error(`Not enough ${token.symbol}. Balance: ${balance.total.toHuman()} / Input: ${amount.toHuman()}`);
  }

  // Swap from `token` -> `depositToken` (BEAN)
  const depositToken = sdk.tokens.BEAN;
  const swap = sdk.swap.buildSwap(token, depositToken, account, FarmFromMode.EXTERNAL, FarmToMode.INTERNAL);

  const estBean = await swap.estimate(amount);
  console.log(`Swap Estimate: ${amount.toHuman()} ${token.symbol} --> ${estBean.toHuman()} BEAN`);

  // MOCK:
  // let permit = {
  //   owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  //   typedData: {
  //     message: {
  //       owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  //       spender: '0xc1e088fc1323b20bcbee9bd1b9fc9546db5624c5',
  //       value: '3977430962',
  //       nonce: '3',
  //       deadline: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  //     }
  //   },
  //   rawSignature: '',
  //   split: {
  //     r: '0x070a8b7261b7d39330a456759fd055875617689a71aaf52624b47522e5de5fd7',
  //     s: '0x7f19c0a1786faf45f060996d9fd1750f8334df7b9b7782bcd50c0cb4b1b520db',
  //     v: 27,
  //   }
  // };

  // sign permit to send `token` to Pipeline

  // farm
  type Data = {
    slippage: number;
    permit: any;
  };
  const farm = swap.getFarm() as FarmWorkflow<Data>;
  const pipe = sdk.farm.createAdvancedPipe();

  console.log("\n\nBuilding...");

  farm.add(
    // returns an array with 2 StepGenerators if no permit, 2 StepGenerators if permit
    sdk.farm.presets.loadPipeline(depositToken, FarmFromMode.INTERNAL, (context) => context.data.permit)
  );
  farm.add(
    pipe.add([
      (amountInStep) =>
        pipe.wrap(
          sdk.tokens.BEAN.getContract(),
          "approve",
          [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256],
          amountInStep // pass-thru
        ),
      (amountInStep) =>
        pipe.wrap(
          sdk.contracts.beanstalk,
          "approveDeposit",
          [sdk.contracts.root.address, depositToken.address, ethers.constants.MaxUint256],
          amountInStep // pass-thru
        ),
      (amountInStep) =>
        pipe.wrap(
          sdk.tokens.ROOT.getContract(),
          "approve",
          [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256],
          amountInStep // pass-thru
        ),
      async function deposit(amountInStep, test) {
        return pipe.wrap(sdk.contracts.beanstalk, "deposit", [depositToken.address, amountInStep, FarmFromMode.EXTERNAL], amountInStep);
      },
      // Notes:
      // 1. amountInStep = amount from the `deposit()` in previous step
      // 2. To mint ROOT, we need to create a `DepositTransferStruct[]` which ROOT uses
      //    to transfer a deposit from PIPELINE -> itself. Since the deposit estimation returns
      //    the amount deposited (but not the corresponding `season`, `bdv`, etc.), we "mock"
      //    the deposit transfer struct using the current season.
      // 3. Tokens are sent to PIPELINE's EXTERNAL balance.
      // 4. Slippage is applied to `amountOutRoot` when this step is encoded.
      // 5. This forwards the estimated amount of ROOT minted to the next function.
      //    However, to prevent any dust left behind in PIPELINE, the transferToken
      //    function uses Clipboard to copy the return value from `mint` directly
      //    into its own calldata; if our `amountOutRoot` estimate is incorrect, the user
      //    won't accidentally leave funds behind in PIPEPINE.
      async function mintRoots(amountInStep, context) {
        const [currentSeason, estimatedDepositBDV] = await Promise.all([
          sdk.sun.getSeason(),
          sdk.silo.bdv(depositToken, depositToken.fromBlockchain(amountInStep))
        ]);

        const estimate = await sdk.root.estimateRoots(
          depositToken,
          [
            // Mock deposit for estimation.
            // Note that the season of deposit is expected to equal the current season
            // since we're depositing and minting in one transaction.
            sdk.silo.makeDepositCrate(
              depositToken,
              currentSeason,
              amountInStep.toString(),
              estimatedDepositBDV.toBlockchain(),
              currentSeason
            )
          ],
          true // isDeposit
        );

        // `estimate.amount` contains the expected number of ROOT as a TokenValue.
        const amountOutRoot = estimate.amount.toBigNumber();

        return pipe.wrap(
          sdk.contracts.root,
          "mint",
          [
            [
              // ROOT accepts multiple DepositTransferStruct for minting.
              // However in this case we only made one deposit.
              {
                token: depositToken.address,
                seasons: [currentSeason],
                amounts: [amountInStep]
              }
            ],
            FarmToMode.EXTERNAL,
            Workflow.slip(amountOutRoot, context.data.slippage || 0)
          ] as Parameters<typeof sdk.contracts.root["mint"]>,
          amountOutRoot // pass to next step
        );
      },
      function unloadPipeline(amountInStep) {
        return pipe.wrap(
          sdk.contracts.beanstalk,
          "transferToken",
          [
            /*  36 */ sdk.tokens.ROOT.address,
            /*  68 */ account,
            /* 100 */ "0", // Will be overwritten by advancedData
            /* 132 */ FarmFromMode.EXTERNAL, // use PIPELINE's external balance
            /* 164 */ FarmToMode.EXTERNAL // TOOD: make this a parameter
          ],
          amountInStep,
          // Copy the first return
          Clipboard.encode([4, 32, 100])
        );
      }
    ])
  );

  console.log("\n\nEstimating...");
  const amountIn = amount.toBigNumber();
  const amountOut = await farm.estimate(amountIn);
  console.log("Estimated amountOut:", amountOut.toString());

  // const gas = await farm.estimateGas(amountIn, 0.1);
  // console.log("Estimated gas:", gas.toString());

  // const callStatic = await farm.callStatic(amountIn, 0.1);
  // const results = farm.decodeStatic(callStatic);

  // Farm item #3   (advancedPipe)
  // Pipe item #5   (mint)
  // Get first return value
  // const mintResult = results[2][4][0];

  // console.log("Executing this transaction is expected to mint", mintResult.toString(), "ROOT");

  // console.log("\n\nExecuting...");
  // const permit = await sdk.permit.sign(
  //   account,
  //   sdk.tokens.permitERC2612(
  //     account, // owner
  //     sdk.contracts.beanstalk.address, // spender
  //     depositToken, // bean
  //     estBean.toBlockchain() // amount of beans
  //   )
  // );
  // console.log("Signed a permit: ", permit);
  // const txn = await farm.execute(amountIn, {
  //   slippage: 0.1,
  //   permit,
  // });
  // console.log("Transaction submitted...", txn.hash);

  // const receipt = await txn.wait();
  // console.log("Transaction executed");

  // Test.Logger.printReceipt([sdk.contracts.beanstalk, sdk.tokens.BEAN.getContract(), sdk.contracts.root], receipt);

  const accountBalanceOfBEAN = await sdk.tokens.getBalance(sdk.tokens.BEAN);
  const accountBalanceOfROOT = await sdk.tokens.getBalance(sdk.tokens.ROOT);
  const pipelineBalanceOfBEAN = await sdk.tokens.getBalance(sdk.tokens.BEAN, sdk.contracts.pipeline.address);
  const pipelineBalanceOfROOT = await sdk.tokens.getBalance(sdk.tokens.ROOT, sdk.contracts.pipeline.address);
  const pipelineSiloBalance = await sdk.silo.getBalance(sdk.tokens.BEAN, sdk.contracts.pipeline.address, { source: DataSource.LEDGER });

  console.log(`(1) BEAN balance for Account :`, accountBalanceOfBEAN.total.toHuman());
  console.log(`(2) ROOT balance for Account :`, accountBalanceOfROOT.total.toHuman());
  console.log(`(3) BEAN balance for Pipeline:`, pipelineBalanceOfBEAN.total.toHuman());
  console.log(`(4) ROOT balance for Pipeline:`, pipelineBalanceOfROOT.total.toHuman());
  console.log("(5) BEAN deposits in Pipeline:", pipelineSiloBalance.deposited.crates.length);
  console.log(` ^ 3-5 should be 0 if Pipeline was properly unloaded.`);

  return accountBalanceOfROOT;
}

(async () => {
  await roots_via_swap(sdk.tokens.ETH, sdk.tokens.ETH.amount(3.14));
})();
