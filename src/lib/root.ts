import { Overrides } from "ethers";
import { DepositTransferStruct } from "../constants/generated/Beanstalk/Root";
import { BeanstalkSDK } from "./BeanstalkSDK";
import { FarmToMode } from "./farm/types";
import { SignedPermit } from "./permit";
import { DepositTokenPermitMessage, DepositTokensPermitMessage } from "./silo.utils";

export class Root {
  static sdk : BeanstalkSDK;

  constructor(sdk : BeanstalkSDK) {
    Root.sdk = sdk;
  }

  /**
   * Mint ROOT tokens. The `Root.sol` contract supports Beanstalk's 
   * Deposit Transfer permits; this function unpacks a provided
   * signed permit into the proper argument slots.
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
          _overrides
        );
      } else if ((_permit.typedData.message as DepositTokensPermitMessage).tokens) {
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
          _overrides
        )
      } else {
        throw new Error('Malformatted permit')
      }
    }

    return Root.sdk.contracts.root.mint(
      _depositTransfers,
      _destination,
      _overrides
    )
  }

}