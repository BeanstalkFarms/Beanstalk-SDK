import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { MAX_UINT256 } from "../../constants";
import { BeanNumber } from "../../utils/BeanNumber";
import { Token } from "./Token";

export class NativeToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  public getBalance(account: string): Promise<BeanNumber> {
    // console.debug(`[NativeToken] ${this.symbol} (${this.chainId} / ${this.address}) -> getBalance(${account})`);
    return Token.sdk.provider.getBalance(account).then(
      // No need to convert decimals because ethers does this already
      (result) => BeanNumber.fromBigNumber(result, this.decimals)
    );
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance(): Promise<BeanNumber | undefined> {
    return Promise.resolve(BeanNumber.from(ethers.constants.MaxUint256));
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }

  public equals(other: NativeToken): boolean {
    return this.chainId === other.chainId;
  }
}
