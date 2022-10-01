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
  CurveZap
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
  private sdk: BeanstalkSDK;
  public beanstalk: Beanstalk;

  public curve: CurveContracts;

  // private chain: string;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;

    // Addressses
    
    const beanstalkAddress = sdk.addresses.BEANSTALK.get(this.sdk.chainId)
    const pool3Address= sdk.addresses.POOL3.get(this.sdk.chainId);
    const tricrypto2Address= sdk.addresses.TRICRYPTO2.get(this.sdk.chainId);
    const beancrv3Address= sdk.addresses.BEAN_CRV3.get(this.sdk.chainId);
    const poolRegistryAddress= sdk.addresses.POOL_REGISTRY.get(this.sdk.chainId);
    const metaFactoryAddress= sdk.addresses.META_FACTORY.get(this.sdk.chainId);
    const cryptoFactoryAddress= sdk.addresses.CRYPTO_FACTORY.get(this.sdk.chainId);
    const zapAddress= sdk.addresses.CURVE_ZAP.get(this.sdk.chainId);

    // Instances
    this.beanstalk = Beanstalk__factory.connect(beanstalkAddress, this.sdk.providerOrSigner);
    const pool3 = Curve3Pool__factory.connect(pool3Address, this.sdk.providerOrSigner);
    const tricrypto2 = CurveTriCrypto2Pool__factory.connect(tricrypto2Address, this.sdk.providerOrSigner);
    const beanCrv3 = CurveMetaPool__factory.connect(beancrv3Address, this.sdk.providerOrSigner);
    const poolRegistry = CurveRegistry__factory.connect(poolRegistryAddress, this.sdk.providerOrSigner);
    const metaFactory = CurveMetaFactory__factory.connect(metaFactoryAddress, this.sdk.providerOrSigner);
    const cryptoFactory = CurveCryptoFactory__factory.connect(cryptoFactoryAddress, this.sdk.providerOrSigner);
    const zap = CurveZap__factory.connect(zapAddress, this.sdk.providerOrSigner);

    this.curve = {
      pools: {
        pool3,
        [pool3Address]: pool3,
        tricrypto2,
        [tricrypto2Address]: tricrypto2,
        beanCrv3,
        [beancrv3Address]: beanCrv3,
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
