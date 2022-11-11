import { ethers } from "ethers";
import { Beanstalk } from "src/constants/generated";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { AdvancedPipeStruct } from "src/lib/depot";
import { TokenValue } from "src/TokenValue";

export type StepGenerator<EncodedResult extends any = string> = (
  amountIn: ethers.BigNumber,
  forward?: boolean
) =>
  | (EncodedResult | Step<EncodedResult>) // synchronous
  | Promise<EncodedResult | Step<EncodedResult>>; // asynchronous

export type Step<EncodedResult extends any> = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut?: ethers.BigNumber) => EncodedResult;
  decode: (data: string) => undefined | Record<string, any>;
  decodeResult: (result: any) => undefined | ethers.utils.Result;
  print?: (result: any) => string;
};

// Something that generates steps. Either:
// a. A function that returns a Step
// b. A class that contains Steps
type StepGenerators<EncodedResult extends any = string> = StepGenerator<EncodedResult> | Workflow<any> | StepGenerators<EncodedResult>[];

// Something to which you can .add StepGenerators.
// Independently encodable.
interface _Workflow<EncodedResult extends any = any> {
  name: string;
  _generators: (StepGenerator<EncodedResult> | Workflow<EncodedResult>)[];
  _steps: Step<any>[];
  _value: ethers.BigNumber;
  add(g: StepGenerators<EncodedResult>): void;
  encode(): string;
}

/**
 * A `Workflow` allows for iterative preparation of an Ethereum transaction
 * that involves multiple steps. This includes Beanstalk's `farm()` function,
 * the `pipeMulti` and `pipeAdvanced` functions provided by Pipeline and Depot,
 * etc.
 *
 * ## BASICS
 *
 * There are three main components of a workflow:
 *
 * 1. **Step Generators** are asynchronous functions which create a Step. A Step
 *    Generator will often perform an on-chain lookup mixed with some post-processing
 *    to figure out what the result of a particular function call will be. For example,
 *    the Step Generator for Curve's `exchange()` function will use a static call to
 *    `get_dy` on the Curve pool of interest to determine how much of the requested
 *    token will be received during an exchange.
 *
 * 2. **Steps** represent single Ethereum function calls that will eventually
 *    be executed on-chain. Each Step includes functions to encode calldata,
 *    decode calldata, and decode the result of a function call.
 *
 * 3. The `encode()` function, which condenses each Step encoded within `.steps` into
 *    a single hex-encoded string for submission to Ethereum.
 *
 */
export abstract class Workflow<EncodedResult extends any = string> {
  protected _generators: (StepGenerator<EncodedResult> | Workflow<EncodedResult>)[] = [];
  protected _steps: Step<EncodedResult>[] = [];
  protected _value = ethers.BigNumber.from(0);

  constructor(protected sdk: BeanstalkSDK, public name: string = "Workflow") {}

