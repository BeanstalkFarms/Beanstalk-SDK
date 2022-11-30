import { ContractTransaction } from "ethers";
import Pool from "src/classes/Pool/Pool";
import { Router } from "src/classes/Router";
import { Token } from "src/classes/Token";
import { Workflow } from "src/classes/Workflow";
import { TokenValue } from "src/TokenValue";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { FarmFromMode } from "../farm";
import { TokenSiloBalance } from "../silo";

export class DepositOperation {
  static sdk: BeanstalkSDK;
  private readonly targetToken: Token;
  private readonly account: string;
  balance: TokenSiloBalance;
  isLP: boolean;
  isUnripe: boolean;
  pool: Pool | undefined;
  inputToken: Token;
  inputAmount: TokenValue;
  readonly router: Router;
  workflow: Workflow;

  constructor(sdk: BeanstalkSDK, router: Router, targetToken: Token, account: string) {
    if (!sdk.tokens.siloWhitelist.has(targetToken)) throw new Error(`Cannot deposit ${targetToken.symbol}, not on whitelist.`);

    DepositOperation.sdk = sdk;
    this.router = router;
    this.targetToken = targetToken;
    this.account = account;
    this.isLP = targetToken.isLP;
    this.isUnripe = targetToken.isUnripe;
    this.pool = sdk.pools.getPoolByLPToken(targetToken);
  }

  async init() {
    this.balance = await DepositOperation.sdk.silo.getBalance(this.targetToken);
  }

  setInputToken(token: Token) {
    if (!this.inputToken || !this.inputToken.equals(token)) {
      this.inputToken = token;
      this.buildWorkflow();
    }
  }

  buildWorkflow() {
    const route = this.router.getRoute(this.inputToken.symbol, `${this.targetToken.symbol}:SILO`);
    this.workflow = DepositOperation.sdk.farm.create(`Deposit ${this.inputToken.symbol}->${this.targetToken.symbol}`);

    for (const step of route) {
      this.workflow.add(step.build(this.account, FarmFromMode.INTERNAL_EXTERNAL));
    }
  }

  async estimate(amount: TokenValue) {}

  async execute(amountIn: TokenValue, slippage: number): Promise<ContractTransaction> {
    return this.workflow.execute(amountIn, { slippage });
  }
}
