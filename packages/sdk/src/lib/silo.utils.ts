// import BigNumber from "bignumber.js";
import { Token } from "../classes/Token";
import { ZERO_BeanNumber, ZERO_BN } from "../constants";
import { MapValueType } from "../types";
import { BeanNumber } from "../utils/BeanNumber";
import { DecimalBigNumber } from "../utils/DecimalBigNumber";
// import { toTokenUnitsBN } from "../utils/Tokens";
import { EventProcessorData } from "./events/processor";
import { EIP712PermitMessage } from "./permit";
import { Crate, DepositCrate, TokenSiloBalance, WithdrawalCrate } from "./silo";

// FIXME: resolve with EIP712PermitMessage
export type DepositTokenPermitMessage = EIP712PermitMessage<{
  token: string;
  value: number | string;
}>

export type DepositTokensPermitMessage = EIP712PermitMessage<{
  tokens: string[];
  values: (number | string)[];
}>

export type CrateSortFn = <T extends Crate<BeanNumber>>(crates: T[]) => T[];

/**
 * Beanstalk doesn't automatically re-categorize withdrawals as "claimable".
 * "Claimable" just means that the `season` parameter stored in the withdrawal
 * event is less than or equal to the current `season()`.
 * 
 * This function serves two purposes:
 * 1. Break generic withdrawals into
 *    "withdrawn" (aka transit), which cannot yet be claimed
 *    "claimable" (aka receivable), which are eligible to be claimed
 * 2. Convert each crate amount to the appropriate number of decimals.
 */
export const _parseWithdrawalCrates = (
  token: Token,
  withdrawals: MapValueType<EventProcessorData['withdrawals']>,
  currentSeason: BeanNumber
) : {
  withdrawn: TokenSiloBalance['withdrawn'];
  claimable: TokenSiloBalance['claimable'];
} => {
  let withdrawnBalance = ZERO_BeanNumber;           // aka "transit"
  let claimableBalance = ZERO_BeanNumber;           // aka "receivable"
  const withdrawn : WithdrawalCrate[] = []; // aka "transit"
  const claimable : WithdrawalCrate[] = []; // aka "receivable"

  // Split each withdrawal between `receivable` and `transit`.
  Object.keys(withdrawals).forEach((season) => {
    // const amt = toTokenUnitsBN(withdrawals[season].amount.toString(), token.decimals);
    // FIXME... we don't have decimals on amt here, do we need them?
    const amt = withdrawals[season].amount
    const szn = BeanNumber.from(season);
    if (szn.lte(currentSeason)) {
      claimableBalance = claimableBalance.add(amt);
      claimable.push({
        amount: BeanNumber.from(amt),
        season: szn,
      });
    } else {
      withdrawnBalance = withdrawnBalance.add(amt);
      withdrawn.push({
        amount: BeanNumber.from(amt),
        season: szn,
      });
    }
  });

  return {
    withdrawn: {
      amount: withdrawnBalance,
      crates: withdrawn,
    },
    claimable: {
      amount: claimableBalance,
      crates: claimable,
    },
  };
}

/**
 * Order crates by Season.
 */
export function sortCratesBySeason<T extends Crate<BeanNumber>>(crates: T[], direction : 'asc' | 'desc' = 'desc') {
  const m = direction === 'asc' ? -1 : 1;
  return [...crates].sort((a, b) => m * (b.season.sub(a.season).toNumber()));
}

/**
 * Order crates by BDV.
 */
export function sortCratesByBDVRatio<T extends DepositCrate<BeanNumber>>(crates: T[], direction : 'asc' | 'desc' = 'asc') {
  const m = direction === 'asc' ? -1 : 1;
  return [...crates].sort((a, b) => {
    // FIXME
    // const _a = a.bdv.div(a.amount);
    // const _b = b.bdv.div(b.amount);
    // return m * _b.sub(_a).toNumber();

    const aRatio = new DecimalBigNumber(a.bdv, 6).div(new DecimalBigNumber(a.amount, 6));
    const bRatio = new DecimalBigNumber(b.bdv, 6).div(new DecimalBigNumber(b.amount, 6));
    return m * bRatio.sub(aRatio).toNumber();
  });
}

