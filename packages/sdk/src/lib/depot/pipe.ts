import { ethers } from "ethers";
import { Step, Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Clipboard } from "src/lib/depot/clipboard";
import { AdvancedPipeStruct } from "src/lib/depot/depot";
import { TokenValue } from "src/TokenValue";

/**
 * The "AdvancedPipe" is a Workflow that encodes a call to `beanstalk.advancedPipe()`.
 */
export class AdvancedPipeWorkflow extends Workflow<AdvancedPipeStruct> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "AdvancedPipe") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(AdvancedPipeWorkflow);
  }

  encode() {
    return this.contract.interface.encodeFunctionData("advancedPipe", [
      this._steps.map((step) => step.encode()),
      "0", // fixme
    ]);
  }

  wrap<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
    contract: C,
    method: M,
    args: A,
    amountOut: ethers.BigNumber,
    advancedData: string = Clipboard.encode([])
  ): Step<AdvancedPipeStruct> {
    return {
      name: method.toString(),
      amountOut,
      encode: () => ({
        target: contract.address,
        callData: contract.interface.encodeFunctionData(method.toString(), args),
        advancedData,
      }),
      decode: () => undefined,
      decodeResult: () => undefined,
    };
  }

  async execute(): Promise<ethers.ContractTransaction> {
    throw new Error("Not implemented");
  }

  async callStatic(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<string[]> {
    throw new Error("Not implemented");
  }

  async estimateGas(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<ethers.BigNumber> {
    throw new Error("Not implemented");
  }
}
