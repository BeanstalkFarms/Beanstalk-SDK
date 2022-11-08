import { getTestUtils } from "./provider";

const { sdk, account, utils } = getTestUtils();

describe("TestUtils", () => {
  beforeEach(async () => {
    // await utils.resetFork();
    // console.log('reset');
  });

  it("Hack DAI balance", async () => {
    const DAI = sdk.tokens.DAI;
    await utils.setDAIBalance(account, DAI.amount(30000));
    const bal = await DAI.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });

  it("Hack USDC balance", async () => {
    const USDC = sdk.tokens.USDC;
    await utils.setUSDCBalance(account, USDC.amount(30000));
    const bal = await USDC.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
  it("Hack USDT balance", async () => {
    const USDT = sdk.tokens.USDT;
    await utils.setUSDTBalance(account, USDT.amount(30000));
    const bal = await USDT.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
  it("Hack CRV3 balance", async () => {
    const CRV3 = sdk.tokens.CRV3;
    await utils.setCRV3Balance(account, CRV3.amount(30000));
    const bal = await CRV3.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
  it("Hack WETH balance", async () => {
    const WETH = sdk.tokens.WETH;
    await utils.setWETHBalance(account, WETH.amount(30000));
    const bal = await WETH.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
  it("Hack BEAN balance", async () => {
    const BEAN = sdk.tokens.BEAN;
    await utils.setBEANBalance(account, BEAN.amount(30000));
    const bal = await BEAN.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
  it.skip("Hack ROOT balance", async () => {
    const ROOT = sdk.tokens.ROOT;
    await utils.setROOTBalance(account, ROOT.amount(30000));
    const bal = await ROOT.getBalance(account);
    expect(bal.toHuman()).toBe("30000");
  });
});
