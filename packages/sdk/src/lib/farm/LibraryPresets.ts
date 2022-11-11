import { ethers } from "ethers";
import { ERC20Token, Token } from "src/classes/Token";
import { Step, StepGenerator } from "src/classes/Workflow";
import { BeanstalkSDK } from "src/lib/BeanstalkSDK";
import { Farmable, FarmFromMode, FarmToMode } from "../farm/types";
import { EIP2612PermitMessage, SignedPermit } from "../permit";
import { Exchange, ExchangeUnderlying } from "./actions/index";

import { Action } from "./types";

export type ActionBuilder = (fromMode?: FarmFromMode, toMode?: FarmToMode) => StepGenerator<string> | StepGenerator<string>[];

export class LibraryPresets {
  static sdk: BeanstalkSDK;
  public readonly weth2usdt: ActionBuilder;
  public readonly usdt2bean: ActionBuilder;
  public readonly usdt2weth: ActionBuilder;
  public readonly bean2usdt: ActionBuilder;
  public readonly weth2bean: ActionBuilder;
  public readonly bean2weth: ActionBuilder;

  /**
   * Load the Pipeline in preparation for a set Pipe actions.
   */
  public loadPipeline(
    _token: ERC20Token,
    // _amount: string, // ??
    _from: FarmFromMode,
    _permit?: SignedPermit<EIP2612PermitMessage>
  ) {
    let actions: Farmable[] = [];

    // FIXME
    if (_from !== FarmFromMode.EXTERNAL) throw new Error("Not implemented");

    // give beanstalk permission to send this ERC-20 token from my balance -> pipeline
    if (_permit) {
      actions.push(async function permitERC20(_amountInStep: ethers.BigNumber) {
        return LibraryPresets.sdk.contracts.beanstalk.interface.encodeFunctionData("permitERC20", [
          _token.address, // token address
          await LibraryPresets.sdk.getAccount(), // owner
          LibraryPresets.sdk.contracts.beanstalk.address, // spender
          _amountInStep.toString(), // value
          _permit.typedData.message.deadline, // deadline
          _permit.split.v,
          _permit.split.r,
          _permit.split.s,
        ]);
      });
    }

    // transfer erc20 token from beanstalk -> pipeline
    actions.push(async function transferToken(_amountInStep: ethers.BigNumber) {
      return LibraryPresets.sdk.contracts.beanstalk.interface.encodeFunctionData("transferToken", [
        _token.address, // token
        LibraryPresets.sdk.contracts.pipeline.address, // recipient
        _amountInStep.toString(), // amount
        _from, // from
        FarmToMode.EXTERNAL, // to
      ]);
    });

    return actions;
  }

  constructor(sdk: BeanstalkSDK) {
    LibraryPresets.sdk = sdk;

    ///////// WETH <> USDT ///////////
    this.weth2usdt = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new Exchange(
        sdk.contracts.curve.pools.tricrypto2.address,
        sdk.contracts.curve.registries.cryptoFactory.address,
        sdk.tokens.WETH,
        sdk.tokens.USDT,
        fromMode,
        toMode
      );

    this.usdt2weth = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new Exchange(
        sdk.contracts.curve.pools.tricrypto2.address,
        sdk.contracts.curve.registries.cryptoFactory.address,
        sdk.tokens.USDT,
        sdk.tokens.WETH,
        fromMode,
        toMode
      );

    ///////// BEAN <> USDT ///////////
    this.usdt2bean = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new ExchangeUnderlying(sdk.contracts.curve.pools.beanCrv3.address, sdk.tokens.USDT, sdk.tokens.BEAN, fromMode, toMode);

    this.bean2usdt = (fromMode?: FarmFromMode, toMode?: FarmToMode) =>
      new ExchangeUnderlying(sdk.contracts.curve.pools.beanCrv3.address, sdk.tokens.BEAN, sdk.tokens.USDT, fromMode, toMode);

    //////// WETH <> BEAN
    this.weth2bean = (fromMode?: FarmFromMode, toMode?: FarmToMode) => [
      this.weth2usdt(fromMode, FarmToMode.INTERNAL) as Action,
      this.usdt2bean(FarmFromMode.INTERNAL, toMode) as Action,
    ];
    this.bean2weth = (fromMode?: FarmFromMode, toMode?: FarmToMode) => [
      this.bean2usdt(fromMode, FarmToMode.INTERNAL) as Action,
      this.usdt2weth(FarmFromMode.INTERNAL, toMode) as Action,
    ];
  }
}
