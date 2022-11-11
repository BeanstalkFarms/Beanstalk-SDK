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

  public buildSwap(tokenIn: Token, tokenOut: Token, account: string, _from?: FarmFromMode, _to?: FarmToMode) {
    const route = this.router.findPath(tokenIn, tokenOut);

    const workflow = Swap.sdk.farm.create();

    // Handle Farm Modes
    // For a single step swap (ex, ETH > WETH, or BEAN > BEAN), use the passed modes, if available
    if (route.length === 1) {
      workflow.add(route[0].step(account, _from || FarmFromMode.EXTERNAL, _to || FarmToMode.EXTERNAL));
    }
    // for a multi step swap (ex, ETH -> WETH -> USDT -> BEAN), we want the user's choices for
    // FarmFromMode and FarmToMode, if supplied, to only apply to the first and last legs
    // of the swap, keeping the intermediate trades as INTERNAL.
    else {
      for (let i = 0; i < route.length; i++) {
        let from, to;
        // First leg, use (USER-DEFINED, INTERNAL)
        if (i == 0) {
          from = _from || FarmFromMode.EXTERNAL;
          to = FarmToMode.INTERNAL;
        }
        // Last leg, use (INTERNAL_TOLERANT, USER-DEFINED)
        else if (i == route.length - 1) {
          // Maybe?
          // from = tokenOut.symbol == "ETH" ? FarmFromMode.INTERNAL : FarmFromMode.INTERNAL_TOLERANT;
          from = FarmFromMode.INTERNAL_TOLERANT;
          to = _to || FarmToMode.EXTERNAL;
        }
        // In-between legs, use (INTERNAL_TOLERANT, INTERNAL)
        else {
          from = FarmFromMode.INTERNAL_TOLERANT;
          to = FarmToMode.INTERNAL;
        }
        workflow.add(route[i].step(account, from, to));
      }
    }

    const metadata = route.map((s) => ({ from: s.from, to: s.to }));
    const op = new SwapOperation(Swap.sdk, tokenIn, tokenOut, workflow, metadata);

    return op;
  }

  /**
   * Generate text to paste into http://www.webgraphviz.com/
   * which will show an image based visualization of the current
   * graph
   */
  public getGraph() {
    console.log(this.router.getGraphCode());
  }
}
