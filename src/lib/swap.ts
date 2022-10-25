// import { BigNumber, ContractTransaction } from 'ethers';
// import { Token, ERC20Token, NativeToken } from '../classes/Token';
// import type { BeanstalkSDK } from './BeanstalkSDK';
// import Farm, { FarmEstimate, FarmFromMode, FarmToMode } from './farm/types';

// enum Pathway {
//   TRANSFER, // 0
//   ETH_WETH, // 1
//   BEAN_CRV3, // 2
//   BEAN_ETH, // 3
//   BEAN_WETH, // 4; make this BEAN_TRICRYPTO_UNDERLYING
//   BEAN_CRV3_UNDERLYING, // 5
// }

// export class Swap {
//   private readonly sdk: BeanstalkSDK;

//   constructor(sdk: BeanstalkSDK) {
//     this.sdk = sdk;
//   }

//   isPair(_tokenIn: Token, _tokenOut: Token, _pair: [Token, Token]) {
//     const s = new Set(_pair);
//     return s.has(_tokenIn) && s.has(_tokenOut);
//   }

//   getPathway = (_tokenIn: Token, _tokenOut: Token) => {
//     if (_tokenIn === _tokenOut) return Pathway.TRANSFER;
//     if (this.isPair(_tokenIn, _tokenOut, [this.sdk.tokens.ETH, this.sdk.tokens.WETH])) return Pathway.ETH_WETH;
//     if (this.isPair(_tokenIn, _tokenOut, [this.sdk.tokens.BEAN, this.sdk.tokens.CRV3])) return Pathway.BEAN_CRV3;
//     if (this.isPair(_tokenIn, _tokenOut, [this.sdk.tokens.BEAN, this.sdk.tokens.ETH])) return Pathway.BEAN_ETH;
//     if (this.isPair(_tokenIn, _tokenOut, [this.sdk.tokens.BEAN, this.sdk.tokens.WETH])) return Pathway.BEAN_WETH;
//     if (
//       (_tokenIn === this.sdk.tokens.BEAN && this.sdk.tokens.crv3Underlying.has(_tokenOut)) ||
//       (_tokenOut === this.sdk.tokens.BEAN && this.sdk.tokens.crv3Underlying.has(_tokenIn))
//     )
//       return Pathway.BEAN_CRV3_UNDERLYING;
//     return false;
//   };

//   async estimate(
//     forward: boolean,
//     amountIn: BigNumber,
//     _account: string,
//     _tokenIn: NativeToken | ERC20Token,
//     _tokenOut: NativeToken | ERC20Token,
//     _fromMode: FarmFromMode,
//     _toMode: FarmToMode
//   ): Promise<FarmEstimate> {
//     this.sdk.debug('[handleEstimate]', {
//       forward,
//       amountIn,
//       _account,
//       _tokenIn,
//       _tokenOut,
//       _fromMode,
//       _toMode,
//     });

//     const pathway = this.getPathway(_tokenIn, _tokenOut);

//     this.sdk.debug('[handleEstimate] got pathway: ', pathway);

//     /// Say I want to buy 1000 BEAN and I have ETH.
//     /// I select ETH as the input token, BEAN as the output token.
//     /// Then I type 1000 into the BEAN input.
//     ///
//     /// When this happens, `handleEstimate` is called
//     /// with `forward = false` (since we are finding the amount of
//     /// ETH needed to buy 1,000 BEAN, rather than the amount of BEAN
//     /// received for a set amount of ETH).
//     ///
//     /// In this instance, `_tokenIn` is BEAN and `_tokenOut` is ETH,
//     /// since we are quoting from BEAN to ETH.
//     ///
//     /// If forward-quoting, then the user's selected input token (the
//     /// first one that appears in the form) is the same as _tokenIn.
//     /// If backward-quoting, then we flip things.
//     const startToken = forward ? _tokenIn : _tokenOut;
//     /// Token <-> Token
//     if (pathway === Pathway.TRANSFER) {
//       this.sdk.debug('[handleEstimate] estimating: transferToken');
//       const thing = this.sdk.farm.transferToken(_tokenIn.address, _account, _fromMode, _toMode);
//       const _fns = [thing]
//       const _args = [amountIn]
//       const est = this.sdk.farm.estimate(_fns, _args, forward);
//       return est;
//     }

