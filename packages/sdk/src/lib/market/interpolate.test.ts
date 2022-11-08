import { Interpolate } from "./interpolate"
import { BigNumber } from "ethers";


//check that interpolation is done correctly.
//have a set of verified interpolations, compare these to generated interpolations using the same data points

//polynomials with many points
//polynomials with min # of points
//reverts: mismatched x,y points
//reverts: negative values ?? should this revert

export function generatePoints(length: number, dataType: number, x1: number, x2: number, minY: number, maxY?: number): {xs: BigNumber[], ys: BigNumber[]} {
  if(x1 < 0) throw ("must be positive");
  const xset = new Array<BigNumber>(length);
  const yset = new Array<BigNumber>(length);
  for(let i = 0; i < length; i++) {
    xset[i] = i == 0 ? BigNumber.from(x1) : BigNumber.from(x2).mul(1+(0.1*(i-1)))
    if(dataType == 0) {//constant
      yset[i] = BigNumber.from(minY);
    } else if (dataType == 1 && maxY) {//linear
      let m = (maxY - minY)/length;
      yset[i] = BigNumber.from(i*m + minY);
    }
  }
  return {xs: xset, ys: yset};
}


describe('Interpolate', () => {
  // beforeEach(async function() {
  //   this.points = generatePoints()
  // })
  it('throws if not enough points', () => {
    let points = generatePoints(1, 0, 0, 0, 0);
    expect(() => Interpolate.fromPoints(points.xs, points.ys)).toThrow("Interpolate: must have >= 2 points")
  });
  it.skip('throws if too many points', () => {
    // TODO: Broken tests
    // const xs = new Array(65).fill(1n);
    // const ys = [...xs];
    // expect(() => Interpolate.fromPoints(xs, ys)).toThrow("Interpolate: must have <= 64 points")
  })
  it.skip('throws if mismatch', () => {
    // TODO: fix broken tests
    // expect(() => Interpolate.fromPoints([0n, 1n], [0n, 1n, 2n])).toThrow("Interpolate: dimensions of x and y must match")
  })
});