import { Token } from "src/classes/Token";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { getTestUtils } from "src/utils.tests/provider";
import { FarmFromMode, FarmToMode } from "../farm/types";

const { sdk, account, utils } = getTestUtils();
let snapshot: string;

async function reset() {
  await utils.resetFork();
}

beforeAll(async () => {
  // snapshot = await provider.send("evm_snapshot", []);
  await reset();
});

describe("Swap", function () {
  describe.each([
    [sdk.tokens.ETH, sdk.tokens.WETH],
    [sdk.tokens.ETH, sdk.tokens.USDT],
    [sdk.tokens.ETH, sdk.tokens.USDC],
    [sdk.tokens.ETH, sdk.tokens.DAI],
    [sdk.tokens.ETH, sdk.tokens.BEAN],
    [sdk.tokens.ETH, sdk.tokens.CRV3],
  ])("ETH->", (tokenIn, tokenOut) => {
    it.each([
      [FarmFromMode.EXTERNAL, FarmToMode.EXTERNAL],
      [FarmFromMode.EXTERNAL, FarmToMode.INTERNAL],
    ])(`swap(${tokenIn.symbol}, ${tokenOut.symbol}, %s, %s)`, async (from, to) => {
      await swapTest(tokenIn, tokenOut, from, to);
    });
  });

  it.todo("WETH>ETH");

  it.todo("ETH>BEAN");
  it.todo("BEAN>ETH");

  it.todo("WETH>BEAN");
  it.todo("BEAN>WETH");

  it.todo("BEAN>3CRV");
  it.todo("3CRV>BEAN");

  it.todo("BEAN -> USDC, DAI, USDT");
  it.todo("USDC, DAI, USDT -> BEAN");

  it.todo("transfer");
});

async function swapTest(tokenIn: Token, tokenOut: Token, from: FarmFromMode, to: FarmToMode) {
  const ethBal = (await sdk.tokens.ETH.getBalance(account)).toHuman();
  const tokenInBalanceBefore = await getBalance(tokenIn, from);
  const tokenOutBalanceBefore = await getBalance(tokenOut, to);
  const amount = tokenIn.fromHuman(500);
  const slippage = 0.5;
  const amountWithSlippage = amount.pct(1 - slippage);

  expect(tokenInBalanceBefore.gt(amount)).toBe(true);

  const op = sdk.swap.buildSwap(tokenIn, tokenOut, account, from, to);
  expect(op.isValid()).toBe(true);

  let tx = await (await op.execute(amount, slippage)).wait();
  expect(tx.status).toBe(1);

  const tokenInBalanceAfter = await getBalance(tokenIn, from);
  const tokenOutBalanceAfter = await getBalance(tokenOut, to);

  expect(tokenInBalanceAfter.lt(tokenInBalanceBefore));
  expect(tokenOutBalanceAfter.gt(tokenOutBalanceBefore));

  expect(tokenOutBalanceAfter.gte(amountWithSlippage));
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
