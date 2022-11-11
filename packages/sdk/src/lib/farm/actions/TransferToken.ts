import { ethers } from "ethers";
import { StepClass } from "src/classes/Workflow";
import { FarmFromMode, FarmToMode } from "../types";

export class TransferToken extends StepClass {
  public name: string = "transferToken";

  constructor(
    private _tokenIn: string,
    private _recipient: string,
    private _fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true) {
    TransferToken.sdk.debug(`[${this.name}.run()]`, {
      tokenIn: this._tokenIn,
      recipient: this._recipient,
      amountInStep: _amountInStep,
      forward: _forward,
      fromMode: this._fromMode,
      toMode: this._toMode,
    });
    return {
      name: this.name,
      amountOut: _amountInStep, // transfer exact amount
      encode: () => {
        TransferToken.sdk.debug(`[${this.name}.encode()]`, {
          tokenIn: this._tokenIn,
          recipient: this._recipient,
          amountInStep: _amountInStep,
          forward: _forward,
          fromMode: this._fromMode,
          toMode: this._toMode,
        });
        return TransferToken.sdk.contracts.beanstalk.interface.encodeFunctionData("transferToken", [
          this._tokenIn, //
          this._recipient, //
          _amountInStep, // ignore minAmountOut since there is no slippage
          this._fromMode, //
          this._toMode, //
        ]);
      },
      decode: (data: string) => TransferToken.sdk.contracts.beanstalk.interface.decodeFunctionData("transferToken", data),
      decodeResult: (result: string) => TransferToken.sdk.contracts.beanstalk.interface.decodeFunctionResult("transferToken", result),
    };
  }
}
