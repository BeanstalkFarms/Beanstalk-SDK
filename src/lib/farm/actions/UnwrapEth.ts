import { ethers } from 'ethers';
import { BeanstalkSDK } from '../../BeanstalkSDK';
import { FarmToMode } from '../../farm';
import { Action, ActionResult, BaseAction } from '../types';

export class UnwrapEth extends BaseAction implements Action {
  public name: string = 'unwrapEth';

  constructor(sdk: BeanstalkSDK, private toMode: FarmToMode = FarmToMode.EXTERNAL) {
    super(sdk);
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    return {
      name: this.name,
      amountOut: _amountInStep, // amountInStep should be an amount of ETH.
      value: _amountInStep, // need to use this amount in the txn.
      encode: (_: ethers.BigNumber) =>
        this.sdk.contracts.beanstalk.interface.encodeFunctionData('unwrapEth', [
          _amountInStep, // ignore minAmountOut since there is no slippage
          this.toMode,
        ]),
      decode: (data: string) => this.sdk.contracts.beanstalk.interface.decodeFunctionData('unwrapEth', data),
    };
  }
}
