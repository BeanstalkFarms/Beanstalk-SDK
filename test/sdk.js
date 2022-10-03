const { expect } = require('chai');
const { BeanstalkSDK, FarmFromMode, FarmToMode } = require('../');

describe('SDK', function() {
  let sdk;
  let signer;
  let address;

  this.beforeAll('initialize sdk', async function() {
    const [owner, account1] = await ethers.getSigners();
    signer = account1;
    address = await signer.getAddress();
    sdk = new BeanstalkSDK({ signer });
  });

  it('gets ETH Balance', async function() {
    const bal = await sdk.tokens.ETH.getBalance(address);
    expect(bal.valueOf()).to.eq('1e+22');
  });

  it('swap ETH to BEAN', async function() {
    const amountIn = ethers.utils.parseUnits('10', 18);
    const tokenIn = sdk.tokens.ETH;
    const tokenOut = sdk.tokens.BEAN;
    const fromMode = FarmFromMode.EXTERNAL;
    const toMode =  FarmToMode.EXTERNAL;
    

    const est = await sdk.swap.estimate(true, amountIn, address, tokenIn, tokenOut, fromMode, toMode);

    expect(tokenOut.stringifyToDecimal(est.amountOut.toString()).toString()).to.eq('13613.248106');

    await sdk.swap.execute(est, 0.1);

    const bal = await sdk.tokens.BEAN.getBalance(address);

    expect(bal.toString()).to.eq('13613248684');
  });
});

