import { ethers } from "ethers";
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
// interface WorkflowCls<EncodedResult extends any = any> {
//   name: string;
//   _generators: (StepGenerator<EncodedResult> | Workflow<EncodedResult>)[];
//   _steps: Step<any>[];
//   _value: ethers.BigNumber;
//   add(g: StepGenerators<EncodedResult>): void;
//   encode(): string;
// }

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
  _generators: (StepGenerator<EncodedResult> | Workflow<EncodedResult>)[] = [];
  _steps: Step<EncodedResult>[] = [];
  _value = ethers.BigNumber.from(0);

  constructor(protected sdk: BeanstalkSDK, public name: string = "Workflow") {}

  //
  static SLIPPAGE_PRECISION = 10 ** 6;
  private static slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Workflow.SLIPPAGE_PRECISION * (1 - _slippage))).div(Workflow.SLIPPAGE_PRECISION);
  }

  /**
   * Add a new StepGenerator to the list of generators.
   * Each StepGenerator is called during `.estimate()`.
   */
  add(s: StepGenerators<EncodedResult>) {
    if (Array.isArray(s)) {
      for (const elem of s) this.add(elem); // recurse
    } else {
      this.sdk.debug(`[Workflow][${this.name}][add] ${s.name}`);
      this._generators.push(s);
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
      try {
        const step = await this.buildStep(generator, nextAmount, true);
        nextAmount = step.amountOut;
      } catch (e) {
        throw e;
      }
    }

    return nextAmount;
  }

  /**
   * Encode this Workflow into a single hex string for submission to Ethereum.
   * This must be implemented by extensions of Workflow.
   */
  encode(): string {
    throw new Error("Not implemented");
  }
}

// --------------------------------------------------

/**
 * The "Farm" is a Workflow that encodes a call to `beanstalk.farm()`.
 */
export class Farm extends Workflow<string> {
  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
  }

  encode() {
    return this.sdk.contracts.beanstalk.interface.encodeFunctionData("farm", [this._steps.map((step) => step.encode())]);
  }
}

/**
 * The "AdvancedPipe" is a Workflow that encodes a call to `beanstalk.advancedPipe()`.
 */
export class AdvancedPipe extends Workflow<AdvancedPipeStruct> {
  constructor(protected sdk: BeanstalkSDK, public name: string = "Pipe") {
    super(sdk, name);
  }

  encode() {
    return this.sdk.contracts.beanstalk.interface.encodeFunctionData("advancedPipe", [
      this._steps.map((step) => step.encode()),
      "0", // fixme
    ]);
  }
}

//
// private encodeStepsWithSlippage(_slippage: number) {
//   if (this._steps.length === 0) throw new Error("Work: must run estimate() before encoding");

//   const fnData: string[] = [];

//   for (let i = 0; i < this._steps.length; i += 1) {
//     const amountOut = this._steps[i].amountOut;
//     const minAmountOut = Workflow.slip(amountOut, _slippage);

//     /// If the step doesn't have slippage (for ex, wrapping ETH),
//     /// then `encode` should ignore minAmountOut
//     const encoded = this._steps[i].encode(minAmountOut);

//     fnData.push(encoded);

//     this.sdk.debug(`[chain] encoding step ${i}: expected amountOut = ${amountOut}, minAmountOut = ${minAmountOut}`);
//   }

//   return fnData;
// }

// async execute(_amountIn: ethers.BigNumber | TokenValue, slippage: number) {
//   const amountIn = _amountIn instanceof TokenValue ? _amountIn.toBigNumber() : _amountIn;
//   await this.estimate(amountIn);
//   const data = this.encodeStepsWithSlippage(slippage / 100);

//   const txn = await this.sdk.contracts.beanstalk.farm(data, { value: this._value });

//   return txn;
// }
