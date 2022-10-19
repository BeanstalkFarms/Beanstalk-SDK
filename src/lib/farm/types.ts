import { ethers } from 'ethers';
import { Token } from '../../classes/Token';
import { BeanstalkSDK } from '../BeanstalkSDK';

export class BaseAction {
  protected sdk: BeanstalkSDK;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
  }

  // direction<X1 extends any, X2 extends any>(_x1: X1, _x2: X2, _forward: boolean) {
  direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }
}

export type StringAddress = string;

export interface Action {
  name: string;
  run(amountInStep: ethers.BigNumber, forward: boolean): Promise<ActionResult>;
}

export interface Result extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export type ActionResult = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut: ethers.BigNumber) => string;
  decode: (data: string) => Result;
};
