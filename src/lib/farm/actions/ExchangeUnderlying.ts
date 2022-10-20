import { ethers } from 'ethers';
import { Token } from '../../../classes/Token';
import { CurveMetaPool,  } from '../../../constants/generated';
import { FarmFromMode, FarmToMode } from '../../farm';
import { Action, ActionResult, BaseAction } from '../types';

export class ExchangeUnderlying extends BaseAction implements Action {
  public name: string = 'exchangeUnderlying';

  constructor(
    private pool: CurveMetaPool,
    private tokenIn: Token,
    private tokenOut: Token,
    private fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    const [tokenIn, tokenOut] = this.direction(this.tokenIn, this.tokenOut, _forward);

    const registry = this.sdk.contracts.curve.registries.metaFactory;
    const [i, j] = await registry.get_coin_indices(this.pool.address, tokenIn.address, tokenOut.address, { gasLimit: 1000000 });

    /// Only MetaPools have the ability to exchange_underlying
    /// FIXME: 3pool also has a single get_dy_underlying method, will we ever use this?
    const amountOut = await this.pool.callStatic['get_dy_underlying(int128,int128,uint256)'](
      i, // i = USDT = coins[3] ([0=BEAN, 1=CRV3] => [0=BEAN, 1=DAI, 2=USDC, 3=USDT])
      j, // j = BEAN = coins[0]
      _amountInStep,
      { gasLimit: 10000000 }
    );

    if (!amountOut) throw new Error('Unexpected missing amountOut');

    return {
      name: this.name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) =>
        this.sdk.contracts.beanstalk.interface.encodeFunctionData('exchangeUnderlying', [
          this.pool.address,
          tokenIn.address,
          tokenOut.address,
          _amountInStep,
          minAmountOut,
          this.fromMode,
          this.toMode,
        ]),
      decode: (data: string) => this.sdk.contracts.beanstalk.interface.decodeFunctionData('exchangeUnderlying', data),
      data: {
        pool: this.pool.address,
        tokenIn: this.tokenIn.address,
        tokenOut: this.tokenOut.address,
        fromMode: this.fromMode,
        toMode: this.toMode,
      },
    };
  }
}
