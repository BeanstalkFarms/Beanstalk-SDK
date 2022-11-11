import { ethers } from "ethers";
import { FarmFromMode } from "src/lib/farm/types";
import { Farm, AdvancedPipe, StepGenerator } from "src/lib/farm2/farm2";

import { setupConnection } from "../../utils.tests/provider";
import { BeanstalkSDK } from "../BeanstalkSDK";

let sdk: BeanstalkSDK;
let account: string;

beforeAll(async () => {
  const { provider, signer, account: _account } = await setupConnection();
  account = _account;
  sdk = new BeanstalkSDK({
    provider,
    signer,
    subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
    DEBUG: true,
  });
});

describe("farm2", () => {
  it("test", async () => {
    const farm = new Farm(sdk, "Farm");
    const pipe = new AdvancedPipe(sdk, "AdvancedPipe");

    // sdk.farm.create();
    // farm
    //   .add(new sdk.farm.actions.Exchange(
    //     '0x',
    //     '0x',
    //     sdk.tokens.BEAN,
    //     sdk.tokens.BEAN_CRV3_LP,
    //   ))

    farm
      // transfer tokens to Pipeline
      .add((amountInStep) => `${amountInStep.toHexString()}01`)
      .add(
        pipe.add((amountInStep) => ({
          target: sdk.contracts.root.address,
          callData: `${amountInStep.toHexString()}02`,
          advancedData: "0x0000",
        }))
      )
      .add((amountInStep) => `${amountInStep.mul(2).toHexString()}03`);

    farm.add(() => "0xCALLDATA");

    console.log("generators", farm.generators);
    console.log("steps", farm.steps);
    console.log("value", farm.value);

    await farm.estimate(ethers.BigNumber.from(1));

    console.log("generators", farm.generators);
    console.log("steps", farm.steps);
    console.log("value", farm.value);

    console.log(await farm.encode());
  });
});
