import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import _ from 'lodash';
import { Token } from '../classes/Token';
import { MAX_UINT256, ZERO_BN } from '../constants';
import { DataSource, StringMap } from '../types';
import { toTokenUnitsBN } from '../utils/Tokens';

import { BeanstalkSDK } from './BeanstalkSDK';
import EventProcessor from './events/processor';
import { EIP712Domain, EIP712TypedData, Permit } from './permit';
import { CrateSortFn, DepositTokenPermitMessage, DepositTokensPermitMessage, sortCratesBySeason, _parseWithdrawalCrates } from './silo.utils';

/**
 * A Crate is an `amount` of a token Deposited or
 * Withdrawn during a given `season`.
 */
type BigNumbers = BigNumber | ethers.BigNumber;
export type Crate<T extends BigNumbers = BigNumber>  = {
  /** The amount of this Crate that was created, denominated in the underlying Token. */
  amount: T;
  /** The Season that the Crate was created. */
  season: T;
};

/**
 * A "Deposit" represents an amount of a Whitelisted Silo Token
 * that has been added to the Silo.
 */
export type DepositCrate<T extends BigNumbers = BigNumber> = Crate<T> & {
  /** The BDV of the Deposit, determined upon Deposit. */
  bdv: T;
  /** The amount of Stalk granted for this Deposit. */
  stalk: T;
  /** The amount of Seeds granted for this Deposit. */
  seeds: T;
};

export type WithdrawalCrate<T extends BigNumbers = BigNumber> = Crate<T> & {};

/**
 * A "Silo Balance" provides all information
 * about a Farmer's ownership of a Whitelisted Silo Token.
 */
export type TokenSiloBalance = {
  deposited: {
    /** The total amount of this Token currently in the Deposited state. */
    amount: BigNumber;
    /** The BDV of this Token currently in the Deposited state. */
    bdv: BigNumber;
    /** All Deposit crates. */
    crates: DepositCrate<BigNumber>[];
  };
  withdrawn: {
    /** The total amount of this Token currently in the Withdrawn state. */
    amount: BigNumber;
    /** All Withdrawal crates. */
    crates: WithdrawalCrate<BigNumber>[];
  };
  claimable: {
    /** The total amount of this Token currently in the Claimable state. */
    amount: BigNumber;
    /** All Claimable crates. */
    crates: Crate[];
  };
};

export type UpdateFarmerSiloBalancesPayload = StringMap<Partial<TokenSiloBalance>>;

export class Silo {
  static sdk: BeanstalkSDK;
  // public balances: Map<Token, TokenSiloBalance>;

  constructor(sdk: BeanstalkSDK) {
    Silo.sdk = sdk;
  }

  /**
   *
   * @param _tokenIn The input token, any that we can swap for the whitelisted token
   * @param _amountIn Amount of _tokenIn to convert to _tokenOut and deposit
   * @param _tokenOut The whitelisted Token (BEAN, BEAN3CRV, urBEAN, urBEAN3CRV)
   */
  // public async depositQuote(
  //   _tokenIn: NativeToken | ERC20Token,
  //   _amountIn: BigNumber,
  //   _tokenOut: ERC20Token,
  // ): Promise<{ amountOut: any; steps: any }> {
  //   if (Silo.sdk.tokens.siloWhitelist.has(_tokenOut)) {
  //     throw new Error(`${_tokenOut.symbol} is not a whitelisted token`)
  //   }
  //   const tokenIn: ERC20Token = _tokenIn instanceof NativeToken ? Silo.sdk.tokens.WETH : _tokenIn;
  //   const tokenOut = _tokenOut;
  //   const amountIn = ethers.BigNumber.from(toStringBaseUnitBN(_amountIn, tokenIn.decimals));

  //   let estimate;

  //   // Depositing BEAN
  //   if (tokenOut.equals(Silo.sdk.tokens.BEAN)) {
  //     if (tokenIn.equals(Silo.sdk.tokens.WETH)) {
  //       estimate = await Silo.sdk.farm.estimate(
  //         Silo.sdk.farm.buyBeans(), // this assumes we're coming from WETH
  //         [amountIn]
  //       );
  //     }
  //   }

  //   // Depositing LP Tokens
  //   else {
  //     const pool = Silo.sdk.tokens
  //     if (!pool) throw new Error(`Depositing to ${tokenOut.symbol} but no corresponding pool data found.`);

