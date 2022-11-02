import {BigNumber, utils} from 'ethers'
import { TokenValue } from "../classes/TokenValue";

export const fromHuman = function fromHuman(value: string, decimals: number): TokenValue {
  return  TokenValue.from(value, decimals)
}

export const toHuman = function toHuman(value: BigNumber, decimals: number): string {
  return utils.formatUnits(value, decimals);
}