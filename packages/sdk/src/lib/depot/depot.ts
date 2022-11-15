// import { ethers } from "ethers";
// import { Action, ActionResult, BaseAction } from "src/lib/farm/types";
import { AdvancedPipeCallStruct, PipeCallStruct } from "../../constants/generated/Beanstalk/Beanstalk";
// import { BeanstalkSDK } from "../BeanstalkSDK";
// import { Clipboard } from "./clipboard";

export type { AdvancedPipeCallStruct, PipeCallStruct };

// interface PipeStep {
//   encode(): AdvancedPipeStruct;
//   decode(data: string): ethers.utils.Result;
//   decodeResult(data: string): ethers.utils.Result;
// }

// export class AdvancedPipe extends BaseAction implements Action {
//   public steps: PipeStep[] = [];

//   name: string = "AdvancedPipe";
//   amountOut: ethers.BigNumber = ethers.BigNumber.from(0);

//   public add<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
//     contract: C,
//     method: M,
//     args: A,
//     clipboard: string = Clipboard.encode([])
//   ) {
//     this.steps.push({
//       // fixme: this doesn't have to mimick the Action struct
//       encode: () =>
//         ({
//           target: contract.address,
//           callData: contract.interface.encodeFunctionData(method as string, args),
//           advancedData: clipboard,
//         } as AdvancedPipeStruct),
//       decode: (data: string) => contract.interface.decodeFunctionData(method as string, data),
//       decodeResult: (result: string) => contract.interface.decodeFunctionResult(method as string, result),
//     });
//   }

//   async run(_amountInStep: ethers.BigNumber, _forward: boolean = true) {
//     return {
//       name: this.name,
//       amountOut: ethers.BigNumber.from(0),
//       encode: () => this.encode(),
//       decode: (data: string) => this.decode(data),
//       decodeResult: (result: string) => this.decodeResult(result),
//     };
//   }

//   // Encoding a Pipe also "encodes" the steps inside it
//   // In the case of pipelines, each step is an (Advanced)PipeStruct
//   encode(): string {
//     return AdvancedPipe.sdk.contracts.beanstalk.interface.encodeFunctionData("advancedPipe", [
//       this.steps.map((p) => p.encode()),
//       ethers.BigNumber.from("0"), // fixme
//     ]);
//   }

//   decode(data: string): ethers.utils.Result {
//     return AdvancedPipe.sdk.contracts.beanstalk.interface.decodeFunctionData("advancedPipe", data);
//   }

//   // Decoding a Pipe also decodes the steps inside it
//   decodeResult(result: string): ethers.utils.Result[] {
//     const decodedPipe = AdvancedPipe.sdk.contracts.beanstalk.interface.decodeFunctionResult("advancedPipe", result);
//     AdvancedPipe.sdk.debug(`[AdvancedPipe.decodeResult()]`, result, decodedPipe, decodedPipe.results);
//     return (decodedPipe.results as string[]).map((data, index) => this.steps[index].decodeResult(data));
//   }
// }

// export class Depot {
//   static sdk: BeanstalkSDK;

//   constructor(sdk: BeanstalkSDK) {
//     Depot.sdk = sdk;
//   }

//   static AdvancedPipe = AdvancedPipe;

//   createAdvancedPipe() {
//     const pipe = new AdvancedPipe();
//     pipe.setSDK(Depot.sdk);
//     return pipe;
//   }

//   // ---- V1 ---- //

//   pipe(packet: PipeStruct) {
//     return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("pipe", [packet]);
//   }

//   advancedPipe(packets: AdvancedPipeStruct[], value: ethers.BigNumber = ethers.BigNumber.from(0)) {
//     return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("advancedPipe", [packets, value]);
//   }

//   etherPipe(packet: PipeStruct, value: ethers.BigNumber) {
//     // TODO: discuss whether to include these types of warnings
//     if (value.eq(0)) {
//       console.warn("Optimization: using etherPipe with value = 0 not not recommended. Use sdk.depot.pipe() instead.");
//     }
//     return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("etherPipe", [packet, value]);
//   }

//   ///
//   packet<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
//     _contract: C,
//     _method: M,
//     _args: A
//   ): PipeStruct {
//     return {
//       target: _contract.address,
//       data: _contract.interface.encodeFunctionData(_method as string, _args),
//     };
//   }

//   /**
//    *
//    * @param contract
//    * @param method
//    * @param args
//    * @param advancedData
//    * @returns
//    */
//   advancedPacket<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
//     contract: C,
//     method: M,
//     args: A,
//     advancedData: string = Clipboard.encode([])
//   ): AdvancedPipeStruct {
//     return {
//       target: contract.address,
//       callData: contract.interface.encodeFunctionData(method as string, args),
//       advancedData,
//     };
//   }

//   encodeAdvancedData = Clipboard.encode;
// }

export default {};
