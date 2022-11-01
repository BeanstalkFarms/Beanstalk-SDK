const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { network, ethers } = require('hardhat');
const hardhatConfig = require('../hardhat.config');
const { OWNER, ACCOUNT1, resetFork, ACCOUNT2 } = require('./utils');

describe('Anvil', function() {
  it('has correct accounts', async function() {
    const accounts = await network.provider.send('eth_accounts');
    expect(accounts[0]).to.eq(OWNER);
    expect(accounts[1]).to.eq(ACCOUNT1);
    expect(accounts[2]).to.eq(ACCOUNT2);
  });

  it('started with correct block number', async function() {
    const anvilOptions = hardhatConfig?.networks?.anvil;

    const block = await network.provider.send('eth_getBlockByNumber', ['latest', false]);
    const blockNumber = parseInt(block.number, 16);

    expect(blockNumber).to.equal(anvilOptions.forkBlockNumber);
  });

  it('shows correct account balance', async function() {
    const bal = await ethers.provider.getBalance('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
    expect(bal.toString()).to.eq(ethers.BigNumber.from('10000000000000000000000').toString());
  });

  it('anvil_reset works', async function() {
    const fromAddress = ACCOUNT1;
    const toAddress = ACCOUNT2;

    // Transfer some ETH
    const wallet = await ethers.getSigner(fromAddress);
    const data = {
      to: toAddress,
      value: ethers.utils.parseEther('3000'),
    };
    const tx = await wallet.sendTransaction(data);
    const receipt = await tx.wait();
    const fee = receipt.gasUsed.mul(tx.gasPrice);

    // Confirm balances
    let balanceReceiver = await ethers.provider.getBalance(toAddress);
    let balanceSender = await ethers.provider.getBalance(fromAddress);
    expect(balanceReceiver.toString()).to.eq(ethers.BigNumber.from('13000000000000000000000').toString());
    expect(balanceSender.toString()).to.eq(ethers.BigNumber.from('6999998244906711289000').toString());
    expect(
      balanceSender
        .add(fee)
        .add(data.value)
        .toString()
    ).to.eq('10000000000000000000000');

    // expect(balanceSender.toString()).to.eq(ethers.BigNumber.from('6999998372031151144000').toString());

    // Reset the fork
    await resetFork();

    // Confirm balances are reset
    balanceReceiver = await ethers.provider.getBalance(toAddress);
    balanceSender = await ethers.provider.getBalance(toAddress);
    expect(balanceReceiver.toString()).to.eq(ethers.BigNumber.from('10000000000000000000000').toString());
    expect(balanceSender.toString()).to.eq(ethers.BigNumber.from('10000000000000000000000').toString());

    // Confirm block number reset
    const anvilOptions = hardhatConfig?.networks?.anvil;
    const block = await network.provider.send('eth_getBlockByNumber', ['latest', false]);
    const blockNumber = parseInt(block.number, 16);
    expect(blockNumber).to.equal(anvilOptions.forkBlockNumber);
  });

});
