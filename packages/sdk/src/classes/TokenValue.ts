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
  private value: DecimalBigNumber;
  private _bigNumber: BigNumber;

  static from(value: TokenValue | BigNumber | number | string, decimals: number) {
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
    if (!decimals) {
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
    this._bigNumber = _bigNumber;
    this.decimals = decimals;
    this.value = new DecimalBigNumber(_bigNumber.toString(), decimals);

    // make values immutable
    Object.defineProperty(this, "_bigNumber", { configurable: false, writable: false });
    Object.defineProperty(this, "decimals", { configurable: false, writable: false });
    Object.defineProperty(this, "value", { configurable: false, writable: false });
  }

  ////// Utility Functions //////
  toBigNumber() {
    return this._bigNumber;
  }

  toNumber() {
    return this.value.toNumber();
  }

  public toString(): string {
    return this.value.toString();
  }

  ////// Math Functions //////
  add(num: TokenValue | BigNumber | number): TokenValue {
    // TODO: implement
    return TokenValue.ZERO;
  }
  sub(num: TokenValue | BigNumber | number): TokenValue {
    // TODO: implement
    return TokenValue.ZERO;
  }
  mul(num: TokenValue | BigNumber | number) {
    // TODO: implement
    return TokenValue.ZERO;
  }
  div(num: TokenValue | BigNumber | number) {
    // TODO: implement
    return TokenValue.ZERO;
  }
  eq(num: TokenValue | BigNumber | number): boolean {
    // TODO: implement
    return false;
  }
  gt(num: TokenValue | BigNumber | number): boolean {
    // TODO: implement
    return false;
  }
  gte(num: TokenValue | BigNumber | number): boolean {
    // TODO: implement
    return false;
  }
  lt(num: TokenValue | BigNumber | number): boolean {
    // TODO: implement
    return false;
  }
  lte(num: TokenValue | BigNumber | number): boolean {
    // TODO: implement
    return false;
  }
}
