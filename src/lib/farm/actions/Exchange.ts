import { ethers } from 'ethers';
import { Token } from '../../../classes/Token';
import { CurveMetaPool__factory, CurvePlainPool__factory } from '../../../constants/generated';
import { FarmFromMode, FarmToMode } from '../types';
import { Action, ActionResult, BaseAction } from '../types';

export class Exchange extends BaseAction implements Action {
  public name: string = 'exchange';

  constructor(
    private pool: string,
    private registry: string,
    private tokenIn: Token,
    private tokenOut: Token,
    private fromMode: FarmFromMode = FarmFromMode.INTERNAL_TOLERANT,
    private toMode: FarmToMode = FarmToMode.INTERNAL
  ) {
    super();
  }

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    Exchange.sdk.debug(`[workflow:exchange] ${_amountInStep.toString()} ${this.tokenIn.symbol} -> ${this.tokenOut.symbol} ${_forward}`);
    const [tokenIn, tokenOut] = this.direction(this.tokenIn, this.tokenOut, _forward);

    const registry = Exchange.sdk.contracts.curve.registries[this.registry];
    if (!registry) throw new Error(`Unknown registry: ${this.registry}`);

    const [i, j] = await registry.callStatic.get_coin_indices(this.pool, tokenIn.address, tokenOut.address, {
      gasLimit: 10000000,
    });

    /// Get amount out based on the selected pool
    const poolAddr = this.pool.toLowerCase();
    const pools = Exchange.sdk.contracts.curve.pools;
    let amountOut: ethers.BigNumber | undefined;

    if (poolAddr === pools.tricrypto2.address.toLowerCase()) {
      amountOut = await pools.tricrypto2.callStatic.get_dy(i, j, _amountInStep, { gasLimit: 10000000 });
    } else if (poolAddr === pools.pool3.address.toLowerCase()) {
      amountOut = await pools.pool3.callStatic.get_dy(i, j, _amountInStep, { gasLimit: 10000000 });
    } else if (this.registry === Exchange.sdk.contracts.curve.registries.metaFactory.address) {
      amountOut = await CurveMetaPool__factory.connect(this.pool, Exchange.sdk.provider).callStatic['get_dy(int128,int128,uint256)'](
        i,
        j,
        _amountInStep,
        { gasLimit: 10000000 }
      );
    } else if (this.registry === Exchange.sdk.contracts.curve.registries.cryptoFactory.address) {
      amountOut = await CurvePlainPool__factory.connect(this.pool, Exchange.sdk.provider).callStatic.get_dy(i, j, _amountInStep, {
        gasLimit: 10000000,
      });
    }

    if (!amountOut) throw new Error('No supported pool found');

    return {
      name: this.name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) =>
        Exchange.sdk.contracts.beanstalk.interface.encodeFunctionData('exchange', [
          this.pool,
          this.registry,
          tokenIn.address,
          tokenOut.address,
          _amountInStep,
          minAmountOut,
          this.fromMode,
          this.toMode,
        ]),
      decode: (data: string) => Exchange.sdk.contracts.beanstalk.interface.decodeFunctionData('exchange', data),
      data: {
        pool: this.pool,
        registry: this.registry,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fromMode: this.fromMode,
        toMode: this.toMode,
      },
    };
  }
}
