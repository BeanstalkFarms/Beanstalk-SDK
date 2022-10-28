import { parseUnits, trim } from './utils';
import { BeanNumber } from './BeanNumber';
import { BigNumber, BigNumberish, utils } from 'ethers';

declare module './BeanNumber' {
  // Use this block for adding instance methos
  interface BeanNumber {
    toHuman(decimals: number): string;
    display(decimals: number, allowNegative?: boolean): string;
    displayFull(maxDecimals?: number, minDecimals?: number): string;
    trimDecimals(allowNegative?: boolean): BeanNumber;
    trim(numberString: string, decimals: number): BeanNumber;
  }

  // Use this block for adding static methos
  namespace BeanNumber {
    let fromHuman: (value: string, decimals: number) => BeanNumber;
    let fromBigNumber: (bn: BigNumber, decimals?: number) => BeanNumber;
  }
}

BeanNumber.fromBigNumber = function(bn: BigNumber, decimals?: number): BeanNumber {
  console.log(decimals);
  const n = BeanNumber.from(bn);
  if (decimals) n.decimals = decimals;

  return n;
};

BeanNumber.fromHuman = function(value: string, decimals: number) {
  if (!value) {
    throw new Error('Must provide value to BigNumber.fromHuman(value,decimals)');
  }
  if (!decimals) {
    throw new Error('Must provide decimals to BigNumber.fromHuman(value,decimals)');
  }
  let [int, safeDecimals] = value.split('.');

  if (safeDecimals && safeDecimals.length > decimals) {
    safeDecimals = safeDecimals.substring(0, decimals);
  }

  const safeValue = safeDecimals ? `${int}.${safeDecimals}` : int;
  const result = parseUnits(safeValue, decimals);

  return result;
};

BeanNumber.prototype.toHuman = function(decimals: number): string {
  return utils.formatUnits(this, decimals);
};



BeanNumber.prototype.display = function display(decimals: number, allowNegative: boolean = false): string {
  const fakeDiv = (_decimals: number, _divisor: number) => {
    const divisor = _divisor * 10 ** _decimals;
    const quotient = this.div(divisor);
    const remainder = this.mod(divisor);

    const result = `${quotient.toString()}.${remainder.toString()}`;
    return result;
  };

  if (this.lt(BeanNumber.from(0))) {
    return allowNegative ? `-${this.mul('-1').display(decimals)}` : '0';
  }
  if (this.eq(0)) {
    return '0';
  }
  if (this.lte(1e-8)) {
    return '<.00000001';
  }
  if (this.lte(1e-3)) {
    // FIXME add .toFixed()
    // return trim(this.toString(), 8).toFixed();
    return trim(this.toString(), 8).toString();
  }

  if (this.gte(1e12)) {
    return `${trim(fakeDiv(decimals, 1e12), 4)}T`; /* Trillions */
  }
  if (this.gte(1e9)) {
    return `${trim(fakeDiv(decimals, 1e9), 3)}B`; /* Billions */
  }
  if (this.gte(1e8)) {
    return `${trim(fakeDiv(decimals, 1e6), 2)}M`; /* Millions */
  }
  if (this.gte(1e6)) {
    return `${trim(fakeDiv(decimals, 1e6), 2)}M`; /* Millions */
  }
  if (this.gte(1e3)) {
    return `${this.displayFull(0)}`; /* Small Thousands */
  }

  const decimals2 = this.gt(10) ? 2 : this.gt(1) ? 3 : 4;
  // FIX ME, add .toFixed()
  // return trim(this.toString(), decimals2).toFixed();
  return trim(this.toString(), decimals2).toString();
};

BeanNumber.prototype.displayFull = function displayFull(maxDecimals: number = 18, minDecimals: number = 0) {
  return this.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};
