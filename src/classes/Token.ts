import BigNumber from 'bignumber.js';
import { BaseContract } from 'ethers';
import { ZERO_BN, MAX_UINT256, ChainId, NEW_BN } from '../constants';
import { ERC20__factory } from '../constants/generated';
import type { BeanstalkSDK } from '../lib/BeanstalkSDK';
import { Provider } from '../types';
import { bigNumberResult } from '../utils/Ledger';
import { toStringBaseUnitBN, toTokenUnitsBN } from '../utils/Tokens';
// import { erc20TokenContract } from '~/util/Contracts';

// import { toStringBaseUnitBN } from '~/util/Tokens';
import { Address } from './Address';

/**
 * A currency is any fungible financial instrument, including Ether, all ERC20 tokens, and other chain-native currencies
 */
export default abstract class Token {
  /**
   * Refernce to the SDK
   */
  public readonly sdk: BeanstalkSDK;

  /**
   * The contract address on the chain on which this token lives
   */
  private tokenAddress: Address | null;

  /**
   * The decimals used in representing currency amounts
   */
  public readonly decimals: number;

  /**
   * The symbol of the currency, i.e. a short textual non-unique identifier
   */
  public readonly symbol: string;

  /**
   * The name of the currency, i.e. a descriptive textual non-unique identifier
   */
  public readonly name: string;

  /**
   * The name of the currency, i.e. a descriptive textual non-unique identifier
   */
  public logo?: string;

  /**
   *
   */
  public color?: string;

  /**
   * The name of the currency, i.e. a descriptive textual non-unique identifier
   */
  public readonly slug?: string;

  /**
   *
   */
  public readonly contract?: any;

  /**
   *
   */
  public readonly rewards?: { stalk: number; seeds: number };

  /**
   *
   */
  public readonly displayDecimals: number;

  ///
  public readonly isLP: boolean;

  ///
  public readonly isUnripe: boolean;

  /**
   * @param chainId the chain ID on which this currency resides
   * @param address blockchain address where token contract resides
   * @param decimals decimals of the currency
   * @param symbol symbol of the currency
   * @param name of the currency
   */
  constructor(
    sdk: BeanstalkSDK,
    address: Address | null,
    decimals: number,
    metadata: {
      name?: string;
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
    this.sdk = sdk;

    if (!address && !(this instanceof NativeToken) && !(this instanceof BeanstalkToken)) throw new Error('address must be supplied for non-native and non-beanstalk tokens')
    this.tokenAddress = address;
    this.decimals = decimals;
    this.symbol = metadata.symbol;
    this.name = metadata.name || metadata.symbol;
    this.logo = metadata.logo;
    this.color = metadata.color;
    this.displayDecimals = metadata.displayDecimals || 2;
    this.isLP = metadata.isLP || false;
    this.isUnripe = metadata.isUnripe || false;
    this.rewards = rewards;
  }

  public get address (){ 
    if (!this.tokenAddress && this instanceof ERC20Token) throw new Error(`Token ${this.name} does not have an address`)

    return this.tokenAddress?.get(this.sdk.chainId) ?? '';
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

  abstract getBalance(account: string): Promise<BigNumber>;

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

export class NativeToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  public getBalance(account: string): Promise<BigNumber> {
    // console.debug(`[NativeToken] ${this.symbol} (${this.chainId} / ${this.address}) -> getBalance(${account})`);
    return this.sdk.provider.getBalance(account)
    .then(
      // No need to convert decimals because ethers does this already
      result => {
        return bigNumberResult(result)
      }
    );
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance(): Promise<BigNumber | undefined> {
    return Promise.resolve(new BigNumber(parseInt(MAX_UINT256, 16)));
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }

  public equals(other: Token): boolean {
    return this.sdk.chainId === other.sdk.chainId;
  }
}

export class ERC20Token extends Token {
  public getContract() {
    return ERC20__factory.connect(this.address, this.sdk.providerOrSigner)
  }

  public getBalance(account: string) {
    // console.debug(`[ERC20Token] ${this.symbol} (${this.chainId} / ${this.address}) -> balanceOf(${account})`);
    return (
      this.getContract()
        .balanceOf(account)
        .then(bigNumberResult)
        .catch((err: Error) => {
          console.error(`[ERC20Token] ${this.symbol} failed to call balanceOf(${account})`, err);
          throw err;
        })
    );
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance(account: string, spender: string) {
    // console.debug(`[ERC20Token] ${this.symbol} (${this.chainId} / ${this.address}) -> allowance(${account}, ${spender})`);
    return this.getContract().allowance(account, spender)
    .then(bigNumberResult);
  }

  public getTotalSupply() {
    // console.debug(`[ERC20Token] ${this.symbol} (${this.chainId} / ${this.address}) -> totalSupply()`);
    return this.getContract().totalSupply()
    .then(bigNumberResult);
  }
}

export class BeanstalkToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  public getBalance() {
    return Promise.resolve(NEW_BN);
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance() {
    return Promise.resolve(new BigNumber(parseInt(MAX_UINT256, 16)));
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }
}

export type AnyToken = BeanstalkToken | ERC20Token | NativeToken;
