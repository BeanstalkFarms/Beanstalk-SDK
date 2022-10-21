import { ethers } from 'ethers';
import {
  Curve3Pool,
  CurveCryptoFactory,
  CurveMetaFactory,
  CurveMetaPool,
  CurvePlainPool,
  CurveTriCrypto2Pool,
} from '../../../constants/generated';
import { assert } from '../../../utils';
import { FarmFromMode, FarmToMode } from '../../farm';
import { Action, ActionResult, BaseAction } from '../types';

export class AddLiquidity extends BaseAction implements Action {
  public name: string = 'addLiquidity';

  constructor(
    private _pool: CurveTriCrypto2Pool | Curve3Pool | CurveMetaPool | CurvePlainPool,
    private _registry: CurveMetaFactory | CurveCryptoFactory,
    private _amounts: readonly [number, number] | readonly [number, number, number],
    private _fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private _toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    AddLiquidity.sdk.debug('[step@addLiquidity] run: ', {
      _pool: this._pool,
      _registry: this._registry,
      _amounts: this._amounts,
      _fromMode: this._fromMode,
      _toMode: this._toMode,
      _amountInStep,
    });

    /// [0, 0, 1] => [0, 0, amountIn]
    const amountInStep = this._amounts.map(k => (k === 1 ? _amountInStep : ethers.BigNumber.from(0)));

    /// Get amount out based on the selected pool
    const pools = AddLiquidity.sdk.contracts.curve.pools;
    let amountOut;

    /// Case: tricrypto2 or pool3
    if (this._pool === pools.tricrypto2 || this._pool === pools.pool3) {
      assert(amountInStep.length === 3);
      amountOut = await this._pool.callStatic.calc_token_amount(
        amountInStep as [any, any, any], // [DAI, USDC, USDT]; assumes that amountInStep is USDT
        true, // _is_deposit
        { gasLimit: 10000000 }
      );
    }

    /// Case: Metapools
    else if (this._registry === AddLiquidity.sdk.contracts.curve.registries.metaFactory) {
      assert(amountInStep.length === 2);
      amountOut = await (this._pool as CurveMetaPool).callStatic['calc_token_amount(uint256[2],bool)'](
        amountInStep as [any, any],
        true, // _is_deposit
        { gasLimit: 10000000 }
      );
    } else if (this._registry === AddLiquidity.sdk.contracts.curve.registries.cryptoFactory) {
      assert(amountInStep.length === 2);
      amountOut = await (this._pool as CurvePlainPool).callStatic.calc_token_amount(
        amountInStep as [any, any],
        true, // _is_deposit
        { gasLimit: 10000000 }
      );
    }

    if (!amountOut) throw new Error('No supported pool found');
    AddLiquidity.sdk.debug('[step@addLiquidity] finish: ', {
      amountInStep: amountInStep.toString(),
      amountOut: amountOut.toString(),
    });

    return {
      name: this.name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) =>
        AddLiquidity.sdk.contracts.beanstalk.interface.encodeFunctionData('addLiquidity', [
          this._pool.address,
          this._registry.address,
          amountInStep as any[], // could be 2 or 3 elems
          minAmountOut,
          this._fromMode,
          this._toMode,
        ]),
      decode: (data: string) => AddLiquidity.sdk.contracts.beanstalk.interface.decodeFunctionData('addLiquidity', data),
      data: {
        pool: this._pool,
        registry: this._registry,
        fromMode: this._fromMode,
        toMode: this._toMode,
      },
    };
  }
}
