import { ethers } from 'ethers';
import { NEW_BeanNumber } from '../../constants';
import { BeanNumber } from '../../utils/BeanNumber';
import { Token } from './Token';

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
    return Promise.resolve(BeanNumber.from(ethers.constants.MaxUint256));
  }

  // eslint-disable-next-line class-methods-use-this
  public getTotalSupply() {
    return undefined;
  }
}
