import { BigNumber, utils } from "ethers";
import { Token } from "graphql";
import { DecimalBigNumber } from "../DecimalBigNumber";
import { constants } from "ethers";

export class TokenValue {
  static ZERO = TokenValue.from(0, 0);
  static NEGATIVE_ONE = TokenValue.from(-1, 0);
  static ONE = TokenValue.from(1, 0);
  static MAX_UINT32 = TokenValue.from(4294967295, 0);
  static MAX_UINT256 = TokenValue.from(constants.MaxUint256, 0);

  public decimals: number;
  public value: DecimalBigNumber;

  static from(value: DecimalBigNumber | TokenValue | BigNumber | number | string, decimals?: number): TokenValue {
    if (value instanceof DecimalBigNumber && !decimals) {
      return new TokenValue(value.toBigNumber(), value.getDecimals());
    } else if (decimals == undefined || decimals == null) {
      throw new Error("Decimals required");
    }

    if (typeof value === "string") return TokenValue.fromString(value, decimals);
    if (typeof value === "number") return TokenValue.fromString(value.toString(), decimals);
    if (value instanceof BigNumber) return TokenValue.fromBigNumber(value, decimals);
    if (value instanceof TokenValue) return value;

    throw new Error('Invalid "value" parameter');
  }

  private static fromBigNumber(value: BigNumber, decimals: number): TokenValue {
    return new TokenValue(value, decimals);
  }

  private static fromString(value: string, decimals: number): TokenValue {
    if (!value) {
      throw new Error("Must provide value to BigNumber.fromHuman(value,decimals)");
    }
    if (decimals == undefined || decimals == null) {
      throw new Error("Must provide decimals to BigNumber.fromHuman(value,decimals)");
    }
    let [int, safeDecimals] = value.split(".");

    if (safeDecimals && safeDecimals.length > decimals) {
      safeDecimals = safeDecimals.substring(0, decimals);
    }

    const safeValue = safeDecimals ? `${int}.${safeDecimals}` : int;
    const result = utils.parseUnits(safeValue, decimals);

    return TokenValue.fromBigNumber(result, decimals);
  }

  constructor(_bigNumber: BigNumber, decimals: number) {
    this.decimals = decimals;
    this.value = new DecimalBigNumber(_bigNumber, decimals);

    // make values immutable
    Object.defineProperty(this, "decimals", { configurable: false, writable: false });
    Object.defineProperty(this, "value", { configurable: false, writable: false });
  }

  ////// Utility Functions //////
  toBigNumber() {
    return this.value.toBigNumber();
  }

  toBlockchain() {
    return this.value.toNumber();
  }

  public toHuman(): string {
    return this.value.toString();
  }

  // Used mostly by the math functions to normalize the input
  private toDBN(num: TokenValue | BigNumber | number): DecimalBigNumber {
    // TODO: confirm it's safe to default to this.decimals
    return TokenValue.from(num, this.decimals).value;
  }

  ////// Math Functions //////
  add(num: TokenValue | BigNumber | number): TokenValue {
    return TokenValue.from(this.value.add(this.toDBN(num)));
  }
  sub(num: TokenValue | BigNumber | number): TokenValue {
    return TokenValue.from(this.value.sub(this.toDBN(num)));
  }
  mul(num: TokenValue | BigNumber | number) {
    return TokenValue.from(this.value.mul(this.toDBN(num)));
  }
  div(num: TokenValue | BigNumber | number) {
    return TokenValue.from(this.value.div(this.toDBN(num)));
  }
  eq(num: TokenValue | BigNumber | number): boolean {
    const d = this.toDBN(num);
    return this.value.eq(d);
  }
  gt(num: TokenValue | BigNumber | number): boolean {
    return this.value.gt(this.toDBN(num));
  }
  gte(num: TokenValue | BigNumber | number): boolean {
    return this.value.gte(this.toDBN(num));
  }
  lt(num: TokenValue | BigNumber | number): boolean {
    return this.value.lt(this.toDBN(num));
  }
  lte(num: TokenValue | BigNumber | number): boolean {
    return this.value.lte(this.toDBN(num));
  }
  abs(): TokenValue {
    return TokenValue.from(this.value.abs());
  }
  pow(num: number): TokenValue {
    return TokenValue.from(this.value.pow(num));
  }
}
