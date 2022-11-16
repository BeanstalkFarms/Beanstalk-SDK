import { BasicPreparedResult, RunContext, Step, StepClass } from "src/classes/Workflow";
import { ethers } from "ethers";
import { FarmToMode } from "../types";

export class ClaimWithdrawals extends StepClass<BasicPreparedResult> {
  public name: string = "claimWithdrawals";

  constructor(private _tokenIn: string, private _seasons: ethers.BigNumberish[], private _to: FarmToMode) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    ClaimWithdrawals.sdk.debug(`[${this.name}.run()]`, {
      tokenIn: this._tokenIn,
      seasons: this._seasons,
      to: this._to
    });
    return {
      name: this.name,
      amountOut: _amountInStep,
      prepare: () => {
        ClaimWithdrawals.sdk.debug(`[${this.name}.encode()]`, {
          tokenIn: this._tokenIn,
          seasons: this._seasons,
          to: this._to
        });
        return {
          target: ClaimWithdrawals.sdk.contracts.beanstalk.address,
          callData: ClaimWithdrawals.sdk.contracts.beanstalk.interface.encodeFunctionData("claimWithdrawals", [
            this._tokenIn, //
            this._seasons, //
            this._to
          ])
        };
      },
      decode: (data: string) => ClaimWithdrawals.sdk.contracts.beanstalk.interface.decodeFunctionData("claimWithdrawals", data),
      decodeResult: (result: string) => ClaimWithdrawals.sdk.contracts.beanstalk.interface.decodeFunctionResult("claimWithdrawals", result)
    };
  }
}
