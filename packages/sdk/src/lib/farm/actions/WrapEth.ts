import { ethers } from "ethers";
import { BasicPreparedResult, RunContext, Step, StepClass } from "src/classes/Workflow";
import { FarmToMode } from "../types";

export class WrapEth extends StepClass<BasicPreparedResult> {
  public name: string = "wrapEth";

  constructor(private toMode: FarmToMode = FarmToMode.INTERNAL) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    WrapEth.sdk.debug(`>[${this.name}.run()]`, { toMode: this.toMode, _amountInStep, context });
    return {
      name: this.name,
      amountOut: _amountInStep, // amountInStep should be an amount of ETH.
      value: _amountInStep, // need to use this amount in the txn.
      prepare: () => {
        WrapEth.sdk.debug(`>[${this.name}.prepare()]`, { toMode: this.toMode, _amountInStep, context });
        return {
          target: WrapEth.sdk.contracts.beanstalk.address,
          callData: WrapEth.sdk.contracts.beanstalk.interface.encodeFunctionData("wrapEth", [
            _amountInStep, // ignore minAmountOut since there is no slippage
            this.toMode
          ])
        };
      },
      decode: (data: string) => WrapEth.sdk.contracts.beanstalk.interface.decodeFunctionData("wrapEth", data),
      decodeResult: (result: string) => WrapEth.sdk.contracts.beanstalk.interface.decodeFunctionResult("wrapEth", result)
    };
  }
}
