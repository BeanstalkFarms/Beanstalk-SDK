import { ethers } from 'ethers';
import { FarmToMode } from '../types';
import { Action, ActionResult, BaseAction } from '../types';

export class UnwrapEth extends BaseAction implements Action {
  public name: string = 'unwrapEth';

  constructor(private toMode: FarmToMode = FarmToMode.EXTERNAL) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    return {
      name: this.name,
      amountOut: _amountInStep, // amountInStep should be an amount of ETH.
      value: _amountInStep, // need to use this amount in the txn.
      encode: (_: ethers.BigNumber) =>
        UnwrapEth.sdk.contracts.beanstalk.interface.encodeFunctionData('unwrapEth', [
          _amountInStep, // ignore minAmountOut since there is no slippage
          this.toMode,
        ]),
      decode: (data: string) => UnwrapEth.sdk.contracts.beanstalk.interface.decodeFunctionData('unwrapEth', data),
    };
  }
}