//     /// ETH <-> WETH
//     if (pathway === Pathway.ETH_WETH) {
//       this.sdk.debug(`[handleEstimate] estimating: ${startToken === this.sdk.tokens.ETH ? 'wrap' : 'unwrap'}`);
//       return this.sdk.farm.estimate(
//         [startToken === this.sdk.tokens.ETH ? this.sdk.farm.wrapEth(_toMode) : this.sdk.farm.unwrapEth(_fromMode)],
//         [amountIn],
//         forward
//       );
//     }

//     /// BEAN <-> 3CRV
//     if (pathway === Pathway.BEAN_CRV3) {
//       this.sdk.debug('[handleEstimate] estimating: BEAN <-> CRV3');
//       return this.sdk.farm.estimate(
//         [
//           this.sdk.farm.exchange(
//             this.sdk.farm.contracts.curve.pools.beanCrv3.address,
//             this.sdk.farm.contracts.curve.registries.metaFactory.address,
//             _tokenIn.address,
//             _tokenOut.address,
//             _fromMode,
//             _toMode
//           ),
//         ],
//         [amountIn],
//         forward
//       );
//     }

//     /// BEAN <-> ETH
//     if (pathway === Pathway.BEAN_ETH) {
//       this.sdk.debug('[handleEstimate] estimating: BEAN <-> ETH');
//       return this.sdk.farm.estimate(
//         startToken === this.sdk.tokens.ETH
//           ? [this.sdk.farm.wrapEth(FarmToMode.INTERNAL), ...this.sdk.farm.pair.WETH_BEAN('WETH', FarmFromMode.INTERNAL, _toMode)]
//           : [
//               ...this.sdk.farm.pair.WETH_BEAN(
//                 'BEAN',
//                 _fromMode,
//                 FarmToMode.INTERNAL // send WETH to INTERNAL
//               ), // amountOut is not exact
//               this.sdk.farm.unwrapEth(
//                 FarmFromMode.INTERNAL_TOLERANT // unwrap WETH from INTERNAL
//               ), // always goes to EXTERNAL because ETH is not ERC20 and therefore not circ. bal. compatible
//             ],
//         [amountIn],
//         forward
//       );
//     }

//     /// BEAN <-> WETH
//     if (pathway === Pathway.BEAN_WETH) {
//       this.sdk.debug('[handleEstimate] estimating: BEAN <-> WETH');
//       return this.sdk.farm.estimate(
//         startToken === this.sdk.tokens.WETH
//           ? this.sdk.farm.pair.WETH_BEAN('WETH', _fromMode, _toMode)
//           : this.sdk.farm.pair.WETH_BEAN('BEAN', _fromMode, _toMode),
//         [amountIn],
//         forward
//       );
//     }

//     /// BEAN <-> CRV3 Underlying
//     if (pathway === Pathway.BEAN_CRV3_UNDERLYING) {
//       this.sdk.debug('[handleEstimate] estimating: BEAN <-> 3CRV Underlying');
//       return this.sdk.farm.estimate(
//         [
//           this.sdk.farm.exchangeUnderlying(
//             this.sdk.farm.contracts.curve.pools.beanCrv3.address,
//             _tokenIn.address,
//             _tokenOut.address,
//             _fromMode,
//             _toMode
//           ),
//         ],
//         [amountIn],
//         forward
//       );
//     }

//     throw new Error('Unsupported swap mode.');
//   }

//   async execute(estimate: FarmEstimate, slippage: number):Promise<ContractTransaction>{
//     this.sdk.debug('[swap.execute] Executing swap', {estimate, slippage})
//     if (!estimate.steps) throw new Error('Unable to generate a transaction sequence');
//     const data = this.sdk.farm.encodeStepsWithSlippage(
//       estimate.steps,
//       slippage / 100,
//     );

//     const txn = await this.sdk.contracts.beanstalk.farm(data, { value: estimate.value });
//     this.sdk.debug('[swap.execute] transaction sent', {transaction: txn})
//     return txn;
//   }
// }
