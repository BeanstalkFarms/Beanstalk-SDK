import { BigNumber } from 'ethers';

declare module 'ethers' {
  interface BigNumber {
    hello(): void;
  }
}

BigNumber.prototype.hello = function() {
  console.log('fuck ', this.toString());
};
