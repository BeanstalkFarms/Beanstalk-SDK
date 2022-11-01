import { Polynomial } from "./polynomial"

describe('initialization', () => {
  it("creates a polynomial from points", () => {
    const fn = Polynomial.fromPoints(
      [100n, 200n, 300n, 400n],
      [0n, 0n, 0n, 0n],
    );
    // expect(fn.breakpoints).toBe(...);
    // expect(fn.coefficients).toBe(...);
    // expect(fn.exponents).toBe(...);
    // expect(fn.signs).toBe(...);
    // expect(fn.pack()).toBe('0xWHATEVER');
  });
})