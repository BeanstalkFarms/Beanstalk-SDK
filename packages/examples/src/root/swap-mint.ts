import { TokenValue, TokenBalance, Test, Token } from "@beanstalk/sdk";
import { SignedPermit } from "@beanstalk/sdk/dist/types/lib/permit";
import { ethers } from "ethers";
import { sdk, test, account } from "../setup";

export async function swap_and_mint(fromToken: Token, amount: TokenValue): Promise<TokenBalance> {
  // 1. etup
  const account = await sdk.getAccount();
  console.log("Using account:", account);
  const toToken = sdk.tokens.BEAN;

  // 2. Swap
  // TODO: there could be a discrepancy between estimate and actual.
  // how do we get the actual amount received in a swap?
  const swap = sdk.swap.buildSwap(fromToken, toToken, account);
  const estimate = await swap.estimate(amount);
  console.log(`Swap Estimate: ${amount.toHuman()} ${fromToken.symbol} -> ${estimate.toHuman()} ${toToken.symbol}`);
  await (await swap.execute(amount, 0.1)).wait();
  console.log("Swap complete");
  const depositAmount = estimate.pct(100 - 0.1);
  console.log(`Deposit Amount: ${depositAmount.toHuman()} ${toToken.symbol}`);

  // 3. sign permit to send `token` to Pipeline
  const permit = await sdk.permit.sign(
    account,
    sdk.tokens.permitERC2612(
      account, // owner
      sdk.contracts.beanstalk.address, // spender
      toToken, // token
      depositAmount.toBlockchain() // amount
    )
  );
  console.log("Signed a permit: ", permit);

  // 4. Deposit and mint Root
  const farm = sdk.farm.create();
  farm.add(sdk.farm.presets.depositAndMintRoot(account, toToken, depositAmount, permit));

  // 4a. Get estimates
  const amountOut = await farm.estimate(depositAmount);
  console.log("Estimated amountOut:", amountOut.toString());

  const gas = await farm.estimateGas(depositAmount, 0.1);
  console.log("Estimated gas:", gas.toString());

  // 4b. Extract result from Pipeline calls
  const callStatic = await farm.callStatic(depositAmount, 0.1);
  console.log("callStatic", callStatic);
  const advancedPipeResult = sdk.contracts.beanstalk.interface.decodeFunctionResult("advancedPipe", callStatic[2]);
  console.log("Pipe result:", advancedPipeResult);
  const mintResult = sdk.contracts.root.interface.decodeFunctionResult("mint", advancedPipeResult.results[4]);
  console.log("Mint result:", mintResult[0].toString());
  const transferTokenResult = sdk.contracts.beanstalk.interface.decodeFunctionResult("transferToken", advancedPipeResult.results[5]);
  console.log("Transfer result:", transferTokenResult);

  // 4c. Execute Mint
  console.log("Executing...");
  const txn = await farm.execute(depositAmount, 0.1);
  console.log("Transaction submitted...", txn.hash);

  const receipt = await txn.wait();
  console.log("Transaction executed");

  // 5. Done
  Test.Logger.printReceipt([sdk.contracts.beanstalk, sdk.tokens.BEAN.getContract(), sdk.contracts.root], receipt);

  const accountBalanceOfRoot = await sdk.tokens.getBalance(sdk.tokens.ROOT);
  const pipelineBalanceOfRoot = await sdk.tokens.getBalance(sdk.tokens.ROOT, sdk.contracts.pipeline.address);

  console.log(`ROOT balance for Account :`, accountBalanceOfRoot.total.toHuman());
  console.log(`ROOT balance for Pipeline:`, pipelineBalanceOfRoot.total.toHuman());

  return accountBalanceOfRoot;
}

(async () => {
  await swap_and_mint(sdk.tokens.ETH, sdk.tokens.ETH.amount("3.14"));
})();
