import { BigNumber, ethers } from "ethers";
import { Step } from "src/classes/Workflow";
import { Token } from "../../classes/Token";
import { BeanstalkSDK } from "../BeanstalkSDK";

export enum FarmFromMode {
  EXTERNAL = "0",
  INTERNAL = "1",
  INTERNAL_EXTERNAL = "2",
  INTERNAL_TOLERANT = "3",
}
export enum FarmToMode {
  EXTERNAL = "0",
  INTERNAL = "1",
}

export type Farmable =
  | Action // single action
  | ActionFunction // single action function
  | Farmable[]; // array of actions or action functions (mixed)

export class BaseAction {
  static sdk: BeanstalkSDK;

  public setSDK(sdk: BeanstalkSDK) {
    BaseAction.sdk = sdk;
  }

  protected direction(_x1: Token, _x2: Token, _forward: boolean): Token[] {
    return _forward ? [_x1, _x2] : [_x2, _x1];
  }
}

export abstract class StepClass<EncodedResult extends any = string> {
  static sdk: BeanstalkSDK;
  name: string;

  public setSDK(sdk: BeanstalkSDK) {
    BaseAction.sdk = sdk;
  }

  abstract run(_amountInStep: ethers.BigNumber, _forward: boolean): Promise<Step<EncodedResult>>;
}

export type ActionFunction = (
  amountIn: BigNumber,
  forward?: boolean
) =>
  | (string | ActionResult) // synchronous
  | Promise<string | ActionResult>; // asynchronous

export interface Action extends BaseAction {
  name: string;
  run(amountInStep: ethers.BigNumber, forward: boolean): Promise<ActionResult>;
}

export type ActionResult = {
  name: string;
  amountOut: ethers.BigNumber;
  value?: ethers.BigNumber;
  data?: any;
  encode: (minAmountOut?: ethers.BigNumber) => string;
  decode: (data: string) => Record<string, any>;
  decodeResult: (result: any) => ethers.utils.Result;
  print?: (result: any) => string;
};
