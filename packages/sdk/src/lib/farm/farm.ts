import { BeanstalkSDK } from "../BeanstalkSDK";
import * as ActionLibrary from "./actions";
import { LibraryPresets } from "./LibraryPresets";
import { EncodeContext, Step, Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { TokenValue } from "src/TokenValue";
import { ethers } from "ethers";
import { AdvancedPipeWorkflow } from "src/lib/depot/pipe";

export type FarmStep = Step<string>;

/**
 * The "Farm" is a Workflow that encodes a call to `beanstalk.farm()`.
 */
export class FarmWorkflow extends Workflow<string> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(FarmWorkflow);
  }

  encode(context: EncodeContext) {
    // TODO: we need to do somethign here with minAmountOut I think
    // and also the same in pipe.ts:encode()
    return this.contract.interface.encodeFunctionData("farm", [
      this.encodeStepsWithSlippage(context.slippage)
      // this._steps.map((step) => step.encode())
    ]);
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
 *
 */
export class Farm {
  static sdk: BeanstalkSDK;
  public readonly actions: typeof ActionLibrary;
  public presets: LibraryPresets;

  constructor(sdk: BeanstalkSDK) {
    Farm.sdk = sdk;
    this.actions = ActionLibrary;
    this.presets = new LibraryPresets(Farm.sdk);
  }

  create(name?: string) {
    return new FarmWorkflow(Farm.sdk, name);
  }

  /**
   * @todo discuss name
   */
  createAdvancedPipe(name?: string) {
    return new AdvancedPipeWorkflow(Farm.sdk, name);
  }
}
