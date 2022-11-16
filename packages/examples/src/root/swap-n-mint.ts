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
  ERC20Token,
  NativeToken
} from "@beanstalk/sdk";
import { ethers } from "ethers";
import { sdk, test, account } from "../setup";

// Determine if more external allowance is needed for this ERC20 token.
const hasEnoughExternalAllowance = async (_token: Token, _account: string, _spender: string, _amount: ethers.BigNumber) => {
  if (_token instanceof NativeToken) return true; // FIXME: ERC1155
  if (!(_token instanceof ERC20Token)) throw new Error("Unsupported token type");
  const allowance = await (_token as ERC20Token).getAllowance(_account, _spender);
  return allowance.toBigNumber().gte(_amount);
};

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
export async function roots_via_swap(inputToken: Token, amount: TokenValue): Promise<TokenBalance> {
  ////////// Setup //////////
  const account = await sdk.getAccount();
  console.log("Using account:", account);

  // Check `account`' balance of `inputToken`, validate `amount`
  const balance = await sdk.tokens.getBalance(inputToken);
  console.log(`Account ${account} has balance ${balance.total.toHuman()} ${inputToken.symbol}`);
  if (amount.gt(balance.total)) {
    throw new Error(`Not enough ${inputToken.symbol}. Balance: ${balance.total.toHuman()} / Input: ${amount.toHuman()}`);
  }

  ////////// Prepare Swap //////////

  const depositToken = sdk.tokens.BEAN;
  const swapTo = FarmToMode.INTERNAL;
  const loadPipelineFrom = FarmFromMode.INTERNAL;

  // Swap from `inputToken` -> `depositToken` (BEAN)
  // If `swapDestination = INTERNAL`, and this is called via `beanstalk.farm()`,
  // there is no need to approve usage of `depositToken`.
  // However, a permit may be needed to use `token` if it's an ERC20 token in the EXTERNAL balance.
  const swap = sdk.swap.buildSwap(inputToken, depositToken, account, FarmFromMode.EXTERNAL, swapTo);

  console.log("\n\n Estinating amount out from Swap...");
  const amountFromSwap = await swap.estimate(amount);
  console.log(`Swap Estimate: ${amount.toHuman()} ${inputToken.symbol} --> ${amountFromSwap.toHuman()} BEAN`);
  console.log("\n\nExtending Farm...");

  ////////// Initialize Farm //////////

  const farm = sdk.farm.create<{ permit: any }>("Swap And Mint");

  // To perform a swap from EXTERNAL, we may need an allowance.
  // We can skip this step if:
  //    `inputToken` = ETH
  //    `inputToken.allowance(account, beanstalk) > amountInStep`
  farm.add(new sdk.farm.actions.PermitERC20((context) => context.data.permit), {
    onlyExecute: true,
    skip: (amountInStep) => hasEnoughExternalAllowance(inputToken, account, sdk.contracts.beanstalk.address, amountInStep)
  });

  ////////// Add Swap to Farm //////////

  farm.add([
    // workaround for typescript `Readonly<>`: unpack into array
    ...swap.getFarm().generators
  ]);

  farm.add(
    // returns an array with 1 StepGenerator if no permit, 2 StepGenerators if permit
    sdk.farm.presets.loadPipeline(depositToken, loadPipelineFrom),
    { onlyExecute: true }
  );

  ////////// Create Advanced Pipeline //////////

  const pipe = sdk.farm.createAdvancedPipe();

  ////////// Setup Pipeline Approvals //////////

  pipe.add(
    function approveBean(amountInStep) {
      return pipe.wrap(
        sdk.tokens.BEAN.getContract(),
        "approve",
        [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256],
        amountInStep // pass-thru
      );
    },
    {
      skip: (amountInStep) =>
        hasEnoughExternalAllowance(sdk.tokens.BEAN, sdk.contracts.pipeline.address, sdk.contracts.beanstalk.address, amountInStep)
    }
  );

  pipe.add(
    (amountInStep) =>
      pipe.wrap(
        sdk.contracts.beanstalk,
        "approveDeposit",
        [sdk.contracts.root.address, depositToken.address, ethers.constants.MaxUint256],
        amountInStep // pass-thru
      ),
    {
      async skip(amountInStep) {
        return false; // FIXME
      }
    }
  );

  ////////// Deposit into Silo //////////

  pipe.add(async function deposit(amountInStep, test) {
    return pipe.wrap(sdk.contracts.beanstalk, "deposit", [depositToken.address, amountInStep, FarmFromMode.EXTERNAL], amountInStep);
  });

  ////////// Mint ROOT //////////

  pipe.add(
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
          sdk.silo.makeDepositCrate(depositToken, currentSeason, amountInStep.toString(), estimatedDepositBDV.toBlockchain(), currentSeason)
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
    {
      // Need to tag this because the "approve" step depends on the
      // amountOut from this step, and may be skipped.
      tag: "mint"
    }
  );

  ////////// Transfer ROOT back to ACCOUNT //////////

  pipe.add(
    (amountInStep) =>
      pipe.wrap(
        sdk.tokens.ROOT.getContract(),
        "approve",
        [sdk.contracts.beanstalk.address, ethers.constants.MaxUint256],
        amountInStep // pass-thru
      ),
    {
      async skip(amountInStep) {
        const allowance = await sdk.tokens.ROOT.getAllowance(sdk.contracts.pipeline.address, sdk.contracts.beanstalk.address);
        return allowance.toBigNumber().gt(amountInStep);
      }
    }
  );

  pipe.add(function unloadPipeline(amountInStep, context) {
    return pipe.wrap(
      sdk.contracts.beanstalk,
      "transferToken",
      [
        /*  36 0 */ sdk.tokens.ROOT.address,
        /*  68 1 */ account,
        /* 100 2 */ "0", // Will be overwritten by advancedData
        /* 132 3 */ FarmFromMode.EXTERNAL, // use PIPELINE's external balance
        /* 164 4 */ FarmToMode.EXTERNAL // TOOD: make this a parameter
      ],
      amountInStep,
      // Copy from previous step
      Clipboard.encodeSlot(context.step.findTag("mint"), 0, 2)
    );
  });

  farm.add(pipe);

  ////////// Estimate amountOut (number of ROOT) //////////

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

  ////////// Execute Transaction //////////

  console.log("\n\nExecuting...");
  let permit;

  const ready = await hasEnoughExternalAllowance(inputToken, account, sdk.contracts.beanstalk.address, amountIn);
  if (!ready) {
    permit = await sdk.permit.sign(
      account,
      sdk.tokens.permitERC2612(
        account, // owner
        sdk.contracts.beanstalk.address, // spender
        inputToken as ERC20Token, // inputToken
        amountIn.toString() // amount
      )
    );
    console.log("Signed a permit: ", permit);
  }

  const txn = await farm.execute(amountIn, {
    slippage: 0.1, // verify
    permit // attach the permit if it's needed
  });

  console.log("Transaction submitted...", txn.hash);
  const receipt = await txn.wait();
  console.log("Transaction executed");

  Test.Logger.printReceipt([sdk.contracts.beanstalk, sdk.tokens.BEAN.getContract(), sdk.contracts.root], receipt);

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
  //await (await (sdk.tokens.USDC as ERC20Token).approve(sdk.contracts.beanstalk.address, sdk.tokens.USDC.amount(101).toBigNumber())).wait();
  const tokenIn = sdk.tokens.ETH;
  const amountIn = tokenIn.amount(1);
  // await test[`set${tokenIn.symbol}Balance`](account, amountIn);
  await roots_via_swap(tokenIn, amountIn);
})();
