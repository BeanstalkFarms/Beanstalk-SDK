import { Workflow } from './farm/Workflow';

import { BeanstalkSDK } from './BeanstalkSDK';
import * as ActionLibrary from './farm/actions';
import { LibraryPresets } from './farm/LibraryPresets';

// This is the namespace holder for sdk.workflows.whatever
export class Workflows {
  private readonly sdk: BeanstalkSDK;
  public readonly library: typeof ActionLibrary;
  public readonly foo: string = 'fuck';
  public readonly libraryPresets: LibraryPresets;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
    this.library = ActionLibrary;
    this.libraryPresets = new LibraryPresets(sdk)
  }

  create() {
    return new Workflow(this.sdk);
  }
}
