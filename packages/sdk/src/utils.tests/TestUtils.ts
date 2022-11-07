import { ethers } from "ethers";
import { BeanstalkSDK, DataSource, ERC20Token, TokenSiloBalance, TokenValue } from "src/index";
import { addr, logSiloBalance } from "src/utils.tests";

export default class TestUtils {
  sdk: BeanstalkSDK;
  provider: ethers.providers.JsonRpcProvider;

  constructor(sdk: BeanstalkSDK) {
    this.sdk = sdk;
    this.provider = sdk.provider as ethers.providers.JsonRpcProvider; // fixme
  }

  /**
   * Snapshot the state of the blockchain at the current block
   */
  async snapshot() {
    const id = await this.provider.send("evm_snapshot", []);
    console.log("Created snapshot: ", id);
    return id;
  }

  /**
   * Revert the state of the blockchain to a previous snapshot.
   * Takes a single parameter, which is the snapshot id to revert to
   */
  async revert(id: number) {
    await this.provider.send("evm_revert", [id]);
  }

  /**
   * Send a deposit from the BF Multisig -> `to`
   */
  async sendDeposit(
    to: string,
    from: string = addr.BF_MULTISIG,
    token: ERC20Token = this.sdk.tokens.BEAN
  ): Promise<TokenSiloBalance["deposited"]["crates"][number]> {
    await this.provider.send("anvil_impersonateAccount", [from]);

    const balance = await this.sdk.silo.getBalance(token, from, { source: DataSource.LEDGER });
    const crate = balance.deposited.crates[balance.deposited.crates.length - 1];
    const season = crate.season.toString();
    const amount = crate.amount.toBlockchain();

    logSiloBalance(from, balance);
    console.log(`Transferring ${crate.amount.toHuman()} ${token.symbol} to ${to}...`, { season, amount });

    const txn = await this.sdk.contracts.beanstalk
      .connect(await this.provider.getSigner(from))
      .transferDeposit(from, to, token.address, season, amount);

    await txn.wait();
    await this.provider.send("anvil_stopImpersonatingAccount", [from]);
    console.log(`Transferred!`);

    return crate;
  }

  /**
   * Send BEAN from the BF Multisig -> `to`.
   */
  async sendBean(to: string, amount: TokenValue, from: string = addr.BF_MULTISIG, token: ERC20Token = this.sdk.tokens.BEAN) {
    console.log(`Sending ${amount.toHuman()} BEAN from ${from} -> ${to}...`);

    await this.provider.send("anvil_impersonateAccount", [from]);
    const contract = token.getContract().connect(await this.provider.getSigner(from));
    await contract.transfer(to, amount.toBlockchain()).then((r) => r.wait());
    await this.provider.send("anvil_stopImpersonatingAccount", [from]);

    console.log(`Sent!`);
  }
}
