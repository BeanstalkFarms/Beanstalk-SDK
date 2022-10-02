import { addresses } from '../constants';
import Token, { BeanstalkToken, ERC20Token, NativeToken } from '../classes/Token';
import type { BeanstalkSDK } from './BeanstalkSDK';

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

  private map:Map<string, Token>

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
    this.map = new Map();

    this.ETH = new NativeToken(this.sdk, null, 18, {
      name: 'Ether',
      symbol: 'ETH',
      displayDecimals: 4,
    });
    this.map.set('native', this.ETH);

    this.WETH = new ERC20Token(this.sdk, addresses.WETH.get(this.sdk.chainId), 18, {
      name: 'Wrapped Ether',
      symbol: 'WETH',
    });
    this.map.set('WETH', this.WETH);

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
    this.map.set('BEAN', this.BEAN);

    this.CRV3 = new ERC20Token(this.sdk, addresses.CRV3.get(this.sdk.chainId), 18, {
      name: '3CRV',
      symbol: '3CRV',
      isLP: true,
    });
    this.map.set('CRV3', this.CRV3);

    this.DAI = new ERC20Token(this.sdk, addresses.DAI.get(this.sdk.chainId), 18, {
      name: 'Dai',
      symbol: 'DAI',
    });
    this.map.set('DAI', this.DAI);

    this.USDC = new ERC20Token(this.sdk, addresses.USDC.get(this.sdk.chainId), 6, {
      name: 'USD Coin',
      symbol: 'USDC',
    });
    this.map.set('USDC', this.USDC);

    this.USDT = new ERC20Token(this.sdk, addresses.USDT.get(this.sdk.chainId), 6, {
      name: 'Tether',
      symbol: 'USDT',
    });
    this.map.set('USDT', this.USDT);

    this.LUSD = new ERC20Token(this.sdk, addresses.LUSD.get(this.sdk.chainId), 6, {
      name: 'LUSD',
      symbol: 'LUSD',
    });
    this.map.set('LUSD', this.LUSD);

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
    this.map.set('BEAN_CRV3_LP', this.BEAN_CRV3_LP);

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
    this.map.set('UNRIPE_BEAN', this.UNRIPE_BEAN);

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
    this.map.set('UNRIPE_BEAN_CRV3', this.UNRIPE_BEAN_CRV3);

    this.STALK = new BeanstalkToken(this.sdk, null, 10, {
      name: 'Stalk',
      symbol: 'STALK',
    });
    this.map.set('STALK', this.STALK);

    this.SEEDS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Seeds',
      symbol: 'SEED',
    });
    this.map.set('SEEDS', this.SEEDS);

    this.PODS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Pods',
      symbol: 'PODS',
    });
    this.map.set('PODS', this.PODS);

    this.SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Sprouts',
      symbol: 'SPROUT',
    });
    this.map.set('SPROUTS', this.SPROUTS);

    this.RINSABLE_SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: 'Rinsable Sprouts',
      symbol: 'rSPROUT',
    });
    this.map.set('RINSABLE_SPROUTS', this.RINSABLE_SPROUTS);

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
    this.map.set('BEAN_ETH_UNIV2_LP', this.BEAN_ETH_UNIV2_LP);

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
  findByAddress(address:string):Token | undefined{
    return this.map.get(address)
  }
}
