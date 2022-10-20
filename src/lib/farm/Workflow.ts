import { ContractTransaction, ethers } from 'ethers';
import { BeanstalkSDK } from '../BeanstalkSDK';
import { Action, ActionResult } from './types';

export class Workflow {
  static SLIPPAGE_PRECISION = 10 ** 6;
  static sdk: BeanstalkSDK;
  private steps: Action[] = [];
  private stepResults: ActionResult[] = [];
  private value: ethers.BigNumber = ethers.BigNumber.from(0);
  private estimateAmountIn: ethers.BigNumber;
  private estimateAmountOut: ethers.BigNumber;
  private estimateForward: boolean = true;

  constructor(sdk: BeanstalkSDK) {
    Workflow.sdk = sdk;
  }

  addStep(action: Action) {
    action.setSDK(Workflow.sdk);
    this.steps.push(action);
  }

  addSteps(actions: Action[]) {
    for (const action of actions) {
      this.addStep(action);
    }
  }

  private async processAction(action: Action, input: ethers.BigNumber, forward: boolean) {
    this.estimateForward = forward;
    try {
      const result = await action.run(input, forward);
      if (result.value) this.value = this.value.add(result.value);
      this.stepResults.push(result);
      return result.amountOut;
    } catch (e) {
      console.log(`[farm/estimate] Failed to estimate step ${action.name}`, input.toString(), forward);
      console.error(e);
      throw e;
    }
  }

  private slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Workflow.SLIPPAGE_PRECISION * (1 - _slippage))).div(Workflow.SLIPPAGE_PRECISION);
  }

  /**
   * Encode function calls with a predefined slippage amount.
   * @param _slippage slippage passed as a percentage. ex. 0.1% slippage => 0.001
   * @returns array of strings containing encoded function data.
   */
  private encodeStepsWithSlippage(_slippage: number) {
    const fnData: string[] = [];
    for (let i = 0; i < this.stepResults.length; i += 1) {
      const amountOut = this.stepResults[i].amountOut;
      const minAmountOut = this.slip(amountOut, _slippage);
      /// If the step doesn't have slippage (for ex, wrapping ETH),
      /// then `encode` should ignore minAmountOut
      const encoded = this.stepResults[i].encode(minAmountOut);
      fnData.push(encoded);
      Workflow.sdk.debug(`[chain] encoding step ${i}: expected amountOut = ${amountOut}, minAmountOut = ${minAmountOut}`);
    }
    return fnData;
  }

  async estimate(amountIn: ethers.BigNumber) {
    let nextAmount = amountIn;

    // clear any previous results
    this.stepResults = [];

    for (let i = 0; i < this.steps.length; i += 1) {
      nextAmount = await this.processAction(this.steps[i], nextAmount, true);
    }

    return nextAmount;
  }

  async estimateReversed(desiredAmountOut: ethers.BigNumber) {
    let nextAmount = desiredAmountOut;

    // clear any previous results
    this.stepResults = [];

    for (let i = this.steps.length - 1; i >= 0; i -= 1) {
      nextAmount = await this.processAction(this.steps[i], nextAmount, false);
    }

    return nextAmount;
  }

  async execute(amountIn: ethers.BigNumber, slippage: number): Promise<ContractTransaction> {
    // For execution, we estimate forward, always
    await this.estimate(amountIn);

    const data = this.encodeStepsWithSlippage(slippage / 100);

    const txn = await Workflow.sdk.contracts.beanstalk.farm(data, { value: this.value });
    Workflow.sdk.debug('[swap.execute] transaction sent', { transaction: txn });
    return txn;
  }
}
