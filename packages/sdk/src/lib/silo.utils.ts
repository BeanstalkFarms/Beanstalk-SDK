import BigNumber from "bignumber.js";
import { Token } from "../classes/Token";
import { ZERO_BN } from "../constants";
import { MapValueType } from "../types";
import { toTokenUnitsBN } from "../utils/Tokens";
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

export type CrateSortFn = <T extends Crate<BigNumber>>(crates: T[]) => T[];

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
  currentSeason: BigNumber
) : {
  withdrawn: TokenSiloBalance['withdrawn'];
  claimable: TokenSiloBalance['claimable'];
} => {
  let withdrawnBalance = ZERO_BN;           // aka "transit"
  let claimableBalance = ZERO_BN;           // aka "receivable"
  const withdrawn : WithdrawalCrate[] = []; // aka "transit"
  const claimable : WithdrawalCrate[] = []; // aka "receivable"

  // Split each withdrawal between `receivable` and `transit`.
  Object.keys(withdrawals).forEach((season) => {
    const amt = toTokenUnitsBN(withdrawals[season].amount.toString(), token.decimals);
    const szn = new BigNumber(season);
    if (szn.lte(currentSeason)) {
      claimableBalance = claimableBalance.plus(amt);
      claimable.push({
        amount: amt,
        season: szn,
      });
    } else {
      withdrawnBalance = withdrawnBalance.plus(amt);
      withdrawn.push({
        amount: amt,
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
export function sortCratesBySeason<T extends Crate<BigNumber>>(crates: T[], direction : 'asc' | 'desc' = 'desc') {
  const m = direction === 'asc' ? -1 : 1;
  return [...crates].sort((a, b) => m * (b.season.minus(a.season).toNumber()));
}

/**
 * Order crates by BDV.
 */
export function sortCratesByBDVRatio<T extends DepositCrate<BigNumber>>(crates: T[], direction : 'asc' | 'desc' = 'asc') {
  const m = direction === 'asc' ? -1 : 1;
  return [...crates].sort((a, b) => {
    const _a = a.bdv.div(a.amount);
    const _b = b.bdv.div(b.amount);
    return m * _b.minus(_a).toNumber();
  });
}

