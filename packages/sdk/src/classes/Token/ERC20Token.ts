import { BigNumber, ContractTransaction } from "ethers";
import { ERC20__factory } from "src/constants/generated";
import { PromiseOrValue } from "src/constants/generated/common";
import { ERC20Permit } from "src/constants/generated/ERC20Permit";
import { ERC20Permit__factory } from "src/constants/generated/factories/ERC20Permit__factory";
import { Token } from "./Token";
import { TokenValue } from "src/classes/TokenValue";

export class ERC20Token extends Token {
  public contract: ERC20Permit;

  //////////////////////// Setup ////////////////////////

  // @fixme this throws the following error:
  // src/lib/tokens.ts(57,32): semantic error TS2345: Argument of type 'BeanstalkSDK' is not assignable to parameter of type 'never'.
  //
  // constructor(...args: ConstructorParameters<typeof Token>) {
  //   super(...args);
  //   if (!this.address) throw new Error('Address is required for ERC20 token instancess');
  // }

  //////////////////////// Contract Instance ////////////////////////

  public getContract() {
    if (!this.contract) {
      this.contract = ERC20Permit__factory.connect(this.address, Token.sdk.providerOrSigner);
    }
    return this.contract;
  }

  //////////////////////// On-chain Configuration ////////////////////////

  /** @fixme */
  public async getName() {
    if (this.name) return this.name;
    this.name = await this.getContract().name();
    return this.name;
  }

  /** @fixme */
  static getName(tokenAddress: string) {
    const tok = ERC20__factory.connect(tokenAddress, this.sdk.provider);
    return tok.name();
  }

  /**
   * Get the on-chain `.decimals()` for an ERC-20 token.
   * @todo make this work with ERC-1155 (does it already?)
   * @note stored onchain in hex format, need to decode.
   */
  static getDecimals(tokenAddress: string) {
    const tok = ERC20__factory.connect(tokenAddress, this.sdk.provider);
    return tok.decimals();
  }

  //////////////////////// Contract Method Extensions ////////////////////////

  public getBalance(account: string) {
    return this.getContract()
      .balanceOf(account)
      .then((result) => TokenValue.fromBlockchain(result, this.decimals))
      .catch((err: Error) => {
        console.error(`[ERC20Token] ${this.symbol} failed to call balanceOf(${account})`, err);
        throw err;
      });
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllowance(account: string, spender: string): Promise<TokenValue | undefined> {
    return this.getContract()
      .allowance(account, spender)
      .then((result) => TokenValue.fromBlockchain(result, this.decimals));
  }

  public getTotalSupply(): Promise<TokenValue> | undefined {
    return this.getContract()
      .totalSupply()
      .then((result) => TokenValue.fromBlockchain(result, this.decimals));
  }

  public approve(spender: PromiseOrValue<string>, value: PromiseOrValue<BigNumber>): Promise<ContractTransaction> {
    return this.getContract().approve(spender, value.toString());
  }
}
