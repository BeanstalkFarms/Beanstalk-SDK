import { DecimalBigNumber as DBN, assert } from '../../utils/DecimalBigNumber';
import { Interpolate } from "./interpolate";

export function bnToHex(bn: string | number | bigint | boolean) {
  bn = BigInt(bn);
  var pos = true;
  if(bn < 0){
    pos = false;
    bn = bitnot(bn);
  }

  var hex = bn.toString(16);
  if (hex.length % 2) { hex = '0' + hex; }

  if(pos && (0x80 & parseInt(hex.slice(0,2), 16))) {
    hex = '00' + hex;
  }

  return hex;
}

export function hexToBn(hex:string) {
  if (hex.length % 2) {
    hex = '0' + hex;
  }

  var highbyte = parseInt(hex.slice(0, 2), 16)
  var bn = BigInt('0x' + hex);

  if (0x80 & highbyte) {
    // bn = ~bn; WRONG in JS (would work in other languages)

    // manually perform two's compliment (flip bits, add one)
    // (because JS binary operators are incorrect for negatives)
    bn = BigInt('0b' + bn.toString(2).split('').map(function (i) {
      return '0' === i ? 1 : 0
    }).join('')) + BigInt(1);
    // add the sign character to output string (bytes are unaffected)
    bn = -bn;
  }

  return bn;
}

export function bitnot(bn: bigint) {
  bn = -bn;
  var bin = (bn).toString(2);
  var prefix = '';
  while(bin.length % 8) { bin = '0' + bin; }
  if('1' === bin[0] && -1 !== bin.slice(1).indexOf('1')) {
    prefix = '11111111';
  }
  bin = bin.split('').map(function (i) {
    return '0' === i ? '1' : '0';
  }).join('');

  return BigInt('0b' + prefix + bin) + BigInt(1);
}

export class Polynomial {
  // public breakpoints: DBN[];
  // public coefficients: DBN[];
  // public exponents: number[];
  // public signs: boolean[];

  constructor(
    public breakpoints : DBN[],
    public coefficients : DBN[],
    public exponents : number[],
    public signs : boolean[],
  ) {
    assert(breakpoints.length*4 == coefficients.length, "4x coefficients must be given per breakpoint")
    assert(breakpoints.length*4 == exponents.length, "4x exponents must be given per breakpoint")
    assert(breakpoints.length*4 == signs.length, "4x signs must be given per breakpoint")
    this.breakpoints = breakpoints;
    this.coefficients = coefficients;
    this.exponents = exponents;
    this.signs = signs;
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
  public pack(): string {
    const hexLen = bnToHex(this.length).padStart(64, '0');
    const hexBrkpts = this.breakpoints.reduce((prev, bp) => prev + bnToHex(bp.toString()).padStart(64, '0'), '');
    const hexCoefs = this.coefficients.reduce((prev, coef) => prev + bnToHex(coef.toString()).padStart(64, '0'), '');
    const hexExps = this.exponents.reduce((prev, exp) => prev + bnToHex(exp).padStart(2, '0'), '');
    const hexSigns = this.signs.reduce((prev, sign) => prev + bnToHex(sign).padStart(2, '0'), '');

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
    if(f.slice(0,2) == "0x") f = f.slice(2);
    const length = Number(hexToBn(f.slice(0,64)));
    const breakpoints: DBN[] = [];
    const coefficients: DBN[] = [];
    const exponents: number[] = [];
    const signs: boolean[] = [];

    for(let i = 0; i < length; i++) {
      breakpoints.push(new DBN( hexToBn(f.slice(64 + 64*i, 64 + 64*(i+1))).toString() ));

      coefficients.push(new DBN( hexToBn(f.slice(64 + 64*length + 64*4*i, 64 + 64*length + 64*4*i + 64)).toString() ))
      coefficients.push(new DBN( hexToBn(f.slice(64 + 64*length + 64*4*i + 64, 64 + 64*length + 64*4*i + 128)).toString() ))
      coefficients.push(new DBN( hexToBn(f.slice(64 + 64*length + 64*4*i + 128, 64 + 64*length + 64*4*i + 192)).toString() ))
      coefficients.push(new DBN( hexToBn(f.slice(64 + 64*length + 64*4*i + 192, 64 + 64*length + 64*4*i + 256)).toString() ))

      exponents.push( Number( hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*i, 64 + 64*length + 64*length*4 + 2*4*i + 2)) ) )
      exponents.push( Number( hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*i + 2, 64 + 64*length + 64*length*4 + 2*4*i + 4)) ) )
      exponents.push( Number( hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*i + 4, 64 + 64*length + 64*length*4 + 2*4*i + 6)) ) )
      exponents.push( Number( hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*i + 6, 64 + 64*length + 64*length*4 + 2*4*i + 8)) ) )

      signs.push( !!hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*length + 2*4*i, 64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 2)) )
      signs.push( !!hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 2, 64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 4)) )
      signs.push( !!hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 4, 64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 6)) )
      signs.push( !!hexToBn(f.slice(64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 6, 64 + 64*length + 64*length*4 + 2*4*length + 2*4*i + 8)) )
    }


    return {breakpoints, coefficients, exponents, signs};
  }

  /**
   * 
   * @param _array 
   * @param _value 
   * @param _high 
   */
  static findIndex(_array: DBN[], _value: DBN, _high: number) {
    if (_value < _array[0]) return 0;
    // if(math.compare(math.bignumber(value), math.bignumber(array[0])) == -1) return 0;

    let low = 0;
    while (low < _high) {
      if (_array[low].eq(_value)) return low;
      if (_array[low].gt(_value)) return low - 1;
      low++;
    }
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
    xs: DBN[],
    ys: DBN[],
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
    const { breakpoints, coefficients, exponents, signs } = Polynomial.unpack(f); 
    return new Polynomial(breakpoints, coefficients, exponents, signs);
  }
}

// var p = Polynomial.fromPoints([new DBN('100'), new DBN('200'), new DBN('300')], [new DBN('900000'), new DBN('800000'), new DBN('700000')])

// console.log(p);
// console.log("p", p.coefficients.map((b)=>b.toString()))
// console.log(Polynomial.fromHex(p.pack()).pack() == p.pack())