import { ethers } from "ethers";
import { BasicPreparedResult, RunContext, StepClass } from "src/classes/Workflow";
import { SignedPermit } from "src/lib/permit";

export class AttachPermitERC20 extends StepClass<BasicPreparedResult> {
  public name: string = "attachPermitERC20";

  constructor(private permit: SignedPermit) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    return {
      name: this.name,
      amountOut: _amountInStep,
      value: ethers.BigNumber.from(0),
      prepare: () => {
        // PermitERC20.sdk.debug(`[${this.name}.prepare()]`, {});
        return {
          target: AttachPermitERC20.sdk.contracts.beanstalk.address,
          callData: AttachPermitERC20.sdk.contracts.beanstalk.interface.encodeFunctionData("permitERC20", [
            this.permit.typedData.domain.verifyingContract, // token address
            this.permit.owner, // owner
            this.permit.typedData.message.spender, // spender
            this.permit.typedData.message.value, // value
            this.permit.typedData.message.deadline, // deadline
            this.permit.split.v,
            this.permit.split.r,
            this.permit.split.s
          ])
        };
      },
      decode: (data: string) => AttachPermitERC20.sdk.contracts.beanstalk.interface.decodeFunctionData("permitERC20", data),
      decodeResult: (result: string) => AttachPermitERC20.sdk.contracts.beanstalk.interface.decodeFunctionResult("permitERC20", result)
    };
  }
}
