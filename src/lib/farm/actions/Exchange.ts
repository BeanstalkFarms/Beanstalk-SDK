import { ethers } from 'ethers';
import { Token } from '../../../classes/Token';
import {
  Curve3Pool,
  CurveCryptoFactory,
  CurveMetaFactory,
  CurveMetaPool,
  CurvePlainPool,
  CurveRegistry,
  CurveTriCrypto2Pool,
} from '../../../constants/generated';
import { FarmFromMode, FarmToMode } from '../../farm';
import { Action, ActionResult, BaseAction } from '../types';

export class Exchange extends BaseAction implements Action {
  public name: string = 'exchange';

  constructor(
    private pool: Curve3Pool | CurveTriCrypto2Pool | CurveMetaPool | CurvePlainPool,
    private registry: CurveMetaFactory | CurveCryptoFactory,
    private tokenIn: Token,
    private tokenOut: Token,
    private fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    Exchange.sdk.debug(`[workflow:exchange] ${_amountInStep.toString()} ${this.tokenIn.symbol} -> ${this.tokenOut.symbol} ${_forward}`)
    const [tokenIn, tokenOut] = this.direction(this.tokenIn, this.tokenOut, _forward);
    const [i, j] = await this.registry.callStatic.get_coin_indices(this.pool.address, tokenIn.address, tokenOut.address, {
      gasLimit: 10000000,
    });

    let amountOut: ethers.BigNumber;
    // if (pool === pools.tricrypto2.address.toLowerCase()) {
    if (this.pool === Exchange.sdk.contracts.curve.pools.tricrypto2) {
      amountOut = await this.pool.callStatic.get_dy(i, j, _amountInStep, { gasLimit: 10000000 });
    } else if (this.pool === Exchange.sdk.contracts.curve.pools.pool3) {
      amountOut = await this.pool.callStatic.get_dy(i, j, _amountInStep, { gasLimit: 10000000 });
    } else if (this.registry === Exchange.sdk.contracts.curve.registries.metaFactory) {
      amountOut = await (this.pool as CurveMetaPool).callStatic['get_dy(int128,int128,uint256)'](i, j, _amountInStep, {
        gasLimit: 10000000,
      });
    } else if (this.registry === Exchange.sdk.contracts.curve.registries.cryptoFactory) {
      amountOut = await (this.pool as CurvePlainPool).callStatic.get_dy(i, j, _amountInStep, {
        gasLimit: 10000000,
      });
    } else {
      throw new Error('No supported pool found');
    }

    return {
      name: this.name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) =>
        Exchange.sdk.contracts.beanstalk.interface.encodeFunctionData('exchange', [
          this.pool.address,
          this.registry.address,
          tokenIn.address,
          tokenOut.address,
          _amountInStep,
          minAmountOut,
          this.fromMode,
          this.toMode,
        ]),
      decode: (data: string) => Exchange.sdk.contracts.beanstalk.interface.decodeFunctionData('exchange', data),
      data: {
        pool: this.pool.address,
        registry: this.registry.address,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fromMode: this.fromMode,
        toMode: this.toMode,
      },
    };
  }
}
