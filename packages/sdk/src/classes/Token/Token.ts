import BigNumber from 'bignumber.js';
import { BaseContract } from 'ethers';
import { ZERO_BN } from '../../constants';
import type { BeanstalkSDK } from '../../lib/BeanstalkSDK';
import { BeanNumber } from '../../utils/BeanNumber/BeanNumber';
import { bigNumberResult } from '../../utils/Ledger';
import { toStringBaseUnitBN, toTokenUnitsBN } from '../../utils/Tokens';

// import { BeanstalkToken } from './BeanstalkToken';
// import { NativeToken } from './NativeToken';

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
  public readonly rewards?: { stalk: number; seeds: number };

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
      stalk: number;
      seeds: number;
    }
  ) {
    Token.sdk = sdk;

    /// Basic
    this.address = address ?? '';
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
  public getStalk(bdv?: BigNumber): BigNumber {
    if (!this.rewards?.stalk) return ZERO_BN;
    if (!bdv) return new BigNumber(this.rewards.stalk);
    return bdv.times(this.rewards.stalk);
  }

  /** Get the amount of Seeds rewarded per deposited BDV of this Token. */
  public getSeeds(bdv?: BigNumber): BigNumber {
    if (!this.rewards?.seeds) return ZERO_BN;
    if (!bdv) return new BigNumber(this.rewards.seeds);
    return bdv.times(this.rewards.seeds);
  }

  abstract getContract(): BaseContract | null;

  abstract getBalance(account: string): Promise<BeanNumber>;

  abstract getAllowance(account: string, spender: string): Promise<BigNumber | undefined>;

  abstract getTotalSupply(): Promise<BigNumber> | undefined;

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

  public setMetadata(metadata: {
    logo?: string;
    color?: string;
  }) {
    if (metadata.logo) this.logo = metadata.logo;
    if (metadata.color) this.color = metadata.color;
  }

  /**
   * Convert an `amount` of this Token into a string value
   * based on the configured number of decimals.
   *
   * FIXME: better name
   * FIXME: provide other side (toTokenUnitsBN)
   *
   * @param amount amount to convert
   * @returns string
   */
  public stringify(amount: BigNumber.Value) {
    return toStringBaseUnitBN(amount, this.decimals);
  }

  public stringifyToDecimal(amount: BigNumber.Value) {
    return toTokenUnitsBN(amount, this.decimals)
  }

  public tokenResult (){
    return (result: BigNumber) => toTokenUnitsBN(bigNumberResult(result), this.decimals);
  };
}