  //
  static SLIPPAGE_PRECISION = 10 ** 6;
  protected static slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Workflow.SLIPPAGE_PRECISION * (1 - _slippage))).div(Workflow.SLIPPAGE_PRECISION);
  }

  clearEstimate() {
    this._steps = [];
    this._value = ethers.BigNumber.from(0);
  }

  protected _copy<T extends Workflow<EncodedResult>>(WorkflowInh: new (...args: ConstructorParameters<typeof Workflow>) => T) {
    const copy = new WorkflowInh(this.sdk, this.name);
    copy.add(this._generators);
    return copy;
  }

  get generators(): Readonly<(StepGenerator<EncodedResult> | Workflow<EncodedResult>)[]> {
    return Object.freeze(this._generators);
  }

  get steps(): Readonly<Step<EncodedResult>[]> {
    return Object.freeze(this._steps);
  }

  get value(): Readonly<ethers.BigNumber> {
    return Object.freeze(this._value);
  }

  /**
   * Add a new StepGenerator to the list of generators.
   * Each StepGenerator is called during `.estimate()`.
   */
  add(input: StepGenerators<EncodedResult>) {
    if (Array.isArray(input)) {
      for (const elem of input) this.add(elem); // recurse
    } else {
      this.sdk.debug(`[Workflow][${this.name}][add] ${input.name}`);
      this._generators.push(input);
    }
    return this;
  }

  /**
   * Run a StepGenerator to produce a Step.
   */
  async buildStep(
    input: StepGenerator<EncodedResult> | Workflow<EncodedResult>,
    amountInStep: ethers.BigNumber,
    forward: boolean
  ): Promise<typeof this._steps[number]> {
    let step: typeof this._steps[number];

    try {
      if (input instanceof Workflow) {
        // This input is a Workflow.
        // Let's reduce this Workflow to a single Step.
        const nextAmount = await input.estimate(amountInStep);

        // Create a Step which encodes the steps
        // inside the underlying Workflow class.
        step = {
          name: input.name, // Match the Workflow's name
          amountOut: nextAmount, // The result of this Step is the final result of the Workflow.
          encode: () => input.encode() as EncodedResult, // Encode the entire Workflow into one element.
          decode: () => undefined, // fixme
          decodeResult: () => undefined, // fixme
        };
      } else {
        // This input is a Function.
        // We call the function and investigate the shape of its return value.
        const fnResult = (await input.call(this, amountInStep, forward)) as Step<EncodedResult> | EncodedResult;

        // If the StepGenerator returns an object with `.encode()` function,
        // the object itself is a Step. Otherwise, it's the EncodedResult
        // itself (could be a string or a struct), for which we manually compose
        // an appropriate step.
        if (typeof (fnResult as Step<EncodedResult>)?.encode === "function") {
          step = fnResult as Step<EncodedResult>;
        }

        // `fnResult` is of type `EncodedResult`. This might be something
        // like `string`, `AdvancedPipeStruct`, etc.
        else {
          step = {
            name: input.name || "<unknown>",
            amountOut: amountInStep, // propagate amountOut
            encode: () => fnResult as EncodedResult, //
            decode: () => undefined, //
            decodeResult: () => undefined, //
          };
        }
      }
    } catch (e) {
      this.sdk.debug(`[Workflow][${this.name}] Failed to build step ${input.name}`, e);
      console.error(e);
      throw e;
    }

    this._steps.push(step);
    if (step.value) this._value.add(step.value);

    this.sdk.debug(`[Workflow][${this.name}][buildStep]`, step);
    return step;
  }

  /**
   * Estimate the `amountOut` received for executing this Workflow on-chain
   * by iterating through its StepGenerators.
   */
  async estimate(amountIn: ethers.BigNumber | TokenValue): Promise<ethers.BigNumber> {
    let nextAmount = amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn;

    for (let i = 0; i < this._generators.length; i += 1) {
      const generator = this._generators[i];
      const step = await this.buildStep(generator, nextAmount, true);
      nextAmount = step.amountOut;
      this.sdk.debug(`[Workflow][${this.name}][estimate][${i}/${step.name || "<unknown>"}]`, step);
    }

    return nextAmount;
  }

  /**
   *
   */
  async estimateReversed() {
    throw new Error("Not yet implemented");
  }

  /**
   * Loop over a sequence of pre-estimated steps and encode their
   * calldata with a slippage value applied to amountOut.
   */
  protected encodeStepsWithSlippage(_slippage: number) {
    if (this._steps.length === 0) throw new Error("Work: must run estimate() before encoding");

    const fnData: EncodedResult[] = [];
    for (let i = 0; i < this._steps.length; i += 1) {
      // Convert `amountOut` -> `minAmountOut` via slippage param
      const amountOut = this._steps[i].amountOut;
      const minAmountOut = Workflow.slip(amountOut, _slippage);

      // If the step doesn't have slippage (for ex, wrapping ETH),
      // then `encode` should ignore minAmountOut
      const encoded = this._steps[i].encode(minAmountOut);

      fnData.push(encoded);
    }

    return fnData;
  }

  protected async _prep(amountIn: ethers.BigNumber | TokenValue, slippage: number) {
    this.sdk.debug(`[Workflow._prep()]`, { amountIn, slippage });
    await this.estimate(amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn);
    return this.encodeStepsWithSlippage(slippage / 100);
  }

  /**
   * Encode this Workflow into a single hex string for submission to Ethereum.
   * This must be implemented by extensions of Workflow.
   */
  abstract encode(): string;

  /**
   *
   */
  abstract execute(_amountIn: ethers.BigNumber | TokenValue, slippage: number): Promise<ethers.ContractTransaction>;

  /**
   *
   */
  abstract callStatic(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<string[]>;

  /**
   *
   */
  abstract estimateGas(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<ethers.BigNumber>;

  // _make(c: ethers.Contract) {}
}

// --------------------------------------------------

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
