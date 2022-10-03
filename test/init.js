const { expect } = require('chai');
const { network } = require('hardhat');
const hardhatConfig = require('../hardhat.config');

describe('Anvil', function() {
  it('has correct accounts', async function() {
    const accounts = await network.provider.send('eth_accounts');
    expect(accounts[0]).to.eq('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
    expect(accounts[1]).to.eq('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
  });

  it('started with correct block number', async function() {
    const anvilOptions = hardhatConfig?.networks?.anvil;

    const block = await network.provider.send('eth_getBlockByNumber', ['latest', false]);
    const blockNumber = parseInt(block.number, 16);

    expect(blockNumber).to.equal(anvilOptions.forkBlockNumber);
  });

  it('shows correct account balance', async function() {
    const accParams = ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'latest'];
    const balance = await network.provider.send('eth_getBalance', accParams);
    expect(parseInt(balance, 16)).to.eq(parseInt('0x21e19e0c9bab2400000', 16));
  });
});
