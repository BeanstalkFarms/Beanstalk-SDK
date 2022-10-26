import { BigNumber as BigNumberEthers, BigNumberish } from 'ethers';
import { BigNumber } from 'bignumber.js';

export class Num {
  static toBigNumberJs(number: BigNumberish) {
    const b = BigNumberEthers.from(number);
    return new BigNumber(b.toString());
  }

  static toBigNumberEthers(number: BigNumber) {
    return BigNumberEthers.from(number.toString());
  }

  /**
   * @ref ?
   * @param bi 
   * @returns 
   */
  static toHex(_bi: BigInt | number) {
    let bi = _bi instanceof BigInt ? _bi : BigInt(_bi);
    let pos = true;

    if (bi < 0n) {
      pos = false;
      bi = Num.bitnot(bi);
    }
  
    let hex = bi.toString(16);
    if (hex.length % 2) { hex = '0' + hex; }
  
    if (pos && (0x80 & parseInt(hex.slice(0, 2), 16))) {
      hex = '00' + hex;
    }
  
    return hex;
  }

  /**
   * @ref ?
   * @param _bi 
   * @returns 
   */
  static bitnot(_bi: BigInt) {
    const bi = -_bi;
    var bin = bi.toString(2)
    var prefix = '';
    while (bin.length % 8) { bin = '0' + bin; }
    if ('1' === bin[0] && -1 !== bin.slice(1).indexOf('1')) {
      prefix = '11111111';
    }
    bin = bin.split('').map(function (i) {
      return '0' === i ? '1' : '0';
    }).join('');

    return BigInt('0b' + prefix + bin) + BigInt(1);
  }
}
