

/**
 * @FIXME 
 * - math.js uses https://github.com/MikeMcl/decimal.js/ (unknown size)
 * - ethers.js uses https://www.npmjs.com/package/bn.js (unknown size)
 *    - this is required because of ethers' dependency on https://www.npmjs.com/package/elliptic
 * - we use https://mikemcl.github.io/bignumber.js/ (8kb minfied and gzipped)
 *    - this supports decimals
 * 
 * @QUESTIONS
 * - is Interpolate.fromPoints intended to accept decimals or only integers? (constraining
 *   to integers makes sense, we just may need to help provide some helper functions to do this)
 * 
 * @TODO
 * - remove `math` dependency
 * - add some helper func for calculateShifts
 * - figure out what math.format is doing
 */
export class Interpolate {
  /**
   * @ref https://www.wikiwand.com/en/Monotone_cubic_interpolation
   * @param xs 
   * @param ys 
   * @returns 
   */
  static fromPoints(
    xs: any[],
    ys: any[],
  ) {
    var length = xs.length;
    if(length < 2) throw new Error(`Interpolate: must have >= 2 points`);
    if(length > 64) throw new Error(`Interpolate: must have <= 64 points`);
    if(ys.length != length) throw new Error(`Interpolate: dimensions of x and y must match`);

    // var dys = [], dxs = [], ms = [];
    // for(let i = 0; i < (length-1); i++) {
    //   const deltax = math.subtract(math.bignumber(xs[i+1]), math.bignumber(xs[i]));
    //   const deltay = math.subtract(math.bignumber(ys[i+1]), math.bignumber(ys[i]));

    //   dxs.push(deltax);
    //   dys.push(deltay);
    //   ms.push(math.divide(deltay, deltax));
    // }

    // var c1s = [ms[0]];
    // for(let i = 0; i < (dxs.length-1); i++) {
    //   if(ms[i] * ms[i+1] <= 0) {
    //     c1s.push(math.bignumber(0));
    //   } else {
    //     c1s.push(math.divide(math.multiply(math.bignumber(3), math.add(dxs[i], dxs[i+1])), math.add(math.divide(math.add(math.add(dxs[i], dxs[i+1]), dxs[i+1]), ms[i]), math.divide(math.add(math.add(dxs[i], dxs[i+1]), dxs[i]), ms[i+1]))));
    //   }
    // }
    
    // c1s.push(ms[ms.length - 1]);

    // var c2s = [], c3s = [];

    // for(let i = 0; i < c1s.length - 1; i++) {
    //   var invDx = math.divide(math.bignumber(1), dxs[i]);
    //   var common_ = math.chain(c1s[i]).add(c1s[i+1]).subtract(ms[i]).subtract(ms[i]).done();
    //   c2s.push(math.multiply(math.chain(ms[i]).subtract(c1s[i]).subtract(common_).done(), invDx));
    //   c3s.push(math.chain(common_).multiply(invDx).multiply(invDx).done());
    // }
    
    var breakpoints = new Array(length);
    var coefficients = new Array(length*4);
    var exponents = new Array(length*4);
    var signs = new Array(length*4);

    // for(let i = 0; i < length; i++){
    //   signs[i*4] = math.sign(ys[i]) == 1 || math.sign(ys[i]) == 0;
    //   signs[i*4 + 1] = math.sign(c1s[i]) == 1 || math.sign(c1s[i]) == 0;

    //   exponents[i*4] = math.number(ys[i]).calculateShifts(startingExponent);
    //   exponents[i*4 + 1] = math.number(c1s[i]).calculateShifts(startingExponent);
      
    //   let exponentDeg0 = math.pow(math.bignumber(10), math.bignumber(math.number(ys[i]).calculateShifts(startingExponent)))
    //   let exponentDeg1 = math.pow(math.bignumber(10), math.bignumber(math.number(c1s[i]).calculateShifts(startingExponent)))
      
    //   coefficients[i*4] = math.format(math.floor(math.abs(math.multiply(ys[i], exponentDeg0))), {notation: "fixed"});
    //   coefficients[i*4 + 1] = math.format(math.floor(math.abs(math.multiply(c1s[i], exponentDeg1))), {notation: "fixed"});
      
    //   breakpoints[i] = math.format(xs[i], {notation: "fixed"});

    //   if(i<(dxs.length)) {
    //     signs[i*4 + 2] = math.sign(c2s[i]) == 1 || math.sign(c2s[i]) == 0;
    //     signs[i*4 + 3] = math.sign(c3s[i]) == 1 || math.sign(c3s[i]) == 0;

    //     exponents[i*4 + 2] = math.number(c2s[i]).calculateShifts(startingExponent);
    //     exponents[i*4 + 3] = math.number(c3s[i]).calculateShifts(startingExponent);

    //     let exponentDeg2 = math.pow(math.bignumber(10), math.bignumber(math.number(c2s[i]).calculateShifts(startingExponent)))
    //     let exponentDeg3 = math.pow(math.bignumber(10), math.bignumber(math.number(c3s[i]).calculateShifts(startingExponent)))
    //     coefficients[i*4 + 2] = math.format(math.floor(math.abs(math.multiply(c2s[i], exponentDeg2))), {notation: "fixed"});
    //     coefficients[i*4 + 3] = math.format(math.floor(math.abs(math.multiply(c3s[i], exponentDeg3))), {notation: "fixed"});
    //   } else {
    //     signs[i*4 + 2] = false;
    //     signs[i*4 + 3] = false;
    //     exponents[i*4 + 2] = 0;
    //     exponents[i*4 + 3] = 0;
    //     coefficients[i*4 + 2] = '0';
    //     coefficients[i*4 + 3] = '0';
    //   }
    // }

    return {
      breakpoints: breakpoints, 
      coefficients: coefficients, 
      exponents: exponents, 
      signs: signs, 
    };
  }
}