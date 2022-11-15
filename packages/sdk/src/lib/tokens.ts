import { addresses, ZERO_BN } from "src/constants";
import { Token, BeanstalkToken, ERC20Token, NativeToken } from "src/classes/Token";
import { BeanstalkSDK } from "./BeanstalkSDK";
import { DaiPermitMessage, EIP2612PermitMessage, EIP712Domain, EIP712TypedData, Permit } from "./permit";
import { TokenValue } from "src/classes/TokenValue";
import { BigNumber } from "ethers";

export type TokenBalance = {
  internal: TokenValue;
  external: TokenValue;
  total: TokenValue;
};

export class Tokens {
  private sdk: BeanstalkSDK;
  public readonly ETH: NativeToken;
  public readonly WETH: ERC20Token;
  public readonly BEAN: ERC20Token;
  public readonly ROOT: ERC20Token;
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

    ////////// Ethereum //////////

    this.ETH = new NativeToken(this.sdk, null, 18, {
      name: "Ether",
      symbol: "ETH",
      displayDecimals: 4
    });

    this.WETH = new ERC20Token(this.sdk, addresses.WETH.get(this.sdk.chainId), 18, {
      name: "Wrapped Ether",
      symbol: "WETH"
    });

    this.map.set("eth", this.ETH);
    this.map.set(addresses.WETH.get(this.sdk.chainId), this.WETH);

    ////////// Beanstalk //////////

    this.STALK = new BeanstalkToken(this.sdk, null, 10, {
      name: "Stalk",
      symbol: "STALK"
    });

    this.SEEDS = new BeanstalkToken(this.sdk, null, 6, {
      name: "Seeds",
      symbol: "SEED"
    });

    this.BEAN = new ERC20Token(
      this.sdk,
      addresses.BEAN.get(this.sdk.chainId),
      6,
      {
        name: "Bean",
        displayName: "Bean",
        symbol: "BEAN"
      },
      {
        stalk: this.STALK.amount(1),
        seeds: this.SEEDS.amount(2)
      }
    );

    this.BEAN_CRV3_LP = new ERC20Token(
      this.sdk,
      addresses.BEAN_CRV3.get(this.sdk.chainId),
      18,
      {
        name: "Curve.fi Factory USD Metapool: Bean", // see .name()
        displayName: "BEAN:3CRV LP",
        symbol: "BEAN3CRV",
        isLP: true,
        color: "#DFB385"
      },
      {
        stalk: this.STALK.amount(1),
        seeds: this.SEEDS.amount(4)
      }
    );

    this.UNRIPE_BEAN = new ERC20Token(
      this.sdk,
      addresses.UNRIPE_BEAN.get(this.sdk.chainId),
      6,
      {
        name: "Unripe Bean", // see `.name()`
        displayName: "Unripe Bean",
        symbol: "urBEAN",
        displayDecimals: 2,
        isUnripe: true
      },
      {
        stalk: this.STALK.amount(1),
        seeds: this.SEEDS.amount(2)
      }
    );

    this.UNRIPE_BEAN_CRV3 = new ERC20Token(
      this.sdk,
      addresses.UNRIPE_BEAN_CRV3.get(this.sdk.chainId),
      6,
      {
        name: "Unripe BEAN3CRV", // see `.name()`
        displayName: "Unripe BEAN:3CRV LP",
        symbol: "urBEAN3CRV",
        displayDecimals: 2,
        isUnripe: true
      },
      {
        stalk: this.STALK.amount(1),
        seeds: this.SEEDS.amount(4)
      }
    );

    this.map.set(addresses.BEAN.get(this.sdk.chainId), this.BEAN);
    this.map.set(addresses.BEAN_CRV3.get(this.sdk.chainId), this.BEAN_CRV3_LP);
    this.map.set(addresses.UNRIPE_BEAN.get(this.sdk.chainId), this.UNRIPE_BEAN);
    this.map.set(addresses.UNRIPE_BEAN_CRV3.get(this.sdk.chainId), this.UNRIPE_BEAN_CRV3);

    ////////// Beanstalk "Tokens" (non ERC-20) //////////

    this.PODS = new BeanstalkToken(this.sdk, null, 6, {
      name: "Pods",
      symbol: "PODS"
    });

