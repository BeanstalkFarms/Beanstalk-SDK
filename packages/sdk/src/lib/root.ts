import { ethers, Overrides } from "ethers";
import { ERC20Token } from "src/classes/Token";
import { TokenSiloBalance } from "src/lib/silo";
import { TokenValue } from "src/TokenValue";
import { DepositTransferStruct } from "../constants/generated/Beanstalk/Root";
import { BeanstalkSDK } from "./BeanstalkSDK";
import { FarmToMode } from "./farm/types";
import { SignedPermit } from "./permit";
import { DepositTokenPermitMessage, DepositTokensPermitMessage } from "./silo.utils";

const PRECISION = ethers.utils.parseEther("1");
export class Root {
  static sdk: BeanstalkSDK;

  /** @DISCUSS this pattern */
  static address: string;

  constructor(sdk: BeanstalkSDK) {
    Root.sdk = sdk;
    Root.address = sdk.contracts.root.address;
  }

  /**
   * Mint ROOT tokens. The `Root.sol` contract supports Beanstalk's
   * Deposit Transfer permits; this function unpacks a provided
   * signed permit into the proper argument slots.
   *
   * @dev Passing _overrides directly as the last parameter
   * of a contract method seems to make ethers treat it like
   * a parameter for the contract call. Instead, we unpack and
   * thus pass an empty object for overrides if _overrides is undef.
   */
  async mint(
    _depositTransfers: DepositTransferStruct[],
    _destination: FarmToMode,
    _minAmountOut: ethers.BigNumber, // FIXME
    _permit?: SignedPermit<DepositTokenPermitMessage | DepositTokensPermitMessage>,
    _overrides?: Overrides
  ) {
    if (_permit) {
      if ((_permit as SignedPermit<DepositTokenPermitMessage>).typedData.message.token) {
        let permit = _permit as SignedPermit<DepositTokenPermitMessage>;
        return Root.sdk.contracts.root.mintWithTokenPermit(
          _depositTransfers,
          _destination,
          _minAmountOut, // FIXME
          permit.typedData.message.token,
          permit.typedData.message.value,
          permit.typedData.message.deadline,
          permit.split.v,
          permit.split.r,
          permit.split.s,
          { ..._overrides }
        );
      } else if ((_permit as SignedPermit<DepositTokensPermitMessage>).typedData.message.tokens) {
        let permit = _permit as SignedPermit<DepositTokensPermitMessage>;
        return Root.sdk.contracts.root.mintWithTokensPermit(
          _depositTransfers,
          _destination,
          _minAmountOut, // FIXME
          permit.typedData.message.tokens,
          permit.typedData.message.values,
          permit.typedData.message.deadline,
          permit.split.v,
          permit.split.r,
          permit.split.s,
          { ..._overrides }
        );
      } else {
        throw new Error("Malformatted permit");
      }
    }

    return Root.sdk.contracts.root.mint(_depositTransfers, _destination, _minAmountOut, { ..._overrides });
  }

  async underlyingBdv() {
    return Root.sdk.contracts.root.underlyingBdv().then((v) => Root.sdk.tokens.ROOT.fromBlockchain(v));
  }

