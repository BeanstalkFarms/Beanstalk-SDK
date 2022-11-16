import { Token } from "./Token";
import { TokenValue } from "src/classes/TokenValue";
import { BigNumber } from "ethers";

export class BeanstalkToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  public getBalance() {
    return Promise.resolve(TokenValue.NEGATIVE_ONE);
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance() {
    return Promise.resolve(TokenValue.MAX_UINT256);
  }

  public hasEnoughAllowance(): boolean {
    return false; // FIXME
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }
}
