import { Logger } from '@ethersproject/logger';
import { BigNumberish, BigNumber } from 'ethers';
import { BeanNumber } from './BeanNumber';

const logger = new Logger('BeanNumber');

const names = ['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney', 'ether'];

let zeros = '0';
while (zeros.length < 256) {
  zeros += zeros;
}
const NegativeOne = BigNumber.from(-1);

export const parseUnits = (value: string, unitName?: BigNumberish): BeanNumber => {
  if (typeof value !== 'string') {
    logger.throwArgumentError('value must be a string', 'value', value);
  }
  if (typeof unitName === 'string') {
    const index = names.indexOf(unitName);
    if (index !== -1) {
      unitName = 3 * index;
    }
  }
  return parseFixed(value, unitName != null ? unitName : 18);
};

function throwFault(message: string, fault: string, operation: string, value?: any): never {
  const params: any = { fault: fault, operation: operation };
  if (value !== undefined) {
    params.value = value;
  }
  return logger.throwError(message, Logger.errors.NUMERIC_FAULT, params);
}

function getMultiplier(decimals: BigNumberish): string {
  if (typeof decimals !== 'number') {
    try {
      decimals = BeanNumber.from(decimals).toNumber();
    } catch (e) {}
  }

  if (typeof decimals === 'number' && decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return '1' + zeros.substring(0, decimals);
  }

  return logger.throwArgumentError('invalid decimal size', 'decimals', decimals);
}

function parseFixed(value: string, decimals?: BigNumberish): BeanNumber {
  if (decimals == null) {
    decimals = 0;
  }
  const multiplier = getMultiplier(decimals);

  if (typeof value !== 'string' || !value.match(/^-?[0-9.]+$/)) {
    logger.throwArgumentError('invalid decimal value', 'value', value);
  }

  // Is it negative?
  const negative = value.substring(0, 1) === '-';
  if (negative) {
    value = value.substring(1);
  }

  if (value === '.') {
    logger.throwArgumentError('missing value', 'value', value);
  }

  // Split it into a whole and fractional part
  const comps = value.split('.');
  if (comps.length > 2) {
    logger.throwArgumentError('too many decimal points', 'value', value);
  }

  let whole = comps[0],
    fraction = comps[1];
  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '0';
  }

  // Trim trailing zeros
  while (fraction[fraction.length - 1] === '0') {
    fraction = fraction.substring(0, fraction.length - 1);
  }

  // Check the fraction doesn't exceed our decimals size
  if (fraction.length > multiplier.length - 1) {
    throwFault('fractional component exceeds decimals', 'underflow', 'parseFixed');
  }

  // If decimals is 0, we have an empty string for fraction
  if (fraction === '') {
    fraction = '0';
  }

  // Fully pad the string with zeros to get to wei
  while (fraction.length < multiplier.length - 1) {
    fraction += '0';
  }

  const wholeValue = BeanNumber.from(whole);
  const fractionValue = BeanNumber.from(fraction);

  let wei = wholeValue.mul(multiplier).add(fractionValue);

  if (negative) {
    wei = wei.mul(NegativeOne);
  }

  return wei;
}

export function trim(numberString: string, decimals: number): BeanNumber {
  const decimalComponents = numberString.split('.');
  const decimalsFound = decimalComponents[1].length;
  const decimalsToTrim = decimalsFound < decimals ? 0 : decimalsFound - decimals;

  return BeanNumber.from(numberString.substr(0, numberString.length - decimalsToTrim));
}
