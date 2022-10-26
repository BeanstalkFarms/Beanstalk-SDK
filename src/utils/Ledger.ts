import { BigNumber as BNJS } from 'ethers';
import BigNumber from 'bignumber.js';
import { Token } from '../classes/Token';
// import type Token from '~/classes/Token';
// import { ChainConstant, SupportedChainId } from '~/constants';
// import { toTokenUnitsBN } from './Tokens';

// -------------------------
// Chain Result Helpers
// -------------------------

// export enum Source {
//   SUBGRAPH,
//   LOCAL
// }

// -------------------------
// Chain Result Helpers
// -------------------------

// export const identityResult = (result: any) => result;

// FIXME: `instanceof BNJS` call; is this faster than always calling `.toString()`?
// export const bigNumberResult = (result: any) => new BigNumber(result instanceof BNJS ? result.toString() : result);
// TODO: Discuss this
export const bigNumberResult = (result: BigNumber | BNJS) =>
  new BigNumber(result.hasOwnProperty('_hex') ? (result as BNJS).toString() : (result as BigNumber));

// /**
//  * Return a formatted error string from a transaction error thrown by ethers.
//  * @FIXME improve parsing
//  */
// export const parseError = (error: any) => {
//   switch (error.code) {
//     /// ethers
//     case 'UNSUPPORTED_OPERATION':
//     case 'CALL_EXCEPTION':
//     case 'UNPREDICTABLE_GAS_LIMIT':
//       return `Error: ${error.reason}`;

//     ///
//     case -32603:
//       if (error.data && error.data.message) {
//         const matches = (error.data.message as string).match(/(["'])(?:(?=(\\?))\2.)*?\1/);
//         return matches?.[0]?.replace(/^'(.+(?='$))'$/, '$1') || error.data.message;
//       }
//       return error.message.replace('execution reverted: ', '');

//     /// MetaMask - RPC Error: MetaMask Tx Signature: User denied transaction signature.
//     case 4001:
//       return 'You rejected the signature request.';

//     /// Unknown
//     default:
//       if (error?.message) return `${error?.message || error?.toString()}.${error?.code ? ` (code=${error?.code})` : ''}`;
//       return `An unknown error occurred.${error?.code ? ` (code=${error?.code})` : ''}`;
//   }
// };

// /**
//  * Recursively parse all instances of BNJS as BigNumber
//  * @unused
//  */
//  export const bn = (v: any) => (v instanceof BNJS ? new BigNumber(v.toString()) : false);
//  export const parseBNJS = (_o: { [key: string]: any }) => {
//    const o: { [key: string]: any } = {};
//    Object.keys(_o).forEach((k: string) => {
//      o[k] =
//        bn(_o[k]) ||
//        (Array.isArray(_o[k]) ? _o[k].map((v: any) => bn(v) || v) : _o[k]);
//    });
//    return o;
//  };
