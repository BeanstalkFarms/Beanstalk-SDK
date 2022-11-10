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

    const deposit: StepGenerator = (amountInStep) =>
      sdk.contracts.beanstalk.interface.encodeFunctionData("deposit", [sdk.tokens.BEAN.address, amountInStep, FarmFromMode.EXTERNAL]); // example

    // const bet     : StepGenerator = `; // example
    const other: StepGenerator = (amountInStep) => `${ethers.utils.hexZeroPad(amountInStep.toHexString(), 64)}`; // example

    farm.add(deposit);
    pipe.add((amountInStep) => `${ethers.utils.hexZeroPad(amountInStep.toHexString(), 64)}`);
    farm.add(pipe);
    farm.add(other);

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
