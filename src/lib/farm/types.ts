import { ethers } from 'ethers';
import { Token } from '../../classes/Token';
import { BeanstalkSDK } from '../BeanstalkSDK';

export interface Action extends BaseAction{
  name: string;
  run(amountInStep: ethers.BigNumber, forward: boolean): Promise<ActionResult>;
}

export class BaseAction {
  protected sdk: BeanstalkSDK;

  public setSDK(sdk: BeanstalkSDK) {
    this.sdk = sdk;
  }

  protected direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }
}

export type ActionResult = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut: ethers.BigNumber) => string;
  decode: (data: string) => Record<string, any>;
};
