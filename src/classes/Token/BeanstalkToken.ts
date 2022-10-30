import BigNumber from "bignumber.js";
import { MAX_UINT256, NEW_BeanNumber, NEW_BN } from "../../constants";
import { Token } from "./Token";

export class BeanstalkToken extends Token {
  // eslint-disable-next-line class-methods-use-this
  public getContract() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  public getBalance() {
    return Promise.resolve(NEW_BeanNumber);
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance() {
    return Promise.resolve(new BigNumber(parseInt(MAX_UINT256, 16)));
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }
}