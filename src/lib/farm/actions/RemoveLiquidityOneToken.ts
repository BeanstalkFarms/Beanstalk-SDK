import { ethers } from 'ethers';
import { CurveMetaPool__factory, CurvePlainPool__factory } from '../../../constants/generated';
import { FarmFromMode, FarmToMode } from '../types';
import { Action, ActionResult, BaseAction } from '../types';

export class RemoveLiquidityOneToken extends BaseAction implements Action {
  public name: string = 'RemoveLiquidityOneToken';

  constructor(
    private _pool: string,
    private _registry: string,
    private _tokenOut: string,
    private _fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    const registry = RemoveLiquidityOneToken.sdk.contracts.curve.registries.metaFactory;
    const coins = await registry.callStatic.get_coins(this._pool, { gasLimit: 10000000 });
    const i = coins.findIndex(addr => addr.toLowerCase() === this._tokenOut.toLowerCase());

    /// FIXME: only difference between this and addLiquidity is the boolean
    /// Get amount out based on the selected pool
    const poolAddr = this._pool.toLowerCase();
    const pools = RemoveLiquidityOneToken.sdk.contracts.curve.pools;

    let amountOut;
    if (poolAddr === pools.tricrypto2.address.toLowerCase()) {
      amountOut = await pools.tricrypto2.callStatic.calc_withdraw_one_coin(_amountInStep, i, { gasLimit: 10000000 });
    } else if (poolAddr === pools.pool3.address.toLowerCase()) {
      amountOut = await pools.pool3.callStatic.calc_withdraw_one_coin(_amountInStep, i, { gasLimit: 10000000 });
    } else if (this._registry === RemoveLiquidityOneToken.sdk.contracts.curve.registries.metaFactory.address) {
      amountOut = await CurveMetaPool__factory.connect(this._pool, RemoveLiquidityOneToken.sdk.provider).callStatic[
        'calc_withdraw_one_coin(uint256,int128)'
      ](_amountInStep, i, { gasLimit: 10000000 });
    } else if (this._registry === RemoveLiquidityOneToken.sdk.contracts.curve.registries.cryptoFactory.address) {
      amountOut = await CurvePlainPool__factory.connect(this._pool, RemoveLiquidityOneToken.sdk.provider).callStatic.calc_withdraw_one_coin(_amountInStep, i, {
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
          this._pool,
          this._registry,
          this._tokenOut,
          _amountInStep,
          minAmountOut,
          this._fromMode,
          this._toMode,
        ]),
      decode: (data: string) => RemoveLiquidityOneToken.sdk.contracts.beanstalk.interface.decodeFunctionData('removeLiquidityOneToken', data),
      data: {},
    };
  }
}
