import { BeanstalkSDK } from "../BeanstalkSDK";
import * as ActionLibrary from "./actions";
import { LibraryPresets } from "./LibraryPresets";
import { BasicPreparedResult, RunMode, Step, Workflow } from "src/classes/Workflow";
import { Beanstalk } from "src/constants/generated";
import { TokenValue } from "src/TokenValue";
import { ethers } from "ethers";
import { AdvancedPipeWorkflow } from "src/lib/depot/pipe";
import { AdvancedFarmCallStruct } from "src/constants/generated/Beanstalk/Beanstalk";
import { Clipboard } from "src/lib/depot";

type FarmPreparedResult = { callData: string };
// export type FarmStep = Step<FarmPreparedResult>;

/**
 * FarmWorkflow
 * => `beanstalk.farm()`.
 */
export class FarmWorkflow<RunData extends { slippage: number } = { slippage: number }> extends Workflow<
  string, // EncodedResult
  FarmPreparedResult, // PreparedResult
  RunData // RunData
> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
    this.contract = this.sdk.contracts.beanstalk; // ?
  }

  copy() {
    return this._copy(FarmWorkflow<RunData>);
  }

  ////////// Nested Behavior //////////

  prepare() {
    return {
      target: this.contract.address, // targets Beanstalk if used in a pipeline
      callData: this.encodeWorkflow() // encodes: farm([ this.encodeSteps() ])
    };
  }

  encodeWorkflow() {
    return this.contract.interface.encodeFunctionData("farm", [this.encodeSteps()]);
  }

  encodeStep(p: FarmPreparedResult): string {
    // Farm steps can be called simply using their calldata
    return p.callData;
  }

  ////////// Parent Behavior //////////

  async execute(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.ContractTransaction> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.Execute, data);
    this.sdk.debug("Execute data", encoded);
    return this.contract.farm(encoded, { value: this.value });
  }

  async callStatic(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<string[]> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.CallStatic, data);
    return this.contract.callStatic.farm(encoded, { value: this.value });
  }

  async estimateGas(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.BigNumber> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.EstimateGas, data);
    return this.contract.estimateGas.farm(encoded, { value: this.value });
  }
}

/**
 * AdvancedFarmWorkflow
 * => `depot.advancedFarm()`.
 */
type AdvancedFarmPreparedResult = {
  callData: string;
  clipboard?: string;
};
export class AdvancedFarmWorkflow<RunData extends { slippage: number } = { slippage: number }> extends Workflow<
  AdvancedFarmCallStruct,
  AdvancedFarmPreparedResult,
  RunData
> {
  private contract: Beanstalk;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
    this.contract = this.sdk.contracts.depot; // ?
  }

  copy() {
    return this._copy(AdvancedFarmWorkflow<RunData>);
  }

  ////////// Nested Behavior //////////

  encodeWorkflow() {
    return this.contract.interface.encodeFunctionData("advancedFarm", [this.encodeSteps()]);
  }

  encodeStep(p: AdvancedFarmPreparedResult): AdvancedFarmCallStruct {
    return {
      callData: p.callData,
      clipboard: p.clipboard || Clipboard.encode([])
    };
  }

  ////////// Parent Behavior //////////

  async execute(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.ContractTransaction> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.Execute, data);
    this.sdk.debug("Execute data", encoded);
    return this.contract.advancedFarm(encoded, { value: this.value });
  }

  async callStatic(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<string[]> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.CallStatic, data);
    return this.contract.callStatic.advancedFarm(encoded, { value: this.value });
  }

  async estimateGas(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.BigNumber> {
    const encoded = await this.estimateAndEncodeSteps(amountIn, RunMode.EstimateGas, data);
    return this.contract.estimateGas.advancedFarm(encoded, { value: this.value });
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
