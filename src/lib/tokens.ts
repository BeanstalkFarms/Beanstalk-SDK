import { addresses } from '../constants';
import { Token, BeanstalkToken, ERC20Token, NativeToken } from '../classes/Token';
import { BeanstalkSDK } from './BeanstalkSDK';
import BigNumber from 'bignumber.js';
import { tokenBN } from './events/processor';
import { TokenFacet } from '../constants/generated/Beanstalk/Beanstalk';

export type TokenBalance = {
  internal: BigNumber;
  external: BigNumber;
  total: BigNumber;
}

export class Tokens {
  private sdk: BeanstalkSDK;
  public readonly ETH: NativeToken;
  public readonly WETH: ERC20Token;
  public readonly BEAN: ERC20Token;
  public readonly CRV3: ERC20Token;
  public readonly DAI: ERC20Token;
  public readonly USDC: ERC20Token;
  public readonly USDT: ERC20Token;
  public readonly LUSD: ERC20Token;
  public readonly BEAN_ETH_UNIV2_LP: ERC20Token;
  public readonly BEAN_CRV3_LP: ERC20Token;
  public readonly UNRIPE_BEAN: ERC20Token;
  public readonly UNRIPE_BEAN_CRV3: ERC20Token;
  public readonly STALK: BeanstalkToken;
  public readonly SEEDS: BeanstalkToken;
  public readonly PODS: BeanstalkToken;
  public readonly SPROUTS: BeanstalkToken;
  public readonly RINSABLE_SPROUTS: BeanstalkToken;

  public unripeTokens: Set<Token>;
  public unripeUnderlyingTokens: Set<Token>;
  public siloWhitelist: Set<Token>;
  public erc20Tokens: Set<Token>;
  public balanceTokens: Set<Token>;
  public crv3Underlying: Set<Token>;

  private map: Map<string, Token>;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
    this.map = new Map();

    this.ETH = new NativeToken(this.sdk, null, 18, {
      name: 'Ether',
      symbol: 'ETH',
      displayDecimals: 4,
    });

    this.WETH = new ERC20Token(this.sdk, addresses.WETH.get(this.sdk.chainId), 18, {
      name: 'Wrapped Ether',
      symbol: 'WETH',
    });

    this.BEAN = new ERC20Token(
      this.sdk,
      addresses.BEAN.get(this.sdk.chainId),
      6,
      {
        name: 'Bean',
        symbol: 'BEAN',
      },
      {
        stalk: 1,
        seeds: 2,
      }
    );

    this.CRV3 = new ERC20Token(this.sdk, addresses.CRV3.get(this.sdk.chainId), 18, {
      name: '3CRV',
      symbol: '3CRV',
      isLP: true,
    });

    this.DAI = new ERC20Token(this.sdk, addresses.DAI.get(this.sdk.chainId), 18, {
      name: 'Dai',
      symbol: 'DAI',
    });

    this.USDC = new ERC20Token(this.sdk, addresses.USDC.get(this.sdk.chainId), 6, {
      name: 'USD Coin',
      symbol: 'USDC',
    });

    this.USDT = new ERC20Token(this.sdk, addresses.USDT.get(this.sdk.chainId), 6, {
      name: 'Tether',
      symbol: 'USDT',
    });

    this.LUSD = new ERC20Token(this.sdk, addresses.LUSD.get(this.sdk.chainId), 6, {
      name: 'LUSD',
      symbol: 'LUSD',
    });

    this.BEAN_CRV3_LP = new ERC20Token(
      this.sdk,
      addresses.BEAN_CRV3.get(this.sdk.chainId),
      18,
      {
        name: 'BEAN:3CRV LP',
        symbol: 'BEAN3CRV',
        isLP: true,
        color: '#DFB385',
      },
      {
        stalk: 1,
        seeds: 4,
      }
    );

    this.UNRIPE_BEAN = new ERC20Token(
      this.sdk,
      addresses.UNRIPE_BEAN.get(this.sdk.chainId),
      6,
      {
        name: 'Unripe Bean',
        symbol: 'urBEAN',
        displayDecimals: 2,
        isUnripe: true,
      },
      {
        stalk: 1,
        seeds: 2,
      }
    );

    this.UNRIPE_BEAN_CRV3 = new ERC20Token(
      this.sdk,
      addresses.UNRIPE_BEAN_CRV3.get(this.sdk.chainId),
      6,
      {
        name: 'Unripe BEAN:3CRV LP',
        symbol: 'urBEAN3CRV',
        displayDecimals: 2,
        isUnripe: true,
      },
      {
        stalk: 1,
        seeds: 4,
      }
    );

    this.STALK = new BeanstalkToken(this.sdk, null, 10, {
      name: 'Stalk',
      symbol: 'STALK',
    });

