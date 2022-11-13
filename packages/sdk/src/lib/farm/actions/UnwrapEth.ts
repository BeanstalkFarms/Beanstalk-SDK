import { ethers } from "ethers";
import { BuildContext, Step, StepClass } from "src/classes/Workflow";
import { FarmFromMode } from "../types";

export class UnwrapEth extends StepClass {
  public name: string = "unwrapEth";

  constructor(private fromMode: FarmFromMode = FarmFromMode.INTERNAL) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: BuildContext): Promise<Step<string>> {
    UnwrapEth.sdk.debug(`[${this.name}.run()]`, { fromMode: this.fromMode, _amountInStep, context });
    return {
      name: this.name,
      amountOut: _amountInStep, // amountInStep should be an amount of ETH.
      value: _amountInStep, // need to use this amount in the txn.
      encode: () => {
        UnwrapEth.sdk.debug(`[${this.name}.encode()]`, { fromMode: this.fromMode, _amountInStep, context });
        return UnwrapEth.sdk.contracts.beanstalk.interface.encodeFunctionData("unwrapEth", [
          _amountInStep, // ignore minAmountOut since there is no slippage
          this.fromMode
        ]);
      },
      decode: (data: string) => UnwrapEth.sdk.contracts.beanstalk.interface.decodeFunctionData("unwrapEth", data),
      decodeResult: (result: string) => UnwrapEth.sdk.contracts.beanstalk.interface.decodeFunctionResult("unwrapEth", result)
    };
  }
}
