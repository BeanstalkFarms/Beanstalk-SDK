import { BigNumber, utils } from "ethers";
import { TokenValue } from "src/classes/TokenValue";

export const fromHuman = function fromHuman(value: string, decimals: number): TokenValue {
  return TokenValue.fromHuman(value, decimals);
};

export const toHuman = function toHuman(value: BigNumber, decimals: number): string {
  return utils.formatUnits(value, decimals);
};
