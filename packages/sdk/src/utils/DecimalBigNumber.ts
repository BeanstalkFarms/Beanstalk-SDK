import { BigNumber } from 'ethers';
import { formatUnits, parseUnits, commify } from 'ethers/lib/utils';

export function assert(value: boolean, message?: string): asserts value;
export function assert<T>(value: T | null | undefined, message?: string): asserts value is T;
export function assert(value: any, message?: string) {
  if (value === false || value === null || typeof value === 'undefined') {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 *
 * @export
 * @class DecimalBigNumber
 */

export class DecimalBigNumber {
  private _decimals: number;
  private _value: BigNumber;

  /**
   * Creates a new instance of `DecimalBigNumber`.
   *
   * @description This class expects and suggests that numbers be handled using `DecimalBigNumber`, instead of the inherently inaccurate
   * use of `number` and `string` types.
   *
   * The constructor accepts the following as inputs to the number parameter:
   * - `BigNumber` (from @ethersproject/bignumber): to easily shift from `BigNumber` used in smart contracts to `DecimalBigNumber`
   * - `string`: to take input from the user
   *
   * Given these design decisions, there are some recommended approaches:
   * - Obtain user input with type text, instead of a number, in order to retain precision. e.g. `<input type="text" />`
   * - Where a `number` value is present, convert it to a `DecimalBigNumber` in the manner the developer deems appropriate. This will most commonly be `new DecimalBigNumber((1000222000.2222).toString(), 4)`. While a convenience method could be offered, it could lead to unexpected behaviour around precision.
   *
   * @param value the BigNumber or string used to initialize the object
   * @param decimals the number of decimal places supported by the number. If `number` is a string, this parameter is optional.
   * @returns a new, immutable instance of `DecimalBigNumber`
   */
  constructor(value: string, decimals?: number);
  constructor(value: BigNumber, decimals: number);
  constructor(value: BigNumber | string, decimals?: number) {
    if (typeof value === 'string') {
      const _value = value.trim() === '' || isNaN(Number(value)) ? '0' : value;
      const _decimals =
        decimals === undefined ? this._inferDecimalAmount(value) : this._ensurePositive(decimals);
      const formatted = this._setDecimalAmount(_value, _decimals);

      this._value = parseUnits(formatted, _decimals);
      this._decimals = _decimals;

      return;
    }

    assert(decimals !== undefined, 'Decimal cannot be undefined');

    this._value = value;
    this._decimals = decimals;
  }

  private _inferDecimalAmount(value: string): number {
    const [, decimalStringOrUndefined] = value.split('.');

    return decimalStringOrUndefined?.length || 0;
  }

  /**
   * Sets a value to a specific decimal amount
   *
   * Trims unnecessary decimals
   * Or pads decimals if needed
   *
   * @param value Input value as a string
   * @param decimals Desired decimal amount
   */
  private _setDecimalAmount(value: string, decimals: number): string {
    const [integer, _decimalsOrUndefined] = value.split('.');

    const _decimals = _decimalsOrUndefined || '';

    const paddingRequired = this._ensurePositive(decimals - _decimals.length);

    return integer + '.' + _decimals.substring(0, decimals) + '0'.repeat(paddingRequired);
  }

  /**
   * Ensures the desired decimal amount is positive
   */
  private _ensurePositive(decimals: number) {
    return Math.max(0, decimals);
  }

  /**
   * Converts this value to a BigNumber
   *
   * Often used when passing this value as
   * an argument to a contract method
   */
  public toBigNumber(decimals?: number): BigNumber {
    return decimals === undefined
      ? this._value
      : new DecimalBigNumber(this.toString(), decimals)._value;
  }

  /**
   * Converts this value to a string
   *
   * By default, the string returned will:
   * - Have the same decimal amount that it was initialized with
   * - Have trailing zeroes removed
   * - Not have thousands separators
   *
   * This ensures that the number string is accurate.
   *
   * To override any of these settings, add the `args` object as a parameter.
   *
   * @param args an object containing any of the properties: decimals, trim, format
   * @returns a string version of the number
   */
  public toString({
    decimals,
    trim = true,
    format = false,
  }: {
    trim?: boolean;
    format?: boolean;
    decimals?: number;
  } = {}): string {
    let result = formatUnits(this._value, this._decimals);

    // Add thousands separators
    if (format) result = commify(result);

    // We default to the number of decimal places specified
    const _decimals = decimals === undefined ? this._decimals : this._ensurePositive(decimals);
    result = this._setDecimalAmount(result, _decimals);

    // We default to trimming trailing zeroes (and decimal points), unless there is an override
    if (trim) result = result.replace(/(?:\.|(\..*?))\.?0*$/, '$1');

    return result;
  }

  /**
   * @deprecated
   * Please avoid using this method.
   * If used for calculations: rather than converting this DecimalBigNumber
   * "down" to a number, convert the other number "up" to a DecimalBigNumber.
   *
   * Used when performing approximate calculations with
   * the number where precision __is not__ important.
   */
  public toApproxNumber(): number {
    return parseFloat(this.toString());
  }

  /**
   * Determines if the two values are equal
   */
  public eq(value: DecimalBigNumber | string): boolean {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    // Normalize decimals to the largest of the two values
    const largestDecimalAmount = Math.max(valueAsDBN._decimals, this._decimals);

    // Normalize values to the correct decimal amount
    const normalisedThis = new DecimalBigNumber(this.toString(), largestDecimalAmount);
    const normalisedValue = new DecimalBigNumber(valueAsDBN.toString(), largestDecimalAmount);

    return normalisedThis._value.eq(normalisedValue._value);
  }

  /**
   * Subtracts this value by the value provided
   */
  public sub(value: DecimalBigNumber | string): DecimalBigNumber {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    // Normalize decimals to the largest of the two values
    const largestDecimalAmount = Math.max(valueAsDBN._decimals, this._decimals);

    // Normalize values to the correct decimal amount
    const normalisedThis = new DecimalBigNumber(this.toString(), largestDecimalAmount);
    const normalisedValue = new DecimalBigNumber(valueAsDBN.toString(), largestDecimalAmount);

    return new DecimalBigNumber(
      normalisedThis._value.sub(normalisedValue._value),
      largestDecimalAmount,
    );
  }

  /**
   * Sums this value and the value provided
   */
  public add(value: DecimalBigNumber | string): DecimalBigNumber {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    // Normalize decimals to the largest of the two values
    const largestDecimalAmount = Math.max(valueAsDBN._decimals, this._decimals);

    // Normalize values to the correct decimal amount
    const normalisedThis = new DecimalBigNumber(this.toString(), largestDecimalAmount);
    const normalisedValue = new DecimalBigNumber(valueAsDBN.toString(), largestDecimalAmount);

    return new DecimalBigNumber(
      normalisedThis._value.add(normalisedValue._value),
      largestDecimalAmount,
    );
  }

  public isPositive(): boolean {
    return this._value.gte(0);
  }

  /**
   * Determines if this value is greater than the provided value
   */
  public gt(value: DecimalBigNumber | string): boolean {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    // Normalize decimals to the largest of the two values
    const largestDecimalAmount = Math.max(valueAsDBN._decimals, this._decimals);

    // Normalize values to the correct decimal amount
    const normalisedThis = new DecimalBigNumber(this.toString(), largestDecimalAmount);
    const normalisedValue = new DecimalBigNumber(valueAsDBN.toString(), largestDecimalAmount);

    return normalisedThis._value.gt(normalisedValue._value);
  }

  /**
   * Determines if this value is less than the provided value
   */
  public lt(value: DecimalBigNumber | string): boolean {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    // Normalize decimals to the largest of the two values
    const largestDecimalAmount = Math.max(valueAsDBN._decimals, this._decimals);

    // Normalize values to the correct decimal amount
    const normalisedThis = new DecimalBigNumber(this.toString(), largestDecimalAmount);
    const normalisedValue = new DecimalBigNumber(valueAsDBN.toString(), largestDecimalAmount);

    return normalisedThis._value.lt(normalisedValue._value);
  }

  /**
   * Multiplies this value by the provided value
   */
  public mul(value: DecimalBigNumber | string): DecimalBigNumber {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    const product = this._value.mul(valueAsDBN._value);

    // Multiplying two BigNumbers produces a product with a decimal
    // amount equal to the sum of the decimal amounts of the two input numbers
    return new DecimalBigNumber(product, this._decimals + valueAsDBN._decimals);
  }

  /**
   * Divides this value by the provided value
   *
   * By default, this returns a value whose decimal amount is equal
   * to the sum of the decimal amounts of the two values used.
   * If this isn't enough, you can specify a desired
   * decimal amount using the second function argument.
   *
   * @param decimals The expected decimal amount of the output value
   */
  public div(value: DecimalBigNumber | string, decimals?: number): DecimalBigNumber {
    const valueAsDBN = value instanceof DecimalBigNumber ? value : new DecimalBigNumber(value);

    const _decimals =
      decimals === undefined
        ? this._decimals + valueAsDBN._decimals
        : this._ensurePositive(decimals);

    // When we divide two BigNumbers, the result will never
    // include any decimal places because BigNumber only deals
    // with whole integer values. Therefore, in order for us to
    // include a specific decimal amount in our calculation, we need to
    // normalize the decimal amount of the two numbers, such that the difference
    // in their decimal amount is equal to the expected decimal amount
    // of the result, before we do the calculation
    //
    // E.g:
    // 22/5 = 4.4
    //
    // But ethers would return:
    // 22/5 = 4 (no decimals)
    //
    // So before we calculate, we add n padding zeros to the
    // numerator, where n is the expected decimal amount of the result:
    // 220/5 = 44
    //
    // Normalized to the expected decimal amount of the result
    // 4.4

    const normalisedThis = new DecimalBigNumber(this.toString(), _decimals + valueAsDBN._decimals);

    const quotient = normalisedThis._value.div(valueAsDBN._value);

    // Return result with the expected output decimal amount
    return new DecimalBigNumber(quotient, _decimals);
  }

  public abs(): DecimalBigNumber {
    if (this._value.lt(0)) {
      return new DecimalBigNumber(this._value.mul('-1'), this._decimals);
    } else {
      return this;
    }
  }

  //only works for positive exponents
  public pow(n: number): DecimalBigNumber {
    if (n==0) return new DecimalBigNumber('1');
    else if (n==1) return this;
    else if (this.eq('0') && n !== 0) return new DecimalBigNumber('0');
    else {
      var z = new DecimalBigNumber(this._value, this._decimals);
      for(let i = 1; i < n; i++) {
        z = z.mul(this);
      }
      return z;
    }
  }
}



// var dbn1 = new DecimalBigNumber('22')
// var dbn2 = new DecimalBigNumber('5')
// var dbn3 = dbn1.div(dbn2, 24);
// var dbn4 = dbn2.pow(2)
// console.log(dbn3.toString())
// export class DecimalBigNumber {
//   constructor(readonly value: BigNumber, readonly divisor: BigNumber) {
//     this.value = value;
//     this.divisor = divisor;
//   }

//   static fromBN(value: BigNumber, decimals: number): DecimalBigNumber {
//     return new DecimalBigNumber(value, divisorFromDecimals(decimals));
//   }

//   /**
//    * Extract as a BigNumber with the specified number of decimal places
//    */
//   toBN(decimals: number): BigNumber {
//     return this.rescaledValue(divisorFromDecimals(decimals));
//   }

//   /**
//    * Create by parsing the floating point string using ethers.utils.parseUnits
//    */
//   static parseUnits(value: string, totalDecimals: number): DecimalBigNumber {
//     let [int, safeDecimals] = value.split('.');

//     if (safeDecimals && safeDecimals.length > totalDecimals) {
//       safeDecimals = safeDecimals.substring(0, totalDecimals);
//     }

//     const safeValue = safeDecimals ? `${int}.${safeDecimals}` : int;
//     const bnIn = ethers.utils.parseUnits(safeValue, totalDecimals);
//     return DecimalBigNumber.fromBN(bnIn, totalDecimals);
//   }

//   /**
//    * A floating point string representation using ethers.utils.formatUnits. If
//    * decimals is not specified, the full precision will used
//    */
//   formatUnits(decimals?: number): string {
//     if (decimals == undefined) {
//       decimals = this.getDecimals();
//     }
//     return ethers.utils.formatUnits(this.toBN(decimals), decimals);
//   }

//   /**
//    * Returns the number of decimal places stored
//    */
//   getDecimals(): number {
//     let decimals = 0;
//     let divisor = this.divisor;
//     while (divisor.gt(1)) {
//       divisor = divisor.div(10);
//       decimals += 1;
//     }
//     return decimals;
//   }

//   /**
//    * add: to preserve precision, output will have the max divisor of the
//    * two inputs
//    */
//   add(other: DecimalBigNumber): DecimalBigNumber {
//     const divisor = maxBN(this.divisor, other.divisor);
//     const value = this.rescaledValue(divisor).add(other.rescaledValue(divisor));
//     return new DecimalBigNumber(value, divisor);
//   }

//   /**
//    * sub: to preserve precision, output will have the max divisor of the
//    * two inputs
//    */
//   sub(other: DecimalBigNumber): DecimalBigNumber {
//     const divisor = maxBN(this.divisor, other.divisor);
//     const value = this.rescaledValue(divisor).sub(other.rescaledValue(divisor));
//     return new DecimalBigNumber(value, divisor);
//   }

//   /**
//    * mul: to preserve precision, output will have the combined divisor of the
//    * two inputs
//    */
//   mul(other: DecimalBigNumber): DecimalBigNumber {
//     const divisor = this.divisor.mul(other.divisor);
//     const value = this.value.mul(other.value);
//     return new DecimalBigNumber(value, divisor);
//   }

//   /**
//    * div: can always lose precision. Hence the caller must provide the
//    * target number of decimal places.
//    * Note this rounds 'half away from zero'
//    */
//   div(other: DecimalBigNumber, targetDecimals: number): DecimalBigNumber {
//     validateInteger(targetDecimals);
//     const divisor = BigNumber.from(10).pow(targetDecimals);

//     const numerator = this.value.mul(other.divisor).mul(divisor);
//     const denominator = other.value.mul(this.divisor);
//     let truncatedResult = numerator.div(denominator);

//     // The divisions truncate the results to integer parts only.
//     // So in order to round, calculate the fractional remainder with:
//     //    [(numerator x 10) / denominator] - [(numerator/denominator) x 10]
//     const resultTimesTen = numerator.mul(10).div(denominator);
//     const remainder = resultTimesTen.abs().sub(truncatedResult.abs().mul(10));

//     const roundup = remainder.gte(5);
//     if (roundup) {
//       truncatedResult = truncatedResult.isNegative() ? truncatedResult.sub(1) : truncatedResult.add(1);
//     }

//     return new DecimalBigNumber(truncatedResult, divisor);
//   }

//   lt(other: DecimalBigNumber): boolean {
//     const divisor = maxBN(this.divisor, other.divisor);
//     return this.rescaledValue(divisor).lt(other.rescaledValue(divisor));
//   }

//   lte(other: DecimalBigNumber): boolean {
//     const divisor = maxBN(this.divisor, other.divisor);
//     return this.rescaledValue(divisor).lte(other.rescaledValue(divisor));
//   }

//   gt(other: DecimalBigNumber): boolean {
//     const divisor = maxBN(this.divisor, other.divisor);
//     return this.rescaledValue(divisor).gt(other.rescaledValue(divisor));
//   }

//   isZero(): boolean {
//     return this.value.isZero();
//   }

//   min(other: DecimalBigNumber): DecimalBigNumber {
//     return this.lt(other) ? this : other;
//   }

//   // Note this rounds 'half away from zero'
//   private rescaledValue(todivisor: BigNumber): BigNumber {
//     let result = this.value.mul(todivisor).div(this.divisor);
//     if (this.value.isZero() || this.divisor.eq(1)) {
//       return result;
//     }

//     const roundup = this.value
//       .abs()
//       .mul(todivisor)
//       .mod(this.divisor)
//       .gte(this.divisor.div(2));
//     if (roundup) {
//       result = result.isNegative() ? result.sub(1) : result.add(1);
//     }

//     return result;
//   }
// }

// export const DBN_ZERO = DecimalBigNumber.fromBN(BigNumber.from(0), 0);
// export const DBN_ONE_HUNDRED = DecimalBigNumber.fromBN(BigNumber.from(100), 0);

// export function minDBN(v1: DecimalBigNumber, v2: DecimalBigNumber): DecimalBigNumber {
//   return v1.lte(v2) ? v1 : v2;
// }

// function divisorFromDecimals(decimals: number): BigNumber {
//   validateInteger(decimals);
//   return BigNumber.from(10).pow(decimals);
// }

// export function maxBN(v1: BigNumber, v2: BigNumber): BigNumber {
//   return v1.gte(v2) ? v1 : v2;
// }

// function validateInteger(v: number): void {
//   if (v % 1) {
//     throw new RangeError(`Expected integer, found ${v}`);
//   }
// }