  //     // This is a Curve MetaPool...
  //     const isMetapool = true;
  //     if (isMetapool) {
  //       // ...and we're depositing one of the underlying pool tokens.
  //       // Ex. for BEAN:3CRV this could be [BEAN, (DAI, USDC, USDT)].
  //       // pool.tokens      = [BEAN, CRV3]
  //       // pool.underlying  = [BEAN, DAI, USDC, USDT]
  //       const tokenIndex = pool.tokens.indexOf(tokenIn);
  //       console.log('TokenIndex: ', tokenIndex);
  //       const underlyingTokenIndex = pool.underlying.indexOf(tokenIn);
  //       console.debug('[Deposit] LP Deposit', {
  //         pool,
  //         tokenIn,
  //         tokenIndex,
  //         underlyingTokenIndex,
  //       });

  //       // This is X or CRV3
  //       if (tokenIndex > -1) {
  //         const indices = [0, 0];
  //         indices[tokenIndex] = 1; // becomes [0, 1] or [1, 0]
  //         console.debug('[Deposit] LP Deposit: indices=', indices);
  //         estimate = await Farm.estimate(
  //           [
  //             farm.addLiquidity(
  //               pool.address,
  //               // FIXME: bean:lusd was a plain pool, bean:eth on curve would be a crypto pool
  //               // perhaps the Curve pool instance needs to track a registry
  //               farm.contracts.curve.registries.metaFactory.address,
  //               // FIXME: find a better way to define this above
  //               indices as [number, number],
  //               optimizeFromMode(_amountIn, balanceIn) // use the BN version here
  //             ),
  //           ],
  //           [amountIn]
  //         );
  //       }

  //       // This is a CRV3-underlying stable (DAI/USDC/USDT etc)
  //       else if (underlyingTokenIndex > -1) {
  //         if (underlyingTokenIndex === 0) throw new Error('Malformatted pool.tokens / pool.underlying');
  //         const indices = [0, 0, 0];
  //         indices[underlyingTokenIndex - 1] = 1;
  //         console.debug('[Deposit] LP Deposit: indices=', indices);
  //         estimate = await Farm.estimate(
  //           [
  //             // Deposit token into 3pool for 3CRV
  //             farm.addLiquidity(
  //               farm.contracts.curve.pools.pool3.address,
  //               farm.contracts.curve.registries.poolRegistry.address,
  //               indices as [number, number, number], // [DAI, USDC, USDT] use Tether from previous call
  //               optimizeFromMode(_amountIn, balanceIn) // use the BN version here
  //             ),
  //             farm.addLiquidity(
  //               pool.address,
  //               farm.contracts.curve.registries.metaFactory.address,
  //               // adding the 3CRV side of liquidity
  //               // FIXME: assuming that 3CRV is the second index (X:3CRV)
  //               // not sure if this is always the case
  //               [0, 1]
  //             ),
  //           ],
  //           [amountIn]
  //         );
  //       }

  //       // This is ETH or WETH
  //       else if (tokenIn === Weth) {
  //         estimate = await Farm.estimate(
  //           [
  //             // FIXME: this assumes the best route from
  //             // WETH to [DAI, USDC, USDT] is via tricrypto2
  //             // swapping to USDT. we should use routing logic here to
  //             // find the best pool and output token.
  //             // --------------------------------------------------
  //             // WETH -> USDT
  //             farm.exchange(
  //               farm.contracts.curve.pools.tricrypto2.address,
  //               farm.contracts.curve.registries.cryptoFactory.address,
  //               Weth.address,
  //               getChainToken(USDT).address,
  //               // The prior step is a ETH->WETH "swap", from which
  //               // we should expect to get an exact amount of WETH.
  //               FarmFromMode.INTERNAL
  //             ),
  //             // USDT -> deposit into pool3 for CRV3
  //             // FIXME: assumes USDT is the third index
  //             farm.addLiquidity(
  //               farm.contracts.curve.pools.pool3.address,
  //               farm.contracts.curve.registries.poolRegistry.address,
  //               [0, 0, 1] // [DAI, USDC, USDT]; use Tether from previous call
  //             ),
  //             // CRV3 -> deposit into right side of X:CRV3
  //             // FIXME: assumes CRV3 is the second index
  //             farm.addLiquidity(
  //               pool.address,
  //               farm.contracts.curve.registries.metaFactory.address,
  //               [0, 1] // [BEAN, CRV3] use CRV3 from previous call
  //             ),
  //           ],
  //           [amountIn]
  //         );
  //       }
  //     }
  //   }

