import { BeanstalkSDK } from "../BeanstalkSDK";
import * as ActionLibrary from "./actions";
import { LibraryPresets } from "./LibraryPresets";
import { Step, Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { TokenValue } from "src/TokenValue";
import { ethers } from "ethers";
import { AdvancedPipeWorkflow } from "src/lib/depot/pipe";

export type FarmStep = Step<string>;

/**
 * The "Farm" is a Workflow that encodes a call to `beanstalk.farm()`.
 */
export class FarmWorkflow<ExecuteData extends { slippage: number } = { slippage: number }> extends Workflow<string, ExecuteData> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk;
  }

  copy() {
    return this._copy(FarmWorkflow<ExecuteData>);
  }

  encode() {
    // TODO: we need to do somethign here with minAmountOut I think
    // and also the same in pipe.ts:encode()
    return this.contract.interface.encodeFunctionData("farm", [this.encodeSteps()]);
  }

  async execute(amountIn: ethers.BigNumber | TokenValue, data: ExecuteData): Promise<ethers.ContractTransaction> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, "execute", data);
    this.sdk.debug("Execute data", encoded);
    return this.contract.farm(encoded, { value: this.value });
  }

  async callStatic(amountIn: ethers.BigNumber | TokenValue, data: ExecuteData): Promise<string[]> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, "callStatic", data);
    return this.contract.callStatic.farm(encoded, { value: this.value });
  }

  async estimateGas(amountIn: ethers.BigNumber | TokenValue, data: ExecuteData): Promise<ethers.BigNumber> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, "estimateGas", data);
    return this.contract.estimateGas.farm(encoded, { value: this.value });
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
