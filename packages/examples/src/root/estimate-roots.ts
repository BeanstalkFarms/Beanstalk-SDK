import { ERC20Token, TokenSiloBalance, TokenValue } from "@beanstalk/sdk";
import { DepositCrate } from "@beanstalk/sdk/dist/types/lib/silo";
import { ethers } from "ethers";
import { sdk } from "../setup";

const PRECISION = ethers.utils.parseEther("1");

export async function estimateRoots(token: ERC20Token, deposits: TokenSiloBalance["deposited"]["crates"], isDeposit: boolean) {
  // Note that sdk.tokens.ROOT.getContract() == sdk.contracts.root.
  const [rootTotalSupply, rootUnderlyingBdvBefore, rootStalkBefore, rootSeedsBefore] = await Promise.all([
    sdk.tokens.ROOT.getTotalSupply(), // automaticaly pulls as TokenValue
    sdk.contracts.root.underlyingBdv().then((v) => sdk.tokens.ROOT.fromBlockchain(v)),
    sdk.silo.balanceOfStalk(sdk.contracts.root.address, true),
    sdk.silo.balanceOfSeeds(sdk.contracts.root.address)
  ]);

  // FIXME: this is just base stalk
  const { amount, stalk, seeds, bdv } = sdk.silo.sumDeposits(token, deposits);
}
