import { ethers } from "ethers";
import { Token } from "src/classes/Token";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { TokenValue } from "src/TokenValue";

/**
 * A StepGenerator is responsible for building a Step.
 *
 * It:
 * 1. accepts an `amountIn` from a previous Step;
 * 2. [optionally] uses this to perform some lookup on-chain, for
 *    example calculating the `amountOut` received from a swap;
 * 3. Returns a Step, which:
 *    a. passes `amountOut` to the next StepGenerator;
 *    b. provides functions to encode & decode the Step when
 *       preparing it within a transaction like `farm()`.
 */
export type StepGenerator<EncodedResult extends any = string> = StepClass<EncodedResult> | StepFunction<EncodedResult>;

/**
 * A StepClass is a type of StepGenerator. It wraps a `run()` function
 * which returns a Step. The class can maintain its own internal state
 * or helpers if necessary. For example, you might instantiate an instance
 * of an ethers contract in the constructor and save that for repeated use
 * during `run()`.
 *
 * Unlke StepFunction, the `run()` function must return a Step and not
 * raw encoded data.
 */
export abstract class StepClass<EncodedResult extends any = string> {
  static sdk: BeanstalkSDK;
  name: string;

  public setSDK(sdk: BeanstalkSDK) {
    StepClass.sdk = sdk;
  }

  abstract run(_amountInStep: ethers.BigNumber, _forward: boolean): Promise<Step<EncodedResult>>;
}

/**
 * A StepFunction is a type of StepGenerator. It can return a Step or an
 * EncodedResult. The Workflow engine will parse this; if you provide just
 * the EncodedResult, the engine will wrap it into a Step for you.
 *
 * StepFunctions can be synchronous or asynchronous. If you already know
 * the calldata you want to pass to the workflow (perhaps you gathered
 * this calldata through some other method), you can just add it directly:
 *
 * ```
 * () => '0xCALLDATA' // in this case, EncodedResult = string.
 * ```
 */
export type StepFunction<EncodedResult extends any = string> = (
  amountIn: ethers.BigNumber,
  forward?: boolean
) =>
  | (EncodedResult | Step<EncodedResult>) // synchronous
  | Promise<EncodedResult | Step<EncodedResult>>; // asynchronous

/**
 * A Step represents one pre-estimated Ethereum function call
 * which can be encoded and executed on-chain.
 */
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

/**
 * StepGenerators contains all types that are can be passed
 * to a Workflow via `.add()`.
 */
