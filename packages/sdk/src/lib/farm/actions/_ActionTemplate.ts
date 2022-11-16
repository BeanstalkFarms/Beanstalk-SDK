//@ts-nocheck

// Workflow Action template
import { ethers } from "ethers";
import { StepClass } from "../types";

export class ActionTemplate extends StepClass {
  public name: string = "exchange";

  constructor() {}

  async run(_amountInStep: ethers.BigNumber, _forward: boolean = true) {
    // sdk is accessible as a static property on this class, for ex, ActionTemplate.sdk
    return {
      name,
      amountOut,
      encode: (minAmountOut: ethers.BigNumber) => {},
      decode: (data: string) => {},
      data
    };
  }
}
