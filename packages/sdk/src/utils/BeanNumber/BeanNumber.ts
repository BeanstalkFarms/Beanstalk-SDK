/**
 *  BigNumber
 *
 *  Extened from ethers.BigNumber
 *  https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/bignumber.ts
 *
 *  Minimal changs here. Extended through BeanNumberExtend.ts
 *
 */

import BN from 'bn.js';

import { Bytes, Hexable, hexlify, isBytes, isHexString } from '@ethersproject/bytes';

import { Logger } from '@ethersproject/logger';
import { BigNumber } from 'ethers';
const logger = new Logger('beannumber');

const _constructorGuard = {};

const MAX_SAFE = 0x1fffffffffffff;

type BigNumberish = BeanNumber | BigNumber | Bytes | bigint | string | number;

// Only warn about passing 10 into radix once
let _warnedToStringRadix = false;

export class BeanNumber implements Hexable {
  readonly _hex: string;
  readonly _isBigNumber: boolean;
  private _decimals?: number;

  constructor(constructorGuard: any, hex: string) {
    if (constructorGuard !== _constructorGuard) {
      logger.throwError('cannot call constructor directly; use BigNumber.from', Logger.errors.UNSUPPORTED_OPERATION, {
        operation: 'new (BigNumber)',
      });
    }

    this._hex = hex;
    this._isBigNumber = true;

    // don't freeze everything
    // Object.freeze(this);
    Object.defineProperty(this, '_hex', { configurable: false, writable: false });
    Object.defineProperty(this, 'isBigNumber', { configurable: false, writable: false });
  }

  ////// Custom methods
  get decimals(): number | undefined {
    return this._decimals;
  }

  set decimals(decimals: number | undefined) {
    this._decimals = decimals;
    Object.defineProperty(this, '_decimals', { configurable: false, writable: false });
  }

  //////

  fromTwos(value: number): BeanNumber {
    return toBeanNumbe(toBN(this).fromTwos(value));
  }

  toTwos(value: number): BeanNumber {
    return toBeanNumbe(toBN(this).toTwos(value));
  }

  abs(): BeanNumber {
    if (this._hex[0] === '-') {
      return BeanNumber.from(this._hex.substring(1));
    }
    return this;
  }

  add(other: BigNumberish): BeanNumber {
    return toBeanNumbe(toBN(this).add(toBN(other)));
  }

  sub(other: BigNumberish): BeanNumber {
    return toBeanNumbe(toBN(this).sub(toBN(other)));
  }

  div(other: BigNumberish): BeanNumber {
    const o = BeanNumber.from(other);
    if (o.isZero()) {
      throwFault('division-by-zero', 'div');
    }
    return toBeanNumbe(toBN(this).div(toBN(other)));
  }

  mul(other: BigNumberish): BeanNumber {
    return toBeanNumbe(toBN(this).mul(toBN(other)));
  }

  mod(other: BigNumberish): BeanNumber {
    const value = toBN(other);
    if (value.isNeg()) {
      throwFault('division-by-zero', 'mod');
    }
    return toBeanNumbe(toBN(this).umod(value));
  }

  pow(other: BigNumberish): BeanNumber {
    const value = toBN(other);
    if (value.isNeg()) {
      throwFault('negative-power', 'pow');
    }
    return toBeanNumbe(toBN(this).pow(value));
  }

  and(other: BigNumberish): BeanNumber {
    const value = toBN(other);
    if (this.isNegative() || value.isNeg()) {
      throwFault('unbound-bitwise-result', 'and');
    }
    return toBeanNumbe(toBN(this).and(value));
  }

  or(other: BigNumberish): BeanNumber {
    const value = toBN(other);
    if (this.isNegative() || value.isNeg()) {
      throwFault('unbound-bitwise-result', 'or');
    }
    return toBeanNumbe(toBN(this).or(value));
  }

  xor(other: BigNumberish): BeanNumber {
    const value = toBN(other);
    if (this.isNegative() || value.isNeg()) {
      throwFault('unbound-bitwise-result', 'xor');
    }
    return toBeanNumbe(toBN(this).xor(value));
  }

  mask(value: number): BeanNumber {
    if (this.isNegative() || value < 0) {
      throwFault('negative-width', 'mask');
    }
    return toBeanNumbe(toBN(this).maskn(value));
  }

  shl(value: number): BeanNumber {
    if (this.isNegative() || value < 0) {
      throwFault('negative-width', 'shl');
    }
    return toBeanNumbe(toBN(this).shln(value));
  }

  shr(value: number): BeanNumber {
    if (this.isNegative() || value < 0) {
      throwFault('negative-width', 'shr');
    }
    return toBeanNumbe(toBN(this).shrn(value));
  }

  eq(other: BigNumberish): boolean {
    return toBN(this).eq(toBN(other));
  }

  lt(other: BigNumberish): boolean {
    return toBN(this).lt(toBN(other));
  }

  lte(other: BigNumberish): boolean {
    return toBN(this).lte(toBN(other));
  }

  gt(other: BigNumberish): boolean {
    return toBN(this).gt(toBN(other));
  }

  gte(other: BigNumberish): boolean {
    return toBN(this).gte(toBN(other));
  }

