import { BigNumber } from 'bignumber.js';
import { Token } from '../classes/Token';

import { BeanstalkSDK } from './BeanstalkSDK';

export class Sun {
  private readonly sdk: BeanstalkSDK;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
  }

  async getSeason(): Promise<number> {
    return this.sdk.contracts.beanstalk.season();
  }

  // ... other sun related things
}