  //   if (!estimate) {
  //     throw new Error(`Depositing ${tokenOut.symbol} to the Silo via ${tokenIn.symbol} is currently unsupported.`);
  //   }

  //   console.debug('[chain] estimate = ', estimate);

  //   return {
  //     amountOut: toTokenUnitsBN(estimate.amountOut.toString(), tokenOut.decimals),
  //     steps: estimate.steps,
  //   };
  // }

  //////////////////////// UTILITIES ////////////////////////

  /**
   * Sort the incoming map so that tokens are ordered in the same order
   * they appear on the Silo Whitelist. 
   * 
   * @note the Silo Whitelist is sorted by the order in which tokens were
   * whitelisted in Beanstalk. Unclear if the ordering shown on the
   * Beanstalk UI will change at some point in the future.
   */
  private _sortTokenMapByWhitelist<T extends any>(map: Map<Token, T>) {
    const whitelist = Silo.sdk.tokens.siloWhitelist;
    const copy = new Map<Token, T>(map);
    const ordered = new Map<Token, T>();
    // by default, order by whitelist
    whitelist.forEach((token) => {
      const v = copy.get(token)
      if (v) {
        ordered.set(token, v);
        copy.delete(token);
      }
    });
    // add remaining tokens
    copy.forEach((_, token) => {
      ordered.set(token, copy.get(token)!);
    });
    return ordered;
  }

  //////////////////////// WHITELIST ////////////////////////

  /**
   * Return a list of tokens that are currently whitelisted in the Silo.
   * 
   * @todo Check if the subgraph removes `WhitelistToken` entities if a
   *       token is de-whitelisted.
   * @todo Get name, decimals since these are ERC20 tokens.
   */
  public async getWhitelist(options?: (
    { source: DataSource.LEDGER } | 
    { source: DataSource.SUBGRAPH }
  )) {
    const source = Silo.sdk.deriveConfig("source", options);
    if (source === DataSource.SUBGRAPH) {
      const query = await Silo.sdk.queries.getSiloWhitelist(); 
      return query.whitelistTokens.map((e) => ({
        token: e.token,
        stalk: parseInt(e.stalk),
        seeds: parseInt(e.seeds) / 1E4,
      }));
    }
    throw new Error(`Unsupported source: ${source}`);
  }

  //////////////////////// BALANCES ////////////////////////

  private _parseWithdrawalCrates = _parseWithdrawalCrates;

  private _makeTokenSiloBalance() : TokenSiloBalance {
    return {
      deposited: {
        amount: ZERO_BN,
        bdv: ZERO_BN, 
        crates: [] as DepositCrate[],
      },
      withdrawn: {
        amount: ZERO_BN,
        crates: [] as WithdrawalCrate[]
      },
      claimable: { 
        amount: ZERO_BN,
        crates: [] as WithdrawalCrate[]
      },
    }
  }

  /**
   * Apply a Deposit to a TokenSiloBalance.
   * 
   * @note expects inputs to be stringified (no decimals).
   */
  private _applyDeposit(
    state: TokenSiloBalance['deposited'],
    token: Token,
    rawCrate: {
      season: string | number;
      amount: string;
      bdv: string;
    },
  ) {
    const season = new BigNumber(rawCrate.season);
    const amount = toTokenUnitsBN(rawCrate.amount, token.decimals);
    const bdv    = toTokenUnitsBN(rawCrate.bdv, Silo.sdk.tokens.BEAN.decimals);

    const crate = {
      season:   season,
      amount:   amount,
      bdv:      bdv,
      stalk:    token.getStalk(bdv), // FIXME: include grown stalk?
      seeds:    token.getSeeds(bdv),
    };

    state.amount = state.amount.plus(amount);
    state.bdv    = state.bdv.plus(bdv);
    state.crates.push(crate);

    return crate;
  }

  /** 
   * Apply a Deposit to a TokenSiloBalance.
   * 
   * @note expects inputs to be stringified (no decimals).
   */
  private _applyWithdrawal(
    state: TokenSiloBalance['withdrawn' | 'claimable'],
    token: Token,
    rawCrate: {
      season: string | number;
      amount: string;
    }
  ) {
    const season = new BigNumber(rawCrate.season);
    const amount = toTokenUnitsBN(rawCrate.amount, token.decimals);

    const crate = {
      season:   season,
      amount:   amount,
    };

    state.amount = state.amount.plus(amount);
    state.crates.push(crate);

    return crate;
  }

