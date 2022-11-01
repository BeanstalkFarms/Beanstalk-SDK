import BigNumber from 'bignumber.js';
import { BeanNumber } from '../utils/BeanNumber';

export * from './addresses';
export * from './chains';

/* Diamonds */
export const NEW_BeanNumber = BeanNumber.from('-1');
export const ZERO_NEW_BeanNumber = BeanNumber.from('0');
export const ONE_NEW_BeanNumber = BeanNumber.from('1');
export const NEW_BN = new BigNumber(-1);
export const ZERO_BN = new BigNumber(0);
export const ONE_BN = new BigNumber(1);
export const MAX_UINT32 = 4294967295;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
