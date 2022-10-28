import BigNumber from "bignumber.js";
import { Overrides } from "ethers";
import { Token } from "../classes/Token";
import { getSdk } from "../constants/generated-gql/graphql";
import { DepositTransferStruct } from "../constants/generated/Beanstalk/Root";
import { assert } from "../utils";
import { BeanstalkSDK } from "./BeanstalkSDK";
import { FarmToMode } from "./farm/types";
import { EIP712Domain, EIP712TypedData, SignedPermit } from "./permit";
import { DepositTokenPermitMessage, DepositTokensPermitMessage } from "./silo.utils";

type LengthOfArray<T extends readonly any[]> = number extends T["length"] ? never : T["length"]

type PermitFromLength<Length extends number> = 
  (Length extends 1
    ? EIP712TypedData<DepositTokenPermitMessage, EIP712Domain>
    : EIP712TypedData<DepositTokensPermitMessage, EIP712Domain>)
export class Root {
  static sdk : BeanstalkSDK;

  /** @DISCUSS this pattern */
  static address : string;

  constructor(sdk : BeanstalkSDK) {
    Root.sdk = sdk;
    Root.address = sdk.contracts.root.address;
  }

  /**
   * Mint ROOT tokens. The `Root.sol` contract supports Beanstalk's 
   * Deposit Transfer permits; this function unpacks a provided
   * signed permit into the proper argument slots.
   * 
   * @dev Passing _overrides directly as the last parameter
   * of a contract method seems to make ethers treat it like
   * a parameter for the contract call. Instead, we unpack and
   * thus pass an empty object for overrides if _overrides is undef.
   */
  async mint(
    _depositTransfers: DepositTransferStruct[],
    _destination: FarmToMode,
    _permit?: SignedPermit<DepositTokenPermitMessage | DepositTokensPermitMessage>,
    _overrides?: Overrides
  ) {
    if (_permit) {
      if ((_permit as SignedPermit<DepositTokenPermitMessage>).typedData.message.token) {
        let permit = _permit as SignedPermit<DepositTokenPermitMessage>;
        return Root.sdk.contracts.root.mintWithTokenPermit(
          _depositTransfers,
          _destination,
          permit.typedData.message.token,
          permit.typedData.message.value,
          permit.typedData.message.deadline,
          permit.split.v,
          permit.split.r,
          permit.split.s,
          { ..._overrides }
        );
      } else if ((_permit as SignedPermit<DepositTokensPermitMessage>).typedData.message.tokens) {
        let permit = _permit as SignedPermit<DepositTokensPermitMessage>;
        return Root.sdk.contracts.root.mintWithTokensPermit(
          _depositTransfers,
          _destination,
          permit.typedData.message.tokens,
          permit.typedData.message.values,
          permit.typedData.message.deadline,
          permit.split.v,
          permit.split.r,
          permit.split.s,
          { ..._overrides }
        );
      } else {
        throw new Error('Malformatted permit')
      }
    }

    return Root.sdk.contracts.root.mint(
      _depositTransfers,
      _destination,
      { ..._overrides }
    );
  }

  /**
   * Permit the ROOT contract to transfer the user's Deposits.
   * 
   * @fixme typescript strategy to clarify the return type based on
   * passage of n = 1 or n > 1
   */
  // async permit<
  //   T extends readonly Token[],
  //   A extends readonly BigNumber[],
  // > (
  //   _tokens: T,
  //   _amounts: A,
  // ) : Promise<PermitFromLength<LengthOfArray<T>>> {
  //   assert(_tokens.length === _amounts.length, "Root: tokens and amounts length mismatch");

  //   const tokens  = _tokens.map(t => t.address);
  //   const amounts = _amounts.map((bn, i) => _tokens[i].stringify(bn));
  //   const account = await Root.sdk.getAccount();

  //   if (tokens.length === 1) {
  //     return Root.sdk.silo.permitDepositToken(
  //       account,
  //       Root.address,
  //       tokens[0],
  //       amounts[0],
  //     );
  //   }

  //   return Root.sdk.silo.permitDepositTokens(
  //     account,
  //     Root.address,
  //     tokens,
  //     amounts,
  //   );
  // }

}