  isNegative(): boolean {
    return this._hex[0] === '-';
  }

  isZero(): boolean {
    return toBN(this).isZero();
  }

  toNumber(): number {
    try {
      return toBN(this).toNumber();
    } catch (error) {
      throwFault('overflow', 'toNumber', this.toString());
    }
  }

  toBigInt(): bigint {
    try {
      return BigInt(this.toString());
    } catch (e) {}

    return logger.throwError('this platform does not support BigInt', Logger.errors.UNSUPPORTED_OPERATION, {
      value: this.toString(),
    });
  }

  toString(): string {
    // Lots of people expect this, which we do not support, so check (See: #889)
    if (arguments.length > 0) {
      if (arguments[0] === 10) {
        if (!_warnedToStringRadix) {
          _warnedToStringRadix = true;
          logger.warn('BigNumber.toString does not accept any parameters; base-10 is assumed');
        }
      } else if (arguments[0] === 16) {
        logger.throwError(
          'BigNumber.toString does not accept any parameters; use bigNumber.toHexString()',
          Logger.errors.UNEXPECTED_ARGUMENT,
          {}
        );
      } else {
        logger.throwError('BigNumber.toString does not accept parameters', Logger.errors.UNEXPECTED_ARGUMENT, {});
      }
    }
    return toBN(this).toString(10);
  }

  toHexString(): string {
    return this._hex;
  }

  toJSON(key?: string): any {
    return { type: 'BigNumber', hex: this.toHexString() };
  }

  static from(value: any): BeanNumber {
    // TODO verify BigNumber pass here too
    if (value instanceof BeanNumber) {
      return value;
    }

    if (typeof value === 'string') {
      if (value.match(/^-?0x[0-9a-f]+$/i)) {
        return new BeanNumber(_constructorGuard, toHex(value));
      }

      if (value.match(/^-?[0-9]+$/)) {
        return new BeanNumber(_constructorGuard, toHex(new BN(value)));
      }

      return logger.throwArgumentError('invalid BigNumber string', 'value', value);
    }

    if (typeof value === 'number') {
      if (value % 1) {
        throwFault('underflow', 'BigNumber.from', value);
      }

      if (value >= MAX_SAFE || value <= -MAX_SAFE) {
        throwFault('overflow', 'BigNumber.from', value);
      }

      return BeanNumber.from(String(value));
    }

    const anyValue = <any>value;

    if (typeof anyValue === 'bigint') {
      return BeanNumber.from(anyValue.toString());
    }

    if (isBytes(anyValue)) {
      return BeanNumber.from(hexlify(anyValue));
    }

    if (anyValue) {
      // Hexable interface (takes priority)
      if (anyValue.toHexString) {
        const hex = anyValue.toHexString();
        if (typeof hex === 'string') {
          return BeanNumber.from(hex);
        }
      } else {
        // For now, handle legacy JSON-ified values (goes away in v6)
        let hex = anyValue._hex;

        // New-form JSON
        if (hex == null && anyValue.type === 'BigNumber') {
          hex = anyValue.hex;
        }

        if (typeof hex === 'string') {
          if (isHexString(hex) || (hex[0] === '-' && isHexString(hex.substring(1)))) {
            return BeanNumber.from(hex);
          }
        }
      }
    }

    return logger.throwArgumentError('invalid BigNumber value', 'value', value);
  }

  static isBigNumber(value: any): value is BigNumber | BeanNumber {
    return !!(value && value._isBigNumber);
  }
}

// Normalize the hex string
function toHex(value: string | BN): string {
  // For BN, call on the hex string
  if (typeof value !== 'string') {
    return toHex(value.toString(16));
  }

  // If negative, prepend the negative sign to the normalized positive value
  if (value[0] === '-') {
    // Strip off the negative sign
    value = value.substring(1);

    // Cannot have multiple negative signs (e.g. "--0x04")
    if (value[0] === '-') {
      logger.throwArgumentError('invalid hex', 'value', value);
    }

    // Call toHex on the positive component
    value = toHex(value);

    // Do not allow "-0x00"
    if (value === '0x00') {
      return value;
    }

    // Negate the value
    return '-' + value;
  }

  // Add a "0x" prefix if missing
  if (value.substring(0, 2) !== '0x') {
    value = '0x' + value;
  }

  // Normalize zero
  if (value === '0x') {
    return '0x00';
  }

  // Make the string even length
  if (value.length % 2) {
    value = '0x0' + value.substring(2);
  }

  // Trim to smallest even-length string
  while (value.length > 4 && value.substring(0, 4) === '0x00') {
    value = '0x' + value.substring(4);
  }

  return value;
}

function toBeanNumbe(value: BN): BeanNumber {
  return BeanNumber.from(toHex(value));
}

function toBN(value: BigNumberish): BN {
  const hex = BeanNumber.from(value).toHexString();
  if (hex[0] === '-') {
    return new BN('-' + hex.substring(3), 16);
  }
  return new BN(hex.substring(2), 16);
}

function throwFault(fault: string, operation: string, value?: any): never {
  const params: any = { fault: fault, operation: operation };
  if (value != null) {
    params.value = value;
  }

  return logger.throwError(fault, Logger.errors.NUMERIC_FAULT, params);
}
