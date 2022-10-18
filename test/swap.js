const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { BeanstalkSDK, FarmFromMode, FarmToMode } = require('../dist');
const { ACCOUNT1, resetFork, expectBalanceDifference, expectTokenBalance } = require('./utils');

describe('SDK', function() {
  let sdk;
  let signer;

  before('initialize sdk', async function() {
    await resetFork();
    signer = await ethers.getSigner(ACCOUNT1);
    sdk = new BeanstalkSDK({ signer });
  });

  it('swap ETH to BEAN', async function() {
    const amountIn = ethers.utils.parseUnits('10', 18);
    const tokenIn = sdk.tokens.ETH;
    const tokenOut = sdk.tokens.BEAN;
    const fromMode = FarmFromMode.EXTERNAL;
    const toMode = FarmToMode.EXTERNAL;

    const est = await sdk.swap.estimate(true, amountIn, ACCOUNT1, tokenIn, tokenOut, fromMode, toMode);

    expect(tokenOut.stringifyToDecimal(est.amountOut.toString()).toString()).to.eq('13613.248106');

    await sdk.swap.execute(est, 0.1);

    const bal = await sdk.tokens.BEAN.getBalance(ACCOUNT1);

    expect(bal.toString()).to.eq('13613248684');
  });

  // it('swap WETH to BEAN', async function() {
  //   const startEthBalance = await ethers.provider.getBalance(ACCOUNT1);

  //   const amount = ethers.utils.parseUnits('100', 18);

  //   // Get WETH
  //   const tx = await sdk.contracts.beanstalk.wrapEth(amount, FarmToMode.EXTERNAL, {
  //     value: amount,
  //   });
  //   const endEthBalance = await ethers.provider.getBalance(ACCOUNT1);
  //   await expectBalanceDifference(startEthBalance, amount, tx, endEthBalance);
  //   await expectTokenBalance(sdk.tokens.WETH, ACCOUNT1, amount);

  //   // Approve WETH
  //   await sdk.tokens.WETH.approve(sdk.contracts.beanstalk.address, amount);

  //   const balBefore = await sdk.tokens.BEAN.getBalance(ACCOUNT1);
  //   const estimate = await sdk.swap.estimate(true, amount, ACCOUNT1, sdk.tokens.WETH, sdk.tokens.BEAN, "0","0")
  //   const tx2 = await sdk.swap.execute(estimate, 0.1)
  //   const balAfter = await sdk.tokens.BEAN.getBalance(ACCOUNT1);
  //   await expectBalanceDifference(balBefore, amount, tx2, balAfter)
  // });

  // it('swap DAI to BEAN', async function() {
  //   //
  // });

  // it('swap USDC to BEAN', async function() {
  //   //
  // });

  // it('swap USDT to BEAN', async function() {
  //   //
  // });
});
