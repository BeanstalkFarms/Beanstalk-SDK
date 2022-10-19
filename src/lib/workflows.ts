import { Workflow } from '../classes/Workflow';

import { BeanstalkSDK } from './BeanstalkSDK';
import { ActionLibrary } from './farm/actions/Library';

export class Workflows {
  private readonly sdk: BeanstalkSDK;
  public readonly library: typeof ActionLibrary;
  public readonly foo: string = 'fuck';

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
    this.library = ActionLibrary;
  }

  create() {
    return new Workflow(this.sdk);
  }
}
