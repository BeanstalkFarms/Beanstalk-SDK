import { ethers } from "ethers";
import { Token } from "src/classes/Token";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { TokenValue } from "src/TokenValue";

/**
 * RunMode identifies the different ways that a Workflow can be called.
 */
export enum RunMode {
  // "Estimates" allow some steps to be skipped (like permitting).
  Estimate = 0,
  EstimateReversed = 1,
  // "Static Calls" require the full transaction to be ready.
  Execute = 2,
  CallStatic = 3,
  EstimateGas = 4
}

/**
 * The RunContext provides context & runtime data to Step Generators.
 * RunData allows a developer to inject data into each Step Generator as it is called.
 *
 * For example, you might wait until a user clicks "Submit" to ask them to sign
 * a permit, and then inject that permit via RunData into a `permitERC20` Step.
 *
 * @fixme `any & { slippage }` doesn't seem to indicate the record could have a slippage key.
 */
export type RunContext<RunData extends Record<string, any> = any & { slippage?: number }> = {
  // Provided by Workflow
  runMode: RunMode;
  step: {
    index: number;
    findTag: (tag: string) => number;
  };
  // Provided by developer
  data: RunData;
};

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

  abstract run(_amountInStep: ethers.BigNumber, context: RunContext): Promise<Step<EncodedResult>>;
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
  context: RunContext
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
  encode: () => EncodedResult;
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
 * StepGeneratorOptions define how a StepGenerator should be treated during the build process.
 */
type StepGeneratorOptions = {
  /**
   * Only run this StepGenerator when executing
   * @fixme this is really more like "onlyStatic"
   */
  onlyExecute?: boolean;

  /**
   * Nametag for a particular step. Used for named lookup.
   */
  tag?: string;

  /**
   *
   */
  skip?: boolean | ((amountInStep: ethers.BigNumber, context: RunContext) => boolean | Promise<boolean>);
};

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
 *
 * @fixme nesting a Farm inside a Farm should fail (?)
 */
export abstract class Workflow<EncodedResult extends any = string, RunData extends Record<string, any> = {}> {
  //
  protected _generators: (StepGenerator<EncodedResult> | Workflow<EncodedResult>)[] = [];
  protected _options: (StepGeneratorOptions | null)[] = [];

  //
  protected _steps: Step<EncodedResult>[] = [];
  protected _value = ethers.BigNumber.from(0);
  protected _tagMap: { [key: string]: number } = {};

  static SLIPPAGE_PRECISION = 10 ** 6;

  constructor(protected sdk: BeanstalkSDK, public name: string = "Workflow") {}

