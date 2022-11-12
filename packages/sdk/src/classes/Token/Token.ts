import { BaseContract, BigNumberish } from "ethers";
import { ZERO_BN } from "../../constants";
import type { BeanstalkSDK } from "../../lib/BeanstalkSDK";
import { BigNumber } from "ethers";
import { TokenValue } from "../TokenValue";
import { toHuman } from "../../utils/Tokens";

/**
 * A currency is any fungible financial instrument, including Ether, all ERC20 tokens, and other chain-native currencies
 */
export abstract class Token {
  /** Reference to the SDK */
  static sdk: BeanstalkSDK;

  /** The contract address on the chain on which this token lives */
  public readonly address: string;

  /** The decimals used in representing currency amounts */
  public readonly decimals: number;

  /** The chain id of the chain this token lives on */
  public readonly chainId: number;

  /** The name of the currency, i.e. a descriptive textual non-unique identifier */
  public name: string;

  /** The display name of the currency, i.e. a descriptive textual non-unique identifier */
  public readonly displayName: string;

  /** The symbol of the currency, i.e. a short textual non-unique identifier */
  public readonly symbol: string;

  /** The square logo of the token. */
  public logo?: string;

  /** The color to use when displaying the token in charts, etc. */
  public color?: string;

  /** The number of decimals this token is recommended to be truncated to. */
  public readonly displayDecimals: number;

  /** Whether or not this is a LP token representing a position in a Pool. */
  public readonly isLP: boolean;

  /** Whether or not this is an Unripe token. */
  public readonly isUnripe: boolean;

  /** The Beanstalk STALK/SEED rewards per BDV of this token. */
  public readonly rewards?: { stalk: TokenValue; seeds: TokenValue };

  /**
   * @param chainId the chain ID on which this currency resides
   * @param address blockchain address where token contract resides
   * @param decimals decimals of the currency
   * @param metadata.symbol symbol of the currency
   * @param metadata.name name of the currency, matches `.name()`
   * @param metadata.displayName
   */
  constructor(
    sdk: BeanstalkSDK,
    address: string | null,
    decimals: number,
    metadata: {
      name?: string;
      displayName?: string;
      symbol: string;
      logo?: string;
      color?: string;
      displayDecimals?: number;
      isLP?: boolean;
      isUnripe?: boolean;
    },
    rewards?: {
      stalk: TokenValue;
      seeds: TokenValue;
    }
  ) {
    Token.sdk = sdk;

    /// Basic
    this.address = address ?? "";
    this.decimals = decimals;
    this.chainId = sdk.chainId;

    /// Metadata
    this.name = metadata.name || metadata.symbol;
    this.displayName = metadata.displayName || metadata.name || metadata.symbol;
    this.symbol = metadata.symbol;
    this.displayDecimals = metadata.displayDecimals || 2;
    this.logo = metadata.logo;
    this.color = metadata.color;

    /// Beanstalk-specific
    this.isLP = metadata.isLP || false;
    this.isUnripe = metadata.isUnripe || false;
    this.rewards = rewards;
  }

  /** Get the amount of Stalk rewarded per deposited BDV of this Token. */
  public getStalk(bdv?: TokenValue): TokenValue {
    if (!this.rewards?.stalk) return Token.sdk.tokens.STALK.amount(0);
    if (!bdv) return this.rewards.stalk;

    return TokenValue.fromBlockchain(bdv.mul(this.rewards?.stalk).toBigNumber(), Token.sdk.tokens.STALK.decimals);
  }

  /** Get the amount of Seeds rewarded per deposited BDV of this Token. */
  public getSeeds(bdv?: TokenValue): TokenValue {
    if (!this.rewards?.seeds) return Token.sdk.tokens.SEEDS.amount(0);
    if (!bdv) return this.rewards.seeds;

    return TokenValue.fromBlockchain(bdv.mul(this.rewards.seeds).toBigNumber(), Token.sdk.tokens.SEEDS.decimals);
  }

  abstract getContract(): BaseContract | null;

  abstract getBalance(account: string): Promise<TokenValue>;

  abstract getAllowance(account: string, spender: string): Promise<TokenValue | undefined>;

  abstract getTotalSupply(): Promise<TokenValue> | undefined;

  /**
   * Returns whether this currency is functionally equivalent to the other currency
   * @param other the other currency
   */
  public equals(other: Token): boolean {
    return this.address === other.address;
  }

  public toString(): string {
    return this.name;
  }

  public setMetadata(metadata: { logo?: string; color?: string }) {
    if (metadata.logo) this.logo = metadata.logo;
    if (metadata.color) this.color = metadata.color;
  }

  /**
   * Converts from a blockchain amount to a TokenAmount with this token's decimals set
   *
   * Ex: BEAN.fromHuman("3140000") => TokenValue holding value "3140000" and 6 decimals
   *
   * @param amount human readable amout, ex: "3.14" ether
   * @returns TokenValue
   */
  fromBlockchain(amount: string | number | BigNumber): TokenValue {
    return TokenValue.fromBlockchain(amount, this.decimals);
  }

  /**
   * Converts from a human amount to a TokenAmount with this token's decimals set
   *
   * Ex: BEAN.fromHuman("3.14") => TokenValue holding value "3140000" and 6 decimals
   *
   * @param amount human readable amout, ex: "3.14" ether
   * @returns TokenValue
   */
  fromHuman(amount: string | number): TokenValue {
    return TokenValue.fromHuman(amount, this.decimals);
  }

  /**
   * Alias to `.fromHuman()`
   *
   * Converts from a human amount to a TokenAmount with this token's decimals set
   *
   * Ex: BEAN.fromHuman("3.14") => TokenValue holding value "3140000" and 6 decimals
   *
   * @param amount human readable amout, ex: "3.14" ether
   * @returns TokenValue
   */
  amount(amount: string | number): TokenValue {
    return this.fromHuman(amount);
  }

  // /**
  //  * Converts from a BigNumber amount to a TokenValue
  //  *
  //  * Ex: BEAN.fromBigNumberToTokenValue(BigNumber.from("3140000")) => TokenValue holding value "3140000" and decimals "6"
  //  *
  //  * @param amount human readable amout, ex: "3.14" ether
  //  * @returns TokenValue
  //  */
  // fromBigNumberToTokenValue(amount: BigNumberish): TokenValue {
  //   return TokenValue.fromBlockchain(BigNumber.from(amount), this.decimals);
  // }

  // /**
  //  * Converts from a human amount to a TokenValue
  //  *
  //  * Ex: BEAN.fromHumanToTokenValue("3.14") => TokenValue holding value "3140000" and decimals "6"
  //  *
  //  * @param amount human readable amout, ex: "3.14" ether
  //  * @returns TokenValue
  //  */
  // fromHumanToTokenValue(amount: string): TokenValue {
  //   return TokenValue.fromHuman(amount, this.decimals);
  // }

  /**
   * Converts from a blockchain value to a human readable form
   *
   * Ex: BEAN.toHuman(BigNumber.from('3140000)) => "3.14"
   * @param value A BigNumber with a value of this token, for ex: 1000000 would be 1 BEAN
   * @returns string
   */
  toHuman(value: BigNumber): string {
    return toHuman(value, this.decimals);
  }

  toTokenValue(value: BigNumber): TokenValue {
    return TokenValue.fromBlockchain(value, this.decimals);
  }
}
