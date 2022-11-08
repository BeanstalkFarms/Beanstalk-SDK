import { ERC20Token, Token } from "src/classes/Token";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { TokenValue } from "src/TokenValue";
import { getTestUtils } from "src/utils.tests/provider";
import { FarmFromMode, FarmToMode } from "../farm/types";

const { sdk, account, utils } = getTestUtils();

jest.setTimeout(10000);
async function reset() {
  await utils.resetFork();
}

describe("Estimate", function () {
  describe.each([
    // ETH => x
    [sdk.tokens.ETH, sdk.tokens.WETH],
    [sdk.tokens.ETH, sdk.tokens.USDT],
    [sdk.tokens.ETH, sdk.tokens.USDC],
    [sdk.tokens.ETH, sdk.tokens.DAI],
    [sdk.tokens.ETH, sdk.tokens.BEAN],
    [sdk.tokens.ETH, sdk.tokens.CRV3],

    // BEAN => x
    [sdk.tokens.BEAN, sdk.tokens.ETH],
    [sdk.tokens.BEAN, sdk.tokens.WETH],
    [sdk.tokens.BEAN, sdk.tokens.BEAN],
    [sdk.tokens.BEAN, sdk.tokens.USDT],
    [sdk.tokens.BEAN, sdk.tokens.USDC],
    [sdk.tokens.BEAN, sdk.tokens.DAI],
    [sdk.tokens.BEAN, sdk.tokens.BEAN],
    [sdk.tokens.BEAN, sdk.tokens.CRV3],
  ])("BEAN->x", (tokenIn, tokenOut) => {
    it(`estimate(${tokenIn.symbol}, ${tokenOut.symbol})`, async () => {
      await estimate(tokenIn, tokenOut);
    });
    it(`estimateReverse(${tokenIn.symbol}, ${tokenOut.symbol})`, async () => {
      await estimateReverse(tokenIn, tokenOut);
    });
  });
});

// TODO: better way to test these
async function estimate(tokenIn: Token, tokenOut: Token, _amount?: string) {
  const amount = tokenIn.fromHuman(_amount ? _amount : "300");
  const op = sdk.swap.buildSwap(tokenIn, tokenOut, account);
  expect(op.isValid()).toBe(true);

  const estimate = await op.estimate(amount);
  expect(estimate.gt(0));
}
async function estimateReverse(tokenIn: Token, tokenOut: Token, _amount?: string) {
  const amount = tokenOut.fromHuman(_amount ? _amount : "300");
  const op = sdk.swap.buildSwap(tokenIn, tokenOut, account);
  expect(op.isValid()).toBe(true);

  const estimateReverse = await op.estimateReversed(amount);
  expect(estimateReverse.gt(0));
}

async function getBalance(token: Token, mode: string) {
  const balances = await sdk.tokens.getBalance(token, account);
  if (mode === "0") {
    return balances.external;
  }
  if (mode === "1") {
    return balances.internal;
  }
  if (mode === "all") {
    return balances.total;
  }
  throw new Error("Unknow mode");
}
