import { ethers } from "ethers";
import { ERC20Token } from "src/classes/Token";
import { BasicPreparedResult, RunContext, StepClass } from "src/classes/Workflow";

export class PermitERC20 extends StepClass<BasicPreparedResult> {
  public name: string = "permitERC20";

  constructor(
    private token: ERC20Token,
    private spender: string,
    private getPermit: string | ((context: RunContext) => any) = "permit" // any = permit
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, context: RunContext) {
    const permit = typeof this.getPermit === "function" ? this.getPermit(context) : context.data[this.getPermit];
    if (!permit /* || permitInvalid */) {
      throw new Error(
        `No permit found ${
          typeof this.getPermit === "function" ? "with provided getPermit function" : `at context.data[${this.getPermit}]`
        }`
      );
    }
    const owner = await PermitERC20.sdk.getAccount();

    return {
      name: this.name,
      amountOut: _amountInStep,
      value: ethers.BigNumber.from(0),
      prepare: () => {
        PermitERC20.sdk.debug(`>[${this.name}.prepare()]`, {
          address: this.token.address, // token address
          owner, // owner
          spender: this.spender, // spender
          amount: _amountInStep.toString(), // value
          deadline: permit.typedData.message.deadline, // deadline
          v: permit.split.v,
          r: permit.split.r,
          s: permit.split.s
        });
        return {
          target: PermitERC20.sdk.contracts.beanstalk.address,
          callData: PermitERC20.sdk.contracts.beanstalk.interface.encodeFunctionData("permitERC20", [
            this.token.address, // token address
            owner, // owner
            this.spender, // spender
            _amountInStep.toString(), // value
            permit.typedData.message.deadline, // deadline
            permit.split.v,
            permit.split.r,
            permit.split.s
          ])
        };
      },
      decode: (data: string) => PermitERC20.sdk.contracts.beanstalk.interface.decodeFunctionData("permitERC20", data),
      decodeResult: (result: string) => PermitERC20.sdk.contracts.beanstalk.interface.decodeFunctionResult("permitERC20", result)
    };
  }
}
