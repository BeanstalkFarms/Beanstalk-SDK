import { ethers } from "ethers";
import { FarmToMode } from "../types";
import { Action, ActionResult, BaseAction } from "../types";

export class WrapEth extends BaseAction implements Action {
  public name: string = "wrapEth";

  constructor(private toMode: FarmToMode = FarmToMode.INTERNAL) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true) {
    WrapEth.sdk.debug(`[${this.name}.run()]`, { toMode: this.toMode, _amountInStep, _forward });
    return {
      name: this.name,
      amountOut: _amountInStep, // amountInStep should be an amount of ETH.
      value: _amountInStep, // need to use this amount in the txn.
      encode: () => {
        WrapEth.sdk.debug(`[${this.name}.encode()]`, { toMode: this.toMode, _amountInStep, _forward });
        return WrapEth.sdk.contracts.beanstalk.interface.encodeFunctionData("wrapEth", [
          _amountInStep, // ignore minAmountOut since there is no slippage
          this.toMode,
        ]);
      },
      decode: (data: string) => WrapEth.sdk.contracts.beanstalk.interface.decodeFunctionData("wrapEth", data),
      decodeResult: (result: string) => WrapEth.sdk.contracts.beanstalk.interface.decodeFunctionResult("wrapEth", result),
    };
  }
}
