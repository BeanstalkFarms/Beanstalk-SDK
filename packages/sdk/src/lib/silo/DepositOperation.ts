import Pool from "src/classes/Pool/Pool";
import { Router } from "src/classes/Router";
import { Token } from "src/classes/Token";
import { TokenValue } from "src/TokenValue";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { TokenSiloBalance } from "../silo";

export class DepositOperation {
  static sdk: BeanstalkSDK;
  private readonly targetToken: Token;
  balance: TokenSiloBalance;
  isLP: boolean;
  isUnripe: boolean;
  pool: Pool | undefined;
  thing: string;
  inputTokens: Map<Token, TokenValue>;
  router: Router;

  constructor(sdk: BeanstalkSDK, router: Router, targetToken: Token) {
    if (!sdk.tokens.siloWhitelist.has(targetToken)) throw new Error(`Cannot deposit ${targetToken.symbol}, not on whitelist.`);

    DepositOperation.sdk = sdk;
    this.router = router;
    this.targetToken = targetToken;
    this.isLP = targetToken.isLP;
    this.isUnripe = targetToken.isUnripe;
    this.pool = sdk.pools.getPoolByLPToken(targetToken);
    this.inputTokens = new Map();
  }

  async init() {
    this.balance = await DepositOperation.sdk.silo.getBalance(this.targetToken);
  }

  addToken(token: Token, amount?: TokenValue) {
    this.inputTokens.set(token, amount || token.amount(0));
  }

  updateTokenAmount(token: Token, amount: TokenValue) {
    this.addToken(token, amount);
  }

  removeToken(token: Token) {
    this.inputTokens.delete(token);
  }

  // // TODO: add more validations as needed
  // private isValidInputToken(fromToken: Token) {
  //   // We already know targetToken is whitelisted from constructor, so..

  //   // if deposit is the same as target, we're good
  //   if (fromToken.equals(this.targetToken)) return;

  //   return;
  // }

  buildWorkflow() {
    let paths;
    for (const [inputToken] of this.inputTokens) {
      const route = this.router.findPath(inputToken, this.targetToken);
      console.log(inputToken.symbol);
      console.log(route);
      console.log("--------");
    }
  }

  async estimate() {
    this.buildWorkflow();
  }
}
