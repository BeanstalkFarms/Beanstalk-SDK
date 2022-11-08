import { ethers } from "ethers";
import { AdvancedPipeStruct, PipeStruct } from "../../constants/generated/Beanstalk/Beanstalk";
import { BeanstalkSDK } from "../BeanstalkSDK";
import { Clipboard } from "./clipboard";

export type { AdvancedPipeStruct, PipeStruct };

export class Depot {
  static sdk: BeanstalkSDK;
  constructor(sdk: BeanstalkSDK) {
    Depot.sdk = sdk;
  }

  pipe(packet: PipeStruct) {
    return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("pipe", [packet]);
  }

  advancedPipe(packets: AdvancedPipeStruct[], value: ethers.BigNumber = ethers.BigNumber.from(0)) {
    return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("advancedPipe", [packets, value]);
  }

  etherPipe(packet: PipeStruct, value: ethers.BigNumber) {
    // TODO: discuss whether to include these types of warnings
    if (value.eq(0)) {
      console.warn("Optimization: using etherPipe with value = 0 not not recommended. Use sdk.depot.pipe() instead.");
    }
    return Depot.sdk.contracts.beanstalk.interface.encodeFunctionData("etherPipe", [packet, value]);
  }

  ///
  packet<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
    _contract: C,
    _method: M,
    _args: A
  ): PipeStruct {
    return {
      target: _contract.address,
      data: _contract.interface.encodeFunctionData(_method as string, _args),
    };
  }

  /**
   *
   * @param contract
   * @param method
   * @param args
   * @param advancedData
   * @returns
   */
  advancedPacket<C extends ethers.Contract, M extends keyof C["functions"], A extends Parameters<C["functions"][M]>>(
    contract: C,
    method: M,
    args: A,
    advancedData: string = Clipboard.encode([])
  ): AdvancedPipeStruct {
    return {
      target: contract.address,
      callData: contract.interface.encodeFunctionData(method as string, args),
      advancedData,
    };
  }

  encodeAdvancedData = Clipboard.encode;
}
