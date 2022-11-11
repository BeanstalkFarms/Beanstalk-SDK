import { ethers } from "ethers";
import { Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { AdvancedPipeStruct } from "src/lib/depot/depot";
import { TokenValue } from "src/TokenValue";

/**
 * The "AdvancedPipe" is a Workflow that encodes a call to `beanstalk.advancedPipe()`.
 */
export class AdvancedPipe extends Workflow<AdvancedPipeStruct> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "AdvancedPipe") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(AdvancedPipe);
  }

  encode() {
    return this.contract.interface.encodeFunctionData("advancedPipe", [
      this._steps.map((step) => step.encode()),
      "0", // fixme
    ]);
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
