import { Router, RouterResult } from "src/classes/Router";
import { Token } from "src/classes/Token/Token";
import { StepClass } from "src/classes/Workflow";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { FarmFromMode, FarmToMode } from "src/lib/farm";
import { getDepositGraph } from "./depositGraph";
import { DepositOperation } from "./DepositOperation";

export class DepositBuilder {
  static sdk: BeanstalkSDK;
  private router: Router;

  constructor(sdk: BeanstalkSDK) {
    DepositBuilder.sdk = sdk;
    const graph = getDepositGraph(sdk);
    const selfEdgeBuilder = (token: Token): RouterResult => {
      return {
        step: (account: string, from?: FarmFromMode, to?: FarmToMode): StepClass => {
          return new sdk.farm.actions.DevDebug(`${token.symbol} -> ${token.symbol}`);
        },
        from: token.symbol,
        to: token.symbol
      };
    };

    this.router = new Router(sdk, graph, selfEdgeBuilder);
  }

  create(targetToken: Token): DepositOperation {
    let op = new DepositOperation(DepositBuilder.sdk, this.router, targetToken);

    return op;
  }
}
