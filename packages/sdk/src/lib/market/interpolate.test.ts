import { Interpolate } from "./interpolate"

describe('Interpolate', () => {
  it('throws if not enough points', () => {
    expect(() => Interpolate.fromPoints([], [])).toThrow("Interpolate: must have >= 2 points")
  });
  it('throws if too many points', () => {
    const xs = new Array(65).fill(1n);
    const ys = [...xs];
    expect(() => Interpolate.fromPoints(xs, ys)).toThrow("Interpolate: must have <= 64 points")
  })
  it('throws if mismatch', () => {
    expect(() => Interpolate.fromPoints([0n, 1n], [0n, 1n, 2n])).toThrow("Interpolate: dimensions of x and y must match")
  })
});