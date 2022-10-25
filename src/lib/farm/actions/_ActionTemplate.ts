//@ts-nocheck

// Workflow Action template
import { ethers } from 'ethers';
import { BeanstalkSDK } from '../../BeanstalkSDK';
import { Action, ActionResult, BaseAction, StringAddress } from '../types';

export class ActionTemplate extends BaseAction implements Action {
  public name: string = 'exchange';

  constructor() {}

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true): Promise<ActionResult> {
    // sdk is accessible as a static property on this class, for ex, ActionTemplate.sdk
    return {
      name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) => {},
      decode: (data: string) => {},
      data,
    };
  }
}
