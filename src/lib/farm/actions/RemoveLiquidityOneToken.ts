import { ethers } from 'ethers';
import {
  Curve3Pool,
  CurveCryptoFactory,
  CurveMetaFactory,
  CurveMetaPool,
  CurvePlainPool,
  CurveTriCrypto2Pool,
} from '../../../constants/generated';
import { FarmFromMode, FarmToMode } from '../../farm';
import { Action, ActionResult, BaseAction } from '../types';

export class RemoveLiquidityOneToken extends BaseAction implements Action {
  public name: string = 'RemoveLiquidityOneToken';

  constructor(
    private _pool: CurveTriCrypto2Pool | Curve3Pool | CurveMetaPool | CurvePlainPool,
    private _registry: CurveMetaFactory | CurveCryptoFactory,
    private _tokenOut: string,
    private _fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    const registry = RemoveLiquidityOneToken.sdk.contracts.curve.registries.metaFactory;
    const coins = await registry.callStatic.get_coins(this._pool.address, { gasLimit: 10000000 });
    const i = coins.findIndex(addr => addr.toLowerCase() === this._tokenOut.toLowerCase());

    /// FIXME: only difference between this and addLiquidity is the boolean
    /// Get amount out based on the selected pool

    const pools = RemoveLiquidityOneToken.sdk.contracts.curve.pools;

    let amountOut;
    if (this._pool === pools.tricrypto2) {
      amountOut = await this._pool.callStatic.calc_withdraw_one_coin(_amountInStep, i, { gasLimit: 10000000 });
    } else if (this._pool === pools.pool3) {
      amountOut = await this._pool.callStatic.calc_withdraw_one_coin(_amountInStep, i, { gasLimit: 10000000 });
    } else if (this._registry === RemoveLiquidityOneToken.sdk.contracts.curve.registries.metaFactory) {
      amountOut = await (this._pool as CurveMetaPool).callStatic['calc_withdraw_one_coin(uint256,int128)'](_amountInStep, i, {
        gasLimit: 10000000,
      });
    } else if (this._registry === RemoveLiquidityOneToken.sdk.contracts.curve.registries.cryptoFactory) {
      amountOut = await (this._pool as CurvePlainPool).callStatic.calc_withdraw_one_coin(_amountInStep, i, {
        gasLimit: 10000000,
      });
    }

    if (!amountOut) throw new Error('No supported pool found');
    RemoveLiquidityOneToken.sdk.debug(`[step@removeLiquidity] amountOut=${amountOut.toString()}`);

    return {
      name: this.name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) =>
        RemoveLiquidityOneToken.sdk.contracts.beanstalk.interface.encodeFunctionData('removeLiquidityOneToken', [
          this._pool.address,
          this._registry.address,
          this._tokenOut,
          _amountInStep,
          minAmountOut,
          this._fromMode,
          this._toMode,
        ]),
      decode: (data: string) =>
        RemoveLiquidityOneToken.sdk.contracts.beanstalk.interface.decodeFunctionData('removeLiquidityOneToken', data),
      data: {},
    };
  }
}
