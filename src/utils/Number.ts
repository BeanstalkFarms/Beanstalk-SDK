import { BigNumber as BigNumberEthers, BigNumberish } from 'ethers';
import { BigNumber } from 'bignumber.js';

export class Number {
  static toBigNumberJs(number: BigNumberish) {
    const b = BigNumberEthers.from(number);
    return new BigNumber(b.toString());
  }

  static toBigNumberEthers(number: BigNumber) {
    return BigNumberEthers.from(number.toString());
  }
}
