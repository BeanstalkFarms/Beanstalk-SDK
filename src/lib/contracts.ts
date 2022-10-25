// import { BaseContract } from 'ethers';
import type { BeanstalkSDK } from './BeanstalkSDK';
// import { addresses, ChainID } from '../constants';
import {
  Curve3Pool__factory,
  CurveTriCrypto2Pool__factory,
  CurveMetaPool__factory,
  Beanstalk__factory,
  CurveCryptoFactory__factory,
  CurveMetaFactory__factory,
  CurveRegistry__factory,
  CurveZap__factory,
  Beanstalk,
  Curve3Pool,
  CurveCryptoFactory,
  CurveMetaFactory,
  CurveMetaPool,
  CurveRegistry,
  CurveTriCrypto2Pool,
  CurveZap,
  BeanstalkFertilizer__factory,
  CurvePlainPool__factory,
  Root,
  Root__factory,

} from '../constants/generated';
import { BaseContract } from 'ethers';

type CurveContracts = {
  pools: {
    pool3: Curve3Pool;
    tricrypto2: CurveTriCrypto2Pool;
    beanCrv3: CurveMetaPool;
    [k: string]: BaseContract;
  };
  registries: {
    poolRegistry: CurveRegistry;
    metaFactory: CurveMetaFactory;
    cryptoFactory: CurveCryptoFactory;
    [k: string]: BaseContract;
  };
  zap: CurveZap;
};

export class Contracts {
  static sdk: BeanstalkSDK;

  public readonly beanstalk: Beanstalk;
  public readonly root: Root;
  public readonly fertilizer: import("../constants/generated/index").BeanstalkFertilizer;

  public readonly curve: CurveContracts;

  // private chain: string;

  constructor(sdk: BeanstalkSDK) {
    Contracts.sdk = sdk;

    // Addressses
    const beanstalkAddress = sdk.addresses.BEANSTALK.get(sdk.chainId);
    const rootAddress = sdk.addresses.ROOT.get(sdk.chainId);
    const beanstalkFertilizerAddress = sdk.addresses.BEANSTALK_FERTILIZER.get(sdk.chainId);
    const pool3Address = sdk.addresses.POOL3.get(sdk.chainId);
    const tricrypto2Address = sdk.addresses.TRICRYPTO2.get(sdk.chainId);
    const beancrv3Address = sdk.addresses.BEAN_CRV3.get(sdk.chainId);
    const poolRegistryAddress = sdk.addresses.POOL_REGISTRY.get(sdk.chainId);
    const metaFactoryAddress = sdk.addresses.META_FACTORY.get(sdk.chainId);
    const cryptoFactoryAddress = sdk.addresses.CRYPTO_FACTORY.get(sdk.chainId);
    const zapAddress = sdk.addresses.CURVE_ZAP.get(sdk.chainId);

    // Instances
    this.beanstalk = Beanstalk__factory.connect(beanstalkAddress, sdk.providerOrSigner);
    this.root = Root__factory.connect(rootAddress, sdk.providerOrSigner);
    this.fertilizer = BeanstalkFertilizer__factory.connect(beanstalkFertilizerAddress, sdk.providerOrSigner);

    const pool3 = Curve3Pool__factory.connect(pool3Address, sdk.providerOrSigner);
    const tricrypto2 = CurveTriCrypto2Pool__factory.connect(tricrypto2Address, sdk.providerOrSigner);
    const beanCrv3 = CurveMetaPool__factory.connect(beancrv3Address, sdk.providerOrSigner);
    const poolRegistry = CurveRegistry__factory.connect(poolRegistryAddress, sdk.providerOrSigner);
    const metaFactory = CurveMetaFactory__factory.connect(metaFactoryAddress, sdk.providerOrSigner);
    const cryptoFactory = CurveCryptoFactory__factory.connect(cryptoFactoryAddress, sdk.providerOrSigner);
    const zap = CurveZap__factory.connect(zapAddress, sdk.providerOrSigner);

    this.curve = {
      pools: {
        pool3,
        [pool3Address]: pool3,
        tricrypto2,
        [tricrypto2Address]: tricrypto2,
        beanCrv3,
        [beancrv3Address]: beanCrv3
      },
      registries: {
        poolRegistry,
        [poolRegistryAddress]: poolRegistry,
        metaFactory,
        [metaFactoryAddress]: metaFactory,
        cryptoFactory,
        [cryptoFactoryAddress]: cryptoFactory,
      },
      zap
    };
  }
}
