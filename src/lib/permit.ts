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
export type EIP712PermitMessage<
  D extends {} = { value: number | string; }
> = ({
  owner: string;
  spender: string;
} & D & {
  nonce: number | string;
  deadline: number | string;
});

export type EIP2612PermitMessage = EIP712PermitMessage; // use default value for D
export interface RSV {
  r: string;
  s: string;
  v: number;
}

//
export type EIP712TypedData<
  Domain extends any = any, 
  Message extends EIP712PermitMessage = any
> = {
  types: {
    EIP712Domain: typeof Permit.EIP712_DOMAIN;
    Permit: ({ name: string; type: string; })[]
  };
  primaryType: string;
  domain: Domain;
  message: Message;
}

export type SignablePermitData<
  Message extends EIP2612PermitMessage = EIP2612PermitMessage
> = {
  owner: string;
  message: Message;
  typedData: EIP712TypedData;
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
}