type StepGenerators<EncodedResult extends any = string> =
  | StepGenerator<EncodedResult> // Add a StepGenerator.
  | Workflow<any> // Add another Workflow.
  | StepGenerators<EncodedResult>[]; // Recurse (allows nesting & arrays).

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
 * ## NESTING
 *
 * `_generators` is a flat list of:
 *  a. StepFunction [a type of StepGenerator]
 *  b. StepClass    [a type of StepGenerator]
 *  c. Workflow
 *
 * Since a Workflow is a valid generator, you can nest Workflows within each other
 * and continue the chain of passing `amountOut` between StepGenerators.
 *
 * See `.buildStep()` for a description of how Workflows are handled.
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

  static direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }

  clearSteps() {
    this._steps = [];
    this._value = ethers.BigNumber.from(0);
  }

  protected _copy<T extends Workflow<EncodedResult>>(WorkflowConstructor: new (...args: ConstructorParameters<typeof Workflow>) => T) {
    const copy = new WorkflowConstructor(this.sdk, this.name);
    copy.add(this._generators);
    return copy;
  }

  get generators(): Readonly<(StepGenerator<EncodedResult> | Workflow<EncodedResult>)[]> {
    return Object.freeze([...this._generators]);
  }

  get length(): number {
    return this._generators.length;
  }

  get value(): Readonly<ethers.BigNumber> {
    return Object.freeze(ethers.BigNumber.from(this._value));
  }

  /**
   * Add a new StepGenerator to the list of generators.
   * Each StepGenerator is called during `.estimate()`.
   */
  add(input: StepGenerators<EncodedResult>) {
    if (Array.isArray(input)) {
      for (const elem of input) {
        this.add(elem); // recurse
      }
    } else {
      this.sdk.debug(`[Workflow][${this.name}][add] ${input.name}`);
      if (input instanceof StepClass) {
        input.setSDK(this.sdk);
      }
      this._generators.push(input);
    }

    return this; // allows chaining
  }

  /**
   * Run a StepGenerator to produce a Step.
   * @fixme "runGenerator"? i'm ok with buildStep personally
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
        // First, we call the Workflow's `.estimate()` and pass
        // in the current amountInStep. This effectively continues
        // the chain of estimation.
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
      } else if (input instanceof StepClass) {
        // This input is a StepClass.
        // We call its `run()` function to produce a Step.
        // StepClass.run must return a Step, so nothing to parse here.
        step = await input.run(amountInStep, forward);
      } else {
        // This input is a StepFunction.
        // We call the function directly and investigate the shape of its return value.
        const fnResult = (await input.call(this, amountInStep, forward)) as Step<EncodedResult> | EncodedResult;

        // If the StepFunction returns an object with `.encode()` function,
        // we assume the object itself is a Step.
        if (typeof (fnResult as Step<EncodedResult>)?.encode === "function") {
          step = fnResult as Step<EncodedResult>;
        }

        // Otherwise, it's the EncodedResult (could be a string or a struct),
        // for which we manually compose an appropriate step.
        // `fnResult` is something like `string`, `AdvancedPipeStruct`, etc.
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
   * Estimate what the workflow would output given this amountIn is the input.
   * For ex, if we are trading ETH -> BEAN, and you want to spend exactly 5 ETH, estimate()
   * would tell how much BEAN you'd receive for 5 ETH
   * @param amountIn Amount to send to workflow as input for estimation
   * @returns Promise of BigNumber
   */
  async estimate(amountIn: ethers.BigNumber | TokenValue): Promise<ethers.BigNumber> {
    this.clearSteps();

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
   * Estimate the min amount to input to the workflow to receive the desiredAmountOut output
   * For ex, if we are trading ETH -> Bean, and I want exactly 500 BEAN, estimateReversed()
   * tell me how much ETH will result in 500 BEAN
   * @param desiredAmountOut The end amount you want the workflow to output
   * @returns Promise of BigNumber
   */
  async estimateReversed(amountIn: ethers.BigNumber | TokenValue) {
    this.clearSteps();

    let nextAmount = amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn;

    for (let i = this._steps.length - 1; i >= 0; i -= 1) {
      const generator = this._generators[i];
      const step = await this.buildStep(generator, nextAmount, false);
      nextAmount = step.amountOut;
      this.sdk.debug(`[Workflow][${this.name}][estimateReversed][${i}/${step.name || "<unknown>"}]`, step);
    }

    return nextAmount;
  }

  /**
   * Loop over a sequence of pre-estimated Steps and encode their
   * calldata with a slippage value applied to `amountOut`.
   */
  protected encodeStepsWithSlippage(_slippage: number) {
    if (this._steps.length === 0) throw new Error("Work: must run estimate() before encoding");

    const fnData: EncodedResult[] = [];
    for (let i = 0; i < this._steps.length; i += 1) {
      // Convert `amountOut` -> `minAmountOut` via slippage param.
      const amountOut = this._steps[i].amountOut;
      const minAmountOut = Workflow.slip(amountOut, _slippage);

      // If the step doesn't have slippage (for ex, wrapping ETH),
      // then `encode` should ignore minAmountOut.
      const encoded = this._steps[i].encode(minAmountOut);

      fnData.push(encoded);
    }

    return fnData;
  }

  /**
   * Run `.estimate()` and encode all resulting Steps with a slippage value.
   */
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
   * @param amountIn Amount to use as first input to Work
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  abstract execute(_amountIn: ethers.BigNumber | TokenValue, slippage: number): Promise<ethers.ContractTransaction>;

  /**
   * CallStatic version of the execute method. Allows testing the execution of the workflow.
   * @param amountIn Amount to use as first input to workflow
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  abstract callStatic(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<string[]>;

  /**
   *
   */
  abstract estimateGas(_amountIn: ethers.BigNumber | TokenValue, _slippage: number): Promise<ethers.BigNumber>;
}
