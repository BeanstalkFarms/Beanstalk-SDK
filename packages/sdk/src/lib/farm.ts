import { Work } from "./farm/Work";

import { BeanstalkSDK } from "./BeanstalkSDK";
import * as ActionLibrary from "./farm/actions";
import { LibraryPresets } from "./farm/LibraryPresets";
import { ethers } from "ethers";

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

  // wrapAction<
  //   C extends ethers.Contract,
  //   M extends keyof C["functions"],
  //   A extends Parameters<C["functions"][M]>
  // >(
  //   contract: C,
  //   method: M,
  //   args: A,
  // ) {
  //   return {
  //     name: method,
  //     amountOut: ethers.BigNumber.from(0),
  //     encode: () => contract.interface.encodeFunctionData(method as string, args),
  //     decode: (data: string) => contract.interface.decodeFunctionData(method as string, data), // this is function data
  //   }
  // }
}
