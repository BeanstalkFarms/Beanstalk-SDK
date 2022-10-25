import { Work } from './farm/Work';

import { BeanstalkSDK } from './BeanstalkSDK';
import * as ActionLibrary from './farm/actions';
import { LibraryPresets } from './farm/LibraryPresets';

// This is the namespace holder for sdk.Works.whatever
export class Farm {
  static sdk: BeanstalkSDK;
  public readonly actions: typeof ActionLibrary;
  public presets: LibraryPresets;

  constructor(sdk: BeanstalkSDK) {
    Farm.sdk = sdk;
    this.actions = ActionLibrary;
    this.presets = new LibraryPresets(Farm.sdk);
  }

  create() {
    return new Work(Farm.sdk);
  }
}
