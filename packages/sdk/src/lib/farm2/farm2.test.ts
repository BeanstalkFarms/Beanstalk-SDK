import { ethers } from "ethers";
import { FarmFromMode } from "src/lib/farm/types";
import { Farm, Pipe, StepGenerator } from "src/lib/farm2/farm2";

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
    const pipe = new Pipe(sdk, "AdvancedPipe");

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
      // .addExternal([
      //   async (amountInStep) => {
      //     const amount = await calculateAmount();
      //     return {
      //     // mint
      //     // no equivalent of get_dy
      //     // cannot callstatic to get the amount of roots minted
      //     // need to create a function that uses the amount of tokens
      //     // transferred in the first farm step to calculate how many
      //     // roots will be received in this step.
      //     target: sdk.contracts.root.address,
      //     callData: `${amountInStep.toHexString()}02`,
      //     advancedData: '0x0000',
      //   },
      //   {
      //     // transfer
      //     target: sdk.contracts.root.address,
      //     callData: `${amountInStep.toHexString()}02`,
      //     advancedData: '0x0000',
      //   }
      // ])
      .add(
        pipe.add((amountInStep) => ({
          target: sdk.contracts.root.address,
          callData: `${amountInStep.toHexString()}02`,
          advancedData: "0x0000",
        }))
      )
      .add((amountInStep) => `${amountInStep.mul(2).toHexString()}03`);

    farm.add(() => "0xCALLDATA");

    console.log("generators", farm._generators);
    console.log("steps", farm._steps);
    console.log("value", farm._value);

    await farm.estimate(ethers.BigNumber.from(1));

    console.log("generators", farm._generators);
    console.log("steps", farm._steps);
    console.log("value", farm._value);

    console.log(await farm.encode());
  });
});