    this.SEEDS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Seeds',
      symbol: 'SEED',
    });

    this.PODS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Pods',
      symbol: 'PODS',
    });

    this.SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Sprouts',
      symbol: 'SPROUT',
    });

    this.RINSABLE_SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Rinsable Sprouts',
      symbol: 'rSPROUT',
    });

    // TEMP
    // Keep the old BEAN_ETH and BEAN_LUSD tokens to let
    // the Pick dialog properly display pickable assets.
    this.BEAN_ETH_UNIV2_LP = new ERC20Token(
      this.sdk,
      addresses.BEAN_ETH_UNIV2_LP.get(this.sdk.chainId),
      18,
      {
        name: 'BEAN:ETH LP',
        symbol: 'BEAN:ETH',

        displayDecimals: 9,
        isLP: true,
      },
      {
        stalk: 1,
        seeds: 4,
      }
    );

    // create a map of address -> Token
    // this will help in the UI migration to SDK use
    this.map.set('eth', this.ETH);
    this.map.set(addresses.WETH.get(this.sdk.chainId), this.WETH);
    this.map.set(addresses.BEAN.get(this.sdk.chainId), this.BEAN);
    this.map.set(addresses.CRV3.get(this.sdk.chainId), this.CRV3);
    this.map.set(addresses.DAI.get(this.sdk.chainId), this.DAI);
    this.map.set(addresses.USDC.get(this.sdk.chainId), this.USDC);
    this.map.set(addresses.USDT.get(this.sdk.chainId), this.USDT);
    this.map.set(addresses.LUSD.get(this.sdk.chainId), this.LUSD);
    this.map.set(addresses.BEAN_CRV3.get(this.sdk.chainId), this.BEAN_CRV3_LP);
    this.map.set(addresses.UNRIPE_BEAN.get(this.sdk.chainId), this.UNRIPE_BEAN);
    this.map.set(addresses.UNRIPE_BEAN_CRV3.get(this.sdk.chainId), this.UNRIPE_BEAN_CRV3);
    this.map.set('STALK', this.STALK);
    this.map.set('SEED', this.SEEDS);
    this.map.set('PODS', this.PODS);
    this.map.set('SPROUT', this.SPROUTS);
    this.map.set('rSPROUT', this.RINSABLE_SPROUTS);
    this.map.set(addresses.BEAN_ETH_UNIV2_LP.get(this.sdk.chainId), this.BEAN_ETH_UNIV2_LP);

    this.unripeTokens = new Set([this.UNRIPE_BEAN, this.UNRIPE_BEAN_CRV3]);
    this.unripeUnderlyingTokens = new Set([this.BEAN, this.BEAN_CRV3_LP]);
    this.siloWhitelist = new Set([this.BEAN, this.BEAN_CRV3_LP, this.UNRIPE_BEAN, this.UNRIPE_BEAN_CRV3]);
    this.erc20Tokens = new Set([...this.siloWhitelist, this.WETH, this.CRV3, this.DAI, this.USDC, this.USDT]);
    this.balanceTokens = new Set([this.ETH, ...this.erc20Tokens]);
    this.crv3Underlying = new Set([this.DAI, this.USDC, this.USDT]);
  }

  /**
   * Find a Token by address
   */
  findByAddress(address: string): Token | undefined {
    return this.map.get(address.toLowerCase());
  }

  _deriveAddress(value: string | Token) {
    return typeof value === 'string' ? value : value.address;
  }

  _balanceStructToTokenBalance(token: Token, result: TokenFacet.BalanceStructOutput) : TokenBalance {
    return {
      internal: token.stringifyToDecimal(result.internalBalance.toString()),
      external: token.stringifyToDecimal(result.externalBalance.toString()),
      total:    token.stringifyToDecimal(result.totalBalance.toString()),
    }
  }

  /**
   * Return a TokenBalance struct for a requested token.
   * Includes the Farmer's INTERNAL and EXTERNAL balance in one item.
   * This is the typical representation of balances within Beanstalk.
   */
  public async getBalance(
    _token: (string | Token),
    _account?: string,
  ) : Promise<TokenBalance> {
    const account = await this.sdk.getAccount(_account);
    const tokenAddress = this._deriveAddress(_token);
    const token = this.findByAddress(tokenAddress);

    // FIXME: use the ERC20 token contract directly to load decimals for parsing?
    if (!token) throw new Error(`Unknown token: ${tokenAddress}`);

    const balance = await this.sdk.contracts.beanstalk.getAllBalance(
      account,
      tokenAddress,
    );

    return this._balanceStructToTokenBalance(token, balance);
  }

  /**
   * Return a TokenBalance struct for each requested token.
   * Includes the Farmer's INTERNAL and EXTERNAL balance in one item.
   * This is the typical representation of balances within Beanstalk.
   */
  public async getBalances(
    _account?: string,
    _tokens?: (string | Token)[],
  ) : Promise<Map<Token, TokenBalance>> {
    const account = await this.sdk.getAccount(_account);
    const tokens = _tokens || Array.from(this.erc20Tokens);
    const tokenAddresses = tokens.map(this._deriveAddress);

    const balances = new Map<Token, TokenBalance>();
    const results = await this.sdk.contracts.beanstalk.getAllBalances(
      account,
      tokenAddresses,
    );

    results.forEach((result, index) => {
      const token = this.findByAddress(tokenAddresses[index]);
      
      // FIXME: use the ERC20 token contract directly to load decimals for parsing?
      if (!token) throw new Error(`Unknown token: ${tokenAddresses}`);

      balances.set(token, this._balanceStructToTokenBalance(token, result));
    })

    return balances;
  }
  
}
