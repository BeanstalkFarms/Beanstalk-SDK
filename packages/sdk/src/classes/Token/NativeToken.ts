import { ethers } from "ethers";
import { BigNumber } from "ethers";
import { Token } from "./Token";
import { TokenValue } from "../TokenValue";

export class NativeToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  public getBalance(account: string): Promise<TokenValue> {
    return Token.sdk.provider.getBalance(account)
    .then(result => TokenValue.from(result, this.decimals))
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance(): Promise<TokenValue | undefined> {
    return Promise.resolve(TokenValue.MAX_UINT256);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }

  public equals(other: NativeToken): boolean {
    return this.chainId === other.chainId;
  }
}
