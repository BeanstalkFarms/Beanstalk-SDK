import { ethers } from "ethers";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { AdvancedPipeStruct } from "src/lib/depot";
import { TokenValue } from "src/TokenValue";

export type StepGenerator<StepGeneratorResult extends any = string | Step> = (
  amountIn: ethers.BigNumber,
  forward?: boolean
) =>
  | StepGeneratorResult // synchronous
  | Promise<StepGeneratorResult>; // asynchronous

export type Step<Encoded extends any = any> = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut?: ethers.BigNumber) => Encoded;
  decode: (data: string) => undefined | Record<string, any>;
  decodeResult: (result: any) => undefined | ethers.utils.Result;
  print?: (result: any) => string;
};

// Something that generates steps. Either:
// a. A function that returns a Step
// b. A class that contains Steps
type StepGenerators = StepGenerator | Chainable | StepGenerators[];

interface ChainableCls {
  name: string;
  _generators: (StepGenerator | Chainable)[];
  _steps: Step<string>[];
  _value: ethers.BigNumber;
  add(g: StepGenerators): void;
  encode(): string;
}

export class Chainable implements ChainableCls {
  _generators: (StepGenerator | Chainable)[] = [];
  _steps: Step[] = [];
  _value = ethers.BigNumber.from(0);

  constructor(protected sdk: BeanstalkSDK, public name: string = "Chainable") {}

  //
  static SLIPPAGE_PRECISION = 10 ** 6;
  private static slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Chainable.SLIPPAGE_PRECISION * (1 - _slippage))).div(Chainable.SLIPPAGE_PRECISION);
  }

  // Add a new StepGenerator to the list of generators.
  // Steps aren't generated until `.estimate()` is called.
  add(s: StepGenerators) {
    if (Array.isArray(s)) {
      for (const elem of s) this.add(elem);
    } else {
      this._generators.push(s);
    }
  }

  // Run a StepGenerator to produce a step.
  async buildStep(gen: StepGenerator | Chainable, amountInStep: ethers.BigNumber, forward: boolean): Promise<Step> {
    let step: Step;

    if (gen instanceof Chainable) {
      const nextAmount = await gen.estimate(amountInStep);

      // Create a step which encodes the steps
      // inside the underlying Chainable class.
      step = {
        name: gen.name,
        amountOut: nextAmount,
        encode: () => gen.encode(),
        decode: () => undefined, // fixme
        decodeResult: () => undefined, // fixme
      };
    } else {
      const fnResult = await gen.call(this, amountInStep, forward);

      if (typeof fnResult === "string") {
        step = {
          name: gen.name || "<unknown>",
          amountOut: amountInStep, // propagate amountOut
          encode: () => fnResult, //
          decode: () => undefined, //
          decodeResult: () => undefined, //
        };
      } else {
        step = fnResult;
      }
    }

    this._steps.push(step);
    if (step.value) this._value.add(step.value);

    return step;
  }

  //
  async estimate(amountIn: ethers.BigNumber | TokenValue): Promise<ethers.BigNumber> {
    let nextAmount = amountIn instanceof TokenValue ? amountIn.toBigNumber() : amountIn;

    for (let i = 0; i < this._generators.length; i += 1) {
      const gen = this._generators[i];
      try {
        const step = await this.buildStep(gen, nextAmount, true);
        nextAmount = step.amountOut;
      } catch (e) {
        throw e;
      }
    }

    return nextAmount;
  }

  //
  encode(): string {
    throw new Error("Not implemented");
  }

  //
  private encodeStepsWithSlippage(_slippage: number) {
    if (this._steps.length === 0) throw new Error("Work: must run estimate() before encoding");

    const fnData: string[] = [];

    for (let i = 0; i < this._steps.length; i += 1) {
      const amountOut = this._steps[i].amountOut;
      const minAmountOut = Chainable.slip(amountOut, _slippage);

      /// If the step doesn't have slippage (for ex, wrapping ETH),
      /// then `encode` should ignore minAmountOut
      const encoded = this._steps[i].encode(minAmountOut);

      fnData.push(encoded);

      this.sdk.debug(`[chain] encoding step ${i}: expected amountOut = ${amountOut}, minAmountOut = ${minAmountOut}`);
    }

    return fnData;
  }
}

export class Farm extends Chainable {
  _steps: Step<string>[] = [];

  constructor(protected sdk: BeanstalkSDK, public name: string = "Farm") {
    super(sdk, name);
  }

  encode() {
    return this.sdk.contracts.beanstalk.interface.encodeFunctionData("farm", [this._steps.map((step) => step.encode())]);
  }
}

export class Pipe extends Chainable {
  _steps: Step<AdvancedPipeStruct>[] = [];

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

// async execute(_amountIn: ethers.BigNumber | TokenValue, slippage: number) {
//   const amountIn = _amountIn instanceof TokenValue ? _amountIn.toBigNumber() : _amountIn;
//   await this.estimate(amountIn);
//   const data = this.encodeStepsWithSlippage(slippage / 100);

//   const txn = await this.sdk.contracts.beanstalk.farm(data, { value: this._value });

//   return txn;
// }
