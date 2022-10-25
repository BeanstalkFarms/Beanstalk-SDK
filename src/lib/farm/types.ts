import { BigNumber, ethers } from 'ethers';
import { Token } from '../../classes/Token';
import { BeanstalkSDK } from '../BeanstalkSDK';

export enum FarmFromMode {
  EXTERNAL = '0',
  INTERNAL = '1',
  INTERNAL_EXTERNAL = '2',
  INTERNAL_TOLERANT = '3',
}
export enum FarmToMode {
  EXTERNAL = '0',
  INTERNAL = '1',
}

export class BaseAction {
  static sdk: BeanstalkSDK;

  public setSDK(sdk: BeanstalkSDK) {
    BaseAction.sdk = sdk;
  }

  protected direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }
}

export type ActionFunction = (amountIn: BigNumber, forward?: boolean) => Promise<string | ActionResult>;

export interface Action extends BaseAction {
  name: string;
  run(amountInStep: ethers.BigNumber, forward: boolean): Promise<ActionResult>;
}

export type ActionResult = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut: ethers.BigNumber) => string;
  decode: (data: string) => Record<string, any>;
};
