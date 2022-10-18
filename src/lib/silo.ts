import { BigNumber } from 'bignumber.js';
import { Test } from 'mocha';
import { Token } from '../classes/Token';
import { ZERO_BN } from '../constants';
import { DataSource, StringMap } from '../types';
import { toTokenUnitsBN } from '../utils/Tokens';

import { BeanstalkSDK } from './BeanstalkSDK';
import EventProcessor from './events/EventProcessor';

/**
 * A Crate is an `amount` of a token Deposited or
 * Withdrawn during a given `season`.
 */
export type Crate = {
  /** The amount of this Crate that was created, denominated in the underlying Token. */
  amount: BigNumber;
  /** The Season that the Crate was created. */
  season: BigNumber;
};

/**
 * A "Deposit" represents an amount of a Whitelisted Silo Token
 * that has been added to the Silo.
 */
export type DepositCrate = Crate & {
  /** The BDV of the Deposit, determined upon Deposit. */
  bdv: BigNumber;
  /** The amount of Stalk granted for this Deposit. */
  stalk: BigNumber;
  /** The amount of Seeds granted for this Deposit. */
  seeds: BigNumber;
};

export type WithdrawalCrate = Crate & {};

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
    crates: DepositCrate[];
  };
  withdrawn: {
    /** The total amount of this Token currently in the Withdrawn state. */
    amount: BigNumber;
    /** All Withdrawal crates. */
    crates: WithdrawalCrate[];
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
  private readonly sdk: BeanstalkSDK;
  // public balances: Map<Token, TokenSiloBalance>;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
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
  //   if (this.sdk.tokens.siloWhitelist.has(_tokenOut)) {
  //     throw new Error(`${_tokenOut.symbol} is not a whitelisted token`)
  //   }
  //   const tokenIn: ERC20Token = _tokenIn instanceof NativeToken ? this.sdk.tokens.WETH : _tokenIn;
  //   const tokenOut = _tokenOut;
  //   const amountIn = ethers.BigNumber.from(toStringBaseUnitBN(_amountIn, tokenIn.decimals));

  //   let estimate;

  //   // Depositing BEAN
  //   if (tokenOut.equals(this.sdk.tokens.BEAN)) {
  //     if (tokenIn.equals(this.sdk.tokens.WETH)) {
  //       estimate = await this.sdk.farm.estimate(
  //         this.sdk.farm.buyBeans(), // this assumes we're coming from WETH
  //         [amountIn]
  //       );
  //     }
  //   }

  //   // Depositing LP Tokens
  //   else {
  //     const pool = this.sdk.tokens
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

  public async deposit() {
    console.log('not implemented');
  }

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
    const source = this.sdk.deriveConfig("source", options);
    if (source === DataSource.SUBGRAPH) {
      const query = await this.sdk.queries.getSiloWhitelist(); 
      return query.whitelistTokens.map((e) => ({
        token: e.token,
        stalk: parseInt(e.stalk),
        seeds: parseInt(e.seeds) / 1E4,
      }));
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
    _account: string,
    options?: (
      { source: DataSource.LEDGER } | 
      { source: DataSource.SUBGRAPH }
    )
  ) : Promise<Map<Token, TokenSiloBalance>> {
    const source = this.sdk.deriveConfig("source", options);
    const [account, season] = await Promise.all([
      _account ?? this.sdk.getAccount(),
      this.sdk.sun.getSeason(),
    ]);

    const balances = new Map<Token, TokenSiloBalance>();

    /// LEDGER
    if (source === DataSource.LEDGER) {
      const seasonBN = new BigNumber(season);
      const whitelist = this.sdk.tokens.siloWhitelist;

      // Fetch and process events.
      const events = await this.sdk.events.getSiloEvents(account);
      const processor = new EventProcessor(this.sdk, account, { season: seasonBN, whitelist });
      const { deposits, withdrawals } = processor.ingestAll(events);

      // Handle deposits.
      // Attach stalk & seed counts for each crate.
      deposits.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, this._makeTokenSiloBalance());
        }
        const state = balances.get(token)!.deposited;
        const crates = [];
        for (let s in _crates) {
          const crate = _crates[s];
          state.amount = state.amount.plus(crate.amount);
          state.bdv = state.bdv.plus(crate.bdv);
          crates.push({
            season:   new BigNumber(s),
            amount:   crate.amount,
            bdv:      crate.bdv,
            stalk:    token.getStalk(crate.bdv), // FIXME: include grown stalk?
            seeds:    token.getSeeds(crate.bdv),
          });
        }
        state.crates = crates.sort((a, b) => a.season.minus(b.season).toNumber()); // sort by season asc
      });

      // Handle withdrawals.
      // Split crates into withdrawn and claimable.
      withdrawals.forEach((_crates, token) => {
        if (!balances.has(token)) {
          balances.set(token, this._makeTokenSiloBalance());
        }
        const { withdrawn, claimable } = processor.parseWithdrawals(token, seasonBN);
        balances.get(token)!.withdrawn = withdrawn;
        balances.get(token)!.claimable = claimable;
      });

      return balances;
    }

    /// SUBGRAPH
    if (source === DataSource.SUBGRAPH) {
      const query = await this.sdk.queries.getSiloBalances({ account, season }); // crates ordered in asc order
      if (!query.farmer) return balances;

      const { deposited, withdrawn, claimable } = query.farmer!;

      // Lookup token by address and create a TokenSiloBalance entity.
      const prep = (address: string) => {
        const token = this.sdk.tokens.findByAddress(address);
        if (!token) return; // FIXME: unknown token handling
        if (!balances.has(token)) balances.set(token, this._makeTokenSiloBalance());
        return token;
      };

      // Handle deposits.
      type DepositEntity = (typeof deposited)[number];
      const handleDeposit = (crate: DepositEntity) => {
        const token  = prep(crate.token);
        if (!token) return;
        const state  = balances.get(token)!.deposited;

        const season = new BigNumber(crate.season);
        const amount = toTokenUnitsBN(crate.amount, token.decimals);
        const bdv    = toTokenUnitsBN(crate.bdv, this.sdk.tokens.BEAN.decimals);

        state.amount = state.amount.plus(amount);
        state.bdv    = state.bdv.plus(bdv);
        state.crates.push({
          season:   season,
          amount:   crate.amount,
          bdv:      crate.bdv,
          stalk:    token.getStalk(crate.bdv), // FIXME: include grown stalk?
          seeds:    token.getSeeds(crate.bdv),
        });
      };

      // Handle withdrawals.
      // Claimable = withdrawals from the past. The GraphQL query enforces this.
      type WithdrawalEntity = (typeof withdrawn)[number];
      const handleWithdrawal = (key: 'withdrawn' | 'claimable') => (crate: WithdrawalEntity) => {
        const token  = prep(crate.token);
        if (!token) return;
        const state = balances.get(token)![key];

        const season = new BigNumber(crate.season);
        const amount = toTokenUnitsBN(crate.amount, token.decimals);

        state.amount = state.amount.plus(amount); // convert decimals
        state.crates.push({
          season:   season,
          amount:   crate.amount,
        });
      };

      query.farmer.deposited.forEach(handleDeposit);
      query.farmer.withdrawn.forEach(handleWithdrawal('withdrawn'));
      query.farmer.claimable.forEach(handleWithdrawal('claimable'));

      return balances;
    }

    throw new Error(`Unsupported source: ${source}`);
  }

  /**
   * Integration test:
   * should be able to assert that 
   *    sdk.silo.getBalances(0xADDR, { source: DataSource.SUBGRAPH })
   *    == sdk.silo.getBalances(0xADDR, { source: DataSource.LEDGER })
   */

  // public async getDeposits() {
  //   console.log('not implemented');
  // }
  // public async convert() {
  //   console.log('not implemented');
  // }
  // public async transfer() {
  //   console.log('not implemented');
  // }
  // public async withdraw() {
  //   console.log('not implemented');
  // }
  // public async getWithdrawals() {
  //   console.log('not implemented');
  // }
  // public async claim() {
  //   console.log('not implemented');
  // }
}