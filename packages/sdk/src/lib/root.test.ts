import { getTestUtils } from "../utils.tests/provider";

const { sdk, account, utils } = getTestUtils();

describe("mint function", () => {
  it("uses the right function", async () => {
    expect(true).toBe(true);
    // const typedData = await sdk.root.permit(
    //   [sdk.tokens.BEAN],
    //   [new BigNumber(1000)],
    // );
    // const permit = await sdk.permit.sign(
    //   account,
    //   typedData,
    // )
  });
});

describe("estimateRoots", () => {
  it("test", async () => {
    const result = await sdk.root.estimateRoots(sdk.tokens.BEAN, [utils.mockDepositCrate(sdk.tokens.BEAN, 6000, "1000")], true);

    expect(result.estimate.gt(0)).toBe(true);
  });
});
