import { ContractTransaction } from "ethers";
import { Router } from "src/classes/Router";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/TokenValue";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { FarmFromMode, FarmToMode, FarmWorkflow } from "../farm";

export class DepositOperation {
  static sdk: BeanstalkSDK;
  readonly targetToken: Token;
  readonly account: string;
  fromMode: FarmFromMode = FarmFromMode.INTERNAL_EXTERNAL;
  inputToken: Token;
  inputAmount: TokenValue;
  readonly router: Router;
  workflow: FarmWorkflow<{ slippage: number } & Record<string, any>>;

  constructor(sdk: BeanstalkSDK, router: Router, targetToken: Token, account: string) {
    if (!sdk.tokens.siloWhitelist.has(targetToken)) throw new Error(`Cannot deposit ${targetToken.symbol}, not on whitelist.`);

    DepositOperation.sdk = sdk;
    this.router = router;
    this.targetToken = targetToken;
    this.account = account;
  }

  setInputToken(token: Token, fromMode: FarmFromMode = FarmFromMode.INTERNAL_EXTERNAL) {
    this.fromMode = fromMode;
    if (!this.inputToken || !this.inputToken.equals(token)) {
      this.inputToken = token;
      this.buildWorkflow();
    }
  }

  buildWorkflow() {
    const route = this.router.getRoute(this.inputToken.symbol, `${this.targetToken.symbol}:SILO`);

    this.workflow = DepositOperation.sdk.farm.create(`Deposit`);

    for (let i = 0; i < route.length; i++) {
      let from, to;
      // First leg, use (USER-DEFINED, INTERNAL)
      if (i == 0) {
        from = this.fromMode;
        to = FarmToMode.INTERNAL;
      }
      // Last leg, ie Deposit() step, use (INTERNAL_TOLERANT, not-used)
      else if (i == route.length - 1) {
        from = FarmFromMode.INTERNAL_TOLERANT;
        to = FarmToMode.EXTERNAL; // Dummy value, not used in the Deposit() step
      }
      // In-between legs, use (INTERNAL_TOLERANT, INTERNAL)
      else {
        from = FarmFromMode.INTERNAL_TOLERANT;
        to = FarmToMode.INTERNAL;
      }
      this.workflow.add(route.getStep(i).build(this.account, from, to));
    }
  }

  getGraph() {
    console.log(this.router.getGraphCode());
  }

  async estimate(amount: TokenValue) {}

  async execute(amountIn: TokenValue, slippage: number): Promise<ContractTransaction> {
    if (this.workflow.length === 0) throw new Error("No available route in workflow");

    return this.workflow.execute(amountIn, { slippage });
  }
}
