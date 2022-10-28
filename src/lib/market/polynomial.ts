import { Num } from "../../utils/Number";
import { Interpolate } from "./interpolate";

export class Polynomial {
  constructor(
    public breakpoints : BigInt[],
    public coefficients : BigInt[],
    public exponents : BigInt[],
    public signs : BigInt[],
  ) {
    // ?
  }

  /**
   * Count the number of piecewise functions in this polynomial.
   * 
   * @returns number
   */
  get length() {
    return this.breakpoints.length;
  }

  public evalulate(x: number, pieceIndex: number) {
    // refactor: evaluatePolynomial where f === this
  }

  public integrate(start: number, end: number, pieceIndex: number) {
    // refactor: evaluatePolynomialIntegration where f === this
  }

  // FIXME: later we may move these into `market/pods`.

  public getAmountListing(placeInLine: BigInt, amountBeans: BigInt) {
    // refactor: getAmountListing where f === this
  }

  public getAmountOrder(placeInLine: BigInt, amountPodsFromOrder: BigInt) {
    // refactor: getAmountOrder where f === this
  }

  /**
   * Pack this polynomial into a hex string.
   * 
   * @returns Packed polynomial as a string
   */
  public pack() {
    const hexLen = Num.toHex(this.length).padStart(64, '0');
    const hexBrkpts = this.breakpoints.reduce((prev, bp) => prev + Num.toHex(bp).padStart(64, '0'), '');
    const hexCoefs = this.coefficients.reduce((prev, coef) => prev + Num.toHex(coef).padStart(64, '0'), '');
    const hexExps = this.exponents.reduce((prev, exp) => prev + Num.toHex(exp).padStart(2, '0'), '');
    const hexSigns = this.signs.reduce((prev, sign) => prev + Num.toHex(sign).padStart(2, '0'), '');

    return (
      "0x" 
      + hexLen 
      + hexBrkpts
      + hexCoefs
      + hexExps
      + hexSigns
    );
  }

  /**
   * Unpack a hex-encoded polynomial into its respective parts
   * 
   * @TODO unpacking logic
   */
  static unpack(f: string) {
    return {
      breakpoints: [],
      coefficients: [],
      exponents: [],
      signs: [],
    };
  }

  /**
   * 
   * @param _array 
   * @param _value 
   * @param _high 
   */
  static findIndex(_array: BigInt[], _value: BigInt, _high: BigInt) {
    if (_value < _array[0]) return 0;
    // if(math.compare(math.bignumber(value), math.bignumber(array[0])) == -1) return 0;

    let low = 0;
    while (BigInt(low) < _high) {
      if (_array[low] === _value) return low;
      if (_array[low] > _value) return low - 1;
      low++;
    }
    // var low = 0;
    // while(low < high) {
    //     if(math.compare(math.bignumber(array[low]), math.bignumber(value)) == 0) return low;
    //     else if(math.compare(math.bignumber(array[low]), math.bignumber(value)) == 1) return low - 1;
    //     else low++;
    // }

    return low > 0 ? (low - 1) : 0;
  }

  /**
   * 
   * @param values 
   * @param pieceIndex 
   * @returns 
   */
  static getValueArray(values: any[], pieceIndex: number) {
    return [
      values[pieceIndex * 4],
      values[pieceIndex * 4 + 1],
      values[pieceIndex * 4 + 2],
      values[pieceIndex * 4 + 3]
    ];
  }

  /**
   * 
   * @param array 
   * @param maxPieces 
   * @returns 
   */
  static getNumPieces(array: any[], maxPieces: number) {
    var numPieces = 0;
    if (!maxPieces) throw new Error('Polynomial: maxPieces is required'); // safeguard: infinite loop

    while (numPieces < maxPieces) {
      if (array[numPieces] == 0 && numPieces != 0) break;
      else if (array[numPieces] == undefined) break;
      numPieces++;
    }

    return numPieces;
  }

  /**
   * Create a new polynomial by interpolating points
   * 
   * @param xs x coordinates to interpolate
   * @param ys y coordinates to interpolate
   * @returns Polynomial
   */
  static fromPoints(
    xs: BigInt[],
    ys: BigInt[],
  ) {
    const { breakpoints, coefficients, exponents, signs } = Interpolate.fromPoints(xs, ys);
    return new Polynomial(breakpoints, coefficients, exponents, signs);
  }

  /**
   * Create a new polynomial by unpacking an existing hex-encoded function
   * 
   * @param f the hex-encoded polynomial function to unpack
   * @returns Polynomial
   */
  static fromHex(f: string) {
    const { breakpoints, coefficients, exponents, signs } = Polynomial.unpack(f); // FIXME: decode 
    return new Polynomial(breakpoints, coefficients, exponents, signs);
  }
}