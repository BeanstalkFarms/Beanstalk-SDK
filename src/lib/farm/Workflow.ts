import { ContractTransaction, ethers } from 'ethers';
import { BeanstalkSDK } from '../BeanstalkSDK';
import { Action, ActionResult } from './types';

export class Workflow {
  static SLIPPAGE_PRECISION = 10 ** 6;
  static sdk: BeanstalkSDK;
  private steps: Action[] = [];
  private stepResults: ActionResult[] = [];
  private value: ethers.BigNumber = ethers.BigNumber.from(0);

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

  copy() {
    const copy = new Workflow(Workflow.sdk);
    copy.addSteps([...this.steps]);
    return copy;
  }

  private async processAction(action: Action, input: ethers.BigNumber, forward: boolean) {
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

  /**
   * Estimate what the workflow would output given this amountIn is the input.
   * For ex, if we are trading ETH -> BEAN, and you want to spend exactly 5 ETH, estimate()
   * would tell how much BEAN you'd receive for 5 ETH
   * @param amountIn Amount to send to workflow as input for estimation
   * @returns Promise of BigNumber
   */
  async estimate(amountIn: ethers.BigNumber): Promise<ethers.BigNumber> {
    let nextAmount = amountIn;

    // clear any previous results
    this.stepResults = [];

    for (let i = 0; i < this.steps.length; i += 1) {
      nextAmount = await this.processAction(this.steps[i], nextAmount, true);
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
  async estimateReversed(desiredAmountOut: ethers.BigNumber): Promise<ethers.BigNumber> {
    let nextAmount = desiredAmountOut;

    // clear any previous results
    this.stepResults = [];

    for (let i = this.steps.length - 1; i >= 0; i -= 1) {
      nextAmount = await this.processAction(this.steps[i], nextAmount, false);
    }

    return nextAmount;
  }

  /**
   *
   * @param amountIn Amount to use as first input to workflow
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  async execute(amountIn: ethers.BigNumber, slippage: number): Promise<ContractTransaction> {
    await this.estimate(amountIn);
    const data = this.encodeStepsWithSlippage(slippage / 100);
    const txn = await Workflow.sdk.contracts.beanstalk.farm(data, { value: this.value });

    return txn;
  }
}
