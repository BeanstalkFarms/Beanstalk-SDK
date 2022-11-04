import { expect } from "chai";
import { DataSource } from "../types";
import { setupConnection } from "../../test/provider";

import { BeanstalkSDK } from "./BeanstalkSDK";
import { Token } from "../classes/Token";
import { TokenSiloBalance } from "./silo";
import { _parseWithdrawalCrates } from "./silo.utils";
import { BigNumber, ethers } from "ethers";
import { TokenValue } from "../classes/TokenValue";

/// Utilities
const RUN_TIMER = false;
const timer = async (fn: Promise<any>, label: string) => {
  if (RUN_TIMER) console.time(label);
  const r = await fn;
  if (RUN_TIMER) console.timeEnd(label);
  return r;
};

/// Constants
const account1 = "0x9a00beffa3fc064104b71f6b7ea93babdc44d9da"; // whale
const account2 = "0x0"; // zero addy
const account3 = "0x21DE18B6A8f78eDe6D16C50A167f6B222DC08DF7"; // BF Multisig

/// Setup
let sdk: BeanstalkSDK;
let account: string;
beforeAll(async () => {
  const { signer, provider, account: _account } = await setupConnection();
  sdk = new BeanstalkSDK({
    provider: provider,
    signer: signer,
    subgraphUrl: "https://graph.node.bean.money/subgraphs/name/beanstalk-testing",
  });
  account = _account;
});

///
describe("Utilities", function () {
  it("splits raw withdrawals into withdrawn and claimable", () => {
    const crate1 = { amount: ethers.BigNumber.from(1000 * 1e6) };
    const crate2 = { amount: ethers.BigNumber.from(2000 * 1e6) };
    const crate3 = { amount: ethers.BigNumber.from(3000 * 1e6) };
    const result = _parseWithdrawalCrates(
      sdk.tokens.BEAN,
      {
        "6074": crate1, // => claimable
        "6075": crate2, // => withdrawn
        "6076": crate3, // => withdrawn
      },
      BigNumber.from(6074)
    );
    expect(result.claimable.amount).to.be.instanceOf(TokenValue);
    expect(result.withdrawn.amount).to.be.instanceOf(TokenValue);

    // expect(result.claimable.amount.toBlockchain()).to.be.eq(BigNumber.from(1000 * 1e6).toString());
    // expect(result.withdrawn.amount.toBlockchain()).to.be.eq(BigNumber.from((2000 + 3000) * 1e6).toString());
    expect(result.claimable.amount.eq(TokenValue.fromHuman(1000, 6))).to.be.true;
    expect(result.withdrawn.amount.eq(TokenValue.fromHuman(5000, 6))).to.be.true;

    expect(result.claimable.crates.length).to.be.eq(1);
    expect(result.withdrawn.crates.length).to.be.eq(2);
  });
});
//1000_000000
//1000_000000
///
describe("Function: getBalance", function () {
  it("returns an empty object", async () => {
    const balance = await sdk.silo.getBalance(sdk.tokens.BEAN, account2, { source: DataSource.SUBGRAPH });
    expect(balance.deposited.amount.eq(0)).to.be.true;
    expect(balance.withdrawn.amount.eq(0)).to.be.true;
    expect(balance.claimable.amount.eq(0)).to.be.true;
  });
  it("loads an account with deposits (fuzzy)", async () => {
    const balance = await sdk.silo.getBalance(sdk.tokens.BEAN, account3, { source: DataSource.SUBGRAPH });
    expect(balance.deposited.amount.gt(10_000)).to.be.true; // FIXME
    expect(balance.withdrawn.amount.eq(0)).to.be.true;
    expect(balance.claimable.amount.eq(0)).to.be.true;
  });
  it("source: ledger === subgraph", async function () {
    const [ledger, subgraph] = await Promise.all([
      timer(sdk.silo.getBalance(sdk.tokens.BEAN, account1, { source: DataSource.LEDGER }), "Ledger result time"),
      timer(sdk.silo.getBalance(sdk.tokens.BEAN, account1, { source: DataSource.SUBGRAPH }), "Subgraph result time"),
    ]);
    expect(ledger).to.deep.eq(subgraph);
  });
});

///
describe("Function: getBalances", function () {
  let ledger: Map<Token, TokenSiloBalance>;
  let subgraph: Map<Token, TokenSiloBalance>;

  // Pulled an account with some large positions for testing
  // @todo pick several accounts and loop
  beforeAll(async () => {
    [ledger, subgraph] = await Promise.all([
      timer(sdk.silo.getBalances(account1, { source: DataSource.LEDGER }), "Ledger result time"),
      timer(sdk.silo.getBalances(account1, { source: DataSource.SUBGRAPH }), "Subgraph result time"),
    ]);
  });

  it("source: ledger === subgraph", async function () {
    for (let [token, value] of ledger.entries()) {
      expect(subgraph.has(token)).to.be.true;
      try {
        // received              expected
        expect(value).to.deep.eq(subgraph.get(token));
      } catch (e) {
        console.log(`Token: ${token.name}`);
        console.log(`Expected (subgraph):`, subgraph.get(token));
        console.log(`Received (ledger):`, value);
        throw e;
      }
    }
  });
});

///
describe("Silo Deposit Permits", function () {
  it("permits", async () => {
    const owner = account;
    const spender = sdk.contracts.root.address;
    const token = sdk.tokens.BEAN.address;
    const amount = sdk.tokens.BEAN.fromHuman("100").toString();

    // const startAllowance = await sdk.contracts.beanstalk.depositAllowance(owner, spender, token);
    // const depositPermitNonces = await sdk.contracts.beanstalk.depositPermitNonces(owner);
    // console.log("Initial allowance: ", startAllowance.toString())
    // console.log("Nonce: ", depositPermitNonces.toString())

    // Get permit
    const permitData = await sdk.silo.permitDepositToken(
      owner,
      spender,
      token,
      amount,
      undefined, // nonce
      undefined // deadline
    );

    const sig = await sdk.permit.sign(owner, permitData);

    // console.log("Signed permit", permitData, sig)

    // Send permit
    await sdk.contracts.beanstalk
      .permitDeposit(
        owner,
        spender,
        permitData.message.token,
        permitData.message.value,
        permitData.message.deadline,
        sig.split.v,
        sig.split.r,
        sig.split.s
      )
      .then((txn) => txn.wait());

    // Verify
    const allowance = await sdk.contracts.beanstalk.depositAllowance(owner, spender, token);
    expect(allowance.toString()).to.be.eq(amount);
  });
});

///
// describe('Contract aliases', function () {
//   it('calls aliased $ methods properly', async () => {
//     expect(await sdk.silo.$lastUpdate(account1)).to.be.greaterThan(0);
//   });
// })