    this.SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: "Sprouts",
      symbol: "SPROUT"
    });

    this.RINSABLE_SPROUTS = new BeanstalkToken(this.sdk, null, 6, {
      name: "Rinsable Sprouts",
      symbol: "rSPROUT"
    });

    this.map.set("STALK", this.STALK);
    this.map.set("SEED", this.SEEDS);
    this.map.set("PODS", this.PODS);
    this.map.set("SPROUT", this.SPROUTS);
    this.map.set("rSPROUT", this.RINSABLE_SPROUTS);

    ////////// Beanstalk Ecosystem Tokens //////////

    this.ROOT = new ERC20Token(this.sdk, addresses.ROOT.get(this.sdk.chainId), 18, {
      name: "Root",
      symbol: "ROOT"
    });

    this.map.set(addresses.ROOT.get(this.sdk.chainId), this.ROOT);

    ////////// Common ERC-20 Tokens //////////

    this.CRV3 = new ERC20Token(this.sdk, addresses.CRV3.get(this.sdk.chainId), 18, {
      name: "3CRV",
      symbol: "3CRV",
      isLP: true
    });

    this.DAI = new ERC20Token(this.sdk, addresses.DAI.get(this.sdk.chainId), 18, {
      name: "Dai",
      symbol: "DAI"
    });

    this.USDC = new ERC20Token(this.sdk, addresses.USDC.get(this.sdk.chainId), 6, {
      name: "USD Coin",
      symbol: "USDC"
    });

    this.USDT = new ERC20Token(this.sdk, addresses.USDT.get(this.sdk.chainId), 6, {
      name: "Tether",
      symbol: "USDT"
    });

    this.LUSD = new ERC20Token(this.sdk, addresses.LUSD.get(this.sdk.chainId), 6, {
      name: "LUSD",
      symbol: "LUSD"
    });

    this.map.set(addresses.CRV3.get(this.sdk.chainId), this.CRV3);
    this.map.set(addresses.DAI.get(this.sdk.chainId), this.DAI);
    this.map.set(addresses.USDC.get(this.sdk.chainId), this.USDC);
    this.map.set(addresses.USDT.get(this.sdk.chainId), this.USDT);
    this.map.set(addresses.LUSD.get(this.sdk.chainId), this.LUSD);

    ////////// Legacy //////////

    // Keep the old BEAN_ETH and BEAN_LUSD tokens to let
    // the Pick dialog properly display pickable assets.
    this.BEAN_ETH_UNIV2_LP = new ERC20Token(
      this.sdk,
      addresses.BEAN_ETH_UNIV2_LP.get(this.sdk.chainId),
      18,
      {
        name: "BEAN:ETH LP",
        symbol: "BEAN:ETH",

        displayDecimals: 9,
        isLP: true
      },
      {
        stalk: this.STALK.amount(1),
        seeds: this.SEEDS.amount(4)
      }
    );

    this.map.set(addresses.BEAN_ETH_UNIV2_LP.get(this.sdk.chainId), this.BEAN_ETH_UNIV2_LP);

    ////////// Groups //////////

    this.unripeTokens = new Set([this.UNRIPE_BEAN, this.UNRIPE_BEAN_CRV3]);
    this.unripeUnderlyingTokens = new Set([this.BEAN, this.BEAN_CRV3_LP]);
    this.siloWhitelist = new Set([this.BEAN, this.BEAN_CRV3_LP, this.UNRIPE_BEAN, this.UNRIPE_BEAN_CRV3]);
    this.erc20Tokens = new Set([...this.siloWhitelist, this.WETH, this.CRV3, this.DAI, this.USDC, this.USDT]);
    this.balanceTokens = new Set([this.ETH, ...this.erc20Tokens]);
    this.crv3Underlying = new Set([this.DAI, this.USDC, this.USDT]);
  }

  getMap(): Readonly<Map<string, Token>> {
    return Object.freeze(new Map(this.map));
  }

  /**
   * Find a Token by address
   */
  findByAddress(address: string): Token | undefined {
    return this.map.get(address.toLowerCase());
  }

  /**
   * Destruct a string (address) | Token => address
   */
  private deriveAddress(value: string | Token) {
    return typeof value === "string" ? value : value.address;
  }

  /**
   * Destruct a string (address) | Token => [Token, address]
   * Fails if `this.map` doesn't contain the Token.
   */
  private deriveToken(value: string | Token): [Token, string] {
    if (typeof value === "string") {
      const _token = this.findByAddress(value);
      if (!_token) throw new Error(`Unknown token: ${value}`);
      return [_token, value];
    }
    return [value, value.address];
  }

  /**
   * Convert TokenFacet.BalanceStructOutput to a TokenBalance.
   */
  private makeTokenBalance(
    token: Token,
    result: {
      internalBalance: BigNumber;
      externalBalance: BigNumber;
      totalBalance: BigNumber;
    }
  ): TokenBalance {
    return {
      internal: token.fromBlockchain(result.internalBalance),
      external: token.fromBlockchain(result.externalBalance),
      total: token.fromBlockchain(result.totalBalance)
    };
  }

  /**
   * Return a TokenBalance for a requested token.
   * Includes the Farmer's INTERNAL and EXTERNAL balance in one item.
   * This is the typical representation of balances within Beanstalk.
   */
  public async getBalance(_token: string | Token, _account?: string): Promise<TokenBalance> {
    const account = await this.sdk.getAccount(_account);

    // ETH cannot be stored in the INTERNAL balance.
    // Here we use the native getBalance() method and cast to a TokenBalance.
    if (_token === this.ETH) {
      const balance = await this.sdk.provider.getBalance(account);
      return this.makeTokenBalance(_token, {
        internalBalance: ZERO_BN,
        externalBalance: balance,
        totalBalance: balance
      });
    }

    // FIXME: use the ERC20 token contract directly to load decimals for parsing?
    const [token, tokenAddress] = this.deriveToken(_token);

    const balance = await this.sdk.contracts.beanstalk.getAllBalance(account, tokenAddress);

    return this.makeTokenBalance(token, balance);
  }

  /**
   * Return a TokenBalance struct for each requested token.
   * Includes the Farmer's INTERNAL and EXTERNAL balance in one item.
   * This is the typical representation of balances within Beanstalk.
   *
   * @todo discuss parameter inversion between getBalance() and getBalances().
   */
  public async getBalances(_account?: string, _tokens?: (string | Token)[]): Promise<Map<Token, TokenBalance>> {
    const account = await this.sdk.getAccount(_account);
    const tokens = _tokens || Array.from(this.erc20Tokens); // is this a good default?
    const tokenAddresses = tokens.map(this.deriveAddress);

    // FIXME: only allow ERC20 tokens with getBalance() method, or
    // override if token is NativeToken
    const balances = new Map<Token, TokenBalance>();
    const results = await this.sdk.contracts.beanstalk.getAllBalances(account, tokenAddresses);

    results.forEach((result, index) => {
      const token = this.findByAddress(tokenAddresses[index]);

      // FIXME: use the ERC20 token contract directly to load decimals for parsing?
      if (!token) throw new Error(`Unknown token: ${tokenAddresses}`);

      balances.set(token, this.makeTokenBalance(token, result));
    });

    return balances;
  }

  //////////////////////// Permit Data ////////////////////////

  /**
   * Create the domain for an particular ERC-2636 signature.
   * Look up the name of an ERC-20 token for signing.
   *
   * @ref https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/eth-permit.ts#L85
   */
  private async getEIP712DomainForToken(token: ERC20Token): Promise<EIP712Domain> {
    const [name, chainId] = await Promise.all([token.getName(), this.sdk.provider.getNetwork().then((network) => network.chainId)]);
    return {
      name,
      version: "1",
      chainId,
      verifyingContract: token.address
    };
  }

  //////////////////////// PERMIT: ERC-2612 (for other ERC-20 tokens) ////////////////////////

  /**
   * Sign a permit for an arbitrary ERC-20 token. This allows `spender` to use `value`
   * of `owner`'s `token`.
   *
   * @fixme should this be in `tokens.ts`?
   * @fixme does the order of keys in `message` matter? if not we could make an abstraction here
   * @fixme `permitERC2612` -> `getERC20Permit`?
   *
   * @ref https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/eth-permit.ts#L126
   * @param token a Token instance representing an ERC20 token to permit
   * @param owner
   * @param spender authorize this account to spend `token` on behalf of `owner`
   * @param value the amount of `token` to authorize
   * @param _nonce
   * @param _deadline
   */
  public async permitERC2612(
    owner: string, //
    spender: string,
    token: ERC20Token,
    value: string | number, // FIXME: included default on eth-permit, see @ref
    _nonce?: number, //
    _deadline?: number // FIXME: is MAX_UINT256 an appropriate default?
  ): Promise<EIP712TypedData<EIP2612PermitMessage>> {
    const deadline = _deadline || Permit.MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      this.getEIP712DomainForToken(token),
      // @ts-ignore FIXME
      token
        .getContract()
        .nonces(owner)
        .then((r) => r.toString())
    ]);

    return this.createTypedERC2612Data(domain, {
      owner,
      spender,
      value,
      nonce,
      deadline
    });
  }

  private createTypedERC2612Data = (domain: EIP712Domain, message: EIP2612PermitMessage) => ({
    types: {
      EIP712Domain: Permit.EIP712_DOMAIN,
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    },
    primaryType: "Permit",
    domain,
    message
  });

  public async permitDAI(
    holder: string,
    spender: string,
    token: ERC20Token,
    _nonce?: number,
    _expiry?: number
  ): Promise<EIP712TypedData<DaiPermitMessage>> {
    const expiry = _expiry || Permit.MAX_UINT256;
    const [domain, nonce] = await Promise.all([
      this.getEIP712DomainForToken(token),
      // @ts-ignore FIXME
      token
        .getContract()
        .nonces(holder)
        .then((r) => r.toNumber())
    ]);

    return this.createTypedDAIData(domain, {
      holder,
      spender,
      nonce,
      expiry,
      allowed: true
    });
  }

  private createTypedDAIData = (domain: EIP712Domain, message: DaiPermitMessage) => ({
    types: {
      EIP712Domain: Permit.EIP712_DOMAIN,
      Permit: [
        { name: "holder", type: "address" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "allowed", type: "bool" }
      ]
    },
    primaryType: "Permit",
    domain,
    message
  });
}
