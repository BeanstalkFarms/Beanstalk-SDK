
import { ethers } from 'ethers';
import ParadoxBettingV2 from './abi.json';

const BETTING_ADDR = `0x24432a08869578aAf4d1eadA12e1e78f171b1a2b`;
const paradox = new ethers.Contract(BETTING_ADDR, ParadoxBettingV2)

export default paradox;