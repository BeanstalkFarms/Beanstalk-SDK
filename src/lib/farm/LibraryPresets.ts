import { BeanstalkSDK } from '../BeanstalkSDK';
import { FarmToMode } from '../farm';
import { Exchange, ExchangeUnderlying } from './actions/index';

import { Action } from './types';

export class LibraryPresets {
  static sdk: BeanstalkSDK;
  public readonly weth2usdt: Action;
  public readonly usdt2bean: Action;
  public readonly usdt2weth: Action;
  public readonly bean2usdt: Action;

  constructor(sdk: BeanstalkSDK) {
    ///////// WETH <> USDT ///////////
    this.weth2usdt = new Exchange(
      sdk.contracts.curve.pools.tricrypto2.address,
      sdk.contracts.curve.registries.cryptoFactory.address,
      sdk.tokens.WETH,
      sdk.tokens.USDT
    );

    this.usdt2weth = new Exchange(
      sdk.contracts.curve.pools.tricrypto2.address,
      sdk.contracts.curve.registries.cryptoFactory.address,
      sdk.tokens.USDT,
      sdk.tokens.WETH
    );


    ///////// BEAN <> USDT ///////////
    this.usdt2bean = new ExchangeUnderlying(
      sdk.contracts.curve.pools.beanCrv3.address,
      sdk.tokens.USDT,
      sdk.tokens.BEAN,
      undefined,
      FarmToMode.EXTERNAL
    );

    this.bean2usdt = new ExchangeUnderlying(
      sdk.contracts.curve.pools.beanCrv3.address,
      sdk.tokens.BEAN,
      sdk.tokens.USDT,
      undefined,
      FarmToMode.EXTERNAL
    );

    
  }
}
