# Beanstalk SDK

This is a live, wip, design-doc/documentation of the Beanstalk SDK. It should be tweaked to just docs before releasing the SDK

## Library Exports

The following objects are available for import from the library:

```javascript
import {
  BeanstalkSDK,
  Utils,

  // classes & types
  ChainID, // ENUM of chain types
  NativeToken,
  ERC20Token,
  BeanstalkToken,
  Address
} from '@beanstalk/sdk';
```

TODO: add types and root classes (Token, Address, etc..) to export

## Using the SDK

Create an instance

```javascript
import { BeanstalkSDK } from '@beanstalk/sdk';

const sdk = new BeanstalkSDK(options);
```

SDK contructor options:

```javascript
const options = {
  // etherjs Signer. Optional
  signer,

  // etherjs Provider. Optional
  provider,

  // rpcUrl
  rpcUrl,

  // bool, print debug output. default `false`
  DEBUG,
};
```

- `options` object is optional. If ommited, SDK will use an `ethers.getDefaultProvider()`
- If `rpcUrl` is provided, SDK will use a `WebSocketProvider` or `JsonRpcProvider`, depending on the protocol in the url (`ws` vs `http`)
- If `signer` is provided, `sdk.provider` will be set to `signer.provider`


## SDK properties and methods

- `sdk.chainId` - (type [ChainID](./ChainId.md#chainid)) is inferred from `sdk.provider.network.chainId` or defaults to `1`
- `sdk.addresses` - common [Addresses](#addresses) for contracts and tokens.
- `sdk.contracts` - all [Contracts](#contracts) used by Beanstalk
- `sdk.tokens` - all [Tokens](#tokens) used by Beanstalk
- `sdk.swap` - all functionality needed to perform [Swaps](#Swap)

TODO:
- `sdk.balances` - retrieve various [Balances](#balances)
- `sdk.silo` - all funtionality needed to interact with the [Silo](#silo)
- `sdk.farm` - Handle `farm()` mechanics in a nice way [Farm](#farm)

TBD:
- `sdk.field` - all funtionality needed to interact with the [Field](#field)
- `sdk.barn` - all funtionality needed to interact with the [Barn](#barn)
- `sdk.market` - all funtionality needed to interact with the [Market](#market)

## Addresses

The `sdk.addresses` object contains accessors to get chain addresses for various contracts and tokens. Each property is of type [Address](./Address.md).

```javascript
const addresses: {
    BEANSTALK: Address;
    BEANSTALK_PRICE: Address;
    BEANSTALK_FERTILIZER: Address;
    BARNRAISE_CUSTODIAN: Address;
    BEANFT_GENESIS: Address;
    BEANFT_WINTER_ADDRESSES: Address;
    BEAN: Address;
    UNRIPE_BEAN: Address;
    UNRIPE_BEAN_CRV3: Address;
    WETH: Address;
    DAI: Address;
    USDC: Address;
    USDT: Address;
    CRV3: Address;
    LUSD: Address;
    BEAN_CRV3: Address;
    POOL3: Address;
    TRICRYPTO2: Address;
    POOL_REGISTRY: Address;
    META_FACTORY: Address;
    CRYPTO_FACTORY: Address;
    CURVE_ZAP: Address;
    BEAN_ETH_UNIV2_LP: Address;
    BEAN_LUSD_LP: Address;
}
```

Example of getting an address on the currently connected chain.

**Note** - Address objects are not 'connected' to the SDK (sdk object is not dependency-injected) so they are not aware what the current chainId is. If you do not specify a chainId to the .get() method, you will get the MAINNET address by default, NOT the SDK's currently connected chain.

```javascript
const address = sdk.addresses.BEANSTALK.get(); // get MAINNET address
const address = sdk.addresses.BEANSTALK.get(sdk.chainId); // get address of chain that SDK is connected to
```

## Contracts

The `sdk.contracts` object contains references to all contacts used by Beanstalk. The shape of this property is simply how the contracts are organized for ease of use and discoverability.

- contracts are an `etherjs` contracted generated from typechain files using the `Name__factory.connect()` mechanism.
- contracts are already connected to `sdk.chainId`, ready to run.

Example:

```javascript
const balance = await sdk.contracts.beanstalk.balanceOfEarnedBeans(account);
```

Available contracts:

```javascript
sdk.contracts = {
  beanstalk: Beanstalk,
  curve: {
    pools: {
      pool3: Curve3Pool,
      tricrypto2: CurveTriCrypto2Pool,
      beanCrv3: CurveMetaPool,
      [k: string]: BaseContract   // allows getting a contract by address
    },
    registries: {
      poolRegistry: CurveRegistry,
      metaFactory: CurveMetaFactory,
      cryptoFactory: CurveCryptoFactory,
      [k: string]: BaseContract,  // allows getting a contract by address
    },
    zap: CurveZap,
  },
};
```

## Tokens

`sdk.tokens` object contains accessors to all supported tokens in Beanstalk. Each token is of type [Token](./Token.md)

```javascript
await sdk.tokens.BEAN.getBalance(account);
```

## Swaps

Peform token swaps.

- `sdk.swap.estimate()` - get an estimate for a swap
- `sdk.swap.execute()` - execute an estimate

```javascript
// TODO - we should be able to get this from Token obj
// sdk.tokeks.ETH.parseHuman('90')
const amountIn = ethers.utils.parseUnits('90', 18);
const tokenIn = sdk.tokens.ETH;
const tokenOut = sdk.tokens.BEAN;
const fromMode = '0';
const toMode = '0';

const est = await sdk.swap.estimate(true, amountIn, account, tokenIn, tokenOut, fromMode, toMode);

// this is ugly. TODO
console.log(`Est $BEAN: ${tokenOut.stringifyToDecimal(est.amountOut).toString()}`);

await sdk.swap.execute(est, 0.1);
```

## Balances
TODO

```javascript
sdk.balances.getStalk()
sdk.balances.getSeeds()
sdk.balances.getPods()
sdk.balances.getSprouts()

sdk.balances.getAll()
// {
//   deposited: { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150},
//   withdrawn: { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150},
//   claimable: { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150},
//   farm: { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150},
//   circulating: { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150},
// }

sdk.balances.getDeposited()
//  { BEAN: 100, BEAN3CRV: 50, urBEAN: 0, urBEAN3CRV: 0, total: 150}
sdk.balances.getWithdraw()
sdk.balances.getClaimable()
sdk.balances.getFarm()
sdk.balances.getCirculating()

```

## Silo

TODO
```javascript
  sdk.silo.deposit()
  sdk.silo.getDeposits()
  sdk.silo.convert()
  sdk.silo.transfer()
  sdk.silo.withdraw()
  sdk.silo.getWithdrawals()
  sdk.silo.claim()
```

## Farm
TODO

```javascript
  const workflow =  new sdk.farm.WorkflowBuilder()
  workflow.addStep(workflow.library.swapETH_TO_BEAN(...))

  // or more manuall
  workflow.addStep(workflow.library.swapWETH_TO_USDT(...))
  workflow.addStep(workflow.library.swapUSDT_TO_BEAN(...))

  // or lowest level
  workflow.addStep(workflow.library.exchange(...))
  workflow.addStep(workflow.library.exchangeUnderlying(...))

  workflow.addStep(workflow.library.deposit(...))

  const estimate = await workflow.estimate()
  const tx = await workflow.execute();
```
The SDK could also provide a library of pre-build workflows
```javascript

  // swap ETH to WETH
  // swap WETH to USDT
  // addLiquidity(USDT)
  // deposit LP in silo
  const tx = await sdk.farm.workflowLibrary.ETH_TO_SILOLP(...)

  // and some of these can be exposed at a higher level:
  const tx = await sdk.silo.depositLPFromToken(token, amountIn)

```

## Field

TBD

```javascript
sdk.field.getAvailableSoil()
sdk.field.getTemperature()
sdk.field.getPodline()
sdk.field.podsHarvested()

sdk.field.sow()
sdk.field.transfer()
sdk.field.harvest()

sdk.getPlots()

```

## Barn
TBD

## Market
TBD

