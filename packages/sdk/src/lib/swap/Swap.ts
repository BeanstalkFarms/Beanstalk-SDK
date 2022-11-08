import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Token } from "src/classes/Token";
import { FarmFromMode, FarmToMode } from "src/lib/farm/types";
import { Router } from "./Router";
import { SwapOperation } from "./SwapOperation";

export class Swap {
  private static sdk: BeanstalkSDK;
  router: Router;

  constructor(sdk: BeanstalkSDK) {
    Swap.sdk = sdk;
    this.router = new Router(sdk);
  }

  public buildSwap(tokenIn: Token, tokenOut: Token, from?: FarmFromMode, to?: FarmToMode) {
    const route = this.router.findPath(tokenIn, tokenOut);

    const workflow = Swap.sdk.farm.create();

    for (let i = 0; i < route.length; i++) {
      // We want the user's choices for FarmFromMode and FarmToMode, if supplied, to
      // only apply to the first and last legs of the swap, keeping the intermediate
      // trades as internal.

      // First leg, default from external to internal
      if (i == 0) {
        workflow.addStep(route[i].step(from || FarmFromMode.EXTERNAL, FarmToMode.INTERNAL));
      }
      // Last leg, default from internal_tolerant to external
      else if (i == route.length - 1) {
        workflow.addStep(route[i].step(FarmFromMode.INTERNAL_TOLERANT, to || FarmToMode.EXTERNAL));
      }
      // check for a one-step flow
      else if (route.length === 1) {
        workflow.addStep(route[i].step(from || FarmFromMode.EXTERNAL, to || FarmToMode.EXTERNAL));
      }
      // In-between legs, default to keeping them all internal
      else {
        workflow.addStep(route[i].step(FarmFromMode.INTERNAL_TOLERANT, FarmToMode.INTERNAL));
      }
    }

    const metadata = route.map((s) => ({ from: s.from, to: s.to }));
    const op = new SwapOperation(Swap.sdk, tokenIn, tokenOut, workflow, metadata);

    return op;
  }
}
