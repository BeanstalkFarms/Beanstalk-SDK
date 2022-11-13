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

  async resetFork() {
    await this.sdk.provider.send("anvil_reset", [
      {
        forking: {
          jsonRpcUrl: "https://eth-mainnet.g.alchemy.com/v2/f6piiDvMBMGRYvCOwLJFMD7cUjIvI1TP"
        }
      }
    ]);
  }

  async mine() {
    await this.sdk.provider.send("evm_mine", []); // Just mines to the next block
  }

  /**
   * To add more erc20 tokens later, you need the slot number. Get it with this:
   * npx slot20 balanceOf TOKENADDRESS RANDOM_HOLDER_ADDRESS -v
   * npx slot20 balanceOf 0x3d5965EB520E53CC1A6AEe3A44E5c1De406E028F 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 -v
   * set reverse to true if mapping format is (key, slot)
   *
   * From this article: https://kndrck.co/posts/local_erc20_bal_mani_w_hh/
   *
   * @param account
   * @param balance
   */
  async setAllBalances(account: string, amount: string) {
    return Promise.allSettled([
      this.setDAIBalance(account, this.sdk.tokens.DAI.amount(amount)),
      this.setUSDCBalance(account, this.sdk.tokens.USDC.amount(amount)),
      this.setUSDTBalance(account, this.sdk.tokens.USDT.amount(amount)),
      this.setCRV3Balance(account, this.sdk.tokens.CRV3.amount(amount)),
      this.setWETHBalance(account, this.sdk.tokens.WETH.amount(amount)),
      this.setBEANBalance(account, this.sdk.tokens.BEAN.amount(amount))
    ]);
  }
  async setDAIBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.DAI.address, account, balance, 2);
  }
  async setUSDCBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.USDC.address, account, balance, 9);
  }
  async setUSDTBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.USDT.address, account, balance, 2);
  }
  async setCRV3Balance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.CRV3.address, account, balance, 3, true);
  }
  async setWETHBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.WETH.address, account, balance, 3);
  }
  async setBEANBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.BEAN.address, account, balance, 0);
  }
  async setROOTBalance(account: string, balance: TokenValue) {
    this.setBalance(this.sdk.tokens.ROOT.address, account, balance, 9);
  }

  private async setBalance(tokenAddress: string, account: string, balance: TokenValue, slot: number, reverse: boolean = false) {
    const values = [account, slot];
    if (reverse) values.reverse();
    const index = ethers.utils.solidityKeccak256(["uint256", "uint256"], values);
    await this.setStorageAt(tokenAddress, index.toString(), this.toBytes32(balance.toBigNumber()).toString());
  }

  private async setStorageAt(address: string, index: string, value: string) {
    await this.sdk.provider.send("hardhat_setStorageAt", [address, index, value]);
  }
  private toBytes32(bn: ethers.BigNumber) {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
  }

  //
  mockDepositCrate(token: ERC20Token, season: number, _amount: string, _currentSeason?: number) {
    const amount = token.amount(_amount);
    // @ts-ignore use private method
    return this.sdk.silo.makeDepositCrate(
      token,
      season,
      amount.toBlockchain(), // amount
      amount.toBlockchain(), // bdv
      _currentSeason || season + 100
    );
  }
}
