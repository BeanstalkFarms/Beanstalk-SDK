import { ethers } from 'ethers';
import { FarmFromMode, FarmToMode } from '../types';
import { Action, ActionResult, BaseAction } from '../types';

export class TransferToken extends BaseAction implements Action {
  public name: string = 'transferToken';

  constructor(
    private _tokenIn: string,
    private _recipient: string,
    private _fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    TransferToken.sdk.debug('[step@transferToken] run', {
      _fromMode: this._fromMode,
      _toMode: this._toMode,
      _amountInStep,
    });
    return {
      name: this.name,
      amountOut: _amountInStep, // transfer exact amount
      encode: (_: ethers.BigNumber) =>
        TransferToken.sdk.contracts.beanstalk.interface.encodeFunctionData('transferToken', [
          this._tokenIn, //
          this._recipient, //
          _amountInStep, // ignore minAmountOut since there is no slippage
          this._fromMode, //
          this._toMode, //
        ]),
      decode: (data: string) => TransferToken.sdk.contracts.beanstalk.interface.decodeFunctionData('transferToken', data),
    };
  }
}
