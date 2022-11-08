import { ContractTransaction, ethers, BigNumber } from "ethers";
import { TokenValue } from "src/TokenValue";
import { Token } from "../../classes/Token";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { FarmFromMode, FarmToMode } from "../farm/types";
import { Work } from "../farm/Work";

type PathSegment = {
  from: string;
  to: string;
};

export class SwapOperation {
  private static sdk: BeanstalkSDK;

  constructor(
    sdk: BeanstalkSDK,
    private readonly tokenIn: Token,
    private readonly tokenOut: Token,
    private readonly workflow: Work,
    private readonly metadata: PathSegment[]
  ) {
    SwapOperation.sdk = sdk;
  }

  public isValid(): boolean {
    return this.workflow.steps.length > 0;
  }

  getPath(): PathSegment[] {
    return this.metadata;
  }

  getSimplePath(): string[] {
    let simplePath = this.metadata.reduce<string[]>((s, curr, i) => {
      if (i == 0) {
        return [curr.from, curr.to];
      } else {
        s.push(curr.to);
        return s;
      }
    }, []);

    return simplePath;
  }

  getDisplay(separator: string = " -> ") {
    let s = this.metadata.reduce((s, curr, i) => {
      if (i == 0) {
        return `${curr.from}${separator}${curr.to}`;
      } else {
        return `${s}${separator}${curr.to}`;
      }
    }, "");

    return s;
  }

  // TODO: Convert to TokenValue
  /**
   * Estimate what the operation would output given this amountIn is the input.
   * For ex, if we are trading ETH -> BEAN, and you want to spend exactly 5 ETH, estimate()
   * would tell how much BEAN you'd receive for 5 ETH
   * @param amountIn Amount to send to workflow as input for estimation
   * @returns Promise of BigNumber
   */
  async estimate(amountIn: BigNumber | TokenValue): Promise<TokenValue> {
    if (!this.isValid()) throw new Error("Invalid swap configuration");

    const est = await this.workflow.estimate(amountIn);
    return this.tokenOut.fromBlockchain(est);
  }

  // TODO: implement
  // async estimateGas(amountIn: BigNumber | TokenValue, slippage: number): Promise<any> {
  //   return this.workflow.estimateGas(amountIn, slippage);
  // }

  /**
   * Estimate the min amount to input to the workflow to receive the desiredAmountOut output
   * For ex, if we are trading ETH -> Bean, and I want exactly 500 BEAN, estimateReversed()
   * tell me how much ETH will result in 500 BEAN
   * @param desiredAmountOut The end amount you want the workflow to output
   * @returns Promise of BigNumber
   */
  async estimateReversed(desiredAmountOut: BigNumber): Promise<TokenValue> {
    if (!this.isValid()) throw new Error("Invalid swap configuration");
    const est = await this.workflow.estimateReversed(desiredAmountOut);
    return this.tokenOut.fromBlockchain(est);
  }

  /**
   *
   * @param amountIn Amount to use as first input to Work
   * @param slippage A human readable percent value. Ex: 0.1 would mean 0.1% slippage
   * @returns Promise of a Transaction
   */
  async execute(amountIn: BigNumber | TokenValue, slippage: number): Promise<ContractTransaction> {
    if (!this.isValid()) throw new Error("Invalid swap configuration");

    return this.workflow.execute(amountIn, slippage);
  }
}