  /**
   * Off-chain estimation for the number of ROOT minted from a set of
   * `deposits` of `token`.
   * @param token
   * @param deposits
   * @param isDeposit
   */
  async estimateRoots(token: ERC20Token, deposits: TokenSiloBalance["deposited"]["crates"], isDeposit: boolean) {
    // @dev note that sdk.tokens.ROOT.getContract() == sdk.contracts.root.
    const [rootTotalSupply, rootUnderlyingBdvBefore, rootStalkBefore, rootSeedsBefore] = await Promise.all([
      Root.sdk.tokens.ROOT.getTotalSupply(), // automaticaly pulls as TokenValue
      this.underlyingBdv(),
      Root.sdk.silo.balanceOfStalk(Root.sdk.contracts.root.address, true), // include grown
      Root.sdk.silo.balanceOfSeeds(Root.sdk.contracts.root.address)
    ]);

    // FIXME: this is just base stalk
    const {
      stalk: totalStalkFromDeposits,
      seeds: totalSeedsFromDeposits,
      bdv: totalBdvFromDeposits
    } = Root.sdk.silo.sumDeposits(token, deposits);

    const rootStalkAfter = rootStalkBefore.add(totalStalkFromDeposits);
    const rootSeedsAfter = rootSeedsBefore.add(totalSeedsFromDeposits);
    const rootUnderlyingBdvAfter = isDeposit
      ? rootUnderlyingBdvBefore.add(totalBdvFromDeposits)
      : rootUnderlyingBdvBefore.sub(totalBdvFromDeposits);

    // First-time minting
    if (rootTotalSupply.eq(0)) {
      return {
        estimate: TokenValue.fromBlockchain(totalStalkFromDeposits.mul(1e8).toBlockchain(), 18),
        bdvRatio: TokenValue.fromHuman("100", 18),
        stalkRatio: TokenValue.fromHuman("100", 18),
        seedsRatio: TokenValue.fromHuman("100", 18),
        min: TokenValue.fromHuman("100", 18)
      };
    }

    throw new Error("unknown");

    //   // Deposit
    //   else if (isDeposit) {

    //     const bdvRatio = mulDiv(
    //       rootUnderlyingBdvAfter.toBigNumber(),
    //       PRECISION,
    //       rootUnderlyingBdvBefore.toBigNumber(),
    //       "down"
    //     );
    //     const stalkRatio = mulDiv(
    //       rootStalkAfter.toBigNumber(),
    //       PRECISION,
    //       rootStalkBefore.toBigNumber(),
    //       "down"
    //     );
    //     const seedsRatio = mulDiv(
    //       rootSeedsAfter.toBigNumber(),
    //       PRECISION,
    //       rootSeedsBefore.toBigNumber(),
    //       "down"
    //     );
    //     const min = _min(bdvRatio, stalkRatio, seedsRatio);
    //     return {
    //       estimate: TokenValue.fromBlockchain(
    //         mulDiv(rootTotalSupply.toBigNumber(), min, PRECISION, "down")
    //           .sub(rootTotalSupply.toBigNumber())
    //           .toString(),
    //         18
    //       ),
    //       bdvRatio: TokenValue.fromBlockchain(bdvRatio.toString(), 18),
    //       stalkRatio: TokenValue.fromBlockchain(stalkRatio.toString(), 18),
    //       seedsRatio: TokenValue.fromBlockchain(seedsRatio.toString(), 18),
    //       min: TokenValue.fromBlockchain(min.toString(), 18),
    //     };
    //   }

    //   // Withdraw
    //   else {
    //     const bdvRatio = mulDiv(
    //       rootUnderlyingBdvAfter.toBigNumber(),
    //       PRECISION,
    //       rootUnderlyingBdvBefore.toBigNumber(),
    //       "up"
    //     );
    //     const stalkRatio = mulDiv(
    //       rootStalkAfter.toBigNumber(),
    //       PRECISION,
    //       rootStalkBefore.toBigNumber(),
    //       "up"
    //     );
    //     const seedsRatio = mulDiv(
    //       rootSeedsAfter.toBigNumber(),
    //       PRECISION,
    //       rootSeedsBefore.toBigNumber(),
    //       "up"
    //     );
    //     const max = _max(bdvRatio, stalkRatio, seedsRatio);

    //     return {
    //       estimate: rootTotalSupply.sub(
    //         mulDiv(rootTotalSupply.toBigNumber(), max, PRECISION, "up")
    //       ),
    //       bdvRatio: TokenValue.fromBlockchain(bdvRatio.toString(), 18),
    //       stalkRatio: TokenValue.fromBlockchain(stalkRatio.toString(), 18),
    //       seedsRatio: TokenValue.fromBlockchain(seedsRatio.toString(), 18),
    //       max: TokenValue.fromBlockchain(max.toString(), 18),
    //     };
    //   }
  }
}
