import { BigNumber, ContractTransaction, ethers } from 'ethers';
import { BeanstalkSDK } from '../BeanstalkSDK';
import { Action, ActionFunction, ActionResult, BaseAction } from './types';

export class Work {
  static SLIPPAGE_PRECISION = 10 ** 6;
  static sdk: BeanstalkSDK;
  private steps: (Action | ActionFunction)[] = [];
  private stepResults: ActionResult[] = [];
  private value: ethers.BigNumber = ethers.BigNumber.from(0);

  constructor(sdk: BeanstalkSDK) {
    Work.sdk = sdk;
  }

  //////////////////////// Utilities ////////////////////////

  /**
   * Apply slippage to an amount.
   * @param _amount ethers.BigNumber
   * @param _slippage slippage as a decimal; i.e. _slippage = 0.001 means 0.1%
   */
  private static slip(_amount: ethers.BigNumber, _slippage: number) {
    return _amount.mul(Math.floor(Work.SLIPPAGE_PRECISION * (1 - _slippage))).div(Work.SLIPPAGE_PRECISION);
  }

  //////////////////////// Steps ////////////////////////

  addStep(action: Action | ActionFunction) {
    if (action instanceof BaseAction) {
      console.log(`action`);
      action.setSDK(Work.sdk);
      this.steps.push(action);
    } else if (action instanceof Function) {
      this.steps.push(action);
      console.log('A Function');
    } else {
      throw new Error('Received action that is of unknown type');
    }
  }

  addSteps(actions: (Action | Action[] | ActionFunction)[]) {
    for (const action of actions) {
      Array.isArray(action) ? this.addSteps(action) : this.addStep(action);
    }
  }

  copy() {
    const copy = new Work(Work.sdk);
    copy.addSteps([...this.steps]);
    return copy;
  }

  //////////////////////// Run Actions ////////////////////////

  /**
   *
   */
  private async runAction(action: Action | ActionFunction, input: ethers.BigNumber, forward: boolean) {
    let result;
    try {
      if (action instanceof BaseAction) {
        result = await action.run(input, forward);
        if (result.value) this.value = this.value.add(result.value);
        this.stepResults.push(result);

        return result.amountOut;
      } else if (action instanceof Function) {
        const result = await action.call(this, input, forward);
        if (typeof result === 'string') {
          const actionResult: ActionResult = {
            name: 'ActionFunction',
            amountOut: BigNumber.from('0'),
            encode: () => result,
            decode: data => ({}),
          };
          this.stepResults.push(actionResult);

          return actionResult.amountOut;
        } else {
          if (result.value) this.value = this.value.add(result.value);
          this.stepResults.push(result);

          return result.amountOut;
        }
      } else {
        throw new Error('Received action that is of unknown type');
      }
    } catch (e) {
      console.log(`[farm/estimate] Failed to estimate step ${action.name}`, input.toString(), forward);
      console.error(e);
      throw e;
    }
  }

  //////////////////////// Estimate ////////////////////////

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
      nextAmount = await this.runAction(this.steps[i], nextAmount, true);
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
      nextAmount = await this.runAction(this.steps[i], nextAmount, false);
    }

    return nextAmount;
  }

  //////////////////////// Encode ////////////////////////

  /**
   * Loop over a sequence of pre-estimated steps and encode their
   * calldata with a slippage value applied to amountOut.
   *
   * @fixme throw if this.stepResults is currently empty
   * @fixme statelessness of individual workflows
   */
  private encodeStepsWithSlippage(_slippage: number) {
    const fnData: string[] = [];
    for (let i = 0; i < this.stepResults.length; i += 1) {
      const amountOut = this.stepResults[i].amountOut;
      const minAmountOut = Work.slip(amountOut, _slippage);
      /// If the step doesn't have slippage (for ex, wrapping ETH),
      /// then `encode` should ignore minAmountOut
      const encoded = this.stepResults[i].encode(minAmountOut);
      fnData.push(encoded);
      Work.sdk.debug(`[chain] encoding step ${i}: expected amountOut = ${amountOut}, minAmountOut = ${minAmountOut}`);
    }
    return fnData;
  }

  //////////////////////// Execute ////////////////////////

  /**
   *
   * @param amountIn Amount to use as first input to Work
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  async execute(amountIn: ethers.BigNumber, slippage: number): Promise<ContractTransaction> {
    await this.estimate(amountIn);
    const data = this.encodeStepsWithSlippage(slippage / 100);
    const txn = await Work.sdk.contracts.beanstalk.farm(data, { value: this.value });

    return txn;
  }

  /**
   * CallStatic version of the execute method. Allows testing the execution of the workflow.
   * @param amountIn Amount to use as first input to workflow
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  async callStatic(amountIn: ethers.BigNumber, slippage: number): Promise<string[]> {
    await this.estimate(amountIn);
    const data = this.encodeStepsWithSlippage(slippage / 100);
    const txn = await Work.sdk.contracts.beanstalk.callStatic.farm(data, { value: this.value });

    return txn;
  }
}
