const { BigNumber } = require('ethers');
const hardhatConfig = require('../../hardhat.config');
const { expect } = require('chai');

module.exports.OWNER = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
module.exports.ACCOUNT1 = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
module.exports.ACCOUNT2 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
module.exports.START_ETH_BALANCE = BigNumber.from(ethers.utils.parseEther('10000'));

const anvilOptions = hardhatConfig?.networks?.anvil;
module.exports.resetFork = async () => {
  const forkUrl = anvilOptions.forkUrl;
  const forkBlockNumber = anvilOptions.forkBlockNumber;
  await network.provider.send('anvil_reset', [
    {
      forking: {
        jsonRpcUrl: forkUrl,
        blockNumber: forkBlockNumber,
      },
    },
  ]);
  console.log('Anvil reset');
};

module.exports.expectBalanceDifference = async function(startBalance, amount, tx, endBalance) {
  const txReceipt = await tx.wait();
  const fee = txReceipt.gasUsed.mul(tx.gasPrice);
  const total = startBalance
    .sub(amount)
    .sub(fee)
    .toString();

  expect(total).eq(endBalance.toString())
};

module.exports.expectTokenBalance = async function(token, address, amount) {
  const balance = await token.getBalance(address);
  expect(balance.toString()).to.eq(amount.toString());
};
