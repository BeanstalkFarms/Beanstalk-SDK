import { ContractTransaction, ethers } from 'ethers';
import { BeanstalkSDK } from '../lib/BeanstalkSDK';
import { Action, ActionResult } from '../lib/farm/types';

export class Workflow {
  static SLIPPAGE_PRECISION = 10 ** 6;
  private readonly sdk: BeanstalkSDK;
  private steps: Action[] = [];
  private stepResults: ActionResult[] = [];
  private value: ethers.BigNumber = ethers.BigNumber.from(0);

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
  }

  addStep(action: Action) {
    this.steps.push(action);
  }

  private async executeAction(action: Action, input: ethers.BigNumber, forward: boolean) {
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
      this.sdk.debug(`[chain] encoding step ${i}: expected amountOut = ${amountOut}, minAmountOut = ${minAmountOut}`);
    }
    return fnData;
  }

  // FIXME: why is this an array in farm.estimate()??
  async estimate(amountIn: ethers.BigNumber, _forward: boolean = true) {
    let nextAmount = amountIn;

    if (_forward) {
      for (let i = 0; i < this.steps.length; i += 1) {
        nextAmount = await this.executeAction(this.steps[i], nextAmount, _forward);
      }
    } else {
      for (let i = this.steps.length - 1; i >= 0; i -= 1) {
        nextAmount = await this.executeAction(this.steps[i], nextAmount, _forward);
      }
    }
    
    return nextAmount;
    // return {
    //   amountOut: ,
    //   value: this.value,        // we prob don't need this here
    //   steps: this.stepResults,  // we prob don't need this here
    // };
  }

  async execute(slippage: number): Promise<ContractTransaction> {
    // FIXME: should we just run the estimate here if it hasn't already?
    if (!this.stepResults.length) throw new Error('Estimate has not run yet');

    const data = this.encodeStepsWithSlippage(slippage / 100);

    const txn = await this.sdk.contracts.beanstalk.farm(data, { value: this.value });
    this.sdk.debug('[swap.execute] transaction sent', { transaction: txn });
    return txn;
  }
}
