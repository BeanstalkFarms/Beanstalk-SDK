import { Signer, VoidSigner } from "ethers";
// import { zeros } from "../utils";
import { BeanstalkSDK } from "./BeanstalkSDK";

/// EIP-712: "Typed structured data hashing and signing"
/// https://eips.ethereum.org/EIPS/eip-712
export type EIP712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/// EIP-2612: EIP-20 Permit Extension: Signed Approvals
/// https://eips.ethereum.org/EIPS/eip-2612
/// @note applies EIP-712 signatures to tokens that adhere to EIP-20.
export type EIP2612PermitMessage = {
  owner: string;
  spender: string;
  value: number | string;
  nonce: number | string;
  deadline: number | string;
  // owner: string;
  // spender: string;
  // token: string;
  // value: string;
  // nonce: string;
  // deadline: string;
}

export interface RSV {
  r: string;
  s: string;
  v: number;
}

export type ERC2612TypedData = {
  types: {
    EIP712Domain: typeof Permit.EIP712_DOMAIN;
    Permit: ({ name: string; type: string; })[]
  };
  primaryType: string;
  domain: any;
  message: any;
}

/**
 * https://github.com/dmihal/eth-permit/blob/master/src/eth-permit.ts
 */
export class Permit {
  static sdk : BeanstalkSDK;

  static MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

  static NONCES_FN = '0x7ecebe00';

  static EIP712_DOMAIN = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ] as const;

  /// 
  constructor(sdk: BeanstalkSDK) {
    Permit.sdk = sdk;
  }

  //////////////////////// Utilities ////////////////////////

  /**
   * https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/rpc.ts#L52
   */
  static signatureToRSV(signature: string) : RSV {
    const r = "0x" + signature.substring(2).substring(0, 64);
    const s = "0x" + signature.substring(2).substring(64, 128);
    const v = parseInt(signature.substring(2).substring(128, 130), 16);
    return { r, s, v };
  }

  /**
   * https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/eth-permit.ts#L85
   */
  async getERC2612Domain(
    _tokenOrDomain: string | EIP712Domain
  ): Promise<EIP712Domain> {
    if (typeof _tokenOrDomain !== 'string') {
      return _tokenOrDomain as EIP712Domain;
    }
  
    const tokenAddress = _tokenOrDomain as string;
    const token = Permit.sdk.tokens.findByAddress(tokenAddress);
  
    const [name, chainId] = await Promise.all([
      // FIXME: assumes that token.name === token.name() on-chain
      token ? token.name : Permit.sdk.tokens.getName(tokenAddress),
      Permit.sdk.provider.getNetwork().then((network) => network.chainId),
    ]);
  
    return {
      name,
      version: '1',
      chainId,
      verifyingContract: tokenAddress
    };
  };
  
  //////////////////////// Sign Typed Data ////////////////////////

  /**
   * Request a signature for arbitrary typed data.
   * @ref https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/rpc.ts#L73
   */
  public async sign(
    owner: string,
    typedData: any
  ) : Promise<{ rawSignature: string; split: RSV; }> {
    const signerAddress = await Permit.sdk.getAccount();

    if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
      throw new Error("Signer address does not match requested signing address");
    }
  
    // FIXME: signer currently doesn't expose signTypedData
    // https://docs.ethers.io/v5/api/signer/#Signer-signTypedData
    const signer = Permit.sdk.signer! as unknown as (VoidSigner & { signTypedData?: any });

    const { 
      EIP712Domain: _unused, 
      ...types 
    } = typedData.types;

    // Shim in case of method renaming.
    const rawSignature = await (signer.signTypedData
      ? signer.signTypedData(typedData.domain, types, typedData.message)
      : signer._signTypedData(typedData.domain, types, typedData.message));
  
    return {
      rawSignature,
      split: Permit.signatureToRSV(rawSignature),
    };
  }

  //////////////////////// PERMIT: ERC-2612 (for ERC-20 tokens) ////////////////////////

  /**
   * https://github.com/dmihal/eth-permit/blob/34f3fb59f0e32d8c19933184f5a7121ee125d0a5/src/eth-permit.ts#L126
   * 
   * @fixme should this be in `tokens.ts`?
   * @fixme does the order of keys in `message` matter? if not we could make an abstraction here
   */
  // public async signERC2612(
  //   addressOrDomain: string | EIP712Domain,
  //   owner: string,
  //   spender: string,
  //   value: string | number, // FIXME: included default on eth-permit
  //   deadline?: number,      // FIXME: is MAX_UINT256 an appropriate default?
  //   _nonce?: number,
  // ) {
  //   const tokenAddress = (addressOrDomain as EIP712Domain).verifyingContract || addressOrDomain as string;
  //   const nonce = _nonce ?? await Permit.sdk.provider.call({
  //     to: tokenAddress,
  //     // data: `${Permit.NONCES_FN}${zeros(24)}${owner.substr(2)}`,
  //   });

  //   const message: EIP2612PermitMessage = {
  //     owner,
  //     spender,
  //     value,
  //     nonce,
  //     deadline: deadline || Permit.MAX_UINT256,
  //   };

  //   const domain = await this.getERC2612Domain(addressOrDomain);
  //   const typedData = this._createTypedERC2612Data(message, domain);
  //   const sig = await this.sign(owner, typedData);

  //   return { ...sig, ...message };
  // }

  // private _createTypedERC2612Data = (message: EIP2612PermitMessage, domain: EIP712Domain) => ({
  //   types: {
  //     EIP712Domain: Permit.EIP712_DOMAIN,
  //     Permit: [
  //       { name: "owner", type: "address" },
  //       { name: "spender", type: "address" },
  //       { name: "value", type: "uint256" },
  //       { name: "nonce", type: "uint256" },
  //       { name: "deadline", type: "uint256" },
  //     ],
  //   },
  //   primaryType: "Permit",
  //   domain,
  //   message,
  // })
}