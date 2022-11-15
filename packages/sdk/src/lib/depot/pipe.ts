import { ethers } from "ethers";
import { Step, Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Clipboard } from "src/lib/depot/clipboard";
import { AdvancedPipeCallStruct } from "src/lib/depot/depot";
import { TokenValue } from "src/TokenValue";

/**
 * The "AdvancedPipe" is a Workflow that encodes a call to `beanstalk.advancedPipe()`.
 */

type AdvancedPipePreparedResult = {
  target: string;
  callData: string;
  clipboard?: string;
};
export class AdvancedPipeWorkflow<ExecuteData extends { slippage: number } = { slippage: number }> extends Workflow<
  AdvancedPipeCallStruct,
  AdvancedPipePreparedResult,
  ExecuteData
> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "AdvancedPipe") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(AdvancedPipeWorkflow<ExecuteData>);
  }

  prepare(): AdvancedPipePreparedResult {
    return {
      target: this.contract.address,
      callData: this.encodeWorkflow()
    };
  }

  encodeStep(p: AdvancedPipePreparedResult): AdvancedPipeCallStruct {
    return {
      target: p.target,
      callData: p.callData,
      clipboard: p.clipboard || Clipboard.encode([])
    };
  }

  encodeWorkflow() {
    return this.contract.interface.encodeFunctionData("advancedPipe", [
      this.encodeSteps(),
      "0" // fixme
    ]);
  }

  /**
   * Wrap a call to a contract into a Step<AdvancedPipeStruct>.
   * @param contract The contract to call.
   * @param method The contract method to call.
   * @param args The arguments to pass to `method`,
   * @param amountOut The expected amountOut from this Step.
   * @param clipboard Clipboard data used by Pipeline to copy any requisite calldata from prev steps.
   * @returns
   */
  wrap<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
    contract: C,
    method: M,
    args: A,
    amountOut: ethers.BigNumber,
    clipboard: string = Clipboard.encode([])
  ): Step<AdvancedPipePreparedResult> {
    return {
      name: method.toString(),
      amountOut,
      prepare: () => ({
        target: contract.address,
        callData: contract.interface.encodeFunctionData(method.toString(), args),
        clipboard
      }),
      decode: () => undefined,
      decodeResult: () => undefined
    };
  }

  async execute(): Promise<ethers.ContractTransaction> {
    throw new Error("Not implemented");
  }

  async callStatic(): Promise<string[]> {
    throw new Error("Not implemented");
  }

  async estimateGas(): Promise<ethers.BigNumber> {
    throw new Error("Not implemented");
  }
}
