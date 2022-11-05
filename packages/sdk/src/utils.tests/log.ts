import { TokenSiloBalance } from "src/index";

export const logSiloBalance = (address: string, balance: TokenSiloBalance) => {
  console.log(`Address ${address} has ${balance.deposited.amount.toHuman()} BEAN deposited in the Silo.`);
  balance.deposited.crates.forEach((crate, i) => console.log(`  | ${i}: ${crate.season.toString()} = ${crate.amount.toString()}`))
}
