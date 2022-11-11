import { ethers } from "ethers";
import { Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { AdvancedPipeStruct } from "src/lib/depot";
import { TokenValue } from "src/TokenValue";

/**
 * The "Farm" is a Workflow that encodes a call to `beanstalk.farm()`.
 */
export class Farm extends Workflow<string> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(Farm);
  }

  encode() {
    return this.contract.interface.encodeFunctionData("farm", [this._steps.map((step) => step.encode())]);
  }

  async execute(amountIn: ethers.BigNumber | TokenValue, slippage: number): Promise<ethers.ContractTransaction> {
    const data = await this._prep(amountIn, slippage);
    return this.contract.farm(data, { value: this.value });
  }

  async callStatic(amountIn: ethers.BigNumber | TokenValue, slippage: number): Promise<string[]> {
    const data = await this._prep(amountIn, slippage);
    return this.contract.callStatic.farm(data, { value: this.value });
  }

  async estimateGas(amountIn: ethers.BigNumber | TokenValue, slippage: number): Promise<ethers.BigNumber> {
    const data = await this._prep(amountIn, slippage);
    return this.contract.estimateGas.farm(data, { value: this.value });
  }
}

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
