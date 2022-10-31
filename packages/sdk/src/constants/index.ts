import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { BeanNumber } from '../utils/BeanNumber';

export * from './addresses';
export * from './chains';

/* Diamonds */
export const NEW_BeanNumber = BeanNumber.from(ethers.constants.NegativeOne);
export const ZERO_BeanNumber = BeanNumber.from(ethers.constants.Zero);
export const ONE_BeanNumber = BeanNumber.from(ethers.constants.One);
export const NEW_BN = new BigNumber(-1);
export const ZERO_BN = new BigNumber(0);
export const ONE_BN = new BigNumber(1);
export const MAX_UINT32 = 4294967295;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