  private _sortCrates(
    state: TokenSiloBalance['deposited' | 'withdrawn' | 'claimable']
  ) {
    state.crates = state.crates.sort(
      (a, b) => a.season.minus(b.season).toNumber() // sort by season asc
    );
  }

  /**
   * Return the Farmer's balance of a single whitelisted token.
   */
  public async getBalance(
    _token: Token,
    _account?: string,
    options?: (
      { source: DataSource.LEDGER } | 
      { source: DataSource.SUBGRAPH }
    )
  ) : Promise<TokenSiloBalance> {
    const source = Silo.sdk.deriveConfig("source", options);
    const [account, season] = await Promise.all([
      Silo.sdk.getAccount(_account),
      Silo.sdk.sun.getSeason(),
    ]);

    // FIXME: doesn't work if _token is an instance of a token created by the SDK consumer
    if (!Silo.sdk.tokens.siloWhitelist.has(_token)) throw new Error(`${_token.address} is not whitelisted in the Silo`);

    ///  SETUP
    const whitelist = Silo.sdk.tokens.siloWhitelist;
    const balance : TokenSiloBalance = this._makeTokenSiloBalance();

    if (source === DataSource.LEDGER) {
      // Fetch and process events.
      const seasonBN = new BigNumber(season);
      const events = await Silo.sdk.events.getSiloEvents(account, _token.address);
      const processor = new EventProcessor(Silo.sdk, account, { 
        season: ethers.BigNumber.from(season.toString()), // FIXME: verbose
        whitelist
      });

      const { deposits, withdrawals } = processor.ingestAll(events);

      // Handle deposits
      {
        const _crates = deposits.get(_token);

        for (let s in _crates) {
          const rawCrate = {
            season: s.toString(),
            amount: _crates[s].amount.toString(),
            bdv:    _crates[s].bdv.toString(),
          }
          // Update the total deposited of this token
          // and return a parsed crate object
          this._applyDeposit(balance.deposited, _token, rawCrate);
        }

        this._sortCrates(balance.deposited);
      }

      // Handle withdrawals
      {
        const _crates = withdrawals.get(_token);
        if (_crates) {
          const { withdrawn, claimable } = this._parseWithdrawalCrates(_token, _crates, seasonBN);
          
          balance.withdrawn = withdrawn;
          balance.claimable = claimable;

          this._sortCrates(balance.withdrawn);
          this._sortCrates(balance.claimable);
        }
      }

      return balance;
    }

    /// SUBGRAPH
    else if (source === DataSource.SUBGRAPH) {
      const query = await Silo.sdk.queries.getSiloBalance({
        token: _token.address.toLowerCase(),
        account,
        season,
      }); // crates ordered in asc order
      if (!query.farmer) return balance;

      const { deposited, withdrawn, claimable } = query.farmer!;
      deposited.forEach((crate) => this._applyDeposit(balance.deposited, _token, crate));
      withdrawn.forEach((crate) => this._applyWithdrawal(balance.withdrawn, _token, crate));
      claimable.forEach((crate) => this._applyWithdrawal(balance.claimable, _token, crate));

      return balance;
    }

    throw new Error(`Unsupported source: ${source}`);
  }

  /**
   * Return a Farmer's Silo balances.
   * 
   * ```
   * [Token] => { 
   *   deposited => { amount, bdv, crates },
   *   withdrawn => { amount, crates },
   *   claimable => { amount, crates }
   * }
   * ```
   * 
   * @note EventProcessor requires a known whitelist and returns 
   *       an object (possibly empty) for every whitelisted token.
   * @note To process a Deposit, we must know how many Stalk & Seeds
   *       are given to it. If a token is dewhitelisted and removed from
   *       `tokens` (or from the on-chain whitelist)
   * @fixme "deposits" vs "deposited"
   */
  public async getBalances(
    _account?: string,
    options?: (
      { source: DataSource.LEDGER } | 
      { source: DataSource.SUBGRAPH }
    )
  ) : Promise<Map<Token, TokenSiloBalance>> {
    const source = Silo.sdk.deriveConfig("source", options);
    const [account, season] = await Promise.all([
      Silo.sdk.getAccount(_account),
      Silo.sdk.sun.getSeason(),
    ]);

    
    /// SETUP
    const whitelist = Silo.sdk.tokens.siloWhitelist;
    const balances = new Map<Token, TokenSiloBalance>();
    whitelist.forEach((token) => balances.set(token, this._makeTokenSiloBalance()));

    /// LEDGER
    if (source === DataSource.LEDGER) {
      // Fetch and process events.
      const seasonBN = new BigNumber(season);
      const events = await Silo.sdk.events.getSiloEvents(account);
      const processor = new EventProcessor(Silo.sdk, account, { 
        season: ethers.BigNumber.from(season.toString()), // FIXME: verbose
        whitelist
      });
      const { deposits, withdrawals } = processor.ingestAll(events);

      // Handle deposits.
      // Attach stalk & seed counts for each crate.
      deposits.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, this._makeTokenSiloBalance());
        }
        const state = balances.get(token)!.deposited;

