import { ERC20Token, FarmFromMode, FarmToMode, TokenValue, TokenBalance, Test } from "@beanstalk/sdk";
import { SignedPermit } from "@beanstalk/sdk/dist/types/lib/permit";
import { ethers } from "ethers";
import { sdk, test, account } from "../setup";

export async function roots_from_circulating(token: ERC20Token, amount: TokenValue): Promise<TokenBalance> {
  // setup
  const account = await sdk.getAccount();
  console.log("Using account:", account);

  // verify whitelisted in silo
  // fixme: sdk.silo.isWhitelisted(token) method
  if (!sdk.tokens.siloWhitelist.has(token)) {
    throw new Error(`Token not whitelisted in the Silo: ${token.name}`);
  }

  // verify whitelisted in root
  const isRootWhitelisted = await sdk.contracts.root.whitelisted(token.address);
  if (!isRootWhitelisted) {
    throw new Error(`Token not whitelisted in Root: ${token.name}`);
  }

  // get balance and validate amount
  const balance = await sdk.tokens.getBalance(token);
  console.log(`Account ${account} has balance ${balance.total.toHuman()} ${token.symbol}`);
  if (amount.gt(balance.total)) {
    throw new Error(`Not enough ${token.symbol}. Balance: ${balance.total.toHuman()} / Input: ${amount.toHuman()}`); // .toFixed?
  }

  const amountStr = amount.toBlockchain();

  // sign permit to send `token` to Pipeline
  const permit = await sdk.permit.sign(
    account,
    sdk.tokens.permitERC2612(
      account, // owner
      sdk.contracts.beanstalk.address, // spender
      token, // token
      amountStr // amount
    )
  );

  console.log("Signed a permit: ", permit);

  // farm
  const farm = sdk.farm.create();

  farm.add(sdk.farm.presets.depositAndMintRoot(account, token, amount, permit));

  const amountIn = ethers.BigNumber.from(amountStr);
  const amountOut = await farm.estimate(amountIn);
  console.log("Estimated amountOut:", amountOut.toString());

  const gas = await farm.estimateGas(amountIn, 0.1);
  console.log("Estimated gas:", gas.toString());

  // TEST: Extract result from Pipeline calls
  const callStatic = await farm.callStatic(amountIn, 0.1);
  console.log("callStatic", callStatic);
  const advancedPipeResult = sdk.contracts.beanstalk.interface.decodeFunctionResult("advancedPipe", callStatic[2]);
  console.log("Pipe result:", advancedPipeResult);
  const mintResult = sdk.contracts.root.interface.decodeFunctionResult("mint", advancedPipeResult.results[4]);
  console.log("Mint result:", mintResult[0].toString());
  const transferTokenResult = sdk.contracts.beanstalk.interface.decodeFunctionResult("transferToken", advancedPipeResult.results[5]);
  console.log("Transfer result:", transferTokenResult);

  //
  console.log("Executing...");
  const txn = await farm.execute(amountIn, 0.1);
  console.log("Transaction submitted...", txn.hash);

  const receipt = await txn.wait();
  console.log("Transaction executed");

  Test.Logger.printReceipt([sdk.contracts.beanstalk, sdk.tokens.BEAN.getContract(), sdk.contracts.root], receipt);

  const accountBalanceOfRoot = await sdk.tokens.getBalance(sdk.tokens.ROOT);
  const pipelineBalanceOfRoot = await sdk.tokens.getBalance(sdk.tokens.ROOT, sdk.contracts.pipeline.address);

  console.log(`ROOT balance for Account :`, accountBalanceOfRoot.total.toHuman());
  console.log(`ROOT balance for Pipeline:`, pipelineBalanceOfRoot.total.toHuman());

  return accountBalanceOfRoot;
}

(async () => {
  await roots_from_circulating(sdk.tokens.BEAN, sdk.tokens.BEAN.amount(124));
})();
