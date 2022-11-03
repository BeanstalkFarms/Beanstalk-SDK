import { expect } from "@jest/globals";
import { BigNumber } from "ethers";
import { TokenValue } from "./TokenValue";

describe("TokenValues", function () {
  const n1 = TokenValue.from("100", 6);
  const n2 = TokenValue.from("5.3", 6);
  const n3 = TokenValue.from("1.5", 2);
  const n4 = TokenValue.from("1.5", 6);

  it("from", () => {});

  it("value are immutable", () => {
    const t = TokenValue.from("123", 1);
    expect(t.decimals).toBe(1);
    expect(() => (t.decimals = 2)).toThrow("Cannot assign to read only property");
    // @ts-ignore
    expect(() => (t.value = 2)).toThrow("Cannot assign to read only property");
  });

  it("static constant values", () => {
    expect(TokenValue.ZERO.toBigNumber()._hex).toBe("0x00");
    expect(TokenValue.ONE.toBigNumber()._hex).toBe("0x01");
    expect(TokenValue.NEGATIVE_ONE.toBigNumber()._hex).toBe("-0x01");
    expect(TokenValue.MAX_UINT256.toBigNumber()._hex).toBe("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    expect(TokenValue.MAX_UINT32.toBigNumber()._hex).toBe("0xffffffff");
    expect(TokenValue.MAX_UINT32.toBlockchain()).toBe(4294967295);
  });

  it("add", () => {
    const res = n1.add(n2);
    expect(res.decimals).toEqual(6);
    expect(res.toHuman()).toEqual("105.3");
    expect(res.toBlockchain()).toEqual(105300000);

    expect(n1.add(1).toHuman()).toEqual("101");
    expect(n1.add(-100).toHuman()).toEqual("0");
    expect(n1.add(n3).toHuman()).toEqual("101.5");
    expect(n1.add(n4).toHuman()).toEqual("101.5");
  });

  it("sub", () => {
    const res = n1.sub(n2);
    expect(res.decimals).toEqual(6);
    expect(res.toHuman()).toEqual("94.7");
    expect(res.toBlockchain()).toEqual(94700000);
    expect(n1.sub(-1.33).toHuman()).toEqual("101.33");
    expect(n1.sub(n3).toHuman()).toEqual("98.5");
    expect(n1.sub(n4).toHuman()).toEqual("98.5");
  });

  it("mul", () => {
    const res = n1.mul(n3);
    expect(res.decimals).toEqual(8);
    expect(res.toHuman()).toEqual("150");
    expect(res.toBlockchain()).toEqual(15000000000);
    expect(n1.mul(0.25).toHuman()).toEqual("25");
    expect(n1.mul(0.25).toBlockchain()).toEqual(25000000000000);
  });

  it("div", () => {
    const res = n3.div(2);
    expect(res.decimals).toEqual(4);
    expect(res.toHuman()).toEqual("0.75");
    expect(res.toBlockchain()).toEqual(7500);
  });

  it("eq", () => {
    expect(n1.eq(100)).toBe(true);
    expect(n1.eq(BigNumber.from("100000000"))).toBe(true);
    expect(n1.eq(TokenValue.from("100", 6))).toBe(true);

    expect(n1.eq(99)).toBe(false);
    expect(n1.eq(101)).toBe(false);
  });

  it("gt", () => {
    expect(n1.gt(99)).toBe(true);
    expect(n1.gt(TokenValue.from("99", 6))).toBe(true);
    expect(n1.gt(TokenValue.from("99.999999", 6))).toBe(true);
    expect(n1.gt(TokenValue.from("99.999999999999", 6))).toBe(true);
    expect(n1.gt(BigNumber.from(50000000))).toBe(true);

    expect(n1.gt(100)).toBe(false);
    expect(n1.gt(101)).toBe(false);
  });

  it("gte", () => {
    expect(n1.gte(99)).toBe(true);
    expect(n1.gte(100)).toBe(true);
    expect(n1.gte(101)).toBe(false);
  });

  it("lt", () => {
    expect(n1.lt(101)).toBe(true);
    expect(n1.lt(TokenValue.from("101", 6))).toBe(true);
    expect(n1.lt(TokenValue.from("100.111111", 6))).toBe(true);
    expect(n1.lt(TokenValue.from("100.111111111111111111", 6))).toBe(true);
    expect(n1.lt(TokenValue.from("100.11111111111111111111111111111", 6))).toBe(true);

    expect(n1.lt(BigNumber.from(100000001))).toBe(true);
    expect(n1.lt(BigNumber.from(100000000))).toBe(false);
    expect(n1.lt(100)).toBe(false);
    expect(n1.lt(101)).toBe(true);
  });

  it("lte", () => {
    expect(n1.lte(BigNumber.from(100000001))).toBe(true);
    expect(n1.lte(BigNumber.from(100000000))).toBe(true);
    expect(n1.lte(BigNumber.from(99999999))).toBe(false);
    expect(n1.lte(101)).toBe(true);
    expect(n1.lte(100)).toBe(true);
    expect(n1.lte(99)).toBe(false);
  });

  it("abs", () => {
    const n1 = TokenValue.from("123.45", 6);
    const n2 = TokenValue.from("-123.45", 6);

    // sanity check
    expect(n2.toBlockchain()).toEqual(-123450000);

    expect(n1.abs().toHuman()).toEqual("123.45");
    expect(n1.abs().toBlockchain()).toEqual(123450000);
    expect(n2.abs().toHuman()).toEqual("123.45");
    expect(n2.abs().toBlockchain()).toEqual(123450000);
  });

  it("pow", () => {
    expect(TokenValue.from(5, 0).pow(2).toHuman()).toEqual("25");
    expect(n2.pow(2).toHuman()).toEqual("28.09");
    expect(n2.pow(1).toHuman()).toEqual(n2.toHuman());
    expect(n2.pow(0).toHuman()).toEqual("1");
  });
});