        for (let s in _crates) {
          const rawCrate = {
            season: s.toString(),
            amount: _crates[s].amount.toString(),
            bdv:    _crates[s].bdv.toString(),
          }

          // Update the total deposited of this token
          // and return a parsed crate object
          this._applyDeposit(state, token, rawCrate);
        }

        this._sortCrates(state);
      });

      // Handle withdrawals.
      // Split crates into withdrawn and claimable.
      withdrawals.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, this._makeTokenSiloBalance());
        }

        //
        const { withdrawn, claimable } = this._parseWithdrawalCrates(token, _crates, seasonBN);
        const tokenBalance = balances.get(token);
        tokenBalance!.withdrawn = withdrawn;
        tokenBalance!.claimable = claimable;

        this._sortCrates(tokenBalance!.withdrawn);
        this._sortCrates(tokenBalance!.claimable);
      });
      
      return this._sortTokenMapByWhitelist(balances); // FIXME: sorting is redundant if this is instantiated
    }

    /// SUBGRAPH
    if (source === DataSource.SUBGRAPH) {
      const query = await Silo.sdk.queries.getSiloBalances({ account, season }); // crates ordered in asc order
      if (!query.farmer) return balances;
      const { deposited, withdrawn, claimable } = query.farmer!;

      // Lookup token by address and create a TokenSiloBalance entity.
      const prep = (address: string) => {
        const token = Silo.sdk.tokens.findByAddress(address);
        if (!token) return; // FIXME: unknown token handling
        if (!balances.has(token)) balances.set(token, this._makeTokenSiloBalance());
        return token;
      };

      // Handle deposits.
      type DepositEntity = (typeof deposited)[number];
      const handleDeposit = (crate: DepositEntity) => {
        const token = prep(crate.token);
        if (!token) return;
        const state = balances.get(token)!.deposited;
        this._applyDeposit(state, token, crate);
      };

      // Handle withdrawals.
      // Claimable = withdrawals from the past. The GraphQL query enforces this.
      type WithdrawalEntity = (typeof withdrawn)[number];
      const handleWithdrawal = (key: 'withdrawn' | 'claimable') => (crate: WithdrawalEntity) => {
        const token = prep(crate.token);
        if (!token) return;
        const state = balances.get(token)![key];
        this._applyWithdrawal(state, token, crate)
      };

      deposited.forEach(handleDeposit);
      withdrawn.forEach(handleWithdrawal('withdrawn'));
      claimable.forEach(handleWithdrawal('claimable'));

      return this._sortTokenMapByWhitelist(balances);
    }

    throw new Error(`Unsupported source: ${source}`);
  }
  
  //////////////////////// Crates ////////////////////////

  pickCrates(
    crates: Crate<BigNumber>[],
    token: Token,
    amount: BigNumber.Value,
    sort: CrateSortFn = (crates) => sortCratesBySeason(crates, 'desc'),
  ) {
    const sortedCrates = sort(crates);
    const seasons : string[] = [];
    const amounts : string[] = [];
    let remaining = new BigNumber(amount);
    sortedCrates.some((crate) => {
      const thisAmount = crate.amount.gt(remaining) ? crate.amount.minus(remaining) : crate.amount;
      seasons.push(crate.season.toString());
      amounts.push(token.stringify(thisAmount));
      remaining = remaining.minus(thisAmount);
      return remaining.eq(0); // done
    });
    if (!remaining.eq(0)) throw new Error('Not enough amount in crates');
    return { seasons, amounts };
  }

  //////////////////////// ACTION: Deposit ////////////////////////
  
  // public deposit = wrapped(Silo.sdk.contracts.beanstalk, 'deposit')
  // $deposit = Silo.sdk.contracts.beanstalk.deposit;
  // $plant = Silo.sdk.contracts.beanstalk.plant;
  // $update = Silo.sdk.contracts.beanstalk.update;
  // $lastUpdate = Silo.sdk.contracts.beanstalk.lastUpdate;

  //////////////////////// Permits ////////////////////////

  /**
   * Created typed permit data to authorize `spender` to transfer
   * the `owner`'s deposit balance of `token`.
   * 
   * @fixme `permitDepositToken` -> `getPermitForToken`
   * 
   * @param owner the Farmer whose Silo deposit can be transferred
   * @param spender the account authorized to make a transfer
   * @param token the whitelisted token that can be transferred
   * @param value the amount of the token that can be transferred
   * @param _nonce a nonce to include when signing permit.
   * Defaults to `beanstalk.depositPermitNonces(owner)`.
   * @param _deadline the permit deadline. 
   * Defaults to `MAX_UINT256` (effectively no deadline).
   * @returns typed permit data. This can be signed with `sdk.permit.sign()`.
   */
  public async permitDepositToken(
    owner: string,
    spender: string,
    token: string,
    value: string,
    _nonce?: string,
    _deadline?: string,
  ) : Promise<EIP712TypedData<DepositTokenPermitMessage>> {
    const deadline = _deadline || MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      this._getEIP712Domain(), 
      _nonce || (Silo.sdk.contracts.beanstalk.depositPermitNonces(owner).then((nonce) => nonce.toString())),
    ]);

    return this._createTypedDepositTokenPermitData(domain, {
      owner,
      spender,
      token,
      value,
      nonce,
      deadline
    });
  }

  /**
   * Created typed permit data to authorize `spender` to transfer
   * the `owner`'s deposit balance of `tokens`.
   * 
   * @fixme `permitDepositTokens` -> `getPermitForTokens`
   * 
   * @param owner the Farmer whose Silo deposit can be transferred
   * @param spender the account authorized to make a transfer
   * @param tokens the whitelisted tokens that can be transferred.
   * @param values the amount of each token in `tokens` that can be transferred.
   * `values[0]` = how much of `tokens[0]` can be transferred, etc.
   * @param _nonce a nonce to include when signing permit.
   * Defaults to `beanstalk.depositPermitNonces(owner)`.
   * @param _deadline the permit deadline. 
   * Defaults to `MAX_UINT256` (effectively no deadline).
   * @returns typed permit data. This can be signed with `sdk.permit.sign()`.
   */
  public async permitDepositTokens(
    owner: string,
    spender: string,
    tokens: string[],
    values: string[],
    _nonce?: string,
    _deadline?: string,
  ): Promise<EIP712TypedData<DepositTokensPermitMessage>> {
    if (tokens.length !== values.length) throw new Error('Input mismatch: number of tokens does not equal number of values');
    if (tokens.length === 1) console.warn('Optimization: use permitDepositToken when permitting one Silo Token.')

    const deadline = _deadline || MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      this._getEIP712Domain(), 
      _nonce || (Silo.sdk.contracts.beanstalk.depositPermitNonces(owner).then((nonce) => nonce.toString())),
    ]);

    return this._createTypedDepositTokensPermitData(domain, {
      owner,
      spender,
      tokens,
      values,
      nonce,
      deadline
    });
  }
  
  /**
   * Get the EIP-712 domain for the Silo.
   * @note applies to both `depositToken` and `depositTokens` permits.
   */
  private async _getEIP712Domain() {
    return {
      name: "SiloDeposit",
      version: "1",
      // FIXME: switch to below after protocol patch
      // chainId: (await Silo.sdk.provider.getNetwork()).chainId,
      chainId: 1, 
      verifyingContract: "0xc1e088fc1323b20bcbee9bd1b9fc9546db5624c5"
    }
  }

  private _createTypedDepositTokenPermitData = (
    domain: EIP712Domain,
    message: DepositTokenPermitMessage,
  ) => ({
    types: {
      EIP712Domain: Permit.EIP712_DOMAIN,
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "token", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain,
    message,
  });

  private _createTypedDepositTokensPermitData = (
    domain: EIP712Domain,
    message: DepositTokensPermitMessage,
  ) => ({
    types: {
      EIP712Domain: Permit.EIP712_DOMAIN,
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "tokens", type: "address[]" },
        { name: "values", type: "uint256[]" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain,
    message,
  });
}