  static slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Workflow.SLIPPAGE_PRECISION * (1 - _slippage))).div(Workflow.SLIPPAGE_PRECISION);
  }

  static direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }

  clearSteps() {
    this._steps = [];
    this._tagMap = {};
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
   * Add new StepGenerator(s) to memory. Each StepGenerator is called during `.estimate()`.
   * @param input A StepGenerator, an nested array of StepGenerators, or another Workflow.
   * @param options Options passed to each individual StepGenerator in `input`.
   */
  add(input: StepGenerators<EncodedResult>, options?: StepGeneratorOptions) {
    if (Array.isArray(input)) {
      for (const elem of input) {
        this.add(elem, options); // recurse
      }
    } else {
      this.sdk.debug(`[Workflow][${this.name}][add] ${input.name || "<unknown>"}`);
      if (input instanceof StepClass) {
        input.setSDK(this.sdk);
      }
      this._generators.push(input);
      this._options.push(options || null); // null = no options set
    }
    return this; // allow chaining
  }

  /**
   * Run a StepGenerator to produce a Step.
   */
  protected async buildStep(
    input: StepGenerator<EncodedResult> | Workflow<EncodedResult>,
    amountInStep: ethers.BigNumber,
    context: RunContext
  ): Promise<typeof this._steps[number]> {
    let step: typeof this._steps[number];

    try {
      if (input instanceof Workflow) {
        // This input is a Workflow.
        // Let's reduce this Workflow to a single Step.
        // First, we call the Workflow's `.estimate()` and pass
        // in the current amountInStep. This effectively continues
        // the chain of estimation.
        const nextAmount = await input.estimate(amountInStep, context);

        // Create a Step which encodes the steps
        // inside the underlying Workflow class.
        step = {
          name: input.name, // Match the Workflow's name
          amountOut: nextAmount, // The result of this Step is the final result of the Workflow.
          encode: () => input.encode.bind(input)() as EncodedResult, // Encode the entire Workflow into one element.
          decode: () => undefined, // fixme
          decodeResult: (data: string[]) => input.decodeResult(data) // fixme
        };
      } else if (input instanceof StepClass) {
        // This input is a StepClass.
        // We call its `run()` function to produce a Step.
        // StepClass.run must return a Step, so nothing to parse here.
        step = await input.run(amountInStep, context);
      } else {
        // This input is a StepFunction.
        // We call the function directly and investigate the shape of its return value.
        const fnResult = (await input.call(this, amountInStep, context)) as Step<EncodedResult> | EncodedResult;

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
            encode: () => fnResult as EncodedResult,
            decode: () => undefined, //
            decodeResult: () => undefined //
          };
        }
      }
    } catch (e) {
      this.sdk.debug(`[Workflow][${this.name}] Failed to build step ${input.name}`, e);
      console.error(e);
      throw e;
    }

    this._steps.push(step);
    if (step.value) {
      this._value = this._value.add(step.value);
    }

    return step;
  }

  /**
   * Determine if this RunMode is "static". Static RunModes require
   * transactions to be fully built, i.e. no steps in the chain can be skipped.
   *
   * For example, you might skip a step that makes an approval during `estimate()`
   * because it requires a permit that the user hasn't yet signed. However, for
   * the transaction to be valid to `execute()` or `callStatic()`, the approval
   * step must be included.
   *
   * @fixme use: `return r > 1; // optimized form`
   */
  protected isStaticRunMode(r: RunMode) {
    return r === RunMode.CallStatic || r === RunMode.EstimateGas || r === RunMode.Execute;
  }

  get tags() {
    return Object.freeze({ ...this._tagMap });
  }

  public findTag(tag: string): number {
    if (this._tagMap[tag] === undefined) throw new Error(`Tag does not exist: ${tag}`);
    const stepIndex = this._tagMap[tag];
    if (this._steps[stepIndex] === undefined) throw new Error("Step does not exist");
    return stepIndex;
  }

  public addTag(tag: string, stepIndex: number): void {
    if (this._tagMap[tag] !== undefined) throw new Error(`Tag already exists: ${tag}`);
    if (this._steps[stepIndex] === undefined) throw new Error("Step does not exist");
    this._tagMap[tag] = stepIndex;
  }

  /**
   * @param amountIn
   * @param context
   */
  protected async buildSteps(amountIn: ethers.BigNumber, _context: Omit<RunContext, "step">) {
    this.clearSteps();
    let nextAmount = amountIn;

    // Run generator at index i
    const run = async (i: number, label: "estimate" | "estimateReversed") => {
      const generator = this._generators[i];
      const options = this._options[i];

      // If this step is not skipped, this is the position
      // in the current `_steps` at which it will reside.
      // FIXME: what about reverse?
      const stepIndex = this._steps.length;

      //
      const context: RunContext = {
        ..._context,
        step: {
          index: stepIndex,
          findTag: (tag: string) => this.findTag(tag)
        }
      };

      const skip =
        // Don't build this step if it should only be built during execution, and we're
        // in a non-static context. (All steps must be built for `execute`, `estimateGas`, and
        // `callStatic`).
        (options?.onlyExecute === true && this.isStaticRunMode(context.runMode) === false) ||
        // If `options.skip` is true, skip.
        // If `options.skip` is a function, call it and skip if the return value is true.
        (options?.skip ? (typeof options.skip === "function" ? await options.skip(nextAmount, context) : options.skip) : false);

      if (skip) {
        this.sdk.debug(`[Workflow][${this.name}][${label}][${i}: ${generator.name || "<unknown>"}] skipping`);
      } else {
        const step = await this.buildStep(generator, nextAmount, context);
        nextAmount = step.amountOut;

        // use stepIndex from before `buildStep()`
        if (options?.tag) this.addTag(options.tag, stepIndex);

        this.sdk.debug(
          `[Workflow][${this.name}][${label}][${i}: ${step.name || "<unknown>"}]`,
          step.amountOut.toString(),
          step.value?.toString() || 0
        );
      }
    };

    // Run reverse
    if (_context.runMode === RunMode.EstimateReversed) {
      for (let i = this._generators.length - 1; i >= 0; i -= 1) {
        await run(i, "estimateReversed");
      }
    }

    // Run forward
    else {
      for (let i = 0; i < this._generators.length; i += 1) {
        await run(i, "estimate");
      }
    }

    return nextAmount;
  }

  /**
   * Estimate what the workflow would output given this amountIn is the input.
   * For ex, if we are trading ETH -> BEAN, and you want to spend exactly 5 ETH, estimate()
   * would tell how much BEAN you'd receive for 5 ETH
   * @param amountIn Amount to send to workflow as input for estimation
   * @param context
   * @returns Promise of BigNumber
   */
  async estimate(amountIn: ethers.BigNumber | TokenValue, context?: RunContext): Promise<ethers.BigNumber> {
    return this.buildSteps(amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn, {
      // If we're propagating from Workflow -> Workflow, inherit the RunMode
      // and propagate data; otherwise, this is a top-level estimate().
      runMode: context?.runMode || RunMode.Estimate,
      data: context?.data || {}
    });
  }

  /**
   * Estimate the min amount to input to the workflow to receive the desiredAmountOut output
   * For ex, if we are trading ETH -> Bean, and I want exactly 500 BEAN, estimateReversed()
   * tell me how much ETH will result in 500 BEAN
   * @param desiredAmountOut The end amount you want the workflow to output
   * @returns Promise of BigNumber
   */
  async estimateReversed(desiredAmountOut: ethers.BigNumber | TokenValue) {
    return this.buildSteps(
      desiredAmountOut instanceof TokenValue ? desiredAmountOut.toBigNumber() : desiredAmountOut,
      {
        runMode: RunMode.EstimateReversed,
        data: {}
      } // FIXME
    );
  }

  /**
   * Run `.estimate()` and encode all resulting Steps in preparation for execute().
   * Embed the requested runMode in context.
   *
   * @fixme collapse `runMode` and `data` into one struct?
   */
  protected async estimateAndEncodeSteps(amountIn: ethers.BigNumber | TokenValue, runMode: RunMode, data: RunData) {
    this.sdk.debug(`[Workflow._estimateAndEncodeSteps()]`, { amountIn, runMode, data });
    await this.buildSteps(amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn, { runMode, data });
    return this.encodeSteps();
  }

  /**
   * Loop over a sequence of pre-estimated Steps and encode their calldata.
   */
  protected encodeSteps() {
    if (this._steps.length === 0) throw new Error("Work: must run estimate() before encoding");

    const encoded: EncodedResult[] = [];
    for (let i = 0; i < this._steps.length; i += 1) {
      encoded.push(this._steps[i].encode());
    }

    return encoded;
  }

  /**
   * Iteratively decode the result of `.callStatic()`.
   */
  decodeResult(callStaticResult: string[]): ethers.utils.Result[] {
    return callStaticResult.map((result, index) => {
      const decodedResult = this._steps[index].decodeResult(result) || [];
      return decodedResult;
    });
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
  abstract execute(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.ContractTransaction>;

  /**
   * CallStatic version of the execute method. Allows testing the execution of the workflow.
   * @param amountIn Amount to use as first input to workflow
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  abstract callStatic(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<string[]>;

  /**
   *
   */
  abstract estimateGas(amountIn: ethers.BigNumber | TokenValue, data: RunData): Promise<ethers.BigNumber>;
}
