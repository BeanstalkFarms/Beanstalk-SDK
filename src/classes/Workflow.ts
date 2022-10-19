import { ethers } from 'ethers';
import { BeanstalkSDK } from '../lib/BeanstalkSDK';
import { Action, ActionResult } from '../lib/farm/types';

export class Workflow {
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

    return {
      amountOut: nextAmount,
      value: this.value,
      steps: this.stepResults, // we prob don't need this here
    };
  }

  async executeAction(action: Action, input: ethers.BigNumber, forward: boolean) {
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
}
