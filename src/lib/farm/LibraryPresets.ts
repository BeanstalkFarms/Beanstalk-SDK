import { BeanstalkSDK } from '../BeanstalkSDK';
import { FarmFromMode, FarmToMode } from '../farm/types';
import { Exchange, ExchangeUnderlying } from './actions/index';

import { Action } from './types';

type ActionBuilder = (fromMode?: FarmFromMode, toMode?: FarmToMode) => Action | Action[];

export class LibraryPresets {
  static sdk: BeanstalkSDK;
  public readonly weth2usdt: ActionBuilder;
  public readonly usdt2bean: ActionBuilder;
  public readonly usdt2weth: ActionBuilder;
  public readonly bean2usdt: ActionBuilder;
  public readonly weth2bean: ActionBuilder;
  public readonly bean2weth: ActionBuilder;

  constructor(sdk: BeanstalkSDK) {
    ///////// WETH <> USDT ///////////
    this.weth2usdt = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new Exchange(
        sdk.contracts.curve.pools.tricrypto2.address,
        sdk.contracts.curve.registries.cryptoFactory.address,
        sdk.tokens.WETH,
        sdk.tokens.USDT,
        fromMode,
        toMode
      );

    this.usdt2weth = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new Exchange(
        sdk.contracts.curve.pools.tricrypto2.address,
        sdk.contracts.curve.registries.cryptoFactory.address,
        sdk.tokens.USDT,
        sdk.tokens.WETH,
        fromMode,
        toMode
      );

    ///////// BEAN <> USDT ///////////
    this.usdt2bean = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new ExchangeUnderlying(sdk.contracts.curve.pools.beanCrv3.address, sdk.tokens.USDT, sdk.tokens.BEAN, fromMode, toMode);

    this.bean2usdt = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new ExchangeUnderlying(sdk.contracts.curve.pools.beanCrv3.address, sdk.tokens.BEAN, sdk.tokens.USDT, fromMode, toMode);

    //////// WETH <> BEAN
    this.weth2bean = (fromMode?: FarmFromMode, toMode?: FarmToMode) => [
      this.weth2usdt(fromMode, FarmToMode.INTERNAL) as Action,
      this.usdt2bean(FarmFromMode.INTERNAL, toMode) as Action,
    ];
    this.bean2weth = (fromMode?: FarmFromMode, toMode?: FarmToMode) => [
      this.bean2usdt(fromMode, FarmToMode.INTERNAL) as Action,
      this.usdt2weth(FarmFromMode.INTERNAL, toMode) as Action,
    ];
  }
}
